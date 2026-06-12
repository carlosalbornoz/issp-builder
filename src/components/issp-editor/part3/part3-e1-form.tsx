"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, ChevronDown, ChevronRight, FolderKanban, Link2, Info, Pencil } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { computeProjectCosts } from "@/components/issp-editor/part4/part4-aggregations";
import type { Part4Data } from "@/lib/store/types";
import { AddItemDialog, useAddItemDraft } from "@/components/issp-editor/add-item-dialog";
import { revealNewItem } from "@/lib/reveal";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { cn, php } from "@/lib/utils";
import type { ProposedSystem } from "./part3-d-form";
import { SectionShell } from "@/components/editor/section-shell";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IctProject {
  id: string;
  title: string;
  description: string;
  objectives: string;
  projectType: "IS_DRIVEN" | "STANDALONE" | "";
  linkedSystemIds: string[];
  strategicAlignment: string[];
  harmonizationFramework: string[];
  implementingUnit: string;
  leadAgency?: string;
  implementingAgencies?: string;
  fundingSource: string;
  year1Deliverables: string;
  year2Deliverables: string;
  year3Deliverables: string;
  duration: string;
}

function generateId() {
  return `proj-${Math.random().toString(36).slice(2, 10)}`;
}

function makeDefaultProject(planDuration: string): Omit<IctProject, "id"> {
  return {
    title: "",
    description: "",
    objectives: "",
    projectType: "",
    linkedSystemIds: [],
    strategicAlignment: [],
    harmonizationFramework: [],
    implementingUnit: "",
    fundingSource: "",
    duration: planDuration,
    year1Deliverables: "",
    year2Deliverables: "",
    year3Deliverables: "",
  };
}

// Per MITHI Resolution 2025-01 / ISSP Guidelines 2026
const STRATEGIC_ALIGNMENT_OPTIONS = [
  { value: "Public Investment Program", hint: "CO exceeding threshold; supports PDP long-term targets" },
  { value: "National Cybersecurity Plan", hint: "Security software (Firewalls, WAF, MFA), SOC, or protects sensitive data" },
  { value: "E-Government Master Plan", hint: "Integrates with other agencies, uses GovNet/PNPKI, or digitizes frontline services" },
  { value: "Program Convergence Budgeting", hint: "Joint initiative with other agencies; funding from multiple offices" },
  { value: "Others", hint: "Aligned with other national/agency-level plans" },
];

const HARMONIZATION_OPTIONS = [
  { value: "National Prioritization", hint: "Cabinet-level priority or mandatory for national platform (e.g., eGov PH Super App)" },
  { value: "Resource Optimization", hint: "Leverages existing government resources (CSE, GovNet, Government Cloud)" },
  { value: "Interoperability Framework", hint: "API layer or data-sharing module for cross-agency use (PeGIF compliance)" },
  { value: "Cross-Agency Collaboration", hint: "Part of a JMC or shared service agreement" },
  { value: "Scalability and Sustainability", hint: "Includes SPAR mechanism; KPIs align with PREXC" },
];

const FUNDING_OPTIONS = [
  "General Appropriations Act (GAA)",
  "Foreign-Assisted",
  "Locally Funded",
  "Other Income Generating Sources",
];

type DurationMode = "single" | "range";

function yearsBetween(startYear: number, endYear: number): string[] {
  const start = Math.min(startYear, endYear);
  const end = Math.max(startYear, endYear);
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function formatDuration(start: string, end?: string): string {
  return end && end !== start ? `${start}–${end}` : start;
}

function parseDuration(value: string, planYears: string[]) {
  const match = value.trim().match(/^(\d{4})(?:\s*[-–]\s*(\d{4}))?$/);
  const firstYear = planYears[0] ?? "";
  const lastYear = planYears[planYears.length - 1] ?? firstYear;

  if (!match) {
    return {
      valid: value.trim() === "",
      mode: "range" as DurationMode,
      start: firstYear,
      end: lastYear,
    };
  }

  const parsedStart = match[1];
  const parsedEnd = match[2] ?? parsedStart;
  const start = planYears.includes(parsedStart) ? parsedStart : firstYear;
  const end = planYears.includes(parsedEnd) ? parsedEnd : start;
  const valid = planYears.includes(parsedStart) && planYears.includes(parsedEnd) && Number(end) >= Number(start);

  return {
    valid,
    mode: end !== start ? "range" as DurationMode : "single" as DurationMode,
    start,
    end,
  };
}

function DurationPicker({
  value,
  planYears,
  planDuration,
  onChange,
}: {
  value: string;
  planYears: string[];
  planDuration: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseDuration(value, planYears);
  const startIndex = Math.max(planYears.indexOf(parsed.start), 0);
  const rangeEndOptions = planYears.slice(startIndex);

  function setMode(mode: DurationMode) {
    if (mode === "single") {
      onChange(parsed.start);
      return;
    }
    const end = Number(parsed.end) >= Number(parsed.start) ? parsed.end : planYears[planYears.length - 1];
    onChange(formatDuration(parsed.start, end));
  }

  function setStart(start: string) {
    if (parsed.mode === "single") {
      onChange(start);
      return;
    }
    const end = Number(parsed.end) >= Number(start) ? parsed.end : start;
    onChange(formatDuration(start, end));
  }

  function setEnd(end: string) {
    onChange(formatDuration(parsed.start, end));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select
          items={[
            { value: "single", label: "Single year" },
            { value: "range", label: "Year range" },
          ]}
          value={parsed.mode}
          onValueChange={(v: DurationMode | null) => v && setMode(v)}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single year</SelectItem>
            <SelectItem value="range">Year range</SelectItem>
          </SelectContent>
        </Select>
        <Select
          items={planYears.map((year) => ({ value: year, label: year }))}
          value={parsed.start}
          onValueChange={(v: string | null) => v && setStart(v)}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="Start" /></SelectTrigger>
          <SelectContent>
            {planYears.map((year) => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {parsed.mode === "range" && (
          <Select
            items={rangeEndOptions.map((year) => ({ value: year, label: year }))}
            value={parsed.end}
            onValueChange={(v: string | null) => v && setEnd(v)}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="End" /></SelectTrigger>
            <SelectContent>
              {rangeEndOptions.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {!parsed.valid && (
        <p className="text-xs text-warning">
          Saved duration &ldquo;{value}&rdquo; is not a valid year or year range for this ISSP period. Choose a value above to replace it.
        </p>
      )}
      <p className="text-xs text-muted-foreground">Allowed values are a single year or a year range within {planDuration}.</p>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  index,
  proposedSystems,
  isCrossAgency,
  planDuration,
  planYears,
  projectCost,
  linkOwners,
  initiallyEditing = false,
  onUpdate,
  onRemove,
}: {
  project: IctProject;
  index: number;
  proposedSystems: ProposedSystem[];
  isCrossAgency: boolean;
  planDuration: string;
  planYears: string[];
  projectCost: number;
  /** systemId → projects (any list) already linking it — powers the double-link warning. */
  linkOwners: Record<string, { id: string; title: string }[]>;
  /** New cards open straight into edit mode; existing ones start collapsed, read-only. */
  initiallyEditing?: boolean;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(initiallyEditing);
  const [editing, setEditing] = useState(initiallyEditing);
  const [pendingLink, setPendingLink] = useState<string | null>(null);

  const linkedSystems = proposedSystems.filter((s) =>
    project.linkedSystemIds.includes(s.id)
  );

  function ownersElsewhere(sysId: string) {
    return (linkOwners[sysId] ?? []).filter((o) => o.id !== project.id);
  }

  function applyLink(sysId: string) {
    setPendingLink(null);
    onUpdate("linkedSystemIds", [...project.linkedSystemIds, sysId]);
  }

  function toggleLinkedSystem(sysId: string) {
    if (project.linkedSystemIds.includes(sysId)) {
      setPendingLink(null);
      onUpdate("linkedSystemIds", project.linkedSystemIds.filter((i) => i !== sysId));
      return;
    }
    // Cross-reference warning (principle 4): name the project already claiming this IS
    if (ownersElsewhere(sysId).length > 0) {
      setPendingLink(sysId);
      return;
    }
    applyLink(sysId);
  }

  const KNOWN_SA = STRATEGIC_ALIGNMENT_OPTIONS.map((o) => o.value);
  const othersChecked = project.strategicAlignment.includes("Others");
  const othersText = project.strategicAlignment.find((v) => !KNOWN_SA.includes(v)) ?? "";

  function toggleAlignment(value: string) {
    const current = project.strategicAlignment;
    if (current.includes(value)) {
      // Unchecking "Others" also drops its custom specify-text
      const next = value === "Others"
        ? current.filter((v) => v !== "Others" && KNOWN_SA.includes(v))
        : current.filter((v) => v !== value);
      onUpdate("strategicAlignment", next);
    } else {
      onUpdate("strategicAlignment", [...current, value]);
    }
  }

  function setOthersText(text: string) {
    const rest = project.strategicAlignment.filter((v) => KNOWN_SA.includes(v));
    onUpdate("strategicAlignment", text ? [...rest, text] : rest);
  }

  function toggleHarmonization(value: string) {
    const current = Array.isArray(project.harmonizationFramework)
      ? project.harmonizationFramework
      : [];
    onUpdate(
      "harmonizationFramework",
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    );
  }

  const harmonizationArr = Array.isArray(project.harmonizationFramework)
    ? project.harmonizationFramework
    : [];

  return (
    <div data-reveal-id={project.id} className="rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderKanban className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {isCrossAgency ? "Cross-Agency" : "Internal"} Project #{index + 1}
            </span>
            {project.projectType && (
              <Badge variant="secondary" className="text-xs h-5">
                {project.projectType === "IS_DRIVEN" ? "IS-Driven" : "Standalone"}
              </Badge>
            )}
            {linkedSystems.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-success bg-success-bg px-1.5 py-0.5 rounded border border-success-border">
                <Link2 className="h-3 w-3" />
                {linkedSystems.length} IS
              </span>
            )}
          </div>
          <p className="text-sm font-medium truncate mt-0.5">
            {project.title || <span className="text-muted-foreground italic">Untitled Project</span>}
          </p>
        </div>
        <ConfirmDeleteButton
          ariaLabel="Remove project"
          confirmText="Delete project + its KPIs/budget?"
          onDelete={onRemove}
        />
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="h-7 w-7 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Quick summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border-b">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Project Title</Label>
          <Input
            placeholder="e.g., Citizen Feedback Portal Development"
            value={project.title}
            onChange={(e) => onUpdate("title", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Project Type</Label>
          <Select
            items={[
              { value: "IS_DRIVEN", label: "IS-Driven — links to Part III-D systems" },
              { value: "STANDALONE", label: "Standalone (infrastructure only)" }
            ]}
            value={project.projectType}
            onValueChange={(v: string | null) => v && onUpdate("projectType", v)}
          >
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="IS_DRIVEN">IS-Driven — links to Part III-D systems</SelectItem>
              <SelectItem value="STANDALONE">Standalone (infrastructure only)</SelectItem>
            </SelectContent>
          </Select>
          {!project.projectType && (
            <p className="text-xs text-muted-foreground">
              Choose &ldquo;IS-Driven&rdquo; to link this project to proposed systems from Part III-D.
            </p>
          )}
        </div>
      </div>

      {/* Read view (principle 2: read and edit are different modes) */}
      {expanded && !editing && (
        <ProjectReadView
          project={project}
          linkedSystems={linkedSystems}
          projectCost={projectCost}
          isCrossAgency={isCrossAgency}
          onEdit={() => setEditing(true)}
        />
      )}

      {/* Full details (edit mode) */}
      {expanded && editing && (
        <div className="p-4 space-y-6">
          {/* Description + objectives */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
              <Textarea
                placeholder="Brief description of what this project entails..."
                value={project.description}
                onChange={(e) => onUpdate("description", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Objectives</Label>
              <Textarea
                placeholder="List the project objectives..."
                value={project.objectives}
                onChange={(e) => onUpdate("objectives", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Cross-agency specific */}
          {isCrossAgency && (
            <div className="grid sm:grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Lead Agency</Label>
                <Input
                  placeholder="e.g., DICT"
                  value={project.leadAgency ?? ""}
                  onChange={(e) => onUpdate("leadAgency", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Implementing Agencies</Label>
                <Input
                  placeholder="e.g., DICT, DBM, CSC"
                  value={project.implementingAgencies ?? ""}
                  onChange={(e) => onUpdate("implementingAgencies", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Linked IS (only for IS-driven) */}
          {project.projectType === "IS_DRIVEN" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Linked Proposed Systems
              </Label>
              {proposedSystems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No proposed systems defined yet.{" "}
                  <Link href="/editor/part3/d" className="text-primary hover:underline">
                    Add systems in Part III-D →
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {proposedSystems.map((sys) => {
                    const linked = project.linkedSystemIds.includes(sys.id);
                    return (
                      <button
                        key={sys.id}
                        type="button"
                        onClick={() => toggleLinkedSystem(sys.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                          linked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {linked && <Link2 className="h-3 w-3" />}
                        {sys.name || "Unnamed system"}
                      </button>
                    );
                  })}
                </div>
              )}
              {pendingLink && (
                <div className="rounded-lg border border-warning-border bg-warning-bg px-3 py-2.5 text-xs space-y-2">
                  <p className="text-warning leading-relaxed">
                    <strong>{proposedSystems.find((s) => s.id === pendingLink)?.name || "This system"}</strong>{" "}
                    is already linked to{" "}
                    <strong>{ownersElsewhere(pendingLink).map((o) => o.title || "an untitled project").join(", ")}</strong>.
                    An IS can legitimately be delivered by more than one project, but double-linking is
                    usually a mistake — its budget and KPIs may be double-counted. Link it to this
                    project as well?
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyLink(pendingLink)}>
                      Link anyway
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPendingLink(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Strategic alignment */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Strategic Alignment
            </Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {STRATEGIC_ALIGNMENT_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2 cursor-pointer group">
                  <Checkbox
                    checked={project.strategicAlignment.includes(opt.value)}
                    onCheckedChange={() => toggleAlignment(opt.value)}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    <span className="font-medium">{opt.value === "Others" ? "Others (specify)" : opt.value}</span>
                    <span className="block text-muted-foreground text-xs mt-0.5">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {othersChecked && (
              <Input
                className="mt-1 max-w-md"
                placeholder="Specify the national or agency-level plan…"
                value={othersText}
                onChange={(e) => setOthersText(e.target.value)}
              />
            )}
          </div>

          {/* Harmonization Framework */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Harmonization Framework
            </Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {HARMONIZATION_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2 cursor-pointer group">
                  <Checkbox
                    checked={harmonizationArr.includes(opt.value)}
                    onCheckedChange={() => toggleHarmonization(opt.value)}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    <span className="font-medium">{opt.value}</span>
                    <span className="block text-muted-foreground text-xs mt-0.5">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Implementation details */}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Implementing Unit</Label>
              <Input
                placeholder="e.g., ICT Division"
                value={project.implementingUnit}
                onChange={(e) => onUpdate("implementingUnit", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Duration</Label>
              <DurationPicker
                value={(project as IctProject).duration ?? ""}
                planYears={planYears}
                planDuration={planDuration}
                onChange={(duration) => onUpdate("duration", duration)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Funding Source</Label>
              <Select
                items={FUNDING_OPTIONS.map(o => ({ value: o, label: o }))}
                value={project.fundingSource}
                onValueChange={(v: string | null) => v && onUpdate("fundingSource", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {FUNDING_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Total Project Cost</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-help text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    Auto-calculated from this project&apos;s resource requirements in Part IV.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm font-semibold tabular-nums">{php(projectCost)}</p>
          </div>

          {/* 3-Year Milestones */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
              3-Year Deliverables / Milestones
            </Label>
            <div className="grid sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((yr) => {
                const key = `year${yr}Deliverables` as keyof IctProject;
                return (
                  <div key={yr} className="space-y-1.5">
                    <Label className="text-xs font-semibold">Year {yr}</Label>
                    <Textarea
                      placeholder={`Year ${yr} deliverables…`}
                      value={project[key] as string}
                      onChange={(e) => onUpdate(key, e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              Done editing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Read-only presentation of a project (principle 2) ────────────────────────

function ReadRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 text-sm">
      <span className="text-xs text-muted-foreground uppercase tracking-wide pt-0.5">{label}</span>
      <div className="min-w-0 whitespace-pre-wrap">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function ProjectReadView({
  project,
  linkedSystems,
  projectCost,
  isCrossAgency,
  onEdit,
}: {
  project: IctProject;
  linkedSystems: ProposedSystem[];
  projectCost: number;
  isCrossAgency: boolean;
  onEdit: () => void;
}) {
  const KNOWN_SA = STRATEGIC_ALIGNMENT_OPTIONS.map((o) => o.value);
  const sa = project.strategicAlignment.filter((v) => KNOWN_SA.includes(v) && v !== "Others");
  const saOthers = project.strategicAlignment.find((v) => !KNOWN_SA.includes(v));
  return (
    <div className="p-4 space-y-3">
      <ReadRow label="Description" value={project.description} />
      <ReadRow label="Objectives" value={project.objectives} />
      <ReadRow
        label="Project Type"
        value={
          project.projectType
            ? project.projectType === "IS_DRIVEN"
              ? `IS-Driven${linkedSystems.length ? ` — ${linkedSystems.map((s) => s.name || "Unnamed system").join(", ")}` : ""}`
              : "Standalone (infrastructure only)"
            : ""
        }
      />
      <ReadRow
        label="Strategic Alignment"
        value={[...sa, ...(project.strategicAlignment.includes("Others") ? [`Others${saOthers ? `: ${saOthers}` : ""}`] : [])].join(", ")}
      />
      <ReadRow label="Harmonization" value={project.harmonizationFramework.join(", ")} />
      <ReadRow label="Duration" value={project.duration} />
      <ReadRow label="Year 1 Deliverables" value={project.year1Deliverables} />
      <ReadRow label="Year 2 Deliverables" value={project.year2Deliverables} />
      <ReadRow label="Year 3 Deliverables" value={project.year3Deliverables} />
      <ReadRow label="Implementing Unit" value={project.implementingUnit} />
      <ReadRow label="Total Project Cost" value={<span className="font-semibold tabular-nums">{php(projectCost)}</span>} />
      <ReadRow label="Funding Source" value={project.fundingSource} />
      {isCrossAgency && <ReadRow label="Lead Agency" value={project.leadAgency} />}
      {isCrossAgency && <ReadRow label="Implementing Agencies" value={project.implementingAgencies} />}
      <div className="flex justify-end border-t pt-3">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit project
        </Button>
      </div>
    </div>
  );
}

// ─── Shared project list ───────────────────────────────────────────────────────

function ProjectList({
  proposedSystems,
  initialProjects,
  otherProjects,
  isCrossAgency,
  planDuration,
  planYears,
  projectCosts,
  onSave,
}: {
  proposedSystems: ProposedSystem[];
  initialProjects: IctProject[];
  /** Projects from the other III-E list (cross-agency vs internal) — included in link ownership. */
  otherProjects: IctProject[];
  isCrossAgency: boolean;
  planDuration: string;
  planYears: string[];
  projectCosts: Record<string, number>;
  onSave: (projects: IctProject[]) => void;
}) {
  const [projects, setProjects] = useState<IctProject[]>(initialProjects);
  // ids created this session — their cards mount expanded in edit mode
  const [freshIds] = useState(() => new Set<string>());

  const linkOwners: Record<string, { id: string; title: string }[]> = {};
  for (const proj of [...projects, ...otherProjects]) {
    for (const sysId of proj.linkedSystemIds ?? []) {
      (linkOwners[sysId] ??= []).push({ id: proj.id, title: proj.title });
    }
  }

  function update(next: IctProject[]) {
    setProjects(next);
    onSave(next);
  }

  const addDialog = useAddItemDraft();

  function createProject() {
    const project = { id: generateId(), ...makeDefaultProject(planDuration), title: addDialog.draft.trim() };
    freshIds.add(project.id);
    update([...projects, project]);
    addDialog.setOpen(false);
    revealNewItem(project.id);
  }

  function removeProject(id: string) {
    update(projects.filter((p) => p.id !== id));
  }

  function updateProject(id: string, field: string, value: unknown) {
    update(projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-primary">{projects.length}</span>
          <span className="text-xs text-muted-foreground">
            {isCrossAgency ? "Cross-Agency" : "Internal"} Projects
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isCrossAgency ? "Cross-Agency ICT Projects" : "Internal ICT Projects"}
          </h2>
          <Button variant="outline" size="sm" onClick={addDialog.openDialog} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>

        {projects.length === 0 && (
          <Card className="border-dashed">
            <CardContent
              className="flex flex-col items-center justify-center py-12 cursor-pointer"
              onClick={addDialog.openDialog}
            >
              <FolderKanban className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No projects yet.</p>
              <p className="text-xs text-primary hover:underline">Add the first project →</p>
            </CardContent>
          </Card>
        )}

        {projects.map((project, idx) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={idx}
            proposedSystems={proposedSystems}
            isCrossAgency={isCrossAgency}
            planDuration={planDuration}
            planYears={planYears}
            projectCost={projectCosts[project.id] ?? 0}
            linkOwners={linkOwners}
            initiallyEditing={freshIds.has(project.id)}
            onUpdate={(field, value) => updateProject(project.id, field, value)}
            onRemove={() => removeProject(project.id)}
          />
        ))}
      </div>

      <AddItemDialog
        open={addDialog.open}
        onOpenChange={addDialog.setOpen}
        title={isCrossAgency ? "Add Cross-Agency ICT Project" : "Add Internal ICT Project"}
        description="Name the project first — the full project card opens right after, ready to fill in."
        createLabel="Add project"
        canCreate={addDialog.draft.trim().length > 0}
        onCreate={createProject}
      >
        <div className="space-y-1.5">
          <Label htmlFor="new-project-title" className="text-sm">Project Title</Label>
          <Input
            id="new-project-title"
            autoFocus
            placeholder="e.g., Project SIKAP — Streamlined ICT for Key Agency Processes"
            value={addDialog.draft}
            onChange={(e) => addDialog.setDraft(e.target.value)}
          />
        </div>
      </AddItemDialog>
    </div>
  );
}

// ─── E.1 — Internal Projects ───────────────────────────────────────────────────

export function Part3E1Form({
  proposedSystems,
  initialProjects,
  otherProjects,
  startYear,
  endYear,
  part4,
}: {
  proposedSystems: ProposedSystem[];
  initialProjects: IctProject[];
  otherProjects: IctProject[];
  startYear: number;
  endYear: number;
  part4: Part4Data;
}) {
  const { debouncedSave } = useLocalSave("part3", "part3/e1");
  const save = useCallback(
    (projects: IctProject[]) => debouncedSave({ internalProjects: projects }),
    [debouncedSave]
  );
  const planYears = yearsBetween(startYear, endYear);
  const planDuration = formatDuration(String(startYear), String(endYear));
  const projectCosts = computeProjectCosts(part4, "internalProjects");

  return (
    <SectionShell
      sectionId="part3/e1"
      title="Internal ICT Projects"
      description="Projects implemented solely by your agency — link IS-driven projects to systems defined in Part III-D."
    >
      <ProjectList
        proposedSystems={proposedSystems}
        initialProjects={initialProjects}
        otherProjects={otherProjects}
        isCrossAgency={false}
        planDuration={planDuration}
        planYears={planYears}
        projectCosts={projectCosts}
        onSave={save}
      />
    </SectionShell>
  );
}

// ─── E.2 — Cross-Agency Projects ──────────────────────────────────────────────

export function Part3E2Form({
  proposedSystems,
  initialProjects,
  otherProjects,
  startYear,
  endYear,
  part4,
}: {
  proposedSystems: ProposedSystem[];
  initialProjects: IctProject[];
  otherProjects: IctProject[];
  startYear: number;
  endYear: number;
  part4: Part4Data;
}) {
  const { debouncedSave } = useLocalSave("part3", "part3/e2");
  const save = useCallback(
    (projects: IctProject[]) => debouncedSave({ crossAgencyProjects: projects }),
    [debouncedSave]
  );
  const planYears = yearsBetween(startYear, endYear);
  const planDuration = formatDuration(String(startYear), String(endYear));
  const projectCosts = computeProjectCosts(part4, "crossAgencyProjects");

  return (
    <SectionShell
      sectionId="part3/e2"
      title="Cross-Agency ICT Projects"
      description="Projects involving multiple agencies. Specify the lead and implementing agencies."
    >
      <ProjectList
        proposedSystems={proposedSystems}
        initialProjects={initialProjects}
        otherProjects={otherProjects}
        isCrossAgency={true}
        planDuration={planDuration}
        planYears={planYears}
        projectCosts={projectCosts}
        onSave={save}
      />
    </SectionShell>
  );
}
