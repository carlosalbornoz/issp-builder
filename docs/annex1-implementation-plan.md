# Annex 1 — ICT Asset Inventory: Implementation Plan

> **Status:** Historical draft — not yet implemented  
> **Last updated:** 2026-06-19  
> **Reference:** `references/ISSP_Guidelines_2026.md` §ANNEX 1, `references/[Reference] ANNEX 1 - Existing ICT Resource Inventory.pdf`
>
> **Important:** This plan predates the completed local-first cutover and still contains older references to `/dashboard`, Prisma, `/api/issp`, and `src/proxy.ts` later in the file. Do not implement those parts as written. Before building Annex 1, refresh this plan against `docs/project-status.md` and keep the design local-first only.

---

## Architecture Overview

Annex 1 is a **standalone public module** — separate from the main ISSP editor entirely. It is designed to be used by regional and field offices independently, with no account required. They fill in their inventory, export a `.issp` file with `fileType: "annex1"`, and hand that file to the main ISSP editor (the CIO / central office), who consolidates it before the final PDF export.

```
Regional Office → fills /annex1 module → exports NCWTR-RO-NCR.issp (fileType: "annex1")
Field Office    → fills /annex1 module → exports NCWTR-FO-NCR-UPDiliman.issp (fileType: "annex1")
Central Office  → fills /annex1 module → exports NCWTR-CO.issp (fileType: "annex1")
                                                           ↓
CIO opens main ISSP editor → Annexes section → attaches all 3 .issp annex files
                                                           ↓
Final PDF export → consolidated Annex 1 section with per-office breakdown + aggregate totals
```

This architecture:
- Gives every office (even those without accounts) access to fill in their portion
- Keeps inventory data local — offices only share their file, not a server account
- Makes consolidation explicit and controlled — the CIO decides what gets attached
- Is naturally local-first from day one (aligned with the privacy-first rearchitecture plan)

---

## `.issp` File Type System

The current `.issp` format has no `fileType` field — it is implicitly a main ISSP document. Adding `fileType` disambiguates the format for loaders, validators, and the consolidation UI.

### Updated `.issp` envelope

```json
{
  "version": "1.0",
  "fileType": "issp-main",
  "exportedAt": "2026-05-17T10:30:00Z",
  "tool": "issp-platform",
  "document": { ... }
}
```

### `fileType` values

| Value | Description |
|---|---|
| `"issp-main"` | Main ISSP document (Parts I–IV). Created in the main editor. |
| `"annex1"` | ICT Asset Inventory. Created in the Annex 1 standalone module. |
| `"annex2"` | DRBCP for ICT Resources. Created in the Annex 2 module (future). |

Existing `.issp` files without a `fileType` field are treated as `"issp-main"` for backward compatibility.

### Annex 1 file structure

```json
{
  "version": "1.0",
  "fileType": "annex1",
  "exportedAt": "2026-05-17T10:30:00Z",
  "tool": "issp-platform",
  "office": {
    "type": "regional",
    "region": "NCR",
    "name": "CSC Regional Office - NCR",
    "displayLabel": "CSC Regional Office - NCR"
  },
  "annex1": {
    "equipment": [ ... ],
    "software": [ ... ]
  }
}
```

For field offices:

```json
{
  "office": {
    "type": "field",
    "region": "NCR",
    "parentRegion": "NCR",
    "name": "UP Diliman Field Office",
    "displayLabel": "CSC Regional Office - NCR › UP Diliman FO"
  }
}
```

For central office:

```json
{
  "office": {
    "type": "central",
    "name": "Central Office",
    "displayLabel": "Central Office"
  }
}
```

---

## Office Type & Hierarchy

The first screen of the Annex 1 module asks the user to identify their office. This drives the `office` metadata in the exported file and the labels in the consolidated PDF.

### Office types

| Type | Selection flow |
|---|---|
| **Central Office** | No further selection needed |
| **Regional Office** | Select region from Philippine regions dropdown |
| **Field Office** | Select parent region → enter descriptive name (text input) |

### Philippine regions dropdown

Standard PSA/PAGASA region codes and names:

| Code | Name |
|---|---|
| NCR | National Capital Region |
| CAR | Cordillera Administrative Region |
| Region I | Ilocos Region |
| Region II | Cagayan Valley |
| Region III | Central Luzon |
| Region IV-A | CALABARZON |
| Region IV-B | MIMAROPA |
| Region V | Bicol Region |
| Region VI | Western Visayas |
| Region VII | Central Visayas |
| Region VIII | Eastern Visayas |
| Region IX | Zamboanga Peninsula |
| Region X | Northern Mindanao |
| Region XI | Davao Region |
| Region XII | SOCCSKSARGEN |
| Region XIII | Caraga |
| BARMM | Bangsamoro Autonomous Region in Muslim Mindanao |

### Field office name input

Free-text input with placeholder: *"e.g. UP Diliman Field Office"*. This is the user's own descriptive name for their office — not a dropdown. It forms the `name` field in the `office` object and appears in the consolidated PDF under the parent regional office heading.

---

## Standalone Module: Routes & Auth

| Route | Description | Auth |
|---|---|---|
| `/annex1` | Landing / start screen (office type selector) | **None — fully public** |
| `/annex1/new` | Create a new inventory session | **None** |
| `/annex1/edit` | Fill in equipment + software tables | **None** |

The module is added to the public route exemption list in `src/proxy.ts` (`pathname.startsWith("/annex1")`).

Session state is held in browser memory / `sessionStorage` while editing. On export, the file is downloaded to the user's machine. Nothing is persisted server-side.

---

## Annex 1 Module: UI Flow

### Screen 1 — Office Identification

```
Who is filling out this form?

[ Central Office ]  [ Regional Office ]  [ Field Office ]

(if Regional Office selected)
  Region: [ NCR ▾ ]

(if Field Office selected)
  Parent Region: [ NCR ▾ ]
  Office Name: [ UP Diliman Field Office        ]

[ Continue → ]
```

### Screen 2 — ICT Equipment Inventory

Standard two-table layout (see `references/ISSP_Guidelines_2026.md` §ANNEX 1 for full field spec).

- Fixed DICT-prescribed rows: non-deletable, non-renameable
- "Others" rows: user-added, editable label, deletable, no hard cap but a soft UI hint after ~5 custom rows ("*That's a lot of custom entries — consider using a descriptive label*")
- Number inputs default to `0`
- Central Office / Field-Regional Office columns both present regardless of which office type is filling it out — the user fills only what's relevant to them and leaves the other column as zeros

### Screen 3 — ICT Software Inventory

Same pattern as Equipment.

### Screen 4 — Review & Export

Summary of filled data. Shows:
- Office identification (e.g. "Regional Office — NCR")
- Row counts and non-zero entries
- Suggested filename: `{AGENCY-ACRONYM}-ANNEX1-{OFFICE-CODE}-{YEAR}.issp` — but user can rename

[ Download .issp file ]

---

## Consolidation in the Main ISSP Editor

### Location in the editor

The main ISSP editor adds an **"Annexes"** section in the sidebar (after Part IV). This section is **not** for filling in inventory — it is for attaching pre-built annex files.

```
Annexes
  └── Annex 1 — ICT Asset Inventory  →  /dashboard/documents/[id]/annex1
```

### Annex 1 consolidation page

The page has two states:

**State A — No files attached yet**
```
No Annex 1 files attached.

Each office (Central, Regional, Field) should fill out the Annex 1 module 
and send you their .issp file.

[ Attach Annex 1 files ]  ← accepts multiple files via <input type="file" multiple>
```

**State B — Files attached**
```
Attached offices (3):
  ✓ Central Office                  [Remove]
  ✓ Regional Office — NCR           [Remove]
  ✓ Regional Office — Region III    [Remove]

[ Attach more files ]   [ Preview consolidated table ]
```

Validation on attach:
- File must parse as valid JSON
- `fileType` must equal `"annex1"`
- `version` must be compatible (same major version)
- Duplicate `office.displayLabel` warns the user (possible duplicate submission)

### Consolidated data storage

Attached annex files are stored as a JSON array in a new `annexedOffices` field on the `IsspDocument` (or in a new `AnnexAttachments` table). This field holds the full parsed content of each attached `.issp` annex file.

---

## PDF Output: Consolidated Annex 1

When the main ISSP PDF is exported, Annex 1 is rendered after Part IV.

### Page structure

1. **Cover line**: "ANNEX 1: EXISTING INFORMATION & COMMUNICATIONS TECHNOLOGY (ICT) ASSET INVENTORY"

2. **Per-office section** (one section per attached file, sorted: Central → Regional → Field):
   - Sub-heading: `{office.displayLabel}`
   - Equipment inventory table
   - Software inventory table

3. **Aggregate summary table** (if more than one office is attached):
   - Combines all offices' numbers
   - Central Office column = sum of all Central Office entries
   - Field/Regional Office column = sum of all Regional + Field entries
   - This is the format that matches the DICT template exactly

If only one office is attached, only that office's table is rendered (no separate aggregate section needed).

---

## Data Model Changes

### `IsspDocument` model addition

```prisma
annexedOffices  String  @default("[]")
// JSON: Array<Annex1FilePayload> — full parsed content of each attached .issp annex file
```

No separate Prisma model needed for the consolidation data — the attached files are stored inline as a JSON blob on the document.

### TypeScript types (`src/types/annex1.ts`)

```typescript
export type OfficeType = "central" | "regional" | "field";

export type PhilippineRegion =
  | "NCR" | "CAR" | "Region I" | "Region II" | "Region III"
  | "Region IV-A" | "Region IV-B" | "Region V" | "Region VI"
  | "Region VII" | "Region VIII" | "Region IX" | "Region X"
  | "Region XI" | "Region XII" | "Region XIII" | "BARMM";

export interface OfficeIdentity {
  type: OfficeType;
  region?: PhilippineRegion;       // required for regional + field
  parentRegion?: PhilippineRegion; // required for field (same as region in most cases)
  name: string;                    // user-entered descriptive name
  displayLabel: string;            // computed: "Regional Office — NCR" or "NCR › UP Diliman FO"
}

export interface EquipmentRow {
  type: string;
  isCustom: boolean;
  centralOffice: { operational: number; endOfLife: number; backup: number };
  fieldOffice: { operational: number; endOfLife: number; backup: number };
}

export interface SoftwareRow {
  type: string;
  isCustom: boolean;
  centralOffice: { perpetual: number; subscription: number };
  fieldOffice: { perpetual: number; subscription: number };
}

export interface Annex1Data {
  equipment: EquipmentRow[];
  software: SoftwareRow[];
}

export interface Annex1FilePayload {
  version: string;
  fileType: "annex1";
  exportedAt: string;
  tool: string;
  office: OfficeIdentity;
  annex1: Annex1Data;
}
```

---

## Implementation Order

| Step | File(s) | Notes |
|---|---|---|
| 1 | `src/types/annex1.ts` | All types + `PHILIPPINE_REGIONS` constant + default row factories |
| 2 | `src/types/issp-file.ts` | Add `fileType` to the `.issp` envelope type; update main ISSP export to include `fileType: "issp-main"` |
| 3 | `scripts/export-sample-issp.js` | Add `fileType: "issp-main"` to existing export output |
| 4 | `src/proxy.ts` | Add `pathname.startsWith("/annex1")` to public exemptions |
| 5 | `src/app/annex1/` | Standalone module pages (office setup → equipment → software → export) |
| 6 | `src/components/annex1/inventory-table.tsx` | Shared table component (fixed + custom rows, totals) |
| 7 | `prisma/schema.prisma` | Add `annexedOffices String @default("[]")` to `IsspDocument` |
| 8 | Run migration | `npx prisma migrate dev --name add_annexed_offices` |
| 9 | `src/app/api/issp/documents/[id]/annex1/route.ts` | GET/PUT for attached offices (consolidation) |
| 10 | `src/components/issp-editor/issp-sidebar.tsx` | Add "Annexes" section |
| 11 | `src/app/(dashboard)/dashboard/documents/[id]/annex1/page.tsx` | Consolidation UI (attach files, preview) |
| 12 | `src/lib/render-issp-html.ts` | Add `renderAnnex1Consolidated()` — per-office sections + aggregate |

---

## Anticipated: Annex 2 (DRBCP) Module

Annex 2 (Disaster Recovery and Business Continuity Plan for ICT Resources) is substantially more complex — it includes narrative sections, org chart of the DRT, recovery procedures per system, and KPIs. It is **not planned yet**, but the same standalone module architecture applies:

- Route: `/annex2` — fully public, no auth
- Output: `.issp` file with `fileType: "annex2"`
- Consolidation: same attach-files pattern in the main ISSP editor
- The `fileType` system above already reserves the `"annex2"` value

Plan Annex 2 as a separate implementation after Annex 1 is stable.

---

## Open Questions

1. ~~Does the Annex 1 module need any agency identification?~~ **Decided: No.** The Central Office is always the one consolidating, and they will only collect files from offices within their own agency — not from other agencies. No agency name/acronym field needed. Office type + region + name is sufficient identity.

2. ~~Annex 1 as part of overall ISSP completion %?~~ **Decided: No.** Annex 1 attachment is supplementary — it does not affect the main ISSP document's completion percentage. It may be shown as a separate optional indicator on the document overview (e.g. "Annexes: 2 offices attached") but does not block or contribute to the main progress calculation.

3. ~~"Others" rows cap?~~ **Decided: Unlimited.** No hard or soft cap on custom rows. Agencies with non-standard assets should not be restricted.

4. **Version compatibility across offices** — if a Regional Office fills the form on an older version of the module and the CIO tries to attach it on a newer version, what's the migration path? Probably: accept gracefully, warn if field schema has changed, never silently drop rows.
