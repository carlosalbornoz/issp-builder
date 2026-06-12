# Guidelines in Accomplishing the Revised ISSP Template v. 2026

> Source: Department of Information and Communications Technology (DICT)  
> Reference for: Government agencies drafting their Information Systems Strategic Plan (ISSP)  
> **Template version: v2** (`ISSP Template 2026_v2.pdf`, received 2026-06-12). Verified
> against the original 043026 PDF page-by-page (text + render diff): the only substantive
> change is in Part II.D item 3 (PNPKI), where the internal DICT note *"(For GSSPD's
> consideration to consult GDTB-DCD)"* was removed — the adoption-percentage instruction
> stands. No field, option, taxonomy, or layout changes anywhere else; this document
> required no content updates.

---

## PART I: AGENCY PROFILE & STRATEGIC CONTEXT

*Establishes the foundation of the ISSP by aligning ICT initiatives with the agency's legal mandate and leadership structure.*

### A. Mandate, Vision, Mission, and Organizational Outcome

Directly lift these statements from official documents like the Strategic Plan or Citizen's Charter.

**A.1 Mandate** — Describe the legal or official function and responsibilities of the agency as defined by law, executive order, or other official issuance.
- **Legal Basis:** Cite the specific law or executive order (e.g., RA 10844 for DICT) that created the agency.
- **Function:** Ensure functions listed are directly derived from the legal instrument cited in the Legal Basis.

**A.2 Vision Statement** — State the organization's intended future direction or long-term desired position.

**A.3 Mission Statement** — Outline the agency's core purpose and primary objectives (what the agency does, for whom, and how).

**A.4 Organizational Outcome** — Categorize by agency type:
- **NGA:** Organizational Outcomes (OO)
- **GOCC:** Strategic Objectives (SO)
- **LGU:** Major Final Outputs (MFO)
- Include programs under each OO/SO/MFO.

---

### B. Organizational Structure

**B.1 CIO & ISSP Focal Person** — Provide complete information for both:

| Field | CIO | ISSP Focal |
|---|---|---|
| Full Name | First Name, MI, Last Name | First Name, MI, Last Name |
| Plantilla Position | ✓ | ✓ |
| Organizational Unit | ✓ | ✓ |
| Official E-mail | ✓ | ✓ |
| Contact Number/s | ✓ | ✓ |

**B.2 Human Capital** — Provide physical count of personnel categorized by:
- Employment status: Plantilla / Contractual / Outsourced
- Role type: IT / Non-IT
- Gender (GAD compliance): Male / Female

---

### C. Stakeholder Analysis

Identify groups affected by ICT programs (citizens, other agencies, LGUs, private sector, NGOs) and classify transaction complexity:

| Type | Description | Processing Time |
|---|---|---|
| **Simple** | Ministerial actions only; routine, inconsequential issues | Max 3 working days |
| **Complex** | Requires in-depth evaluation; determined by the office concerned | Max 7 working days |
| **Highly Technical** | Requires technical knowledge, specialized skills, or training | Max 20 working days |

---

## PART II: CURRENT ICT ASSESSMENT

*A detailed report of the agency's existing digital environment.*

### A. Strategic Concerns for ICT Use

Map critical business systems to specific problems and explain how ICT is intended to solve them.

| Column | Field | Description |
|---|---|---|
| a | OO/SO/MFO | Refer to Part I.A.4. List those that ICT can enhance. |
| b | Critical Business System | Describe actual operations/activities performed. |
| c | Problem | Barriers/obstacles that hinder or delay performance. |
| d | Intended Use of ICT | ICT solution to address identified problems. Consider: (1) Is automation/digitalization possible and necessary? (2) Will it improve efficiency and service delivery? |

---

### B. Existing Network Infrastructure

**B.1 LAN/WAN Set-up** — Illustrate through a diagram:
- Connectivity type (fiber, DSL, broadband, etc.)
- Upload/download speeds per office/site
- IPv6 readiness
- Cybersecurity components highlighted
- For department-wide: show connectivity among central office and attached offices/agencies
- Show central office-to-branch/regional office connectivity

**B.2 Cybersecurity Control Checklist**

#### Physical Security
| Control | Status |
|---|---|
| Perimeter Protection | **Mandatory** |
| Access Control | **Mandatory** |
| Surveillance System | **Mandatory** |
| Detection System | Optional |

#### Perimeter Security
| Control | Status |
|---|---|
| Next Generation Firewalls | **Mandatory** |
| Intrusion Detection/Prevention Systems (IDS/IPS) | **Mandatory** |
| Web Application Firewalls (WAFs) | **Mandatory** |
| Demilitarized Zone (DMZ) | Optional |

#### Network Security
| Control | Status |
|---|---|
| Data Encryption | **Mandatory** |
| Network Segmentation | Optional |

#### Endpoint Security
| Control | Status |
|---|---|
| Anti-virus and Anti-malware Software | **Mandatory** |
| Application Control | **Mandatory** |
| BYOD Security | **Mandatory** |
| Extended Detection and Response (XDR) | Optional |

#### Data Security
| Control | Status |
|---|---|
| Data Classification | **Mandatory** |
| Data Loss Prevention (DLP) | **Mandatory** |
| Data Backups and Recovery | **Mandatory** |

#### Application Security
| Control | Status |
|---|---|
| Regular Security Scanning and Testing | **Mandatory** |

#### Other Measures (all Optional/Best Practice)
- Vulnerability Assessment
- Patch Management
- Strong Password Policies
- Multi-Factor Authentication (MFA)
- Access Reviews
- Security Logs
- Log Analysis
- Incident Response Plan
- Security Information and Event Management (SIEM)
- Penetration Testing
- Secure Software Development Life Cycle (SDLC)

---

### C. Existing/Operational Information Systems (IS) Inventory

For every operational system, provide the following fields:

| Field | Guidance |
|---|---|
| **IS Name** | Descriptive of the business process it represents |
| **Classification** | Support to Operations / General Administrative / Operations (Frontline or Non-Frontline) |
| **Description & Purpose** | Salient features, functionalities, reports generated |
| **Development Strategy** | In-house / Outsourced / Combination / Off-the-shelf (COTS) |
| **Development Platform** | Tools/technologies used (e.g., Visual Studio, Supabase, Firebase, Retool) |
| **Database Name** | Related to IS served; descriptive of data sets |
| **Data Storage** | How/what form data is stored/preserved |
| **Internal Users** | Units within the organization with access |
| **External Users** | External orgs/stakeholders with restricted access |
| **Owner** | Organizational unit for which IS was developed |

**Interoperability** — Evaluate across four dimensions:
1. **Integrated with another system** — direct technical connection or automated data exchange
   - i.a. Internal Systems (within own agency)
   - i.b. External Systems (other agencies, e.g., GSIS, PhilGEPS, DICT eGov portal)
     - Data Generation for Others (acts as source of truth/data provider)
     - Data Processing from Others (consumes/receives external data)
2. **Deployed on a shared platform** — same physical server, private cloud, or Government Common Platform

**Privacy Impact Assessment (PIA)**:
1. Determine if system collects/stores/processes personal information (names, addresses, photos, etc.)
2. Mandatory Disclosure: Explicitly state "Yes" or "No"
3. Audit Status: If "Yes," indicate whether formal PIA has been conducted; if not, flag as a gap to address.

---

### D. E-Government Programs (EGP) Checklist

Report adoption levels for national programs including:
- eLGU
- eGovPay
- PNPKI
- HCMIS
- IFMIS

---

## PART III: PROPOSED ICT STRATEGY

*The roadmap for future technology investments and developments.*

### A. Proposed Network Infrastructure

Same structure as Part II.B (existing), but for proposed/future state:
- **A.1 LAN/WAN Set-up** — diagram with proposed connectivity type, speeds, IPv6, and cybersecurity components
- **A.2 Cybersecurity Control Checklist** — same categories as Part II.B.2 (Mandatory/Optional items)

---

### B. Enterprise Architecture

Illustrate the proposed enterprise architecture defining the agency's structure and operation:
- Identify and rationalize legacy systems, business processes, data assets, and ICT infrastructure
- Design interoperable, secure, and scalable digital government solutions
- Guide digital investment decisions aligned with strategic outcomes and public service delivery goals

---

### C. Proposed ICT Human Capital

Provide information on proposed ICT human capital to support day-to-day operations and proposed ICT project implementations.

---

### D. Proposed Information Systems

List systems proposed for development or enhancement.

| Field | Guidance |
|---|---|
| **IS Name** | Descriptive of the business process |
| **Classification** | Support to Operations / General Administrative / Operations (Frontline or Non-Frontline) |
| **Description & Purpose** | Features, functionalities, reports; for enhancements, indicate what will be changed |
| **Status** | For Development or For Enhancement |
| **Development Strategy** | In-house / Outsourced / COTS / Hybrid |
| **Development Platform** | Tools/technologies (e.g., Visual Studio, Supabase, Firebase, Retool) |
| **Database Name** | Related to IS; descriptive of data sets |
| **Data Storage** | How data will be stored/preserved |
| **Internal Users** | Units with access |
| **External Users** | External orgs with restricted access |
| **Owner** | Organizational unit |
| **Interoperability** | Same four dimensions as Part II.C |
| **PIA** | Determine, disclose, and plan for personal data processing |

**Status Guidance:**

*For Development* (new systems):
- Being built from scratch for a new strategic concern or mandate
- Transitioning from manual to automated/digital process
- Ensure "Year 1 Deliverables" in Part III.E reflect the initial design or procurement phase

*For Enhancement* (existing systems from Part II.C inventory):
- Adding new modules/functionalities
- Upgrading the development platform
- Improving interoperability
- Enhancement must directly address Problems identified in Part II.A
- Re-evaluate PIA if more data points are being collected

**PIA for Proposed Systems:**
1. **Determine:** Will it collect/store/process personal information?
2. **Predictive Assessment:** Project whether the future system will process personal data
3. **Strategic Planning:** If "Yes," include a PIA phase and privacy-by-design features in the project roadmap

---

### E. ICT Projects

#### E.1 Internal ICT Projects

Fields for each project:

| Field | Guidance |
|---|---|
| **Project Title** | Distinct, formal name (e.g., "Integrated Cloud-Based HRMS (IC-HRMS)"); avoid generic titles |
| **Description** | High-level summary; classify initiative type (Enterprise Web App, Infrastructure Overhaul, Cloud Migration, Cybersecurity Enhancement) |
| **Objectives** | Specific pain points from Part II that this project solves; focus on the "Why" |
| **Strategic Alignment** | Map to national/agency plans |
| **Harmonization Framework** | Fit into broader government ICT ecosystem |
| **Duration** | e.g., 2026–2028, per ISSP coverage |
| **Year 1 Deliverables/Milestone** | Policies, training, IS, infrastructure |
| **Year 2 Deliverables/Milestone** | Policies, training, IS, infrastructure |
| **Year 3 Deliverables/Milestone** | Policies, training, IS, infrastructure |
| **Implementing Unit** | Specific office/division responsible |
| **Total Project Cost** | Must match sum of yearly costs in Part IV |
| **Funding Source** | GAA / Foreign-Assisted / Locally Funded / Other Income Generating Sources |

**Strategic Alignment Options:**
| Option | When to Check |
|---|---|
| Public Investment Program | Project requires Capital Outlay (CO) exceeding threshold; supports PDP long-term targets |
| National Cybersecurity Plan | Project includes security software (Firewalls, WAF, MFA), SOC, or protects sensitive data |
| E-Government Master Plan | System integrates with other agencies, uses GovNet/PNPKI, or digitizes manual frontline services |
| Program Convergence Budgeting | Joint initiative with other agencies; funding requested by multiple offices for a single goal |
| Others (specify) | Aligned with other national/agency-level plans not listed above |

**Harmonization Framework Options:**
| Option | When to Check |
|---|---|
| National Prioritization | Cabinet-level priority or mandatory for participation in national platform (e.g., eGov PH Super App) |
| Resource Optimization | Leverages existing government resources (CSE, GovNet, Government Cloud) to reduce redundant CO |
| Interoperability Framework | System includes API layer or data-sharing module for cross-agency use (PeGIF compliance) |
| Cross-Agency Collaboration | Part of a JMC or shared service agreement with other government entities |
| Scalability and Sustainability | Includes Security and Privacy Assessment for Risk (SPAR) mechanism; KPIs align with PREXC |

---

#### E.2 Cross-Agency ICT Projects

Same fields as E.1, plus:

| Additional Field | Guidance |
|---|---|
| **Lead Agency** | Primary agency responsible for overall project management and accountability |
| **Implementing Agency** | Partner agencies responsible for specific technical components or contributions |

Project Title should reflect collaborative nature (e.g., "National Single Window System," "Inter-Agency Health Data Exchange").

---

### F. Performance Measurement Framework

One table per ICT project (internal and cross-agency). Table header = Project Title.

| Column | Field | Description |
|---|---|---|
| 1 | Hierarchy of Targeted Results | Intermediate Outcome → Immediate Outcome → Output |
| 2 | Key Performance Indicators | Measurable indicators proving outcomes/outputs achieved |
| 3 | Baseline Data | Corresponding data prior to project implementation |
| 4 | Targets | Targets for each KPI using baseline as reference |
| 5 | Data Collection Method | Method for gathering required data (e.g., mandatory reporting, BI module) |
| 6 | Responsibility to Collect Data | Unit (internal or external) responsible; data analyzed and submitted by M&E Teams to DICT |

**Hierarchy Definitions:**
- **Intermediate Outcome:** Changes in behavior of targeted stakeholders as a result of the ICT project
- **Immediate Outcome:** Enhancements in institutional capabilities upon implementation
- **Output:** Completed deliverables from installation/implementation within project lifetime

---

## PART IV: RESOURCE REQUIREMENTS

*The financial and logistical breakdown of the three-year plan.*

### A. Detailed Resource Deployment and Cost Breakdown

Create **three separate annual tables** (Year 1, Year 2, Year 3).

**Four Strategic Categories:**

| Category | Description |
|---|---|
| Office Productivity | General hardware/software for daily admin tasks (standard PCs, MS Office licenses) |
| Internal ICT Projects | Costs directly linked to development/implementation of agency-specific systems (from Part III.E.1) |
| Cross-Agency ICT Projects | Agency's financial contribution to integrated government projects (from Part III.E.2) |
| Continuing Costs/Expenses | Recurring costs: maintenance, license renewals, annual support contracts |

**DBM Classification:**

| Classification | Definition |
|---|---|
| Capital Outlay (CO) | Assets lasting more than 1 year exceeding capitalization threshold (servers, high-value equipment, perpetual licenses) |
| MOOE | Recurring costs and small-value items (subscriptions, ICT supplies, repairs) |

**Table Fields:**

| Field | Guidance |
|---|---|
| Item | Specific ICT requirement (hardware/software/training/services) |
| Office Location | Where item will be deployed (central office or regional offices) |
| Fund Source | GAA / Foreign-Assisted / Locally Funded / Other Income Generating Sources |
| Unit Cost | Current market price per unit (include taxes and delivery fees) |
| Physical Target | Units needed per year (Year 1, 2, 3) |
| Total Cost | Unit Cost × Quantity (auto-calculated) |

**Key Guidelines:**
1. **Consistency Check:** Grand Totals must exactly match the Summary of Investments
2. **Project Linkage:** Costs must directly support milestones in Part III.E (e.g., if "Training" is a Year 2 milestone, include a "Training Expenses" line in Year 2)
3. **Inflation Cushion:** For Year 3, include a slight adjustment for market price increases or currency fluctuations on imported hardware

---

### B. Summary of Investments

**B.1 General Summary** — Groups total ICT investments into functional categories:
- Office Productivity
- Internal ICT Projects *(must match total from Part III.E.1)*
- Cross-Agency ICT Projects *(must match total from Part III.E.2)*
- Continuing Costs

**B.2 Fund Source** — Identifies financial origin per year:
- General Appropriations Act (GAA)
- Foreign-Assisted Projects (FAP)
- Locally Funded
- Other Income (GOCCs/agencies with own revenue)

> Grand Total across all fund sources must match the General Summary Grand Total.

**B.3 Statement of Expenditure** — Categorizes budget by nature of expense:
- **Capital Outlay (CO):** Physical/intangible assets with useful life >1 year exceeding government capitalization threshold (usually PHP 50,000/unit); includes major hardware and initial system development
- **MOOE:** Recurring costs, subscriptions, consumables, low-value assets; internet/software subscriptions, cloud hosting, minor repairs, ICT office supplies

**B.4 Object of Expenditure** — Maps costs to UACS (Unified Accounts Code Structure):
- ICT Equipment
- Printing Equipment
- Semi-Expendable ICT Equipment (below PHP 50,000 threshold)
- ICT Software (perpetual licenses or capitalized dev costs)
- ICT Software Subscription (recurring monthly/annual fees)

> Always check the latest DBM UACS manual for correct object codes.

**Key Filling-In Reminders:**
1. **Horizontal and Vertical Consistency:** Grand Total must be identical across all four tables (General Summary, Fund Source, Statement of Expenditure, Object of Expenditure)
2. **PREXC Alignment:** Totals must align with Program Expenditure Classification (PREXC) to link budget to organizational outputs
3. **Inflation Adjustment:** For Years 2 and 3, apply a 3–5% inflation buffer for hardware and subscription costs

---

## UNIFORMITY REQUIREMENTS

| Requirement | Specification |
|---|---|
| Font Type | Palatino Linotype |
| Font Size | 11 |
| Page Orientation | Landscape |
| Spacing | 1.5 |
| Paper Type | A4 (210 × 297 mm) |
| Page Margin | 1 inch on all sides |
| Header | Replace DICT logo with Agency logo |

---

## ANNEX 1: EXISTING ICT ASSET INVENTORY

Comprehensive inventory of all ICT assets currently owned, leased, or utilized by the agency. Submitted as a separate annex alongside the main ISSP document.

---

### 1. ICT Equipment Inventory

**Columns:** ICT Resources | Office Location | Operational | End of Life | Backup

Each equipment type has two rows (Central Office, Field/Regional Office) plus an auto-calculated Total row.

| Equipment Type | Notes |
|---|---|
| Servers | |
| Desktop | |
| Laptop | |
| Mobile Phone | |
| Tablet | |
| Printer | |
| Network Switch | |
| Others | Open-ended; user may add rows as needed |

**Column definitions:**
- **Operational** — Number of units currently in active use
- **End of Life** — Number of units that have reached or exceeded end-of-life
- **Backup** — Number of units kept as spare/backup

**Office locations per row:**
- Central Office
- Field/Regional Office
- **Total** (auto-calculated: Central + Field/Regional)

---

### 2. ICT Software Inventory

**Columns:** ICT Resources | Office Location | Perpetual | Subscription

Each software type has two rows (Central Office, Field/Regional Office) plus an auto-calculated Total row.

| Software Type | Notes |
|---|---|
| Office Productivity Tool | e.g. Microsoft 365, LibreOffice |
| Grammar Checker | e.g. Grammarly |
| Graphics and Simulation Software | |
| Antivirus | |
| IT Help Desk Tool | |
| Photo and Video Editing Software | |
| Web Application Firewall | |
| Others | Open-ended; user may add rows as needed |

**Column definitions:**
- **Perpetual** — Number of licenses that are perpetually owned (one-time purchase)
- **Subscription** — Number of licenses under active subscription

**Office locations per row:**
- Central Office
- Field/Regional Office
- **Total** (auto-calculated: Central + Field/Regional)

---

**Source:** `[Reference] ANNEX 1 - Existing ICT Resource Inventory.pdf` (3 pages)

---

## ANNEX 2: DISASTER RECOVERY AND BUSINESS CONTINUITY PLAN (DRBCP) FOR ICT RESOURCES

*Aligned with DICT standards, ISO 22301, and MITHI Resolution 2025-01.*

### 1. Plan Governance and Strategy

- **ICT Disaster Recovery Team (DRT):** Key personnel (Commanders, Coordinators, Technical Leads) with 24/7 contact details
- **Risk Assessment (RA):** Identify potential threats (earthquakes, typhoons, cyberattacks/ransomware, power outages) and likelihood
- **Business Impact Analysis (BIA):** Classify ICT services as Mission-Critical using:
  - **MTPD** (Maximum Tolerable Period of Disruption): Time a service can be down before irreparable harm
  - **RTO** (Recovery Time Objective): Target time for restoring a system
  - **RPO** (Recovery Point Objective): Maximum tolerable data loss (e.g., "Must restore data up to 4 hours before the crash")

### 2. Comprehensive ICT Component Inventory

Every ICT component affected by a disaster must be documented:
- **Hardware & Infrastructure:** Servers (physical/virtual), storage arrays (SAN/NAS), network equipment (routers, switches, firewalls)
- **Data and Databases:** Primary database locations; personal information processing status (linked to PIA)
- **Applications/Software:** Core administrative systems (HRIS, Payroll) and frontline service portals
- **Connectivity:** Internet leased lines, GovNet connections, VPN gateways
- **Support Utilities:** UPS, precision cooling units, fire suppression systems in the Data Center

### 3. Recovery Strategies (Technical Architecture)

- **Off-site Backup Management:** Geographically separate location (at least 30km away)
- **Cloud-Based Recovery:** Government Common Platform (GovCloud) for Hot/Warm standby sites with near-instant failover
- **Redundancy (High Availability):** Redundant hardware and dual-ISP providers to prevent Single Point of Failure (SPOF)
- **Data Synchronization:** Synchronous (zero data loss) or Asynchronous (periodic updates) replication

### 4. Operational Procedures (The Action Plan)

- **Declaration Phase:** Criteria for officially declaring a Disaster and activating the DRBCP
- **Evacuation & Safety:** Procedures for securing hardware and ensuring staff safety before technical recovery
- **Restoration Phase:** Technical procedures to restore servers, reconfigure networks, verify data integrity
- **Resumption Phase:** Transitioning from backup systems back to primary systems ("Failback")

### 5. Compliance, Scalability, and Sustainability

Per MITHI Resolution 2025-01 and SPAR (Security and Privacy Assessment for Risk):
- **Cybersecurity Integration:** Include a Cyber-Recovery component for malware/ransomware scenarios
- **Testing and Maintenance:** At least 1 full-scale DR simulation per year + semi-annual tabletop exercises
- **Audit and Review:** Annual review or whenever a major ICT infrastructure change occurs
- **UACS and Budgeting:** Include off-site storage, DR site subscriptions, and emergency equipment repairs in Part IV Continuing Costs

### DRBCP Key Performance Indicators

| Indicator | Target Metric |
|---|---|
| System Availability | 99.9% uptime (excluding planned maintenance) |
| RTO Achievement | Recovery within [X] hours of declaration |
| Backup Success Rate | 100% successful daily automated backups |
| Testing Frequency | 1 comprehensive exercise per year |

---

# MITHI Steering Committee Resolution No. 2025-01

> **Full Title:** Resolution Establishing the Scope, Process, Criteria for the Prioritization and Endorsement of MITHI  
> **Adopted:** February 14, 2025  
> **Issuing Body:** Medium-Term Information and Communications Technology Harmonization Initiative (MITHI) Steering Committee  
> — Co-Chaired by DICT and DBM; NEDA as Vice-Chairperson  
> **Scope:** Departments, NGAs, GOCCs, SUCs, CFAG, and other government instrumentalities requesting national budget funding for ICT-related PAPs for FY 2026  
> **Reference:** Complements DBM National Budget Memorandum No. 153 (December 27, 2024) / National Budget Call for FY 2026

---

## Legal Basis and Context

- **Joint Memorandum Circular No. 2024-01** (DICT + DBM, with NEDA as Vice Chair) — tasks MITHI Steering Committee with ensuring national ICT harmonization, cross-agency interoperability, elimination of duplication, and alignment with TRIP and Program Convergence Budgeting (PCB)
- **DBM-NEDA Joint Circular No. 2024-02** — Revised Policy Guidelines for the formulation of the Three-Year Rolling Infrastructure Program (TRIP)
- **RA 12116 (GAA FY 2025), Section 25** — All ICT requirements must align with the agency's ISSP; the ISSP must adhere to MITHI policies and guidelines
- All ICT projects shall align with the **Philippine Development Plan (PDP) 2023–2028**, the **2030 Agenda for Sustainable Development Goals**, and **AmBisyon Natin 2040**

---

## ANNEX A: Guidelines for ICT-Related Proposals and Budget Preparation Requests

### 2.0 Criteria for ICT Project Review and Endorsement by MITHI

#### 2.1 National Prioritization

All ICT projects shall be anchored on the National Government's PDP 2023–2028 commitments and aligned with:

| Framework | Description |
|---|---|
| **TRIP** | Three-Year Rolling Infrastructure Program for FYs 2026–2028; per DBM-NEDA Joint Circular No. 2024-02 |
| **PCB** | Program Convergence Budgeting for Public Financial Management Systems; per EOs No. 29 (s. 2023) and No. 170 (s. 2022) |
| **PIP** | Public Investment Program 2023–2028; per NEDA Memorandum on Updating the PIP |

**Policy context:** Digital transformation of government produces more efficient service delivery, greater transparency, fewer corruption opportunities, and better data systems for programs like targeted social protection.

---

#### 2.2 Resource Optimization

- MITHI shall encourage **resource pooling, multi-tenant platforms**, and similar digital infrastructures to reduce costs
- As part of evaluation, MITHI shall consider how agencies **utilized previous year's budgets** and implementation progress of mandated programs

**FY 2026 ICT budget proposals shall aim to:**

| Goal | Description |
|---|---|
| Manage inflation | Address the lingering effect of inflation on ICT costs |
| Support infrastructure | Investments given its multiplier effect in boosting the Philippine economy |
| Sustain digitalization | Continue digitalization of public financial management for bureaucratic efficiency and transparent service delivery |
| Balanced development | Strike balance on geographical budgetary needs across regions (not just NCR); enable LGUs through capacity development |

---

#### 2.3 Interoperability Framework

A structured approach to technical review ensuring seamless integration, cost efficiency, and standardization across ICT financial planning, procurement, and usage.

**Interoperability Layers** (aligned with PeGIF — Philippine eGovernment Interoperability Framework, DOST 2013):

| Layer | Description |
|---|---|
| Interconnection | Standards for networks and system development to enable communication between systems |
| Data Integration | Standards for data description enabling exchange between disparate systems |
| Content Management & Metadata | Standards for retrieving and managing government information |
| Information Access & Presentation | Presentation of data to users through various means of access to e-government services |

> MITHI shall promote **open standards**, **secure open-source application development**, **APIs**, and other similar technologies to ensure system interoperability.

---

#### 2.4 Cross-Agency Collaboration

| Responsibility | Description |
|---|---|
| Standardize templates | Standardize procedures and mechanisms for streamlining ICT PAPs into clearly defined cost categories |
| Procurement frameworks | Together with GPPB and PS-DBM, develop standardized procurement policies and frameworks to enable shared ICT services |
| ICT training | Provide recommendations on standardized ICT training and workforce development to enhance ICT investment efficiency and foster skill-sharing |
| Common systems | Recommend systems subject to collaboration between Departments, NGAs, GOCCs, SUCs, CFAG, and other instrumentalities |

---

#### 2.5 Scalability and Sustainability

| Mechanism | Description |
|---|---|
| **SPAR** | MITHI shall establish a **Security and Privacy Assessment for Risk** reporting mechanism to ensure ICT proposals comply with all relevant rules and regulations |
| **UACS Governance** | MITHI shall establish a unified financial data governance mechanism compliant with the **Unified Accounts Code Structure (UACS)** for data consistency across ICT PAPs |
| **KPIs / PREXC** | MITHI shall define KPIs to monitor and track endorsed ICT projects in accordance with DBM's **Program Expenditure Classification (PREXC)** |

---

### 3.0 Process for ICT Project Review and Endorsement by MITHI

#### 3.1 Process Flow

| Step | Action |
|---|---|
| 3.1.1 | Agency enrolls TRIP and PCB ICT projects with NEDA and PCB lead agencies |
| 3.1.2 | Agency submits ISSP with proposed ICT projects/programs to DICT |
| 3.1.3 | Agency submits ICT project proposals from endorsed ISSP through **OSBP System v2.0** |
| 3.1.4 | MITHI Secretariat assists DBM Budget Analysts for clarification and faster processing |
| 3.1.5 | DICT identifies ICT projects for harmonization/interoperability and sends list to MITHI Secretariat |
| 3.1.6 | MITHI Steering Committee deliberates and endorses ICT project proposals; may require agencies to undergo an **ICT Budget Briefing (IBB)** |
| 3.1.7 | DICT conducts technical review of ISSP; once compliant with completeness and technical requirements, DICT endorses the ISSP |

---

#### 3.2 Projects Enrolled in TRIP and PCB

**TRIP Process:**

| Step | Action |
|---|---|
| 3.2.1.1 | All proposed ICT-related PAPs must be included in the agency's ISSP, subject to DICT rules |
| 3.2.1.2 | Upon notice, agencies submit TRIPs to NEDA via the **Public Investment Program Online (PIPOL) System** |
| 3.2.1.3 | Submissions reviewed and incorporated by INFRACOM/TRIP Secretariat into a consolidated TRIP |
| 3.2.1.4 | Consolidated TRIP presented to **INFRACOM** in Q1 for approval |
| 3.2.1.5 | TRIP submitted by NEDA to DBM upon INFRACOM approval for: (a) budget program level determination (DBCC); (b) agency budget ceiling consideration; serves as basis for NEP; updated annually for Forward Estimates |

**PCB Process:**

- Follow **National Budget Memorandum No. 150** (Budget Preparation Activities and Documentary Requirements for Priority Programs Under the PCB Approach, February 5, 2024)
- PCB lead agency must ensure participating agencies' contributions are reasonable, appropriate, and aligned with PCB Program goals
- Both participating and lead agency must ensure PCB proposals are prepared coordinately
- Any inconsistency between hard copy and encoded data in OSBP v2.0 → **encoded data prevails** as the official submission

**Endorsement Deadlines:**

| Tier | Deadline |
|---|---|
| Tier 1 ICT project proposals | February 28, 2025 |
| Tier 2 ICT project proposals | On or before May 5, 2025 |

If TRIP/PCB projects fail to meet evaluation criteria → subjected to an **ICT Budget Briefing (IBB)**.

---

#### 3.3 Submission of ISSP

**Key Rules:**

| Rule | Detail |
|---|---|
| Legal basis | RA 12116 (GAA FY 2025), Section 25; DICT Memorandum Order No. 237 (May 23, 1989) |
| Coverage for new submissions | ISSP covering FY 2027–2029 must be received by DICT on or before **April 30, 2025** |
| Amendments after April 30, 2025 | Will follow new guidelines to be released by MITHI |
| Agencies with already-approved ISSP | Not covered by item 3.3.1 provisions |

**Physical Submission:**

- Submit to: **DICT Central Office — Central Receiving and Releasing Unit (DICT-CRRU)**, Carlos P. Garcia Avenue, U.P. Campus, Diliman, Quezon City
- Electronic copy via email: [crru@dict.gov.ph](mailto:crru@dict.gov.ph) and [issp@dict.gov.ph](mailto:issp@dict.gov.ph)

**Digital notification copy:**
- Email to: [secretariat@mithi.gov.ph](mailto:secretariat@mithi.gov.ph)
- File naming: `Agency Name_ISSP_Years Covered` (e.g., `DBM_ISSP_2025-2027`)
- Email subject: same as file name
- File format: PDF

**DICT Technical Review Process (GDTB-GSSPD):**

| Step | Action |
|---|---|
| 1 | GDTB-GSSPD confirms completeness of documentary requirements; incomplete submissions not processed |
| 2 | Evaluator assigned; Initial Evaluation Report issued to the IS Planner |
| 3 | Requesting Agency revises ISSP per Initial Evaluation Report and resubmits |
| 4 | Upon compliance, GDTB-GSSPD schedules Executive Panel Review Committee |
| 5a | Panel may require further revisions (technicalities, feasibility, justification, alignment) |
| 5b | Panel may instruct GDTB-GSSPD to notify agency to submit final documents for endorsement by Undersecretary for E-Government (OUEG) |

**Final submission for endorsement requires:**
- 2 hard copies, originally signed by: (1) IS Planner and (2) Head of Agency / Chairperson of the Board / SUC President
- 2 soft copies (1 PDF + 1 Word format) in a removable flash drive

**After endorsement:**
- DICT-stamped endorsed ISSP and duly signed endorsement letter released to requesting agency
- Copy of endorsement letter sent via email, copy furnished DBM or GCG
- Requesting agency transmits copy of DICT-stamped endorsed ISSP to DBM

**MITHI Secretariat role:** Will coordinate to address unresolved issues or delays; will release a certification that the submitted ISSP may be used for budget review.

**Exclusions from ISSP Submission Requirement (Section 3.3.10):**
- Constitutional Fiscal Autonomy Groups (CFAG): the Judiciary and Constitutional Commissions are excluded from mandatory ISSP submission to MITHI, in respect of the constitutional provision on fiscal autonomy (Philippine Constitution, Article VIII Section 3; Article IX Section 5)

---

#### 3.4 Online Submission of Budget Proposals (OSBP System v2.0)

- System URL: [http://osbp.dbm.gov.ph](http://osbp.dbm.gov.ph)
- Login allows user to view and select Operating Units under the Department and Agency (coverage: Department → Agency → Region → Division)
- Entries in completed BP Forms shall be encoded by **authorized agency representatives**
- After encoding, system generates and prints **2 sets of hard copies** of all BP Forms (including "Not Applicable" forms) for submission to DBM
- Hard copy must contain exact information as encoded; in case of discrepancy, **soft copy/encoded data prevails**
- Government Initiative Indicators (TAGS) identify priority programs in support of government initiatives

**Hard copy submission addresses:**

| Agency Type | Submission To |
|---|---|
| All NGAs including UP System, PERSI, and MSU System | Administrative Service — Central Records Division, Ground Floor, DBM Building III, General Solano St., San Miguel, Manila |
| Rest of SUCs, MMDA, and Metro Baguio-area authorities | DBM Regional Offices concerned |

**Reference:** DBM National Budget Memorandum No. 153, Annex C — FY 2026 Budget Preparation Calendar (for submission deadlines).

---

#### 3.5 ICT Budget Briefing (IBB)

- An **ad hoc clarificatory briefing** initiated by MITHI for agencies to present particular items in their proposals as uploaded in OSBP
- May include: project concept notes, detailed technical specifications, market studies, documents pertaining to PIP/TRIP (from NEDA) and PCB (from lead agency)
- MITHI Steering Committee may identify and request additional supporting documents from the agency
- **Purpose:** Aids the Budget Preparation and Execution Group in their analysis in preparation for the Technical Budget Hearing

---

### 4.0 MITHI Secretariat Support

MITHI Secretariat shall assist the Budget Preparation Group for any clarification and faster processing of ICT-related budget proposals.

---

### 5.0 Effectivity

These guidelines are issued for the purposes of **FY 2026 Budget Preparation** and shall take effect immediately upon adoption (February 14, 2025).

---

## Quick Reference: MITHI 2025-01 Key Contacts and Resources

| Resource | Detail |
|---|---|
| MITHI Secretariat email | secretariat@mithi.gov.ph |
| DICT-CRRU (physical submission) | Carlos P. Garcia Ave., U.P. Campus, Diliman, Quezon City |
| DICT-CRRU email | crru@dict.gov.ph |
| DICT ISSP Evaluation Team email | issp@dict.gov.ph |
| OSBP System v2.0 | http://osbp.dbm.gov.ph |
| DBM hard copy submission | Administrative Service — Central Records Division, Ground Floor, DBM Building III, General Solano St., San Miguel, Manila |

## Quick Reference: Key Acronyms (MITHI 2025-01)

| Acronym | Full Term |
|---|---|
| MITHI | Medium-Term Information and Communications Technology Harmonization Initiative |
| DICT | Department of Information and Communications Technology |
| DBM | Department of Budget and Management |
| NEDA | National Economic and Development Authority |
| TRIP | Three-Year Rolling Infrastructure Program |
| PCB | Program Convergence Budgeting |
| PIP | Public Investment Program |
| PDP | Philippine Development Plan |
| ISSP | Information Systems Strategic Plan |
| PAPs | Projects, Activities, and Programs |
| OSBP | Online Submission of Budget Proposals |
| IBB | ICT Budget Briefing |
| INFRACOM | Infrastructure and Utilities Development Committee |
| DBCC | Development Budget Coordination Committee |
| NEP | National Expenditure Program |
| GDTB-GSSPD | Government Digital Transformation Bureau — Government Systems Strategic Program Division |
| OUEG | Office of the Undersecretary for E-Government |
| PREXC | Program Expenditure Classification |
| UACS | Unified Accounts Code Structure |
| SPAR | Security and Privacy Assessment for Risk |
| PeGIF | Philippine eGovernment Interoperability Framework |
| GPPB | Government Procurement Policy Board |
| PS-DBM | Procurement Service of the DBM |
| CFAG | Constitutional Fiscal Autonomy Group |
| GAA | General Appropriations Act |
| CO | Capital Outlay |
| MOOE | Maintenance and Other Operating Expenses |
