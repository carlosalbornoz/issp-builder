import type {
  AgencyInfo,
  CyberControls,
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
  const def = { status: "not_utilizing" as const };
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

// ─── Document factory ─────────────────────────────────────────────────────────

export interface NewDocOptions {
  title: string;
  startYear: number;
  endYear: number;
  amendmentNumber: number;
  scope: IsspScope;
  agency: AgencyInfo;
}

export function createEmptyDocument(opts: NewDocOptions): IsspDocument {
  const now = new Date().toISOString();
  return {
    version: "1.0",
    fileType: "issp-main",
    exportedAt: now,
    tool: "issp-platform",
    title: opts.title,
    startYear: opts.startYear,
    endYear: opts.endYear,
    amendmentNumber: opts.amendmentNumber,
    scope: opts.scope,
    agency: opts.agency,
    part1: makeDefaultPart1(),
    part2: makeDefaultPart2(),
    part3: makeDefaultPart3(),
    part4: makeDefaultPart4(),
    createdAt: now,
    updatedAt: now,
  };
}
