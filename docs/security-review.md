# Security Review — ISSP Builder

> **Historical review with partial current notes.** The original auth/DB findings are superseded by the local-first cutover. Use `docs/project-status.md` for the active risk backlog and `docs/code-sweep-2026-06-19.md` for the latest sweep findings.

**Date:** 2026-05-21
**Reviewer:** Claude Code (automated + manual analysis)
**Scope:** Next.js application (`src/`), Nginx vhosts, `.env`, auth configuration

> **Update 2026-06-14:** The entire dormant server-side auth/DB layer
> (NextAuth, Prisma, `/dashboard/*`, `/api/issp/*`, `/api/auth/*`,
> `proxy.ts`) was removed in commit `0485a8c`. Findings F1, F6, F8, F9,
> F10 below are resolved by removal — there is no longer any login to
> rate-limit, no proxy to gap-check, no SVG/diagram upload routes.
> F2/F3 fixes are moot (routes deleted) but the underlying lesson
> (mass-assignment) is preserved as a historical note. The remaining
> open items are F11 (allowedDevOrigins leaks internal IP) and the
> unresolved advisories from `npm audit` (postcss via next, js-yaml via
> gray-matter). F4 (unauthenticated PDF export) is still accepted by
> design.

---

## Executive Summary

> **Superseded 2026-06-14** — the auth surface described below no longer
> exists. The app is now local-first: no login, no server-side sessions,
> no DB-backed user data. The only server endpoint that accepts
> user-influenced input is `POST /api/export` (PDF generation), which is
> hardened via Puppeteer JS-disabled + request-interception + the
> Content-Disposition fix from F7. See the banner at the top of this
> doc.

The app has a solid baseline: all API routes check session auth, agency-scoped queries prevent cross-tenant access, and passwords are bcrypt-hashed.

**Session 2026-05-21:** Mass assignment vulnerabilities (F2, F3), missing nginx security headers (F5, F12), and Content-Disposition injection (F7) have all been fixed and deployed. One actionable issue remains:

1. No login rate limiting on the auth endpoint — **brute-force attacks are unconstrained** (MEDIUM).

The `AUTH_SECRET` placeholder (F1) is deferred — server-side auth is dormant in the current local-first architecture. Rotate it before reactivating server-side login.

---

## Finding Index

| # | Severity | Title | Status |
|---|----------|-------|--------|
| 1 | CRITICAL | Weak default AUTH_SECRET | ✅ Resolved 2026-06-14 — auth system removed (`0485a8c`) |
| 2 | HIGH | Mass assignment in PATCH document route | ✅ Resolved 2026-06-14 — route deleted (`0485a8c`); original fix in `cb7d0cd` |
| 3 | HIGH | Mass assignment in PUT part1/2/3/4 routes | ✅ Resolved 2026-06-14 — routes deleted (`0485a8c`); original fix in `cb7d0cd` |
| 4 | HIGH | Unauthenticated PDF export endpoint | ✅ Accepted (by design — local-first architecture; still applies post-removal) |
| 5 | MEDIUM | Missing security headers on apps.carlosanton.io | ✅ Fixed — nginx, live |
| 6 | MEDIUM | No login rate limiting | ✅ Resolved 2026-06-14 — no login (`0485a8c`) |
| 7 | MEDIUM | Content-Disposition header injection risk | ✅ Fixed — commit `cb7d0cd` (still applies to `/api/export`) |
| 8 | MEDIUM | proxy.ts doesn't cover API routes (defence-in-depth gap) | ✅ Resolved 2026-06-14 — `proxy.ts` deleted (`0485a8c`) |
| 9 | LOW | SVG uploads allowed without sanitization | ✅ Resolved 2026-06-14 — upload routes deleted (`0485a8c`) |
| 10 | LOW | Uploaded diagrams accessible without auth | ✅ Resolved 2026-06-14 — upload routes deleted (`0485a8c`) |
| 11 | LOW | allowedDevOrigins leaks internal IP in prod config | **Open** |
| 12 | INFO | No Permissions-Policy header anywhere | ✅ Fixed — apps.carlosanton.io nginx, live |

---

## Detailed Findings

---

### FINDING 1 — CRITICAL: Weak default AUTH_SECRET

**File:** `.env:11`

```
AUTH_SECRET="issp-builder-secret-change-in-production"
```

**Risk:** NextAuth signs JWT session tokens with this secret. Anyone who knows the secret can forge valid session tokens, impersonate any user, and access any agency's data. This string is effectively public (it's a common placeholder pattern).

**Current exposure:** Low — the server-side auth system (NextAuth, dashboard routes, Prisma DB) is dormant. The active local-first editor requires no login and issues no JWT sessions. There are no real sessions to forge against.

**Action required before reactivating server-side mode:** Rotate the secret and replace it in the production environment before any users log in through the server-side flow.

```bash
openssl rand -base64 32
```

Set in the PM2 ecosystem file or server environment — never committed to git. Rotate all existing sessions after changing it.

---

### FINDING 2 — HIGH: Mass assignment in PATCH /api/issp/documents/[id]

**File:** `src/app/api/issp/documents/[id]/route.ts:46–55`

```ts
const body = await request.json();
// ...
const doc = await db.isspDocument.update({
  where: { id },
  data: body,         // ← raw body passed directly to Prisma
});
```

**Risk:** An authenticated user can inject protected fields like `agencyId`, `status`, `createdBy`, `createdAt`. For example:

```json
PATCH /api/issp/documents/abc123
{ "agencyId": "other-agency-id", "status": "APPROVED" }
```

This would move the document to another agency and auto-approve it.

**Fix:** Whitelist only the fields that users are allowed to update via PATCH:

```ts
const { title, startYear, endYear, scope, amendmentNumber } = await request.json();
const doc = await db.isspDocument.update({
  where: { id },
  data: { title, startYear, endYear, scope, amendmentNumber },
});
```

---

### FINDING 3 — HIGH: Mass assignment in PUT part1/2/3/4 routes

**Files:**
- `src/app/api/issp/documents/[id]/part1/route.ts:44`
- `src/app/api/issp/documents/[id]/part2/route.ts` (same pattern)
- `src/app/api/issp/documents/[id]/part3/route.ts`
- `src/app/api/issp/documents/[id]/part4/route.ts`

```ts
const data: Record<string, unknown> = { ...body };
// ...
part1 = await db.part1Profile.update({ where: { isspDocId: id }, data });
```

**Risk:** An attacker could inject `isspDocId` or other relational fields to re-associate part records across documents.

**Fix:** Add an explicit whitelist of allowed keys for each part. At minimum, delete protected fields before the update:

```ts
const data: Record<string, unknown> = { ...body };
delete data.isspDocId;   // never allow changing the parent reference
delete data.id;
```

Better: define and apply a `PART1_ALLOWED_FIELDS` constant and filter `data` through it.

---

### FINDING 4 — HIGH: Unauthenticated PDF export endpoint

**File:** `src/app/api/export/route.ts`

```ts
export async function POST(req: Request) {
  // No auth check
  let doc: IsspDocument;
  doc = (await req.json()) as IsspDocument;
  // ... renders full HTML, launches Puppeteer, generates PDF
```

**Risk:** This endpoint accepts an arbitrary `IsspDocument` JSON body and runs Puppeteer (headless Chrome) to generate a PDF with no authentication. An unauthenticated attacker can:
- Consume CPU/memory by sending large or malformed documents in a loop.
- Potentially abuse Puppeteer if the HTML renderer can be manipulated to load external resources (SSRF via `<img src>`).

This endpoint exists for the local/offline editor use case. The risk depends on whether it's reachable from the internet.

**Architecture decision (accepted risk):** This endpoint is intentionally unauthenticated — it is the core of the local-first design. The server acts purely as a stateless PDF renderer; it receives ISSP JSON, generates a PDF, and discards the data. No persistence occurs. Adding auth would break the no-login design.

**Mitigations instead:**
- Add payload size limiting to prevent DoS:
```ts
const body = await req.text();
if (body.length > 500_000) return Response.json({ error: "Payload too large" }, { status: 413 });
```
- Add nginx rate limiting on `/issp/api/export` (see Finding 6)
- Disable Puppeteer network access during rendering to prevent SSRF

---

### FINDING 5 — MEDIUM: Missing security headers on apps.carlosanton.io

**File:** `/etc/nginx/sites-enabled/apps.carlosanton.io`

The `apps.carlosanton.io` vhost (the main app) sets:
- ✅ `Strict-Transport-Security`
- ✅ `X-Frame-Options`
- ✅ `X-Content-Type-Options`

Missing (present on other vhosts like `vps.carlosanton.io`):
- ❌ `X-XSS-Protection`
- ❌ `Referrer-Policy`
- ❌ `Content-Security-Policy`
- ❌ `Permissions-Policy`

**Fix:** Add to the `apps.carlosanton.io` server block:

```nginx
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';" always;
```

**Note on CSP:** Next.js with React requires `'unsafe-inline'` and `'unsafe-eval'` in script-src unless you implement nonce-based CSP (which requires Next.js middleware). Start with this permissive policy and tighten it after measuring violations with a `report-uri`.

Also add `add_header X-Robots-Tag "noindex, nofollow" always;` if you want to prevent search engine indexing of user data.

---

### FINDING 6 — MEDIUM: No login rate limiting

**File:** `src/app/api/auth/[...nextauth]/route.ts` (NextAuth handler)

The credentials login endpoint has no rate limiting. An attacker can make unlimited password-guess attempts.

**Fix (Nginx layer — easiest):** Add rate limiting to the auth endpoint in nginx:

```nginx
# Add to http block in nginx.conf
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

# In the apps.carlosanton.io server block
location /issp/api/auth {
    limit_req zone=auth burst=10 nodelay;
    limit_req_status 429;
    proxy_pass http://localhost:3100;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

This allows 5 auth requests/minute per IP with a burst of 10.

---

### FINDING 7 — MEDIUM: Content-Disposition header injection via unescaped filename

**Files:**
- `src/app/api/issp/documents/[id]/export/route.ts:141`
- `src/app/api/export/route.ts` (same pattern)

```ts
const filename = `${doc.agency.acronym}-ISSP-${doc.startYear}-${doc.endYear}.pdf`;
// ...
"Content-Disposition": `attachment; filename="${filename}"`,
```

**Risk:** If `doc.agency.acronym` contains a double-quote (`"`) or other special characters, the header value breaks. While agency acronyms are admin-set (low direct user control), defence-in-depth requires sanitizing.

**Fix:** Strip or encode characters that are invalid in quoted-string tokens:

```ts
const safeAcronym = (doc.agency.acronym ?? "AGENCY").replace(/[^\w\-]/g, "_");
const filename = `${safeAcronym}-ISSP-${doc.startYear}-${doc.endYear}.pdf`;
```

Or use RFC 5987 encoding: `filename*=UTF-8''${encodeURIComponent(filename)}`.

---

### FINDING 8 — MEDIUM: proxy.ts doesn't cover API routes (defence-in-depth gap)

**File:** `src/proxy.ts`

**Note:** In Next.js 16, the middleware file was renamed from `middleware.ts` to `proxy.ts`. This project correctly uses `src/proxy.ts` as its proxy/middleware.

**Current state:** `proxy.ts` protects page routes (redirects unauthenticated users to `/login` for dashboard routes) but explicitly passes all `/api` routes through without an auth check:

```ts
// Allow API routes through
if (isApiRoute) return NextResponse.next();
```

**Risk:** The dormant server-side API routes (`/api/issp/documents/**`) each perform their own `auth()` check — so they are individually protected. However, any new API route added without an explicit auth check would be publicly accessible with no safety net. Defence-in-depth is missing at the proxy layer for the API.

**Fix:** Remove the blanket API passthrough and let the proxy enforce auth on `/api/issp/**` routes, while keeping `/api/auth/**` and `/api/export` public:

```ts
// In proxy.ts — replace the blanket API passthrough with:
const isAuthApi = pathname.startsWith("/api/auth");
const isExportApi = pathname === "/api/export";   // intentionally public
if (isAuthApi || isExportApi) return NextResponse.next();
if (pathname.startsWith("/api/issp") && !isLoggedIn) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

### FINDING 9 — LOW: SVG uploads allowed without sanitization

**File:** `src/app/api/issp/documents/[id]/upload-diagram/route.ts:11`

> **Note:** This route is part of the dormant server-side architecture and is not reachable from the active local-first editor. Address if/when the server-side mode is reactivated.

```ts
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
```

**Risk:** SVG files are XML and can contain `<script>` tags. When rendered in an `<img>` tag most browsers neutralize script execution, but if a browser renders the SVG inline or the file is opened directly via URL, XSS is possible. Uploaded files are stored at `/public/uploads/{docId}/` and served as static assets without authentication.

**Fix (minimal):** Either:
a. Remove SVG from `ALLOWED_TYPES`, or
b. Sanitize uploaded SVGs with a library like `dompurify` (server-side) before saving.

---

### FINDING 10 — LOW: Uploaded diagrams accessible without authentication

**File:** `public/uploads/` — served as Next.js static assets

> **Note:** This only applies to the dormant server-side architecture. In the active local-first editor, network diagrams are stored as base64 data URLs inside the `.issp` file on the user's device — no server-side uploads occur. Address if/when the server-side mode is reactivated.

Any file uploaded to `public/uploads/{docId}/{filename}` is publicly accessible at `https://apps.carlosanton.io/issp/uploads/{docId}/{filename}` without authentication.

**Risk:** ISSP network diagrams may contain sensitive infrastructure information. An unauthenticated party who discovers or guesses a URL can download them.

**Fix:** Move uploads outside the `public/` directory (e.g., `data/uploads/`) and serve them through an authenticated API route that verifies `docId` belongs to the session user's agency.

---

### FINDING 11 — LOW: Internal IP in next.config.ts

**File:** `next.config.ts:8`

```ts
allowedDevOrigins: ["100.111.159.52"],
```

**Risk:** This leaks an internal Tailscale/VPN IP address in the committed codebase. It's low-risk but unnecessary.

**Fix:** Move to a `.env.local` or `env.development` file, or guard it:

```ts
allowedDevOrigins: process.env.NODE_ENV === "development" ? ["100.111.159.52"] : [],
```

---

### FINDING 12 — INFO: No Permissions-Policy header

**Scope:** All nginx vhosts

Permissions-Policy restricts browser feature access (camera, microphone, geolocation) for embedded frames and the page itself.

**Status:** Added to `apps.carlosanton.io` (the main app vhost) on 2026-05-21. Not yet added to `vps.carlosanton.io` and `carlosanton.io` — low priority as those vhosts don't serve the app.

```nginx
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
```

---

## What's Already Good

- **Agency-scoped queries everywhere.** All DB reads use `agencyId: session.user.agencyId` as a filter — cross-tenant data leakage is prevented.
- **Passwords are bcrypt-hashed.** `bcryptjs.compare()` is used correctly in the auth provider.
- **HTTPS enforced.** All HTTP traffic redirects to HTTPS. Cloudflare Authenticated Origin Pulls (`ssl_verify_client on`) prevent direct-to-origin attacks.
- **HSTS configured.** `max-age=31536000; includeSubDomains; preload` on all vhosts.
- **Auth check on every API handler.** Every route in `src/app/api/issp/` checks `const session = await auth()` before touching the database.
- **File upload type and size validation.** The upload-diagram route checks MIME type and enforces a 10 MB limit.
- **HTML output is escaped.** The `esc()` function in `render-issp-html.ts` escapes `&`, `<`, `>`, `"` before inserting user data into HTML.
- **No SQL injection surface.** Prisma ORM is used throughout; no raw SQL queries.
- **Default nginx server returns 444.** Unknown `Host` headers get dropped, not served.

---

## Remediation Summary

### Completed (2026-05-21)

| Finding | Fix | Where |
|---------|-----|-------|
| F2 — Mass assignment PATCH route | Whitelist `title, startYear, endYear, scope, amendmentNumber` | commit cb7d0cd |
| F3 — Mass assignment PUT part routes | Strip `id` and `isspDocId` before Prisma update | commit cb7d0cd |
| F4 — Unauthenticated /api/export | Accepted as by design (local-first architecture) | — |
| F5 — Missing nginx security headers | Added X-XSS-Protection, Referrer-Policy, Permissions-Policy, CSP | nginx live |
| F7 — Content-Disposition injection | Sanitize acronym with `/[^\w\-]/g → "_"` | commit cb7d0cd |
| F12 — No Permissions-Policy | Added to apps.carlosanton.io | nginx live |

### Open — Action Required

| Priority | Finding | Action |
|----------|---------|--------|
| Deferred | **F1 — AUTH_SECRET** | Server-side auth is dormant (local-first architecture, no active logins). Rotate before reactivating server-side mode: `openssl rand -base64 32` → PM2 env, never in git |
| This sprint | **F6 — No rate limiting** | Add `limit_req_zone` to nginx.conf + `limit_req` on `/issp/api/auth` location |
| This sprint | **F8 — proxy.ts API gap** | Add auth enforcement for `/api/issp/**` in `proxy.ts`, keep `/api/auth` and `/api/export` public |

### Backlog (low priority / dormant)

| Finding | Note |
|---------|------|
| F9 — SVG uploads | Dormant route; address when server-side mode reactivated |
| F10 — Unauthenticated diagram URLs | Dormant route; same condition |
| F11 — Internal IP in next.config.ts | Move `allowedDevOrigins` behind `NODE_ENV` check |

---

*Last updated: 2026-05-21*
