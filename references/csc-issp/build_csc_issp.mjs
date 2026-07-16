// Generates CSC_ISSP_2028-2030.issp from the extracted CSC (old 2027-2029 template) data.
// Decisions applied:
//  1. Uniform year shift: drop 2027; 2028->Year1, 2029->Year2, Year3(2030) EMPTY.
//  2. Solane S. Duque-Basister = CIO AND ISSP Focal (focalSameAsCio).
//  3. All 6 internal projects kept; Office Productivity -> officeProductivity bucket,
//     Continuing Expense -> continuingCosts bucket, other 4 -> internalProjects.
//  4. Missing sections inferred from narrative + flagged in the report (not in JSON).
//
// Run: node /tmp/csc/build_csc_issp.mjs   -> writes CSC_ISSP_2028-2030.issp
import fs from "node:fs";
import path from "node:path";

const DIR = "/tmp/csc";
const OUT = path.join("/root/apps/issp/references/csc-issp", "CSC_ISSP_2028-2030.issp");
const now = new Date().toISOString();

// ── Images: pull specific data URLs from the extraction manifests ─────────────
function img(manifestFile, mediaName) {
  const m = JSON.parse(fs.readFileSync(path.join(DIR, manifestFile), "utf8"));
  const e = m.find((x) => x.path === mediaName);
  if (!e || !e.dataUrl) throw new Error(`no embeddable image ${mediaName} in ${manifestFile}`);
  return e.dataUrl;
}
const COVER = "00_Cover_Page_and_Table_of_Contents_ISSP_FY2027-2029.images.json";
const P2 = "02_CSC_ISSP_2027-2029_page 58-81.images.json";
const logo = img(COVER, "word/media/image1.png");            // CSC logo (8.7 KB, in every header)
const netCurrent = img(P2, "word/media/image1.png");         // Part II.D.1 current network layout
const netProposed = img(P2, "word/media/image2.png");        // Part II.D.2 proposed network layout
const archConcept = img(P2, "word/media/image3.png");        // Conceptual framework / IS interface

const genId = (p, n) => `${p}-${n}`;
const FY = "General Appropriations Act (GAA)";
const li = (item, code, label, amount, office = "ICTO") => ({
  id: Math.random().toString(36).slice(2, 9),
  item, office, uacsCode: code, uacsLabel: label, fundSource: FY, qty: 1, unitCost: amount,
});

// ── PART I ─────────────────────────────────────────────────────────────────────
const orgOutcomes = [
  { id: "oo-1", name: "Streamlined, digitized, digitalized, and integrated systems and services",
    programs: ["Digital Transformation Program", "Quality Management Sub-Program", "Support to Operations Sub-Program"] },
  { id: "oo-2", name: "Efficient and effective administrative justice",
    programs: ["Administrative Justice Program", "Efficient and effective administrative justice Sub-Program"] },
  { id: "oo-3", name: "Empowered public sector employee organizations",
    programs: ["Public Sector Unionism Sub-Program"] },
  { id: "oo-4", name: "Improved merit-based selection and talent development; professionalized and empowered HR in the civil service",
    programs: ["Civil Service Professionalization Sub-Program", "Civil Service Capability Building Sub-Program"] },
  { id: "oo-5", name: "Improved mobilization and stewardship of resources",
    programs: ["Support and Administrative Services Program", "General Administrative Support Services Sub-Program"] },
];
const OO = Object.fromEntries(orgOutcomes.map((o) => [o.name, o.id]));

const stakeholders = [
  { id: genId("stk", 1), name: "General Public / Civil Service Examinees & Eligibles",
    services: [
      { id: genId("svc", 1), name: "Application for civil service examinations and eligibility", complexity: "Complex" },
      { id: genId("svc", 2), name: "Request for authentication/certification of eligibility", complexity: "Simple" },
    ] },
  { id: genId("stk", 2), name: "Government Agencies, HRMOs, and Employees",
    services: [
      { id: genId("svc", 3), name: "Submission of agency HR data and position qualification standards", complexity: "Complex" },
      { id: genId("svc", 4), name: "Filing and tracking of administrative cases and appeals", complexity: "Highly Technical" },
    ] },
  { id: genId("stk", 3), name: "Public Sector Employee Organizations",
    services: [
      { id: genId("svc", 5), name: "Application for registration and accreditation", complexity: "Complex" },
    ] },
  { id: genId("stk", 4), name: "CSC Officials and Employees (Central, Regional, Field)",
    services: [
      { id: genId("svc", 6), name: "Access to HR, payroll, learning, and productivity systems", complexity: "Simple" },
    ] },
];

// ── PART II ────────────────────────────────────────────────────────────────────
const strategicConcerns = [
  { id: genId("sc", 1), outcomeIds: [OO["Streamlined, digitized, digitalized, and integrated systems and services"]],
    criticalSystem: "Informed decision-making; monitoring of the status of key projects, activities and programs",
    concern: "Difficulty in monitoring the status of key PAPs; no visual representation of data to support decisions",
    desiredStrategy: "Development of an Executive Monitoring and Management System (EMMS) with dashboards, scorecards, and data analytics" },
  { id: genId("sc", 2), outcomeIds: [OO["Efficient and effective administrative justice"]],
    criticalSystem: "Taking legal action on cases; deliberating/resolving cases; issuing clearance/certificate of no pending case",
    concern: "Difficulty tracking cases in process; need to continuously digitize cases; misplaced records; unautomated issuance of clearance; no data analytics",
    desiredStrategy: "Harmonization of the Administrative Justice System; enhancement of eCDMS, DIBAR, CARS; implementation of e-Clearance" },
  { id: genId("sc", 3), outcomeIds: [OO["Empowered public sector employee organizations"]],
    criticalSystem: "Processing of applications for accreditation of employee organizations (EO)",
    concern: "Not enough storage for EO documents; accreditation processing is mostly manual; the old system (PEARS) needs an upgrade",
    desiredStrategy: "Development of the PSEO Management System; extended HRRO digitalization; continuous digitization of registration/accreditation records" },
  { id: genId("sc", 4), outcomeIds: [OO["Streamlined, digitized, digitalized, and integrated systems and services"]],
    criticalSystem: "Ensuring the organization consistently meets customer requirements; keeping knowledge management products accessible online",
    concern: "The current knowledge management portal needs to be upgraded",
    desiredStrategy: "Development of a Quality Management System (QMS) portal as a repository of documented procedures and process management" },
  { id: genId("sc", 5), outcomeIds: [OO["Streamlined, digitized, digitalized, and integrated systems and services"]],
    criticalSystem: "Facilitation of Pen-and-Paper Test (PPT) and Computer Examination (COMEX)",
    concern: "Difficulty retrieving exam notice of school assignment and results; examination irregularity; long queues; no online application; the DOS-based EAPS is obsolete",
    desiredStrategy: "Development of an Integrated Eligibility and Examination System" },
  { id: genId("sc", 6), outcomeIds: [OO["Streamlined, digitized, digitalized, and integrated systems and services"]],
    criticalSystem: "Keeping the bureaucracy-wide inventory of human resources",
    concern: "The IGHRS is no longer responsive to current needs (limited reports; platform needs upgrading)",
    desiredStrategy: "Enhancement of the Human Resource Inventory for Government Agencies (HRIGA) for bureaucracy-wide statistical and analytical reports" },
  { id: genId("sc", 7), outcomeIds: [OO["Streamlined, digitized, digitalized, and integrated systems and services"]],
    criticalSystem: "Management of internal control and procedures; generation of summary of audit findings and compliance monitoring",
    concern: "Unautomated audit management; generating comprehensive and insightful summaries of findings is a challenge",
    desiredStrategy: "Development of an Internal Audit System and a follow-up audit application with AI" },
  { id: genId("sc", 8), outcomeIds: [OO["Improved merit-based selection and talent development; professionalized and empowered HR in the civil service"]],
    criticalSystem: "Recruitment, Selection & Placement; Performance Management; Learning & Development; Rewards & Recognition; Payroll Management",
    concern: "Difficulty tracking/processing appointments; no link to the job portal; no integration among the four HR areas; difficulty retrieving HR documents; administering learning interventions",
    desiredStrategy: "Enhancement of the HRPMIS to automate appointments, integrate the job portal/appointment processing/IGHRS, and deploy a self-service portal and web-based learning" },
  { id: genId("sc", 9), outcomeIds: [OO["Improved mobilization and stewardship of resources"]],
    criticalSystem: "Utilization of Information and Communications Technology facilities",
    concern: "Frequent breakdown of outdated ICT equipment; inaccessible systems due to slow/unreliable RO connections; difficult to maintain and secure web services; high long-distance communication charges; need to update ICTO personnel competencies",
    desiredStrategy: "Infrastructure upgrading (high-end computers, modern network devices); cloud adoption; network rehabilitation of ROs; migration of web services to cloud; ICT training" },
  { id: genId("sc", 10), outcomeIds: [OO["Improved mobilization and stewardship of resources"]],
    criticalSystem: "Safeguarding ICT resources; improving and securing the workplace; adopting emerging technologies",
    concern: "ICT security policies not in place; challenge in cybersecurity monitoring and incident response; adopting AI/IoT/ML; protecting/authenticating digital communications; no smart access control; difficulty controlling admin access",
    desiredStrategy: "Establishment of a Next-Gen Security Operations Center; emerging technologies (AI/IoT/ML); Internal PKI; Smart Digital Workplace Phase 2; Privileged Access Management; Zero Trust framework" },
];

// Existing/operational systems — INFERRED from the CSC-IIS conceptual framework.
const infoSys = (id, name, classification, frontline, owner, internalUsers, externalUsers, description) => ({
  id, name, classification, frontline, deploymentType: "ON_PREMISE", url: "", description,
  developmentStrategy: "IN_HOUSE", developmentPlatform: "", databaseName: "", dataStorage: "HYBRID",
  internalUsers, externalUsers, owner,
  interoperability: { integrated: false, internalSystems: "", externalSystems: "", generatesData: false, processesExternalData: false, sharedPlatform: false },
  pia: { processesPersonalInfo: "yes", piaCompleted: false },
});
const informationSystems = [
  infoSys("xis-hrpmis", "Human Resource and Payroll Management Information System (HRPMIS)", "GENERAL_ADMIN", false, "OHRMD", "CSC CO, ROs, FOs", "", "Automates the four HR areas (RSP, L&D, PM, R&R) and payroll administration. Operational; slated for enhancement."),
  infoSys("xis-ighrs", "Inventory of Government Human Resource System (IGHRS)", "SUPPORT_TO_OPERATIONS", false, "IRMO", "CSC CO, ROs, FOs", "Government HRMOs and employees", "Bureaucracy-wide HR inventory. Operational but no longer responsive; being enhanced into HRIGA."),
  infoSys("xis-ecdrm", "Electronic Case Document Management System (eCDMS) / CARS / iDIBAR", "OPERATIONS", true, "OLA", "CSC CO, ROs, FOs", "Public", "Administrative justice case management and reporting. Operational; part of the Administrative Justice harmonization."),
  infoSys("xis-comex", "Computerized Examination (COMEX) / OCSERGS / ONSA", "OPERATIONS", true, "ERPO", "CSC CO, ROs, FOs", "Public", "Computerized civil service examinations, results generation, and notice of school assignment. Operational."),
  infoSys("xis-eserve", "CSC eServe / CSC Website", "OPERATIONS", true, "ICTO/PAIO", "CSC CO, ROs, FOs", "Public", "One-stop-shop for CSC client eServices and the corporate website (www.csc.gov.ph). Operational."),
  infoSys("xis-ccb", "Contact Center ng Bayan (CCB) / Customer Feedback", "OPERATIONS", true, "PAIO", "CSC CO, ROs, FOs", "Public", "Citizen contact center and customer feedback/satisfaction survey. Operational."),
  infoSys("xis-fams", "Financial and Assets Management System (FAMS) / eNGAS", "GENERAL_ADMIN", false, "OFAM", "CSC CO, ROs, FOs", "", "Financial, assets, procurement, and property management; electronic accounting. Operational."),
  infoSys("xis-qms", "Quality Management System (QMS) portal", "GENERAL_ADMIN", false, "OAC-HRG", "CSC CO, ROs, FOs", "", "Repository of documented procedures and knowledge products. Operational; needs upgrade."),
];

const egpChecklist = {
  eGovPay: { status: "utilizing", notes: "Payments via LinkBiz of LandBank (ePayment)." },
  pnpki: { status: "proposed", notes: "Internal Public Key Infrastructure listed as a planned initiative; not yet adopted." },
  hcmis: { status: "not_utilizing", equivalentName: "HRPMIS", notes: "CSC operates its own HRPMIS rather than the national HCMIS." },
  ifmis: { status: "not_utilizing", equivalentName: "eNGAS", notes: "CSC uses the Electronic New Government Accounting System (eNGAS)." },
  onlinePortal: { status: "utilizing", url: "https://www.csc.gov.ph", notes: "CSC website and eServe; feedback mechanisms not yet fully connected to an online portal." },
  procurement: { status: "utilizing", url: "https://www.philgeps.gov.ph", notes: "PhilGEPS." },
  recordsMgmt: { status: "utilizing", notes: "IRMO records management and eCDMS." },
  pscp: { status: "", notes: "" },
};

// Cybersecurity controls — INFERRED from the narrative (firewall, IPsec VPN, 4-3-2 backup, DR).
const cyber = (overrides = {}) => {
  const base = {
    physical: { perimeterProtection: false, accessControl: false, surveillance: false, detection: false },
    perimeter: { ngfw: false, idsIps: false, waf: false, dmz: false },
    network: { dataEncryption: false, networkSegmentation: false },
    endpoint: { antivirus: false, appControl: false, byod: false, xdr: false },
    data: { dataClassification: false, dlp: false, backupRecovery: false },
    application: { securityScanning: false },
    other: { vulnAssessment: false, patchMgmt: false, strongPasswords: false, mfa: false, accessReviews: false, securityLogs: false, logAnalysis: false, incidentResponse: false, siem: false, penTesting: false, secureSdlc: false },
  };
  return structuredClone({ ...base, ...overrides });
};
const cybersecurityControls = cyber({
  physical: { perimeterProtection: true, accessControl: true, surveillance: true, detection: false },
  perimeter: { ngfw: true, idsIps: false, waf: false, dmz: false },
  network: { dataEncryption: true, networkSegmentation: true },
  endpoint: { antivirus: true, appControl: false, byod: false, xdr: false },
  data: { dataClassification: false, dlp: false, backupRecovery: true },
  application: { securityScanning: false },
  other: { vulnAssessment: false, patchMgmt: true, strongPasswords: false, mfa: false, accessReviews: false, securityLogs: true, logAnalysis: false, incidentResponse: false, siem: false, penTesting: false, secureSdlc: false },
});
// Proposed cyber controls lean on the Next-Gen SOC (SIEM, incident response, etc.)
const proposedCybersecControls = cyber({
  other: { vulnAssessment: true, patchMgmt: true, strongPasswords: true, mfa: true, accessReviews: true, securityLogs: true, logAnalysis: true, incidentResponse: true, siem: true, penTesting: true, secureSdlc: true },
  data: { dataClassification: true, dlp: true, backupRecovery: true },
  perimeter: { ngfw: true, idsIps: true, waf: true, dmz: true },
});

// ── PART III ───────────────────────────────────────────────────────────────────
const pSys = (id, name, classification, frontline, status, devStrategy, owner, internalUsers, externalUsers, description, databaseName) => ({
  id, name, classification, frontline, deploymentType: "ON_PREMISE", description,
  status, enhancementDetails: status === "FOR_ENHANCEMENT" ? "Enhancement of the existing system as described." : "",
  developmentStrategy: devStrategy, developmentPlatform: "", databaseName, dataStorage: "HYBRID",
  internalUsers, externalUsers, owner,
  interoperability: { integrated: false, internalSystems: "", externalSystems: "", generatesData: false, processesExternalData: false, sharedPlatform: false },
  pia: { processesPersonalInfo: "yes", piaRequired: true },
});
const proposedSystems = [
  pSys("ps-emms", "Executive Monitoring and Management System (EMMS)", "SUPPORT_TO_OPERATIONS", false, "FOR_DEVELOPMENT", "IN_HOUSE", "CSC Executive Offices", "CSC Executive Offices, Heads of Offices", "", "A centralized platform providing top-level officials with real-time insights into organizational performance, key metrics, and strategic initiatives; consolidates information from various CSC offices.", "Consolidated executive/management data"),
  pSys("ps-ajss", "Administrative Justice Service System (AJSS)", "OPERATIONS", true, "FOR_DEVELOPMENT", "IN_HOUSE", "OLA", "CSC CO, CSC ROs, CSC FOs", "Public", "Harmonizes systems under CSC administrative justice for consistency, efficiency, and fairness in handling administrative cases through aligned procedures and digital case management.", "Administrative Justice (AJIS) databases"),
  pSys("ps-pseoms", "Public Sector Employee Organization (PSEO) Management System", "OPERATIONS", true, "FOR_DEVELOPMENT", "IN_HOUSE", "HRRO", "CSC CO, CSC ROs, CSC FOs", "Public", "Digital platform managing registration, accreditation, and monitoring of public sector employee organizations; streamlines processes and ensures compliance.", "PSEO database"),
  pSys("ps-iees", "Integrated Eligibility and Examination System", "OPERATIONS", true, "FOR_DEVELOPMENT", "OUTSOURCED", "ERPO", "CSC CO, CSC ROs, CSC FOs", "Public", "Unified system managing end-to-end civil service examination and eligibility-granting processes: application, validation, testing, results processing, and eligibility issuance.", "Examination and Eligibility (ExE) databases"),
  pSys("ps-qms", "Quality Management System (QMS)", "GENERAL_ADMIN", false, "FOR_ENHANCEMENT", "IN_HOUSE", "OAC-HRG", "CSC CO, CSC ROs, CSC FOs", "", "Structured framework of processes and responsibilities ensuring consistent customer-requirement compliance; provides a repository of documented procedures and process management.", "Quality management knowledge base"),
  pSys("ps-hrpmis", "Human Resource and Payroll Management Information System (HRPMIS)", "GENERAL_ADMIN", false, "FOR_ENHANCEMENT", "IN_HOUSE", "OHRMD", "CSC CO, CSC ROs, CSC FOs", "", "Integrated system automating HR functions and payroll: employee records, appointments, leave, benefits, salary computations, and HR transactions from onboarding to offboarding.", "General Administrative Services / HR databases"),
  pSys("ps-ias", "Internal Audit System (IAS)", "GENERAL_ADMIN", false, "FOR_DEVELOPMENT", "IN_HOUSE", "IAS", "CSC CO, CSC ROs, CSC FOs", "", "Digital platform supporting planning, execution, documentation, and monitoring of internal audit activities; enhances audit efficiency and compliance.", "Internal audit data"),
  pSys("ps-hriga", "Human Resource Inventory for Government Agencies (HRIGA)", "SUPPORT_TO_OPERATIONS", false, "FOR_ENHANCEMENT", "IN_HOUSE", "IRMO", "CSC CO, CSC ROs, CSC FOs", "", "Provides the inventory of human resources in government agencies, with dashboards and reports; an improvement of the IGHRS.", "Inventory of Government Human Resource (IGHRS) databases"),
];
const sysByShort = { EMMS: "ps-emms", AJSS: "ps-ajss", PSEOMS: "ps-pseoms", IEES: "ps-iees", QMS: "ps-qms", HRPMIS: "ps-hrpmis", HRIGA: "ps-hriga", IAS: "ps-ias" };

const proj = (id, title, desc, objectives, projectType, linked, y1, y2, duration, implementingUnit = "ICTO", fundingSource = FY, extra = {}) => ({
  id, title, description: desc, objectives, projectType, linkedSystemIds: linked,
  strategicAlignment: [], harmonizationFramework: [], implementingUnit, fundingSource,
  year1Deliverables: y1, year2Deliverables: y2, year3Deliverables: "", duration, ...extra,
});
const allSysIds = proposedSystems.map((s) => s.id);
const internalProjects = [
  proj("proj-office-productivity", "Office Productivity",
    "Ensures reliable support for ICT services and guarantees their continuous availability.",
    "To improve support for ICT services and ensure the availability of ICT services.",
    "STANDALONE", [], "Continuing: managed print services (CO & RO), ICT trainings, and productivity subscriptions.", "Continuing: managed print services (CO & RO), ICT trainings, and productivity subscriptions.", "2028–2030"),
  proj("proj-emerging-tech", "Emerging Technologies (AI, IoT, Machine Learning)",
    "Research, development, and implementation of emerging technologies (AI, ML, IoT).",
    "To allocate resources for exploring and implementing emerging technologies that can enhance system capabilities.",
    "STANDALONE", [], "Research, development, and implementation of emerging technologies; training.", "Hiring of AI, IoT, and Robotics experts; continued implementation.", "2029–2030"),
  proj("proj-nextgen-soc", "Next-Gen Security Operations Center",
    "Enhances CSC's cybersecurity posture by continuously monitoring, detecting, and responding to security threats and incidents.",
    "To enhance the organization's cybersecurity posture by continuously monitoring, detecting, and responding to security threats and incidents.",
    "STANDALONE", [], "Procurement of subscription and implementation: SIEM and Threat Intelligence System.", "Continuing SOC operations.", "2028–2030"),
  proj("proj-sdw-phase2", "Smart Digital Workplace (SDW) Phase II",
    "Creates a seamless, intelligent, and secure environment for employees to work from anywhere.",
    "To enhance productivity, collaboration, and efficiency by integrating digital tools, automation, and solutions into daily work processes.",
    "STANDALONE", [], "", "Procurement and installation of SDW facilities; conduct of training.", "2029"),
  proj("proj-continuing-expense", "Continuing Expense",
    "Covers maintenance costs of ICT supplies, communication expenses, professional services, repairs and maintenance, and ICT trainings and certifications.",
    "To cover the maintenance costs of ICT supplies, communication expenses, professional services, repairs and maintenance, and ICT trainings and certifications.",
    "STANDALONE", [], "Maintained ICT equipment; conduct of ICT trainings and certifications.", "Maintained ICT equipment; conduct of ICT trainings and certifications.", "2028–2030"),
  proj("proj-digital-transformation", "Digital Transformation (Phase II)",
    "Development/enhancement of the proposed information systems and hiring of ICT staff; integration of AI into existing systems.",
    "To develop and enhance information systems and to integrate AI into existing systems.",
    "IS_DRIVEN", allSysIds,
    "Development/enhancement: EMMS, QMS, HRPMIS; begin AJSS and PSEOMS.",
    "Development/enhancement: Integrated Eligibility and Examination System, HRIGA; continue AJSS and PSEOMS.",
    "2028–2030"),
];
const crossAgencyProjects = [
  proj("proj-pcsmp", "Philippine Civil Service Modernization Project (PCSMP)",
    "Bureaucracy-wide implementation of the human resource management information system.",
    "A special project for the bureaucracy-wide implementation of the human resource information system.",
    "STANDALONE", [], "Whole-of-government Human Resource Management Information System (HRMIS).", "Continuing PCSMP implementation.", "2025–2029", "CSC", FY,
    { leadAgency: "Civil Service Commission", implementingAgencies: "Whole-of-government (participating national agencies)" }),
];

// Performance framework — single-column Targets placed in year2Target (2029, last carried year).
const kpi = (projectTitle, category, rows) => ({ projectTitle, projectCategory: category, rows });
const krow = (hierarchy, indicator, baseline, target, method, resp) => ({
  id: Math.random().toString(36).slice(2, 9), hierarchy, indicator, baseline, year1Target: "", year2Target: target, year3Target: "", dataCollectionMethod: method, responsibility: resp,
});
const performanceFramework = {
  "proj-office-productivity": kpi("Office Productivity", "internal", [
    krow("Intermediate Outcome", "User satisfaction (%); faster resolution time for IT-related requests (%)", "0 / 0", "At least VS; close 90% of issues within 5 working days", "Reports, feedback, logs; ticketing analytics", "ICTO"),
    krow("Immediate Outcome", "% of offices using the ticketing system", "0", "At least 80%", "System usage logs, employee feedback", "ICTO"),
    krow("Output", "% of technical human resources with a workstation; fully functional helpdesk", "0", "100% of technical HR have a workstation; 1 system implemented", "Feedback, reports", "ICTO"),
  ]),
  "proj-emerging-tech": kpi("Emerging Technologies (AI, IoT, Machine Learning)", "internal", [
    krow("Intermediate Outcome", "Reduction in manual tasks (%); user satisfaction with AI-driven services (%)", "0 / 0", "At least 5% reduction; at least VS", "Reports, feedback, logs", "ICTO"),
    krow("Immediate Outcome", "% of employees using AI/IoT/ML tools", "0", "At least 20%", "System usage logs, employee feedback", "ICTO"),
    krow("Output", "% AI models implemented; % IoT installations; no. of trained models; no. of hired experts", "0", "At least 80%; at least 80%; 1; at least 1", "Feedback, reports", "ICTO"),
  ]),
  "proj-nextgen-soc": kpi("Next-Gen Security Operations Center", "internal", [
    krow("Intermediate Outcome", "% reduction in average incident response time", "48 hours", "24 hours", "Incident reports, SOC logs", "ICTO"),
    krow("Immediate Outcome", "% of security alerts investigated within SLA", "40%", "85%", "SOC analysis reports", "ICTO"),
    krow("Output", "No. of security tools integrated with SOC", "0", "At least 5", "Reports, tool integration logs", "ICTO"),
  ]),
  "proj-sdw-phase2": kpi("Smart Digital Workplace (SDW) Phase II", "internal", [
    krow("Intermediate Outcome", "Utilization rate (%); reduction in health-related incidents (%)", "0", "85% utilization; 60% reduction", "Reports, logs", "ICTO, Health and Safety Team"),
    krow("Immediate Outcome", "Satisfaction rating; biometric health-check implementation", "0", "VS rating; 100% implementation", "Reports, feedback, logs", "ICTO, Health and Safety Team"),
    krow("Output", "No. of SDW facilities; no. of trainings conducted", "0 / 0", "At least 1; at least 1", "Feedback, reports", "ICTO"),
  ]),
  "proj-continuing-expense": kpi("Continuing Expense", "internal", [
    krow("Intermediate Outcome", "% increase in certified IT personnel; % of ICT summit attendees who learned concepts", "0 / 0", "At least 10%; at least 60%", "Reports, feedback, logs", "ICTO"),
    krow("Immediate Outcome", "No. of IT personnel who passed certification; % of participants at least VS", "0", "At least 2; at least 70%", "Certification records, feedback", "ICTO"),
    krow("Output", "No. of IT personnel certified; ICT summits conducted; ICT staff onboarded", "0 / 0 / 0", "At least 2; 1 summit; at least 5 ICT staff", "Feedback, reports", "ICTO"),
  ]),
  "proj-digital-transformation": kpi("Digital Transformation — Development/Enhancement of the Proposed IS", "internal", [
    krow("Intermediate Outcome", "% reduction in manual processing time; Net Promoter Score (1–5)", "0 / 0", "At least 5%; at least 3", "Reports, feedback, logs", "ICTO, Process Owner"),
    krow("Immediate Outcome", "% of employees/offices actively using the system; % of staff trained", "0 / 0", "At least 50%; at least 50%", "Logs, attendance", "ICTO, Process Owner"),
    krow("Output", "% of systems rolled out; % of personnel hired", "0 / 0", "At least 80%; at least 80%", "Feedback, reports", "ICTO"),
  ]),
  "proj-pcsmp": kpi("Philippine Civil Service Modernization Project (PCSMP)", "crossAgency", [
    krow("Output", "Whole-of-government HRMIS rollout status", "Ongoing", "Continuing implementation", "Project reports", "CSC"),
  ]),
};

const proposedHumanCapital = [
  { id: genId("hc", 1), position: "AI, IoT, and Robotics Experts", employmentStatus: "CONTRACTUAL", quantity: 3 },
  { id: genId("hc", 2), position: "ICT Staff (to be onboarded under Digital Transformation)", employmentStatus: "PLANTILLA", quantity: 5 },
];

// ── PART IV — budget. 2028 -> year1, 2029 -> year2, 2030 -> year3 EMPTY ─────────
// CO = rows 1-2 (Machinery & Equipment / Infrastructure Outlay); all else = MOOE.
const y2028 = {
  officeProductivity: { capitalOutlay: [], mooe: [
    li("ICT Training (4 trainings)", "5020201001", "ICT Training Expenses", 120800),
    li("Managed Print Service — Central Office", "5050105012", "Printing Equipment", 1006000),
    li("Managed Print Service — Regional Offices", "5050105012", "Printing Equipment", 8048000),
  ] },
  internalProjects: {
    "proj-emerging-tech": { projectTitle: "Emerging Technologies (AI, IoT, Machine Learning)", capitalOutlay: [], mooe: [
      li("Emerging Technology and IoT (lot)", "5050105003", "ICT Equipment", 20000000),
      li("AI, IoT and Robotics Experts (3, SG 24)", "5021103001", "ICT Consultancy Services", 4623350.4),
      li("ICT Training (10)", "5020201001", "ICT Training Expenses", 500000),
    ] },
    "proj-nextgen-soc": { projectTitle: "Next-Gen Security Operations Center", capitalOutlay: [], mooe: [] },
    "proj-sdw-phase2": { projectTitle: "Smart Digital Workplace (SDW) Phase II", capitalOutlay: [
      li("SDW ICT Equipment (lot)", "5050105003", "ICT Equipment", 20000000),
    ], mooe: [
      li("ICT Training", "5020201001", "ICT Training Expenses", 100000),
    ] },
    "proj-digital-transformation": { projectTitle: "Digital Transformation (Phase II)", capitalOutlay: [], mooe: [
      li("ICT Supplies", "5020301001", "ICT Office Supplies Expenses", 3750000),
      li("Professional Services", "5021103001", "ICT Consultancy Services", 11726150.4),
    ] },
  },
  crossAgencyProjects: {},
  continuingCosts: { mooe: [
    li("ICT Training", "5020201001", "ICT Training Expenses", 4498400),
    li("ICT Supplies", "5020301001", "ICT Office Supplies Expenses", 1065000),
    li("Telephone — Mobile", "", "Communication Expenses — Telephone (Mobile)", 180000),
    li("Internet Subscription Expenses", "5020503000", "Internet Subscription Expenses", 49540000),
    li("Professional Services", "5021103001", "ICT Consultancy Services", 32735944.8),
    li("Repairs & Maintenance — ICT Equipment", "5021305003", "Repairs and Maintenance — ICT Equipment", 53376750),
    li("ICT Software Subscription", "5029907001", "ICT Software Subscription", 216065338.56),
  ] },
};
const y2029 = {
  officeProductivity: { capitalOutlay: [
    li("Supply, Delivery, and Installation of Computers (lot)", "5050105003", "ICT Equipment", 150000000, "Central, Regional, and Field Offices"),
  ], mooe: [
    li("ICT Training (4 trainings)", "5020201001", "ICT Training Expenses", 121500),
    li("Managed Print Service — Central Office", "5050105012", "Printing Equipment", 1012000),
    li("Managed Print Service — Regional Offices", "5050105012", "Printing Equipment", 8096300),
  ] },
  internalProjects: {
    "proj-emerging-tech": { projectTitle: "Emerging Technologies (AI, IoT, Machine Learning)", capitalOutlay: [], mooe: [
      li("AI, IoT and Robotics Experts (3, SG 24)", "5021103001", "ICT Consultancy Services", 4623350.4),
    ] },
    "proj-nextgen-soc": { projectTitle: "Next-Gen Security Operations Center", capitalOutlay: [], mooe: [] },
    "proj-sdw-phase2": { projectTitle: "Smart Digital Workplace (SDW) Phase II", capitalOutlay: [], mooe: [] },
    "proj-digital-transformation": { projectTitle: "Digital Transformation (Phase II)", capitalOutlay: [], mooe: [
      li("ICT Supplies", "5020301001", "ICT Office Supplies Expenses", 3750000),
      li("Professional Services", "5021103001", "ICT Consultancy Services", 11726150.4),
    ] },
  },
  crossAgencyProjects: {},
  continuingCosts: { mooe: [
    li("ICT Training", "5020201001", "ICT Training Expenses", 4370800),
    li("ICT Supplies", "5020301001", "ICT Office Supplies Expenses", 200000),
    li("Telephone — Mobile", "", "Communication Expenses — Telephone (Mobile)", 180000),
    li("Internet Subscription Expenses", "5020503000", "Internet Subscription Expenses", 49540000),
    li("Professional Services", "5021103001", "ICT Consultancy Services", 32735944.8),
    li("Repairs & Maintenance — ICT Equipment", "5021305003", "Repairs and Maintenance — ICT Equipment", 166714425),
    li("ICT Software Subscription", "5029907001", "ICT Software Subscription", 125064634),
  ] },
};
const emptyYear = () => ({ officeProductivity: { capitalOutlay: [], mooe: [] }, internalProjects: {}, crossAgencyProjects: {}, continuingCosts: { mooe: [] } });

// ── Assemble ───────────────────────────────────────────────────────────────────
const doc = {
  version: "1.0", fileType: "issp-main", exportedAt: now, tool: "issp-platform", schemaVersion: 6,
  title: "Civil Service Commission Information Systems Strategic Plan 2028–2030",
  startYear: 2028, endYear: 2030, amendmentNumber: 0, scope: "AGENCY_WITH_REGIONAL",
  agencyHeadName: "Chairperson Atty. Marilyn B. Yap", planStatus: "draft",
  submissionTarget: { agency: "DICT", deadline: null }, sectionMeta: {},
  createdAt: now, updatedAt: now,
  agency: { name: "Civil Service Commission", acronym: "CSC", type: "NGA", websiteUrl: "https://www.csc.gov.ph", logoBase64: logo },
  part1: {
    legalBasis: "The Civil Service Commission (CSC) was conferred the status of a department by Republic Act No. 2260 (Civil Service Law) and elevated to a constitutional body by the 1973 Constitution. Its role as the central personnel agency of government was redefined under Presidential Decree No. 807 (Civil Service Decree of the Philippines). It was reorganized under Executive Order No. 181 (November 21, 1986). After the 1987 Constitution, the Administrative Code of 1987 (EO 292) was issued to implement the Commission's constitutional mandate.",
    mandateFunction: "Under EO 292, the CSC administers and enforces the merit system for all levels and ranks in the Civil Service; promulgates policies, standards and guidelines and adopts plans/programs for economical, efficient and effective personnel administration; renders binding opinions/rulings on personnel and Civil Service matters; appoints and disciplines its officials and employees; controls, supervises and coordinates Civil Service examinations; prescribes all examination, appointment and report forms; declares positions as primarily confidential, highly technical or policy-determining; formulates, administers and evaluates programs for the development and retention of a qualified, competent workforce; hears and decides administrative cases and contested appointments; issues subpoenas; advises the President on personnel management; acts on appointments and personnel matters; inspects/audits personnel actions and programs of agencies and GOCCs; reviews delegated decisions; delegates authority; administers the retirement program; and maintains personnel records. The Commission is composed of the Office of the Chairperson and two Commissioners, assisted by Assistant Commissioners for HR Governance, Legal, Professionalization & Cooperation, and Support & Administrative Services, with 16 Regional Offices and 109 Field Offices (2 satellite). As of 31 January 2025: 1,458 plantilla positions, 1,230 warm bodies.",
    visionStatement: "By 2030, the CSC shall be the leader in empowering people and organizations in human resource (HR) and organizational development (OD), and in serving the public through streamlined and digitalized services.",
    missionStatement: "Gawing Lingkod-Bayani ang Bawat Kawani (Make every public servant a hero of service).",
    orgOutcomes,
    cioName: "Solane S. Duque-Basister", cioPosition: "Director IV", cioUnit: "Information and Communications Technology Office (ICTO)",
    cioEmail: "icto@csc.gov.ph", cioContact: "(02) 931-4178",
    focalSameAsCio: true, focalName: "Solane S. Duque-Basister", focalPosition: "Director IV",
    focalUnit: "Information and Communications Technology Office (ICTO)", focalEmail: "icto@csc.gov.ph", focalContact: "(02) 931-4178",
    humanCapital: { plantilla: { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
                    contractual: { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
                    outsourced: { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } } },
    stakeholders,
  },
  part2: {
    strategicConcerns,
    networkDiagrams: [{ id: genId("nd", 1), dataUrl: netCurrent, title: "Current Network Layout (CO to ROs, FOs, and off-site employees)" }],
    networkDescription: "The CSC implements a High-Availability (HA) architecture for key systems and databases. A micro data center in one Regional Office serves as co-location for database/system failover during calamities. The Data Center has been upgraded to Tier 1-compliant. A firewall provides perimeter defense; IPsec VPN connects the Central Office to ROs, and work-from-home employees use a VPN client. Two-tier network layouts were implemented, with a mix of blade and monolithic servers, wireless connectivity, and a VoIP telephony system (CO, with continuing rollout to ROs). The CSC website (www.csc.gov.ph) and regional websites are hosted internally at the CSC DC, connected via redundant internet access (500 Mbps + 300 Mbps direct ISPs) plus 100 Mbps supplemental bandwidth from iGovPhil. NOTE: current annual ICT budget ~PHP 137.8M (2024 GAA); 720M proposed (2025 NEP).",
    cybersecurityControls,
    informationSystems,
    egpChecklist,
  },
  part3: {
    proposedNetworkDataUrl: netProposed,
    proposedNetworkDesc: "Proposed network layout for CO-to-RO/FO and off-site employee connectivity, retaining the HA architecture with strengthened cybersecurity components (see diagram).",
    proposedCybersecControls,
    enterpriseArchDataUrl: archConcept,
    proposedHumanCapital,
    proposedSystems,
    internalProjects,
    crossAgencyProjects,
    performanceFramework,
  },
  part4: { year1: y2028, year2: y2029, year3: emptyYear() },
};

fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n", "utf8");
// Reconciliation check
const sum = (b) => [...(b?.capitalOutlay || []), ...(b?.mooe || [])].reduce((s, x) => s + x.unitCost, 0);
const yearTotal = (y) => sum(y.officeProductivity) + sum(y.continuingCosts) +
  Object.values(y.internalProjects).reduce((s, p) => s + sum(p), 0) +
  Object.values(y.crossAgencyProjects).reduce((s, p) => s + sum(p), 0);
console.log(`wrote ${OUT}`);
console.log(`Year1 (2028) total: PHP ${yearTotal(y2028).toLocaleString()}  (source: 427,335,734.16)`);
console.log(`Year2 (2029) total: PHP ${yearTotal(y2029).toLocaleString()}  (source: 558,135,104.60)`);
console.log(`Year3 (2030): empty (per instruction)`);
