---
target: ISSP Editor — Overview + Part I-IV forms
total_score: 28
p0_count: 0
p1_count: 2
timestamp: 2026-07-17T06-01-43Z
slug: issp-editor-overview-part-i-iv-forms
---
Method: dual-agent (A: design review · B: detector + browser evidence) — broadened scope: Editor Overview (re-check) + 5 representative form pages (Part I-A, I-C, II-D, III-D, IV-Year1)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Status dots, "Marked as done," save state, migration banners all consistent; PDF export progress lives only in the sidebar footer, easy to miss if scrolled |
| 2 | Match System / Real World | 3 | Field labels mirror actual DICT template language; UACS/MOOE/CO jargon is unavoidable but tooltip-explained |
| 3 | User Control and Freedom | 3 | Destructive actions gate through a named two-step confirm; nav footer always offers Prev/Next + "Return to Overview" |
| 4 | Consistency and Standards | 2 | Real cross-page drift: three different "edit one row in a list" idioms (inline table cell, card accordion, drawer) across similar data; Part IV reintroduces the side-stripe removed from Overview |
| 5 | Error Prevention | 3 | Numeric/select/toggle controls constrain input well; the `YesNoToggle` unset state can't be mistaken for "No" |
| 6 | Recognition Rather Than Recall | 3 | Tooltips are thorough and template-accurate; Part IV's color legend asks users to memorize 4 color→category mappings redundant with text headings |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts anywhere; view-mode toggles are a good idea but don't share a preference across form families |
| 8 | Aesthetic and Minimalist Design | 3 | Part I-A and Part III-D are clean; Part II-D's density is earned by real complexity; Part IV loses a point to the stripe + hardcoded-hex legend |
| 9 | Error Recovery | 3 | Delete flows are named and two-step; no field ever tells you it's invalid until PDF export fails — the form itself gives no inline validation feedback |
| 10 | Help and Documentation | 3 | Contextual tooltips on nearly every non-obvious field, consistently implemented; no standalone help/search, but arguably right for this register |
| **Total** | | **28/40** | **Good — solid foundation, held together by strong tooltip discipline; loses points to cross-page consistency drift and one regression** |

Note: this is a broader surface than the first critique run (which scored the Overview alone at 27/40). The two scores aren't directly comparable — this run's 28/40 averages six pages, most of them scoring well, alongside the now-fixed Overview. Treat this as a new baseline, not a trend delta.

## Anti-Patterns Verdict

**Mostly clean, with one real regression.** This reads as a deliberately-designed product, not a generated one — no gradient text, no glassmorphism, no hero-metric template, no hollow numbered-eyebrow scaffolding anywhere across the 6 pages. But the exact side-stripe anti-pattern removed from the Overview's `PartCard` in the last round has reappeared, unfixed, in Part IV: `part4-year-form.tsx:545-546`, `<div className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: color }} />` on every `SectionCard`, using hardcoded hex (`#3B82F6`, `#8B5CF6`, `#F59E0B`, `#F43F5E`) instead of the app's design tokens.

**Deterministic scan**: the CLI static scan across all 12 source files (including `part4-year-form.tsx`) came back clean (exit 0) — it doesn't catch a positioned `<div>` accent bar, only literal `border-left`/`border-right` declarations. This is the same detector blind spot noted in the first critique round, now confirmed a second time on a different file: **the LLM design review caught a real, previously-banned pattern that the static scan structurally cannot see.**

**Live overlay** (6 pages, 125 raw findings): after false-positive analysis, most of the volume collapses to a handful of root causes, not 125 independent problems:
- Roughly half of every `all-caps-body`/`tiny-text` count is a phantom duplicate — `editor-sidebar.tsx` renders one `navContent` JSX block twice (a hidden mobile popup copy plus the visible desktop copy); the detector counts both even though only one is ever painted.
- `layout-transition` on `<body>`/`<html>` is the CSS engine's default computed-style baseline (`transition-duration: 0s`, nothing animates), not an authored transition — same false-positive pattern seen in the first critique round.
- `cramped-padding` on icon-only buttons assumes text content; these buttons hold only an SVG, so the padding math doesn't apply.
- The one `clipped-overflow-container` hit on Part IV was checked directly (`scrollHeight === clientHeight`) and nothing is actually clipped there — the flagged elements are `fixed`/`sticky`/`absolute` siblings immune to the ancestor's `overflow: hidden`.
- Two patterns are real and repeat, not noise: `nested-cards` (Card-in-Card) appears on every form page except the chrome-only Overview, scaling directly with content complexity (6 → 1 → 10 → 3 → 23 across the five forms, peaking on Part II-D and Part IV) — genuine visible nesting, confirmed in screenshots, and explicitly named in this design system's own layout rules as "always wrong." And `gpt-thin-border-wide-shadow` fires once, identically, on all 6 pages — very likely one shared shell/card style rather than six separate issues, though neither assessment pinned down the exact element; worth a quick manual look before deciding it's a problem.

## Overall Impression

The Overview fixes from the last round held completely — both assessments independently confirmed "100% complete, 19 of 19" with no regression, and none of the previously-fixed patterns (dead splash route, contrast failures, amber overload, stripe/eyebrow) reappeared *there*. But the fix wasn't systematized: the same banned stripe pattern this round found reappeared, unfixed, on a page nobody had looked at yet. The forms themselves are generally solid — genuine tooltip discipline and a well-built read-then-edit pattern on Part III-D — but risk and complexity aren't evenly matched with support: Part IV, the highest-stakes page (real budget figures), is simultaneously the page with the weakest mobile layout, the least inline validation, and the one stripe regression.

## What's Working

1. **Read/Edit separation on Part III-D** (`part3-d-form.tsx:280-281`) — existing systems default to a collapsed, read-only summary; editing requires an explicit "Edit system" click. This is the one form of the five that actually solves "browsing shouldn't risk a stray edit" — Part I-C and Part IV's inline-editable table cells don't.
2. **Tooltip discipline** — every non-obvious field across all 5 forms routes through the same `FormField`/`Tooltip` primitive with template-accurate copy, not generic filler. Real information architecture, not decoration.
3. **The Overview fixes held** — confirmed independently by both assessments: 100% complete on the demo load, no dead-splash bounce, no contrast failures, no amber/warning collision on the dashboard itself. The work from the last round is holding up under a second, broader look.

## Priority Issues

**[P1] The removed side-stripe pattern reappeared, unfixed, in Part IV**
- **Why it matters**: `part4-year-form.tsx:545-546` — every `SectionCard` on every Part IV year page carries the same left-edge colored accent bar explicitly removed from the Overview's `PartCard` last round, plus hardcoded hex colors instead of the app's CSS tokens. This is a regression of a previously-flagged, previously-fixed anti-pattern — it means the fix was patched where it was caught, not systematized, so Part IV also won't pick up future token/theme changes the way every other colored surface does.
- **Fix**: drop the stripe; reuse the badge pattern already established on Overview's `PartCard` (tinted background chip, no stripe). Route the 4 legend colors through tokens instead of hardcoded hex.
- **Suggested command**: `/impeccable polish`

**[P1] Part IV's mobile layout breaks on its own header and the "Add Line" action**
- **Why it matters**: at 390px, the section header (title + total) collides instead of stacking, and the line-table header band ("Capital Outlay (CO)" + item count + total + "+ Add Line" button) doesn't wrap — the Add Line button is visibly clipped at the card edge in the mobile screenshot. This is the highest-error-cost page in the app (real budget figures) and the one page whose primary action is partially obscured on the device class this app explicitly targets.
- **Fix**: stack the section header under `sm`; let the line-table header band wrap to two rows (title+count, then total+button) under `sm`.
- **Suggested command**: `/impeccable adapt`

**[P2] No inline validation anywhere in the forms — errors only surface when PDF export fails**
- **Why it matters**: across all 5 forms, no field visibly flags a problem (empty required text, a zero/negative budget line, an incomplete checklist item) until the user attempts to export. For a compliance document a government employee's job may depend on getting right, silent-until-export is a real error-recovery gap, and it concentrates the worst-case discovery moment on Part IV, the page with real money on it.
- **Fix**: add inline, field-level validation feedback (at minimum on Part IV's numeric line items and any DICT-mandatory fields), rather than deferring all feedback to export time.
- **Suggested command**: `/impeccable harden`

**[P2] Nested cards scale with form complexity instead of being resolved by it**
- **Why it matters**: Card-in-Card nesting appears on every form page except the Overview and tracks content density almost exactly (6 → 1 → 10 → 3 → 23 across the five forms, worst on Part II-D and Part IV) — confirmed as real, visible nesting in screenshots, not a detector artifact. This design system's own layout rules call nested cards "always wrong" for a reason: as complexity grows, nesting is the reflexive fix that makes a page feel more structured without actually reducing what the user has to parse.
- **Fix**: on the two worst offenders (Part II-D, Part IV), replace at least one nesting level with a flatter pattern — full-bleed dividers, indentation, or a background-tint group instead of a card inside a card.
- **Suggested command**: `/impeccable layout`

**[P2] Part II's identity color and the warning color are nearly indistinguishable, exactly where it matters most**
- **Why it matters**: measured live — `--part-2` (`#985900`) and `--warning` (`#b45309`) are both burnt-orange and visually adjacent. Part II-D is the one page that pairs them directly: the amber "Part II" identity sits above cards carrying amber "Needs answer" warning badges. A user scanning for unanswered items can't visually separate "this is Part II" from "this needs attention" — the same amber-overload failure mode flagged on the Overview last round, now surfacing on the page where it's most load-bearing.
- **Fix**: shift `--part-2` toward a hue with real separation from warning-orange, or move the "Needs answer" badge to a different semantic color (it flags an incomplete field, not an error).
- **Suggested command**: `/impeccable colorize`

## Persona Red Flags

**Jordan (Confused First-Timer)**: the "Legal Basis" field on Part I-A is a single-line input for what's realistically a full RA-citation sentence — the demo data itself overflows the visible width with no wrap, so a first-timer can't proofread what they typed without scrolling inside a one-line box (sibling fields like "Vision Statement" correctly use a textarea). On Part II-D, answering "No" to a program reveals a new required sub-checklist below the fold with no visual entrance cue — unlike list items added elsewhere in the app, which do pulse into view — so a first-timer who answers quickly and keeps scrolling can miss that new required fields just appeared.

**Casey (Distracted Mobile User)**: Part II-D holds up on mobile — cards stack cleanly, badges wrap, checkboxes are a reasonable size. Part IV-Year1 is the actual break: the clipped "Add Line" button (P1 above) is precisely an "important action unreachable" red flag for a thumb-driven, one-handed user, on the one page where a mistake costs the most. (This specific "button clipped at the card edge" observation comes from Assessment A's screenshot review; Assessment B's detector checked a different, unrelated clipping mechanism on the same page and found no scroll-clipping there — the two aren't in conflict, they're just checking different things, and the button-clipping claim itself wasn't independently re-verified by the detector pass.)

**Alex (Impatient Power User)**: no keyboard shortcuts anywhere across any of the 6 pages. The view-mode toggles on Part I-C (table/cards/summary) and Part IV (list/table) are a genuine efficiency win once discovered, but each is a separate `localStorage` key — a user who prefers density everywhere has to set the same preference twice, once per form family, with no shared mental model between them.

## Minor Observations

- The "Try themes" nudge popup appeared in every single form-page screenshot this session, overlapping 2-3 sidebar nav items until dismissed — worth checking whether its dismiss/frequency logic is actually working, since a "first-visit nudge" that reappears on every page read as permanent chrome, not a one-time tip.
- Part III-D's cross-reference badges truncate but carry a real `title` attribute for hover-reveal; Part I-C's "Stakeholder / Client" table column truncates long agency names with no `title` attribute at all — the correct pattern already exists one page over and didn't make it to I-C.
- Part II-D's summary stat chips (Utilizing / Not Utilizing / Unanswered) are decorative-only; making "Unanswered" clickable to jump to the first unanswered card would directly help the page's own cognitive-load finding.
- `gpt-thin-border-wide-shadow` fired identically on all 6 pages — likely one shared shell/card style, not six issues, but neither assessment identified the exact element. Worth a five-minute manual check before deciding whether it's worth fixing.
- Section footer nav consistently strips the letter prefix from labels across every page — a small, correctly-applied bit of copy discipline, no inconsistency found.

## Questions to Consider

- The side-stripe was flagged and fixed once on the Overview, then reappeared unfixed on a page nobody had looked at yet — should there be a shared `Card` variant that makes the pattern structurally hard to reintroduce, rather than relying on catching it again next critique?
- Part I-C and Part IV both solve "edit one row in a list" with different idioms (inline cell, card, drawer) — is that variety intentional (matching each task's shape) or just whoever built each form picking what felt right that day?
- Part IV is explicitly the highest-error-cost page in the app — should a missing description or a zero-cost line block "Mark as done," instead of only failing quietly at PDF-export time?
