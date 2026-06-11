# ISSP Builder - Project Status & Setup Guide

## Current Status

**Phase 1: Foundation — ✅ COMPLETE**
**Phase 2: Part I Forms — ✅ COMPLETE**
**Phase 3: Part II Forms — ✅ COMPLETE**
**Phase 4: Part III Forms — ✅ COMPLETE**
**Phase 5: Part IV Forms — ✅ COMPLETE**
**Phase 6: PDF Export — ✅ COMPLETE**
**Local-First Rearchitecture (Phases A–F) — ✅ COMPLETE**

> Field alignment audit completed. All critical misalignments fixed. See `docs/guidelines-alignment-audit.md`.  
> Use `references/ISSP_Guidelines_2026.md` as the reference for all field names and options.

---

## Implemented Features

| Task | Status |
|------|--------|
| Next.js project initialization | ✅ Done |
| Prisma + SQLite database with full schema | ✅ Done |
| UACS codes imported (1,253 total, 1,225 active) | ✅ Done |
| NextAuth.js v5 with credentials provider | ✅ Done |
| Base UI + Tailwind CSS 4 components | ✅ Done |
| Auth proxy (route protection via middleware) | ✅ Done |
| Seed data (NCWTR agency + users + comprehensive ISSP) | ✅ Done |
| ~~Inter font~~ → replaced by Fraunces + IBM Plex Sans/Mono (UI Refresh Phase 3) | ✅ Done |
| **Local-first IndexedDB store (`src/lib/store/`)** | ✅ Done |
| **`/editor` route — public, no auth** | ✅ Done |
| **All Part I–IV forms wired to IndexedDB store** | ✅ Done |
| **Save to File / Load from File UX** | ✅ Done |
| **`unsavedToFile` indicator + amber/green status pill** | ✅ Done |
| **Periodic save reminder nudge (10 min, via `useFileSaveReminder`)** | ✅ Done |
| **`beforeunload` warning when unsaved file changes exist** | ✅ Done |
| **`POST /api/export` — stateless PDF export, no auth** | ✅ Done |
| **Demo `.issp` file (`public/demo/ncwtr-issp-2026-2028.issp`)** | ✅ Done |
| **Landing page updated — local-first copy, no sign-in** | ✅ Done |
| **EditorSidebar — "ISSP Builder" label, Exit Editor link** | ✅ Done |
| **Agency logo upload (New ISSP + Properties dialogs) → PDF cover + running header** | ✅ Done 2026-06-10 |
| **Security/correctness fixes: EgP export mapping, PDF injection hardening** | ✅ Done 2026-06-10 (`docs/codebase-review-2026-06-10.md`) |
| **UX audit fixes: dialog scroll, NumberInput, coarse-pointer touch targets** | ✅ Done 2026-06-11 (`docs/ux-audit-2026-06-11.md`) |
| **Real TOC page numbers (two-pass render, pdfjs-dist marker scan)** | ✅ Done 2026-06-11 |
| **PDF header per official template — starts at Part I, logo upper-left, Page 1 restart** | ✅ Done 2026-06-11 (`docs/agency-logo-header-plan.md`) |
| **Editable Definition of Terms (front-matter module)** | ✅ Done 2026-06-11 — `/editor/definitions`, sidebar entry above Part I, seeded with the 3 standard DICT template terms (editable/deletable + "Restore standard terms"), prints alphabetically in the PDF, TOC row + page omitted when empty. Data: `IsspDocument.definitions` (optional; absent = standard terms, so old `.issp` files keep working) |
| API: /api/issp/documents (GET, POST) | ✅ Done (dormant) |
| API: /api/issp/documents/[id]/export (GET → PDF, auth-required) | ✅ Done (dormant) |
| Part I–IV: all form sections | ✅ Done |
| PDF: Puppeteer HTML → A4 landscape, P052 font, DICT uniformity rules | ✅ Done |
| PDF: Running header, footer, cover, TOC, definitions | ✅ Done |
| PDF: Two-PDF + pdf-lib merge (cover without header/footer) | ✅ Done |
| PDF: Part IV UACS grouping, subtotals, grand totals | ✅ Done |
| PDF: Project title brackets removed from Part IV section headers | ✅ Done |
| Landing page at `/` (public) — local-first redesign, no sign-in, MITHI checklist | ✅ Done |
| About page at `/about` — editorial/blog style, `content/about.md` via remark | ✅ Done |
| Privacy page at `/privacy` — privacy architecture blog post, `content/privacy.md` | ✅ Done |
| UACS Explorer at `/uacs` — static HTML, next.config.ts redirect | ✅ Done |
| Attribution in editor sidebar + documents footer | ✅ Done |
| Initial GitHub push to `carlosalbornoz/issp-builder` | ✅ Done |
| Sonner toast library (`<Toaster>` in root layout) | ✅ Done |
| **UI Refresh Phase 1** — `sectionMeta`, `planStatus`, `submissionTarget`, `schemaVersion` data model | ✅ Done 2026-05-23 |
| **UI Refresh Phase 2** — `StatusDot`, `RelativeTime`, `CompletionBar`, `PlanStatusPill` primitives | ✅ Done 2026-05-23 |
| **UI Refresh Phase 3** — Fraunces + IBM Plex Sans/Mono fonts; warm `#FAFAF7` palette | ✅ Done 2026-05-23 |
| **UI Refresh Phase 4** — Overview dashboard: PlanMetadataStrip, OverviewHeader, ContinueEditingCard, PartCard | ✅ Done 2026-05-23 |
| Content-sniffing migration (`deriveMetaFromContent`) — infers status from existing content on load | ✅ Done 2026-05-23 |
| **UI Refresh Phase 5** — Sidebar: StatusDot on all leaf items, kebab (⋮) for file actions, improved save status, destructive actions demoted | ✅ Done 2026-05-23 |
| **SaveStatusIndicator removed** from all 14 Part I–IV forms — sidebar is sole save indicator | ✅ Done 2026-05-23 |
| **UI Refresh Phase 6** — SectionShell shared chrome, MarkAsDone, prev/next across all 18 sections | ✅ Done 2026-05-23 |
| **UI Refresh Phase 7** — Unsaved changes content snapshot + field-level sidebar diff | ✅ Done 2026-05-23 |
| **Part IV UX rewrite** — master list + Sheet drawer; SectionCard 3px color strip; LineTable header band; color legend; accurate CO/MOOE descriptions | ✅ Done 2026-05-23 |
| **Mobile editor shell fix** — sidebar is a fixed mobile drawer, static/collapsible desktop sidebar remains intact | ✅ Done 2026-05-23 |
| **Theme system** — System/Warm light/dark themes; root theme classes; `ThemeProvider`; SSR flash-prevention script; `issp-theme` localStorage | ✅ Done 2026-05-24 |
| **Theme menu placement** — desktop kebab Theme submenu; mobile palette button; System Light default; System themes ordered before Warm themes | ✅ Done 2026-05-24 |
| **Control contrast pass** — outline buttons, inputs, textareas, selects, inline table fields, UACS combobox trigger no longer look disabled when enabled | ✅ Done 2026-05-24 |
| **Editor sidebar UX improvements** — floating theme discovery callout, Exit Editor removal, Clear editor data two-step flow | ✅ Done 2026-05-24 |
| **Diagram upload (local-first)** — Part II-B network diagrams, Part III-A proposed network diagram, Part III-B enterprise architecture diagram stored as base64 data URLs and rendered in PDF | ✅ Done 2026-05-24 |
| **Coverage period locked to 2028–2030** — `ISSP_START_YEAR = 2028` / `ISSP_END_YEAR = 2030` constants in `issp-properties-dialog.tsx`; fields are read-only in both New ISSP dialog and Properties dialog; enforced per MITHI Resolution 2026-02 | ✅ Done 2026-05-25 |
| **What's New changelog modal** — rainbow orbiting pill button on splash, Philippine flag confetti from both sides on open (`canvas-confetti`, `useWorker: false` to avoid CSP blob violations), 8 changelog sections; theme-switcher easter egg in the Themes section with live pill buttons + green active dot; `@property --glow-angle` CSS Houdini animation for conic-gradient orbit in `globals.css` | ✅ Done 2026-05-25 |
| **`dark:` variant fixed** — overridden via `@custom-variant dark` in `globals.css` to respond to `.theme-system-dark` / `.theme-warm-dark` classes instead of `prefers-color-scheme`; prevents OS dark mode from bleeding into app-selected light themes | ✅ Done 2026-05-25 |
| **Mark-as-done tracked in unsaved changes** — `getChangedFields` in `section-fields.ts` now detects `userMarkedDone` flips; sidebar diff shows "Marked as done" / "Unmarked as done" for the correct section; fallback (no snapshot) path also handles it | ✅ Done 2026-05-25 |

---

## Known Bugs Fixed

| Bug | Fix |
|-----|-----|
| Part IV internal/cross-agency project titles wrapped in `[brackets]` | `render-issp-html.ts` — removed hardcoded `[` `]` around `esc(proj.title)` in `renderYearTable` |
| `fileSavedAt` not resetting after `saveToFile()` | `store/index.tsx` — `saveToFile()` now updates `doc.exportedAt`, calls `idbSave`, and calls `setFileSavedAt(now)` |
| Network diagrams (`dataUrl`) not embedding in PDF | `render-issp-html.ts` — `<img>` `src` now uses `d.path` directly when it starts with `data:`, skipping `baseUrl` prefix |
| `animate-spin` applied to entire save-status container | Moved to icon element only |
| `humanCapital` crash on empty `{}` DB value in Part I-B | Deep-merge with `DEFAULT_HC` at both server page and client init |
| Part II-B crash: `Cannot read properties of undefined (reading 'perimeterProtection')` | Deep-merge `cybersecurityControls` from DB against `DEFAULT_CYBER` group-by-group |
| Part III-F empty state `colSpan={8}` not spanning full table | Fixed to `colSpan={9}` |
| Part IV Total column header missing right border | Added `border-r border-border` |
| Part IV section letters hardcoded (all projects showed "B." or "C.") | Dynamic `alpha(n)` function |
| PDF: "NCWTR NCWTR" doubled acronym in running header | Collapsed to single `logoBlock` in `generate-pdf.ts` |
| PDF: cover overflowing to 2 pages | Cover CSS reduced to `height:159mm` |
| PDF: running header on cover page | Two-PDF + pdf-lib merge strategy |
| PDF: Fund Source column too wide | `fundSourceAbbr()` helper shows abbreviated form |
| PDF: cover logo was emoji placeholder | Embeds agency logo base64 data URI |
| Part II-A form layout overlapping and tight | Moved Select component into main card body and applied truncation |
| Part II-A data model mismatch with DICT 2026 | Overhauled `StrategicConcern` state to include `criticalSystem`, multi-select `outcomeIds`, and renamed fields to match 2026 template |
| Part I-C React warning "Each child in a list should have a unique key prop" | Added fallback UUID generation `crypto.randomUUID()` for stakeholders lacking an ID in `part1-c-form.tsx` and generated `cuid()` directly in `prisma/seed.js` |
| `export-sample-issp.js` outputting unreadable nested JSON | Refactored export script to output flat `IsspDocument` type with `fileType: "issp-main"` so demo files load correctly |
| Strategic alignment / harmonization checkboxes all unchecked in PDF | `api/export/route.ts` — export route was checking camelCase keys against label strings; fixed to match what the form stores |
| `focalSameAsCio` checkbox resets on page reload | Added `focalSameAsCio: boolean` to `Part1Data` type + defaults; form now reads/writes from store instead of session-only `useState` |
| Seed projects used stale alignment labels and wrong field name (`harmonization`) | `prisma/seed.js` — updated to use correct DICT 2026 option labels and `harmonizationFramework` key; demo file regenerated |
| Export script writing to `public/samples/` (unused path) | `scripts/export-sample-issp.js` — output path corrected to `public/demo/`; `public/samples/` folder removed |
| Hydration mismatch on `<time>` in `/about` and `/privacy` | gray-matter parses unquoted YAML dates as `Date` objects; `as string` doesn't convert at runtime — coerce to `"YYYY-MM-DD"` via `.toISOString().slice(0,10)`; also fixed `formatDate` to use local-time constructor `new Date(y, m-1, d)` to avoid UTC→local timezone shift |
| Part III-C NaN in quantity field | `parseInt` + `isNaN` guard in `onChange`; seeded data was using `physicalCount` (renamed to `quantity`) — normalised in `useState` initialiser with `r.quantity ?? r.physicalCount ?? 1` |
| Part III-C all rows updating simultaneously | Seeded rows had no `id` field — all `undefined === undefined` in `updateRow`. Fixed by generating IDs on mount: `r.id ?? generateId()` |
| Demo ISSP schema mismatches (Part II/III) | Multiple field renames unsynced with editor: IS `interoperability` shape, `piaConducted→piaCompleted`, `projectType→projectCategory`, KPI `responsibility→responsibleUnit`, all IS/proposed-system enum values (plain labels → code values). All corrected in `public/demo/ncwtr-issp-2026-2028.issp` |
| LIPAD system missing from demo ISSP | Demo file referenced LIPAD in the sample modal but had no data entry. Added `is-lipad` (G2G, Cloud, Outsourced, 52 users, integrated with NQMS) |
| Editor nav buttons 404 in production (missing `/issp` prefix) | All 15 form nav buttons used `render={<a href="...">}` (plain HTML anchor) which bypasses Next.js routing and doesn't prepend the `/issp` basePath. Converted all to `onClick={() => router.push("...")}` using `useRouter()` from `next/navigation` — the router's `addBasePath()` prepends the basePath at runtime |
| `pm2 restart` silently failing — old code still serving | A stale `next-server` process held port 3100; every `pm2 restart` got `EADDRINUSE` and the new process never bound. Must check `ss -tlnp \| grep 3100` and `kill <pid>` before restarting pm2 after a build |
| UACS Explorer redirecting to `/login` | `src/proxy.ts` (Next.js 16 middleware) was missing `/uacs` from the public allowlist. Added `isUacsRoute` check and `uacs` to the matcher exclusion — same pattern as `isEditorRoute` |
| UACS combobox stuck on "Loading codes…" | `fetch("/uacs_active.min.json")` was missing the `/issp` basePath prefix. Fixed to `fetch(\`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/uacs_active.min.json\`)` |
| Form pages redirect to `/editor` on hard refresh | All 17 form sub-pages (`part1/a` through `part4/year3`) had `if (!doc) redirect` but never checked `loading`. On page refresh, `doc` is null while IDB loads → premature redirect. Fixed: added `const { doc, loading } = useIsspStore()` + `if (loading) return null` guard before the redirect check in all 18 form pages (17 via script + `part4/summary` manually). |
| Theme controls initially placed too prominently | Moved theme selection from sidebar footer/Properties dialog into the desktop kebab menu; mobile keeps a single palette icon button. |
| System theme labels initially said Apple | Replaced the draft `apple-light` / `apple-dark` IDs with `system-light` / `system-dark` before production release. |
| `dark:` Tailwind utilities responding to OS instead of app theme | Added `@custom-variant dark` in `globals.css` tying `dark:` to `.theme-system-dark` / `.theme-warm-dark` classes. |
| `canvas-confetti` blob worker blocked by CSP extensions (e.g. AdGuard) | Use `confetti.create(null, { useWorker: false })` — runs animation on main thread, no blob URL needed. |
| What's New modal opens mid-scroll | Added inline `scrollTop = 0` ref callback + zero-size `tabIndex={0}` focus-trap div at top of scroll area (same pattern as ContentModal). |
| Glowing pill appears as a floating box on mobile | Replaced negative-inset absolute spans (`inset-[-5px]`) with a `p-[6px]` padded container and positive insets (`inset-px`, `inset-[4.5px]`) so no element overflows its parent. |
| `canvas-confetti` evaluated server-side, producing broken function | Added to `serverExternalPackages` in `next.config.ts`; imported inside `useEffect` so it only runs client-side. |
| Mark-as-done not appearing in unsaved changes diff | `getChangedFields` extended to compare `sectionMeta[sectionId].userMarkedDone` between current doc and snapshot. |
| Sidebar buttons looked disabled in System themes | Shared sidebar control styles now use `bg-card`, `text-foreground`, `border-border`, and no shadow; primary save button is disabled only when there are no changes and reads `No changes to save`. |
| Enabled form controls looked disabled | Shared `Input`, `Textarea`, and `SelectTrigger` now use card surfaces and stronger foreground text; inline table fields were swept and updated from transparent backgrounds to theme-aware card backgrounds. |

---

## Architecture Overview

### Local-First (Active)

The primary user-facing architecture. No login required.

| Component | Location | Notes |
|---|---|---|
| IndexedDB store | `src/lib/store/` | Persists one `IsspDocument` at a time; exposes `update`, `saveToFile`, `loadFromFile`, `clearDoc` |
| Store types | `src/lib/store/types.ts` | `IsspDocument`, `Part1Data`–`Part4Data`, all sub-types |
| Default values | `src/lib/store/defaults.ts` | `createEmptyDocument()`, `DEFAULT_HC`, `DEFAULT_CYBER` |
| Editor route | `src/app/editor/` | Public (no auth); splash when no doc, overview when doc loaded |
| Editor layout | `src/app/editor/layout.tsx` | Wraps children in `EditorShell` |
| Editor shell | `src/components/editor/editor-shell.tsx` | `beforeunload` warning; desktop sidebar layout + mobile drawer context |
| Editor sidebar | `src/components/editor/editor-sidebar.tsx` | "ISSP Builder" label, desktop collapsible nav, mobile drawer overlay, Save to File, Exit Editor |
| Save reminder | `src/hooks/use-file-save-reminder.ts` | 10-min timer for desktop sidebar nudge and mobile modal reminder |
| PDF export | `src/app/api/export/route.ts` | `POST` — accepts `IsspDocument` JSON, returns PDF, no auth |
| Demo file | `public/demo/ncwtr-issp-2026-2028.issp` | NCWTR sample, all 4 parts populated |

### Server-Side (Dormant — not wired to UI)

Old auth/DB routes remain in the codebase but are not linked from the local-first editor. Preserved for potential future server-side features.

| Component | Location |
|---|---|
| Prisma DB (`dev.db`) | Project root |
| CRUD routes | `src/app/api/issp/documents/` |
| Auth (NextAuth v5) | `src/lib/auth.ts` |
| Dashboard forms | `src/app/(dashboard)/` |

---

## Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js (App Router, TypeScript, Turbopack) | 16.2.6 |
| State/Persistence | IndexedDB via `idb-keyval` | — |
| Database (dormant) | SQLite via Prisma 7 | dev.db at project root |
| Auth (dormant) | NextAuth.js v5 beta | 5.0.0-beta.31 |
| UI | Tailwind CSS 4 + shadcn/ui components | 4.x |
| Toasts | Sonner | — |
| Font (display) | Fraunces (opsz variable, via next/font/google) | `--font-display`; headings, doc title |
| Font (UI) | IBM Plex Sans 400/500/600 (via next/font/google) | `--font-sans`; body, labels, UI chrome |
| Font (mono) | IBM Plex Mono 400/500 (via next/font/google) | `--font-mono`; UACS fields, code |
| Font (PDF) | P052 / URW Palladio (Palatino clone) | Installed via `apt-get install fonts-urw-base35` |
| PDF | Puppeteer + pdf-lib | 25.0.2; Chrome 148.0.7778.167 |
| Confetti | canvas-confetti | — |

---

## Getting Started

### Prerequisites
- Node.js 24+
- npm 11+

### Setup
```bash
cd /root/apps/issp
npm install
```

### Running
```bash
npm run dev
# App runs at http://localhost:3000
# Editor at http://localhost:3000/editor (no login required)
```

### Type Check
```bash
npx tsc --noEmit
```

---

## Project Structure

```
/root/apps/issp/
├── docs/
│   ├── project-status.md          # This file
│   ├── session-handoff.md         # Full architectural reference
│   ├── implementation-plan.md
│   ├── guidelines-alignment-audit.md
│   ├── privacy-architecture.md
│   └── troubleshooting-auth-networking.md
├── public/
│   ├── demo/
│   │   └── ncwtr-issp-2026-2028.issp   # NCWTR sample file (all 4 parts)
│   └── uacs_active.min.json
├── references/                    # ISSP guidelines + PDFs (read-only)
├── src/
│   ├── app/
│   │   ├── editor/                # Local-first editor (public, no auth)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # Splash (no doc) + Overview (doc loaded)
│   │   │   ├── part1/{a,b,c}/
│   │   │   ├── part2/{a,b,c,d}/
│   │   │   ├── part3/{a,b,c,d,e1,e2,f}/
│   │   │   └── part4/{year1,year2,year3,summary}/
│   │   ├── api/
│   │   │   └── export/route.ts    # POST — stateless PDF, no auth
│   │   ├── (dashboard)/           # Dormant server-side routes
│   │   └── page.tsx               # Landing page
│   ├── components/
│   │   ├── editor/
│   │   │   ├── editor-shell.tsx   # beforeunload + reminder hook
│   │   │   └── editor-sidebar.tsx # Nav, Save to File, Exit Editor
│   │   └── issp-editor/           # All Part I–IV form components
│   ├── hooks/
│   │   ├── use-file-save-reminder.ts  # 10-min save reminder timer
│   │   └── use-local-save.ts
│   └── lib/
│       ├── store/
│       │   ├── index.tsx          # IsspStore context + provider
│       │   ├── types.ts           # IsspDocument + all sub-types
│       │   └── defaults.ts        # createEmptyDocument, DEFAULT_HC, DEFAULT_CYBER
│       └── pdf/
│           ├── generate-pdf.ts    # Puppeteer wrapper
│           └── render-issp-html.ts # Full ISSP HTML renderer
└── package.json
```

---

## Next Up

### 🔜 UI Refresh Follow-Up — Section Body Patterns
Phase 6 `SectionShell` is complete. The remaining UI refresh work is the deferred body-pattern pass:
- Standard form field pattern (`FormGroup`, `FieldRow`, `Field`, `CheckboxField`)
- E-Government toggle-list pattern
- File attach placeholder / future upload pattern
- Budget table/body polish after the Part IV drawer rewrite
- Project/item list pattern for Part III.E and III.F

### 🟡 Validation & Review (post UI refresh)
- Pre-export validation: required fields, budget-IS linkage, KPI completeness
- Read-only review mode: full document view before submission
- Additional mobile QA on dense forms and Part IV drawer interactions

### 🔴 Annex 1 — ICT Asset Inventory
Standalone public module at `/annex1`. See `docs/annex1-implementation-plan.md`.

### 🔵 PDF — Known Remaining Gaps
- ~~TOC page numbers are static (hardcoded) — no two-pass render~~ ✅ Fixed 2026-06-11: two-pass render — pass 1 prints invisible `@@toc:id@@` markers at each heading, `scanTocMarkers` (pdfjs-dist) maps them to physical pages, pass 2 renders the TOC with real numbers. Markers are absolutely positioned so pagination is identical between passes; the TOC page-number cell is fixed-width for the same reason. Verified against the demo doc: all rows match `pdftotext`-measured heading pages.
- Network/proposed network/enterprise architecture diagrams render inline, not as full dedicated pages
