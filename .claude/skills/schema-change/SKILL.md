---
name: schema-change
description: Standardized workflow for adding, removing, or renaming fields in the ISSP Builder JSON/IDB schema (IsspDocument, Part1Data–Part4Data and sub-types) or the dormant Prisma schema. Ensures all layers stay in sync — types, defaults, forms, pages, seed, demo file, PDF export, and docs.
argument-hint: "[describe the change, e.g. 'add attachments: string[] to Part2Data']"
---

# ISSP Builder — Schema Change Workflow

Change requested: **$ARGUMENTS**

---

## Step 0 — Classify the change

Answer these before proceeding:

| Question | Determines |
|---|---|
| Does it touch `Part1Data`–`Part4Data` or any sub-type? | IDB/JSON checklist applies |
| Does it touch the `IsspDocument` envelope? | IDB/JSON checklist applies |
| Does it touch `prisma/schema.prisma`? | Prisma checklist applies |
| Is it a new field, rename, removal, or type change? | Backward compat strategy |

A change to a sub-type (e.g. `StrategicConcern`, `IctProject`, `HumanCapital`) is an IDB/JSON change — treat it the same as a `Part*Data` change.

---

## IDB / JSON Schema Checklist

Work through this in order. Check off each item before moving to the next.

### 1. `src/lib/store/types.ts`
- Add/remove/rename the field on the correct interface
- For new fields: choose the most specific type (avoid `any`)
- If removing: grep for all usages first — `grep -rn "fieldName" src/` — and eliminate them before removing from the type

### 2. `src/lib/store/defaults.ts`
- Add a default value in the appropriate factory function (`makeDefaultPart1()` … `makeDefaultPart4()`, or `createEmptyDocument()`)
- Default must be the zero/empty value for the type: `""`, `false`, `0`, `[]`, `null`, or a call to an existing sub-default factory

### 3. Form component (`src/components/issp-editor/partX/partX-Y-form.tsx`)
- Add field to the form's local `Part*Data` interface (must mirror the store type)
- Add the default in the local `DEFAULT_DATA` constant
- **Backward compat**: read from `initialData` with `?? defaultValue`, not bare `initialData.field` — old `.issp` files won't have the field
- Wire the field into the `update()` call on change

### 4. Editor page (`src/app/editor/partX/Y/page.tsx`)
- Pass the new field from `doc.partX.fieldName` into `initialData`
- If the field is on `IsspDocument` (not a sub-part), read from `doc.fieldName`

### 5. Dormant dashboard page (`src/app/(dashboard)/dashboard/documents/[id]/partX/Y/page.tsx`)
- Add the field with a hardcoded safe default (e.g. `false`, `""`, `[]`)
- Do **not** try to read it from the DB unless the Prisma checklist is also being followed — the column won't exist

### 6. `prisma/seed.js`
- Add the new field to the relevant seed data
- If the field lives inside a JSON column (e.g. `internalProjects`, `strategicConcerns`), update the object literal inside the JSON array
- Use the **canonical field name** from `types.ts` — mismatches are the most common source of bugs here (see `harmonizationFramework` vs. `harmonization` incident)
- Use the **correct option labels** if the field is a `string[]` of option values — copy them exactly from the form's `OPTIONS` constant, not from memory

### 7. `scripts/export-sample-issp.js`
- If the field maps from a DB column (e.g. `Part1Profile.cioName`), add `fieldName: p1?.fieldName ?? defaultValue`
- If the field lives in a JSON column, it passes through `parseJson()` automatically — no change needed
- Update the comment at the top if the output shape changed materially

### 8. Regenerate the demo file
```bash
node scripts/export-sample-issp.js
# Writes to public/demo/ncwtr-issp-2026-2028.issp
```
Verify the output contains the new field with the expected value.

### 9. PDF export route (`src/app/api/export/route.ts`) — if applicable
Only needed if the field affects PDF rendering.
- Update the mapping in `mapProject()` (for `IctProject` fields) or the main `IsspDocument → IsspData` mapping
- **Label strings rule**: if the field stores option labels (e.g. `"E-Government Master Plan"`), the `.includes()` check must use the **exact same label string** — not a camelCase key, not a substring
- If the field maps to a `Record<string, boolean>` for checkboxes, every key must be checked individually against the stored array

### 10. Type check
```bash
npx tsc --noEmit
```
Fix all errors before proceeding.

### 11. Update documentation
- `docs/session-handoff.md` — update affected sections (type tables, mapping tables, known issues if resolved)
- `docs/project-status.md` — add to Known Bugs Fixed if this resolves an issue; add to Next Up if it introduces known follow-up work

---

## Prisma Schema Checklist (dormant — use carefully)

The Prisma DB and server-side routes are dormant. Only run this checklist if the change explicitly requires a new DB column (e.g. for a future server-side feature being planned).

### ⚠️ DO NOT run `npx prisma migrate dev`
Migrations have drifted — running it will prompt to reset the DB and wipe all seed data.

### 1. `prisma/schema.prisma`
- Add the column with a `@default(...)` so existing rows don't break
- For JSON fields: `String @default("[]")` or `String @default("{}")`

### 2. Apply the migration manually
```bash
# Run directly against dev.db
node -e "
const Database = require('better-sqlite3');
const db = new Database('dev.db');
db.prepare('ALTER TABLE TableName ADD COLUMN columnName TEXT NOT NULL DEFAULT \"\"').run();
db.close();
console.log('done');
"
```

### 3. Regenerate Prisma client
```bash
npx prisma generate
```

### 4. `prisma/seed.js`
- Add the field to the seed `create` or `upsert` call

### 5. Dormant API routes
- Update any `GET`/`PUT` handlers in `src/app/api/issp/documents/[id]/partX/` that read or write this column

### 6. Type check
```bash
npx tsc --noEmit
```

### 7. Update documentation
Same as IDB/JSON step 11 above.

---

## Common Pitfalls

| Pitfall | Prevention |
|---|---|
| Field name in seed doesn't match `types.ts` | Copy field name from `types.ts`, not from memory |
| Option labels in seed don't match form's `OPTIONS` constant | Copy values from the form component, not from memory |
| New field absent from editor page's `initialData` | After editing the form, immediately open its editor page and add the field |
| Old `.issp` files crash on load | Always use `?? defaultValue` when reading from `initialData` in the form init |
| PDF checkboxes still unchecked | Confirm `.includes()` in export route uses the exact label string the form stores |
| Demo file not regenerated | Always run `node scripts/export-sample-issp.js` after seed changes |
