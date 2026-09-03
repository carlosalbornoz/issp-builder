# Production & deploy safety

This repo is a **shared dev + prod tree** — the same working copy serves both
the dev server and live production. Read this before any build or deploy.

## The setup

- **Production:** pm2 process `issp` on port **:3100**, served by `next start`,
  behind nginx at `apps.carlosanton.io/issp` (basePath `/issp`). It reads route
  manifests from the `.next/` directory *in this tree* **at request time**.
- **Dev:** standalone `next dev` on port **:3000** (no basePath), uses
  `.next/dev/`.

## The rule that took prod down (2026-08-03)

**Never run `npm run build` during feature work.**

`next start` reads `.next/` at request time, so rebuilding `.next` under the
running pm2 process **desyncs prod**: the running server's in-memory manifest
references chunk files the new build just deleted →

```
InvariantError: The client reference manifest for route "…" does not exist.
```

→ 500s on SSR routes (e.g. `/issp/editor`). This happened when feature-task
subagents each ran `npm run build` as their type-check gate.

The dev server (`next dev`, `.next/dev/`) does **not** conflict. Only
`npm run build` (the production build → `.next/server/`) is the danger.

## During development

- **Type-check with `npx tsc --noEmit`**, not `npm run build`.
- **Lint with `npm run lint`.**
- Verify UI with Puppeteer smokes against the dev server (:3000).
- These are the only build-step commands allowed during feature work.
- Do **not** wipe/rebuild `node_modules` while prod is live (a targeted
  `npm install -D <pkg>` is fine).
- Never run `pm2 restart issp` / `npm start` as part of dev.

## Deploy (the only time `npm run build` runs)

```bash
git checkout main
npm run build          # builds .next from main
pm2 restart issp       # server + disk re-agree
# verify
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3100/issp/editor   # expect 200
git checkout <feature-branch>   # return to work
```

Only build from `main` (or from a branch you explicitly intend to deploy).
**After any build you MUST restart pm2** — a build without a restart leaves
prod desynced.

## If prod is desynced (recovery)

Same as a deploy: rebuild from `main` + `pm2 restart issp`. Symptom:
`client reference manifest … does not exist` / 500s on routes, while `/issp/`
may 308 → error.

## Other dev-works-prod-breaks traps

**basePath `/issp` and raw anchors (2026-08-28 incident).** Prod is built with
`NEXT_PUBLIC_BASE_PATH=/issp`; dev is not. `next/link` applies basePath
automatically — a plain `<a href="/x">` does **not**. Such a link works on
dev and 404s on prod (this shipped in the Annex 1 "Open form" link and was
found by a user). Same rule for any hardcoded asset path. Always use
`next/link` for internal links.

**nginx `client_max_body_size 50m`.** The `/issp` nginx block sets this to
match the app's 50 MB upload cap (`MAX_ISSP_FILE_SIZE_BYTES`). Default nginx
is 1 MB — any nginx rebuild/new vhost that drops this line silently breaks
PDF export of any doc with embedded diagrams (HTTP 413; the UI surfaces a
readable error). Config: `/etc/nginx/sites-available/apps.carlosanton.io`.

**CSP `connect-src 'self'`.** Prod sends a Content-Security-Policy that
blocks `fetch()` against `data:` URIs (dev sends none). The PDF-export client
therefore decodes the returned base64 with `atob()` — do not "simplify" it
back to `fetch("data:…")`. Any new client-side fetch/network path must be
smoke-tested on **prod**, not just dev.

**SSE + `X-Accel-Buffering: no`.** PDF-export progress streams rely on nginx
*not* buffering the proxied response. If `proxy_buffering` is ever enabled
globally, progress silently degrades to everything-at-the-end.

