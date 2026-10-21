/**
 * Generates the demonstration repository corpus for the Public ISSP Repository
 * (/repository) and ICT Budget Dashboard (/budget) mockups:
 *
 *   public/demo/repository/corpus.json      — derived, page-ready corpus
 *   public/demo/repository/{slug}.issp      — the actual schema-v14 documents
 *
 * ALL DATA IS FICTITIOUS. Twelve invented agencies, no real figures. The
 * derivation step runs the real editor aggregation engine
 * (src/components/issp-editor/part4/part4-aggregations.ts — buildB1–B4,
 * countedPart4, computeProjectCosts) so dashboard math == editor math.
 *
 * Conventions follow scripts/build-demo.js: stable readable ids, inline data,
 * output = JSON.stringify(…, 2) + newline. Everything is deterministic — a
 * seeded PRNG (mulberry32) is the only randomness and timestamps are fixed
 * constants — so regenerations are byte-identical
 * (scripts/verify-mock-corpus.mjs --check verifies that).
 *
 * Run:  npx tsx scripts/build-mock-corpus.ts
 * Check: node scripts/verify-mock-corpus.mjs [--check]
 */

import fs from "node:fs";
import path from "node:path";
import type {
  AgencyType,
  CyberControls,
  EgpChecklist,
  InformationSystem,
  IsspDocument,
  IsspScope,
  IctProject,
  KpiRow,
  LineItem,
  Part4Data,
  ProposedSystem,
  ProjectBudget,
  YearBudget,
} from "../src/lib/store/types";
import {
  buildB1,
  buildB2,
  buildB3,
  buildB4,
  computeProjectCosts,
  countedPart4,
  yearTotal,
} from "../src/components/issp-editor/part4/part4-aggregations";
import { EXPENSE_CATEGORIES } from "../src/lib/expense-categories";
import type { FundSource } from "../src/lib/fund-sources";
import type {
  CompassAgency,
  CompassLayer,
  CompassProjectTrace,
  CompassYearRecord,
  CorpusAdvisory,
  CorpusAiLayer,
  CorpusAiKind,
  CorpusFleet,
  CorpusKpi,
  CorpusLineItem,
  CorpusProfile,
  CorpusProcurement,
  CorpusProcurementStage,
  CorpusUnitPrices,
  RepositoryCorpus,
} from "../src/lib/repository/corpus-types";

const SCHEMA_VERSION = 14; // keep in sync with CURRENT_SCHEMA_VERSION
const PRESENT_YEAR = 2026; // fiscal years <= this have (fictitious) allotments
const GENERATED_AT = "2026-10-20T08:00:00.000Z"; // fixed for determinism
const SEED = 20261020;
const GAA = "General Appropriations Act";

// ─── Deterministic PRNG ───────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
/** Random integer in [lo, hi]. */
const ri = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
/** Pick from an array. */
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
/** Jitter a base amount by ±pct, rounded to `step`. */
const money = (base: number, pct: number, step = 500) =>
  Math.max(step, Math.round((base * (1 + (rand() * 2 - 1) * pct)) / step) * step);
const round500 = (n: number) => Math.round(n / 500) * 500;

// ─── Seed types ───────────────────────────────────────────────────────────────

interface HwLine {
  item: string;
  categoryId: string;
  qty: number;
  unitCost: number;
  fund?: FundSource;
}

interface ProjectSeed {
  id: string;
  shortTitle: string;
  title: string;
  description: string;
  objectives: string;
  kind: "software" | "infra" | "hardware";
  /** Plan-year offsets covered, 0-based within the cycle. */
  span: [number, number];
  /** Approximate 3-year budget for this project (CO + MOOE). */
  target: number;
  unit: string;
  alignment: string[];
  harmonization: string[];
  /** Proposed-system ids this project builds or enhances. */
  linked?: string[];
  fund?: FundSource;
  /** Showpiece hardware lines placed in the first covered year. */
  hw?: HwLine[];
  deliverables: [string, string, string];
  kpis?: CorpusKpi[];
  cross?: { programKey: keyof typeof CROSS_PROGRAMS; lead?: boolean };
}

interface ContinuingSeed {
  item: string;
  categoryId: string;
  annual: number;
  office?: string;
  fund?: FundSource;
}

interface OpFeatured {
  year: 0 | 1 | 2;
  cls: "co" | "mooe";
  item: string;
  categoryId: string;
  qty: number;
  unitCost: number;
  office?: string;
  fund?: FundSource;
}

interface SystemSeed {
  id: string;
  name: string;
  classification: InformationSystem["classification"];
  frontline?: boolean;
  accessType?: InformationSystem["frontlineAccessType"];
  url?: string;
  description: string;
  strategy: InformationSystem["developmentStrategy"];
  platform: string;
  database: string;
  storage: InformationSystem["dataStorage"];
  internalUsers: string;
  externalUsers?: string;
  owner: string;
  integrated?: boolean;
  pia?: boolean;
}

interface ProposedSeed extends SystemSeed {
  status: "FOR_DEVELOPMENT" | "FOR_ENHANCEMENT";
  enhancementDetails?: string;
}

interface AgencySeed {
  slug: string;
  acronym: string;
  name: string;
  type: AgencyType;
  websiteUrl: string;
  tagline: string;
  hero?: boolean;
  cycle: [number, number];
  scope: IsspScope;
  planStatus: "draft" | "for_review" | "submitted";
  createdAt: string;
  updatedAt: string;
  headName: string;
  cioName: string;
  cioPosition: string;
  cioUnit: string;
  focalName: string;
  focalPosition: string;
  legalBasis: string;
  mandate: string;
  vision: string;
  mission: string;
  networkDescription: string;
  /** 0..1 — fraction of current-state cybersecurity controls enabled. */
  cyberCurrent: number;
  outcomes: { name: string; programs: string[] }[];
  humanCapital: {
    plantillaIt: [number, number];
    plantillaNonIt: [number, number];
    unfilled: [number, number];
    contractualIt: [number, number];
    contractualNonIt: [number, number];
    outsourcedIt: [number, number];
    outsourcedNonIt: [number, number];
  };
  stakeholders: {
    name: string;
    services: { name: string; complexity: "Simple" | "Complex" | "Highly Technical"; direction: "INCOMING" | "OUTGOING" }[];
  }[];
  concerns: { outcome: number; program: number; system: string; concern: string; strategy: string }[];
  systems: SystemSeed[];
  proposed: ProposedSeed[];
  projects: ProjectSeed[];
  egp: {
    eGovPay?: "yes" | "no";
    pnpkiAdoption?: number;
    hcmisEquivalent?: string;
    ifmis?: "yes" | "no";
    onlinePortal?: "yes" | "no";
    recordsMgmt?: "yes" | "no";
    pscp?: "yes" | "no";
    elgu?: "yes" | "no";
    elguUrl?: string;
  };
  budget: {
    offices: string[];
    staff: number;
    /** Office Productivity total per year (CO + MOOE combined). */
    opTargets: [number, number, number];
    opFeatured?: OpFeatured[];
    continuing: ContinuingSeed[];
  };
  /** Fictitious FY-allotment ratio for elapsed years (2026–2028 cohort). */
  allotFactor?: number;
}

// ─── Cross-agency programs ────────────────────────────────────────────────────

const CROSS_PROGRAMS = {
  rapide: {
    key: "rapide",
    title: "RAPIDE — Real-time Analytics Platform for Inter-agency Disaster Events",
    description:
      "A shared analytics exchange that fuses coastal hazard telemetry, insurance exposure data and city incident reports into one operating picture during typhoon response. Each participating agency carries its integration share in its own ISSP.",
    leadAgencyName: "National Coastal Resilience Authority",
    alignment: ["E-Government Master Plan", "Program Convergence Budgeting"],
  },
  ctb: {
    key: "ctb",
    title: "Cold Chain Traceability Backbone (CTB)",
    description:
      "Common data standards and event-exchange services that let cold-chain custody records flow between regulators, food traceability auditors and academic researchers without each building proprietary integrations.",
    leadAgencyName: "Bureau of Cold Chain Management",
    alignment: ["Public Investment Program", "Program Convergence Budgeting"],
  },
  pxnet: {
    key: "pxnet",
    title: "Permits Exchange Network (PXNet)",
    description:
      "A lightweight inter-LGU exchange for verifying business permit and inspection records, so businesses relocating between member LGUs do not re-submit paperwork both municipalities already hold.",
    leadAgencyName: "City Government of Malinaw",
    alignment: ["E-Government Master Plan", "Program Convergence Budgeting"],
  },
} as const;

// ─── Factories ────────────────────────────────────────────────────────────────

const CYBER_KEYS: Array<[string, string]> = [
  ["physical", "perimeterProtection"], ["physical", "accessControl"], ["physical", "surveillance"],
  ["physical", "detection"], ["perimeter", "ngfw"], ["endpoint", "antivirus"], ["other", "patchMgmt"],
  ["other", "strongPasswords"], ["other", "securityLogs"], ["data", "backupRecovery"], ["perimeter", "idsIps"],
  ["network", "dataEncryption"], ["network", "networkSegmentation"], ["endpoint", "appControl"],
  ["other", "accessReviews"], ["other", "logAnalysis"], ["perimeter", "waf"], ["perimeter", "dmz"],
  ["data", "dataClassification"], ["other", "mfa"], ["other", "vulnAssessment"], ["other", "incidentResponse"],
  ["application", "securityScanning"], ["other", "secureSdlc"], ["other", "penTesting"], ["other", "siem"],
  ["endpoint", "xdr"], ["data", "dlp"], ["endpoint", "byod"],
];

function cyberControls(fraction: number): CyberControls {
  const c = {
    physical: { perimeterProtection: false, accessControl: false, surveillance: false, detection: false },
    perimeter: { ngfw: false, idsIps: false, waf: false, dmz: false },
    network: { dataEncryption: false, networkSegmentation: false },
    endpoint: { antivirus: false, appControl: false, byod: false, xdr: false },
    data: { dataClassification: false, dlp: false, backupRecovery: false },
    application: { securityScanning: false },
    other: {
      vulnAssessment: false, patchMgmt: false, strongPasswords: false, mfa: false, accessReviews: false,
      securityLogs: false, logAnalysis: false, incidentResponse: false, siem: false, penTesting: false,
      secureSdlc: false,
    },
  } as CyberControls;
  const enable = Math.floor(CYBER_KEYS.length * fraction);
  CYBER_KEYS.slice(0, enable).forEach(([group, key]) => {
    (c as unknown as Record<string, Record<string, boolean>>)[group][key] = true;
  });
  return c;
}

function egpChecklist(seed: AgencySeed): EgpChecklist {
  const e = seed.egp;
  const elgu = seed.type === "LGU"
    ? e.elgu === "yes"
      ? { status: "yes" as const, url: e.elguUrl ?? "" }
      : { status: "no" as const, ifNo: { manual: true, proposedDevelopment: true } }
    : undefined;
  return {
    ...(elgu ? { elgu } : {}),
    eGovPay: {
      status: e.eGovPay === "yes" ? "yes" : "no",
      ...(e.eGovPay === "yes" ? {} : { ifNo: { manual: true, proposedDevelopment: true } }),
    },
    pnpki: { status: (e.pnpkiAdoption ?? 0) >= 50 ? "yes" : "", adoptionPercentage: e.pnpkiAdoption ?? ri(5, 40) },
    hcmis: {
      status: "no",
      ifNo: { usingEquivalent: true, proposedDevelopment: true },
      equivalentName: e.hcmisEquivalent ?? "None — HR records maintained manually",
    },
    ifmis: { status: e.ifmis === "no" ? "no" : "yes", ...(e.ifmis === "no" ? {} : { url: "https://ifmis.dbm.gov.ph" }) },
    onlinePortal: {
      status: e.onlinePortal === "no" ? "" : "yes",
      url: e.onlinePortal === "no" ? "" : seed.websiteUrl,
      mechanisms: { website: true, email: true, landline: true, socialMedia: rand() > 0.5, mobile: rand() > 0.6 },
      connectedToPortal: "no",
    },
    procurement: { status: "yes", url: "https://philgeps.gov.ph" },
    recordsMgmt: { status: e.recordsMgmt === "yes" ? "yes" : "no" },
    pscp: { status: e.pscp === "yes" ? "yes" : "no" },
  };
}

function informationSystem(s: SystemSeed): InformationSystem {
  return {
    id: s.id,
    name: s.name,
    classification: s.classification,
    frontline: s.frontline ?? false,
    frontlineAccessType: s.frontline ? (s.accessType ?? "ONLINE") : "",
    url: s.url ?? "",
    description: s.description,
    developmentStrategy: s.strategy,
    developmentPlatform: s.platform,
    databaseName: s.database,
    dataStorage: s.storage,
    internalUsers: s.internalUsers,
    externalUsers: s.externalUsers ?? "",
    owner: s.owner,
    interoperability: {
      integrated: s.integrated ?? false,
      internalSystems: s.integrated ? "See system description" : "",
      externalSystems: "",
      generatesData: false,
      processesExternalData: false,
      sharedPlatform: false,
    },
    pia: { processesPersonalInfo: s.pia ? "yes" : "no", piaCompleted: false },
  };
}

function proposedSystem(s: ProposedSeed): ProposedSystem {
  return {
    ...informationSystem(s),
    status: s.status,
    enhancementDetails: s.enhancementDetails ?? "",
    pia: { processesPersonalInfo: s.pia ? "yes" : "no", piaRequired: s.pia ?? false },
  };
}

function templateKpis(p: ProjectSeed): CorpusKpi[] {
  return [
    {
      hierarchy: "Output",
      indicator: `% completion of ${p.shortTitle} deliverables`,
      baseline: "0%",
      targets: ["40%", "80%", "100%"],
    },
    {
      hierarchy: "Immediate Outcome",
      indicator: `Offices/units actively served by ${p.shortTitle} (vs. manual process at baseline)`,
      baseline: "0",
      targets: ["Pilot units", "Majority of units", "Full coverage"],
    },
  ];
}

function kpiRows(p: ProjectSeed): KpiRow[] {
  const kpis = p.kpis ?? templateKpis(p);
  return kpis.map((k, i) => ({
    id: `${p.id}-kpi-${i + 1}`,
    hierarchy: k.hierarchy as KpiRow["hierarchy"],
    targetedResult: k.indicator,
    indicator: k.indicator,
    baseline: k.baseline,
    year1Target: k.targets[0],
    year2Target: k.targets[1],
    year3Target: k.targets[2],
    dataCollectionMethod: "Quarterly project accomplishment reports",
    responsibleUnit: p.unit,
  }));
}

// ─── Budget machinery ─────────────────────────────────────────────────────────

let lineSeq = 0;
function mkLine(
  year: 0 | 1 | 2,
  cls: "co" | "mooe",
  item: string,
  office: string,
  categoryId: string,
  fundSource: string,
  qty: number,
  unitCost: number
): LineItem {
  lineSeq += 1;
  return {
    id: `y${year + 1}-${cls}-${String(lineSeq).padStart(3, "0")}`,
    item,
    office,
    categoryId,
    fundSource,
    qty,
    unitCost,
  };
}

const ESCALATION = [1, 1.04, 1.08];
const OP_CO_RATIO = [0.5, 0.38, 0.28];

/** Spend shape by span length and kind — share of the project target per covered year. */
function spanWeights(span: [number, number], kind: ProjectSeed["kind"]): number[] {
  const shapes: Record<string, Record<ProjectSeed["kind"], number[]>> = {
    "1": { software: [1], infra: [1], hardware: [1] },
    "2": { software: [0.58, 0.42], infra: [0.62, 0.38], hardware: [0.52, 0.48] },
    "3": { software: [0.42, 0.34, 0.24], infra: [0.52, 0.3, 0.18], hardware: [0.42, 0.33, 0.25] },
  };
  const w = shapes[String(span[1] - span[0] + 1)][kind];
  const out = [0, 0, 0];
  for (let i = span[0]; i <= span[1]; i++) out[i] = w[i - span[0]];
  return out;
}

function buildBudget(seed: AgencySeed): Part4Data {
  const offices = seed.budget.offices;
  const staff = seed.budget.staff;
  const ict = offices[0];

  const years: YearBudget[] = [0, 1, 2].map(() => ({
    officeProductivity: { capitalOutlay: [] as LineItem[], mooe: [] as LineItem[] },
    internalProjects: {} as Record<string, ProjectBudget>,
    crossAgencyProjects: {} as Record<string, ProjectBudget>,
    continuingCosts: { mooe: [] as LineItem[] },
  }));
  const yearLabel = ["Year 1", "Year 2", "Year 3"];

  // — Office Productivity: recurring MOOE + featured lines + generic CO fill —
  ([0, 1, 2] as const).forEach((y) => {
    const target = seed.budget.opTargets[y];
    const coTarget = target * OP_CO_RATIO[y];
    const opCo = years[y].officeProductivity.capitalOutlay;
    const opMooe = years[y].officeProductivity.mooe;

    const internetMonthly = pick([14000, 18000, 22000, 26000]);
    opMooe.push(mkLine(y, "mooe",
      `Internet subscription — ${offices.length > 1 ? `${offices.length} offices, pooled` : ict} (${yearLabel[y]})`,
      ict, "mooe-internet-subscription", GAA, offices.length * 12, round500(internetMonthly * ESCALATION[y])));
    opMooe.push(mkLine(y, "mooe",
      "ICT supplies (consumables, cartridges, peripherals)", ict, "mooe-ict-supplies", GAA, 1,
      money(pick([150000, 220000, 280000]), 0.15)));
    opMooe.push(mkLine(y, "mooe",
      "ICT training — staff capability building", ict, "mooe-ict-training", GAA, 1,
      money(pick([180000, 320000, 480000]), 0.2)));

    let coFeatured = 0;
    (seed.budget.opFeatured ?? []).filter((f) => f.year === y).forEach((f) => {
      const l = mkLine(y, f.cls, f.item, f.office ?? ict, f.categoryId, f.fund ?? GAA, f.qty, round500(f.unitCost * ESCALATION[y]));
      if (f.cls === "co") { opCo.push(l); coFeatured += f.qty * l.unitCost; }
      else opMooe.push(l);
    });

    const coCatalog = [
      { item: "Desktop computer sets (productivity replacement cycle)", qty: Math.max(3, Math.round(staff * 0.18)), unitCost: 52000, categoryId: "co-ict-machinery-equipment" },
      { item: "Laptop computers (mobile staff and field officers)", qty: Math.max(2, Math.round(staff * 0.1)), unitCost: 58000, categoryId: "co-ict-machinery-equipment" },
      { item: "Network switches and structured cabling refresh", qty: 1, unitCost: 380000, categoryId: "co-ict-machinery-equipment" },
      { item: "Rack-mounted UPS — equipment room", qty: 2, unitCost: 95000, categoryId: "co-ict-machinery-equipment" },
      { item: "Enterprise antivirus / endpoint protection licenses", qty: 1, unitCost: Math.round((staff * 1600) / 500) * 500, categoryId: "co-ict-software" },
    ];
    let coRest = coTarget - coFeatured;
    for (const c of coCatalog) {
      if (coRest < 300000) break;
      const budgetForLine = Math.min(money(c.unitCost, 0.12) * c.qty, coRest);
      const unitCost = Math.max(1000, round500(budgetForLine / c.qty));
      if (unitCost < 1000) continue;
      opCo.push(mkLine(y, "co", c.item, ict, c.categoryId, GAA, c.qty, unitCost));
      coRest -= c.qty * unitCost;
    }
  });

  // — Projects —
  for (const p of seed.projects) {
    const bucketKey = p.cross ? "crossAgencyProjects" : "internalProjects";
    const fund = p.fund ?? GAA;
    const weights = spanWeights(p.span, p.kind);
    for (let y = p.span[0]; y <= p.span[1]; y++) {
      const yAmount = p.target * weights[y];
      const coLines: LineItem[] = [];
      const mooeLines: LineItem[] = [];

      if (p.hw && y === p.span[0]) {
        p.hw.forEach((h) => {
          coLines.push(mkLine(y as 0 | 1 | 2, "co", h.item, p.unit, h.categoryId, h.fund ?? fund, h.qty, money(h.unitCost, 0.08)));
        });
        if (p.span[1] > y) {
          p.hw.slice(0, 2).forEach((h, i) => {
            coLines.push(mkLine(y as 0 | 1 | 2, "co",
              `${h.item.split("(")[0].trim()} — succeeding tranche`, p.unit, h.categoryId, h.fund ?? fund,
              Math.max(1, Math.round(h.qty * 0.3)), round500(h.unitCost * 0.9 * (1 - i * 0.1))));
          });
        }
      }

      const hwTotal = coLines.reduce((s, l) => s + l.qty * l.unitCost, 0);
      const rest = yAmount - hwTotal;
      if (rest > 200000) {
        const isSoftware = p.kind === "software";
        const mooeAmt = rest * (isSoftware ? 0.16 : 0.1);
        const coAmt = rest - mooeAmt;
        if (coAmt > 300000) {
          coLines.push(mkLine(y as 0 | 1 | 2, "co",
            isSoftware
              ? `${p.shortTitle} — system development and acquisition (${yearLabel[y]} milestone)`
              : `${p.shortTitle} — engineering, installation and commissioning (${yearLabel[y]})`,
            p.unit, isSoftware ? "co-ict-software" : "co-infrastructure-communications-network", fund, 1, round500(coAmt)));
        }
        mooeLines.push(mkLine(y as 0 | 1 | 2, "mooe",
          `Project management office — ${p.shortTitle}`, p.unit, "mooe-professional-services", fund, 1, round500(mooeAmt * 0.45)));
        mooeLines.push(mkLine(y as 0 | 1 | 2, "mooe",
          `Hosting, support and licences — ${p.shortTitle} (${yearLabel[y]})`, p.unit,
          // Deterministic per project+year so adding seed projects cannot reshuffle later agencies' filler lines.
          (p.id.length + y * 7) % 2 === 0 ? "mooe-cloud-computing" : "mooe-web-hosting", fund, 1, round500(mooeAmt * 0.3)));
        mooeLines.push(mkLine(y as 0 | 1 | 2, "mooe",
          `ICT training and change management — ${p.shortTitle}`, p.unit, "mooe-ict-training", fund, 1, round500(mooeAmt * 0.25)));
      }
      years[y][bucketKey][p.id] = { projectTitle: p.title, capitalOutlay: coLines, mooe: mooeLines };
    }
  }

  // — Continuing costs —
  seed.budget.continuing.forEach((c) => {
    ([0, 1, 2] as const).forEach((y) => {
      years[y].continuingCosts.mooe.push(mkLine(y, "mooe", c.item, c.office ?? ict, c.categoryId, c.fund ?? GAA, 1, round500(c.annual * ESCALATION[y])));
    });
  });

  return { year1: years[0], year2: years[1], year3: years[2] };
}

// ─── Document composer ────────────────────────────────────────────────────────

const TRACKED_SECTIONS = [
  "definitions", "part1/a", "part1/b", "part1/c", "part2/a", "part2/b", "part2/c", "part2/d",
  "part3/a", "part3/b", "part3/c", "part3/d", "part3/e1", "part3/e2", "part3/f",
  "part4/year1", "part4/year2", "part4/year3", "part4/summary",
];

function sectionMeta(status: AgencySeed["planStatus"]) {
  const doneCount = status === "submitted" ? 19 : status === "for_review" ? 17 : 13;
  const meta: Record<string, { userMarkedDone: boolean; lastEditedAt: string | null }> = {};
  TRACKED_SECTIONS.forEach((id, i) => {
    meta[id] = { userMarkedDone: i < doneCount, lastEditedAt: i < doneCount ? null : "2026-10-14 09:00:00" };
  });
  return meta;
}

function ictProject(p: ProjectSeed, seed: AgencySeed): IctProject {
  const cross = p.cross;
  const y = (i: number) => seed.cycle[0] + i;
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    objectives: p.objectives,
    projectType: p.kind === "software" ? "IS_DRIVEN" : "STANDALONE",
    linkedSystemIds: p.linked ?? [],
    strategicAlignment: p.alignment,
    harmonizationFramework: p.harmonization,
    implementingUnit: p.unit,
    ...(cross
      ? {
          leadAgency: cross.lead ? seed.name : CROSS_PROGRAMS[cross.programKey].leadAgencyName,
          implementingAgencies: CROSS_PROGRAMS[cross.programKey].title,
        }
      : {}),
    fundingSource: p.fund ?? GAA,
    year1Deliverables: p.deliverables[0],
    year2Deliverables: p.deliverables[1],
    year3Deliverables: p.deliverables[2],
    duration: p.span[0] === p.span[1] ? `${y(p.span[0])}` : `${y(p.span[0])}–${y(p.span[1])}`,
  };
}

function composeDoc(seed: AgencySeed): IsspDocument {
  const hc = seed.humanCapital;
  const outcomes = seed.outcomes.map((o, i) => ({
    id: `oo-${i + 1}`,
    name: o.name,
    programs: o.programs.map((p, j) => ({ id: `oo-${i + 1}-pg-${j + 1}`, name: p })),
  }));
  const internal = seed.projects.filter((p) => !p.cross);
  const cross = seed.projects.filter((p) => p.cross);

  return {
    version: "1.0",
    fileType: "issp-main",
    exportedAt: seed.updatedAt,
    tool: "issp-platform",
    schemaVersion: SCHEMA_VERSION,
    title: `${seed.name} Information Systems Strategic Plan ${seed.cycle[0]}–${seed.cycle[1]}`,
    startYear: seed.cycle[0],
    endYear: seed.cycle[1],
    amendmentNumber: 0,
    scope: seed.scope,
    agencyHeadName: seed.headName,
    agency: { name: seed.name, acronym: seed.acronym, type: seed.type, websiteUrl: seed.websiteUrl, logoBase64: null },
    planStatus: seed.planStatus,
    submissionTarget: { agency: "DICT", deadline: seed.planStatus === "submitted" ? `${seed.cycle[0] - 1}-04-30` : null },
    sectionMeta: sectionMeta(seed.planStatus),
    part1: {
      legalBasis: seed.legalBasis,
      mandateFunction: seed.mandate,
      visionStatement: seed.vision,
      missionStatement: seed.mission,
      orgOutcomes: outcomes,
      cioName: seed.cioName,
      cioPosition: seed.cioPosition,
      cioUnit: seed.cioUnit,
      cioEmail: `cio@${seed.acronym.toLowerCase()}.gov.ph`,
      cioContact: `+63 2 8${ri(100, 999)} ${ri(1000, 9999)}`,
      focalSameAsCio: false,
      focalName: seed.focalName,
      focalPosition: seed.focalPosition,
      focalUnit: seed.cioUnit,
      focalEmail: `focal@${seed.acronym.toLowerCase()}.gov.ph`,
      focalContact: `+63 2 8${ri(100, 999)} ${ri(1000, 9999)}`,
      humanCapital: {
        plantilla: { it: { male: hc.plantillaIt[0], female: hc.plantillaIt[1] }, nonIt: { male: hc.plantillaNonIt[0], female: hc.plantillaNonIt[1] } },
        plantillaUnfilled: { it: hc.unfilled[0], nonIt: hc.unfilled[1] },
        contractual: { it: { male: hc.contractualIt[0], female: hc.contractualIt[1] }, nonIt: { male: hc.contractualNonIt[0], female: hc.contractualNonIt[1] } },
        outsourced: { it: { male: hc.outsourcedIt[0], female: hc.outsourcedIt[1] }, nonIt: { male: hc.outsourcedNonIt[0], female: hc.outsourcedNonIt[1] } },
      },
      stakeholders: seed.stakeholders.map((s, i) => ({
        id: `st-${i + 1}`,
        name: s.name,
        services: s.services.map((sv, j) => ({ id: `st-${i + 1}-sv-${j + 1}`, ...sv })),
      })),
    },
    part2: {
      strategicConcerns: seed.concerns.map((c, i) => ({
        id: `c-${i + 1}`,
        outcomeIds: [`oo-${c.outcome}`],
        programIds: [`oo-${c.outcome}-pg-${c.program}`],
        criticalSystem: c.system,
        concern: c.concern,
        desiredStrategy: c.strategy,
      })),
      networkDiagrams: [],
      networkDescription: seed.networkDescription,
      cybersecurityControls: cyberControls(seed.cyberCurrent),
      informationSystems: seed.systems.map(informationSystem),
      egpChecklist: egpChecklist(seed),
    },
    part3: {
      proposedNetworkDataUrl: null,
      proposedNetworkDesc: `The target architecture consolidates ${seed.name}'s infrastructure under a unified security and connectivity baseline: redundant links for critical offices, centrally managed cloud-hosted core platforms, and network segmentation between administrative, operations and public-facing zones.`,
      proposedCybersecControls: cyberControls(0.93),
      enterpriseArchDataUrl: null,
      proposedHumanCapital: [
        { id: "hc-1", position: "Chief Information Officer", employmentStatus: "PLANTILLA", quantity: 1 },
        { id: "hc-2", position: "Systems Development Officer", employmentStatus: "PLANTILLA", quantity: ri(2, 6) },
        { id: "hc-3", position: "Network and Cybersecurity Officer", employmentStatus: "PLANTILLA", quantity: ri(1, 4) },
        { id: "hc-4", position: "ICT Project Support Staff", employmentStatus: "CONTRACTUAL", quantity: ri(2, 8) },
      ],
      proposedSystems: seed.proposed.map(proposedSystem),
      internalProjects: internal.map((p) => ictProject(p, seed)),
      crossAgencyProjects: cross.map((p) => ictProject(p, seed)),
      performanceFramework: Object.fromEntries(
        seed.projects.map((p) => [p.id, { projectTitle: p.title, projectCategory: p.cross ? "crossAgency" : "internal", rows: kpiRows(p) }])
      ),
    },
    part4: buildBudget(seed),
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
  };
}

// ─── Agency seeds (all fictitious) ────────────────────────────────────────────

const SEEDS: AgencySeed[] = [
  // ═══ BCCM — Bureau of Cold Chain Management (NGA, 2026–2028) ═══
  {
    slug: "bccm-2026-2028",
    acronym: "BCCM",
    name: "Bureau of Cold Chain Management",
    type: "NGA",
    websiteUrl: "https://www.bccm.gov.ph",
    tagline: "Cold chain integrity for vaccines, food and perishables",
    cycle: [2026, 2028],
    scope: "AGENCY_WIDE",
    planStatus: "submitted",
    createdAt: "2025-09-12T09:15:00.000Z",
    updatedAt: "2026-01-30T04:45:00.000Z",
    headName: "Director-General Corazon M. Alcantara",
    cioName: "Chief Ramil D. Espejo",
    cioPosition: "Chief, ICT Unit",
    cioUnit: "ICT Unit",
    focalName: "Ms. Divina P. Osorio",
    focalPosition: "Supervising Administrative Officer",
    legalBasis: "Republic Act No. 11988 (Cold Chain Integrity Act of 2024), which created the Bureau of Cold Chain Management under the Department of Trade, with authority to set, monitor and enforce temperature-controlled storage and transport standards for health and food commodities.",
    mandate: "The BCCM regulates and monitors the national cold chain: it accredits cold storage facilities, inspects refrigerated transport, maintains the national registry of cold chain equipment, and coordinates with health and food safety agencies on temperature excursion incidents. It operates a central laboratory in Metro Manila and inspection teams across all regions.",
    vision: "A national cold chain where no vaccine, food commodity or perishable is lost to a break in temperature integrity.",
    mission: "To set and enforce cold chain standards, maintain an accurate national equipment registry, and provide regulators and the public with reliable, near-real-time visibility of cold chain conditions.",
    networkDescription: "The Central Office runs a flat 1 Gbps LAN with a single ISP fiber link and a DSL backup that has never been tested under load. Seventeen regional inspection teams connect through consumer-grade LTE routers; temperature excursion reports from accredited facilities arrive as weekly e-mailed PDF exports that staff re-encode into a shared spreadsheet. The equipment registry lives on a single on-premise server protected by one aging UPS.",
    cyberCurrent: 0.38,
    outcomes: [
      { name: "Reduced temperature-excursion losses across the national cold chain", programs: ["Cold Room Monitoring Program", "Excursion Response and Traceback Program"] },
      { name: "Complete and current national registry of cold chain equipment", programs: ["Registry Digitalization Program"] },
      { name: "Strengthened BCCM regulatory and inspection capability", programs: ["Inspector Enablement Program"] },
    ],
    humanCapital: { plantillaIt: [6, 9], plantillaNonIt: [38, 61], unfilled: [3, 11], contractualIt: [4, 3], contractualNonIt: [12, 18], outsourcedIt: [5, 2], outsourcedNonIt: [2, 1] },
    stakeholders: [
      { name: "Accredited cold storage operators", services: [
        { name: "Submission of facility temperature logs and excursion reports", complexity: "Complex", direction: "INCOMING" },
        { name: "Receipt of accreditation and audit findings", complexity: "Simple", direction: "OUTGOING" },
      ] },
      { name: "Department of Health (immunization program)", services: [
        { name: "Coordination on vaccine cold chain incidents and recalls", complexity: "Highly Technical", direction: "OUTGOING" },
      ] },
      { name: "Local Government Units", services: [
        { name: "Verification of cold chain compliance for local health facilities", complexity: "Simple", direction: "INCOMING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "TEMPMON (temperature monitoring exports)", concern: "TEMPMON collects readings from 240 accredited cold rooms but only as end-of-week PDF exports; inspectors discover excursions an average of nine days after they happen, and two vaccine batches in 2025 were written off before any alert fired.", strategy: "Deploy continuous LoRa-based sensors with a central gateway (Project LAMIG) that alerts inspectors within fifteen minutes of an excursion." },
      { outcome: 2, program: 2, system: "COMET (cold storage equipment tracker — spreadsheets)", concern: "The national equipment registry is maintained in seventeen regional spreadsheet variants with no common identifier; the same chiller appears under three different serial formats, and the annual registry reconciliation consumes two person-months.", strategy: "Consolidate the registry into a single digital system with unique equipment IDs, QR tagging, and inspection history (Registry Digitalization Program)." },
    ],
    systems: [
      { id: "is-tempmon", name: "TEMPMON — Temperature Monitoring Aggregator", classification: "SUPPORT_TO_OPERATIONS", description: "Vendor portal that receives weekly PDF temperature exports from accredited facilities. No alerting; no API; exports must be re-encoded by hand.", strategy: "COTS", platform: "Vendor SaaS portal", database: "Vendor-hosted", storage: "CLOUD", internalUsers: "Inspection Division (~45 staff)", owner: "Inspection Division" },
      { id: "is-comet", name: "COMET — Cold Storage Equipment Tracker", classification: "GENERAL_ADMIN", description: "A shared workbook per region listing chillers, freezers and transport units. Serial numbers are free-text; three regions still print and file copies.", strategy: "IN_HOUSE", platform: "Microsoft Excel", database: "N/A (workbooks)", storage: "ON_PREMISE", internalUsers: "All regional inspection teams (~120 staff)", owner: "Registry Section" },
      { id: "is-accsys", name: "Accreditation System (AccSys)", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", url: "https://accreditation.bccm.gov.ph", description: "Online application and renewal portal for cold storage accreditation. Payments are handled off-platform; status tracking is by e-mail.", strategy: "OUTSOURCED", platform: "PHP / MySQL", database: "accsys_db", storage: "ON_PREMISE", internalUsers: "Accreditation Section (~20 staff)", externalUsers: "Accredited operators (~610 accounts)", owner: "Accreditation Section", pia: true },
    ],
    proposed: [
      { id: "ps-lamig", name: "LAMIG Gateway — National Cold Chain Monitoring Platform", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", description: "Continuous sensor ingestion, excursion alerting and inspector dispatch for all accredited cold rooms and refrigerated vehicles.", strategy: "OUTSOURCED", platform: "LoRaWAN / Node.js / PostgreSQL", database: "lamig_prod", storage: "CLOUD", internalUsers: "Inspection Division, regional teams (~180 staff)", externalUsers: "Accredited operators (portal dashboards)", owner: "ICT Unit", pia: false, status: "FOR_DEVELOPMENT" },
      { id: "ps-registry", name: "Digital Cold Chain Registry", classification: "SUPPORT_TO_OPERATIONS", description: "Single registry of cold chain equipment with unique IDs, QR tags, inspection history and operator ownership records.", strategy: "OUTSOURCED", platform: "Next.js / PostgreSQL", database: "registry_prod", storage: "CLOUD", internalUsers: "Registry Section, Inspection Division (~70 staff)", owner: "Registry Section", status: "FOR_DEVELOPMENT" },
    ],
    projects: [
      {
        id: "p-lamig",
        shortTitle: "Project LAMIG",
        title: "Project LAMIG — LoRa Ambient Monitoring & Integrity Gateway",
        description: "Installs continuous temperature and door sensors in all 240 accredited cold rooms plus LoRa gateways and a cloud monitoring platform, replacing weekly PDF exports with fifteen-minute excursion alerts.",
        objectives: "1. Instrument all 240 accredited cold rooms by Q4 2026\n2. Cut excursion detection time from 9 days to 15 minutes\n3. Give operators self-service dashboards by 2027\n4. Feed standardized custody events to the Cold Chain Traceability Backbone",
        kind: "hardware",
        span: [0, 1],
        target: 140_000_000,
        unit: "ICT Unit",
        alignment: ["E-Government Master Plan", "National Cybersecurity Plan"],
        harmonization: ["Interoperability Framework", "Scalability and Sustainability"],
        linked: ["ps-lamig"],
        hw: [
          { item: "LoRa gateway concentrators — 240 accredited cold rooms", categoryId: "co-communication-equipment", qty: 240, unitCost: 18500 },
          { item: "Temperature and door sensors (calibrated, 5-year battery)", categoryId: "co-ict-machinery-equipment", qty: 1200, unitCost: 28000 },
          { item: "Edge servers and NVR — regional monitoring nodes (48)", categoryId: "co-ict-machinery-equipment", qty: 48, unitCost: 265000 },
        ],
        deliverables: [
          "Sensor rollout for priority vaccine cold rooms (120); gateway platform live; excursion alerting operational",
          "Remaining 120 cold rooms instrumented; operator dashboards launched; CTB event feed enabled",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Median time from temperature excursion to inspector alert", baseline: "9 days", targets: ["30 minutes", "15 minutes", "15 minutes"] },
          { hierarchy: "Output", indicator: "Accredited cold rooms with continuous monitoring", baseline: "0 of 240", targets: ["120", "240", "240"] },
          { hierarchy: "Output", indicator: "% of excursion reports submitted as structured events (not PDF)", baseline: "0%", targets: ["50%", "100%", "100%"] },
        ],
      },
      {
        id: "p-registry",
        shortTitle: "Registry Digitalization",
        title: "Cold Chain Equipment Registry Digitalization",
        description: "Consolidates seventeen regional spreadsheet variants into one digital registry with unique equipment IDs, QR tagging and full inspection history.",
        objectives: "1. Migrate all regional equipment records into the digital registry by Q3 2026\n2. Issue unique IDs and QR tags for all registered equipment\n3. Link registry records to inspection and accreditation histories",
        kind: "software",
        span: [0, 0],
        target: 45_000_000,
        unit: "Registry Section",
        alignment: ["E-Government Master Plan"],
        harmonization: ["National Prioritization", "Interoperability Framework"],
        linked: ["ps-registry"],
        deliverables: [
          "Registry system developed and deployed; all regional records migrated and reconciled; QR tagging completed",
          "",
          "",
        ],
        kpis: [
          { hierarchy: "Output", indicator: "Equipment records with unique registry IDs", baseline: "0%", targets: ["100%", "100%", "100%"] },
          { hierarchy: "Immediate Outcome", indicator: "Annual registry reconciliation effort (person-months)", baseline: "2.0", targets: ["0.1", "0.1", "0.1"] },
        ],
      },
      {
        id: "cx-ctb",
        shortTitle: "CTB participation",
        title: "Cold Chain Traceability Backbone (CTB) — BCCM share",
        description: "The Bureau's lead share of the cross-agency CTB program: publishing standardized custody events from LAMIG and maintaining the shared data standards with the National Food Traceability Council and academic partners.",
        objectives: "1. Publish LAMIG custody events in the shared CTB format\n2. Co-lead the CTB standards working group\n3. Provide sandbox access for research partners",
        kind: "software",
        span: [0, 2],
        target: 80_000_000,
        unit: "ICT Unit",
        alignment: ["E-Government Master Plan", "Program Convergence Budgeting"],
        harmonization: ["Interoperability Framework", "Cross-Agency Collaboration"],
        cross: { programKey: "ctb", lead: true },
        deliverables: [
          "CTB event schema v1.0 ratified with partners; BCCM event gateway live",
          "Sandbox access for research partners; schema v1.1 (transport segment)",
          "Program review; handover of standards stewardship to the working group",
        ],
      },
    ],
    egp: { eGovPay: "no", pnpkiAdoption: 34, ifmis: "yes", recordsMgmt: "no", pscp: "no" },
    budget: {
      offices: ["ICT Unit", "Inspection Division", "Registry Section"],
      staff: 92,
      opTargets: [12_000_000, 10_000_000, 8_000_000],
      opFeatured: [
        { year: 0, cls: "co", item: "Ruggedized inspection laptops with thermal probe kit (regional cold-chain teams, IP65)", categoryId: "co-ict-machinery-equipment", qty: 48, unitCost: 120_000 },
        { year: 1, cls: "co", item: "Ruggedized inspection laptops — second tranche (regional cold-chain teams)", categoryId: "co-ict-machinery-equipment", qty: 12, unitCost: 120_000 },
        { year: 2, cls: "mooe", item: "Semi-expendable label printers for QR tagging", categoryId: "mooe-semi-expendable-printing-equipment", qty: 30, unitCost: 8500 },
        { year: 1, cls: "co", item: "Cold-room monitoring display panels (registry wall)", categoryId: "co-ict-machinery-equipment", qty: 4, unitCost: 320000 },
      ],
      continuing: [
        { item: "TEMPMON vendor subscription (transition period)", categoryId: "mooe-other-general-ict-services", annual: 6_500_000 },
        { item: "Sensor calibration and field services", categoryId: "mooe-professional-services", annual: 3_200_000 },
        { item: "Cold room equipment repairs and maintenance", categoryId: "mooe-rm-ict-equipment", annual: 2_100_000 },
        { item: "Leased datalogger servicing (pre-LAMIG stock)", categoryId: "mooe-rm-leased-ict", annual: 300_000 },
        { item: "Label printer servicing and consumables", categoryId: "mooe-rm-semi-printing", annual: 180_000 },
      ],
    },
    allotFactor: 1.0,
  },

  // ═══ HAFSC — Highland Agri-Forestry State College (SUC/OTHER, 2026–2028) ═══
  {
    slug: "hafsc-2026-2028",
    acronym: "HAFSC",
    name: "Highland Agri-Forestry State College",
    type: "OTHER",
    websiteUrl: "https://www.hafsc.edu.ph",
    tagline: "Connected campus, climate-smart agriculture extension",
    cycle: [2026, 2028],
    scope: "AGENCY_WIDE",
    planStatus: "submitted",
    createdAt: "2025-08-28T02:30:00.000Z",
    updatedAt: "2026-01-22T06:10:00.000Z",
    headName: "President Dr. Estelito R. Cablayan",
    cioName: "Engr. Maricel T. Bungubung",
    cioPosition: "Director, ICT Office",
    cioUnit: "ICT Office",
    focalName: "Mr. Noel S. Diffang",
    focalPosition: "Administrative Officer V",
    legalBasis: "Republic Act No. 11245, converting the highland agri-forestry school into a state college, with instruction, research and extension mandates in sustainable highland agriculture and community forestry.",
    mandate: "HAFSC provides higher education in agriculture, forestry and environmental science for highland farming communities; runs research on climate-resilient upland farming; and delivers extension services to farmer cooperatives across three provinces through its extension network and demonstration farms.",
    vision: "A state college whose farms, laboratories and classrooms operate as one connected campus serving highland farming communities.",
    mission: "To deliver quality agri-forestry education, research and extension backed by reliable information systems and campus connectivity.",
    networkDescription: "The main campus network is a mix of unmanaged switches and home routers installed building-by-building over fifteen years; two remote demonstration farms have no connectivity at all and report by SMS. The student information system runs on a single tower server in the registrar's storeroom, cooled by an electric fan. Backup is an external hard drive rotated weekly to the vault — when staff remember.",
    cyberCurrent: 0.28,
    outcomes: [
      { name: "Efficient and transparent academic administration", programs: ["Digital Campus Program"] },
      { name: "Wider reach and relevance of extension services", programs: ["e-Extension Learning Program"] },
      { name: "Institutional resilience and data protection", programs: ["Campus Cybersecurity Program"] },
    ],
    humanCapital: { plantillaIt: [3, 4], plantillaNonIt: [52, 88], unfilled: [2, 14], contractualIt: [2, 2], contractualNonIt: [8, 15], outsourcedIt: [1, 0], outsourcedNonIt: [4, 2] },
    stakeholders: [
      { name: "Students and enrollees", services: [
        { name: "Enrolment, records and graduation transactions", complexity: "Complex", direction: "INCOMING" },
      ] },
      { name: "Farmer cooperatives and LGU agriculture offices", services: [
        { name: "Access to extension training and demonstration materials", complexity: "Simple", direction: "OUTGOING" },
        { name: "Requests for technical assistance and soil advisories", complexity: "Complex", direction: "INCOMING" },
      ] },
      { name: "Commission on Higher Education", services: [
        { name: "Submission of enrolment, graduation and program reports", complexity: "Complex", direction: "OUTGOING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "Enrolment records (spreadsheets)", concern: "Enrolment runs on a registrar-maintained spreadsheet gridlocked to one workstation; during enrolment week the queue for the single encoding station wraps around the registrar's corridor, and sectioning is finalized by acetate boards.", strategy: "Deploy an integrated student information system with self-service enrolment and faculty grade capture." },
      { outcome: 2, program: 2, system: "Extension training records (manual)", concern: "Extension training for cooperatives is delivered in person with printed modules; farmers who cannot travel lose access entirely, and training completion records exist only on attendance sheets.", strategy: "Launch an e-extension learning platform with offline-capable modules mapped to the college's demonstration farm calendar." },
      { outcome: 3, program: 3, system: "Campus network (unmanaged)", concern: "The unmanaged campus network has no segregation between the registrar's server, laboratory machines and dormitory Wi-Fi; a ransomware scare in the computer laboratory in 2025 was contained by unplugging the building.", strategy: "Execute the campus network modernization and cybersecurity hardening project: fiber backbone, managed segmentation, central authentication and backups." },
    ],
    systems: [
      { id: "is-sis", name: "Student Information System (in-house)", classification: "SUPPORT_TO_OPERATIONS", description: "Spreadsheet-based enrolment and records management maintained by the Office of the Registrar; one encoding workstation; no self-service.", strategy: "IN_HOUSE", platform: "Microsoft Excel", database: "N/A", storage: "ON_PREMISE", internalUsers: "Registrar's Office (9 staff)", owner: "Office of the Registrar", pia: true },
      { id: "is-koha", name: "Library System (Koha)", classification: "GENERAL_ADMIN", description: "Open-source library management for the main library; the online catalog is reachable only on campus.", strategy: "OPEN_SOURCE", platform: "Koha / MySQL", database: "koha", storage: "ON_PREMISE", internalUsers: "Library staff (6)", owner: "Library", pia: false },
    ],
    proposed: [
      { id: "ps-one-hafsc", name: "Integrated Student Information System", classification: "SUPPORT_TO_OPERATIONS", description: "Web-based SIS with self-service enrolment, grade capture, and CHED reporting exports; hosted for reliability during enrolment peaks.", strategy: "OUTSOURCED", platform: "Managed SIS platform", database: "Vendor-managed", storage: "CLOUD", internalUsers: "Registrar, faculty, academic heads (~140 staff)", externalUsers: "Students (~4,800)", owner: "Office of the Registrar", pia: true, status: "FOR_DEVELOPMENT" },
      { id: "ps-eext", name: "e-Extension Learning Platform", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", description: "Offline-capable learning platform for farmer cooperatives: training modules, demonstration videos, quiz and certification, synced when connectivity allows.", strategy: "OPEN_SOURCE", platform: "Moodle (customized) / PostgreSQL", database: "eext", storage: "CLOUD", internalUsers: "Extension Office (~25 staff)", externalUsers: "Farmer cooperatives (~3,200 learners)", owner: "Extension and Training Office", status: "FOR_DEVELOPMENT" },
    ],
    projects: [
      {
        id: "p-net",
        shortTitle: "Campus Network & Cybersecurity",
        title: "Campus Network Modernization and Cybersecurity Hardening",
        description: "Replaces the unmanaged building-by-building network with a fiber backbone, managed segmentation, campus Wi-Fi and a hardened server room with central authentication and tested backups.",
        objectives: "1. Complete the fiber backbone across all academic buildings by Q3 2026\n2. Segment registrar, laboratory and dormitory networks\n3. Establish tested daily offsite backups and central authentication",
        kind: "infra",
        span: [0, 0],
        target: 35_000_000,
        unit: "ICT Office",
        alignment: ["National Cybersecurity Plan", "E-Government Master Plan"],
        harmonization: ["National Prioritization", "Scalability and Sustainability"],
        hw: [
          { item: "Campus fiber backbone and civil works (6 buildings + 2 farms)", categoryId: "co-infrastructure-communications-network", qty: 1, unitCost: 12_500_000 },
          { item: "Next-generation firewalls and core switches", categoryId: "co-ict-machinery-equipment", qty: 2, unitCost: 2_800_000 },
          { item: "Campus Wi-Fi access points (outdoor-rated)", categoryId: "co-communication-equipment", qty: 180, unitCost: 45000 },
          { item: "Virtualization host for SIS and library systems", categoryId: "co-ict-machinery-equipment", qty: 1, unitCost: 3_500_000 },
        ],
        deliverables: [
          "Fiber backbone lit; segmentation enforced; server room hardened; backup regime operational",
          "",
          "",
        ],
        kpis: [
          { hierarchy: "Output", indicator: "Buildings on managed fiber backbone", baseline: "0 of 8", targets: ["8", "8", "8"] },
          { hierarchy: "Immediate Outcome", indicator: "Campus network segments with enforced policy", baseline: "0", targets: ["4 (registrar, labs, dorms, admin)", "4", "4"] },
          { hierarchy: "Intermediate Outcome", indicator: "Backup restore tests passed per year", baseline: "0", targets: ["4 (quarterly)", "4", "4"] },
        ],
      },
      {
        id: "p-ext",
        shortTitle: "e-Extension Platform",
        title: "e-Extension Learning Platform for Farmer Cooperatives",
        description: "Launches an offline-capable learning platform delivering the college's extension curriculum to cooperatives that cannot always travel to campus, with certification tracking.",
        objectives: "1. Migrate 12 core extension modules to the platform by Q4 2026\n2. Enroll 1,500 cooperative learners by 2027\n3. Issue verifiable training certificates through the platform",
        kind: "software",
        span: [0, 1],
        target: 28_000_000,
        unit: "Extension and Training Office",
        alignment: ["E-Government Master Plan"],
        harmonization: ["Resource Optimization", "Scalability and Sustainability"],
        linked: ["ps-eext"],
        deliverables: [
          "Platform launched; 12 modules migrated; first 600 cooperative learners enrolled",
          "Offline kiosks at 3 partner coops; 1,500 cumulative learners; certification flow live",
          "",
        ],
        kpis: [
          { hierarchy: "Output", indicator: "Extension modules available online", baseline: "0", targets: ["12", "20", "24"] },
          { hierarchy: "Intermediate Outcome", indicator: "Cooperative learners completing at least one module", baseline: "0", targets: ["600", "1,500", "2,400"] },
        ],
      },
      {
        id: "p-ailab",
        shortTitle: "AI Teaching & Research Lab",
        title: "AI Teaching and Research Laboratory",
        description: "Equips a teaching laboratory with accelerator-capable workstations and a departmental training server so the College can offer AI electives across its agri-forestry programs and train faculty — capability-building on shared curriculum workloads, not a production cluster.",
        objectives: "1. AI elective track launched in AY 2027-2028\n2. 24-seat laboratory operational with a departmental training server\n3. 12 faculty certified to teach AI modules by 2028",
        kind: "hardware",
        span: [1, 1],
        target: 22_000_000,
        unit: "ICT Office",
        alignment: ["E-Government Master Plan"],
        harmonization: ["Scalability and Sustainability", "Resource Optimization"],
        hw: [
          { item: "Accelerator-equipped teaching workstations (AI lab, 24 seats)", categoryId: "co-ict-machinery-equipment", qty: 24, unitCost: 185_000 },
          { item: "Departmental AI training server (8-accelerator, teaching workloads)", categoryId: "co-ict-machinery-equipment", qty: 1, unitCost: 6_800_000 },
          { item: "Lab benching, cooling and precision power", categoryId: "co-infrastructure-communications-network", qty: 1, unitCost: 1_600_000 },
        ],
        deliverables: [
          "",
          "Laboratory operational; AI elective track launched; first 120 students enrolled; 8 faculty certified",
          "",
        ],
        kpis: [
          { hierarchy: "Output", indicator: "Students completing at least one AI elective", baseline: "0", targets: ["120", "240", "300"] },
          { hierarchy: "Immediate Outcome", indicator: "Faculty certified to teach AI modules", baseline: "2", targets: ["8", "12", "16"] },
        ],
      },
    ],
    egp: { eGovPay: "no", pnpkiAdoption: 11, ifmis: "yes", recordsMgmt: "no", pscp: "no" },
    budget: {
      offices: ["ICT Office", "Office of the Registrar", "Extension and Training Office"],
      staff: 124,
      opTargets: [6_000_000, 5_000_000, 4_000_000],
      opFeatured: [
        { year: 0, cls: "mooe", item: "Semi-expendable projectors and teaching peripherals", categoryId: "mooe-semi-expendable-ict-equipment", qty: 12, unitCost: 18000 },
        { year: 1, cls: "co", item: "Networked multifunction printers (registrar and records)", categoryId: "co-printing-equipment", qty: 3, unitCost: 85000 },
        { year: 1, cls: "mooe", item: "Landline and fax subscriptions (all offices)", categoryId: "mooe-landline-expenses", qty: 1, unitCost: 360000 },
      ],
      continuing: [
        { item: "Koha library system support and hosting", categoryId: "mooe-web-hosting", annual: 250_000 },
        { item: "Enrolment system maintenance (transition)", categoryId: "mooe-other-general-ict-services", annual: 1_200_000 },
        { item: "Computer laboratory repairs and maintenance", categoryId: "mooe-rm-ict-equipment", annual: 900_000 },
        { item: "Landline subscriptions (legacy lines, winding down)", categoryId: "mooe-landline-expenses", annual: 380_000 },
      ],
    },
    allotFactor: 0.87,
  },

  // ═══ NCRA — National Coastal Resilience Authority (NGA, 2027–2029) — HERO ═══
  {
    slug: "ncra-2027-2029",
    acronym: "NCRA",
    name: "National Coastal Resilience Authority",
    type: "NGA",
    websiteUrl: "https://www.ncra.gov.ph",
    tagline: "Unified coastal hazard monitoring and community early warning",
    hero: true,
    cycle: [2027, 2029],
    scope: "WITH_REGIONAL",
    planStatus: "submitted",
    createdAt: "2026-01-19T08:00:00.000Z",
    updatedAt: "2026-04-29T10:20:00.000Z",
    headName: "Administrator Leandra V. Kawada",
    cioName: "Dir. Pablo S. Tungpalan",
    cioPosition: "Director IV — ICT Service",
    cioUnit: "ICT Service",
    focalName: "Ms. Rowena U. Magsaysay",
    focalPosition: "Chief, Planning and Policy Division",
    legalBasis: "Republic Act No. 12021 (Coastal Resilience Act of 2025), establishing the National Coastal Resilience Authority to unify sea-level, storm surge and coastal hazard monitoring, and to operate the national community early warning system for coastal areas.",
    mandate: "The NCRA operates the national coastal hazard monitoring network, produces official storm surge and coastal flood forecasts, runs the community early warning system for 832 coastal municipalities, and maintains the national coastal hazard data infrastructure. It coordinates closely with the national disaster risk reduction council, meteorological services, and local government units.",
    vision: "Zero-surprise coastal hazards: every at-risk barangay warned in time, every decision backed by live coastal data.",
    mission: "To monitor, model and communicate coastal hazards with authoritative, timely, and openly accessible data.",
    networkDescription: "The Authority's monitoring estate includes 340 legacy tide gauges reporting over GSM in batch windows, a vendor-locked buoy telemetry portal, and seventeen regional warning desks that receive data by a mix of e-mail and, in two regions, VHF radio. The central CHIMES platform ingests everything overnight; during Typhoon Barangas (2025) the overnight batch meant surge projections used data eleven hours old. Field stations on small islands share satellite time purchased in weekly blocks.",
    cyberCurrent: 0.52,
    outcomes: [
      { name: "Reduced loss of life and property in coastal hazard events", programs: ["Community Early Warning Program", "Hazard Intelligence Program"] },
      { name: "Authoritative, open national coastal data infrastructure", programs: ["Coastal Digital Twin Program", "Open Tides Data Program"] },
      { name: "Institutionally capable and connected NCRA", programs: ["Operations Modernization Program"] },
    ],
    humanCapital: { plantillaIt: [42, 58], plantillaNonIt: [180, 302], unfilled: [12, 44], contractualIt: [22, 16], contractualNonIt: [60, 88], outsourcedIt: [30, 12], outsourcedNonIt: [8, 6] },
    stakeholders: [
      { name: "Coastal municipalities and barangays", services: [
        { name: "Receipt of official surge and coastal flood warnings", complexity: "Simple", direction: "OUTGOING" },
        { name: "Requests for localized hazard assessments", complexity: "Complex", direction: "INCOMING" },
      ] },
      { name: "National disaster risk reduction council", services: [
        { name: "Provision of real-time hazard situation feeds during events", complexity: "Highly Technical", direction: "OUTGOING" },
      ] },
      { name: "Philippine Disaster Risk Insurance Office", services: [
        { name: "Exposure data exchange for parametric insurance triggers", complexity: "Highly Technical", direction: "OUTGOING" },
      ] },
      { name: "Research community and academia", services: [
        { name: "Access to open coastal hazard datasets (Open Tides)", complexity: "Complex", direction: "OUTGOING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "CHIMES (Coastal Hazard Integration & Monitoring Enterprise System)", concern: "CHIMES ingests sensor data in overnight batches, so warning desks work from projections up to eleven hours old. During Typhoon Barangas the surge height at San Vicente reef was underestimated because the 03:00 reading arrived after the 06:00 briefing had been issued.", strategy: "Replace CHIMES with the streaming AWARE platform (Project SIGWA): real-time ingestion, model runs every ten minutes, and warning products generated in minutes, not shifts." },
      { outcome: 1, program: 2, system: "Community warning dissemination (manual cascades)", concern: "Warnings reach barangays through a cascade of text messages, Facebook posts and, in some areas, bell-ringing protocols; verification of receipt is impossible, and the last full cascade drill logged 2 hours 40 minutes from decision to last barangay.", strategy: "Automate multi-channel dissemination with delivery receipts under the Community Early Warning Program, integrated with AWARE decision triggers." },
      { outcome: 2, program: 3, system: "TIDEWATCH buoy telemetry (vendor portal)", concern: "Buoy telemetry lives in a vendor portal with per-station license fees and no bulk export; researchers cannot access raw observations, and the Authority cannot verify vendor uptime claims independently.", strategy: "Take ownership of telemetry via the WATCHFUL sensor network and publish the archive through Open Tides under an open data license." },
    ],
    systems: [
      { id: "is-chimes", name: "CHIMES — Coastal Hazard Integration & Monitoring Enterprise System", classification: "OPERATIONS", description: "The Authority's core monitoring platform: nightly batch ingestion from 340 gauges, model post-processing and static warning bulletins. Java monolith, single on-premise cluster.", strategy: "IN_HOUSE", platform: "Java EE / Oracle", database: "chimes_prod", storage: "ON_PREMISE", internalUsers: "Monitoring and Warning Bureau, regional desks (~420 staff)", owner: "Monitoring and Warning Bureau", integrated: true },
      { id: "is-tidewatch", name: "TIDEWATCH buoy telemetry portal", classification: "SUPPORT_TO_OPERATIONS", description: "Vendor-operated telemetry for the deep-water buoy array; per-station licensing; no bulk export or API.", strategy: "COTS", platform: "Vendor SaaS", database: "Vendor-hosted", storage: "CLOUD", internalUsers: "Oceanography Division (~60 staff)", owner: "Oceanography Division" },
      { id: "is-lason", name: "LASON — Local Adaptation Studies Online Network", classification: "GENERAL_ADMIN", description: "Drupal archive of local adaptation research and hazard assessments; search is site-wide only and attachments are scanned PDFs.", strategy: "IN_HOUSE", platform: "Drupal 7 / MySQL", database: "lason", storage: "ON_PREMISE", internalUsers: "Planning and Policy Division (~45 staff)", externalUsers: "Academic partners", owner: "Planning and Policy Division" },
    ],
    proposed: [
      { id: "ps-aware", name: "AWARE — Analytics & Warning for At-Risk Environments", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", description: "Cloud-native successor to CHIMES: streaming ingestion from all sensor classes, ten-minute model cycling, automated warning products, and RAPIDE inter-agency exchange.", strategy: "OUTSOURCED", platform: "Kotlin / Kafka / Kubernetes / TimescaleDB", database: "aware_prod", storage: "CLOUD", internalUsers: "Monitoring and Warning Bureau, 17 regional desks (~460 staff)", externalUsers: "Partner agencies via RAPIDE", owner: "ICT Service", status: "FOR_DEVELOPMENT" },
      { id: "ps-twin", name: "Coastal Digital Twin & Open Tides Data Platform", classification: "SUPPORT_TO_OPERATIONS", frontline: false, description: "National coastal hazard data infrastructure: curated sensor archive, digital twin models, and the public Open Tides open-data API.", strategy: "HYBRID", platform: "Python geospatial stack / PostGIS / object storage", database: "twin", storage: "CLOUD", internalUsers: "Research, planning and oceanography teams (~150 staff)", externalUsers: "Academia, civil society, developers", owner: "Planning and Policy Division", status: "FOR_DEVELOPMENT" },
      { id: "ps-lason2", name: "LASON Archive Modernization", classification: "GENERAL_ADMIN", description: "Rebuild of the adaptation studies archive with structured metadata, full-text search and open licensing.", strategy: "IN_HOUSE", platform: "Next.js / PostgreSQL", database: "lason2", storage: "CLOUD", internalUsers: "Planning and Policy Division (~45 staff)", owner: "Planning and Policy Division", status: "FOR_ENHANCEMENT", enhancementDetails: "Drupal 7 end-of-life; content migrated with structured metadata." },
    ],
    projects: [
      {
        id: "p-watchful",
        shortTitle: "Project WATCHFUL",
        title: "Project WATCHFUL — Wide-Area Telemetry & Coastal Hazard Unified Field Layer",
        description: "Expands and takes ownership of the national sensor estate: 140 new real-time tide and oceanographic stations, VSAT backhaul for off-grid sites, coastal CCTV for visual verification, and the retirement of per-station vendor licensing.",
        objectives: "1. Commission 140 new real-time sensor stations by 2028\n2. Bring all off-grid sites onto managed VSAT backhaul\n3. Eliminate per-station vendor telemetry licensing\n4. Achieve 99.5% sensor uptime during typhoon events",
        kind: "infra",
        span: [0, 2],
        target: 420_000_000,
        unit: "ICT Service — Field Engineering Section",
        alignment: ["Public Investment Program", "National Cybersecurity Plan"],
        harmonization: ["National Prioritization", "Scalability and Sustainability"],
        linked: ["ps-aware"],
        fund: "Foreign-assisted projects",
        hw: [
          { item: "Real-time tide and oceanographic sensor stations (buoy and pier-mount)", categoryId: "co-ict-machinery-equipment", qty: 140, unitCost: 1_550_000 },
          { item: "VSAT terminals and installation — off-grid sites", categoryId: "co-communication-equipment", qty: 36, unitCost: 1_800_000 },
          { item: "Coastal verification cameras (pan-tilt, solar)", categoryId: "co-communication-equipment", qty: 30, unitCost: 650_000 },
        ],
        deliverables: [
          "60 stations commissioned; VSAT backhaul for first 18 off-grid sites; telemetry ownership transition started",
          "Cumulative 140 stations; vendor licensing retired; uptime dashboards live",
          "Network at target density; typhoon-season readiness review passed",
        ],
        kpis: [
          { hierarchy: "Output", indicator: "Real-time sensor stations commissioned", baseline: "0", targets: ["60", "140", "140"] },
          { hierarchy: "Intermediate Outcome", indicator: "Sensor data latency (ingest to dashboard)", baseline: "up to 11 hours (batch)", targets: ["< 2 minutes", "< 1 minute", "< 1 minute"] },
          { hierarchy: "Immediate Outcome", indicator: "Sensor network uptime during typhoon events", baseline: "71%", targets: ["95%", "99%", "99.5%"] },
        ],
      },
      {
        id: "p-sigwa",
        shortTitle: "Project SIGWA",
        title: "Project SIGWA — Streaming Integration Gateway for Warning Analytics",
        description: "Builds the AWARE platform: streaming ingestion from all sensor classes, ten-minute model cycling, automated warning products, and the RAPIDE exchange — retiring the overnight CHIMES batch.",
        objectives: "1. AWARE platform live with all sensor classes streaming by 2028\n2. Warning product generation time under 10 minutes end-to-end\n3. Regional desks fully migrated from CHIMES\n4. RAPIDE exchange operational for partner agencies",
        kind: "software",
        span: [0, 1],
        target: 310_000_000,
        unit: "ICT Service",
        alignment: ["E-Government Master Plan", "National Cybersecurity Plan"],
        harmonization: ["Interoperability Framework", "Cross-Agency Collaboration"],
        linked: ["ps-aware"],
        deliverables: [
          "Core platform live; 4 pilot regional desks migrated; first automated warning products issued",
          "All 17 desks migrated; CHIMES decommissioned; RAPIDE exchange operational",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Warning product generation time (event detected to product issued)", baseline: "up to 11 hours", targets: ["30 minutes", "10 minutes", "10 minutes"] },
          { hierarchy: "Output", indicator: "Regional warning desks on AWARE", baseline: "0 of 17", targets: ["4", "17", "17"] },
          { hierarchy: "Immediate Outcome", indicator: "Warning drills: decision-to-last-barangay time", baseline: "2h 40m", targets: ["45 minutes", "20 minutes", "15 minutes"] },
        ],
      },
      {
        id: "p-twin",
        shortTitle: "Coastal Digital Twin",
        title: "Coastal Digital Twin and Open Tides Data Platform",
        description: "National coastal hazard data infrastructure: the curated sensor archive, digital twin model environment, and the public Open Tides open-data API serving researchers and developers.",
        objectives: "1. Publish the historical sensor archive under an open license\n2. Stand up the digital twin modeling environment by 2029\n3. Serve 50 registered applications through the Open Tides API",
        kind: "software",
        span: [1, 2],
        target: 130_000_000,
        unit: "Planning and Policy Division",
        alignment: ["E-Government Master Plan"],
        harmonization: ["Resource Optimization", "Interoperability Framework"],
        linked: ["ps-twin"],
        deliverables: [
          "",
          "Archive published; API v1 live with first 20 registered applications",
          "Digital twin environment operational; 50 registered applications",
        ],
        kpis: [
          { hierarchy: "Output", indicator: "Registered Open Tides API applications", baseline: "0", targets: ["0", "20", "50"] },
          { hierarchy: "Intermediate Outcome", indicator: "Historical coastal datasets available under open license", baseline: "0%", targets: ["0%", "80%", "100%"] },
        ],
      },
      {
        id: "p-lason",
        shortTitle: "LASON Modernization",
        title: "LASON Archive Modernization",
        description: "Rebuilds the end-of-life Drupal 7 adaptation studies archive with structured metadata, full-text search and open licensing before security support lapses.",
        objectives: "1. Migrate all studies with structured metadata by 2027\n2. Restore full-text search\n3. Adopt open data licensing for published research",
        kind: "software",
        span: [0, 0],
        target: 45_000_000,
        unit: "Planning and Policy Division",
        alignment: ["E-Government Master Plan", "National Cybersecurity Plan"],
        harmonization: ["National Prioritization"],
        linked: ["ps-lason2"],
        deliverables: [
          "New archive live; all studies migrated with structured metadata; Drupal 7 retired",
          "",
          "",
        ],
      },
      {
        id: "cx-rapide",
        shortTitle: "RAPIDE lead share",
        title: "RAPIDE — Real-time Analytics Platform for Inter-agency Disaster Events (NCRA lead share)",
        description: "The Authority's lead share of RAPIDE: operating the shared analytics exchange, publishing AWARE hazard feeds, and onboarding partner agencies during typhoon response.",
        objectives: "1. RAPIDE exchange operational before the 2027 typhoon season\n2. Onboard PDRIO and Malinaw city feeds\n3. Joint after-action reviews each season",
        kind: "software",
        span: [0, 2],
        target: 95_000_000,
        unit: "ICT Service",
        alignment: ["E-Government Master Plan", "Program Convergence Budgeting"],
        harmonization: ["Interoperability Framework", "Cross-Agency Collaboration"],
        cross: { programKey: "rapide", lead: true },
        deliverables: [
          "Exchange live; AWARE feeds published; first joint drill with partners",
          "Partner onboarding complete; season after-action review",
          "Program governance handed to the standing working group",
        ],
      },
    ],
    egp: { eGovPay: "no", pnpkiAdoption: 62, ifmis: "yes", recordsMgmt: "yes", pscp: "no" },
    budget: {
      offices: ["ICT Service", "Monitoring and Warning Bureau", "17 Regional Offices"],
      staff: 640,
      opTargets: [55_000_000, 50_000_000, 45_000_000],
      opFeatured: [
        { year: 0, cls: "mooe", item: "Mobile expenses — field engineering and warning officers", categoryId: "mooe-mobile-expenses", qty: 260, unitCost: 12000 },
        { year: 2, cls: "co", item: "Warning desk display walls (regional, 6 sites)", categoryId: "co-ict-machinery-equipment", qty: 6, unitCost: 1_450_000 },
      ],
      continuing: [
        { item: "CHIMES platform support and licenses (until decommission)", categoryId: "mooe-other-general-ict-services", annual: 9_500_000 },
        { item: "Sensor network operations and maintenance", categoryId: "mooe-rm-infra-communications-network", annual: 12_000_000 },
        { item: "Satellite capacity and VSAT service leases", categoryId: "mooe-cable-satellite-radio", annual: 6_800_000 },
        { item: "TIDEWATCH vendor licensing (wind-down)", categoryId: "mooe-ict-software-subscription", annual: 4_200_000 },
      ],
    },
  },

  // ═══ PDRIO — Philippine Disaster Risk Insurance Office (NGA, 2027–2029) ═══
  {
    slug: "pdrio-2027-2029",
    acronym: "PDRIO",
    name: "Philippine Disaster Risk Insurance Office",
    type: "NGA",
    websiteUrl: "https://www.pdrio.gov.ph",
    tagline: "Parametric risk pooling and insurance for LGUs",
    cycle: [2027, 2029],
    scope: "DEPARTMENT_CENTRAL_ONLY",
    planStatus: "submitted",
    createdAt: "2026-01-26T07:40:00.000Z",
    updatedAt: "2026-04-28T09:05:00.000Z",
    headName: "Insurance Commissioner Josefa B. Lardizabal",
    cioName: "Dir. Anselmo R. Quijano",
    cioPosition: "Director III — ICT Division",
    cioUnit: "ICT Division",
    focalName: "Ms. Perla T. Gatchalian",
    focalPosition: "Chief, Product Development Division",
    legalBasis: "Republic Act No. 11954 (Local Government Disaster Risk Insurance Act of 2024), creating the Philippine Disaster Risk Insurance Office to design, price and administer parametric insurance pools for provinces, cities and municipalities.",
    mandate: "The PDRIO designs parametric insurance products for LGU assets, pools and prices risk across provinces, administers payouts triggered by official hazard data, and advises on risk transfer for public infrastructure. It maintains exposure models for roads, buildings, schools and hospitals nationwide.",
    vision: "Local governments that recover from disasters in weeks, not years, because risk was transferred before the storm.",
    mission: "To pool, price and pay disaster risk for local governments with actuarially sound, transparent and fast-settling parametric products.",
    networkDescription: "The Office operates from one central building with a well-maintained but aging network. The PRISM policy mainframe sits in a glass-walled machine room that features in visitor tours; its batch windows dictate office hours for policy servicing. Actuarial models run on one licensed workstation; the modeling team queues for it during pricing season. A single cloud tenancy hosts the public product pages.",
    cyberCurrent: 0.55,
    outcomes: [
      { name: "Faster, fairer parametric payouts to LGUs", programs: ["Parametric Payout Program"] },
      { name: "Actuarially sound national risk data", programs: ["Risk Data Program"] },
      { name: "Capable and secure PDRIO operations", programs: ["Operations Strengthening Program"] },
    ],
    humanCapital: { plantillaIt: [11, 14], plantillaNonIt: [58, 96], unfilled: [4, 17], contractualIt: [6, 5], contractualNonIt: [14, 24], outsourcedIt: [8, 3], outsourcedNonIt: [2, 2] },
    stakeholders: [
      { name: "Provinces, cities and municipalities", services: [
        { name: "Parametric policy enrolment and payout claims", complexity: "Complex", direction: "INCOMING" },
        { name: "Risk advisory and coverage statements", complexity: "Complex", direction: "OUTGOING" },
      ] },
      { name: "National Coastal Resilience Authority", services: [
        { name: "Trigger data exchange for parametric products (RAPIDE)", complexity: "Highly Technical", direction: "INCOMING" },
      ] },
      { name: "Insurance Commission and reinsurance partners", services: [
        { name: "Submission of pool accounts and treaty reports", complexity: "Highly Technical", direction: "OUTGOING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "PRISM (Policy Registry & Insurance Servicing Mainframe)", concern: "Payout computation runs as an overnight batch on PRISM; after Typhoon Barangas, nineteen LGUs waited 18 days for payouts because trigger data arrived as scanned documents that had to be re-keyed before the batch could price them.", strategy: "Replace manual trigger intake with automated hazard-data feeds (RAPIDE) and a modern claims platform under Project UNDERWRITE, targeting payout within 7 days of trigger." },
      { outcome: 2, program: 2, system: "Exposure models (single workstation)", concern: "National exposure models are maintained on one licensed workstation; two pricing seasons have been delayed by queueing, and no one else can run the full model stack.", strategy: "Migrate modeling to a governed geospatial data warehouse with elastic compute and versioned model runs." },
    ],
    systems: [
      { id: "is-prism", name: "PRISM — Policy Registry & Insurance Servicing Mainframe", classification: "OPERATIONS", description: "COBOL-based policy administration covering enrolment, premium billing and payout computation in overnight batches. Servicing windows are planned around batch schedules.", strategy: "IN_HOUSE", platform: "COBOL / DB2", database: "prism_prod", storage: "ON_PREMISE", internalUsers: "Underwriting, finance and claims (~210 staff)", owner: "Underwriting and Actuarial Division", integrated: true, pia: true },
      { id: "is-productsite", name: "Parametric product information site", classification: "SUPPORT_TO_OPERATIONS", frontline: true, accessType: "ONLINE", url: "https://products.pdrio.gov.ph", description: "Public site describing available parametric coverages; no enrolment or claims intake.", strategy: "OUTSOURCED", platform: "Static site (managed hosting)", database: "N/A", storage: "CLOUD", internalUsers: "Product Development (~15 staff)", owner: "Product Development Division" },
    ],
    proposed: [
      { id: "ps-underwrite", name: "UNDERWRITE Platform", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", description: "Modern policy and claims platform for parametric products: LGU self-service enrolment, automated trigger ingestion, and straight-through payout computation.", strategy: "OUTSOURCED", platform: "Java / Kafka / PostgreSQL", database: "underwrite_prod", storage: "CLOUD", internalUsers: "Underwriting, actuarial and claims (~230 staff)", externalUsers: "LGU policy focal persons (~1,640)", owner: "Underwriting and Actuarial Division", pia: true, status: "FOR_DEVELOPMENT" },
      { id: "ps-geowarehouse", name: "Geospatial Risk Data Warehouse", classification: "SUPPORT_TO_OPERATIONS", description: "Governed warehouse of exposure, hazard and claims data with versioned model runs and elastic actuarial compute.", strategy: "HYBRID", platform: "PostGIS / object storage / notebooks", database: "risk_wh", storage: "CLOUD", internalUsers: "Actuarial and research teams (~60 staff)", owner: "Risk Management Division", status: "FOR_DEVELOPMENT" },
      { id: "ps-hris-pdrio", name: "PDRIO Human Resource Information System", classification: "GENERAL_ADMIN", description: "Cloud HR and payroll system replacing spreadsheet personnel records and the shared-drive 201 files.", strategy: "OUTSOURCED", platform: "Government-certified HR SaaS", database: "hris_pdrio", storage: "CLOUD", internalUsers: "HR and Finance (~40 staff)", owner: "Human Resources Unit", status: "FOR_DEVELOPMENT" },
    ],
    projects: [
      {
        id: "p-underwrite",
        shortTitle: "Project UNDERWRITE",
        title: "Project UNDERWRITE — Unified Data Environment for Risk-weighted Writing, Rating, Actuarics & Transaction Exchange",
        description: "Builds the modern policy and claims platform: LGU self-service enrolment, automated trigger ingestion from RAPIDE, straight-through payout computation, and PRISM decommissioning.",
        objectives: "1. LGU self-service enrolment live by 2028\n2. Automated trigger ingestion for all covered perils\n3. Median payout time from trigger to release: 7 days\n4. PRISM decommissioned by end of 2028",
        kind: "software",
        span: [0, 1],
        target: 290_000_000,
        unit: "ICT Division",
        alignment: ["E-Government Master Plan", "National Cybersecurity Plan"],
        harmonization: ["National Prioritization", "Interoperability Framework"],
        linked: ["ps-underwrite"],
        deliverables: [
          "Core platform live; 3 pilot provinces enrolled; automated windstorm triggers",
          "All perils automated; national enrolment wave; PRISM decommissioned",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Median payout time (trigger to release)", baseline: "18 days", targets: ["12 days", "7 days", "7 days"] },
          { hierarchy: "Output", indicator: "LGUs on self-service enrolment", baseline: "0", targets: ["120", "1,640", "1,640"] },
          { hierarchy: "Immediate Outcome", indicator: "Claims requiring manual re-keying of trigger data", baseline: "100%", targets: ["40%", "0%", "0%"] },
        ],
      },
      {
        id: "p-geo",
        shortTitle: "Geospatial Risk Warehouse",
        title: "Geospatial Risk Data Warehouse",
        description: "Consolidates exposure, hazard and claims data into a governed warehouse with versioned model runs, ending single-workstation model dependency.",
        objectives: "1. Warehouse live with national exposure data by 2027\n2. Versioned, reviewable model runs\n3. Elastic compute for pricing season",
        kind: "software",
        span: [0, 2],
        target: 85_000_000,
        unit: "Risk Management Division",
        alignment: ["Public Investment Program"],
        harmonization: ["Resource Optimization", "Scalability and Sustainability"],
        linked: ["ps-geowarehouse"],
        deliverables: [
          "Warehouse live; exposure data migrated; first versioned model run",
          "Claims and hazard data integrated; peer review workflow live",
          "Elastic pricing-season compute validated; workstation dependency retired",
        ],
      },
      {
        id: "cx-rapide",
        shortTitle: "RAPIDE participation",
        title: "RAPIDE — Real-time Analytics Platform for Inter-agency Disaster Events (PDRIO share)",
        description: "The Office's share of RAPIDE: consuming NCRA hazard feeds as automated payout triggers and contributing exposure aggregates back to the exchange.",
        objectives: "1. Automated trigger feeds for windstorm and surge perils by 2027\n2. Exposure aggregates published to partner agencies\n3. Joint payout drills each season",
        kind: "software",
        span: [0, 1],
        target: 40_000_000,
        unit: "ICT Division",
        alignment: ["Program Convergence Budgeting", "E-Government Master Plan"],
        harmonization: ["Interoperability Framework", "Cross-Agency Collaboration"],
        cross: { programKey: "rapide" },
        deliverables: [
          "Windstorm trigger feed live; first automated test payout executed in drill",
          "Surge trigger feed live; exposure aggregates published",
          "",
        ],
      },
    ],
    egp: { eGovPay: "no", pnpkiAdoption: 47, ifmis: "yes", recordsMgmt: "yes", pscp: "no" },
    budget: {
      offices: ["ICT Division", "Underwriting and Actuarial Division", "Finance Division"],
      staff: 212,
      opTargets: [12_000_000, 10_000_000, 9_000_000],
      continuing: [
        { item: "PRISM mainframe support (until decommission)", categoryId: "mooe-other-general-ict-services", annual: 4_800_000 },
        { item: "Reinsurance market data subscriptions", categoryId: "mooe-ict-software-subscription", annual: 2_600_000 },
        { item: "Records management services (policy archives)", categoryId: "mooe-professional-services", annual: 900_000 },
      ],
    },
  },

  // ═══ MFSC — Metro Ferry Systems Corporation (GOCC, 2027–2029) — HERO ═══
  {
    slug: "mfsc-2027-2029",
    acronym: "MFSC",
    name: "Metro Ferry Systems Corporation",
    type: "GOCC",
    websiteUrl: "https://www.mfsc.gov.ph",
    tagline: "Ticketing and fleet intelligence for the metro ferry network",
    hero: true,
    cycle: [2027, 2029],
    scope: "AGENCY_WIDE",
    planStatus: "for_review",
    createdAt: "2026-02-10T05:00:00.000Z",
    updatedAt: "2026-10-06T08:35:00.000Z",
    headName: "General Manager Fernando K. Limjoco",
    cioName: "VP for ICT Ma. Concepcion D. Ybañez",
    cioPosition: "Vice President for ICT",
    cioUnit: "ICT Department",
    focalName: "Mr. Dennis O. Kabigting",
    focalPosition: "Department Manager, Corporate Planning",
    legalBasis: "Executive Order No. 914 (s. 2023), incorporating the Metro Ferry Systems Corporation under the Office of the President to operate the metro ferry network piers, vessels and fare systems as one integrated public transport service.",
    mandate: "MFSC operates 48 passenger vessels across 14 piers on the metro ferry network: fare collection, pier maintenance, fleet operations, safety compliance, and the ferry commons program that keeps fares integrated with other metro transport. It earns fare and retail income and receives corporate subsidies for service obligations.",
    vision: "A ferry network people can trust with their commute: tap-and-go boarding, live arrivals, and vessels that sail on schedule.",
    mission: "To run safe, punctual, and financially sustainable ferry services with modern ticketing and fleet intelligence.",
    networkDescription: "The fare collection system is a 2014 vendor-locked account-based stack whose license fees grow 9% a year; validators at older piers run firmware from 2018 and fail card reads roughly once every 400 taps, which staff resolve by waving passengers through. Pier connectivity is a patchwork of consumer broadband; two piers run on the mall Wi-Fi next door. Fleet maintenance planning happens on a whiteboard photographed each Monday.",
    cyberCurrent: 0.45,
    outcomes: [
      { name: "Seamless, trusted fare collection", programs: ["Account-Based Ticketing Program"] },
      { name: "Reliable and punctual ferry operations", programs: ["Fleet Intelligence Program"] },
      { name: "Financially sustainable operations", programs: ["Revenue Stewardship Program"] },
    ],
    humanCapital: { plantillaIt: [18, 22], plantillaNonIt: [190, 285], unfilled: [6, 31], contractualIt: [10, 8], contractualNonIt: [55, 74], outsourcedIt: [12, 5], outsourcedNonIt: [10, 8] },
    stakeholders: [
      { name: "Daily commuters and ferry passengers", services: [
        { name: "Ticket purchase, boarding and fare disputes", complexity: "Simple", direction: "INCOMING" },
        { name: "Service advisories and arrival information", complexity: "Simple", direction: "OUTGOING" },
      ] },
      { name: "Metro transport councils", services: [
        { name: "Fare integration and commons settlement reporting", complexity: "Complex", direction: "OUTGOING" },
      ] },
      { name: "Maritime safety regulators", services: [
        { name: "Vessel safety compliance and incident reporting", complexity: "Highly Technical", direction: "OUTGOING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "FERRYCARD AFC (automated fare collection)", concern: "The 2014 vendor-locked AFC charges license fees rising 9% yearly, cannot support account-based ticketing or QR, and its reconciliation runs T+3 — conductors cash up against estimates. One in 400 card taps fails at legacy validators.", strategy: "Deploy an open, account-based ticketing stack with mobile QR and instant settlement (Project BIYAHE), and retire per-transaction licensing." },
      { outcome: 2, program: 2, system: "Fleet maintenance planning (whiteboard)", concern: "Vessel maintenance is planned from a photographed whiteboard; two avoidable engine failures in 2025 were traced to parts that were on order but not visible to the planning meeting.", strategy: "Instrument the fleet with telemetry and deploy fleet health analytics (Project DALOY) so parts, hours and defects are planned from data." },
      { outcome: 3, program: 3, system: "Pier connectivity (patchwork broadband)", concern: "Pier POS and validators share consumer broadband; when the mall Wi-Fi blinks, two piers drop to offline mode and reconcile next day — the source of most cash-up variances.", strategy: "Give every pier resilient dedicated connectivity with automatic failover (Pier Network Connectivity project)." },
    ],
    systems: [
      { id: "is-ferrycard", name: "FERRYCARD AFC", classification: "OPERATIONS", frontline: true, accessType: "HYBRID", description: "Vendor-locked card-based fare collection across 14 piers and 48 vessels; T+3 reconciliation; per-transaction licensing.", strategy: "COTS", platform: "Vendor stack (2014)", database: "Vendor-hosted", storage: "ON_PREMISE", internalUsers: "Operations, finance (~300 staff)", externalUsers: "Passengers (~210,000 stored cards)", owner: "ICT Department", integrated: true, pia: true },
      { id: "is-fleetworks", name: "FLEETWORKS maintenance records", classification: "SUPPORT_TO_OPERATIONS", description: "Access-based maintenance logging plus the Monday whiteboard; parts on order are not visible to planners.", strategy: "IN_HOUSE", platform: "Microsoft Access / shared drive", database: "fleetworks.mdb", storage: "ON_PREMISE", internalUsers: "Fleet Maintenance (~140 staff)", owner: "Fleet Operations Department" },
      { id: "is-crewboard", name: "Crew scheduling board", classification: "GENERAL_ADMIN", description: "Printed rosters annotated by hand; crew hours compliance is verified manually at month-end.", strategy: "IN_HOUSE", platform: "Paper / spreadsheet", database: "N/A", storage: "ON_PREMISE", internalUsers: "Operations (~60 staff)", owner: "Operations Division", pia: true },
    ],
    proposed: [
      { id: "ps-biyahe", name: "BIYAHE — Account-Based Ticketing & Handy App", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", description: "Open account-based ticketing: card, QR and mobile app fares with instant settlement and ferry-commons interoperability.", strategy: "OUTSOURCED", platform: "Kotlin / Node.js / Kafka", database: "biyahe_prod", storage: "CLOUD", internalUsers: "Operations, finance (~320 staff)", externalUsers: "Passengers (~260,000 projected accounts)", owner: "ICT Department", pia: true, status: "FOR_DEVELOPMENT" },
      { id: "ps-daloy", name: "DALOY — Fleet Health & Operations Intelligence", classification: "SUPPORT_TO_OPERATIONS", description: "Telemetry-based fleet health monitoring, parts planning and punctuality analytics across all vessels and piers.", strategy: "HYBRID", platform: "Python / TimescaleDB / Grafana", database: "daloy_prod", storage: "CLOUD", internalUsers: "Fleet Operations and Maintenance (~200 staff)", owner: "Fleet Operations Department", status: "FOR_DEVELOPMENT" },
      { id: "ps-crewhr", name: "Crew HR and Scheduling System (CREWHR)", classification: "GENERAL_ADMIN", description: "Crew records, hours compliance and digital rosters replacing the printed scheduling board photographed every Monday.", strategy: "OUTSOURCED", platform: "Flutter / PostgreSQL", database: "crewhr", storage: "CLOUD", internalUsers: "Operations (~60 staff)", owner: "Operations Division", pia: true, status: "FOR_DEVELOPMENT" },
    ],
    projects: [
      {
        id: "p-biyahe",
        shortTitle: "Project BIYAHE",
        title: "Project BIYAHE — Account-Based Ticketing & Handy App",
        description: "Replaces the vendor-locked FERRYCARD AFC with an open account-based stack: card, QR and mobile app fares, instant settlement, and ferry-commons interoperability — ending per-transaction licensing.",
        objectives: "1. Account-based ticketing live on all 14 piers by 2028\n2. Mobile QR fares with instant settlement\n3. Cut cash-up variance by 90%\n4. Retire per-transaction vendor licensing",
        kind: "software",
        span: [0, 1],
        target: 240_000_000,
        unit: "ICT Department",
        alignment: ["E-Government Master Plan"],
        harmonization: ["Interoperability Framework", "Resource Optimization"],
        linked: ["ps-biyahe"],
        hw: [
          { item: "Account-based ticket validators (pier gates and vessel poles)", categoryId: "co-ict-machinery-equipment", qty: 120, unitCost: 145000 },
          { item: "Ticket printers and POS terminals (piers)", categoryId: "co-printing-equipment", qty: 40, unitCost: 22000 },
        ],
        deliverables: [
          "Core account platform live; 6 pilot piers migrated; mobile app in open beta",
          "All 14 piers migrated; instant settlement live; FERRYCARD AFC retired",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Fare reconciliation window", baseline: "T+3", targets: ["T+1", "instant", "instant"] },
          { hierarchy: "Output", indicator: "Piers on account-based ticketing", baseline: "0 of 14", targets: ["6", "14", "14"] },
          { hierarchy: "Immediate Outcome", indicator: "Monthly cash-up variance (% of gross fares)", baseline: "1.8%", targets: ["0.6%", "0.2%", "0.2%"] },
        ],
      },
      {
        id: "p-daloy",
        shortTitle: "Project DALOY",
        title: "Project DALOY — Fleet Health & Operations Intelligence",
        description: "Instruments all 48 vessels with telemetry and deploys fleet health analytics: engine hours, defects, parts planning and punctuality, replacing the Monday whiteboard.",
        objectives: "1. Telemetry on all 48 vessels by 2028\n2. Parts planning driven by live defect and hours data\n3. Raise schedule adherence from 82% to 95%",
        kind: "hardware",
        span: [0, 2],
        target: 150_000_000,
        unit: "Fleet Operations Department",
        alignment: ["Public Investment Program", "National Cybersecurity Plan"],
        harmonization: ["Resource Optimization", "Scalability and Sustainability"],
        linked: ["ps-daloy"],
        fund: "Other Income Generating Sources",
        hw: [
          { item: "Vessel telemetry units (engine, GPS, fuel, cabin)", categoryId: "co-communication-equipment", qty: 48, unitCost: 185000 },
          { item: "Bridge data loggers and displays", categoryId: "co-ict-machinery-equipment", qty: 48, unitCost: 95000 },
          { item: "Pier edge servers (analytics nodes)", categoryId: "co-ict-machinery-equipment", qty: 14, unitCost: 260000 },
        ],
        deliverables: [
          "24 vessels instrumented; fleet dashboard live; parts module piloted",
          "All 48 vessels instrumented; whiteboard retired; punctuality analytics live",
          "Predictive maintenance models tuned on two seasons of data",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Schedule adherence (departures within 5 minutes)", baseline: "82%", targets: ["88%", "93%", "95%"] },
          { hierarchy: "Output", indicator: "Vessels with live telemetry", baseline: "0 of 48", targets: ["24", "48", "48"] },
          { hierarchy: "Immediate Outcome", indicator: "Avoidable mechanical cancellations per quarter", baseline: "11", targets: ["6", "3", "2"] },
        ],
      },
      {
        id: "p-pier",
        shortTitle: "Pier Network Connectivity",
        title: "Pier Network Connectivity and Passenger Information",
        description: "Gives every pier resilient dedicated connectivity with automatic failover, plus passenger information displays and free passenger Wi-Fi funded under the service obligation.",
        objectives: "1. Dedicated resilient links at all 14 piers by 2027\n2. Passenger information displays at all piers\n3. Eliminate offline-mode cash-up variances from connectivity",
        kind: "infra",
        span: [0, 0],
        target: 70_000_000,
        unit: "ICT Department",
        alignment: ["Public Investment Program"],
        harmonization: ["National Prioritization"],
        hw: [
          { item: "Pier fiber builds and resilient last-mile (14 piers)", categoryId: "co-infrastructure-communications-network", qty: 14, unitCost: 2_900_000 },
          { item: "Pier edge firewalls and secure gateways (replaces legacy fleet)", categoryId: "co-ict-machinery-equipment", qty: 9, unitCost: 650_000 },
          { item: "Marine VHF radios (fleet communications refresh)", categoryId: "co-communication-equipment", qty: 96, unitCost: 45000 },
        ],
        deliverables: [
          "All 14 piers on dedicated resilient links; passenger displays installed; failover tested",
          "",
          "",
        ],
      },
      {
        id: "p-hula",
        shortTitle: "Project HULA",
        title: "Project HULA — Fleet AI Models and On-Premise Inference Cluster",
        description: "Trains and serves DALOY's predictive-maintenance and fare-demand models on a Corporation-owned GPU cluster sited at the operations center: commuter movement and vessel telemetry stay on-premise by policy, with model serving integrated into the fleet health platform.",
        objectives: "1. GPU inference cluster commissioned at the operations center by 2028\n2. Predictive maintenance and fare-demand models in production by 2029\n3. Model training and serving entirely on Corporation-owned infrastructure",
        kind: "hardware",
        span: [1, 1],
        target: 105_000_000,
        unit: "ICT Department",
        alignment: ["Public Investment Program", "National Cybersecurity Plan"],
        harmonization: ["Scalability and Sustainability", "Resource Optimization"],
        linked: ["ps-daloy"],
        fund: "Other Income Generating Sources",
        hw: [
          { item: "GPU inference servers (8-accelerator racks, operations center)", categoryId: "co-ict-machinery-equipment", qty: 3, unitCost: 9_800_000 },
          { item: "Model training nodes (4-accelerator, research workloads)", categoryId: "co-ict-machinery-equipment", qty: 2, unitCost: 6_500_000 },
          { item: "High-performance storage array for telemetry and model artifacts", categoryId: "co-ict-machinery-equipment", qty: 1, unitCost: 7_200_000 },
        ],
        deliverables: [
          "",
          "Cluster commissioned; two predictive-maintenance models and the fare-demand pilot in production",
          "Five models in production; fleet dashboard fully model-driven",
        ],
        kpis: [
          { hierarchy: "Output", indicator: "AI models in production (maintenance, demand, safety)", baseline: "0", targets: ["2", "5", "5"] },
          { hierarchy: "Intermediate Outcome", indicator: "Unplanned engine teardowns flagged at least 2 weeks ahead", baseline: "0%", targets: ["40%", "75%", "75%"] },
          { hierarchy: "Immediate Outcome", indicator: "Fare-demand forecast error (morning peak, MAPE)", baseline: "18%", targets: ["12%", "9%", "9%"] },
        ],
      },
    ],
    egp: { eGovPay: "yes", pnpkiAdoption: 58, ifmis: "no", recordsMgmt: "no", pscp: "no" },
    budget: {
      offices: ["ICT Department", "Fleet Operations Department", "Pier Administration Office"],
      staff: 382,
      opTargets: [22_000_000, 20_000_000, 18_000_000],
      opFeatured: [
        { year: 0, cls: "mooe", item: "Mobile expenses — operations and maintenance crews", categoryId: "mooe-mobile-expenses", qty: 340, unitCost: 10800 },
        { year: 1, cls: "mooe", item: "Landline and pier hotline subscriptions", categoryId: "mooe-landline-expenses", qty: 1, unitCost: 620000 },
      ],
      continuing: [
        { item: "FERRYCARD AFC vendor licensing and settlement (until retirement)", categoryId: "mooe-other-general-ict-services", annual: 28_000_000, fund: "Other Income Generating Sources" },
        { item: "Vessel broadband and marine communications", categoryId: "mooe-cable-satellite-radio", annual: 6_500_000 },
        { item: "AI inference cluster power, cooling and hardware support", categoryId: "mooe-data-center-services", annual: 3_200_000, fund: "Other Income Generating Sources" },
        { item: "Fare media production and card stock", categoryId: "mooe-semi-expendable-ict-equipment", annual: 1_800_000, fund: "Other Income Generating Sources" },
      ],
    },
  },

  // ═══ Malinaw — City Government of Malinaw (LGU, 2027–2029) ═══
  {
    slug: "malinaw-2027-2029",
    acronym: "MAL",
    name: "City Government of Malinaw",
    type: "LGU",
    websiteUrl: "https://www.malinawcity.gov.ph",
    tagline: "One-city, one-click government services",
    cycle: [2027, 2029],
    scope: "LGU_SCOPE",
    planStatus: "submitted",
    createdAt: "2026-02-02T01:25:00.000Z",
    updatedAt: "2026-04-30T07:55:00.000Z",
    headName: "City Mayor Hon. Artemio B. Villanueva Jr.",
    cioName: "Engr. Liza K. Panganiban",
    cioPosition: "City ICT Officer",
    cioUnit: "City ICT Office",
    focalName: "Mr. Efren D. Salonga",
    focalPosition: "City Planning and Development Coordinator",
    legalBasis: "Republic Act No. 11877, converting the Municipality of Malinaw into a component city, with full corporate powers for local governance and service delivery.",
    mandate: "The City Government of Malinaw delivers local governance services for 42 barangays: business permits and licensing, real property taxation, civil registry, health services, social welfare and disaster response, supported by a city hall workforce of roughly 600 personnel.",
    vision: "A city where every government service that can be online is online — and works.",
    mission: "To deliver fast, transparent city services through integrated digital systems that citizens can use from any barangay.",
    networkDescription: "City hall runs a single flat network shared by admin offices and the public Wi-Fi; the business permit system is hosted by its vendor with data exports available on request (and a fee); real property tax records live in an Access database backed up to the treasurer's personal external drive. Of 42 barangays, 19 have no city-provided connectivity and use councilors' personal hotspots for submissions.",
    cyberCurrent: 0.34,
    outcomes: [
      { name: "Faster, more transparent business and property transactions", programs: ["One-Stop Digital Services Program"] },
      { name: "Connected barangays", programs: ["Barangay Connectivity Program"] },
      { name: "Disaster-ready city operations", programs: ["City Resilience Program"] },
    ],
    humanCapital: { plantillaIt: [5, 7], plantillaNonIt: [110, 208], unfilled: [2, 23], contractualIt: [3, 2], contractualNonIt: [28, 45], outsourcedIt: [4, 1], outsourcedNonIt: [6, 4] },
    stakeholders: [
      { name: "Business owners and taxpayers", services: [
        { name: "Business permit application and renewal", complexity: "Complex", direction: "INCOMING" },
        { name: "Real property tax payment and records", complexity: "Simple", direction: "INCOMING" },
      ] },
      { name: "Barangay governments", services: [
        { name: "Submission of barangay reports and requests", complexity: "Simple", direction: "INCOMING" },
        { name: "City-to-barangay advisories and bulletins", complexity: "Simple", direction: "OUTGOING" },
      ] },
      { name: "Neighboring LGUs (San Prospero)", services: [
        { name: "Cross-border permit and inspection verification (PXNet)", complexity: "Complex", direction: "OUTGOING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "eBPLS (vendor-hosted business permits)", concern: "The vendor-hosted permit system's data exports cost extra and arrive as PDFs; the city cannot do its own analytics on its own permit data, and renewals queue twice — once to file, once to pay.", strategy: "Bring permits into the city-owned One-Stop portal with integrated payment and open data exports." },
      { outcome: 2, program: 2, system: "Barangay reporting (personal hotspots)", concern: "Nineteen barangays submit reports through councilors' personal hotspots; during the last flood, three barangays' damage reports arrived two days late because the hotspots were in the flood.", strategy: "Deploy a barangay mesh connectivity network with solar-powered nodes and city-managed backhaul." },
      { outcome: 3, program: 3, system: "City incident management (group chat)", concern: "Disaster response coordination runs on a group chat; situation reports are screenshots, and the RAPIDE hazard feed the city is entitled to has never been integrated.", strategy: "Stand up a city incident dashboard consuming RAPIDE feeds and barangay mesh reports." },
    ],
    systems: [
      { id: "is-ebpls", name: "eBPLS — Business Permits and Licensing System", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", url: "https://ebpls.malinawcity.gov.ph", description: "Vendor-hosted permit processing; data exports billable; no API; renewals require two visits.", strategy: "COTS", platform: "Vendor SaaS", database: "Vendor-hosted", storage: "CLOUD", internalUsers: "BPLO (~35 staff)", externalUsers: "Business owners (~8,900)", owner: "Business Permits and Licensing Office", pia: true },
      { id: "is-rpt", name: "Real Property Tax records (Access)", classification: "GENERAL_ADMIN", description: "Access database of property records since 2009, backed up to the treasurer's personal external drive.", strategy: "IN_HOUSE", platform: "Microsoft Access", database: "rpt.mdb", storage: "ON_PREMISE", internalUsers: "City Treasurer's Office (~25 staff)", owner: "City Treasurer's Office", pia: true },
      { id: "is-civilreg", name: "Civil Registry System", classification: "OPERATIONS", frontline: true, accessType: "ON_PREMISE", description: "National civil registry front-end operated by the city registry; offline encoding, batch upload.", strategy: "COTS", platform: "National system client", database: "National", storage: "ON_PREMISE", internalUsers: "City Civil Registry (~14 staff)", owner: "Office of the City Civil Registrar", pia: true },
    ],
    proposed: [
      { id: "ps-portal", name: "Malinaw One-Stop Digital Services Portal", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", description: "City-owned portal integrating business permits, property tax payments, civil registry requests and barangay services with online payment.", strategy: "OUTSOURCED", platform: "Next.js / PostgreSQL", database: "onestop_prod", storage: "CLOUD", internalUsers: "All frontline offices (~120 staff)", externalUsers: "Residents and businesses (~120,000)", owner: "City ICT Office", pia: true, status: "FOR_DEVELOPMENT" },
      { id: "ps-incident", name: "City Incident Dashboard", classification: "SUPPORT_TO_OPERATIONS", description: "Disaster operations dashboard consuming RAPIDE hazard feeds, barangay mesh reports and city asset status.", strategy: "OPEN_SOURCE", platform: "Grafana / PostGIS", database: "incident", storage: "CLOUD", internalUsers: "City DRRMO, command group (~40 staff)", owner: "City DRRMO", status: "FOR_DEVELOPMENT" },
    ],
    projects: [
      {
        id: "p-portal",
        shortTitle: "One-Stop Portal",
        title: "Malinaw One-Stop Digital Services Portal",
        description: "Builds the city-owned services portal: permits, property tax payments, civil registry requests and barangay services with integrated online payment — ending the two-queue renewal and the billable data export.",
        objectives: "1. Portal live with permits and property tax by 2028\n2. Online payment integrated for all covered services\n3. City-owned data with open exports\n4. Cut average renewal processing from 3 visits to 0",
        kind: "software",
        span: [0, 1],
        target: 28_000_000,
        unit: "City ICT Office",
        alignment: ["E-Government Master Plan"],
        harmonization: ["National Prioritization", "Interoperability Framework"],
        linked: ["ps-portal"],
        fund: "Locally funded",
        deliverables: [
          "Permits and property tax modules live with online payment; first paperless renewals",
          "Civil registry requests and barangay services onboarded; open data exports live",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Average visits per permit renewal", baseline: "3", targets: ["1", "0 (online)", "0 (online)"] },
          { hierarchy: "Output", indicator: "City services available on the portal", baseline: "0", targets: ["5", "12", "15"] },
        ],
      },
      {
        id: "p-mesh",
        shortTitle: "Barangay Connectivity Mesh",
        title: "Barangay Connectivity Mesh",
        description: "Deploys solar-powered mesh nodes across the 19 unconnected barangays with city-managed backhaul, carrying reports, advisories and incident data.",
        objectives: "1. Connect all 19 unconnected barangays by 2027\n2. Carry barangay reporting and advisories\n3. Withstand flood-season power and link outages",
        kind: "infra",
        span: [0, 0],
        target: 12_000_000,
        unit: "City ICT Office",
        alignment: ["Public Investment Program"],
        harmonization: ["National Prioritization", "Scalability and Sustainability"],
        hw: [
          { item: "Solar-powered barangay mesh nodes", categoryId: "co-communication-equipment", qty: 42, unitCost: 145000 },
          { item: "Backhaul towers and links (city-managed)", categoryId: "co-infrastructure-communications-network", qty: 8, unitCost: 480000 },
        ],
        deliverables: [
          "All 42 barangays connected; mesh carrying reports and advisories; flood-season failover tested",
          "",
          "",
        ],
      },
      {
        id: "cx-rapide",
        shortTitle: "RAPIDE participation",
        title: "RAPIDE — Real-time Analytics Platform for Inter-agency Disaster Events (Malinaw share)",
        description: "The city's share of RAPIDE: consuming coastal hazard feeds into the city incident dashboard and contributing barangay incident reports to the exchange.",
        objectives: "1. City incident dashboard consuming RAPIDE feeds by 2028\n2. Barangay incident reports flowing to the exchange\n3. Joint drills with NCRA and PDRIO",
        kind: "software",
        span: [0, 1],
        target: 6_000_000,
        unit: "City DRRMO",
        alignment: ["E-Government Master Plan", "Program Convergence Budgeting"],
        harmonization: ["Interoperability Framework", "Cross-Agency Collaboration"],
        linked: ["ps-incident"],
        cross: { programKey: "rapide" },
        deliverables: [
          "Dashboard live consuming surge and windstorm feeds; first joint drill",
          "Barangay reports flowing to the exchange; season after-action review",
          "",
        ],
      },
      {
        id: "cx-pxnet",
        shortTitle: "PXNet lead share",
        title: "Permits Exchange Network (PXNet) — Malinaw lead share",
        description: "The city's lead share of PXNet: operating the inter-LGU verification exchange so businesses relocating between member LGUs do not re-submit records both cities hold.",
        objectives: "1. PXNet verification live with San Prospero by 2028\n2. Shared inspection record schema\n3. Zero re-submission for relocating businesses between members",
        kind: "software",
        span: [0, 1],
        target: 9_000_000,
        unit: "Business Permits and Licensing Office",
        alignment: ["E-Government Master Plan", "Program Convergence Budgeting"],
        harmonization: ["Interoperability Framework", "Cross-Agency Collaboration"],
        cross: { programKey: "pxnet", lead: true },
        deliverables: [
          "Exchange live; permit and inspection verification with San Prospero operating",
          "Schema v2 (health and safety inspections); onboarding pack for next LGU",
          "",
        ],
      },
    ],
    egp: { eGovPay: "yes", pnpkiAdoption: 29, ifmis: "yes", recordsMgmt: "no", pscp: "no", elgu: "yes", elguUrl: "https://ebpls.malinawcity.gov.ph/elgu" },
    budget: {
      offices: ["City ICT Office", "Business Permits and Licensing Office", "City Treasurer's Office"],
      staff: 86,
      opTargets: [2_500_000, 2_200_000, 2_000_000],
      opFeatured: [
        { year: 0, cls: "mooe", item: "Semi-expendable tablets for field assessors and inspectors", categoryId: "mooe-semi-expendable-ict-equipment", qty: 25, unitCost: 18000 },
        { year: 1, cls: "co", item: "Networked multifunction printers (frontline offices)", categoryId: "co-printing-equipment", qty: 2, unitCost: 68000 },
      ],
      continuing: [
        { item: "eBPLS vendor subscription (transition period)", categoryId: "mooe-other-general-ict-services", annual: 1_900_000 },
        { item: "City portal hosting and SMS gateway", categoryId: "mooe-web-hosting", annual: 450_000 },
        { item: "Mesh node repairs and maintenance", categoryId: "mooe-rm-communication-equipment", annual: 350_000 },
        { item: "Barcode scanner servicing (assessors)", categoryId: "mooe-rm-semi-communication", annual: 150_000 },
      ],
    },
  },

  // ═══ NFTC — National Food Traceability Council (NGA, 2028–2030) ═══
  {
    slug: "nftc-2028-2030",
    acronym: "NFTC",
    name: "National Food Traceability Council",
    type: "NGA",
    websiteUrl: "https://www.nftc.gov.ph",
    tagline: "Farm-to-fork traceability for high-value commodities",
    cycle: [2028, 2030],
    scope: "AGENCY_WIDE",
    planStatus: "for_review",
    createdAt: "2026-06-15T03:20:00.000Z",
    updatedAt: "2026-09-29T02:15:00.000Z",
    headName: "Chairperson Wilhelmina R. Dacuycuy",
    cioName: "Dir. Alfonso L. Bumanglag",
    cioPosition: "Director III — ICT Service",
    cioUnit: "ICT Service",
    focalName: "Ms. Imelda C. Tiongson",
    focalPosition: "Chief, Program Management Division",
    legalBasis: "Republic Act No. 12034 (Food Supply Chain Traceability Act of 2025), creating the National Food Traceability Council to operate the national traceability registry for high-value agricultural and marine commodities.",
    mandate: "The NFTC operates the national traceability registry for high-value commodities, accredits traceability service providers, runs field inspection and sampling programs, and coordinates traceback investigations during food safety incidents.",
    vision: "Every high-value commodity traceable from farm or dock to fork within hours, not weeks.",
    mission: "To operate a trustworthy national traceability registry and inspection service that protects consumers and opens premium markets for producers.",
    networkDescription: "The Council's systems estate is thin: a FoxPro-era registry of registered establishments, a WordPress permits portal, and traceback investigations that run on e-mail chains. Field inspectors carry paper sampling forms; laboratory results return as PDFs after two to three weeks. The central office shares a building network with two other agencies.",
    cyberCurrent: 0.31,
    outcomes: [
      { name: "Rapid, reliable traceback during food safety incidents", programs: ["National Traceability Registry Program"] },
      { name: "Digitally capable inspection and laboratory operations", programs: ["Inspector Enablement Program"] },
      { name: "Interoperable food supply chain data", programs: ["Supply Chain Data Program"] },
    ],
    humanCapital: { plantillaIt: [8, 11], plantillaNonIt: [64, 102], unfilled: [3, 16], contractualIt: [4, 3], contractualNonIt: [16, 26], outsourcedIt: [3, 1], outsourcedNonIt: [4, 3] },
    stakeholders: [
      { name: "Registered producers, processors and exporters", services: [
        { name: "Registration and traceability compliance", complexity: "Complex", direction: "INCOMING" },
      ] },
      { name: "Food safety regulators", services: [
        { name: "Traceback investigation support during incidents", complexity: "Highly Technical", direction: "OUTGOING" },
      ] },
      { name: "Bureau of Cold Chain Management", services: [
        { name: "Cold chain custody event exchange (CTB)", complexity: "Highly Technical", direction: "INCOMING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "FTS-1 registry (FoxPro)", concern: "The registry of registered establishments still runs on FoxPro; entity resolution during the 2025 mango pulp incident required nine staff-days of cross-checking three inconsistent lists.", strategy: "Build the National Traceability Registry (NTR) platform with unique lot IDs and event-level traceability." },
      { outcome: 2, program: 2, system: "Field sampling (paper forms)", concern: "Inspectors record samples on paper; results return as PDFs in 2–3 weeks, and one in five samples cannot be matched to its establishment record at entry.", strategy: "Equip inspectors with mobile sampling tools under the Inspector Mobility Program." },
    ],
    systems: [
      { id: "is-fts1", name: "FTS-1 Establishment Registry", classification: "SUPPORT_TO_OPERATIONS", description: "FoxPro registry of registered establishments, maintained on one workstation with a printed manual of record codes.", strategy: "IN_HOUSE", platform: "Visual FoxPro", database: "fts1.dbc", storage: "ON_PREMISE", internalUsers: "Registry Section (~30 staff)", owner: "Registration Bureau" },
      { id: "is-permits", name: "Permits and clearances portal (WordPress)", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", url: "https://permits.nftc.gov.ph", description: "WordPress site hosting downloadable forms; submissions arrive by e-mail with photo attachments of filled forms.", strategy: "IN_HOUSE", platform: "WordPress / MySQL", database: "wp_permits", storage: "ON_PREMISE", internalUsers: "Frontline section (~20 staff)", externalUsers: "Registered establishments", owner: "Registration Bureau" },
    ],
    proposed: [
      { id: "ps-ntr", name: "National Traceability Registry (NTR)", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", description: "Event-level traceability registry: unique establishment and lot IDs, custody events, traceback query tools and open verification APIs.", strategy: "OUTSOURCED", platform: "Node.js / PostgreSQL", database: "ntr_prod", storage: "CLOUD", internalUsers: "Registry, inspection and labs (~180 staff)", externalUsers: "Establishments, partner agencies (~4,200)", owner: "ICT Service", pia: true, status: "FOR_DEVELOPMENT" },
      { id: "ps-fieldkit", name: "Inspector Field Kit platform", classification: "SUPPORT_TO_OPERATIONS", description: "Mobile sampling and inspection application with offline capture, barcode/QR lot scanning, and direct laboratory intake.", strategy: "OUTSOURCED", platform: "Flutter / PostgreSQL", database: "fieldkit", storage: "CLOUD", internalUsers: "Inspection and laboratory bureaus (~220 staff)", owner: "Inspection Bureau", status: "FOR_DEVELOPMENT" },
    ],
    projects: [
      {
        id: "p-ntr",
        shortTitle: "NTR Platform",
        title: "National Traceability Registry (NTR) Platform",
        description: "Builds the event-level traceability registry with unique establishment and lot IDs, custody events, traceback query tools and verification APIs — replacing the FoxPro registry.",
        objectives: "1. NTR live with establishments migrated by 2029\n2. Event-level custody tracking for all registered commodities\n3. Traceback query time under 24 hours",
        kind: "software",
        span: [0, 1],
        target: 180_000_000,
        unit: "ICT Service",
        alignment: ["E-Government Master Plan", "Public Investment Program"],
        harmonization: ["National Prioritization", "Interoperability Framework"],
        linked: ["ps-ntr"],
        deliverables: [
          "Registry core live; establishments migrated; first commodity events flowing",
          "Custody events across the full pilot commodity set; traceback queries under 24h",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Traceback query turnaround (incident to custody chain)", baseline: "9 staff-days", targets: ["72 hours", "24 hours", "24 hours"] },
          { hierarchy: "Output", indicator: "Registered establishments on NTR", baseline: "0", targets: ["2,800", "4,200", "4,200"] },
        ],
      },
      {
        id: "p-inspect",
        shortTitle: "Inspector Mobility",
        title: "Inspector Mobility and Field Sampling Program",
        description: "Equips field inspectors with rugged mobile tools: offline sampling capture, lot scanning and direct laboratory intake, replacing paper forms and PDF results.",
        objectives: "1. Mobile sampling live for all inspection teams by 2028\n2. Sample-to-establishment match rate above 98%\n3. Laboratory result turnaround halved",
        kind: "hardware",
        span: [0, 0],
        target: 60_000_000,
        unit: "Inspection Bureau",
        alignment: ["E-Government Master Plan"],
        harmonization: ["Resource Optimization"],
        linked: ["ps-fieldkit"],
        hw: [
          { item: "Rugged field tablets (inspectors)", categoryId: "co-ict-machinery-equipment", qty: 220, unitCost: 42000 },
          { item: "Portable QR/barcode lot scanners", categoryId: "co-communication-equipment", qty: 120, unitCost: 26000 },
          { item: "Field sampling kits (printers and labelers)", categoryId: "co-printing-equipment", qty: 60, unitCost: 38000 },
        ],
        deliverables: [
          "All inspection teams equipped; mobile sampling live; lab intake direct",
          "",
          "",
        ],
      },
      {
        id: "cx-ctb",
        shortTitle: "CTB participation",
        title: "Cold Chain Traceability Backbone (CTB) — NFTC share",
        description: "The Council's share of CTB: consuming cold chain custody events into the NTR and co-chairing the shared data standards working group.",
        objectives: "1. Ingest CTB custody events into NTR by 2028\n2. Co-chair standards working group\n3. Joint traceback exercise with BCCM annually",
        kind: "software",
        span: [0, 2],
        target: 55_000_000,
        unit: "ICT Service",
        alignment: ["Program Convergence Budgeting", "E-Government Master Plan"],
        harmonization: ["Interoperability Framework", "Cross-Agency Collaboration"],
        cross: { programKey: "ctb" },
        deliverables: [
          "CTB event ingestion live; first joint traceback exercise completed",
          "Standards v1.1 adopted (transport segment); sandbox for research partners",
          "Program review and stewardship handover",
        ],
      },
    ],
    egp: { eGovPay: "no", pnpkiAdoption: 38, ifmis: "yes", recordsMgmt: "no", pscp: "no" },
    budget: {
      offices: ["ICT Service", "Traceability Operations Bureau", "Laboratory and Inspection Bureau"],
      staff: 184,
      opTargets: [10_000_000, 9_000_000, 8_000_000],
      continuing: [
        { item: "FTS-1 registry support (transition period)", categoryId: "mooe-other-general-ict-services", annual: 2_200_000 },
        { item: "Permits portal hosting", categoryId: "mooe-web-hosting", annual: 800_000 },
        { item: "Laboratory data center services", categoryId: "mooe-data-center-services", annual: 1_400_000 },
        { item: "Mobile data plans for field inspectors", categoryId: "mooe-mobile-expenses", annual: 1_600_000 },
        { item: "Rugged tablet repairs and maintenance", categoryId: "mooe-rm-semi-ict", annual: 400_000 },
      ],
    },
  },

  // ═══ PRPGC — Philippine Renewable Power Guarantee Corporation (GOCC, 2028–2030) ═══
  {
    slug: "prpgc-2028-2030",
    acronym: "PRPGC",
    name: "Philippine Renewable Power Guarantee Corporation",
    type: "GOCC",
    websiteUrl: "https://www.prpgc.gov.ph",
    tagline: "Guarantees and credit enhancement for the renewable energy buildout",
    cycle: [2028, 2030],
    scope: "AGENCY_CENTRAL_ONLY",
    planStatus: "draft",
    createdAt: "2026-08-18T04:35:00.000Z",
    updatedAt: "2026-10-15T08:05:00.000Z",
    headName: "President and CEO Gregorio A. Sunico Jr.",
    cioName: "VP Cecilia M. Lambino",
    cioPosition: "Vice President — ICT and Data Division",
    cioUnit: "ICT and Data Division",
    focalName: "Mr. Leandro P. Hizon",
    focalPosition: "Department Manager, Corporate Planning",
    legalBasis: "Republic Act No. 11997 (Renewable Energy Finance Act of 2024), creating the Philippine Renewable Power Guarantee Corporation to provide guarantees and credit enhancement that crowd in private financing for renewable energy projects.",
    mandate: "The PRPGC issues payment and completion guarantees for qualified renewable energy projects, manages a portfolio of guaranteed exposures, prices guarantee fees actuarially, and reports on portfolio quality to its shareholder departments and the market.",
    vision: "Renewable energy projects financed faster because a credible public guarantee stands behind them.",
    mission: "To provide rigorous, transparent and financially sustainable guarantee products that accelerate the renewable energy buildout.",
    networkDescription: "The Corporation operates from one head office. The GATE guarantee system runs on-premise under an outsourced maintenance contract whose knowledge base is effectively two named engineers; risk models run in desktop statistical software, and the exposure portfolio is tracked in a spreadsheet cube maintained by the risk department that takes twenty minutes to recalculate.",
    cyberCurrent: 0.48,
    outcomes: [
      { name: "Faster guarantee issuance for qualified RE projects", programs: ["Guarantee Digitization Program"] },
      { name: "World-class portfolio risk analytics", programs: ["Portfolio Analytics Program"] },
      { name: "Sustainable and secure operations", programs: ["Operating Resilience Program"] },
    ],
    humanCapital: { plantillaIt: [10, 13], plantillaNonIt: [68, 112], unfilled: [3, 15], contractualIt: [5, 4], contractualNonIt: [12, 20], outsourcedIt: [7, 2], outsourcedNonIt: [3, 2] },
    stakeholders: [
      { name: "Renewable energy project sponsors", services: [
        { name: "Guarantee application and issuance", complexity: "Highly Technical", direction: "INCOMING" },
      ] },
      { name: "Lending institutions", services: [
        { name: "Guarantee confirmation and claims processing", complexity: "Highly Technical", direction: "INCOMING" },
      ] },
      { name: "Shareholder departments and oversight bodies", services: [
        { name: "Portfolio quality and exposure reporting", complexity: "Complex", direction: "OUTGOING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "GATE (Guarantee Administration & Tracking Environment)", concern: "Guarantee issuance runs through GATE's 22 manual workflow steps and three wet signatures; the median time from complete application to issued guarantee is 94 days, and sponsors often close financing before the guarantee does.", strategy: "Rebuild guarantee workflows end-to-end (Project WATTS) with straight-through processing for standard products and digital signatures." },
      { outcome: 2, program: 2, system: "Risk models (desktop statistical software)", concern: "Exposure and pricing models run on desktop software on individual workstations; a model change cannot be reproduced six months later, and the portfolio cube takes twenty minutes to recalculate.", strategy: "Stand up the Renewables Portfolio Data Platform: versioned models, governed data, and portfolio analytics that recalculate in seconds." },
    ],
    systems: [
      { id: "is-gate", name: "GATE — Guarantee Administration & Tracking Environment", classification: "OPERATIONS", description: "On-premise guarantee workflow and registry under outsourced maintenance; 22 manual steps, three wet signatures, 94-day median issuance.", strategy: "OUTSOURCED", platform: ".NET Framework / SQL Server", database: "gate_prod", storage: "ON_PREMISE", internalUsers: "Guarantee Operations (~180 staff)", owner: "Guarantee Operations Division", integrated: true, pia: true },
      { id: "is-cube", name: "Exposure portfolio cube (spreadsheet)", classification: "SUPPORT_TO_OPERATIONS", description: "Risk department spreadsheet of all guaranteed exposures; twenty-minute recalculation; no version history.", strategy: "IN_HOUSE", platform: "Microsoft Excel / desktop statistical software", database: "N/A", storage: "ON_PREMISE", internalUsers: "Risk Management Division (~35 staff)", owner: "Risk Management Division" },
    ],
    proposed: [
      { id: "ps-watts", name: "WATTS — Workflows for Account Tracking & Surety", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", description: "End-to-end guarantee platform: application intake, straight-through processing for standard products, digital signatures, and claims servicing.", strategy: "OUTSOURCED", platform: "Java / PostgreSQL / BPMN engine", database: "watts_prod", storage: "CLOUD", internalUsers: "Guarantee Operations (~200 staff)", externalUsers: "Sponsors and lenders (~640)", owner: "ICT and Data Division", pia: true, status: "FOR_DEVELOPMENT" },
      { id: "ps-portfolio", name: "Renewables Portfolio Data Platform", classification: "SUPPORT_TO_OPERATIONS", description: "Governed exposure data platform with versioned risk models and portfolio analytics replacing the twenty-minute spreadsheet cube.", strategy: "HYBRID", platform: "Python / dbt / columnar warehouse", database: "portfolio_wh", storage: "CLOUD", internalUsers: "Risk and finance teams (~60 staff)", owner: "Risk Management Division", status: "FOR_DEVELOPMENT" },
      { id: "ps-records-prpgc", name: "Corporate Records and Document Management System", classification: "GENERAL_ADMIN", description: "Corporate records, guarantee documents and audit trails with retention scheduling, replacing the records archive that doubles as the supply stockroom.", strategy: "OUTSOURCED", platform: "Alfresco / PostgreSQL", database: "records", storage: "CLOUD", internalUsers: "All divisions (~260 staff)", owner: "Corporate Planning Division", status: "FOR_DEVELOPMENT" },
    ],
    projects: [
      {
        id: "p-watts",
        shortTitle: "Project WATTS",
        title: "Project WATTS — Workflows for Account Tracking & Surety",
        description: "Rebuilds guarantee workflows end-to-end: digital application intake, straight-through processing for standard products, digital signatures and claims servicing — cutting issuance from 94 days to 20.",
        objectives: "1. WATTS live for standard guarantee products by 2029\n2. Median issuance time: 20 days\n3. Digital signature accepted for all guarantee documents\n4. GATE decommissioned by 2029",
        kind: "software",
        span: [0, 1],
        target: 520_000_000,
        unit: "ICT and Data Division",
        alignment: ["E-Government Master Plan", "National Cybersecurity Plan"],
        harmonization: ["National Prioritization", "Resource Optimization"],
        linked: ["ps-watts"],
        deliverables: [
          "Intake and straight-through processing live for two standard products; digital signatures live",
          "Full product suite migrated; claims servicing live; GATE decommissioned",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Median guarantee issuance time (complete application to issuance)", baseline: "94 days", targets: ["45 days", "20 days", "20 days"] },
          { hierarchy: "Output", indicator: "Guarantee products on straight-through processing", baseline: "0", targets: ["2", "6", "6"] },
        ],
      },
      {
        id: "p-portfolio",
        shortTitle: "Portfolio Data Platform",
        title: "Renewables Portfolio Data Platform",
        description: "Builds the governed exposure data platform with versioned risk models and portfolio analytics, replacing the twenty-minute spreadsheet cube.",
        objectives: "1. Platform live with full exposure history by 2028\n2. Versioned, reviewable model runs\n3. Portfolio recalculation in seconds",
        kind: "software",
        span: [0, 2],
        target: 210_000_000,
        unit: "Risk Management Division",
        alignment: ["Public Investment Program"],
        harmonization: ["Resource Optimization", "Scalability and Sustainability"],
        linked: ["ps-portfolio"],
        deliverables: [
          "Exposure history migrated; first versioned model runs",
          "Portfolio analytics live; cube retired",
          "Stress-testing environment operational",
        ],
      },
      {
        id: "p-ampere",
        shortTitle: "Project AMPERE",
        title: "Project AMPERE — Actuarial Modeling Platform for Energy Risk Estimation",
        description: "A Corporation-owned AI compute cluster for guarantee pricing and portfolio stress models: sponsor financial data and proprietary model runs stay on-premise under the Corporation's fiduciary commitments, with governed MLOps on the Portfolio Data Platform. The largest single AI-compute ask in this corpus.",
        objectives: "1. Cluster and MLOps environment commissioned by 2028\n2. All pricing and stress models re-platformed from desktop software by 2029\n3. Portfolio-wide stress runs in minutes, fully reproducible",
        kind: "hardware",
        span: [0, 1],
        target: 220_000_000,
        unit: "ICT and Data Division",
        alignment: ["Public Investment Program", "National Cybersecurity Plan"],
        harmonization: ["Scalability and Sustainability", "Resource Optimization"],
        linked: ["ps-portfolio"],
        fund: "Other Income Generating Sources",
        hw: [
          { item: "AI training cluster nodes (16 accelerator nodes, liquid-cooled)", categoryId: "co-ict-machinery-equipment", qty: 16, unitCost: 3_625_000 },
          { item: "Inference servers for portfolio stress runs", categoryId: "co-ict-machinery-equipment", qty: 2, unitCost: 8_400_000 },
          { item: "High-performance storage array (exposure history and model registry)", categoryId: "co-ict-machinery-equipment", qty: 1, unitCost: 12_000_000 },
        ],
        deliverables: [
          "Cluster commissioned; MLOps environment live; first pricing models re-platformed",
          "All stress models re-platformed; desktop statistical software retired; any model run replayable from the registry",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Portfolio-wide stress test turnaround", baseline: "20 minutes (cube)", targets: ["minutes", "seconds", "seconds"] },
          { hierarchy: "Immediate Outcome", indicator: "Model runs reproducible 6 months later", baseline: "0%", targets: ["60%", "100%", "100%"] },
          { hierarchy: "Output", indicator: "Pricing and stress models on the governed platform", baseline: "0 of 11", targets: ["5", "11", "11"] },
        ],
      },
    ],
    egp: { eGovPay: "no", pnpkiAdoption: 41, ifmis: "no", recordsMgmt: "yes", pscp: "no" },
    budget: {
      offices: ["ICT and Data Division", "Guarantee Operations Division", "Risk Management Division"],
      staff: 262,
      opTargets: [30_000_000, 28_000_000, 26_000_000],
      continuing: [
        { item: "GATE system maintenance (until decommission)", categoryId: "mooe-other-general-ict-services", annual: 6_500_000, fund: "Other Income Generating Sources" },
        { item: "Market data and rating feeds", categoryId: "mooe-ict-software-subscription", annual: 8_400_000, fund: "Other Income Generating Sources" },
        { item: "Cloud compute for risk models", categoryId: "mooe-cloud-computing", annual: 2_800_000 },
        { item: "Data center colocation services", categoryId: "mooe-data-center-services", annual: 3_600_000 },
      ],
    },
  },

  // ═══ San Prospero — Municipality of San Prospero (LGU, 2028–2030) ═══
  {
    slug: "sanprospero-2028-2030",
    acronym: "SP",
    name: "Municipality of San Prospero",
    type: "LGU",
    websiteUrl: "https://www.sanprospero.gov.ph",
    tagline: "Digital front-liners for a fifth-class municipality",
    cycle: [2028, 2030],
    scope: "LGU_SCOPE",
    planStatus: "draft",
    createdAt: "2026-09-01T01:50:00.000Z",
    updatedAt: "2026-10-17T05:40:00.000Z",
    headName: "Municipal Mayor Hon. Rosalinda G. Espinosa",
    cioName: "Mr. Jomar E. Balila",
    cioPosition: "Municipal ICT Officer (Designate)",
    cioUnit: "Municipal ICT Desk",
    focalName: "Ms. Lourdes M. Padiernos",
    focalPosition: "Municipal Planning and Development Coordinator",
    legalBasis: "Republic Act No. 11654, creating the Municipality of San Prospero as an independent local government unit.",
    mandate: "The Municipality of San Prospero delivers basic local government services across 23 barangays: business permits, property tax, civil registry front-line services, health and social welfare, with a municipal hall workforce of roughly 120 personnel.",
    vision: "A municipality where no resident travels to the hall twice for the same transaction.",
    mission: "To deliver honest, fast municipal services and bring digital front-liners to every barangay.",
    networkDescription: "The municipal hall has one consumer broadband connection shared by office Wi-Fi; records are ledger books and bond paper; requests from residents arrive by walk-in, tricycle-delivered letter, or the municipal Facebook page, whichever is fastest that day. The treasury maintains tax records in a spreadsheet on a shared laptop.",
    cyberCurrent: 0.14,
    outcomes: [
      { name: "Faster municipal transactions for residents", programs: ["Digital Frontline Program"] },
      { name: "Preserved and searchable municipal records", programs: ["Records Digitization Program"] },
      { name: "Interoperable services with neighboring LGUs", programs: ["PXNet Participation Program"] },
    ],
    humanCapital: { plantillaIt: [1, 1], plantillaNonIt: [28, 56], unfilled: [1, 9], contractualIt: [1, 0], contractualNonIt: [8, 14], outsourcedIt: [1, 0], outsourcedNonIt: [2, 1] },
    stakeholders: [
      { name: "Residents and sari-sari businesses", services: [
        { name: "Permits, clearances and certifications", complexity: "Simple", direction: "INCOMING" },
      ] },
      { name: "City Government of Malinaw", services: [
        { name: "Permit and inspection verification (PXNet)", complexity: "Complex", direction: "INCOMING" },
      ] },
      { name: "Provincial government", services: [
        { name: "Submission of local finance and compliance reports", complexity: "Complex", direction: "OUTGOING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "Manual frontline transactions", concern: "Every transaction is a walk-in; a business renewal means two tricycle trips and an average of 3.5 hours away from the shop, and the municipality's own 2025 citizen feedback card shows 'waiting time' as the top complaint three years running.", strategy: "Launch the San Prospero Digital Frontline: eBPLS-lite permits and certifications with barangay intake kiosks." },
      { outcome: 2, program: 2, system: "Ledger books and bond paper records", concern: "Municipal records since 1998 are ledger books in filing cabinets; a retrospective birth certification requires three staff-days of searching, and the 2024 roof leak destroyed a shelf of ordinances.", strategy: "Digitize priority record series with a searchable records system under the Records Digitization Program." },
    ],
    systems: [
      { id: "is-ledger", name: "Municipal records (ledger books)", classification: "GENERAL_ADMIN", description: "Paper-based records of permits, ordinances and certifications dating to 1998; searchable only by the staff who remember where things are filed.", strategy: "IN_HOUSE", platform: "Paper", database: "N/A", storage: "ON_PREMISE", internalUsers: "All offices (~120 staff)", owner: "Office of the Municipal Clerk" },
    ],
    proposed: [
      { id: "ps-frontline", name: "San Prospero Digital Frontline", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", description: "Municipal services platform: eBPLS-lite permits, certifications and clearances with online payment and barangay intake kiosks.", strategy: "OUTSOURCED", platform: "PHP / PostgreSQL (LGU-tailored)", database: "frontline_prod", storage: "CLOUD", internalUsers: "Frontline offices (~45 staff)", externalUsers: "Residents and businesses (~28,000)", owner: "Municipal ICT Desk", pia: true, status: "FOR_DEVELOPMENT" },
    ],
    projects: [
      {
        id: "p-frontline",
        shortTitle: "Digital Frontline",
        title: "San Prospero Digital Frontline (eBPLS-lite and Records Digitization)",
        description: "Launches the municipality's first services platform — permits, certifications and clearances with online payment and barangay kiosks — and digitizes priority record series.",
        objectives: "1. Top 10 municipal transactions online by 2029\n2. Barangay intake kiosks at 5 pilot barangays\n3. Priority records digitized and searchable",
        kind: "software",
        span: [0, 1],
        target: 16_000_000,
        unit: "Municipal ICT Desk",
        alignment: ["E-Government Master Plan"],
        harmonization: ["National Prioritization", "Interoperability Framework"],
        linked: ["ps-frontline"],
        deliverables: [
          "Permits and certifications live; online payment; 2 pilot kiosks; records digitization started",
          "Top 10 transactions online; 5 kiosks; priority records searchable",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Average resident time per transaction (incl. travel)", baseline: "3.5 hours", targets: ["1 hour", "30 minutes (kiosk/online)", "30 minutes"] },
          { hierarchy: "Output", indicator: "Municipal transactions available online", baseline: "0", targets: ["6", "10", "12"] },
        ],
      },
      {
        id: "cx-pxnet",
        shortTitle: "PXNet participation",
        title: "Permits Exchange Network (PXNet) — San Prospero share",
        description: "The municipality's share of PXNet: verifying permits and inspections with Malinaw so relocating businesses do not re-submit records either LGU already holds.",
        objectives: "1. Verification live with Malinaw by 2029\n2. Shared inspection schema adopted\n3. Staff trained on the exchange",
        kind: "software",
        span: [0, 1],
        target: 4_000_000,
        unit: "Municipal Treasurer's Office",
        alignment: ["E-Government Master Plan", "Program Convergence Budgeting"],
        harmonization: ["Interoperability Framework", "Cross-Agency Collaboration"],
        cross: { programKey: "pxnet" },
        deliverables: [
          "Verification live with Malinaw; staff trained",
          "Shared inspection schema adopted",
          "",
        ],
      },
    ],
    egp: { eGovPay: "no", pnpkiAdoption: 8, ifmis: "yes", recordsMgmt: "no", pscp: "no", elgu: "no" },
    budget: {
      offices: ["Municipal ICT Desk", "Office of the Municipal Treasurer"],
      staff: 42,
      opTargets: [1_200_000, 1_000_000, 1_000_000],
      opFeatured: [
        { year: 0, cls: "mooe", item: "Semi-expendable tablets (kiosk intake and assessors)", categoryId: "mooe-semi-expendable-ict-equipment", qty: 15, unitCost: 16000 },
        { year: 1, cls: "co", item: "Networked multifunction printer (records)", categoryId: "co-printing-equipment", qty: 1, unitCost: 68000 },
      ],
      continuing: [
        { item: "Records digitization services (priority series)", categoryId: "mooe-professional-services", annual: 900_000 },
        { item: "Landline subscriptions (municipal hall)", categoryId: "mooe-landline-expenses", annual: 240_000 },
      ],
    },
  },

  // ═══ VMSC — Visayas Maritime State College (SUC/OTHER, 2028–2030) ═══
  {
    slug: "vmsc-2028-2030",
    acronym: "VMSC",
    name: "Visayas Maritime State College",
    type: "OTHER",
    websiteUrl: "https://www.vmsc.edu.ph",
    tagline: "Maritime education, simulation and research modernization",
    cycle: [2028, 2030],
    scope: "AGENCY_WIDE",
    planStatus: "for_review",
    createdAt: "2026-06-30T06:45:00.000Z",
    updatedAt: "2026-10-08T07:30:00.000Z",
    headName: "President Dr. Susana L. Villaruel",
    cioName: "Engr. Damian C. Oquias",
    cioPosition: "Director, Management Information System Office",
    cioUnit: "Management Information System Office",
    focalName: "Mr. Roderick T. Baldos",
    focalPosition: "Registrar III",
    legalBasis: "Republic Act No. 11322, establishing the Visayas Maritime State College with mandates in maritime higher education, simulator-based training, and maritime research.",
    mandate: "VMSC delivers maritime higher education and simulator-based training for the domestic shipping industry, runs maritime research programs, and provides continuing education for seafarers through its extension campus network.",
    vision: "A maritime college whose graduates train on simulators as modern as the ships they will sail.",
    mission: "To provide quality maritime education and research supported by modern simulation, laboratory and campus systems.",
    networkDescription: "The main campus network is adequate for e-mail and browsing but not for the simulator building, whose full-mission bridge suite (acquired 2012) cannot run current exercise databases. The student information system is an in-house PHP application maintained by one programmer; the library runs Koha; research datasets live on individual external drives labeled by principal investigator.",
    cyberCurrent: 0.41,
    outcomes: [
      { name: "Globally benchmarked simulator training", programs: ["Simulator Modernization Program"] },
      { name: "Integrated campus systems and services", programs: ["ONE-VMSC Program"] },
      { name: "Research data stewardship", programs: ["Research Data Program"] },
    ],
    humanCapital: { plantillaIt: [4, 6], plantillaNonIt: [66, 104], unfilled: [2, 12], contractualIt: [2, 1], contractualNonIt: [12, 19], outsourcedIt: [2, 0], outsourcedNonIt: [5, 3] },
    stakeholders: [
      { name: "Maritime students and cadets", services: [
        { name: "Enrolment, records and simulator scheduling", complexity: "Complex", direction: "INCOMING" },
      ] },
      { name: "Domestic shipping companies", services: [
        { name: "Contract training and simulator certification", complexity: "Complex", direction: "INCOMING" },
      ] },
      { name: "Maritime industry regulators", services: [
        { name: "Compliance reports on simulator standards and training quality", complexity: "Highly Technical", direction: "OUTGOING" },
      ] },
      { name: "Bureau of Cold Chain Management", services: [
        { name: "Research collaboration on cold chain corridor data (CTB)", complexity: "Highly Technical", direction: "INCOMING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "Full mission bridge simulator (2012)", concern: "The 2012 simulator cannot run current exercise databases or log trainee performance electronically; instructors assess by checklist on paper, and two shipping companies have moved contract training to a competitor with newer suites.", strategy: "Refresh the simulator estate with modern bridge suites and performance logging under the Simulator Modernization Program." },
      { outcome: 2, program: 2, system: "SIS (in-house PHP)", concern: "The one-programmer student information system has no test environment and no documentation; enrolment peaks are survived, not managed, and simulator scheduling is a whiteboard.", strategy: "Integrate campus systems under ONE-VMSC with a supported SIS core, scheduling and single sign-on." },
    ],
    systems: [
      { id: "is-sis-vmsc", name: "Student Information System (in-house PHP)", classification: "SUPPORT_TO_OPERATIONS", description: "In-house SIS maintained by one programmer; no test environment; simulator scheduling handled separately on a whiteboard.", strategy: "IN_HOUSE", platform: "PHP / MySQL", database: "sis", storage: "ON_PREMISE", internalUsers: "Registrar and colleges (~85 staff)", owner: "MIS Office", pia: true },
      { id: "is-koha-vmsc", name: "Library System (Koha)", classification: "GENERAL_ADMIN", description: "Koha library management; research datasets are not managed here — they live on investigators' drives.", strategy: "OPEN_SOURCE", platform: "Koha / MySQL", database: "koha", storage: "ON_PREMISE", internalUsers: "Library staff (7)", owner: "Library" },
    ],
    proposed: [
      { id: "ps-one-vmsc", name: "ONE-VMSC Campus Systems Integration", classification: "SUPPORT_TO_OPERATIONS", description: "Supported SIS core with simulator scheduling, single sign-on and research data management replacing the one-programmer stack.", strategy: "OUTSOURCED", platform: "Supported SaaS SIS + integrations", database: "Vendor-managed", storage: "CLOUD", internalUsers: "All academic and administrative offices (~230 staff)", externalUsers: "Students (~5,600)", owner: "MIS Office", pia: true, status: "FOR_DEVELOPMENT" },
      { id: "ps-hr-module", name: "ONE-VMSC HR and Payroll Module", classification: "GENERAL_ADMIN", description: "HR and payroll module of the ONE-VMSC integration, replacing the in-house SIS payroll fork maintained by one programmer.", strategy: "OUTSOURCED", platform: "Supported SaaS SIS module", database: "Vendor-managed", storage: "CLOUD", internalUsers: "HR and Finance (~30 staff)", owner: "MIS Office", status: "FOR_ENHANCEMENT", enhancementDetails: "Extends the ONE-VMSC SIS core." },
    ],
    projects: [
      {
        id: "p-sim",
        shortTitle: "Simulator Refresh",
        title: "Full Mission Bridge Simulator Refresh",
        description: "Replaces the 2012 full-mission bridge suite with modern simulators, current exercise databases, and electronic trainee performance logging.",
        objectives: "1. New full-mission bridge suite operational by 2029\n2. Electronic performance logging for all simulator courses\n3. Win back the two lapsed contract training accounts",
        kind: "hardware",
        span: [0, 1],
        target: 75_000_000,
        unit: "Simulator Training Center",
        alignment: ["Public Investment Program"],
        harmonization: ["National Prioritization", "Scalability and Sustainability"],
        hw: [
          { item: "Full mission bridge simulator suite (330° visual)", categoryId: "co-ict-machinery-equipment", qty: 1, unitCost: 28_500_000 },
          { item: "Projection and visual system upgrade", categoryId: "co-ict-machinery-equipment", qty: 1, unitCost: 12_800_000 },
          { item: "Cadet workstation pods (part-task trainers)", categoryId: "co-ict-machinery-equipment", qty: 24, unitCost: 380000 },
        ],
        deliverables: [
          "Full-mission suite installed and certified; instructor training completed",
          "Part-task pods live; performance logging across all courses",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Simulator courses with electronic performance logs", baseline: "0%", targets: ["60%", "100%", "100%"] },
          { hierarchy: "Output", indicator: "Contract training accounts (shipping companies)", baseline: "5", targets: ["6", "7", "8"] },
        ],
      },
      {
        id: "p-one",
        shortTitle: "ONE-VMSC",
        title: "ONE-VMSC Campus Systems Integration",
        description: "Integrates campus systems on a supported SIS core with simulator scheduling, single sign-on and research data management.",
        objectives: "1. Supported SIS core live by 2029\n2. Simulator scheduling integrated (whiteboard retired)\n3. Research datasets under institutional stewardship",
        kind: "software",
        span: [0, 2],
        target: 45_000_000,
        unit: "MIS Office",
        alignment: ["E-Government Master Plan"],
        harmonization: ["Resource Optimization", "Interoperability Framework"],
        linked: ["ps-one-vmsc"],
        fund: "Locally funded",
        deliverables: [
          "SIS core live with enrolment migrated; SSO rolled out to staff",
          "Simulator scheduling integrated; research data repository live",
          "Analytics and early-alert modules; full records digitization completed",
        ],
      },
      {
        id: "cx-ctb",
        shortTitle: "CTB research share",
        title: "Cold Chain Traceability Backbone (CTB) — VMSC research share",
        description: "The College's research share of CTB: studying shipping-route cold chain corridor data from the sandbox and publishing findings back to the program.",
        objectives: "1. Sandbox access and first corridor study by 2028\n2. Annual research publication to the program\n3. Capstone projects using CTB data",
        kind: "software",
        span: [0, 2],
        target: 8_000_000,
        unit: "Research and Extension Office",
        alignment: ["Program Convergence Budgeting"],
        harmonization: ["Cross-Agency Collaboration"],
        cross: { programKey: "ctb" },
        deliverables: [
          "Sandbox access live; first corridor study scoped",
          "First annual research publication delivered to the program",
          "Capstone program using CTB data established",
        ],
      },
    ],
    egp: { eGovPay: "no", pnpkiAdoption: 17, ifmis: "yes", recordsMgmt: "no", pscp: "no" },
    budget: {
      offices: ["Management Information System Office", "Office of the Registrar", "Research and Extension Office"],
      staff: 208,
      opTargets: [4_000_000, 3_500_000, 3_000_000],
      opFeatured: [
        { year: 0, cls: "co", item: "Standard office laptop computers (clerical, registrar and faculty-support staff)", categoryId: "co-ict-machinery-equipment", qty: 20, unitCost: 88_000 },
        { year: 1, cls: "co", item: "Plotting and chart printers (navigation training)", categoryId: "co-printing-equipment", qty: 2, unitCost: 45000 },
      ],
      continuing: [
        { item: "SIS maintenance contract (transition)", categoryId: "mooe-other-general-ict-services", annual: 900_000 },
        { item: "Library system hosting and support", categoryId: "mooe-web-hosting", annual: 250_000 },
        { item: "Maritime research data subscriptions", categoryId: "mooe-ict-research", annual: 700_000, fund: "Locally funded" },
      ],
    },
  },

  // ═══ CCS — Commission on Cooperative Standards (OTHER, 2028–2030) ═══
  {
    slug: "ccs-2028-2030",
    acronym: "CCS",
    name: "Commission on Cooperative Standards",
    type: "OTHER",
    websiteUrl: "https://www.ccs.gov.ph",
    tagline: "Registry, audit and standards for the cooperative sector",
    cycle: [2028, 2030],
    scope: "AGENCY_WIDE",
    planStatus: "for_review",
    createdAt: "2026-07-07T02:10:00.000Z",
    updatedAt: "2026-10-02T09:50:00.000Z",
    headName: "Chairperson Bienvenido T. Ordoñez",
    cioName: "Dir. Katrina S. Almendral",
    cioPosition: "Director IV — ICT Service",
    cioUnit: "ICT Service",
    focalName: "Ms. Adelaida R. Manalastas",
    focalPosition: "Chief, Standards Development Division",
    legalBasis: "Republic Act No. 11893 (Cooperative Standards Commission Act of 2023), creating the Commission on Cooperative Standards to maintain the national registry of cooperatives, set governance and audit standards, and administer the cooperative audit framework.",
    mandate: "The CCS maintains the national registry of cooperatives, sets governance, financial reporting and audit standards for the sector, schedules and quality-assures cooperative audits, and publishes sector statistics.",
    vision: "A cooperative sector the public can trust, on a registry anyone can verify.",
    mission: "To maintain an authoritative cooperative registry, set clear standards, and run a credible audit framework.",
    networkDescription: "The cooperative registry (CDRS) descends from a dBase system modernized twice but never migrated cleanly; extension offices e-mail registry extracts as attachments that headquarters re-merges monthly. Audit scheduling is a physical board with magnet letters. The registry server room doubles as the records archive and, on Fridays, the supply stockroom.",
    cyberCurrent: 0.45,
    outcomes: [
      { name: "Authoritative, verifiable cooperative registry", programs: ["Registry and Audit Ledger Program"] },
      { name: "Clear, teachable standards for the sector", programs: ["Standards Dissemination Program"] },
      { name: "Modern, secure Commission operations", programs: ["Commission Modernization Program"] },
    ],
    humanCapital: { plantillaIt: [7, 9], plantillaNonIt: [46, 78], unfilled: [2, 11], contractualIt: [3, 2], contractualNonIt: [10, 17], outsourcedIt: [4, 1], outsourcedNonIt: [3, 2] },
    stakeholders: [
      { name: "Registered cooperatives", services: [
        { name: "Registration, annual reports and audit compliance", complexity: "Complex", direction: "INCOMING" },
        { name: "Standards guidance and advisories", complexity: "Simple", direction: "OUTGOING" },
      ] },
      { name: "Cooperative audit organizations", services: [
        { name: "Audit scheduling, quality review and findings submission", complexity: "Complex", direction: "INCOMING" },
      ] },
      { name: "Sector researchers and the public", services: [
        { name: "Sector statistics and registry verification", complexity: "Simple", direction: "OUTGOING" },
      ] },
    ],
    concerns: [
      { outcome: 1, program: 1, system: "CDRS (Cooperative Development Registry System)", concern: "CDRS cannot verify a cooperative's audit status in real time; members of the public asking whether a cooperative is in good standing receive a certified printout that takes five working days, and the monthly extension-office re-merge has introduced three duplicate registry identities this year.", strategy: "Build the TALA registry and audit ledger with a public verification portal and unique cooperative identities." },
      { outcome: 2, program: 2, system: "Standards dissemination (PDFs and seminars)", concern: "Standards are published as PDFs and taught in person; compliance reports show cooperatives citing superseded standard versions years after revisions.", strategy: "Launch the standards portal with versioned standards, plain-language guides and e-learning." },
    ],
    systems: [
      { id: "is-cdrs", name: "CDRS — Cooperative Development Registry System", classification: "OPERATIONS", description: "Registry of roughly 78,000 cooperatives descended from dBase; extension offices e-mail extracts that headquarters re-merges monthly; no public verification.", strategy: "IN_HOUSE", platform: "Visual FoxPro lineage / SQL Server", database: "cdrs", storage: "ON_PREMISE", internalUsers: "Registry bureau (~120 staff)", owner: "Cooperative Registry Bureau", integrated: true, pia: true },
      { id: "is-auditboard", name: "Audit scheduling board (physical)", classification: "GENERAL_ADMIN", description: "Physical board with magnet letters tracking audit assignments across regions; photographed for records each month.", strategy: "IN_HOUSE", platform: "Physical board", database: "N/A", storage: "ON_PREMISE", internalUsers: "Standards and Audit Bureau (~60 staff)", owner: "Standards and Audit Bureau" },
    ],
    proposed: [
      { id: "ps-tala", name: "TALA — Cooperative Registry & Audit Ledger", classification: "OPERATIONS", frontline: true, accessType: "ONLINE", description: "Modern registry with unique cooperative identities, audit workflow and ledger, and a public verification portal answering good-standing queries in seconds.", strategy: "OUTSOURCED", platform: "Java / PostgreSQL", database: "tala_prod", storage: "CLOUD", internalUsers: "Registry and audit bureaus (~190 staff)", externalUsers: "Cooperatives, auditors, the public", owner: "ICT Service", pia: true, status: "FOR_DEVELOPMENT" },
      { id: "ps-standards", name: "Standards Portal and e-Learning", classification: "SUPPORT_TO_OPERATIONS", frontline: true, accessType: "ONLINE", description: "Versioned standards library with plain-language guides, e-learning and compliance self-checks for cooperatives.", strategy: "OUTSOURCED", platform: "Next.js / LMS", database: "standards", storage: "CLOUD", internalUsers: "Standards Development (~35 staff)", externalUsers: "Cooperatives (~78,000 entities)", owner: "Standards Development Division", status: "FOR_DEVELOPMENT" },
      { id: "ps-personnel", name: "CCS Personnel Information System", classification: "GENERAL_ADMIN", description: "Personnel records and 201 files for Commission staff, replacing shared-drive folders named after former clerks.", strategy: "IN_HOUSE", platform: "Next.js / PostgreSQL", database: "personnel", storage: "CLOUD", internalUsers: "HR Section (~15 staff)", owner: "Human Resources Section", status: "FOR_DEVELOPMENT" },
      { id: "ps-agapay", name: "AGAPAY — AI Assistant for Standards Research", classification: "SUPPORT_TO_OPERATIONS", description: "Drafting and research assistant for the standards bureau: retrieves versioned standards and precedent, summarizes consultation comments with citations, and flags inconsistencies for human review — served from a shared government AI platform, not a Commission-owned cluster.", strategy: "OUTSOURCED", platform: "Shared government AI platform (proposed national compute)", database: "Vendor-managed", storage: "CLOUD", internalUsers: "Standards Development and Audit (~95 staff)", owner: "ICT Service", status: "FOR_DEVELOPMENT" },
    ],
    projects: [
      {
        id: "p-tala",
        shortTitle: "Project TALA",
        title: "Project TALA — Cooperative Registry & Audit Ledger",
        description: "Builds the modern registry and audit ledger: unique cooperative identities, real audit workflow replacing the magnet board, and a public verification portal answering good-standing queries in seconds.",
        objectives: "1. TALA live with the full registry migrated by 2029\n2. Public verification portal live\n3. Duplicate registry identities resolved\n4. Audit scheduling fully digital",
        kind: "software",
        span: [0, 1],
        target: 150_000_000,
        unit: "ICT Service",
        alignment: ["E-Government Master Plan", "National Cybersecurity Plan"],
        harmonization: ["National Prioritization", "Interoperability Framework"],
        linked: ["ps-tala"],
        deliverables: [
          "Registry core live with migration completed; audit workflow piloted in two regions",
          "Public verification portal live; magnet board retired; duplicates resolved",
          "",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Public good-standing verification time", baseline: "5 working days", targets: ["1 day (portal beta)", "seconds (portal)", "seconds"] },
          { hierarchy: "Output", indicator: "Registry records with verified unique identities", baseline: "0%", targets: ["70%", "100%", "100%"] },
        ],
      },
      {
        id: "p-standards",
        shortTitle: "Standards Portal",
        title: "Standards Portal and e-Learning for Cooperatives",
        description: "Launches the versioned standards library with plain-language guides, e-learning and compliance self-checks, ending citations of superseded standard versions.",
        objectives: "1. All current standards versioned and published by 2028\n2. E-learning paths for the top five compliance topics\n3. Superseded-version citations below 5% in audit samples",
        kind: "software",
        span: [0, 0],
        target: 30_000_000,
        unit: "Standards Development Division",
        alignment: ["E-Government Master Plan"],
        harmonization: ["Resource Optimization"],
        linked: ["ps-standards"],
        deliverables: [
          "Portal live with all current standards versioned; first e-learning paths released",
          "",
          "",
        ],
      },
      {
        id: "p-agapay",
        shortTitle: "AGAPAY Assistant",
        title: "AGAPAY — AI Assistant for Standards Research (shared platform)",
        description: "Deploys the AGAPAY drafting and research assistant on a shared government AI platform: retrieval over versioned standards, comment summarization with citations, and inconsistency flags for human review. The counterpoint to own-cluster builds — capability without infrastructure.",
        objectives: "1. Assistant live for the standards bureau by 2029\n2. Consultation comment summaries with citations for every rulemaking\n3. Zero on-premise AI infrastructure",
        kind: "software",
        span: [1, 2],
        target: 18_000_000,
        unit: "ICT Service",
        alignment: ["E-Government Master Plan"],
        harmonization: ["Resource Optimization", "Interoperability Framework"],
        linked: ["ps-agapay"],
        deliverables: [
          "",
          "Assistant live in production for standards research; citation-checked summaries in two rulemakings",
          "Extended to audit quality review; platform costs published per use",
        ],
        kpis: [
          { hierarchy: "Intermediate Outcome", indicator: "Average standards-research turnaround per rulemaking", baseline: "34 days", targets: ["18 days", "10 days", "10 days"] },
          { hierarchy: "Immediate Outcome", indicator: "Consultation comments summarized with citations", baseline: "0%", targets: ["60%", "100%", "100%"] },
        ],
      },
    ],
    egp: { eGovPay: "yes", pnpkiAdoption: 44, ifmis: "yes", recordsMgmt: "yes", pscp: "no" },
    budget: {
      offices: ["ICT Service", "Cooperative Registry Bureau", "Standards and Audit Bureau"],
      staff: 162,
      opTargets: [6_000_000, 5_500_000, 5_000_000],
      opFeatured: [
        { year: 0, cls: "co", item: "High-volume registry printers", categoryId: "co-printing-equipment", qty: 4, unitCost: 185000 },
        { year: 0, cls: "mooe", item: "Semi-expendable barcode scanners (records and audit)", categoryId: "mooe-semi-expendable-communication-equipment", qty: 30, unitCost: 12000 },
        { year: 2, cls: "co", item: "Registry printers (second tranche)", categoryId: "co-printing-equipment", qty: 2, unitCost: 185000 },
      ],
      continuing: [
        { item: "CDRS maintenance and support (transition)", categoryId: "mooe-other-general-ict-services", annual: 2_400_000 },
        { item: "Registry data center services", categoryId: "mooe-data-center-services", annual: 1_800_000 },
        { item: "Rented ICT equipment for audit field events", categoryId: "mooe-rents-ict", annual: 900_000 },
        { item: "Registry printer servicing", categoryId: "mooe-rm-printing-equipment", annual: 220_000 },
      ],
    },
  },
];

// ─── NCWTR (reuse the canonical demo document) ────────────────────────────────

interface NcwtrMeta {
  slug: string;
  tagline: string;
  hero: boolean;
  allotFactor: number;
}
const NCWTR_META: NcwtrMeta = {
  slug: "ncwtr-2026-2028",
  tagline: "Monitoring queue times across government — and its own fax machine",
  hero: true,
  allotFactor: 0.94,
};

function loadNcwtr(): IsspDocument {
  const p = path.join(__dirname, "..", "public", "demo", "ncwtr-issp-2026-2028.issp");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as IsspDocument;
}

// ─── Mock COMPASS layer ───────────────────────────────────────────────────────
// Execution-side demonstration data standing in for a future DBM COMPASS feed.
// Plan columns come from the corpus where its cycle covers the year; everything
// from the NEP onward is invented, shaped like COMPASS data. Always labelled
// "proposed link" in the UI. Present date of the corpus: October 2026, so
// FY2025 is closed, FY2026 is executing (as of Q2), FY2027 is at NEP stage,
// FY2028 is at Budget Call stage.

/** Agencies whose ICT money does not pass through the GAA (own budget routes). */
const NON_GAA_ROUTES: Record<string, "corporate" | "local"> = {
  "mfsc-2027-2029": "corporate",
  "prpgc-2028-2030": "corporate",
  "malinaw-2027-2029": "local",
  "sanprospero-2028-2030": "local",
};

/** Prior-cycle / stand-in ISSP plan levels per agency-year not covered by this corpus (₱ full units). */
const PRIOR_PLAN_M: Record<string, Partial<Record<number, [plan: number, nep: number, gaa: number, allotment: number, obligated: number, disbursed: number]>>> = {
  "bccm-2026-2028": { 2025: [210e6, 178e6, 186e6, 176e6, 154e6, 132e6] },
  "hafsc-2026-2028": { 2025: [62e6, 52e6, 55e6, 52e6, 46e6, 39e6] },
  "ncra-2027-2029": {
    2025: [940e6, 780e6, 812e6, 760e6, 684e6, 582e6],
    2026: [850e6, 720e6, 748e6, 702e6, 316e6, 158e6], // Q2 executing, prior plan
  },
  "pdrio-2027-2029": {
    2025: [310e6, 258e6, 268e6, 254e6, 132e6, 96e6], // low performer: 52% obligation rate
    2026: [330e6, 276e6, 286e6, 268e6, 92e6, 41e6],
  },
  "nftc-2028-2030": {
    2025: [138e6, 115e6, 120e6, 112e6, 99e6, 84e6],
    2026: [142e6, 118e6, 124e6, 117e6, 52e6, 23e6],
    2027: [136e6, 112e6, 0, 0, 0, 0], // NEP stage on a prior plan
  },
  "ccs-2028-2030": {
    2025: [92e6, 76e6, 80e6, 75e6, 68e6, 57e6],
    2026: [96e6, 80e6, 84e6, 79e6, 36e6, 16e6],
    2027: [90e6, 74e6, 0, 0, 0, 0],
  },
  "vmsc-2028-2030": {
    2025: [58e6, 48e6, 50e6, 47e6, 27e6, 19e6], // low performer: 58% obligation rate
    2026: [60e6, 50e6, 52e6, 48e6, 17e6, 8e6],
    2027: [56e6, 46e6, 0, 0, 0, 0],
  },
};

/** Execution shape for corpus-covered fiscal years: [nepRate, gaaMult, allotRate, obligRate(Q2 for FY2026), disbRate]. */
const EXEC_RATES: Record<string, { nep: number; gaa: number; allot: number; oblig: number; disb: number }> = {
  "bccm-2026-2028": { nep: 0.83, gaa: 1.02, allot: 0.97, oblig: 0.48, disb: 0.55 },
  "hafsc-2026-2028": { nep: 0.85, gaa: 1.0, allot: 0.98, oblig: 0.41, disb: 0.52 },
  "ncra-2027-2029": { nep: 0.82, gaa: 0, allot: 0, oblig: 0, disb: 0 },
  "pdrio-2027-2029": { nep: 0.84, gaa: 0, allot: 0, oblig: 0, disb: 0 },
};

/** NCWTR's FY2026 record — first ISSP, exact figures shared with the budget-canvas boards. */
const NCWTR_FY2026 = { plan: 20_972_000, nep: 20_972_000, gaa: 20_440_000, allotment: 20_440_000, obligated: 14_800_000, disbursed: 6_040_000 };

/** Projects deliberately left without a mock PAP code, so the traceability KPI is honestly imperfect. */
const NO_PAP = new Set([
  "bccm-2026-2028:p-registry",
  "hafsc-2026-2028:p-ext",
  "malinaw-2027-2029:p-mesh",
  "sanprospero-2028-2030:p-frontline",
  "sanprospero-2028-2030:cx-pxnet",
  "vmsc-2028-2030:cx-ctb",
  "ccs-2028-2030:p-standards",
  "nftc-2028-2030:p-inspect",
]);

/** NCWTR keeps the exact codes shown on the budget-canvas boards; the rest continue the sequence. */
const FIXED_PAP: Record<string, string> = {
  "ncwtr-2026-2028:proj-sikap": "310100100001000",
  "ncwtr-2026-2028:proj-bilis": "310100100002000",
  "ncwtr-2026-2028:proj-handa": "310100100003000",
};

function buildPapCodes(docs: { doc: IsspDocument; meta: { slug: string } }[]): Map<string, string> {
  const codes = new Map<string, string>();
  // 1000–3000 are NCWTR's fixed codes; the sequence continues after them.
  let n = 4000;
  for (const { doc, meta } of docs) {
    const projects = [...doc.part3.internalProjects, ...doc.part3.crossAgencyProjects];
    for (const p of projects) {
      const key = `${meta.slug}:${p.id}`;
      if (NO_PAP.has(key)) continue;
      if (FIXED_PAP[key]) codes.set(key, FIXED_PAP[key]);
      else {
        codes.set(key, `3101001000${String(n).padStart(5, "0")}`);
        n += 1000;
      }
    }
  }
  return codes;
}

function stageFor(year: number): "closed" | "executing" | "nep" | "budget-call" {
  if (year <= 2025) return "closed";
  if (year === 2026) return "executing";
  if (year === 2027) return "nep";
  return "budget-call";
}

function roundM(n: number): number {
  return Math.round(n / 10_000) * 10_000;
}

/** The SIKAP trace: one project followed from plan to payment, FY2026. */
function sikapTrace(): CompassProjectTrace {  return {
    projectId: "proj-sikap",
    projectTitle: "Project SIKAP — Streamlined ICT for Konsolidadong Agency Platform",
    fiscalYear: 2026,
    money: { plan: 10_520_000, nep: 10_520_000, gaa: 10_520_000, allotment: 10_520_000, obligated: 9_860_000, disbursed: 2_810_000 },
    steps: [
      { date: "30 Apr 2025", stage: "Plan", source: ".issp · Part III-E.1 + Part IV", title: "ISSP 2026–2028 submitted to DICT", detail: "FY2026 line items: ₱9.50M UQMP and CFCP development (CO · ICT Software) · ₱0.54M GovCloud hosting (MOOE · Internet Subscription) · ₱0.48M project management (MOOE · Professional Services). Aligned to the E-Government Master Plan and the National Cybersecurity Plan." },
      { date: "Jul 2025", stage: "Endorse", source: "DICT", title: "DICT endorses the ISSP", detail: "Endorsement reference DICT-GSSPD-2026-001 links the plan to the budget proposal." },
      { date: "Aug 2025", stage: "Propose", source: "COMPASS · NEP", title: "In the FY2026 NEP: ₱10.52M (100% of plan)" },
      { date: "Dec 2025", stage: "Authorize", source: "COMPASS · GAA", title: "FY2026 GAA: ₱10.52M, no change" },
      { date: "Jan 2026", stage: "Release", source: "COMPASS · BTMS", title: "Allotment released: ₱10.52M" },
      { date: "Feb–Apr 2026", stage: "Procure", source: "PhilGEPS", title: "Bid posted 9 Feb · awarded 14 Apr", detail: "Approved budget for the contract ₱9.50M · contract price ₱9.38M · PhilGEPS reference [REF-NO.]" },
      { date: "Apr–May 2026", stage: "Commit", source: "COMPASS · IFMIS", title: "Obligated ₱9.86M", detail: "Development contract ₱9.38M + project management ₱0.48M. Hosting (₱0.54M) starts after go-live." },
      { date: "Jun 2026", stage: "Pay", source: "COMPASS · NCA", title: "Disbursed ₱2.81M — 30% mobilization payment" },
      { date: "Q2 2026", stage: "Deliver", source: "ISSP KPIs (proposed actuals) · DIME", title: "Results against the ISSP targets" },
    ],
    kpiActuals: [
      { indicator: "Agencies reporting via UQMP API", target: "25% (Y1)", actual: "9%", status: "behind" },
      { indicator: "National queue report time", target: "10 days (Y1)", actual: "14 days", status: "behind" },
      { indicator: "Complaints filed online", target: "30% (Y1)", actual: "22%", status: "on-track" },
      { indicator: "Legacy Windows XP workstations in use", target: "3 (Y1)", actual: "3", status: "on-track" },
    ],
  };
}

/** The WATCHFUL trace: a project still at the NEP stage — what a trace looks like before money moves. */
function watchfulTrace(profile: CorpusProfile): CompassProjectTrace {
  const plan = profile.lineItems
    .filter((l) => l.projectId === "p-watchful" && l.year === 2027)
    .reduce((s, l) => s + l.total, 0);
  const nep = roundM(plan * 0.82);
  return {
    projectId: "p-watchful",
    projectTitle: "Project WATCHFUL — Wide-Area Telemetry & Coastal Hazard Unified Field Layer",
    fiscalYear: 2027,
    money: { plan, nep, gaa: 0, allotment: 0, obligated: 0, disbursed: 0 },
    steps: [
      { date: "29 Apr 2026", stage: "Plan", source: ".issp · Part III-E.1 + Part IV", title: "ISSP 2027–2029 submitted to DICT", detail: "FY2027 line items: real-time tide and oceanographic sensor stations, VSAT backhaul for off-grid sites, and coastal verification cameras. Aligned to the Public Investment Program and the National Cybersecurity Plan." },
      { date: "May 2026", stage: "Endorse", source: "DICT", title: "DICT endorses the ISSP", detail: "Endorsement reference DICT-GSSPD-2026-006." },
      { date: "Jul 2026", stage: "Propose", source: "COMPASS · NEP", title: `In the FY2027 NEP: ₱${Math.round(nep / 1e6)}M (82% of plan)`, detail: "The 18% gap is sensor stations deferred to FY2028 — visible today because the plan is structured data." },
      { date: "Dec 2026 · ahead", stage: "Authorize", source: "COMPASS · GAA", title: "FY2027 GAA pending in Congress" },
    ],
    kpiActuals: [],
  };
}

function buildCompass(docs: { doc: IsspDocument; meta: { slug: string } }[], profiles: CorpusProfile[]): CompassLayer {
  const profileBySlug = new Map(profiles.map((p) => [p.slug, p]));
  const agencies: CompassAgency[] = [];

  for (const { meta } of docs) {
    const profile = profileBySlug.get(meta.slug)!;
    const route = NON_GAA_ROUTES[meta.slug] ?? "GAA";
    const years: CompassYearRecord[] = [];
    const prior = PRIOR_PLAN_M[meta.slug] ?? {};
    const rates = EXEC_RATES[meta.slug];

    for (const year of [2025, 2026, 2027, 2028]) {
      const idx = year - profile.cycle.startYear;
      const fromCorpus = idx >= 0 && idx < 3;
      const corpusPlan = fromCorpus ? profile.budget.grandTotals[idx] : undefined;
      const stage = stageFor(year);

      // Years this corpus does not cover and no prior stand-in exists → skip.
      if (!fromCorpus && !prior[year]) continue;

      // NCWTR's first plan starts FY2026 — no FY2025 record at all.
      if (meta.slug === NCWTR_META.slug && year === 2025) continue;

      if (!fromCorpus) {
        const [plan, nep, gaa, allotment, obligated, disbursed] = prior[year]!;
        years.push({ year, stage, plan, planFromCorpus: false, ...(nep > 0 ? { nep } : {}), ...(gaa > 0 ? { gaa, allotment, obligated, disbursed } : {}) });
        continue;
      }

      const plan = corpusPlan!;
      if (meta.slug === NCWTR_META.slug && year === 2026) {
        years.push({ year, stage, planFromCorpus: true, ...NCWTR_FY2026 });
        continue;
      }
      if (!rates || stage === "budget-call") {
        years.push({ year, stage, plan, planFromCorpus: true });
        continue;
      }
      const nep = roundM(plan * rates.nep);
      if (stage === "nep") {
        years.push({ year, stage, plan, planFromCorpus: true, nep });
        continue;
      }
      // FY2026 executing for the 2026–2028 cohort
      const gaa = roundM(nep * rates.gaa);
      const allotment = roundM(gaa * rates.allot);
      const obligated = roundM(allotment * rates.oblig);
      years.push({ year, stage, plan, planFromCorpus: true, nep, gaa, allotment, obligated, disbursed: roundM(obligated * rates.disb) });
    }

    const traces: CompassProjectTrace[] = [];
    if (meta.slug === NCWTR_META.slug) traces.push(sikapTrace());
    if (meta.slug === "ncra-2027-2029") traces.push(watchfulTrace(profile));
    agencies.push({
      slug: meta.slug,
      acronym: profile.acronym,
      route,
      years,
      traces,
    });
  }

  return {
    fictitious: true,
    note:
      "Execution-side demonstration data in the shape of a future DBM COMPASS feed — NEP, GAA, allotments, obligations and disbursements are invented. Plan columns come from the .issp corpus. COMPASS itself is a proposed link, not live DBM data.",
    agencies,
  };
}

// ─── Mock AI & compute layer ──────────────────────────────────────────────────
// Projects tagged as AI/compute asks. Amounts are their real Part IV line items,
// so every figure in the spend-wave views reconciles with the B.1–B.4 engine.

const AI_TAGGED: { slug: string; projectId: string; kind: CorpusAiKind }[] = [
  { slug: "mfsc-2027-2029", projectId: "p-hula", kind: "own-build" },
  { slug: "prpgc-2028-2030", projectId: "p-ampere", kind: "own-build" },
  { slug: "hafsc-2026-2028", projectId: "p-ailab", kind: "education" },
  { slug: "ccs-2028-2030", projectId: "p-agapay", kind: "adoption" },
];

function buildAiLayer(profiles: CorpusProfile[]): CorpusAiLayer {
  const projects = AI_TAGGED.map(({ slug, projectId, kind }) => {
    const profile = profiles.find((a) => a.slug === slug)!;
    const project = profile.projects.find((p) => p.id === projectId)!;
    const byYearMap = new Map<number, number>();
    profile.lineItems
      .filter((l) => l.projectId === projectId)
      .forEach((l) => byYearMap.set(l.year, (byYearMap.get(l.year) ?? 0) + l.total));
    return {
      slug,
      acronym: profile.acronym,
      projectId,
      projectTitle: project.title,
      shortTitle: project.shortTitle,
      kind,
      byYear: [...byYearMap.entries()].sort((x, y) => x[0] - y[0]).map(([year, amount]) => ({ year, amount })),
      total: project.totalCost,
    };
  });

  // Corpus year totals across all agencies covering each year, for the share.
  const corpusYear = new Map<number, number>();
  profiles.forEach((a) => a.budget.grandTotals.forEach((t, i) => {
    const year = a.cycle.startYear + i;
    corpusYear.set(year, (corpusYear.get(year) ?? 0) + t);
  }));
  const aiYear = new Map<number, number>();
  projects.forEach((p) => p.byYear.forEach(({ year, amount }) => aiYear.set(year, (aiYear.get(year) ?? 0) + amount)));

  return {
    fictitious: true,
    note:
      "AI/compute asks tagged in the demonstration corpus (agentic services, model platforms, GPU clusters, teaching labs). Amounts are each project's real Part IV line items; tags are a proposed ISSP field, marked here for the spend-wave views.",
    projects,
    byYear: [...corpusYear.keys()].sort((x, y) => x - y).map((year) => {
      const amount = aiYear.get(year) ?? 0;
      const total = corpusYear.get(year) ?? 0;
      return { year, amount, share: total ? amount / total : 0 };
    }),
    ownBuildTotal: projects.filter((p) => p.kind === "own-build").reduce((s, p) => s + p.total, 0),
  };
}

// ─── Mock ICT asset posture (Annex 1 shape) ───────────────────────────────────
// Stands in for the Existing ICT Resource Inventory (Annex 1) a revised ISSP
// would carry as structured data. All makes and models are fictitious.

const FLEET: Record<string, CorpusFleet> = {
  "ncwtr-2026-2028": { fictitious: true, endpoints: 240, endpointsEol: 38, servers: 9, serversEol: 2, networkDevices: 38, networkEol: 6, avgAgeYears: 4.2, models: [
    { name: "LumaBook 15", kind: "endpoint", count: 202, eol: false },
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 38, eol: true, supportUntil: "2024-07" },
    { name: "RakServer RX320", kind: "server", count: 2, eol: true, supportUntil: "2025-11" },
    { name: "NetGate FX-200", kind: "security", count: 14, eol: true, supportUntil: "2025-06" },
  ] },
  "bccm-2026-2028": { fictitious: true, endpoints: 310, endpointsEol: 96, servers: 14, serversEol: 5, networkDevices: 60, networkEol: 22, avgAgeYears: 5.1, models: [
    { name: "DeskPro S2", kind: "endpoint", count: 214, eol: false },
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 96, eol: true, supportUntil: "2024-07" },
    { name: "NetGate FX-200", kind: "security", count: 6, eol: true, supportUntil: "2025-06" },
  ] },
  "hafsc-2026-2028": { fictitious: true, endpoints: 190, endpointsEol: 88, servers: 6, serversEol: 4, networkDevices: 45, networkEol: 31, avgAgeYears: 6.8, models: [
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 88, eol: true, supportUntil: "2024-07" },
    { name: "Klark Tower 800", kind: "server", count: 4, eol: true, supportUntil: "2025-01" },
    { name: "NetGate FX-200", kind: "security", count: 4, eol: true, supportUntil: "2025-06" },
  ] },
  "ncra-2027-2029": { fictitious: true, endpoints: 520, endpointsEol: 74, servers: 22, serversEol: 6, networkDevices: 96, networkEol: 28, avgAgeYears: 4.6, models: [
    { name: "LumaBook 15", kind: "endpoint", count: 446, eol: false },
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 74, eol: true, supportUntil: "2024-07" },
    { name: "NetGate FX-200", kind: "security", count: 14, eol: true, supportUntil: "2025-06" },
    { name: "SentriEdge 90", kind: "network", count: 28, eol: true, supportUntil: "2026-03" },
  ] },
  "pdrio-2027-2029": { fictitious: true, endpoints: 340, endpointsEol: 61, servers: 16, serversEol: 4, networkDevices: 70, networkEol: 19, avgAgeYears: 4.9, models: [
    { name: "DeskPro S2", kind: "endpoint", count: 279, eol: false },
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 61, eol: true, supportUntil: "2024-07" },
  ] },
  "mfsc-2027-2029": { fictitious: true, endpoints: 460, endpointsEol: 52, servers: 18, serversEol: 7, networkDevices: 84, networkEol: 30, avgAgeYears: 4.4, models: [
    { name: "LumaBook 15", kind: "endpoint", count: 408, eol: false },
    { name: "RakServer RX410", kind: "server", count: 7, eol: true, supportUntil: "2026-08" },
    { name: "NetGate FX-200", kind: "security", count: 9, eol: true, supportUntil: "2025-06" },
  ] },
  "malinaw-2027-2029": { fictitious: true, endpoints: 120, endpointsEol: 55, servers: 3, serversEol: 2, networkDevices: 18, networkEol: 11, avgAgeYears: 6.2, models: [
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 55, eol: true, supportUntil: "2024-07" },
    { name: "Klark Tower 800", kind: "server", count: 2, eol: true, supportUntil: "2025-01" },
  ] },
  "nftc-2028-2030": { fictitious: true, endpoints: 260, endpointsEol: 49, servers: 11, serversEol: 3, networkDevices: 44, networkEol: 13, avgAgeYears: 4.0, models: [
    { name: "DeskPro S2", kind: "endpoint", count: 211, eol: false },
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 49, eol: true, supportUntil: "2024-07" },
    { name: "NetGate FX-200", kind: "security", count: 7, eol: true, supportUntil: "2025-06" },
  ] },
  "prpgc-2028-2030": { fictitious: true, endpoints: 210, endpointsEol: 24, servers: 8, serversEol: 1, networkDevices: 26, networkEol: 4, avgAgeYears: 3.1, models: [
    { name: "DeskPro S2", kind: "endpoint", count: 186, eol: false },
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 24, eol: true, supportUntil: "2024-07" },
  ] },
  "sanprospero-2028-2030": { fictitious: true, endpoints: 46, endpointsEol: 26, servers: 1, serversEol: 1, networkDevices: 8, networkEol: 6, avgAgeYears: 7.4, models: [
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 26, eol: true, supportUntil: "2024-07" },
    { name: "Klark Tower 800", kind: "server", count: 1, eol: true, supportUntil: "2025-01" },
  ] },
  "vmsc-2028-2030": { fictitious: true, endpoints: 380, endpointsEol: 142, servers: 9, serversEol: 5, networkDevices: 52, networkEol: 26, avgAgeYears: 5.9, models: [
    { name: "DeskPro S2", kind: "endpoint", count: 238, eol: false },
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 142, eol: true, supportUntil: "2024-07" },
  ] },
  "ccs-2028-2030": { fictitious: true, endpoints: 230, endpointsEol: 58, servers: 8, serversEol: 3, networkDevices: 40, networkEol: 12, avgAgeYears: 5.3, models: [
    { name: "DeskPro S2", kind: "endpoint", count: 172, eol: false },
    { name: "LumaBook 14 (2019)", kind: "endpoint", count: 58, eol: true, supportUntil: "2024-07" },
    { name: "NetGate FX-200", kind: "security", count: 5, eol: true, supportUntil: "2025-06" },
  ] },
};

/** One fictitious advisory whose blast radius the corpus can answer. */
const ADVISORY: CorpusAdvisory = {
  fictitious: true,
  id: "FY26-114",
  title: "Pre-authentication remote code execution in NetGate FX-200 firewall firmware",
  model: "NetGate FX-200",
  kind: "network firewall",
  severity: "critical",
  published: "2026-09-18",
  agencies: [
    { slug: "ncra-2027-2029", acronym: "NCRA", units: 14, refreshInPlan: false },
    { slug: "mfsc-2027-2029", acronym: "MFSC", units: 9, refreshInPlan: true, refreshProject: "Pier Network Connectivity and Passenger Information" },
    { slug: "bccm-2026-2028", acronym: "BCCM", units: 6, refreshInPlan: false },
    { slug: "ccs-2028-2030", acronym: "CCS", units: 5, refreshInPlan: false },
    { slug: "hafsc-2026-2028", acronym: "HAFSC", units: 4, refreshInPlan: true, refreshProject: "Campus Network Modernization and Cybersecurity Hardening" },
  ],
  note:
    "Fictitious advisory in the shape of a national CERT bulletin. The vendor ended FX-200 support in June 2025, so there is no firmware patch — affected units must be replaced. Cross-references each agency's Annex 1 inventory (proposed field) and Part IV lines.",
};

// ─── Mock procurement layer (FY2026, the executing year) ──────────────────────

const PROCUREMENT_STAGES: Record<string, { stage: CorpusProcurementStage; note: string }> = {
  "ncwtr-2026-2028:proj-sikap": { stage: "awarded", note: "Contract awarded 14 Apr 2026 · contract price ₱9.38M of ₱9.50M ABC (PhilGEPS)" },
  "ncwtr-2026-2028:proj-bilis": { stage: "bidding", note: "Bid posted 2 Jun 2026 for the broadband lots · opening 30 Jul 2026" },
  "ncwtr-2026-2028:proj-handa": { stage: "awarded", note: "Subscription licence active since Feb 2026 · implementation ongoing" },
  "bccm-2026-2028:p-lamig": { stage: "bidding", note: "Competitive bidding opened 12 May 2026 · sensor rollout lots 1–2" },
  "bccm-2026-2028:p-registry": { stage: "awarded", note: "Contract awarded 9 Mar 2026 · registry development and data migration" },
  "bccm-2026-2028:cx-ctb": { stage: "pre-bid", note: "Pre-bid conference 24 Jun 2026 · event gateway and standards workbench" },
  "hafsc-2026-2028:p-net": { stage: "awarded", note: "Contract awarded 20 Feb 2026 · fiber backbone and segmentation lots" },
  "hafsc-2026-2028:p-ext": { stage: "bidding", note: "Bid posted 8 Jun 2026 · learning platform and content migration" },
};

function buildProcurement(profiles: CorpusProfile[]): CorpusProcurement {
  const rows = profiles
    .filter((a) => a.cycle.startYear <= 2026 && 2026 <= a.cycle.endYear)
    .flatMap((a) =>
      a.projects.map((p) => {
        const amount = a.lineItems
          .filter((l) => l.projectId === p.id && l.year === 2026)
          .reduce((s, l) => s + l.total, 0);
        return { profile: a, project: p, amount };
      })
    )
    .filter(({ amount }) => amount > 0)
    .map(({ profile, project, amount }) => {
      const key = `${profile.slug}:${project.id}`;
      const stage = PROCUREMENT_STAGES[key];
      if (!stage) throw new Error(`Procurement stage missing for FY2026 project ${key} — add it to PROCUREMENT_STAGES`);
      return {
        slug: profile.slug,
        acronym: profile.acronym,
        projectId: project.id,
        projectTitle: project.title,
        shortTitle: project.shortTitle,
        fiscalYear: 2026,
        amount,
        stage: stage.stage,
        note: stage.note,
      };
    });
  return {
    fictitious: true,
    note:
      "Procurement status of FY2026 projects (the executing year) for the three plans that cover it — in the shape of PhilGEPS data an agency-side update loop would feed. Amounts are each project's real FY2026 Part IV lines.",
    rows,
  };
}

// ─── Unit-price sanity (laptop-class purchases) ───────────────────────────────

const UNIT_PRICE_NOTES: Record<string, string> = {
  "bccm-2026-2028": "Includes IP65 ruggedized units for regional inspection teams — the spec justifies the premium.",
  "vmsc-2028-2030": "1.5× the corpus median for a standard office spec — a procurement-planning support candidate (also flagged for FY2025 execution).",
};

function buildUnitPrices(profiles: CorpusProfile[]): CorpusUnitPrices {
  const isLaptop = (item: string) => /laptop|notebook/i.test(item);
  const allUnitCosts: number[] = [];
  const rows = profiles
    .map((a) => {
      const lines = a.lineItems.filter((l) => isLaptop(l.item));
      if (lines.length === 0) return null;
      const costs = lines.map((l) => l.unitCost);
      allUnitCosts.push(...costs);
      const sorted = [...costs].sort((x, y) => x - y);
      const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);
      return {
        slug: a.slug,
        acronym: a.acronym,
        medianUnitCost: median,
        units: lines.reduce((s, l) => s + l.qty, 0),
        ...(UNIT_PRICE_NOTES[a.slug] ? { note: UNIT_PRICE_NOTES[a.slug] } : {}),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((x, y) => y.medianUnitCost - x.medianUnitCost);
  const sorted = [...allUnitCosts].sort((x, y) => x - y);
  const corpusMedian = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);
  return {
    fictitious: true,
    note:
      "Median unit cost of laptop-class line items per agency, against the corpus median. A prompt for procurement-planning support, not a finding — specs differ. Derived from real Part IV lines.",
    item: "Laptop-class purchases",
    corpusMedian,
    rows,
  };
}

// ─── Derivation ───────────────────────────────────────────────────────────────

function docLineItems(doc: IsspDocument): CorpusLineItem[] {
  const out: CorpusLineItem[] = [];
  const years = [doc.part4.year1, doc.part4.year2, doc.part4.year3] as const;
  years.forEach((y, yi) => {
    y.officeProductivity.capitalOutlay.forEach((l) => out.push(toCorpusLine(l, doc.startYear + yi, "officeProductivity", "capitalOutlay")));
    y.officeProductivity.mooe.forEach((l) => out.push(toCorpusLine(l, doc.startYear + yi, "officeProductivity", "mooe")));
    for (const [pid, pb] of Object.entries(y.internalProjects)) {
      pb.capitalOutlay.forEach((l) => out.push(toCorpusLine(l, doc.startYear + yi, "internalProjects", "capitalOutlay", pid, pb.projectTitle)));
      pb.mooe.forEach((l) => out.push(toCorpusLine(l, doc.startYear + yi, "internalProjects", "mooe", pid, pb.projectTitle)));
    }
    for (const [pid, pb] of Object.entries(y.crossAgencyProjects)) {
      pb.capitalOutlay.forEach((l) => out.push(toCorpusLine(l, doc.startYear + yi, "crossAgencyProjects", "capitalOutlay", pid, pb.projectTitle)));
      pb.mooe.forEach((l) => out.push(toCorpusLine(l, doc.startYear + yi, "crossAgencyProjects", "mooe", pid, pb.projectTitle)));
    }
    y.continuingCosts.mooe.forEach((l) => out.push(toCorpusLine(l, doc.startYear + yi, "continuingCosts", "mooe")));
  });
  return out;
}

function toCorpusLine(
  l: LineItem,
  year: number,
  bucket: CorpusLineItem["bucket"],
  expenseClass: "capitalOutlay" | "mooe",
  projectId?: string,
  projectTitle?: string
): CorpusLineItem {
  return {
    year,
    bucket,
    projectId,
    projectTitle,
    expenseClass,
    item: l.item,
    office: l.office,
    categoryId: l.categoryId,
    fundSource: l.fundSource,
    qty: l.qty,
    unitCost: l.unitCost,
    total: l.qty * l.unitCost,
  };
}

function deriveProfile(
  doc: IsspDocument,
  opts: { slug: string; tagline: string; hero: boolean; allotFactor?: number; agencyIndex: number; papCodes: Map<string, string> }
): CorpusProfile {
  const counted = countedPart4(doc);
  const years: [YearBudget, YearBudget, YearBudget] = [counted.year1, counted.year2, counted.year3];
  const b1 = buildB1(years);
  const b2 = buildB2(years);
  const b3 = buildB3(years);
  const b4 = buildB4(years);
  const grandTotals = years.map(yearTotal) as [number, number, number];
  const grandTotal = grandTotals[0] + grandTotals[1] + grandTotals[2];
  const [coRow, mooeRow] = b3;
  const totalCo = coRow.total;
  const totalMooe = mooeRow.total;
  const allLines = docLineItems(doc);

  const byFundSource = b2
    .filter((r) => !r.isTotal)
    .map((r) => ({ label: r.label, total: r.total }));
  const byCategory = b4
    .filter((r) => r.total > 0)
    .map((r) => ({
      categoryId: r.categoryId,
      name: r.name,
      total: r.total,
      expenseClass: (EXPENSE_CATEGORIES.find((c) => c.id === r.categoryId)?.expenseClass ?? "mooe") as "capitalOutlay" | "mooe",
    }))
    .sort((a, b) => b.total - a.total);

  // eGov adoption summary (strict yes count over the 9 template programs)
  const egp = doc.part2.egpChecklist;
  const egpItems = [
    egp.elgu?.status, egp.eGovPay.status, egp.pnpki.status, egp.hcmis.status, egp.ifmis.status,
    egp.onlinePortal.status, egp.procurement.status, egp.recordsMgmt.status, egp.pscp.status,
  ];
  const adopted = egpItems.filter((s) => s === "yes").length;

  const sectionEntries = Object.values(doc.sectionMeta ?? {});
  const completionPct = sectionEntries.length
    ? Math.round((sectionEntries.filter((m) => m.userMarkedDone).length / sectionEntries.length) * 100)
    : 100;

  const hc = doc.part1.humanCapital;
  const humanCapital = {
    plantilla: hc.plantilla.it.male + hc.plantilla.it.female + hc.plantilla.nonIt.male + hc.plantilla.nonIt.female,
    contractual: hc.contractual.it.male + hc.contractual.it.female + hc.contractual.nonIt.male + hc.contractual.nonIt.female,
    outsourced: hc.outsourced.it.male + hc.outsourced.it.female + hc.outsourced.nonIt.male + hc.outsourced.nonIt.female,
    unfilled: hc.plantillaUnfilled.it + hc.plantillaUnfilled.nonIt,
    totalIt:
      hc.plantilla.it.male + hc.plantilla.it.female + hc.contractual.it.male + hc.contractual.it.female +
      hc.outsourced.it.male + hc.outsourced.it.female,
  };

  const internalCosts = computeProjectCosts(counted, "internalProjects");
  const crossCosts = computeProjectCosts(counted, "crossAgencyProjects");
  const systemNameById = new Map(doc.part3.proposedSystems.map((s) => [s.id, s.name] as [string, string]));
  const projects = [
    ...doc.part3.internalProjects.map((p) => ({ p, category: "internal" as const, cost: internalCosts[p.id] ?? 0 })),
    ...doc.part3.crossAgencyProjects.map((p) => ({ p, category: "crossAgency" as const, cost: crossCosts[p.id] ?? 0 })),
  ].map(({ p, category, cost }) => {
    const kpiSet = doc.part3.performanceFramework[p.id];
    const shortTitle = p.title.includes("—") ? p.title.split("—")[0].trim() : p.title;
    return {
      id: p.id,
      title: p.title,
      shortTitle,
      category,
      projectType: p.projectType,
      description: p.description,
      duration: p.duration,
      alignment: p.strategicAlignment,
      harmonization: p.harmonizationFramework,
      linkedSystems: (p.linkedSystemIds ?? []).map((id) => systemNameById.get(id) ?? id),
      implementingUnit: p.implementingUnit,
      fundingSource: p.fundingSource,
      ...(p.leadAgency ? { leadAgency: p.leadAgency } : {}),
      ...(p.implementingAgencies ? { implementingAgencies: p.implementingAgencies } : {}),
      ...(opts.papCodes.get(`${opts.slug}:${p.id}`) ? { papCode: opts.papCodes.get(`${opts.slug}:${p.id}`)! } : {}),
      totalCost: cost,
      deliverables: [p.year1Deliverables, p.year2Deliverables, p.year3Deliverables] as [string, string, string],
      kpis: (kpiSet?.rows ?? []).map((r) => ({
        hierarchy: r.hierarchy,
        indicator: r.indicator,
        baseline: r.baseline,
        targets: [r.year1Target, r.year2Target, r.year3Target] as [string, string, string],
      })),
    };
  });

  const shortNameOf = (name: string) => {
    const head = name.split(/[—–(]/)[0].trim();
    return head.length >= 3 ? head : name.split(" ").slice(0, 3).join(" ");
  };
  const linkedIdsOf = new Map<string, string[]>(
    [...doc.part3.internalProjects, ...doc.part3.crossAgencyProjects].map((dp) => [dp.id, dp.linkedSystemIds ?? []])
  );
  const proposedSystems = doc.part3.proposedSystems.map((s) => {
    const funding = projects.find((p) => (linkedIdsOf.get(p.id) ?? []).includes(s.id));
    return {
      id: s.id,
      name: s.name,
      shortName: shortNameOf(s.name),
      classification: s.classification,
      status: s.status,
      dataStorage: s.dataStorage,
      integrated: s.interoperability.integrated,
      ...(funding ? { fundingProject: funding.shortTitle } : {}),
    };
  });

  const allotmentEntries: CorpusProfile["allotments"]["entries"] = [];
  if (opts.allotFactor) {
    grandTotals.forEach((request, i) => {
      const year = doc.startYear + i;
      if (year <= PRESENT_YEAR) {
        allotmentEntries.push({ year, request, allotment: round500(request * opts.allotFactor!) });
      }
    });
  }

  return {
    slug: opts.slug,
    acronym: doc.agency.acronym,
    name: doc.agency.name,
    type: doc.agency.type,
    websiteUrl: doc.agency.websiteUrl,
    tagline: opts.tagline,
    hero: opts.hero,
    cycle: { startYear: doc.startYear, endYear: doc.endYear },
    cycleLabel: `${doc.startYear}–${doc.endYear}`,
    scope: doc.scope,
    planStatus: doc.planStatus ?? "draft",
    title: doc.title,
    amendmentNumber: doc.amendmentNumber,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    headName: doc.agencyHeadName,
    cio: { name: doc.part1.cioName, position: doc.part1.cioPosition, unit: doc.part1.cioUnit },
    completionPct,
    mandate: doc.part1.mandateFunction,
    vision: doc.part1.visionStatement,
    mission: doc.part1.missionStatement,
    legalBasis: doc.part1.legalBasis,
    identifiers: {
      uacsOrgCode: `0100103${String(10000 + opts.agencyIndex)}`,
      ...(doc.planStatus === "submitted"
        ? { dictEndorsement: { ref: `DICT-GSSPD-${doc.startYear - 1}-${String(opts.agencyIndex + 1).padStart(3, "0")}`, date: `${doc.startYear - 1}-05-${String(8 + opts.agencyIndex).padStart(2, "0")}` } }
        : {}),
    },
    counts: {
      outcomes: doc.part1.orgOutcomes.length,
      programs: doc.part1.orgOutcomes.reduce((s, o) => s + o.programs.length, 0),
      stakeholders: doc.part1.stakeholders.length,
      systems: doc.part2.informationSystems.length,
      proposedSystems: doc.part3.proposedSystems.length,
      internalProjects: doc.part3.internalProjects.length,
      crossAgencyProjects: doc.part3.crossAgencyProjects.length,
      kpis: Object.values(doc.part3.performanceFramework).reduce((s, k) => s + k.rows.length, 0),
      lineItems: allLines.length,
      categorizedLineItems: allLines.filter((l) => l.categoryId !== "").length,
      completeKpis: Object.values(doc.part3.performanceFramework).reduce(
        (s, k) =>
          s +
          k.rows.filter((r) => r.baseline.trim() !== "" && r.year1Target.trim() !== "" && r.year2Target.trim() !== "" && r.year3Target.trim() !== "").length,
        0
      ),
    },
    humanCapital,
    egp: { adopted, total: 9, ...(egp.pnpki.adoptionPercentage !== undefined ? { pnpkiAdoption: egp.pnpki.adoptionPercentage } : {}) },
    outcomes: doc.part1.orgOutcomes.map((o) => ({ name: o.name, programs: o.programs.map((p) => p.name) })),
    systems: doc.part2.informationSystems.map((s) => ({
      name: s.name,
      classification: s.classification,
      frontline: s.frontline,
      frontlineAccessType: s.frontlineAccessType,
      developmentStrategy: s.developmentStrategy,
      dataStorage: s.dataStorage,
      integrated: s.interoperability.integrated,
    })),
    proposedSystems,
    projects,
    budget: {
      yearLabels: [`Year 1 (${doc.startYear})`, `Year 2 (${doc.startYear + 1})`, `Year 3 (${doc.endYear})`],
      b1, b2, b3, b4,
      grandTotals,
      grandTotal,
      totalCo,
      totalMooe,
      byFundSource,
      byCategory,
    },
    lineItems: allLines,
    allotments: {
      fictitious: true,
      note: "Demonstration-only figures. Allotments exist only for fiscal years that have elapsed; later years are pending the GAA.",
      entries: allotmentEntries,
    },
    downloadPath: `/demo/repository/${opts.slug}.issp`,
  };
}

function crossAgencyPrograms(profiles: CorpusProfile[], seedsBySlug: Map<string, AgencySeed>) {
  return Object.values(CROSS_PROGRAMS).map((program) => {
    const participants: CorpusProfile[] = [];
    seedsBySlug.forEach((seed) => {
      if (seed.projects.some((p) => p.cross?.programKey === program.key)) {
        const profile = profiles.find((a) => a.slug === seed.slug);
        if (profile) participants.push(profile);
      }
    });
    const shares = participants.map((a) => ({
      acronym: a.acronym,
      slug: a.slug,
      share: a.projects.find((p) => p.title.includes(program.title.split("—")[0].trim()) || p.title.startsWith(program.title.split(" (")[0]))?.totalCost ?? 0,
    })).filter((s) => s.share > 0);
    return {
      key: program.key,
      title: program.title,
      description: program.description,
      leadAgency: program.leadAgencyName,
      participants: shares.map((s) => s.acronym),
      agencies: shares,
      combinedCost: shares.reduce((s, x) => s + x.share, 0),
      alignment: [...program.alignment],
    };
  }).filter((p) => p.agencies.length > 0);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function buildOutputs() {
  const outDir = path.join(__dirname, "..", "public", "demo", "repository");

  const docs: { doc: IsspDocument; meta: { slug: string; tagline: string; hero: boolean; allotFactor?: number } }[] = SEEDS.map((seed) => ({
    doc: composeDoc(seed),
    meta: { slug: seed.slug, tagline: seed.tagline, hero: seed.hero ?? false, ...(seed.allotFactor ? { allotFactor: seed.allotFactor } : {}) },
  }));
  const ncwtr = loadNcwtr();
  docs.unshift({
    doc: ncwtr,
    meta: { slug: NCWTR_META.slug, tagline: NCWTR_META.tagline, hero: NCWTR_META.hero, allotFactor: NCWTR_META.allotFactor },
  });

  const papCodes = buildPapCodes(docs);
  const profiles = docs.map(({ doc, meta }, i) => deriveProfile(doc, { ...meta, agencyIndex: i, papCodes }));
  const seedsBySlug = new Map(SEEDS.map((s) => [s.slug, s]));

  const byYearMap = new Map<number, number>();
  profiles.forEach((a) => {
    a.budget.grandTotals.forEach((t, i) => {
      const year = a.cycle.startYear + i;
      byYearMap.set(year, (byYearMap.get(year) ?? 0) + t);
    });
  });
  const types: CorpusProfile["type"][] = ["NGA", "GOCC", "LGU", "OTHER"];
  const statuses: CorpusProfile["planStatus"][] = ["submitted", "for_review", "draft"];

  const corpus: RepositoryCorpus = {
    disclaimer:
      "Demonstration corpus. All agencies, officers, programs and figures are fictitious, generated for mockup purposes. No real agency data is included or implied.",
    generatedAt: GENERATED_AT,
    totals: {
      plans: profiles.length,
      agencies: profiles.length,
      grandTotal: profiles.reduce((s, a) => s + a.budget.grandTotal, 0),
      byYear: [...byYearMap.entries()].sort((x, y) => x[0] - y[0]).map(([year, total]) => ({ year, total })),
      byType: types.map((type) => {
        const list = profiles.filter((a) => a.type === type);
        return { type, agencies: list.length, total: list.reduce((s, a) => s + a.budget.grandTotal, 0) };
      }),
      cycles: [...new Set(profiles.map((a) => a.cycleLabel))]
        .sort()
        .map((label) => {
          const list = profiles.filter((a) => a.cycleLabel === label);
          return { label, agencies: list.length, total: list.reduce((s, a) => s + a.budget.grandTotal, 0) };
        }),
      byStatus: statuses.map((status) => ({ status, agencies: profiles.filter((a) => a.planStatus === status).length })),
      crossAgencyCount: 0,
    },
    crossAgencyPrograms: crossAgencyPrograms(profiles, seedsBySlug),
    compass: buildCompass(docs, profiles),
    aiLayer: buildAiLayer(profiles),
    security: { fleetBySlug: FLEET, advisory: ADVISORY },
    procurement: buildProcurement(profiles),
    unitPrices: buildUnitPrices(profiles),
    agencies: profiles,
  };
  corpus.totals.crossAgencyCount = corpus.crossAgencyPrograms.length;

  const outputs: { file: string; content: string }[] = [
    { file: "corpus.json", content: JSON.stringify(corpus, null, 2) + "\n" },
    ...docs.map(({ doc, meta }) => ({ file: `${meta.slug}.issp`, content: JSON.stringify(doc, null, 2) + "\n" })),
  ];

  return { outDir, outputs, corpus };
}

function main() {
  const { outDir, outputs, corpus } = buildOutputs();
  const checkOnly = process.argv.includes("--check");

  if (checkOnly) {
    // Determinism gate: rebuild in memory and compare bytes with what's on disk.
    let clean = true;
    for (const { file, content } of outputs) {
      const p = path.join(outDir, file);
      const onDisk = fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
      if (onDisk !== content) {
        clean = false;
        console.error(`❌ ${file}: differs from a fresh regeneration`);
      }
    }
    if (!clean) process.exit(1);
    console.log("✅ Determinism check passed: corpus regeneration is byte-identical.");
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  outputs.forEach(({ file, content }) => fs.writeFileSync(path.join(outDir, file), content, "utf-8"));
  const ncwtrSrc = path.join(__dirname, "..", "public", "demo", "ncwtr-issp-2026-2028.issp");
  fs.copyFileSync(ncwtrSrc, path.join(outDir, `${NCWTR_META.slug}.issp`));
  console.log("✅ Corpus written to public/demo/repository:");
  outputs.forEach(({ file }) => console.log("   -", file));
  console.log(`   Agencies: ${corpus.totals.agencies} | Grand total: ₱${corpus.totals.grandTotal.toLocaleString("en-PH")}`);
  console.log(`   Cross-agency programs: ${corpus.totals.crossAgencyCount}`);
  const cats = new Set<string>();
  corpus.agencies.forEach((a) => a.lineItems.forEach((l) => cats.add(l.categoryId)));
  console.log(`   Expense categories used: ${cats.size} of ${EXPENSE_CATEGORIES.length}`);
  const funds = new Set<string>();
  corpus.agencies.forEach((a) => a.lineItems.forEach((l) => funds.add(l.fundSource)));
  console.log(`   Fund sources used: ${funds.size} — ${[...funds].join("; ")}`);
}

if (require.main === module) {
  main();
}
