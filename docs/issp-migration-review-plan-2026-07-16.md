# ISSP File Migration Review — Implementation Plan

> **Status:** ✅ Implemented — pending final browser verification and deployment.
> **Context:** The July 15 ISSP Caravan Writeshop clarified fields in Parts II-C, II-D,
> and III-D that differ from earlier versions of the builder. Existing `.issp` files must
> continue to load, but users need an explicit review workflow for answers that software
> can migrate structurally without being able to confirm the agency's intent.

---

## Outcome

When an older `.issp` file is loaded:

1. The file migrates automatically and remains usable.
2. A modal explains what changed and identifies the sections requiring human review.
3. The affected sections are highlighted on the Overview and in the sidebar.
4. Their previous “done” state is cleared, and each highlight remains until the user
   reviews the section and marks it as done again.
5. The migration notice does not reappear once the review has been completed and saved.

Affected sections for the schema v6→v9 changes:

| Section | Why review is required |
|---|---|
| `part2/c` — Existing IS Inventory | Classification/Frontline structure changed; generic Deployment Type became Frontline Access (Online/On-premise/Hybrid). |
| `part2/d` — E-Government Programs | Status options changed to the current Yes/No template and Notes was removed. |
| `part3/d` — Proposed IS | Same Classification/Frontline change as II-C; proposed-system wording, link, interoperability, and PIA structure were corrected. |

---

## Phase 1 — Persisted migration-review metadata

### Schema

Add optional envelope metadata to `IsspDocument`:

```ts
interface MigrationReview {
  sourceSchemaVersion: number;
  migratedToSchemaVersion: number;
  pendingSectionIds: string[];
  noticeAcknowledgedAt: string | null;
}

interface IsspDocument {
  migrationReview?: MigrationReview;
}
```

This field is optional so new/current files need no migration solely to add the tracker.
It is created only when an older file crosses a migration whose meaning requires review.

### Migration rules

Inside `migrateLegacyDoc`, capture the original schema version before applying migrations.
After the v1→v9 chain:

- If the source version is `< 7`, add `part2/d` to `pendingSectionIds`.
- If the source version is `< 9`, add `part2/c` and `part3/d`.
- Merge with any existing pending IDs rather than replacing them.
- For every pending section, preserve `lastEditedAt` but set `userMarkedDone: false`.
- Do not flag new documents or files already at schema v9.
- Do not recreate completed review flags when a migrated v9 file is loaded again.

### Important normalisation distinction

`migrateLegacyDoc` runs both for IndexedDB restoration and explicit file loading. The
review metadata should therefore live in the document, but the modal's “just loaded”
trigger should live in store state (Phase 2). This avoids reopening the modal on every
navigation while still preserving pending review across browser restarts.

### Files

- `src/lib/store/types.ts`
- `src/lib/store/index.tsx`
- `src/lib/store/defaults.ts` only if a helper type/default is useful; do not put review
  metadata on newly created documents.

### Acceptance

- A v6 file migrates to v9 with all three pending section IDs.
- A v7/v8 file flags only II-C and III-D as applicable.
- A v9 file receives no review metadata.
- Previously-done affected sections become not-done; unaffected done states remain intact.
- Saving and reloading the migrated file preserves the pending list without duplicating it.

---

## Phase 2 — Store result and modal trigger

Extend `StoreActionResult` for successful file loads:

```ts
type StoreActionResult =
  | { success: true; migrationReview?: MigrationReview }
  | { success: false; error: string };
```

Add session state to `IsspStoreValue`:

```ts
migrationNotice: MigrationReview | null;
acknowledgeMigrationNotice: () => void;
```

Behavior:

- `loadFromFile()` compares the source schema version with the migrated result and returns
  the newly-created/updated review payload.
- Explicit file loads set `migrationNotice`; normal IDB restoration does not automatically
  open the modal.
- `acknowledgeMigrationNotice()` stamps `noticeAcknowledgedAt`, persists it, and closes the
  modal. It does **not** clear pending sections.
- Loading a different legacy file replaces the session notice with that file's review.

This avoids parsing the file twice in the splash or sidebar and gives both load entry
points one consistent result.

### Files

- `src/lib/store/index.tsx`
- `src/components/home/home-page-client.tsx`
- `src/components/editor/editor-sidebar.tsx`

### Acceptance

- Loading from the splash and “Load different ISSP…” produce the same review payload.
- Loading a current v9 file follows today's flow without a modal.
- Sample/new-document flows do not trigger migration review.

---

## Phase 3 — Migration review modal

Create `src/components/editor/issp-migration-review-dialog.tsx` and mount it once in
`EditorShell` so it works regardless of where the file was loaded.

### Content

- Title: **Your ISSP file was updated**
- Plain-language compatibility assurance: the file still works and the data was carried
  forward automatically.
- Source and destination version, shown quietly (e.g. “File format v6 → v9”).
- Explain why human review is still needed: some answers were translated into newer
  fields, but the builder cannot verify agency intent.
- List the affected sections with one-sentence reasons.
- Tell users that the sections were unmarked as done and will stay highlighted until they
  review and mark each one done again.

### Actions

- Primary: **Review first section** → acknowledge notice and navigate to the first pending section.
- Secondary: **Go to overview** → acknowledge notice and navigate to `/editor`.
- No destructive or “skip forever” action; closing the modal acknowledges the explanation
  but leaves all review highlights active.

### Usability requirements

- Scroll-safe on mobile.
- Focus starts at the heading.
- Opening the modal never changes form data beyond the migration already performed.
- The modal appears after successful navigation into the editor, not briefly over the splash.

### Files

- New: `src/components/editor/issp-migration-review-dialog.tsx`
- `src/components/editor/editor-shell.tsx`

---

## Phase 4 — Overview highlights

### Banner

Above “Continue where you left off,” show a warning callout when pending review exists:

- “3 sections need a quick migration review.”
- Explain that the older file loaded successfully.
- Link directly to the first pending section.
- Show remaining count as sections are completed.

### Part cards

Pass `pendingSectionIds` into `PartCard`.

For a pending row:

- Use a warning-tinted row/background or inset ring.
- Add an `AlertTriangle` icon and **Review required** label.
- Keep the ordinary status dot semantics separate; the review indicator must not be
  represented only by color.
- If a Part contains pending sections, add a compact “N to review” badge in its header.

Completion behavior:

- Marking a pending section as done removes its ID from `migrationReview.pendingSectionIds`.
- When the last ID is cleared, remove `migrationReview` or retain a compact completed audit
  record without any UI highlight. Prefer removal unless future audit history is requested.

### Files

- `src/app/editor/page.tsx`
- `src/components/editor/overview/part-card.tsx`
- Optional new shared helper: `src/lib/migration-review.ts`

---

## Phase 5 — Sidebar and section-page highlights

### Sidebar

For each pending section:

- Apply a theme-safe warning background/border.
- Show an `AlertTriangle` icon or “Review” chip beside the section name.
- Expand Parts II and III automatically while pending review exists.
- Preserve active-route styling while keeping the review marker visible.
- Apply the same treatment in desktop and mobile navigation because both use `navContent`.

### Section page

On an affected section, add a warning callout beneath the sticky heading:

> This section was migrated from an older ISSP file. Cross-check the entries against the
> current form, then mark this section as done again to clear the review flag.

The existing Mark as Done button becomes the resolution action. No additional “reviewed”
checkbox is introduced.

### Files

- `src/components/editor/editor-sidebar.tsx`
- `src/components/editor/section-shell.tsx`

---

## Phase 6 — Verification

### Automated/static checks

1. `npx tsc --noEmit --skipLibCheck`
2. ESLint on all touched files.
3. JSON parse for demo and synthesized legacy fixtures.

### Legacy fixtures

Create temporary fixtures representing:

- v6: old EGP statuses + `deploymentType` on II-C/III-D.
- v7: migrated EGP statuses but pre-v9 IS fields.
- v8: no EGP Notes but pre-v9 IS fields.
- v9: current file, no review.

For each, verify migrated values and exact pending-section IDs.

### Browser checks

- Load legacy file from home splash → modal → Review first section.
- Load legacy file from sidebar while another file is open.
- Overview banner/count and Part-card highlights.
- Desktop and mobile sidebar highlights.
- Mark II-C done → highlight clears only for II-C; remaining count decrements.
- Save `.issp`, reload it, and confirm remaining review flags persist without replaying
  completed sections.
- Finish all three → banner/sidebar highlights disappear and completion counts recover.

### Regression checks

- New document has no migration UI.
- Current demo file has no migration UI.
- Unsaved-change tracking still detects mark-as-done changes.
- Existing content/status inference remains intact for unaffected sections.
- PDF export and migrated values remain unchanged by the review metadata.

---

## Documentation updates after implementation

- `docs/project-status.md`
- `docs/session-handoff.md`
- What's New copy confirms that affected sections are highlighted automatically.

---

## Decisions encoded in this plan

- Compatibility is automatic; review is explicit.
- Only genuinely affected sections are reset and highlighted.
- “Mark as done” is reused as the review-resolution action.
- Pending review persists in the `.issp` file, while modal display is session-aware.
- The overview, desktop sidebar, mobile sidebar, and section itself all communicate the
  same state in text and iconography, not color alone.
