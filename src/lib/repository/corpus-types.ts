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
  description: string;
  duration: string;
  alignment: string[];
  harmonization: string[];
  linkedSystems: string[];
  implementingUnit: string;
  fundingSource: string;
  leadAgency?: string;
  implementingAgencies?: string;
  /** Derived total cost across the plan years (CO + MOOE), never stored in the doc. */
  totalCost: number;
  deliverables: [string, string, string];
  kpis: CorpusKpi[];
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
  };
  humanCapital: CorpusHumanCapital;
  egp: { adopted: number; total: number; pnpkiAdoption?: number };
  outcomes: { name: string; programs: string[] }[];
  systems: CorpusSystem[];
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

export interface RepositoryCorpus {
  disclaimer: string;
  generatedAt: string;
  totals: CorpusTotals;
  crossAgencyPrograms: CorpusCrossAgencyProgram[];
  agencies: CorpusProfile[];
}
