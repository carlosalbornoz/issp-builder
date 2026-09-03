"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { uuid } from "@/lib/uuid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useIsspStore } from "@/lib/store";
import {
  ANNEX_SECTIONS,
  FRONT_MATTER_SECTIONS,
  PARTS,
  type PartDef,
  type SectionDef,
} from "@/lib/sections";
import { SECTION_FIELDS } from "@/lib/section-fields";
import { sliceScopedDoc } from "@/lib/scope/slice";
import type { EditPath, OfficeIdentity } from "@/lib/scope/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Tree model ───────────────────────────────────────────────────────────────
//
// Internally each office tracks a Set of *leaf paths* — the most fine-grained
// selectable unit. This makes tri-state math trivial (count leaves). On
// generate, `leavesToEditPaths` collapses the set into the most concise
// `EditPath[]` (whole area → "part4"; whole section → "part1/b"; else field
// paths), which is what gets written into `editScope.editable` and what
// `resolveScope` expands back to the same leaf set.

/** Leaf path for a regular field: `${sectionId}.${fieldKey}`. */
function fieldLeaf(sectionId: string, fieldKey: string): string {
  return `${sectionId}.${fieldKey}`;
}

/** All selectable leaf paths under a section id. */
function sectionLeaves(sectionId: string): string[] {
  if (sectionId === "definitions") return ["definitions.definitions"];
  if (sectionId === "annexes/annex1") return ["annexes/annex1"];
  const def = SECTION_FIELDS[sectionId];
  if (!def || def.fields.length === 0) return []; // read-only / unknown → no leaves
  return def.fields.map((f) => fieldLeaf(sectionId, f.key));
}

/** All selectable leaf paths across the given section ids. */
function areaLeaves(sectionIds: readonly string[]): string[] {
  return sectionIds.flatMap(sectionLeaves);
}

/**
 * Slugify for filenames: lowercase, runs of non-alphanumeric → `-`, trim `-`.
 * Inline because no project-wide slugify exists in src/lib/utils.ts.
 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Collapse a set of selected leaf paths into the most concise `EditPath[]`:
 * a fully-selected section → its section id; a fully-selected area (every
 * leaf of every section) → its area id. Partial sections emit field paths.
 * Read-only sections (part4/summary, no leaves) never contribute and never
 * block area-level collapse for their siblings.
 */
function leavesToEditPaths(selected: Set<string>): EditPath[] {
  const out: EditPath[] = [];

  // Standalone sections (front matter + annexes) — no area parent.
  for (const sec of [...FRONT_MATTER_SECTIONS, ...ANNEX_SECTIONS]) {
    const leaves = sectionLeaves(sec.id);
    if (leaves.length === 0) continue;
    const hit = leaves.filter((l) => selected.has(l)).length;
    if (hit === 0) continue;
    if (hit === leaves.length) out.push(sec.id);
    else leaves.filter((l) => selected.has(l)).forEach((l) => out.push(l));
  }

  // Parts.
  for (const part of PARTS) {
    const areaPath = `part${part.partNum}`;
    const secIds = part.sections.map((s) => s.id);
    const aLeaves = areaLeaves(secIds);
    if (aLeaves.length === 0) continue;
    const selectedAreaLeaves = aLeaves.filter((l) => selected.has(l));
    if (selectedAreaLeaves.length === 0) continue;

    if (selectedAreaLeaves.length === aLeaves.length) {
      out.push(areaPath);
      continue;
    }
    for (const sec of part.sections) {
      const sLeaves = sectionLeaves(sec.id);
      if (sLeaves.length === 0) continue; // read-only section
      const selectedSecLeaves = sLeaves.filter((l) => selected.has(l));
      if (selectedSecLeaves.length === 0) continue;
      if (selectedSecLeaves.length === sLeaves.length) out.push(sec.id);
      else selectedSecLeaves.forEach((l) => out.push(l));
    }
  }

  return out;
}

// ─── Office entry ─────────────────────────────────────────────────────────────

interface OfficeEntry {
  /** OfficeIdentity.id — a uuid, stable for this dialog session. */
  officeId: string;
  /** Office name (also used as displayLabel). */
  name: string;
  /** Selected leaf paths for this office. */
  leaves: Set<string>;
}

function newOffice(): OfficeEntry {
  return { officeId: uuid(), name: "", leaves: new Set() };
}

// ─── Tri-state node helpers ───────────────────────────────────────────────────

type TriState = "all" | "some" | "none";

function nodeState(leaves: string[], selected: Set<string>): TriState {
  if (leaves.length === 0) return "none";
  let hit = 0;
  for (const l of leaves) if (selected.has(l)) hit++;
  if (hit === 0) return "none";
  if (hit === leaves.length) return "all";
  return "some";
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function DistributeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { doc } = useIsspStore();
  const [offices, setOffices] = useState<OfficeEntry[]>(() => [newOffice()]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  // Default-expand every area so the whole tree is scannable; sections start
  // collapsed and expand on demand for field-level picks.
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(
    () => new Set(PARTS.map((p) => `part${p.partNum}`))
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());

  const current = offices[Math.min(selectedIdx, offices.length - 1)];

  function patchEntry(idx: number, updater: (e: OfficeEntry) => OfficeEntry) {
    setOffices((prev) => prev.map((e, i) => (i === idx ? updater(e) : e)));
  }

  function setLeaves(idx: number, next: Set<string>) {
    patchEntry(idx, (e) => ({ ...e, leaves: next }));
  }

  // ── Tree toggles (operate on the currently-selected office) ──────────────
  function toggleLeaf(leaf: string) {
    if (!current) return;
    const next = new Set(current.leaves);
    if (next.has(leaf)) next.delete(leaf);
    else next.add(leaf);
    setLeaves(selectedIdx, next);
  }

  function toggleGroup(leaves: string[]) {
    if (!current || leaves.length === 0) return;
    const state = nodeState(leaves, current.leaves);
    const next = new Set(current.leaves);
    if (state === "all") leaves.forEach((l) => next.delete(l));
    else leaves.forEach((l) => next.add(l));
    setLeaves(selectedIdx, next);
  }

  function addOffice() {
    const entry = newOffice();
    setOffices((prev) => [...prev, entry]);
    setSelectedIdx(offices.length); // current length → index of the new entry
  }

  function removeOffice(idx: number) {
    const next = offices.filter((_, i) => i !== idx);
    if (next.length === 0) {
      setOffices([newOffice()]);
      setSelectedIdx(0);
      return;
    }
    setOffices(next);
    setSelectedIdx(Math.max(0, Math.min(selectedIdx, next.length - 1)));
  }

  function toggleArea(partNum: number) {
    const key = `part${partNum}`;
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  // ── Generate + download ──────────────────────────────────────────────────
  //
  // ⚠️ Serialize-before-mutation: sliceScopedDoc shallow-copies owned
  // object/array fields (shares refs with the live master `doc`). We never
  // hold or mutate the slice — JSON.stringify runs immediately, producing an
  // independent string, and the slice is discarded with the tick.
  const [generating, setGenerating] = useState(false);
  function handleGenerate() {
    if (!doc || generating) return;

    if (offices.length === 0) {
      toast.error("Add at least one office");
      return;
    }

    // Surface every incomplete office rather than silently skipping it. An
    // office is "complete" only when it has a name AND at least one selected
    // field; the secretariat must see exactly what to fix before any file is
    // generated, and Generate must never produce a partial batch.
    const incomplete = offices
      .map((e, i) => {
        const reasons: string[] = [];
        if (e.name.trim().length === 0) reasons.push("is missing a name");
        if (leavesToEditPaths(e.leaves).length === 0) reasons.push("has no fields selected");
        return reasons.length === 0
          ? null
          : { label: e.name.trim() || `Office ${i + 1}`, msg: reasons.join(" and ") };
      })
      .filter((p): p is { label: string; msg: string } => p !== null);

    if (incomplete.length > 0) {
      toast.error(incomplete.map((p) => `${p.label} ${p.msg}`).join("; "));
      return;
    }

    setGenerating(true);
    try {
      for (const entry of offices) {
        const name = entry.name.trim();
        const office: OfficeIdentity = {
          id: entry.officeId,
          name,
          displayLabel: name,
        };
        const editable = leavesToEditPaths(entry.leaves);
        const sliced = sliceScopedDoc(doc, {
          office,
          editable,
          // sourceDocId intentionally omitted: IsspDocument carries no stable
          // id (see src/lib/store/types.ts). Phase 3 consolidate is the only
          // consumer and is not yet built.
        });
        const json = JSON.stringify(sliced, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const slug = slugify(office.displayLabel) || "office";
        const fname = `${slugify(doc.agency.acronym || "agency")}-ISSP-${doc.startYear}-${doc.endYear}-${slug}.issp`;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
      toast.success(`Generated ${offices.length} scoped file${offices.length > 1 ? "s" : ""}`);
      onClose();
    } catch (err) {
      console.error("Distribute failed:", err);
      toast.error("Could not generate scoped files. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Derived view state ───────────────────────────────────────────────────
  const officeSelectLabel = (e: OfficeEntry, idx: number) =>
    e.name.trim() || `Office ${idx + 1}`;

  if (!doc || !current) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Distribute to offices</DialogTitle>
          <DialogDescription>
            Assign editable areas, sections, or fields to each office. Every office
            receives a scoped .issp containing only its own data — other offices&apos;
            data is stripped, not just hidden.
          </DialogDescription>
        </DialogHeader>

        {/* Office selector + name */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <label htmlFor="distribute-office-select" className="text-sm font-medium shrink-0">
              Office
            </label>
            <select
              id="distribute-office-select"
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="flex-1 min-w-0 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {offices.map((e, i) => (
                <option key={e.officeId} value={i}>
                  {officeSelectLabel(e, i)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={addOffice}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          <Input
            value={current.name}
            onChange={(e) =>
              patchEntry(selectedIdx, (entry) => ({ ...entry, name: e.target.value }))
            }
            placeholder="Office name (e.g., Information Systems Division)"
            aria-label="Office name"
          />
        </div>

        {/* Tree */}
        <div className="rounded-lg border border-border max-h-[42vh] overflow-y-auto bg-card/40">
          <ul className="py-1 text-sm">
            {/* Front matter */}
            {FRONT_MATTER_SECTIONS.map((sec) => (
              <StandaloneSectionRow
                key={sec.id}
                section={sec}
                state={nodeState(sectionLeaves(sec.id), current.leaves)}
                onToggle={() => toggleGroup(sectionLeaves(sec.id))}
              />
            ))}

            {/* Parts */}
            {PARTS.map((part) => (
              <AreaRow
                key={part.partNum}
                part={part}
                expanded={expandedAreas.has(`part${part.partNum}`)}
                onToggleArea={() => toggleArea(part.partNum)}
                state={nodeState(
                  areaLeaves(part.sections.map((s) => s.id)),
                  current.leaves
                )}
                onToggleAreaCheck={() =>
                  toggleGroup(areaLeaves(part.sections.map((s) => s.id)))
                }
                expandedSections={expandedSections}
                onToggleSection={toggleSection}
                sectionState={(sid) => nodeState(sectionLeaves(sid), current.leaves)}
                onToggleSectionCheck={(sid) => toggleGroup(sectionLeaves(sid))}
                onToggleLeaf={toggleLeaf}
                selectedLeaves={current.leaves}
              />
            ))}

            {/* Annexes */}
            {ANNEX_SECTIONS.map((sec) => (
              <StandaloneSectionRow
                key={sec.id}
                section={sec}
                state={nodeState(sectionLeaves(sec.id), current.leaves)}
                onToggle={() => toggleGroup(sectionLeaves(sec.id))}
              />
            ))}
          </ul>
        </div>

        {/* Roster */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            {offices.length} office{offices.length > 1 ? "s" : ""}
          </p>
          <ul className="space-y-1 max-h-24 overflow-y-auto">
            {offices.map((e, i) => {
              const paths = leavesToEditPaths(e.leaves);
              return (
                <li
                  key={e.officeId}
                  className={cn(
                    "flex items-start gap-2 rounded-md px-2 py-1.5 text-xs",
                    i === selectedIdx && "bg-accent/60"
                  )}
                >
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => setSelectedIdx(i)}
                  >
                    <span className="font-medium text-foreground">
                      {officeSelectLabel(e, i)}
                    </span>
                    {paths.length > 0 ? (
                      <span className="block text-muted-foreground truncate">
                        {paths.join(", ")}
                      </span>
                    ) : (
                      <span className="block text-muted-foreground/60 italic">
                        No fields selected
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${officeSelectLabel(e, i)}`}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeOffice(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating || offices.length === 0}>
            <Download className="h-4 w-4" />
            {generating
              ? "Generating…"
              : `Generate ${offices.length} file${offices.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row subcomponents ────────────────────────────────────────────────────────

function StandaloneSectionRow({
  section,
  state,
  onToggle,
}: {
  section: SectionDef;
  state: TriState;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-center gap-2 px-2 py-1.5 pl-3">
      <Checkbox
        checked={state === "all"}
        indeterminate={state === "some"}
        onCheckedChange={() => onToggle()}
        aria-label={section.label}
      />
      <span className="truncate">{section.label}</span>
    </li>
  );
}

function AreaRow({
  part,
  expanded,
  onToggleArea,
  state,
  onToggleAreaCheck,
  expandedSections,
  onToggleSection,
  sectionState,
  onToggleSectionCheck,
  onToggleLeaf,
  selectedLeaves,
}: {
  part: PartDef;
  expanded: boolean;
  onToggleArea: () => void;
  state: TriState;
  onToggleAreaCheck: () => void;
  expandedSections: Set<string>;
  onToggleSection: (id: string) => void;
  sectionState: (id: string) => TriState;
  onToggleSectionCheck: (id: string) => void;
  onToggleLeaf: (leaf: string) => void;
  selectedLeaves: Set<string>;
}) {
  return (
    <li className="px-1">
      <div className="flex items-center gap-1 px-1 py-1.5">
        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={onToggleArea}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <Checkbox
          checked={state === "all"}
          indeterminate={state === "some"}
          onCheckedChange={onToggleAreaCheck}
          aria-label={`Part ${part.part}: ${part.title}`}
        />
        <span className="font-semibold uppercase tracking-wide text-xs text-muted-foreground">
          Part {part.part}: {part.title}
        </span>
      </div>
      {expanded && (
        <ul className="ml-6 border-l border-border/60 pl-2">
          {part.sections.map((sec) => {
            const sState = sectionState(sec.id);
            const leaves = sectionLeaves(sec.id);
            const secExpanded = expandedSections.has(sec.id);
            const fieldDef = SECTION_FIELDS[sec.id];
            return (
              <li key={sec.id}>
                <div className="flex items-center gap-1 py-1">
                  {leaves.length > 0 && (
                    <button
                      type="button"
                      aria-label={secExpanded ? "Collapse" : "Expand"}
                      onClick={() => onToggleSection(sec.id)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
                    >
                      {secExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  )}
                  {leaves.length > 0 ? (
                    <Checkbox
                      checked={sState === "all"}
                      indeterminate={sState === "some"}
                      onCheckedChange={() => onToggleSectionCheck(sec.id)}
                      aria-label={sec.label}
                    />
                  ) : (
                    <span className="inline-block w-4" aria-hidden="true" />
                  )}
                  <span
                    className={cn(
                      "truncate text-sm",
                      leaves.length === 0 && "text-muted-foreground/50"
                    )}
                    title={
                      leaves.length === 0 ? "Read-only computed view" : undefined
                    }
                  >
                    {sec.label}
                  </span>
                </div>
                {secExpanded && fieldDef && fieldDef.fields.length > 0 && (
                  <ul className="ml-6 border-l border-border/60 pl-2">
                    {fieldDef.fields.map((f) => {
                      const leaf = fieldLeaf(sec.id, f.key);
                      return (
                        <li key={f.key} className="flex items-center gap-2 py-1">
                          <Checkbox
                            checked={selectedLeaves.has(leaf)}
                            onCheckedChange={() => onToggleLeaf(leaf)}
                            aria-label={f.label}
                          />
                          <span className="text-sm text-muted-foreground">{f.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
