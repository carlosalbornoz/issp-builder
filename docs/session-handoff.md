# ISSP Builder — Session Handoff & Continuation Guide

> **Last updated:** 2026-05-24 (session 9 — diagram upload complete)  
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
| D | Save to File + Load from File UX + `unsavedToFile` tracking + save reminder nudge + `beforeunload` warning | ✅ Done |
| E | Diagram upload UI — Part II-B, Part III-A, Part III-B store base64 data URLs locally | ✅ Done |
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
| Font (display) | **Fraunces** (opsz variable) via `next/font/google` → `--font-display` | Headings, part titles, doc title |
| Font (UI) | **IBM Plex Sans** (400/500/600) via `next/font/google` → `--font-sans` | Body, labels, UI chrome |
| Font (mono) | **IBM Plex Mono** (400/500) via `next/font/google` → `--font-mono` | Code, UACS fields |
| Font (PDF) | **P052** (URW Palladio, Palatino clone) | Installed via `apt-get install fonts-urw-base35` |
| PDF | **Puppeteer** | 25.0.2; Chrome 148.0.7778.167 at `/root/.cache/puppeteer/chrome/...` |
| PDF merge | pdf-lib | — |

---

## 3. UI Refresh (Branch: `ui-refresh`) — Core Refresh Done

Full implementation plan: `docs/ui-refresh-plan.md`. Design mockups: `references/design_upgrade/`.

### Phases complete

| Phase | Work | Status |
|---|---|---|
| 0 | Reconnaissance — `docs/ui-recon-notes.md` | ✅ Done |
| 1 | Data model — `sectionMeta`, `planStatus`, `submissionTarget`, `schemaVersion` | ✅ Done |
| 2 | Shared primitives — `StatusDot`, `RelativeTime`, `CompletionBar`, `PlanStatusPill` | ✅ Done |
| 3 | Font + color tokens — Fraunces / IBM Plex Sans / IBM Plex Mono; warm palette | ✅ Done |
| 4 | Overview redesign — dashboard with status, completion bar, continue card, part cards | ✅ Done |
| 5 | Sidebar refinements — status dots on all leaf nav items, kebab menu, save status | ✅ Done |
| 5b | `SaveStatusIndicator` removed from all 14 Part I–IV forms — sidebar is sole save indicator | ✅ Done |
| 6 | SectionShell — shared section chrome, MarkAsDone, 18-section migration | ✅ Done |
| 6b | Phase 6 bug fixes — E.1/E.2 header label; `lastEditedAt` now set on content save (not visit); sidebar save status and button improvements | ✅ Done |
| 7 | Unsaved changes — content snapshot + field diff | ✅ Done 2026-05-23 |
| 7b | Mobile editor shell — fixed drawer sidebar on mobile; desktop sidebar remains static/collapsible | ✅ Done 2026-05-23 |
| 7c | Theme system — System/Warm light/dark themes, theme menu, contrast pass | ✅ Done 2026-05-24 |
| 8 | Theme contrast audit + fixes — semantic tokens, all hardcoded green/amber/blue colors replaced | ✅ Done 2026-05-24 |
| 9 | Section body patterns | 🔜 Deferred |

### Session 7c — Theme system + contrast pass (2026-05-24)

Full plan and implementation notes: `docs/design-refresh/theme-system-plan.md`.

**Theme architecture**

Implemented four root-level theme classes in `src/app/globals.css`:

| ID | Label | Notes |
|---|---|---|
| `system-light` | System Light | Default theme. White system palette, system sans body/display. |
| `system-dark` | System Dark | OLED black system palette, system sans body/display. |
| `warm-light` | Warm Light | Existing warm UI refresh palette. |
| `warm-dark` | Warm Dark | Warm brown dark palette. |

`src/lib/theme.tsx` now owns `THEMES`, `DEFAULT_THEME`, `ThemeProvider`, `useTheme()`, and `issp-theme` localStorage persistence. System themes use matching IDs and labels (`system-light` / System Light and `system-dark` / System Dark); the earlier draft `apple-*` IDs were removed before production release.

`src/app/layout.tsx` injects a synchronous inline script in `<head>` to apply the saved theme class before hydration. Fallback/default is `theme-system-light`. The root layout wraps the app in `ThemeProvider`.

**Theme controls**

Theme switching is in `src/components/editor/editor-sidebar.tsx`:
- Desktop: kebab menu → Theme submenu with radio items.
- Mobile: compact sidebar footer has a single palette icon button opening the theme list.
- Order: System Light, System Dark, separator, Warm Light, Warm Dark.
- Removed the earlier swatch-footer/Properties-dialog placement.

**Part colors**

`src/lib/sections.ts` now returns `var(--part-1)` through `var(--part-4)` instead of fixed hex values. Each theme defines its own part accents.

**Sidebar save/download behavior**

The main sidebar file action now reflects file-save state:
- Disabled `No changes to save` when `unsavedToFile === false`
- Enabled `Save changes` when `unsavedToFile === true`
- Manual `Download .issp` remains in the kebab menu

**Control contrast cleanup**

Several controls looked disabled under System themes because they used transparent backgrounds or old low-contrast tokens. The following were updated:
- `src/components/ui/button.tsx`: outline variant now uses `bg-card`, `text-foreground`, `border-border`, `hover:bg-accent`.
- `src/components/ui/input.tsx`, `textarea.tsx`, `select.tsx`: enabled controls now use card surfaces and explicit foreground text; disabled styles are visually distinct.
- Inline table controls in Part I-B, Part I-C, Part III-C, Part III-F, Part IV, and the Part II-B diagram title field now use `bg-card/70` with hover/focus card backgrounds.
- Custom controls in UACS combobox and legacy ISSP overview/layout links were made theme-aware.

**Verification run during implementation**

Repeated targeted checks passed after the changes:
- `npx tsc --noEmit`
- Targeted ESLint on changed files

Full `npm run build` was also run successfully once with network access for `next/font` Google font fetching. A sandboxed build fails without network because Next needs to fetch font CSS.

### Session 6 — Part IV refactor + read-only section pattern (2026-05-24)

**`part4-aggregations.ts` — shared data layer extracted**

All aggregation logic that was copy-pasted identically in both `editor/part4/summary/page.tsx` and `dashboard/.../part4/summary/page.tsx` (≈130 lines each) is now in one place:

| Symbol | Exported from |
|---|---|
| `SummaryRow`, `UacsRow`, `Part4SummaryData` | `part4-aggregations.ts` |
| `lineTotal`, `sumLines`, `yearTotal` | `part4-aggregations.ts` |
| `buildB1`, `buildB2`, `buildB3`, `buildB4` | `part4-aggregations.ts` |
| `FUND_SOURCE_ORDER` | `part4-aggregations.ts` |

`part4-summary.tsx` re-exports the three types for backward compat. Both pages now import build functions from the shared module.

**`SectionShell` — `hideMarkDone` prop**

```tsx
<SectionShell hideMarkDone ...>
```

Suppresses the "Mark as done" button from the section footer. Use for computed/read-only sections that have no user inputs. Currently used by `Part4Summary`.

**`SectionDef.readOnly` — sections excluded from status tracking**

```typescript
// sections.ts
{ id: "part4/summary", label: "Summary of Investments", href: "...", readOnly: true }
```

When `readOnly: true`:
- `computePartStatus` skips the section (Part IV dot reflects only the 3 year forms)
- `StatusDot` is not rendered in the sidebar, overview (`part-card.tsx`), or the `SectionShell` sticky header
- "Mark as done" button is automatically suppressed (via `hideMarkDone` on the component)

Reusable for any future computed/summary section.

### Design tokens (warm palette — `src/app/globals.css`)

| Token | Value | Used for |
|---|---|---|
| `--background` | `#FAFAF7` | Page background |
| `--card` | `#FFFFFF` | Card / popover surfaces |
| `--secondary` | `#F2F1EC` | Sidebar background |
| `--accent` | `#EAE8E1` | Hover states |
| `--border` | `#E5E3DC` | All borders |
| `--foreground` | `#18181B` | Primary text |
| `--muted-foreground` | `#52525B` | Secondary text |
| `--primary` | `#18181B` | Primary buttons |
| Active item (sidebar) | `#D4D2C9` | Selected nav items |

### Part colors (from `src/lib/sections.ts`)

| Part | Hex | Use |
|---|---|---|
| I | `#2563EB` | Left strip, status accents |
| II | `#C2680C` | Left strip, status accents |
| III | `#15803D` | Left strip, status accents |
| IV | `#6D28D9` | Left strip, status accents |

### New files added in UI refresh

| File | Purpose |
|---|---|
| `src/lib/sections.ts` | Single source of truth: `PARTS`, `ALL_SECTIONS`, `TOTAL_SECTIONS`, `computeStatus()`, `computePartStatus()`, `findContinueTarget()` |
| `src/components/ui/status-dot.tsx` | 7px colored circle: green=done, amber=in_progress, gray=empty |
| `src/components/ui/relative-time.tsx` | Compact relative timestamps: `1m`, `3h`, `2d`; `—` for null |
| `src/components/ui/completion-bar.tsx` | 4px green fill bar + optional `N% · X of Y` label |
| `src/components/ui/plan-status-pill.tsx` | Draft/For review/Submitted colored pill |
| `src/components/editor/overview/plan-metadata-strip.tsx` | Agency pill + period + plan status + deadline (right-aligned) |
| `src/components/editor/overview/overview-header.tsx` | Doc title (Fraunces 3xl) + completion bar |
| `src/components/editor/overview/continue-editing-card.tsx` | Blue info card — routes to last-edited section or Part I/A |
| `src/components/editor/overview/part-card.tsx` | 3px color strip + section list with StatusDot + RelativeTime |
| `src/components/editor/editor-mobile-sidebar-context.tsx` | Mobile drawer toggle context used by Overview and SectionShell menu buttons |

### `sectionMeta` and status model

`IsspDocument.sectionMeta` is a `Record<string, SectionMeta>` keyed by section ID (e.g. `"part1/a"`, `"part4/year1"`).

```typescript
interface SectionMeta {
  userMarkedDone: boolean;   // set by MarkAsDone button (Phase 6)
  lastEditedAt: string | null; // ISO string; set by useLocalSave on every content save
}

// Derived status (never stored):
// "done"        → userMarkedDone === true
// "in_progress" → lastEditedAt !== null
// "empty"       → no metadata OR lastEditedAt === null
```

**`lastEditedAt` is set on content save, not on visit.** `useLocalSave(part, sectionId)` calls `updateSectionMeta(sectionId, { lastEditedAt: now })` inside `debouncedSave`, so the status dot only advances when the user actually edits a field. Just opening a section without typing does not mark it `in_progress`.

**Content-sniffing migration** (`deriveMetaFromContent` in `src/lib/store/index.tsx`): runs on every document load (IDB + file). For each section with no `lastEditedAt`, checks whether the section has non-default content and pre-sets `lastEditedAt = doc.updatedAt`. This ensures imported/existing `.issp` files show meaningful status on the Overview immediately.

---

## 4. Local-First Architecture

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
fileSavedAt: string | null        // ISO string; null = never saved to file this session
savedSnapshot: IsspDocument | null // in-memory copy of doc at last saveToFile/loadFromFile; null on fresh page load
unsavedToFile: boolean            // content-hash diff vs savedSnapshot; falls back to timestamp on fresh load

update(patcher)                   // debounced: patches doc + saves to IDB
saveToFile()                      // downloads .issp + updates fileSavedAt + savedSnapshot
loadFromFile(file)                // reads .issp file → loads into IDB + state + sets savedSnapshot
createNew(opts)                   // creates blank doc → saves to IDB + sets savedSnapshot
clearDoc()                        // clears IDB + resets state + clears savedSnapshot
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
  schemaVersion?: number;  // 2 = current; absent/1 = legacy; migrated on load
  title: string;
  startYear: number; endYear: number;
  amendmentNumber: number;
  scope: IsspScope;
  agency: AgencyInfo;   // includes logoBase64: string | null
  planStatus?: "draft" | "for_review" | "submitted";  // default "draft"
  submissionTarget?: { agency: string; deadline: string | null };  // default DICT/null
  sectionMeta?: Record<string, { userMarkedDone: boolean; lastEditedAt: string | null }>;
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
| `src/components/editor/editor-shell.tsx` | Checks `loading`/`doc`; registers `beforeunload`; owns desktop collapsed state + mobile drawer open state |
| `src/components/editor/editor-mobile-sidebar-context.tsx` | Provides `openMobileSidebar()` to Overview and SectionShell without threading props through every form |
| `src/components/editor/editor-sidebar.tsx` | Desktop collapsible sidebar; mobile fixed drawer overlay; "ISSP Builder" label; Save to File footer; Exit Editor link |
| `src/hooks/use-file-save-reminder.ts` | Sets a 10-min timer for the inline sidebar save reminder nudge; snoozes another 10 minutes when dismissed |

**Mobile sidebar behavior:** On mobile, the sidebar is fixed (`h-dvh`) and slides over the editor content with a backdrop. It is not a flex sibling, so the page has one primary scroll surface. The menu button is exposed in the Overview header and the SectionShell breadcrumb. On desktop, the same sidebar remains a normal flex child and can still collapse to the 48px rail.

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
- 10-min inline save reminder nudge in the editor sidebar
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

### ⚠️ ALWAYS prefix static asset paths with `NEXT_PUBLIC_BASE_PATH`

The app is deployed at `/issp` (set via `NEXT_PUBLIC_BASE_PATH="/issp"` in `.env.production`). Any hardcoded absolute path that doesn't include this prefix will **silently 404 or fail** in production while working fine in local dev.

**Rule: every `fetch()`, `<a href>`, `<img src>`, or any other absolute path that references a file in `public/` must be written as:**

```ts
`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/your-file.json`
```

`NEXT_PUBLIC_BASE_PATH` is baked into client bundles at build time — it resolves to `/issp` in production and `""` in dev. Never hardcode `/issp` directly; always use the env var.

**Things that DO handle basePath automatically (no prefix needed):**
- `next/link` `<Link href="/some-page">` — Next.js prepends basePath automatically
- `useRouter().push("/some-page")` — same, router adds basePath
- `next/image` `<Image src="/...">` — handled by Next.js

**Things that do NOT handle basePath automatically (always add prefix):**
- `fetch("/some-file.json")` — plain browser fetch, knows nothing about basePath
- `<a href="/some-path">` — plain HTML anchor
- `window.location.href = "/..."` — direct browser navigation
- Any URL string passed to a third-party library

**Past bugs caused by missing this:**
- UACS combobox stuck on "Loading codes…" (`fetch("/uacs_active.min.json")`)
- UACS Explorer link 404ing (`<a href="/uacs">`)
- All editor nav buttons 404ing (`render={<a href="/editor/...">}`)



### Store update pattern (all form pages)
```tsx
const { doc, update } = useIsspStore();

// Update a part field:
update((prev) => ({
  ...prev,
  part2: { ...prev.part2, networkDescription: value },
}));
```

### `unsavedToFile` — how it works (content-hash-based)
```typescript
// savedSnapshot is set on saveToFile(), loadFromFile(), createNew(), clearDoc().
// It is NOT persisted to IDB — on a fresh page load it is null.
// docContentHash() strips updatedAt, exportedAt, and sectionMeta.lastEditedAt before comparing.

const unsavedToFile = !doc
  ? false
  : savedSnapshot
  ? docContentHash(doc) !== docContentHash(savedSnapshot)   // accurate: reverts clear the indicator
  : doc.updatedAt > (fileSavedAt ?? doc.createdAt);        // fallback on fresh page load (no snapshot yet)
```

`docContentHash` is defined in `src/lib/store/index.tsx`. It excludes implementation timestamps (`updatedAt`, `exportedAt`, `sectionMeta.lastEditedAt`) but keeps `sectionMeta.userMarkedDone` (intentional user state).

### Form init normalization — a hidden snapshot sync risk

Several forms transform `initialData` in their `useState` initializer before the first save:
- **Part I-C** — fills missing `stakeholder.id` via `crypto.randomUUID()`
- **Part II-A** — migrates `outcomeId` → `outcomeIds` array
- **Part III-C** — uppercases `employmentStatus`, renames `physicalCount→quantity`, fills missing `id`

If the stored file has the old format, the first `debouncedSave` after any edit writes the normalized values. Even after reverting the edit, the stored doc has normalized values ≠ snapshot (old values), causing a permanent false-positive "Unsaved changes".

**Fix (already applied):** `migrateLegacyDoc` normalizes these three patterns idempotently on every load. This ensures the snapshot already contains normalized data at the time it is captured, matching what the form will write. See the schema-change skill for the general rule.

### JSON field deep-merge — required for cybersecurity controls
```tsx
const controls = {
  physical:  { ...DEFAULT_CYBER.physical,  ...saved.physical },
  perimeter: { ...DEFAULT_CYBER.perimeter, ...saved.perimeter },
  // ... all groups
};
```

### Public route allowlist (`src/proxy.ts`)

`src/proxy.ts` is the Next.js 16 middleware (renamed from `middleware.ts`). Any route not explicitly allowed will be redirected to `/login` for unauthenticated users.

Current public routes:
```
/_next/static, /_next/image   — static assets (via matcher exclusion)
/favicon.ico, /uploads, /screenshots, /demo, /uacs  — static files (via matcher exclusion)
/opengraph-image, /twitter-image   — OG image routes
/api/*                        — all API routes
/editor, /editor/*            — local-first editor
/annex1, /annex1/*            — Annex 1 module
/uacs, /uacs/*                — UACS Explorer static HTML
/                             — landing page
/about, /privacy              — public editorial pages
```

**When adding a new public route** (static file, public page, or unauthenticated feature), add it to BOTH:
1. The `matcher` exclusion regex (for static files served from `public/`)
2. The explicit check in the proxy function body (for Next.js routes)

### Editor nav button pattern

All form nav buttons (Previous / Next at the bottom of every form page) use:
```tsx
const router = useRouter(); // from "next/navigation" — in the main exported component only

<Button onClick={() => router.push("/editor/part3/b")}>Next →</Button>
```

**Do NOT use** `render={<a href="...">}` (plain HTML anchor) or `nativeButton={false} render={<Link href="...">}` for these buttons. Both approaches bypass Next.js routing and fail to prepend the `/issp` basePath in production. The `useRouter().push()` call internally calls `addBasePath()` which correctly prepends `/issp`.

`useRouter()` must be called in the **main exported component function**, not in sub-components (e.g. `ProjectCard`, `SystemCard`, `SummaryTable`) that don't have nav buttons.

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
- Full sidebar: "ISSP Builder" label (header), collapsible nav sections, footer, save actions, kebab actions
- Collapsed sidebar: expand toggle and spacer only; Exit Editor was removed to reduce clutter
- Mobile: sidebar is a fixed left drawer (`h-dvh`, overlay backdrop) opened by the mobile menu buttons in `OverviewHeader` and `SectionShell`; clicking a nav link closes it
- **Nav** imports `PARTS` from `@/lib/sections` — single source of truth for section config; `NAV_SECTIONS` constant removed
- **Status dots**: every leaf nav item renders `<StatusDot>` computed from `doc.sectionMeta[section.id]`
- **Footer save status**: two states only — "Unsaved changes" (clickable, pulsing amber dot) / "Saved X ago" (green check). No "Saving…" spinner (IDB writes are near-instant; showing it then immediately "Unsaved changes" was confusing UX).
- **"Unsaved changes" is clickable**: toggles an inline list of changed sections computed via `getChangedFields()` (snapshot diff), each as a link with Part color prefix. Below each section link, an indented list of changed field labels (e.g. "Vision Statement", "IS Inventory") is shown when a snapshot is available. Falls back to `lastEditedAt`-based list (no field detail) on fresh browser load.
- **Save button turns teal** (`bg-teal-600`) when `unsavedToFile` is true; label switches "No changes to save" ↔ "Save changes"
- **Kebab menu (⋮)** next to the save button: Download .issp · Load different ISSP… (hidden `<input type=file>`) · Theme submenu · separator · Clear editor data…
- **Theme discovery callout**: desktop-only floating callout points at the kebab for users still on `system-light`; opening the kebab highlights the Theme submenu trigger with an info-token pulse/ring; selecting a theme or dismissing the callout stores `issp-theme-nudge-dismissed` in `localStorage`
- **Clear editor data flow**: inline two-step confirmation in the footer. Step 1 explains browser deletion and offers `Save .issp file` when unsaved changes exist; Step 2 is the irreversible `Delete permanently` danger gate.
- "Start Over / Load Different ISSP" button at top of sidebar is gone; destructive actions now require two clicks via the kebab
- Background: `bg-secondary` (`#F2F1EC`); selected nav items: `bg-[#D4D2C9]`

### `src/components/issp-editor/uacs-combobox.tsx`
- Props: `value`, `onChange(uacs, label)`, `context: "co" | "mooe" | "all"`, `placeholder`
- Lazy-loads `/uacs_active.min.json` on first open

### `src/components/issp-editor/part4/part4-aggregations.ts`
Pure data layer — no React imports, safe to use in both client and server components.
- **Types:** `SummaryRow`, `UacsRow`, `Part4SummaryData`
- **Low-level:** `lineTotal`, `sumLines`, `yearTotal`, `FUND_SOURCE_ORDER`
- **Build functions:** `buildB1` (category summary), `buildB2` (by fund source), `buildB3` (CO/MOOE), `buildB4` (UACS object of expenditure)
- Both the local-first editor page (`src/app/editor/part4/summary/page.tsx`) and the server-side dashboard page (`src/app/(dashboard)/dashboard/documents/[id]/part4/summary/page.tsx`) import from here.

### `src/components/issp-editor/part4/part4-year-form.tsx`
- Dynamic section lettering via `alpha(n)`
- Exports `YearBudget`, `LineItem`, `ProjectBudget` types (re-exported from store types)
- **Drawer pattern (UX rewrite):** line items are a compact list (description + total + pencil icon on hover); clicking opens a `Sheet` right-panel (`LineItemDrawer`) with all fields laid out at full width
  - `LineItemDrawer` props: `open`, `item`, `isNew`, `context: "co" | "mooe"`, `onSave`, `onDelete`, `onClose`
  - Drawer title: "Add/Edit Line Item — Capital Outlay" or "Add/Edit Line Item — Maintenance & Other Operating Expenses"
  - Drawer description: accurate CO/MOOE descriptions sourced from ISSP Guidelines (MOOE is not defined by peso threshold — it's recurring costs/subscriptions/consumables)
- **`SectionCard`:** 3px absolute-positioned colored left strip; `color` prop takes hex string; no more Tailwind colorClass
- **`LineTable`:** header title row and item list share one bordered container; header band is `bg-muted/40`; subtotal row is `bg-muted/50 font-semibold`
- **Legend strip** in sticky header: colored squares (matching card strips) + "Legend:" label; CO/MOOE badge chips removed (title already spells them out)
- No more `ColumnWidths`, column resizing, or `localStorage` col-width cache
- No `SaveStatusIndicator` (removed; sidebar is sole status source)

---

## 9. Demo File (`public/demo/ncwtr-issp-2026-2028.issp`)

**Agency:** National Commission on Waiting Time Reduction (NCWTR), NGA  
**Scope:** `AGENCY_WITH_REGIONAL` (central + 17 regional + 3 field offices)  
**Period:** 2026–2028  
**Projects:** SIKAP (₱24.5M), BILIS (₱9.8M), HANDA (₱4.2M)  
**Proposed IS:** UQMP, CFCP, iHRPS  
**Existing IS:** NQMS (Windows XP/VB6), eCLAS (fax machines), ROMS (17 instances), AHRIS (47 Excel workbooks), LIPAD (G2G, cloud, outsourced — pilot)

The file is downloadable from the editor splash screen: "Download NCWTR demo file".

> **Important:** The demo file is hand-maintained JSON — it is NOT regenerated from the seed DB. Edit `public/demo/ncwtr-issp-2026-2028.issp` directly. All field names must match what the editor form components actually read (see `src/lib/store/types.ts`). Key things that have broken before:
> - `physicalCount` was renamed to `quantity` in Part III-C — the file now uses `quantity`
> - IS `interoperability` is an object `{integrated, internalSystems, externalSystems, ...}` not `{hasInteroperability, systems}`
> - IS/proposed system enum values must be code values (e.g. `"G2G"` not `"Government-to-Government"`)
> - Performance framework rows use `responsibleUnit` not `responsibility`
> - `projectCategory` not `projectType` for project classification in Part III-F

---

## 10. Pending / Next Session Work

### ✅ UI Refresh — Phase 6 (SectionShell) — DONE
Extracted shared section chrome into `SectionShell` at `src/components/editor/section-shell.tsx`. All 18 editors migrated.
- Breadcrumb (Overview → Part → Section), sticky section header with `StatusDot`, title (Fraunces), description
- `MarkAsDone` toggle: outlined/filled-green; writes `userMarkedDone` to `sectionMeta` → updates sidebar dot + Overview live
- `SectionNavLink` prev/next across all 18 sections; last section shows "Return to Overview"
- `statBlock` prop renders optional top-right stat (used by Part IV year forms to show Year Total)
- `hideMarkDone` prop suppresses the "Mark as done" footer button — use for computed/read-only sections
- `Callout` component created at `src/components/ui/callout.tsx` (info/tip/warning/danger variants)

**Phase 6b fixes (session 3):**
- E.1/E.2 header sub-label: `split(".")[0]` → regex `match(/^[A-Z][\d.]*/)`; now shows "Part III · E.1" correctly
- `lastEditedAt` moved from SectionShell mount effect → `useLocalSave` `debouncedSave`; all 14 form files updated to pass `sectionId`; visiting a section no longer marks it `in_progress`
- Sidebar: "Saving…" spinner removed; "Unsaved changes" now clickable (shows changed sections inline); Save button turns amber when unsaved

### ✅ Part IV — Budget form UX rewrite (drawer pattern) — DONE
Replaced 7-column inline spreadsheet with master list + `Sheet` drawer pattern. See Components Reference → `part4-year-form.tsx` for full details.

### ✅ Unsaved Changes — Content Snapshot + Field Diff — DONE (session 4)
**Plan + implementation notes:** `docs/unsaved-changes-tracking-plan.md`

Implemented:
- `savedSnapshot: IsspDocument | null` in store — set on `saveToFile`, `loadFromFile`, `createNew`, cleared on `clearDoc`
- `docContentHash()` in `src/lib/store/index.tsx` — strips implementation timestamps before comparing
- `src/lib/section-fields.ts` — new file: `SECTION_FIELDS` map (all 18 sections), `getChangedFields()`
- Sidebar: snapshot-based section diff with field-level label list; falls back to `lastEditedAt` on fresh browser load
- `migrateLegacyDoc` normalization for `stakeholders`, `strategicConcerns`, `proposedHumanCapital` — prevents false-positive diffs caused by form init normalization
- Save button: amber → teal; 10-min reminder moved from Sonner toast to a bouncing/shimmering sidebar nudge

### ✅ Mobile Editor Sidebar — DONE (session 5)
Implemented a mobile drawer pattern for the editor sidebar:
- `EditorShell` owns `mobileSidebarOpen` separately from desktop `sidebarCollapsed`
- `EditorSidebar` renders as a fixed overlay drawer on mobile and as a static/collapsible flex child on desktop
- `editor-mobile-sidebar-context.tsx` exposes `openMobileSidebar()` to `OverviewHeader` and `SectionShell`
- Drawer closes on backdrop click and after mobile nav link clicks
- Verified with Puppeteer at 390×844: closed drawer `x=-288`, open drawer `x=0`, closes after section navigation; desktop expanded/collapsed remains 288px/48px

### ✅ Theme Contrast Audit + Fixes — DONE (session 8, 2026-05-24)

**Root causes fixed:**
1. **Dead `dark:` prefixes** — Theme system uses `theme-*` classes on `<html>`, never the Tailwind `dark` class. All `dark:` rules in `callout.tsx` were inert. Replaced with semantic token classes.
2. **Hardcoded semantic colors** — Green/amber/blue Tailwind literals had no dark-theme counterparts, causing unreadable text in `warm-dark` and `system-dark`.

**Also fixed:** `ContentModal` in `home-page-client.tsx` opened scrolled partway down. Root cause: Base UI dialog focuses the first focusable element (a link mid-prose), scrolling the container. Fixed with a zero-size `tabIndex={0}` focus sentinel at the top of the scroll container + `useRef`/`useEffect` scroll reset.

**Semantic color token system** — New CSS custom properties added to all four theme classes in `globals.css` and mapped to Tailwind via `@theme inline`:

| Token | Light value | Dark value |
|---|---|---|
| `--success` | `#15803D` (green-700) | `#4ade80` / `#30D158` |
| `--success-bg` | `#f0fdf4` | dark tinted surface |
| `--success-border` | `#bbf7d0` | dark tinted border |
| `--success-foreground` | `#ffffff` | `#052e16` / `#001a08` |
| `--warning` | `#b45309` (amber-700) | `#fbbf24` / `#FF9F0A` |
| `--warning-bg` | `#fffbeb` | dark tinted surface |
| `--warning-border` | `#fde68a` | dark tinted border |
| `--info` | `#1d4ed8` (blue-700) | `#60a5fa` / `#0A84FF` |
| `--info-bg` | `#eff6ff` | dark tinted surface |
| `--info-border` | `#bfdbfe` | dark tinted border |
| `--danger-bg` | `#fef2f2` | `#1f0a0a` |
| `--danger-border` | `#fecaca` | `#3f1515` |

Tailwind utility classes available: `text-success`, `bg-success`, `bg-success-bg`, `border-success-border`, `text-success-foreground`, and equivalents for `warning`, `info`, `danger-bg`, `danger-border`.

**Files changed:**

| File | What changed |
|---|---|
| `src/app/globals.css` | Semantic tokens in all 4 theme classes; `@theme inline` mappings; `prose-article` + `prose-disclaimer` converted from hardcoded hex to CSS vars |
| `src/components/ui/callout.tsx` | All 4 variants — `dark:` dead code removed, token classes applied |
| `src/components/ui/status-dot.tsx` | `done` → `bg-success`; `in_progress` → `bg-warning`; `empty` → `bg-muted-foreground/30` |
| `src/components/ui/completion-bar.tsx` | Fill → `bg-success`; track → `bg-border` |
| `src/components/ui/plan-status-pill.tsx` | All 3 pill states → semantic tokens |
| `src/components/editor/editor-sidebar.tsx` | Both "Saved" text spots → `text-success` |
| `src/components/editor/section-shell.tsx` | MarkAsDone button active state → `bg-success text-success-foreground` |
| `src/components/issp-editor/part1/part1-c-form.tsx` | Blue info box + complexity badge colors |
| `src/components/issp-editor/part2/part2-a-form.tsx` | Amber info box |
| `src/components/issp-editor/part2/part2-c-form.tsx` | Service type badge colors + frontline/data stat counts |
| `src/components/issp-editor/part2/part2-d-form.tsx` | Blue LGU note + status option icon colors + utilizing/proposed/not-utilizing stats |
| `src/components/issp-editor/part3/part3-a-form.tsx` | Objective type badge |
| `src/components/issp-editor/part3/part3-b-form.tsx` | Green info box |
| `src/components/issp-editor/part3/part3-d-form.tsx` | System status badges + "has project" chip + blue nudge row + green tip box + stat counts |
| `src/components/issp-editor/part3/part3-e1-form.tsx` | Linked-IS chip + total cost stat |
| `src/components/issp-editor/part4/part4-summary.tsx` | Consistency banner (green/amber) |
| `src/components/issp-editor/uacs-combobox.tsx` | ICT group header label |
| `src/components/home/home-page-client.tsx` | ContentModal focus sentinel + scroll reset |

**Intentionally left alone:**
- Landing page CTA section (`background: #1C1C1E`) — always-dark brand section by design
- About/Privacy hero headers (`#0038A8`, `#111827`) — brand colors, intentional
- Landing page `PART_COLORS` array + "Live Now" badge — decorative only
- Dashboard-route files — dormant server-auth screens, unreachable in local-first mode
- `issp-editor-layout.tsx`, `issp-overview-content.tsx` — replaced/dormant old editor
- shadcn primitive `dark:` variants (`button.tsx`, `tabs.tsx`, etc.) — affect only hover/focus/invalid micro-states; base token styling is functional

### 🟡 Validation & Review (post UI refresh)
- **Pre-export validation** — required fields, budget-IS linkage, KPI completeness. Client-side, runs before PDF export. Surface issue count per section in the sidebar/overview.
- **Read-only review mode** — full document view (all parts on one scrollable page or tabbed), useful before submission.
- **Mobile-responsive QA** — shell/navigation is now mobile-friendly; dense form bodies and Part IV drawer interactions still need targeted QA before declaring mobile fully supported.

### ✅ Phase E — Diagram Upload (base64 client-side) — DONE
Diagram upload is implemented for Part II-B existing network diagrams, Part III-A proposed network diagram, and Part III-B enterprise architecture diagram.

**Architecture:** File input → read as base64 data URL → store in IndexedDB (`doc.part2.networkDiagrams[].dataUrl`, `doc.part3.proposedNetworkDataUrl`, `doc.part3.enterpriseArchDataUrl`). No server upload. The PDF export maps these fields and embeds the images inline in Part II/III.

### 🔴 Annex 1 — ICT Asset Inventory
Standalone public module at `/annex1`. Full plan in `docs/annex1-implementation-plan.md`.

### 🔵 PDF — Known Remaining Gaps
- TOC page numbers are static (hardcoded) — no two-pass render
- Network/proposed network/enterprise architecture diagrams render inline (not full-page each)

---

## 11. Custom Skills (`.claude/skills/`)

Project-level Claude Code skills — invoked with `/skill-name` or auto-loaded by Claude when the description matches.

| Skill | Path | Invocation | Purpose |
|---|---|---|---|
| `schema-change` | `.claude/skills/schema-change/SKILL.md` | Auto + `/schema-change` | Standardized 13-step checklist for any IDB/JSON or Prisma schema change — ensures types, defaults, migration, forms, pages, demo file, PDF export, `SECTION_FIELDS`, and docs all stay in sync. Includes backward compat strategies A/B/C and a pitfall table covering form-init normalization. |

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

### Production deployment (apps.carlosanton.io/issp)

> ⚠️ **Always kill the stale process before restarting.** Skipping step 2 is the #1 cause of "fix deployed but nothing changed" — pm2 silently fails with `EADDRINUSE`, the new process dies immediately, and the old pre-build code keeps serving. `pm2 status` shows "online" (for the sh wrapper) so it looks fine, but `ss` reveals the actual listening pid hasn't changed.

```bash
# 1. Build
npm run build

# 2. Kill the old next-server process (do this every time, no exceptions)
ss -tlnp | grep 3100
kill <pid shown above>

# 3. Restart pm2
pm2 restart issp --update-env
```

One-liner for step 2+3 (safe to run even if no stale process exists):
```bash
ss -tlnp | grep 3100 | grep -oP 'pid=\K[0-9]+' | xargs -r kill; sleep 0.5; pm2 restart issp --update-env
```

`NEXT_PUBLIC_BASE_PATH="/issp"` is in `.env.production` and is baked into client bundles at build time — no need to set it in pm2 env.

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
│   │   ├── page.tsx                   ← Splash + Overview dashboard (UI refresh Phase 4)
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
│   │   ├── editor-sidebar.tsx         ← Desktop collapsible nav + mobile drawer; StatusDot leaf items; kebab menu
│   │   ├── editor-mobile-sidebar-context.tsx ← Mobile drawer toggle context
│   │   └── overview/                  ← UI refresh Phase 4 components
│   │       ├── plan-metadata-strip.tsx  ← Agency pill + period + status + deadline
│   │       ├── overview-header.tsx      ← Doc title (Fraunces) + CompletionBar
│   │       ├── continue-editing-card.tsx ← Blue info card → last-edited section
│   │       └── part-card.tsx            ← 3px strip + section list with dots
│   ├── ui/                            ← shadcn/ui + UI refresh primitives
│   │   ├── status-dot.tsx             ← 7px circle: done/in_progress/empty
│   │   ├── relative-time.tsx          ← Compact relative timestamps
│   │   ├── completion-bar.tsx         ← 4px green fill bar
│   │   └── plan-status-pill.tsx       ← Draft/For review/Submitted pill
│   └── issp-editor/                   ← All Part I–IV form components
│       ├── part1/{a,b,c}-form.tsx
│       ├── part2/{a,b,c,d}-form.tsx
│       ├── part3/{a,b,c,d,e1,e2,f}-form.tsx
│       └── part4/
│           ├── part4-year-form.tsx       ← dynamic alpha() lettering; exports LineItem/YearBudget/ProjectBudget types
│           ├── part4-aggregations.ts     ← shared data layer: types + build functions (no React)
│           └── part4-summary.tsx         ← B.1–B.4 read-only display; imports from part4-aggregations
├── hooks/
│   ├── use-file-save-reminder.ts      ← 10-min sidebar nudge timer
│   └── use-local-save.ts
└── lib/
    ├── sections.ts                    ← PARTS, ALL_SECTIONS, computeStatus(), findContinueTarget(); SectionDef.readOnly flag
    ├── section-fields.ts              ← SECTION_FIELDS map, getChangedFields() — powers sidebar field-level diff
    ├── store/
    │   ├── index.tsx                  ← IsspStore context + migrateLegacyDoc + deriveMetaFromContent
    │   ├── types.ts                   ← IsspDocument + all sub-types + SectionMeta/SectionStatus
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
