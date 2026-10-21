/**
 * Types for the demonstration repository corpus — the shape of
 * `public/demo/repository/corpus.json`, produced by `scripts/build-mock-corpus.ts`.
 *
 * EVERYTHING IN THE CORPUS IS FICTITIOUS. The corpus exists to demonstrate the
 * Public ISSP Repository (/repository) and ICT Budget Dashboard (/budget)
 * surfaces with realistic volume; no real agency, person, or figure is implied.
 * All budget figures are derived with the same aggregation engine as the
 * editor's official Summary of Investments (part4-aggregations.ts), applied to
 * full schema-v14 IsspDocuments also emitted as downloadable .issp files.
 *
 * Keep this file in sync with the generator (it imports these types type-only).
 */

export type CorpusAgencyType = "NGA" | "GOCC" | "LGU" | "OTHER";
export type CorpusPlanStatus = "draft" | "for_review" | "submitted";

/** Mirror of SummaryRow from part4-aggregations (re-declared to keep lib→component imports out). */
export interface CorpusSummaryRow {
  label: string;
  year1: number;
  year2: number;
  year3: number;
  total: number;
  isTotal?: boolean;
}

/** Mirror of CategoryRow from part4-aggregations. */
export interface CorpusCategoryRow {
  categoryId: string;
  name: string;
  year1: number;
  year2: number;
  year3: number;
  total: number;
}

export interface CorpusHumanCapital {
  plantilla: number;
  contractual: number;
  outsourced: number;
  unfilled: number;
  totalIt: number;
}

export interface CorpusSystem {
  name: string;
  classification: string;
  frontline: boolean;
  frontlineAccessType: string;
  developmentStrategy: string;
  dataStorage: string;
  integrated: boolean;
}

export interface CorpusKpi {
  hierarchy: string;
  indicator: string;
  baseline: string;
  targets: [string, string, string];
}

export interface CorpusProject {
  id: string;
  title: string;
  shortTitle: string;
  category: "internal" | "crossAgency";
  /** IS_DRIVEN projects build/enhance Part III-D systems; STANDALONE do not. */
  projectType: "IS_DRIVEN" | "STANDALONE" | "";
  description: string;
  duration: string;
  alignment: string[];
  harmonization: string[];
  linkedSystems: string[];
  implementingUnit: string;
  fundingSource: string;
  leadAgency?: string;
  implementingAgencies?: string;
  /** Mock UACS PAP code for the COMPASS join-key demonstration (absent on some projects on purpose). */
  papCode?: string;
  /** Derived total cost across the plan years (CO + MOOE), never stored in the doc. */
  totalCost: number;
  deliverables: [string, string, string];
  kpis: CorpusKpi[];
}

/** A Part III-D proposed system, exported for the duplication-watch view. */
export interface CorpusProposedSystem {
  id: string;
  name: string;
  shortName: string;
  classification: string;
  status: string;
  dataStorage: string;
  integrated: boolean;
  /** Total cost of the linked III-E project where one exists. */
  fundingProject?: string;
}

export interface CorpusLineItem {
  year: number;
  /** Which of the four Part IV strategic categories the line belongs to. */
  bucket: "officeProductivity" | "internalProjects" | "crossAgencyProjects" | "continuingCosts";
  projectId?: string;
  projectTitle?: string;
  expenseClass: "capitalOutlay" | "mooe";
  item: string;
  office: string;
  categoryId: string;
  fundSource: string;
  qty: number;
  unitCost: number;
  total: number;
}

export interface CorpusBudget {
  yearLabels: [string, string, string];
  b1: CorpusSummaryRow[];
  b2: CorpusSummaryRow[];
  b3: CorpusSummaryRow[];
  b4: CorpusCategoryRow[];
  grandTotals: [number, number, number];
  grandTotal: number;
  totalCo: number;
  totalMooe: number;
  byFundSource: { label: string; total: number }[];
  byCategory: { categoryId: string; name: string; total: number; expenseClass: "capitalOutlay" | "mooe" }[];
}

/**
 * Fictitious DBM-side figures for the request-vs-allotment story. Entries only
 * exist for fiscal years that have elapsed at "corpus present time" — later
 * years read as pending the GAA, exactly like the real loop would.
 */
export interface CorpusAllotments {
  fictitious: true;
  note: string;
  entries: { year: number; request: number; allotment: number }[];
}

export interface CorpusProfile {
  slug: string;
  acronym: string;
  name: string;
  type: CorpusAgencyType;
  websiteUrl: string;
  tagline: string;
  hero: boolean;
  cycle: { startYear: number; endYear: number };
  cycleLabel: string;
  scope: string;
  planStatus: CorpusPlanStatus;
  title: string;
  amendmentNumber: number;
  createdAt: string;
  updatedAt: string;
  headName: string;
  cio: { name: string; position: string; unit: string };
  completionPct: number;
  mandate: string;
  vision: string;
  mission: string;
  legalBasis: string;
  /** Mock identity codes for the COMPASS join-key demonstration. */
  identifiers: {
    /** Fictitious UACS organization code. */
    uacsOrgCode: string;
    /** Fictitious DICT endorsement reference (submitted plans only). */
    dictEndorsement?: { ref: string; date: string };
  };
  counts: {
    outcomes: number;
    programs: number;
    stakeholders: number;
    systems: number;
    proposedSystems: number;
    internalProjects: number;
    crossAgencyProjects: number;
    kpis: number;
    lineItems: number;
    /** Line items with an expense category set. */
    categorizedLineItems: number;
    /** KPI rows that carry both a baseline and all three targets. */
    completeKpis: number;
  };
  humanCapital: CorpusHumanCapital;
  egp: { adopted: number; total: number; pnpkiAdoption?: number };
  outcomes: { name: string; programs: string[] }[];
  systems: CorpusSystem[];
  proposedSystems: CorpusProposedSystem[];
  projects: CorpusProject[];
  budget: CorpusBudget;
  lineItems: CorpusLineItem[];
  allotments: CorpusAllotments;
  /** Path under /public serving the real .issp export for this profile. */
  downloadPath: string;
}

export interface CorpusCrossAgencyProgram {
  key: string;
  title: string;
  description: string;
  leadAgency: string;
  participants: string[];
  agencies: { acronym: string; slug: string; share: number }[];
  combinedCost: number;
  alignment: string[];
}

export interface CorpusTotals {
  plans: number;
  agencies: number;
  grandTotal: number;
  byYear: { year: number; total: number }[];
  byType: { type: CorpusAgencyType; agencies: number; total: number }[];
  cycles: { label: string; agencies: number; total: number }[];
  byStatus: { status: CorpusPlanStatus; agencies: number }[];
  crossAgencyCount: number;
}

// ─── Mock COMPASS layer ───────────────────────────────────────────────────────
// Execution-side demonstration data standing in for a future DBM COMPASS feed.
// Plan figures come from the corpus; everything past the NEP column is invented,
// in the shape COMPASS data would take. Fictitious, always labelled as proposed.

export type CompassStage = "closed" | "executing" | "nep" | "budget-call" | "pre-plan";

/** One agency's money at one fiscal year, through the budget cycle. */
export interface CompassYearRecord {
  year: number;
  stage: CompassStage;
  /** ISSP plan for the year (from the corpus where its cycle covers it, else a prior-plan stand-in). */
  plan: number;
  /** True when `plan` comes from this corpus (not a prior-plan stand-in). */
  planFromCorpus: boolean;
  nep?: number;
  gaa?: number;
  allotment?: number;
  /** As of Q2 for executing years. */
  obligated?: number;
  disbursed?: number;
}

export interface CompassTraceStep {
  date: string;
  stage: string;
  source: string;
  title: string;
  detail?: string;
}

export interface CompassKpiActual {
  indicator: string;
  target: string;
  actual: string;
  status: "on-track" | "behind";
}

/** A single project followed from plan to payment for one fiscal year. */
export interface CompassProjectTrace {
  projectId: string;
  projectTitle: string;
  fiscalYear: number;
  money: { plan: number; nep: number; gaa: number; allotment: number; obligated: number; disbursed: number };
  steps: CompassTraceStep[];
  kpiActuals: CompassKpiActual[];
}

export interface CompassAgency {
  slug: string;
  acronym: string;
  /** GAA money is trackable in COMPASS; GOCC/LGU budgets travel their own routes. */
  route: "GAA" | "corporate" | "local";
  years: CompassYearRecord[];
  traces: CompassProjectTrace[];
}

export interface CompassLayer {
  fictitious: true;
  note: string;
  /** FY2025 obligation rate per agency (for the absorptive-capacity view). */
  agencies: CompassAgency[];
}

// ─── Mock AI & compute layer ──────────────────────────────────────────────────
// Projects tagged as AI/compute asks across the corpus, for the spend-wave and
// shared-vs-own-build views. Amounts are the projects' real Part IV line items.

export type CorpusAiKind = "own-build" | "adoption" | "education";

export interface CorpusAiProject {
  slug: string;
  acronym: string;
  projectId: string;
  projectTitle: string;
  shortTitle: string;
  kind: CorpusAiKind;
  /** Part IV amounts per fiscal year (from the tagged project's line items). */
  byYear: { year: number; amount: number }[];
  total: number;
}

export interface CorpusAiLayer {
  fictitious: true;
  note: string;
  projects: CorpusAiProject[];
  byYear: { year: number; amount: number; /** share of the corpus total for that year. */ share: number }[];
  ownBuildTotal: number;
}

// ─── Mock ICT asset posture (Annex 1 shape) ───────────────────────────────────
// Standing in for the Existing ICT Resource Inventory (Annex 1) that a revised
// ISSP would carry as structured data. Fictitious makes and models throughout.

export type CorpusAssetKind = "endpoint" | "server" | "network" | "security";

export interface CorpusFleetModel {
  name: string;
  kind: CorpusAssetKind;
  count: number;
  /** Past vendor support / end of life. */
  eol: boolean;
  supportUntil?: string;
}

export interface CorpusFleet {
  fictitious: true;
  endpoints: number;
  /** Endpoints past OS/vendor support. */
  endpointsEol: number;
  servers: number;
  serversEol: number;
  networkDevices: number;
  networkEol: number;
  avgAgeYears: number;
  models: CorpusFleetModel[];
}

export interface CorpusAdvisoryHit {
  slug: string;
  acronym: string;
  units: number;
  /** Replacement already carries Part IV budget in that agency's plan. */
  refreshInPlan: boolean;
  refreshProject?: string;
}

export interface CorpusAdvisory {
  fictitious: true;
  id: string;
  title: string;
  model: string;
  kind: string;
  severity: string;
  published: string;
  agencies: CorpusAdvisoryHit[];
  note: string;
}

// ─── Mock procurement + unit-price layers ─────────────────────────────────────

export type CorpusProcurementStage = "awarded" | "bidding" | "pre-bid" | "none";

export interface CorpusProcurementRow {
  slug: string;
  acronym: string;
  projectId: string;
  projectTitle: string;
  shortTitle: string;
  fiscalYear: number;
  /** The project's Part IV budget for the fiscal year. */
  amount: number;
  stage: CorpusProcurementStage;
  note: string;
}

export interface CorpusProcurement {
  fictitious: true;
  note: string;
  rows: CorpusProcurementRow[];
}

export interface CorpusUnitPriceRow {
  slug: string;
  acronym: string;
  /** Median unit cost of the agency's laptop-class lines (whole pesos). */
  medianUnitCost: number;
  units: number;
  note?: string;
}

export interface CorpusUnitPrices {
  fictitious: true;
  note: string;
  item: string;
  /** Median across every laptop-class line in the corpus. */
  corpusMedian: number;
  rows: CorpusUnitPriceRow[];
}

export interface RepositoryCorpus {
  disclaimer: string;
  generatedAt: string;
  totals: CorpusTotals;
  crossAgencyPrograms: CorpusCrossAgencyProgram[];
  /** Mock execution layer — proposed COMPASS link, all figures fictitious. */
  compass: CompassLayer;
  /** AI/compute-tagged projects for the spend-wave views (amounts are real Part IV lines). */
  aiLayer: CorpusAiLayer;
  /** Mock Annex 1 asset inventory + one fictitious security advisory. */
  security: { fleetBySlug: Record<string, CorpusFleet>; advisory: CorpusAdvisory };
  procurement: CorpusProcurement;
  unitPrices: CorpusUnitPrices;
  agencies: CorpusProfile[];
}
