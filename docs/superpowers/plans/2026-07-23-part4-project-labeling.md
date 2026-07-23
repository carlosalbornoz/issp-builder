# Plan — Part IV (and Part III) project labeling & numbering

**Date:** 2026-07-23
**Status:** ✅ Implemented & verified (tsc, eslint, editor DOM smoke, PDF text smoke
incl. cross-agency variant). Production build/deploy deferred — shared dev+prod tree,
pending Carlos's go-ahead.
**Scope:** Editor + PDF renderer

## Goal

Two changes, decided with Carlos (2026-07-23):

1. **Rename the two always-present Part IV budget categories** to single, clean names:
   - `Office Productivity / General ICT` → **`Office Productivity`**
   - `Continuing / Recurring Costs` → **`Continuing Costs`**
2. **Number Internal and Cross-Agency ICT projects** everywhere they are labeled, in the form
   `Internal ICT Project #n: <title>` / `Cross-Agency ICT Project #n: <title>` (per-category,
   restarting at #1 for each category). Apply on **all surfaces** (Part IV + Part III), and
   **drop the A/B/C letter scheme** in Part IV entirely.

### Why (usability principles)
- **#3 (labels):** `/ General ICT` and `/ Recurring` add noise a first-time focal doesn't need;
  the official template vocabulary is just "Office Productivity" and "Continuing Costs".
- **#8 (derived data):** the `#n` is a position — computed at render from array index, never
  stored. Matches the existing Part III-E pattern (`index + 1`).
- **#14 (PDF fidelity):** numbering is additive structure; existing rows/fields are preserved.
- **Flag the family:** normalize the concept name everywhere it is user-visible, not just the
  two strings literally named.

## Data safety
No schema or stored-data change. `officeProductivity` / `continuingCosts` keys are untouched;
project titles are untouched; `#n` is derived. Old `.issp` files load and render identically
minus the cosmetic labels. **No migration.**

## Change set

### File 1 — `src/components/issp-editor/part4/part4-year-form.tsx` (editor)
- **`SectionCard` (≈L546):** drop the `title.slice(indexOf("."))` letter-badge parsing (it breaks
  once titles have no `A.`). New header = colored swatch (uses existing `color`) + full `<h3>`
  heading. Signature stays `{ title, description, color, children }`; `title` is now the whole
  heading.
- **Remove `alpha()` helper (≈L83)** and all `const letter = …` lines (now unused).
- **Legend (≈L661):** `Internal Projects`→`Internal ICT Projects`,
  `Cross-Agency Projects`→`Cross-Agency ICT Projects`, `Recurring Costs`→`Continuing Costs`.
- **Office Productivity card (≈L692):** `title="A. Office Productivity / General ICT"` →
  `title="Office Productivity"`.
- **Internal project card (≈L744):** `title={…Internal ICT Project #${idx + 1}: ${proj.title}}`.
- **Cross-Agency project card (≈L795):** `title={…Cross-Agency ICT Project #${idx + 1}: ${proj.title}}`.
- **Continuing Costs card (≈L835):** `title="Continuing Costs"`.

### File 2 — `src/components/issp-editor/part4/part4-aggregations.ts`
- **L117:** `continuingCosts: "Continuing Costs / Expenses"` → `"Continuing Costs"`.
  (L114–116 already read `Office Productivity` / `Internal ICT Projects` / `Cross-Agency ICT Projects`.)

### File 3 — `src/components/issp-editor/part3/part3-e1-form.tsx` (Part III-E editor cards)
- **L335:** `{isCrossAgency ? "Cross-Agency" : "Internal"} Project #{index + 1}` →
  `{isCrossAgency ? "Cross-Agency ICT Project" : "Internal ICT Project"} #{index + 1}`.
  Keeps the existing two-line header (ordinal label above, title below — principle #2).

### File 4 — `src/components/issp-editor/part3/part3-f-form.tsx` (KPI framework editor)
- Precompute per-category ordinals: walk `allProjects` once, counting by `projectCategory`
  → `Map<id, number>`. Pass `ordinal` into `ProjectKpiTable`.
- **Card header (≈L93):** add an ordinal label line above the title —
  `Internal ICT Project #n` / `Cross-Agency ICT Project #n` — and simplify the subtitle to
  `· N KPIs` (category now named in the label). Mirrors the Part III-E card style.

### File 5 — `src/lib/pdf/render-issp-html.ts` (PDF)
- **Part III-E project cards (`renderProjectCard`, ≈L1064):** add optional `ordinal` param;
  render a bold caption `${crossAgency ? "Cross-Agency" : "Internal"} ICT Project #${ordinal}`
  at the top of the card. Callers E.1/E.2 (≈L1189/1194) pass `i + 1`.
- **Part III-F framework:**
  - F.1 (≈L1200/1205): `.filter(internal).map((proj, i) => …)`; `ICT Project: <title>` →
    `Internal ICT Project #${i + 1}: <title>`.
  - F.2 (≈L1233/1238): `.filter(cross).map((proj, i) => …)`; `Cross-Agency ICT Project: <title>` →
    `Cross-Agency ICT Project #${i + 1}: <title>`.
- **Part IV year table (`renderYearTable`, ≈L1311/1320):** internal/cross rows
  `coMooeSection(esc(proj.title), …)` →
  `coMooeSection(\`Internal ICT Project #${i + 1}: ${esc(proj.title)}\`, …)` (and cross-agency).
- **Part IV year-table header (≈L1363):** `CONTINUING COSTS/EXPENSES` → `CONTINUING COSTS`
  (`OFFICE PRODUCTIVITY` at L1344 already fine).
- **Part IV B.1 summary:**
  - L1479 `Office Productivity / General ICT` → `Office Productivity`.
  - L1514 `Continuing / Recurring Costs` → `Continuing Costs`.
  - Internal rows (≈L1489/1494): `<td>${title}</td>` →
    `<td>Internal ICT Project #${i + 1}: ${title}</td>`.
  - Cross rows (≈L1501/1506): `<td>${title} <em>(Cross-Agency)</em></td>` →
    `<td>Cross-Agency ICT Project #${i + 1}: ${title}</td>` (drop the now-redundant suffix).

## Out of scope
- Nav/section titles in `sections.ts` / `section-fields.ts` (`E.1 Internal Projects` etc.) —
  these are section headings, not per-project labels; left as-is.
- The demo `.issp` data — project titles unchanged; numbering is derived.

## Verification (verify-feature)
1. `npx tsc --noEmit` (and project lint) clean.
2. Dev-server smoke (`localhost:3000`): load demo NCWTR doc — confirm Part IV editor cards read
   `Office Productivity` / `Internal ICT Project #1: …` / `Cross-Agency ICT Project #1: …` /
   `Continuing Costs`; Part III-E cards read `Internal ICT Project #1`; Part III-F cards show
   ordinals. Confirm no leftover letters.
3. PDF export smoke: export the same doc — confirm Part III-E card captions, Part III-F
   headings, Part IV year-table rows, and B.1 summary all carry `#n`; the two renamed category
   cells read cleanly; numbering restarts per category.
4. Old-data check: load a pre-existing `.issp` — renders with new labels, nothing missing.
5. `npm run build` green; deploy + prod check (basePath `/issp`) per project references.
