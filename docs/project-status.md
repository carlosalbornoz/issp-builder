# ISSP Builder - Project Status

> Canonical tracker. This is the only document that should be treated as the current project state, backlog, and next-session plan. Older session logs, implementation plans, audits, and architecture notes are historical unless this file explicitly points to them.

Last updated: 2026-10-02

## Current State

The active app is a local-first ISSP editor for the DICT 2026 template, with multi-office scoped distribution.

- **PDF prints only what the editor shows, 2026-10-02 (branch `fix/pdf-hidden-values`, `f2420c9..5ccef42` off `main` `edc5959`; not merged/deployed):** Carlos found III-D interoperability names printing after "Integration" was unticked. Audit `docs/audit-pdf-hidden-values-2026-10-02.md` found 10 cases in two patterns — (P1) forms hide a dependent field but keep its value and the export printed it; (P2) Part IV summaries summed budget records with no visible line. Fixes (Carlos's decisions Q1–Q5): gate at export and keep stored values (`src/lib/visible-values.ts`, used by the PDF mapper now at `src/lib/pdf/to-render-data.ts`) — interop names, EGP If-Yes/If-No branches, eLGU only for LGUs, Online Portal URL never, Enhancement Details only for For Enhancement ("Enhancement to be done: …"), PIA follow-up only under Yes, Standalone projects' links ignored everywhere; one Part IV counting rule `countedPart4` (live III-E projects within duration) for B.1–B.4 editor + PDF, III-E Total Project Cost and Cycle View; year pages name "Outside project duration" vs "Deleted project" lines (latter removable); III-E delete now opens a hard-confirmation dialog listing every KPI row and budget line and removes them with the project (the old two-tap promised this but deleted only the project). Real files affected: CSC (SCORES/CLASS/COMEX interop, IFMIS "eNGAS", portal URL), demo (PIA "No" ticks). Gates: `verify-pdf-visible-values.ts`, `verify-part4-counting.ts`, `verify-project-delete.ts`, `verify-project-slice` (h), `smoke-hidden-values.mjs` 20/20.

- **Part II-A single-OO linkage + General/Agency-Wide cleanup — DEPLOYED 2026-10-02 (`1ed1bdc` on `main`, BUILD_ID `_Rvqua3-STfKvtpc6UHkZ`; original commit `0f2d439` on `feat/kosinix-line-item-ops`):** a concern's Linked Organizational Outcome is now a **single-select** (was multi-select) over the Part I-A OOs only — "General / Agency-Wide" is no longer a selectable/storable tag. Switching OOs prunes program links from the old OO; the select is disabled ("Add OOs in Part I-A first…") when Part I-A has none. Legacy normalization (idempotent, in `migrateLegacyDoc` + mirrored on form mount — snapshot-sync rule) strips stored `"general"` from `outcomeIds`, so old files load as simply untagged and persist that way on next save; legacy multi-OO rows are NOT truncated — the form shows the first link and rewrites to one the moment the select is touched. Untagged concerns with content carry an amber "No OO/SO/MFO tagged" chip (tooltip: exports as General / Agency-Wide). PDF export (`mapStrategicConcerns`) filters residual `"general"` and renders untagged concerns as **"General / Agency-Wide"** in the OO/SO/MFO column — previously a stored `general` exported as literal lowercase text. Gates: tsc + lint clean, new `scripts/smoke-part2a-oo-single.mjs` (10 assertions: dropdown = OOs only, no General item, flag chips only on untagged-with-content, single-element `outcomeIds` persisted, no `general` survives, OO switch prunes `programIds`) green twice on :3000, demo PDF export verified via `pdftotext` (untagged + legacy `general` → "General / Agency-Wide", tagged → OO name). Deployed: cherry-picked to `main` (conflict in `part2-a-form.tsx` resolved to exclude the branch's unshipped sort buttons), built on main, `pm2 restart issp`; prod 200 on `/issp`, `/issp/editor`, `/issp/editor/part2/a`, `/issp/editor/part1/a` and the public URL. **Note:** the II-A sort buttons (branch commit `3583f1a`) and the rest of `feat/kosinix-line-item-ops` are NOT on main yet.

- **Expense categories replace UACS codes — DEPLOYED 2026-09-29 (`cecfbfa`, BUILD_ID `z17IThol65soZqklhUQlR`):** Part IV line items no longer store numeric UACS codes. `LineItem.uacsCode/uacsLabel` → `categoryId` — one of the 30 fixed DICT handout categories (5 Capital Outlay + 25 MOOE) in `src/lib/expense-categories.ts` (source: `references/UACS_Classification_Handout.md`; ids are data — renames need a schema bump + legacy map, same rule as fund sources). Picker: `part4/category-select.tsx` (native select with optgroups, filtered to the row's expense class) replaces the old combobox at all three mounts (year-form drawer, cycle drawer, cycle table); moving a row across the CO/MOOE divide clears its category (`reassignRow`). Legacy files migrate on load (v13→v14): the curated `LEGACY_UACS_TO_CATEGORY` map converts known codes — generic Training Expenses (5020201002) counts as ICT Training; unknown codes and class mismatches are left uncategorized, amber-flagged ("Set category") per item, and surfaced by a conditional `part4/categories` migration-review banner. B.4 (editor + PDF) now lists one row per category in handout order; uncategorized money keeps an explicit "Uncategorized" row so B.4's grand total always matches B.1–B.3 (this also closes the old backlog item "Align Part IV B.4 totals"). PDF A-table group headers show the category name only. Old machinery parked, not deleted: `uacs-combobox.tsx` stays unimported (header note), `/uacs` explorer + `public/uacs_active.min.json` + repo-root `uacs/` remain but nothing links or fetches them. Demo regenerated at v14 with category ids. Gates: `scripts/verify-expense-categories.ts` (new), all verify scripts, tsc + lint (clean), `smoke-merge-review.mjs` and `smoke-part4-cycle.mjs` (now honors `SMOKE_BASE`) green on :3000, demo PDF export verified (B.4 handout order, zero numeric codes). `smoke-roundtrip.mjs`/`smoke-project-filter.mjs` still fail in the pre-existing Distribute Phase A way (see known-stale note below). Deployed: merged to `main` (fast-forward) + pushed, built on main, `pm2 restart issp`; prod 200 on `/issp`, `/issp/editor`, `/issp/editor/part4/cycle`, `/issp/editor/part4/summary` and serves the v14 demo. **Hotfix (same day, post-deploy):** the review dialog's part4/categories section pointed at nonexistent `/editor/part4` → now `/editor/part4/cycle`; and acknowledging the migration notice marked the doc unsaved-to-file (`migrationReview` sat inside `docContentHash`), which armed Chrome's leave-site popup for every legacy-file load — review state is now stripped from the hash like sectionMeta. Repro-verified end-to-end on dev (dialog → Review lands on Cycle View with the amber flag, no Unsaved state, no beforeunload on leave). The Aptos 14 style work was later merged and deployed with the diagram port below.
- **Hidden "Aptos 14" PDF style + page-filling diagrams for every style — DEPLOYED 2026-09-29 (merge `4982b97`, BUILD_ID `fdvB1g2HA5Q8-2zz48Tv-`; branch `feat/aptos14-pdf-style` fully merged):** the style itself stays a personal export style for Carlos, off for everyone else. **Update 2026-09-29: the page-filling diagram treatment now runs for EVERY export style** — the route no longer gates the measure pass on aptos14, so default exports also give each II-B1/III-A/III-B diagram its own page with its title on top, sized to the largest aspect-kept box (verified with synthetic wide/small/tall diagrams: dedicated pages, images never upscaled, zero leftover markers, TOC rows still point at section starts). Turn on per browser with `/editor?pdfstyle=aptos14` (stored in localStorage `issp-pdf-style`; `?pdfstyle=default` clears it); the sidebar PDF buttons then show a small "A14" tag and export calls `/api/export?style=aptos14` (the param is hidden, not secret — it only changes styling). Effect: every element of cover, TOC, definitions, Parts I–IV, Annex 1, and the running header/footer is Aptos 14 pt (override CSS injected in `generate-pdf.ts`; the fixed-height cover grows and tightens its spacing instead of clipping). Diagrams (II-B1 network diagrams, III-A proposed network, III-B EA) each get their own page with the title on top (III-B stays under its page-opening section heading instead of forcing a second break), sized to the largest aspect-kept box that fits the page (full width or remaining height), centered: a pass-0 "measure" render places a 1px placeholder after an `@@dg:img:id@@` marker, pdfjs reads its y-position, and the same forced breaks in both builds keep the measured positions valid. In this style II-B1's network description renders above the diagrams. The style also prints a bold "NOTE: Awaiting data from OHRMD" above the Part I-B.2 Human Capital table (route-level `sectionNotes`, keyed by TOC id). Fonts: Microsoft's Aptos package, **only the 4 core files** (Regular/Bold/Italic/Bold Italic) installed to `/usr/share/fonts/truetype/aptos` on the server (not in git) — the Display/Black/etc. files also register family "Aptos" and fontconfig then picks Aptos Display/Black for body text. Checkbox glyphs (☐☑) fall back to DejaVu Sans. Default typography unchanged (diagram pages excepted — see Update above). Verified: tsc + lint; dev exports of the demo and PIT files with synthetic diagrams (wide/small/tall), all 38 TOC entries match footers in both styles, no leftover markers; Puppeteer flag on/remembered/off smoke.
- **Fund-source spelling fix — DEPLOYED 2026-09-28 (`a594d09`, BUILD_ID `_Qj7NR2Z7NYLiJJvQWjPh`):** root cause `a65fbe2` (2026-09-17 copy alignment) renamed three STORED fund-source values ("General Appropriations Act (GAA)" → "General Appropriations Act", "Foreign-Assisted" → "Foreign-assisted projects", "Locally Funded" → "Locally funded") with no data migration, so older files/demo/generators carried values no dropdown offered and mixed files split B.2 (editor + PDF) into two GAA rows. Fix: `src/lib/fund-sources.ts` (single option list + legacy map + canonical grouping), always-on normalization in `migrateLegacyDoc`, B.2 grouped by canonical value in editor and PDF, `scripts/verify-fund-sources.ts`; demo regenerated (`f5c996d`); local tools (docx-to-issp validator/SKILL.md, CSC generator) updated (not tracked). Rule: fund-source strings are data — a rename must add the old spelling to LEGACY_SPELLINGS.
- **DEPLOYED 2026-09-28 (`744c358`, BUILD_ID `0y5TX9bzwhH-Gnqvf-2_K`):** merge review + Cycle View + usage-log policy + What's New "Merge Review + Cycle View" entry (Sept 15–17 entry collapsed). Built under Node 24.14.0, `pm2 restart issp`; prod routes 200 (`/issp`, `/issp/editor`, `/issp/editor/part4/cycle`, `/issp/editor/part4/summary`); `smoke-merge-review.mjs` 19/19 against prod (`/issp` basePath); Cycle View renders the demo (42 rows, no page errors). Dev relaunched detached on :3000. NOT pushed to GitHub.
- **Consolidate merge review, 2026-09-27 (on `main`, merge `e124b7b`):** Consolidate now opens a full-screen **merge review** that compares the master with the returned files before anything changes — change kinds (New / Overwritten / Cleared / Added / Replaced / Removed / Appended rows, Kept (office deleted), Office rows replaced), Master | Incoming with word highlights (jsdiff), image thumbnails, changed-cell tables, Part IV line-item and per-project budget deltas; **Keep master** / **Skip row** decisions; conflicts with no default plus "Keep master value"; provenance warnings; would-break links. Engine: `src/lib/scope/merge-review.ts` (decisions restore the master in the returning file, then re-merge). Also on main: returned files are **upgraded** before merge with master backfills (`scope/upgrade.ts`, `168ed45`) and multi-owner lists merge **by row id with the master as merge base** (`a53f12a`). Spec `docs/superpowers/specs/2026-09-27-consolidate-merge-review-design.md`; usage `docs/scoped-distribution-usage.md` §3; glossary `CONTEXT.md`. Gates: 9 verify scripts, `scripts/smoke-merge-review.mjs` (+ `make-merge-review-fixture.ts`), tsc + lint. Known stale: `scripts/smoke-roundtrip.mjs` fails Phase A ("roster missing part1/b") on main before this work too.
- **Part IV Cycle View, 2026-09-27 (on `main`, merge `0b06053`; deployed 2026-09-28):** cross-year line-item editor at `/editor/part4/cycle` with List (default, details drawer) and Table modes; review fixes `a771aa5`.
- **Usage-log policy, 2026-09-27 (`d11307a`):** the 2026-09-17 SMK / DEPLOY-CHECK exclusion work below is now committed. 9 "Smoke Agency / SA" entries from this session's browser checks were removed from `.data/issp-usage.jsonl` (backup `.data/issp-usage.jsonl.bak-2026-09-27`); the committed merge-review fixture uses the excluded NCWTR demo.

- **Schema v13 demo + skills sync, 2026-09-17 (branch `feat/template-09152026-alignment`):** the demo file is regenerated at `schemaVersion` 13 with real data for both v13 fields — `humanCapital.plantillaUnfilled` (I-B: IT 4 / non-IT 12, flat counts, no sex split) and `targetedResult` statements on all 10 III-F KPI rows (4 SIKAP + 3 BILIS + 3 HANDA, following the Performance framework guide: Intermediate = stakeholder behavior change, Immediate = agency capability, Output = completed deliverable). `scripts/build-demo.js` now emits a `SCHEMA_VERSION` constant (13, synced to `migration-review.ts`) instead of a hardcoded 12; all demo IDs unchanged. Validator (`.claude/skills/docx-to-issp`, local-only) bumped to the v13 gate and warns on hierarchy-without-targetedResult and missing plantillaUnfilled; schema-change skill gained the migration-history table with the v13 row.
- **Usage-log smoke cleanup, 2026-09-17 (committed 2026-09-27 as `d11307a`):** the 2026-09-17 scoped-distribution smoke runs drove the real UI with the fixture agency "Smoke Agency"/`SMK`, and every load/restore logged — 69 entries (10.2% of the file) landed in `.data/issp-usage.jsonl`, which dev and prod share (same cwd). Fix: `src/lib/usage-log-policy.ts` now also excludes `SMK` and `DEPLOY-CHECK` (policy = single source of truth; new smoke fixtures must register their acronym there — noted in `make-project-filter-fixture.ts`); `scripts/remove-demo-usage-logs.ts` now purges by that policy instead of hardcoding NCWTR, and stripped the 70 entries (69 SMK + 1 DEPLOY-CHECK; backup at `.data/issp-usage.jsonl.bak-2026-09-17`, log went 676→606 lines with the live CSC entry intact). Gate repairs: `check-usage-log.ts` gained SMK/DEPLOY-CHECK exclusion asserts + append-drop asserts, and both it and the purge script wrap their async tails in IIFEs because tsx emits cjs for this package. Run the gate with `NODE_OPTIONS="--conditions react-server" npx tsx scripts/check-usage-log.ts` — the `server-only` import in `usage-log.ts` needs that condition (package now a devDependency). Known leftover: ~23 test-like entries (TEST/test, arwar, …) stay — they may be real agencies trying the app.

- **Per-project follow-up — agency-wide budget + linked IS (branch `feat/scoped-project-filter-followup`, 2 commits `3d2ddc1..13f2a5a` on top of main `4f4aa20`; not merged/pushed/deployed):** for project-filtered files only (unfiltered batches byte-for-byte unchanged): (1) Part IV's `officeProductivity`/`continuingCosts` no longer travel in the slice (they stay at the empty default; the year pages hide both SectionCards via `hideNonProjectCategories` when `editScope.projectIds` is present) and contribute **nothing** on consolidate — no overlay, sub-conflict, or flag, so conflicts on the two categories can only arise between offices holding unfiltered files (a naive copy would have wiped the master's agency-wide budget); (2) `part3/d.proposedSystems` joins `PROJECT_BEARING_FIELDS` (now 7 members; the dialog's panel visibility uses this spread, so a III-D-only office now sees the Projects panel, and the field sits in both carrier-leaf lists with hints naming III-D) — a project file's Proposed IS list carries exactly the selected projects' linked systems, and the merge replaces by system id, appends new systems with a review flag, and keeps absent systems unflagged (`projectIds` addresses projects, not systems). Gates: all 5 verify scripts + tsc + lint + `scripts/smoke-project-filter.mjs` (Phases A/B extended for both changes) green. Spec addendum `4f4aa20`; docs `docs/scoped-distribution-usage.md` + `CONTEXT.md`.
- **Per-project scoped distribution, 2026-09-17 (branch `feat/scoped-project-filter`, 7 commits `c3c2a19..8b519f6`; not yet on `main`):** an office's scope can now carry `editScope.projectIds?: string[]` (absent = all projects, previous behavior; empty = start empty), which filters the project-bearing fields — `part3/e1.internalProjects`, `part3/e2.crossAgencyProjects`, `part3/f.performanceFramework`, and the `part4/yearN` year budgets — at slice time. The Distribute dialog grows a per-office **Projects** panel (All projects / Selected projects only / Start empty); single-project files are named after the project (`SMK-ISSP-2028-2030-sikap.issp`). On Consolidate, project-bearing data merges **by project id** whenever any file in the batch declares the filter: edits replace the master's rows, new projects union in with a review flag, and a project the recipient deleted stays on the master, flagged — deletion never propagates silently. Part IV year fields decompose so `officeProductivity`/`continuingCosts` keep scalar-conflict semantics under nested fieldKeys `yearN.officeProductivity`. Gates: `scripts/verify-project-slice.ts`, `scripts/verify-project-consolidate.ts`, `scripts/smoke-project-filter.mjs` (+ `scripts/make-project-filter-fixture.ts`). Engine: `src/lib/scope/{types,paths,slice,consolidate}.ts`; dialogs: `src/components/editor/{distribute-dialog,consolidate-dialog}.tsx`.
- **Project duration + truncation family + III-F read/drawer, deployed 2026-09-16 (`53b4e60..5428469`, branch `fix/project-duration` merged to main and pushed):** (1) III-E duration toggle repaired (single↔range switch); the picker blocks shortening a duration while dropped years still carry Part IV lines; Part IV year pages, their totals, and the PDF year tables show only projects whose duration covers that year (legacy off-duration lines surface as a warning strip, excluded from totals). Duration helpers live in `src/lib/duration.ts` with `scripts/verify-duration.ts` as the gate. (2) Shared `SelectTrigger` no longer clips values mid-word — proper ellipsis + title tooltip (closed #7); Duration field spans two grid columns; I-C names wrap; UACS label has a tooltip. (3) Part III-F rebuilt: desktop read-only wrapping table (+12px card padding) with method/responsibility sub-lines; mobile read cards; both edit via a Sheet drawer (LineItemDrawer pattern) with two-step delete. Audit: `docs/ux-audit-truncation-2026-09-16.md`.
- **Ten-theme system, deployed 2026-09-16 (`8254c8d`, ported from Eksaayl's fork 79150bd):** theme catalogue in the plain module `src/lib/themes.ts` (System, Warm, Ocean, Forest, Rose × light/dark) so the server layout can derive the pre-hydration script; CSS variable sets + `dark:` registration in `globals.css`; sidebar theme menu grouped by colour family with swatches. PSA branding/PDF/account page excluded. Verified on prod: 10 options, pick applies + persists, zero console errors. Known nit: footer credit and disabled sidebar items run low-contrast in dark themes.
- **Part II-A program column (schema v12), deployed 2026-09-16:** programs are id-addressed `{id, name}` objects under each Part I-A.4 outcome; Part II-A concern cards carry an optional program multi-select (`programIds`); the PDF's II-A column 1 renders "→ Program N: …" lines under the outcome, and legacy string programs are normalized at export. Legacy docs migrate losslessly on load (strings → deterministic ids; `programIds` defaults to `[]`, which renders as outcome-only — no migration-review flag, by design). Shipped via `feat/part2a-program-column` (9 commits, fast-forward merged to `main`, pushed); design: `docs/superpowers/specs+plans/2026-09-15-part2a-program-column.md`.

- Public editor at `/editor`; no login, no accounts, no server-side document storage.
- One active `IsspDocument` is stored in browser IndexedDB via `src/lib/store/idb.ts`.
- Users save portable drafts as `.issp` files and load them back into the browser.
- **Scoped distribution (2026-09-03):** a master file can be carved into per-office scoped copies (Distribute), edited offline by each office, and merged back with conflict review (Consolidate). Entirely file-based — no server involvement. See `docs/scoped-distribution-usage.md`.
- PDF export is `POST /api/export`; it receives the full document JSON, renders with Puppeteer/pdf-lib, and returns a PDF without persisting the document.
- Limited usage analytics are appended by `POST /api/usage` for create, load, and browser-draft restoration events; non-real agencies (demo `NCWTR`, smoke `SMK`, `DEPLOY-CHECK`) are excluded by `src/lib/usage-log-policy.ts` on both client and server.
- Prisma, NextAuth, `/login`, `/dashboard`, `/api/issp`, `/api/auth`, and `src/proxy.ts` were removed in the local-first cutover (2026-06-14).

## Source of Truth

| Area | Canonical source |
|---|---|
| Current project state and backlog | `docs/project-status.md` |
| 2026 ISSP field names/options/structure | `references/ISSP_Guidelines_2026.md` |
| Scoped distribution design | `docs/scoped-issp-distribution-design-2026-07-21.md` + `src/lib/scope/` |
| Scoped distribution usage (user-facing) | `docs/scoped-distribution-usage.md` |
| Current data model | `src/lib/store/types.ts` (schemaVersion 13) |
| Defaults and new document factory | `src/lib/store/defaults.ts` |
| IndexedDB persistence | `src/lib/store/idb.ts`, `src/lib/store/index.tsx` |
| Editor sections/sidebar structure | `src/lib/sections.ts` |
| PDF export mapping | `src/app/api/export/route.ts` |
| PDF rendering | `src/lib/pdf/render-issp-html.ts`, `src/lib/pdf/generate-pdf.ts` |

## Verification Status

Last full gate: 2026-09-15 (tsc + lint + verify scripts + Puppeteer/PDF smokes; Part II-A program column, schema v12).

| Check | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | Pass | Dev type-gate. NEVER use `npm run build` as a gate — see `docs/production-safety.md`. |
| `npm run lint` | Pass | One standing warning: unused `sysByShort` in `references/csc-issp/build_csc_issp.mjs` (outside app code). |
| Security gates (Trivy/Semgrep/SBOM) | Pass | Dependency CVEs cleared through `c9ce38f` (2026-08-14) and `9b48d7a` (2026-09-29, fast-uri 3.1.6→3.1.7 for CVE-2026-84292/-84394). NVD re-publishes transitive CVEs over time; fix via `npm override` + `--package-lock-only`, never `npm audit fix --force`. |

## Implemented Features

| Area | Status | Notes |
|---|---|---|
| Parts I-IV editor | Done | All main ISSP sections are represented as local-first editor pages. |
| **Scoped distribution** | **Done, 2026-09-03** | Full round-trip: secretariat Distributes scoped `.issp` per office (tree-picker: area→section→field granularity) → office edits only owned fields (scope banner, route guards, PDF blocked, shared-table rows stamped `officeId`) → secretariat Consolidates returns (shared-table replace-by-office, list overlap union+flag, scalar conflicts resolved in review UI) → `consolidationFlags` surface as section banner + sidebar badge until "Mark reviewed". `src/lib/scope/{paths,slice,consolidate,types}.ts`, `src/components/editor/{distribute-dialog,consolidate-dialog,scope-guard-panel}.tsx`, `editScope`/`consolidationFlags` on `IsspDocument`. Schema v11. Merged `dda843e`; deployed to prod 2026-09-03. Feature is inert for existing users (no `editScope` ⇒ unchanged editor). |
| Annex 1 | Done | Standalone `/annex1` form (offices fill + download) PLUS inline management at `/editor/annex1` (add/edit offices directly, attach `.issp` files, status dots/activity tracking). Annex 1 payloads can carry `officeId` for consolidate merge. |
| Definition of Terms | Done | Editable front matter seeded with standard DICT terms. |
| Local-first store | Done | IndexedDB store, migrations, `.issp` save/load, unsaved-to-file tracking. |
| Legacy migration review | Done | Older files migrate automatically and flag I-C, II-C, II-D, and III-D for human review where required. |
| Part I-C transaction direction | Done, 2026-07-18 | `direction: "INCOMING" \| "OUTGOING" \| ""` on every stakeholder service, per DICT 2026 v2. PDF groups services INCOMING:/OUTGOING:/UNSPECIFIED:. |
| Part I-C view redesign | Done, 2026-07-18 | Table + List (Cards/Summary merged). Read-only defaults; edit via toggle/drawer (usability principle #2). |
| Part IV project labeling | Done, 2026-07-23 | Projects numbered `Internal ICT Project #n` / `Cross-Agency ICT Project #n` on all surfaces; budget categories renamed Office Productivity / Internal ICT Projects / Cross-Agency ICT Projects / Continuing Costs; A/B/C letters retired. |
| Part III-B guidance | Done, 2026-09-02 | References PGIF 2.0 (DICT) with link, replacing "Philippine EA Framework (PeGov)". |
| Part II-A program column | Done, 2026-09-15 | Concerns link programs (programIds); PDF column 1 renders OO/SO/MFO + Program n:; programs are {id,name} (schema v12). |
| Demo file | Done | Generated by `scripts/build-demo.js` at schemaVersion 12; concerns carry `programIds`. Generator and file are in lockstep — edit the generator, regenerate, commit both. |
| PDF export | Done | Cover, interactive TOC/bookmarks, definitions, Parts I-IV, Annex 1, running header/footer, UACS budget tables, streaming progress (SSE), CSP-safe client decode. |
| Usage analytics | Done | Create/load/restore events record only agency name, acronym, event, and server timestamp. |
| Diagram upload | Done | Part II-B network diagrams, Part III-A proposed network, Part III-B enterprise architecture as data URLs. |
| Theme system | Done | System/Warm light/dark themes and sidebar theme controls. |
| Rich-text textarea | Done, 2 fields | Part I-A Mandate/Functions (toolbar) + Vision (shortcuts). Rollout decision pending (`docs/rich-text-textarea-design-2026-07-17.md`). |
| basePath prod hardening | Done, 2026-08-28 | All internal links must use `next/link` (plain `<a>` 404s on prod basePath `/issp`). Fixed for Annex 1 "Open form" after a user report. |
| What's New announcements | Done, 2026-09-03 | Announcement pill for scoped distribution + Jul-Sep backlog (`8bcfec7`, `66ba275`). |

## Active Architecture

| Component | Location | Notes |
|---|---|---|
| App framework | Next.js 16 App Router | See `node_modules/next/dist/docs/` before coding against Next APIs. |
| Public editor | `src/app/editor/` | Splash when no doc is loaded, overview when a doc exists. |
| Scoped distribution | `src/lib/scope/`, `src/components/editor/*-dialog.tsx` | Pure engine (`sliceScopedDoc`, `consolidate`) + dialogs. Masters-only sidebar (⋯ file-actions menu) entries. |
| Annex 1 module | `src/app/annex1/`, `src/app/editor/annex1/`, `src/lib/annex1/`, `src/components/annex1/` | Standalone form + inline management. |
| Editor shell | `src/components/editor/editor-shell.tsx` | Sidebar, mobile drawer, before-unload warning. |
| Editor sidebar | `src/components/editor/editor-sidebar.tsx` | Navigation, save/load, PDF export, Distribute/Consolidate (⋯ menu, masters only), theme menu, clear data. |
| Forms | `src/components/issp-editor/` | Part I-IV form components. |
| Store provider | `src/lib/store/index.tsx` | Client context, migration, save/load, unsaved detection, scoped-file gate. |
| Native IndexedDB wrapper | `src/lib/store/idb.ts` | No `idb-keyval` dependency. |
| API routes | `src/app/api/export/route.ts`, `src/app/api/usage/route.ts` | Stateless PDF export plus limited append-only usage analytics. Only two endpoints exist. |
| PDF generator | `src/lib/pdf/generate-pdf.ts` | Puppeteer, TOC marker scan, pdf-lib merge. |

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.11, App Router, TypeScript, Turbopack |
| Persistence | Native IndexedDB wrapper in `src/lib/store/idb.ts` |
| UI | Tailwind CSS 4, shadcn/ui-style local components, Base UI where used |
| Forms | React Hook Form + local controlled form patterns |
| Validation dependency | Zod is installed but not yet used as a full document import/export schema |
| Toasts | Sonner |
| PDF | Puppeteer + pdf-lib + pdfjs-dist marker scan |
| Fonts | Fraunces and IBM Plex for UI; P052/URW Palladio for PDF |

## Project Structure

```text
docs/                    Historical notes, audits, and this canonical tracker
docs/adr/                Architecture Decision Records
references/              Official template/guideline references; use ISSP_Guidelines_2026.md first
public/demo/             Demo `.issp` file
public/uacs_active.min.json   Parked legacy UACS dataset (schema v14 removed the code picker; kept for reference, nothing fetches it)
scripts/build-demo.js    Demo file generator (SCHEMA_VERSION synced to migration-review.ts)
src/app/                 Next.js app routes
src/app/editor/          Local-first editor pages (incl. annex1/ subroutes)
src/app/annex1/          Standalone Annex 1 form
src/app/api/export/      Stateless PDF export endpoint
src/app/api/usage/       Limited append-only usage analytics endpoint
src/components/editor/   Editor shell/sidebar/overview/dialogs (distribute, consolidate)
src/components/annex1/   Annex 1 editor components
src/components/issp-editor/  Part I-IV form components
src/lib/scope/           Scoped-distribution engine (paths, slice, consolidate, types)
src/lib/annex1/          Annex 1 types/defaults
src/lib/store/           IsspDocument types, defaults, store provider, IndexedDB wrapper
src/lib/pdf/             PDF HTML renderer and Puppeteer generator
src/lib/sections.ts      Editor section model
uacs/                    UACS source/reference files (1,262 active / 1,290 total)
```

## Active Backlog

Priority definitions:

- P0: broken user-facing behavior or docs that mislead users today.
- P1: data safety, security, export correctness, or template compliance risks.
- P2: maintainability, polish, or lower-risk correctness issues.

### P1 - Data Safety and Export Hardening

| Item | Files | Next step |
|---|---|---|
| Harden PDF export endpoint | `src/app/api/export/route.ts`, `src/lib/pdf/generate-pdf.ts` | Add request size guard beyond nginx 50 MB, schema validation, timeout, concurrency/rate controls. SSE progress UI + structured 400/413 client errors already shipped (2026-07-15/16). |
| Control base64 image growth | `src/lib/diagram-upload.ts`, store/export flow | Add total document/image limits, diagram count cap, optional downscaling, and SVG policy. Per-file 10 MB + count caps already enforced at upload; remaining gap is total-document size. |

(Shipped since the 2026-07-18 list and removed: PDF export failure surfacing — toast + inline error card, 2026-07-16; IndexedDB save races — generation token + save-error state, 2026-06-19; `.issp` import validation — 50 MB cap, version policy, default normalization, scoped-file gate; dependency advisories — cleared through 2026-08-14; read-only-section completion exclusion — `.filter(!readOnly)` in `sections.ts`.)

### P1 - Template and PDF Correctness

| Item | Files | Next step |
|---|---|---|
| Annex 2 (DRBCP) | `references/[Reference] ANNEX 2*.pdf`, `src/lib/pdf/render-issp-html.ts` | Not implemented. Decide scope: local-first annex module (mirroring Annex 1) or pre-export manual-attachment checklist. |
| Preserve Part III.D enhancement details | `src/app/api/export/route.ts`, `src/lib/pdf/render-issp-html.ts` | Render `enhancementDetails` separately for systems marked `For Enhancement`. |
| Normalize EGP defaults | `src/lib/store/defaults.ts`, `src/lib/store/index.tsx`, `src/lib/pdf/render-issp-html.ts` | Add `elgu`, PNPKI adoption percentage, Online Portal mechanisms/connection defaults and migration. |
| Always render Part III.E.2 | `src/lib/pdf/render-issp-html.ts` | Include E.2 in TOC/body with an explicit empty or N/A state. |
| ~~Align Part IV B.4 totals~~ | — | **Done 2026-09-29 (schema v14):** uncategorized items now keep an explicit "Uncategorized" row in B.4 (editor + PDF), so its grand total always matches B.1–B.3, and the editor flags those lines per item. |

### P2 - Maintainability and Polish

| Item | Files | Next step |
|---|---|---|
| Move server-safe aggregation out of component tree | `src/app/api/export/route.ts`, `src/components/issp-editor/part4/part4-aggregations.ts` | Move pure Part IV helpers to `src/lib/`. |
| Remove render-time redirects | `src/app/editor/**/page.tsx` | Use `EditorShell` redirect or move per-page redirects into effects. |
| Guard committed dev origin | `next.config.ts` | Restrict `allowedDevOrigins` to development or local-only config. |
| Rich-text textarea rollout | `src/components/ui/rich-textarea.tsx` | Decide app-wide rollout to ~8 textareas (design doc 2026-07-17). |
| Scoped-distribution deferred minors | `src/lib/scope/`, dialogs | Two-banner stacking (migration+consolidation); stale "serialize-before-mutation" comment; sidebar `changedSections` tracker unfiltered; `handleDrawerSave` DRY; `parseScopedIsspFile` skips migration (v11+ fine); `definitions.definitions` magic string; dup-office-name filename collision. |
| Pre-export validation | validation rule engine | Required fields, budget-IS linkage, KPI completeness → SectionShell gating + export blocking. |
| Read-only review mode | editor shell | Locked view for pre-submission review. |
| Demo generator refresh | `scripts/build-demo.js` | Bump embedded schemaVersion 6→11 and regenerate, or delete the script. |
| Attribution/recognition modal | export flow | Backlogged idea — tasteful post-export ask for PRAISE nomination. See `docs/attribution-recognition-plan.md`. |

## Documentation Policy

Only `docs/project-status.md` is the active tracker. Other docs are retained as historical context or task-specific plans.

| Document | Status | Notes |
|---|---|---|
| `docs/scoped-distribution-usage.md` | Current | User-facing usage guide for Distribute/Consolidate. |
| `docs/production-safety.md` | Current | Deploy rules; the ONLY tracked copy of the AGENTS.md safety rules. |
| `docs/code-sweep-2026-06-19.md` | Historical audit snapshot | Detailed findings from that sweep. |
| `docs/security-review.md` | Historical plus partial current notes | Auth/DB findings are superseded by removal; current risks are mirrored in this tracker. |
| `docs/privacy-architecture.md` | Historical design record | Usage-log section accurate; server-scaffolding claims superseded. |
| `docs/session-handoff.md` | Historical session log | Do not use as current architecture source; deploy steps there predate the 2026-08-03 incident. |
| `docs/implementation-plan.md` | Historical pre-local-first plan | Do not follow Prisma/NextAuth/API route instructions. |
| `docs/annex1-implementation-plan.md` | Historical | Superseded by shipped implementation (standalone + inline). |
| `docs/superpowers/specs+plans/*` | Historical | Point-in-time design/execution docs. |
| `docs/*audit*`, `docs/*plan*`, `docs/session-log-*` | Historical | Use for rationale only; verify against source and this tracker. |

## Next Hypersession Plan

Recommended order after this documentation cleanup:

1. Template correctness: enhancement details, EGP defaults, E.2 empty state, Part IV B.4 (all P1, well-scoped).
2. Scoped-distribution deferred minors sweep (P2 cluster from final review).
3. PDF export endpoint hardening (request guards beyond nginx, timeout, concurrency).
4. Annex 2 scope decision.
5. Pre-export validation + read-only review mode (the original Phase 7 pillars that remain).
