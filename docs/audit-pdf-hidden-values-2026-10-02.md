# Audit — PDF prints values the editor hides (2026-10-02)

> Status: **approved 2026-10-02 — implementing.** Decisions recorded below.

## Trigger

Carlos: in Part III-D (Proposed IS), fill "Internal/External System", then untick
"Integration with another system". The fields disappear from the editor, but the
values stay in the file and the PDF still prints them.

## Method

Feedback loop (scratchpad `stale/loop.sh`): mutate the demo `.issp` with a
`ZZSTALE-…` sentinel (or a unique amount, ₱777,777.77) in exactly the state the
editor hides, `POST /api/export` on dev :3000, `pdftotext`, grep the sentinel.
Red = the PDF prints a value the editor does not show. A control mutator (same
line on a live, in-duration project) confirms the loop can go green. Every
finding below was reproduced this way except F9/F10 (app-only, code-read). A
scan of the 15 real/fixture `.issp` files on the server gives the "seen in" column.

## Root cause (two patterns)

- **P1 — hidden but stored, printed anyway.** Forms hide a dependent field when
  its gate is off (checkbox, Yes/No answer, status) but keep the value; the PDF
  mapper (`toRenderData` in `src/app/api/export/route.ts`) and the renderer
  (`src/lib/pdf/render-issp-html.ts`) print the dependent value without checking
  the gate. The codebase already has the right pattern in two places — the
  classification → Frontline → Online → link chain is gated in the renderer
  (`render-issp-html.ts:866-876`), and II-C PIA clears `piaCompleted` in the form
  — but nothing makes it the rule.
- **P2 — budget counted without its project.** Part IV year tables list budget
  records by *live project within its duration*; the B.1–B.4 summaries (PDF
  `render-issp-html.ts:1490-1530`, editor `part4-aggregations.ts:46-101`) and
  III-E Total Project Cost (`computeProjectCosts`) sum *every stored record by
  key*. Money from a deleted project or an off-duration year is in the totals
  but in no visible line.

## Findings

| # | Sev | Where | Symptom (loop-verified) | Seen in |
|---|-----|-------|-------------------------|---------|
| F1 | High | II-C + III-D interoperability — `route.ts:259-266, 303-310`, `render-issp-html.ts:896-897` | Internal/External System names print with "Integration" unticked | CSC (SCORES, CLASS, COMEX) |
| F2 | High | III-E delete — `part3-e1-form.tsx:780` + P2 | Deleting a project leaves its Part IV budget; A tables total ₱0.00, B.1–B.4 total ₱777,777.77 | rv-a fixture |
| F3 | High | P2 — off-duration lines | Year table excludes the line; III-E Total Project Cost and B.1–B.4 include it | — (editor shows a warning strip) |
| F4 | Med | II-D EGP — `render-issp-html.ts:1050-1072` | Answer Yes still prints the If-No ticks and IS name (PDF shows ☑ Yes **and** ☑ Using equivalent / ☑ Manual); IS name prints with "Using equivalent system" unticked; eLGU URL prints with answer No | CSC IFMIS ("eNGAS" with only "Proposed development" ticked) |
| F5 | Med | III-D description — `route.ts:293` (`description \|\| enhancementDetails`) | Status not Enhancement + empty description → hidden Enhancement Details print as the description; status Enhancement + both filled → Enhancement Details never print | CSC v6 (3 systems lose details) |
| F6 | Med | II-C PIA — `render-issp-html.ts:913-916` | Answer No (or blank) still ticks "No" under "If Yes, did the system undergo PIA?" | demo + every NCWTR fixture |
| F7 | Low | Online Portal — `render-issp-html.ts:1047` | Legacy `url` prints; the form has no field to see or edit it | all CSC files, demo |
| F8 | Low | eLGU on a non-LGU agency | Form hides the row; stored answer/URL still print | — |
| F9 | Low | III-E Standalone keeps `linkedSystemIds` (`app/editor/part3/d/page.tsx:18-21`) | III-D shows "linked to project" badges, slices carry the systems, double-link warnings fire — not in PDF | — |
| F10 | Low | III-F KPI set of a deleted project | Stays in the file; not printed, but the title fallback (`render-issp-html.ts:1293`) can attach it to a new project with the same title | — |

Checked and fine: classification/Frontline/Online/link gating; Annex 1 office
type (selector resets region/name); I-B focal = CIO (derived at export); II-A OO
switch prunes programs (`1ed1bdc`).

## Proposed fix

**Rule: the PDF prints only what the editor shows.** Gate at the export
boundary and keep the stored value — re-ticking brings the text back, and every
existing file is fixed without a migration.

1. **Seam first.** Move `toRenderData` from `route.ts` to
   `src/lib/pdf/to-render-data.ts` (a route module can't export it). New
   `scripts/verify-pdf-visible-values.ts`: doc → `toRenderData` →
   `renderContentHtml`, one red case per finding plus controls; sub-second, no
   server. Today there is no seam below the HTTP route — that is itself a finding.
2. **One gate module** `src/lib/visible-values.ts`: `visibleInteroperability`,
   `visiblePia`, `visibleEgpProgram(key, program, agencyType)`,
   `visibleIsDescription(proposedSystem)`, `linkedSystemIdsOf(project)`. Used by
   `toRenderData` (F1, F4–F8) and by the III-D link badges / slice (F9).
3. **One Part IV counting rule** `countedProjectBudgets(year, projects, planYears)`
   — live projects whose duration covers the year — shared by the year tables,
   B.1–B.4 (editor + PDF) and III-E Total Project Cost (F2, F3). Lines that don't
   count stay visible in the editor's warning strip (exists for off-duration;
   add one for orphans), so nothing disappears silently.
4. **Project delete names its casualties** (usability principle 5): two-step
   confirm "Delete project + its Part IV budget (₱X) and III-F KPIs?", then
   remove them (F2, F10).
5. **III-D description (F5):** print Description & Purpose; for For Enhancement
   add "Enhancement to be done: …" under it (template: "For an IS that will be
   enhanced, indicate the enhancement to be done").

## Decisions for Carlos

- **Q1** Gate at export, keep stored value (recommended) — vs clear the value in
  the form on untick (loses text on a mis-click; old files need a migration).
- **Q2** Off-duration lines: exclude from B.1–B.4 and Total Project Cost, as the
  year tables already do (recommended).
- **Q3** Deleting a III-E project also deletes its budget and KPIs, behind the
  two-step confirm (recommended).
- **Q4** III-D: append "Enhancement to be done: …" to the description cell (recommended).
- **Q5** Online Portal legacy URL: stop printing it (recommended) — vs add a URL field back.

## Decisions (Carlos, 2026-10-02)

- **Q1** Gate at export, keep the stored value.
- **Q2** Yes — off-duration lines are excluded from B.1–B.4 and Total Project Cost.
- **Q3** Yes, but a **hard confirmation**: a dialog that lists exactly which III-F
  KPI rows and Part IV budget line items (per year, with amounts) will be removed,
  before the project is deleted.
- **Q4** Enhancement Details print only for "For Enhancement" systems.
- **Q5** Stop printing the Online Portal URL.

## Phases

1. Seam + `verify-pdf-visible-values.ts` (red) → gate module → green (F1, F4–F8).
2. Part IV counting rule + orphan warning strip (F2, F3) — editor + PDF.
3. Project delete casualties (F2, F10) + Standalone link gating (F9).
4. Docs, What's New, deploy.
