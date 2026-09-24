# Part IV Cycle View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Part IV page, Cycle View (`/editor/part4/cycle`), showing every budget line item across all three years on one screen, grouped by project and expense class, with full inline add/edit/reclassify/remove that autosaves like the rest of the app.

**Architecture:** A pure, framework-free model module (`part4-cycle-model.ts`) computes cross-year "rows" from the existing `Part4Data` by matching `LineItem`s on (group, expense class, item name) — no schema change, no migration. A single React component (`part4-cycle-view.tsx`) renders those rows grouped by project/category, with inline-editable cells that call the model's pure mutation functions and push the result through the store's existing `updatePart4`. The new section is registered like the existing read-only `part4/summary` (no independent completion tracking — it edits the same data three other sections already own).

**Tech Stack:** Next.js 16 (App Router), TypeScript, React 19, the app's local-first Zustand-like store (`src/lib/store`), standalone `scripts/verify-*.ts` assert scripts run with `tsx`, Puppeteer `.mjs` smokes.

**Spec:** `docs/superpowers/specs/2026-09-24-part4-cycle-view-design.md`

## Global Constraints

- **NEVER run `npm run build`, `npm start`, or `pm2 restart issp`** during this work — shared dev+prod tree; a prod build desyncs the live pm2 process (AGENTS.md "Production & deploy safety"). Deploy is a separate, Carlos-gated step.
- **Type gate = `npx tsc --noEmit` AND `npm run lint`.** The only build-like step allowed during this work.
- **Unit-verify convention:** standalone assert scripts, `npx tsx scripts/<name>.ts`, using `node:assert/strict` and relative imports (`../src/lib/...`) — see `scripts/verify-duration.ts`.
- **Puppeteer smokes:** dev server on `http://localhost:3000` (check with `ss -tlnp | grep :3000` first; start `npm run dev` in the background only if absent). Chrome at `/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome`. Neutralize `crypto.randomUUID` on every page (non-secure context — Carlos reaches dev over plain HTTP). Trusted native clicks for anything that triggers a download. Fresh page per phase. `networkidle2`, never `networkidle0`.
- **No schema/migration changes.** Cross-year identity is computed at render time (name-matching), never persisted.
- **New id generation uses `uuid()` from `@/lib/uuid`**, not `crypto.randomUUID()` directly and not the local `Math.random`-based `genId()` in `part4-year-form.tsx` — this repo's dev server is a non-secure context where `crypto.randomUUID` is `undefined`.
- Commit messages: conventional style, end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Review Focus

- Two distinct line items sharing an identical name within the same project+expense-class can mis-pair across years (accepted trade-off, but the pairing order — first-with-first — must be deterministic and tested, not silently wrong).
- Renaming a row must not cause it to re-split into two rows on the next render (the grouping function must re-merge post-rename state identically).
- Writing a line item into a project's per-year budget when that project has never had a `ProjectBudget` record in that specific year (e.g. its duration starts later) must not silently no-op — it must create the record, or the edit is lost with no error.
- The UI must not let a user add a *new* line item into a year outside a project's Part III-E duration (matches the existing per-year pages' behavior), while still allowing full edit/delete of any *pre-existing* legacy item that happens to sit outside duration.
- Registering `part4/cycle` as a section must not create a second, independently-tracked completion state for data that `part4/year1`/`year2`/`year3` already own (no duplicate "done" dot, no double-counting in Part IV's progress rollup).

---

### Task 1: Cross-year model — grouping, bucket access, mutations

**Files:**
- Create: `src/components/issp-editor/part4/part4-cycle-model.ts`
- Test (create): `scripts/verify-part4-cycle-model.ts`

**Interfaces:**
- Consumes: `Part4Data`, `IctProject["duration"]` handling is the caller's job — this module only reads/writes `Part4Data`. Types `LineItem`, `YearBudget`, `ProjectBudget` are re-imported from `./part4-year-form` (matching the existing convention in `part4-aggregations.ts:1`, which imports these same types from the same place rather than `@/lib/store/types`); `Part4Data` itself is imported from `@/lib/store/types` (not re-declared in `part4-year-form.tsx`).
- Produces (consumed by Task 3): `YearKey`, `BudgetGroupKind`, `ExpenseClass`, `CycleGroupDescriptor { kind; projectId?; label; activeYears: YearKey[] }`, `CycleYearCell { id; qty; unitCost }`, `CycleRow { rowKey; group; expenseClass; item; office; uacsCode; uacsLabel; fundSource; cells: Record<YearKey, CycleYearCell | null> }`, and functions `groupLineItemsAcrossCycle`, `updateRowSharedFields`, `updateYearCell`, `addYearCell`, `clearYearCell`, `reassignRow`, `addNewRow`, `deleteRow` — every mutation function returns `{ part4: Part4Data; touchedYears: YearKey[] }` (`addNewRow` also returns `row: CycleRow`).

- [ ] **Step 1: Write the failing verify script**

Create `scripts/verify-part4-cycle-model.ts`:

```ts
// Verify Part IV Cycle View's pure grouping/mutation model.
// Run: npx tsx scripts/verify-part4-cycle-model.ts   (expect: ALL CHECKS PASSED)
import assert from "node:assert/strict";
import {
  groupLineItemsAcrossCycle,
  updateRowSharedFields,
  updateYearCell,
  addYearCell,
  clearYearCell,
  reassignRow,
  addNewRow,
  deleteRow,
  type CycleGroupDescriptor,
} from "../src/components/issp-editor/part4/part4-cycle-model";
import type { Part4Data, LineItem, YearBudget } from "../src/lib/store/types";

function line(id: string, item: string, opts?: Partial<LineItem>): LineItem {
  return {
    id, item, office: "", uacsCode: "", uacsLabel: "",
    fundSource: "General Appropriations Act", qty: 1, unitCost: 100,
    ...opts,
  };
}

function emptyYear(): YearBudget {
  return {
    officeProductivity: { capitalOutlay: [], mooe: [] },
    internalProjects: {},
    crossAgencyProjects: {},
    continuingCosts: { mooe: [] },
  };
}

function emptyPart4(): Part4Data {
  return { year1: emptyYear(), year2: emptyYear(), year3: emptyYear() };
}

const proj: CycleGroupDescriptor = {
  kind: "internalProject", projectId: "proj-a", label: "Project A",
  activeYears: ["year1", "year2", "year3"],
};

// ── grouping: an item present in all 3 years merges into one row ───────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "Internet Subscription")] };
  part4.year2.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m2", "Internet Subscription")] };
  part4.year3.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m3", "Internet Subscription")] };

  const rows = groupLineItemsAcrossCycle(part4, [proj]);
  assert.equal(rows.length, 1, "same-name item across 3 years merges into one row");
  assert.equal(rows[0].cells.year1?.id, "m1");
  assert.equal(rows[0].cells.year2?.id, "m2");
  assert.equal(rows[0].cells.year3?.id, "m3");
}

// ── grouping: item present in only one year leaves the other cells blank ──
{
  const part4 = emptyPart4();
  part4.year2.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "One-off Training")] };
  const rows = groupLineItemsAcrossCycle(part4, [proj]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cells.year1, null);
  assert.equal(rows[0].cells.year2?.id, "m1");
  assert.equal(rows[0].cells.year3, null);
}

// ── grouping: duplicate names in the same group+class pair in list order ──
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = {
    projectTitle: "Project A", capitalOutlay: [],
    mooe: [line("a", "Software License"), line("b", "Software License")],
  };
  part4.year2.internalProjects["proj-a"] = {
    projectTitle: "Project A", capitalOutlay: [], mooe: [line("c", "Software License")],
  };
  const rows = groupLineItemsAcrossCycle(part4, [proj]);
  assert.equal(rows.length, 2, "two Year 1 items stay two rows");
  assert.equal(rows[0].cells.year1?.id, "a");
  assert.equal(rows[0].cells.year2?.id, "c", "Year 2's single item pairs with the FIRST Year 1 row");
  assert.equal(rows[1].cells.year1?.id, "b");
  assert.equal(rows[1].cells.year2, null, "second Year 1 row has no Year 2 match left");
}

// ── updateRowSharedFields: rename propagates to every populated year, and
//    does not cause the row to re-split when regrouped ────────────────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "Old Name")] };
  part4.year2.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m2", "Old Name")] };
  const row = groupLineItemsAcrossCycle(part4, [proj])[0];

  const result = updateRowSharedFields(part4, row, { item: "New Name" });
  assert.deepEqual([...result.touchedYears].sort(), ["year1", "year2"]);
  assert.equal(result.part4.year1.internalProjects["proj-a"].mooe[0].item, "New Name");
  assert.equal(result.part4.year2.internalProjects["proj-a"].mooe[0].item, "New Name");
  const rowsAfter = groupLineItemsAcrossCycle(result.part4, [proj]);
  assert.equal(rowsAfter.length, 1, "rename does not split the row");
}

// ── updateYearCell: only the targeted year changes ─────────────────────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "Hosting", { qty: 1, unitCost: 500 })] };
  part4.year2.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m2", "Hosting", { qty: 1, unitCost: 500 })] };
  const row = groupLineItemsAcrossCycle(part4, [proj])[0];

  const result = updateYearCell(part4, row, "year1", { unitCost: 750 });
  assert.deepEqual(result.touchedYears, ["year1"]);
  assert.equal(result.part4.year1.internalProjects["proj-a"].mooe[0].unitCost, 750);
  assert.equal(result.part4.year2.internalProjects["proj-a"].mooe[0].unitCost, 500, "year2 untouched");
}

// ── addYearCell: fills a blank cell using the row's shared fields, even when
//    that project's per-year budget record does not exist yet (auto-create,
//    must not silently no-op) ───────────────────────────────────────────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = {
    projectTitle: "Project A", capitalOutlay: [],
    mooe: [line("m1", "Cloud Backup", { office: "Central Office", fundSource: "Locally funded" })],
  };
  // Note: year2 has NO "proj-a" record at all yet.
  const row = groupLineItemsAcrossCycle(part4, [proj])[0];
  assert.equal(row.cells.year2, null);

  const result = addYearCell(part4, row, "year2");
  assert.deepEqual(result.touchedYears, ["year2"]);
  const added = result.part4.year2.internalProjects["proj-a"]?.mooe[0];
  assert.ok(added, "year2 project record was auto-created, not skipped");
  assert.equal(added.item, "Cloud Backup");
  assert.equal(added.office, "Central Office");
  assert.equal(added.fundSource, "Locally funded");
  assert.equal(added.qty, 1);
  assert.equal(added.unitCost, 0);
}

// ── clearYearCell: removes just that year, others stay ─────────────────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "Item")] };
  part4.year2.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m2", "Item")] };
  const row = groupLineItemsAcrossCycle(part4, [proj])[0];

  const result = clearYearCell(part4, row, "year1");
  assert.deepEqual(result.touchedYears, ["year1"]);
  assert.equal(result.part4.year1.internalProjects["proj-a"].mooe.length, 0);
  assert.equal(result.part4.year2.internalProjects["proj-a"].mooe.length, 1, "year2 untouched");
}

// ── deleteRow: removes every populated year in one call ────────────────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "Item"), line("keep", "Other Item")] };
  part4.year3.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m3", "Item")] };
  const row = groupLineItemsAcrossCycle(part4, [proj]).find((r) => r.item === "Item")!;

  const result = deleteRow(part4, row);
  assert.deepEqual([...result.touchedYears].sort(), ["year1", "year3"]);
  assert.deepEqual(result.part4.year1.internalProjects["proj-a"].mooe.map((l) => l.id), ["keep"]);
  assert.equal(result.part4.year3.internalProjects["proj-a"].mooe.length, 0);
}

// ── reassignRow: moves every populated year to the new group/class, never
//    drops a year's data even if the target project's duration is shorter ──
{
  const projB: CycleGroupDescriptor = {
    kind: "crossAgencyProject", projectId: "proj-b", label: "Project B",
    activeYears: ["year1", "year2", "year3"],
  };
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [line("c1", "Server")], mooe: [] };
  const row = groupLineItemsAcrossCycle(part4, [proj, projB]).find((r) => r.item === "Server")!;

  const result = reassignRow(part4, row, projB, "mooe");
  assert.equal(result.part4.year1.internalProjects["proj-a"].capitalOutlay.length, 0, "removed from old location");
  assert.equal(result.part4.year1.crossAgencyProjects["proj-b"]?.mooe.length, 1, "added to new location");
  assert.equal(result.part4.year1.crossAgencyProjects["proj-b"]?.mooe[0].id, "c1", "same LineItem id preserved");
}

// ── addNewRow: only creates cells in the group's active years ──────────────
{
  const part4 = emptyPart4();
  const lateProj: CycleGroupDescriptor = {
    kind: "internalProject", projectId: "proj-late", label: "Late-Starting Project",
    activeYears: ["year2", "year3"],
  };
  const result = addNewRow(part4, lateProj, "mooe");
  assert.deepEqual(result.touchedYears, ["year2", "year3"]);
  assert.equal(result.row.cells.year1, null);
  assert.equal(result.part4.year2.internalProjects["proj-late"]?.mooe.length, 1);
  assert.equal(result.part4.year3.internalProjects["proj-late"]?.mooe.length, 1);
  assert.equal(result.part4.year1.internalProjects["proj-late"], undefined, "year1 untouched — outside duration");
}

console.log("ALL CHECKS PASSED");
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx scripts/verify-part4-cycle-model.ts`
Expected: FAIL — module `../src/components/issp-editor/part4/part4-cycle-model` does not exist.

- [ ] **Step 3: Implement**

Create `src/components/issp-editor/part4/part4-cycle-model.ts`:

```ts
import { uuid } from "@/lib/uuid";
import type { Part4Data } from "@/lib/store/types";
import type { LineItem, YearBudget } from "./part4-year-form";

export type YearKey = "year1" | "year2" | "year3";
export type BudgetGroupKind = "officeProductivity" | "internalProject" | "crossAgencyProject" | "continuingCosts";
export type ExpenseClass = "capitalOutlay" | "mooe";

export const YEAR_KEYS: YearKey[] = ["year1", "year2", "year3"];

export interface CycleGroupDescriptor {
  kind: BudgetGroupKind;
  /** Set when kind is internalProject or crossAgencyProject. */
  projectId?: string;
  label: string;
  /** Years this group's project duration covers (all three for non-project groups). */
  activeYears: YearKey[];
}

export interface CycleYearCell {
  id: string;
  qty: number;
  unitCost: number;
}

export interface CycleRow {
  rowKey: string;
  group: CycleGroupDescriptor;
  expenseClass: ExpenseClass;
  item: string;
  office: string;
  uacsCode: string;
  uacsLabel: string;
  fundSource: string;
  cells: Record<YearKey, CycleYearCell | null>;
}

function expenseClassesForGroup(kind: BudgetGroupKind): ExpenseClass[] {
  return kind === "continuingCosts" ? ["mooe"] : ["capitalOutlay", "mooe"];
}

/** Read the LineItem[] at a group+class location for one year. */
export function getBucket(year: YearBudget, group: CycleGroupDescriptor, expenseClass: ExpenseClass): LineItem[] {
  if (group.kind === "officeProductivity") return year.officeProductivity[expenseClass];
  if (group.kind === "continuingCosts") return year.continuingCosts.mooe;
  if (!group.projectId) return [];
  const budget = group.kind === "internalProject"
    ? year.internalProjects[group.projectId]
    : year.crossAgencyProjects[group.projectId];
  return budget ? budget[expenseClass] : [];
}

/**
 * Replace the LineItem[] at a group+class location for one year. For a
 * project group whose per-year ProjectBudget record doesn't exist yet
 * (e.g. the project's duration starts in a later year, or it was only just
 * added), this CREATES the record rather than silently discarding the
 * write — a caller must never lose an edit because the year's bucket
 * hadn't been initialized.
 */
export function setBucket(
  year: YearBudget,
  group: CycleGroupDescriptor,
  expenseClass: ExpenseClass,
  lines: LineItem[]
): YearBudget {
  if (group.kind === "officeProductivity") {
    return { ...year, officeProductivity: { ...year.officeProductivity, [expenseClass]: lines } };
  }
  if (group.kind === "continuingCosts") {
    return { ...year, continuingCosts: { mooe: lines } };
  }
  if (!group.projectId) return year;
  if (group.kind === "internalProject") {
    const existing = year.internalProjects[group.projectId] ?? { projectTitle: group.label, capitalOutlay: [], mooe: [] };
    return {
      ...year,
      internalProjects: { ...year.internalProjects, [group.projectId]: { ...existing, [expenseClass]: lines } },
    };
  }
  const existing = year.crossAgencyProjects[group.projectId] ?? { projectTitle: group.label, capitalOutlay: [], mooe: [] };
  return {
    ...year,
    crossAgencyProjects: { ...year.crossAgencyProjects, [group.projectId]: { ...existing, [expenseClass]: lines } },
  };
}

/**
 * Group LineItems across year1/year2/year3 into cross-year rows, matched on
 * (group, expense class, item name). Processes years in order and, within a
 * year, items in array order — an item pairs with the FIRST existing row in
 * its group+class whose name matches and which doesn't have this year's
 * cell filled yet, else it starts a new row. Two distinct items that share a
 * name within the same group+class can therefore mis-pair; this is an
 * accepted trade-off documented in the design spec (no schema change).
 */
export function groupLineItemsAcrossCycle(part4: Part4Data, groups: CycleGroupDescriptor[]): CycleRow[] {
  const rows: CycleRow[] = [];
  let seq = 0;

  for (const year of YEAR_KEYS) {
    const yearBudget = part4[year];
    for (const group of groups) {
      for (const expenseClass of expenseClassesForGroup(group.kind)) {
        const lines = getBucket(yearBudget, group, expenseClass);
        for (const lineItem of lines) {
          const name = lineItem.item.trim();
          const match = rows.find(
            (r) =>
              r.group.kind === group.kind &&
              r.group.projectId === group.projectId &&
              r.expenseClass === expenseClass &&
              r.item.trim() === name &&
              r.cells[year] === null
          );
          const cell: CycleYearCell = { id: lineItem.id, qty: lineItem.qty, unitCost: lineItem.unitCost };
          if (match) {
            match.cells[year] = cell;
          } else {
            rows.push({
              rowKey: `row-${seq++}`,
              group,
              expenseClass,
              item: lineItem.item,
              office: lineItem.office,
              uacsCode: lineItem.uacsCode,
              uacsLabel: lineItem.uacsLabel,
              fundSource: lineItem.fundSource,
              cells: { year1: null, year2: null, year3: null, [year]: cell },
            });
          }
        }
      }
    }
  }
  return rows;
}

function applyToYears(
  part4: Part4Data,
  row: CycleRow,
  years: YearKey[],
  mutate: (lines: LineItem[], year: YearKey) => LineItem[]
): { part4: Part4Data; touchedYears: YearKey[] } {
  let next = part4;
  for (const year of years) {
    const yearBudget = next[year];
    const lines = getBucket(yearBudget, row.group, row.expenseClass);
    const nextLines = mutate(lines, year);
    next = { ...next, [year]: setBucket(yearBudget, row.group, row.expenseClass, nextLines) };
  }
  return { part4: next, touchedYears: years };
}

/** Row-level fields (name/office/UACS/fund source) — edits every populated year at once. */
export function updateRowSharedFields(
  part4: Part4Data,
  row: CycleRow,
  patch: Partial<Pick<LineItem, "item" | "office" | "uacsCode" | "uacsLabel" | "fundSource">>
): { part4: Part4Data; touchedYears: YearKey[] } {
  const years = YEAR_KEYS.filter((y) => row.cells[y] !== null);
  return applyToYears(part4, row, years, (lines, year) => {
    const cell = row.cells[year];
    return cell ? lines.map((l) => (l.id === cell.id ? { ...l, ...patch } : l)) : lines;
  });
}

/** Per-year-cell fields (qty/unit cost) — edits only the given year. */
export function updateYearCell(
  part4: Part4Data,
  row: CycleRow,
  year: YearKey,
  patch: Partial<Pick<LineItem, "qty" | "unitCost">>
): { part4: Part4Data; touchedYears: YearKey[] } {
  const cell = row.cells[year];
  if (!cell) return { part4, touchedYears: [] };
  return applyToYears(part4, row, [year], (lines) => lines.map((l) => (l.id === cell.id ? { ...l, ...patch } : l)));
}

/** Creates a new LineItem in a blank year cell, copying the row's shared fields. */
export function addYearCell(part4: Part4Data, row: CycleRow, year: YearKey): { part4: Part4Data; touchedYears: YearKey[] } {
  if (row.cells[year] !== null) return { part4, touchedYears: [] };
  const newLine: LineItem = {
    id: uuid(), item: row.item, office: row.office, uacsCode: row.uacsCode,
    uacsLabel: row.uacsLabel, fundSource: row.fundSource, qty: 1, unitCost: 0,
  };
  return applyToYears(part4, row, [year], (lines) => [...lines, newLine]);
}

/** Removes just one year's LineItem, leaving the row's other years intact. */
export function clearYearCell(part4: Part4Data, row: CycleRow, year: YearKey): { part4: Part4Data; touchedYears: YearKey[] } {
  const cell = row.cells[year];
  if (!cell) return { part4, touchedYears: [] };
  return applyToYears(part4, row, [year], (lines) => lines.filter((l) => l.id !== cell.id));
}

/** Removes the row's LineItem from every year it currently spans. */
export function deleteRow(part4: Part4Data, row: CycleRow): { part4: Part4Data; touchedYears: YearKey[] } {
  const years = YEAR_KEYS.filter((y) => row.cells[y] !== null);
  return applyToYears(part4, row, years, (lines, year) => {
    const cell = row.cells[year];
    return cell ? lines.filter((l) => l.id !== cell.id) : lines;
  });
}

/**
 * Moves every populated year's LineItem from the row's current group+class
 * to a new one. Never drops a year's data, even if the target group's
 * activeYears is narrower than the row's populated years — a reassignment
 * that lands outside the target project's duration surfaces through the
 * same "outside project duration" legacy-data warning the per-year pages
 * already show, rather than silently discarding budget data.
 */
export function reassignRow(
  part4: Part4Data,
  row: CycleRow,
  newGroup: CycleGroupDescriptor,
  newExpenseClass: ExpenseClass
): { part4: Part4Data; touchedYears: YearKey[] } {
  const years = YEAR_KEYS.filter((y) => row.cells[y] !== null);
  let next = part4;
  for (const year of years) {
    const cell = row.cells[year];
    if (!cell) continue;
    const yearBudget = next[year];
    const oldLines = getBucket(yearBudget, row.group, row.expenseClass);
    const moved = oldLines.find((l) => l.id === cell.id);
    if (!moved) continue;
    const withoutOld = setBucket(yearBudget, row.group, row.expenseClass, oldLines.filter((l) => l.id !== cell.id));
    const newLines = getBucket(withoutOld, newGroup, newExpenseClass);
    const withNew = setBucket(withoutOld, newGroup, newExpenseClass, [...newLines, moved]);
    next = { ...next, [year]: withNew };
  }
  return { part4: next, touchedYears: years };
}

/** Creates a brand-new row, populated in every year the group is active for. */
export function addNewRow(
  part4: Part4Data,
  group: CycleGroupDescriptor,
  expenseClass: ExpenseClass
): { part4: Part4Data; touchedYears: YearKey[]; row: CycleRow } {
  const cells: Record<YearKey, CycleYearCell | null> = { year1: null, year2: null, year3: null };
  let next = part4;
  for (const year of group.activeYears) {
    const newLine: LineItem = {
      id: uuid(), item: "", office: "", uacsCode: "", uacsLabel: "",
      fundSource: "General Appropriations Act", qty: 1, unitCost: 0,
    };
    const yearBudget = next[year];
    const lines = getBucket(yearBudget, group, expenseClass);
    next = { ...next, [year]: setBucket(yearBudget, group, expenseClass, [...lines, newLine]) };
    cells[year] = { id: newLine.id, qty: newLine.qty, unitCost: newLine.unitCost };
  }
  const row: CycleRow = {
    rowKey: `row-new-${uuid()}`, group, expenseClass,
    item: "", office: "", uacsCode: "", uacsLabel: "", fundSource: "General Appropriations Act",
    cells,
  };
  return { part4: next, touchedYears: [...group.activeYears], row };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsx scripts/verify-part4-cycle-model.ts`
Expected: `ALL CHECKS PASSED`

- [ ] **Step 5: Type gate**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/issp-editor/part4/part4-cycle-model.ts scripts/verify-part4-cycle-model.ts
git commit -m "$(cat <<'EOF'
feat(part4): cross-year line-item grouping/mutation model

Pure module that groups Part IV LineItems across year1/2/3 into
cross-year rows (matched by group+class+name, no schema change) and
exposes edit/add/remove/reassign operations that return updated
Part4Data — the data layer for the new Cycle View page.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Register the Cycle View section

**Files:**
- Modify: `src/lib/sections.ts:50-57`
- Modify: `src/lib/section-fields.ts:117-133`
- Modify: `src/lib/store/index.tsx` (near line 388, alongside `maybeSet("part4/summary", anyYear)`)

**Interfaces:**
- Consumes: nothing new.
- Produces: section id `"part4/cycle"`, visible/reachable via `SectionShell` and the sidebar nav exactly like `"part4/summary"` (readOnly for status-tracking purposes only — this flag does not gate editability anywhere in the codebase, confirmed by exhaustive grep; it only excludes a section from `computePartStatus`'s rollup and hides its `StatusDot` in three UI locations). Consumed by Task 4's route page (`sectionId="part4/cycle"` passed to `SectionShell`).

- [ ] **Step 1: Add the section entry**

In `src/lib/sections.ts`, in the Part IV group (around line 50-57):

```ts
  {
    partNum: 4, part: "IV", title: "Resource Requirements", color: "var(--part)",
    sections: [
      { id: "part4/year1",   label: "Year 1 Breakdown",       href: "/editor/part4/year1"   },
      { id: "part4/year2",   label: "Year 2 Breakdown",       href: "/editor/part4/year2"   },
      { id: "part4/year3",   label: "Year 3 Breakdown",       href: "/editor/part4/year3"   },
      { id: "part4/cycle",   label: "Cycle View (All Years)", href: "/editor/part4/cycle",  readOnly: true },
      { id: "part4/summary", label: "Summary of Investments", href: "/editor/part4/summary", readOnly: true },
    ],
  },
```

- [ ] **Step 2: Register empty fields (no unique data)**

In `src/lib/section-fields.ts`, after the `"part4/year3"` entry (around line 128):

```ts
  "part4/cycle": {
    partKey: "part4",
    fields: [], // writable, but every field belongs to part4/year1-3 — no unique data of its own
  },
```

- [ ] **Step 3: Derive its completion meta from the same year content as summary**

In `src/lib/store/index.tsx`, right after the existing `maybeSet("part4/summary", anyYear);` line (~388):

```ts
  maybeSet("part4/cycle", anyYear);
```

- [ ] **Step 4: Type gate**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sections.ts src/lib/section-fields.ts src/lib/store/index.tsx
git commit -m "$(cat <<'EOF'
feat(part4): register the Cycle View section

Adds part4/cycle to the section registry the same way part4/summary
is registered — readOnly for status-tracking purposes (excluded from
Part IV's completion rollup and its own StatusDot) since it edits
data that part4/year1-3 already own, not a second copy of it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Cycle View UI component

**Files:**
- Create: `src/components/issp-editor/part4/part4-cycle-view.tsx`

**Interfaces:**
- Consumes: everything exported from Task 1's `part4-cycle-model.ts`; `SectionShell` (`src/components/editor/section-shell.tsx`) for the page chrome; `UacsCombobox` (`src/components/issp-editor/uacs-combobox.tsx`); `NumberInput` (`src/components/ui/number-input`); `Button` (`src/components/ui/button`); `php` (`@/lib/utils`); `useIsspStore` (`@/lib/store`) for `updatePart4`/`updateSectionMeta`.
- Produces (consumed by Task 4): `export function Part4CycleView(props: { part4: Part4Data; planYears: [string, string, string]; internalProjects: IctProject[]; crossAgencyProjects: IctProject[]; hideNonProjectCategories: boolean })`.

- [ ] **Step 1: Implement the component**

Create `src/components/issp-editor/part4/part4-cycle-view.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { UacsCombobox } from "@/components/issp-editor/uacs-combobox";
import { SectionShell } from "@/components/editor/section-shell";
import { useIsspStore } from "@/lib/store";
import { php } from "@/lib/utils";
import { durationCoversYear } from "@/lib/duration";
import type { IctProject, LineItem, Part4Data } from "@/lib/store/types";
import {
  YEAR_KEYS,
  groupLineItemsAcrossCycle,
  updateRowSharedFields,
  updateYearCell,
  addYearCell,
  clearYearCell,
  reassignRow,
  addNewRow,
  deleteRow,
  type CycleGroupDescriptor,
  type CycleRow as CycleRowData,
  type CycleYearCell,
  type ExpenseClass,
  type YearKey,
} from "./part4-cycle-model";

const FUND_SOURCES = [
  "General Appropriations Act",
  "Foreign-assisted projects",
  "Locally funded",
  "Other Income Generating Sources",
];
const OFFICE_SUGGESTIONS = ["Central Office", "Regional Offices", "Central Office and Regional Offices"];
const OFFICE_LIST_ID = "issp-cycle-office-suggestions";
const INPUT_CLS =
  "w-full rounded px-2 py-1.5 text-sm bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring";

function lineTotal(cell: CycleYearCell | null) {
  return cell ? cell.qty * cell.unitCost : 0;
}
function rowTotal(row: CycleRowData) {
  return YEAR_KEYS.reduce((s, y) => s + lineTotal(row.cells[y]), 0);
}
function groupKeyOf(g: CycleGroupDescriptor) {
  return `${g.kind}::${g.projectId ?? ""}`;
}

interface Part4CycleViewProps {
  part4: Part4Data;
  planYears: [string, string, string];
  internalProjects: IctProject[];
  crossAgencyProjects: IctProject[];
  hideNonProjectCategories: boolean;
}

export function Part4CycleView({
  part4: initialPart4,
  planYears,
  internalProjects,
  crossAgencyProjects,
  hideNonProjectCategories,
}: Part4CycleViewProps) {
  const { updatePart4, updateSectionMeta } = useIsspStore();
  const [part4, setPart4] = useState(initialPart4);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function save(next: Part4Data, touchedYears: YearKey[]) {
    setPart4(next);
    if (touchedYears.length === 0) return;
    const patch: Partial<Part4Data> = {};
    for (const y of touchedYears) patch[y] = next[y];
    updatePart4(patch);
    const ts = new Date().toISOString();
    for (const y of touchedYears) updateSectionMeta(`part4/${y}`, { lastEditedAt: ts });
  }

  const groups = useMemo<CycleGroupDescriptor[]>(() => {
    const activeYearsFor = (duration: string): YearKey[] =>
      YEAR_KEYS.filter((_, i) => durationCoversYear(duration ?? "", planYears[i], planYears));
    const list: CycleGroupDescriptor[] = [];
    if (!hideNonProjectCategories) {
      list.push({ kind: "officeProductivity", label: "Office Productivity", activeYears: YEAR_KEYS });
    }
    for (const p of internalProjects) {
      list.push({ kind: "internalProject", projectId: p.id, label: p.title, activeYears: activeYearsFor(p.duration) });
    }
    for (const p of crossAgencyProjects) {
      list.push({ kind: "crossAgencyProject", projectId: p.id, label: p.title, activeYears: activeYearsFor(p.duration) });
    }
    if (!hideNonProjectCategories) {
      list.push({ kind: "continuingCosts", label: "Continuing Costs", activeYears: YEAR_KEYS });
    }
    return list;
  }, [internalProjects, crossAgencyProjects, hideNonProjectCategories, planYears]);

  const allRows = useMemo(() => groupLineItemsAcrossCycle(part4, groups), [part4, groups]);

  const q = query.trim().toLowerCase();
  const visibleRows = q
    ? allRows.filter((r) => [r.item, r.office, r.uacsCode, r.uacsLabel, r.group.label].some((f) => f.toLowerCase().includes(q)))
    : allRows;

  const grandTotal = allRows.reduce((s, r) => s + rowTotal(r), 0);

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleReassign(row: CycleRowData, group: CycleGroupDescriptor, expenseClass: ExpenseClass) {
    const finalClass: ExpenseClass = group.kind === "continuingCosts" ? "mooe" : expenseClass;
    const r = reassignRow(part4, row, group, finalClass);
    save(r.part4, r.touchedYears);
  }

  return (
    <SectionShell
      sectionId="part4/cycle"
      title="Cycle View — All Years"
      description="Every Part IV line item across the full 3-year cycle, grouped by project and expense class."
      statBlock={{ label: "Cycle Total", value: php(grandTotal) }}
      hideMarkDone
    >
      <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by item, office, UACS code, or project…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <datalist id={OFFICE_LIST_ID}>
        {OFFICE_SUGGESTIONS.map((o) => <option key={o} value={o} />)}
      </datalist>

      {groups.map((group) => {
        const key = groupKeyOf(group);
        const groupRows = visibleRows.filter((r) => r.group === group);
        if (q && groupRows.length === 0) return null;
        const isCollapsed = collapsed.has(key);
        const groupTotal = allRows.filter((r) => r.group === group).reduce((s, r) => s + rowTotal(r), 0);
        const classes: ExpenseClass[] = group.kind === "continuingCosts" ? ["mooe"] : ["capitalOutlay", "mooe"];

        return (
          <div key={key} className="space-y-3 border-t pt-6 first:border-t-0 first:pt-0">
            <button type="button" onClick={() => toggle(key)} className="flex w-full items-center justify-between gap-2 text-left">
              <span className="flex items-center gap-1.5 font-semibold text-base">
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {group.label}
              </span>
              <span className="text-sm font-semibold tabular-nums">{php(groupTotal)}</span>
            </button>
            {!isCollapsed && classes.map((expenseClass) => (
              <CycleSubTable
                key={expenseClass}
                title={expenseClass === "capitalOutlay" ? "Capital Outlay" : "Maintenance and Other Operating Expenses"}
                planYears={planYears}
                rows={groupRows.filter((r) => r.expenseClass === expenseClass)}
                groups={groups}
                currentGroup={group}
                currentExpenseClass={expenseClass}
                onAdd={() => { const r = addNewRow(part4, group, expenseClass); save(r.part4, r.touchedYears); }}
                onEditShared={(row, patch) => { const r = updateRowSharedFields(part4, row, patch); save(r.part4, r.touchedYears); }}
                onEditYear={(row, year, patch) => { const r = updateYearCell(part4, row, year, patch); save(r.part4, r.touchedYears); }}
                onAddYear={(row, year) => { const r = addYearCell(part4, row, year); save(r.part4, r.touchedYears); }}
                onClearYear={(row, year) => { const r = clearYearCell(part4, row, year); save(r.part4, r.touchedYears); }}
                onDeleteRow={(row) => {
                  if (!confirm(`Remove "${row.item || "this item"}" from every year? This cannot be undone.`)) return;
                  const r = deleteRow(part4, row);
                  save(r.part4, r.touchedYears);
                }}
                onReassign={handleReassign}
              />
            ))}
          </div>
        );
      })}

      {allRows.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 font-bold">
          <span>Grand Total (All Years)</span>
          <span className="tabular-nums">{php(grandTotal)}</span>
        </div>
      )}
    </SectionShell>
  );
}

function CycleSubTable({
  title,
  planYears,
  rows,
  groups,
  currentGroup,
  currentExpenseClass,
  onAdd,
  onEditShared,
  onEditYear,
  onAddYear,
  onClearYear,
  onDeleteRow,
  onReassign,
}: {
  title: string;
  planYears: [string, string, string];
  rows: CycleRowData[];
  groups: CycleGroupDescriptor[];
  currentGroup: CycleGroupDescriptor;
  currentExpenseClass: ExpenseClass;
  onAdd: () => void;
  onEditShared: (row: CycleRowData, patch: Partial<Pick<LineItem, "item" | "office" | "uacsCode" | "uacsLabel" | "fundSource">>) => void;
  onEditYear: (row: CycleRowData, year: YearKey, patch: Partial<Pick<LineItem, "qty" | "unitCost">>) => void;
  onAddYear: (row: CycleRowData, year: YearKey) => void;
  onClearYear: (row: CycleRowData, year: YearKey) => void;
  onDeleteRow: (row: CycleRowData) => void;
  onReassign: (row: CycleRowData, group: CycleGroupDescriptor, expenseClass: ExpenseClass) => void;
}) {
  const subtotal = rows.reduce((s, r) => s + rowTotal(r), 0);

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="flex items-center justify-between gap-2 bg-muted/40 border-b px-4 py-2.5">
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tabular-nums">{php(subtotal)}</span>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onAdd}>
            <Plus className="h-3 w-3" /> Add Line
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="border-r px-3 py-2 text-left font-semibold w-40">Project / Category</th>
              <th className="border-r px-3 py-2 text-left font-semibold w-28">Class</th>
              <th className="border-r px-3 py-2 text-left font-semibold">Item / Description</th>
              <th className="border-r px-3 py-2 text-left font-semibold w-28">Office</th>
              <th className="border-r px-3 py-2 text-left font-semibold w-32">UACS</th>
              <th className="border-r px-3 py-2 text-left font-semibold w-36">Fund Source</th>
              {planYears.map((label) => (
                <th key={label} className="border-r px-3 py-2 text-right font-semibold w-44">{label}</th>
              ))}
              <th className="border-r px-3 py-2 text-right font-semibold w-28">Cycle Total</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground text-sm border-b">
                  No items yet.{" "}
                  <button type="button" onClick={onAdd} className="font-medium text-primary hover:underline">Add one.</button>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.rowKey} className="hover:bg-muted/20 border-b align-top">
                <td className="border-r px-2 py-1">
                  <select
                    className="w-full rounded px-2 py-1.5 text-xs bg-card/70 hover:bg-card border-0 cursor-pointer"
                    value={groupKeyOf(currentGroup)}
                    onChange={(e) => {
                      const target = groups.find((g) => groupKeyOf(g) === e.target.value);
                      if (target) onReassign(row, target, currentExpenseClass);
                    }}
                  >
                    {groups.map((g) => <option key={groupKeyOf(g)} value={groupKeyOf(g)}>{g.label}</option>)}
                  </select>
                </td>
                <td className="border-r px-2 py-1">
                  <select
                    className="w-full rounded px-2 py-1.5 text-xs bg-card/70 hover:bg-card border-0 cursor-pointer disabled:opacity-50"
                    value={currentExpenseClass}
                    disabled={currentGroup.kind === "continuingCosts"}
                    onChange={(e) => onReassign(row, currentGroup, e.target.value as ExpenseClass)}
                  >
                    <option value="capitalOutlay">Capital Outlay</option>
                    <option value="mooe">MOOE</option>
                  </select>
                </td>
                <td className="border-r px-2 py-1">
                  <input
                    type="text" className={INPUT_CLS} placeholder="Item description…"
                    value={row.item} onChange={(e) => onEditShared(row, { item: e.target.value })}
                  />
                </td>
                <td className="border-r px-2 py-1">
                  <input
                    type="text" list={OFFICE_LIST_ID} className={INPUT_CLS} placeholder="Office…"
                    value={row.office} onChange={(e) => onEditShared(row, { office: e.target.value })}
                  />
                </td>
                <td className="border-r px-2 py-1">
                  <UacsCombobox
                    value={row.uacsCode}
                    context={currentExpenseClass === "capitalOutlay" ? "co" : "mooe"}
                    onChange={(uacs, label) => onEditShared(row, { uacsCode: uacs, uacsLabel: label })}
                    className="text-xs"
                  />
                </td>
                <td className="border-r px-2 py-1">
                  <select
                    className="w-full rounded px-2 py-1.5 text-xs bg-card/70 hover:bg-card border-0 cursor-pointer"
                    value={row.fundSource} onChange={(e) => onEditShared(row, { fundSource: e.target.value })}
                  >
                    {FUND_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                {YEAR_KEYS.map((year) => (
                  <td key={year} className="border-r px-2 py-1">
                    {row.cells[year] ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <NumberInput
                            unstyled min={1} className={`${INPUT_CLS} text-right`}
                            value={row.cells[year]!.qty} onValueChange={(n) => onEditYear(row, year, { qty: n })}
                            aria-label={`${year} quantity`}
                          />
                          <span className="text-xs text-muted-foreground shrink-0">×</span>
                          <NumberInput
                            unstyled min={0} currency className={`${INPUT_CLS} text-right`}
                            value={row.cells[year]!.unitCost} onValueChange={(n) => onEditYear(row, year, { unitCost: n })}
                            aria-label={`${year} unit cost`}
                          />
                          <button
                            type="button" aria-label={`Clear ${year}`}
                            className="shrink-0 text-muted-foreground/50 hover:text-destructive"
                            onClick={() => onClearYear(row, year)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-right text-xs text-muted-foreground tabular-nums">{php(lineTotal(row.cells[year]))}</div>
                      </div>
                    ) : currentGroup.activeYears.includes(year) ? (
                      <button
                        type="button" onClick={() => onAddYear(row, year)}
                        className="w-full rounded px-2 py-1.5 text-xs text-muted-foreground/60 italic hover:bg-card hover:text-foreground text-center"
                      >
                        — add —
                      </button>
                    ) : (
                      <span className="block text-center text-xs text-muted-foreground/30 italic">n/a</span>
                    )}
                  </td>
                ))}
                <td className="border-r px-3 py-2 text-right tabular-nums text-sm font-medium">{php(rowTotal(row))}</td>
                <td className="px-1 py-1 text-center">
                  <Button
                    variant="ghost" size="icon" aria-label="Delete row"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteRow(row)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type gate**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean. Fix any prop-type mismatches against the real `NumberInput`/`UacsCombobox`/`Button` signatures (`src/components/ui/number-input.tsx`, `src/components/issp-editor/uacs-combobox.tsx`, `src/components/ui/button.tsx`) before moving on — this task has no runtime test of its own, so the type gate is the only automated check until Task 5's smoke.

- [ ] **Step 3: Commit**

```bash
git add src/components/issp-editor/part4/part4-cycle-view.tsx
git commit -m "$(cat <<'EOF'
feat(part4): Cycle View UI — grouped, searchable, inline-editable

Renders every Part IV line item across all three years in one page,
grouped by project/category and expense class, with inline add/edit/
reassign/remove wired to the pure model from part4-cycle-model.ts.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Route page

**Files:**
- Create: `src/app/editor/part4/cycle/page.tsx`

**Interfaces:**
- Consumes: `Part4CycleView` (Task 3), `useIsspStore` (`@/lib/store`), `yearsBetween` (`@/lib/duration`).
- Produces: the page reachable at `/editor/part4/cycle`.

- [ ] **Step 1: Implement**

Create `src/app/editor/part4/cycle/page.tsx`, following the exact pattern of `src/app/editor/part4/year1/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part4CycleView } from "@/components/issp-editor/part4/part4-cycle-view";
import { yearsBetween } from "@/lib/duration";

export default function Part4CyclePage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  const planYears = yearsBetween(doc.startYear, doc.endYear) as [string, string, string];

  return (
    <Part4CycleView
      part4={doc.part4}
      planYears={planYears}
      internalProjects={doc.part3.internalProjects}
      crossAgencyProjects={doc.part3.crossAgencyProjects}
      hideNonProjectCategories={doc.editScope?.projectIds !== undefined}
    />
  );
}
```

- [ ] **Step 2: Type gate**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 3: Manual check on the dev server**

Check the dev server is up (`ss -tlnp | grep :3000`; if absent, start `npm run dev` in the background — never `npm run build`/`npm start`). Load any `.issp` file (e.g. `public/demo/ncwtr-issp-2026-2028.issp`) via the home page's file picker, then navigate to `/editor/part4/cycle` in a real browser tab and confirm the page renders without a console error, shows the Office Productivity/project/Continuing Costs groups, and the sidebar nav shows a "Cycle View (All Years)" entry under Part IV without its own status dot (per Task 2).

- [ ] **Step 4: Commit**

```bash
git add src/app/editor/part4/cycle/page.tsx
git commit -m "$(cat <<'EOF'
feat(part4): wire the Cycle View route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: End-to-end Puppeteer smoke

**Files:**
- Create: `scripts/smoke-part4-cycle.mjs`

**Interfaces:**
- Consumes: the running dev server, `public/demo/ncwtr-issp-2026-2028.issp` fixture, the route from Task 4.
- Produces: a pass/fail console report; no code consumes this script's exports (it's a standalone runner).

- [ ] **Step 1: Write the smoke script**

Create `scripts/smoke-part4-cycle.mjs`:

```js
// End-to-end smoke for the Part IV Cycle View (/editor/part4/cycle):
//   load the demo fixture → open Cycle View → edit a year cell → add a new
//   line item → delete a row → assert every change lands in IDB.
//
// Carlos reaches dev over HTTP at the public IP = a NON-SECURE browsing
// context, where crypto.randomUUID is undefined. We reproduce that on
// localhost (reliable) by neutralizing crypto.randomUUID before each load —
// pattern copied verbatim from scripts/smoke-roundtrip.mjs.
//
// Prereq: dev server on :3000 (`ss -tlnp | grep :3000`; start `npm run dev`
// in the background if absent — never `npm run build`).
//   node scripts/smoke-part4-cycle.mjs
import puppeteer from "puppeteer";

const BASE = "http://localhost:3000";
const DEMO = "/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp";

const browser = await puppeteer.launch({
  executablePath: "/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const fails = [];
const fail = (m) => { console.error("  ASSERT FAIL:", m); fails.push(m); };
const ok = (m) => console.log("  ok:", m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function freshPage() {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  });
  p.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  return p;
}

async function loadFile(page, filePath) {
  await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 45000 });
  const input = await page.$('input[type="file"]');
  if (!input) throw new Error("no file input on home page");
  await input.uploadFile(filePath);
  await page.waitForFunction(() => location.pathname === "/editor", { timeout: 20000 });
  await page.waitForSelector("aside nav", { timeout: 15000 });
  await sleep(600);
}

async function readPart4(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open("issp-builder");
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("documents", "readonly");
      const getReq = tx.objectStore("documents").get("current");
      getReq.onsuccess = () => resolve(getReq.result?.part4 ?? null);
      getReq.onerror = () => reject(getReq.error);
      tx.oncomplete = () => db.close();
    };
    req.onerror = () => reject(req.error);
  }));
}

function countAllLines(part4) {
  let n = 0;
  for (const y of ["year1", "year2", "year3"]) {
    const yb = part4[y];
    n += yb.officeProductivity.capitalOutlay.length + yb.officeProductivity.mooe.length;
    n += yb.continuingCosts.mooe.length;
    for (const p of Object.values(yb.internalProjects)) n += p.capitalOutlay.length + p.mooe.length;
    for (const p of Object.values(yb.crossAgencyProjects)) n += p.capitalOutlay.length + p.mooe.length;
  }
  return n;
}

let page;
try {
  console.log("\n=== Load fixture, open Cycle View ===");
  page = await freshPage();
  await loadFile(page, DEMO);

  await page.goto(BASE + "/editor/part4/cycle", { waitUntil: "networkidle2", timeout: 20000 });
  await page.waitForSelector("table", { timeout: 15000 });
  const heading = await page.evaluate(() => document.body.textContent || "");
  if (!/Cycle View/.test(heading)) fail("page heading missing 'Cycle View'");
  else ok("Cycle View page rendered");

  const navText = await page.$eval("aside nav", (el) => el.textContent || "");
  if (!/Cycle View/.test(navText)) fail("sidebar nav missing Cycle View entry");
  else ok("sidebar nav shows Cycle View");

  console.log("\n=== Add a new line item ===");
  const before = await readPart4(page);
  const beforeCount = countAllLines(before);

  const addBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((b) => /Add Line/.test(b.textContent || ""))
  );
  if (!(await addBtn.asElement())) fail("no 'Add Line' button found");
  else await addBtn.asElement().click();
  await sleep(400);

  const afterAdd = await readPart4(page);
  const afterAddCount = countAllLines(afterAdd);
  if (afterAddCount <= beforeCount) fail(`expected line count to grow, before=${beforeCount} after=${afterAddCount}`);
  else ok(`Add Line grew total line count ${beforeCount} → ${afterAddCount}`);

  console.log("\n=== Edit the new row's item name and Year 1 unit cost ===");
  const nameInput = await page.$('table input[placeholder="Item description…"]');
  if (!nameInput) fail("new row's item-description input not found");
  else {
    await nameInput.click({ clickCount: 3 });
    await nameInput.type("Smoke Test Line Item");
    await nameInput.evaluate((el) => el.blur());
  }
  await sleep(400);

  const afterRename = await readPart4(page);
  const renamed = JSON.stringify(afterRename).includes("Smoke Test Line Item");
  if (!renamed) fail("renamed item text not found anywhere in IDB part4");
  else ok("row rename persisted to IDB");

  console.log("\n=== Delete the row ===");
  const deleteBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll('button[aria-label="Delete row"]')].find((b) => {
      const row = b.closest("tr");
      return row && /Smoke Test Line Item/.test(row.textContent || "");
    })
  );
  if (!(await deleteBtn.asElement())) fail("delete button for the smoke row not found");
  else {
    page.once("dialog", (d) => d.accept());
    await deleteBtn.asElement().click();
  }
  await sleep(400);

  const afterDelete = await readPart4(page);
  const stillThere = JSON.stringify(afterDelete).includes("Smoke Test Line Item");
  if (stillThere) fail("row still present in IDB after delete");
  else ok("row removed from IDB after delete");
  const afterDeleteCount = countAllLines(afterDelete);
  if (afterDeleteCount !== beforeCount) fail(`expected line count back to ${beforeCount}, got ${afterDeleteCount}`);
  else ok("line count returned to baseline after delete");

  console.log("\n=== Out-of-duration year cells ('n/a') are never editable ===");
  // Structural invariant, independent of which projects the fixture happens
  // to have short durations for: wherever the UI renders "n/a" for a year
  // cell (outside that project's Part III-E duration), it must not also
  // contain an input/button — those two states are mutually exclusive.
  const { naCount, naWithControls } = await page.evaluate(() => {
    const cells = [...document.querySelectorAll("table tbody td")];
    const naCells = cells.filter((td) => /^n\/a$/.test((td.textContent || "").trim()));
    return {
      naCount: naCells.length,
      naWithControls: naCells.filter((td) => td.querySelector("input, button")).length,
    };
  });
  if (naWithControls > 0) fail(`${naWithControls} 'n/a' cell(s) still contain an editable control`);
  else ok(`${naCount} out-of-duration cell(s) found in this fixture, none editable`);
} catch (e) {
  fail(`unexpected exception: ${e.message}`);
} finally {
  if (page) await page.close();
  await browser.close();
}

console.log(`\n${fails.length === 0 ? "ALL CHECKS PASSED" : `${fails.length} CHECK(S) FAILED`}`);
process.exit(fails.length === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it**

Ensure the dev server is up (`ss -tlnp | grep :3000`; start `npm run dev` in the background if not — never `npm run build`). Then:

Run: `node scripts/smoke-part4-cycle.mjs`
Expected: `ALL CHECKS PASSED`, exit code 0. If the "Add Line" button click lands on the wrong sub-table (multiple exist per group), tighten the selector to scope within the first visible `CycleSubTable`'s header before landing on a fix — don't loosen an assertion to make it pass.

- [ ] **Step 3: Full project type gate**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean (final check across all five tasks' changes together).

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-part4-cycle.mjs
git commit -m "$(cat <<'EOF'
test(part4): end-to-end smoke for Cycle View

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
