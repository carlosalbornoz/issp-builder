# Unsaved Changes — Content Snapshot + Field Diff

**Status:** ✅ Implemented — 2026-05-23 (session 4)  
**Depends on:** Current `editor-sidebar.tsx`, `src/lib/store/index.tsx`, `src/lib/sections.ts`

---

## Problems with the current implementation

### 1. False positive "Unsaved changes"
`unsavedToFile` is computed by comparing timestamps:
```ts
const unsavedToFile = !!doc && doc.updatedAt > (fileSavedAt ?? doc.createdAt);
```
If a user edits a field and then reverts it to the original value, `doc.updatedAt` has already been bumped. The indicator stays amber even though the document content is identical to the saved file.

### 2. Granularity — section list is not enough
Clicking "Unsaved changes" currently shows which *sections* have been edited since the last save (via `lastEditedAt > fileSavedAt`). It does not show *which fields* within those sections changed. For audit purposes, a user reviewing their draft before downloading wants to know: "I changed the Vision Statement and added one Strategic Concern" — not just "Part I-A and Part II-A were touched."

---

## Solution overview

Store a **content snapshot** of the document at the time of each file save or file load. Replace the timestamp comparison with a **content diff** against the snapshot. Use a **`SECTION_FIELDS` map** to translate changed part-level keys into section-scoped, human-readable field labels.

---

## Step 1 — Content snapshot in the store

### New store state

Add `savedSnapshot: IsspDocument | null` to `IsspStoreValue` in `src/lib/store/index.tsx`.

```ts
// In IsspStoreValue interface
savedSnapshot: IsspDocument | null;
```

### When to set it

| Event | Action |
|---|---|
| `saveToFile()` called | `setSavedSnapshot(structuredClone(doc))` |
| `loadFromFile(file)` resolves | `setSavedSnapshot(structuredClone(loaded))` |
| `clearDoc()` called | `setSavedSnapshot(null)` |
| `createNew()` called | `setSavedSnapshot(structuredClone(newDoc))` — new doc starts with no unsaved changes |

`savedSnapshot` is **in-memory only** — not persisted to IDB. On a fresh page load (browser restart), the snapshot is null, so the old timestamp check acts as a fallback until the user saves or loads a file.

### Content comparison function

```ts
function docContentHash(doc: IsspDocument): string {
  // Strip implementation timestamps and lastEditedAt from comparison.
  // Keep userMarkedDone — it is user-intentional state.
  const { updatedAt, exportedAt, sectionMeta, ...rest } = doc;
  const metaStripped = sectionMeta
    ? Object.fromEntries(
        Object.entries(sectionMeta).map(([k, v]) => [k, { userMarkedDone: v.userMarkedDone }])
      )
    : {};
  return JSON.stringify({ ...rest, sectionMeta: metaStripped });
}
```

### Updated `unsavedToFile`

```ts
const unsavedToFile = savedSnapshot
  ? docContentHash(doc) !== docContentHash(savedSnapshot)
  : !!doc && doc.updatedAt > (fileSavedAt ?? doc.createdAt); // fallback on fresh load
```

This immediately fixes the false positive: reverting a field to its original value makes the hash equal, clearing the amber indicator.

---

## Step 2 — SECTION_FIELDS map

New file: `src/lib/section-fields.ts`

Maps each section ID to the part key it writes to and the human-readable labels for each top-level field it can modify. Only writable fields are listed — computed/derived fields are omitted.

```ts
export interface SectionField {
  key: string;       // key in the part data object
  label: string;     // human-readable label shown in the sidebar diff
}

export interface SectionFieldDef {
  partKey: "part1" | "part2" | "part3" | "part4";
  fields: SectionField[];
}

export const SECTION_FIELDS: Record<string, SectionFieldDef> = {
  "part1/a": {
    partKey: "part1",
    fields: [
      { key: "legalBasis",       label: "Legal Basis" },
      { key: "mandateFunction",  label: "Mandate / Function" },
      { key: "visionStatement",  label: "Vision Statement" },
      { key: "missionStatement", label: "Mission Statement" },
      { key: "orgOutcomes",      label: "Organizational Outcomes" },
    ],
  },
  "part1/b": {
    partKey: "part1",
    fields: [
      { key: "cioName",          label: "CIO Name" },
      { key: "cioPosition",      label: "CIO Position" },
      { key: "cioUnit",          label: "CIO Unit" },
      { key: "cioEmail",         label: "CIO Email" },
      { key: "cioContact",       label: "CIO Contact" },
      { key: "focalSameAsCio",   label: "Focal Person (same as CIO)" },
      { key: "focalName",        label: "Focal Name" },
      { key: "focalPosition",    label: "Focal Position" },
      { key: "focalUnit",        label: "Focal Unit" },
      { key: "focalEmail",       label: "Focal Email" },
      { key: "focalContact",     label: "Focal Contact" },
      { key: "humanCapital",     label: "Human Capital Summary" },
    ],
  },
  "part1/c": {
    partKey: "part1",
    fields: [
      { key: "stakeholders",     label: "Stakeholders" },
    ],
  },
  "part2/a": {
    partKey: "part2",
    fields: [
      { key: "strategicConcerns", label: "Strategic Concerns" },
    ],
  },
  "part2/b": {
    partKey: "part2",
    fields: [
      { key: "networkDiagrams",       label: "Network Diagrams" },
      { key: "networkDescription",    label: "Network Description" },
      { key: "cybersecurityControls", label: "Cybersecurity Controls" },
    ],
  },
  "part2/c": {
    partKey: "part2",
    fields: [
      { key: "informationSystems", label: "IS Inventory" },
    ],
  },
  "part2/d": {
    partKey: "part2",
    fields: [
      { key: "egpChecklist", label: "E-Government Programs" },
    ],
  },
  "part3/a": {
    partKey: "part3",
    fields: [
      { key: "proposedNetworkDataUrl",     label: "Proposed Network Diagram" },
      { key: "proposedNetworkDesc",        label: "Proposed Network Description" },
      { key: "proposedCybersecControls",   label: "Proposed Cybersecurity Controls" },
    ],
  },
  "part3/b": {
    partKey: "part3",
    fields: [
      { key: "enterpriseArchDataUrl", label: "Enterprise Architecture Diagram" },
    ],
  },
  "part3/c": {
    partKey: "part3",
    fields: [
      { key: "proposedHumanCapital", label: "Proposed Human Capital" },
    ],
  },
  "part3/d": {
    partKey: "part3",
    fields: [
      { key: "proposedSystems", label: "Proposed Information Systems" },
    ],
  },
  "part3/e1": {
    partKey: "part3",
    fields: [
      { key: "internalProjects", label: "Internal ICT Projects" },
    ],
  },
  "part3/e2": {
    partKey: "part3",
    fields: [
      { key: "crossAgencyProjects", label: "Cross-Agency ICT Projects" },
    ],
  },
  "part3/f": {
    partKey: "part3",
    fields: [
      { key: "performanceFramework", label: "Performance Framework" },
    ],
  },
  "part4/year1": {
    partKey: "part4",
    fields: [{ key: "year1", label: "Year 1 Budget" }],
  },
  "part4/year2": {
    partKey: "part4",
    fields: [{ key: "year2", label: "Year 2 Budget" }],
  },
  "part4/year3": {
    partKey: "part4",
    fields: [{ key: "year3", label: "Year 3 Budget" }],
  },
  "part4/summary": {
    partKey: "part4",
    fields: [], // read-only computed view; no writable fields
  },
};
```

**Note on CIO fields in Part I/B:** The CIO fields share keys with Part I/A (both are in `part1`). They are distinct top-level keys so the diff correctly attributes them to Part I/B.

---

## Step 3 — Field diff computation

A helper function (can live in `src/lib/section-fields.ts`) computes which fields changed for a given section:

```ts
export function getChangedFields(
  sectionId: string,
  current: IsspDocument,
  snapshot: IsspDocument
): SectionField[] {
  const def = SECTION_FIELDS[sectionId];
  if (!def || def.fields.length === 0) return [];

  const currentPart = current[def.partKey] as Record<string, unknown>;
  const snapshotPart = snapshot[def.partKey] as Record<string, unknown>;

  return def.fields.filter(
    (f) => JSON.stringify(currentPart[f.key]) !== JSON.stringify(snapshotPart[f.key])
  );
}
```

---

## Step 4 — Update the sidebar

### Changed sections computation

Replace the current `lastEditedAt`-based computation in `editor-sidebar.tsx` with a snapshot diff:

```ts
// In EditorSidebar — replace current changedSections block
const changedSections: { section: SectionDef; part: PartDef; changedFields: SectionField[] }[] = [];

if (doc && unsavedToFile && savedSnapshot) {
  for (const part of PARTS) {
    for (const section of part.sections) {
      const fields = getChangedFields(section.id, doc, savedSnapshot);
      if (fields.length > 0) {
        changedSections.push({ section, part, changedFields: fields });
      }
    }
  }
} else if (doc && unsavedToFile && !savedSnapshot) {
  // Fallback when no snapshot (fresh browser load): show sections with lastEditedAt
  for (const part of PARTS) {
    for (const section of part.sections) {
      const editedAt = (doc.sectionMeta ?? {})[section.id]?.lastEditedAt;
      if (!editedAt || (fileSavedAt && editedAt <= fileSavedAt)) continue;
      changedSections.push({ section, part, changedFields: [] });
    }
  }
}
```

### Sidebar expanded view update

When `changedFields` is available, show them as an indented sub-list under each section row:

```
▾ Unsaved changes
  I  A. Mandate, Vision & Mission
       Vision Statement
       Mission Statement
  II  A. Strategic Concerns
       Strategic Concerns
```

Each field name is plain text (not a link). The section name itself remains the link.

---

## Implementation order

1. **Step 1 — Snapshot in store** ← implement first; fixes the false positive immediately with no UI change beyond the correct amber/green behavior.
2. **Step 2 — `SECTION_FIELDS` map** ← can be written as a standalone file; no runtime coupling yet.
3. **Steps 3 + 4 — Diff + sidebar** ← wire everything together in the sidebar.

Each step is independently committable.

---

## Edge cases and constraints

| Case | Handling |
|---|---|
| Fresh browser load (no snapshot yet) | Fall back to `lastEditedAt`-based section list with empty `changedFields`; no field-level detail shown |
| `part4/summary` | No writable fields; never appears in the diff list |
| Section with no changes in snapshot diff | Excluded from the list |
| `userMarkedDone` flip without content edit | Not captured by `SECTION_FIELDS` diff (it's in `sectionMeta`, not part data); shown only if snapshot comparison catches the `sectionMeta.userMarkedDone` difference in `docContentHash` |
| Very large array fields (e.g., `informationSystems` with 20+ items) | `JSON.stringify` diff is accurate but shows only "IS Inventory (changed)" — no per-item diff; acceptable for sidebar granularity |
| Agency metadata changes (name, logo, period) | In `doc.agency`, `doc.startYear`, `doc.endYear` etc. — not currently section-attributed; could be shown under a top-level "Document Properties" entry if needed later |

---

## Files to touch

| File | Change |
|---|---|
| `src/lib/store/index.tsx` | Add `savedSnapshot` state; update `saveToFile`, `loadFromFile`, `clearDoc`, `createNew`; update `unsavedToFile` computation |
| `src/lib/store/index.tsx` | Export `savedSnapshot` via `IsspStoreValue` |
| `src/lib/section-fields.ts` | **New file** — `SECTION_FIELDS`, `getChangedFields`, `docContentHash` |
| `src/components/editor/editor-sidebar.tsx` | Import `savedSnapshot` from store; replace `changedSections` computation; update sidebar expanded view to show field labels |

No changes required to form components, `useLocalSave`, `SectionShell`, or the PDF export pipeline.
