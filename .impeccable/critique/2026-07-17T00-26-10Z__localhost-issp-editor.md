---
target: "Editor overview / dashboard (http://localhost:3100/issp/editor)"
total_score: 27
p0_count: 1
p1_count: 3
timestamp: 2026-07-17T00-26-10Z
slug: localhost-issp-editor
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good signal coverage (progress bar, dots, save state), but amber is overloaded with two meanings (see Priority Issues) |
| 2 | Match System / Real World | 3 | Correct DICT/MITHI domain language, plain-English labels |
| 3 | User Control and Freedom | 3 | Sidebar collapses, no modal traps; no visible "start over" control on this page |
| 4 | Consistency and Standards | 2 | Three different visual patterns (stripe / border / plain list) for the same "grouped section" concept; inconsistent focus-ring treatment |
| 5 | Error Prevention | 3 | Required-field gating on New ISSP dialog; migration-review banner flags risky imported data |
| 6 | Recognition Rather Than Recall | 4 | Whole-document state visible at once, nothing to memorize |
| 7 | Flexibility and Efficiency | 2 | No bulk "mark done," no shortcuts — repeat filers re-click ~19 checkboxes individually |
| 8 | Aesthetic and Minimalist Design | 3 | Generally clean, but stripes + eyebrows + ticker + typewriter add ornamental load |
| 9 | Error Recovery | 3 | Migration banner is specific and actionable; splash error path is well-built but currently unreachable |
| 10 | Help and Documentation | 1 | No help affordance anywhere; done-vs-status-dot semantics are never explained |
| **Total** | | **27/40** | **Acceptable — significant improvements needed before users are fully happy** |

## Anti-Patterns Verdict

**Start here: does this look AI-generated?** Not wholesale — the typewriter greeting, live MITHI ticker, and four-way theme system (system/warm × light/dark) are bespoke enough that a design-literate user wouldn't dismiss the whole page as templated. But it leans on two named anti-patterns identically, five times over: a **left-edge color stripe** on every Part card and the front-matter row (`part-card.tsx:22-23`, `page.tsx:155` — `absolute left-0 inset-y-0 w-[3px]`), and a **tiny uppercase tracked-letter-spacing eyebrow label** on every card and the front-matter header (`part-card.tsx:28-30` "PART I · 3 SECTIONS", `page.tsx:164` "FRONT MATTER"). Repetition, not any single instance, is what reads as scaffolding rather than a considered choice.

**Deterministic scan**: `detect.mjs` on the 7 component files was clean (exit 0, no static findings) — this pattern doesn't trip the linter-style rules because it's a positioned `<div>`, not a `border-left` declaration; a real detector blind spot worth knowing about, not a false negative you should ignore.

**Live overlay** (browser injection succeeded): 14 anti-pattern hits reported, most resolving to false positives on closer inspection — a hidden mobile-nav duplicate render (`editor-sidebar.tsx`, `navContent` reused at both the `md:hidden` popup and the desktop `<aside>`, tripling some counts), an `sr-only` span where line-height is irrelevant, and a `transition: height` on `<body>` that's actually the browser's unset-transition default (`transition-duration: 0s`, nothing animates). Two hits held up as real and are folded into Priority Issues below: a contrast failure on "Continue where you left off" (`#007aff` on white, 4.0:1, needs 4.5:1) and the six `all-caps-body` hits, which — cross-checked against the source — are exactly the same "PART I" / "PART II" / "PART III" eyebrow labels Assessment A flagged independently. **LLM and detector agree on this one**, from two different angles (design judgment vs. computed-style scan).

## Overall Impression

This is a page built with real care in specific spots — the theming system holds up across four palettes without breaking, and the status model pairs color with `aria-label`s rather than leaning on color alone. But it's undercut by one architecture bug that makes the actual empty state unreachable, and by a demo file that contradicts its own pitch on first load. The single biggest opportunity: fix what a first-time user sees in the first 10 seconds — right now that's either the wrong page (marketing site instead of empty state) or a "0% complete" reading on a file explicitly advertised as a finished sample.

## What's Working

1. **Accessible-by-construction status model** — `StatusDot` pairs color with `aria-label={status}` (`status-dot.tsx:21`), and the animated greeting hides itself from screen readers behind a static `sr-only` label (`overview-header.tsx:139`). This is handled correctly, not bolted on.
2. **Migration-review banner** (`page.tsx:134-151`) — a strong contextual-help example: explains what happened, offers a direct "Review X →" link, right tone for a high-stakes government tool.
3. **Theming system** — system-light/dark and warm-light/dark tokens propagate cleanly through the entire dashboard with no breakage across screenshots, a real sign of a maintained design system rather than a bolted-on dark mode.

## Priority Issues

**[P0] SplashView is unreachable — users hitting `/editor` with no doc land on the marketing homepage instead**
- **Why it matters**: `EditorShell` redirects to `/` whenever there's no document loaded (`editor-shell.tsx:18-20`), so the calm, task-focused `SplashView` in `page.tsx:23-115` — complete with its own file input, "Start New" dialog, and error handling — never actually renders in normal navigation. There are now two parallel "Start New ISSP / Load from File" implementations (`page.tsx` and `home-page-client.tsx:~340-436`) that will silently drift out of sync. A returning user who bookmarks or types `/editor` gets bounced to a full "problem / features / why it matters" marketing page instead of a focused empty state — a jarring "did I hit the wrong page" moment (this is also Jordan's biggest red flag below).
- **Fix**: pick one. Either delete the unreachable `SplashView` and make `/` the single canonical empty state, or change `EditorShell` to render its children instead of redirecting so `SplashView` actually serves this route.
- **Suggested command**: `/impeccable shape` — this needs the empty-state/onboarding IA rethought, not a cosmetic pass.

**[P1] The flagship demo file reads as broken on first load**
- **Why it matters**: Loading `ncwtr-issp-2026-2028.issp` — the sample pitched on the splash screen as a way to "see a sample" — produces "0% complete · 0 of 19" with every populated section shown amber/in-progress, because the seed data never sets `userMarkedDone` (defaults `false` per `store/index.tsx:298`). The one artifact meant to build first-run trust instead visually reads as unfinished or broken.
- **Fix**: seed the demo file with `userMarkedDone: true` on its completed sections, or adjust the copy so it doesn't promise "fully filled out."
- **Suggested command**: `/impeccable onboard` — this is a first-run trust problem specifically.

**[P1] Low-contrast text on the primary return-user action**
- **Why it matters**: "Continue where you left off" (`continue-editing-card.tsx:25`, `style={{ color: part.color }}`) renders at `#007aff` on white — 4.0:1 contrast, confirmed by the live overlay, against a 4.5:1 AA requirement for 14px text. This is the label on the main CTA a returning user relies on, and it's a WCAG failure on a government tool, not a decorative accent.
- **Fix**: darken the blue token used here (or apply it only to non-text elements) until it clears 4.5:1 against white in both light themes.
- **Suggested command**: `/impeccable audit` — flag and fix the full set of contrast issues on this surface in one pass (there's a second, related one on the `/50`-opacity timestamps — see Minor Observations).

**[P1] Amber carries two unrelated meanings on the same screen**
- **Why it matters**: `StatusDot`'s ordinary `in_progress` state and the "N sections need review" migration pill (`part-card.tsx:34-38`) use the same warning-amber palette. A genuine actionable warning (something imported wrong) is visually indistinguishable from routine unfinished work, which undercuts the one signal that should stand out most on a compliance tool.
- **Fix**: reserve amber strictly for "needs your attention now" states; give ordinary in-progress a neutral/blue tone instead.
- **Suggested command**: `/impeccable colorize` — this is a semantic color vocabulary fix, not a one-off tweak.

**[P2] The stripe + eyebrow pattern is applied identically five times**
- **Why it matters**: the left-edge color stripe and the tiny uppercase tracked-letter label appear together on every `PartCard` and the front-matter row. Individually defensible; repeated identically across every group, it reads as scaffolding rather than a considered choice — and it's exactly what the deterministic scan's `all-caps-body` hits independently flagged, from a completely different angle than the design read.
- **Fix**: keep one device, not both — either the stripe as the grouping cue, or the label, not every card carrying both.
- **Suggested command**: `/impeccable quieter` — dial back the repeated ornamental device without losing the grouping information it carries.

## Persona Red Flags

**Jordan (Confused First-Timer)**: Downloads the demo expecting a finished sample, gets "0% complete" and a wall of amber dots with no help icon anywhere to explain why. The migration-review banner's copy ("mark each one as done again") assumes a done/undone mental model Jordan hasn't learned yet. And if Jordan revisits `/editor` directly with no doc loaded, they land on the full marketing site instead of a calm empty state.

**Sam (Accessibility-Dependent User)**: Status semantics are handled well overall (color + `aria-label` on `StatusDot`, `sr-only` label on the animated greeting) — credit where due. But the MITHI ticker's auto-rotating content has no `aria-live` region, so screen-reader users get inconsistent or no announcement of new advisories. The 32px mobile hamburger button (`overview-header.tsx:161-168`) sits under the 44px minimum touch target, and both the "Continue where you left off" link and the `/50`-opacity timestamps are confirmed or likely contrast failures.

**Alex (Impatient Power User / annual repeat filer)**: Re-uploading a previous year's fully-completed `.issp` to start an update shows every section as "in progress," not "done" — `userMarkedDone` doesn't carry over from content, forcing a manual re-click across ~19 checkboxes spread over 4 separate editor pages, with no bulk action available. `ContinueEditingCard`'s "left off" pointer is also unreliable when timestamps tie, silently defaulting to the first section regardless of actual last activity.

## Minor Observations

- Two always-on animations run simultaneously on every load (typewriter greeting, `HOLD_MS=4200`, and the MITHI ticker, `ROTATE_MS=5000`) — both individually respect `prefers-reduced-motion`, but together they add continuous motion to a page whose job is "let me see my progress fast."
- Timestamp text (`part-card.tsx:66`, `text-muted-foreground/50`) is close to failing WCAG contrast in the light theme — worth checking alongside the confirmed `#007aff` failure above.
- Mobile hamburger target is 32px (`h-8 w-8`) against the 44px minimum, on a page whose mobile persona is explicitly in scope.
- `ContinueEditingCard` mixes Tailwind classes with an inline `style={{ borderColor: part.color }}` — works, but is a small code-vocabulary inconsistency worth normalizing if the color system gets touched anyway (see the colorize item above).
- MITHI ticker links open an external site with no external-link affordance/icon.
- The first-visit "Try themes" nudge (`editor-sidebar.tsx:1002`) visually overlapped live sidebar nav items (Part III's D/E rows) in one captured screenshot — dismissible, but obscures real content while shown.
- Footer credit ("made with ❤️ para sa bayan") is consistent between the homepage and the editor sidebar — a genuine, uncriticized brand touch, not a slop tell.

## Questions to Consider

- "In-progress" currently just means "edited but the done checkbox isn't clicked yet" — is that worth painting warning-amber across the whole dashboard, or would a neutral in-progress state plus a rarer, genuinely distinct "needs review" color better match the actual risk?
- Given `/editor` with no doc silently redirects to the marketing homepage, is `SplashView` safe to delete outright, or is it a landmine waiting for someone to "fix" the unreachable copy later?
- For an annual repeat filer re-importing a complete prior-year plan, is there a faster path than 19 individual "mark done" clicks scattered across 4 separate part editors?
