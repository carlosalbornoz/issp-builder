# PDF export: inline sidebar progress (replaces modal)

**Date:** 2026-07-16
**Status:** Approved, implementing

## Problem

PDF export progress (SSE-driven stage/percentage updates from `/api/export`) is
currently shown in a centered, non-dismissible `Dialog` (`editor-sidebar.tsx`
lines 1063–1090). Carlos wants it to live inline in the sidebar footer instead,
using the same footer-swap pattern already used by the "Clear editor data"
two-step confirm (`clearStep`), so the progress bar visually "runs through" a
card in the sidebar rather than popping a modal over the whole app.

## State model

Replace the two separate `exporting: boolean` / `exportProgress: {stage, pct} | null`
state variables with one union, `exportState`:

```ts
type ExportState =
  | { status: "idle" }
  | { status: "exporting"; stage: string; pct: number }
  | { status: "done" }
  | { status: "error"; message: string };
```

`handleExportPdf` keeps its existing SSE-parsing logic (fetch + ReadableStream +
`parseSseEvent`, unchanged) but writes to `exportState` instead:

- Start: `{status: "exporting", stage: "Starting…", pct: 0}`
- `progress` SSE event: `{status: "exporting", stage, pct}`
- `done` SSE event: triggers the download exactly as today, then
  `{status: "done"}`, then after 1000ms → `{status: "idle"}`. (Bumped from the
  modal's 500ms since there's no dialog framing it anymore — the inline "Done"
  state should be readable at a glance before it disappears.)
- `error` SSE event / thrown error in the fetch: `{status: "error", message}`.
  **No auto-revert.** Stays until the user clicks Dismiss. `toast.error` still
  fires as it does today, for visibility if the user isn't looking at the
  sidebar.

## Footer render logic

Both the mobile compact footer and the desktop full footer already swap their
entire idle content based on `clearStep` (`idle` / `step1` / `step2`). Export
state slots into the same swap, at the same priority level:

```
clearStep !== "idle"          → clear-editor card (unchanged)
exportState.status !== "idle" → export card (new)
otherwise                     → normal Save / Properties / kebab / Export PDF buttons
```

(`clearStep` takes precedence — the user can't reach the clear-editor menu
item while the export buttons are hidden, so in practice these never compete,
but the precedence is explicit for safety.)

## Export card — three visual states

All three reuse the same card shell already used by `clearStep`'s cards:
`rounded-lg border ... px-3 py-2.5 space-y-2` (neutral) or the destructive
variant (`border-destructive/30 bg-destructive/5 text-destructive`) for errors.

- **exporting**: neutral card. Header row: spinning `Loader2` + "Exporting
  PDF…". Below it, the existing stage/pct row (`stage` truncated on the left,
  `pct%` tabular-nums on the right) and the existing green fill bar
  (`h-2 rounded-full bg-border` track, `bg-success` fill, `transition-all
  duration-300 ease-out`, width = `pct%`). This is a direct move of the
  current `DialogContent` body into the card — no visual redesign of the
  bar/text row itself.
- **done**: same neutral card. Header swaps to a green `Check` icon + "PDF
  exported". Bar stays rendered at 100%.
- **error**: destructive card. "Export failed" heading, the error message
  below it, and a single "Dismiss" button (`variant="outline"`, sized like
  the other footer buttons, `sidebarControlClass` applied) that resets
  `exportState` to `{status: "idle"}`.

## Removed

The `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle` /
`DialogDescription` block at lines 1063–1090 is deleted. The imports stay —
`SaveReminderDialog` (same file, line ~198) uses the same `Dialog` primitives
for an unrelated purpose.

## Explicitly out of scope

- No cancel/abort button — export was never cancellable via the modal either;
  this only relocates the indicator, it doesn't add new capability.
- No change to the SSE wire protocol or `/api/export` route.
- Rest-of-editor interactivity during export is unchanged (the SSE fetch never
  blocked it; a `Dialog` overlay just visually implied it did). Removing the
  overlay makes the already-true behavior visible.

## Files touched

- `src/components/editor/editor-sidebar.tsx` — state model, `handleExportPdf`,
  both footer render blocks (mobile ~line 630-763, desktop ~line 870-1036),
  deletion of the export-progress `Dialog`.
