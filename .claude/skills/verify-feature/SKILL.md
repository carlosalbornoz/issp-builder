---
name: verify-feature
description: End-to-end verification routine for any ISSP Builder feature — type check, browser smoke tests, PDF export smoke tests, edge cases, build, deploy, and prod verification. Use after implementing any feature or fix, before reporting it done. Companion skills - verifier-web (Puppeteer mechanics), schema-change (data-model changes).
---

# ISSP Builder — Feature Verification Routine

There is **no unit-test framework** in this project. Verification is: TypeScript at the type level, smoke tests in a real browser, and PDF output inspection. Never report a feature as done on a clean `tsc` alone — type checking verifies code, not behavior.

## Environment map

| | Dev | Production |
|---|---|---|
| Port | 3000 (`next dev`, hot reload) | 3100 (pm2 app `issp`) |
| basePath | none — `/editor`, `/api/export` | `/issp` — `/issp/editor`, `/issp/api/export` |
| Public URL | — | `apps.carlosanton.io/issp` |
| Serves | working tree | `.next` build on disk |

**⚠️ `npm run build` overwrites the `.next` directory that the running prod server reads from disk.** Never build casually (e.g. just for screenshots). Once you have built, you are committed to `pm2 restart issp` — a half-old, half-new `.next` can serve mismatched chunk hashes. For screenshots and smoke tests, always use the dev server on port 3000.

---

## The ladder — run in order, skip only what doesn't apply

### 0. Scope the change

| Change touches… | You must run… |
|---|---|
| Any `.ts`/`.tsx` | Step 1 (type check) |
| Editor UI / forms / sidebar | Step 2 (browser smoke) |
| Home / splash page | Step 2 against `/` instead of `/editor` |
| `IsspDocument` schema or sub-types | Follow the **schema-change** skill first, then this ladder |
| PDF renderer / export routes | Step 3 (PDF smoke) |
| Anything shipping | Steps 4–6 |

### 1. Type check

```bash
npx tsc --noEmit --skipLibCheck
```

Zero output = pass. Fix everything before continuing.

### 2. Browser smoke test (dev server, port 3000)

Use the Puppeteer setup from the **verifier-web** skill (Chrome path, viewport, and — critically — the *correct* way to load a document so `savedSnapshot` is set). Quick reference:

- Script must live inside the project dir so `require('puppeteer')` resolves: write `screenshot-x.js`, run `node screenshot-x.js`, delete it after.
- First page load after an edit can take 30s+ (dev compile). Use `page.setDefaultNavigationTimeout(90000)` and `waitUntil: 'domcontentloaded'` + a settle sleep, not `networkidle2` with default timeout.
- Edits debounce **1500 ms** — wait ≥2000 ms after typing before checking sidebar/store state.
- Radix dialogs/sheets render **nothing** until opened — to verify modal content you must click it open first. (Same reason `curl | grep` on SSR HTML won't find modal text.)
- For pixel-perfect IDB-state screenshots that don't need `savedSnapshot`, direct IDB injection (db `issp-builder`, store `documents`, key `current`) is acceptable; for anything touching the unsaved-changes system, use the file-input method from verifier-web.

What to capture:

1. **Golden path** — the feature doing its job with the demo doc (`public/demo/ncwtr-issp-2026-2028.issp`).
2. **Interaction** — actually type/click through it (add a row, toggle a state), not just render it.
3. **Mobile viewport** — `390 × 844` for anything user-facing; the editor sidebar, dialogs, and home page all have mobile-specific layouts that regress silently.
4. **A neighboring feature** — one screenshot of an adjacent screen to catch layout regressions.

Then **actually open and look at every PNG with the Read tool**. A screenshot you didn't view is a test you didn't run. Save shots to `/tmp/verify-shots/` or the session jobs dir — never into the repo (`public/screenshots/` is gitignored for a reason).

### 3. PDF export smoke test (when PDF output is affected)

The export is stateless: POST the full document JSON to the export route.

```bash
# Baseline: demo doc straight through (dev server, no basePath)
curl -s -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  --data-binary @public/demo/ncwtr-issp-2026-2028.issp \
  -o /tmp/test.pdf -w "%{http_code} %{size_download}\n"
```

Expect `200` and a plausible size (the demo doc is ~350 KB of PDF). Then verify content two ways:

```bash
# Text assertions — fast, good for "is X present / absent / on which page"
pdftotext -f 1 -l 4 /tmp/test.pdf - | grep -c "DEFINITION OF TERMS"

# Visual inspection — rasterize specific pages, then Read the PNGs
pdftoppm -png -r 60 -f 4 -l 4 /tmp/test.pdf /tmp/verify-shots/pdf
```

To test feature-specific data, mutate the demo doc with a one-off node script:

```bash
node -e "
const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('public/demo/ncwtr-issp-2026-2028.issp', 'utf8'));
doc.someField = /* test payload */;
fs.writeFileSync('/tmp/test-input.json', JSON.stringify(doc));
"
curl -s -X POST http://localhost:3000/api/export -H "Content-Type: application/json" \
  --data-binary @/tmp/test-input.json -o /tmp/test2.pdf -w "%{http_code}\n"
```

PDF-specific checks that have caught real bugs:
- **TOC page numbers match footers** — compare a TOC row against the page where `pdftotext` finds the heading.
- **No marker leakage** — `pdftotext /tmp/test.pdf - | grep '@@toc'` must return nothing.
- **Conditional sections** — if a section can be empty, export with it empty and confirm both the page *and its TOC row* disappear.
- **Escaping** — if the feature renders user text into PDF HTML, test a value containing `<b>&"` and confirm it prints literally.

### 4. Edge cases

Minimum set for any feature:
- **Empty state** — zero rows / missing optional field / fresh blank document.
- **Legacy doc** — a document *without* the new field (the demo file predates most features; it doubles as this test unless you've updated it). Old `.issp` files must load and export without errors.
- **Absurd input** — very long strings (do columns wrap?), special characters, 0/negative numbers where applicable.

### 5. Build + deploy

```bash
npm run build          # must be clean — then you are committed to restarting
ps aux | grep next-server | grep -v grep   # check for stale processes (dev server's child is expected)
pm2 restart issp
```

Only deploy uncommitted work when the user has asked for the change to go live; the deploy flow is build → restart, nothing else.

### 6. Verify prod

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/issp            # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/issp/editor/…  # new routes 200
curl -s http://localhost:3100/issp | grep -c "some new SSR-visible string"    # sanity
```

Remember: modal/dialog content is client-rendered on open — `grep` against SSR HTML only works for always-visible text (e.g. the What's New pill label, not the modal body). For modal content, take one Puppeteer screenshot against `http://localhost:3100/issp` (note the basePath) and Read it.

Finally: send the key screenshots to the user with `SendUserFile` so they can eyeball the result, and update `docs/project-status.md` (and the session log if one is active) — documentation after work is a standing rule in this project.

---

## Pitfalls index

| Symptom | Cause / fix |
|---|---|
| Puppeteer `TimeoutError` on `goto` | Dev-server cold compile — raise nav timeout to 90s, use `domcontentloaded` |
| Screenshot shows stale UI | Forgot the settle sleep after navigation, or dev server hot-reload still compiling |
| `grep` can't find new text on prod | Text lives inside a closed dialog — open it via Puppeteer instead |
| Prod serves broken chunks | `npm run build` ran without a follow-up `pm2 restart issp` |
| Unsaved-changes badge wrong in test | Doc loaded via IDB injection — `savedSnapshot` is null; use file-input load (see verifier-web) |
| Number input test flaky | Use Ctrl+A select-all, not triple-click (see verifier-web) |
| Old `.issp` file crashes | Missing `?? default` fallback — see schema-change skill |
