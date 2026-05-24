---
name: schema-change
description: Standardized workflow for adding, removing, or renaming fields in the ISSP Builder JSON/IDB schema (IsspDocument, Part1Data–Part4Data and sub-types) or the dormant Prisma schema. Ensures all layers stay in sync — types, defaults, migration, forms, pages, demo file, PDF export, section fields map, and docs.
argument-hint: "[describe the change, e.g. 'add attachments: string[] to Part2Data']"
---

# ISSP Builder — Schema Change Workflow

Change requested: **$ARGUMENTS**

---

## Before touching any code — answer these questions

| Question | Determines |
|---|---|
| Which interface is changing? (`IsspDocument`, `Part1Data`–`Part4Data`, or a sub-type like `IctProject`) | Which layers need updating |
| Is it a new field, rename, removal, or type change? | Backward compat strategy (see below) |
| Will old `.issp` files be missing this field? | Whether `migrateLegacyDoc` needs updating |
| Does the field affect what the user sees in the PDF? | Whether the export route needs updating |
| Is the field user-editable (form input)? | Whether `deriveMetaFromContent` and `SECTION_FIELDS` need updating |

A change to any sub-type (`StrategicConcern`, `IctProject`, `HumanCapital`, `KpiRow`, etc.) is an IDB/JSON change — treat it the same as a `Part*Data` change.

---

## Backward compatibility strategy — choose one before writing code

Every `.issp` file ever saved must open correctly after the change. Pick the right strategy:

### Strategy A — Optional field (safest, no migration needed)

```ts
// In types.ts — add ? to make it optional
newField?: string;
```

```ts
// In form init — always use ?? to provide a default for old files
const [data, setData] = useState({
  newField: initialData?.newField ?? "",
  // ...
});
```

Use when: the field is purely additive, non-structural, and the form can safely default to empty/false/[]. No `migrateLegacyDoc` change required.

### Strategy B — Required field with migration

```ts
// In types.ts — required (no ?)
newField: string;
```

```ts
// In migrateLegacyDoc — fill in for old files
newField: doc.newField ?? "default value",
```

Bump `schemaVersion` to the next integer. Use when: the field is always expected, downstream code (store, PDF, etc.) depends on it being present.

### Strategy C — Rename or restructure

```ts
// In migrateLegacyDoc — read old location, write new location
newName: (doc as any).oldName ?? defaultValue,
```

Remove the old field from `types.ts` only after the migration is in place. Bump `schemaVersion`. Never do a rename without a `migrateLegacyDoc` guard — every existing file has the old name.

---

## IDB / JSON Schema Checklist

Work through this in order. Do not skip steps.

---

### Step 1 — `src/lib/store/types.ts`

- Add/remove/rename the field on the correct interface
- Choose the most specific type — avoid `any`; avoid making everything `string`
- For new fields using Strategy A: add `?` (optional)
- For removals: `grep -rn "fieldName" src/` first — eliminate all usages before removing the type

---

### Step 2 — `src/lib/store/defaults.ts`

- Add a default value in the appropriate factory function (`makeDefaultPart1()` … `makeDefaultPart4()`, or `createEmptyDocument()`)
- The default must be the zero/empty value for the type: `""`, `false`, `0`, `[]`, `null`, or a call to an existing sub-factory
- This default is used when creating a **new** document; the migration (Step 4) handles **existing** documents

---

### Step 3 — `schemaVersion` (bump if using Strategy B or C)

`schemaVersion` lives on `IsspDocument` in `src/lib/store/types.ts`. The current value is defined in `migrateLegacyDoc`.

- Find the current `CURRENT_SCHEMA_VERSION` (or inline value in `migrateLegacyDoc`)
- Increment it by 1
- Update the comparison guard in `migrateLegacyDoc` to the new version number
- If using Strategy A (optional field), do **not** bump — no migration is needed

---

### Step 4 — `migrateLegacyDoc` in `src/lib/store/index.tsx`

This function runs on **every document load** (from IDB on page mount, and from `loadFromFile`). It is the single place that brings old files up to the current schema.

```ts
function migrateLegacyDoc(doc: IsspDocument): IsspDocument {
  const base: IsspDocument =
    (doc.schemaVersion ?? 1) >= CURRENT_SCHEMA_VERSION
      ? doc
      : {
          ...doc,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          // ← add your new field(s) here with safe defaults
          newField: doc.newField ?? "default value",
        };
  // deriveMetaFromContent always runs — do not remove this line
  return { ...base, sectionMeta: deriveMetaFromContent(base) };
}
```

Rules:
- Only fields being added in **this version** go inside the version-gated block
- The `?? defaultValue` guard makes it safe for both old and new files
- Always use `(doc as any).oldName` when reading a field that is being **renamed** (it won't be on the type anymore)
- Do **not** remove the `deriveMetaFromContent` call — it is always needed

If using Strategy A (optional field with `?`): skip this step.

---

### Step 5 — `deriveMetaFromContent` in `src/lib/store/index.tsx`

This function infers `in_progress` status for sections that have content when a document is first loaded into the new schema. It runs inside `migrateLegacyDoc` on every load.

Update it **only if**:
- A new field was added to an existing section (add it to the relevant `maybeSet` condition)
- A new section was added (add a new `maybeSet` call)
- A field was removed from a section (remove it from the condition)

Example — adding `executiveSummary: string` to Part I-A:
```ts
// Before
maybeSet("part1/a", !!(p1.mandateFunction || p1.visionStatement || p1.missionStatement || p1.legalBasis));

// After
maybeSet("part1/a", !!(p1.mandateFunction || p1.visionStatement || p1.missionStatement || p1.legalBasis || p1.executiveSummary));
```

If the field is not relevant to section completion status (e.g. a pure metadata field): skip this step.

---

### Step 6 — Form component (`src/components/issp-editor/partX/partX-Y-form.tsx`)

- Add the field to the form's local data interface (must mirror the store type)
- Add the default to the local `DEFAULT_DATA` constant
- **Backward compat**: always read from `initialData` with `?? defaultValue` — old `.issp` files won't have the field:
  ```ts
  const [data, setData] = useState({
    newField: initialData?.newField ?? "",
  });
  ```
- Wire the field into the `debouncedSave()` call on change
- If the form uses `useLocalSave(part, sectionId)`: no change needed — the hook already passes the section ID

---

### Step 7 — Editor page (`src/app/editor/partX/Y/page.tsx`)

- Pass the new field from `doc.partX` into `initialData`:
  ```tsx
  <PartXYForm initialData={doc.part1} />
  ```
  If the entire `partX` object is already passed as `initialData`, no change is needed here — the field flows through automatically.
- If the field is on `IsspDocument` directly (envelope-level): read from `doc.fieldName` and pass explicitly.

---

### Step 8 — `src/lib/section-fields.ts` (if the file exists)

This file maps section IDs to the part-level fields they write to, with human-readable labels. It powers the "Unsaved changes" field-level diff in the sidebar.

If the file exists and the field being added/renamed/removed is **user-editable** (written by a form via `debouncedSave`):

- **New field**: add `{ key: "fieldName", label: "Human-Readable Label" }` to the correct section's `fields` array
- **Renamed field**: update the `key` value; keep the same `label` unless the meaning changed
- **Removed field**: delete the entry from the array

If `src/lib/section-fields.ts` does not yet exist (it's planned, not yet implemented): skip this step and add a note to the PR description.

---

### Step 9 — Demo file (`public/demo/ncwtr-issp-2026-2028.issp`)

The demo file is **hand-maintained JSON** — the old export script (`scripts/export-sample-issp.js`) is dormant and does NOT regenerate it.

Edit the file directly:
1. Open `public/demo/ncwtr-issp-2026-2028.issp` in an editor
2. Add the new field with a realistic demo value (not an empty default — make it look like a real agency filled it in)
3. For renames: update the key name; remove the old key
4. For removals: delete the key from the JSON

Verify the file is still valid JSON after editing:
```bash
node -e "JSON.parse(require('fs').readFileSync('public/demo/ncwtr-issp-2026-2028.issp', 'utf8')); console.log('valid')"
```

Check that the demo file loads in the editor without errors by loading it via "Explore a sample ISSP".

---

### Step 10 — PDF export (`src/app/api/export/route.ts`) — only if the field affects PDF output

Only needed if the new/changed field should appear in the exported PDF.

- Find where the relevant part is mapped in the route file (look for `mapProject()`, `mapPart1()`, or the inline mapping block)
- Add the field to the `IsspData` mapping
- **Critical rule for option labels**: if the field stores string values that are option labels (e.g. `"E-Government Master Plan"`), the `.includes()` check in the PDF renderer must use the **exact same string** the form stores — not a camelCase key, not a display-formatted variant
- **Critical rule for checkboxes**: if the field maps to `Record<string, boolean>`, every key must be matched individually against the stored array

If the field does not affect what appears in the PDF (e.g. a draft note, a metadata field): skip this step.

---

### Step 11 — Dormant dashboard page (low priority)

`src/app/(dashboard)/dashboard/documents/[id]/partX/Y/page.tsx` is dormant (not reachable from the local-first editor). It may reference `Part*Data` types that now have new required fields.

- If TypeScript complains about it in Step 12: add the field with a hardcoded safe default
- Do **not** try to read it from the DB — the Prisma column won't exist
- If TypeScript does not complain: skip this step

---

### Step 12 — Type check

```bash
npx tsc --noEmit --skipLibCheck
```

`--skipLibCheck` avoids errors from `.next/` generated files. Fix all errors before continuing. Common error sources:
- Form component local interface not updated (Step 6)
- Editor page not passing the new field (Step 7)
- `migrateLegacyDoc` spreading a field that is now required but may be undefined (add `?? default`)
- `deriveMetaFromContent` referencing a field that was removed

---

### Step 13 — Update documentation

- **`docs/session-handoff.md`**: update the `IsspDocument` envelope table, the `Part*Data` descriptions, the `unsavedToFile` or `sectionMeta` sections if relevant, and the IDB store value interface block
- **`docs/ui-refresh-plan.md`**: update if the change affects section structure or the `SECTION_FIELDS` map
- **Memory** (`/root/.claude/projects/-root-apps-issp/memory/project_status.md`): add a note under "What's Built" or "Known Issues" as appropriate

---

## Quick reference — which steps apply

| Change type | Steps required |
|---|---|
| New optional field on `Part*Data` | 1, 2, 6, 7, 8 (if exists), 9, 10 (if PDF), 12, 13 |
| New required field on `Part*Data` | 1, 2, 3, 4, 5 (if affects status), 6, 7, 8 (if exists), 9, 10 (if PDF), 12, 13 |
| New field on `IsspDocument` envelope | 1, 2, 3, 4, 9 (if affects PDF), 12, 13 |
| Rename a field | 1, 2 (rename), 3, 4 (read old → write new), 5, 6, 7, 8 (if exists), 9, 10 (if PDF), 12, 13 |
| Remove a field | 1 (grep usages first), 3, 4, 5, 6, 7, 8 (if exists), 9, 10, 12, 13 |
| New sub-type array item field | Same as new optional/required field — treat the sub-type as the unit |
| New section (new route + new form) | All steps + add new `PARTS` entry in `src/lib/sections.ts` + new page file + new form file |

---

## Common pitfalls

| Pitfall | Prevention |
|---|---|
| Old `.issp` files crash on load | Always use `?? defaultValue` in both `migrateLegacyDoc` and form init |
| `migrateLegacyDoc` guard never triggers | Check that the version comparison is correct — `(doc.schemaVersion ?? 1) >= NEW_VERSION` must be `false` for old files |
| `deriveMetaFromContent` not updated | If you added a field that signals section completion, update the `maybeSet` condition |
| Demo file not updated | Always hand-edit the demo file; it is never auto-generated |
| Demo file breaks JSON parse | Run the `node -e "JSON.parse(...)"` check after editing |
| Field name in demo file doesn't match `types.ts` | Copy the key name from `types.ts`, not from memory |
| PDF checkboxes still unchecked after field rename | Confirm `.includes()` in export route uses the exact label string the form stores |
| `SECTION_FIELDS` not updated | If `src/lib/section-fields.ts` exists, add the new field label — otherwise the "Unsaved changes" diff won't show it |
| Dormant dashboard page causes TS error | Add a hardcoded default; do not wire to DB |
| `schemaVersion` not bumped for required fields | Old files will skip the migration block and be missing the required field at runtime |
| Form init normalization causes permanent false-positive "Unsaved changes" | See section below |

---

## Form init normalization — a hidden snapshot sync trap

Several forms normalize `initialData` inside their `useState` initializer before the first save:

```ts
// Part III-C example — form does this on mount:
const [rows, setRows] = useState<HCRow[]>(
  initialData.map((r: any) => ({
    id: r.id ?? generateId(),                                         // fills missing id
    employmentStatus: r.employmentStatus?.toUpperCase() ?? "",        // normalizes case
    quantity: r.quantity ?? r.physicalCount ?? 1,                     // renames legacy field
    position: r.position ?? "",
  }))
);
```

The normalized data lives in React state, **not yet in the store**. The store keeps the original (un-normalized) data from the file. The first `debouncedSave` after any edit writes the normalized values to the store and IDB. Now the store has normalized values, but the snapshot (`savedSnapshot`) captured the original un-normalized file — so even after the user reverts the edit, the hash comparison sees a permanent difference.

**The rule:** If you add or change a field where the form normalizes the value on mount (case conversion, field rename, ID generation, type coercion), you must **also apply the same normalization in `migrateLegacyDoc`** outside the version gate — so the snapshot is captured in the same format the form will write.

```ts
// In migrateLegacyDoc — add outside the version gate, before the return:
const normalized: IsspDocument = {
  ...base,
  part3: {
    ...base.part3,
    proposedHumanCapital: base.part3.proposedHumanCapital.map((r: any): HCRow => ({
      id: r.id || genId(),
      position: r.position ?? "",
      employmentStatus: (r.employmentStatus?.toUpperCase() ?? "") as HCRow["employmentStatus"],
      quantity: r.quantity ?? r.physicalCount ?? 1,
    })),
  },
};
return { ...normalized, sectionMeta: deriveMetaFromContent(normalized) };
```

The normalization must be **idempotent** — running it on already-normalized data must produce the same result. `r.id || genId()` is idempotent only because once an `id` is set, `||` short-circuits. `r.field?.toUpperCase()` is idempotent because uppercase of uppercase is still uppercase.

**Before writing the normalization, check the demo file** (`public/demo/ncwtr-issp-2026-2028.issp`) — if it predates the normalization, its rows will be in the old format. Fix both the demo file and `migrateLegacyDoc` together.

**Currently normalized in `migrateLegacyDoc` (as of schema v2):**
| Array field | Normalization |
|---|---|
| `part1.stakeholders` | Fill missing `id` via `genId()` |
| `part2.strategicConcerns` | Migrate `outcomeId` → `outcomeIds` array |
| `part3.proposedHumanCapital` | Fill `id`, uppercase `employmentStatus`, rename `physicalCount→quantity` |

---

## The auto-migration guarantee

When a user opens an old `.issp` file after a schema update:

1. `loadFromFile()` in the store parses the JSON
2. `migrateLegacyDoc(parsed)` runs immediately — fills in any new required fields with safe defaults, bumps `schemaVersion`
3. `deriveMetaFromContent()` runs — sets `lastEditedAt` for sections that already have content
4. The migrated doc is written back to IDB
5. **When the user saves to file**, the downloaded `.issp` contains the fully migrated schema

The user never sees an error or a prompt. The file silently upgrades itself on the next save. This works because:
- Every new required field has a `?? defaultValue` guard in `migrateLegacyDoc`
- Every new optional field has a `?? defaultValue` guard in the form init
- `schemaVersion` prevents the migration block from re-running on already-migrated files
