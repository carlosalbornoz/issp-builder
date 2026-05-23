# UI Refresh — Implementation Plan

**Branch:** `ui-refresh`
**Owner:** @carlosanton.io
**Reference mockups:** `references/design_upgrade/issp-editor-redesign.html` (Overview), `references/design_upgrade/issp-section-editor-redesign.html` (Section editor)
**Source spec:** `references/design_upgrade/ISSP_EDITOR_IMPLEMENTATION_PLAN.md`
**Status:** Phases 1–5 complete — Phase 6 next

---

## What this is

A significant but well-scoped UI overhaul across three layers:

1. **Design language** — font and color palette swap
2. **Overview screen** → true dashboard with completion tracking and "continue where you left off"
3. **Section editors** → shared chrome shell, status dots, "Mark as done" affordance

The underlying data shapes (budget rows, form fields, etc.) are not changing. The `.issp` file format gains optional fields only — existing files open without prompting.

---

## Design language

| Token | Current | New |
|---|---|---|
| Display font | Inter | Fraunces (opsz variable) |
| UI font | Inter | IBM Plex Sans |
| Mono font | — | IBM Plex Mono |
| Background | neutral white | `#FAFAF7` (warm off-white) |
| Surface | `#fff` | `#FFFFFF` / `#F2F1EC` / `#EAE8E1` |
| Borders | neutral gray | `#E5E3DC` / `#EFEDE5` / `#D4D2C9` (warm) |
| Part I color | blue | `#2563EB` (same) |
| Part II color | amber | `#C2680C` (same) |
| Part III color | green | `#15803D` (same) |
| Part IV color | purple | `#6D28D9` (same) |

---

## Phases

### Phase 0 — Reconnaissance
Before touching code, confirm assumptions against the actual codebase. Produce `docs/ui-recon-notes.md` answering:

1. Where is the Overview rendered? (route + component)
2. What is the in-memory shape of the loaded ISSP document?
3. How does the sidebar navigate to a subsection — route, state, or anchor?
4. Does `lastEditedAt` exist at any granularity today (section-level or document-level only)?
5. Where is "file up to date / saved X ago" computed? Is the per-section "Local draft saved" tag the same signal?
6. Where does the Part color mapping live today?
7. Does any shared section editor chrome exist, or does each page repeat it inline?
8. Inventory all 18 section editor pages.

### Phase 1 — Data model
Add optional fields to the `.issp` schema. All new fields have defaults — no migration prompt on open.

**Per-section status:**
- `userMarkedDone: boolean` — toggled by the Mark-as-done button in Phase 6
- `lastEditedAt: string | null` — ISO timestamp, updated on content change
- Derived `status: "empty" | "in_progress" | "done"` — computed, not stored:
  - `done` if `userMarkedDone === true`
  - `empty` if content matches defaults
  - `in_progress` otherwise

**Plan-level metadata** (top of `IsspDocument`):
- `planStatus: "draft" | "for_review" | "submitted"` — default `"draft"`
- `submissionTarget: { agency: string; deadline: string | null }` — default `{ agency: "DICT", deadline: null }`

**Schema versioning:**
- Add `schemaVersion: 2` on save
- On load, if missing or `1`, derive defaults before passing to the editor

Use the `schema-change` skill for this phase.

**Acceptance:** Existing `.issp` files open without prompting. New fields persist through save/reopen.

### Phase 2 — Shared primitives
Four pure presentation components in `src/components/ui/`:

| Component | Props | Description |
|---|---|---|
| `StatusDot` | `status: "empty" \| "in_progress" \| "done"`, `size?` | 7px circle; green/amber/gray |
| `RelativeTime` | `iso: string \| null` | Short labels: `1h`, `2d`, `3w`; `—` for null. Uses `Intl.RelativeTimeFormat`. |
| `CompletionBar` | `numerator`, `denominator`, `showLabel?` | 4px bar in success green. Optional `N% · X of Y` label. |
| `PlanStatusPill` | `status: "draft" \| "for_review" \| "submitted"` | Dot + label pill. Draft → amber, for_review → blue, submitted → green. |

No business logic. Only consume CSS variables — no hardcoded hex.

### Phase 3 — Font and color tokens
Global design language swap:

1. Load `Fraunces`, `IBM Plex Sans`, `IBM Plex Mono` via `next/font/google` in `src/app/layout.tsx`
2. Update CSS variables in `src/app/globals.css` to match the warm palette from the mockup
3. Smoke-test all existing pages for obvious breakage

This phase is intentionally narrow — no layout changes, just tokens and fonts.

### Phase 4 — Overview redesign
Replace the Overview body (`src/app/editor/page.tsx` when a doc is loaded) with the new composition. The route stays; only the inner content changes.

Components to build (all in `src/components/editor/overview/`):

| Component | What it renders |
|---|---|
| `PlanMetadataStrip` | Agency code pill, period, plan status pill, DICT submission deadline. Right-aligned. |
| `OverviewHeader` | Document title (Fraunces 36px) on the left; completion % + `CompletionBar` + "X of Y sections done" on the right. |
| `ContinueEditingCard` | Info-tinted card: play icon, "Continue where you left off", breadcrumb of last-edited section, relative time, right arrow. Navigates to that section on click. Falls back to "Start with Part I" for new docs. |
| `PartCard` | 2×2 grid. Each card: 3px color accent strip, part label + subsection count, aggregated status, part title (Fraunces), list of subsection rows (StatusDot + label + RelativeTime). Each row clickable. |

Delete the old Overview card component once nothing references it.

**"Last edited section" logic:** leaf with most recent `lastEditedAt` → first `in_progress` → first `empty`.

**Acceptance:** Clicking any subsection row routes to that section. 0% with all empty; 100% with all done.

### Phase 5 — Sidebar refinements
File: `src/components/editor/editor-sidebar.tsx`

1. **Status dots** — add `StatusDot` to the left of every leaf item in the TOC
2. **Demote destructive actions** — move "Start Over" and "Load Different ISSP" into a kebab menu (⋮) next to the save-status footer. Menu items: Download .issp, Load different ISSP…, separator, Start over… (danger)
3. **Save status** — sentence-case, slightly larger: "Saved 1 hr ago" / "Saving…" / "Unsaved changes" with a pulsing dot. Evaluate consolidating the per-section "Local draft saved" indicator (confirm in Phase 0 recon)

**Acceptance:** Every sidebar leaf shows its status dot. "Start over" reachable in ≤2 clicks but not the first thing visible.

### Phase 6 — SectionShell (section editor framework)
Extract shared section chrome into a reusable wrapper. All 18 section editors migrate to it.

**`SectionShell` props:**
```tsx
{
  breadcrumb: { label: string; href?: string }[]
  title: string
  description: string
  status: "empty" | "in_progress" | "done"
  statBlock?: { label: string; value: string; caption?: string }
  prevSection?: { label: string; partLabel: string; href: string }
  nextSection?: { label: string; partLabel: string; href: string } | "overview"
  isDone: boolean
  onMarkDone: (done: boolean) => void
  validationIssues?: number
  children: React.ReactNode
}
```

**Shell renders, in order:**
1. Breadcrumb (clickable segments)
2. Section head: title + status pill + optional stat block, divider
3. Section description
4. `children` (body)
5. Footer: `MarkAsDone` + `SectionNavLink` prev/next

**Supporting components:**
- `Callout` — variants: `info` (blue), `tip` (green), `warning` (amber), `danger` (red)
- `MarkAsDone` — two states: outlined "Mark this section as done" / filled green "Marked as done · click to undo". Writes `userMarkedDone` → updates sidebar dot + Overview immediately.
- `SectionNavLink` — prev (outlined) and next (dark filled) cards. At first section: no prev. At last section: next → "Return to Overview".

**Migration order:** Part I → II → III → IV. Migrate by wrapping existing body content in `SectionShell` — do not refactor body content in this phase.

**Acceptance:** Every section uses `SectionShell`. Marking done from any section updates sidebar dot and Overview completion live. Prev/next works across all 18 sections.

### Phase 7 — Section body patterns (deferred)
Build shared body-pattern components and migrate each section to use the appropriate one.

> **This phase is deferred until Phase 6 ships to prod.** It is the heaviest phase and the visual refresh is useful without it.

Patterns planned:

| Pattern | Used by | Key components |
|---|---|---|
| A — Standard form fields | Part I/A, I/B, I/C, II/A, most others | `FormGroup`, `FieldRow`, `Field`, `CheckboxField` |
| B — Toggle list | Part II/D E-Government Programs | `ToggleListItem` with status pills + conditional fields |
| C — File attach | Part III/B Enterprise Architecture | `FileAttach` placeholder dropzone |
| D — Budget tables | Part IV Year 1–3, Summary | `SubsectionCard`, `ExpenseTable`, `ExpenseRow`, `UACSField`, `CurrencyInput`, `YearGrandTotal` |
| E — Project/item list | Part III/E.1, E.2, F | To be designed after recon |

Migration order within Phase 7: Part IV Year 1 (proves Pattern D) → Year 2/3/Summary → Part I/B → Part II/D → Part III/B → remaining.

### Phase 8 — Polish (deferred)
Low-risk cleanups, also deferred:

- Avatar: reduce to 32px, tooltip with user name
- Sentence-case audit: all-caps sidebar labels and mixed Title Case headings → sentence case throughout
- Editor body width: cap section editors at ~980px; budget tables scroll horizontally inside container
- Currency display: audit for consistency — `₱` prefix, thousands separators, 2 decimal places, using `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`

---

## Shipping strategy

**Ship in two batches:**

**Batch 1 (this sprint):** Phases 0–5
Visual refresh is usable and complete. Overview becomes a dashboard. Sidebar gets status dots and kebab menu. Font and palette swap lands.

**Batch 2 (next sprint):** Phases 6–8
Section shell migration + body patterns + polish.

After each phase: commit, build, verify `.issp` files still open, check prod via `apps.carlosanton.io/issp`.

---

## Open questions

1. ~~**Font loading**~~ → `next/font/google`. Decided 2026-05-23.
2. ~~**`lastEditedAt` granularity**~~ → top-level `sectionMeta?: Record<string, { userMarkedDone: boolean; lastEditedAt: string | null }>` on `IsspDocument`. Decided 2026-05-23.
3. ~~**"Local draft saved" consolidation**~~ → ~~remove `SaveStatusIndicator` from all 18 forms in Phase 6~~ — **done 2026-05-23**: removed from all 14 Part I–IV forms this session (sidebar is sole status source). Phase 6 SectionShell migration can skip this step. Decided 2026-05-23.
4. **Properties dialog** — after the metadata strip lands (Phase 4), does the existing Properties button still need to open a dialog, or does the strip replace it?

---

## Cross-cutting acceptance criteria (when fully shipped)

- A user opens the editor and within three seconds can answer: how far am I, what did I edit last, are there any problems.
- Clicking "Continue" lands on the last-edited section.
- Every subsection on the Overview is clickable and routes correctly.
- Sidebar dots match Overview status; both update live on edit or mark-done.
- Every section editor shares the same chrome (breadcrumb, header, footer).
- No regressions in document open / save / PDF export.
- All existing `.issp` files load without prompting.
