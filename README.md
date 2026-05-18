# ISSP Platform PH

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

The editor **works entirely in your browser** — no login, no server-side storage. Your ISSP data lives in IndexedDB and is exported to a `.issp` file you keep on your own computer. When you're ready, export to PDF aligned to DICT's uniformity rules (Palatino/P052, A4 landscape, 1-inch margins, running headers, cover page).

---

## Quick start

```bash
npm install
npm run dev
# Open http://localhost:3000/editor — no login required
```

To try the tool immediately, download the [NCWTR demo file](public/demo/ncwtr-issp-2026-2028.issp) from the editor splash screen.

---

## Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1–6 | ISSP Builder (Parts I–IV) + PDF export | ✅ Done |
| Local-first | No login, IndexedDB + `.issp` file format, stateless PDF | ✅ Done |
| Phase E | Diagram upload (base64, client-side) | 🔵 Next |
| Phase 7 | Polish & validation (progress tracking, pre-export checks, review mode) | 🔵 Planned |
| Annex 1 | Standalone ICT Asset Inventory module for regional/field offices | 🔵 Planned |
| Phase 8 | ISSP Repository — searchable public archive of agency ISSPs | 🔵 Planned |
| Phase 9 | ICT Budget Dashboard — ISSP budget requests vs. DBM actual releases | 🔵 Planned |

See [`docs/project-status.md`](docs/project-status.md) for detailed status.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Persistence | IndexedDB via `idb-keyval` |
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
│   │   └── (dashboard)/# Dormant server-side routes (preserved for future)
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
| [`docs/project-status.md`](docs/project-status.md) | Full feature list, known bugs, tech stack |
| [`docs/session-handoff.md`](docs/session-handoff.md) | Architecture reference and continuation guide |
| [`docs/privacy-architecture.md`](docs/privacy-architecture.md) | Local-first design decisions and privacy notes |
| [`docs/annex1-implementation-plan.md`](docs/annex1-implementation-plan.md) | Annex 1 standalone module design |
| [`references/ISSP_Guidelines_2026.md`](references/ISSP_Guidelines_2026.md) | Structured extraction of the DICT 2026 ISSP template |

---

## Privacy

This tool is **local-first by design** — your agency's ISSP data never leaves your browser. Everything is stored in IndexedDB and exported to a `.issp` file on your own computer. The server only receives data when you click "Export PDF", and it processes that data statelessly without persisting it. This aligns with RA 10173 (Data Privacy Act) Privacy by Design principles.

---

## Contributing

This is a volunteer project. If you work in government ICT, at DICT, or care about civic tech and transparency in the Philippines — contributions, feedback, and collaboration are welcome.

Open an issue or reach out at [issp-builder@carlosanton.io](mailto:issp-builder@carlosanton.io).
