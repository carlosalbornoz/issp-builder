# ISSP Editor — Implementation Plan

**Owner:** @carlosanton.io
**Target:** ISSP Platform PH (Next.js app)
**Scope:** Overview screen, sidebar, section editors (forms), and supporting data model
**Status:** Ready for implementation

---

## 1. Context

The Overview screen currently renders four cards (one per ISSP Part) that visually duplicate the sidebar TOC. The cards carry no progress information, no last-edited state, and no validation signal. There is no plan-level metadata visible (agency, period, draft/submitted status, DICT submission deadline). There is no primary "what do I do next" CTA. The "Start Over / Load Different ISSP" destructive action sits at the top of the sidebar — high prominence, rarely used.

The section editors (the screens the user actually fills out — Resource Requirements, Enterprise Architecture, E-Government Programs, Organization Structure, and the rest of the 18 leaf sections) each render their own chrome inline: title, description, info callouts, body, save status, prev/next navigation. There is duplication across sections, inconsistency in spacing and typography, and no consistent "Mark as done" affordance to drive the section-status data model. Several section types share patterns (form fields, status toggles, file attach, budget tables) that should live in shared components instead of being re-implemented per section.

This plan turns the Overview into a true dashboard, makes per-section status first-class data, rebalances sidebar prominence, and standardizes the section editor chrome and the patterns its body content uses.

Visual mockups exist for the redesigned Overview (with the redesigned sidebar) and for the Year 1 Breakdown section editor. They should be treated as the source of truth for layout.

## 2. Goals & non-goals

**Goals**

- A user opening the editor can see at a glance: how complete the plan is, what they edited last, what's left to do, and whether there are any validation issues.
- Each Part card on the Overview shows per-subsection status and is clickable to jump directly to that subsection.
- Plan-level metadata (agency, period, status, DICT submission deadline) is visible on the Overview, not hidden behind a "Properties" button.
- The sidebar shows status signals at a glance.
- Destructive actions ("Start Over / Load Different ISSP") are no longer in the most prominent slot.
- Existing `.issp` files continue to open without manual migration.
- Section editors share a consistent shell: breadcrumb, header (title + status + optional stat block), section description, body, footer (Mark as done + prev/next).
- Section editors use a small set of body patterns (forms, status-toggle lists, file attach, budget tables) so look and feel stay consistent across all 18 sections.
- Marking a section as done from within the editor updates the sidebar dot and the Overview status immediately.

**Non-goals**

- Building a full validation engine. We scaffold the data shape and surface a count, but actual rule authoring is a follow-up.
- Collaborative editing, cloud sync, or auth.
- Redoing PDF export styling.
- Mobile layout work (desktop-first; existing responsiveness preserved but not extended).
- Implementing actual file upload for file-attach sections — placeholder UI only, matching current behavior.
- Custom rich-text editors. Long-form text fields stay as plain textareas.
- Refactoring the per-section data shapes themselves (e.g., the budget row schema). We refactor the *rendering* of sections, not the underlying data structure.
- Locale switching (Tagalog UI).

## 3. How to work this plan

Phased so each phase is independently shippable and reviewable. Recommended workflow:

1. Start with **Phase 0 (Reconnaissance)** and write up findings before touching code. Many assumptions below are best-guesses; confirm against the actual codebase.
2. After each phase, commit and verify the app still builds and existing `.issp` files still open.
3. Phases 1 and 2 are foundational — do them first.
4. After Phase 2: Phase 3 (Overview), Phase 4 (Sidebar), and Phase 5 (Section editor framework) can proceed in parallel. Phase 6 (Section editor patterns) depends on Phase 5.
5. Phase 7 (Polish) is low-risk cleanup and can be deferred under scope pressure.
6. Use small, descriptive commits per logical change rather than one giant commit per phase.
7. Do not change the `.issp` file format in a breaking way. All new fields must be optional with sensible defaults derived on read.

## 4. Phase 0 — Reconnaissance

Before writing any new code, produce `RECON_NOTES.md` at repo root answering:

1. Where is the Overview screen rendered? (Likely a route under `app/editor/...` or a component like `OverviewPanel.tsx`.)
2. What is the in-memory shape of the loaded ISSP document? Single nested tree, flat collections with IDs, or other?
3. What is the `.issp` file schema? Versioned? Where parsed/serialized?
4. How does the sidebar navigate to a specific subsection — by route, by state, by anchor?
5. Where is the "file up to date / X ago" status computed? Is autosave already in place?
6. Per-section `lastEditedAt` — does it exist at any granularity?
7. Where does the four-color Part identity (blue / amber / green / purple) live? CSS module? Theme constants?
8. Routing or state pattern for "current section" we can read to drive "Continue where you left off"?
9. Where do section editors live? Is there a shared shell already, or does each section page repeat its breadcrumb / header / footer chrome inline? Inventory all 18 section editors.
10. What is the budget-row schema in Resource Requirements? (Item, office, UACS code, fund source, qty, unit cost, total — confirm or amend.)
11. Is there a UACS code list bundled with the app, fetched from an API, or hand-typed by users today?
12. For file-attach sections (Enterprise Architecture EA diagram, etc.): is upload implemented, or stubbed with placeholder copy?
13. Which section editors carry their own validation, formatting, or computed totals today? (Document them so behaviors aren't lost in migration.)
14. Is the per-section "Local draft saved" indicator (visible at the top of every section page today) different in source/timing from the global "File up to date" in the sidebar? If they're the same signal in two places, we should consolidate.

Note any deviations from this plan that the codebase will require.

## 5. Phase 1 — Data model: section status & plan metadata

### 5.1 Section status

Add a derived property `status` to every leaf section. Values:

- `empty` — content matches the initial template or is structurally blank
- `in_progress` — has content but not marked done and/or has unresolved validation issues
- `done` — user explicitly marked complete, or (in future) all validation rules pass

Conservative derivation for the first cut:

- `empty` if content matches the default template or is structurally empty
- `done` if `userMarkedDone === true`
- `in_progress` otherwise

Add a per-section `userMarkedDone: boolean`, toggled by the Mark-as-done affordance built in **Phase 5**. Also add per-section `lastEditedAt: ISO string`, updated on content change. If the codebase already has document-level "last saved", this is a finer-grained version of the same mechanism.

### 5.2 Plan metadata

Add to the top-level `.issp` document:

- `agency: { code: string; name: string }`
- `period: { startYear: number; endYear: number }`
- `planStatus: "draft" | "for_review" | "submitted"` — default `"draft"`
- `submissionTarget: { agency: string; deadline: string | null }` — default `{ agency: "DICT", deadline: null }`

All new fields optional. On load, derive defaults:

- `agency.code` from the document title if it matches `<CODE> Information Systems Strategic Plan ...`
- `agency.name` defaults to empty string
- `period` parsed from the title's year range
- `planStatus` defaults to `"draft"`

### 5.3 Schema versioning

If the `.issp` file lacks a version field, add `schemaVersion: 2`. On load, if missing or `1`, run the auto-derivation before passing to the editor.

### 5.4 Acceptance criteria for Phase 1

- Existing `.issp` files open without prompting and without data loss.
- Every leaf section has `status` and `lastEditedAt` (where applicable).
- The document carries `agency`, `period`, `planStatus`, `submissionTarget` with reasonable defaults.
- Save/reopen preserves all new fields.
- Unit tests cover: empty detection, status transitions, default derivation from pre-v2 files.

## 6. Phase 2 — Shared components

Build the cross-cutting presentation primitives. They live wherever shared UI lives (likely `components/ui/`).

### 6.1 `StatusDot`

```tsx
type StatusDotProps = { status: "empty" | "in_progress" | "done"; size?: number };
```

6px circle by default. Done → success green, In progress → warning amber, Empty → muted gray.

### 6.2 `RelativeTime`

```tsx
type RelativeTimeProps = { iso: string | null };
```

Short labels: `1h`, `2d`, `3w`. `—` for null. Use `Intl.RelativeTimeFormat`; don't pull in a date library for this alone.

### 6.3 `CompletionBar`

```tsx
type CompletionBarProps = { numerator: number; denominator: number; showLabel?: boolean };
```

4px horizontal bar with the filled portion in success green. Optional `N% complete · X of Y` label.

### 6.4 `PlanStatusPill`

```tsx
type PlanStatusPillProps = { status: "draft" | "for_review" | "submitted" };
```

Small pill with colored dot + label. Mapping: draft → amber "Draft", for_review → blue "For review", submitted → green "Submitted".

A variant of this same pill is reused as the per-section status indicator in the SectionShell header (Phase 5), with mapping done → green, in_progress → amber, empty → muted gray.

### 6.5 Acceptance criteria for Phase 2

- All four primitives render in isolation (Storybook or a temporary `/_dev` route).
- Components consume only existing CSS variables — no hardcoded hex.
- Pure presentation, no business logic.

Section-editor-specific components (Callout, MarkAsDone, SectionNavLink, SubsectionCard, ExpenseTable, etc.) are introduced in Phases 5 and 6 alongside the editors that use them.

## 7. Phase 3 — Overview redesign

Reuses Phase 2 primitives to assemble the new Overview. Compose, do not inline.

### 7.1 `PlanMetadataStrip`

Sits above the document title. Renders agency code, period, plan status pill, and submission target (with deadline). Right-aligns the submission info. Reads from the document state added in Phase 1.

Each field has a hover affordance hinting at edit. Clicking opens a small popover/modal — or, for this phase, simply routes to the existing Properties panel. The point is making the data visible.

### 7.2 `OverviewHeader`

Two-column flex below the metadata strip. Left: document title (bumped to 22px / weight 500). Right: completion percentage (24px / weight 500), CompletionBar below it, `X of Y sections done` caption. Compute by walking the document tree and counting leaf statuses.

### 7.3 `ContinueEditingCard`

Horizontal info-tinted card between the header and the Part grid. Shows a play icon, "Continue where you left off" caption, breadcrumb of the last-edited section, relative time, and a right-pointing arrow.

Click navigates to that section. For new documents with no `lastEditedAt`, show "Start with Part I" pointing to the first leaf.

Determining "last edited section": take the leaf with the most recent `lastEditedAt`. Fall back to first `in_progress`, then first `empty`.

### 7.4 `PartCard`

The four cards in the 2×2 grid. Each card:

- 3px colored left strip — absolutely-positioned div inside an `overflow: hidden` rounded card so corners stay clean
- Header row: "Part I" label + "3 of 4" count on the left; aggregated status indicator on the right ("Done", "In progress", or "2 issues" in red)
- Part title in display font
- Vertical list of subsection rows. Each row: StatusDot, label (muted if empty, bold if it's the Continue target), right side relative time or issue badge. Hover tints. Click navigates.
- Part color sourced from a single mapping constant — do not hardcode hex in multiple places.

Aggregated Part status:

- `Done` if every subsection is `done`
- `Not started` if every subsection is `empty`
- `In progress` otherwise
- Issue count is the sum across subsections (placeholder — always 0 until the validation engine lands)

### 7.5 Existing Overview component

Replace the existing Overview body wholesale. Keep the route, replace the inner content with the composition: `PlanMetadataStrip` → `OverviewHeader` → `ContinueEditingCard` → `PartCard` grid. Delete the old Part card component once nothing references it.

### 7.6 Acceptance criteria for Phase 3

- All five components render correctly with a fixture document.
- A document with no `lastEditedAt` shows "Start with Part I" instead of the Continue card.
- All sections `empty` → 0% completion; all `done` → 100%, every Part card shows "Done".
- Clicking a subsection row navigates to that subsection in the editor.
- Clicking the metadata strip opens existing Properties (or its replacement per Phase 7).

## 8. Phase 4 — Sidebar refinements

### 8.1 Status dots in the sidebar

Add a `StatusDot` to the left of every leaf section in the TOC. Same component and logic as the Overview. The single biggest navigation improvement — at-a-glance progress while editing any section.

### 8.2 Demote "Start Over / Load Different ISSP"

Move out of the top sidebar slot. In order of preference:

1. Kebab menu next to the save-status footer. Items: "Load different ISSP…", "Start over…" (with confirm), "Document properties", "Export as PDF".
2. Dedicated "File" menu in a thin top bar.
3. Inside the Properties panel.

Go with option 1.

### 8.3 Promote save status

Make it sentence-cased and slightly larger: "Saved 1 hr ago" / "Saving…" / "Unsaved changes". Subtle dot indicator. The current per-section "Local draft saved" tags that show at the top of each section editor are then redundant — consolidate or remove (see Phase 0 recon question #14).

### 8.4 Acceptance criteria for Phase 4

- Every sidebar leaf shows its status dot.
- "Start Over" is reachable in ≤2 clicks but no longer the top sidebar item.
- Save status is visually present without dominating; updates live.

## 9. Phase 5 — Section editor framework

The 18 section editors all need the same chrome. Today each section page repeats the chrome inline. Extract a reusable shell so the editors look consistent and Mark-as-done lands once.

### 9.1 `SectionShell`

The wrapper component every section editor will use. Props:

- `breadcrumb` — derived from document tree + current section ID, e.g. `Overview › Part IV — Resource requirements › Year 1 breakdown`
- `title` — section title
- `description` — short prose under the title
- `status` — read from the section's `status` field (Phase 1)
- `statBlock?` — optional right-aligned (label + value + caption). Used by Resource Requirements ("Year total"), and could be used by Stakeholder Analysis ("3 stakeholders"), etc.
- `lastEditedAt?` — feeds the stat block caption
- `prevSection`, `nextSection` — derived from tree position
- `isDone`, `onMarkDone` — handled by the footer
- `validationIssues?: number` — drives the Mark-done hint text
- `children` — the section body

Shell renders, in order:

1. Breadcrumb (each segment clickable)
2. Section head: title + status pill + optional stat block, divider below
3. Section description
4. Body slot (`children`)
5. Section footer: Mark as done + prev/next nav

Every section editor migrates to wrap its body in `SectionShell`. Inline title/description/footer rendering is removed.

### 9.2 `Callout`

Replaces the ad-hoc green/info banners used today. Variants:

- `info` — blue (the budget-table UACS tip in the mockup)
- `tip` — green (Enterprise Architecture's "What to include")
- `warning` — amber
- `danger` — red

Props: `variant`, `icon?`, `title?`, `children`. Body supports rich content (paragraphs, bold, lists).

### 9.3 `MarkAsDone`

Button in the section footer. Two states:

- Unchecked: outlined, white background, "Mark this section as done"
- Checked: filled green, "Section marked as done — click to undo"

Clicking writes `userMarkedDone` on the section (Phase 1), which flips `status` to `done`, which updates sidebar dot, Part card, and Overview completion immediately.

Hint text under the button reads from `validationIssues`:

- 0 issues: "Ready to complete"
- ≥1 issues: "{n} validation issue(s) — review before marking done"

Allow the user to mark done even with open issues (with a soft warning, no blocking) — validation is best-effort scaffolding until the engine lands.

### 9.4 `SectionNavLink`

Prev/next link cards in the footer.

- Previous (left, outlined): "Previous · Part III" tag + section name
- Next (right, primary/dark): "Next · Part IV" tag + section name

At the first section: prev is hidden. At the last section: next becomes "Return to Overview" with a home icon.

Derive from the linear traversal of the document tree (Part I.A → Part I.B → ... → Part IV Summary).

### 9.5 Migration of existing section editors

Migrate all 18 section editors to wrap their bodies in `SectionShell`. Body content stays as-is for this phase — pattern-specific refactors land in Phase 6. The migration is mechanical: lift the section's existing title/description/footer chrome into the shell's props, leave the body unchanged.

### 9.6 Acceptance criteria for Phase 5

- Every section editor uses `SectionShell`. No section page renders its own breadcrumb/header/footer inline.
- Marking done from any section instantly updates the sidebar dot, Part card, and Overview completion.
- Callouts are visually consistent across all sections.
- Prev/next works for all 18 sections — verified by clicking start → end.
- No regression in section body content during migration.

## 10. Phase 6 — Section editor patterns

Section bodies fall into a small number of patterns. Build the pattern components, then migrate each section to use the appropriate one.

### 10.1 Pattern A — Standard form fields

Used by: Part I/A Mandate Vision & Mission, Part I/B Organization Structure, Part I/C Stakeholder Analysis, Part II/A Strategic Concerns, etc.

Components:

- `FormGroup` — labeled group header ("B.1 Key Personnel") with optional description, contains children
- `FieldRow` — 1- or 2-column row of `Field` children
- `Field` — label + input (`text`, `email`, `tel`, `textarea`, `number`)
- `CheckboxField` — labeled checkbox, e.g., "Concurrently held by the CIO"

Visual refinements:

- Larger field spacing than the current screenshots
- Labels in 12px / weight 400 / muted ink
- Inputs use the design system border + focus ring, consistent across the app

### 10.2 Pattern B — Toggle list with conditional fields

Used by: Part II/D E-Government Programs.

Components:

- Section summary row at top: count per status, e.g. "3 Utilizing · 1 Proposed · 4 Not Utilizing"
- `ToggleListItem` — card with header row (name + description + current-status pill), toggle row of 4 status pills acting like a radio group (Utilizing / Proposed / Not utilizing / Not applicable), and a conditional body (e.g., Adoption Percentage + Notes) shown only when the selected status warrants it

### 10.3 Pattern C — File attach

Used by: Part III/B Enterprise Architecture (EA diagram), and any other section referencing an external artifact.

Component: `FileAttach` — dashed dropzone with empty state. Since upload is not in scope, render a clear placeholder: "File upload coming soon — attach as an annex in your final document." When upload eventually lands, the component swaps to a real control without callers changing.

### 10.4 Pattern D — Budget table

Used by: Part IV Year 1, Year 2, Year 3 Breakdown, and Summary of Investments.

The largest, most layered pattern. Each year section contains multiple subsections (A, B, C, D — Office Productivity, Infrastructure, Application Development, Cybersecurity, etc.). Each subsection has two expense category tables (Capital Outlay, MOOE). Each table has rows with: item, office, UACS code, fund source, qty, unit cost, total.

Components:

- `SubsectionCard` — collapsible card with letter badge + title + description. Collapsed: shows "X items · Y CO · Z MOOE · ₱total". Expanded: shows the expense tables and the subsection total strip.
- `ExpenseTable` — header row + body rows + footer subtotal. Columns: Item, Office, UACS code, Fund source, Qty, Unit cost, Total. UACS header has a link icon opening the official UACS reference in a new tab.
- `ExpenseRow` — editable row. Total column computed from qty × unit cost. Hover reveals duplicate/delete actions in a small floating action group on the right edge.
- `UACSField` — searchable combobox over the UACS code list. Typeahead, arrow-key navigation, escape to close. Bundle codes as a static JSON file in the app.
- `CurrencyInput` — input with peso prefix, thousands separators on blur, two decimal places.
- `AddRowButton` — dashed button that appends an empty row to its table.
- `SubsectionTotal` — strip at the bottom of `SubsectionCard` summing all expense subtotals.
- `YearGrandTotal` — dark card at the bottom of the section page summing all `SubsectionTotal` values. Same value is mirrored in the `SectionShell` stat block.

Computed totals update on every keystroke (debounced ~150ms). The Year total feeding the shell stat block reads from the same computation.

Subsection collapse: default state is "first subsection expanded, others collapsed" for focus. Expand/collapse choices persist for the session in component state but do not need to persist to the `.issp` file.

### 10.5 Pattern E — Project / item list (provisional)

Likely used by: Part III/E.1 Internal Projects, Part III/E.2 Cross-Agency Projects, Part III/F Performance Framework.

Not represented in the available screenshots. The agent should inventory these sections during recon and propose components in a short follow-up. Likely shape: a list of `ItemCard` instances with name, owner, timeline, dependencies, notes.

### 10.6 Migration order

Migrate sections in this order so the highest-leverage screens land first:

1. Part IV Year 1 Breakdown (the densest pattern — proves the budget table)
2. Part IV Year 2, Year 3, Summary of Investments (reuse the pattern)
3. Part I/B Organization Structure (proves the form pattern)
4. Part II/D E-Government Programs (proves the toggle list)
5. Part III/B Enterprise Architecture (proves the file-attach placeholder)
6. Remaining 11 sections in any order

After each migration, the section's inline body chrome (where present beyond the SectionShell) is removed in favor of pattern components.

### 10.7 Acceptance criteria for Phase 6

- All 18 section editors use one of the documented patterns (or a documented exception).
- Editing a budget row updates row total → table subtotal → subsection total → year grand total in real time.
- UACS combobox returns search results with typeahead and is keyboard-navigable.
- Toggle list state changes conditional field visibility without re-render flicker.
- File-attach sections render the placeholder gracefully.
- Every section editor visibly shares the same chrome (breadcrumb, header, footer) thanks to SectionShell.

## 11. Phase 7 — Polish

Low-risk cleanups. Defer freely under scope pressure.

### 11.1 Properties button scope

Decide: does "Properties" still need to be a separate dialog after the metadata strip is in place?

- **Keep** as the home for things that don't fit on the strip — full agency name, address, head-of-agency, fiscal year contact, export presets. Rename to "Document properties".
- **Retire** if everything moves to the strip with inline editing.

Document the decision in `RECON_NOTES.md`.

### 11.2 Avatar

The black circle with "N" in the top right is oversized. Reduce to 32px, add a tooltip with the user's name, make it the trigger for user-scoped actions if any exist.

### 11.3 Sentence-case audit

Current UI mixes Title Case headings with all-caps sidebar labels ("PART I: AGENCY PROFILE"). Settle on sentence case throughout. Disproportionately polishing.

### 11.4 Title hierarchy

Ensure the Overview page title pairs cleanly with the metadata strip (no awkward gap). Section editors already get this via SectionShell.

### 11.5 Editor body width

Section editors currently render at full viewport width. Cap at ~960–1000px for readability and to match the Overview's max-width. Wide budget tables can scroll horizontally inside their container instead of stretching the whole page.

### 11.6 Currency display

Audit currency display across the app for consistency: `₱` prefix with a non-breaking space, thousands separators, two decimal places. Use `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })` everywhere.

## 12. Cross-phase acceptance criteria

When the whole plan ships:

- A user opens the editor and within three seconds can answer: how far am I, what did I edit last, are there any problems.
- Clicking Continue lands you where you stopped.
- Each subsection on the Overview is clickable and routes correctly.
- Sidebar status dots match Overview status; both update live as sections are edited or marked done.
- Marking a section as done from inside the section editor updates the sidebar and Overview immediately.
- Every section editor shares the same chrome: breadcrumb, header (title + status + optional stat block), footer (Mark as done + prev/next).
- The 18 section editors render through one of the documented patterns; none carry bespoke chrome.
- Resource Requirements has working budget tables with live totals across all four year sections.
- No regressions in document open/save/export.
- All existing `.issp` files load.

## 13. Out of scope (capture for later)

- Validation engine + per-section rule authoring.
- Inline editing of metadata strip fields.
- Cloud sync, multi-user, comments.
- Mobile-optimized layouts.
- DICT submission workflow integration.
- Locale switching (Tagalog UI).
- Section-level history / undo per section.
- Actual file upload for attach sections (UI placeholder only this round).
- Rich text editing for long-form text fields.
- UACS code list maintenance UI (codes ship as static data).
- Non-PHP currency support.

## 14. Suggested commit plan

Roughly one commit per item; squash if you prefer.

**Foundations**

1. `chore: add RECON_NOTES.md with codebase findings`
2. `feat(data): add schemaVersion and plan metadata fields with defaults`
3. `feat(data): derive section status and lastEditedAt`
4. `test(data): cover status derivation and default migration`
5. `feat(ui): add StatusDot, RelativeTime, CompletionBar, PlanStatusPill`

**Overview**

6. `feat(overview): PlanMetadataStrip`
7. `feat(overview): OverviewHeader with completion`
8. `feat(overview): ContinueEditingCard`
9. `feat(overview): redesigned PartCard with subsection rows`
10. `feat(overview): wire up new composition, delete old card`

**Sidebar**

11. `feat(sidebar): status dots on leaf sections`
12. `feat(sidebar): demote Start Over into kebab menu`
13. `feat(sidebar): promote save status, consolidate per-section indicator`

**Section editor framework**

14. `feat(editor): SectionShell, Callout, MarkAsDone, SectionNavLink`
15. `refactor(editor): migrate Part I & II sections to SectionShell`
16. `refactor(editor): migrate Part III & IV sections to SectionShell`

**Section editor patterns**

17. `feat(editor): FormGroup, FieldRow, Field, CheckboxField (pattern A)`
18. `refactor(editor): migrate form-pattern sections to pattern A`
19. `feat(editor): ToggleListItem (pattern B)`
20. `refactor(editor): migrate E-Government Programs to pattern B`
21. `feat(editor): FileAttach placeholder (pattern C)`
22. `refactor(editor): migrate EA Diagram and similar to pattern C`
23. `feat(editor): SubsectionCard, ExpenseTable, ExpenseRow, UACSField, CurrencyInput (pattern D)`
24. `feat(editor): YearGrandTotal`
25. `refactor(editor): migrate Year 1 Breakdown to pattern D`
26. `refactor(editor): migrate Year 2, Year 3, Summary of Investments to pattern D`

**Polish**

27. `chore(polish): avatar, sentence-case audit, body width cap, currency display`

## 15. Open questions for the human

The agent should flag these early rather than guess:

1. Does the document model carry per-section timestamps, or do we plumb them through the existing save mechanism?
2. Is there a routing pattern for jumping to a subsection, or does the sidebar mutate state directly?
3. What is the source of truth for the Part color mapping today, and is the user open to keeping it (mockup assumes yes)?
4. Are there validation rules defined anywhere (even informally) that should inform the issue-count plumbing?
5. Is autosave already in place, or is "File up to date" triggered by an explicit save action?
6. Does the codebase already share any section editor chrome, or does each section page repeat it? (Determines refactor scope in Phase 5.)
7. What is the canonical UACS code list — bundled JSON, fetched API, or manual entry? If manual today, can we bundle a static list during this work?
8. For sections like Enterprise Architecture with file attach: keep the placeholder, or implement upload now? (Plan assumes placeholder.)
9. Should marking a section done with open validation issues be allowed (with a soft warning) or blocked? (Plan assumes allowed.)
10. Are there section editors NOT represented in the four screenshots (Year 1 Breakdown, EA, E-Gov Programs, Org Structure) that have a unique pattern not covered by the five identified? Part III's project lists are the prime suspects.
11. The "Local draft saved" indicator at the top of every section editor — is it different in source/timing from the global "Saved" status in the sidebar? Can we consolidate to a single signal?
12. For Resource Requirements: is the line-item shape already defined in the `.issp` schema, or is it free-form? Determines how much schema work is in scope.
