# ISSP Platform PH

![GESF Compliance](badge.svg)
<!-- GESF-SCORE-START -->
> **GESF Compliance Score: 8% (F)**
>
> | Framework | Score | Grade | Controls |
> |-----------|-------|-------|----------|
> | GDPR | 16% | F | 5/39 passed |
> | OWASP | 50% | D | 3/6 passed |
> | CIS | 0% | F | 0/5 passed |
> | NIST | 0% | F | 0/23 passed |
> | NIST-800-53 | 13% | F | 8/76 passed |
> | ISO27001 | 67% | C | 7/10 passed |
> | ISO27701 | 0% | F | 0/11 passed |
> | PRIVACY-CORE | 0% | F | 0/40 passed |
> | DPA-PH | 0% | F | 0/10 passed |
>
> Audit findings: 1 medium (score deduction: -4%)
>
> _(Last evaluated: 2026-07-16)_
<!-- GESF-SCORE-END -->



A civic technology platform for Philippine government agencies to draft, validate, and export their **Information Systems Strategic Plan (ISSP)** — as required by DICT under the eGov Act (RA 10175 IRR).

Built by a volunteer. Open source. No account required.

---

## The problem

Every Philippine government agency is required to submit a 3-year ISSP to DICT. The prescribed format is a dense Word document — updated manually section by section, with budget tables maintained in a separate spreadsheet, then reconciled back into the document before every submission deadline.

It's tedious, error-prone, and doesn't match the strategic importance of the document. The ISSP is supposed to describe how an agency plans to use ICT to deliver on its mandate. It deserves better tooling.

## What this is

A structured, guided web editor aligned to the **DICT 2026 ISSP template** across all four parts:

- **Part I** — Agency Profile & Strategic Context (mandate, vision/mission, org outcomes, CIO info, human capital, stakeholders)
- **Part II** — Current ICT Assessment (strategic concerns, network infrastructure, cybersecurity controls, IS inventory, eGov programs checklist)
- **Part III** — Proposed ICT Strategy (proposed infrastructure, enterprise architecture, human capital, proposed IS, internal and cross-agency projects, performance framework)
- **Part IV** — Resource Requirements (year 1–3 UACS-coded budget breakdowns, summary of investments)

The editor **works entirely in your browser** — no login, no server-side storage. Your ISSP data lives in IndexedDB and is exported to a `.issp` file you keep on your own computer. When you're ready, PDF export sends the document to a stateless rendering endpoint and returns a DICT-aligned PDF (Palatino/P052, A4 landscape, 1-inch margins, running headers, cover page) without persisting the document.

---

## Quick start

```bash
npm install
npm run dev
# Open http://localhost:3000/editor — no login required
```

To try the tool immediately, download the [NCWTR demo file](public/demo/ncwtr-issp-2026-2028.issp) from the editor splash screen.

---

## Production deployment

The app is served at `apps.carlosanton.io/issp` via nginx → pm2 on port 3100.

```bash
# Build
npm run build

# Restart (kills any stale process first, then restarts pm2)
ss -tlnp | grep 3100 | grep -oP 'pid=\K[0-9]+' | xargs -r kill; sleep 0.5; pm2 restart issp --update-env
```

> Port 3000 is dev only (`npm run dev`). The pm2 process `issp` always runs on port 3100.
> Before restarting, check for stale listeners on port 3100 with `ss -tlnp | grep 3100` and kill them if needed.

---

## Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1–6 | ISSP Builder (Parts I–IV) + PDF export | ✅ Done |
| Local-first | No login, IndexedDB + `.issp` file format, stateless PDF | ✅ Done |
| Phase E | Diagram upload (base64, client-side) | ✅ Done |
| Phase 7 | Polish & validation (progress tracking, pre-export checks, review mode) | 🔵 Planned |
| Annex 1 | Standalone ICT Asset Inventory module for regional/field offices | ✅ Done |
| Phase 8 | ISSP Repository — searchable public archive of agency ISSPs | 🔵 Planned |
| Phase 9 | ICT Budget Dashboard — ISSP budget requests vs. DBM actual releases | 🔵 Planned |

See [`docs/project-status.md`](docs/project-status.md) for detailed status.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Persistence | IndexedDB via native wrapper in `src/lib/store/idb.ts` |
| UI | Tailwind CSS 4 + shadcn/ui |
| Toasts | Sonner |
| PDF | Puppeteer + pdf-lib |
| Font (PDF) | P052 / URW Palladio (Palatino clone) |

---

## Prerequisites (for PDF export)

PDF generation runs server-side via Puppeteer. On Linux you'll need:

```bash
# Chrome dependencies
apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 \
  libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libnss3 libnspr4

# P052 font (Palatino clone used in the PDF)
apt-get install -y fonts-urw-base35 && fc-cache -f
```

---

## Project structure

```
├── docs/               # Architecture notes, session handoff, implementation plans
├── public/
│   ├── demo/           # NCWTR sample .issp file (all 4 parts populated)
│   └── uacs_active.min.json
├── references/         # DICT 2026 ISSP template PDFs + guidelines markdown
├── src/
│   ├── app/
│   │   ├── editor/     # Local-first editor (public, no auth) — Parts I–IV
│   │   ├── api/export/ # POST /api/export — stateless PDF generation
│   │   └── api/usage/  # POST /api/usage — limited append-only usage analytics
│   ├── components/
│   │   ├── editor/     # EditorShell, EditorSidebar
│   │   └── issp-editor/# All Part I–IV form components
│   ├── hooks/          # useFileSaveReminder, useLocalSave
│   └── lib/
│       ├── store/      # IndexedDB store — IsspDocument types + context
│       └── pdf/        # Puppeteer wrapper + full ISSP HTML renderer
└── uacs/               # UACS budget classification codes (1,253 entries)
```

---

## Documentation

| Doc | Purpose |
|---|---|
| [`docs/project-status.md`](docs/project-status.md) | **Canonical current tracker** — active architecture, backlog, next hypersession plan |
| [`docs/code-sweep-2026-06-19.md`](docs/code-sweep-2026-06-19.md) | Latest read-only code sweep and prioritized findings |
| [`docs/ui-refresh-plan.md`](docs/ui-refresh-plan.md) | UI refresh implementation plan (branch: `ui-refresh`) |
| [`docs/privacy-architecture.md`](docs/privacy-architecture.md) | Historical local-first design rationale; verify current state against `docs/project-status.md` |
| [`docs/annex1-implementation-plan.md`](docs/annex1-implementation-plan.md) | Historical Annex 1 draft; must be refreshed before implementation |
| [`references/ISSP_Guidelines_2026.md`](references/ISSP_Guidelines_2026.md) | Structured extraction of the DICT 2026 ISSP template |

---

## Privacy

This tool is **local-first by design** — the contents of your agency's ISSP stay in IndexedDB and in `.issp` files on your own computer. The server receives the document transiently when you click "Export PDF" and does not persist its contents. For basic usage analytics, creating, loading, or restoring a browser-saved draft records only the agency name, acronym, event type, and a server-generated timestamp. The fictitious sample is excluded. See the privacy page for the complete disclosure.

---

## Contributing

This is a volunteer project. If you work in government ICT, at DICT, or care about civic tech and transparency in the Philippines — contributions, feedback, and collaboration are welcome.

Open an issue or reach out at [issp-builder@carlosanton.io](mailto:issp-builder@carlosanton.io).
