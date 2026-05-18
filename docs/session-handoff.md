# ISSP Builder — Session Handoff & Continuation Guide

> **Last updated:** 2026-05-18  
> **Purpose:** Complete handoff for the next session to resume work exactly where we left off.

---

## ⚠️ Current Architecture: Local-First (COMPLETE)

The local-first rearchitecture is **fully implemented**. All phases A–F are done.

**TL;DR:** No sign-in. ISSP data lives in the user's browser (`IndexedDB`), exported to a `.issp` file. The server does only stateless PDF generation (`POST /api/export`). The old server-side DB/auth code remains in the repo but is not wired to the UI.

| Phase | Work | Status |
|---|---|---|
| A | `src/lib/store/` — IndexedDB store + TypeScript types | ✅ Done |
| B | `/editor` route + splash/overview | ✅ Done |
| C | All Part I–IV form pages read/write from store | ✅ Done |
| D | Save to File + Load from File UX + `unsavedToFile` tracking + save reminder toast + `beforeunload` warning | ✅ Done |
| E | (Diagram upload UI still text-only — base64 storage not yet implemented) | 🔴 Pending |
| F | `POST /api/export` — stateless PDF, no auth | ✅ Done |
| G | NCWTR demo `.issp` file + landing page updated to local-first | ✅ Done |

---

## 1. Project Overview

A web platform for Philippine government agencies to create, fill, validate, and export their 3-year **Information Systems Strategic Plan (ISSP)** as required by DICT.

**`references/ISSP_Guidelines_2026.md`** is the agent-readable reference for all field names, options, and structure.

| Reference File | Description |
|---|---|
| `references/ISSP_Guidelines_2026.md` | Structured markdown extraction — use this for lookups |
| `references/[Reference] Revised ISSP Template 2026 043026.pdf` | Official DICT 2026 ISSP template |
| `references/[Reference] Agency Guidelines...pdf` | Agency guidelines PDF |
| `references/[Reference] ANNEX 1...pdf` | Annex 1 — ICT resource inventory format |
| `references/[Reference] ANNEX 2...pdf` | Annex 2 — Sample DRBCP format |

---

## 2. Tech Stack (Exact Versions)

| Layer | Choice | Version / Notes |
|---|---|---|
| Framework | Next.js App Router + TypeScript | 16.2.6 (Turbopack) |
| Persistence | `idb-keyval` (IndexedDB) | — |
| Database (dormant) | SQLite via Prisma 7 + better-sqlite3 | `dev.db` at project root |
| ORM (dormant) | Prisma | 7.8.0, client in `src/generated/prisma/` |
| Auth (dormant) | NextAuth.js v5 beta | 5.0.0-beta.31` |
| UI Components | shadcn/ui + Tailwind CSS 4 | 4.x |
| Toasts | Sonner (`<Toaster>` in `src/app/layout.tsx`) | — |
| Font (app) | Inter via `next/font/google` | — |
| Font (PDF) | **P052** (URW Palladio, Palatino clone) | Installed via `apt-get install fonts-urw-base35` |
| PDF | **Puppeteer** | 25.0.2; Chrome 148.0.7778.167 at `/root/.cache/puppeteer/chrome/...` |
| PDF merge | pdf-lib | — |

---

## 3. Local-First Architecture

### IndexedDB Store (`src/lib/store/`)

| File | Purpose |
|---|---|
| `index.tsx` | React context provider exposing `IsspStoreValue` |
| `types.ts` | All TypeScript types: `IsspDocument`, `Part1Data`–`Part4Data`, `AgencyInfo`, `HCRow`, `KpiRow`, etc. |
| `defaults.ts` | `createEmptyDocument(opts)`, `DEFAULT_HC`, `DEFAULT_CYBER`, `DEFAULT_EGP` |

**`IsspStoreValue` interface** — key members:
```typescript
doc: IsspDocument | null          // current document (null = no doc loaded)
loading: boolean                  // true while IDB is being checked on mount
saveStatus: "idle" | "saving" | "saved"
fileSavedAt: string | null        // ISO string; null = never saved to file
unsavedToFile: boolean            // true when doc.updatedAt > (fileSavedAt ?? doc.createdAt)

update(patcher)                   // debounced: patches doc + saves to IDB
saveToFile()                      // downloads .issp + updates fileSavedAt
loadFromFile(file)                // reads .issp file → loads into IDB + state
createNew(opts)                   // creates blank doc → saves to IDB
clearDoc()                        // clears IDB + resets state
replace(doc)                      // replaces doc (used by loadFromFile)
```

**`Part1Data` notable fields:**
- `focalSameAsCio: boolean` — persisted to IDB; when true, focal person fields mirror CIO and are disabled in the form. Initialized from `initialData.focalSameAsCio ?? false` for backward compat with older `.issp` files.

**`IsspDocument` envelope:**
```typescript
interface IsspDocument {
  version: "1.0";
  fileType: "issp-main";
  exportedAt: string;    // updated by saveToFile(); used to compute unsavedToFile
  tool: "issp-platform";
  title: string;
  startYear: number; endYear: number;
  amendmentNumber: number;
  scope: IsspScope;
  agency: AgencyInfo;   // includes logoBase64: string | null
  part1: Part1Data;
  part2: Part2Data;
  part3: Part3Data;
  part4: Part4Data;
  createdAt: string;
  updatedAt: string;    // updated by every call to update()
}
```

**`unsavedToFile` logic:**
```typescript
// Computed in store:
const unsavedToFile = !!doc && doc.updatedAt > (fileSavedAt ?? doc.createdAt);
// fileSavedAt is React state (not persisted); set from parsed.exportedAt on load, set to now() on saveToFile()
```

### Editor Shell & Sidebar

| File | Purpose |
|---|---|
| `src/app/editor/layout.tsx` | Wraps `{children}` in `<EditorShell>` |
| `src/components/editor/editor-shell.tsx` | Checks `loading`/`doc`; registers `beforeunload` when `unsavedToFile`; calls `useFileSaveReminder` |
| `src/components/editor/editor-sidebar.tsx` | Collapsible sidebar; "ISSP Editor" label in header; Save to File footer; Exit Editor link at bottom of both collapsed and expanded states |
| `src/hooks/use-file-save-reminder.ts` | Sets a 10-min timer; fires a persistent Sonner toast with "Save to File" action button when `unsavedToFile` stays true |

### Editor Pages

All editor pages are in `src/app/editor/`:
- `page.tsx` — splash (no doc) + overview (doc loaded, has "Save to File" + "Export PDF" buttons)
- `part1/{a,b,c}/page.tsx`
- `part2/{a,b,c,d}/page.tsx`
- `part3/{a,b,c,d,e1,e2,f}/page.tsx`
- `part4/{year1,year2,year3,summary}/page.tsx`

Each page reads from `useIsspStore()` and calls `update(patcher)` on change. The store auto-saves to IDB with a 1.5s debounce.

### PDF Export (`src/app/api/export/route.ts`)

`POST /api/export` — accepts `IsspDocument` JSON body, returns `application/pdf`. No auth required.

**Mapping from `IsspDocument` → `IsspData` (render format):**

| `IsspDocument` field | Maps to `IsspData` field | Notes |
|---|---|---|
| `agency.logoBase64` | `agency.logoSrc` | Used in cover + Puppeteer header |
| `part2.networkDiagrams[].dataUrl` | `part2.networkDiagrams[].path` | `render-issp-html.ts` checks `startsWith("data:")` to skip `baseUrl` prefix |
| `part2.strategicConcerns[].concern` | `part2.strategicConcerns[].problem` | — |
| `part2.strategicConcerns[].desiredStrategy` | `part2.strategicConcerns[].intendedIctUse` | — |
| `part2.strategicConcerns[].outcomeId` | `part2.strategicConcerns[].ooSoMfo` | Looked up from `part1.orgOutcomes` map |
| `part3.proposedHumanCapital[].quantity` | `part3.proposedHumanCapital[].physicalCount` | — |
| `part3.performanceFramework[k].rows[].indicator` | `.kpi` | — |
| `part3.performanceFramework[k].rows[].baseline` | `.baselineData` | — |
| `part3.performanceFramework[k].rows[].year1/2/3Target` | `.targets.year1/2/3` | — |
| `part3.performanceFramework[k].rows[].responsibleUnit` | `.responsibility` | — |
| `part3.internalProjects[].strategicAlignment` (string[]) | `.strategicAlignment` (Record) | `.includes()` checks exact DICT label strings (e.g. `"E-Government Master Plan"`) |
| `part3.internalProjects[].harmonizationFramework` (string[]) | `.harmonization` (Record) | Same — exact label strings (e.g. `"Interoperability Framework"`) |
| `CyberControls` (typed fields) | `CyberGroup` (Record<string, boolean>) | Same key names — cast at runtime |

---

## 4. What Is Built — Complete Feature Map

### Foundation ✅
- Local-first IndexedDB store with full type system
- `/editor` route — public, no auth required
- Collapsible editor sidebar with nav, Save to File, Exit Editor
- `beforeunload` warning when unsaved file changes
- 10-min save reminder toast (Sonner)
- Demo `.issp` file at `public/demo/ncwtr-issp-2026-2028.issp`
- Landing page updated: no sign-in, local-first copy, "Open Editor" / "Start Building" CTAs

### Part I–IV Forms ✅
All forms complete and wired to IndexedDB store. See `docs/project-status.md` for full list.

### PDF Export ✅

Two export paths:

| Path | Auth | Input | Usage |
|---|---|---|---|
| `POST /api/export` | None | `IsspDocument` JSON body | Local-first editor ("Export PDF" button) |
| `GET /api/issp/documents/[id]/export` | Required | Document ID (reads from DB) | Dormant server-side route |

#### Files
| File | Purpose |
|---|---|
| `src/lib/pdf/generate-pdf.ts` | Puppeteer wrapper; two-PDF + pdf-lib merge for headerless cover |
| `src/lib/pdf/render-issp-html.ts` | Full HTML renderer for all 4 parts + cover + TOC + definitions |
| `src/app/api/export/route.ts` | POST handler; maps `IsspDocument` → `IsspData`; calls render + generate |

#### DICT Uniformity Requirements
| Requirement | Implementation |
|---|---|
| Font: Palatino Linotype | `P052` leads the font stack |
| Font size: 11pt | `font-size: 11pt` in CSS body |
| Orientation: Landscape | `landscape: true` + `@page { size: A4 landscape }` |
| Spacing: 1.5 | `line-height: 1.5` |
| Margin: 1 inch | `margin: { top/right/bottom/left: "25.4mm" }` in Puppeteer only |
| Header | `headerTemplate` — agency logo + acronym + ISSP title |

#### PDF page structure
1. Cover (no header/footer — generated separately and merged via pdf-lib)
2. Table of Contents (static page numbers — known gap)
3. Definition of Terms
4. Part I — mandate, org outcomes, CIO/Focal, human capital, stakeholders
5. Part II — strategic concerns, network diagrams, cybersecurity, IS inventory, EGP checklist
6. Part III — proposed infrastructure, cybersecurity, human capital, proposed IS, projects, performance framework
7. Part IV — 3-year cost breakdowns (UACS-grouped) + B.1–B.4 summary tables

#### Two-PDF merge strategy (IMPORTANT)
Cover page must have no Puppeteer header/footer. Solution:
1. `page.pdf({ displayHeaderFooter: true })` → full PDF with running header
2. `page.pdf({ displayHeaderFooter: false, pageRanges: "1" })` → cover only
3. pdf-lib merges: cover page 0 + full PDF pages 1-N

#### `render-issp-html.ts` key helpers
```typescript
esc(s)              // HTML-escape
nl2br(s)            // escape + newline → <br>
php(n)              // format as ₱1,234.56
chk(v)              // boolean → ☑/☐
fundSourceAbbr(s)   // "General Appropriations Act (GAA)" → "GAA"
groupByUacs(lines)  // group LineItem[] by uacsCode, return subtotals
scopeLabel(scope)   // Prisma enum → human label
pageHeader(_issp)   // intentionally returns "" — Puppeteer headerTemplate handles it
```

**Do not re-enable `pageHeader()`** — it returns `""` deliberately. Puppeteer's `headerTemplate` is the only running header.

---

## 5. API Routes

### Active
| Route | Methods | Notes |
|---|---|---|
| `/api/export` | POST | `IsspDocument` JSON → PDF; no auth |

### Dormant (server-side, not wired to UI)
| Route | Methods | Notes |
|---|---|---|
| `/api/issp/documents` | GET, POST | List + create documents |
| `/api/issp/documents/[id]` | GET, PATCH, DELETE | Single document |
| `/api/issp/documents/[id]/part1–4` | GET, PUT | JSON fields for each part |
| `/api/issp/documents/[id]/upload-diagram` | POST, PATCH, DELETE | Network diagram upload to `public/uploads/` |
| `/api/issp/documents/[id]/export` | GET | PDF download (requires auth, reads from DB) |

---

## 6. Database (Dormant)

- **SQLite at `dev.db`** — no PostgreSQL, no Docker
- **DO NOT run `npx prisma migrate dev`** — it will prompt to reset the DB and wipe everything
- Prisma migrations are drifted — several columns added directly via SQL
- Old server routes and the dashboard (`/dashboard/**`) remain in the codebase but are not linked from the local-first editor

### Test Credentials (NCWTR seed)
| Email | Password | Role |
|---|---|---|
| admin@ncwtr.gov.ph | password123 | ADMIN |
| cio@ncwtr.gov.ph | password123 | CIO — Dir. Reginaldo Tambunting |
| focal@ncwtr.gov.ph | password123 | FOCAL — Ms. Luzviminda Padayao |

---

## 7. Critical Patterns

### Store update pattern (all form pages)
```tsx
const { doc, update } = useIsspStore();

// Update a part field:
update((prev) => ({
  ...prev,
  part2: { ...prev.part2, networkDescription: value },
}));
```

### `unsavedToFile` — how it works
```typescript
// In store: fileSavedAt is React state, not persisted to IDB
// Set from parsed.exportedAt on loadFromFile()
// Set to now() on saveToFile()
const unsavedToFile = !!doc && doc.updatedAt > (fileSavedAt ?? doc.createdAt);
```

### JSON field deep-merge — required for cybersecurity controls
```tsx
const controls = {
  physical:  { ...DEFAULT_CYBER.physical,  ...saved.physical },
  perimeter: { ...DEFAULT_CYBER.perimeter, ...saved.perimeter },
  // ... all groups
};
```

### Part IV section lettering
```
A = Office Productivity
B, C, D, … = Internal ICT Projects
Next = Cross-Agency ICT Projects
Last = Continuing / Recurring Costs
```
Via `alpha(n) = String.fromCharCode(65 + n)` in `part4-year-form.tsx`.

### IS → Project → Budget flow
1. Part III-D: Define Proposed IS (each gets an `id`)
2. Part III-E: Create ICT Projects (link to IS by `id`)
3. Part III-F: Performance Framework (keyed by project `id`)
4. Part IV: Budget tables keyed by project `id`

---

## 8. Components Reference

### `src/components/editor/editor-sidebar.tsx`
- Full sidebar: "ISSP Editor" label (header), collapsible nav sections, Save to File (footer), Exit Editor link (very bottom)
- Collapsed sidebar: expand toggle, spacer, Exit Editor icon (very bottom)
- `SavePill` component shows `Loader2` (saving) or `Check` (saved)
- File status row: amber "Unsaved changes" / green "File up to date" + time-ago timestamp

### `src/components/issp-editor/uacs-combobox.tsx`
- Props: `value`, `onChange(uacs, label)`, `context: "co" | "mooe" | "all"`, `placeholder`
- Lazy-loads `/uacs_active.min.json` on first open

### `src/components/issp-editor/part4/part4-year-form.tsx`
- Dynamic section lettering via `alpha(n)`
- Exports `YearBudget`, `LineItem`, `ProjectBudget` types (re-exported from store types)

---

## 9. Demo File (`public/demo/ncwtr-issp-2026-2028.issp`)

**Agency:** National Commission on Waiting Time Reduction (NCWTR), NGA  
**Scope:** `AGENCY_WITH_REGIONAL` (central + 17 regional + 3 field offices)  
**Period:** 2026–2028  
**Projects:** SIKAP (₱24.5M), BILIS (₱9.8M), HANDA (₱4.2M)  
**Proposed IS:** UQMP, CFCP, iHRPS  
**Existing IS:** NQMS (Windows XP/VB6), eCLAS (fax machines), ROMS (17 instances), AHRIS (47 Excel workbooks)

The file is downloadable from the editor splash screen: "Download NCWTR demo file".

Regenerated via `node scripts/export-sample-issp.js` (reads from seeded DB, writes to `public/demo/`). After any seed change, re-run the script to keep the demo file in sync.

---

## 10. Pending / Next Session Work

### 🔴 Phase E — Diagram Upload (base64 client-side)
Network diagram upload UI for Part II-B (existing diagrams) and Part III-A/B (proposed network + enterprise architecture). Currently text/description-only.

**Architecture:** File input → read as base64 data URL → store in `doc.part2.networkDiagrams[].dataUrl` (already in the type). No server upload needed. The PDF export already handles `dataUrl` values in network diagrams (`path.startsWith("data:")` check in `render-issp-html.ts`).

### 🟡 Phase 7 — Polish & Validation
- Section-level completion tracking (% per part, shown in sidebar or overview cards)
- Pre-export validation: required fields, budget-IS linkage, KPI completeness (client-side, runs before PDF export)
- Read-only review mode (full document view)
- Mobile-responsive improvements

### 🔴 Annex 1 — ICT Asset Inventory
Standalone public module at `/annex1`. Full plan in `docs/annex1-implementation-plan.md`.

### 🔵 PDF — Known Remaining Gaps
- TOC page numbers are static (hardcoded) — no two-pass render
- Network diagrams render inline (not full-page each)

---

## 11. Custom Skills (`.claude/skills/`)

Project-level Claude Code skills — invoked with `/skill-name` or auto-loaded by Claude when the description matches.

| Skill | Path | Invocation | Purpose |
|---|---|---|---|
| `schema-change` | `.claude/skills/schema-change/SKILL.md` | Auto + `/schema-change` | Standardized 11-step checklist for any IDB/JSON or Prisma schema change — ensures types, defaults, forms, pages, seed, demo file, PDF export, and docs all stay in sync |

**When to expect `schema-change` to activate:** Any prompt that adds, removes, or renames a field on `IsspDocument`, `Part1Data`–`Part4Data`, or any sub-type (e.g. `IctProject`, `StrategicConcern`).

---

## 12. Running the App

```bash
cd /root/apps/issp
npm run dev          # http://localhost:3000
                     # Editor: http://localhost:3000/editor (no login)

npx tsc --noEmit    # Type check

# Dormant DB operations (only if working on server-side features)
node prisma/seed.js               # Wipe + reseed NCWTR data
node scripts/backfill-parts.js   # Create missing Part records for old docs
npx prisma generate               # Regenerate client after schema changes
```

### Puppeteer / Chrome dependencies
Chrome 148 is installed at `/root/.cache/puppeteer/chrome/linux-148.0.7778.167/chrome-linux64/chrome`.

P052 font:
```bash
apt-get install -y fonts-urw-base35 && fc-cache -f
```

---

## 13. File Tree (Key Files Only)

```
src/
├── app/
│   ├── editor/                        ← Local-first editor (public, no auth)
│   │   ├── layout.tsx
│   │   ├── page.tsx                   ← Splash + Overview (has Export PDF button)
│   │   ├── part1/{a,b,c}/page.tsx
│   │   ├── part2/{a,b,c,d}/page.tsx
│   │   ├── part3/{a,b,c,d,e1,e2,f}/page.tsx
│   │   └── part4/{year1,year2,year3,summary}/page.tsx
│   ├── api/
│   │   └── export/route.ts            ← POST → stateless PDF, no auth
│   ├── (dashboard)/                   ← Dormant server-side routes
│   └── page.tsx                       ← Landing page
├── components/
│   ├── editor/
│   │   ├── editor-shell.tsx           ← beforeunload + save reminder
│   │   └── editor-sidebar.tsx         ← Collapsible nav + Save to File + Exit Editor
│   └── issp-editor/                   ← All Part I–IV form components
│       ├── part1/{a,b,c}-form.tsx
│       ├── part2/{a,b,c,d}-form.tsx
│       ├── part3/{a,b,c,d,e1,e2,f}-form.tsx
│       └── part4/
│           ├── part4-year-form.tsx    ← dynamic alpha() lettering
│           └── part4-summary.tsx     ← B.1–B.4 read-only tables
├── hooks/
│   ├── use-file-save-reminder.ts      ← 10-min Sonner toast
│   └── use-local-save.ts
└── lib/
    ├── store/
    │   ├── index.tsx                  ← IsspStore context provider
    │   ├── types.ts                   ← IsspDocument + all sub-types
    │   └── defaults.ts                ← createEmptyDocument(), defaults
    └── pdf/
        ├── generate-pdf.ts            ← Puppeteer wrapper (two-PDF merge)
        └── render-issp-html.ts        ← Full ISSP HTML renderer

content/
├── about.md                           ← About page source (edit here, remark renders it)
└── privacy.md                         ← Privacy page source

public/
├── demo/
│   └── ncwtr-issp-2026-2028.issp     ← NCWTR sample (all 4 parts)
├── uacs/
│   └── index.html                    ← Static UACS explorer (1,266 entries)
└── uacs_active.min.json
```

---

## 14. Public Pages

### Landing Page
| File | Role |
|---|---|
| `src/app/page.tsx` | Full landing page — local-first copy, no sign-in |
| `src/app/layout.tsx` | Root layout with `<Toaster>` from Sonner |

**Key copy decisions:**
- No "Sign In" — replaced with "Open Editor" / "Start Building" (both link to `/editor`)
- Hero: "ISSP compliance, finally structured."
- Subtitle: "No account. No server. Works in your browser — save progress as a file, export to PDF when ready."
- Features section: ISSP Creator (Live) + ISSP Repository + Budget Dashboard (On the Roadmap)
- MITHI checklist replaces fake compliance bars

### About Page (`/about`)
| File | Role |
|---|---|
| `src/app/about/page.tsx` | Renders `content/about.md` server-side via `remark` |
| `content/about.md` | Source of truth — edit markdown here to update the page |

Editorial/blog style (Substack/Medium aesthetic). First paragraph has lede treatment. Content:
- Author's personal story and frustration with the ISSP process
- "The harder conversation" — AI/ICT spend era and transparency mandate
- "On talent, compensation, and what it actually takes" — SG-15 developer point, lingkod bayani ethos

### Privacy Page (`/privacy`)
| File | Role |
|---|---|
| `src/app/privacy/page.tsx` | Renders `content/privacy.md` server-side via `remark` |
| `content/privacy.md` | Privacy architecture blog post |

Same editorial style as About. Content: 7 Privacy by Design principles mapping, local-first rationale, file format spec, optional AES-256-GCM encryption design.

The underlying architecture document is also at `docs/privacy-architecture.md`.

### UACS Explorer (`/uacs`)
| File | Role |
|---|---|
| `public/uacs/index.html` | Static UACS explorer (1,266 entries, filterable) |
| `next.config.ts` | Redirect: `/uacs` → `/uacs/index.html` |

Also linked via tooltip + ExternalLink icon on UACS Code column headers in Part IV tables.

### Attribution
Footer present in:
- Documents list page (`src/app/(dashboard)/...`)
- Editor sidebar (`src/components/editor/editor-sidebar.tsx`)

Text: "Made with ❤ para sa bayan · Carlos Antonio Albornoz · [@carlosanton.io](https://instagram.com/carlosanton.io)"

---

## 15. GitHub

| Detail | Value |
|---|---|
| Remote | `git@github.com:carlosalbornoz/issp-builder` (private) |
| Branch | `main` |
| Initial push | 2026-05-18, 142 files, ~60,874 lines |
| Git user | Carlos Antonio Albornoz / `carlosantonio.albornoz@gmail.com` |

---

## 16. Post-Launch Roadmap

> Deferred until after initial local-first launch and DICT/MITHI consultation.

- Submit for Review workflow (DRAFT → REVIEW → SUBMITTED → APPROVED)
- Multi-user collaboration (opt-in server accounts)
- ISSP Repository — searchable archive of submitted agency ISSPs
- ICT Budget Dashboard — aggregate view of ICT spending
- Annex 2 — DRBCP standalone module
- True TOC page numbers (two-pass PDF render)
- Full-page network diagrams in PDF
- Optional `.issp` file encryption (AES-256-GCM)
