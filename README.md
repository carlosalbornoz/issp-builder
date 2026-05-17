# ISSP Platform PH

A civic technology platform for Philippine government agencies to draft, validate, and export their **Information Systems Strategic Plan (ISSP)** — as required by DICT under the eGov Act (RA 10175 IRR).

Built by a volunteer. Open source. Intended as an interim solution while DICT develops an official tool.

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

The editor autosaves as you work and exports a PDF aligned to DICT's uniformity rules (Palatino/P052, A4 landscape, 1-inch margins, running headers, cover page).

---

## Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1–6 | ISSP Builder (Parts I–IV) + PDF export | ✅ Live |
| Annex 1 | Standalone ICT Asset Inventory module for regional/field offices | 🔵 Planned |
| 7 | Polish & validation (progress tracking, submit workflow, review mode) | 🔵 Planned |
| 8 | ISSP Repository — searchable public archive of agency ISSPs | 🔵 Planned |
| 9 | ICT Budget Dashboard — ISSP budget requests vs. DBM actual releases | 🔵 Planned |
| — | Local-first rearchitecture (no login, IndexedDB + `.issp` file format) | 🔵 Planned |

See [`docs/project-status.md`](docs/project-status.md) for detailed status and [`docs/privacy-architecture.md`](docs/privacy-architecture.md) for the privacy-by-design direction.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | SQLite via Prisma 7 |
| Auth | NextAuth.js v5 |
| UI | Tailwind CSS 4 + Base UI |
| PDF | Puppeteer + pdf-lib |
| Font (PDF) | P052 / URW Palladio (Palatino clone) |

---

## Getting started

### Prerequisites

- Node.js 24+
- npm 11+
- `fonts-urw-base35` installed system-wide (required for PDF font rendering)

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create and seed the database
node prisma/seed.js

# Start the dev server
npm run dev
# → http://localhost:3000
```

### Environment

Create a `.env` file at the project root:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="change-this-in-production"
```

### Seed credentials

The seed data uses a fictitious agency — **NCWTR** (National Commission on Waiting Time Reduction) — with a fully populated ISSP across all four parts.

| Email | Password | Role |
|---|---|---|
| cio@ncwtr.gov.ph | password123 | CIO |
| focal@ncwtr.gov.ph | password123 | ISSP Focal Person |
| admin@ncwtr.gov.ph | password123 | Admin |

---

## Project structure

```
├── content/            # Markdown source for public blog pages (About, Privacy)
├── docs/               # Architecture notes, implementation plans, session handoff
├── prisma/             # Schema, migrations, seed data
├── public/
│   ├── samples/        # Sample .issp export file (NCWTR)
│   └── screenshots/    # App screenshots (used in landing page hero)
├── references/         # DICT 2026 ISSP template PDFs + guidelines markdown
├── scripts/            # One-off migration and export scripts
├── src/
│   ├── app/            # Next.js App Router pages and API routes
│   ├── components/     # UI components (editor forms, layout, shadcn/base-ui)
│   ├── hooks/          # useAutoSave and other custom hooks
│   └── lib/            # Auth, DB client, PDF generator, utilities
└── uacs/               # UACS budget classification codes (1,253 entries)
```

---

## Documentation

| Doc | Purpose |
|---|---|
| [`docs/project-status.md`](docs/project-status.md) | Full feature list, known bugs, tech stack, setup |
| [`docs/session-handoff.md`](docs/session-handoff.md) | Architectural patterns and continuation guide |
| [`docs/privacy-architecture.md`](docs/privacy-architecture.md) | Local-first redesign plan, PIA outline, VAPT scope |
| [`docs/annex1-implementation-plan.md`](docs/annex1-implementation-plan.md) | Annex 1 standalone module design |
| [`references/ISSP_Guidelines_2026.md`](references/ISSP_Guidelines_2026.md) | Structured extraction of the DICT 2026 ISSP template |

---

## Privacy note

The current version uses server-side storage and authentication. A [local-first rearchitecture](docs/privacy-architecture.md) is planned before wider agency adoption — the goal is for the platform to never hold agency data server-side, aligning with RA 10173 (Data Privacy Act) Privacy by Design principles.

---

## Contributing

This is a volunteer project. If you work in government ICT, at DICT, or care about civic tech and transparency in the Philippines — contributions, feedback, and collaboration are welcome.

Open an issue or reach out at [issp-builder@carlosanton.io](mailto:issp-builder@carlosanton.io).
