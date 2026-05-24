# Theme System Plan

> **Status:** Implemented — editor theme system + control contrast cleanup complete  
> **Branch:** `ui-refresh`  
> **Last updated:** 2026-05-24

---

## Overview

Four independent themes selectable by the user. Applied via a class on `<html>` that overrides CSS custom properties. No Tailwind dark-mode toggle — each theme is fully self-contained.

| ID | Name | Background | Vibe |
|---|---|---|---|
| `system-light` | System Light | `#FFFFFF` | System-native clean white, system sans body |
| `system-dark` | System Dark | `#000000` | OLED black, system sans body |
| `warm-light` | Warm Light | `#FAFAF7` | Parchment, amber, IBM Plex Sans |
| `warm-dark` | Warm Dark | `#1C1A17` | Dark warm brown, not cold black |

---

## Architecture

### Theme application
A class on `<html>` drives everything:
```html
<html class="theme-system-light">  <!-- default / System Light -->
<html class="theme-system-dark">
<html class="theme-warm-light">
<html class="theme-warm-dark">
```

Each class overrides the full set of CSS custom properties defined in `globals.css`. No JS theming library needed.

### Storage
`localStorage` key: `issp-theme`  
Default: `system-light` (System Light)  
Not stored in IDB — this is a UI preference, not document data.

### SSR flash prevention
An inline `<script>` injected synchronously in `<head>` reads localStorage and sets the class on `<html>` before React hydrates. This eliminates the flash-of-wrong-theme on page load.

```html
<script>
  (function() {
    var t = localStorage.getItem('issp-theme') || 'system-light';
    document.documentElement.classList.add('theme-' + t);
  })();
</script>
```

### Provider
A `ThemeProvider` client component wraps the root layout. Exposes `useTheme()` → `{ theme, setTheme }`.

---

## CSS Token Sets

### `.theme-warm-light`
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

### `.theme-system-light`
System-native clean light theme. Uses system fonts on Apple platforms and standard sans fallbacks elsewhere.
```css
.theme-system-light {
  --background:        #FFFFFF;
  --foreground:        #1D1D1F;
  --card:              #FFFFFF;
  --card-foreground:   #1D1D1F;
  --popover:           #FFFFFF;
  --popover-foreground:#1D1D1F;
  --primary:           #1D1D1F;
  --primary-foreground:#FFFFFF;
  --secondary:         #F5F5F7;   /* System light gray */
  --secondary-foreground: #1D1D1F;
  --muted:             #F5F5F7;
  --muted-foreground:  #6E6E73;
  --accent:            #E8E8ED;
  --accent-foreground: #1D1D1F;
  --destructive:       #FF3B30;   /* System red */
  --border:            #D2D2D7;
  --input:             #D2D2D7;
  --ring:              #6E6E73;
  --radius:            0.625rem;  /* slightly rounder, System-style */
  --sidebar-active:    #E5E5EA;
  --part-1: #007AFF;   /* System blue */
  --part-2: #FF9500;   /* System orange */
  --part-3: #34C759;   /* System green */
  --part-4: #AF52DE;   /* System purple */
  --font-body: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
}
```

### `.theme-system-dark`
OLED-first system dark theme. Uses system fonts on Apple platforms and standard sans fallbacks elsewhere.
```css
.theme-system-dark {
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
  --destructive:       #FF453A;   /* System dark red */
  --border:            #38383A;
  --input:             #38383A;
  --ring:              #98989D;
  --radius:            0.625rem;
  --sidebar-active:    #3A3A3C;
  --part-1: #0A84FF;   /* System dark blue */
  --part-2: #FF9F0A;   /* System dark orange */
  --part-3: #30D158;   /* System dark green */
  --part-4: #BF5AF2;   /* System dark purple */
  --font-body: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
}
```

---

## Font Strategy

| Theme | Body font | Display/headings | Mono |
|---|---|---|---|
| `warm-light` | IBM Plex Sans (current) | Fraunces | IBM Plex Mono |
| `warm-dark` | IBM Plex Sans | Fraunces | IBM Plex Mono |
| `system-light` | System sans (SF Pro on Apple) | System sans | IBM Plex Mono |
| `system-dark` | System sans (SF Pro on Apple) | System sans | IBM Plex Mono |

System themes use a system sans stack which maps to:
- **macOS/iOS**: SF Pro via `-apple-system` / `BlinkMacSystemFont`
- **Windows/Linux**: Helvetica Neue / Arial fallback
- **Android**: sans-serif fallback

Implementation: each system theme class sets `--font-body` and `--font-display`. A global rule applies the body font, while existing `font-display` utilities pick up the theme-specific display token.
```css
.theme-system-light body,
.theme-system-dark body {
  font-family: var(--font-body);
}
```

---

## Part Colors

Implemented with CSS variables. `sections.ts` returns `var(--part-1)` through `var(--part-4)`, and each theme defines its own values.

Warm themes use the existing UI refresh part colors. System themes use system palette accents.

---

## Theme Switcher UI

Theme selection lives in the editor sidebar kebab menu:
- Desktop: `⋯` file/actions menu → Theme submenu → one radio item per theme.
- Mobile: compact sidebar footer has a single theme icon button that opens the same radio list.
- Theme order is System Light, System Dark, separator, Warm Light, Warm Dark.
- Each item includes a small circular preview using the theme background, secondary, and border colors.

Current implementation wraps the root layout, so theme tokens are available globally. The explicit theme controls live only in the editor shell.

---

## Implementation Phases

| Phase | Files | Work |
|---|---|---|
| 1 | `globals.css`, `layout.tsx`, `src/lib/theme.tsx` | ✅ 4 theme classes in CSS; `ThemeProvider` + `useTheme()`; SSR inline script |
| 2 | `globals.css` | ✅ Font override — system themes set `--font-body` and `--font-display` |
| 3 | `editor-sidebar.tsx` | ✅ Theme menu in desktop kebab + mobile theme button |
| 4 | `sections.ts` + all part color usages | ✅ Move part colors to CSS vars |

---

## Implementation Notes

### Theme IDs and labels
System themes use matching internal IDs and user-facing labels: `system-light` / System Light and `system-dark` / System Dark.

### Default theme
Default is `system-light` / System Light. Because this has not shipped to production yet, there is no compatibility alias for the older draft `apple-*` IDs.

### Theme menu
The desktop theme control is intentionally inside the sidebar kebab menu, not the footer or Properties dialog. Mobile has a single icon button in the compact sidebar footer.

The menu order is:
1. System Light
2. System Dark
3. Separator
4. Warm Light
5. Warm Dark

### Sidebar save/download behavior
The primary sidebar action is now stateful:
- No file changes: disabled button labeled `No changes to save`
- Unsaved file changes: enabled button labeled `Save changes`
- Manual `Download .issp` remains available in the kebab menu

### Control contrast cleanup
During theme QA, several enabled controls looked disabled because shared and inline controls used transparent backgrounds or low-contrast theme tokens. These were updated:
- `Button` outline variant now uses `bg-card`, `text-foreground`, `border-border`, and `hover:bg-accent`.
- `Input`, `Textarea`, and `SelectTrigger` now use `bg-card`, explicit foreground text, and clearer disabled styles.
- Inline table inputs/selects in the editor were changed from transparent controls to `bg-card/70` with `hover:bg-card` and `focus:bg-card`.
- Custom button-like controls such as UACS combobox trigger, legacy overview links, and Part II-B diagram upload controls were brought in line with theme-aware contrast.

---

## Remaining Scope

1. Decide whether non-editor pages should expose theme controls or simply inherit the saved theme.
2. Continue visual QA for older/dormant dashboard screens if they become active again.
