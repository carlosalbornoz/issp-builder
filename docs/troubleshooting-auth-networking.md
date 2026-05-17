# Troubleshooting: Authentication & Networking Fixes

This document records the solutions applied to resolve authentication and networking issues encountered when accessing the Next.js development server remotely (e.g., via a Tailscale IP) rather than `localhost`.

## 1. Login Redirect Loop
**Issue:** 
When logging into the application, the login appeared to succeed, but the user was immediately redirected from `/dashboard` back to the `/login` page in a continuous loop.

**Root Cause:**
NextAuth was relying on the hardcoded `AUTH_URL="http://localhost:3000"` in the `.env` file. 
- When logging in via a Tailscale IP (e.g., `http://100.x.x.x:3000`), NextAuth created a callback URL pointing to `localhost`.
- NextAuth set the secure session cookie exclusively for the `localhost` domain.
- When the browser navigated to the Tailscale IP's `/dashboard`, the `localhost` cookie was not sent.
- The authentication check in the proxy/middleware (`!!req.auth`) evaluated to `false`, kicking the user back to the login page.

**Fix:**
1. Commented out `AUTH_URL` in the `.env` file to stop NextAuth from forcing the `localhost` domain.
2. Added `trustHost: true` to the NextAuth configuration in `src/lib/auth.config.ts`. This allows NextAuth to dynamically infer the base URL from the incoming request's `Host` header, enabling seamless sessions across any IP or domain.

## 2. Next.js Edge Runtime Dynamic Import Errors
**Issue:**
The Next.js server was throwing errors regarding Node.js modules not being supported in the Edge Runtime (specifically `node:path` from the Prisma client). 
`A Node.js module is loaded ('node:path' at line 14) which is not supported in the Edge Runtime.`

**Root Cause:**
Next.js 15/16 deprecated the `middleware.ts` convention, which runs in the limited Edge Runtime. The middleware was loading `auth.config.ts`, which attempted to dynamically import database and bcrypt modules (`./db`, `bcryptjs`) for the credentials provider. Webpack/Turbopack statically analyzed these dynamic imports and bundled the Node.js modules into the Edge environment, causing the crash.

**Fix:**
1. Renamed `src/middleware.ts` to `src/proxy.ts` (the new Next.js 16 standard).
2. The `proxy.ts` convention natively runs in the Node.js runtime instead of the Edge Runtime. This naturally resolves the issue by allowing standard Node.js APIs and module imports.
3. Updated the default export in `proxy.ts` to be a named export `export const proxy = ...` as required by the new proxy convention.

## 3. Login Form Appending `?` to URL via Tailscale IP
**Issue:**
When attempting to log in over the Tailscale IP, clicking the "Sign in" button did not trigger the login API call. Instead, the browser simply appended a `?` to the URL (`/login?`). This issue did not occur when accessing via `localhost`.

**Root Cause:**
Next.js security settings block cross-origin requests to dev-only assets (like JavaScript bundles and hot-reloading scripts) by default.
- Accessing the app via the Tailscale IP triggered this block, meaning the client-side React JavaScript was never loaded or executed.
- Because React failed to load, the page never hydrated, and the custom `onSubmit` event handler (`e.preventDefault()`) was never attached to the login form.
- Clicking the submit button triggered the native HTML form behavior, which defaulted to a `GET` request to the current URL. Since the input fields lacked `name` attributes, no query parameters were attached, resulting in just the `?`.

**Fix:**
1. Added the `allowedDevOrigins` configuration option to `next.config.ts`.
2. Explicitly allowed the specific Tailscale IP (`100.111.159.52`) to access the Next.js development resources.
```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.111.159.52"],
};

export default nextConfig;
```
*(Note: If the Tailscale IP changes, or if additional remote machines need access, their IPs or hostnames must be appended to this list.)*
