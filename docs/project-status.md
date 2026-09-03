# ISSP Builder - Project Status

> Canonical tracker. This is the only document that should be treated as the current project state, backlog, and next-session plan. Older session logs, implementation plans, audits, and architecture notes are historical unless this file explicitly points to them.

Last updated: 2026-09-03

## Current State

The active app is a local-first ISSP editor for the DICT 2026 template, with multi-office scoped distribution.

- Public editor at `/editor`; no login, no accounts, no server-side document storage.
- One active `IsspDocument` is stored in browser IndexedDB via `src/lib/store/idb.ts`.
- Users save portable drafts as `.issp` files and load them back into the browser.
- **Scoped distribution (2026-09-03):** a master file can be carved into per-office scoped copies (Distribute), edited offline by each office, and merged back with conflict review (Consolidate). Entirely file-based — no server involvement. See `docs/scoped-distribution-usage.md`.
- PDF export is `POST /api/export`; it receives the full document JSON, renders with Puppeteer/pdf-lib, and returns a PDF without persisting the document.
- Limited usage analytics are appended by `POST /api/usage` for create, load, and browser-draft restoration events; the fictitious sample is excluded.
- Prisma, NextAuth, `/login`, `/dashboard`, `/api/issp`, `/api/auth`, and `src/proxy.ts` were removed in the local-first cutover (2026-06-14).

## Source of Truth

| Area | Canonical source |
|---|---|
| Current project state and backlog | `docs/project-status.md` |
| 2026 ISSP field names/options/structure | `references/ISSP_Guidelines_2026.md` |
| Scoped distribution design | `docs/scoped-issp-distribution-design-2026-07-21.md` + `src/lib/scope/` |
| Scoped distribution usage (user-facing) | `docs/scoped-distribution-usage.md` |
| Current data model | `src/lib/store/types.ts` (schemaVersion 11) |
| Defaults and new document factory | `src/lib/store/defaults.ts` |
| IndexedDB persistence | `src/lib/store/idb.ts`, `src/lib/store/index.tsx` |
| Editor sections/sidebar structure | `src/lib/sections.ts` |
| PDF export mapping | `src/app/api/export/route.ts` |
| PDF rendering | `src/lib/pdf/render-issp-html.ts`, `src/lib/pdf/generate-pdf.ts` |

## Verification Status

Last full gate: 2026-09-03 (tsc + lint + Puppeteer smokes; scoped-distribution round-trip 96/96 assertions).

| Check | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | Pass | Dev type-gate. NEVER use `npm run build` as a gate — see `docs/production-safety.md`. |
| `npm run lint` | Pass | One standing warning: unused `sysByShort` in `references/csc-issp/build_csc_issp.mjs` (outside app code). |
| Security gates (Trivy/Semgrep/SBOM) | Pass | Dependency CVEs cleared through `c9ce38f` (2026-08-14). NVD re-publishes transitive CVEs over time; fix via `npm override` + `--package-lock-only`, never `npm audit fix --force`. |

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
| Demo file | Done, with drift | Checked-in demo is schemaVersion 10 (still loads fine — migrates on load). `scripts/build-demo.js` embeds v6 and would emit a legacy file if re-run; regenerate or bump before reuse. |
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
public/uacs_active.min.json
scripts/build-demo.js    Demo file generator (stale — embeds schemaVersion 6)
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
| Align Part IV B.4 totals | `src/components/issp-editor/part4/part4-aggregations.ts`, `src/components/issp-editor/part4/part4-summary.tsx` | Include uncoded UACS items or warn/block; include B.4 in consistency checks. |

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
