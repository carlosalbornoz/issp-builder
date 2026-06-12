# Form Usability Fix Plan — 2026-06-12

Implements all findings from `docs/form-usability-audit-2026-06-12.md`, in four phases =
four commits. Schema changes follow the schema-change skill (types → defaults → migration →
forms → demo file → export → section-fields → docs). Every phase ends with the
verify-feature ladder (tsc, browser smoke, PDF export diff, legacy-doc check).

---

## Phase 1 — PDF correctness (audit #1–#5)

### 1.1 New shared label module — `src/lib/issp-labels.ts`

Single source of truth for enum → display-label maps, imported by forms **and** the export
route so codes can never leak into the PDF again:

```ts
export const CLASSIFICATION_LABELS = {
  SUPPORT_TO_OPERATIONS: "Support to Operations",
  GENERAL_ADMIN: "General Administrative Systems",
  OPERATIONS: "Operations",
} as const;

export const DEV_STRATEGY_LABELS = {
  IN_HOUSE: "In-House Development",
  OUTSOURCED: "Outsourced",
  HYBRID: "Combination (In-house + Outsourced)",   // template word: "Combination"
  COTS: "Commercial Off-The-Shelf (COTS)",
  OPEN_SOURCE: "Open Source",
} as const;

export const DATA_STORAGE_LABELS = { ON_PREMISE: "On-Premise", CLOUD: "Cloud", HYBRID: "Hybrid" } as const;
export const DEPLOYMENT_LABELS = { ON_PREMISE: "On-Premise", CLOUD: "Cloud-Hosted", HYBRID: "Hybrid", HOSTED: "Hosted (3rd Party)" } as const;
```

### 1.2 Classification taxonomy (audit #1) — schema change, Strategy C

- `types.ts`: `classification: "SUPPORT_TO_OPERATIONS" | "GENERAL_ADMIN" | "OPERATIONS" | ""`
  on both `InformationSystem` and `ProposedSystem`.
- **Forms** (II-C, III-D): Select gets the 3 template options; the existing
  `frontline` checkbox renders **only when classification = OPERATIONS**, relabeled
  "Frontline Service / Non-Frontline Service" (template structure exactly).
- **Migration** in `migrateLegacyDoc` (bump schemaVersion → 3), idempotent:
  - `G2C | G2B | G2G` → `OPERATIONS` (citizen/business/agency-facing ⇒ operations);
    existing `frontline` value kept.
  - `G2E | INTERNAL` → `GENERAL_ADMIN`.
  - Already-new values pass through.
  - Note in What's New + a one-line info callout in II-C for one release: "Classifications
    were remapped to the official template taxonomy — please review."
- **Export route**: map enum → label; renderer comparison strings updated to compare
  against the label constants (import the same module).
- **Demo file**: update all `classification` values by hand; JSON-parse check.

### 1.3 Enum label leakage (audit #2)

Export route maps `developmentStrategy`, `dataStorage` (and `deploymentType` where
printed) through the label module. No schema change.

### 1.4 Internal/External Users → text (audit #3) — schema change, Strategy C

- `types.ts`: `internalUsers: string; externalUsers: string` (both interfaces).
- Migration (same v3 block): `typeof n === "number"` → `n === 0 ? "" : String(n)`.
- Forms: text `Input`, placeholders "e.g., HR Division, Finance Division" /
  "e.g., GSIS, PhilGEPS, general public".
- Export route: drop the `String(...)` coercion; demo file gets realistic unit names.

### 1.5 "Others (specify)" (audit #5)

- `part3-e1-form.tsx`: keep the `"Others"` sentinel in `strategicAlignment` for checkbox
  state; when checked, render a conditional Input whose value is stored as a second
  custom string in the array (replace-on-edit).
- Export route: `others = saArr.find(s => !SA_KNOWN.includes(s) && s !== "Others") ?? ""`;
  checkbox prints checked when sentinel **or** custom text present.
- PDF renderer: `chk(sa["othersChecked"])` — route supplies `othersChecked` + `others` text.

### 1.6 Part II-A copy + dead field (audit #4)

- Rewrite the callout to the four real fields (OO link, critical business system, problem,
  intended ICT use).
- Remove `currentStrategy` from the form interface, `StrategicConcern` in `types.ts`, and
  `defaults.ts` (grep first; export route never reads it). Old docs carrying the key are
  harmless extra JSON.

**Phase-1 verification:** export demo doc before/after; confirm classification boxes now
print checked, strategy/storage print labels, users print unit names, Others prints custom
text; load a pre-migration `.issp` and confirm remap + no crash.

---

## Phase 2 — Data integrity (audit #11, #13, #14)

### 2.1 Live title resolution (audit #13)

Export route: when mapping `performanceFramework` and Part IV project budgets, override
stored `projectTitle` with the live title looked up by project id from
`part3.internalProjects` / `crossAgencyProjects` (fall back to stored copy for orphans).
No schema change; stored copies become a cache that can't lie in the PDF.

### 2.2 CIO → focal sync (audit #14)

`part1-b-form.tsx`: in `setCio`, when `data.focalSameAsCio` is true, write the same value
to the corresponding `focal*` field in the same `update()` call. Belt-and-braces: export
route also derives focal from CIO when the flag is set.

### 2.3 Delete confirmations (audit #11)

New `src/components/ui/confirm-delete-button.tsx` — two-tap pattern: first tap arms
("Confirm?" in destructive color, 3 s timeout), second tap fires. Drop-in for icon buttons.

| Tier | Objects | Behavior |
|---|---|---|
| Container | stakeholder (I-C ×3 views), IS card (II-C), proposed system (III-D), outcome (I-A), diagram (II-B), term (defs) | two-tap confirm |
| Project | III-E project | confirm + inline warning "its Part III-F KPIs and Part IV budget lines will be removed from the PDF" |
| Row | services, programs, KPI rows, budget lines, drawer deletes | unchanged (instant) |

**Phase-2 verification:** rename a project after adding KPIs + budget → export → PDF shows
new name everywhere; check CIO edit propagates to focal in PDF; tap-test confirms.

---

## Phase 3 — Template completeness (audit #6–#10, #12)

### 3.1 III-D Description & Purpose (audit #6) — Strategy A

`ProposedSystem.description?: string`; Textarea for all systems (above the conditional
`enhancementDetails`); export route maps it (renderer row already exists). Demo file values.

### 3.2 III-D interoperability dimensions (audit #7) — Strategy A

Add `generatesData?: boolean; processesExternalData?: boolean; sharedPlatform?: boolean`
to proposed-system interop; render the same 4-checkbox grid as II-C; map in export.

### 3.3 Mandatory badges on cyber checklists (audit #8)

Extract the duplicated `CYBER_GROUPS` config into `src/lib/cyber-controls.ts` with
`mandatory: boolean` per item (per guidelines tables). II-B and III-A import it. Render an
amber "Mandatory" chip + per-group "x/y mandatory" counter. No schema change.

### 3.4 PIA tri-state (audit #9) — schema change, Strategy C

- `pia.processesPersonalInfo: "yes" | "no" | ""` (both interfaces).
- Migration (same v3 block if Phase 1+3 ship together, else v4): `true → "yes"`,
  `false → ""` (conservative: an unchecked box never proved a deliberate "No").
- UI: Yes / No segmented buttons, unset by default; "PIA conducted" follow-up only on Yes.
- PDF: print "Yes" / "No" / blank; update both existing chk-style rows.

### 3.5 EGP unset default (audit #10)

`status: ""` allowed in the union; `DEFAULT_PROGRAM = { status: "" }`; neutral "Not set"
badge + "n unanswered" summary pill; PDF prints all four boxes unchecked when unset
(current behavior for unknown values — verify). Existing docs keep their saved statuses.

### 3.6 Duration default (audit #12)

`Part3E1Form`/`E2` receive `startYear`/`endYear` (from the page); `DEFAULT_PROJECT.duration`
= `"2028–2030"` derived from the doc; placeholder updated. Free text retained.

**Phase-3 verification:** new-doc flow (EGP shows Not set), PIA tri-state in PDF, III-D
description prints, mandatory counters, legacy-doc load.

---

## Phase 4 — Polish batch (audit #16–#25)

One commit, mechanical:

1. Remove decorative `GripVertical` icons (I-A, I-C, II-A) + unused imports.
2. `type="tel" inputMode="tel"` on contact fields (I-B); `type="url" inputMode="url"` on
   URL fields (II-C, II-D).
3. Input → Textarea: II-D notes (rows 2), II-A critical business system (rows 2),
   I-A outcome name (rows 2).
4. III-B copy: "Upload the EA diagram below — it is embedded in the exported PDF."
5. III-F mobile: card-per-KPI fallback under `md:` (mirror I-C pattern).
6. II-B: hint list above the description ("Your diagram/description should show:
   connectivity type, upload/download speeds per site, IPv6 readiness, cybersecurity
   components").
7. Part IV office field: `datalist` with "Central Office" / "Regional Offices".
8. Currency echo (audit #15): formatted `= ₱x,xxx,xxx.00` caption under Total Project Cost
   (III-E) and unit-cost drawer field; III-E also shows the computed Part IV sum for that
   project with a ✓/✗ match chip.

---

## Phase 5 — III-D/E interaction redesign (user-reported 2026-06-12)

### 5.1 Add-via-modal instead of silent append

"Add Project" / "Add System" currently appends a new card **below** existing ones — off-screen
on long lists, so the user doesn't know anything was added ("hindi alam na may na-add na pala
sa ibaba"). Replace with a create modal/drawer: clicking Add opens a focused dialog for the
new item's core fields; on save, the new card is revealed (scroll-to + brief highlight).

**The exemplar already in the codebase:** Part IV's "Add Line" button opens the LineItemDrawer
— add happens *in* a focused surface, never silently below. Reuse that pattern.

**Flag similar items (silent append-below) — sweep these when implementing:**
| Location | Current behavior |
|---|---|
| III-E "Add Project" | appends expanded card at list bottom |
| III-D "Add System" | appends card at list bottom |
| II-C "Add System" | appends collapsed card at bottom |
| II-A "Add Concern" | appends card at bottom |
| I-A "Add OO" | appends + auto-expands (slightly better, still below fold) |
| I-C "Add Stakeholder" (table/cards) | appends row/card (summary view already uses the drawer ✓) |
| III-C "Add Position" | appends table row |
| Definitions "Add term" | appends card at bottom |

Minimum bar where a full modal is overkill (small rows): scroll the new item into view and
focus its first input.

### 5.2 Read-only accordion view + explicit edit mode (III-E, likely III-D/II-C too)

On page open, **all project accordions start collapsed**. Opening an accordion shows a
**read-only presentation** — laid out for scanning (definition-list style: label/value rows,
checked-only checklists, formatted cost), not a wall of disabled inputs. An explicit
**Edit** button switches to the editing surface (inline expansion or drawer). Rationale:
free-editing inside always-open accordions makes accidental edits easy and reading hard.

### 5.3 Cross-link awareness when linking an IS

In the project edit view, when the user toggles a proposed-IS pill that is **already linked
to another project**, surface a verbose inline warning before applying, e.g.:

> "**Unified Queue Monitoring Platform** is already linked to **Project SIKAP**. An IS can
> legitimately be delivered by more than one project, but double-linking is usually a
> mistake — budget and KPIs may be double-counted. Link it to this project as well?"
> [Link anyway] [Cancel]

Same indicator in III-D: the "Has project" badge should name the project(s), not just say
"Has project".

## Phase 6 — Splash continuity / IndexedDB management (user-reported 2026-06-12)

Today the home splash gives no sign that IndexedDB holds work in progress, and no way to
manage it. When a document exists in IDB, the splash should lead with a **"Continue where
you left off"** card:

- Metadata of the in-progress document: title, agency acronym, coverage period, last edited
  (relative time), completion (n of 19 sections done) — same data the editor overview shows.
- Primary action: **Continue editing** → `/editor`.
- Secondary action: **Start fresh / clear browser data** — with the same two-step confirm
  used by the editor sidebar's Clear, and copy that explains this only clears *this
  browser's* copy, not any saved `.issp` files.
- The existing three cards (sample / new / load) remain below.

Files: `src/components/home/home-page-client.tsx` (splash), reuse `useIsspStore` doc +
`clearDoc`; the store provider already wraps the home page (verify — if not, read IDB
directly with a light loader).

## Sequencing & logistics

- One commit per phase; What's New entry after all four ship.
- Phases 1 and 3 both touch the schema — if implemented back-to-back, share one
  schemaVersion bump (v3) and one migration block.
- Demo file is hand-edited in Phases 1 and 3; JSON-parse check each time.
- Docs to update after each phase: `docs/project-status.md`, audit doc (mark findings
  fixed), session log.
- Full verify-feature ladder after each phase; deploy only after the phase's commit.
