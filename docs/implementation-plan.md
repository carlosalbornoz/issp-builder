# ISSP Builder - Implementation Plan (Refined)

## Context

Philippine government agencies must submit an Information Systems Strategic Plan (ISSP) to DICT using a prescribed template. The template is a ~36-page document covering agency profile, current ICT assessment, proposed strategy, and resource requirements over a 3-year period. Agencies currently fill this out manually in Word/Excel, which is error-prone (totals don't match, required fields are missed, formatting is inconsistent). This app is a multi-agency web platform that:

1. Guides users through every section with contextual help from the Guidelines document
2. Validates data in real-time and enforces cross-section consistency
3. Auto-calculates all financial totals and summaries
4. Generates a pixel-perfect PDF that is indistinguishable from the DICT template

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 16** (App Router, TypeScript) | Full-stack, server components for PDF generation, API routes for CRUD |
| Database | **SQLite** via Prisma 7 + better-sqlite3 adapter | Zero-config dev DB. Switch to PostgreSQL for production by changing provider. |
| Auth | **NextAuth.js v5** (Auth.js beta) | Credentials provider, JWT sessions, Edge-safe middleware |
| UI | **Tailwind CSS 4 + shadcn/ui** | Professional look, accessible components, fast to build |
| Font | **Inter** (next/font/google) | Clean, modern, highly legible |
| Forms | **React Hook Form + Zod** (not yet installed) | Performant forms, shared validation schemas between client and server |
| PDF | **Puppeteer** (not yet installed) | Renders styled HTML → PDF. Only reliable way to get Palatino Linotype, landscape A4, exact table layouts |
| State | **Zustand** (not yet installed) | Lightweight client-side state for form drafts, auto-save coordination |
| File Storage | **Local filesystem** (Vercel Blob / S3 later) | Agency logos, network diagrams, enterprise architecture diagrams |
| UACS Codes | **`uacs/` folder** (pre-existing) | 1,253 entries imported into dev.db. JSON + SQL + TypeScript types provided. |

---

## UACS (Unified Accounts Code Structure) Integration

The `uacs/` folder contains a complete UACS code reference — 1,262 active Philippine government accounting codes with SQL schema, JSON data, TypeScript types, and pre-built views. This is critical for Part IV where every expense line item must be tagged with the correct UACS code.

### Files in `uacs/`
| File | Use in App |
|------|-----------|
| `uacs_codes.sql` | Import into PostgreSQL on setup — becomes `uacs_codes` table with pre-built views |
| `uacs_active.min.json` | Front-end autocomplete dropdown for UACS code selection |
| `uacs.d.ts` | TypeScript types for UACS entries |

### Pre-built SQL Views (from `uacs_codes.sql`)
| View | UACS Prefix | Description |
|------|-------------|-------------|
| `uacs_active` | all active | All 1,262 active codes |
| `uacs_ps` | `5020%` | Personnel Services (salaries, wages, benefits) |
| `uacs_mooe` | `5021%` | Maintenance and Other Operating Expenses |
| `uacs_co` | `506%` | Capital Outlay |
| `uacs_summary` | — | Counts by classification |

### ICT-Specific UACS Codes (most relevant to ISSP)

**Capital Outlay (CO) — items over PHP 50K with useful life > 1 year:**
| UACS Code | Label | Use For |
|-----------|-------|---------|
| `5060405003` | ICT Equipment | Laptops, desktops, servers, networking hardware |
| `5060405015` | ICT Software | Perpetual software licenses, capitalized development |
| `5060602000` | Computer Software | Intangible software assets |

**MOOE — recurring costs and items under PHP 50K:**
| UACS Code | Label | Use For |
|-----------|-------|---------|
| `5020201001` | ICT Training Expenses | Training programs for ICT staff |
| `5020301001` | ICT Office Supplies Expenses | Consumables, cables, toner, etc. |
| `5020321003` | ICT Equipment (Semi-Expendable) | Items under PHP 50K threshold |
| `5021103001` | ICT Consultancy Services | Software development contractors |
| `5021305003` | ICT Equipment (Repairs) | Maintenance and repair of ICT equipment |
| `5029905008` | Rents - ICT Machinery and Equipment | Equipment leases |
| `5029907001` | ICT Software Subscription | SaaS, cloud hosting, annual subscriptions |

### UX for UACS Code Selection in Part IV

Every line item in Part IV has a `[UACS Object Code]` cell. The UX must:

1. **Smart UACS dropdown**: When adding a line item, show a search-as-you-type dropdown that filters the 1,262 active codes. Display format: `5021103001 — ICT Consultancy Services`

2. **Context-aware filtering**: Pre-filter codes based on the section:
   - Under "Capital Outlay" heading → show only CO codes (`506%`) and relevant expense codes
   - Under "MOOE" heading → show only MOOE codes (`5021%`)
   - This reduces the dropdown from 1,262 to ~50-100 relevant codes per section

3. **Commonly used codes shortcut**: Show a "frequently used" chip bar above the search with the 10-15 most common ICT codes (listed above), so users don't have to search every time.

4. **Auto-grouping by UACS**: Part IV.B.4 (Object of Expenditure) auto-groups line items by their UACS code. Two items tagged `5021103001` (ICT Consultancy) under different projects are summed together in the summary.

5. **Code validation**: Warn if a CO section has MOOE codes or vice versa (e.g., laptop under MOOE instead of CO — unless it's semi-expendable under PHP 50K).

### Database Setup
UACS codes are already imported into `dev.db` (1,253 entries). For a fresh setup or PostgreSQL migration:
```bash
# SQLite (current — already done)
python3 -c "
import json, sqlite3
conn = sqlite3.connect('dev.db')
# ... see prisma/seed.js pattern for reference
"

# PostgreSQL (production)
psql -U user -d issp_db -f uacs/uacs_codes.sql
```
The `uacs_codes` table is reference data, NOT managed by Prisma migrations.

---

## Database Schema

### Core Models

```prisma
model Agency {
  id          String   @id @default(cuid())
  name        String
  acronym     String   @unique
  type        AgencyType  // NGA | GOCC | LGU | OTHER
  logoPath    String?
  websiteUrl  String?
  users       User[]
  isspDocs    IsspDocument[]
  createdAt   DateTime @default(now())
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // bcrypt hashed
  role      UserRole // ADMIN | CIO | FOCAL | CONTRIBUTOR
  agencyId  String
  agency    Agency   @relation(fields: [agencyId], references: [id])
  isspDocs  IsspDocument[]
  createdAt DateTime @default(now())
}

model IsspDocument {
  id              String   @id @default(cuid())
  title           String
  startYear       Int      // e.g., 2026
  endYear         Int      // e.g., 2028
  status          DocStatus @default(DRAFT) // DRAFT | REVIEW | SUBMITTED | APPROVED
  amendmentNumber Int      @default(0) // 0 = Regular, 1/2/3 = Amendments
  scope           IsspScope // DEPT_WIDE, CENTRAL_ONLY, WITH_REGIONAL, etc.
  agencyId        String
  agency          Agency   @relation(fields: [agencyId], references: [id])
  createdBy       String
  creator         User     @relation(fields: [createdBy], references: [id])
  part1           Part1Profile?
  part2           Part2Assessment?
  part3           Part3Strategy?
  part4           Part4Resources?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Part I — Agency Profile & Strategic Context

```prisma
model Part1Profile {
  id              String   @id @default(cuid())
  isspDocId       String   @unique
  isspDoc         IsspDocument @relation(fields: [isspDocId], references: [id])

  // A. Mandate
  legalBasis      String   // e.g., "RA 10844"
  mandateFunction String   // Description of functions

  // A.2-4 Vision, Mission, Org Outcomes
  visionStatement String
  missionStatement String
  orgOutcomes     Json     // Array of { name: string, programs: string[] }
  // OO for NGAs, SO for GOCCs, MFO for LGUs — label changes based on agency type

  // B.1 CIO
  cioName         String
  cioPosition     String
  cioUnit         String
  cioEmail        String
  cioContact      String

  // B.1 ISSP Focal
  focalName       String
  focalPosition   String
  focalUnit       String
  focalEmail      String
  focalContact    String

  // B.2 Human Capital
  humanCapital    Json
  // Shape: {
  //   plantilla: { it: { male: n, female: n }, nonIt: { male: n, female: n } },
  //   contractual: { ... },
  //   outsourced: { ... }
  // }
  // Auto-calculated totals

  // C. Stakeholders
  stakeholders    Json
  // Shape: Array<{ name: string, transactions: string, complexity: "Simple"|"Complex"|"Highly Technical" }>
}
```

### Part II — Current ICT Assessment

```prisma
model Part2Assessment {
  id                String   @id @default(cuid())
  isspDocId         String   @unique
  isspDoc           IsspDocument @relation(fields: [isspDocId], references: [id])

  // A. Strategic Concerns
  strategicConcerns Json
  // Shape: Array<{
  //   ooSoMfo: string,      // References Part I org outcomes
  //   criticalSystem: string,
  //   problem: string,
  //   intendedIctUse: string
  // }>

  // B.1 Network Infrastructure
  networkDiagramPath String?  // Uploaded image file
  networkDescription String?  // Textual description of connectivity

  // B.2 Cybersecurity Controls
  cybersecurityControls Json
  // Shape: {
  //   physicalSecurity: { perimeterProtection: bool, accessControl: bool, surveillance: bool, detection: bool },
  //   perimeterSecurity: { ngfw: bool, idsIps: bool, waf: bool, dmz: bool },
  //   networkSecurity: { dataEncryption: bool, networkSegmentation: bool },
  //   endpointSecurity: { antivirus: bool, appControl: bool, byod: bool, xdr: bool },
  //   dataSecurity: { dataClassification: bool, dlp: bool, backupRecovery: bool },
  //   applicationSecurity: { securityScanning: bool },
  //   otherMeasures: { vulnAssessment: bool, patchMgmt: bool, strongPasswords: bool,
  //                    mfa: bool, accessReviews: bool, securityLogs: bool,
  //                    logAnalysis: bool, incidentResponse: bool, siem: bool,
  //                    penTesting: bool, secureSdlc: bool }
  // }

  // C. Existing Information Systems
  informationSystems Json
  // Shape: Array<{
  //   name: string,
  //   classification: "Support to Operations" | "General Administrative" | "Operations",
  //   frontline: bool | null,
  //   deploymentType: "Online" | "On-premise" | "Hybrid",
  //   url: string,
  //   description: string,
  //   developmentStrategy: "In-house" | "Outsourced" | "COTS" | "Hybrid",
  //   developmentPlatform: string,
  //   databaseName: string,
  //   dataStorage: string,
  //   internalUsers: string,
  //   externalUsers: string,
  //   owner: string,
  //   interoperability: {
  //     integrated: bool, internalSystems: string[], externalSystems: string[],
  //     generatesData: bool, processesExternalData: bool, sharedPlatform: bool
  //   },
  //   pia: { processesPersonalInfo: bool, piaCompleted: bool | null }
  // }>

  // D. E-Government Programs Checklist
  egpChecklist      Json
  // Shape: {
  //   elgu: { utilizing: bool, url: string, usingEquivalent: bool, equivalentName: string, manual: bool },
  //   eGovPay: { utilizing: bool, usingOther: bool, otherName: string, manual: bool, proposed: bool },
  //   pnpki: { adoptionPercentage: number },
  //   hcmis: { utilizing: bool, usingEquivalent: bool, equivalentName: string, manual: bool },
  //   ifmis: { utilizing: bool, usingEquivalent: bool, equivalentName: string, manual: bool },
  //   onlinePortal: {
  //     channels: { website: bool, email: bool, landline: bool, socialMedia: bool, mobile: bool },
  //     connectedToPortal: bool, usingEquivalent: bool, equivalentName: string, manual: bool, proposed: bool
  //   },
  //   procurement: { utilizing: bool, usingEquivalent: bool, equivalentName: string, manual: bool },
  //   recordsMgmt: { exists: bool, systemName: string },
  //   pscp: { exists: bool }
  // }
}
```

### Part III — Proposed ICT Strategy

```prisma
model Part3Strategy {
  id                      String   @id @default(cuid())
  isspDocId               String   @unique
  isspDoc                 IsspDocument @relation(fields: [isspDocId], references: [id])

  // A.1 Proposed Network Infrastructure
  proposedNetworkDiagram  String?  // File path
  proposedNetworkDesc     String?

  // A.2 Proposed Cybersecurity Controls (same structure as Part II)
  proposedCybersecControls Json

  // B. Enterprise Architecture
  enterpriseArchDiagram   String?  // File path

  // C. Proposed ICT Human Capital
  proposedHumanCapital    Json
  // Shape: Array<{ position: string, employmentStatus: string, physicalCount: number }>

  // D. Proposed Information Systems — CREATED FIRST
  proposedSystems         Json
  // Same shape as Part II informationSystems, plus:
  //   id: string  ← local UUID for cross-referencing
  //   status: "For Development" | "For Enhancement"
  //   If enhancement: gapIdentification, targetUsersExpansion, piaReEvaluation
  //   linkedProjectId: string | null  ← REQUIRED before submission; links to the project that funds this IS
  //
  // CREATION ORDER: IS is defined first (the "what"), then linked to a project (the "how/when/budget").
  // The guidelines state: "Ensure the Year 1 Deliverables in Part III.E reflect the initial
  // design or procurement phase for this new system." — project deliverables reference the IS.
  //
  // Every proposed IS MUST be linked to a project before submission.
  // A warning banner shows: "This system has no associated project and will not receive funding."
  //
  // Shape: Array<{
  //   id: string,
  //   name: string,
  //   classification: "Support to Operations" | "General Administrative" | "Operations",
  //   frontline: bool | null,
  //   deploymentType: "Online" | "On-premise" | "Hybrid",
  //   url: string,
  //   description: string,
  //   status: "For Development" | "For Enhancement",
  //   enhancementDetails: { gapId: string, targetUsers: string, piaReEval: bool } | null,
  //   developmentStrategy: "In-house" | "Outsourced" | "COTS" | "Hybrid",
  //   developmentPlatform: string,
  //   databaseName: string,
  //   dataStorage: string,
  //   internalUsers: string,
  //   externalUsers: string,
  //   owner: string,
  //   interoperability: {
  //     integrated: bool, internalSystems: string[], externalSystems: string[],
  //     generatesData: bool, processesExternalData: bool, sharedPlatform: bool
  //   },
  //   pia: { processesPersonalInfo: bool, piaCompleted: bool | null },
  //   linkedProjectId: string | null  ← null until linked to a project
  // }>

  // E.1 Internal ICT Projects — CREATED AFTER proposed systems
  internalProjects        Json
  // Shape: Array<{
  //   id: string,  ← local UUID for cross-referencing from proposedSystems & Part IV
  //   title: string,
  //   description: string,
  //   objectives: string,
  //   projectType: "IS-Driven" | "Standalone",
  //     // IS-Driven: project delivers one or more proposed information systems
  //     // Standalone: infrastructure/network/cybersecurity project with no specific IS
  //   linkedSystemIds: string[],  ← OPTIONAL. References to proposedSystems IDs.
  //     // Empty for standalone projects (network overhaul, cybersecurity, etc.)
  //     // Can link multiple IS entries to one project
  //   strategicAlignment: {
  //     publicInvestment: bool, nationalCybersecurity: bool,
  //     eGovMasterPlan: bool, convergenceBudgeting: bool, others: string
  //   },
  //   harmonization: {
  //     nationalPrioritization: bool, resourceOptimization: bool,
  //     interoperability: bool, crossAgency: bool, scalability: bool
  //   },
  //   duration: string,
  //   year1Deliverables: string, year2Deliverables: string, year3Deliverables: string,
  //   implementingUnit: string,
  //   totalProjectCost: number,
  //   fundingSource: "GAA" | "Foreign-assisted" | "Locally funded" | "Other"
  // }>
  //
  // PROJECT TYPES:
  //   IS-Driven example: "IC-HRMS Implementation" → linkedSystemIds: ["sys-001"]
  //     (delivers the "Integrated Human Resource Management System" from Part III.D)
  //   Standalone example: "Network Infrastructure Upgrade" → linkedSystemIds: []
  //     (no specific IS, but still needs milestones and budget)

  // E.2 Cross-Agency ICT Projects
  crossAgencyProjects     Json
  // Same shape as internalProjects, plus:
  //   leadAgency: string, implementingAgency: string

  // F. Performance Measurement Framework
  performanceFramework    Json
  // Shape: Record<projectId, {
  //   projectTitle: string,
  //   projectType: "internal" | "cross-agency",
  //   rows: Array<{
  //     hierarchy: "Intermediate Outcome" | "Immediate Outcome" | "Output",
  //     kpi: string,
  //     baselineData: string,
  //     targets: { year1: string, year2: string, year3: string },
  //     dataCollectionMethod: string,
  //     responsibility: string
  //   }>
  // }>
}
```

### Part IV — Resource Requirements

```prisma
model Part4Resources {
  id                String   @id @default(cuid())
  isspDocId         String   @unique
  isspDoc           IsspDocument @relation(fields: [isspDocId], references: [id])

  // A.1-3 Yearly breakdowns
  year1             Json
  year2             Json
  year3             Json
  // Each year has shape: {
  //   officeProductivity: {
  //     capitalOutlay: Array<{ uacsCode: string, item: string, office: string,
  //                            fundSource: string, unitCost: number, qty: number }>,
  //     mooe: Array<{ same structure }>
  //   },
  //   internalProjects: {
  //     [projectId]: {  ← keyed by Part III.E.1 project id, NOT free-text title
  //       projectTitle: string,  ← denormalized from Part III.E for display
  //       capitalOutlay: Array<{ ... }>,
  //       mooe: Array<{ ... }>
  //     }
  //   },
  //   crossAgencyProjects: {
  //     [projectId]: {  ← keyed by Part III.E.2 project id
  //       projectTitle: string,
  //       capitalOutlay: Array<{ ... }>,
  //       mooe: Array<{ ... }>
  //     }
  //   },
  //   continuingCosts: {
  //     mooe: Array<{ ... }>
  //   }
  // }
  //
  // Each line item shape:
  //   {
  //     uacsCode: string,    // 10-digit UACS code, e.g., "5021103001"
  //                          // Validated against uacs_codes table
  //                          // Context-filtered: CO section → 506% codes, MOOE → 5021% codes
  //     item: string,        // e.g., "Laptop", "Software Development Contractor"
  //     office: string,      // Office location/deployment, e.g., "ICTSS", "OUSEC"
  //     fundSource: string,  // "GAA" | "Foreign-assisted" | "Locally funded" | "Other"
  //     unitCost: number,    // Per-unit price in PHP
  //     qty: number,         // Physical target (quantity)
  //     totalCost: number    // Auto-calculated: unitCost × qty
  //   }
  //
  // When a project is created in Part III.E, its section auto-appears here.
  // When a project is deleted, its cost section is removed here too.
  // projectId linkage ensures consistency across all sections.

  // B. Summary tables — AUTO-CALCULATED from yearly data, not user-editable
  //   B.1 General Summary
  //   B.2 Fund Source
  //   B.3 Statement of Expenditure (CO vs MOOE)
  //   B.4 Object of Expenditure (UACS codes)
}
```

---

## Cross-Section Data Dependencies

One of the most critical design aspects. Data entered in earlier sections flows into and constrains later sections:

```
Part I (Org Outcomes OO/SO/MFO)
  └─→ Part II.A (Strategic Concerns) — dropdown references to Part I outcomes
  └─→ Part III.E (Projects) — objectives reference Part II problems

Part II (Existing IS Inventory)
  └─→ Part III.D (Proposed IS) — "For Enhancement" items reference Part II systems
  └─→ Part IV (Continuing Costs) — maintenance of existing systems

Part III.D (Proposed Information Systems) ← CREATED FIRST (the "what")
  └─→ Part III.E (ICT Projects) ← CREATED SECOND (the "how/when/budget")
      IS-first, project-second flow:
        1. User defines proposed IS in Part III.D
        2. User creates a project in Part III.E
        3. User links the IS to the project (linkedProjectId on IS, linkedSystemIds on project)
      The guidelines state: "Ensure the Year 1 Deliverables in Part III.E
      reflect the initial design or procurement phase for this new system."
      Relationship: N:1 — multiple IS can share one project.
      EXCEPTION: Projects can exist WITHOUT linked IS (standalone infrastructure projects).
      RULE: Every proposed IS MUST be linked to a project. Not every project needs an IS.

Part III.E (ICT Projects)
  └─→ Part III.F (Performance Framework) — one KPI table per project
  └─→ Part IV (Internal/Cross-Agency costs) — project sections auto-created in Part IV

Part IV.A (Yearly Breakdowns)
  └─→ Part IV.B (Summary tables) — auto-calculated, read-only

All summaries must cross-validate:
  B.1 General Total == B.2 Fund Source Total == B.3 Expenditure Total == B.4 Object Total

CRITICAL CONSISTENCY CHECKS:
  1. Every proposed IS (Part III.D) MUST have a linkedProjectId (blocking on submit)
  2. Every project (Part III.E) must have a corresponding cost section in Part IV
  3. Project totalProjectCost must equal the sum of its yearly costs in Part IV
  4. linkedProjectId on each proposedSystem must resolve to an existing project
  5. linkedSystemIds on each project must resolve to existing proposed IS entries (warning only)
  6. Warning (not blocking) if a project has no linked IS — could be standalone infrastructure
```

---

## Page-by-Page PDF Template Mapping

The generated PDF must replicate every page of the DICT template exactly. Here's the mapping:

| PDF Page | Content | Data Source |
|----------|---------|-------------|
| **Cover** | Agency logo, "INFORMATION SYSTEMS STRATEGIC PLAN", "REGULAR ISSP" or "AMENDMENT #", period, agency name, website, CIO name/signature, scope checkboxes, Agency Head name/signature | IsspDocument + Part1.cioName |
| **ToC** | Table of Contents with page numbers | Auto-generated |
| **Definitions** | Definition of Terms table (Agency, Business Process, Chief Information Officer) | Static content — same in every ISSP |
| **Page 1** | Part I.A — Mandate (Legal Basis + Function), Vision, Mission, Org Outcome | Part1Profile fields |
| **Page 2** | Part I.B — CIO details, Focal details, Human Capital table | Part1Profile fields |
| **Page 3** | Part I.C — Stakeholder Analysis table | Part1Profile.stakeholders |
| **Page 4** | Part II.A — Strategic Concerns table | Part2Assessment.strategicConcerns |
| **Page 5** | Part II.B.1 — Network diagram (uploaded image) | Part2Assessment.networkDiagramPath |
| **Page 6** | Part II.B.2 — Cybersecurity Checklist | Part2Assessment.cybersecurityControls |
| **Pages 7-8** | Part II.C — IS Inventory (one card per system, may span pages) | Part2Assessment.informationSystems |
| **Pages 9-10** | Part II.D — EGP Checklist | Part2Assessment.egpChecklist |
| **Page 11** | Part III.A.1 — Proposed Network diagram | Part3Strategy fields |
| **Page 12** | Part III.A.2 — Proposed Cybersecurity Checklist | Part3Strategy fields |
| **Page 13** | Part III.B — Enterprise Architecture diagram | Part3Strategy.enterpriseArchDiagram |
| **Page 14** | Part III.C — Proposed ICT Human Capital | Part3Strategy.proposedHumanCapital |
| **Pages 15-16** | Part III.D — Proposed IS Inventory | Part3Strategy.proposedSystems |
| **Pages 17-18** | Part III.E.1 — Internal ICT Projects | Part3Strategy.internalProjects |
| **Pages 19-20** | Part III.E.2 — Cross-Agency ICT Projects | Part3Strategy.crossAgencyProjects |
| **Pages 21-22** | Part III.F — Performance Framework (one table per project) | Part3Strategy.performanceFramework |
| **Pages 23-26** | Part IV.A.1 — Year 1 detailed breakdown | Part4Resources.year1 |
| **Pages 27-30** | Part IV.A.2 — Year 2 detailed breakdown | Part4Resources.year2 |
| **Pages 31-34** | Part IV.A.3 — Year 3 detailed breakdown | Part4Resources.year3 |
| **Pages 35-36** | Part IV.B — Summary of Investments (4 tables) | Auto-calculated from yearly data |

### PDF Formatting Specs
- **Font**: Palatino Linotype, 11pt
- **Page**: A4 Landscape (210 x 297mm)
- **Margins**: 1 inch all sides
- **Spacing**: 1.5 line spacing
- **Header**: "INFORMATION SYSTEMS STRATEGIC PLAN {startYear} - {endYear}" on every page, with agency logo
- **Footer**: Page numbers
- **Tables**: Bordered cells, specific column widths matching the template

---

## UX Flow

### Navigation Model
Not a strict wizard — users should be able to jump between sections freely. Structure:

```
Dashboard
  └─ My ISSP Documents (list)
       └─ [ISSP Document]
            ├─ Overview (progress, quick links)
            ├─ Part I: Agency Profile
            │    ├─ A. Mandate, Vision, Mission, Outcomes
            │    ├─ B. Organization Structure (CIO, Focal, Human Capital)
            │    └─ C. Stakeholder Analysis
            ├─ Part II: Current ICT Assessment
            │    ├─ A. Strategic Concerns
            │    ├─ B. Network Infrastructure & Cybersecurity
            │    ├─ C. IS Inventory
            │    └─ D. E-Government Programs
            ├─ Part III: Proposed ICT Strategy
            │    ├─ A. Proposed Infrastructure & Cybersecurity
            │    ├─ B. Enterprise Architecture
            │    ├─ C. Proposed Human Capital
            │    ├─ D. Proposed Information Systems
            │    ├─ E. ICT Projects
            │    └─ F. Performance Measurement
            ├─ Part IV: Resource Requirements
            │    ├─ Year 1 Breakdown
            │    ├─ Year 2 Breakdown
            │    ├─ Year 3 Breakdown
            │    └─ Summary of Investments (read-only, auto-generated)
            └─ Preview & Export
                 ├─ Full document preview (HTML)
                 └─ Download PDF button
```

### Left Sidebar
Collapsible sidebar showing the ISSP structure as a tree. Each section shows a status indicator:
- Empty (gray circle)
- In Progress (yellow circle)
- Complete (green check)

### Auto-Save
- Debounced 2-second auto-save on every form field change
- Visual indicator: "Saved", "Saving...", "Unsaved changes"
- Browser beforeunload warning if unsaved changes

### Contextual Help
Each form field has an info icon tooltip containing the relevant guidance text from the Guidelines document. This helps users understand exactly what DICT expects for each field.

### Conditional Logic
- **eLGU section** (Part II.D) only shown if agency type = LGU
- **Org Outcome label** changes: "Organizational Outcomes" (NGA), "Strategic Objectives" (GOCC), "Major Final Outputs" (LGU)
- **OO/SO/MFO dropdown** in Part II.A populated from Part I.A.4 entries
- **"For Enhancement"** in Part III.D requires selecting an existing system from Part II.C
- **Project names** in Part IV dropdowns populated from Part III.E entries

### IS → Project → Budget Guided Flow (Critical UX Pattern)

The guidelines explicitly link proposed information systems to projects to budgets.
Creation order: **IS first** (the "what"), **project second** (the "how/when/budget").

#### Step 1: Define Proposed Information Systems (Part III.D) — FIRST
- User fills out IS details: name, classification, status (Development/Enhancement), platform, database, etc.
- Each IS entry gets a `linkedProjectId` field, initially null
- Warning banner on each unlinked IS: "This system has no associated project. It will not receive funding."
- After saving an IS, a prompt appears: "Create a project for [IS Name]?" → pre-fills project creation form

#### Step 2: Create ICT Projects (Part III.E) — SECOND
Two types of projects, distinguished by `projectType`:

**IS-Driven Projects** (projectType: "IS-Driven"):
- Created to deliver one or more proposed information systems
- Multi-select dropdown shows all proposed IS entries that are NOT yet linked to a project
- Selecting IS entries auto-populates `linkedSystemIds` and sets `linkedProjectId` on each IS
- Project title should align with IS name (e.g., IS "Integrated HRMS" → Project "IC-HRMS Implementation")
- This is the most common project type

**Standalone Projects** (projectType: "Standalone"):
- Infrastructure, network, or cybersecurity projects with no specific IS deliverable
- Examples: "Network Infrastructure Upgrade", "Cybersecurity Enhancement", "Cloud Migration"
- No IS linkage needed — `linkedSystemIds` is empty
- Still requires milestones, budget, and KPIs

#### Step 3: Budget per Project (Part IV) — AUTO-GENERATED SECTIONS
- When a project is created in Part III.E, a cost breakdown section auto-appears in Part IV
- Project sections in Part IV are keyed by `projectId`, not free-text
- If a project is deleted from Part III.E, its cost section is also removed from Part IV
- `totalProjectCost` in Part III.E must equal the sum of the project's yearly costs in Part IV
- If a project has zero costs across all 3 years, a warning is shown

#### Visual Relationship Map (recommended)
A dedicated tab/card showing the complete chain:

```
Proposed IS (Part III.D)          ICT Project (Part III.E)         Budget (Part IV)
─────────────────────────         ──────────────────────────       ────────────────
"Integrated HRMS"          ──→   "IC-HRMS Implementation"    ──→  Year 1: ₱21.25M
                                  (IS-Driven)                       Year 2: ₱21.25M
                                                                    Year 3: ₱21.25M

"Online Permitting"        ──→   "Digital Permits Project"   ──→  Year 1: ₱15M
                                  (IS-Driven)                       Year 2: ₱10M

(no IS)                    ──→   "Network Upgrade"           ──→  Year 1: ₱5M
                                  (Standalone)                      Year 2: ₱3M

⚠ "Citizen Feedback Sys"  ──→   (no linked project)         ──→  ⚠ No budget
```

This gives users an at-a-glance view of what's linked and what's orphaned.

#### Validation Rules for This Chain
1. **BLOCKING**: Cannot submit if any proposed IS has `linkedProjectId = null`
2. **BLOCKING**: Cannot submit if any project has zero costs across all 3 years
3. **BLOCKING**: Cannot submit if `project.totalProjectCost != sum(yearly costs)` for any project
4. **BLOCKING**: `linkedProjectId` on IS must resolve to an existing project
5. **WARNING**: Project has no linked IS (acceptable for standalone infrastructure projects)
6. **WARNING**: Multiple IS linked to one project (acceptable, just confirming intent)

---

## Implementation Phases (Build Order)

### Phase 1: Project Setup & Foundation — COMPLETE
**What was built:**
- Next.js 16 project with TypeScript, Tailwind CSS 4, Inter font
- Prisma 7 with SQLite + better-sqlite3 adapter (schema: Agency, User, IsspDocument, Part1-4)
- UACS codes imported into dev.db (1,253 entries) via Python script from uacs_full.json
- NextAuth.js v5 beta with credentials provider, JWT sessions, Edge-safe middleware
- shadcn/ui with 11 components (button, card, input, label, badge, separator, tabs, tooltip, avatar, dropdown-menu, sheet)
- Dashboard layout with sidebar navigation and header showing user role/agency
- Auth middleware protecting all routes except /login
- Seed data: DICT agency, 2 test users (admin + CIO), sample ISSP document

**Key decisions made during implementation:**
- Used SQLite instead of PostgreSQL (no Docker/Postgres available). Prisma makes migration trivial.
- Prisma 7 uses adapter pattern (`PrismaBetterSqlite3`) instead of direct connection strings
- Auth config uses `await import()` for DB to keep middleware Edge-runtime compatible
- UACS import used Python + JSON instead of raw SQL (SQLite compatibility issues with the original SQL)
- Seed script is plain JS with `better-sqlite3` directly (Prisma 7 client can't be imported outside Next.js without adapter setup)

**See `docs/project-status.md` for full setup instructions, project structure, and commands.**

### Phase 2: Part I Forms — COMPLETE
**What was built:**
- Documents list page (`/dashboard/documents`) with status badges, empty state, card layout
- ISSP Document creation dialog (title, years, scope, amendment number)
- ISSP Document editor shell: collapsible section-tree sidebar + main content area
- ISSP Document overview: 4-part card grid with links to all sections
- API routes: `/api/issp/documents` (GET list, POST create)
- API routes: `/api/issp/documents/[id]` (GET, PATCH, DELETE)
- API routes: `/api/issp/documents/[id]/part1` (GET, PUT with JSON serialization)
- Part I-A form: Mandate, Vision, Mission + dynamic Org Outcomes with nested programs (expand/collapse cards)
- Part I-B form: CIO & Focal Person fields + Human Capital grid (3 statuses × IT/Non-IT × M/F, auto-totals)
- Part I-C form: Stakeholder Analysis table (desktop table + mobile cards), complexity dropdown
- `useAutoSave` hook — debounced 1.5s save with saved/saving/unsaved/error states
- `SaveStatusIndicator` component — top-right status pill on every form page
- Enhanced dashboard home with stats cards and recent documents list
- Updated main sidebar with "My ISSP Documents" link

**Key decisions made during implementation:**
- shadcn/ui components in this project use `@base-ui/react` (NOT Radix UI) under the hood
  - Buttons: use `render={<a href="..." />}` instead of `asChild` for link-as-button pattern
  - DialogTrigger: use `render={<Button />}` instead of `asChild`
  - Select `onValueChange`: receives `string | null` (not just `string`); always guard with `v && handler(v)`
- Part I Org Outcomes label changes by agency type: OO (NGA), SO (GOCC), MFO (LGU)
- All JSON fields (orgOutcomes, humanCapital, stakeholders) are stored as strings in SQLite; API serializes/deserializes
- Document creation auto-creates all Part records (Part1–Part4) to avoid null checks everywhere

### Phase 3: Part II Forms
**Sections:**
- A: Strategic Concerns (dynamic table, OO/SO/MFO dropdown linked to Part I)
- B.1: Network Infrastructure (file upload + rich text description)
- B.2: Cybersecurity Checklist (checkbox groups in accordion/card layout)
### Phase 3: Part II Forms — COMPLETE
**What was built:**
- API route `/api/issp/documents/[id]/part2` (GET, PUT) with JSON serialization for all 4 JSON fields
- Server pages for Part II-A, B, C, D with proper data fetching
- Part II-A form: Strategic Concerns — dynamic cards linked to Org Outcomes dropdown from Part I
- Part II-B form: Network description textarea + 7-group collapsible cybersecurity checklist (30 controls)
- Part II-C form: IS Inventory — complex card-per-system UI with expand/collapse, classification badges, 
  interoperability section, and PIA tracking; summary pills (total/frontline/personal data)
- Part II-D form: EGP Checklist — 9 programs with status radio group (Utilizing/Proposed/Not Using/N/A),
  conditional detail fields per status, LGU-only eLGU section, summary count badges
- Backfill script `scripts/backfill-parts.js` to create missing Part records for old seeded docs

**Key decisions:**
- IS Inventory cards are always minimally visible (name, classification, frontline) with full detail expandable
- EGP status uses a pill-button radio group instead of a dropdown for faster scanning
- eLGU program is conditionally rendered only when `agencyType === "LGU"`
- Strategic Concerns link back to Part I OO/SO/MFO via dropdown; shows warning if Part I not filled yet

### Phase 4: Part III Forms — ✅ COMPLETE
**What was built:**
- API route `/api/issp/documents/[id]/part3` (GET, PUT) with JSON serialization for 6 JSON fields
- Server pages for all Part III sections (A, B, C, D, E.1, E.2, F)
- Part III-A form: Proposed Network description + side-by-side current vs proposed cybersecurity checklist
- Part III-B form: Enterprise Architecture guidance page with diagram upload placeholder
- Part III-C form: Proposed Human Capital table (employment status, position, IT/non-IT, auto-totals)
- Part III-D form: Proposed IS cards (status badges: New/Enhancement/Replacement/Retirement, IS linkage indicator)
- Part III-E.1/E.2 forms (shared module): ICT Projects with project type toggle (IS-Driven/Standalone),
  multi-select IS linker, strategic alignment checkboxes, 3-year milestone textareas, funding source, cost field
  — E.2 adds lead/implementing agency fields for cross-agency
- Part III-F form: Performance Framework — one collapsible KPI table per project, baseline + 3-year targets,
  data source, responsible unit, auto-initializes a row per defined project
- Part IV landing page: card grid showing Year 1/2/3 and Summary sections (navigation only)

**Key decisions:**
- `part3-e1-form.tsx` exports both `Part3E1Form` and `Part3E2Form` (shared `ProjectList` inner component)
  — `part3-e2-form.tsx` is a thin re-export module
- `ProjectCard` receives `docId` as a prop (not module-level variable) to avoid React rules violation
- Performance Framework initializes a `ProjectKpiSet` per project on mount via lazy `useState` initializer
- All `Button` components rendering as `<a>` tags require `nativeButton={false}` (Base UI requirement)

### Phase 5: Part IV Forms & Calculations — 🔄 IN PROGRESS
**Landing page:** ✅ Done — card grid linking to year breakdowns and summary

**Still to build:**
- **Year 1/2/3 pages** (`/part4/year1`, `/year2`, `/year3`) — editable cost breakdown tables:
  - API route `/api/issp/documents/[id]/part4` (GET, PUT)
  - 4 categories per year: Office Productivity, Internal Projects (one section per project),
    Cross-Agency Projects (one section per project), Continuing Costs
  - Each line item: description, UACS code (smart autocomplete), qty, unit cost, auto-computed total
  - UACS autocomplete: search-as-you-type from `uacs_active.min.json`, pre-filtered by context
    (CO section → `506%` codes, MOOE section → `5021%` codes)
  - Common ICT codes shown as quick-select chips
- **Summary pages** (`/part4/summary`) — read-only auto-calculated tables:
  - B.1 General Summary (3-year grid of category totals)
  - B.2 By Fund Source (group by fundingSource across all projects)
  - B.3 Statement of Expenditure (group by CO/MOOE)
  - B.4 Object of Expenditure (group by UACS code across all years)
- **Consistency validator** — all B.x totals must equal each other per year

**Calculation engine (`lib/calculations.ts`):**
```
For each year:
  Office Productivity subtotal = sum of all items in office productivity
  Internal Projects subtotal = sum across all internal projects
  Cross-Agency subtotal = sum across all cross-agency projects
  Continuing Costs subtotal = sum of continuing items
  Year Grand Total = sum of all 4 categories

Summary tables:
  B.1 General Summary = 3-year grid of category totals
  B.2 Fund Source = group items by fund source per year
  B.3 Statement of Expenditure = group items by CO/MOOE per year
  B.4 Object of Expenditure = group items by UACS code per year

Consistency validation:
  B.1 Grand Total == B.2 Fund Source Total == B.3 Expenditure Total == B.4 Object Total
  (per year and overall)
```

**Key components to build:**
- `CostBreakdownTable` — editable with auto-calc (unit cost × qty = total)
- `UacsCombobox` — search-as-you-type UACS code selector with context filtering
- `SummaryTable` — read-only display of auto-calculated summaries
- `ConsistencyValidator` — warns if totals don't match

### Phase 6: PDF Generation
**Implementation approach:**
1. Create a set of React components in `components/pdf-templates/` that render the exact layout of each template page
2. Build a server-side API route that:
   a. Loads all ISSP data from the database
   b. Renders each page component to HTML
   c. Applies the template CSS (Palatino Linotype, landscape A4, 1-inch margins, 1.5 spacing)
   d. Uses Puppeteer to open the HTML and print to PDF
   e. Merges all pages into a single PDF document
   f. Returns the PDF as a download

**PDF template components:**
- `CoverPage.tsx` — agency logo, title, period, CIO/Head signatures, scope checkboxes
- `TableOfContents.tsx` — auto-generated from data
- `DefinitionOfTerms.tsx` — static page
- `Part1Pages.tsx` — 3 pages (mandate/vision/mission, CIO/human capital, stakeholders)
- `Part2Pages.tsx` — variable pages (strategic concerns, network, cybersecurity, IS cards, EGP)
- `Part3Pages.tsx` — variable pages (proposed everything, projects, KPI tables)
- `Part4Pages.tsx` — variable pages (yearly breakdowns, summary tables)

**Challenge: Dynamic page counts**
Sections like IS Inventory and ICT Projects have variable numbers of entries. The PDF generator must:
- Render each IS card/project as a block that can span pages
- Insert page breaks at proper boundaries
- Update the Table of Contents with correct page numbers (requires two-pass rendering: first pass to count pages, second pass with correct page numbers)

### Phase 7: Polish, Validation & Review Mode
- Contextual tooltips with guidance text on every field
- Section-level and overall progress tracking (%)
- Review mode: read-only view of the complete ISSP with print-friendly layout
- "Submit for Review" workflow (CIO -> Agency Head approval)
- Form-level warnings for common mistakes (e.g., PIA not done for system processing personal info)
- Mobile-responsive forms (at least usable on tablets for field work)

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| PDF not matching template exactly | Build PDF templates iteratively — compare generated output against the DICT template PDF on every change. Use visual diff for verification. |
| Complex form UX (IS inventory, projects) | Use accordion/card-based progressive disclosure. Each IS or project is a collapsible card. |
| Data consistency across sections | Build a validation layer that checks cross-references on save and on PDF generation. Warn users about inconsistencies. |
| Puppeteer memory on server | Generate PDFs in a queue/worker process, cache generated PDFs, limit concurrent generations |
| Palatino Linotype font availability | Bundle the font with the app (it's a system font on Windows but not Linux) |

---

## Verification Plan

1. **Auth**: Register agency -> login -> verify role-based access
2. **Part I**: Fill all fields -> verify Human Capital auto-totals work
3. **Part II**: Add 2+ IS entries, fill cybersecurity checklist, verify EGP conditional logic
4. **Part III**: Create projects -> verify they appear in Part IV dropdowns; add KPI tables
5. **Part IV**: Enter cost items -> verify auto-calc (unit x qty = total) -> verify summary tables auto-populate -> verify cross-total consistency
6. **Cross-references**: Change an OO/SO/MFO in Part I -> verify it updates in Part II dropdown
7. **Save/Resume**: Fill Part I -> close browser -> return -> verify data persisted
8. **PDF Export**: Generate PDF -> compare side-by-side with DICT template -> verify every section, every table, every formatting detail
9. **Roles**: Login as CONTRIBUTOR -> verify cannot submit; login as CIO -> verify can submit
