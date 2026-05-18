"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SaveStatusIndicator } from "@/components/issp-editor/save-status-indicator";
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

type AgencyType = "NGA" | "GOCC" | "LGU" | "OTHER";

interface OrgOutcome {
  id: string;
  name: string;
  programs: string[];
}

interface Part1AData {
  legalBasis: string;
  mandateFunction: string;
  visionStatement: string;
  missionStatement: string;
  orgOutcomes: OrgOutcome[];
}

interface Part1AFormProps {
  agencyType: AgencyType;
  initialData: Part1AData | null;
}

const OO_LABELS: Record<AgencyType, string> = {
  NGA: "Organizational Outcomes (OO)",
  GOCC: "Strategic Objectives (SO)",
  LGU: "Major Final Outputs (MFO)",
  OTHER: "Organizational Outcomes (OO)",
};

const OO_SHORT: Record<AgencyType, string> = {
  NGA: "OO",
  GOCC: "SO",
  LGU: "MFO",
  OTHER: "OO",
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_DATA: Part1AData = {
  legalBasis: "",
  mandateFunction: "",
  visionStatement: "",
  missionStatement: "",
  orgOutcomes: [],
};

function FormField({
  label,
  htmlFor,
  tooltip,
  children,
}: {
  label: string;
  htmlFor?: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="cursor-help text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
}

export function Part1AForm({ agencyType, initialData }: Part1AFormProps) {
  const [data, setData] = useState<Part1AData>(initialData ?? DEFAULT_DATA);
  const [expandedOOs, setExpandedOOs] = useState<Set<string>>(new Set());

  const { status, debouncedSave } = useLocalSave("part1");

  const update = useCallback(
    <K extends keyof Part1AData>(key: K, value: Part1AData[K]) => {
      setData((prev) => {
        const next = { ...prev, [key]: value };
        setTimeout(() => debouncedSave(next), 0);
        return next;
      });
    },
    [debouncedSave]
  );

  function addOutcome() {
    const newOO: OrgOutcome = { id: generateId(), name: "", programs: [""] };
    const next = [...data.orgOutcomes, newOO];
    update("orgOutcomes", next);
    setExpandedOOs((prev) => new Set([...prev, newOO.id]));
  }

  function removeOutcome(id: string) {
    update(
      "orgOutcomes",
      data.orgOutcomes.filter((o) => o.id !== id)
    );
  }

  function updateOutcome(id: string, field: keyof OrgOutcome, value: unknown) {
    update(
      "orgOutcomes",
      data.orgOutcomes.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  }

  function addProgram(ooId: string) {
    const oo = data.orgOutcomes.find((o) => o.id === ooId);
    if (!oo) return;
    updateOutcome(ooId, "programs", [...oo.programs, ""]);
  }

  function updateProgram(ooId: string, idx: number, value: string) {
    const oo = data.orgOutcomes.find((o) => o.id === ooId);
    if (!oo) return;
    const programs = [...oo.programs];
    programs[idx] = value;
    updateOutcome(ooId, "programs", programs);
  }

  function removeProgram(ooId: string, idx: number) {
    const oo = data.orgOutcomes.find((o) => o.id === ooId);
    if (!oo) return;
    updateOutcome(
      ooId,
      "programs",
      oo.programs.filter((_, i) => i !== idx)
    );
  }

  function toggleOO(id: string) {
    setExpandedOOs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const ooLabel = OO_LABELS[agencyType];
  const ooShort = OO_SHORT[agencyType];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="sticky top-0 z-10 flex items-start justify-between -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">
            Part I · Section A
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            Mandate, Vision, Mission & Outcomes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Provide the legal basis and strategic direction of your agency.
          </p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      {/* A.1 Mandate */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">A.1 Mandate</CardTitle>
          <CardDescription>
            The legal basis and functions assigned to the agency by law.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            label="Legal Basis"
            htmlFor="legal-basis"
            tooltip="e.g., Republic Act No. 10844 — Department of Information and Communications Technology Act of 2015"
          >
            <Input
              id="legal-basis"
              placeholder="e.g., RA 10844, EO 47"
              value={data.legalBasis}
              onChange={(e) => update("legalBasis", e.target.value)}
            />
          </FormField>

          <FormField
            label="Mandate / Functions"
            htmlFor="mandate-function"
            tooltip="Describe the primary mandate and functions of the agency as stated in its enabling law or executive order."
          >
            <Textarea
              id="mandate-function"
              placeholder="Describe the agency's mandate and primary functions..."
              value={data.mandateFunction}
              onChange={(e) => update("mandateFunction", e.target.value)}
              rows={4}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* A.2 Vision & A.3 Mission */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">A.2–A.3 Vision & Mission</CardTitle>
          <CardDescription>
            The long-term aspirational goal and the course of action to achieve it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            label="Vision Statement"
            htmlFor="vision"
            tooltip="A concise statement of the agency's desired long-term future state."
          >
            <Textarea
              id="vision"
              placeholder="The agency's vision for the future..."
              value={data.visionStatement}
              onChange={(e) => update("visionStatement", e.target.value)}
              rows={3}
            />
          </FormField>

          <FormField
            label="Mission Statement"
            htmlFor="mission"
            tooltip="What the agency does, for whom, and how — the reason for the agency's existence."
          >
            <Textarea
              id="mission"
              placeholder="The agency's mission statement..."
              value={data.missionStatement}
              onChange={(e) => update("missionStatement", e.target.value)}
              rows={3}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* A.4 Org Outcomes */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">A.4 {ooLabel}</CardTitle>
              <CardDescription className="mt-1">
                {agencyType === "NGA" && "The broad results the agency must achieve to fulfill its mandate."}
                {agencyType === "GOCC" && "The strategic objectives guiding the GOCC's operations."}
                {agencyType === "LGU" && "The major outputs the LGU is mandated to deliver."}
                {agencyType === "OTHER" && "The outcomes the agency must achieve."}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addOutcome} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add {ooShort}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.orgOutcomes.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/30 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No {ooLabel} added yet.{" "}
                <button
                  onClick={addOutcome}
                  className="font-medium text-primary hover:underline"
                >
                  Add the first one.
                </button>
              </p>
            </div>
          )}

          <div className="space-y-3">
            {data.orgOutcomes.map((oo, idx) => {
              const isExpanded = expandedOOs.has(oo.id);
              return (
                <div
                  key={oo.id}
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  {/* Outcome header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <button
                      onClick={() => toggleOO(oo.id)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-8 shrink-0">
                        {ooShort} {idx + 1}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {oo.name || (
                          <span className="text-muted-foreground italic">Untitled</span>
                        )}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove outcome"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOutcome(oo.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Outcome body */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      <FormField label={`${ooShort} ${idx + 1} Name / Description`}>
                        <Input
                          placeholder={`${ooShort} description...`}
                          value={oo.name}
                          onChange={(e) => updateOutcome(oo.id, "name", e.target.value)}
                        />
                      </FormField>

                      {/* Programs */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Programs / Projects under this {ooShort}</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => addProgram(oo.id)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Program
                          </Button>
                        </div>
                        {oo.programs.map((program, pIdx) => (
                          <div key={pIdx} className="flex gap-2">
                            <Input
                              placeholder={`Program ${pIdx + 1}...`}
                              value={program}
                              onChange={(e) => updateProgram(oo.id, pIdx, e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remove program"
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeProgram(oo.id, pIdx)}
                              disabled={oo.programs.length === 1}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        {oo.programs.length === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed"
                            onClick={() => addProgram(oo.id)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add program
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div />
        <Button nativeButton={false} render={<a href="/editor/part1/b" />}>
          Next: Organization Structure →
        </Button>
      </div>
    </div>
  );
}
