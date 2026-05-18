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

const issp = {
  version: '1.0',
  fileType: 'issp-main',
  exportedAt: new Date().toISOString(),
  tool: 'issp-platform',
  title: doc.title,
  startYear: doc.startYear,
  endYear: doc.endYear,
  status: doc.status,
  scope: doc.scope,
  amendmentNumber: doc.amendmentNumber ?? 0,
  agencyHeadName: 'Chairperson Maria Celeste R. Villanueva',
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
    informationSystems: parseJson(p2?.informationSystems, []),
    egpChecklist: parseJson(p2?.egpChecklist, {}),
  },
  part3: {
    proposedNetworkDataUrl: null,
    proposedNetworkDesc: p3?.proposedNetworkDesc ?? null,
    proposedCybersecControls: parseJson(p3?.proposedCybersecControls, emptyCyber()),
    enterpriseArchDataUrl: null,
    proposedHumanCapital: parseJson(p3?.proposedHumanCapital, []),
    proposedSystems: parseJson(p3?.proposedSystems, []),
    internalProjects: parseJson(p3?.internalProjects, []),
    crossAgencyProjects: parseJson(p3?.crossAgencyProjects, []),
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
