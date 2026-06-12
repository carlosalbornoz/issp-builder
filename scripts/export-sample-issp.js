/**
 * Exports the seeded NCWTR ISSP document as a .issp file.
 * Output: public/demo/ncwtr-issp-2026-2028.issp
 *
 * Run: node scripts/export-sample-issp.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function parseJson(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

const db = new Database(path.join(__dirname, '../dev.db'));

const doc = db.prepare(`
  SELECT d.*, a.name as agencyName, a.acronym, a.type as agencyType, a.websiteUrl
  FROM IsspDocument d
  JOIN Agency a ON a.id = d.agencyId
  WHERE d.id = 'issp-ncwtr-2026'
`).get();

const p1 = db.prepare('SELECT * FROM Part1Profile WHERE isspDocId = ?').get('issp-ncwtr-2026');
const p2 = db.prepare('SELECT * FROM Part2Assessment WHERE isspDocId = ?').get('issp-ncwtr-2026');
const p3 = db.prepare('SELECT * FROM Part3Strategy WHERE isspDocId = ?').get('issp-ncwtr-2026');
const p4 = db.prepare('SELECT * FROM Part4Resources WHERE isspDocId = ?').get('issp-ncwtr-2026');

db.close();

function emptyHc() {
  return {
    plantilla: { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
    contractual: { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
    outsourced: { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
  };
}

function emptyYear() {
  return {
    officeProductivity: { capitalOutlay: [], mooe: [] },
    internalProjects: {},
    crossAgencyProjects: {},
    continuingCosts: { mooe: [] },
  };
}

function emptyCyber() {
  return { physical: {}, perimeter: {}, network: {}, endpoint: {}, data: {}, application: {}, other: {} };
}

const deploymentMap = {
  'On-Premise': 'ON_PREMISE',
  'Cloud-Hosted': 'CLOUD',
  'Cloud': 'CLOUD',
  'Hybrid': 'HYBRID',
  'Hosted (3rd Party)': 'HOSTED',
  'Local Network': 'ON_PREMISE',
};

const developmentStrategyMap = {
  'In-house': 'IN_HOUSE',
  'In-House': 'IN_HOUSE',
  'Outsourced': 'OUTSOURCED',
  'Hybrid': 'HYBRID',
  'Off-the-Shelf (Modified)': 'COTS',
  'Off-the-Shelf (SaaS)': 'COTS',
  'Commercial Off-The-Shelf (COTS)': 'COTS',
  'Open Source': 'OPEN_SOURCE',
};

const dataStorageMap = {
  'On-Premise': 'ON_PREMISE',
  'Government Cloud (GovCloud PH)': 'CLOUD',
  'Vendor Cloud (Government-Approved)': 'CLOUD',
  'Cloud': 'CLOUD',
  'Hybrid': 'HYBRID',
  'Local Network (Central Office shared drive)': 'ON_PREMISE',
  'On-Premise (per regional office)': 'ON_PREMISE',
};

function normalizeInteroperability(raw = {}) {
  if ('integrated' in raw) {
    return {
      integrated: !!raw.integrated,
      internalSystems: raw.internalSystems ?? '',
      externalSystems: raw.externalSystems ?? '',
      generatesData: !!raw.generatesData,
      processesExternalData: !!raw.processesExternalData,
      sharedPlatform: !!raw.sharedPlatform,
    };
  }
  const systems = Array.isArray(raw.systems) ? raw.systems : [];
  return {
    integrated: !!raw.hasInteroperability || systems.length > 0,
    internalSystems: systems.filter((s) => s.type === 'Internal').map((s) => s.name).join(', '),
    externalSystems: systems.filter((s) => s.type === 'External').map((s) => s.name).join(', '),
    generatesData: false,
    processesExternalData: systems.some((s) => s.type === 'External'),
    sharedPlatform: false,
  };
}

function normalizeExistingSystem(sys) {
  const pia = sys.pia ?? {};
  return {
    ...sys,
    deploymentType: deploymentMap[sys.deploymentType] ?? sys.deploymentType ?? '',
    developmentStrategy: developmentStrategyMap[sys.developmentStrategy] ?? sys.developmentStrategy ?? '',
    dataStorage: dataStorageMap[sys.dataStorage] ?? sys.dataStorage ?? '',
    interoperability: normalizeInteroperability(sys.interoperability),
    pia: {
      processesPersonalInfo: pia.processesPersonalInfo === true ? 'yes' : 'no',
      piaCompleted: pia.piaCompleted ?? pia.piaConducted ?? false,
    },
  };
}

function normalizeProposedSystem(sys) {
  const pia = sys.pia ?? {};
  const description = sys.description ?? sys.enhancementDetails ?? '';
  return {
    ...sys,
    deploymentType: deploymentMap[sys.deploymentType] ?? sys.deploymentType ?? '',
    description,
    status: sys.status === 'For Enhancement' ? 'FOR_ENHANCEMENT' : 'FOR_DEVELOPMENT',
    developmentStrategy: developmentStrategyMap[sys.developmentStrategy] ?? sys.developmentStrategy ?? '',
    dataStorage: dataStorageMap[sys.dataStorage] ?? sys.dataStorage ?? '',
    interoperability: normalizeInteroperability(sys.interoperability),
    pia: {
      processesPersonalInfo: pia.processesPersonalInfo === true ? 'yes' : 'no',
      piaRequired: pia.piaRequired ?? pia.piaCompleted ?? pia.piaConducted ?? false,
    },
  };
}

function stripProjectCost(project) {
  const rest = { ...project };
  delete rest.totalProjectCost;
  return rest;
}

const issp = {
  version: '1.0',
  fileType: 'issp-main',
  exportedAt: new Date().toISOString(),
  tool: 'issp-platform',
  schemaVersion: 6,
  title: doc.title,
  startYear: doc.startYear,
  endYear: doc.endYear,
  status: doc.status,
  scope: doc.scope,
  amendmentNumber: doc.amendmentNumber ?? 0,
  agencyHeadName: 'Chairperson Maria Celeste R. Villanueva',
  planStatus: 'draft',
  submissionTarget: { agency: 'DICT', deadline: null },
  sectionMeta: {},
  createdAt: doc.createdAt ?? new Date().toISOString(),
  updatedAt: doc.updatedAt ?? new Date().toISOString(),
  agency: {
    name: doc.agencyName,
    acronym: doc.acronym,
    type: doc.agencyType,
    websiteUrl: doc.websiteUrl ?? null,
    logoBase64: null,
  },
  part1: {
    legalBasis: p1?.legalBasis ?? '',
    mandateFunction: p1?.mandateFunction ?? '',
    visionStatement: p1?.visionStatement ?? '',
    missionStatement: p1?.missionStatement ?? '',
    orgOutcomes: parseJson(p1?.orgOutcomes, []),
    cioName: p1?.cioName ?? '',
    cioPosition: p1?.cioPosition ?? '',
    cioUnit: p1?.cioUnit ?? '',
    cioEmail: p1?.cioEmail ?? '',
    cioContact: p1?.cioContact ?? '',
    focalSameAsCio: false,
    focalName: p1?.focalName ?? '',
    focalPosition: p1?.focalPosition ?? '',
    focalUnit: p1?.focalUnit ?? '',
    focalEmail: p1?.focalEmail ?? '',
    focalContact: p1?.focalContact ?? '',
    humanCapital: parseJson(p1?.humanCapital, emptyHc()),
    stakeholders: parseJson(p1?.stakeholders, []),
  },
  part2: {
    strategicConcerns: parseJson(p2?.strategicConcerns, []),
    networkDiagrams: parseJson(p2?.networkDiagrams, []),
    networkDescription: p2?.networkDescription ?? null,
    cybersecurityControls: parseJson(p2?.cybersecurityControls, emptyCyber()),
    informationSystems: parseJson(p2?.informationSystems, []).map(normalizeExistingSystem),
    egpChecklist: parseJson(p2?.egpChecklist, {}),
  },
  part3: {
    proposedNetworkDataUrl: null,
    proposedNetworkDesc: p3?.proposedNetworkDesc ?? null,
    proposedCybersecControls: parseJson(p3?.proposedCybersecControls, emptyCyber()),
    enterpriseArchDataUrl: null,
    proposedHumanCapital: parseJson(p3?.proposedHumanCapital, []),
    proposedSystems: parseJson(p3?.proposedSystems, []).map(normalizeProposedSystem),
    // totalProjectCost is derived from Part IV resource requirements, never stored
    internalProjects: parseJson(p3?.internalProjects, []).map(stripProjectCost),
    crossAgencyProjects: parseJson(p3?.crossAgencyProjects, []).map(stripProjectCost),
    performanceFramework: parseJson(p3?.performanceFramework, {}),
  },
  part4: {
    year1: parseJson(p4?.year1, emptyYear()),
    year2: parseJson(p4?.year2, emptyYear()),
    year3: parseJson(p4?.year3, emptyYear()),
  },
};

const outPath = path.join(__dirname, '../public/demo/ncwtr-issp-2026-2028.issp');
fs.writeFileSync(outPath, JSON.stringify(issp, null, 2), 'utf-8');
console.log('Written:', outPath);
console.log('Size:', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB');
