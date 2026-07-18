---
name: ISSP Builder
description: Free, browser-based ISSP editor for Philippine government agencies, aligned to the DICT 2026 template
colors:
  ink: "#1D1D1F"
  paper: "#FFFFFF"
  fog: "#F5F5F7"
  slate-text: "#6E6E73"
  mist: "#E8E8ED"
  hairline: "#D2D2D7"
  alert-red: "#FF3B30"
  field-green: "#15803D"
  field-green-bg: "#F0FDF4"
  field-green-border: "#BBF7D0"
  amber-flag: "#B45309"
  amber-flag-bg: "#FFFBEB"
  amber-flag-border: "#FDE68A"
  desk-blue: "#1D4ED8"
  desk-blue-bg: "#EFF6FF"
  desk-blue-border: "#BFDBFE"
  part-one: "#0064D1"
  part-two: "#0A7280"
  part-three: "#1F7735"
  part-four: "#9D2BD7"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.02em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  pill: "9999px"
spacing:
  xs: "0.375rem"
  sm: "0.625rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "2rem"
  badge-status:
    backgroundColor: "{colors.field-green-bg}"
    textColor: "{colors.field-green}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    height: "1.25rem"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.625rem"
    height: "2rem"
  card-container:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.xl}"
---

# Design System: ISSP Builder

## 1. Overview

**Creative North Star: "The Field Office Desk"**

ISSP Builder looks like a well-organized public servant's desk, not a corporate SaaS dashboard: plain, dependable, and built for someone getting real compliance work done under a deadline, not for someone being sold a product. The system defaults to the OS's own native font stack (SF Pro on Apple, the system-ui equivalent elsewhere) rather than a custom display face — the app is meant to disappear into the task the way a well-worn desk does, not announce itself as software. Density is generous but not cramped: forms breathe enough to read comfortably, but nothing is padded out for visual effect.

The system explicitly rejects two things (per PRODUCT.md's anti-references): it should never read as a sterile government Word-doc clone — rigid, bureaucratic-feeling fields with no warmth — and it should never read as a flashy consumer SaaS product — no gradient hero metrics, no growth-hacked onboarding, no pitch-deck styling. This is serious compliance software that should feel like a real tool a civil servant would actually want to use.

**Key Characteristics:**
- Flat by default; shadow is a functional signal reserved for floating overlays, never decoration.
- One neutral, near-black ink color carries nearly all text and primary actions — color is spent on state (success/warning/info/danger) and on the four ISSP Parts' identity, not on flourish.
- Native-feeling typography (system font stack) over a custom display face, reinforcing "tool" over "product."
- Every interactive control has an honest affordance: if it looks clickable, it acts clickable; nothing decorative masquerades as a control.

## 2. Colors

The palette is a near-monochrome neutral scale (ink on paper) carrying the vast majority of the interface, with color spent deliberately: one hue per semantic state, and one hue per ISSP Part for wayfinding.

### Primary
- **Ink** (#1D1D1F): The near-black used for body text, headings, and primary button fills. Carries nearly all typographic weight in the system.

### Secondary
- **Desk Blue** (#1D4ED8, bg #EFF6FF, border #BFDBFE): Informational callouts — guidance boxes, tooltips, "here's what this section needs" hints. The system's one recurring "helpful, not alarming" accent.

### Tertiary (semantic state)
- **Field Green** (#15803D, bg #F0FDF4, border #BBF7D0): Success / "already in place" / completed states.
- **Amber Flag** (#B45309, bg #FFFBEB, border #FDE68A): Warning / mandatory / needs-attention states.
- **Alert Red** (#FF3B30): Destructive actions and validation errors only — never decorative.

### Neutral
- **Paper** (#FFFFFF): Page and card background.
- **Fog** (#F5F5F7): Secondary surface — muted backgrounds, disabled fills, sidebar panels.
- **Mist** (#E8E8ED): Accent/hover surface, one step up from Fog.
- **Slate Text** (#6E6E73): Muted/secondary text — descriptions, captions, placeholder copy.
- **Hairline** (#D2D2D7): Borders and dividers throughout; the system's only line weight.

### Part Identity
- **Part One Blue** (#0064D1), **Part Two Teal** (#0A7280), **Part Three Green** (#1F7735), **Part Four Purple** (#9D2BD7): One color per ISSP Part (I–IV), used consistently in the sidebar, breadcrumbs, and section eyebrow labels so a user always knows which Part they're in at a glance. This is the system's one deliberately "colorful" wayfinding device — everywhere else, color means state, not identity.

### Named Rules
**The Spent-Not-Spread Rule.** Color is either a semantic state (success/warning/info/danger) or a Part identity marker. It is never applied to a control, a label, or an icon simply for visual variety — an unattached color with no state or identity behind it doesn't belong in this system.

## 3. Typography

**Display Font:** System UI stack (-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif)
**Body Font:** System UI stack (-apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif)
**Label/Mono Font:** IBM Plex Mono, for the rare literal/code-like value (UACS budget codes)

**Character:** The system deliberately uses the OS's own native font rather than a custom display face — this is a tool meant to feel like part of the browser/OS chrome, not a branded product. (A warm alternate theme swaps in Fraunces for display and IBM Plex Sans for body, for a softer, more editorial feel — see Do's and Don'ts.)

### Hierarchy
- **Display** (700 weight, 1.5rem, 1.25 line-height, -0.01em tracking): Section H1 titles at the top of every editor page.
- **Headline** (600 weight, 1rem): Card titles within a section.
- **Title** (600 weight, 0.875rem): Sub-section headings, checklist group labels.
- **Body** (400 weight, 0.875rem, 1.5 line-height): Form labels, descriptions, body copy. Caps at ~75ch where prose runs long (e.g. guidance text).
- **Label** (600 weight, 0.75rem, 0.02em tracking, uppercase where used as an eyebrow): Breadcrumb "Part N" eyebrows, field micro-labels, status pills.

### Named Rules
**The One Face Rule.** Exactly one font family per theme mode carries display, body, and label together (system stack in the default themes; Fraunces + IBM Plex in the warm themes). Never introduce a third family for a one-off heading.

## 4. Elevation

The system is flat at rest. Cards, inputs, buttons, and badges carry no shadow — only a 1px border (Hairline, #D2D2D7) separates surfaces. Shadow appears exclusively as a structural signal that something is floating above the page: dropdown menus, popovers, and slide-out sheets use `shadow-md` or `shadow-lg` paired with a 1px `ring-foreground/10`, and nowhere else. If an element has a shadow, it is telling the user "this is not part of the page flow" — never "this is important."

### Shadow Vocabulary
- **Overlay-medium** (`shadow-md` + `ring-1 ring-foreground/10`): Dropdown menus, select popovers.
- **Overlay-high** (`shadow-lg` + `ring-1 ring-foreground/10`): Context menus, slide-out sheets, floating info cards.

### Named Rules
**The Floating-Only Rule.** Shadow is never applied to anything that sits in normal page flow, no matter how important. A card that needs to stand out gets a border treatment or a background tint, never a drop shadow.

## 5. Components

Components are grounded and unfussy: flat surfaces read as settled and trustworthy rather than experimental, with every state (hover, focus, active, disabled) implemented rather than approximated.

### Buttons
- **Shape:** Rounded corners (0.5rem / `rounded-lg` at default size; smaller radii scale down with smaller size variants).
- **Primary:** Ink fill (#1D1D1F), Paper text (#FFFFFF), 2rem height at desktop density (2.75rem under `coarse` touch pointers).
- **Hover / Focus:** Primary fades to 80% opacity on hover; focus shows a 3px ring at 50% opacity in the theme's ring color. Active press nudges the button down 1px for tactile feedback.
- **Outline / Ghost / Secondary / Destructive:** Outline is Paper background with a Hairline border; Ghost is transparent until hover (Fog background); Destructive uses Alert Red at 10% opacity background with full-strength Alert Red text, never a solid red fill.

### Badges
- **Style:** Fully pill-shaped (9999px radius), 1.25rem height, extra-small text, always paired with a semantic color (success/warning/info) or neutral — never a bare decorative color.
- **State:** Static status pills (e.g. "Already in place") are read-only. Interactive toggle chips exist but are deliberately kept minimal — a checkbox plus one short word, not a full sentence in badge form (see Do's and Don'ts).

### Cards / Containers
- **Corner Style:** 0.875rem radius (`rounded-xl`).
- **Background:** Paper (#FFFFFF) on the app's Paper/Fog page background.
- **Shadow Strategy:** None — flat with a Hairline border (see Elevation).
- **Border:** 1px solid Hairline.
- **Internal Padding:** 1rem–1.5rem depending on density.

### Inputs / Fields
- **Style:** Paper background, Hairline border, 0.625rem radius, 2rem height (2.75rem under touch).
- **Focus:** Border shifts to the theme's Ring color plus a 3px 50%-opacity ring — no glow, no shadow.
- **Error:** Border and ring shift to Alert Red at reduced opacity; disabled state drops to Fog background with reduced-opacity text.

### Navigation
- **Style:** A persistent left sidebar (desktop) listing all ISSP Parts and sections, each Part labeled in its own identity color; a sticky in-page header repeats the current Part/section as a breadcrumb plus an H1 title. Active section is highlighted with a Fog background. Mobile collapses the sidebar behind a hamburger trigger in the sticky header.

## 6. Do's and Don'ts

### Do:
- **Do** keep color attached to meaning — semantic state or Part identity — never decoration (The Spent-Not-Spread Rule).
- **Do** keep every surface flat at rest; reserve shadow strictly for floating overlays (The Floating-Only Rule).
- **Do** give every checklist/toggle control an honest, minimal form — a real checkbox plus a short word, not an oversized wordy badge standing in for one.
- **Do** use the system font stack for the default themes so the app feels native to the OS, not branded.

### Don't:
- **Don't** make this feel like a sterile government Word-doc clone — no rigid bureaucratic-feeling fields with no warmth (PRODUCT.md anti-reference).
- **Don't** make this feel like a flashy consumer SaaS product — no gradient hero metrics, no growth-hacked onboarding, no pitch-deck styling (PRODUCT.md anti-reference).
- **Don't** use a colored left-stripe border (`border-l-4` or similar) as a decorative accent on any card, list item, or callout — full borders or background tints only.
- **Don't** nest bordered "card" containers inside other bordered "card" containers — flatten to one boundary per logical group.
- **Don't** apply an arbitrary rainbow of colors to differentiate items that are already fully identified by their label text — color must carry meaning, not just variety.
