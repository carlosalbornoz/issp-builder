# Scoped `.issp` distribution & secretariat consolidation (design)

**Date:** 2026-07-21
**Status:** Draft, pending review

## Problem

The ISSP Builder is local-first and file-based: a single `.issp` file is the
only sharing/transport format, there is no backend or account system, and the
secretariat (the agency's CIO office) is responsible for assembling the final
agency-wide ISSP.

Carlos wants to **distribute the work**: instead of one person filling the whole
plan, the secretariat hands each contributing office a `.issp` file that exposes
*only the fields/sections that office is responsible for* — potentially as fine
as a single field (e.g. "Office B fills Part I-A's Legal Basis field only").
Each office fills in their slice offline and returns the file; the secretariat
consolidates the returned files into one master and exports the official PDF.

Today the app cannot do this. Importantly:

- **There is no per-section/per-field access concept.** The editor is driven from
  a single config (`src/lib/sections.ts`), consumed by the sidebar
  (`src/components/editor/editor-sidebar.tsx:510-634`), the overview cards
  (`src/components/editor/overview/part-card.tsx`), and the section shell
  (`src/components/editor/section-shell.tsx:65-79`) with **zero filtering** —
  every section is always shown. The only existing per-section flag is
  `SectionDef.readOnly` (`sections.ts:8`), used once for the computed
  `part4/summary`, and it does not hide or lock anything — it only excludes a
  section from completion tracking. The per-section field map
  (`src/lib/section-fields.ts`, `SECTION_FIELDS`) already enumerates every
  section's exact field keys, so field-level scope can build directly on it.
- **Import overwrites; there is no merge.** `loadFromFile`
  (`src/lib/store/index.tsx:921-951`) calls `setDoc`/`idbSave` and replaces the
  whole document. There is no "import into an existing doc" or "merge two docs."
- **The one existing collect-and-consolidate flow is Annex 1 only**, and it is
  *attach*, not field-merge: `annexedOffices: Annex1FilePayload[]`
  (`src/lib/store/types.ts:391-409`) appends whole office inventory files,
  dedupes by `office.displayLabel`, and only consolidates at PDF render time
  (`src/lib/pdf/render-issp-html.ts:1769`).

So both capabilities — **scoped editing** and **multi-file consolidation** — are
net-new.

## Goals

1. Secretariat can generate **scoped `.issp` files** from a master, each limited
   to the specific areas/sections/fields assigned to one office — down to a
   single field when needed.
2. An office opening a scoped file sees **only their assigned fields**;
   everything else is hidden and stripped, and **PDF export is disabled** (only
   the consolidated master produces the official PDF).
3. Secretariat can **consolidate** one or more returned files back into the
   master, with a review screen that flags overlaps — never silently discarding
   an office's submission.

## Non-goals / assumptions

- **Soft lock only.** The scope is a UI/data gate, not tamper-proofing. A savvy
  user *could* hand-edit the JSON. That is acceptable: it is the agency's own
  data, the secretariat reviews on consolidation, and hardening can come later
  if a real need appears.
- **No accounts, no server.** Everything stays inside the `.issp` file.
- **Hierarchical, field-capable scope.** Scope is a set of paths at any of three
  levels — area (`part1`…`part4`, `annex1`, `definitions`), section
  (`part1/b`), or individual field (`part1/b.cioName`). The secretariat picks
  whole areas/sections by default and narrows to fields only where an office
  owns part of a section. Field-level precision matters mainly in the few
  multi-field sections (Part I-B's 12 fields, plus Part I-A, II-B, III-A);
  everywhere else a section is single-field, so section-level ≡ field-level.
  This satisfies "Part I A.1 only" without forcing field-picking for every
  office.
- **Office renames are not expected** in practice; the stable office `id` is kept
  as a safety net regardless.

## Data model

### New optional field on `IsspDocument`: `editScope`

`src/lib/store/types.ts:411`. **Absent ⇒ today's full editor, completely
unchanged** (every existing file behaves exactly as before). Present ⇒ editor
enters "scoped mode."

```ts
// A scope path. Three levels; "owns everything under it":
//   "part1"                → whole area
//   "part1/b"              → whole section (section id from sections.ts)
//   "part1/b.cioName"      → one field (section id + "." + field key from section-fields.ts)
type EditPath = string;

interface EditScope {
  /** Who this file belongs to. `id` is the stable merge key; the rest are display. */
  office: { id: string; name: string; displayLabel: string };
  /** Editable paths at any level (area / section / field). See EditPath above. */
  editable: EditPath[];          // e.g. ["part4", "part1/b.cioName", "annexes/annex1"]
  generatedAt: string;          // ISO timestamp when sliced from master
  sourceDocId?: string;         // master provenance, for idempotent re-merge
}

// on IsspDocument:
editScope?: EditScope;
```

Path resolution is data-driven from the existing config: `PARTS` +
`FRONT_MATTER_SECTIONS` + `ANNEX_SECTIONS` (`sections.ts`) give areas/sections,
and `SECTION_FIELDS` (`section-fields.ts`) gives each section's field keys. A
path resolver expands any path to its set of leaf `(sectionId, fieldKey)` pairs.

### Shared tables (a static config set)

A few editable paths are **shared tables** — fields whose value is a row-list
that multiple offices contribute to. These are a fixed, config-level set
(`SHARED_TABLE_PATHS`, initially `["annexes/annex1", "part1/c.stakeholders"]`),
not chosen per-scope. Every row in a shared table gains two **stored** fields
(created silently, shown only where useful):

- `rowId: string` — stable id, generated the moment the office adds the row.
- `officeId: string` — copied from `editScope.office.id` on creation.

Other list-valued fields a single office owns (e.g. Part III projects) are **not**
shared tables: they're wholesale-replaced on merge, not row-merged.

### The merge contract (single most important rule)

> A scoped file holds **only that office's own data** — for shared tables, only
> their own rows (empty on first round, or their previously-stamped rows on a
> re-merge); for owned fields/sections, only those fields' values. **The master
> is the only place all offices' data coexists.** Re-importing Office B's file
> re-writes Office B's owned paths (and replaces Office B's shared-table rows by
> `officeId`) → idempotent, no duplicates, updates just work. Other offices'
> data is never touched.

Shared-table re-import timeline:

| Step | Master shared-table rows | Office B's file |
|---|---|---|
| Office B sends v1 (47 rows) | 47 (B) | 47 (all B) |
| Office A sends (30 rows) | 47 (B) + 30 (A) | — |
| Office B fixes typos, resends v2 (52 rows) | 47 (B) + 30 (A) | 52 (all B) |
| Consolidate B v2 → drop old 47 B, insert new 52 | **52 (B) + 30 (A)** | — |

Net 82 rows, clean. Office A untouched, Office B's corrections applied.

### Consolidation review flags

Reuse the existing per-section "needs review" UI pattern
(`MigrationReview.pendingSectionIds`, `types.ts:371-376`, surfaced as a banner in
`section-shell.tsx:188-198` and a badge in `editor-sidebar.tsx:583-594`). Add a
new doc-level field (exact shape finalized in the schema-change step, e.g.
`consolidationFlags?: string[]` of section ids) that drives the **same** banner +
badge. This brings the "review for duplicates" UI mostly for free.

### Schema impact

`editScope`, `consolidationFlags`, and the shared-table row stamps are
additive/optional, so **old files load unchanged** (no `editScope` ⇒ full
editor). This still warrants a `schemaVersion` bump and the full `schema-change`
workflow (types, defaults, migration, forms, PDF, section-fields map, demo file)
— see "Open questions." The Annex 1 reconciliation (below) is the part with real
migration weight.

## Phase 1 — Author: "Distribute" from the master

New editor action (open master → **Distribute to offices**) opening a dialog
where the secretariat defines one or more office→paths mappings via a **tree
picker** (area → section → field, tri-state checkboxes), data-driven from
`PARTS` + `SECTION_FIELDS`:

```
Office:  [Information Systems Division ▾]
  ☑ Part IV  (all sections)
  ☑ Annex 1
  ▼ Part I
      ▼ B. Organization Structure
          ☑ CIO Name          ← field-level pick
          ☐ CIO Email … (rest omitted)
[+ Add another office]
[ Generate .issp files ]
```

For each mapping, the app **slices** a scoped `.issp`:

- Sets `editScope` (`office` with a generated stable `id`, the chosen `editable`
  paths, `generatedAt`, `sourceDocId`).
- **Keeps** the data under every owned path + **agency header metadata** (agency
  name/acronym, years, title, agency head — from `IsspDocument` top-level fields)
  so the file is self-identifying and its header looks right.
- **Strips** everything not under an owned path to empty defaults (from
  `createEmptyDocument`, `src/lib/store/defaults.ts:146-172`) — **field-level**,
  not just area-level. Rationale below.
- For shared tables, the sliced file starts **empty** (only this office will add
  rows, stamped on creation).
- Filename: `${acronym}-ISSP-${startYear}-${endYear}-${officeSlug}.issp`.

Batch-capable: define several offices, generate all files in one action.

### Why strip non-owned data (down to the field)

A scoped file carries *only* the office's owned paths + their own shared-table
rows + agency header. Everything else is emptied, not merely hidden — at field
granularity. This prevents **cross-office data leakage**: Office B must not be
able to open the `.issp` in a text editor and read Office A's field values or
inventory. Stripping makes the file genuinely contain only what Office B should
see. The trade-off — a scoped file is no longer a "full master copy," and a
partially-owned section shows only its owned fields — is fine; it is a working
slice, and the master holds everything.

## Phase 2 — Edit: the office's view

When the editor loads a file with `editScope`, it enters **scoped mode**:

- **Filter `sections.ts`** at all three consumption points — sidebar
  (`editor-sidebar.tsx:510`), overview cards, and section-shell prev/next
  (`section-shell.tsx:65-79`). An **area** appears only if the office owns a path
  into it; a **section** appears only if the office owns at least one field under
  it; within a visible section, **only owned fields render** (non-owned fields
  are omitted, their data already stripped on slice). So an office scoped to
  `part1/b.cioName` sees Part I-B with just the CIO Name field — no gaps, no
  greyed-out fields, no leakage.
- **Route guard:** a direct hit on a hidden section URL (one with no owned
  fields) redirects away rather than exposing it.
- **Scope banner:** a small persistent badge — *"Scoped file — Information
  Systems Division · edits: Part IV, Annex 1, Part I-B (CIO Name)"* — so the
  office knows the limited view is intentional, not a bug.
- **Row stamping:** in shared tables, every new row auto-gets `officeId` +
  `rowId` from `editScope.office`. The office only ever sees their own rows.
- **No PDF export:** the Export PDF action is hidden/disabled in scoped mode,
  with a one-line note *"PDF export is available in the consolidated master."*
  Only the master produces the official PDF — no fragmented partial PDFs.
- Save / export `.issp` works exactly as today (`saveToFile`, `index.tsx:879`);
  it is still a full `IsspDocument`, just a scoped one.

## Phase 3 — Consolidate: the merge + review screen

Secretariat opens the master → new **Consolidate returned files** action →
selects one or more returned `.issp` files (**batch**). For each file the app
runs it through the existing import gates (`normalizeImportShape`,
`index.tsx:120`) plus a check that it carries a valid `editScope`, then reads its
owned paths. Then the **review screen** (the safety net) shows, per file:

```
Information Systems Division (Office B)
  → write Part IV fields  (no prior contribution — clean overlay)
  → write part1/b.cioName
  → replace 47 Annex 1 rows tagged "Information Systems Division"
  ✓ no conflicts

Finance Office (Office C)
  → part3/e1.internalProjects: two offices contributed — items unioned, FLAGGED for review
  → part1/b.cioName: "Atty. Cruz" (B) vs "Atty. Dela Cruz" (C) — pick one
```

On confirm: apply the merge (rules below), stamp provenance, write the master.

### Merge rules

| Case | Rule |
|---|---|
| **Shared-table path, one office** in batch | Replace that office's rows (drop old `officeId` match, insert new). Idempotent. |
| **Shared-table path, multiple offices** in batch | Merge by office (each office's rows replace only their own). No flag — expected. |
| **Non-shared path, unique owner** | Write each leaf field under the path into the master (path-keyed overlay). Idempotent — re-import writes the same fields. |
| **Same non-shared path owned by ≥2 offices** (overlap), list-valued | **Union** contributed items (each tagged with source office) and **set a review flag** on the section. Lossless — nothing dropped. |
| **Same scalar field written differently** by ≥2 offices | Surface in the review screen; secretariat picks. The one place a choice is unavoidable. |

The overlap rule encodes Carlos's requirement: **never silently discard an
office's submission — merge both and flag for human dedup.** Winner-takes-all is
gone for the multi-claim case; it survives only for irreducible scalar conflicts.

This is a **new `consolidate(master, files[])` function**, distinct from
`loadFromFile` (which still overwrites on normal import). Normal import is
untouched.

### Re-import / idempotency

Re-importing Office B's file re-writes Office B's owned paths and replaces
Office B's shared-table rows (by `officeId`). `sourceDocId` lets the review
screen show "this replaces Office B's existing 47 rows" rather than presenting it
as a conflict.

## Annex 1 reconciliation — Direction C (Bridge)

The new system is a better, general version of the existing Annex 1 attach-flow
(`annexedOffices` buckets). Rather than migrate or duplicate, **Direction C**:

- The **new office-stamped-row model is the primary path going forward.** New
  scoped Annex 1 files contribute office-tagged inventory rows merged by
  `consolidate()`.
- **Existing `annexedOffices` files still load and render** (backward compat) —
  the standalone `/annex1` form and PDF render keep working for legacy files.
- Over time, legacy `annexedOffices` files age out; the old code path is carried
  until then, not deleted.

This is the single piece with real migration/backward-compat weight and will be
driven by the `schema-change` workflow in the implementation plan.

## Security & data leakage

- **Strip-on-slice** (Phase 1, field-level) prevents cross-office leakage at the
  file level.
- **Soft lock** for edit scope; no crypto. (See Non-goals.)
- Scoped files are validated on consolidate through the same gates as normal
  import, so a malformed/tampered file is rejected, not silently merged.

## Edge cases

- Non-scoped file dropped into **Consolidate** → rejected: *"not a scoped office
  file."* (Normal import handles full docs.)
- An `editable` path references a section/field removed by a schema change →
  flagged in the review screen, skipped.
- Same file selected twice in a batch → deduped.
- Office displayLabel changed between rounds → stable `office.id` still matches;
  replace works.
- Legacy `annexedOffices` Annex 1 file opened directly → still works via the old
  path (Direction C).
- A section the office partially owns renders only its owned fields; if an office
  somehow owns zero fields in a section, that section is hidden entirely.

## Out of scope (v1)

- Tamper-proofing / cryptographic signing of scoped files.
- A standalone, non-secretariat "request changes" round-trip protocol — offices
  just edit and resend.
- Auto-notifying offices / tracking who has returned a file (no server).
- Migrating or deleting the existing `annexedOffices` code path (Direction C
  keeps it).

## Testing

- **Unit tests on `consolidate()`** and the **path resolver**: expand
  area/section/field paths to leaf fields; wholesale field overlay;
  replace-by-office; multi-office union + review flag; scalar conflict surfacing;
  **idempotent re-import** (the timeline above — import B v1, then B v2, assert
  no duplicates and A untouched).
- **`verify-feature` end-to-end:** slice a scoped file with a field-level pick
  (e.g. `part1/b.cioName`) → open it (only that field visible in Part I-B, other
  sections/fields hidden, banner shows, **PDF export disabled**) → fill fields +
  add shared-table rows → consolidate back into master → confirm correct overlay,
  no duplicates, other offices untouched, review flag appears on an overlapped
  section → export PDF **from the master only**.
- **Backward compat:** load an existing non-scoped `.issp` (e.g.
  `public/demo/ncwtr-issp-2026-2028.issp`) → full editor, no scope banner, PDF
  export present. Load a legacy `annexedOffices` Annex 1 file → old path intact.
- **Leakage check:** open a sliced scoped `.issp` in a text editor → confirm only
  owned paths' data is present, no other office's field values or rows.
- Build + deploy + prod check per the usual routine.

## Open questions for the implementation plan

- Exact `schemaVersion` bump and migration shape (driven by `schema-change`).
- Final `EditPath` grammar + a typed resolver (path → leaf `(sectionId,
  fieldKey)` pairs), and the static `SHARED_TABLE_PATHS` set.
- Final shape of `consolidationFlags` vs. reusing/extending `MigrationReview`.
- The Distribute **tree-picker UI** (area → section → field, tri-state
  checkboxes), data-driven from `PARTS` + `SECTION_FIELDS`.
- Per-collection row-stamp mechanics for Part I-C stakeholders (and any future
  shared table) — confirm the add-row handlers that need stamping.
