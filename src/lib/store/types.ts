// ─── Agency ───────────────────────────────────────────────────────────────────

export type AgencyType = "NGA" | "GOCC" | "LGU" | "OTHER";

export interface AgencyInfo {
  name: string;
  acronym: string;
  type: AgencyType;
  websiteUrl: string;
  logoBase64: string | null;
}

// ─── Document scope ───────────────────────────────────────────────────────────

export type IsspScope =
  | "DEPARTMENT_WIDE"
  | "DEPARTMENT_CENTRAL_ONLY"
  | "CENTRAL_ONLY"
  | "WITH_REGIONAL"
  | "WITH_BUREAUS"
  | "AGENCY_WIDE"
  | "AGENCY_CENTRAL_ONLY"
  | "AGENCY_WITH_REGIONAL"
  | "OTHER_GOVERNMENT_ENTITY"
  | "LGU_SCOPE";

// ─── Part I ───────────────────────────────────────────────────────────────────

export interface OrgOutcome {
  id: string;
  name: string;
  programs: string[];
}

export interface HumanCapital {
  plantilla: { it: { male: number; female: number }; nonIt: { male: number; female: number } };
  contractual: { it: { male: number; female: number }; nonIt: { male: number; female: number } };
  outsourced: { it: { male: number; female: number }; nonIt: { male: number; female: number } };
}

export type ComplexityLevel = "Simple" | "Complex" | "Highly Technical";

export type TransactionDirection = "INCOMING" | "OUTGOING" | "";

export interface StakeholderService {
  id: string;
  name: string;
  complexity: ComplexityLevel;
  direction: TransactionDirection;
}

export interface Stakeholder {
  id: string;
  name: string;
  services: StakeholderService[];
}

export interface Part1Data {
  legalBasis: string;
  mandateFunction: string;
  visionStatement: string;
  missionStatement: string;
  orgOutcomes: OrgOutcome[];
  cioName: string;
  cioPosition: string;
  cioUnit: string;
  cioEmail: string;
  cioContact: string;
  focalSameAsCio: boolean;
  focalName: string;
  focalPosition: string;
  focalUnit: string;
  focalEmail: string;
  focalContact: string;
  humanCapital: HumanCapital;
  stakeholders: Stakeholder[];
}

// ─── Part II ──────────────────────────────────────────────────────────────────

export interface StrategicConcern {
  id: string;
  outcomeIds: string[];
  criticalSystem: string;
  concern: string;
  desiredStrategy: string;
}

// base64 data URI — replaces server-side file path
export interface NetworkDiagram {
  id: string;
  dataUrl: string;
  title: string;
}

export interface CyberControls {
  physical: {
    perimeterProtection: boolean;
    accessControl: boolean;
    surveillance: boolean;
    detection: boolean;
  };
  perimeter: {
    ngfw: boolean;
    idsIps: boolean;
    waf: boolean;
    dmz: boolean;
  };
  network: {
    dataEncryption: boolean;
    networkSegmentation: boolean;
  };
  endpoint: {
    antivirus: boolean;
    appControl: boolean;
    byod: boolean;
    xdr: boolean;
  };
  data: {
    dataClassification: boolean;
    dlp: boolean;
    backupRecovery: boolean;
  };
  application: {
    securityScanning: boolean;
  };
  other: {
    vulnAssessment: boolean;
    patchMgmt: boolean;
    strongPasswords: boolean;
    mfa: boolean;
    accessReviews: boolean;
    securityLogs: boolean;
    logAnalysis: boolean;
    incidentResponse: boolean;
    siem: boolean;
    penTesting: boolean;
    secureSdlc: boolean;
  };
}

/** Template taxonomy per DICT 2026 guidelines (Part II-C / III-D). */
export type IsClassification = "SUPPORT_TO_OPERATIONS" | "GENERAL_ADMIN" | "OPERATIONS" | "";
export type PiaProcessAnswer = "yes" | "no" | "";

export interface InformationSystem {
  id: string;
  name: string;
  classification: IsClassification;
  frontline: boolean;
  /** Template Frontline sub-question "Identify if: Online/On-premise/Hybrid".
   * Only meaningful when classification === "Operations" && frontline === true. */
  frontlineAccessType: "ONLINE" | "ON_PREMISE" | "HYBRID" | "";
  url: string;
  description: string;
  developmentStrategy: "IN_HOUSE" | "OUTSOURCED" | "HYBRID" | "COTS" | "OPEN_SOURCE" | "";
  developmentPlatform: string;
  databaseName: string;
  dataStorage: "ON_PREMISE" | "CLOUD" | "HYBRID" | "";
  /** Units within the organization with access (template asks "which", not "how many"). */
  internalUsers: string;
  /** External orgs/stakeholders with restricted access. */
  externalUsers: string;
  owner: string;
  interoperability: {
    integrated: boolean;
    internalSystems: string;
    externalSystems: string;
    generatesData: boolean;
    processesExternalData: boolean;
    sharedPlatform: boolean;
  };
  pia: {
    processesPersonalInfo: PiaProcessAnswer;
    piaCompleted: boolean;
  };
}

/** Template "If No" follow-up options (Part II.D items 1, 2, 4, 5, 7). */
export interface EgpIfNo {
  usingEquivalent?: boolean;
  manual?: boolean;
  proposedDevelopment?: boolean;
  /** eGovPay only: "Using other digital or electronic payment platform". */
  otherPlatform?: boolean;
}

/** Template item 6: citizen assistance / feedback mechanism checkboxes. */
export interface EgpPortalMechanisms {
  website: boolean;
  email: boolean;
  landline: boolean;
  socialMedia: boolean;
  mobile: boolean;
}

export interface EgpProgram {
  /** Template checklist is strictly Yes/No — no "Proposed" or "Not Applicable" box exists. */
  status: "yes" | "no" | "";
  url?: string;
  equivalentName?: string;
  /** eLGU: URL of the equivalent system (template asks for both name and url). */
  equivalentUrl?: string;
  ifNo?: EgpIfNo;
}

export interface EgpChecklist {
  elgu?: EgpProgram;
  eGovPay: EgpProgram;
  pnpki: EgpProgram & { adoptionPercentage?: number };
  hcmis: EgpProgram;
  ifmis: EgpProgram;
  onlinePortal: EgpProgram & {
    /** Legacy free-text channels (pre template-v2 sweep); superseded by mechanisms. */
    channels?: string;
    mechanisms?: EgpPortalMechanisms;
    connectedToPortal?: "yes" | "no" | "";
  };
  procurement: EgpProgram;
  recordsMgmt: EgpProgram;
  pscp: EgpProgram;
}

export interface Part2Data {
  strategicConcerns: StrategicConcern[];
  networkDiagrams: NetworkDiagram[];
  networkDescription: string;
  cybersecurityControls: CyberControls;
  informationSystems: InformationSystem[];
  egpChecklist: EgpChecklist;
}

// ─── Part III ─────────────────────────────────────────────────────────────────

export interface ProposedSystem {
  id: string;
  name: string;
  classification: IsClassification;
  frontline: boolean;
  /** Template Frontline sub-question "Identify if: Online/On-premise/Hybrid".
   * Only meaningful when classification === "Operations" && frontline === true. */
  frontlineAccessType: "ONLINE" | "ON_PREMISE" | "HYBRID" | "";
  /** "Provide link" for Online frontline access (template III-D Frontline sub-question). */
  url: string;
  description: string;
  status: "FOR_DEVELOPMENT" | "FOR_ENHANCEMENT" | "";
  enhancementDetails: string;
  developmentStrategy: string;
  developmentPlatform: string;
  databaseName: string;
  dataStorage: string;
  internalUsers: string;
  externalUsers: string;
  owner: string;
  interoperability: {
    integrated: boolean;
    internalSystems: string;
    externalSystems: string;
    generatesData: boolean;
    processesExternalData: boolean;
    sharedPlatform: boolean;
  };
  pia: {
    processesPersonalInfo: PiaProcessAnswer;
    piaRequired: boolean;
  };
}

export interface IctProject {
  id: string;
  title: string;
  description: string;
  objectives: string;
  projectType: "IS_DRIVEN" | "STANDALONE" | "";
  linkedSystemIds: string[];
  strategicAlignment: string[];
  harmonizationFramework: string[];
  implementingUnit: string;
  leadAgency?: string;
  implementingAgencies?: string;
  fundingSource: string;
  // Total project cost is NOT stored — it is derived from the project's
  // Part IV resource requirements (see computeProjectCosts).
  year1Deliverables: string;
  year2Deliverables: string;
  year3Deliverables: string;
  duration: string;
}

export interface HCRow {
  id: string;
  position: string;
  employmentStatus: "PLANTILLA" | "CONTRACTUAL" | "OUTSOURCED" | "";
  quantity: number;
}

export interface KpiRow {
  id: string;
  hierarchy: "Intermediate Outcome" | "Immediate Outcome" | "Output" | "";
  indicator: string;
  baseline: string;
  year1Target: string;
  year2Target: string;
  year3Target: string;
  dataCollectionMethod: string;
  responsibleUnit: string;
}

export interface ProjectKpiSet {
  projectTitle: string;
  projectCategory: "internal" | "crossAgency";
  rows: KpiRow[];
}

export type PerformanceFramework = Record<string, ProjectKpiSet>;

export interface Part3Data {
  // single diagram (base64 data URI); Part 2 supports multiple, Part 3-A only one
  proposedNetworkDataUrl: string | null;
  proposedNetworkDesc: string;
  proposedCybersecControls: CyberControls;
  enterpriseArchDataUrl: string | null;
  proposedHumanCapital: HCRow[];
  proposedSystems: ProposedSystem[];
  internalProjects: IctProject[];
  crossAgencyProjects: IctProject[];
  performanceFramework: PerformanceFramework;
}

// ─── Part IV ──────────────────────────────────────────────────────────────────

export interface LineItem {
  id: string;
  item: string;
  office: string;
  uacsCode: string;
  uacsLabel: string;
  fundSource: string;
  qty: number;
  unitCost: number;
}

export interface ProjectBudget {
  projectTitle: string;
  capitalOutlay: LineItem[];
  mooe: LineItem[];
}

export interface YearBudget {
  officeProductivity: { capitalOutlay: LineItem[]; mooe: LineItem[] };
  internalProjects: Record<string, ProjectBudget>;
  crossAgencyProjects: Record<string, ProjectBudget>;
  continuingCosts: { mooe: LineItem[] };
}

export interface Part4Data {
  year1: YearBudget;
  year2: YearBudget;
  year3: YearBudget;
}

// ─── Section status (UI refresh) ─────────────────────────────────────────────

export type SectionStatus = "empty" | "in_progress" | "done";

export interface SectionMeta {
  userMarkedDone: boolean;
  lastEditedAt: string | null;
}

export interface MigrationReview {
  sourceSchemaVersion: number;
  migratedToSchemaVersion: number;
  pendingSectionIds: string[];
  noticeAcknowledgedAt: string | null;
}

// ─── Definition of Terms (front matter) ───────────────────────────────────────

export interface DefinitionTerm {
  id: string;
  term: string;
  definition: string;
}

// ─── Root document ────────────────────────────────────────────────────────────

// Avoid a circular import: Annex1FilePayload is declared inline here to keep
// the store types self-contained. The canonical definition lives in
// src/lib/annex1/types.ts; these two must be kept in sync.
export interface Annex1FilePayload {
  version: "1.0";
  fileType: "annex1";
  exportedAt: string;
  tool: "issp-platform";
  office: { type: string; region?: string; name: string; displayLabel: string };
  annex1: {
    equipment: Array<{
      id: string; type: string; isCustom: boolean;
      centralOffice: { operational: number; endOfLife: number; backup: number };
      fieldOffice:   { operational: number; endOfLife: number; backup: number };
    }>;
    software: Array<{
      id: string; type: string; isCustom: boolean;
      centralOffice: { perpetual: number; subscription: number };
      fieldOffice:   { perpetual: number; subscription: number };
    }>;
  };
}

export interface IsspDocument {
  version: "1.0";
  fileType: "issp-main";
  exportedAt: string;
  tool: "issp-platform";
  /** Schema version for migration. 9 = current. */
  schemaVersion?: number;
  title: string;
  startYear: number;
  endYear: number;
  amendmentNumber: number;
  scope: IsspScope;
  agencyHeadName: string;
  agency: AgencyInfo;
  /** Draft/review/submitted lifecycle status. */
  planStatus?: "draft" | "for_review" | "submitted";
  /** DICT submission target. */
  submissionTarget?: { agency: string; deadline: string | null };
  /**
   * Per-section status metadata. Keys are section paths e.g. "part1/a", "part4/year1".
   * Absent key = { userMarkedDone: false, lastEditedAt: null }.
   */
  sectionMeta?: Record<string, SectionMeta>;
  /** Pending human review created when an older file is migrated to changed forms. */
  migrationReview?: MigrationReview;
  /** Definition of Terms (front matter). Absent = standard template terms. */
  definitions?: DefinitionTerm[];
  /** Annex 1 files attached by the CIO from regional/field offices. */
  annexedOffices?: Annex1FilePayload[];
  part1: Part1Data;
  part2: Part2Data;
  part3: Part3Data;
  part4: Part4Data;
  createdAt: string;
  updatedAt: string;
}
