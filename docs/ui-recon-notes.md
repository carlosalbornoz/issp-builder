# UI Refresh — Recon Notes

**Branch:** `ui-refresh`
**Status:** Complete

---

## 1. Where is the Overview rendered?

`src/app/editor/page.tsx` — single file with two inline components:
- `SplashView` — rendered when no document is loaded
- `OverviewView` — rendered when a document is loaded

The `OverviewView` is a flat inline component (not extracted). The Part card data is a `PART_CARDS` constant in the same file. Both views are exported as the default `EditorPage` component.

**For Phase 4:** Replace `OverviewView`'s body in-place. The route and the splash logic stay untouched.

---

## 2. In-memory document shape

Single nested tree: `IsspDocument` in `src/lib/store/types.ts`.

Top-level fields:
```
version, fileType, exportedAt, tool, title,
startYear, endYear, amendmentNumber, scope, agencyHeadName,
agency: AgencyInfo,
part1: Part1Data,
part2: Part2Data,
part3: Part3Data,
part4: Part4Data,
createdAt, updatedAt
```

**Missing (Phase 1 additions needed):**
- `schemaVersion` — not present
- `planStatus` — not present
- `submissionTarget` — not present
- Per-section `userMarkedDone` / `lastEditedAt` — not present at any granularity

---

## 3. Sidebar navigation

Purely route-based: sidebar uses `<Link href="/editor/part1/a">` etc. Active state is driven by `usePathname()` from `next/navigation`, comparing the current path against each item's `href`. No state mutation, no anchor navigation.

**For Phase 5:** Status dots can read from the document store directly — no routing changes needed.

---

## 4. Per-section `lastEditedAt`

**Does not exist today.** Only `doc.updatedAt` at the document level.

Adding per-section timestamps requires a schema change. The cleanest approach: a top-level optional `sectionMeta` record keyed by section ID (e.g. `"part1/a"`, `"part4/year1"`), each with `{ userMarkedDone: boolean; lastEditedAt: string | null }`.

```ts
// Proposed addition to IsspDocument
sectionMeta?: Record<string, { userMarkedDone: boolean; lastEditedAt: string | null }>;
```

18 sections × optional record = minimal overhead. Default: if key is absent, treat as `{ userMarkedDone: false, lastEditedAt: null }`.

**"Continue where you left off"** needs per-section `lastEditedAt` to be useful. Without it, we can only fall back to "Start with Part I" for all documents.

---

## 5. Save status signals — two places, same source

The sidebar footer shows `unsavedToFile` / `fileSavedAt` (file sync status).

Each section form uses `<SaveStatusIndicator status={status} />` which shows "Local draft saved" / "Saving draft..." — this is `useLocalSave()`, which re-exports `saveStatus` from the store. **It's the same `saveStatus` signal displayed in two places.**

**Conclusion:** The per-section "Local draft saved" indicator is redundant once the sidebar save status is promoted in Phase 5. It can be removed from all form components during Phase 6 (SectionShell migration).

---

## 6. Part color mapping

Currently inline Tailwind class strings inside the `PART_CARDS` constant in `editor/page.tsx`:

```ts
color: "border-l-blue-500"   // Part I
color: "border-l-amber-500"  // Part II
color: "border-l-green-500"  // Part III
color: "border-l-purple-500" // Part IV
```

No central constant. The same part colors appear independently in the sidebar (`NAV_SECTIONS` in `editor-sidebar.tsx` — no color mapping there, just labels).

**For Phase 3/4:** Extract a `PART_COLORS` constant (e.g. in `src/lib/constants.ts`) mapping part number → CSS variable name. The mockup uses exact hex values (`--part-1: #2563EB` etc.) — these should map to Tailwind config or CSS variables.

---

## 7. Shared section editor chrome

**None.** Each page in `src/app/editor/part*/*/page.tsx` delegates directly to a form component:

```tsx
// Every section page follows this pattern:
export default function Part1APage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();
  if (loading) return null;
  if (!doc) { router.replace("/editor"); return null; }
  return <Part1AForm agencyType={doc.agency.type} initialData={doc.part1} />;
}
```

Title, description, breadcrumb, save status, and prev/next nav are all rendered inside each form component separately. The only shared UI piece across forms is `SaveStatusIndicator`.

**For Phase 6:** `SectionShell` wraps around each form component's body. The page files stay thin — they just pass doc data into the shell-wrapped form.

---

## 8. Section editor inventory (18 total)

| Section | Route | Form component |
|---|---|---|
| Part I/A — Mandate, Vision & Mission | `/editor/part1/a` | `Part1AForm` |
| Part I/B — Organization Structure | `/editor/part1/b` | `Part1BForm` |
| Part I/C — Stakeholder Analysis | `/editor/part1/c` | `Part1CForm` |
| Part II/A — Strategic Concerns | `/editor/part2/a` | `Part2AForm` |
| Part II/B — Network & Cybersecurity | `/editor/part2/b` | `Part2BForm` |
| Part II/C — IS Inventory | `/editor/part2/c` | `Part2CForm` |
| Part II/D — E-Government Programs | `/editor/part2/d` | `Part2DForm` |
| Part III/A — Proposed Infrastructure | `/editor/part3/a` | `Part3AForm` |
| Part III/B — Enterprise Architecture | `/editor/part3/b` | `Part3BForm` |
| Part III/C — Proposed Human Capital | `/editor/part3/c` | `Part3CForm` |
| Part III/D — Proposed IS | `/editor/part3/d` | `Part3DForm` |
| Part III/E.1 — Internal Projects | `/editor/part3/e1` | `Part3E1Form` |
| Part III/E.2 — Cross-Agency Projects | `/editor/part3/e2` | `Part3E2Form` |
| Part III/F — Performance Framework | `/editor/part3/f` | `Part3FForm` |
| Part IV — Year 1 Breakdown | `/editor/part4/year1` | `Part4YearForm` (year=startYear, yearKey="year1") |
| Part IV — Year 2 Breakdown | `/editor/part4/year2` | `Part4YearForm` (year=startYear+1, yearKey="year2") |
| Part IV — Year 3 Breakdown | `/editor/part4/year3` | `Part4YearForm` (year=startYear+2, yearKey="year3") |
| Part IV — Summary of Investments | `/editor/part4/summary` | `Part4SummaryForm` |

---

## Decisions confirmed (2026-05-23)

**Schema shape (Q9):** `sectionMeta?: Record<string, { userMarkedDone: boolean; lastEditedAt: string | null }>` added as top-level optional field on `IsspDocument`. Keyed by section path (`"part1/a"`, `"part4/year1"`, etc.). No changes to Part1–4Data types.

**Font loading (Q4):** `next/font/google` — Fraunces, IBM Plex Sans, IBM Plex Mono loaded in `src/app/layout.tsx`.

**Per-section save indicator (Q10):** Remove `SaveStatusIndicator` from all 18 form components during Phase 6. Sidebar save status (Phase 5) is the single source of truth.

**Part color constant (Q11):** Extract to a shared constant during Phase 3 (when CSS variables are being set up anyway).
