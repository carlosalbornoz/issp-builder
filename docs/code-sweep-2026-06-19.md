# Code Sweep - 2026-06-19

This sweep was read-only. It followed the local-first cutover and the merge of `remove-prisma-draft` into `main`.

## Verification Run

| Check | Result | Notes |
|---|---|---|
| `npm run lint` | Pass | ESLint completed with no reported issues. |
| `npm run build` | Pass | Next.js 16.2.6 build completed. Build emitted two `z-index is currently not supported` warnings during static page generation. |
| `npm audit --audit-level=high` | Pass for high/critical | Four moderate advisories remain: `gray-matter` via `js-yaml`, and `next` via bundled `postcss`. `npm audit fix --force` suggests breaking downgrades and should not be run blindly. |
| Git status | Tracked files clean before documentation edits | Untracked local reference/Tailwind files remained untouched. |

## Executive Summary

The local-first removal is clean in the active source tree: Prisma, NextAuth, `/dashboard`, `/login`, `/api/issp`, `/api/auth`, and `src/proxy.ts` are gone from the app. The remaining work is now mostly hardening, correctness, and documentation cleanup.

Highest priority items from the sweep:

1. Fix public stale links/copy that still reference login or pre-local-first status. Resolved during the 2026-06-19 documentation cleanup.
2. Harden `.issp` import, IndexedDB persistence, and PDF export boundaries.
3. Fix export/template correctness gaps: Part III.D enhancement details, EGP defaults, E.2 empty state, Part IV B.4 consistency.
4. Decide the product scope for Annex 1 and Annex 2.
5. Keep `docs/project-status.md` as the single active tracker; treat older planning/session docs as historical unless explicitly refreshed.

## Findings

### P0 - Broken Public Login Links - Resolved 2026-06-19

Files:

- `src/app/about/page.tsx:83`
- `src/app/about/page.tsx:141`
- `src/app/privacy/page.tsx:81`

Issue: `/login` no longer exists after the auth removal. These public links can send users to a dead route and contradict the no-login architecture.

Resolution:

- Public article CTAs now point to `/editor`.
- `Sign In` copy was replaced with `Open Editor`.

### P0 - Public Privacy Copy Is Stale - Resolved 2026-06-19

Files:

- `content/privacy.md:56`
- `content/privacy.md:70`

Issue: the article still says the local-first version has not launched and the current version uses accounts/server storage.

Resolution:

- The article now describes local-first as live.
- It states that drafts live in IndexedDB and `.issp` files.
- It states that PDF export temporarily sends the document to the server for rendering and does not persist it.

### P1 - PDF Export Resource and Boundary Risk

Files:

- `src/app/api/export/route.ts:304`
- `src/app/api/export/route.ts:307`
- `src/app/api/export/route.ts:320`
- `src/lib/pdf/generate-pdf.ts:67`

Issue: `POST /api/export` accepts a full `IsspDocument` JSON payload, type-casts it, then starts a multi-pass Puppeteer/pdf-lib pipeline. There is no request size guard, schema validation, decoded image cap, timeout wrapper, rate limit, concurrency guard, or structured error response.

Next steps:

- Reject oversized requests using `Content-Length` before `req.json()`.
- Validate the request with a runtime schema.
- Validate embedded data URLs server-side: MIME type, decoded bytes, total count, and total payload size.
- Add timeout and concurrency controls around PDF generation.
- Catch PDF generation errors and return structured JSON errors.
- Add user-visible export failure messages in the editor.

### P1 - IndexedDB Autosave Can Race or Fail Silently

Files:

- `src/lib/store/index.tsx:378`
- `src/lib/store/index.tsx:455`
- `src/lib/store/index.tsx:462`
- `src/lib/store/idb.ts:37`

Issue: pending autosaves are not cancelled before `clearDoc()` or `saveToFile()`. A delayed save can restore cleared data or overwrite a just-exported document. IndexedDB quota/storage errors are not surfaced to the user.

Next steps:

- Cancel pending save timers before clear and immediate saves.
- Add a save generation/token so stale saves cannot commit after clear/replace/save-to-file.
- Catch save errors and expose a visible save-error state.
- Resolve IndexedDB writes on transaction completion, not only request success.
- Distinguish `no saved document` from `load failed` in `idbLoad()`.

### P1 - `.issp` Import Is Unbounded and Type-Cast Only

Files:

- `src/lib/store/index.tsx:487`
- `src/lib/store/index.tsx:488`

Issue: import does `file.text()`, `JSON.parse`, and `as IsspDocument`. There is no file-size cap, schema validation, future-version policy, or embedded data URL validation.

Next steps:

- Reject files over a defined limit before reading.
- Add Zod or equivalent runtime validation.
- Normalize missing arrays/objects before migration.
- Reject unknown future schema versions unless explicitly supported.
- Validate embedded logos/diagrams on import.

### P1 - Base64 Image Payloads Can Exceed Safe Memory/Storage Limits

Files:

- `src/lib/diagram-upload.ts:1`
- `src/lib/diagram-upload.ts:9`
- `src/components/editor/editor-sidebar.tsx:355`

Issue: diagrams can be 10 MB each and are stored as base64 inside React state, IndexedDB, snapshots, `.issp` JSON, fetch payloads, generated HTML, and PDFs. SVG is accepted without sanitization.

Next steps:

- Add total document/image limits and maximum diagram count.
- Consider dropping SVG support or sanitizing SVGs.
- Downscale/rasterize large images client-side before storage.
- Warn or block PDF export when embedded images exceed safe thresholds.

### P1 - Annex 1 and Annex 2 Are Not Implemented in Main Export

Files:

- `src/lib/store/types.ts`
- `src/lib/store/defaults.ts:145`
- `src/lib/sections.ts:19`
- `src/lib/pdf/render-issp-html.ts:500`

Issue: the authoritative reference includes Annex 1 ICT Asset Inventory and Annex 2 DRBCP, but the product currently supports/export Parts I-IV only.

Next steps:

- Decide product scope: implement annexes or explicitly treat them as separate/manual attachments.
- If deferred, add a pre-export warning/checklist that Annex 1 and Annex 2 are not included.
- If implemented, use a local-first design only; do not reintroduce Prisma, auth, `/dashboard`, `/api/issp`, or `src/proxy.ts`.

### P1 - Part III.D Enhancement Details Can Be Dropped from PDF

Files:

- `src/app/api/export/route.ts:263`
- `src/lib/pdf/render-issp-html.ts:736`
- `src/lib/pdf/render-issp-html.ts:737`

Issue: proposed systems capture `enhancementDetails`, but export maps `description: sys.description || sys.enhancementDetails`. If both fields are present, enhancement details are omitted.

Next steps:

- Add `enhancementDetails` to render data.
- Render a conditional `ENHANCEMENT DETAILS` row when status is `For Enhancement`.

### P1 - EGP Checklist Defaults Are Incomplete

Files:

- `src/lib/store/defaults.ts:35`
- `src/lib/store/defaults.ts:42`
- `src/lib/pdf/render-issp-html.ts:777`
- `src/lib/pdf/render-issp-html.ts:802`

Issue: defaults omit `elgu`, PNPKI `adoptionPercentage`, and Online Public Service Portal nested mechanism/connection fields. Untouched export state can render `N/A` or omit checklist detail rows.

Next steps:

- Add missing defaults in `makeEgpChecklist()`.
- Add migration/normalization for existing `.issp` documents.
- Render Online Portal mechanisms consistently even when all values are false.

### P1 - Part III.E.2 Disappears When Empty

Files:

- `src/lib/sections.ts:45`
- `src/lib/pdf/render-issp-html.ts:473`
- `src/lib/pdf/render-issp-html.ts:498`
- `src/lib/pdf/render-issp-html.ts:1026`

Issue: the editor includes Part III.E.2, but the PDF TOC and body omit it entirely when no cross-agency projects exist.

Next steps:

- Always render E.2 in the TOC and PDF body.
- Use an explicit empty state such as `No cross-agency ICT projects specified` or `Not Applicable`.

### P1 - Part IV B.4 Consistency Differs Between UI and PDF

Files:

- `src/components/issp-editor/part4/part4-aggregations.ts:195`
- `src/components/issp-editor/part4/part4-aggregations.ts:199`
- `src/components/issp-editor/part4/part4-summary.tsx:152`
- `src/components/issp-editor/part4/part4-summary.tsx:185`

Issue: UI B.4 skips line items without UACS codes, while the PDF groups uncoded lines under a placeholder. The UI consistency banner compares only B.1, B.2, and B.3.

Next steps:

- Include uncoded lines as `Unspecified UACS` in UI B.4, or warn/block until all line items are coded.
- Include B.4 totals in the consistency banner.
- Surface a count/list of uncoded line items.

### P2 - Read-Only Part IV Summary Affects Completion Counts

Files:

- `src/lib/sections.ts:55`
- `src/lib/sections.ts:70`
- `src/app/editor/page.tsx:123`
- `src/app/editor/page.tsx:130`

Issue: `part4/summary` is read-only and cannot be marked done, but overall completion counts still use `ALL_SECTIONS`.

Next steps:

- Add a shared `TRACKED_SECTIONS = ALL_SECTIONS.filter((s) => !s.readOnly)`.
- Use tracked sections for all completion denominators and done counts.
- Stop deriving editable metadata for read-only sections.

### P2 - Server Route Imports Logic from Component Tree

File:

- `src/app/api/export/route.ts:3`

Issue: the API route imports `computeProjectCosts` from `src/components/issp-editor/part4/part4-aggregations.ts`. It is pure today, but this is a server/client boundary risk.

Next steps:

- Move aggregation helpers to `src/lib/part4-aggregations.ts` or another server-safe `lib` module.

### P2 - Editor Redirects Happen During Render

Files:

- `src/app/editor/part1/a/page.tsx:12`
- Similar pattern across editor subpages.
- `src/components/editor/editor-shell.tsx:17`

Issue: subpages call `router.replace()` during render; `EditorShell` already redirects in an effect.

Next steps:

- Remove redundant page-level redirects if `EditorShell` covers the route.
- Otherwise move redirects into `useEffect`.

### P2 - Stale Documentation Can Reintroduce Removed Architecture

Files:

- `README.md`
- `docs/project-status.md`
- `docs/session-handoff.md`
- `docs/privacy-architecture.md`
- `docs/implementation-plan.md`
- `docs/annex1-implementation-plan.md`
- `docs/security-review.md`

Issue: several docs still mention Prisma, NextAuth, `/dashboard`, `/api/issp`, `src/proxy.ts`, or `idb-keyval` as active/current.

Next steps:

- Keep `docs/project-status.md` as the only active tracker.
- Mark older planning/session docs as historical unless refreshed.
- Remove current-state references to dormant server-side routes and `idb-keyval`.

### P2 - Committed Dev Origin

File:

- `next.config.ts:9`

Issue: `allowedDevOrigins` contains an internal/private IP in shared config.

Next steps:

- Guard it to development or move it to local-only config.

## Recommended Hypersession Order

1. Data safety hardening: IndexedDB race/errors, `.issp` import validation.
2. Export hardening: PDF route limits, timeout, structured errors, user-facing failure state.
3. Template correctness: Part III.D enhancement details, EGP defaults, E.2 empty state, Part IV B.4 consistency.
4. Product scope: Annex 1/2 decision and export warning or implementation plan refresh.
5. Polish/cleanup: redirects, lib/component boundary, dev origin, moderate dependency advisories.
