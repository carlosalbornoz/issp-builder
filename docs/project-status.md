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
| Inter font | ✅ Done |
| **Local-first IndexedDB store (`src/lib/store/`)** | ✅ Done |
| **`/editor` route — public, no auth** | ✅ Done |
| **All Part I–IV forms wired to IndexedDB store** | ✅ Done |
| **Save to File / Load from File UX** | ✅ Done |
| **`unsavedToFile` indicator + amber/green status pill** | ✅ Done |
| **Periodic save reminder toast (10 min, via `useFileSaveReminder`)** | ✅ Done |
| **`beforeunload` warning when unsaved file changes exist** | ✅ Done |
| **`POST /api/export` — stateless PDF export, no auth** | ✅ Done |
| **Demo `.issp` file (`public/demo/ncwtr-issp-2026-2028.issp`)** | ✅ Done |
| **Landing page updated — local-first copy, no sign-in** | ✅ Done |
| **EditorSidebar — "ISSP Editor" label, Exit Editor link** | ✅ Done |
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
| Editor shell | `src/components/editor/editor-shell.tsx` | `beforeunload` warning; `useFileSaveReminder`; collapsible sidebar |
| Editor sidebar | `src/components/editor/editor-sidebar.tsx` | "ISSP Editor" label, collapsible nav, Save to File, Exit Editor |
| Save reminder | `src/hooks/use-file-save-reminder.ts` | Sonner toast after 10 min of unsaved changes |
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
| Font (app) | Inter (via next/font/google) | — |
| Font (PDF) | P052 / URW Palladio (Palatino clone) | Installed via `apt-get install fonts-urw-base35` |
| PDF | Puppeteer + pdf-lib | 25.0.2; Chrome 148.0.7778.167 |

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
│   │   ├── use-file-save-reminder.ts  # 10-min save reminder toast
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

### Phase E — Diagram Upload (base64)
Proper upload UI for Part II-B (network diagrams) and Part III-A/B (proposed network + enterprise architecture). Currently text-only. Architecture: file input → base64 data URL → `networkDiagrams[].dataUrl`. PDF export already handles it.

### Phase 7 — Polish & Validation
- Section-level completion tracking (% per part, shown in sidebar or overview)
- Pre-export validation: required fields, budget-IS linkage, KPI completeness
- Read-only review mode (full document view before export)
- Mobile-responsive improvements

### Annex 1 — ICT Asset Inventory
Standalone public module at `/annex1`. See `docs/annex1-implementation-plan.md`.

### Phase E — Diagram Upload (base64)
Proper upload UI for Part II-B (network diagrams) and Part III-A/B (proposed network + enterprise architecture). Currently text-only.

### PDF — Known Remaining Gaps
- TOC page numbers are static (hardcoded) — no two-pass render
- Network diagrams render inline in Part II-B, not as full dedicated pages
- Strategic alignment / harmonization checkboxes in Part III-E PDFs are all unchecked when values don't match the exact option labels (freeform strings vs. fixed keys)
