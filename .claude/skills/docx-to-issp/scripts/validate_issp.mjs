#!/usr/bin/env node
/**
 * Static validator for a generated .issp file.
 *
 * Mirrors the ISSP Builder's import logic in src/lib/store/index.tsx
 * (normalizeImportShape + validateEmbeddedImages) and adds checks the app's
 * forgiving normalizer does NOT catch: enum-value membership and the internal
 * cross-reference contracts between Parts I–IV.
 *
 *   HARD ERRORS   — the app will reject the file or silently drop data. Fix.
 *   WARNINGS      — loads fine, but a human should review (e.g. a Mandatory
 *                   cyber control is unchecked, or a required contact is blank).
 *
 * Usage:  node validate_issp.mjs <file.issp>
 * Exit:   0 if no hard errors, 1 otherwise. Warnings never fail the exit code.
 *
 * Keep the ENUM vocabularies below in sync with src/lib/issp-labels.ts and
 * src/lib/store/types.ts. Re-run against public/demo/ncwtr-issp-2026-2028.issp
 * after any change to confirm the known-good file still passes.
 */

import fs from "node:fs";

// ── Authoritative vocabularies (mirror src/lib/issp-labels.ts + types.ts) ────
const ENUMS = {
  agencyType: ["NGA", "GOCC", "LGU", "OTHER"],
  scope: [
    "DEPARTMENT_WIDE", "DEPARTMENT_CENTRAL_ONLY", "CENTRAL_ONLY", "WITH_REGIONAL",
    "WITH_BUREAUS", "AGENCY_WIDE", "AGENCY_CENTRAL_ONLY", "AGENCY_WITH_REGIONAL",
    "OTHER_GOVERNMENT_ENTITY", "LGU_SCOPE",
  ],
  planStatus: ["draft", "for_review", "submitted"],
  classification: ["SUPPORT_TO_OPERATIONS", "GENERAL_ADMIN", "OPERATIONS"],
  deploymentType: ["HOSTED", "CLOUD", "HYBRID", "ON_PREMISE"],
  developmentStrategy: ["IN_HOUSE", "OUTSOURCED", "HYBRID", "COTS", "OPEN_SOURCE"],
  dataStorage: ["ON_PREMISE", "CLOUD", "HYBRID"],
  proposedStatus: ["FOR_DEVELOPMENT", "FOR_ENHANCEMENT"],
  projectType: ["IS_DRIVEN", "STANDALONE"],
  employmentStatus: ["PLANTILLA", "CONTRACTUAL", "OUTSOURCED"],
  egpStatus: ["utilizing", "proposed", "not_applicable", "not_utilizing"], // lowercase!
  complexity: ["Simple", "Complex", "Highly Technical"],
  kpiHierarchy: ["Intermediate Outcome", "Immediate Outcome", "Output"],
  yesNo: ["yes", "no"],
  // Label-string fields (stored verbatim, not as codes):
  fundingSource: [
    "General Appropriations Act (GAA)", "Foreign-Assisted",
    "Locally Funded", "Other Income Generating Sources",
  ],
  strategicAlignment: [
    "Public Investment Program", "National Cybersecurity Plan",
    "E-Government Master Plan", "Program Convergence Budgeting", "Others",
  ],
  harmonizationFramework: [
    "National Prioritization", "Resource Optimization",
    "Interoperability Framework", "Cross-Agency Collaboration",
    "Scalability and Sustainability",
  ],
};

// Image limits (mirror src/lib/store/index.tsx)
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 35 * 1024 * 1024;
const IMG_RE = /^data:image\/(png|jpeg|webp|svg\+xml);base64,/i;

const errors = [];
const warnings = [];

const hard = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ── helpers ──────────────────────────────────────────────────────────────────
const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isArr = Array.isArray;
const asArr = (v) => (isArr(v) ? v : []);
const str = (v) => (typeof v === "string" ? v : "");

function enumCheck(value, vocab, path, { allowEmpty = true } = {}) {
  if (value === "" || value == null) {
    if (!allowEmpty) warn(`${path}: enum is empty`);
    return;
  }
  if (!vocab.includes(value)) hard(`${path}: invalid value "${value}". Must be one of ${JSON.stringify(vocab)}`);
}

function labelArrayCheck(arr, vocab, path) {
  for (const v of asArr(arr)) {
    if (!vocab.includes(v)) hard(`${path}: invalid label "${v}". Must be one of ${JSON.stringify(vocab)}`);
  }
}

function estimateBytes(dataUrl) {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
}

// ── main ─────────────────────────────────────────────────────────────────────
function main(argv) {
  const file = argv[2];
  if (!file) {
    console.error("usage: validate_issp.mjs <file.issp>");
    return 2;
  }
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`FAIL  not valid JSON: ${e.message}`);
    return 1;
  }

  // ── 1. The three hard import gates (normalizeImportShape) ──────────────────
  if (doc.fileType !== "issp-main")
    hard(`fileType must be "issp-main" (got ${JSON.stringify(doc.fileType)}). App rejects this.`);
  if (typeof doc.schemaVersion !== "number" || doc.schemaVersion > 6)
    hard(`schemaVersion must be a number ≤ 6 (got ${JSON.stringify(doc.schemaVersion)}). App calls it "a newer version".`);
  for (const k of ["agency", "part1", "part2", "part3", "part4"]) {
    if (!isObj(doc[k])) hard(`${k} must be an object. App says "missing required ISSP sections".`);
  }
  // Envelope sanity
  if (doc.version !== "1.0") warn(`version is ${JSON.stringify(doc.version)}; canonical is "1.0"`);
  if (doc.tool !== "issp-platform") warn(`tool is ${JSON.stringify(doc.tool)}; canonical is "issp-platform"`);
  for (const k of ["title", "startYear", "endYear", "scope", "agencyHeadName", "exportedAt", "createdAt", "updatedAt", "amendmentNumber"]) {
    if (!(k in doc)) warn(`envelope missing ${k} (normalizer will default it, but a perfect file includes it)`);
  }
  enumCheck(str(doc.scope), ENUMS.scope, "scope");
  enumCheck(str(doc.planStatus), ENUMS.planStatus, "planStatus");

  // ── agency ──────────────────────────────────────────────────────────────────
  const a = isObj(doc.agency) ? doc.agency : {};
  enumCheck(str(a.type), ENUMS.agencyType, "agency.type");
  for (const k of ["name", "acronym", "websiteUrl"]) if (!str(a[k])) warn(`agency.${k} is blank`);

  // ── 2. Part I ────────────────────────────────────────────────────────────────
  const p1 = isObj(doc.part1) ? doc.part1 : {};
  const outcomes = asArr(p1.orgOutcomes);
  const outcomeIds = new Set(outcomes.map((o) => o.id));
  if (outcomes.some((o) => !o.id)) hard("part1.orgOutcomes: every item needs a stable id (referenced by part2 strategic concerns)");
  if (!str(p1.cioName)) warn("part1.cioName is blank (CIO is required by the template)");
  for (const k of ["legalBasis", "mandateFunction", "visionStatement", "missionStatement"]) {
    if (!str(p1[k])) warn(`part1.${k} is blank`);
  }
  // Human capital numeric grid
  const hc = p1.humanCapital;
  if (isObj(hc)) {
    for (const status of ["plantilla", "contractual", "outsourced"]) {
      const row = hc[status];
      if (!isObj(row)) continue;
      for (const role of ["it", "nonIt"]) {
        const cell = row[role];
        if (!isObj(cell) || typeof cell.male !== "number" || typeof cell.female !== "number")
          warn(`part1.humanCapital.${status}.${role} missing {male,female} numbers`);
      }
    }
  }
  // Stakeholders
  for (const s of asArr(p1.stakeholders)) {
    if (!s.id) hard("part1.stakeholders: every item needs an id");
    for (const svc of asArr(s.services)) {
      if (!svc.id) hard(`part1.stakeholders[${s.name}].services: every item needs an id`);
      enumCheck(str(svc.complexity), ENUMS.complexity, `stakeholder "${s.name}" service "${svc.name}" complexity`);
    }
  }

  // ── 3. Part II ───────────────────────────────────────────────────────────────
  const p2 = isObj(doc.part2) ? doc.part2 : {};
  // Strategic concerns → outcomes cross-ref
  for (const c of asArr(p2.strategicConcerns)) {
    if (!c.id) hard("part2.strategicConcerns: every item needs an id");
    for (const oid of asArr(c.outcomeIds)) {
      if (!outcomeIds.has(oid))
        hard(`part2.strategicConcerns[${c.id}].outcomeIds references unknown outcome "${oid}"`);
    }
  }
  // Information systems
  const sysIds = new Set();
  for (const s of asArr(p2.informationSystems)) {
    if (!s.id) hard("part2.informationSystems: every item needs an id");
    sysIds.add(s.id);
    enumCheck(str(s.classification), ENUMS.classification, `IS "${s.name}" classification`);
    enumCheck(str(s.deploymentType), ENUMS.deploymentType, `IS "${s.name}" deploymentType`);
    enumCheck(str(s.developmentStrategy), ENUMS.developmentStrategy, `IS "${s.name}" developmentStrategy`);
    enumCheck(str(s.dataStorage), ENUMS.dataStorage, `IS "${s.name}" dataStorage`);
    const pia = isObj(s.pia) ? s.pia : {};
    enumCheck(str(pia.processesPersonalInfo), ENUMS.yesNo, `IS "${s.name}" pia.processesPersonalInfo`);
  }
  // EGP checklist
  const egp = isObj(p2.egpChecklist) ? p2.egpChecklist : {};
  for (const key of Object.keys(egp)) {
    const prog = egp[key];
    if (!isObj(prog)) continue;
    enumCheck(str(prog.status), ENUMS.egpStatus, `egpChecklist.${key}.status`);
  }
  const portal = egp.onlinePortal;
  if (isObj(portal)) {
    enumCheck(str(portal.connectedToPortal), ENUMS.yesNo, "egpChecklist.onlinePortal.connectedToPortal");
  }

  // ── 4. Part III ──────────────────────────────────────────────────────────────
  const p3 = isObj(doc.part3) ? doc.part3 : {};
  const proposedSysIds = new Set();
  for (const s of asArr(p3.proposedSystems)) {
    if (!s.id) hard("part3.proposedSystems: every item needs an id");
    proposedSysIds.add(s.id);
    enumCheck(str(s.classification), ENUMS.classification, `proposed system "${s.name}" classification`);
    enumCheck(str(s.status), ENUMS.proposedStatus, `proposed system "${s.name}" status`);
  }
  for (const r of asArr(p3.proposedHumanCapital)) {
    if (!r.id) hard("part3.proposedHumanCapital: every row needs an id");
    enumCheck(str(r.employmentStatus), ENUMS.employmentStatus, `proposed HC "${r.position}" employmentStatus`);
  }
  const collectProjects = (arr, label) => {
    const ids = new Set();
    for (const p of asArr(arr)) {
      if (!p.id) hard(`part3.${label}: every project needs an id`);
      ids.add(p.id);
      enumCheck(str(p.projectType), ENUMS.projectType, `project "${p.title}" projectType`);
      labelArrayCheck(p.strategicAlignment, ENUMS.strategicAlignment, `project "${p.title}" strategicAlignment`);
      labelArrayCheck(p.harmonizationFramework, ENUMS.harmonizationFramework, `project "${p.title}" harmonizationFramework`);
      enumCheck(str(p.fundingSource), ENUMS.fundingSource, `project "${p.title}" fundingSource`);
      for (const lid of asArr(p.linkedSystemIds)) {
        if (!proposedSysIds.has(lid))
          hard(`project "${p.title}".linkedSystemIds references unknown proposed system "${lid}"`);
      }
    }
    return ids;
  };
  const internalIds = collectProjects(p3.internalProjects, "internalProjects");
  const crossIds = collectProjects(p3.crossAgencyProjects, "crossAgencyProjects");

  // performanceFramework keys must be project ids
  const pf = isObj(p3.performanceFramework) ? p3.performanceFramework : {};
  for (const key of Object.keys(pf)) {
    if (!internalIds.has(key) && !crossIds.has(key))
      hard(`part3.performanceFramework key "${key}" matches no internal/cross-agency project id`);
    const set = pf[key];
    for (const row of asArr(set?.rows)) {
      enumCheck(str(row.hierarchy), ENUMS.kpiHierarchy, `performanceFramework[${key}] row hierarchy`);
      if (!row.id) hard(`performanceFramework[${key}]: every KPI row needs an id`);
    }
  }

  // ── 5. Part IV ───────────────────────────────────────────────────────────────
  const p4 = isObj(doc.part4) ? doc.part4 : {};
  const validateLineItem = (li, path) => {
    if (!isObj(li)) { hard(`${path}: not an object`); return; }
    if (!li.id) hard(`${path}: line item needs an id`);
    for (const k of ["item", "office", "uacsCode", "uacsLabel", "fundSource"]) {
      if (!str(li[k])) warn(`${path}: ${k} is blank`);
    }
    enumCheck(str(li.fundSource), ENUMS.fundingSource, `${path} fundSource`, { allowEmpty: true });
    if (typeof li.qty !== "number" || typeof li.unitCost !== "number")
      warn(`${path}: qty/unitCost should be numbers (got ${JSON.stringify(li.qty)}, ${JSON.stringify(li.unitCost)})`);
  };
  ["year1", "year2", "year3"].forEach((yk) => {
    const y = p4[yk];
    if (!isObj(y)) { warn(`part4.${yk} missing`); return; }
    asArr(y.officeProductivity?.capitalOutlay).forEach((li, i) => validateLineItem(li, `part4.${yk}.officeProductivity.capitalOutlay[${i}]`));
    asArr(y.officeProductivity?.mooe).forEach((li, i) => validateLineItem(li, `part4.${yk}.officeProductivity.mooe[${i}]`));
    asArr(y.continuingCosts?.mooe).forEach((li, i) => validateLineItem(li, `part4.${yk}.continuingCosts.mooe[${i}]`));
    const ip = isObj(y.internalProjects) ? y.internalProjects : {};
    for (const key of Object.keys(ip)) {
      if (!internalIds.has(key)) hard(`part4.${yk}.internalProjects key "${key}" matches no internal project id`);
      const pb = ip[key];
      if (!str(pb?.projectTitle)) warn(`part4.${yk}.internalProjects[${key}].projectTitle blank`);
      asArr(pb?.capitalOutlay).forEach((li, i) => validateLineItem(li, `part4.${yk}.internalProjects[${key}].capitalOutlay[${i}]`));
      asArr(pb?.mooe).forEach((li, i) => validateLineItem(li, `part4.${yk}.internalProjects[${key}].mooe[${i}]`));
    }
    const cp = isObj(y.crossAgencyProjects) ? y.crossAgencyProjects : {};
    for (const key of Object.keys(cp)) {
      if (!crossIds.has(key)) hard(`part4.${yk}.crossAgencyProjects key "${key}" matches no cross-agency project id`);
    }
  });

  // ── 6. Embedded images (mirror validateEmbeddedImages) ──────────────────────
  let totalImageBytes = 0;
  const checkImg = (value, label, max = MAX_IMAGE_BYTES) => {
    if (!value) return;
    if (typeof value !== "string" || !IMG_RE.test(value)) {
      hard(`${label}: must be a data:image/(png|jpeg|webp/svg+xml);base64, URL`);
      return;
    }
    const bytes = estimateBytes(value);
    totalImageBytes += bytes;
    if (label === "agency.logoBase64" && bytes > MAX_LOGO_BYTES)
      hard(`${label}: ${bytes.toLocaleString()} B exceeds 2 MB logo limit`);
    else if (bytes > max)
      hard(`${label}: ${bytes.toLocaleString()} B exceeds ${max.toLocaleString()} B limit`);
  };
  checkImg(a.logoBase64, "agency.logoBase64", MAX_LOGO_BYTES);
  asArr(p2.networkDiagrams).forEach((d, i) => checkImg(d?.dataUrl, `part2.networkDiagrams[${i}].dataUrl`));
  checkImg(p3.proposedNetworkDataUrl, "part3.proposedNetworkDataUrl");
  checkImg(p3.enterpriseArchDataUrl, "part3.enterpriseArchDataUrl");
  if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES)
    hard(`embedded images total ${totalImageBytes.toLocaleString()} B exceeds 35 MB limit`);

  // ── report ─────────────────────────────────────────────────────────────────
  console.log(`\n validating ${file}`);
  if (errors.length === 0 && warnings.length === 0) {
    console.log("  ✓ PASS — no errors, no warnings.");
    return 0;
  }
  if (errors.length) {
    console.log(`\n ✗ ${errors.length} HARD ERROR(S) — app will reject or drop data:`);
    errors.forEach((m) => console.log(`    • ${m}`));
  }
  if (warnings.length) {
    console.log(`\n  ⚠ ${warnings.length} warning(s) — loads, but review:`);
    warnings.forEach((m) => console.log(`    • ${m}`));
  }
  console.log(errors.length ? "\n  RESULT: FAIL (fix hard errors)\n" : "\n  RESULT: PASS with warnings\n");
  return errors.length ? 1 : 0;
}

process.exit(main(process.argv));
