// ─── Types ────────────────────────────────────────────────────────────────────

interface Agency {
  name: string;
  acronym: string;
  type: string;
  websiteUrl: string | null;
  logoSrc?: string | null; // base64 data URI, populated by the export route
}

interface Part1 {
  legalBasis: string;
  mandateFunction: string;
  visionStatement: string;
  missionStatement: string;
  orgOutcomes: { name: string; programs: string[] }[];
  cioName: string;
  cioPosition: string;
  cioUnit: string;
  cioEmail: string;
  cioContact: string;
  focalName: string;
  focalPosition: string;
  focalUnit: string;
  focalEmail: string;
  focalContact: string;
  humanCapital: {
    plantilla: { it: { male: number; female: number }; nonIt: { male: number; female: number } };
    contractual: { it: { male: number; female: number }; nonIt: { male: number; female: number } };
    outsourced: { it: { male: number; female: number }; nonIt: { male: number; female: number } };
  };
  stakeholders: { name: string; transactions: string; complexity: string }[];
}

interface CyberGroup {
  physical: Record<string, boolean>;
  perimeter: Record<string, boolean>;
  network: Record<string, boolean>;
  endpoint: Record<string, boolean>;
  data: Record<string, boolean>;
  application: Record<string, boolean>;
  other: Record<string, boolean>;
}

interface NetworkDiagram { id: string; path: string; title: string }

interface IsSystem {
  name: string;
  classification: string;
  frontline: boolean | null;
  deploymentType?: string;
  url?: string;
  description: string;
  developmentStrategy?: string;
  developmentPlatform?: string;
  databaseName?: string;
  dataStorage?: string;
  internalUsers?: string;
  externalUsers?: string;
  owner?: string;
  interoperability?: {
    integrated: boolean;
    internalSystems?: string[];
    externalSystems?: string[];
    generatesData?: boolean;
    processesExternalData?: boolean;
    sharedPlatform?: boolean;
  };
  pia?: { processesPersonalInfo: boolean; piaCompleted?: boolean | null };
  // Proposed IS extras
  status?: string;
}

interface StrategicConcern { ooSoMfo: string; criticalSystem: string; problem: string; intendedIctUse: string }

interface EgpEntry {
  utilizing?: boolean; usingEquivalent?: boolean; equivalentName?: string;
  manual?: boolean; proposed?: boolean; url?: string;
  usingOther?: boolean; otherName?: string;
}

interface Part2 {
  strategicConcerns: StrategicConcern[];
  networkDiagrams: NetworkDiagram[];
  networkDescription: string | null;
  cybersecurityControls: CyberGroup;
  informationSystems: IsSystem[];
  egpChecklist: Record<string, EgpEntry & {
    channels?: Record<string, boolean>;
    connectedToPortal?: boolean;
    adoptionPercentage?: number;
    exists?: boolean;
    systemName?: string;
  }>;
}

interface IctProject {
  id: string;
  title: string;
  description: string;
  objectives: string;
  projectType?: string;
  linkedSystemIds?: string[];
  strategicAlignment: Record<string, boolean | string>;
  harmonization: Record<string, boolean>;
  duration: string;
  year1Deliverables: string;
  year2Deliverables: string;
  year3Deliverables: string;
  implementingUnit: string;
  totalProjectCost: number;
  fundingSource: string;
  leadAgency?: string;
  implementingAgency?: string;
}

interface KpiRow {
  hierarchy: string;
  kpi: string;
  baselineData: string;
  targets: { year1: string; year2: string; year3: string };
  dataCollectionMethod: string;
  responsibility: string;
}

interface Part3 {
  proposedNetworkDesc: string | null;
  proposedCybersecControls: CyberGroup;
  proposedHumanCapital: { position: string; employmentStatus: string; physicalCount: number }[];
  proposedSystems: IsSystem[];
  internalProjects: IctProject[];
  crossAgencyProjects: IctProject[];
  performanceFramework: Record<string, { projectTitle: string; projectType: string; rows: KpiRow[] }>;
}

interface LineItem {
  id: string; item: string; office: string;
  uacsCode: string; uacsLabel: string;
  fundSource: string; qty: number; unitCost: number;
}

interface ProjectBudget { projectTitle: string; capitalOutlay: LineItem[]; mooe: LineItem[] }

interface YearBudget {
  officeProductivity: { capitalOutlay: LineItem[]; mooe: LineItem[] };
  internalProjects: Record<string, ProjectBudget>;
  crossAgencyProjects: Record<string, ProjectBudget>;
  continuingCosts: { mooe: LineItem[] };
}

interface Part4 { year1: YearBudget; year2: YearBudget; year3: YearBudget; summary?: unknown }

export interface IsspData {
  title: string;
  startYear: number;
  endYear: number;
  status: string;
  scope: string;
  amendmentNumber: number;
  agency: Agency;
  part1: Part1;
  part2: Part2;
  part3: Part3;
  part4: Part4;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(s: string | null | undefined): string {
  if (!s) return "";
  return esc(s).replace(/\n/g, "<br>");
}

function php(n: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP", minimumFractionDigits: 2,
  }).format(n);
}

function total(l: LineItem) { return l.qty * l.unitCost; }
function sumLines(lines: LineItem[]) { return lines.reduce((s, l) => s + total(l), 0); }

function chk(v: boolean | undefined): string {
  return v ? "☑" : "☐";
}

function scopeLabel(scope: string): string {
  const map: Record<string, string> = {
    DEPARTMENT_WIDE: "Department-Wide",
    DEPARTMENT_CENTRAL_ONLY: "Department — Central Office Only",
    CENTRAL_ONLY: "Central Office Only",
    WITH_REGIONAL: "Agency-Wide — With Regional Offices / Field Offices",
    AGENCY_WITH_REGIONAL: "Agency-Wide — With Regional Offices / Field Offices",
    WITH_BUREAUS: "Agency-Wide — With Bureaus / Attached Agencies",
    AGENCY_WIDE: "Agency-Wide",
    AGENCY_CENTRAL_ONLY: "Agency-Wide — Central Office Only",
    OTHER_GOVERNMENT_ENTITY: "Other Government Entity",
    LGU_SCOPE: "LGU",
  };
  return map[scope] ?? scope;
}

function ooLabel(agencyType: string): string {
  if (agencyType === "GOCC") return "Strategic Objectives (SO)";
  if (agencyType === "LGU") return "Major Final Outputs (MFO)";
  return "Organizational Outcomes (OO)";
}

function fundSourceAbbr(s: string): string {
  const map: Record<string, string> = {
    "General Appropriations Act (GAA)": "GAA",
    "General Appropriations Act": "GAA",
    "Foreign-assisted projects": "FAP",
    "Foreign Assisted Projects": "FAP",
    "Locally funded": "LF",
    "Locally Funded": "LF",
    "Other Income Generating Sources": "OIGS",
  };
  return map[s] ?? s;
}

// Group line items by UACS code, compute subtotals
function groupByUacs(lines: LineItem[]): { code: string; label: string; items: LineItem[]; subtotal: number }[] {
  const map = new Map<string, { label: string; items: LineItem[] }>();
  for (const l of lines) {
    const key = l.uacsCode || "—";
    if (!map.has(key)) map.set(key, { label: l.uacsLabel || l.uacsCode || "—", items: [] });
    map.get(key)!.items.push(l);
  }
  return Array.from(map.entries()).map(([code, { label, items }]) => ({
    code, label, items, subtotal: sumLines(items),
  }));
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  @page { size: A4 landscape; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: P052, 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
  }

  /* ── Page breaks ── */
  .page-break { page-break-before: always; }
  .avoid-break { page-break-inside: avoid; }

  /* ── Cover page — sized for landscape A4 content area (~159mm tall) ── */
  .cover {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 159mm; text-align: center; overflow: hidden;
  }
  .cover-logo { font-size: 36pt; margin-bottom: 3mm; color: #888; }
  .cover-agency-name { font-size: 12pt; color: #555; margin-bottom: 3mm; }
  .cover-title {
    font-size: 16pt; font-weight: bold; text-transform: uppercase;
    margin-bottom: 3mm; line-height: 1.3;
  }
  .cover-type { font-size: 10pt; margin-bottom: 2mm; }
  .cover-type span { margin: 0 4mm; }
  .cover-period { font-size: 11pt; margin-bottom: 2mm; }
  .cover-dept { font-size: 12pt; font-weight: bold; margin-bottom: 1mm; }
  .cover-url { font-size: 10pt; color: #2563eb; margin-bottom: 4mm; }
  .cover-sigs {
    width: 100%; display: flex; justify-content: space-between;
    margin-top: 4mm; text-align: left; font-size: 10pt;
  }
  .cover-sig-block { width: 45%; }
  .cover-sig-line { border-bottom: 1px solid #000; margin: 7mm 0 2mm 0; }
  .cover-sig-label { font-size: 9pt; }
  .cover-scope { text-align: left; font-size: 10pt; line-height: 1.6; }
  .cover-scope-title { font-weight: bold; margin-bottom: 1mm; }
  .cover-scope-item { display: block; }
  .cover-scope-sub { display: block; padding-left: 6mm; }

  /* ── Content page header ── */
  .page-header {
    display: flex; align-items: center; gap: 6mm;
    border-bottom: 1px solid #000; padding-bottom: 3mm; margin-bottom: 6mm;
  }
  .page-header-logo { font-size: 10pt; font-weight: bold; min-width: 30mm; }
  .page-header-title { font-size: 9pt; font-weight: bold; text-transform: uppercase; flex: 1; text-align: center; }

  /* ── TOC ── */
  .toc-title { font-size: 16pt; font-weight: bold; margin-bottom: 5mm; }
  .toc-entry { display: flex; justify-content: space-between; margin-bottom: 0.5mm; font-size: 10pt; }
  .toc-entry.toc-part { font-weight: bold; margin-top: 2mm; font-size: 10pt; }
  .toc-entry.toc-section { padding-left: 8mm; }
  .toc-entry.toc-sub { padding-left: 16mm; }
  .toc-dots { flex: 1; border-bottom: 1px dotted #666; margin: 0 3mm; align-self: flex-end; height: 1.2em; }

  /* ── Headings ── */
  .part-heading {
    font-size: 15pt; font-weight: bold; text-transform: uppercase;
    margin: 0 0 5mm 0;
  }
  .section-heading {
    font-size: 12pt; font-weight: bold; text-transform: uppercase;
    margin: 6mm 0 3mm 0;
    page-break-after: avoid;
  }
  .subsection-heading {
    font-size: 11pt; font-weight: bold; text-transform: uppercase;
    margin: 4mm 0 2mm 0;
    padding-left: 6mm;
    page-break-after: avoid;
  }
  .field-label { font-weight: bold; }
  .field-value { margin-bottom: 3mm; }

  /* ── Subsection body indent (matches heading's padding-left) ── */
  .subsection-block { padding-left: 6mm; }

  /* ── Bullet list ── */
  ul.template-list { margin: 2mm 0 2mm 8mm; }
  ul.template-list li { margin-bottom: 1mm; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 4mm; }
  th, td { border: 1px solid #000; padding: 3px 6px; vertical-align: top; }
  th { background: #d9d9d9; font-weight: bold; text-align: center; }
  td.label-cell { background: #d9d9d9; font-weight: bold; width: 33%; }

  /* ── Part IV table ── */
  .piv-table td.section-row { background: #d9d9d9; font-weight: bold; }
  .piv-table td.uacs-row { background: #ebebeb; font-style: italic; font-size: 9pt; }
  .piv-table td.total-cell { text-align: right; font-weight: bold; white-space: nowrap; }
  .piv-table td.num-cell { text-align: right; white-space: nowrap; }
  .piv-table td.grand-total { background: #bfbfbf; font-weight: bold; }

  /* ── Cybersecurity checklist table ── */
  .cyber-table th { text-align: left; }
  .cyber-table td.group-cell { font-weight: bold; background: #d9d9d9; vertical-align: middle; width: 22%; }
  .cyber-table td.mandatory-cell { width: 39%; }
  .cyber-table td.optional-cell { width: 39%; }

  /* ── IS card ── */
  .is-card { margin-bottom: 5mm; page-break-inside: avoid; }
  .is-card table { margin-bottom: 0; }

  /* ── Summary tables ── */
  .summary-section { margin-bottom: 8mm; }
  .summary-title { font-size: 11pt; font-weight: bold; margin-bottom: 2mm; }

  /* ── Definition of Terms ── */
  .def-heading { font-size: 16pt; font-weight: bold; margin-bottom: 6mm; }
`;

// ─── Page header (runs on every content page) ─────────────────────────────────

// Puppeteer's running headerTemplate handles the per-page header; this is a no-op.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pageHeader(_issp: IsspData): string {
  return "";
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function renderCover(issp: IsspData): string {
  const isAmendment = issp.amendmentNumber > 0;
  const amendOrdinal = ["", "1st", "2nd", "3rd"][issp.amendmentNumber] ?? `${issp.amendmentNumber}th`;
  const scope = scopeLabel(issp.scope);

  const coverLogoHtml = issp.agency.logoSrc
    ? `<img src="${issp.agency.logoSrc}" style="height:40px;width:auto;object-fit:contain;margin-bottom:3mm;" />`
    : `<div class="cover-logo" style="font-size:11pt;font-weight:bold;color:#444;margin-bottom:3mm;">${esc(issp.agency.name)}</div>`;

  return `<div class="cover">
    ${coverLogoHtml}
    <div class="cover-title">Information Systems Strategic Plan (ISSP)</div>
    <div class="cover-type">
      <span>${isAmendment ? "☐" : "☑"} REGULAR ISSP</span>
      <span>${isAmendment ? "☑" : "☐"} AMENDMENT ${amendOrdinal ? `&lt;${amendOrdinal}&gt;` : ""}</span>
    </div>
    <div class="cover-period">For the period <strong>${issp.startYear}</strong> to <strong>${issp.endYear}</strong></div>
    <div class="cover-dept">${esc(issp.agency.name)}</div>
    ${issp.agency.websiteUrl ? `<div class="cover-url">${esc(issp.agency.websiteUrl)}</div>` : ""}

    <div class="cover-sigs">
      <div class="cover-sig-block">
        <div style="font-weight:bold;margin-bottom:2mm;">PREPARED BY:</div>
        <div class="cover-sig-line"></div>
        <div class="cover-sig-label">Name &amp; Signature of Chief Information Officer<br>${esc(issp.part1.cioName)}</div>
      </div>
      <div class="cover-scope">
        <div class="cover-scope-title">Scope</div>
        ${scope.includes("Department-Wide") || scope.includes("Agency-Wide") ? `<span class="cover-scope-item">☑ ${esc(scope)}</span>` : `<span class="cover-scope-item">☐ Department-Wide</span><span class="cover-scope-item">☑ ${esc(scope)}</span>`}
      </div>
    </div>

    <div class="cover-sigs" style="margin-top:10mm;">
      <div class="cover-sig-block">
        <div style="font-weight:bold;margin-bottom:2mm;">APPROVED BY:</div>
        <div class="cover-sig-line"></div>
        <div class="cover-sig-label">Name &amp; Signature of Agency Head</div>
      </div>
    </div>
  </div>`;
}

// ─── Table of Contents ────────────────────────────────────────────────────────

function renderToc(issp: IsspData): string {
  const p3 = issp.part3;
  const hasE2 = p3.crossAgencyProjects.length > 0;

  const rows: { label: string; level: "part" | "section" | "sub"; page: string }[] = [
    { label: "DEFINITION OF TERMS", level: "part", page: "i" },
    { label: "PART I. AGENCY PROFILE & STRATEGIC CONTEXT", level: "part", page: "1" },
    { label: "A. MANDATE, VISION, MISSION, AND ORGANIZATIONAL OUTCOME", level: "section", page: "1" },
    { label: "B. ORGANIZATIONAL STRUCTURE", level: "section", page: "1" },
    { label: "C. STAKEHOLDER ANALYSIS", level: "section", page: "2" },
    { label: "PART II. CURRENT ICT ASSESSMENT", level: "part", page: "3" },
    { label: "A. STRATEGIC CONCERNS FOR ICT USE", level: "section", page: "3" },
    { label: "B. EXISTING NETWORK INFRASTRUCTURE", level: "section", page: "4" },
    { label: "B1. LAN/WAN SET-UP INCLUDING CONNECTIVITY TYPE AND BANDWIDTH", level: "sub", page: "4" },
    { label: "B2. CYBERSECURITY CONTROL CHECKLIST", level: "sub", page: "5" },
    { label: "C. EXISTING/OPERATIONAL INFORMATION SYSTEMS (IS) INVENTORY", level: "section", page: "6" },
    { label: "D. E-GOVERNMENT PROGRAMS (EGP) CHECKLIST", level: "section", page: "8" },
    { label: "PART III. PROPOSED ICT STRATEGY", level: "part", page: "11" },
    { label: "A. PROPOSED NETWORK INFRASTRUCTURE", level: "section", page: "11" },
    { label: "B. ENTERPRISE ARCHITECTURE", level: "section", page: "13" },
    { label: "C. PROPOSED ICT HUMAN CAPITAL", level: "section", page: "14" },
    { label: "D. PROPOSED INFORMATION SYSTEMS", level: "section", page: "15" },
    { label: "E. ICT PROJECTS", level: "section", page: "17" },
    { label: "E.1. INTERNAL ICT PROJECTS", level: "sub", page: "17" },
    ...(hasE2 ? [{ label: "E.2. CROSS-AGENCY ICT PROJECTS", level: "sub" as const, page: "19" }] : []),
    { label: "F. PERFORMANCE MEASUREMENT FRAMEWORK", level: "section", page: "21" },
    { label: "PART IV. RESOURCE REQUIREMENTS", level: "part", page: "23" },
    { label: "A. DETAILED RESOURCE DEPLOYMENT AND COST BREAKDOWN", level: "section", page: "23" },
    { label: `A.1. [${issp.startYear}]`, level: "sub", page: "23" },
    { label: `A.2. [${issp.startYear + 1}]`, level: "sub", page: "27" },
    { label: `A.3. [${issp.startYear + 2}]`, level: "sub", page: "31" },
    { label: "B. SUMMARY OF INVESTMENTS", level: "section", page: "35" },
    { label: "B.1. GENERAL SUMMARY", level: "sub", page: "35" },
    { label: "B.2. FUND SOURCE", level: "sub", page: "35" },
    { label: "B.3. STATEMENT OF EXPENDITURE", level: "sub", page: "35" },
    { label: "B.4. OBJECT OF EXPENDITURE", level: "sub", page: "36" },
  ];

  return `<div class="page-break">
    ${pageHeader(issp)}
    <div class="toc-title">Table of Contents</div>
    ${rows.map(r => `
    <div class="toc-entry toc-${r.level}">
      <span>${esc(r.label)}</span>
      <span class="toc-dots"></span>
      <span>${r.page}</span>
    </div>`).join("")}
  </div>`;
}

// ─── Definition of Terms ──────────────────────────────────────────────────────

function renderDefinitions(issp: IsspData): string {
  const terms = [
    { term: "Agency", def: "Refers to any bureau, office, commission, authority, or instrumentality of the national government, including government-owned or-controlled corporations (GOCC), authorized by law or by their respective charters to contract for or undertake information and communications technology networks and databases, infrastructure or development projects." },
    { term: "Business Process", def: "A collection of business transactions between business partners and/or internal activities within one business. These transactions and/or activities together support the objective of the business process." },
    { term: "Chief Information Officer", def: "Refers to a senior officer responsible for the development, planning, and implementation of the government entity's information systems strategic plan (ISSP) or ICT plan, and management of the agency's ICT systems, platforms, and applications;" },
  ];
  return `<div class="page-break">
    ${pageHeader(issp)}
    <div class="def-heading">DEFINITION OF TERMS</div>
    <table>
      <thead><tr><th style="width:33%">Terms</th><th>Definition</th></tr></thead>
      <tbody>
        ${terms.map(t => `<tr class="avoid-break"><td>${esc(t.term)}</td><td>${esc(t.def)}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>`;
}

// ─── Part I ───────────────────────────────────────────────────────────────────

function renderPart1(issp: IsspData): string {
  const p = issp.part1;
  const oo = ooLabel(issp.agency.type);

  const hc = p.humanCapital;
  function hcRow(label: string, key: "plantilla" | "contractual" | "outsourced") {
    const r = hc[key];
    const itTotal = (r.it.male || 0) + (r.it.female || 0);
    const nonItTotal = (r.nonIt.male || 0) + (r.nonIt.female || 0);
    const male = (r.it.male || 0) + (r.nonIt.male || 0);
    const female = (r.it.female || 0) + (r.nonIt.female || 0);
    return `<tr class="avoid-break">
      <td style="font-weight:bold;text-align:center;">${esc(label)}</td>
      <td style="text-align:center;">${itTotal}</td>
      <td style="text-align:center;">${nonItTotal}</td>
      <td style="text-align:center;">${male}</td>
      <td style="text-align:center;">${female}</td>
    </tr>`;
  }

  const itGrand = ["plantilla","contractual","outsourced"].reduce((s, k) => {
    const r = hc[k as keyof typeof hc]; return s + (r.it.male||0) + (r.it.female||0);
  }, 0);
  const nonItGrand = ["plantilla","contractual","outsourced"].reduce((s, k) => {
    const r = hc[k as keyof typeof hc]; return s + (r.nonIt.male||0) + (r.nonIt.female||0);
  }, 0);
  const maleGrand = ["plantilla","contractual","outsourced"].reduce((s, k) => {
    const r = hc[k as keyof typeof hc]; return s + (r.it.male||0) + (r.nonIt.male||0);
  }, 0);
  const femaleGrand = ["plantilla","contractual","outsourced"].reduce((s, k) => {
    const r = hc[k as keyof typeof hc]; return s + (r.it.female||0) + (r.nonIt.female||0);
  }, 0);

  return `<div class="page-break">
    ${pageHeader(issp)}
    <div class="part-heading">Part I. Agency Profile &amp; Strategic Context</div>

    <div class="section-heading">A. Mandate, Vision, Mission, and Organizational Outcome</div>

    <div class="subsection-heading">A.1. Mandate</div>
    <div class="subsection-block"><ul class="template-list">
      <li><span class="field-label">Legal Basis:</span> ${esc(p.legalBasis)}</li>
      <li><span class="field-label">Function:</span> ${nl2br(p.mandateFunction)}</li>
    </ul></div>

    <div class="subsection-heading">A.2. Vision Statement</div>
    <div class="subsection-block"><p class="field-value">${nl2br(p.visionStatement)}</p></div>

    <div class="subsection-heading">A.3. Mission Statement</div>
    <div class="subsection-block"><p class="field-value">${nl2br(p.missionStatement)}</p></div>

    <div class="subsection-heading">A.4. ${esc(oo)}</div>
    <div class="subsection-block">${p.orgOutcomes.length === 0 ? "<p><em>None specified.</em></p>" :
      p.orgOutcomes.map((oo, i) => `<div class="avoid-break" style="margin-bottom:3mm;">
        <p style="font-weight:bold;">${i + 1}. ${esc(oo.name)}</p>
        ${oo.programs?.length ? `<ul class="template-list">${oo.programs.map(pg => `<li>${esc(pg)}</li>`).join("")}</ul>` : ""}
      </div>`).join("")
    }</div>

    <div class="section-heading">B. Organizational Structure</div>

    <div class="subsection-heading">B.1. Chief Information Officer (CIO)</div>
    <div class="subsection-block"><ul class="template-list">
      <li><span class="field-label">Name of CIO:</span> ${esc(p.cioName)}</li>
      <li><span class="field-label">Plantilla Position:</span> ${esc(p.cioPosition)}</li>
      <li><span class="field-label">Organizational Unit:</span> ${esc(p.cioUnit)}</li>
      <li><span class="field-label">E-mail Address:</span> ${esc(p.cioEmail)}</li>
      <li><span class="field-label">Contact Number/s:</span> ${esc(p.cioContact)}</li>
    </ul>

    <div style="margin-bottom:2mm;font-weight:bold;">ISSP Focal Person</div>
    <ul class="template-list">
      <li><span class="field-label">Name of ISSP Focal:</span> ${esc(p.focalName)}</li>
      <li><span class="field-label">Position:</span> ${esc(p.focalPosition)}</li>
      <li><span class="field-label">Organizational Unit:</span> ${esc(p.focalUnit)}</li>
      <li><span class="field-label">E-mail Address:</span> ${esc(p.focalEmail)}</li>
      <li><span class="field-label">Contact Number/s:</span> ${esc(p.focalContact)}</li>
    </ul></div>

    <div class="subsection-heading">B.2. Human Capital</div>
    <div class="subsection-block"><table>
      <thead>
        <tr>
          <th rowspan="2" style="width:30%">Employment Status</th>
          <th rowspan="2">IT Positions</th>
          <th rowspan="2">Non-IT Positions</th>
          <th colspan="2">Sex</th>
        </tr>
        <tr><th>Male</th><th>Female</th></tr>
      </thead>
      <tbody>
        ${hcRow("Plantilla", "plantilla")}
        ${hcRow("Contractual", "contractual")}
        ${hcRow("Outsourced (JO, COS, and HTC)", "outsourced")}
        <tr style="background:#d9d9d9;font-weight:bold;">
          <td style="text-align:right;">Grand Total</td>
          <td style="text-align:center;">${itGrand}</td>
          <td style="text-align:center;">${nonItGrand}</td>
          <td style="text-align:center;">${maleGrand}</td>
          <td style="text-align:center;">${femaleGrand}</td>
        </tr>
      </tbody>
    </table></div>

    <div class="section-heading">C. Stakeholder Analysis</div>
    <table>
      <thead><tr><th style="width:33%">Stakeholders</th><th style="width:40%">Transaction Processed</th><th>Complexity</th></tr></thead>
      <tbody>
        ${p.stakeholders.length === 0
          ? `<tr><td colspan="3" style="text-align:center;font-style:italic;">No stakeholders specified.</td></tr>`
          : p.stakeholders.map(s => `<tr class="avoid-break">
              <td>${esc(s.name)}</td>
              <td>${nl2br(s.transactions)}</td>
              <td style="text-align:center;">${esc(s.complexity)}</td>
            </tr>`).join("")
        }
      </tbody>
    </table>
  </div>`;
}

// ─── Cybersecurity checklist table (shared by Part II-B2 and III-A2) ──────────

function renderCyberTable(controls: CyberGroup): string {
  const rows = [
    {
      group: "PHYSICAL SECURITY",
      mandatory: [
        { key: "perimeterProtection", label: "Perimeter Protection" },
        { key: "accessControl", label: "Access Control" },
        { key: "surveillance", label: "Surveillance System" },
      ],
      optional: [{ key: "detection", label: "Detection System" }],
      src: controls.physical,
    },
    {
      group: "PERIMETER SECURITY",
      mandatory: [
        { key: "ngfw", label: "Next Generation Firewalls" },
        { key: "idsIps", label: "Intrusion Detection/Prevention Systems (IDS/IPS)" },
        { key: "waf", label: "Web Application Firewalls (WAFs)" },
      ],
      optional: [{ key: "dmz", label: "Demilitarized Zone (DMZ)" }],
      src: controls.perimeter,
    },
    {
      group: "NETWORK SECURITY",
      mandatory: [{ key: "dataEncryption", label: "Data Encryption" }],
      optional: [{ key: "networkSegmentation", label: "Network Segmentation" }],
      src: controls.network,
    },
    {
      group: "ENDPOINT SECURITY",
      mandatory: [
        { key: "antivirus", label: "Anti-virus and Anti-malware Software" },
        { key: "appControl", label: "Application Control" },
        { key: "byod", label: "BYOD Security" },
      ],
      optional: [{ key: "xdr", label: "Extended Detection and Response (XDR)" }],
      src: controls.endpoint,
    },
    {
      group: "DATA SECURITY",
      mandatory: [
        { key: "dataClassification", label: "Data Classification" },
        { key: "dlp", label: "Data Loss Prevention (DLP)" },
        { key: "backupRecovery", label: "Data Backups and Recovery" },
      ],
      optional: [],
      src: controls.data,
    },
    {
      group: "APPLICATION SECURITY",
      mandatory: [{ key: "securityScanning", label: "Regular Security Scanning and Testing" }],
      optional: [],
      src: controls.application,
    },
    {
      group: "OTHER MEASURES",
      mandatory: [
        { key: "vulnAssessment", label: "Vulnerability Assessment" },
        { key: "patchMgmt", label: "Patch Management" },
        { key: "strongPasswords", label: "Strong Password Policies" },
        { key: "mfa", label: "Multi-Factor Authentication (MFA)" },
        { key: "accessReviews", label: "Access Reviews" },
        { key: "securityLogs", label: "Security Logs" },
      ],
      optional: [
        { key: "logAnalysis", label: "Log Analysis" },
        { key: "incidentResponse", label: "Incident Response Plan" },
        { key: "siem", label: "Security Information and Event Management (SIEM)" },
        { key: "penTesting", label: "Penetration Testing" },
        { key: "secureSdlc", label: "Secure Software Development Life Cycle (SDLC)" },
      ],
      src: controls.other,
    },
  ];

  return `<table class="cyber-table">
    <thead>
      <tr>
        <th class="group-cell"></th>
        <th class="mandatory-cell" style="text-decoration:underline;">MANDATORY</th>
        <th class="optional-cell" style="text-decoration:underline;">OPTIONAL</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `<tr class="avoid-break">
        <td class="group-cell">${esc(row.group)}</td>
        <td class="mandatory-cell">
          ${row.mandatory.map(m => `${chk(row.src[m.key] as boolean)} ${esc(m.label)}<br>`).join("")}
        </td>
        <td class="optional-cell">
          ${row.optional.map(m => `${chk(row.src[m.key] as boolean)} ${esc(m.label)}<br>`).join("")}
          &nbsp;
        </td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

// ─── IS card (shared by Part II-C and III-D) ──────────────────────────────────

function renderIsCard(sys: IsSystem, isProposed = false): string {
  const interop = sys.interoperability;
  const pia = sys.pia;
  return `<div class="is-card avoid-break">
    <table>
      <tbody>
        <tr class="avoid-break"><td class="label-cell">INFORMATION SYSTEM NAME</td><td><strong>${esc(sys.name)}</strong></td></tr>
        <tr class="avoid-break"><td class="label-cell">CLASSIFICATION</td><td>
          ${chk(sys.classification === "Support to Operations")} Support to Operations<br>
          ${chk(sys.classification === "General Administrative Systems")} General Administrative Systems<br>
          ${chk(sys.classification === "Operations")} Operations
          ${sys.classification === "Operations" ? `<br><em style="padding-left:4mm;">If yes, indicate whether the system supports:</em><br>
            <span style="padding-left:8mm;">${chk(sys.frontline === true)} Frontline Service</span>
            ${sys.deploymentType ? `<br><span style="padding-left:12mm;">${chk(sys.deploymentType === "Online")} Online &nbsp; ${chk(sys.deploymentType === "On-premise")} On-premise &nbsp; ${chk(sys.deploymentType === "Hybrid")} Hybrid</span>` : ""}
            ${sys.url ? `<br><span style="padding-left:12mm;">URL: ${esc(sys.url)}</span>` : ""}
            <br><span style="padding-left:8mm;">${chk(sys.frontline === false)} Non-Frontline Service</span>` : ""}
        </td></tr>
        ${isProposed && sys.status ? `<tr class="avoid-break"><td class="label-cell">STATUS</td><td>${esc(sys.status)}</td></tr>` : ""}
        <tr class="avoid-break"><td class="label-cell">DESCRIPTION &amp; PURPOSE</td><td>${nl2br(sys.description)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">DEVELOPMENT STRATEGY</td><td>${esc(sys.developmentStrategy)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">DEVELOPMENT PLATFORM</td><td>${esc(sys.developmentPlatform)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">DATABASE NAME</td><td>${esc(sys.databaseName)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">DATA STORAGE</td><td>${esc(sys.dataStorage)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">INTERNAL USERS</td><td>${esc(sys.internalUsers)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">EXTERNAL USERS</td><td>${esc(sys.externalUsers)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">OWNER</td><td>${esc(sys.owner)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">INTEROPERABILITY</td><td>
          ${chk(interop?.integrated)} Integrated with another system<br>
          ${interop?.integrated ? `
            <span style="padding-left:6mm;">Internal System: ${esc(interop?.internalSystems?.join(", "))}</span><br>
            <span style="padding-left:6mm;">External System: ${esc(interop?.externalSystems?.join(", "))}</span><br>
          ` : ""}
          ${chk(interop?.generatesData)} Generates data utilized by other system<br>
          ${chk(interop?.processesExternalData)} Processes data generated from other system<br>
          ${chk(interop?.sharedPlatform)} Deployed on a shared platform
        </td></tr>
        <tr class="avoid-break"><td class="label-cell">PRIVACY IMPACT ASSESSMENT (PIA)</td><td>
          Is the system processing personal information?<br>
          ${chk(pia?.processesPersonalInfo === true)} Yes &nbsp; ${chk(pia?.processesPersonalInfo === false)} No<br>
          ${pia?.processesPersonalInfo ? `<br>If Yes, did the system undergo PIA?<br>
            ${chk(pia?.piaCompleted === true)} Yes &nbsp; ${chk(pia?.piaCompleted === false)} No` : ""}
        </td></tr>
      </tbody>
    </table>
  </div>`;
}

// ─── Part II ──────────────────────────────────────────────────────────────────

function renderPart2(issp: IsspData): string {
  const p = issp.part2;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Network diagram images (one per diagram, displayed inline; PDF rendering will embed them)
  const diagrams = p.networkDiagrams ?? [];

  // EGP checklist rows
  const egpPrograms = [
    { key: "elgu", num: 1, title: "ELECTRONIC LOCAL GOVERNMENT UNIT (ELGU) SYSTEM", subtitle: "(Applicable only to LGUs)" },
    { key: "eGovPay", num: 2, title: "GOVERNMENT DIGITAL PAYMENT SYSTEM FOR COLLECTION AND DISBURSEMENT" },
    { key: "pnpki", num: 3, title: "GOVERNMENT PUBLIC KEY INFRASTRUCTURE (PKI) PROGRAM" },
    { key: "hcmis", num: 4, title: "HUMAN CAPITAL MANAGEMENT INFORMATION SYSTEM (HCMIS)" },
    { key: "ifmis", num: 5, title: "INTEGRATED FINANCIAL MANAGEMENT INFORMATION SYSTEM (IFMIS)" },
    { key: "onlinePortal", num: 6, title: "ONLINE PUBLIC SERVICE PORTAL" },
    { key: "procurement", num: 7, title: "PROCUREMENT SYSTEM" },
    { key: "recordsMgmt", num: 8, title: "RECORDS AND KNOWLEDGE MANAGEMENT INFORMATION SYSTEM" },
    { key: "pscp", num: 9, title: "PUBLIC SERVICE CONTINUITY PLAN" },
  ];

  function egpStatus(key: string): string {
    const e = p.egpChecklist[key];
    if (!e) return "<em>N/A</em>";
    if (key === "pnpki") return `Adoption: ${e.adoptionPercentage ?? 0}%`;
    if (key === "recordsMgmt") {
      return `${chk(e.exists)} Yes &nbsp; ${chk(!e.exists)} No${e.systemName ? `<br>System: ${esc(e.systemName)}` : ""}`;
    }
    if (key === "pscp") return `${chk(e.exists)} Yes &nbsp; ${chk(!e.exists)} No`;
    if (key === "onlinePortal") {
      const ch = e.channels ?? {};
      return `${chk(ch["website"])} Website &nbsp; ${chk(ch["email"])} Email &nbsp; ${chk(ch["landline"])} Landline<br>${chk(ch["socialMedia"])} Social Media &nbsp; ${chk(ch["mobile"])} Mobile<br>Connected to portal: ${chk(e.connectedToPortal)}`;
    }
    return `Utilizing: ${chk(e.utilizing)} Yes &nbsp; ${chk(!e.utilizing)} No`;
  }

  return `<div class="page-break">
    ${pageHeader(issp)}
    <div class="part-heading">Part II. Current ICT Assessment</div>

    <div class="section-heading">A. Strategic Concerns for ICT Use</div>
    <table>
      <thead>
        <tr>
          <th style="width:20%">OO/SO/MFO</th>
          <th style="width:25%">Critical Management, Operating, or Business System</th>
          <th style="width:27%">Problem</th>
          <th style="width:28%">Intended Use of ICT</th>
        </tr>
      </thead>
      <tbody>
        ${p.strategicConcerns.length === 0
          ? `<tr><td colspan="4" style="text-align:center;font-style:italic;">No strategic concerns specified.</td></tr>`
          : p.strategicConcerns.map(c => `<tr class="avoid-break">
              <td>${nl2br(c.ooSoMfo)}</td>
              <td>${nl2br(c.criticalSystem)}</td>
              <td>${nl2br(c.problem)}</td>
              <td>${nl2br(c.intendedIctUse)}</td>
            </tr>`).join("")
        }
      </tbody>
    </table>

    <div class="section-heading">B. Existing Network Infrastructure</div>
    <div class="subsection-heading">B1. LAN/WAN Set-Up Including Connectivity Type and Bandwidth</div>
    <div class="subsection-block">${diagrams.length === 0
      ? `<p style="font-style:italic;">No network diagrams uploaded.</p>`
      : diagrams.map((d, i) => `<div class="avoid-break" style="margin-bottom:5mm;">
          <p style="font-weight:bold;margin-bottom:2mm;">${esc(d.title || `Network Diagram ${i + 1}`)}</p>
          <img src="${d.path.startsWith("data:") ? d.path : baseUrl + d.path}" style="max-width:100%;max-height:120mm;object-fit:contain;display:block;" alt="${esc(d.title || `Diagram ${i + 1}`)}" />
        </div>`).join("")
    }
    ${p.networkDescription ? `<p style="margin-top:3mm;">${nl2br(p.networkDescription)}</p>` : ""}</div>

    <div class="subsection-heading" style="margin-top:6mm;">B2. Cybersecurity Control Checklist</div>
    <div class="subsection-block">${renderCyberTable(p.cybersecurityControls)}</div>

    <div class="section-heading page-break">C. Existing/Operational Information Systems (IS) Inventory</div>
    ${pageHeader(issp)}
    ${p.informationSystems.length === 0
      ? `<p style="font-style:italic;">No information systems specified.</p>`
      : p.informationSystems.map(sys => renderIsCard(sys)).join("")
    }

    <div class="section-heading page-break">D. E-Government Programs (EGP) Checklist</div>
    ${pageHeader(issp)}
    <table>
      <thead><tr><th style="width:30%">Program</th><th style="width:35%">Status</th><th>Details</th></tr></thead>
      <tbody>
        ${egpPrograms.map(prog => `<tr class="avoid-break">
          <td><strong>${prog.num}. ${esc(prog.title)}</strong>${prog.subtitle ? `<br><em>${esc(prog.subtitle)}</em>` : ""}</td>
          <td>${egpStatus(prog.key)}</td>
          <td></td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`;
}

// ─── Part III ─────────────────────────────────────────────────────────────────

function renderProjectCard(proj: IctProject, crossAgency = false): string {
  const sa = proj.strategicAlignment ?? {};
  const ha = proj.harmonization ?? {};
  return `<div class="avoid-break is-card">
    <table>
      <tbody>
        <tr><td class="label-cell">PROJECT TITLE</td><td><strong>${esc(proj.title)}</strong></td></tr>
        <tr><td class="label-cell">DESCRIPTION</td><td>${nl2br(proj.description)}</td></tr>
        <tr><td class="label-cell">OBJECTIVES</td><td>${nl2br(proj.objectives)}</td></tr>
        <tr><td class="label-cell">STRATEGIC ALIGNMENT</td><td>
          ${chk(sa["publicInvestment"] as boolean)} Public Investment Program<br>
          ${chk(sa["nationalCybersecurity"] as boolean)} National Cybersecurity Plan<br>
          ${chk(sa["eGovMasterPlan"] as boolean)} E-Government Master Plan<br>
          ${chk(sa["convergenceBudgeting"] as boolean)} Program Convergence Budgeting<br>
          ${chk(!!(sa["others"] as string))} Others: ${esc(sa["others"] as string)}
        </td></tr>
        <tr><td class="label-cell">HARMONIZATION FRAMEWORK</td><td>
          ${chk(ha["nationalPrioritization"])} National Prioritization<br>
          ${chk(ha["resourceOptimization"])} Resource Optimization<br>
          ${chk(ha["interoperability"])} Interoperability Framework<br>
          ${chk(ha["crossAgency"])} Cross-Agency Collaboration<br>
          ${chk(ha["scalability"])} Scalability and Sustainability
        </td></tr>
        <tr><td class="label-cell">DURATION</td><td>${esc(proj.duration)}</td></tr>
        <tr><td class="label-cell">YEAR 1 DELIVERABLES/MILESTONE</td><td>${nl2br(proj.year1Deliverables)}</td></tr>
        <tr><td class="label-cell">YEAR 2 DELIVERABLES/MILESTONE</td><td>${nl2br(proj.year2Deliverables)}</td></tr>
        <tr><td class="label-cell">YEAR 3 DELIVERABLES/MILESTONE</td><td>${nl2br(proj.year3Deliverables)}</td></tr>
        <tr><td class="label-cell">IMPLEMENTING UNIT</td><td>${esc(proj.implementingUnit)}</td></tr>
        <tr><td class="label-cell">TOTAL PROJECT COST</td><td>${php(proj.totalProjectCost)}</td></tr>
        <tr><td class="label-cell">FUNDING SOURCE</td><td>
          ${chk(proj.fundingSource === "GAA")} GAA<br>
          ${chk(proj.fundingSource === "Foreign-assisted")} Foreign-assisted projects<br>
          ${chk(proj.fundingSource === "Locally funded")} Locally funded<br>
          ${chk(proj.fundingSource === "Other Income Generating Sources")} Other Income Generating Sources
        </td></tr>
        ${crossAgency ? `
          <tr><td class="label-cell">LEAD AGENCY</td><td>${esc(proj.leadAgency)}</td></tr>
          <tr><td class="label-cell">IMPLEMENTING AGENCY</td><td>${esc(proj.implementingAgency)}</td></tr>
        ` : ""}
      </tbody>
    </table>
  </div>`;
}

function renderPart3(issp: IsspData): string {
  const p = issp.part3;

  // Performance framework
  const allProjects = [
    ...p.internalProjects.map(pr => ({ ...pr, type: "internal" })),
    ...p.crossAgencyProjects.map(pr => ({ ...pr, type: "cross-agency" })),
  ];
  const perfEntries = Object.values(issp.part3.performanceFramework ?? {});

  const proposedHcTotal = p.proposedHumanCapital.reduce((s, r) => s + (r.physicalCount || 0), 0);

  return `<div class="page-break">
    ${pageHeader(issp)}
    <div class="part-heading">Part III. Proposed ICT Strategy</div>

    <div class="section-heading">A. Proposed Network Infrastructure</div>
    <div class="subsection-heading">A.1. LAN/WAN Set-Up Including Connectivity Type and Bandwidth</div>
    <div class="subsection-block">${p.proposedNetworkDesc
      ? `<p>${nl2br(p.proposedNetworkDesc)}</p>`
      : `<p style="font-style:italic;">No proposed network description specified.</p>`
    }</div>

    <div class="subsection-heading" style="margin-top:4mm;">A.2. Cybersecurity Control Checklist</div>
    <div class="subsection-block">${renderCyberTable(p.proposedCybersecControls)}</div>

    <div class="section-heading page-break">B. Enterprise Architecture</div>
    ${pageHeader(issp)}
    <p style="font-style:italic;">Enterprise architecture diagram to be attached.</p>

    <div class="section-heading" style="margin-top:6mm;">C. Proposed ICT Human Capital</div>
    <table>
      <thead>
        <tr>
          <th style="width:45%">IT Position</th>
          <th>Employment Status</th>
          <th>Physical Count</th>
        </tr>
      </thead>
      <tbody>
        ${p.proposedHumanCapital.length === 0
          ? `<tr><td colspan="3" style="text-align:center;font-style:italic;">None specified.</td></tr>`
          : p.proposedHumanCapital.map(r => `<tr class="avoid-break">
              <td style="font-weight:bold;text-align:center;">${esc(r.position)}</td>
              <td style="text-align:center;">${esc(r.employmentStatus)}</td>
              <td style="text-align:center;">${r.physicalCount}</td>
            </tr>`).join("")
        }
        <tr style="background:#d9d9d9;font-weight:bold;">
          <td colspan="2" style="text-align:right;">Grand Total</td>
          <td style="text-align:center;">${proposedHcTotal}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-heading page-break">D. Proposed Information Systems</div>
    ${pageHeader(issp)}
    ${p.proposedSystems.length === 0
      ? `<p style="font-style:italic;">No proposed information systems specified.</p>`
      : p.proposedSystems.map(sys => renderIsCard(sys, true)).join("")
    }

    <div class="section-heading page-break">E. ICT Projects</div>
    ${pageHeader(issp)}

    <div class="subsection-heading">E.1. Internal ICT Projects</div>
    <div class="subsection-block">${p.internalProjects.length === 0
      ? `<p style="font-style:italic;">No internal ICT projects specified.</p>`
      : p.internalProjects.map(proj => renderProjectCard(proj, false)).join("")
    }</div>

    ${p.crossAgencyProjects.length > 0 ? `
    <div class="subsection-heading" style="margin-top:6mm;">E.2. Cross-Agency ICT Projects</div>
    <div class="subsection-block">${p.crossAgencyProjects.map(proj => renderProjectCard(proj, true)).join("")}</div>
    ` : ""}

    <div class="section-heading page-break">F. Performance Measurement Framework</div>
    ${pageHeader(issp)}
    <div class="subsection-heading">F.1. Internal ICT Projects</div>
    <div class="subsection-block">${allProjects.filter(pr => pr.type === "internal").map(proj => {
      const entry = perfEntries.find(e => e.projectTitle === proj.title) ??
        issp.part3.performanceFramework[proj.id];
      if (!entry) return `<p style="font-style:italic;">No KPI data for ${esc(proj.title)}.</p>`;
      return `<div class="avoid-break" style="margin-bottom:6mm;">
        <p style="font-weight:bold;margin-bottom:2mm;">ICT Project: <em>${esc(proj.title)}</em></p>
        <table>
          <thead>
            <tr>
              <th style="width:15%">Hierarchy of Targeted Results</th>
              <th style="width:20%">Key Performance Indicators (KPIs)</th>
              <th style="width:15%">Baseline Data</th>
              <th style="width:15%">Targets</th>
              <th style="width:20%">Data Collection Methods</th>
              <th style="width:15%">Responsibility to Collect Data</th>
            </tr>
          </thead>
          <tbody>
            ${entry.rows.map(row => `<tr class="avoid-break">
              <td style="font-weight:bold;">${esc(row.hierarchy)}</td>
              <td>${nl2br(row.kpi)}</td>
              <td>${nl2br(row.baselineData)}</td>
              <td>Y1: ${esc(row.targets?.year1)}<br>Y2: ${esc(row.targets?.year2)}<br>Y3: ${esc(row.targets?.year3)}</td>
              <td>${nl2br(row.dataCollectionMethod)}</td>
              <td>${nl2br(row.responsibility)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    }).join("")}</div>

    ${allProjects.filter(pr => pr.type === "cross-agency").length > 0 ? `
    <div class="subsection-heading" style="margin-top:6mm;">F.2. Cross-Agency ICT Projects</div>
    <div class="subsection-block">${allProjects.filter(pr => pr.type === "cross-agency").map(proj => {
      const entry = perfEntries.find(e => e.projectTitle === proj.title) ??
        issp.part3.performanceFramework[proj.id];
      if (!entry) return `<p style="font-style:italic;">No KPI data for ${esc(proj.title)}.</p>`;
      return `<div class="avoid-break" style="margin-bottom:6mm;">
        <p style="font-weight:bold;margin-bottom:2mm;">Cross-Agency ICT Project: <em>${esc(proj.title)}</em></p>
        <table>
          <thead>
            <tr>
              <th style="width:15%">Hierarchy of Targeted Results</th>
              <th style="width:20%">KPIs</th>
              <th style="width:15%">Baseline Data</th>
              <th style="width:15%">Targets</th>
              <th style="width:20%">Data Collection Methods</th>
              <th style="width:15%">Responsibility</th>
            </tr>
          </thead>
          <tbody>
            ${entry.rows.map(row => `<tr class="avoid-break">
              <td style="font-weight:bold;">${esc(row.hierarchy)}</td>
              <td>${nl2br(row.kpi)}</td>
              <td>${nl2br(row.baselineData)}</td>
              <td>Y1: ${esc(row.targets?.year1)}<br>Y2: ${esc(row.targets?.year2)}<br>Y3: ${esc(row.targets?.year3)}</td>
              <td>${nl2br(row.dataCollectionMethod)}</td>
              <td>${nl2br(row.responsibility)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    }).join("")}</div>
    ` : ""}
  </div>`;
}

// ─── Part IV — year breakdown table ───────────────────────────────────────────

function renderYearTable(year: YearBudget, yearNum: number, yearLabel: number, internalProjects: IctProject[], crossAgencyProjects: IctProject[]): string {
  let grandTotal = 0;

  function coMooeSection(label: string, co: LineItem[], mooe: LineItem[]): string {
    const coTotal = sumLines(co);
    const mooeTotal = sumLines(mooe);
    const sectionTotal = coTotal + mooeTotal;

    function lineRows(lines: LineItem[]): string {
      const groups = groupByUacs(lines);
      return groups.map(g => `
        <tr>
          <td class="uacs-row" colspan="5">${esc(g.code)} — ${esc(g.label)}</td>
          <td class="uacs-row total-cell">${php(g.subtotal)}</td>
        </tr>
        ${g.items.map(l => `<tr>
          <td style="padding-left:8mm;">${esc(l.item)}</td>
          <td>${esc(l.office)}</td>
          <td>${fundSourceAbbr(l.fundSource)}</td>
          <td class="num-cell">${php(l.unitCost)}</td>
          <td class="num-cell">${l.qty}</td>
          <td class="num-cell">${php(total(l))}</td>
        </tr>`).join("")}
      `).join("");
    }

    return `
      <tr><td class="section-row" colspan="5">${esc(label)}</td><td class="section-row total-cell">${php(sectionTotal)}</td></tr>
      ${co.length > 0 ? `
        <tr><td class="section-row" colspan="5" style="padding-left:4mm;font-style:normal;">CAPITAL OUTLAY</td><td class="section-row total-cell">${php(coTotal)}</td></tr>
        ${lineRows(co)}` : ""}
      ${mooe.length > 0 ? `
        <tr><td class="section-row" colspan="5" style="padding-left:4mm;">MAINTENANCE AND OTHER OPERATING EXPENSES</td><td class="section-row total-cell">${php(mooeTotal)}</td></tr>
        ${lineRows(mooe)}` : ""}
    `;
  }

  // Office Productivity
  const opTotal = sumLines(year.officeProductivity.capitalOutlay) + sumLines(year.officeProductivity.mooe);
  grandTotal += opTotal;

  // Internal projects
  const internalRows = internalProjects.map(proj => {
    const pb = year.internalProjects[proj.id];
    if (!pb) return "";
    const t = sumLines(pb.capitalOutlay) + sumLines(pb.mooe);
    grandTotal += t;
    return coMooeSection(esc(proj.title), pb.capitalOutlay, pb.mooe);
  });

  // Cross-agency projects
  const crossRows = crossAgencyProjects.map(proj => {
    const pb = year.crossAgencyProjects[proj.id];
    if (!pb) return "";
    const t = sumLines(pb.capitalOutlay) + sumLines(pb.mooe);
    grandTotal += t;
    return coMooeSection(esc(proj.title), pb.capitalOutlay, pb.mooe);
  });

  // Continuing costs
  const ccTotal = sumLines(year.continuingCosts.mooe);
  grandTotal += ccTotal;

  return `<table class="piv-table">
    <thead>
      <tr>
        <th style="width:28%">Item</th>
        <th style="width:14%">Office Location (Deployment)</th>
        <th style="width:12%">Fund Source</th>
        <th style="width:12%">Unit Cost</th>
        <th style="width:10%">Physical Target</th>
        <th style="width:14%">Total Cost</th>
      </tr>
    </thead>
    <tbody>
      ${coMooeSection("OFFICE PRODUCTIVITY", year.officeProductivity.capitalOutlay, year.officeProductivity.mooe)}

      ${internalProjects.length > 0 ? `
        <tr><td class="section-row" colspan="5"><strong>INTERNAL ICT PROJECTS</strong></td>
          <td class="section-row total-cell">${php(internalProjects.reduce((s, p) => {
            const pb = year.internalProjects[p.id]; return s + (pb ? sumLines(pb.capitalOutlay) + sumLines(pb.mooe) : 0);
          }, 0))}</td></tr>
        ${internalRows.join("")}
      ` : ""}

      ${crossAgencyProjects.length > 0 ? `
        <tr><td class="section-row" colspan="5"><strong>CROSS-AGENCY ICT PROJECTS</strong></td>
          <td class="section-row total-cell">${php(crossAgencyProjects.reduce((s, p) => {
            const pb = year.crossAgencyProjects[p.id]; return s + (pb ? sumLines(pb.capitalOutlay) + sumLines(pb.mooe) : 0);
          }, 0))}</td></tr>
        ${crossRows.join("")}
      ` : ""}

      ${ccTotal > 0 || year.continuingCosts.mooe.length >= 0 ? `
        <tr><td class="section-row" colspan="5"><strong>CONTINUING COSTS/EXPENSES</strong></td><td class="section-row total-cell">${php(ccTotal)}</td></tr>
        ${year.continuingCosts.mooe.length > 0 ? `
          <tr><td class="section-row" colspan="5" style="padding-left:4mm;">MAINTENANCE AND OTHER OPERATING EXPENSES</td><td class="section-row total-cell">${php(ccTotal)}</td></tr>
          ${groupByUacs(year.continuingCosts.mooe).map(g => `
            <tr><td class="uacs-row" colspan="5">${esc(g.code)} — ${esc(g.label)}</td><td class="uacs-row total-cell">${php(g.subtotal)}</td></tr>
            ${g.items.map(l => `<tr>
              <td style="padding-left:8mm;">${esc(l.item)}</td>
              <td>${esc(l.office)}</td>
              <td>${fundSourceAbbr(l.fundSource)}</td>
              <td class="num-cell">${php(l.unitCost)}</td>
              <td class="num-cell">${l.qty}</td>
              <td class="num-cell">${php(total(l))}</td>
            </tr>`).join("")}
          `).join("")}
        ` : ""}
      ` : ""}

      <tr>
        <td class="grand-total" colspan="5"><strong>GRAND TOTAL</strong></td>
        <td class="grand-total total-cell"><strong>${php(grandTotal)}</strong></td>
      </tr>
    </tbody>
  </table>`;
}

function renderPart4(issp: IsspData): string {
  const p = issp.part4;
  const internalProjects = issp.part3.internalProjects;
  const crossAgencyProjects = issp.part3.crossAgencyProjects;

  const years: { key: "year1" | "year2" | "year3"; label: number }[] = [
    { key: "year1", label: issp.startYear },
    { key: "year2", label: issp.startYear + 1 },
    { key: "year3", label: issp.startYear + 2 },
  ];

  // Summary computations
  function allLines(year: YearBudget): LineItem[] {
    return [
      ...year.officeProductivity.capitalOutlay,
      ...year.officeProductivity.mooe,
      ...Object.values(year.internalProjects).flatMap(pb => [...pb.capitalOutlay, ...pb.mooe]),
      ...Object.values(year.crossAgencyProjects).flatMap(pb => [...pb.capitalOutlay, ...pb.mooe]),
      ...year.continuingCosts.mooe,
    ];
  }

  const allY1 = allLines(p.year1);
  const allY2 = allLines(p.year2);
  const allY3 = allLines(p.year3);
  const grandY1 = sumLines(allY1);
  const grandY2 = sumLines(allY2);
  const grandY3 = sumLines(allY3);

  // B.2 Fund source
  function byFundSource(lines: LineItem[]) {
    const m = new Map<string, number>();
    for (const l of lines) { m.set(l.fundSource, (m.get(l.fundSource) ?? 0) + total(l)); }
    return m;
  }
  const fs1 = byFundSource(allY1), fs2 = byFundSource(allY2), fs3 = byFundSource(allY3);
  const allFundSources = Array.from(new Set([...fs1.keys(), ...fs2.keys(), ...fs3.keys()]));

  // B.3 CO vs MOOE
  function coLines(year: YearBudget): LineItem[] {
    return [
      ...year.officeProductivity.capitalOutlay,
      ...Object.values(year.internalProjects).flatMap(pb => pb.capitalOutlay),
      ...Object.values(year.crossAgencyProjects).flatMap(pb => pb.capitalOutlay),
    ];
  }
  function mooeLines(year: YearBudget): LineItem[] {
    return [
      ...year.officeProductivity.mooe,
      ...Object.values(year.internalProjects).flatMap(pb => pb.mooe),
      ...Object.values(year.crossAgencyProjects).flatMap(pb => pb.mooe),
      ...year.continuingCosts.mooe,
    ];
  }

  // B.4 By UACS
  function byUacs(lines: LineItem[]) {
    const m = new Map<string, { label: string; total: number }>();
    for (const l of lines) {
      const k = l.uacsCode || "—";
      const cur = m.get(k) ?? { label: l.uacsLabel || k, total: 0 };
      m.set(k, { ...cur, total: cur.total + total(l) });
    }
    return m;
  }
  const ua1 = byUacs(allY1), ua2 = byUacs(allY2), ua3 = byUacs(allY3);
  const allUacs = Array.from(new Set([...ua1.keys(), ...ua2.keys(), ...ua3.keys()]));

  return `
    ${years.map(({ key, label }, i) => `
    <div class="${i === 0 ? "page-break" : "page-break"}">
      ${pageHeader(issp)}
      <div class="${i === 0 ? "part-heading" : "section-heading"}">
        ${i === 0 ? "Part IV. Resource Requirements<br><span style=\"font-size:13pt\">A. Detailed Resource Deployment and Cost Breakdown</span>" : ""}
      </div>
      <div class="subsection-heading">A.${i + 1}. [${label}]</div>
      <div class="subsection-block">${renderYearTable(p[key], i + 1, label, internalProjects, crossAgencyProjects)}</div>
    </div>`).join("")}

    <div class="page-break">
      ${pageHeader(issp)}
      <div class="section-heading">B. Summary of Investments</div>

      <div class="summary-section">
        <div class="summary-title">B.1. General Summary</div>
        <table>
          <thead>
            <tr><th>Category</th><th>${issp.startYear}</th><th>${issp.startYear + 1}</th><th>${issp.startYear + 2}</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Office Productivity / General ICT</td>
              <td class="num-cell">${php(sumLines(p.year1.officeProductivity.capitalOutlay) + sumLines(p.year1.officeProductivity.mooe))}</td>
              <td class="num-cell">${php(sumLines(p.year2.officeProductivity.capitalOutlay) + sumLines(p.year2.officeProductivity.mooe))}</td>
              <td class="num-cell">${php(sumLines(p.year3.officeProductivity.capitalOutlay) + sumLines(p.year3.officeProductivity.mooe))}</td>
              <td class="num-cell">${php(
                sumLines(p.year1.officeProductivity.capitalOutlay) + sumLines(p.year1.officeProductivity.mooe) +
                sumLines(p.year2.officeProductivity.capitalOutlay) + sumLines(p.year2.officeProductivity.mooe) +
                sumLines(p.year3.officeProductivity.capitalOutlay) + sumLines(p.year3.officeProductivity.mooe)
              )}</td>
            </tr>
            ${internalProjects.map(proj => {
              const t1 = (() => { const pb = p.year1.internalProjects[proj.id]; return pb ? sumLines(pb.capitalOutlay)+sumLines(pb.mooe) : 0; })();
              const t2 = (() => { const pb = p.year2.internalProjects[proj.id]; return pb ? sumLines(pb.capitalOutlay)+sumLines(pb.mooe) : 0; })();
              const t3 = (() => { const pb = p.year3.internalProjects[proj.id]; return pb ? sumLines(pb.capitalOutlay)+sumLines(pb.mooe) : 0; })();
              return `<tr>
                <td>${esc(proj.title)}</td>
                <td class="num-cell">${php(t1)}</td>
                <td class="num-cell">${php(t2)}</td>
                <td class="num-cell">${php(t3)}</td>
                <td class="num-cell">${php(t1+t2+t3)}</td>
              </tr>`;
            }).join("")}
            ${crossAgencyProjects.map(proj => {
              const t1 = (() => { const pb = p.year1.crossAgencyProjects[proj.id]; return pb ? sumLines(pb.capitalOutlay)+sumLines(pb.mooe) : 0; })();
              const t2 = (() => { const pb = p.year2.crossAgencyProjects[proj.id]; return pb ? sumLines(pb.capitalOutlay)+sumLines(pb.mooe) : 0; })();
              const t3 = (() => { const pb = p.year3.crossAgencyProjects[proj.id]; return pb ? sumLines(pb.capitalOutlay)+sumLines(pb.mooe) : 0; })();
              return `<tr>
                <td>${esc(proj.title)} <em>(Cross-Agency)</em></td>
                <td class="num-cell">${php(t1)}</td>
                <td class="num-cell">${php(t2)}</td>
                <td class="num-cell">${php(t3)}</td>
                <td class="num-cell">${php(t1+t2+t3)}</td>
              </tr>`;
            }).join("")}
            <tr>
              <td>Continuing / Recurring Costs</td>
              <td class="num-cell">${php(sumLines(p.year1.continuingCosts.mooe))}</td>
              <td class="num-cell">${php(sumLines(p.year2.continuingCosts.mooe))}</td>
              <td class="num-cell">${php(sumLines(p.year3.continuingCosts.mooe))}</td>
              <td class="num-cell">${php(sumLines(p.year1.continuingCosts.mooe)+sumLines(p.year2.continuingCosts.mooe)+sumLines(p.year3.continuingCosts.mooe))}</td>
            </tr>
            <tr style="background:#d9d9d9;font-weight:bold;">
              <td>GRAND TOTAL</td>
              <td class="num-cell">${php(grandY1)}</td>
              <td class="num-cell">${php(grandY2)}</td>
              <td class="num-cell">${php(grandY3)}</td>
              <td class="num-cell">${php(grandY1+grandY2+grandY3)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="summary-section">
        <div class="summary-title">B.2. Fund Source</div>
        <table>
          <thead><tr><th>Fund Source</th><th>${issp.startYear}</th><th>${issp.startYear + 1}</th><th>${issp.startYear + 2}</th><th>Total</th></tr></thead>
          <tbody>
            ${allFundSources.map(fs => {
              const a = fs1.get(fs)??0, b = fs2.get(fs)??0, c = fs3.get(fs)??0;
              return `<tr><td>${esc(fs)}</td><td class="num-cell">${php(a)}</td><td class="num-cell">${php(b)}</td><td class="num-cell">${php(c)}</td><td class="num-cell">${php(a+b+c)}</td></tr>`;
            }).join("")}
            <tr style="background:#d9d9d9;font-weight:bold;">
              <td>GRAND TOTAL</td>
              <td class="num-cell">${php(grandY1)}</td>
              <td class="num-cell">${php(grandY2)}</td>
              <td class="num-cell">${php(grandY3)}</td>
              <td class="num-cell">${php(grandY1+grandY2+grandY3)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="summary-section">
        <div class="summary-title">B.3. Statement of Expenditure</div>
        <table>
          <thead><tr><th>Expenditure Type</th><th>${issp.startYear}</th><th>${issp.startYear + 1}</th><th>${issp.startYear + 2}</th><th>Total</th></tr></thead>
          <tbody>
            ${[["Capital Outlay (CO)", coLines], ["Maintenance &amp; Other Operating Expenses (MOOE)", mooeLines]].map(([label, fn]) => {
              const a = sumLines((fn as (y: YearBudget)=>LineItem[])(p.year1));
              const b = sumLines((fn as (y: YearBudget)=>LineItem[])(p.year2));
              const c = sumLines((fn as (y: YearBudget)=>LineItem[])(p.year3));
              return `<tr><td>${label as string}</td><td class="num-cell">${php(a)}</td><td class="num-cell">${php(b)}</td><td class="num-cell">${php(c)}</td><td class="num-cell">${php(a+b+c)}</td></tr>`;
            }).join("")}
            <tr style="background:#d9d9d9;font-weight:bold;">
              <td>GRAND TOTAL</td>
              <td class="num-cell">${php(grandY1)}</td>
              <td class="num-cell">${php(grandY2)}</td>
              <td class="num-cell">${php(grandY3)}</td>
              <td class="num-cell">${php(grandY1+grandY2+grandY3)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="summary-section">
        <div class="summary-title">B.4. Object of Expenditure</div>
        <table>
          <thead><tr><th>UACS Object Code</th><th>${issp.startYear}</th><th>${issp.startYear + 1}</th><th>${issp.startYear + 2}</th><th>Total</th></tr></thead>
          <tbody>
            ${allUacs.map(code => {
              const e1 = ua1.get(code), e2 = ua2.get(code), e3 = ua3.get(code);
              const label = (e1 ?? e2 ?? e3)?.label ?? code;
              const a = e1?.total??0, b = e2?.total??0, c = e3?.total??0;
              return `<tr class="avoid-break">
                <td>${esc(code)} — ${esc(label)}</td>
                <td class="num-cell">${php(a)}</td>
                <td class="num-cell">${php(b)}</td>
                <td class="num-cell">${php(c)}</td>
                <td class="num-cell">${php(a+b+c)}</td>
              </tr>`;
            }).join("")}
            <tr style="background:#d9d9d9;font-weight:bold;">
              <td>GRAND TOTAL</td>
              <td class="num-cell">${php(grandY1)}</td>
              <td class="num-cell">${php(grandY2)}</td>
              <td class="num-cell">${php(grandY3)}</td>
              <td class="num-cell">${php(grandY1+grandY2+grandY3)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── Main render function ──────────────────────────────────────────────────────

export function renderIsspHtml(issp: IsspData): string {
  const body = [
    renderCover(issp),
    renderToc(issp),
    renderDefinitions(issp),
    renderPart1(issp),
    renderPart2(issp),
    renderPart3(issp),
    renderPart4(issp),
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(issp.title)}</title>
  <style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}
