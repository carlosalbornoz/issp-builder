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

export interface StakeholderService {
  id: string;
  name: string;
  complexity: ComplexityLevel;
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

export interface InformationSystem {
  id: string;
  name: string;
  classification: IsClassification;
  frontline: boolean;
  deploymentType: "HOSTED" | "CLOUD" | "HYBRID" | "ON_PREMISE" | "";
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
    processesPersonalInfo: boolean;
    piaCompleted: boolean;
  };
}

export interface EgpProgram {
  status: "utilizing" | "proposed" | "not_applicable" | "not_utilizing";
  url?: string;
  equivalentName?: string;
  notes?: string;
}

export interface EgpChecklist {
  elgu?: EgpProgram;
  eGovPay: EgpProgram;
  pnpki: EgpProgram & { adoptionPercentage?: number };
  hcmis: EgpProgram;
  ifmis: EgpProgram;
  onlinePortal: EgpProgram & { channels?: string };
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
  deploymentType: string;
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
  };
  pia: {
    processesPersonalInfo: boolean;
    piaRequired: boolean;
  };
  linkedProjectId: string;
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
  totalProjectCost: number;
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

// ─── Definition of Terms (front matter) ───────────────────────────────────────

export interface DefinitionTerm {
  id: string;
  term: string;
  definition: string;
}

// ─── Root document ────────────────────────────────────────────────────────────

export interface IsspDocument {
  version: "1.0";
  fileType: "issp-main";
  exportedAt: string;
  tool: "issp-platform";
  /** Schema version for migration. 1 = legacy (no sectionMeta). 2 = current. */
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
  /** Definition of Terms (front matter). Absent = standard template terms. */
  definitions?: DefinitionTerm[];
  part1: Part1Data;
  part2: Part2Data;
  part3: Part3Data;
  part4: Part4Data;
  createdAt: string;
  updatedAt: string;
}
