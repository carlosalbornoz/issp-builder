import type {
  AgencyInfo,
  CyberControls,
  DefinitionTerm,
  EgpChecklist,
  HumanCapital,
  IsspDocument,
  IsspScope,
  Part1Data,
  Part2Data,
  Part3Data,
  Part4Data,
  YearBudget,
} from "./types";
import { CURRENT_SCHEMA_VERSION } from "@/lib/migration-review";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCyberControls(): CyberControls {
  return {
    physical: { perimeterProtection: false, accessControl: false, surveillance: false, detection: false },
    perimeter: { ngfw: false, idsIps: false, waf: false, dmz: false },
    network: { dataEncryption: false, networkSegmentation: false },
    endpoint: { antivirus: false, appControl: false, byod: false, xdr: false },
    data: { dataClassification: false, dlp: false, backupRecovery: false },
    application: { securityScanning: false },
    other: {
      vulnAssessment: false, patchMgmt: false, strongPasswords: false,
      mfa: false, accessReviews: false, securityLogs: false,
      logAnalysis: false, incidentResponse: false, siem: false,
      penTesting: false, secureSdlc: false,
    },
  };
}

function makeEgpChecklist(): EgpChecklist {
  const def = { status: "" as const };
  return {
    eGovPay: { ...def },
    pnpki: { ...def },
    hcmis: { ...def },
    ifmis: { ...def },
    onlinePortal: { ...def },
    procurement: { ...def },
    recordsMgmt: { ...def },
    pscp: { ...def },
  };
}

function makeHumanCapital(): HumanCapital {
  const cell = () => ({ male: 0, female: 0 });
  const row = () => ({ it: cell(), nonIt: cell() });
  return { plantilla: row(), contractual: row(), outsourced: row() };
}

function makeYearBudget(): YearBudget {
  return {
    officeProductivity: { capitalOutlay: [], mooe: [] },
    internalProjects: {},
    crossAgencyProjects: {},
    continuingCosts: { mooe: [] },
  };
}

// ─── Part defaults ────────────────────────────────────────────────────────────

export function makeDefaultPart1(): Part1Data {
  return {
    legalBasis: "", mandateFunction: "",
    visionStatement: "", missionStatement: "", orgOutcomes: [],
    cioName: "", cioPosition: "", cioUnit: "", cioEmail: "", cioContact: "",
    focalSameAsCio: false,
    focalName: "", focalPosition: "", focalUnit: "", focalEmail: "", focalContact: "",
    humanCapital: makeHumanCapital(),
    stakeholders: [],
  };
}

export function makeDefaultPart2(): Part2Data {
  return {
    strategicConcerns: [],
    networkDiagrams: [],
    networkDescription: "",
    cybersecurityControls: makeCyberControls(),
    informationSystems: [],
    egpChecklist: makeEgpChecklist(),
  };
}

export function makeDefaultPart3(): Part3Data {
  return {
    proposedNetworkDataUrl: null,
    proposedNetworkDesc: "",
    proposedCybersecControls: makeCyberControls(),
    enterpriseArchDataUrl: null,
    proposedHumanCapital: [],
    proposedSystems: [],
    internalProjects: [],
    crossAgencyProjects: [],
    performanceFramework: {},
  };
}

export function makeDefaultPart4(): Part4Data {
  return {
    year1: makeYearBudget(),
    year2: makeYearBudget(),
    year3: makeYearBudget(),
  };
}

// ─── Definition of Terms ──────────────────────────────────────────────────────
// The three standard terms from the official DICT 2026 template.

export const STANDARD_DEFINITIONS: readonly Omit<DefinitionTerm, "id">[] = [
  {
    term: "Agency",
    definition: "Refers to any bureau, office, commission, authority, or instrumentality of the national government, including government-owned or-controlled corporations (GOCC), authorized by law or by their respective charters to contract for or undertake information and communications technology networks and databases, infrastructure or development projects.",
  },
  {
    term: "Business Process",
    definition: "A collection of business transactions between business partners and/or internal activities within one business. These transactions and/or activities together support the objective of the business process.",
  },
  {
    term: "Chief Information Officer",
    definition: "Refers to a senior officer responsible for the development, planning, and implementation of the government entity's information systems strategic plan (ISSP) or ICT plan, and management of the agency's ICT systems, platforms, and applications;",
  },
] as const;

export function makeStandardDefinitions(): DefinitionTerm[] {
  return STANDARD_DEFINITIONS.map((d, i) => ({ id: `std-${i}`, ...d }));
}

// ─── Document factory ─────────────────────────────────────────────────────────

export interface NewDocOptions {
  title: string;
  startYear: number;
  endYear: number;
  amendmentNumber: number;
  scope: IsspScope;
  agencyHeadName: string;
  agency: AgencyInfo;
}

export function createEmptyDocument(opts: NewDocOptions): IsspDocument {
  const now = new Date().toISOString();
  return {
    version: "1.0",
    fileType: "issp-main",
    exportedAt: now,
    tool: "issp-platform",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: opts.title,
    startYear: opts.startYear,
    endYear: opts.endYear,
    amendmentNumber: opts.amendmentNumber,
    scope: opts.scope,
    agencyHeadName: opts.agencyHeadName,
    agency: opts.agency,
    planStatus: "draft",
    submissionTarget: { agency: "DICT", deadline: null },
    sectionMeta: {},
    definitions: makeStandardDefinitions(),
    part1: makeDefaultPart1(),
    part2: makeDefaultPart2(),
    part3: makeDefaultPart3(),
    part4: makeDefaultPart4(),
    createdAt: now,
    updatedAt: now,
  };
}
