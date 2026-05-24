# Plan: Editor Sidebar UX Improvements

> Drafted: 2026-05-24  
> Status: **Implemented**  
> Scope: `src/components/editor/editor-sidebar.tsx` only

---

## Overview

Four improvements to the sidebar footer UX, all in one file:

1. **Theme discovery callout** — floating dismissible callout for returning users who haven't changed from the default theme
2. **Remove "Exit Editor"** — redundant link; clearing already redirects home
3. **Rename "Start Over"** — more descriptive label for what the action actually does
4. **Two-step clear confirmation** — save-first prompt + irreversible danger gate

---

## Feature 1 — Theme Discovery Callout

### Goal
Returning users who have existing work in the browser but haven't changed from the default theme (`system-light`) get a subtle one-time prompt pointing at the kebab button and directing them to try themes.

### Trigger (all three must be true)
| Condition | Check |
|---|---|
| Has an existing ISSP | `doc !== null` |
| Still on the default theme | `theme === "system-light"` |
| Hasn't dismissed the nudge before | `localStorage.getItem("issp-theme-nudge-dismissed") !== "true"` |

### Placement
Floating callout anchored above the desktop sidebar kebab button, with a small arrow pointing at the kebab. Mobile does not show this callout because the mobile footer already has a dedicated Palette button.

### Visual
```
      ┌─────────────────────────────┐
      │  Try themes             [×] │
      │  Warm and dark modes are    │
      │  in this menu.              │
      │  [Open menu]                │
      └───────────────────────◆─────┘
                              ⋮
```
- Styled with semantic info tokens: `bg-info-bg border-info-border text-info`.
- **Open menu** programmatically opens the kebab dropdown.
- While the nudge is active and the kebab is open, the **Theme** submenu trigger uses an info-token pulse/ring highlight so the option is discoverable.
- Selecting a theme dismisses the nudge.
- **[×]** calls `dismissThemeNudge()`: sets `localStorage.setItem("issp-theme-nudge-dismissed", "true")` and hides the callout.

### State
```ts
const [themeNudgeDismissed, setThemeNudgeDismissed] = useState(() =>
  typeof window !== "undefined" && localStorage.getItem("issp-theme-nudge-dismissed") === "true"
);
const [fileMenuOpen, setFileMenuOpen] = useState(false);
const [themeSubmenuOpen, setThemeSubmenuOpen] = useState(false);
const showThemeNudge = !!doc && theme === "system-light" && !themeNudgeDismissed;
```
`showThemeNudge` is derived from `doc`, `theme`, and dismissal state. This avoids synchronous `setState` inside effects and keeps React lint clean.

### Dismiss handler
```ts
function dismissThemeNudge() {
  localStorage.setItem("issp-theme-nudge-dismissed", "true");
  setThemeNudgeDismissed(true);
}
```

---

## Feature 2 — Remove "Exit Editor"

### Goal
Reduce clutter. "Exit Editor" (`<Link href="/">`) at the bottom of the desktop sidebar is redundant: after a user clears their data, `EditorShell` already calls `router.replace("/")`. There is no non-destructive "just go back to home" use case that needs its own permanent button.

### Changes
1. Delete the `<Link href="/" onClick={handleNavigate} ...>Exit Editor</Link>` block from the desktop sidebar footer (~line 618–626).
2. Delete the `<Link href="/" aria-label="Exit editor" ...><LogOut /></Link>` from `CollapsedSidebar` (~line 118–126) — no point keeping it in the rail if it's gone from the expanded sidebar.
3. Remove `LogOut` from the `lucide-react` import if it's no longer used anywhere else in the file after both removals.

---

## Feature 3 — Rename "Start Over" → "Clear editor data…"

### Goal
"Start Over" is ambiguous — it sounds like "reset the form". The actual action is "delete the document from IndexedDB and redirect to home." The label should say what it does.

### Label changes
| Location | Old | New |
|---|---|---|
| Kebab menu item | `Start over…` | `Clear editor data…` |
| Icon | `RotateCcw` | `Trash2` (more accurate: destructive delete, not cyclical restart) |
| Step 1 heading | — | `Clear editor data?` |
| Step 1 body | — | see Feature 4 |

---

## Feature 4 — Two-Step Confirmation Flow

### Goal
Replace the single-step `confirmClear` boolean with a two-step flow:
- **Step 1**: Inform, offer to save if unsaved changes exist, let user decide to continue
- **Step 2**: Final irreversible danger gate before actually deleting

### State change
```ts
// Before
const [confirmClear, setConfirmClear] = useState(false);

// After
const [clearStep, setClearStep] = useState<"idle" | "step1" | "step2">("idle");
```

### Step 1 — Inform & save
Triggers when user clicks "Clear editor data…" in the kebab.

```
╔════════════════════════════════════════╗
║  Clear editor data?                    ║
║                                        ║
║  This will permanently remove your    ║
║  ISSP from this browser.              ║
║                                        ║
║  [IF unsaved changes present:]        ║
║  ┌──────────────────────────────────┐ ║
║  │  ⚠  You have unsaved changes.   │ ║
║  │  Save your file before clearing. │ ║
║  │  [↓ Save .issp file]             │ ║
║  └──────────────────────────────────┘ ║
║                                        ║
║  [Continue →]        [Cancel]         ║
╚════════════════════════════════════════╝
```

- **Save .issp file** — calls `saveToFile()`. Does NOT advance to step 2 automatically; user must still click "Continue →" to proceed. Lets them verify the download before proceeding.
- **Continue →** — advances `clearStep` to `"step2"`
- **Cancel** — resets `clearStep` to `"idle"`
- Unsaved-changes warning block only renders if `unsavedToFile === true`

### Step 2 — Danger gate (irreversible)
Triggers when user clicks "Continue →" from step 1.

```
╔════════════════════════════════════════╗
║  ⚠  This action is irreversible.      ║
║                                        ║
║  Your ISSP will be permanently        ║
║  deleted from this browser. There     ║
║  is no undo.                          ║
║                                        ║
║  [Delete permanently]   [Go back]     ║
╚════════════════════════════════════════╝
```

- Full danger zone styling: `border-destructive/30 bg-destructive/5 text-destructive`
- **Delete permanently** — calls `handleClear()` → `idbClear()` → `setDoc(null)` → `EditorShell` redirects to `/`
- **Go back** — resets `clearStep` to `"step1"` (not idle — puts them back before the save prompt in case they want to re-read it)

### Updated handler wiring
```ts
// Kebab item onClick:
onClick={() => setClearStep("step1")}

// handleClear:
async function handleClear() {
  await clearDoc();
  setClearStep("idle");
}

// Guard for the normal footer (was !confirmClear):
{clearStep === "idle" && (
  <>...</>
)}
```

---

## Summary of Changes

| # | Feature | State/logic added | DOM change |
|---|---|---|---|
| 1 | Theme discovery callout | derived `showThemeNudge`, `themeNudgeDismissed`, controlled kebab menu state | Floating callout points to kebab; Theme menu row pulses while active |
| 2 | Remove Exit Editor | — | Delete 2 link elements + import cleanup |
| 3 | Rename Start Over | — | Label + icon change |
| 4 | Two-step clear | `clearStep: "idle" \| "step1" \| "step2"` | Replace single confirm box with two-step blocks |

**Single file:** `src/components/editor/editor-sidebar.tsx`  
No new files, no new components, no store changes, no route changes.
