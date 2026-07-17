# Rich-text formatting for textareas (prototype)

**Date:** 2026-07-17
**Status:** Approved, implementing

## Problem

All ISSP editor free-text fields are plain HTML `<textarea>` elements storing
plain strings. `Textarea` (`src/components/ui/textarea.tsx`) has no formatting
support, and the PDF renderer (`src/lib/pdf/render-issp-html.ts`) HTML-escapes
every value and converts `\n` → `<br>` via a shared `nl2br()` helper — there is
no bold/italic/underline/bullet support anywhere in the pipeline.

Carlos wants to know whether textareas can support basic formatting (bold,
italic, underline, bullets via Tab or `-`). This spec covers a two-field
prototype to validate the approach before deciding whether to roll it out
app-wide.

## Scope

Prototype on exactly two fields, both in Part I-A (`part1-a-form.tsx`), so
they can be compared side by side:

1. **Mandate / Functions** (`mandateFunction`) — gets a small toolbar (B/I/U/
   bullet buttons) *plus* keyboard shortcuts.
2. **Vision Statement** (`visionStatement`) — keyboard shortcuts only, no
   toolbar, to compare discoverability vs. visual footprint against (1).

All other textareas in the app (~8 other files: Part II-A/B/C/D, Part III-A/
D/E1, Part IV year narrative, definitions) are explicitly **out of scope** —
they keep using the existing `Textarea` component unchanged.

## Component: `RichTextarea`

New file: `src/components/ui/rich-textarea.tsx`.

- Built on a `contentEditable` `<div>`, styled with the same border/padding/
  focus/placeholder classes `Textarea` uses today, so it's visually
  indistinguishable from a plain textarea until the user applies formatting.
- Props mirror `Textarea`'s usage at the call sites: `value: string`,
  `onChange: (value: string) => void`, plus `placeholder`, `id`, `rows`
  (translated to a `min-height`), and a `toolbar?: boolean` prop (default
  `false`) to control whether the icon row renders.
- **Formatting commands** (shared by both variants, toolbar or not):
  - Bold — Ctrl/Cmd+B → wraps selection in `<strong>`.
  - Italic — Ctrl/Cmd+I → wraps selection in `<em>`.
  - Underline — Ctrl/Cmd+U → wraps selection in `<u>`.
  - Bullet list — typing `-` followed by a space, or pressing Tab, at the
    start of an empty line converts the current line into a `<ul><li>`.
    Enter continues the list with a new `<li>`; Enter on an empty `<li>`
    exits the list back to a normal line.
  - Enter (outside a list) inserts `<br>` — not a new `<div>` block — so the
    stored HTML stays flat and matches the existing `nl2br`-style line-break
    model instead of introducing nested block elements.
- **Toolbar** (`toolbar={true}`, used for Mandate/Functions only): a slim row
  of 4 icon buttons (using `lucide-react`, already a dependency) — Bold,
  Italic, Underline, List — positioned above the editable area, each calling
  the same command handlers as the keyboard shortcuts.
- **Sanitization**: on every change, before calling `onChange`, the div's
  `innerHTML` is walked and reduced to a whitelist: `<strong>`, `<em>`,
  `<u>`, `<ul>`, `<li>`, `<br>` (and their text nodes). Anything else —
  pasted `<script>`, `<img>`, inline `style`, other tags/attributes — is
  stripped, not merely hidden, so pasting from Word/web pages can't smuggle
  in unwanted markup.

## Storage: no schema change

`mandateFunction` and `visionStatement` remain plain `string` fields in
`Part1Data` (`src/lib/store/types.ts`) — no type change, no `.issp` version
bump, no migration. They now *may* contain a whitelisted HTML fragment
instead of raw text.

**Backward compatibility** hinges on one shared predicate,
`isRichText(s: string)`, added to `src/lib/pdf/render-issp-html.ts` (or a
small shared util both the component and the renderer import):

```ts
const RICH_TAG = /<(strong|em|u|ul|li|br)[ >]/i;
function isRichText(s: string): boolean {
  return RICH_TAG.test(s);
}
```

- Existing documents (e.g. `public/demo/ncwtr-issp-2026-2028.issp`, which has
  `mandateFunction` as plain text with literal `\n\n` paragraph breaks) have
  no whitelisted tags → treated as legacy plain text everywhere: escaped and
  `\n` → `<br>`, exactly as today.
- Once a field is edited in the new `RichTextarea`, its stored value will
  contain at least one whitelisted tag (even a single `<br>` from pressing
  Enter) → treated as sanitized HTML and rendered as-is (no escaping).
- `RichTextarea` applies the same check on mount: if the incoming `value` has
  no whitelisted tags, it's seeded into the contentEditable div as escaped
  text with `\n` → `<br>` (matching the PDF's legacy rendering), so old
  content displays identically to how it prints.

This means no import/export changes, no docx-to-issp importer changes (it
keeps emitting plain text, which continues to round-trip correctly), and old
`.issp` files keep working untouched.

## PDF export

`render-issp-html.ts` gets one new helper, `richText(s)`, replacing the two
call sites currently using `nl2br`:

```ts
function richText(s: string | null | undefined): string {
  if (!s) return "";
  return isRichText(s) ? sanitize(s) : nl2br(s);
}
```

- Line 625: `${nl2br(p.mandateFunction)}` → `${richText(p.mandateFunction)}`
- Line 629: `${nl2br(p.visionStatement)}` → `${richText(p.visionStatement)}`

`sanitize()` reuses the same whitelist-stripping logic as the editor's
sanitizer (extracted to a small shared function so the allowed-tag list only
lives in one place) — defense in depth in case a hand-edited `.issp` file
ever contains something outside the whitelist.

## Out of scope

- Rolling formatting out to any other textarea in the app.
- Changing `docx-to-issp` to emit formatted HTML.
- Toolbar styling/positioning beyond a minimal 4-icon row.
- Any rich-text feature beyond bold/italic/underline/bullets (no headings,
  links, colors, tables, etc.).
- `.issp` schema/version changes.

## Testing

- Type check (`npm run build` or `tsc`).
- Browser smoke test via the dev server: type formatted text (bold, italic,
  underline, a bulleted list) into both fields, confirm it displays correctly
  live, reload the page and confirm it persists via the existing
  save/load path.
- Load the NCWTR demo file, confirm its existing plain-text
  `mandateFunction` value still displays and prints identically to before
  (legacy path untouched).
- PDF export smoke test: export a document with formatted content in both
  fields, confirm bold/italic/underline/bullets render correctly in the
  output PDF, and confirm a document with only legacy plain text still
  prints exactly as before.
- Paste test: paste rich text from an external source (e.g. Word, a web
  page) into both fields and confirm disallowed markup/attributes are
  stripped rather than passed through.
