# ISSP Builder — Session Handoff & Continuation Guide

> **Last updated:** 2026-05-17  
> **Purpose:** Complete handoff for the next session to resume work exactly where we left off.

---

## ⚠️ Architectural Direction Under Review

A significant rearchitect is being planned. See **`docs/privacy-architecture.md`** for full notes.

**TL;DR:** The current server-side, authenticated architecture raises Data Privacy Act (RA 10173) compliance concerns for government agency use. The proposed direction is **local-first / no sign-in** — ISSP data stays in the user's browser (`IndexedDB`), exported to a `.issp` file, with the server doing only stateless PDF generation. This reduces VAPT scope, eliminates PIA obligations around data collection, and aligns with Privacy by Design principles. **No code changes have been made yet.**

---

## 1. Project Overview

A multi-agency web platform for Philippine government agencies to create, fill, validate, and export their 3-year **Information Systems Strategic Plan (ISSP)** as required by DICT.

**`references/ISSP_Guidelines_2026.md`** is the agent-readable reference for all field names, options, and structure. Use it instead of the PDFs.

All reference documents live in the **`references/`** folder at the project root:

| File | Description |
|---|---|
| `ISSP_Guidelines_2026.md` | Structured markdown extraction — use this for lookups |
| `[Reference] Revised ISSP Template 2026 043026.pdf` | Official DICT 2026 ISSP template |
| `[Reference] Agency Guidelines for the REVISED ISSP TEMPLATE 2026 043026.pdf` | Agency guidelines PDF |
| `[Reference] ANNEX 1 - Existing ICT Resource Inventory.pdf` | Annex 1 — ICT resource inventory format |
| `[Reference] ANNEX 2 - Sample Disaster Recovery and Business Continuity Plan.pdf` | Annex 2 — Sample DRBCP format |

A full alignment audit was completed — see `docs/guidelines-alignment-audit.md`. All critical misalignments have been fixed.

---

## 2. Tech Stack (Exact Versions)

| Layer | Choice | Version / Notes |
|---|---|---|
| Framework | Next.js App Router + TypeScript | 16.2.6 (Turbopack) |
| Database | SQLite via Prisma 7 + better-sqlite3 | `dev.db` at project root |
| ORM | Prisma | 7.8.0, client in `src/generated/prisma/` |
| Auth | NextAuth.js v5 beta | `5.0.0-beta.31` |
| UI Components | **Base UI** (NOT Radix/shadcn) + Tailwind CSS 4 | Critical — see patterns below |
| Font (app) | Inter via `next/font/google` | |
| Font (PDF) | **P052** (URW Palladio, a Palatino Linotype clone) | Installed via `apt-get install fonts-urw-base35`; system font name `P052` |
| PDF | **Puppeteer** | 25.0.2; Chrome 148.0.7778.167 at `/root/.cache/puppeteer/chrome/...` |
| State | `useState` + `useAutoSave` hook (no Zustand) | |

---

## 3. What Is Built — Complete Feature Map

### Foundation ✅
- Auth (login/logout, role-based session, Edge-safe middleware in `src/proxy.ts`)
- Dashboard layout — **simplified**: NO outer sidebar/header. Each page is self-contained.
- Documents list page with its own sticky navbar
- ISSP document creation dialog
- ISSP document editor with collapsible ISSP sidebar (`issp-sidebar.tsx`)
- Auto-save hook (`src/hooks/use-auto-save.ts`) — 1.5s debounce, PUT to API
- Save status indicator (spinner on icon only)
- Editor shell widened to `max-w-7xl`

### Part I–IV Forms ✅
All forms complete. See `docs/project-status.md` for the full feature list.

### Phase 6 — PDF Export ✅

**Entry point:** `GET /api/issp/documents/[id]/export`  
**UI trigger:** "Export PDF" button (download icon, top-right of document overview page)

#### Files
| File | Purpose |
|---|---|
| `src/lib/pdf/generate-pdf.ts` | Puppeteer wrapper — launches Chrome, renders HTML, returns `Buffer` |
| `src/lib/pdf/render-issp-html.ts` | Full HTML renderer for all 4 parts + cover + TOC + definitions |
| `src/app/api/issp/documents/[id]/export/route.ts` | GET handler — fetches all data, builds `IsspData`, calls render + generate |
| `src/components/issp-editor/issp-overview-content.tsx` | Has the Export PDF button wired to the export route |

#### DICT Uniformity Requirements (all applied)
| Requirement | Implementation |
|---|---|
| Font: Palatino Linotype | `P052` leads the font stack (Palatino clone); falls back to `'Palatino Linotype'`, `'Book Antiqua'`, Georgia |
| Font size: 11pt | `font-size: 11pt` in CSS body |
| Page orientation: Landscape | `landscape: true` in `page.pdf()` + `@page { size: A4 landscape }` |
| Spacing: 1.5 | `line-height: 1.5` in CSS body |
| Paper: A4 | `format: "A4"` in `page.pdf()` |
| Margin: 1 inch all sides | `margin: { top:"25.4mm", right:"25.4mm", bottom:"25.4mm", left:"25.4mm" }` in Puppeteer; **no** `margin` in the CSS `@page` rule (would double-stack) |
| Header: Agency logo | `headerTemplate` in `page.pdf()` — shows agency logo (base64 data URI) + acronym + ISSP title |

#### `generatePdf` signature
```typescript
export interface PdfHeaderOptions {
  agencyAcronym: string;
  agencyName: string;
  logoSrc?: string | null; // base64 data URI — read from agency.logoPath at export time
  startYear: number;
  endYear: number;
}

export async function generatePdf(html: string, header: PdfHeaderOptions): Promise<Buffer>
```

#### How the export route resolves the logo
```typescript
// In export/route.ts
if (doc.agency.logoPath) {
  const logoAbsPath = path.join(process.cwd(), "public", doc.agency.logoPath.replace(/^\//, ""));
  if (fs.existsSync(logoAbsPath)) {
    const ext = path.extname(logoAbsPath).slice(1).toLowerCase();
    const mime = ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : "image/jpeg";
    const data = fs.readFileSync(logoAbsPath).toString("base64");
    logoSrc = `data:${mime};base64,${data}`;
  }
}
```
Falls back to acronym text if no logo is set.

#### Image loading in Puppeteer
`page.setContent()` uses `waitUntil: "load"` (not `"networkidle0"` — not supported for `setContent` in this version). After load, images are waited on explicitly:
```typescript
await page.evaluate(() =>
  Promise.all(
    [...document.querySelectorAll("img")].map((img) =>
      img.complete ? Promise.resolve()
        : new Promise<void>((res) => {
            img.addEventListener("load", () => res());
            img.addEventListener("error", () => res());
          })
    )
  )
);
```

#### PDF generation strategy — two-PDF merge (IMPORTANT)
The cover page must have **no** Puppeteer header or footer. Since Puppeteer's `displayHeaderFooter` applies to every page and there is no per-page suppression mechanism in the API, `generatePdf` uses a **two-PDF + pdf-lib merge** approach:

1. `page.pdf({ displayHeaderFooter: true, ... })` → full PDF with running header on every page
2. `page.pdf({ displayHeaderFooter: false, pageRanges: "1" })` → cover-only PDF (page 1, no header/footer)
3. `PDFDocument` from `pdf-lib` merges: page 0 of cover PDF + pages 1-N of full PDF

Both PDFs are generated from the **same HTML** in the **same browser session** (no re-render). `pdf-lib` is installed as a production dependency.

#### PDF page structure
1. **Cover page** — agency logo (if `logoSrc`), name, title, amendment type, period, signature blocks, scope. Generated without Puppeteer header/footer via pdf-lib merge.
2. **Table of Contents** — static page numbers (not computed from actual page flow — known gap)
3. **Definition of Terms** — 3 key definitions
4. **Part I** — mandate, CIO/Focal, human capital table, stakeholders
5. **Part II** — strategic concerns, network diagrams (inline images), cybersecurity checklist, IS inventory cards, EGP checklist
6. **Part III** — proposed network, cybersecurity checklist, human capital, proposed IS cards, ICT project cards, performance framework KPI tables
7. **Part IV** — 3 year cost breakdown tables (UACS-grouped with subtotals) + B.1–B.4 summary tables

#### Running header / footer
- Puppeteer `headerTemplate`: `[logo img] [acronym]` on the left, ISSP title on the right, bottom border. The logo block is either `<img> + <span>acronym</span>` (with logo) or just `<span>acronym</span>` (without). **Do not add a second `${agencyAcronym}` span** — that's the bug that caused "NCWTR NCWTR".
- Puppeteer `footerTemplate`: "Page N" right-aligned, italic
- The in-content `pageHeader()` function in `render-issp-html.ts` returns `""` — deliberate no-op. Do not re-enable it.

#### `render-issp-html.ts` key helpers
```typescript
function esc(s)              // HTML-escape
function nl2br(s)            // escape + newline → <br>
function php(n)              // format as ₱1,234.56
function chk(v)              // boolean → ☑/☐
function total(l)            // l.qty * l.unitCost
function sumLines(lines)     // sum of total(l) for all items
function fundSourceAbbr(s)   // "General Appropriations Act (GAA)" → "GAA" etc.
function groupByUacs(lines)  // group LineItem[] by uacsCode, return subtotals
function scopeLabel(scope)   // Prisma enum → human label
function pageHeader(_issp)   // intentionally returns "" — Puppeteer headerTemplate handles it
```

#### `IsspData` / `Agency` interface (what the export route builds)
```typescript
interface Agency {
  name: string; acronym: string; type: string;
  websiteUrl: string | null;
  logoSrc?: string | null; // base64 data URI — set by export route before calling renderIsspHtml
}
export interface IsspData {
  title: string; startYear: number; endYear: number;
  status: string; scope: string; amendmentNumber: number;
  agency: Agency;
  part1: Part1; part2: Part2; part3: Part3; part4: Part4;
}
```
The export route sets `issp.agency.logoSrc = logoSrc` after resolving the logo, so the cover page can embed it. All JSON fields have safe fallbacks when DB record is null or JSON is invalid.

#### Scope enum values (for scopeLabel)
The Prisma enum values that come out of the DB:
`DEPARTMENT_WIDE`, `DEPARTMENT_CENTRAL_ONLY`, `CENTRAL_ONLY`, `WITH_REGIONAL`, `WITH_BUREAUS`, `AGENCY_WIDE`, `AGENCY_CENTRAL_ONLY`, `AGENCY_WITH_REGIONAL`, `OTHER_GOVERNMENT_ENTITY`, `LGU_SCOPE`

---

## 4. API Routes

| Route | Methods | Notes |
|---|---|---|
| `/api/issp/documents` | GET, POST | List + create documents |
| `/api/issp/documents/[id]` | GET, PATCH, DELETE | Single document |
| `/api/issp/documents/[id]/part1` | GET, PUT | JSON fields: orgOutcomes, humanCapital, stakeholders |
| `/api/issp/documents/[id]/part2` | GET, PUT | JSON fields: strategicConcerns, cybersecurityControls, informationSystems, egpChecklist |
| `/api/issp/documents/[id]/part3` | GET, PUT | JSON fields: proposedCybersecControls, proposedHumanCapital, proposedSystems, internalProjects, crossAgencyProjects, performanceFramework |
| `/api/issp/documents/[id]/part4` | GET, PUT | JSON fields: year1, year2, year3, summary |
| `/api/issp/documents/[id]/upload-diagram` | POST, PATCH, DELETE | Network diagram file upload; saves to `public/uploads/{docId}/` |
| `/api/issp/documents/[id]/export` | GET | Streams PDF download; `Content-Disposition: attachment` |

All GET/PUT handlers: JSON fields serialized to strings for SQLite, deserialized on GET.

---

## 5. Database

- **SQLite at `dev.db`** — no PostgreSQL, no Docker
- **Prisma migrations are drifted** — several columns added directly via SQL
- **DO NOT run `npx prisma migrate dev`** — it will prompt to reset the DB and wipe everything

### Columns added outside migrations:
| Column | Table | How added |
|---|---|---|
| `networkDiagrams TEXT DEFAULT '[]'` | `Part2Assessment` | `ALTER TABLE` in seed script |
| `summary TEXT DEFAULT '{}'` | `Part4Resources` | `scripts/migrate-part4-columns.js` |
| `createdAt`, `updatedAt` | `Part4Resources` | `scripts/migrate-part4-columns.js` |

When adding new schema columns: edit `prisma/schema.prisma`, run `npx prisma generate`, then:
```js
const Database = require('better-sqlite3');
const db = new Database('dev.db');
db.exec("ALTER TABLE ModelName ADD COLUMN columnName TEXT NOT NULL DEFAULT 'default'");
```

---

## 6. Critical Architectural Patterns

### Base UI Button with anchor tags — ALWAYS `nativeButton={false}`
```tsx
<Button nativeButton={false} render={<a href="/some/path" />}>Label</Button>
```

### Auto-save pattern
```tsx
const { status, debouncedSave } = useAutoSave({ url: `/api/issp/documents/${docId}/part4`, method: "PUT" });
// Always pair with <SaveStatusIndicator status={status} />
```

### JSON field deep-merge — REQUIRED for all group/nested JSON fields
```tsx
const controls = {
  physical:  { ...DEFAULT_CYBER.physical,  ...saved.physical },
  perimeter: { ...DEFAULT_CYBER.perimeter, ...saved.perimeter },
  // ... all groups
};
```

### Base UI Tooltip (for (i) info icons)
```tsx
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
<TooltipProvider><Tooltip><TooltipTrigger>...</TooltipTrigger><TooltipContent>text</TooltipContent></Tooltip></TooltipProvider>
```

### Select `onValueChange` typing
```tsx
onValueChange={(v: string | null) => v && handler(v)}
```

### Layout structure (NO outer sidebar)
```
(dashboard)/layout.tsx  →  bare passthrough
  /dashboard/documents/[id]/layout.tsx  →  IsspEditorShell (h-screen, collapsible ISSP sidebar)
    form pages  →  rendered inside IsspEditorShell main
```

---

## 7. Components Reference

### `src/components/issp-editor/issp-overview-content.tsx`
- Has the **Export PDF** button (`<a href="/api/issp/documents/${docId}/export" download>`)
- Top-right of the header, inline-flex with download icon SVG

### `src/components/issp-editor/uacs-combobox.tsx`
- Props: `value`, `onChange(uacs, label)`, `context: "co" | "mooe" | "all"`, `placeholder`, `className`
- Lazy-loads `/uacs_active.min.json` on first open
- Context `"co"` → prefix `506%`; `"mooe"` → prefix `5021%` or `5029%`

### `src/components/issp-editor/part4/part4-year-form.tsx`
- Section labels: A=Office Productivity, B+…=Internal Projects, then Cross-Agency, last=Continuing Costs
- Via `alpha(n) = String.fromCharCode(65 + n)`
- Exports `YearBudget`, `LineItem`, `ProjectBudget` types

### `src/components/issp-editor/part4/part4-summary.tsx`
- Read-only B.1–B.4 auto-calculated summary tables
- Consistency banner warns if totals across tables don't match

---

## 8. Seed Data (NCWTR)

**Agency:** National Commission on Waiting Time Reduction (NCWTR), NGA  
**Scope:** `AGENCY_WITH_REGIONAL`

| Email | Password | Role |
|---|---|---|
| admin@ncwtr.gov.ph | password123 | ADMIN |
| cio@ncwtr.gov.ph | password123 | CIO — Dir. Reginaldo Tambunting |
| focal@ncwtr.gov.ph | password123 | FOCAL — Ms. Luzviminda Padayao |

**ISSP:** `issp-ncwtr-2026`, 2026–2028, DRAFT — all 4 parts fully populated  
**Projects:** SIKAP (₱24.5M), BILIS (₱9.8M), HANDA (₱4.2M)  
**Proposed IS:** UQMP, CFCP, iHRPS  
**Existing IS:** NQMS (Windows XP/VB6), eCLAS (fax machines), ROMS (17 regional instances), AHRIS (47 Excel workbooks)

---

## 9. Pending / Next Session Work

### 🔴 Annex 1 — ICT Asset Inventory (Standalone Public Module, planned, not started)

Full plan: **`docs/annex1-implementation-plan.md`**

**Key architecture decision:** Annex 1 is a **separate standalone module** at `/annex1` — no login required. Regional/field offices fill their own inventory and export a `.issp` file. The CIO attaches those files in the main ISSP editor for consolidation and PDF export.

**`.issp` file type system** — a new `fileType` field on the envelope distinguishes file types:
- `"issp-main"` — main ISSP (Parts I–IV); add to export script immediately
- `"annex1"` — ICT Asset Inventory from a specific office
- `"annex2"` — DRBCP (future standalone module, same pattern)

**Office hierarchy:** 3-way selector (Central / Regional / Field). Regional → pick PH region. Field → pick parent region + enter descriptive name. Produces `displayLabel` used in PDF (e.g. *"NCR › UP Diliman Field Office"*).

**12-step implementation order** — see plan doc. Key files:
- `src/types/annex1.ts` — types + `PHILIPPINE_REGIONS` constant
- `src/proxy.ts` — add `pathname.startsWith("/annex1")` to public exemptions
- `src/app/annex1/` — standalone module (wizard: office → equipment → software → export)
- `src/components/annex1/inventory-table.tsx` — shared table component
- `prisma/schema.prisma` — add `annexedOffices String @default("[]")` to `IsspDocument`
- `src/app/(dashboard)/dashboard/documents/[id]/annex1/page.tsx` — consolidation/attach UI
- `src/lib/render-issp-html.ts` — `renderAnnex1Consolidated()`

**Three open questions to resolve before building** (see plan doc §Open Questions)

### 🟡 Phase 7 — Polish & Validation
- Section-level progress tracking (% complete per part)
- Blocking submit validation: linked IS, budget consistency, required fields
- Review mode (read-only full-document view)
- "Submit for Review" workflow (CIO approval flow)
- Mobile-responsive improvements

### 🔵 PDF — Known Remaining Gaps
- **TOC page numbers are static** — the Table of Contents has hardcoded page numbers (e.g. "1", "3", "11"). A two-pass render (first pass counts pages, second pass injects real page numbers) would fix this but is complex.
- **Network diagrams in PDF are inline** — currently rendered as `<img>` tags inside the Part II-B section. The original spec says each diagram = its own full page. This has not been implemented yet.
- **NQMS IS card classification checkbox unchecked** — seed data has `classification: "Operations"` but the checkbox renders unchecked in the PDF; minor data/rendering issue.
- **Performance Framework KPI values empty** — seed data does not fill in KPI text, baseline, or targets fields. Not a code bug.

### 🔵 PDF — Fixed This Session (2026-05-16)
| Issue | Fix |
|---|---|
| Cover shows Puppeteer header ("NCWTR NCWTR") and "Page 1" footer | Switched to two-PDF + pdf-lib merge: cover page generated separately without `displayHeaderFooter`, then merged |
| "NCWTR NCWTR" doubled acronym in all page headers | Fixed `headerTemplate` in `generate-pdf.ts` — the old code had both a logo-fallback span AND a separate explicit acronym span. Now uses a single `logoBlock` that includes the acronym label once. |
| TOC spanning 3+ pages | Reduced TOC entry `margin-bottom` from 1.5mm → 0.5mm, `margin-top` on part entries from 4mm → 2mm |
| Section heading orphaned alone at bottom of page (Part II-C) | Added `page-break-after: avoid` to `.section-heading` and `.subsection-heading` CSS |
| IS card PIA rows orphaned on their own page | Added `class="avoid-break"` to every `<tr>` in `renderIsCard()` |
| "General Appropriations Act (GAA)" taking 3 lines in Fund Source column | Added `fundSourceAbbr()` helper; now shows "GAA" in Part IV tables |
| Cover logo was 🏛 emoji (non-rendering in PDF) | Cover now shows actual agency logo `<img>` if `agency.logoSrc` is set, or agency name text fallback |

---

## 10. Bugs Fixed History

| Bug | Fix Location |
|---|---|
| `animate-spin` on whole save indicator container | `save-status-indicator.tsx` — moved to icon only |
| React rules violation: module-level `let docId` reassignment | `part3-e1-form.tsx` — moved to prop |
| `as any` in auth callbacks | `auth.config.ts` — typed intersections |
| All `Button render={<a>}` missing `nativeButton={false}` | Bulk replacement across 11 files |
| `humanCapital: {}` from DB crashes Part I-B | `part1/b/page.tsx` + `part1-b-form.tsx` — deep merge |
| `console.log` in `proxy.ts` printing full auth state | Removed |
| 3 bare `<button>` missing `type="button"` | `part2-a`, `part3-c`, `part1-c` forms |
| 12 icon-only Buttons missing `aria-label` | All form components |
| Outer sidebar/header double-nav | Removed — dashboard layout is bare passthrough |
| `issp-editor-shell` negative margin hack `-m-6` | Removed — uses `h-screen` directly |
| Part I-A (i) tooltips showing empty | `part1-a-form.tsx` — replaced `title` attr with Base UI Tooltip |
| Part I-B CIO + Focal as separate cards | `part1-b-form.tsx` — combined into one card with divider |
| Part II-B crash: `undefined.perimeterProtection` | `part2-b-form.tsx` — group-by-group deep-merge |
| Part III-F `colSpan={8}` not covering delete column | `part3-f-form.tsx` — fixed to `colSpan={9}` |
| Part III-E.1 `text-[11px]` below Tailwind minimum | `part3-e1-form.tsx` — changed to `text-xs` |
| Part IV Total header missing right border | `part4-year-form.tsx` — `border-r border-border` |
| Part IV section letters hardcoded "B." for all projects | `part4-year-form.tsx` — dynamic `alpha(n)` |
| `Unknown field networkDiagrams` runtime error | Restart dev server after `prisma generate` |
| Duplicate `useCallback` import | `part2-b-form.tsx` — consolidated |
| PDF: B.1 syntax error — extra paren in Office Productivity total | `render-issp-html.ts` line ~1241 |
| PDF: `scopeLabel()` using wrong enum key names | `render-issp-html.ts` — updated to Prisma enum values |
| PDF: `waitUntil:"networkidle0"` invalid for `setContent` | `generate-pdf.ts` — changed to `"load"` + image wait |
| PDF: `Buffer` not assignable to `Response` body | `export/route.ts` — `new Uint8Array(pdf)` |
| PDF: `keyof Part4` includes `summary:unknown` type error | `render-issp-html.ts` — narrowed to `"year1"\|"year2"\|"year3"` |
| PDF: double top margin (CSS @page + Puppeteer both applying 25.4mm) | `render-issp-html.ts` — removed `margin` from `@page` rule |
| PDF: double header on every page | `render-issp-html.ts` — `pageHeader()` returns `""` |
| PDF: cover overflowing to 2 pages in landscape | `render-issp-html.ts` — cover CSS reduced from 240mm to 159mm |
| PDF: Puppeteer running header showing on cover page | `render-issp-html.ts` — `@page :first { margin-top:0; margin-bottom:0 }` |

---

## 11. Running the App

```bash
cd /root/apps/issp
npm run dev          # http://localhost:3000

# Type check
npx tsc --noEmit

# DB operations (never run migrate dev)
node prisma/seed.js                    # Wipe + reseed NCWTR data
node scripts/backfill-parts.js        # Create missing Part records for old docs
npx prisma generate                   # Regenerate client after schema.prisma changes
npx prisma studio                     # Browse the database
```

### Puppeteer / Chrome dependencies
Chrome 148 is installed at `/root/.cache/puppeteer/chrome/linux-148.0.7778.167/chrome-linux64/chrome`.  
Required shared libraries were installed in a prior session:
```bash
apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 \
  libpango-1.0-0 libpangocairo-1.0-0 libpangoft2-1.0-0 libcairo2 libnss3 \
  libnspr4 libdbus-1-3 libx11-6 libxcb1 libxext6 libxi6 libxss1 libgtk-3-0
```
P052 font:
```bash
apt-get install -y fonts-urw-base35 && fc-cache -f
```

---

## 12. File Tree (Key Files Only)

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                    ← bare passthrough (NO sidebar/header)
│   │   └── dashboard/
│   │       └── documents/
│   │           ├── page.tsx + documents-list-client.tsx
│   │           └── [id]/
│   │               ├── layout.tsx        ← IsspEditorShell (max-w-7xl, h-screen)
│   │               ├── page.tsx          ← document overview
│   │               ├── part1/{a,b,c}/page.tsx
│   │               ├── part2/{a,b,c,d}/page.tsx
│   │               ├── part3/{a,b,c,d,e1,e2,f}/page.tsx
│   │               └── part4/{page,year1,year2,year3,summary}/page.tsx
│   └── api/issp/documents/
│       ├── route.ts
│       └── [id]/
│           ├── route.ts
│           ├── part1/route.ts
│           ├── part2/route.ts
│           ├── part3/route.ts
│           ├── part4/route.ts
│           ├── upload-diagram/route.ts   ← POST/PATCH/DELETE for network diagrams
│           └── export/route.ts           ← GET → PDF download (Phase 6)
├── components/
│   ├── issp-editor/
│   │   ├── issp-overview-content.tsx     ← has "Export PDF" button
│   │   ├── issp-sidebar.tsx
│   │   ├── issp-editor-shell.tsx
│   │   ├── save-status-indicator.tsx
│   │   ├── uacs-combobox.tsx
│   │   ├── part1/{a,b,c}-form.tsx
│   │   ├── part2/{a,b,c,d}-form.tsx
│   │   ├── part3/{a,b,c,d,e1,e2,f}-form.tsx
│   │   └── part4/
│   │       ├── part4-year-form.tsx       ← dynamic alpha() lettering
│   │       └── part4-summary.tsx         ← B.1–B.4 read-only tables
│   └── ui/                               ← Base UI wrappers
├── hooks/use-auto-save.ts
└── lib/
    ├── auth.config.ts
    ├── auth.ts
    ├── auth-types.ts
    ├── db.ts
    ├── utils.ts
    └── pdf/
        ├── generate-pdf.ts               ← Puppeteer wrapper (PdfHeaderOptions)
        └── render-issp-html.ts           ← Full ISSP HTML renderer

prisma/
├── schema.prisma
└── seed.js                               ← NCWTR agency + full ISSP data

scripts/
├── backfill-parts.js
└── migrate-part4-columns.js

public/
├── uacs_active.min.json
├── screenshots/
│   └── issp-builder.png                 ← Part II-C IS Inventory screenshot, used in landing page hero
└── uploads/                              ← network diagram uploads

dev.db                                    ← SQLite (project root, NOT prisma/)
```

---

## 13. Landing Page

### Current State (built 2026-05-17)

The public-facing root (`/`) is a landing page — unauthenticated users see it, authenticated users are redirected to `/dashboard` by middleware.

| File | Role |
|---|---|
| `src/app/page.tsx` | Full landing page component (replaces the old `redirect("/dashboard")`) |
| `src/proxy.ts` | Root `/` now passes through for unauthenticated users; `screenshots` added to matcher exclusion |
| `src/app/layout.tsx` | Metadata updated — title template `%s \| ISSP Platform PH`, civic tech description |
| `public/screenshots/issp-builder.png` | Real app screenshot (Part II-C IS Inventory) captured via Puppeteer — used in hero browser mockup |

**Page sections (top → bottom):**
1. Sticky nav — logo mark + nav links + "Sign In →" button
2. Hero — gray-50 bg, left copy column + right browser mockup (app screenshot inside fake Chrome chrome)
3. Problem — 3 pain-point cards with Lucide icons
4. Features — 3 cards: ISSP Creator (Live), ISSP Repository (Coming Soon), ICT Budget Dashboard (Coming Soon)
5. Why It Matters — 2-col: bullet checklist left, compliance progress bars right
6. CTA — dark (`bg-gray-950`), "Help us build this"
7. Footer — white, border-top, minimal links

**Design language:** shadcn-neutral — white/gray-50 backgrounds, blue (`#0038A8`) as accent only (primary button, progress bars, check icons), `border border-gray-200 rounded-lg` cards, compact `py-14` sections.

---

### Planned Improvements (identified 2026-05-17, not yet implemented)

#### Fix 1 — Hero screenshot legibility (highest priority)
**Problem:** The browser mockup is squished into a narrow right column. At the rendered width, the screenshot is unreadable — users see a blur rather than a clear view of the tool.  
**Solution:** Switch the hero to a stacked layout: copy block on top (centered or left-aligned), then the browser mockup full-width (or near-full-width, capped at ~900px) below it. This gives the screenshot room to breathe and makes the UI actually legible without growing the page height significantly.  
**File:** `src/app/page.tsx` — change hero `grid grid-cols-[1fr_1.6fr]` to a single-column flex/block layout with the `<BrowserMockup />` below the copy block. Consider adding a subtle `scale-[0.97]` or `rounded-xl overflow-hidden` to keep it feeling contained.

#### Fix 2 — Headline copy
**Problem:** "Government ICT plans, visible and accessible" is accurate but passive. It doesn't speak to the friction the CIO is experiencing right now.  
**Solution:** Replace with copy that names the pain directly. Candidates:
- *"Your ISSP is due. Here's the fastest way to get it right."*
- *"Stop drowning in ISSP paperwork. Start building smarter."*
- *"ISSP compliance, finally structured."*

Pick the one that best fits the institutional-but-approachable tone.  
**File:** `src/app/page.tsx` — `<h1>` text only. No layout changes needed.

#### Fix 3 — Features section: lead with what's live
**Problem:** Two of three feature cards are "Coming Soon." A first-time visitor scanning the features section sees a half-built product.  
**Solution:** Reorganize into two visual tiers:
- **Tier 1 (top, prominent):** ISSP Creator / Editor — single card, wider, badge "Live Now" in green. Consider showing a mini screenshot or icon cluster here.
- **Tier 2 (below, smaller):** "On the Roadmap" label + ISSP Repository and ICT Budget Dashboard side by side, visually de-emphasized (lighter border, muted badge).  

**File:** `src/app/page.tsx` — restructure the `FEATURES` array into `LIVE_FEATURES` + `ROADMAP_FEATURES`, update the features section JSX layout.

#### Fix 4 — Remove misleading compliance progress bars
**Problem:** The "Compliance Framework" card in "Why It Matters" shows illustrative percentages (84%, 92%, 77%, 68%) with a disclaimer "Illustrative." Government users — especially CIOs and DICT reviewers — will distrust any card that shows made-up numbers, even with a disclaimer.  
**Solution:** Replace with a static **MITHI / DICT Requirements Checklist** — a list of actual requirements the platform addresses, each with a check mark. Examples:
- ✓ Parts I–IV structured per DICT 2026 template
- ✓ PDF export compliant with DICT uniformity rules (P052 font, A4 landscape, 1-inch margins)
- ✓ eGov Checklist (Part II-D) built in
- ✓ Network infrastructure and cybersecurity sections included
- ✓ Performance Framework (Part III-F) with KPI tracking
- ✓ Budget breakdown aligned to UACS coding structure  

**File:** `src/app/page.tsx` — replace the inline compliance progress bar block in the "Why It Matters" right column with a `<ul>` checklist using the `<Check>` icon from Lucide.

#### Fix 5 — Add explicit audience signal in hero
**Problem:** The page doesn't clearly state who it's for until the user reads several paragraphs. Visitors self-selecting out before that point never know if this is for them.  
**Solution:** Add one short line immediately below the "Civic Technology · Open Source" badge:
> *"Built for agency CIOs, ICT focal persons, and government transparency advocates."*

This single line immediately qualifies the visitor without adding visual weight.  
**File:** `src/app/page.tsx` — add a `<p className="text-xs text-gray-400 mb-3">` between the badge `<div>` and the `<h1>` in the hero left column.

#### Fix 6 — CTA section: fix contributor vs. user framing mismatch
**Problem:** The `bg-gray-950` CTA section heading says *"Help us build this platform"* (contributor framing) but the primary button says *"Start Using the Platform"* (user framing). These are two different calls to action competing for the same space — neither lands cleanly.  
**Solution:** Pick one lane and commit to it. Recommended: **user lane primary, contributor secondary**.
- Heading: *"Ready to build your agency's ISSP?"*
- Sub: Short sentence about the platform being free and open.
- Primary button: *"Get Started →"* → `/login`
- Secondary line (smaller, below buttons): *"Want to contribute? This is an open-source, volunteer-led project. Get in touch."* (plain text or a subtle link)  

**File:** `src/app/page.tsx` — CTA section heading, subtext, and button labels only. No layout changes.

---

### Screenshot refresh procedure

When the app UI changes significantly, refresh the hero screenshot:
```bash
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await page.type('input[type=\"email\"]', 'cio@ncwtr.gov.ph');
  await page.type('input[type=\"password\"]', 'password123');
  await page.click('button[type=\"submit\"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.goto('http://localhost:3000/dashboard/documents/issp-ncwtr-2026/part2/c', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'public/screenshots/issp-builder.png' });
  await browser.close();
})();
"
```
