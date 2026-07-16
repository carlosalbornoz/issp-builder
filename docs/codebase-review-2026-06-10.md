# Codebase Review — 2026-06-10

**Reviewer:** Claude Code
**Scope:** Full `src/` review — store, hooks, PDF export pipeline, API routes, proxy, forms. Build & static checks.
**Baseline:** `tsc --noEmit` clean · `next build` passes · no `console.log` / TODO debris · prior security review (`docs/security-review.md`, 2026-05-21) still accurate for its scope.

Severity: 🔴 fix soon · 🟡 should fix · ⚪ hygiene / nice-to-have

> **Update 2026-06-10:** Findings 1, 2, and 5 fixed and verified (export round-trips the
> demo doc; injection payload renders as inert escaped text; `tsc` + `eslint` clean).
> Findings 3, 4, 6, 7 and the hygiene items remain open.

---

## 🔴 1. EgP checklist data is silently lost in the PDF export — ✅ FIXED

**Files:** `src/app/api/export/route.ts:111-125` (`mapEgpChecklist`), `src/lib/pdf/render-issp-html.ts:805-818` (`egpStatus`)

The Part II-D form collects `url`, `equivalentName`, `notes`, `channels` (a **string**), `adoptionPercentage`, and a four-state `status` (`utilizing | proposed | not_applicable | not_utilizing`). The export route maps almost none of it:

- `mapEgpChecklist` outputs only `{ utilizing, proposed, exists, adoptionPercentage }` — `url`, `equivalentName`, `notes`, `channels` are dropped entirely.
- The renderer expects `channels` as `Record<string, boolean>` (website/email/landline/…), but the store saves it as a free-text string and the route never maps it → Online Portal channels are always rendered unchecked.
- `egpStatus()` never reads `e.proposed` — a program marked **proposed** prints as "Utilizing: ☐ Yes ☑ No", indistinguishable from not utilizing.
- `not_applicable` status collapses to the same output as `not_utilizing`.
- PNPKI prints only the adoption %, dropping its status.

**Impact:** users fill in Part II-D, the PDF misrepresents or omits their answers.
**Fix:** align the three shapes (store `EgpProgram` → route mapping → renderer `EgpEntry`); consider the `/schema-change` skill since this touches types + form + PDF.

## 🔴 2. HTML/attribute injection in the PDF renderer (unescaped interpolations) — ✅ FIXED

**Files:** `src/lib/pdf/render-issp-html.ts:390, 853` · `src/lib/pdf/generate-pdf.ts:27-29, 45`

`esc()` is used diligently (81 call sites) but a few interpolations bypass it:

- `render-issp-html.ts:390` — `issp.agency.logoSrc` raw inside `src="…"`
- `render-issp-html.ts:853` — diagram `d.path` raw inside `src="…"`
- `generate-pdf.ts:27-29` — `header.logoSrc` and `header.agencyAcronym` raw in the Puppeteer `headerTemplate`; `startYear/endYear` in templates too

A crafted `.issp` posted to the **public** `/api/export` can break out of the attribute and inject arbitrary HTML/`<script>` into a page rendered by server-side Chromium with JavaScript enabled → SSRF / internal network probing from the server. The 2026-05-21 review accepted the endpoint being unauthenticated (#4); this finding is the missing complement — *what* it renders must be inert.

**Fix:** `esc()` every interpolation; validate `logoSrc` / diagram paths are `data:image/*` URIs; call `page.setJavaScriptEnabled(false)` before `setContent` and block non-`data:` requests via request interception.

## 🟡 3. `saveToFile` race with the debounced IDB write

**File:** `src/lib/store/index.tsx:324-344`

`saveToFile` writes `exported` to IDB directly but does **not** cancel `saveTimerRef`. If the user edits and clicks "Save to File" within the 1.5 s debounce window, the pending timer fires afterwards and overwrites IDB with the pre-export doc (no `exportedAt`). After a reload, `fileSavedAt` is wrong and the unsaved-changes pill can mislead. Also `idbSave(exported)` is fire-and-forget — a quota/error is swallowed while the UI claims "saved".

**Fix:** clear `saveTimerRef`/`flashTimerRef` in `saveToFile` (and `clearDoc`), await/handle the `idbSave`.

## 🟡 4. IDB load path: migration errors leave the user looking at "no document"

**File:** `src/lib/store/index.tsx:229-238`

`idbLoad().then(doc => doc ? migrateLegacyDoc(doc) : doc)` — if `migrateLegacyDoc` throws on a malformed stored doc (e.g. missing `part1.stakeholders`), the rejection is unhandled: `doc` stays `null`, `loading` flips false, and the editor renders the empty state while the data still sits in IDB. Same gap in `replace()` (used by `loadFromFile`): the doc is only persisted after the 1.5 s debounce, so closing the tab immediately after loading a file loses it from IDB.

**Fix:** add a `.catch` that surfaces a "couldn't read saved document" state instead of empty; flush the first save in `replace()` immediately.

## 🟡 5. ESLint: 5 errors, 4 warnings (live code) — ✅ FIXED

`npx eslint` currently fails:

- `part1/part1-c-form.tsx:90` — `react-hooks/set-state-in-effect` in `StakeholderDrawer` (live in `/editor/part1/c`). Standard fix: reset drawer state via a `key={stakeholder?.id ?? "new"}` prop instead of the sync-on-open effect.
- `store/index.tsx:130-132, 164` — 4× `no-explicit-any`. The `eslint-disable-next-line` comments at 126/142/160 only cover the *next* line, not the lines that actually contain `any` (and the one at 126 is now an unused directive).
- Warnings: unused `endYear` (`issp-properties-dialog.tsx:90`), unused `Button` (`part2-d-form.tsx:5`), unused `path` (`screenshot-part4.js:3`).

## 🟡 6. `unsavedToFile` hashes the entire doc on every provider render

**File:** `src/lib/store/index.tsx:373-377`, `docContentHash` at 199

Every `update()` (each keystroke) re-renders the provider, which runs `JSON.stringify` over the **full document twice** — including base64 diagram data URLs that can be multiple MB. With a few diagrams uploaded, typing in any form pays a multi-MB serialize per keystroke.

**Fix:** memoize the snapshot hash (it only changes on save/load) and compute the doc hash inside `useMemo([doc])`; or compare structurally and exclude the data-URL fields from the hash.

## 🟡 7. `/api/export` has no concurrency limit

**File:** `src/lib/pdf/generate-pdf.ts:13`

Each request launches a fresh Chromium (`--no-sandbox`). N parallel requests = N browsers; trivially exhausts memory on the VPS. Related to accepted finding #4, but the resource angle is unaddressed.

**Fix:** a simple in-process semaphore (queue of 1–2) and/or reuse a singleton browser with per-request pages.

---

## ⚪ Hygiene

| Item | Detail |
|---|---|
| Dead file | `src/components/issp-editor/issp-editor-layout.tsx` — zero importers |
| Dead hook | `src/hooks/use-auto-save.ts` — zero importers (superseded by `use-local-save`; dormant dashboard pages don't use it either) |
| Stray scripts | `screenshot-part4.js`, `screenshot-part4b.js` committed at repo root — policy elsewhere (f07042e) moved scripts out of the repo; move to gitignored `scripts/` |
| Dead branch | `src/proxy.ts:17,29` — `isUacsRoute` never runs; the matcher already excludes `uacs` |
| Dormant-route validation | `PATCH /api/issp/documents/[id]` passes raw body values to Prisma (`startYear: "abc"` → 500). Dormant tree, low priority; zod-validate when reactivating |
| Untracked refs | `references/ISSP Orientation DICT May 25.json`, `ISSP Template Handout May 25.pdf`, `ISSP_Orientation_Notes_May25.md` — decide: commit (AGENTS.md table) or gitignore |
| Uncommitted work | `home-page-client.tsx` What's-New pill refactor (gradient-border technique) — reviewed, looks correct; commit when verified |

## Non-findings (checked, fine)

- All dashboard/document API routes check session + agency scoping (no IDOR).
- `dangerouslySetInnerHTML` uses are repo-authored markdown only.
- Historical note: `.env.production` originally contained only deployment URLs, but environment files are now intentionally gitignored and maintained on the server.
- `nl2br`/`esc` correct; `docContentHash` timestamp-stripping logic sound.
- Migration chain v1→v2→v3 is idempotent and fills missing IDs correctly.
