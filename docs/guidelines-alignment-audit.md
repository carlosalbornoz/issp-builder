# ISSP App — Guidelines Alignment Audit
**Source:** `references/ISSP_Guidelines_2026.md`  
**Date:** 2026-05-15  
**Status:** All critical fixes applied ✅

---

## Summary of Misalignments Found & Fixed

| # | Section | Field / Area | Was (App) | Correct (Guidelines) | Severity | Status |
|---|---|---|---|---|---|---|
| 1 | Part IV A | Fund Source options | GoP, ODA, GIA, RLIP, Trust Fund | GAA, Foreign-Assisted, Locally Funded, Other Income Generating Sources | 🔴 Critical | ✅ Fixed |
| 2 | Part IV A | Column: "Office" label | "Office" | "Office Location" | 🟡 Minor | ✅ Fixed |
| 3 | Part IV A | Column: "Qty" label | "Qty" | "Physical Target" | 🟡 Minor | ✅ Fixed |
| 4 | Part III E.1/E.2 | Funding Source options | GAA, Special Purpose Fund, Internally Generated Revenue, ODA, PPP, Other | GAA, Foreign-Assisted, Locally Funded, Other Income Generating Sources | 🔴 Critical | ✅ Fixed |
| 5 | Part III E.1/E.2 | Strategic Alignment options | DICT ICT Plan, PDP, Agency Plan, GDTS, ARTA, PeGIF | Public Investment Program, National Cybersecurity Plan, E-Government Master Plan, Program Convergence Budgeting, Others | 🔴 Critical | ✅ Fixed |
| 6 | Part III E.1/E.2 | Harmonization Framework | Single text field | 5 checkboxes: National Prioritization, Resource Optimization, Interoperability Framework, Cross-Agency Collaboration, Scalability and Sustainability | 🔴 Critical | ✅ Fixed |
| 7 | Part III F | Column name | "Performance Indicator" | "Key Performance Indicators" | 🔴 Critical | ✅ Fixed |
| 8 | Part III F | Missing column | No hierarchy column | "Hierarchy of Targeted Results" (col 1): Intermediate Outcome / Immediate Outcome / Output | 🔴 Critical | ✅ Fixed |
| 9 | Part III F | Column name | "Data Source" | "Data Collection Method" | 🟡 Minor | ✅ Fixed |
| 10 | Part III D | Status options | NEW, ENHANCEMENT, REPLACEMENT, RETIREMENT | "For Development" / "For Enhancement" only | 🟡 Minor | ✅ Fixed |
| 11 | Part IV B.2 | Fund Source summary labels | Not built | GAA, Foreign-Assisted Projects (FAP), Locally Funded, Other Income | — | ⏳ Pending (summary page not built) |

---

## What is CORRECT / Aligned ✅

- Part I-A: Mandate (Legal Basis + Function), Vision, Mission, OO/SO/MFO — ✅
- Part I-B: CIO + Focal fields (Name, Position, Unit, Email, Contact) — ✅
- Part I-B: Human Capital (Plantilla/Contractual/Outsourced × IT/Non-IT × Male/Female) — ✅
- Part I-C: Stakeholder complexity options (Simple/Complex/Highly Technical) — ✅
- Part II-A: Strategic Concerns columns (OO/SO/MFO, Critical System, Problem, Intended ICT Use) — ✅
- Part II-B: Cybersecurity checklist categories and controls — ✅
- Part II-C: IS Inventory fields (Name, Classification, Dev Strategy, Platform, DB, Storage, Users, Owner, Interoperability, PIA) — ✅
- Part II-D: EGP Checklist programs (eLGU, eGovPay, PNPKI, HCMIS, IFMIS, etc.) — ✅
- Part III-A: Same structure as Part II-B — ✅
- Part III-C: Proposed Human Capital — ✅
- Part III-D: IS fields same as Part II-C, status now "For Development"/"For Enhancement" — ✅
- Part III-E.1/E.2: Project fields (Title, Description, Objectives, Duration, Deliverables, Implementing Unit, Total Cost, Lead/Implementing Agency for E.2) — ✅
- Part III-E.1/E.2: Strategic Alignment (5 correct options) — ✅
- Part III-E.1/E.2: Harmonization Framework (5 checkboxes) — ✅
- Part III-F: All 6 columns present (Hierarchy, KPI, Baseline, Targets, Data Collection Method, Responsibility) — ✅
- Part IV A: Categories (Office Productivity, Internal ICT Projects, Cross-Agency, Continuing Costs) — ✅
- Part IV A: CO vs MOOE classification — ✅
- Part IV A: Fund Source (GAA, Foreign-Assisted, Locally Funded, Other Income Generating Sources) — ✅
- Part IV A: Column labels "Office Location" and "Physical Target" — ✅

---

## Remaining / Pending

- **Part IV Summary page** (`/part4/summary`) — not yet built. When built, use these labels per guidelines:
  - B.1: General Summary (Office Productivity / Internal ICT Projects / Cross-Agency ICT Projects / Continuing Costs)
  - B.2: By Fund Source (GAA / Foreign-Assisted Projects (FAP) / Locally Funded / Other Income)
  - B.3: Statement of Expenditure (Capital Outlay / MOOE)
  - B.4: Object of Expenditure (grouped by UACS code)

- **"Others (specify)" in Strategic Alignment** — currently a checkbox only; guidelines say "Others (specify)" implying a text input when checked. Low priority.
