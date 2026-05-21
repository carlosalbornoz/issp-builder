# Security Review — ISSP Builder

**Date:** 2026-05-21
**Reviewer:** Claude Code (automated + manual analysis)
**Scope:** Next.js application (`src/`), Nginx vhosts, `.env`, auth configuration

---

## Executive Summary

The app has a solid baseline: all API routes check session auth, agency-scoped queries prevent cross-tenant access, and passwords are bcrypt-hashed. However, five issues require action before this can be considered production-hardened:

1. The `AUTH_SECRET` in `.env` is a known placeholder — **must be rotated**.
2. The `PATCH /api/issp/documents/[id]` route passes raw request body to Prisma — **mass assignment vulnerability**.
3. The `POST /api/export` route generates PDFs without authentication — **unauthenticated compute sink**.
4. The `apps.carlosanton.io` nginx vhost is missing several security headers present on the other vhosts.
5. No login rate limiting — brute-force attacks are unconstrained.

---

## Finding Index

| # | Severity | Title | Status |
|---|----------|-------|--------|
| 1 | CRITICAL | Weak default AUTH_SECRET | Open — manual action required |
| 2 | HIGH | Mass assignment in PATCH document route | **Fixed** |
| 3 | HIGH | Mass assignment in PUT part1/2/3/4 routes | **Fixed** |
| 4 | HIGH | Unauthenticated PDF export endpoint | Accepted (by design) |
| 5 | MEDIUM | Missing security headers on apps.carlosanton.io | **Fixed** |
| 6 | MEDIUM | No login rate limiting | Open |
| 7 | MEDIUM | Content-Disposition header injection risk | **Fixed** |
| 8 | MEDIUM | No Next.js middleware — auth is per-handler only | Open |
| 9 | LOW | SVG uploads served as static files | Open |
| 10 | LOW | Uploaded diagrams accessible without auth | Open |
| 11 | LOW | allowedDevOrigins leaks internal IP in prod config | Open |
| 12 | INFO | No Permissions-Policy header anywhere | **Fixed** (nginx) |

---

## Detailed Findings

---

### FINDING 1 — CRITICAL: Weak default AUTH_SECRET

**File:** `.env:11`

```
AUTH_SECRET="issp-builder-secret-change-in-production"
```

**Risk:** NextAuth signs JWT session tokens with this secret. Anyone who knows the secret can forge valid session tokens, impersonate any user, and access any agency's data. This string is effectively public (it's a common placeholder pattern).

**Fix:** Generate a strong secret and set it before any production exposure.

```bash
openssl rand -base64 32
```

Set the output as `AUTH_SECRET` in the production environment (PM2 ecosystem file or server env, never committed to git). Rotate all existing sessions after changing it.

**Verify:** `grep AUTH_SECRET .env` must never show a placeholder or guessable value.

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

### FINDING 8 — MEDIUM: No Next.js middleware — auth is purely per-handler

**File:** No `src/middleware.ts` exists.

**Risk:** Next.js middleware (runs at the edge before any route handler) is the standard defence-in-depth layer for auth. Without it, any new API route or page added without an explicit `auth()` check is publicly accessible. There is currently no automated protection against forgotten auth checks.

**Fix:** Add `src/middleware.ts` to protect all dashboard and API routes:

```ts
import { auth } from "@/lib/auth.config";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthed = !!req.auth;
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/issp");
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isLogin = req.nextUrl.pathname.startsWith("/login");

  if ((isApiRoute || isDashboard) && !isAuthed) {
    if (isApiRoute) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/api/issp/:path*", "/dashboard/:path*"],
};
```

Note: Keep `/api/auth/:path*` out of the matcher so the sign-in route itself is not protected.

---

### FINDING 9 — LOW: SVG uploads allowed without sanitization

**File:** `src/app/api/issp/documents/[id]/upload-diagram/route.ts:11`

```ts
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
```

**Risk:** SVG files are XML and can contain `<script>` tags. When rendered in an `<img>` tag (as this app does) most browsers neutralize script execution, but if a browser renders the SVG inline or the file is opened directly via URL, XSS is possible. Uploaded files are stored at `/public/uploads/{docId}/` and served as static assets — any user who knows the URL can access them without authentication.

**Fix (minimal):** If SVGs are only ever rendered as `<img>` sources, the risk is low. To eliminate it entirely, either:
a. Remove SVG from `ALLOWED_TYPES`, or
b. Sanitize uploaded SVGs with a library like `dompurify` (server-side) before saving.

---

### FINDING 10 — LOW: Uploaded diagrams accessible without authentication

**File:** `public/uploads/` — served as Next.js static assets

Any file uploaded to `public/uploads/{docId}/{filename}` is publicly accessible at `https://apps.carlosanton.io/issp/uploads/{docId}/{filename}` without authentication.

**Risk:** ISSP network diagrams may contain sensitive infrastructure information. An unauthenticated party who discovers or guesses a URL can download them.

**Fix:** Move uploads outside the `public/` directory (e.g., `data/uploads/`) and serve them through an authenticated API route:

```ts
// GET /api/uploads/[docId]/[filename]
const session = await auth();
if (!session) return new Response("Unauthorized", { status: 401 });
// verify docId belongs to session.user.agencyId
// then stream the file
```

Nginx would need to be updated to not cache these paths, and the diagram `path` storage format would change from a public URL to a logical path.

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

Permissions-Policy restricts browser feature access (camera, microphone, geolocation) for embedded frames and the page itself. It is not currently set on any vhost.

**Fix:** Add to all server blocks:

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

## Remediation Priority

| Priority | Findings | Action |
|----------|----------|--------|
| Do now | **1** | Rotate AUTH_SECRET — run `openssl rand -base64 32`, set in production env |
| This sprint | **6, 8** | Add nginx rate limiting on auth endpoint; add `src/middleware.ts` |
| Backlog | **9, 10, 11** | SVG sanitization policy; serve uploads via auth route; move dev IP to .env.local |

---

*This document should be updated after each finding is remediated.*
