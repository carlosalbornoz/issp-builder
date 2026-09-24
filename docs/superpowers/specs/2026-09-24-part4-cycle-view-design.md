# Part IV — Cycle View design spec

**Status:** approved, ready for implementation planning
**Date:** 2026-09-24

## 1. Problem

Part IV resource requirements are entered on three separate pages, one per year
(`/editor/part4/year1`, `year2`, `year3` → `Part4YearForm`). Adjusting a
recurring line item across all three years — or comparing how a project's
budget shifts year to year — means clicking between three pages and holding
the other two years in your head. There's also no single place to add, edit,
or remove line items while seeing the full 3-year picture for a project or
expense class at once.

## 2. Goal

A new page, **Cycle View** (`/editor/part4/cycle`), that shows every Part IV
line item across all three years on one screen, grouped by project and
expense class, with full inline editing (including add/remove) that
autosaves the same way the rest of the app does.

## 3. Current data model (ground truth)

`src/lib/store/types.ts:362-390`:

```ts
export interface LineItem {
  id: string;
  item: string;
  office: string;
  uacsCode: string;
  uacsLabel: string;
  fundSource: string;
  qty: number;
  unitCost: number;
}

export interface ProjectBudget {
  projectTitle: string;
  capitalOutlay: LineItem[];
  mooe: LineItem[];
}

export interface YearBudget {
  officeProductivity: { capitalOutlay: LineItem[]; mooe: LineItem[] };
  internalProjects: Record<string, ProjectBudget>;     // keyed by IctProject.id
  crossAgencyProjects: Record<string, ProjectBudget>;  // keyed by IctProject.id
  continuingCosts: { mooe: LineItem[] };                // CO bucket does not exist here
}

export interface Part4Data { year1: YearBudget; year2: YearBudget; year3: YearBudget; }
```

Critically: **a `LineItem` carries no project id, no expense-class tag, and no
year.** All three are structural — determined by which array, under which
project record, under which `YearBudget`, the object sits in. There is also
no id shared between a Year 1 item and its Year 2/3 counterpart; each
`YearBudget` is independent. This shapes everything below.

Project records (`IctProject`, `src/lib/store/types.ts:291-310`) live in
`Part3Data.internalProjects` / `crossAgencyProjects`; their `id` is what keys
`YearBudget.internalProjects` / `crossAgencyProjects`, by construction
(`src/app/editor/part4/year1/page.tsx:27-28`). Each project also has a
`duration` string gating which years it's active in
(`durationCoversYear`, `src/lib/duration.ts`) — the per-year pages hide and
flag out-of-duration line items as "orphaned" (`part4-year-form.tsx:643-652`,
`669-676`). Cycle View follows the same rule: a project's columns for years
outside its duration are not editable (no add), matching today's behavior
rather than introducing a new one.

## 4. Cross-year row identity (no schema change)

A **Cycle View row** is computed at render time by grouping `LineItem`s
across `year1`/`year2`/`year3` on **(group, expense class, item name)**,
where "group" is one of: Office Productivity, a specific internal project id,
a specific cross-agency project id, or Continuing Costs.

Matching algorithm, in `year1 → year2 → year3` order: for each `LineItem` in
a bucket, look for an existing row in the same (group, expense class, item
name) that doesn't yet have an entry for this year; attach if found, else
start a new row. This means:

- Items with identical names in the same group+class pair up in the order
  they appear (1st Year 1 "Software License" pairs with 1st Year 2, etc.).
  Two distinct items that happen to share a name **can mis-pair** — this is
  a known, accepted limitation of the no-schema-change approach.
- A row with data in only some years shows blank cells for the rest.

No new field is persisted. Grouping is a pure function computed fresh from
`doc.part4` on every render — same pattern as `part4-aggregations.ts`'s
existing `yearTotal`/`computeProjectCosts`.

### Edit propagation

- **Name, office, UACS code/label, fund source** are row-level fields. Editing
  one edits every year-entry the row currently spans (prevents a rename from
  silently splitting the row into two).
- **Qty, unit cost** are per-year-cell — edit independently per year.
- **Expense class (CO ↔ MOOE) or project reassignment** moves *every*
  year-entry the row spans to the new location — all-or-nothing per row, not
  per-cell.
- **Adding an amount into a blank year cell** creates a new `LineItem` in
  that year's bucket, copying the row's current shared fields (name, office,
  UACS, fund source).
- **Clearing a single year cell** removes just that year's `LineItem`,
  leaving the row's other years intact.
- **Deleting a row** removes the item from every year it currently spans, in
  one action, with a confirmation (it's the one multi-year-destructive
  action on the page).

## 5. Page structure

Route: `/editor/part4/cycle`, alongside the existing `year1`/`year2`/`year3`/
`summary` pages.

- **Header**: title, a search/filter box (matches against item name, office,
  UACS code/label, or project title — client-side filter over computed
  rows), an "Add line item" entry point per sub-table (see below).
- **Groups**, collapsible and expanded by default: Office Productivity →
  Internal ICT Projects (one sub-group per project) → Cross-Agency ICT
  Projects (one sub-group per project) → Continuing Costs. In a
  project-scoped distributed file, Office Productivity and Continuing Costs
  are hidden and only the office's own project(s) render — same rule as
  `hideNonProjectCategories` on the per-year pages
  (`part4-year-form.tsx:56-58`, `718-720`).
- **Expense-class sub-tables** within each group: Capital Outlay and MOOE,
  except Continuing Costs, which only ever gets a MOOE sub-table (matches
  §3's asymmetric bucket).
- **Row**: name / office / UACS / fund source cells (same inputs as today's
  table-mode `LineTable`, `part4-year-form.tsx:408-499`), then three
  Qty × Unit Cost pairs (Year 1 / Year 2 / Year 3), a computed 3-year row
  total, and a delete-row action. All cells commit inline (onBlur/onChange),
  no drawer, no separate save step — reusing the existing table-mode input
  styling (`INPUT_CLS`, `NumberInput unstyled`) rather than the
  `LineItemDrawer` sheet, since the point of this page is seeing many rows
  and years at once.
- **Subtotals**: each expense-class sub-table gets a 3-year subtotal row;
  each group gets a 3-year subtotal; the page ends with a grand total row —
  same shape as `part4-aggregations.ts`'s `SummaryRow`.
- **Add line item**: each sub-table's "Add Line" button creates one new row
  populated in all three years at once (default qty 1, unit cost 0, fund
  source "General Appropriations Act" — same defaults as `BLANK_LINE()`,
  `part4-year-form.tsx:67-76`). If the item only belongs in one or two years,
  clear the unwanted year cell(s) after adding — no separate "which years"
  prompt, to keep the action a single click.

## 6. Persistence mechanics

Store access is via `updatePart4(patch: Partial<Part4Data>)`
(`src/lib/store/index.tsx:939-943`), which shallow-merges `patch` into
`doc.part4` — so a single call can patch one, two, or all three
`YearBudget`s at once (`{ year1: ..., year2: ... }` is valid). Cycle View
holds all three `YearBudget`s in local state (mirroring `Part4YearForm`'s
`budget` state, `part4-year-form.tsx:593-608`) and, on every edit, rebuilds
the affected `YearBudget`(s) and calls `updatePart4` with just the changed
year key(s) via `useLocalSave("part4")`. A row-level edit that spans two or
three years (rename, reclassify, reassign project, delete row) patches all
of them in one `updatePart4` call; a single amount-cell edit patches one.

`useLocalSave`'s `sectionId` parameter drives `updateSectionMeta(...,
{ lastEditedAt })` for completion tracking (`src/hooks/use-local-save.ts`).
Because Cycle View edits the same underlying data as `part4/year1`,
`part4/year2`, `part4/year3` — it introduces no new data of its own — edits
should update `lastEditedAt` on whichever of those three sections actually
changed, not register `part4/cycle` as a fourth data-owning section. The
exact mechanism (call `useLocalSave` three times, once per year section, or
extend `useLocalSave` to accept multiple sectionIds) is an implementation
detail to settle in planning by reading `src/lib/section-fields.ts` and
`src/lib/scope/paths.ts` (which govern per-section field ownership for
distribution/merge) — this spec's requirement is only that Cycle View must
not create a fourth, independent completion-tracked "section."

Cycle View should still appear in `src/lib/sections.ts`'s Part IV group and
the sidebar nav, the way `part4/summary` does
(`src/lib/sections.ts:55`) — likely with `SECTION_FIELDS["part4/cycle"] =
{ fields: [] }` like summary's read-only-view entry
(`src/lib/section-fields.ts:129-132`), even though Cycle View is writable.
Whether the existing `readOnly` flag on `SectionDef` is safe to reuse as-is,
or needs a variant, must be checked against its other consumers
(`src/lib/store/index.tsx:388`'s `maybeSet`, `distribute-dialog.tsx:84`)
during planning, since those currently assume "read-only" means "no
writable fields, never contributes to distribution," which is true here for
completion-tracking purposes but not for actual editability.

## 7. Scoped distribution

Cycle View respects the same scoping as the per-year pages: in a
project-scoped file (`doc.editScope?.projectIds !== undefined`), it filters
`internalProjects`/`crossAgencyProjects` to that scope and hides Office
Productivity/Continuing Costs, mirroring `hideNonProjectCategories`
(`part4-year-form.tsx:29`, `56-58`).

## 8. Reused primitives

- `lineTotal`, `sumLines` (`part4-aggregations.ts:34-40`) for per-row and
  subtotal math.
- `SummaryRow` shape (`part4-aggregations.ts:5-12`) for subtotal/grand-total
  rows.
- `computeProjectCosts`'s "loop over the three years, accumulate by key"
  pattern (`part4-aggregations.ts:58-70`) as the template for the new
  cross-year grouping function.
- Existing table-mode input styling and components (`INPUT_CLS`,
  `NumberInput`, `UacsCombobox`, `FUND_SOURCES`, `OFFICE_SUGGESTIONS`) from
  `part4-year-form.tsx`.

## 9. Non-goals

- No new PDF export section — the per-year pages and `Part4Summary` remain
  the source for anything PDF-rendered.
- No schema or migration changes — grouping is computed, not persisted.
- No changes to `Part4YearForm`, `LineItemDrawer`, or the existing per-year
  pages — Cycle View is additive.
- No bulk multi-row operations (e.g. moving five rows to another project at
  once) — row-by-row only.
- No reordering of items across years, no per-row audit history.

## 10. Known risk

Name-based matching (§4) is a deliberate simplification, not a hidden gap:
renaming an item in only one year, or two items sharing a name within the
same group+class, can produce a row that looks continuous but pairs
unrelated data, or a rename that appears to "lose" history in one year. This
was chosen over a schema change (which would need a migration for every
existing `.issp` file) and accepted as a known trade-off.

## 11. New files (for implementation planning)

- `src/app/editor/part4/cycle/page.tsx` — route, wires `doc.part4`,
  `doc.part3.internalProjects`/`crossAgencyProjects`, `doc.editScope`, same
  pattern as `src/app/editor/part4/year1/page.tsx`.
- `src/components/issp-editor/part4/part4-cycle-view.tsx` — main page
  component: local three-year state, search/filter, groups, subtotals,
  save wiring.
- `src/components/issp-editor/part4/part4-cycle-grouping.ts` — pure
  `groupLineItemsAcrossCycle(part4, projects, editScope)` and bucket
  accessor helpers (get/set the `LineItem[]` at a given year+group+class
  location), covered by unit tests given the matching logic in §4 is the
  part most worth pinning down with tests.
- `src/lib/sections.ts`, `src/lib/section-fields.ts` — register the new
  section entry (see §6).
