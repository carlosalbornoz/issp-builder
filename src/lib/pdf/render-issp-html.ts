import { STANDARD_DEFINITIONS } from "@/lib/store/defaults";
import { CYBER_GROUPS } from "@/lib/cyber-controls";
import { isRichText, sanitizeRichText } from "@/lib/rich-text";

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
  stakeholders: { name: string; services: { name: string; complexity: string; direction: string }[] }[];
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
  frontlineAccessType?: string;
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
  pia?: { processesPersonalInfo: "yes" | "no" | "" | boolean; piaCompleted?: boolean | null };
  // Proposed IS extras
  status?: string;
}

interface StrategicConcern { ooSoMfo: string; criticalSystem: string; problem: string; intendedIctUse: string }

interface EgpEntry {
  /** Template checklist is strictly Yes/No — no "Proposed" or "Not Applicable" box exists. */
  status: "yes" | "no" | "";
  url?: string;
  equivalentName?: string;
  equivalentUrl?: string;
  ifNo?: {
    usingEquivalent?: boolean;
    manual?: boolean;
    proposedDevelopment?: boolean;
    otherPlatform?: boolean;
  };
  mechanisms?: {
    website: boolean;
    email: boolean;
    landline: boolean;
    socialMedia: boolean;
    mobile: boolean;
  };
  connectedToPortal?: "yes" | "no" | "";
  adoptionPercentage?: number;
  channels?: string;
}

interface Part2 {
  strategicConcerns: StrategicConcern[];
  networkDiagrams: NetworkDiagram[];
  networkDescription: string | null;
  cybersecurityControls: CyberGroup;
  informationSystems: IsSystem[];
  egpChecklist: Record<string, EgpEntry | undefined>;
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
  proposedNetworkDataUrl?: string | null;
  proposedNetworkDesc: string | null;
  proposedCybersecControls: CyberGroup;
  enterpriseArchDataUrl?: string | null;
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
  agencyHeadName: string;
  agency: Agency;
  /** Definition of Terms (front matter). Absent = standard template terms. */
  definitions?: { term: string; definition: string }[];
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

function richText(s: string | null | undefined): string {
  if (!s) return "";
  return `<span class="rich-text">${isRichText(s) ? sanitizeRichText(s) : nl2br(s)}</span>`;
}

// ─── TOC markers (two-pass page numbering) ────────────────────────────────────
// Pass 1 renders invisible marker text at each TOC-able heading; generate-pdf
// extracts which physical page each marker lands on, then pass 2 re-renders
// with the real numbers (markers stripped). Markers are absolutely positioned
// transparent text, so they never affect pagination.

let MARKERS_ENABLED = false;

function tocMark(id: string): string {
  if (!MARKERS_ENABLED) return "";
  return `<span class="toc-marker">@@toc:${id}@@</span>`;
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

/** Nests content one indent level deeper — mirrors the template's hanging-indent
 * checkbox sub-lists (each level of "If No, > checkbox > sub-field" nests further).
 * Shared by the EGP checklist and the IS inventory cards. */
function tmplIndent(html: string): string {
  return `<div style="margin-left:4mm">${html}</div>`;
}

/** Label followed by a fill-in-the-blank underline on the same line. The blank
 * stretches (flex:1) to the column's right edge regardless of indent level or
 * label length, so every underline in the column ends at the same x position —
 * and stays underlined whether it's empty or filled in, like a real form field. */
function tmplBlankInline(label: string, value: string | undefined): string {
  return `<div style="display:flex;align-items:baseline;"><span style="white-space:nowrap;">${label}</span><span style="flex:1;border-bottom:1px solid #000;margin-left:1mm;min-height:1em;">${value ? esc(value) : "&nbsp;"}</span></div>`;
}

/** Full-width fill-in-the-blank underline on its own line, below a label. */
function tmplBlankBlock(value: string | undefined): string {
  return `<div style="border-bottom:1px solid #000;min-height:1em;">${value ? esc(value) : "&nbsp;"}</div>`;
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

function isFundSource(s: string, expected: "gaa" | "foreign" | "local" | "other"): boolean {
  const normalized = s.toLowerCase().replace(/[-\s()]/g, "");
  if (expected === "gaa") return normalized === "gaa" || normalized.includes("generalappropriationsact");
  if (expected === "foreign") return normalized.includes("foreignassisted");
  if (expected === "local") return normalized.includes("locallyfunded");
  return normalized.includes("otherincomegeneratingsources");
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
  .toc-marker { position: absolute; font-size: 2px; color: transparent; }
  .toc-entry { display: flex; justify-content: space-between; margin-bottom: 0.5mm; font-size: 10pt; }
  .toc-link { display: flex; flex: 1; color: inherit; text-decoration: none; }
  /* Fixed-width page cell so pass 1 (blank) and pass 2 (numbers) paginate identically */
  .toc-page-num { flex: 0 0 10mm; text-align: right; }
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

  /* ── Rich-text fields (bold/italic/underline/bullets) ── */
  .rich-text ul { margin: 1mm 0; padding-left: 5mm; }
  .rich-text li { margin-bottom: 0.5mm; }

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

function renderScopeTree(scopeKey: string): string {
  const s = scopeKey;
  const deptWide        = s === "DEPARTMENT_WIDE";
  const deptCo          = s === "DEPARTMENT_CENTRAL_ONLY" || s === "CENTRAL_ONLY";
  const deptCoOnly      = s === "DEPARTMENT_CENTRAL_ONLY" || s === "CENTRAL_ONLY";
  const agencyWide      = ["WITH_REGIONAL","AGENCY_WITH_REGIONAL","WITH_BUREAUS","AGENCY_WIDE","AGENCY_CENTRAL_ONLY","OTHER_GOVERNMENT_ENTITY"].includes(s);
  const agencyCoOnly    = s === "AGENCY_CENTRAL_ONLY";
  const agencyRegional  = s === "WITH_REGIONAL" || s === "AGENCY_WITH_REGIONAL";
  const agencyBureaus   = s === "WITH_BUREAUS";
  const otherGov        = s === "OTHER_GOVERNMENT_ENTITY";
  const lgu             = s === "LGU_SCOPE";
  return `
    <span class="cover-scope-item">${chk(deptWide)} Department-Wide</span>
    <span class="cover-scope-item">${chk(deptCo)} Department - Central Office / Head Office</span>
    <span class="cover-scope-sub">${chk(deptCoOnly)} Central Office only</span>
    <span class="cover-scope-sub">${chk(false)} With Regional Offices / Field Offices &nbsp;&nbsp; ${chk(false)} With Bureaus</span>
    <span class="cover-scope-item">${chk(agencyWide)} Agency-Wide</span>
    <span class="cover-scope-sub">${chk(agencyCoOnly)} Central Office only</span>
    <span class="cover-scope-sub">${chk(agencyRegional)} With Regional Offices / Field Offices</span>
    <span class="cover-scope-sub">${chk(agencyBureaus)} With Bureaus / Attached Agencies</span>
    <span class="cover-scope-sub">${chk(otherGov)} Other Government Entity</span>
    <span class="cover-scope-item">${chk(lgu)} LGU</span>
  `;
}

function renderCover(issp: IsspData): string {
  const isAmendment = issp.amendmentNumber > 0;
  const amendOrdinal = ["", "1st", "2nd", "3rd"][issp.amendmentNumber] ?? `${issp.amendmentNumber}th`;

  const coverLogoHtml = issp.agency.logoSrc?.startsWith("data:image/")
    ? `<img src="${esc(issp.agency.logoSrc)}" style="height:40px;width:auto;object-fit:contain;margin-bottom:3mm;" />`
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
        <div style="margin-top:12mm;text-align:center;">${esc(issp.part1.cioName)}</div>
        <div class="cover-sig-line" style="margin-top:0;"></div>
        <div class="cover-sig-label" style="text-align:center;">Name &amp; Signature of Chief Information Officer</div>
      </div>
      <div class="cover-scope">
        <div class="cover-scope-title">Scope</div>
        ${renderScopeTree(issp.scope)}
      </div>
    </div>

    <div class="cover-sigs" style="margin-top:10mm;">
      <div class="cover-sig-block">
        <div style="font-weight:bold;margin-bottom:2mm;">APPROVED BY:</div>
        <div style="margin-top:12mm;text-align:center;">${esc(issp.agencyHeadName)}</div>
        <div class="cover-sig-line" style="margin-top:0;"></div>
        <div class="cover-sig-label" style="text-align:center;">Name &amp; Signature of Agency Head</div>
      </div>
    </div>
  </div>`;
}

// ─── Table of Contents ────────────────────────────────────────────────────────

export interface TocEntry {
  id: string;
  label: string;
  level: "part" | "section" | "sub";
}

/** Single source of truth for the printed TOC, clickable links, and PDF outline. */
export function getTocEntries(issp: IsspData): TocEntry[] {
  const p3 = issp.part3;
  const hasE2 = p3.crossAgencyProjects.length > 0;

  return [
    // Front matter: roman numeral by convention; content numbering starts at Part I = 1
    ...(definitionTerms(issp).length > 0
      ? [{ id: "defs", label: "DEFINITION OF TERMS", level: "part" as const }]
      : []),
    { id: "part1", label: "PART I. AGENCY PROFILE & STRATEGIC CONTEXT", level: "part" },
    { id: "part1-a", label: "A. MANDATE, VISION, MISSION, AND ORGANIZATIONAL OUTCOME", level: "section" },
    { id: "part1-b", label: "B. ORGANIZATIONAL STRUCTURE", level: "section" },
    { id: "part1-c", label: "C. STAKEHOLDER ANALYSIS", level: "section" },
    { id: "part2", label: "PART II. CURRENT ICT ASSESSMENT", level: "part" },
    { id: "part2-a", label: "A. STRATEGIC CONCERNS FOR ICT USE", level: "section" },
    { id: "part2-b", label: "B. EXISTING NETWORK INFRASTRUCTURE", level: "section" },
    { id: "part2-b1", label: "B1. LAN/WAN SET-UP INCLUDING CONNECTIVITY TYPE AND BANDWIDTH", level: "sub" },
    { id: "part2-b2", label: "B2. CYBERSECURITY CONTROL CHECKLIST", level: "sub" },
    { id: "part2-c", label: "C. EXISTING/OPERATIONAL INFORMATION SYSTEMS (IS) INVENTORY", level: "section" },
    { id: "part2-d", label: "D. E-GOVERNMENT PROGRAMS (EGP) CHECKLIST", level: "section" },
    { id: "part3", label: "PART III. PROPOSED ICT STRATEGY", level: "part" },
    { id: "part3-a", label: "A. PROPOSED NETWORK INFRASTRUCTURE", level: "section" },
    { id: "part3-b", label: "B. ENTERPRISE ARCHITECTURE", level: "section" },
    { id: "part3-c", label: "C. PROPOSED ICT HUMAN CAPITAL", level: "section" },
    { id: "part3-d", label: "D. PROPOSED INFORMATION SYSTEMS", level: "section" },
    { id: "part3-e", label: "E. ICT PROJECTS", level: "section" },
    { id: "part3-e1", label: "E.1. INTERNAL ICT PROJECTS", level: "sub" },
    ...(hasE2 ? [{ id: "part3-e2", label: "E.2. CROSS-AGENCY ICT PROJECTS", level: "sub" as const }] : []),
    { id: "part3-f", label: "F. PERFORMANCE MEASUREMENT FRAMEWORK", level: "section" },
    { id: "part4", label: "PART IV. RESOURCE REQUIREMENTS", level: "part" },
    { id: "part4-a", label: "A. DETAILED RESOURCE DEPLOYMENT AND COST BREAKDOWN", level: "section" },
    { id: "part4-a1", label: `A.1. [${issp.startYear}]`, level: "sub" },
    { id: "part4-a2", label: `A.2. [${issp.startYear + 1}]`, level: "sub" },
    { id: "part4-a3", label: `A.3. [${issp.startYear + 2}]`, level: "sub" },
    { id: "part4-b", label: "B. SUMMARY OF INVESTMENTS", level: "section" },
    { id: "part4-b1", label: "B.1. GENERAL SUMMARY", level: "sub" },
    { id: "part4-b2", label: "B.2. FUND SOURCE", level: "sub" },
    { id: "part4-b3", label: "B.3. STATEMENT OF EXPENDITURE", level: "sub" },
    { id: "part4-b4", label: "B.4. OBJECT OF EXPENDITURE", level: "sub" },
  ];
}

function renderToc(issp: IsspData, tocPages: Record<string, number> | null): string {
  const rows = getTocEntries(issp);

  return `<div class="page-break">
    ${pageHeader(issp)}
    <div class="toc-title">Table of Contents</div>
    ${rows.map(r => `
    <div class="toc-entry toc-${r.level}">
      <a class="toc-link" href="https://issp.local/toc/${r.id}">
        <span>${esc(r.label)}</span>
        <span class="toc-dots"></span>
        <span class="toc-page-num">${r.id === "defs" ? "i" : tocPages?.[r.id] ?? "&nbsp;"}</span>
      </a>
    </div>`).join("")}
  </div>`;
}

// ─── Definition of Terms ──────────────────────────────────────────────────────

function definitionTerms(issp: IsspData): { term: string; definition: string }[] {
  return (issp.definitions ?? [...STANDARD_DEFINITIONS])
    .filter((t) => t.term.trim())
    .sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
}

function renderDefinitions(issp: IsspData, withTocMarker = false): string {
  const terms = definitionTerms(issp);
  if (terms.length === 0) return "";
  return `<div class="page-break">
    ${pageHeader(issp)}
    <div class="def-heading">${withTocMarker ? `<span class="toc-marker">@@toc:defs@@</span>` : ""}DEFINITION OF TERMS</div>
    <table>
      <thead><tr><th style="width:33%">Terms</th><th>Definition</th></tr></thead>
      <tbody>
        ${terms.map(t => `<tr class="avoid-break"><td>${esc(t.term)}</td><td>${nl2br(t.definition)}</td></tr>`).join("")}
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
    <div class="part-heading">${tocMark("part1")}Part I. Agency Profile &amp; Strategic Context</div>

    <div class="section-heading">${tocMark("part1-a")}A. Mandate, Vision, Mission, and Organizational Outcome</div>

    <div class="subsection-heading">A.1. Mandate</div>
    <div class="subsection-block"><ul class="template-list">
      <li><span class="field-label">Legal Basis:</span> ${esc(p.legalBasis)}</li>
      <li><span class="field-label">Function:</span> ${richText(p.mandateFunction)}</li>
    </ul></div>

    <div class="subsection-heading">A.2. Vision Statement</div>
    <div class="subsection-block"><p class="field-value">${richText(p.visionStatement)}</p></div>

    <div class="subsection-heading">A.3. Mission Statement</div>
    <div class="subsection-block"><p class="field-value">${nl2br(p.missionStatement)}</p></div>

    <div class="subsection-heading">A.4. ${esc(oo)}</div>
    <div class="subsection-block">${p.orgOutcomes.length === 0 ? "<p><em>None specified.</em></p>" :
      p.orgOutcomes.map((oo, i) => `<div class="avoid-break" style="margin-bottom:3mm;">
        <p style="font-weight:bold;">${i + 1}. ${esc(oo.name)}</p>
        ${oo.programs?.length ? `<ul class="template-list">${oo.programs.map(pg => `<li>${esc(pg)}</li>`).join("")}</ul>` : ""}
      </div>`).join("")
    }</div>

    <div class="section-heading">${tocMark("part1-b")}B. Organizational Structure</div>

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

    <div class="section-heading">${tocMark("part1-c")}C. Stakeholder Analysis</div>
    <table>
      <thead><tr><th style="width:33%">Stakeholders</th><th style="width:40%">Transaction Processed</th><th>Complexity</th></tr></thead>
      <tbody>
        ${p.stakeholders.length === 0
          ? `<tr><td colspan="3" style="text-align:center;font-style:italic;">No stakeholders specified.</td></tr>`
          : p.stakeholders.map(s => {
              const svs = s.services ?? [];
              if (svs.length === 0) {
                return `<tr class="avoid-break"><td>${esc(s.name)}</td><td colspan="2" style="text-align:center;font-style:italic;">No services listed.</td></tr>`;
              }
              type Svc = { name: string; complexity: string; direction: string };
              const groups: { label: string; items: Svc[] }[] = [
                { label: "INCOMING:", items: svs.filter(sv => sv.direction === "INCOMING") },
                { label: "OUTGOING:", items: svs.filter(sv => sv.direction === "OUTGOING") },
                { label: "UNSPECIFIED:", items: svs.filter(sv => sv.direction !== "INCOMING" && sv.direction !== "OUTGOING") },
              ].filter(g => g.items.length > 0);
              const totalRows = groups.reduce((n, g) => n + 1 + g.items.length, 0);
              return groups.map((g, gi) => {
                const labelRow = `<tr class="avoid-break">
                  ${gi === 0 ? `<td rowspan="${totalRows}" style="vertical-align:top;">${esc(s.name)}</td>` : ""}
                  <td colspan="2" class="field-label" style="background:#d9d9d9;">${g.label}</td>
                </tr>`;
                const itemRows = g.items.map(sv => `<tr class="avoid-break">
                  <td>${esc(sv.name)}</td>
                  <td style="text-align:center;">${esc(sv.complexity)}</td>
                </tr>`).join("");
                return labelRow + itemRows;
              }).join("");
            }).join("")
        }
      </tbody>
    </table>
  </div>`;
}

// ─── Cybersecurity checklist table (shared by Part II-B2 and III-A2) ──────────

function renderCyberTable(controls: CyberGroup): string {
  const rows = CYBER_GROUPS.map((group) => ({
    group: group.label.toUpperCase(),
    mandatory: group.items.filter((item) => item.mandatory),
    optional: group.items.filter((item) => !item.mandatory),
    src: controls[group.key],
  }));

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
  const piaAnswer = pia?.processesPersonalInfo;
  const piaYes = piaAnswer === true || piaAnswer === "yes";
  const piaNo = piaAnswer === "no";
  const isOps = sys.classification === "Operations";
  const access = sys.frontlineAccessType;

  // Per-line block with explicit left padding — gives full control over the deep
  // template nesting (Classification → Frontline → Identify-if → Online → Provide-link)
  // without div-in-text flow problems. Principle #14: the full template branch
  // always renders; the selected classification only changes its check-marks.
  const L = (mm: number, content: string) => `<div style="padding-left:${mm}mm;">${content}</div>`;

  // ── Classification cell ──
  const classificationCell = [
    L(0, `${chk(sys.classification === "Support to Operations")} Support to Operations`),
    L(0, `${chk(sys.classification === "General Administrative Systems")} General Administrative Systems`),
    L(0, `${chk(isOps)} Operations`),
    L(4, `<em>If yes, indicate whether the system supports:</em>`),
    L(8, `${chk(isOps && sys.frontline === true)} Frontline Service (directly used for public/client service delivery)`),
    L(12, `Identify if:`),
    L(16, `${chk(isOps && sys.frontline === true && access === "Online")} Online`),
    L(20, tmplBlankInline("Provide link:", isOps && sys.frontline === true && access === "Online" ? sys.url : undefined)),
    L(16, `${chk(isOps && sys.frontline === true && access === "On-premise")} On-premise`),
    L(16, `${chk(isOps && sys.frontline === true && access === "Hybrid")} Hybrid`),
    L(8, `${chk(isOps && sys.frontline === false)} Non-Frontline Service (supports core mandate but not directly used by clients/public)`),
  ].join("");

  // ── Interoperability cell — tense + parentheticals branch on proposed ──
  const integratedLabel = isProposed
    ? "Integration with another system (If the system will exchange data or will be technically integrated with another system)"
    : "Integrated with another system (If the system exchanges data or is technically integrated with another system)";
  const generatesLabel = isProposed
    ? "Generate data that will be utilized by other system (The system will generate and produce data that will be consumed, referenced, or reused by another system)"
    : "Generates data that is utilized by other system (The system generates and produces data that is consumed, referenced, or reused by another system)";
  const processesLabel = isProposed
    ? "Process data generated from other system (The system will receive and process data generated from another system)"
    : "Processes data generated from other system (The system receives and processes data generated from another system)";
  const sharedLabel = isProposed
    ? "Deployment on a shared platform (The system will be hosted on the same platform or infrastructure with other systems)"
    : "Deployed on a shared platform (The system is hosted on the same platform or infrastructure with other systems)";
  const interopCell = [
    L(0, `${chk(interop?.integrated)} ${integratedLabel}`),
    L(4, `<em>If yes, specify the system name</em>`),
    L(8, tmplBlankInline("Internal System:", interop?.internalSystems?.join(", "))),
    L(8, tmplBlankInline("External System:", interop?.externalSystems?.join(", "))),
    L(8, `${chk(interop?.generatesData)} ${generatesLabel}`),
    L(8, `${chk(interop?.processesExternalData)} ${processesLabel}`),
    L(0, `${chk(interop?.sharedPlatform)} ${sharedLabel}`),
  ].join("");

  // ── PIA cell — label, question tense, and the "did it undergo PIA" follow-up branch on proposed ──
  const piaLabel = isProposed ? "PRIVACY IMPACT ASSESSMENT" : "PRIVACY IMPACT ASSESSMENT (PIA)";
  const piaQuestion = isProposed
    ? "Will the system process personal information? (Will the system collect, store, or process names, addresses, photos, or any info that can identify an individual?)"
    : "Is the system processing personal information? (Does the system collect, store, or process names, addresses, photos, or any info that can identify an individual?)";
  const piaCell = [
    L(0, piaQuestion),
    L(4, `${chk(piaYes)} Yes`),
    L(4, `${chk(piaNo)} No`),
    // The "did the system undergo PIA?" follow-up exists only in the Existing template.
    ...(isProposed ? [] : [
      L(0, `<em>If Yes, did the system undergo PIA?</em>`),
      L(4, `${chk(pia?.piaCompleted === true)} Yes`),
      L(4, `${chk(pia?.piaCompleted === false)} No`),
    ]),
  ].join("");

  return `<div class="is-card avoid-break">
    <table>
      <tbody>
        <tr class="avoid-break"><td class="label-cell">INFORMATION SYSTEM NAME</td><td><strong>${esc(sys.name)}</strong></td></tr>
        <tr class="avoid-break"><td class="label-cell">CLASSIFICATION</td><td>${classificationCell}</td></tr>
        <tr class="avoid-break"><td class="label-cell">DESCRIPTION &amp; PURPOSE</td><td>${nl2br(sys.description)}</td></tr>
        ${isProposed ? `<tr class="avoid-break"><td class="label-cell">STATUS</td><td>${esc(sys.status)}</td></tr>` : ""}
        <tr class="avoid-break"><td class="label-cell">DEVELOPMENT STRATEGY</td><td>${esc(sys.developmentStrategy)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">DEVELOPMENT PLATFORM</td><td>${esc(sys.developmentPlatform)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">DATABASE NAME</td><td>${esc(sys.databaseName)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">DATA STORAGE</td><td>${esc(sys.dataStorage)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">INTERNAL USERS</td><td>${esc(sys.internalUsers)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">EXTERNAL USERS</td><td>${esc(sys.externalUsers)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">OWNER</td><td>${esc(sys.owner)}</td></tr>
        <tr class="avoid-break"><td class="label-cell">INTEROPERABILITY</td><td>${interopCell}</td></tr>
        <tr class="avoid-break"><td class="label-cell">${piaLabel}</td><td>${piaCell}</td></tr>
      </tbody>
    </table>
  </div>`;
}

// ─── Part II ──────────────────────────────────────────────────────────────────

function renderPart2(issp: IsspData): string {
  const p = issp.part2;
  const baseUrl = process.env.APP_URL || "http://localhost:3000";

  // Network diagram images (one per diagram, displayed inline; PDF rendering will embed them)
  const diagrams = p.networkDiagrams ?? [];

  // EGP checklist rows — question wording and column layout mirror the DICT
  // reference template (references/egp-checklist.docx) exactly, row by row.
  type IfNoOption = "equivalent" | "manual" | "proposedDev" | "otherPlatform";
  interface EgpRowConfig {
    key: string; num: number; title: string; subtitle?: string;
    question?: string; // omitted for pnpki/onlinePortal, which have custom col2/col3 layouts
    showUrlOnYes?: boolean;
    ifNoOptions?: IfNoOption[];
    manualLabel?: string;
    equivalentUrlOnNo?: boolean;
    showEquivalentOnYes?: boolean;
  }

  const egpPrograms: EgpRowConfig[] = [
    {
      key: "elgu", num: 1, title: "ELECTRONIC LOCAL GOVERNMENT UNIT (ELGU) SYSTEM", subtitle: "(Applicable only to LGUs)",
      question: "Is your LGU already utilizing the eLGU system?",
      showUrlOnYes: true, ifNoOptions: ["equivalent", "manual"], manualLabel: "Manual Transaction", equivalentUrlOnNo: true,
    },
    {
      key: "eGovPay", num: 2, title: "GOVERNMENT DIGITAL PAYMENT SYSTEM FOR COLLECTION AND DISBURSEMENT",
      question: "Is your agency utilizing eGovPay?",
      ifNoOptions: ["otherPlatform", "manual", "proposedDev"], manualLabel: "Manual Transaction",
    },
    { key: "pnpki", num: 3, title: "GOVERNMENT PUBLIC KEY INFRASTRUCTURE (PKI) PROGRAM" },
    {
      key: "hcmis", num: 4, title: "HUMAN CAPITAL MANAGEMENT INFORMATION SYSTEM (HCMIS)",
      question: "Is your agency utilizing the HCMIS?",
      ifNoOptions: ["equivalent", "manual", "proposedDev"], manualLabel: "Manual processing",
    },
    {
      key: "ifmis", num: 5, title: "INTEGRATED FINANCIAL MANAGEMENT INFORMATION SYSTEM (IFMIS)",
      question: "Is your agency utilizing the IFMIS?",
      ifNoOptions: ["equivalent", "manual", "proposedDev"], manualLabel: "Manual processing",
    },
    { key: "onlinePortal", num: 6, title: "ONLINE PUBLIC SERVICE PORTAL" },
    {
      key: "procurement", num: 7, title: "PROCUREMENT SYSTEM",
      question: "Is your agency utilizing the Philippine Government Procurement System?",
      ifNoOptions: ["equivalent", "manual", "proposedDev"], manualLabel: "Manual processing",
    },
    {
      key: "recordsMgmt", num: 8, title: "RECORDS AND KNOWLEDGE MANAGEMENT INFORMATION SYSTEM",
      question: "Is there an existing repository for Records and Knowledge Management in your agency?",
      showEquivalentOnYes: true,
    },
    {
      key: "pscp", num: 9, title: "PUBLIC SERVICE CONTINUITY PLAN",
      question: "Is there an existing Public Service Continuity Plan in your agency?",
    },
  ];

  /** EGP locals delegate to the shared module helpers (tmpl*). Kept as thin wrappers
   * so the verified EGP call sites stay untouched. */
  function egpIndent(html: string): string {
    return tmplIndent(html);
  }

  function egpYesNoStack(isYes: boolean, isNo: boolean): string {
    return tmplIndent(`${chk(isYes)} Yes<br>${chk(isNo)} No`);
  }

  function egpBlankInline(label: string, value: string | undefined): string {
    return tmplBlankInline(label, value);
  }

  function egpBlankBlock(value: string | undefined): string {
    return tmplBlankBlock(value);
  }

  function egpQuestionCell(cfg: EgpRowConfig, e: EgpEntry | undefined): string {
    if (cfg.key === "pnpki") {
      return `<em>Percentage of adoption of PNPKI (ratio of total number of employees with active PNPKI certificates over total number of employees)</em>` +
        `<br><strong>${Number(e?.adoptionPercentage ?? 0)}%</strong>`;
    }
    if (cfg.key === "onlinePortal") {
      const MECHANISM_LABELS: [keyof NonNullable<EgpEntry["mechanisms"]>, string][] = [
        ["website", "Website"], ["email", "Email"], ["landline", "Landline"],
        ["socialMedia", "Social Media"], ["mobile", "Mobile"],
      ];
      return `What are the existing consumer protection and citizen assistance, feedback and grievance mechanisms in your agency?<br><br>` +
        egpIndent(MECHANISM_LABELS.map(([k, label]) => `${chk(e?.mechanisms?.[k])} ${label}`).join("<br>"));
    }
    return `${esc(cfg.question!)}<br><br>${egpYesNoStack(e?.status === "yes", e?.status === "no")}`;
  }

  /** Always renders every branch the template has for this row (If Yes / If No,
   * with all its checkboxes) regardless of the actual answer — only the checked
   * state and filled-in blanks change. Matches the fillable template exactly;
   * an unanswered or entirely missing entry just renders with nothing ticked. */
  function egpDetailsCell(cfg: EgpRowConfig, e: EgpEntry | undefined): string {
    if (cfg.key === "pnpki") return "—";
    if (cfg.key === "onlinePortal") {
      const lines: string[] = [
        `Are these mechanisms already connected with online public service portals?<br><br>` +
          egpYesNoStack(e?.connectedToPortal === "yes", e?.connectedToPortal === "no"),
      ];
      if (e?.url) lines.push(`URL: ${esc(e.url)}`);
      return lines.join("<br>");
    }
    const blocks: string[] = [];
    if (cfg.showUrlOnYes) {
      blocks.push(`If Yes,<br>${egpIndent(egpBlankInline("Indicate url:", e?.url))}`);
    }
    if (cfg.showEquivalentOnYes) {
      blocks.push(`If Yes, indicate the system:<br>${egpIndent(egpBlankBlock(e?.equivalentName))}`);
    }
    if (cfg.ifNoOptions) {
      const items: string[] = [];
      if (cfg.ifNoOptions.includes("otherPlatform")) {
        items.push(`${chk(e?.ifNo?.otherPlatform)} Using other digital or electronic payment platform`);
      }
      if (cfg.ifNoOptions.includes("equivalent")) {
        const subFields = [egpBlankInline("IS name:", e?.equivalentName)];
        if (cfg.equivalentUrlOnNo) subFields.push(egpBlankInline("Indicate url:", e?.equivalentUrl));
        items.push(`${chk(e?.ifNo?.usingEquivalent)} Using equivalent system:<br>${egpIndent(subFields.join(""))}`);
      }
      if (cfg.ifNoOptions.includes("manual")) {
        items.push(`${chk(e?.ifNo?.manual)} ${cfg.manualLabel ?? "Manual processing"}`);
      }
      if (cfg.ifNoOptions.includes("proposedDev")) {
        items.push(`${chk(e?.ifNo?.proposedDevelopment)} Proposed development of equivalent system`);
      }
      blocks.push(`If No,<br>${egpIndent(items.join("<br>"))}`);
    }
    return blocks.length ? blocks.join("<br><br>") : "—";
  }

  return `<div class="page-break">
    ${pageHeader(issp)}
    <div class="part-heading">${tocMark("part2")}Part II. Current ICT Assessment</div>

    <div class="section-heading">${tocMark("part2-a")}A. Strategic Concerns for ICT Use</div>
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

    <div class="section-heading">${tocMark("part2-b")}B. Existing Network Infrastructure</div>
    <div class="subsection-heading">${tocMark("part2-b1")}B1. LAN/WAN Set-Up Including Connectivity Type and Bandwidth</div>
    <div class="subsection-block">${diagrams.length === 0
      ? `<p style="font-style:italic;">No network diagrams uploaded.</p>`
      : diagrams.map((d, i) => `<div class="avoid-break" style="margin-bottom:5mm;">
          <p style="font-weight:bold;margin-bottom:2mm;">${esc(d.title || `Network Diagram ${i + 1}`)}</p>
          <img src="${esc(d.path.startsWith("data:image/") ? d.path : baseUrl + d.path)}" style="max-width:100%;max-height:120mm;object-fit:contain;display:block;" alt="${esc(d.title || `Diagram ${i + 1}`)}" />
        </div>`).join("")
    }
    ${p.networkDescription ? `<p style="margin-top:3mm;">${nl2br(p.networkDescription)}</p>` : ""}</div>

    <div class="subsection-heading" style="margin-top:6mm;">${tocMark("part2-b2")}B2. Cybersecurity Control Checklist</div>
    <div class="subsection-block">${renderCyberTable(p.cybersecurityControls)}</div>

    <div class="section-heading page-break">${tocMark("part2-c")}C. Existing/Operational Information Systems (IS) Inventory</div>
    ${pageHeader(issp)}
    ${p.informationSystems.length === 0
      ? `<p style="font-style:italic;">No information systems specified.</p>`
      : p.informationSystems.map(sys => renderIsCard(sys)).join("")
    }

    <div class="section-heading page-break">${tocMark("part2-d")}D. E-Government Programs (EGP) Checklist</div>
    ${pageHeader(issp)}
    <table>
      <colgroup><col style="width:26%"><col style="width:39%"><col></colgroup>
      <tbody>
        ${egpPrograms.map(prog => {
          const e = p.egpChecklist[prog.key];
          return `<tr class="avoid-break">
          <td><div style="display:flex;"><div><strong>${prog.num}.&nbsp;</strong></div><div><strong>${esc(prog.title)}</strong>${prog.subtitle ? `<br><em>${esc(prog.subtitle)}</em>` : ""}</div></div></td>
          <td>${egpQuestionCell(prog, e)}</td>
          <td>${egpDetailsCell(prog, e)}</td>
        </tr>`;
        }).join("")}
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
          ${chk(sa["othersChecked"] === true || !!(sa["others"] as string))} Others: ${esc((sa["others"] as string) || "")}
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
          ${chk(isFundSource(proj.fundingSource, "gaa"))} GAA<br>
          ${chk(isFundSource(proj.fundingSource, "foreign"))} Foreign-assisted projects<br>
          ${chk(isFundSource(proj.fundingSource, "local"))} Locally funded<br>
          ${chk(isFundSource(proj.fundingSource, "other"))} Other Income Generating Sources
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
    <div class="part-heading">${tocMark("part3")}Part III. Proposed ICT Strategy</div>

    <div class="section-heading">${tocMark("part3-a")}A. Proposed Network Infrastructure</div>
    <div class="subsection-heading">A.1. LAN/WAN Set-Up Including Connectivity Type and Bandwidth</div>
    <div class="subsection-block">${p.proposedNetworkDesc
      ? `<p>${nl2br(p.proposedNetworkDesc)}</p>`
      : `<p style="font-style:italic;">No proposed network description specified.</p>`
    }
    ${p.proposedNetworkDataUrl
      ? `<div class="avoid-break" style="margin-top:5mm;">
          <p style="font-weight:bold;margin-bottom:2mm;">Proposed Network Diagram</p>
          <img src="${esc(p.proposedNetworkDataUrl)}" style="max-width:100%;max-height:120mm;object-fit:contain;display:block;" alt="Proposed Network Diagram" />
        </div>`
      : ""
    }</div>

    <div class="subsection-heading" style="margin-top:4mm;">A.2. Cybersecurity Control Checklist</div>
    <div class="subsection-block">${renderCyberTable(p.proposedCybersecControls)}</div>

    <div class="section-heading page-break">${tocMark("part3-b")}B. Enterprise Architecture</div>
    ${pageHeader(issp)}
    ${p.enterpriseArchDataUrl
      ? `<div class="avoid-break">
          <p style="font-weight:bold;margin-bottom:2mm;">Enterprise Architecture Diagram</p>
          <img src="${esc(p.enterpriseArchDataUrl)}" style="max-width:100%;max-height:145mm;object-fit:contain;display:block;" alt="Enterprise Architecture Diagram" />
        </div>`
      : `<p style="font-style:italic;">Enterprise architecture diagram to be attached.</p>`
    }

    <div class="section-heading" style="margin-top:6mm;">${tocMark("part3-c")}C. Proposed ICT Human Capital</div>
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

    <div class="section-heading page-break">${tocMark("part3-d")}D. Proposed Information Systems</div>
    ${pageHeader(issp)}
    ${p.proposedSystems.length === 0
      ? `<p style="font-style:italic;">No proposed information systems specified.</p>`
      : p.proposedSystems.map(sys => renderIsCard(sys, true)).join("")
    }

    <div class="section-heading page-break">${tocMark("part3-e")}E. ICT Projects</div>
    ${pageHeader(issp)}

    <div class="subsection-heading">${tocMark("part3-e1")}E.1. Internal ICT Projects</div>
    <div class="subsection-block">${p.internalProjects.length === 0
      ? `<p style="font-style:italic;">No internal ICT projects specified.</p>`
      : p.internalProjects.map(proj => renderProjectCard(proj, false)).join("")
    }</div>

    ${p.crossAgencyProjects.length > 0 ? `
    <div class="subsection-heading" style="margin-top:6mm;">${tocMark("part3-e2")}E.2. Cross-Agency ICT Projects</div>
    <div class="subsection-block">${p.crossAgencyProjects.map(proj => renderProjectCard(proj, true)).join("")}</div>
    ` : ""}

    <div class="section-heading page-break">${tocMark("part3-f")}F. Performance Measurement Framework</div>
    ${pageHeader(issp)}
    <div class="subsection-heading">F.1. Internal ICT Projects</div>
    <div class="subsection-block">${allProjects.filter(pr => pr.type === "internal").map(proj => {
      const entry = issp.part3.performanceFramework[proj.id] ??
        perfEntries.find(e => e.projectTitle === proj.title);
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
      const entry = issp.part3.performanceFramework[proj.id] ??
        perfEntries.find(e => e.projectTitle === proj.title);
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
        ${i === 0 ? `${tocMark("part4")}${tocMark("part4-a")}Part IV. Resource Requirements<br><span style="font-size:13pt">A. Detailed Resource Deployment and Cost Breakdown</span>` : ""}
      </div>
      <div class="subsection-heading">${tocMark(`part4-a${i + 1}`)}A.${i + 1}. [${label}]</div>
      <div class="subsection-block">${renderYearTable(p[key], i + 1, label, internalProjects, crossAgencyProjects)}</div>
    </div>`).join("")}

    <div class="page-break">
      ${pageHeader(issp)}
      <div class="section-heading">${tocMark("part4-b")}B. Summary of Investments</div>

      <div class="summary-section">
        <div class="summary-title">${tocMark("part4-b1")}B.1. General Summary</div>
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
        <div class="summary-title">${tocMark("part4-b2")}B.2. Fund Source</div>
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
        <div class="summary-title">${tocMark("part4-b3")}B.3. Statement of Expenditure</div>
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
        <div class="summary-title">${tocMark("part4-b4")}B.4. Object of Expenditure</div>
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

export interface RenderOptions {
  /** Real page number per TOC row id (from the pass-1 marker scan). Blank cells when absent. */
  tocPages?: Record<string, number> | null;
  /** Emit invisible @@toc:id@@ markers for the pass-1 page scan. */
  withTocMarkers?: boolean;
}

function htmlShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * Front matter — cover, table of contents, definition of terms.
 * Printed WITHOUT the running header/footer; the agency-logo header and
 * "Page N" numbering begin at Part I (per the DICT template).
 */
export function renderFrontMatterHtml(
  issp: IsspData,
  tocPages: Record<string, number> | null,
  withDefinitionMarker = false
): string {
  const body = [
    renderCover(issp),
    renderToc(issp, tocPages),
    renderDefinitions(issp, withDefinitionMarker),
  ].join("\n");
  return htmlShell(issp.title, body);
}

/**
 * Main content — Parts I–IV. Printed as its own document so Chromium's
 * pageNumber starts at 1 on Part I, matching the template and the TOC.
 */
export function renderContentHtml(issp: IsspData, opts: RenderOptions = {}): string {
  MARKERS_ENABLED = opts.withTocMarkers ?? false;
  const body = [
    renderPart1(issp),
    renderPart2(issp),
    renderPart3(issp),
    renderPart4(issp),
  ].join("\n");
  MARKERS_ENABLED = false;
  return htmlShell(issp.title, body);
}

// ─── Annex 1 (separate PDF document, appended after Parts I–IV) ──────────────

interface Annex1OfficePayload {
  office: { displayLabel: string };
  annex1: {
    equipment: Array<{
      type: string; isCustom: boolean;
      centralOffice: { operational: number; endOfLife: number; backup: number };
      fieldOffice:   { operational: number; endOfLife: number; backup: number };
    }>;
    software: Array<{
      type: string; isCustom: boolean;
      centralOffice: { perpetual: number; subscription: number };
      fieldOffice:   { perpetual: number; subscription: number };
    }>;
  };
}

function renderEquipmentTable(rows: Annex1OfficePayload["annex1"]["equipment"]): string {
  const headerRow = `
    <tr style="background:#f0f0f0">
      <th style="border:1px solid #ccc;padding:4pt 6pt;text-align:left;font-weight:bold">ICT Resources</th>
      <th style="border:1px solid #ccc;padding:4pt 6pt;text-align:left;font-weight:bold">Office Location</th>
      <th style="border:1px solid #ccc;padding:4pt 6pt;text-align:center;font-weight:bold">Operational</th>
      <th style="border:1px solid #ccc;padding:4pt 6pt;text-align:center;font-weight:bold">End of Life</th>
      <th style="border:1px solid #ccc;padding:4pt 6pt;text-align:center;font-weight:bold">Backup</th>
    </tr>`;

  const bodyRows = rows.map((row) => {
    const totOp  = row.centralOffice.operational + row.fieldOffice.operational;
    const totEol = row.centralOffice.endOfLife   + row.fieldOffice.endOfLife;
    const totBk  = row.centralOffice.backup      + row.fieldOffice.backup;
    return `
      <tr>
        <td rowspan="2" style="border:1px solid #ccc;padding:4pt 6pt;vertical-align:middle;font-weight:${row.isCustom ? "normal" : "bold"}">${esc(row.type)}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt">Central Office</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center">${row.centralOffice.operational}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center">${row.centralOffice.endOfLife}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center">${row.centralOffice.backup}</td>
      </tr>
      <tr>
        <td style="border:1px solid #ccc;padding:4pt 6pt">Field/Regional Office</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center">${row.fieldOffice.operational}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center">${row.fieldOffice.endOfLife}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center">${row.fieldOffice.backup}</td>
      </tr>
      <tr style="background:#f9f9f9">
        <td style="border:1px solid #ccc;padding:4pt 6pt;font-weight:bold">Total</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt"></td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center;font-weight:bold">${totOp}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center;font-weight:bold">${totEol}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center;font-weight:bold">${totBk}</td>
      </tr>`;
  }).join("");

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:16pt">${headerRow}${bodyRows}</table>`;
}

function renderSoftwareTable(rows: Annex1OfficePayload["annex1"]["software"]): string {
  const headerRow = `
    <tr style="background:#f0f0f0">
      <th style="border:1px solid #ccc;padding:4pt 6pt;text-align:left;font-weight:bold">ICT Resources</th>
      <th style="border:1px solid #ccc;padding:4pt 6pt;text-align:left;font-weight:bold">Office Location</th>
      <th style="border:1px solid #ccc;padding:4pt 6pt;text-align:center;font-weight:bold">Perpetual</th>
      <th style="border:1px solid #ccc;padding:4pt 6pt;text-align:center;font-weight:bold">Subscription</th>
    </tr>`;

  const bodyRows = rows.map((row) => {
    const totPerp = row.centralOffice.perpetual    + row.fieldOffice.perpetual;
    const totSub  = row.centralOffice.subscription + row.fieldOffice.subscription;
    return `
      <tr>
        <td rowspan="2" style="border:1px solid #ccc;padding:4pt 6pt;vertical-align:middle;font-weight:${row.isCustom ? "normal" : "bold"}">${esc(row.type)}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt">Central Office</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center">${row.centralOffice.perpetual}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center">${row.centralOffice.subscription}</td>
      </tr>
      <tr>
        <td style="border:1px solid #ccc;padding:4pt 6pt">Field/Regional Office</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center">${row.fieldOffice.perpetual}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center">${row.fieldOffice.subscription}</td>
      </tr>
      <tr style="background:#f9f9f9">
        <td style="border:1px solid #ccc;padding:4pt 6pt;font-weight:bold">Total</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt"></td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center;font-weight:bold">${totPerp}</td>
        <td style="border:1px solid #ccc;padding:4pt 6pt;text-align:center;font-weight:bold">${totSub}</td>
      </tr>`;
  }).join("");

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:16pt">${headerRow}${bodyRows}</table>`;
}

function renderAnnexCoverPage(title: string): string {
  return `
    <div style="page-break-after:always;display:flex;align-items:center;justify-content:center;min-height:60mm">
      <h1 style="text-align:center;font-size:14pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5pt">
        ANNEX 1: EXISTING INFORMATION &amp; COMMUNICATIONS TECHNOLOGY (ICT) ASSET INVENTORY<br>
        <span style="font-size:11pt;font-weight:normal;text-transform:none">${esc(title)}</span>
      </h1>
    </div>`;
}

/**
 * Renders Annex 1 as a standalone HTML document to be merged into the final PDF.
 * Returns null if no offices are attached.
 */
export function renderAnnex1Html(
  docTitle: string,
  offices: Annex1OfficePayload[]
): string | null {
  if (offices.length === 0) return null;

  const sorted = [...offices].sort((a, b) => {
    const order = { central: 0, regional: 1, field: 2 };
    const ta = (order as Record<string, number>)[(a.office as { type?: string }).type ?? "field"] ?? 2;
    const tb = (order as Record<string, number>)[(b.office as { type?: string }).type ?? "field"] ?? 2;
    return ta - tb;
  });

  let body = renderAnnexCoverPage(docTitle);

  // Per-office sections
  for (const off of sorted) {
    body += `
      <div style="page-break-before:always">
        <h2 style="font-size:12pt;font-weight:bold;margin-bottom:12pt;text-transform:uppercase">
          ${esc(off.office.displayLabel)}
        </h2>
        <h3 style="font-size:11pt;margin-bottom:8pt">1. ICT Equipment Inventory</h3>
        ${renderEquipmentTable(off.annex1.equipment)}
        <h3 style="font-size:11pt;margin-bottom:8pt">2. ICT Software Inventory</h3>
        ${renderSoftwareTable(off.annex1.software)}
      </div>`;
  }

  // Aggregate table when more than one office
  if (sorted.length > 1) {
    // Merge equipment rows by type name
    const equipMap = new Map<string, Annex1OfficePayload["annex1"]["equipment"][number]>();
    for (const off of sorted) {
      for (const row of off.annex1.equipment) {
        const existing = equipMap.get(row.type);
        if (!existing) {
          equipMap.set(row.type, { ...row,
            centralOffice: { ...row.centralOffice },
            fieldOffice:   { ...row.fieldOffice },
          });
        } else {
          existing.centralOffice.operational += row.centralOffice.operational;
          existing.centralOffice.endOfLife   += row.centralOffice.endOfLife;
          existing.centralOffice.backup      += row.centralOffice.backup;
          existing.fieldOffice.operational   += row.fieldOffice.operational;
          existing.fieldOffice.endOfLife     += row.fieldOffice.endOfLife;
          existing.fieldOffice.backup        += row.fieldOffice.backup;
        }
      }
    }

    const swMap = new Map<string, Annex1OfficePayload["annex1"]["software"][number]>();
    for (const off of sorted) {
      for (const row of off.annex1.software) {
        const existing = swMap.get(row.type);
        if (!existing) {
          swMap.set(row.type, { ...row,
            centralOffice: { ...row.centralOffice },
            fieldOffice:   { ...row.fieldOffice },
          });
        } else {
          existing.centralOffice.perpetual    += row.centralOffice.perpetual;
          existing.centralOffice.subscription += row.centralOffice.subscription;
          existing.fieldOffice.perpetual      += row.fieldOffice.perpetual;
          existing.fieldOffice.subscription   += row.fieldOffice.subscription;
        }
      }
    }

    body += `
      <div style="page-break-before:always">
        <h2 style="font-size:12pt;font-weight:bold;margin-bottom:12pt;text-transform:uppercase">
          Consolidated Summary (All Offices)
        </h2>
        <h3 style="font-size:11pt;margin-bottom:8pt">1. ICT Equipment Inventory</h3>
        ${renderEquipmentTable([...equipMap.values()])}
        <h3 style="font-size:11pt;margin-bottom:8pt">2. ICT Software Inventory</h3>
        ${renderSoftwareTable([...swMap.values()])}
      </div>`;
  }

  return htmlShell(`Annex 1 — ${docTitle}`, body);
}
