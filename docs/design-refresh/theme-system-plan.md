# Theme System Plan

> **Status:** Planned — awaiting decisions on part colors + scope before implementation  
> **Branch:** `ui-refresh`  
> **Last updated:** 2026-05-24

---

## Overview

Four independent themes selectable by the user. Applied via a class on `<html>` that overrides all CSS custom properties. No Tailwind dark-mode toggle — each theme is fully self-contained.

| ID | Name | Background | Vibe |
|---|---|---|---|
| `warm-light` | Warm Light | `#FAFAF7` | Current — parchment, amber, IBM Plex Sans |
| `warm-dark` | Warm Dark | `#1C1A17` | Dark warm brown, not cold black |
| `apple-light` | Apple Light | `#FFFFFF` | Apple HIG clean white, `ui-serif` body |
| `apple-dark` | Apple Dark | `#000000` | OLED black, `ui-serif` body |

---

## Architecture

### Theme application
A class on `<html>` drives everything:
```html
<html class="theme-warm-light">   <!-- default -->
<html class="theme-warm-dark">
<html class="theme-apple-light">
<html class="theme-apple-dark">
```

Each class overrides the full set of CSS custom properties defined in `globals.css`. No JS theming library needed.

### Storage
`localStorage` key: `issp-theme`  
Default: `warm-light`  
Not stored in IDB — this is a UI preference, not document data.

### SSR flash prevention
An inline `<script>` injected synchronously in `<head>` reads localStorage and sets the class on `<html>` before React hydrates. This eliminates the flash-of-wrong-theme on page load.

```html
<script>
  (function() {
    var t = localStorage.getItem('issp-theme') || 'warm-light';
    document.documentElement.classList.add('theme-' + t);
  })();
</script>
```

### Provider
A `ThemeProvider` client component wraps the root layout. Exposes `useTheme()` → `{ theme, setTheme }`.

---

## CSS Token Sets

### Current `:root` → renamed to `.theme-warm-light`
```css
.theme-warm-light {
  --background:        #FAFAF7;
  --foreground:        #18181B;
  --card:              #FFFFFF;
  --card-foreground:   #18181B;
  --popover:           #FFFFFF;
  --popover-foreground:#18181B;
  --primary:           #18181B;
  --primary-foreground:#FAFAF7;
  --secondary:         #F2F1EC;   /* sidebar bg */
  --secondary-foreground: #18181B;
  --muted:             #F2F1EC;
  --muted-foreground:  #52525B;
  --accent:            #EAE8E1;
  --accent-foreground: #18181B;
  --destructive:       #B91C1C;
  --border:            #E5E3DC;
  --input:             #E5E3DC;
  --ring:              #52525B;
  --radius:            0.5rem;
  /* sidebar active item */
  --sidebar-active:    #D4D2C9;
  /* part accent colors */
  --part-1: #2563EB;
  --part-2: #C2680C;
  --part-3: #15803D;
  --part-4: #6D28D9;
}
```

### `.theme-warm-dark`
Dark warm brown — keeps amber warmth, no cold grays.
```css
.theme-warm-dark {
  --background:        #1C1A17;
  --foreground:        #F0EDE8;
  --card:              #242220;
  --card-foreground:   #F0EDE8;
  --popover:           #242220;
  --popover-foreground:#F0EDE8;
  --primary:           #F0EDE8;
  --primary-foreground:#1C1A17;
  --secondary:         #201E1B;   /* sidebar bg */
  --secondary-foreground: #F0EDE8;
  --muted:             #201E1B;
  --muted-foreground:  #9C9893;
  --accent:            #2C2925;
  --accent-foreground: #F0EDE8;
  --destructive:       #EF4444;
  --border:            #383430;
  --input:             #383430;
  --ring:              #9C9893;
  --radius:            0.5rem;
  --sidebar-active:    #3A3630;
  --part-1: #60A5FA;   /* lightened for dark bg */
  --part-2: #FB923C;
  --part-3: #4ADE80;
  --part-4: #A78BFA;
}
```

### `.theme-apple-light`
Apple Human Interface Guidelines palette. Clean, minimal, system-native.
```css
.theme-apple-light {
  --background:        #FFFFFF;
  --foreground:        #1D1D1F;
  --card:              #FFFFFF;
  --card-foreground:   #1D1D1F;
  --popover:           #FFFFFF;
  --popover-foreground:#1D1D1F;
  --primary:           #1D1D1F;
  --primary-foreground:#FFFFFF;
  --secondary:         #F5F5F7;   /* Apple's signature light gray */
  --secondary-foreground: #1D1D1F;
  --muted:             #F5F5F7;
  --muted-foreground:  #6E6E73;
  --accent:            #E8E8ED;
  --accent-foreground: #1D1D1F;
  --destructive:       #FF3B30;   /* Apple red */
  --border:            #D2D2D7;
  --input:             #D2D2D7;
  --ring:              #6E6E73;
  --radius:            0.625rem;  /* slightly rounder, Apple-style */
  --sidebar-active:    #E5E5EA;
  --part-1: #007AFF;   /* Apple blue */
  --part-2: #FF9500;   /* Apple orange */
  --part-3: #34C759;   /* Apple green */
  --part-4: #AF52DE;   /* Apple purple */
  --font-body: ui-serif, "New York", Georgia, serif;
}
```

### `.theme-apple-dark`
OLED-first Apple dark mode.
```css
.theme-apple-dark {
  --background:        #000000;
  --foreground:        #FFFFFF;
  --card:              #1C1C1E;
  --card-foreground:   #FFFFFF;
  --popover:           #1C1C1E;
  --popover-foreground:#FFFFFF;
  --primary:           #FFFFFF;
  --primary-foreground:#000000;
  --secondary:         #161618;   /* sidebar bg */
  --secondary-foreground: #FFFFFF;
  --muted:             #1C1C1E;
  --muted-foreground:  #98989D;
  --accent:            #2C2C2E;
  --accent-foreground: #FFFFFF;
  --destructive:       #FF453A;   /* Apple dark red */
  --border:            #38383A;
  --input:             #38383A;
  --ring:              #98989D;
  --radius:            0.625rem;
  --sidebar-active:    #3A3A3C;
  --part-1: #0A84FF;   /* Apple dark blue */
  --part-2: #FF9F0A;   /* Apple dark orange */
  --part-3: #30D158;   /* Apple dark green */
  --part-4: #BF5AF2;   /* Apple dark purple */
  --font-body: ui-serif, "New York", Georgia, serif;
}
```

---

## Font Strategy

| Theme | Body font | Display/headings | Mono |
|---|---|---|---|
| `warm-light` | IBM Plex Sans (current) | Fraunces | IBM Plex Mono |
| `warm-dark` | IBM Plex Sans | Fraunces | IBM Plex Mono |
| `apple-light` | `ui-serif` (New York on Apple) | Fraunces | IBM Plex Mono |
| `apple-dark` | `ui-serif` (New York on Apple) | Fraunces | IBM Plex Mono |

Apple themes use `--font-body: ui-serif, "New York", Georgia, serif` which maps to:
- **macOS/iOS**: New York (Apple's serif)
- **Windows**: Georgia
- **Android**: serif fallback

Implementation: each apple theme class sets `--font-body`. A global rule applies it:
```css
.theme-apple-light body,
.theme-apple-dark body {
  font-family: var(--font-body);
}
```

---

## Part Colors

Currently hardcoded as hex in `sections.ts` (`color` field on each `PartDef`). Two options:

**Option A — CSS variables (recommended):** Move part colors to `--part-1` through `--part-4` CSS variables. `sections.ts` returns `"var(--part-1)"` etc. Each theme defines its own values (warm themes use current colors, apple themes use Apple system colors).

**Option B — Keep hardcoded:** Same colors across all 4 themes. Simpler but warm-dark gets blue/amber/green/purple on a dark brown background (may look off).

---

## Theme Switcher UI

4 circular swatches (16px) in the editor sidebar footer, between Export PDF and the attribution line. Each swatch:
- Outer ring: the theme's `--border` color
- Fill: the theme's `--background` color
- Inner dot: the theme's `--secondary` color (shows the sidebar tone)
- Active ring: `ring-2 ring-primary`

Also accessible from the Properties dialog (ISSP Properties → Appearance tab, or inline row).

Non-editor pages (landing, about, privacy): **TBD** — see open questions.

---

## Implementation Phases

| Phase | Files | Work |
|---|---|---|
| 1 | `globals.css`, `layout.tsx`, `src/lib/theme.tsx` | 4 theme classes in CSS; `ThemeProvider` + `useTheme()`; SSR inline script |
| 2 | `globals.css` | Font override — apple themes set `font-family: var(--font-body)` on `body` |
| 3 | `editor-sidebar.tsx`, `issp-properties-dialog.tsx` | Swatch picker in sidebar footer + Properties dialog |
| 4 | `sections.ts` + all part color usages | Move part colors to CSS vars (Option A only) |

---

## Open Questions

These need answers before implementation starts:

1. **Part colors across themes** — Option A (CSS vars, per-theme colors) or Option B (same colors everywhere)?

2. **Scope** — Does theming apply to the landing page, About, and Privacy pages too? Or editor-only for now?
