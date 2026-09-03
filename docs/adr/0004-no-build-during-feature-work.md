# No production build during feature work (shared dev + prod tree)

**Status:** accepted

The repository is a single tree serving both development and production: the pm2 process on port 3100 runs `next start` from this tree's `.next/` directory. We never run `npm run build` during feature work, because rebuilding `.next/` under the running pm2 process desyncs production — its in-memory route manifest references chunk files the new build deleted, causing SSR 500s (`InvariantError: The client reference manifest for route … does not exist`). This took production down on 2026-08-03.

The development gate is `npx tsc --noEmit` + `npm run lint` (+ Puppeteer smoke on port 3000); `npm run build` is deploy-only. The full operational rules live in `AGENTS.md` (untracked/local) — the tracked copy is `docs/production-safety.md`.
