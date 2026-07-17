# Rich-Text Textarea Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prototype bold/italic/underline/bullet formatting on two Part I-A textareas (Mandate/Functions with a toolbar, Vision Statement with shortcuts only) so Carlos can compare the two UX variants before deciding on an app-wide rollout.

**Architecture:** A new `contentEditable`-based `RichTextarea` component (`src/components/ui/rich-textarea.tsx`) replaces `Textarea` at exactly two call sites in `part1-a-form.tsx`. It stores a small whitelisted HTML fragment in the same `string` field the schema already has — no schema change. A shared, environment-agnostic sanitizer (`src/lib/rich-text.ts`, pure regex, no DOM dependency) is reused by both the browser component and the Node-side PDF renderer, so untouched legacy plain-text documents keep rendering exactly as they do today.

**Tech Stack:** Next.js 16 / React 19, Tailwind v4 (arbitrary-variant selectors), `lucide-react` icons (already a dependency), `document.execCommand` for browser formatting commands (no new dependency). No unit-test framework exists in this project — see Global Constraints.

## Global Constraints

- No new npm dependencies. `Bold`, `Italic`, `Underline`, `List` icons already exist in the installed `lucide-react` version — confirmed via `node -e` against `node_modules/lucide-react`.
- **No unit-test framework in this project** (confirmed: `package.json` has no `jest`/`vitest`/`ts-node`/`tsx`). Per the project's own `verify-feature` skill, verification is: TypeScript at the type level (`npx tsc --noEmit --skipLibCheck`), smoke tests in a real browser via Puppeteer, and PDF output inspection via `pdftotext`/`pdftoppm`. Every task below substitutes this ladder for the pytest-style steps a generic plan would use.
- Sanitizer whitelist is exactly 6 tags: `strong`, `em`, `u`, `ul`, `li`, `br`. No attributes on any of them. Nothing else in this plan changes that whitelist.
- Scope is exactly two fields: `mandateFunction` (toolbar) and `visionStatement` (shortcuts-only), both in `src/components/issp-editor/part1/part1-a-form.tsx`. Do not touch any other `Textarea` usage in the app.
- `Part1Data`/`Part1AData` types (`src/lib/store/types.ts`, `part1-a-form.tsx`) are unchanged — both fields stay `string`. Do not bump any `.issp` schema version.
- Follow existing code conventions: `@/` path aliases, `cn()` from `@/lib/utils` for class merging, Tailwind v4 arbitrary-variant syntax (e.g. `[&_ul]:list-disc`) as already used in `src/components/ui/button.tsx`.
- Dev server runs on port 3000 via pm2 already — do not restart it for browser smoke tests. Never run `npm run build` except in the final verification task, and only if planning to `pm2 restart issp` immediately after (per `verify-feature` skill) — this plan does not require a prod deploy, so `npm run build`/`pm2 restart` are **not** run unless Carlos separately asks to ship it.

---

### Task 1: Shared rich-text utilities

**Files:**
- Create: `src/lib/rich-text.ts`

**Interfaces:**
- Consumes: nothing (pure functions, no imports needed).
- Produces (used by Tasks 2 and 4):
  - `isRichText(value: string): boolean`
  - `sanitizeRichText(html: string): string`
  - `escapeHtml(value: string): string`
  - `legacyToHtml(value: string): string`

- [ ] **Step 1: Write the utility module**

```ts
// src/lib/rich-text.ts

const ALLOWED_TAGS = new Set(["strong", "em", "u", "ul", "li", "br"]);
const RICH_TAG_RE = /<(strong|em|u|ul|li|br)[ >/]/i;

export function isRichText(value: string): boolean {
  return RICH_TAG_RE.test(value);
}

export function sanitizeRichText(html: string): string {
  return html.replace(/<\/?([a-zA-Z0-9]+)[^>]*>/g, (match, rawTag: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    const isClosing = match.startsWith("</");
    if (tag === "br") return isClosing ? "" : "<br>";
    return isClosing ? `</${tag}>` : `<${tag}>`;
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function legacyToHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}
```

This is a pure-string implementation (no `DOMParser`/`document` dependency) so it works identically in the browser (`rich-textarea.tsx`, Task 2) and in the Node-side PDF renderer (`render-issp-html.ts`, runs server-side with no DOM — confirmed by grepping `generate-pdf.ts`'s imports, which only pull in `puppeteer`, not `jsdom`/`cheerio`).

- [ ] **Step 2: Verify with a throwaway Node script**

There's no test runner, so verify behavior by transpiling nothing — run the logic directly with plain Node (the functions use no TS-only syntax beyond type annotations, so a quick manual check via `npx tsc --noEmit` for types, plus this ad-hoc script for behavior, is the project's actual verification method):

```bash
cat > /tmp/verify-rich-text.mjs << 'EOF'
const ALLOWED_TAGS = new Set(["strong", "em", "u", "ul", "li", "br"]);
const RICH_TAG_RE = /<(strong|em|u|ul|li|br)[ >/]/i;
function isRichText(v) { return RICH_TAG_RE.test(v); }
function sanitizeRichText(html) {
  return html.replace(/<\/?([a-zA-Z0-9]+)[^>]*>/g, (match, rawTag) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    const isClosing = match.startsWith("</");
    if (tag === "br") return isClosing ? "" : "<br>";
    return isClosing ? `</${tag}>` : `<${tag}>`;
  });
}

console.assert(isRichText("<strong>x</strong>") === true, "detects strong");
console.assert(isRichText("plain\ntext") === false, "legacy plain text is not rich");
console.assert(
  sanitizeRichText('<script>alert(1)</script><strong onclick="x">Bold</strong>') ===
    'alert(1)<strong>Bold</strong>',
  "strips disallowed tags and attributes"
);
console.assert(
  sanitizeRichText("<ul><li>a</li><li>b</li></ul>") === "<ul><li>a</li><li>b</li></ul>",
  "passes through whitelisted tags"
);
console.log("rich-text utils OK");
EOF
node /tmp/verify-rich-text.mjs
```

Expected: `rich-text utils OK` printed, no assertion errors (a failed `console.assert` prints `Assertion failed:` to stderr but doesn't exit non-zero — visually confirm no such lines appear).

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: no errors referencing `rich-text.ts`.

- [ ] **Step 4: Clean up and commit**

```bash
rm /tmp/verify-rich-text.mjs
git add src/lib/rich-text.ts
git commit -m "feat: add shared rich-text sanitizer utilities"
```

---

### Task 2: `RichTextarea` component

**Files:**
- Create: `src/components/ui/rich-textarea.tsx`

**Interfaces:**
- Consumes: `isRichText`, `sanitizeRichText`, `legacyToHtml` from `@/lib/rich-text` (Task 1); `cn` from `@/lib/utils`; `Button` from `@/components/ui/button`; `Bold`, `Italic`, `Underline`, `List` from `lucide-react`.
- Produces (used by Task 3):
  - `RichTextarea` component with props `{ id?: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; toolbar?: boolean; className?: string }`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/ui/rich-textarea.tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isRichText, legacyToHtml, sanitizeRichText } from "@/lib/rich-text";

interface RichTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  toolbar?: boolean;
  className?: string;
}

function seedHtml(value: string): string {
  if (!value) return "";
  return isRichText(value) ? sanitizeRichText(value) : legacyToHtml(value);
}

function getLineStartText(root: HTMLElement): string | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;
  const prev = node.previousSibling;
  if (prev !== null && !(prev instanceof HTMLBRElement)) return null;
  return (node.textContent ?? "").slice(0, range.startOffset);
}

function isInsideList(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  let node: Node | null = sel.getRangeAt(0).startContainer;
  while (node && node !== root) {
    if (node instanceof HTMLElement && node.tagName === "LI") return true;
    node = node.parentNode;
  }
  return false;
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function RichTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  toolbar = false,
  className,
}: RichTextareaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !ref.current) return;
    ref.current.innerHTML = seedHtml(value);
    seeded.current = true;
    // Seeded once on mount only (uncontrolled contentEditable after that) —
    // re-syncing innerHTML from `value` on every render would fight the
    // caret position mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    onChange(sanitizeRichText(ref.current.innerHTML));
  }, [onChange]);

  const exec = useCallback(
    (command: "bold" | "italic" | "underline" | "insertUnorderedList") => {
      ref.current?.focus();
      document.execCommand(command);
      handleInput();
    },
    [handleInput]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const root = ref.current;
      if (!root) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        exec("bold");
        return;
      }
      if (mod && e.key.toLowerCase() === "i") {
        e.preventDefault();
        exec("italic");
        return;
      }
      if (mod && e.key.toLowerCase() === "u") {
        e.preventDefault();
        exec("underline");
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (getLineStartText(root) === "") exec("insertUnorderedList");
        return;
      }
      if (e.key === " " && getLineStartText(root) === "-") {
        e.preventDefault();
        document.execCommand("delete");
        exec("insertUnorderedList");
        return;
      }
      if (e.key === "Enter" && !isInsideList(root)) {
        e.preventDefault();
        document.execCommand("insertLineBreak");
        handleInput();
      }
    },
    [exec, handleInput]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");
      const insertHtml = html ? sanitizeRichText(html) : legacyToHtml(text);
      document.execCommand("insertHTML", false, insertHtml);
      handleInput();
    },
    [handleInput]
  );

  return (
    <div className="space-y-1">
      {toolbar && (
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-1">
          <ToolbarButton label="Bold" onClick={() => exec("bold")}>
            <Bold className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => exec("italic")}>
            <Italic className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarButton label="Underline" onClick={() => exec("underline")}>
            <Underline className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
            <List className="h-3 w-3" />
          </ToolbarButton>
        </div>
      )}
      <div className="relative">
        {!value && placeholder && (
          <span className="pointer-events-none absolute left-2.5 top-2 text-base text-muted-foreground md:text-sm">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          id={id}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          style={{ minHeight: `${rows * 1.5}rem` }}
          className={cn(
            "relative w-full rounded-lg border border-border bg-card px-2.5 py-2 text-base text-foreground transition-colors outline-none hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:pl-0.5",
            className
          )}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: no errors referencing `rich-textarea.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/rich-textarea.tsx
git commit -m "feat: add RichTextarea contentEditable component"
```

---

### Task 3: Wire into Part I-A form

**Files:**
- Modify: `src/components/issp-editor/part1/part1-a-form.tsx:1-14` (imports), `:207-214` (Mandate/Functions field), `:232-239` (Vision Statement field)

**Interfaces:**
- Consumes: `RichTextarea` from `@/components/ui/rich-textarea` (Task 2).
- Produces: nothing new for later tasks — this is a leaf usage.

- [ ] **Step 1: Add the import**

In `src/components/issp-editor/part1/part1-a-form.tsx`, add alongside the existing `Textarea` import (line 7):

```tsx
import { Textarea } from "@/components/ui/textarea";
import { RichTextarea } from "@/components/ui/rich-textarea";
```

- [ ] **Step 2: Swap the Mandate/Functions field to the toolbar variant**

Replace (current lines 207–214):

```tsx
            <Textarea
              id="mandate-function"
              placeholder="Describe the agency's mandate and primary functions..."
              value={data.mandateFunction}
              onChange={(e) => update("mandateFunction", e.target.value)}
              rows={4}
            />
```

with:

```tsx
            <RichTextarea
              id="mandate-function"
              placeholder="Describe the agency's mandate and primary functions..."
              value={data.mandateFunction}
              onChange={(value) => update("mandateFunction", value)}
              rows={4}
              toolbar
            />
```

- [ ] **Step 3: Swap the Vision Statement field to the shortcuts-only variant**

Replace (current lines 232–239):

```tsx
            <Textarea
              id="vision"
              placeholder="The agency's vision for the future..."
              value={data.visionStatement}
              onChange={(e) => update("visionStatement", e.target.value)}
              rows={3}
            />
```

with:

```tsx
            <RichTextarea
              id="vision"
              placeholder="The agency's vision for the future..."
              value={data.visionStatement}
              onChange={(value) => update("visionStatement", value)}
              rows={3}
            />
```

(No `toolbar` prop — defaults to `false`.)

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 5: Browser smoke test**

There's no test runner in this project — verification is a real browser session via Puppeteer, per the `verifier-web` skill. The dev server is already running on port 3000 via pm2; do not restart it.

```bash
cat > /root/apps/issp/screenshot-rich-text.js << 'EOF'
const puppeteer = require('puppeteer');
const fs = require('fs');

const CHROME = '/root/.cache/puppeteer/chrome/linux-148.0.7778.167/chrome-linux64/chrome';
const BASE   = 'http://localhost:3000';
const SHOTS  = '/tmp/verify-shots';
fs.mkdirSync(SHOTS, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
  console.log(`shot: ${name}.png`);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000);
  await page.setViewport({ width: 1400, height: 900 });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile('/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  await page.goto(`${BASE}/editor?section=part1/a`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  // Mandate/Functions: toolbar variant — type, then bold/italic/underline/bullet.
  const mandate = await page.$('#mandate-function');
  await mandate.click();
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type('Plain text. ');
  await page.keyboard.down('Control'); await page.keyboard.press('b'); await page.keyboard.up('Control');
  await page.keyboard.type('Bold text.');
  await page.keyboard.down('Control'); await page.keyboard.press('b'); await page.keyboard.up('Control');
  await page.keyboard.press('Enter');
  await page.keyboard.type('- bullet one');
  await page.keyboard.press(' ');
  await page.keyboard.type('first item');
  await page.keyboard.press('Enter');
  await page.keyboard.type('second item');
  await new Promise(r => setTimeout(r, 300));
  await shot(page, 'mandate-toolbar-formatted');

  // Vision: shortcuts-only variant.
  const vision = await page.$('#vision');
  await vision.click();
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.down('Control'); await page.keyboard.press('i'); await page.keyboard.up('Control');
  await page.keyboard.type('Italic vision text.');
  await page.keyboard.down('Control'); await page.keyboard.press('i'); await page.keyboard.up('Control');
  await new Promise(r => setTimeout(r, 300));
  await shot(page, 'vision-shortcuts-formatted');

  // Confirm the stored value is sanitized HTML, not raw text.
  const mandateHtml = await page.$eval('#mandate-function', el => el.innerHTML);
  const visionHtml = await page.$eval('#vision', el => el.innerHTML);
  console.log('mandate innerHTML:', mandateHtml);
  console.log('vision innerHTML:', visionHtml);

  // Paste test: dispatch a synthetic ClipboardEvent (no OS clipboard/
  // permissions needed) carrying disallowed markup, confirm it's stripped
  // and nothing executes.
  await page.evaluate(() => {
    const el = document.querySelector('#mandate-function');
    el.focus();
    const dt = new DataTransfer();
    dt.setData(
      'text/html',
      '<img src=x onerror="window.__pasteXss=true"><strong>kept bold</strong><script>window.__pasteXss=true</script>'
    );
    dt.setData('text/plain', 'kept bold');
    const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    el.dispatchEvent(evt);
  });
  await new Promise(r => setTimeout(r, 300));
  const afterPasteHtml = await page.$eval('#mandate-function', el => el.innerHTML);
  const xssRan = await page.evaluate(() => window.__pasteXss === true);
  console.log('after paste innerHTML:', afterPasteHtml);
  console.log('xss ran (must be false):', xssRan);

  await new Promise(r => setTimeout(r, 2000)); // let debounced save fire
  await shot(page, 'part1a-after-edit');

  // Reload-persistence check: confirm formatted content survives a reload
  // through the normal IDB hydration path (not just in-memory state).
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const mandateAfterReload = await page.$eval('#mandate-function', el => el.innerHTML);
  const visionAfterReload = await page.$eval('#vision', el => el.innerHTML);
  console.log('mandate innerHTML after reload:', mandateAfterReload);
  console.log('vision innerHTML after reload:', visionAfterReload);
  await shot(page, 'part1a-after-reload');

  await browser.close();
})();
EOF
node /root/apps/issp/screenshot-rich-text.js
```

Expected console output: `mandate innerHTML` contains `<strong>Bold text.</strong>` and a `<ul><li>` structure; `vision innerHTML` contains `<em>Italic vision text.</em>`. After the paste test: `after paste innerHTML` contains `kept bold` inside a `<strong>` tag but no `<img>`/`<script>` tag, and `xss ran (must be false): false`. After reload: `mandate innerHTML after reload` and `vision innerHTML after reload` still contain the same formatting (bold/list/italic) as before the reload, confirming the sanitized HTML round-trips through save → IndexedDB → hydration correctly. Then **read every PNG in `/tmp/verify-shots/` with the Read tool** and confirm visually: bold/italic render correctly, the bullet list shows two items, the toolbar row is visible above Mandate/Functions but absent above Vision Statement, and the post-reload screenshot looks identical to the pre-reload one.

- [ ] **Step 6: Clean up and commit**

```bash
rm /root/apps/issp/screenshot-rich-text.js
git add src/components/issp-editor/part1/part1-a-form.tsx
git commit -m "feat: wire RichTextarea into Mandate/Functions and Vision Statement fields"
```

---

### Task 4: PDF export support

**Files:**
- Modify: `src/lib/pdf/render-issp-html.ts:1-2` (imports), `:198-201` (add `richText` helper after `nl2br`), `:379` (add CSS), `:625` and `:629` (swap call sites)

**Interfaces:**
- Consumes: `isRichText`, `sanitizeRichText` from `@/lib/rich-text` (Task 1).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Add the import**

At the top of `src/lib/pdf/render-issp-html.ts` (after line 2):

```ts
import { STANDARD_DEFINITIONS } from "@/lib/store/defaults";
import { CYBER_GROUPS } from "@/lib/cyber-controls";
import { isRichText, sanitizeRichText } from "@/lib/rich-text";
```

- [ ] **Step 2: Add the `richText` helper**

Immediately after the existing `nl2br` function (currently lines 198–201):

```ts
function nl2br(s: string | null | undefined): string {
  if (!s) return "";
  return esc(s).replace(/\n/g, "<br>");
}

function richText(s: string | null | undefined): string {
  if (!s) return "";
  return `<span class="rich-text">${isRichText(s) ? sanitizeRichText(s) : nl2br(s)}</span>`;
}
```

- [ ] **Step 3: Add CSS for nested lists**

In the `<style>` block, right after the existing bullet-list rule (currently around line 379):

```css
  /* ── Bullet list ── */
  ul.template-list { margin: 2mm 0 2mm 8mm; }
  ul.template-list li { margin-bottom: 1mm; }

  /* ── Rich-text fields (bold/italic/underline/bullets) ── */
  .rich-text ul { margin: 1mm 0; padding-left: 5mm; }
  .rich-text li { margin-bottom: 0.5mm; }
```

- [ ] **Step 4: Swap the two call sites**

Line 625 — replace:

```ts
      <li><span class="field-label">Function:</span> ${nl2br(p.mandateFunction)}</li>
```

with:

```ts
      <li><span class="field-label">Function:</span> ${richText(p.mandateFunction)}</li>
```

Line 629 — replace:

```ts
    <div class="subsection-block"><p class="field-value">${nl2br(p.visionStatement)}</p></div>
```

with:

```ts
    <div class="subsection-block"><p class="field-value">${richText(p.visionStatement)}</p></div>
```

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 6: PDF export smoke test — legacy document unaffected**

Per the `verify-feature` skill, the export route is stateless — POST the demo doc as-is first to confirm the untouched legacy path still renders identically:

```bash
curl -s -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  --data-binary @/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp \
  -o /tmp/test-legacy.pdf -w "%{http_code} %{size_download}\n"
pdftotext -f 4 -l 4 /tmp/test-legacy.pdf - | grep -A2 "Function:"
```

Expected: `200` and a plausible size (~350 KB); the `Function:` text from the demo doc's plain-text `mandateFunction` (starting "The NCWTR is mandated to establish...") prints as plain text with no stray tags.

- [ ] **Step 7: PDF export smoke test — new rich-text content**

```bash
node -e "
const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp', 'utf8'));
doc.part1.a.mandateFunction = 'Plain start. <strong>Bold middle.</strong> <em>Italic end.</em><br><ul><li>First bullet</li><li>Second bullet</li></ul>';
doc.part1.a.visionStatement = 'A <u>vision</u> with underline. Also test escaping: <script>alert(1)</script> & \"quotes\" < 5.';
fs.writeFileSync('/tmp/test-richtext-input.json', JSON.stringify(doc));
"
curl -s -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/test-richtext-input.json \
  -o /tmp/test-richtext.pdf -w "%{http_code} %{size_download}\n"
pdftotext -f 4 -l 4 /tmp/test-richtext.pdf - | grep -A6 "Function:"
pdftoppm -png -r 100 -f 4 -l 4 /tmp/test-richtext.pdf /tmp/verify-shots/pdf-richtext
```

Expected: `200`; text output shows "Plain start. Bold middle. Italic end." and "First bullet" / "Second bullet" as separate lines with no literal `<strong>`/`<ul>` tags leaking into the text, and no `alert(1)` executing (it's static PDF text — confirm it appears, if at all, as inert literal text, not inside a tag). Then **read the rasterized PNG with the Read tool** and visually confirm: bold, italic, underline all render correctly, and the bullet list shows two items with markers.

**Important field path check:** before running Step 7, confirm the exact JSON path for `mandateFunction`/`visionStatement` in the `.issp` file — inspect with:

```bash
node -e "const d=JSON.parse(require('fs').readFileSync('/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp','utf8')); console.log(Object.keys(d).filter(k=>k.toLowerCase().includes('part1')))"
```

and adjust the `doc.part1.a....` path in the Step 7 script to match whatever key structure that reveals (the file may nest it as `doc.part1.a`, `doc["part1/a"]`, or similar — match the real structure rather than assuming).

- [ ] **Step 8: Commit**

```bash
git add src/lib/pdf/render-issp-html.ts
git commit -m "feat: render sanitized rich-text HTML in PDF export for Mandate/Functions and Vision Statement"
```

---

### Task 5: Final verification pass and docs

**Files:**
- Modify: `docs/project-status.md` (append a status note — read the file first to match its existing format before editing)

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: nothing (terminal task).

- [ ] **Step 1: Full type check**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: zero output.

- [ ] **Step 2: Mobile viewport check**

Reuse the Puppeteer pattern from Task 3, Step 5, but set `page.setViewport({ width: 390, height: 844 })` and navigate to `${BASE}/editor?section=part1/a` on the already-loaded demo doc (load it the same way via the file input first). Screenshot as `part1a-mobile.png`. Read the screenshot and confirm the toolbar row and both fields remain usable (not clipped/overlapping) at mobile width.

- [ ] **Step 3: Neighboring field regression check**

In the same Puppeteer session, screenshot the untouched Legal Basis and Mission Statement fields (still plain `Textarea`) to confirm they still render as ordinary plain textareas with no visual regression from the `space-y-4` layout change in the surrounding `CardContent`.

- [ ] **Step 4: Read `docs/project-status.md`**

Open the file to see its existing structure/format (most recent entries are usually at the top or in a dated log section).

- [ ] **Step 5: Append a status note**

Add an entry (matching the file's existing style) noting: two-field rich-text prototype shipped (Mandate/Functions with toolbar, Vision Statement shortcuts-only), storage stays plain `string` with a whitelisted HTML subset, PDF export updated, no schema change, app-wide rollout is a pending decision.

- [ ] **Step 6: Commit**

```bash
git add docs/project-status.md
git commit -m "docs: note rich-text textarea prototype status"
```
