"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SaveStatusIndicator } from "@/components/issp-editor/save-status-indicator";
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, Trash2, GripVertical, Info } from "lucide-react";

interface OrgOutcome {
  id: string;
  name: string;
  programs: string[];
}

interface StrategicConcern {
  id: string;
  /** OrgOutcome ids, or "general" */
  outcomeIds: string[];
  criticalSystem: string;
  concern: string;
  currentStrategy: string;
  desiredStrategy: string;
}

interface Part2AFormProps {
  orgOutcomes: OrgOutcome[];
  initialData: StrategicConcern[];
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_CONCERN: Omit<StrategicConcern, "id"> = {
  outcomeIds: ["general"],
  criticalSystem: "",
  concern: "",
  currentStrategy: "",
  desiredStrategy: "",
};

export function Part2AForm({ orgOutcomes, initialData }: Part2AFormProps) {
  const router = useRouter();
    const [concerns, setConcerns] = useState<StrategicConcern[]>(() => {
    // Migrate old single outcomeId to new outcomeIds array
    return initialData.map((c: any) => ({
      ...c,
      outcomeIds: Array.isArray(c.outcomeIds) ? c.outcomeIds : (c.outcomeId ? [c.outcomeId] : []),
    }));
  });

  const { status, debouncedSave } = useLocalSave("part2");

  const update = useCallback(
    (next: StrategicConcern[]) => {
      setConcerns(next);
      debouncedSave({ strategicConcerns: next });
    },
    [debouncedSave]
  );

  function addConcern() {
    update([...concerns, { id: generateId(), ...DEFAULT_CONCERN }]);
  }

  function removeConcern(id: string) {
    update(concerns.filter((c) => c.id !== id));
  }

  function updateConcern<K extends keyof StrategicConcern>(
    id: string,
    field: K,
    value: StrategicConcern[K]
  ) {
    update(concerns.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  // Group concerns by outcome for display
  const outcomeMap: Record<string, string> = { general: "General / Agency-Wide" };
  orgOutcomes.forEach((oo) => {
    outcomeMap[oo.id] = oo.name || "Untitled Outcome";
  });

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="sticky top-0 z-10 flex items-start justify-between -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">
            Part II · Section A
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Strategic Concerns</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Identify ICT-related concerns that affect achievement of organizational outcomes.
          </p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      {/* Guide */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 mb-1">How to fill this section</p>
            <ul className="text-xs text-amber-700 list-disc list-inside space-y-1">
              <li>Link each concern to an Organizational Outcome (OO) defined in Part I.</li>
              <li>Describe the <strong>current ICT strategy</strong> in place for addressing this concern.</li>
              <li>Describe the <strong>desired ICT strategy</strong> — what you intend to do in this ISSP period.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Part I outcomes not set warning */}
      {orgOutcomes.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground text-center">
          <p>No Organizational Outcomes defined in Part I-A yet.</p>
          <Link
            href="/editor/part1/a"
            className="text-primary hover:underline font-medium"
          >
            Add outcomes in Part I-A →
          </Link>
        </div>
      )}

      {/* Strategic concerns table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Strategic ICT Concerns</CardTitle>
              <CardDescription className="mt-1">
                {concerns.length} concern{concerns.length !== 1 ? "s" : ""} added
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addConcern} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Concern
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {concerns.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/30 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No strategic concerns yet.{" "}
                <button type="button" onClick={addConcern} className="font-medium text-primary hover:underline">
                  Add the first one.
                </button>
              </p>
            </div>
          )}

          {concerns.map((concern, idx) => (
            <div key={concern.id} className="rounded-lg border bg-card overflow-hidden">
              {/* Concern header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-auto">
                  Concern #{idx + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove concern"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeConcern(concern.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Concern body */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-sm font-medium">Linked Organizational Outcome</Label>
                  <Select
                    multiple
                    items={[{value: "general", label: "General / Agency-Wide"}, ...orgOutcomes.map(oo => ({value: oo.id, label: oo.name}))]}
                    value={concern.outcomeIds}
                    onValueChange={(v: string[] | null) =>
                      updateConcern(concern.id, "outcomeIds", v || [])
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select outcome…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General / Agency-Wide</SelectItem>
                      {orgOutcomes.map((oo, i) => (
                        <SelectItem key={oo.id} value={oo.id}>
                          {oo.name || `Outcome ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-sm font-medium">Critical Management, Operating, or Business System</Label>
                  <Input
                    placeholder="Describe actual operations/activities performed..."
                    value={concern.criticalSystem || ""}
                    onChange={(e) => updateConcern(concern.id, "criticalSystem", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-sm font-medium">Problem / Strategic Concern</Label>
                  <Textarea
                    placeholder="Barriers/obstacles that hinder or delay performance..."
                    value={concern.concern}
                    onChange={(e) => updateConcern(concern.id, "concern", e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-sm font-medium">Intended Use of ICT</Label>
                  <Textarea
                    placeholder="ICT solution to address identified problems. Will it improve efficiency?"
                    value={concern.desiredStrategy}
                    onChange={(e) =>
                      updateConcern(concern.id, "desiredStrategy", e.target.value)
                    }
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => router.push("/editor/part1/c")}
        >
          ← Part I-C: Stakeholders
        </Button>
        <Button onClick={() => router.push("/editor/part2/b")}>
          Next: Network &amp; Cybersecurity →
        </Button>
      </div>
    </div>
  );
}
