# Part I-C — Incoming/Outgoing Transaction Direction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every transaction/service under a Part I-C stakeholder must be tagged `INCOMING` or `OUTGOING`, matching the current DICT 2026 template (v2, 2026-06-12), across all three of Part I-C's view layouts (Table, Cards, Summary), the PDF export, and with a migration-review flag for every pre-existing `.issp` file so agencies re-check their old, untagged data. Also fixes a confirmed nested-card violation (cards nested inside cards inside a card) in the Cards view and its drawer, found while auditing these views for this change.

**Architecture:** Add a `direction: TransactionDirection` field (`"INCOMING" | "OUTGOING" | ""`) to `StakeholderService`, following this repo's existing enum-ization pattern (mirrors how `classification`/`frontlineAccessType` were added). Bump `schemaVersion` 9 → 10, default every existing service's `direction` to `""` (unset — never guess), and enroll `part1/c` into the **already-built** `MigrationReview` system (`src/lib/migration-review.ts` + the dialog/sidebar/overview machinery in `src/lib/store/index.tsx`, `src/components/editor/issp-migration-review-dialog.tsx`, `src/components/editor/editor-sidebar.tsx`, `src/components/editor/overview/part-card.tsx`) — no new review UI is built, only a new entry in an existing table. A new `DirectionToggle` control (a 2-way segmented toggle, visually identical to the file's existing `ViewToggle`) is added to all three view layouts of `part1-c-form.tsx`. The PDF renderer (`render-issp-html.ts`) groups each stakeholder's services into `INCOMING:` / `OUTGOING:` / `UNSPECIFIED:` sub-blocks inside the existing row-spanned table, and its column header is corrected from "Transaction / Service" to "Transaction Processed" to match the actual current template.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind, lucide-react icons, IndexedDB-backed local store (`src/lib/store/index.tsx`), server-rendered PDF HTML (`src/lib/pdf/render-issp-html.ts` → Puppeteer in `generate-pdf.ts`). No test framework — verification is `tsc`, browser smoke tests (Puppeteer), and PDF output inspection, per this repo's `verify-feature` skill.

## Global Constraints

- Every `.issp` file ever saved must keep opening correctly after this change — never skip a `?? default` guard in `migrateLegacyDoc` or a form's `initialData` read.
- Never guess a legacy value for a newly-enum'd field. Unknown/missing `direction` becomes `""`, not a guessed `INCOMING`/`OUTGOING` (per `.claude/skills/schema-change/SKILL.md`, "Enum-izing a freeform field").
- No new saturated color is introduced for direction. `DESIGN.md`'s Spent-Not-Spread Rule reserves color for semantic state (success/warning/danger/info) or Part identity — direction is neither, so it is communicated with icon + label + the existing neutral toggle treatment (`bg-muted/30` / `bg-card shadow-sm`), not a new hue.
- Reuse the existing `MigrationReview` system as-is (`src/lib/migration-review.ts`). Do not build a second review/notification mechanism.
- Never write to `.next/`/`dist/` directly; never run `npm run build` casually — screenshots/smoke tests always target the dev server on port 3000 (see `.claude/skills/verify-feature/SKILL.md`).
- `npx tsc --noEmit --skipLibCheck` must be clean after every task before moving to the next.

---

## Design critique — AI slop audit of the three existing view layouts

Requested alongside the schema change: an honest critique of Table/Cards/Summary in `part1-c-form.tsx` and the PDF renderer, against `impeccable`'s product-register rules and absolute bans, before adding new UI to them.

**One confirmed hard violation: nested cards, three deep, in the Cards view.** `DESIGN.md` bans this explicitly ("Don't nest bordered 'card' containers inside other bordered 'card' containers — flatten to one boundary per logical group") and impeccable's general layout rules are blunter still ("Nested cards are always wrong"). The actual nesting, confirmed by reading `src/components/ui/card.tsx:15` (`Card` = `rounded-xl` + `ring-1 ring-foreground/10`, a bordered box) alongside `part1-c-form.tsx`:

```
<Card>                                                     :386  section shell (rounded-xl, ring border)
  <div className="rounded-lg border overflow-hidden">      :586  per-stakeholder accordion box
    <div className="rounded-md border bg-muted/20 p-3">    :651  per-service box — repeats once per transaction
```

Three bordered boxes stacked, the innermost repeating N times per stakeholder. The `StakeholderDrawer` (`:146`) has the same per-service bordered-box pattern one level shallower (inside a Sheet, not the page-flow `Card`) — same tell, smaller blast radius since a Sheet isn't itself a "card."

**Fix, folded into this plan rather than deferred:** keep the per-stakeholder accordion box — it's a real functional boundary (the collapse/expand unit), not decorative, so it stays. Flatten the per-service items inside it, and inside the drawer, from individual bordered/rounded/tinted boxes into a single `divide-y` row list — one boundary, hairline dividers between rows, no per-row border/radius/background. This is a net removal of one full nesting level in both places. Tasks 4 and 5 already touch these exact blocks to add the direction toggle, so the flattening is folded into the same step that adds the toggle (Task 4 Step 2, Task 5 Step 1) rather than added as a separate task.

**Other checks, cleared:**
- No side-stripe borders, no gradient text/fills, no glassmorphism, no hero-metric template, no numbered-eyebrow scaffolding anywhere in this form or the PDF table.
- Icon set is consistently `lucide-react` throughout (`Plus`, `Trash2`, `Pencil`, `Table2`, `LayoutList`, `LayoutGrid`, `ChevronDown`) — no mixed icon families.
- `ViewToggle`'s active state uses `shadow-sm` on a 2px-tall control — reads as a pressed/selected affordance, not decoration; acceptable under the Floating-Only Rule's spirit even though it's technically in page flow.
- `ConfirmDeleteButton` is used instead of a confirm modal for row deletion — correctly avoids the "modal as first thought" anti-pattern.
- The complexity badges (`COMPLEXITY_COLORS`: green/amber/red for Simple/Complex/Highly Technical) are a defensible, pre-existing use of semantic color — they read as a severity/effort scale, not decoration, and predate this change.

**One more observation, not blocking, worth naming:**
- **Triple-surface maintenance cost.** Table, Cards, and Summary are three fully independent renderings of the same `Stakeholder[]` data (plus the `StakeholderDrawer`, shared by Cards/Summary for add/edit). Every future field on `StakeholderService` — this one included — must be threaded through four separate render sites by hand, with no shared row/field component between them. Out of scope to consolidate here; noted for a future `impeccable extract` pass if this file keeps growing.

**Decisions locked in from this critique:**
1. Direction gets an icon (`ArrowDownToLine` for Incoming, `ArrowUpFromLine` for Outgoing) + short label in a neutral segmented toggle, not a new color pair, not a dropdown Select, not a wordy badge. Implemented in Tasks 3–5.
2. The Cards-view and Drawer per-service boxes lose their border/radius/background and become `divide-y` rows. Implemented in Tasks 4–5, Step 1a.

---

### Task 1: Types — `StakeholderService.direction`

**Files:**
- Modify: `src/lib/store/types.ts:41-47`

**Interfaces:**
- Produces: `TransactionDirection = "INCOMING" | "OUTGOING" | ""` and `StakeholderService.direction: TransactionDirection`, consumed by every later task.

- [ ] **Step 1: Add the `TransactionDirection` type and the field**

In `src/lib/store/types.ts`, replace:

```ts
export type ComplexityLevel = "Simple" | "Complex" | "Highly Technical";

export interface StakeholderService {
  id: string;
  name: string;
  complexity: ComplexityLevel;
}
```

with:

```ts
export type ComplexityLevel = "Simple" | "Complex" | "Highly Technical";

export type TransactionDirection = "INCOMING" | "OUTGOING" | "";

export interface StakeholderService {
  id: string;
  name: string;
  complexity: ComplexityLevel;
  direction: TransactionDirection;
}
```

- [ ] **Step 2: Confirm `src/lib/store/defaults.ts` needs no change**

`makeDefaultPart1()` (`src/lib/store/defaults.ts:66-75`) sets `stakeholders: []` — an empty array has no services to default, so nothing to touch here. Per-service defaults live in the form's local `makeService()` factory (Task 3), not in `defaults.ts`. Confirm by reading the file — no edit in this step.

- [ ] **Step 3: Type-check (expect new errors — that's correct)**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: errors in `src/lib/store/index.tsx` (the idempotent stakeholder-normalization map doesn't set `direction`) and `src/components/issp-editor/part1/part1-c-form.tsx` (local `StakeholderService` interface now mismatches the store type where it's used against `initialData`). These are exactly the two files Tasks 2 and 3 fix — this step is a checkpoint, not a bug.

- [ ] **Step 4: Commit**

```bash
git add src/lib/store/types.ts
git commit -m "feat(part1-c): add direction field to StakeholderService type"
```

---

### Task 2: Migration — bump to schema v10, default legacy services, enroll Part I-C in Migration Review

**Files:**
- Modify: `src/lib/migration-review.ts` (all 39 lines — full file shown below)
- Modify: `src/lib/store/index.tsx:344-346` (add source-version capture is already present), `:598-606` (new v9→v10 block), `:610-621` (idempotent normalization)

**Interfaces:**
- Consumes: `TransactionDirection`, `StakeholderService` from Task 1.
- Produces: every loaded document has `direction` set to `"INCOMING"`, `"OUTGOING"`, or `""` on every service, never `undefined`. Documents whose `sourceSchemaVersion < 10` get `"part1/c"` added to `migrationReview.pendingSectionIds`.

- [ ] **Step 1: Enroll `part1/c` in `MIGRATION_REVIEW_SECTIONS` and bump `CURRENT_SCHEMA_VERSION`**

Replace the full contents of `src/lib/migration-review.ts` with:

```ts
export const CURRENT_SCHEMA_VERSION = 10;

export const MIGRATION_REVIEW_SECTIONS = [
  {
    id: "part1/c",
    shortLabel: "I-C",
    label: "Part I-C · Stakeholder Analysis",
    href: "/editor/part1/c",
    reason: "Every transaction/service must now be tagged Incoming or Outgoing, matching the current template.",
  },
  {
    id: "part2/c",
    shortLabel: "II-C",
    label: "Part II-C · Existing IS Inventory",
    href: "/editor/part2/c",
    reason: "Classification and Frontline Service now follow the current Online / On-premise / Hybrid structure.",
  },
  {
    id: "part2/d",
    shortLabel: "II-D",
    label: "Part II-D · E-Government Programs",
    href: "/editor/part2/d",
    reason: "The checklist now uses the current Yes / No questions and official follow-up fields.",
  },
  {
    id: "part3/d",
    shortLabel: "III-D",
    label: "Part III-D · Proposed Information Systems",
    href: "/editor/part3/d",
    reason: "Classification, Frontline access, interoperability, and PIA fields were aligned to the current template.",
  },
] as const;

export type MigrationReviewSectionId = (typeof MIGRATION_REVIEW_SECTIONS)[number]["id"];

export function getMigrationReviewSection(id: string) {
  return MIGRATION_REVIEW_SECTIONS.find((section) => section.id === id);
}

/** Sections whose meaning changed after the given schema version. */
export function getRequiredMigrationReviewSectionIds(sourceSchemaVersion: number): MigrationReviewSectionId[] {
  return MIGRATION_REVIEW_SECTIONS
    .filter((section) => {
      if (section.id === "part2/d") return sourceSchemaVersion < 7;
      if (section.id === "part1/c") return sourceSchemaVersion < 10;
      return sourceSchemaVersion < 9;
    })
    .map((section) => section.id);
}
```

`part1/c` is listed first because it's the newest change; the existing dialog/banner code iterates this array in order with no other ordering assumption (confirmed by reading `issp-migration-review-dialog.tsx` and `part-card.tsx` — both just `.map()` over `pendingSectionIds`/`MIGRATION_REVIEW_SECTIONS`).

- [ ] **Step 2: Add the v9 → v10 migration block in `src/lib/store/index.tsx`**

Find the v8→v9 block ending at `index.tsx:606` (it closes with `};` right before the `// Idempotent normalizations` comment at line 608). Insert this new block immediately after it, still before that comment:

```ts
  // v9 -> v10: Stakeholder services now require a direction (Incoming/Outgoing),
  // matching the 2026-06-12 v2 template's Stakeholder Analysis table. No legacy
  // data implies a direction, so every existing service defaults to "" (unset)
  // and part1/c is flagged for migration review (see migration-review.ts).
  if ((base.schemaVersion ?? 1) < 10) {
    base = {
      ...base,
      schemaVersion: 10,
      part1: {
        ...base.part1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stakeholders: base.part1.stakeholders.map((s: any) => ({
          ...s,
          services: (s.services ?? []).map((sv: any) => ({ ...sv, direction: sv.direction ?? "" })),
        })),
      },
    };
  }
```

- [ ] **Step 3: Extend the idempotent normalization block to also guard `direction`**

At `index.tsx:610-621`, the always-run block currently reads:

```ts
  let normalized: IsspDocument = {
    ...base,
    part1: {
      ...base.part1,
      // Fill missing IDs on stakeholders and their services
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stakeholders: base.part1.stakeholders.map((s: any) => ({
        ...s,
        id: s.id || genId(),
        services: (s.services ?? []).map((sv: Partial<StakeholderService>) => ({ ...sv, id: sv.id || genId() })),
      })),
    },
```

Replace the `stakeholders:` line with:

```ts
      // Fill missing IDs on stakeholders and their services; default missing direction to "" —
      // mirrors the form's own init normalization (see part1-c-form.tsx), required per the
      // "Form init normalization" trap in the schema-change skill so edit+revert doesn't
      // produce a permanent false "unsaved changes".
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stakeholders: base.part1.stakeholders.map((s: any) => ({
        ...s,
        id: s.id || genId(),
        services: (s.services ?? []).map((sv: Partial<StakeholderService>) => ({
          ...sv,
          id: sv.id || genId(),
          direction: sv.direction ?? "",
        })),
      })),
```

This is deliberately redundant with Step 2's version-gated block (exactly mirroring the precedent already in this file for `stakeholders[].id`, which is set in both the v2→v3 gated block *and* this unconditional block as a safety net for anything older or missed).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: clean (no output). If `StakeholderService` import is missing in `index.tsx`, confirm it's already imported (Explore confirmed line 12 already imports `StakeholderService` from `./types`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/migration-review.ts src/lib/store/index.tsx
git commit -m "feat(part1-c): migrate stakeholder services to schema v10, flag part1/c for review"
```

---

### Task 3: Form — shared `DirectionToggle` + Table view

**Files:**
- Modify: `src/components/issp-editor/part1/part1-c-form.tsx:1-71` (imports, local types, helpers), `:211-243` (add `DirectionToggle` near `ViewToggle`), `:413-563` (table view)

**Interfaces:**
- Consumes: `TransactionDirection` (mirrored locally per this file's existing convention of duplicating store types — see current `:31-41`).
- Produces: `DirectionToggle` component, reused by Tasks 4 and 5 in the same file.

- [ ] **Step 1: Add the icon imports and local type**

In `part1-c-form.tsx`, change the lucide-react import at line 24:

```ts
import { Plus, Trash2, Pencil, Table2, LayoutList, LayoutGrid, ChevronDown } from "lucide-react";
```

to:

```ts
import { Plus, Trash2, Pencil, Table2, LayoutList, LayoutGrid, ChevronDown, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
```

Update the local `StakeholderService` interface (`:31-35`):

```ts
interface StakeholderService {
  id: string;
  name: string;
  complexity: "Simple" | "Complex" | "Highly Technical";
}
```

to:

```ts
type TransactionDirection = "INCOMING" | "OUTGOING" | "";

interface StakeholderService {
  id: string;
  name: string;
  complexity: "Simple" | "Complex" | "Highly Technical";
  direction: TransactionDirection;
}
```

- [ ] **Step 2: Default new services to `direction: ""`**

Change `makeService()` (`:65-67`):

```ts
function makeService(): StakeholderService {
  return { id: generateId(), name: "", complexity: "Simple" };
}
```

to:

```ts
function makeService(): StakeholderService {
  return { id: generateId(), name: "", complexity: "Simple", direction: "" };
}
```

- [ ] **Step 3: Add `DIRECTION_OPTIONS` and the `DirectionToggle` component**

Directly after the `ViewToggle` component (ends at `:243`), before the `// ─── Main Form ──` comment (`:245`), insert:

```tsx
// ─── Direction toggle (Incoming / Outgoing) ──────────────────────────────────

const DIRECTION_OPTIONS: { value: Exclude<TransactionDirection, "">; label: string; icon: React.ReactNode }[] = [
  { value: "INCOMING", label: "Incoming", icon: <ArrowDownToLine className="h-3 w-3" /> },
  { value: "OUTGOING", label: "Outgoing", icon: <ArrowUpFromLine className="h-3 w-3" /> },
];

function directionIcon(direction: TransactionDirection, className = "h-3 w-3") {
  if (direction === "INCOMING") return <ArrowDownToLine className={className} />;
  if (direction === "OUTGOING") return <ArrowUpFromLine className={className} />;
  return null;
}

function DirectionToggle({
  value,
  onChange,
}: {
  value: TransactionDirection;
  onChange: (d: TransactionDirection) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border p-0.5 bg-muted/30" role="group" aria-label="Transaction direction">
      {DIRECTION_OPTIONS.map(({ value: v, label, icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            value === v
              ? "bg-card shadow-sm font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
```

This is visually identical in structure to `ViewToggle` (`:223-243`) — same container classes, same active/inactive state classes — deliberately, per the design critique's "no new color, reuse the existing neutral toggle vocabulary" decision. `directionIcon()` is the icon-only helper Tasks 4/5 use in collapsed/read-only contexts.

- [ ] **Step 4: Add the Direction column to the table header**

Replace the `<thead>` block (`:417-429`):

```tsx
<thead>
  <tr className="bg-muted/50">
    <th className="border px-3 py-2 text-left font-semibold w-52">
      Stakeholder / Client
    </th>
    <th className="border px-3 py-2 text-left font-semibold">
      Transaction / Service
    </th>
    <th className="border px-3 py-2 text-left font-semibold w-44">
      Complexity
    </th>
    <th className="border px-3 py-2 w-10" />
  </tr>
</thead>
```

with:

```tsx
<thead>
  <tr className="bg-muted/50">
    <th className="border px-3 py-2 text-left font-semibold w-52">
      Stakeholder / Client
    </th>
    <th className="border px-3 py-2 text-left font-semibold">
      Transaction Processed
    </th>
    <th className="border px-3 py-2 text-left font-semibold w-40">
      Direction
    </th>
    <th className="border px-3 py-2 text-left font-semibold w-44">
      Complexity
    </th>
    <th className="border px-3 py-2 w-10" />
  </tr>
</thead>
```

(Column header renamed "Transaction / Service" → "Transaction Processed" to match the current DICT v2 template exactly — the app's copy had drifted from an older template revision.)

- [ ] **Step 5: Update colspans for the empty/placeholder rows (now 5 columns, was 4)**

Three colspans in the table body need `+1`:

At `:434` — the empty-state row:
```tsx
<td colSpan={4} className="border px-3 py-8 text-center text-muted-foreground text-sm">
```
→
```tsx
<td colSpan={5} className="border px-3 py-8 text-center text-muted-foreground text-sm">
```

At `:476` — "Add first service" row (inside the `!hasServices` branch):
```tsx
<td colSpan={3} className="border px-3 py-3 text-center">
```
→
```tsx
<td colSpan={4} className="border px-3 py-3 text-center">
```

At `:544` — "Add service" trailer row:
```tsx
<td colSpan={3} className="border px-3 py-1.5 bg-muted/20">
```
→
```tsx
<td colSpan={4} className="border px-3 py-1.5 bg-muted/20">
```

- [ ] **Step 6: Insert the Direction cell into each service row**

In the per-service `<tr>` (`:489-541`), the transaction `<td>` ends at `:503` and the complexity `<td>` begins at `:504`. Insert a new `<td>` between them:

```tsx
<td className="border px-2 py-1 text-center">
  <DirectionToggle
    value={sv.direction}
    onChange={(d) => updateService(s.id, sv.id, "direction", d)}
  />
</td>
```

`updateService`'s existing signature (`field: keyof StakeholderService, value: string`) already accepts `"direction"` as `field` and a `TransactionDirection` as `value` (it's a `string` subtype) — no change needed to `updateService` itself (`:327-340`).

- [ ] **Step 7: Type-check and visually verify table view**

Run: `npx tsc --noEmit --skipLibCheck` — expect clean.

Then run a Puppeteer smoke test per `verifier-web`/`verify-feature`: load the demo file via the file-input method, navigate to `/editor/part1/c`, confirm Table view is selected (default), screenshot at `1400×900`, and confirm via `page.evaluate` that clicking an `Outgoing` toggle on the first service updates that service's rendered `aria-pressed` state and that the sidebar shows "Unsaved changes" after the 1500ms debounce + 2000ms wait. Save the screenshot to `/tmp/verify-shots/part1c-table.png` and read it back.

- [ ] **Step 8: Commit**

```bash
git add src/components/issp-editor/part1/part1-c-form.tsx
git commit -m "feat(part1-c): add DirectionToggle and wire it into the table view"
```

---

### Task 4: Form — Cards view (flatten nested boxes, accordion body, collapsed badges)

**Files:**
- Modify: `src/components/issp-editor/part1/part1-c-form.tsx:599-616` (collapsed badge preview), `:650-683` (accordion body service row — flattened + direction toggle added)

**Interfaces:**
- Consumes: `DirectionToggle`, `directionIcon()` from Task 3 (same file, no import needed).

**Also fixes:** the nested-card violation identified in the design critique above — the per-service `rounded-md border bg-muted/20 p-3` box at `:651` (one per transaction, nested inside the per-stakeholder `rounded-lg border` box at `:586`, itself nested inside the outer `<Card>` at `:386`) is flattened to a single `rounded-md border divide-y` wrapper with plain divided rows inside. Net effect: one border around the whole service list per stakeholder, not one border per service.

- [ ] **Step 1: Add a direction icon to the collapsed badge preview**

At `:599-616`, the collapsed-state preview currently renders up to 2 complexity badges. Replace:

```tsx
{!isOpen && s.services.length > 0 && (
  <div className="hidden sm:flex gap-1 shrink-0">
    {s.services.slice(0, 2).map((sv) => (
      <span
        key={sv.id}
        className={`text-xs rounded px-1.5 py-0.5 font-medium ${COMPLEXITY_COLORS[sv.complexity]}`}
      >
        {sv.complexity === "Highly Technical" ? "H.Tech" : sv.complexity}
      </span>
    ))}
    {s.services.length > 2 && (
      <span className="text-xs rounded px-1.5 py-0.5 font-medium bg-muted text-muted-foreground">
        +{s.services.length - 2}
      </span>
    )}
  </div>
)}
```

with:

```tsx
{!isOpen && s.services.length > 0 && (
  <div className="hidden sm:flex gap-1.5 items-center shrink-0">
    {s.services.slice(0, 2).map((sv) => (
      <span key={sv.id} className="flex items-center gap-1">
        {directionIcon(sv.direction, "h-3 w-3 text-muted-foreground")}
        <span
          className={`text-xs rounded px-1.5 py-0.5 font-medium ${COMPLEXITY_COLORS[sv.complexity]}`}
        >
          {sv.complexity === "Highly Technical" ? "H.Tech" : sv.complexity}
        </span>
      </span>
    ))}
    {s.services.length > 2 && (
      <span className="text-xs rounded px-1.5 py-0.5 font-medium bg-muted text-muted-foreground">
        +{s.services.length - 2}
      </span>
    )}
  </div>
)}
```

Icon-only (no "Incoming"/"Outgoing" text) here, per the design critique's badge-crowding mitigation — `directionIcon()` already returns `null` for `""`, so unset services show no icon (not a broken/empty icon).

- [ ] **Step 2: Flatten the per-service boxes into one bordered list, and add `DirectionToggle`**

At `:650-683`, each service currently renders as its own `rounded-md border bg-muted/20 p-3` box — the confirmed nested-card violation. Replace the whole `{s.services.map(...)}` block, including its wrapping structure:

```tsx
{s.services.map((sv) => (
  <div key={sv.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
    <div className="flex items-center gap-2">
      <Input
        className="flex-1 text-sm"
        placeholder="Describe transaction or service..."
        value={sv.name}
        onChange={(e) => updateService(s.id, sv.id, "name", e.target.value)}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => removeService(s.id, sv.id)}
        disabled={s.services.length <= 1}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
    <Select
      items={COMPLEXITY_OPTIONS}
      value={sv.complexity}
      onValueChange={(v: string | null) =>
        v && updateService(s.id, sv.id, "complexity", v)
      }
    >
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {COMPLEXITY_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
))}
```

with (one outer border replaces N per-item borders; rows separated by `divide-y` hairlines only):

```tsx
<div className="rounded-md border divide-y">
  {s.services.map((sv) => (
    <div key={sv.id} className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          className="flex-1 text-sm"
          placeholder="Describe transaction or service..."
          value={sv.name}
          onChange={(e) => updateService(s.id, sv.id, "name", e.target.value)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => removeService(s.id, sv.id)}
          disabled={s.services.length <= 1}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <DirectionToggle
          value={sv.direction}
          onChange={(d) => updateService(s.id, sv.id, "direction", d)}
        />
        <Select
          items={COMPLEXITY_OPTIONS}
          value={sv.complexity}
          onValueChange={(v: string | null) =>
            v && updateService(s.id, sv.id, "complexity", v)
          }
        >
          <SelectTrigger className="flex-1 min-w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {COMPLEXITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  ))}
</div>
```

Note the removed `bg-muted/20` tint too — it was reinforcing the per-item "card" read; a plain `divide-y` list on the `Card`'s own background reads as one grouped list, not a stack of boxes.

- [ ] **Step 3: Type-check and visually verify Cards view — including the nesting fix**

Run: `npx tsc --noEmit --skipLibCheck` — expect clean.

Puppeteer: switch to Cards view via the `ViewToggle` button (`button:has-text("Cards")`), expand a stakeholder with 2+ services, screenshot desktop (`1400×900`) and mobile (`390×844`) viewports (Cards is also the mobile fallback per `:567`, so both matter), read both PNGs back. Visually confirm: exactly one border around the service list per stakeholder (not one border per service), with a hairline divider between services — not the pre-fix "boxes inside a box inside a card" look.

- [ ] **Step 4: Commit**

```bash
git add src/components/issp-editor/part1/part1-c-form.tsx
git commit -m "feat(part1-c): add direction to Cards view; flatten nested service boxes to divide-y"
```

---

### Task 5: Form — Summary view (drawer flatten + toggle, list badges)

**Files:**
- Modify: `src/components/issp-editor/part1/part1-c-form.tsx:145-186` (drawer service row — flattened + direction toggle added), `:744-758` (summary list badges)

**Interfaces:**
- Consumes: `DirectionToggle`, `directionIcon()` from Task 3.

**Also fixes:** the same nested-box pattern as Task 4, one level shallower — the drawer's per-service `rounded-md border bg-muted/20 p-3` box at `:146` is flattened to a single `rounded-md border divide-y` wrapper.

- [ ] **Step 1: Flatten the drawer's per-service boxes, and add `DirectionToggle`**

Same nested-box pattern as Task 4 (one bordered box per service, `:146`), just one level shallower since it's inside a Sheet rather than the page-flow `Card`. Flatten it the same way, for visual consistency between Cards body and the drawer that edits the same data. At `:145-186`, replace:

```tsx
{services.map((sv, idx) => (
  <div key={sv.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
    <div className="flex items-start gap-2">
      <span className="text-xs text-muted-foreground shrink-0 mt-2.5 w-4">{idx + 1}.</span>
      <Input
        className="flex-1 text-sm"
        placeholder="Describe transaction or service..."
        value={sv.name}
        onChange={(e) => updateSvc(sv.id, "name", e.target.value)}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => removeSvc(sv.id)}
        disabled={services.length <= 1}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
    <Select
      items={COMPLEXITY_OPTIONS}
      value={sv.complexity}
      onValueChange={(v: string | null) => v && updateSvc(sv.id, "complexity", v)}
    >
      <SelectTrigger className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COMPLEXITY_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="flex flex-col gap-0.5">
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${COMPLEXITY_COLORS[o.value]}`}>
                {o.label}
              </span>
              <span className="text-xs text-muted-foreground">{o.hint}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
))}
```

with (one outer border replaces N per-item borders, matching Task 4's fix):

```tsx
<div className="rounded-md border divide-y">
  {services.map((sv, idx) => (
    <div key={sv.id} className="p-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-xs text-muted-foreground shrink-0 mt-2.5 w-4">{idx + 1}.</span>
        <Input
          className="flex-1 text-sm"
          placeholder="Describe transaction or service..."
          value={sv.name}
          onChange={(e) => updateSvc(sv.id, "name", e.target.value)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => removeSvc(sv.id)}
          disabled={services.length <= 1}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap pl-6">
        <DirectionToggle
          value={sv.direction}
          onChange={(d) => updateSvc(sv.id, "direction", d)}
        />
      </div>
      <Select
        items={COMPLEXITY_OPTIONS}
        value={sv.complexity}
        onValueChange={(v: string | null) => v && updateSvc(sv.id, "complexity", v)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPLEXITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span className="flex flex-col gap-0.5">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${COMPLEXITY_COLORS[o.value]}`}>
                  {o.label}
                </span>
                <span className="text-xs text-muted-foreground">{o.hint}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ))}
</div>
```

(`pl-6` aligns the toggle under the Input's left edge, past the `idx + 1.` numeral gutter — matches this block's existing indentation logic. The removed `bg-muted/20` per-item tint is the same "stop reinforcing the per-item card read" reasoning as Task 4.)

`updateSvc`'s existing signature (`id: string, field: keyof StakeholderService, value: string`) already accepts `"direction"` — no change needed (`:103-105`).

- [ ] **Step 2: Add the direction icon to the Summary list row badges**

At `:744-758`:

```tsx
<div className="flex gap-1 shrink-0 flex-wrap justify-end max-w-40">
  {s.services.slice(0, 3).map((sv) => (
    <span
      key={sv.id}
      className={`text-xs rounded px-1.5 py-0.5 font-medium ${COMPLEXITY_COLORS[sv.complexity]}`}
    >
      {sv.complexity === "Highly Technical" ? "H.Tech" : sv.complexity}
    </span>
  ))}
  {s.services.length > 3 && (
    <span className="text-xs rounded px-1.5 py-0.5 font-medium bg-muted text-muted-foreground">
      +{s.services.length - 3}
    </span>
  )}
</div>
```

becomes:

```tsx
<div className="flex gap-1.5 items-center shrink-0 flex-wrap justify-end max-w-40">
  {s.services.slice(0, 3).map((sv) => (
    <span key={sv.id} className="flex items-center gap-1">
      {directionIcon(sv.direction, "h-3 w-3 text-muted-foreground")}
      <span
        className={`text-xs rounded px-1.5 py-0.5 font-medium ${COMPLEXITY_COLORS[sv.complexity]}`}
      >
        {sv.complexity === "Highly Technical" ? "H.Tech" : sv.complexity}
      </span>
    </span>
  ))}
  {s.services.length > 3 && (
    <span className="text-xs rounded px-1.5 py-0.5 font-medium bg-muted text-muted-foreground">
      +{s.services.length - 3}
    </span>
  )}
</div>
```

- [ ] **Step 3: Type-check and visually verify Summary view + drawer**

Run: `npx tsc --noEmit --skipLibCheck` — expect clean.

Puppeteer: switch to Summary view, screenshot the list, click a row to open the drawer (on a stakeholder with 2+ services), toggle direction on a service inside the drawer, screenshot the open drawer, click "Save Changes", and confirm the list row's icon updates after closing. Read both PNGs back — in the drawer screenshot, confirm one border wraps the whole service list with hairline dividers between rows, not a separate box per service.

- [ ] **Step 4: Commit**

```bash
git add src/components/issp-editor/part1/part1-c-form.tsx
git commit -m "feat(part1-c): add direction to Summary view; flatten drawer's nested service boxes"
```

---

### Task 6: PDF export — grouped INCOMING/OUTGOING/UNSPECIFIED rendering

**Files:**
- Modify: `src/lib/pdf/render-issp-html.ts:36` (type mirror), `:697-722` (Part I-C table render)
- No change: `src/app/api/export/route.ts:200` — `stakeholders: part1.stakeholders` is a full-object passthrough (confirmed by reading the route), so `direction` flows through automatically once the type mirror below allows it. Confirm this by reading the line before starting, not by memory.

**Interfaces:**
- Consumes: `direction: string` on each service (PDF-side types are plain `string`, not the store's literal union, per this file's existing convention at line 53 `classification: string`).

- [ ] **Step 1: Extend the `Part1.stakeholders` type mirror**

At `render-issp-html.ts:36`:

```ts
stakeholders: { name: string; services: { name: string; complexity: string }[] }[];
```

→

```ts
stakeholders: { name: string; services: { name: string; complexity: string; direction: string }[] }[];
```

- [ ] **Step 2: Rewrite the Part I-C render block to group by direction**

Replace `render-issp-html.ts:697-722`:

```ts
    <div class="section-heading">${tocMark("part1-c")}C. Stakeholder Analysis</div>
    <table>
      <thead><tr><th style="width:33%">Stakeholders</th><th style="width:40%">Transaction / Service</th><th>Complexity</th></tr></thead>
      <tbody>
        ${p.stakeholders.length === 0
          ? `<tr><td colspan="3" style="text-align:center;font-style:italic;">No stakeholders specified.</td></tr>`
          : p.stakeholders.map(s => {
              const svs = s.services ?? [];
              if (svs.length === 0) {
                return `<tr class="avoid-break"><td>${esc(s.name)}</td><td colspan="2" style="text-align:center;font-style:italic;">No services listed.</td></tr>`;
              }
              const firstRow = `<tr class="avoid-break">
                <td rowspan="${svs.length}" style="vertical-align:top;">${esc(s.name)}</td>
                <td>${esc(svs[0].name)}</td>
                <td style="text-align:center;">${esc(svs[0].complexity)}</td>
              </tr>`;
              const restRows = svs.slice(1).map(sv => `<tr class="avoid-break">
                <td>${esc(sv.name)}</td>
                <td style="text-align:center;">${esc(sv.complexity)}</td>
              </tr>`).join("");
              return firstRow + restRows;
            }).join("")
        }
      </tbody>
    </table>
  </div>`;
}
```

with:

```ts
    <div class="section-heading">${tocMark("part1-c")}C. Stakeholder Analysis</div>
    <table>
      <thead><tr><th style="width:33%">Stakeholders</th><th style="width:40%">Transaction Processed</th><th>Complexity</th></tr></thead>
      <tbody>
        ${p.stakeholders.length === 0
          ? `<tr><td colspan="3" style="text-align:center;font-style:italic;">No stakeholders specified.</td></tr>`
          : p.stakeholders.map(s => {
              const svs = s.services ?? [];
              if (svs.length === 0) {
                return `<tr class="avoid-break"><td>${esc(s.name)}</td><td colspan="2" style="text-align:center;font-style:italic;">No services listed.</td></tr>`;
              }
              type Svc = { name: string; complexity: string; direction: string };
              const groups: { label: string; items: Svc[] }[] = [
                { label: "INCOMING:", items: svs.filter(sv => sv.direction === "INCOMING") },
                { label: "OUTGOING:", items: svs.filter(sv => sv.direction === "OUTGOING") },
                { label: "UNSPECIFIED:", items: svs.filter(sv => sv.direction !== "INCOMING" && sv.direction !== "OUTGOING") },
              ].filter(g => g.items.length > 0);
              const totalRows = groups.reduce((n, g) => n + 1 + g.items.length, 0);
              return groups.map((g, gi) => {
                const labelRow = `<tr class="avoid-break">
                  ${gi === 0 ? `<td rowspan="${totalRows}" style="vertical-align:top;">${esc(s.name)}</td>` : ""}
                  <td colspan="2" class="field-label" style="background:#d9d9d9;">${g.label}</td>
                </tr>`;
                const itemRows = g.items.map(sv => `<tr class="avoid-break">
                  <td>${esc(sv.name)}</td>
                  <td style="text-align:center;">${esc(sv.complexity)}</td>
                </tr>`).join("");
                return labelRow + itemRows;
              }).join("");
            }).join("")
        }
      </tbody>
    </table>
  </div>`;
}
```

Column header renamed "Transaction / Service" → "Transaction Processed" here too, matching Task 3 Step 4's form change and the actual current DICT v2 template. `UNSPECIFIED:` only appears when a service's `direction` is still `""` (unreviewed legacy data or an in-progress new entry) — per the grill-me decision, this keeps the exported PDF honest about what hasn't been classified yet rather than silently dropping it or blocking export.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit --skipLibCheck` — expect clean.

- [ ] **Step 4: PDF smoke test — grouped rendering with a mix of directions**

Per `verify-feature`'s PDF ladder, build a one-off test payload from the demo file (Task 7 will have already tagged it, so this step can run either before or after Task 7 — if run before, temporarily inject test values):

```bash
node -e "
const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('public/demo/ncwtr-issp-2026-2028.issp', 'utf8'));
fs.writeFileSync('/tmp/test-input.json', JSON.stringify(doc));
"
curl -s -X POST http://localhost:3000/api/export -H "Content-Type: application/json" \
  --data-binary @/tmp/test-input.json -o /tmp/test-part1c.pdf -w "%{http_code} %{size_download}\n"
```

Then:

```bash
pdftotext -f 1 -l 2 /tmp/test-part1c.pdf - | grep -E "INCOMING:|OUTGOING:|Transaction Processed"
pdftoppm -png -r 100 -f 1 -l 2 /tmp/test-part1c.pdf /tmp/verify-shots/pdf-part1c
```

Confirm both `INCOMING:` and `OUTGOING:` appear (the demo file, once Task 7 lands, has at least one stakeholder — National Government Agencies — with both), then read the rasterized PNG pages back with the Read tool to visually confirm the grouped table matches the target screenshot's structure (label row, then per-transaction rows, per direction, under one row-spanned stakeholder name).

Also test the escaping/empty-group edge cases per `verify-feature`'s checklist:
```bash
node -e "
const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('public/demo/ncwtr-issp-2026-2028.issp', 'utf8'));
doc.part1.stakeholders[0].services[0].name = 'Test <b>bold</b> & \"quoted\"';
doc.part1.stakeholders[0].services[0].direction = '';
fs.writeFileSync('/tmp/test-escape.json', JSON.stringify(doc));
"
curl -s -X POST http://localhost:3000/api/export -H "Content-Type: application/json" \
  --data-binary @/tmp/test-escape.json -o /tmp/test-escape.pdf -w "%{http_code}\n"
pdftotext -f 1 -l 2 /tmp/test-escape.pdf - | grep -E "UNSPECIFIED:|Test <b>bold"
```
Confirm the literal `<b>bold</b> & "quoted"` text prints escaped/literal (not interpreted as HTML) and `UNSPECIFIED:` appears as its own group for that one retagged service, alongside the still-intact `INCOMING:`/`OUTGOING:` groups for that stakeholder's other service.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/render-issp-html.ts
git commit -m "feat(part1-c): group PDF stakeholder table by transaction direction"
```

---

### Task 7: Demo file — tag all 15 existing services, bump to schema v10

**Files:**
- Modify: `public/demo/ncwtr-issp-2026-2028.issp:6` (schemaVersion), `:183-307` (stakeholders array)

**Interfaces:**
- Consumes: nothing new — this is data, not code.

- [ ] **Step 1: Bump `schemaVersion`**

At line 6:
```json
  "schemaVersion": 9,
```
→
```json
  "schemaVersion": 10,
```

- [ ] **Step 2: Add `"direction"` to all 15 services**

Edit `public/demo/ncwtr-issp-2026-2028.issp:183-307`, adding a `"direction"` key to every service object using this exact mapping (chosen so at least one stakeholder — NGAs — shows both directions, exercising the PDF's grouped rendering; reasoning: INCOMING = the stakeholder-initiated transaction reaching the agency, OUTGOING = the agency-initiated transaction reaching the stakeholder):

| Stakeholder | Service (by `name`) | `direction` |
|---|---|---|
| General Public | Filing of complaints on government waiting time violations | `INCOMING` |
| General Public | Requesting queue compliance certificates | `INCOMING` |
| National Government Agencies (NGAs) | Submission of monthly queue time reports and compliance audits | `INCOMING` |
| National Government Agencies (NGAs) | Receipt of improvement directives from NCWTR | `OUTGOING` |
| Local Government Units (LGUs) | Enrollment in NCWTR monitoring program and submission of service delivery data | `INCOMING` |
| Anti-Red Tape Authority (ARTA) | Joint policy formulation on government service standards | `OUTGOING` |
| Anti-Red Tape Authority (ARTA) | Referral of non-compliant agencies and citizen feedback data sharing | `OUTGOING` |
| Civil Service Commission (CSC) | Coordination on service delivery standards and joint training programs | `OUTGOING` |
| Commission on Audit (COA) | Annual audit of NCWTR operations and fund utilization | `INCOMING` |
| Commission on Audit (COA) | ICT expenditure review and compliance assessment | `INCOMING` |
| Congress of the Philippines | Budget deliberations and legislative oversight of NCWTR mandate | `INCOMING` |
| Congress of the Philippines | Submission of annual performance reports and review | `OUTGOING` |
| DICT | Technical assistance for ICT project implementation | `INCOMING` |
| DICT | Government cloud services provisioning | `INCOMING` |
| DICT | Cybersecurity advisories and compliance review | `INCOMING` |

Example, for the first service (`public/demo/ncwtr-issp-2026-2028.issp:188-192`):

```json
          {
            "id": "s1a1b2c3d4e5f6a7b8c9d0e",
            "name": "Filing of complaints on government waiting time violations",
            "complexity": "Simple",
            "direction": "INCOMING"
          },
```

Apply the same `"direction": "..."` key addition (matching the table above) to all 15 service objects in the file.

- [ ] **Step 3: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('public/demo/ncwtr-issp-2026-2028.issp', 'utf8')); console.log('valid')"
```
Expected output: `valid`

- [ ] **Step 4: Confirm the demo file loads cleanly in-app**

Puppeteer: load `public/demo/ncwtr-issp-2026-2028.issp` via the file-input method (per `verifier-web`), navigate to `/editor/part1/c`, confirm **no** migration-review banner/dialog appears (this file is now schema v10 — current — so it must not be flagged), and confirm all three view modes render the tagged directions correctly (spot-check NGAs shows one Incoming + one Outgoing service).

- [ ] **Step 5: Commit**

```bash
git add public/demo/ncwtr-issp-2026-2028.issp
git commit -m "feat(part1-c): tag demo stakeholder services with transaction direction, bump to schema v10"
```

---

### Task 8: Docs — guidelines reference, session docs, memory

**Files:**
- Modify: `references/ISSP_Guidelines_2026.md:57-66`
- Modify: `docs/session-handoff.md`, `docs/project-status.md` (per `schema-change` skill Step 12 and `verify-feature`'s closing step)
- Modify: `/root/.claude/projects/-root-apps-issp/memory/project_status.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Update the ISSP Guidelines reference**

`AGENTS.md` names `references/ISSP_Guidelines_2026.md` as "the authoritative source for all ISSP field names, options, and structure... Use it (not the PDFs) when verifying or implementing any form field" — but it currently doesn't document the Transaction Processed column or the Incoming/Outgoing requirement at all (confirmed by grep — the only "incoming/outgoing" mention in the whole repo was in a *different*, non-authoritative orientation-notes file). Fix that gap.

At `references/ISSP_Guidelines_2026.md:57-66`, replace:

```markdown
### C. Stakeholder Analysis

Identify groups affected by ICT programs (citizens, other agencies, LGUs, private sector, NGOs) and classify transaction complexity:

| Type | Description | Processing Time |
|---|---|---|
| **Simple** | Ministerial actions only; routine, inconsequential issues | Max 3 working days |
| **Complex** | Requires in-depth evaluation; determined by the office concerned | Max 7 working days |
| **Highly Technical** | Requires technical knowledge, specialized skills, or training | Max 20 working days |
```

with:

```markdown
### C. Stakeholder Analysis

Identify groups affected by ICT programs (citizens, other agencies, LGUs, private sector, NGOs). For each stakeholder, list every **Transaction Processed** — tagging each one as **Incoming** (the stakeholder-initiated transaction reaching the agency, e.g. a citizen complaint or an NGA report submission) or **Outgoing** (the agency-initiated transaction reaching the stakeholder, e.g. a directive or an advisory) — and classify its complexity:

| Type | Description | Processing Time |
|---|---|---|
| **Simple** | Ministerial actions only; routine, inconsequential issues | Max 3 working days |
| **Complex** | Requires in-depth evaluation; determined by the office concerned | Max 7 working days |
| **Highly Technical** | Requires technical knowledge, specialized skills, or training | Max 20 working days |

Source: DICT 2026 ISSP Template v2 (2026-06-12) Part I-C table — column header is "Transaction Processed", with rows grouped under "INCOMING:" and "OUTGOING:" per stakeholder.
```

- [ ] **Step 2: Add a session-doc entry**

Read `docs/project-status.md` and `docs/session-handoff.md` first (their current structure dictates exact placement — do not guess a heading that doesn't exist). Add a dated entry under whatever "recent changes" / "what's built" section already exists in each, stating: Part I-C stakeholder transactions now require an Incoming/Outgoing tag; schema bumped to v10; existing `.issp` files are flagged via the Migration Review system for a Part I-C re-check.

- [ ] **Step 3: Update project memory**

Update `/root/.claude/projects/-root-apps-issp/memory/project_status.md` (read it first) with a one-line note under its "What's Built" section: Part I-C transactions now tagged Incoming/Outgoing (schema v10); superseded by whatever the next real session finds current.

- [ ] **Step 4: Commit**

```bash
git add references/ISSP_Guidelines_2026.md docs/session-handoff.md docs/project-status.md
git commit -m "docs(part1-c): document transaction direction in guidelines and session docs"
```

(Memory is not part of the git commit — it's outside the repo.)

---

### Task 9: Full verification ladder

**Files:** none modified — verification only, per `verify-feature` skill.

- [ ] **Step 1: Type check**

```bash
npx tsc --noEmit --skipLibCheck
```
Expected: clean.

- [ ] **Step 2: ESLint on touched files**

```bash
npx eslint src/lib/store/types.ts src/lib/store/index.tsx src/lib/migration-review.ts src/components/issp-editor/part1/part1-c-form.tsx src/lib/pdf/render-issp-html.ts
```
Expected: clean.

- [ ] **Step 3: Legacy-doc regression — a pre-v10 file must still load and get flagged**

```bash
node -e "
const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('public/demo/ncwtr-issp-2026-2028.issp', 'utf8'));
doc.schemaVersion = 9;
doc.part1.stakeholders.forEach(s => s.services.forEach(sv => delete sv.direction));
fs.writeFileSync('/tmp/legacy-v9.issp', JSON.stringify(doc));
"
```

Puppeteer: load `/tmp/legacy-v9.issp` via file-input, confirm:
- The Migration Review dialog appears listing "Part I-C · Stakeholder Analysis" alongside whatever other sections are pending for that source version.
- After acknowledging and navigating to Part I-C, every service's `DirectionToggle` shows neither button pressed (both `""`).
- The sidebar and Overview show the "Review required" indicator on Part I-C until a service's direction is set and the section is marked done again.
- Exporting this loaded (still-unreviewed) document to PDF still succeeds and shows the `UNSPECIFIED:` group — confirms Task 6 Step 2's fallback, not a crash.

- [ ] **Step 4: New-document regression**

Puppeteer: start a brand-new document (not the demo, not a loaded file), navigate to Part I-C, add a stakeholder and a service, confirm no Migration Review UI appears (new documents are never flagged — only documents migrated from `sourceSchemaVersion < 10`).

- [ ] **Step 5: Mobile viewport pass**

Puppeteer at `390×844`: Part I-C in Cards view (the mobile fallback per `part1-c-form.tsx:567`), confirm the `DirectionToggle` doesn't overflow/wrap awkwardly next to the complexity `Select` in the accordion body. Screenshot and read back.

- [ ] **Step 6: Absurd-input pass**

In the table view, type a very long transaction description (200+ characters) into one row and confirm the row still renders without breaking the table layout or clipping the `DirectionToggle`/complexity columns.

- [ ] **Step 7: Send verification screenshots to the user**

Use `SendUserFile` with the key screenshots from Steps 3 (dialog + flagged sidebar), Task 3/4/5's per-view captures, and Task 6's PDF page renders — per `verify-feature`'s closing instruction, this is a standing rule in this project, not optional polish.

---

## Self-review — spec coverage check

- Schema/type change: Task 1. ✅
- Migration + review-flagging for old schemas ("ask users of old schemas to also review this change"): Task 2, using the pre-existing Migration Review system end-to-end (dialog, sidebar, overview — all pre-built, only the section registration is new). ✅
- All three view layouts adapted (Table, Cards, Summary + shared Drawer): Tasks 3, 4, 5. ✅
- PDF renderer matches the attached template screenshot's grouped INCOMING:/OUTGOING: structure: Task 6. ✅
- AI slop critique of the three view layouts, requested explicitly: delivered above, before Task 1, with concrete design decisions (icon+label neutral toggle, no new color) carried into Tasks 3–5's exact code. Initial critique pass missed a real violation (three levels of nested bordered cards in the Cards view + drawer); corrected after user pushback and folded into Tasks 4–5 as an explicit "Also fixes" scope item, not left as a follow-up. ✅
- Demo file kept realistic and current-schema (schema-change skill Step 9): Task 7. ✅
- Guidelines reference doc kept authoritative (AGENTS.md requirement) and session docs/memory updated (schema-change skill Step 12 + verify-feature's closing step): Task 8. ✅
- Full verification ladder incl. legacy-doc, new-doc, mobile, escaping, empty-group edge cases: Task 9. ✅
