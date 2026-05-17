# ISSP Builder - Project Status & Setup Guide

## Current Status

**Phase 1: Foundation — ✅ COMPLETE**
**Phase 2: Part I Forms — ✅ COMPLETE**
**Phase 3: Part II Forms — ✅ COMPLETE**
**Phase 4: Part III Forms — ✅ COMPLETE**
**Phase 5: Part IV Forms — ✅ COMPLETE**
**Phase 6: PDF Export — ✅ COMPLETE**

> Field alignment audit completed. All critical misalignments fixed. See `docs/guidelines-alignment-audit.md`.  
> Use `references/ISSP_Guidelines_2026.md` as the reference for all field names and options. All reference documents (PDFs + Annexes 1–2) are in the `references/` folder.

---

## Implemented Features

| Task | Status |
|------|--------|
| Next.js project initialization | ✅ Done |
| Prisma + SQLite database with full schema | ✅ Done |
| UACS codes imported (1,253 total, 1,225 active) | ✅ Done |
| NextAuth.js v5 with credentials provider | ✅ Done |
| Base UI + Tailwind CSS 4 components | ✅ Done |
| Dashboard layout (sidebar + header) | ✅ Done |
| Auth proxy (route protection via middleware) | ✅ Done |
| Seed data (NCWTR agency + users + comprehensive ISSP) | ✅ Done |
| Inter font | ✅ Done |
| ISSP Documents list page | ✅ Done |
| ISSP Document creation dialog | ✅ Done |
| ISSP Document editor layout (collapsible sidebar) | ✅ Done |
| ISSP Document overview (section card grid) | ✅ Done |
| API: /api/issp/documents (GET, POST) | ✅ Done |
| API: /api/issp/documents/[id] (GET, PATCH, DELETE) | ✅ Done |
| API: /api/issp/documents/[id]/part1 (GET, PUT) | ✅ Done |
| API: /api/issp/documents/[id]/part2 (GET, PUT) | ✅ Done |
| API: /api/issp/documents/[id]/part3 (GET, PUT) | ✅ Done |
| API: /api/issp/documents/[id]/part4 (GET, PUT) | ✅ Done |
| API: /api/issp/documents/[id]/upload-diagram (POST, PATCH, DELETE) | ✅ Done |
| API: /api/issp/documents/[id]/export (GET → PDF download) | ✅ Done |
| Part I-A: Mandate, Vision, Mission, Org Outcomes | ✅ Done |
| Part I-A: Base UI Tooltip on all (i) info icons | ✅ Done |
| Part I-B: CIO + Focal in one combined card | ✅ Done |
| Part I-B: "Concurrently held by the CIO" checkbox (copies CIO data to Focal fields) | ✅ Done |
| Part I-B: Human Capital grid | ✅ Done |
| Part I-C: Stakeholder Analysis table | ✅ Done |
| Part II-A: Strategic Concerns | ✅ Done |
| Part II-B: Network description textarea | ✅ Done |
| Part II-B: Multi-diagram upload with per-diagram titles + image previews | ✅ Done |
| Part II-B: Cybersecurity Checklist (deep-merge fix for missing group keys) | ✅ Done |
| Part II-C: IS Inventory (cards, PIA, interop) | ✅ Done |
| Part II-D: E-Government Programs Checklist | ✅ Done |
| Part III-A: Proposed Infrastructure | ✅ Done |
| Part III-B: Enterprise Architecture | ✅ Done |
| Part III-C: Proposed Human Capital | ✅ Done |
| Part III-D: Proposed Information Systems | ✅ Done |
| Part III-E.1: Internal ICT Projects | ✅ Done |
| Part III-E.2: Cross-Agency ICT Projects | ✅ Done |
| Part III-F: Performance Framework | ✅ Done |
| Part IV landing page (year/summary card grid) | ✅ Done |
| Part IV Year 1/2/3 cost breakdown tables | ✅ Done |
| Part IV: Dynamic section lettering (A=Office Prod, B+…=projects, last=Continuing) | ✅ Done |
| Part IV Summary of Investments (B.1–B.4 auto-calculated tables) | ✅ Done |
| Auto-save hook (debounced, 1.5s) | ✅ Done |
| Save status indicator (fixed — icon-only spin) | ✅ Done |
| Backfill script for legacy documents | ✅ Done |
| Editor shell widened to max-w-7xl | ✅ Done |
| PDF: Puppeteer HTML → A4 landscape PDF | ✅ Done |
| PDF: P052 (Palatino clone) font installed + leading font stack | ✅ Done |
| PDF: DICT uniformity rules applied (font, size, spacing, margin, orientation) | ✅ Done |
| PDF: Running header with agency logo + acronym + ISSP title on every page | ✅ Done |
| PDF: Footer with page numbers on every page | ✅ Done |
| PDF: Cover page (one page, no header/footer, landscape-sized) | ✅ Done |
| PDF: Table of Contents, Definition of Terms | ✅ Done |
| PDF: All 4 Parts rendered (Part I–IV) | ✅ Done |
| PDF: Part IV UACS grouping + subtotals + grand totals | ✅ Done |
| PDF: B.1–B.4 Summary of Investments tables | ✅ Done |
| PDF: Export PDF button on document overview page | ✅ Done |
| PDF: Cover page suppression (no header/footer on p1) via pdf-lib merge | ✅ Done |
| PDF: Doubled acronym in header fixed ("NCWTR NCWTR" → "NCWTR") | ✅ Done |
| PDF: TOC compressed from 3+ pages to 1 page | ✅ Done |
| PDF: Section heading orphan prevention (`page-break-after: avoid`) | ✅ Done |
| PDF: IS card rows marked `avoid-break` (no orphaned PIA rows) | ✅ Done |
| PDF: Fund Source in Part IV shows "GAA" not full name | ✅ Done |
| PDF: Cover logo uses actual agency logo image (not emoji placeholder) | ✅ Done |
| Landing page at `/` (public, no auth required) | ✅ Done |
| Landing page: browser mockup hero with real app screenshot | ✅ Done |
| Landing page: middleware updated — root path public, screenshots dir excluded | ✅ Done |
| Landing page: shadcn-neutral design, compact spacing, Lucide icons | ✅ Done |

---

## Known Bugs Fixed

| Bug | Fix |
|-----|-----|
| `animate-spin` applied to entire save-status container | Moved to icon element only |
| Module-level `let docId` reassigned in render (React rules violation) | Refactored to prop-passed pattern |
| `as any` casts in `auth.config.ts` JWT/session callbacks | Replaced with typed intersections |
| `Button render={<a>}` missing `nativeButton={false}` — Base UI warning | Added `nativeButton={false}` to all instances |
| `humanCapital` crash on empty `{}` DB value in Part I-B | Deep-merge with `DEFAULT_HC` at both server page and client init |
| Debug `console.log` in `proxy.ts` printing auth state on every request | Removed |
| Unused imports across 6 form files (ESLint warnings) | Cleaned up |
| `<button>` elements missing `type="button"` in 3 forms | Fixed — prevents accidental form submission |
| Icon-only Buttons missing `aria-label` (12 instances) | Added descriptive labels |
| Part I-A (i) tooltips showing no content | Replaced native `title` attribute with Base UI Tooltip component |
| Part II-B crash: `Cannot read properties of undefined (reading 'perimeterProtection')` | Deep-merge `cybersecurityControls` from DB against `DEFAULT_CYBER` group-by-group |
| Part III-F empty state `colSpan={8}` not spanning full table | Fixed to `colSpan={9}` (8 data + 1 delete) |
| Part III-E.1 `text-[11px]` below Tailwind minimum | Changed to `text-xs` |
| Part IV Total column header missing right border | Added `border-r border-border` |
| Part IV delete cell misaligned with header | Fixed `border-l border-border`, `py-1` to match row cells |
| Part IV section letters hardcoded (all projects showed "B." or "C.") | Replaced with dynamic `alpha(n)` function; Continuing Costs always gets last letter |
| `Unknown field networkDiagrams` runtime error after schema change | Dev server restart required after `prisma generate` (stale compiled chunks) |
| Duplicate `useCallback` import in part2-b-form.tsx | Consolidated to single import line |
| PDF: B.1 General Summary Office Productivity total cell syntax error | Fixed broken template literal — extra closing paren dropped `php()` output |
| PDF: `scopeLabel()` using wrong enum keys | Updated to match Prisma enum values (DEPARTMENT_WIDE, AGENCY_WITH_REGIONAL, etc.) |
| PDF: `waitUntil: "networkidle0"` not valid for `page.setContent()` | Changed to `"load"` + post-load `page.evaluate()` image wait loop |
| PDF: `Buffer` not assignable to `Response` body (`BodyInit`) | Wrapped as `new Uint8Array(pdf)` |
| PDF: `keyof Part4` includes `summary: unknown` causing type error | Narrowed to `"year1" \| "year2" \| "year3"` literal union |
| PDF: Double top margin (CSS `@page { margin }` + Puppeteer margin stacking) | Removed margin from `@page` rule; Puppeteer's `margin` option is the sole authority |
| PDF: Double header on every page | `pageHeader()` returns `""` — Puppeteer's `headerTemplate` is the only running header |
| PDF: Cover page overflowing to 2 pages in landscape | Reduced from `min-height:240mm + padding:20mm` to `height:159mm` (landscape content area) |
| PDF: Running header showing on cover page | Switched to pdf-lib two-PDF merge: cover generated without `displayHeaderFooter`, then merged with content PDF |
| PDF: "NCWTR NCWTR" doubled acronym on every page | `generate-pdf.ts` had both a logo-fallback span AND an explicit acronym span — collapsed into single `logoBlock` |
| PDF: TOC spanning 3+ pages | Reduced TOC entry spacing in CSS (0.5mm vs 1.5mm, tighter part spacing) |
| PDF: Section heading orphaned alone at page bottom | Added `page-break-after: avoid` to `.section-heading` and `.subsection-heading` |
| PDF: IS card PIA rows orphaned on their own page | Added `class="avoid-break"` to every `<tr>` in `renderIsCard()` |
| PDF: Fund Source column too wide ("General Appropriations Act (GAA)") | Added `fundSourceAbbr()` helper — shows abbreviated form "GAA" in Part IV tables |
| PDF: Cover logo was 🏛 emoji (Type 3 glyph rendering error) | Cover now embeds actual agency logo via `agency.logoSrc`; falls back to agency name text |

---

## ⚠️ Planned: Local-First Rearchitecture (Privacy by Design)

See **`docs/privacy-architecture.md`** for full brainstorming notes.

**Summary of direction:**
- Remove sign-in, server-side DB, and all data-bearing API routes
- Store all ISSP content in the browser (`IndexedDB`) — data never leaves the client
- Primary save format: `.issp` (JSON with custom extension) — user saves to their local filesystem
- PDF export becomes a stateless POST endpoint (receives JSON, returns PDF, persists nothing)
- Dramatically reduces PIA scope, VAPT surface, and RA 10173 compliance burden
- Enables any agency to use the tool without account creation or data exposure

**Status:** Brainstorming only. No code changes yet. 8 open questions documented (collaboration model, multi-doc support, network diagram storage, etc.)

---

## Next Up: Annex 1 — ICT Asset Inventory (Standalone Module)

See **`docs/annex1-implementation-plan.md`** for the full implementation plan.

**Architecture:** Annex 1 is a **standalone public module** at `/annex1` — no login required. Regional and field offices use it independently to fill in their ICT inventory and export a `.issp` file with `fileType: "annex1"`. The CIO then attaches these files in the main ISSP editor (new "Annexes" section), and the consolidated inventory is rendered in the final PDF export.

**`.issp` file type system** (new `fileType` field added to the envelope):
- `"issp-main"` — main ISSP document (Parts I–IV)
- `"annex1"` — ICT Asset Inventory from a specific office
- `"annex2"` — DRBCP (future)

**Office hierarchy in Annex 1:**
- Central Office / Regional Office (select PH region) / Field Office (select parent region + enter name)
- e.g. *"CSC Regional Office — NCR"* or *"NCR › UP Diliman Field Office"*

| Step | Scope |
|---|---|
| Types | `src/types/annex1.ts` — full type hierarchy + `PHILIPPINE_REGIONS` constant |
| `.issp` envelope | Add `fileType` field; update export script to emit `"issp-main"` |
| Proxy | Add `/annex1` to public route exemptions |
| Standalone module | `/annex1` — office setup wizard → equipment table → software table → export |
| `InventoryTable` component | Fixed DICT rows + custom rows + auto-totals |
| Schema + migration | Add `annexedOffices String` to `IsspDocument` |
| Consolidation UI | `/dashboard/documents/[id]/annex1` — attach files, validate, preview |
| PDF | `renderAnnex1Consolidated()` — per-office sections + aggregate summary |

**All design decisions resolved:**
1. ~~Agency name/acronym field?~~ No — Central Office consolidates within their own agency only.
2. ~~Completion % contribution?~~ No — supplementary only; shown as a separate optional indicator, does not affect main ISSP progress.
3. ~~"Others" rows cap?~~ Unlimited.

**Annex 2 (DRBCP):** Same standalone module architecture planned. Build after Annex 1 is stable.

---

## Next Up: Landing Page Improvements (identified 2026-05-17)

Six specific improvements are fully documented in `docs/session-handoff.md` § 13, including exact files and implementation notes. Summary:

| # | Issue | Priority |
|---|---|---|
| 1 | Hero screenshot illegible — mockup too narrow to read | High |
| 2 | Headline is descriptive, not motivating — doesn't address CIO pain | Medium |
| 3 | Features section leads with 2× "Coming Soon" — looks half-built | Medium |
| 4 | Compliance progress bars use illustrative/fake % — misleading to gov users | Medium |
| 5 | No explicit audience signal in hero — who is this for? | Low |
| 6 | CTA section mixes contributor + user framing — neither lands | Low |

---

## Next Up: Phase 7 — Polish & Validation

- Section-level progress tracking (% complete per part)
- Blocking submit validation: linked IS, budget consistency, required fields
- Review mode (read-only full-document view)
- "Submit for Review" workflow (CIO approval flow)
- Mobile-responsive improvements

---

## Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js (App Router, TypeScript) | 16.2.6 |
| Database | SQLite (via Prisma 7) | dev.db at project root |
| ORM | Prisma | 7.x |
| Auth | NextAuth.js v5 (Auth.js beta) | 5.0.0-beta.31 |
| UI | Tailwind CSS 4 + Base UI components | 4.x |
| Font (app) | Inter (via next/font/google) | — |
| Font (PDF) | P052 / URW Palladio (Palatino clone) via `fonts-urw-base35` | installed system-wide |
| PDF | Puppeteer | 25.0.2, Chrome 148.0.7778.167 |
| PDF merge | pdf-lib | latest — used to merge cover (no header) + content (with header) |

---

## Getting Started

### Prerequisites
- Node.js 24+
- npm 11+

### Setup
```bash
cd /root/apps/issp

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# (Optional) Reseed the database
node prisma/seed.js

# (Optional) Backfill missing Part records for old seeded docs
node scripts/backfill-parts.js
```

### Running
```bash
npm run dev
# App runs at http://localhost:3000
```

### Test Credentials

**NCWTR (main seed agency — comprehensive data):**
| Email | Password | Role |
|-------|----------|------|
| admin@ncwtr.gov.ph | password123 | ADMIN |
| cio@ncwtr.gov.ph | password123 | CIO — Dir. Reginaldo Tambunting |
| focal@ncwtr.gov.ph | password123 | FOCAL — Ms. Luzviminda Padayao |

> **NCWTR** = National Commission on Waiting Time Reduction. A fictitious but funny NGA whose mandate is to reduce government queuing times (irony: their own queues are legendary). The seeded ISSP covers a realistic agency with regional offices and field offices and includes all 4 parts with data.

---

## Project Structure

```
/root/apps/issp/
├── docs/
│   ├── implementation-plan.md
│   ├── project-status.md              # This file
│   ├── session-handoff.md             # Session continuation guide + architectural patterns
│   ├── guidelines-alignment-audit.md
│   └── troubleshooting-auth-networking.md
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
├── scripts/
│   ├── backfill-parts.js
│   └── migrate-part4-columns.js
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   └── dashboard/documents/[id]/
│   │   │       ├── layout.tsx          # IsspEditorShell
│   │   │       ├── page.tsx            # Document overview (has Export PDF button)
│   │   │       ├── part1/a–c/page.tsx
│   │   │       ├── part2/a–d/page.tsx
│   │   │       ├── part3/a,b,c,d,e1,e2,f/page.tsx
│   │   │       └── part4/page, year1–3, summary/page.tsx
│   │   └── api/issp/documents/[id]/
│   │       ├── route.ts
│   │       ├── part1–4/route.ts
│   │       ├── upload-diagram/route.ts
│   │       └── export/route.ts         # ← PDF export GET handler
│   ├── components/issp-editor/
│   │   ├── issp-overview-content.tsx   # Has "Export PDF" button (top-right)
│   │   └── ...all part forms
│   └── lib/
│       ├── pdf/
│       │   ├── generate-pdf.ts         # Puppeteer wrapper; accepts PdfHeaderOptions
│       │   └── render-issp-html.ts     # Full HTML renderer for all 4 parts
│       └── ...auth, db, utils
├── dev.db
├── .env
└── package.json
```

---

## Database Schema

### Core Models
- **Agency** — name, acronym, type (NGA/GOCC/LGU/OTHER), logo, website
- **User** — email, name, bcrypt password, role (ADMIN/CIO/FOCAL/CONTRIBUTOR), linked to Agency
- **IsspDocument** — title, coverage period (startYear–endYear), status, amendment number, scope

### ISSP Data Models (1:1 with IsspDocument)
- **Part1Profile** — Mandate, Vision, Mission, Org Outcomes (JSON), CIO/Focal details, Human Capital (JSON), Stakeholders (JSON)
- **Part2Assessment** — Strategic Concerns (JSON), Network Infrastructure (text), Network Diagrams (JSON array), Cybersecurity Controls (JSON), IS Inventory (JSON), EGP Checklist (JSON)
- **Part3Strategy** — Proposed Infra/Cybersec (JSON), Enterprise Architecture (text), Proposed Human Capital (JSON), Proposed IS (JSON), Internal Projects (JSON), Cross-Agency Projects (JSON), Performance Framework (JSON)
- **Part4Resources** — Year 1/2/3 cost breakdowns (JSON), Summary (JSON)

### Schema Drift Warning
Prisma migrations are drifted — several columns were added directly via `better-sqlite3`:
- `Part2Assessment.networkDiagrams` — added via `ALTER TABLE` (see `prisma/seed.js` comment)
- `Part4Resources.summary`, `createdAt`, `updatedAt` — added via `scripts/migrate-part4-columns.js`

**Do NOT run `npx prisma migrate dev`** — it will prompt to reset the DB.

---

## Architecture Decisions

### Base UI Button with anchor tags
```tsx
<Button nativeButton={false} render={<a href="/some/path" />}>Label</Button>
```

### JSON field deep-merge (critical)
```tsx
const controls = {
  physical:  { ...DEFAULT_CYBER.physical,  ...saved.physical },
  perimeter: { ...DEFAULT_CYBER.perimeter, ...saved.perimeter },
  // ... all groups
};
```

### IS → Project → Budget flow
1. Part III-D: Define Proposed IS
2. Part III-E: Create ICT Projects (link to IS from D)
3. Part III-F: Performance Framework (one KPI table per project)
4. Part IV: Budget tables keyed by project ID from Part III-E

### Part IV section lettering
```
A = Office Productivity
B, C, D, … = Internal ICT Projects (one letter each)
Next = Cross-Agency ICT Projects (one letter each)
Last = Continuing / Recurring Costs
```
Via `alpha(n) = String.fromCharCode(65 + n)` in `part4-year-form.tsx`.

---

## Key Commands

```bash
npm run dev                         # Start dev server
npx tsc --noEmit                   # Type check
npx prisma generate                # Regenerate Prisma client after schema changes
node prisma/seed.js                # Reseed (wipes and recreates NCWTR data)
node scripts/backfill-parts.js     # Backfill missing Part records
```

---

## Seed Data (NCWTR)

**Agency:** National Commission on Waiting Time Reduction (NCWTR), NGA  
**Scope:** `AGENCY_WITH_REGIONAL` (central + 17 regional + 3 field offices)

| Email | Password | Role |
|-------|----------|------|
| admin@ncwtr.gov.ph | password123 | ADMIN |
| cio@ncwtr.gov.ph | password123 | CIO |
| focal@ncwtr.gov.ph | password123 | FOCAL |

**ICT Projects:** SIKAP (₱24.5M), BILIS (₱9.8M), HANDA (₱4.2M)  
**Proposed IS:** UQMP, CFCP, iHRPS  
**Existing IS:** NQMS (Windows XP/VB6), eCLAS (fax machines), ROMS (17 regional instances), AHRIS (47 Excel workbooks)
