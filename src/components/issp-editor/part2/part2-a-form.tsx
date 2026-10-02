"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, Info, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { SectionShell } from "@/components/editor/section-shell";
import { revealNewItem } from "@/lib/reveal";

interface OrgOutcome {
  id: string;
  name: string;
  programs: { id: string; name: string }[];
}

interface StrategicConcern {
  id: string;
  /** At most one OrgOutcome id; empty = untagged (exports as "General / Agency-Wide"). */
  outcomeIds: string[];
  /** Program ids (linked OrgOutcome.programs[].id) this concern pertains to. */
  programIds: string[];
  criticalSystem: string;
  concern: string;
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
  outcomeIds: [],
  programIds: [],
  criticalSystem: "",
  concern: "",
  desiredStrategy: "",
};

export function Part2AForm({ orgOutcomes, initialData }: Part2AFormProps) {
  const [concerns, setConcerns] = useState<StrategicConcern[]>(() => {
    // Migrate old single outcomeId to new outcomeIds array, and drop the legacy
    // "general" tag (mirrors the store's normalization — snapshot-sync rule)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return initialData.map((c: any) => ({
      ...c,
      outcomeIds: (Array.isArray(c.outcomeIds) ? c.outcomeIds : (c.outcomeId ? [c.outcomeId] : []))
        .filter((id: string) => id !== "general"),
      programIds: Array.isArray(c.programIds) ? c.programIds : [],
    }));
  });

  const { debouncedSave } = useLocalSave("part2", "part2/a");

  const update = useCallback(
    (next: StrategicConcern[]) => {
      setConcerns(next);
      debouncedSave({ strategicConcerns: next });
    },
    [debouncedSave]
  );

  function addConcern() {
    const concern = { id: generateId(), ...DEFAULT_CONCERN };
    update([...concerns, concern]);
    revealNewItem(concern.id);
  }

  function removeConcern(id: string) {
    update(concerns.filter((c) => c.id !== id));
  }

  /** Swap a concern with its neighbour. Array order is the order shown in the PDF. */
  function moveConcern(id: string, direction: "up" | "down") {
    const fromIndex = concerns.findIndex((c) => c.id === id);
    if (fromIndex === -1) {
      return;
    }

    let toIndex: number;
    if (direction === "up") {
      toIndex = fromIndex - 1;
    } else {
      toIndex = fromIndex + 1;
    }

    const isBeforeFirst = toIndex < 0;
    if (isBeforeFirst) {
      return;
    }
    const isAfterLast = toIndex >= concerns.length;
    if (isAfterLast) {
      return;
    }

    const next = [...concerns];
    const movedConcern = next[fromIndex];
    next[fromIndex] = next[toIndex];
    next[toIndex] = movedConcern;
    update(next);
  }

  function updateConcern<K extends keyof StrategicConcern>(
    id: string,
    field: K,
    value: StrategicConcern[K]
  ) {
    update(concerns.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  /** Set the concern's single linked OO, dropping programs that belong to another OO. */
  function selectOutcome(id: string, outcomeId: string | null) {
    update(
      concerns.map((c) => {
        if (c.id !== id) return c;
        const validProgramIds = new Set(
          orgOutcomes.find((oo) => oo.id === outcomeId)?.programs.map((p) => p.id) ?? []
        );
        return {
          ...c,
          outcomeIds: outcomeId ? [outcomeId] : [],
          programIds: c.programIds.filter((p) => validProgramIds.has(p)),
        };
      })
    );
  }

  return (
    <SectionShell
      sectionId="part2/a"
      title="Strategic Concerns"
      description="Identify ICT-related concerns that affect achievement of organizational outcomes."
    >

      {/* Guide */}
      <div className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning mb-1">How to fill this section</p>
            <ul className="text-xs text-warning list-disc list-inside space-y-1">
              <li>Link each concern to exactly one Organizational Outcome (OO) defined in Part I. Concerns without a linked OO export as “General / Agency-Wide”.</li>
              <li>Identify the <strong>critical management, operating, or business system</strong> affected.</li>
              <li>Describe the <strong>problem</strong> — barriers or obstacles that hinder or delay performance.</li>
              <li>Describe the <strong>intended use of ICT</strong> to address the problem in this ISSP period.</li>
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

          {concerns.map((concern, idx) => {
            const selectedOutcome = orgOutcomes.find((oo) => oo.id === concern.outcomeIds[0]);
            const programOptions = selectedOutcome?.programs.map((p) => ({ value: p.id, label: p.name })) ?? [];
            const hasContent = Boolean(concern.concern || concern.criticalSystem || concern.desiredStrategy);
            const untagged = concern.outcomeIds.length === 0;
            return (
            <div key={concern.id} data-reveal-id={concern.id} className="rounded-lg border bg-card overflow-hidden">
              {/* Concern header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-auto">
                  Concern #{idx + 1}
                </span>
                {untagged && hasContent && (
                  <span
                    title="No Organizational Outcome linked — this concern will export as “General / Agency-Wide”. Link an OO from Part I-A."
                    className="inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-bg px-2 py-0.5 text-[11px] font-medium text-warning"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    No OO/SO/MFO tagged
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Move concern #${idx + 1} up`}
                  title="Move up"
                  onClick={() => moveConcern(concern.id, "up")}
                  disabled={idx === 0}
                  className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Move concern #${idx + 1} down`}
                  title="Move down"
                  onClick={() => moveConcern(concern.id, "down")}
                  disabled={idx === concerns.length - 1}
                  className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <ConfirmDeleteButton
                  ariaLabel="Remove concern"
                  onDelete={() => removeConcern(concern.id)}
                />
              </div>

              {/* Concern body */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-sm font-medium">Linked Organizational Outcome</Label>
                  <Select
                    items={orgOutcomes.map((oo, i) => ({ value: oo.id, label: oo.name || `Outcome ${i + 1}` }))}
                    value={concern.outcomeIds[0] ?? null}
                    onValueChange={(v: string | null) => selectOutcome(concern.id, v)}
                    disabled={orgOutcomes.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={orgOutcomes.length === 0 ? "Add OOs in Part I-A first…" : "Select one outcome…"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {orgOutcomes.map((oo, i) => (
                        <SelectItem key={oo.id} value={oo.id}>
                          {oo.name || `Outcome ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {untagged && orgOutcomes.length > 0 && (
                    <p className="text-xs text-warning">
                      No OO linked — exports as “General / Agency-Wide”.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-sm font-medium">Programs (optional)</Label>
                  {programOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {selectedOutcome ? (
                        <>No programs defined for this OO — add them in{" "}
                        <Link href="/editor/part1/a" className="text-primary hover:underline">
                          Part I-A.4
                        </Link>
                        . Appears in the PDF as “Program n: …” under the OO/SO/MFO.</>
                      ) : (
                        <>Select a linked Organizational Outcome first — programs come from{" "}
                        <Link href="/editor/part1/a" className="text-primary hover:underline">
                          Part I-A.4
                        </Link>
                        .</>
                      )}
                    </p>
                  ) : (
                    <Select
                      multiple
                      items={programOptions}
                      value={concern.programIds}
                      onValueChange={(v: string[] | null) =>
                        updateConcern(concern.id, "programIds", v || [])
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select programs…" />
                      </SelectTrigger>
                      <SelectContent>
                        {programOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-sm font-medium">Critical Management, Operating, or Business System</Label>
                  <Textarea
                    placeholder="Describe actual operations/activities performed..."
                    value={concern.criticalSystem || ""}
                    onChange={(e) => updateConcern(concern.id, "criticalSystem", e.target.value)}
                    rows={2}
                    className="resize-none"
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
            );
          })}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
