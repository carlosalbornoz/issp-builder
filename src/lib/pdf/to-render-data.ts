/**
 * IsspDocument → IsspData: exactly what the PDF prints. Lives outside the
 * export route (a route module may only export its handlers) so verify scripts
 * can render a document without the server.
 */
import type { IsspData } from "@/lib/pdf/render-issp-html";
import { visibleEgpProgram, visibleEnhancementDetails, visibleInteroperability, visiblePiaCompleted } from "@/lib/visible-values";
import { computeProjectCosts } from "@/components/issp-editor/part4/part4-aggregations";
import {
  CLASSIFICATION_LABELS,
  DEV_STRATEGY_LABELS,
  DATA_STORAGE_LABELS,
  FRONTLINE_ACCESS_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  PROPOSED_STATUS_LABELS,
  labelFor,
} from "@/lib/issp-labels";
import type {
  IsspDocument,
  IctProject,
  KpiRow,
  PerformanceFramework,
  EgpChecklist,
  InformationSystem,
  Program,
  ProposedSystem,
} from "@/lib/store/types";

// ─── Field mapping helpers ────────────────────────────────────────────────────

const NBSP = "    ";

function mapStrategicConcerns(
  concerns: IsspDocument["part2"]["strategicConcerns"],
  outcomeMap: Record<string, string>,
  programsByOutcome: Record<string, { id: string; name: string }[]>
): IsspData["part2"]["strategicConcerns"] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return concerns.map((sc: any) => {
    // "general" is no longer storable; docs that still carry it (and untagged
    // concerns) render the official "General / Agency-Wide" label below.
    const ids = (
      Array.isArray(sc.outcomeIds) && sc.outcomeIds.length > 0
        ? sc.outcomeIds
        : (sc.outcomeId ? [sc.outcomeId] : [])
    ).filter((id: string) => id !== "general");

    const blocks = ids.map((id: string) => {
      const name = outcomeMap[id] ?? id;
      const progs = programsByOutcome[id] ?? [];
      // Numbering = position in the outcome's FULL program list (matches Part I-A.4)
      const lines = progs
        .map((p, i) => ({ p, n: i + 1 }))
        .filter(({ p }) => (sc.programIds ?? []).includes(p.id))
        .map(({ p, n }) => `${NBSP}Program ${n}: ${p.name}`);
      return [name, ...lines].join("\n");
    });

    const ooSoMfoText = blocks.length > 1
      ? blocks.map((b: string) => `• ${b}`).join("\n")
      : (blocks[0] || "General / Agency-Wide");

    return {
      ooSoMfo: ooSoMfoText,
      criticalSystem: sc.criticalSystem || "",
      problem: sc.concern,
      intendedIctUse: sc.desiredStrategy,
    };
  });
}

const SA_KNOWN = [
  "Public Investment Program",
  "National Cybersecurity Plan",
  "E-Government Master Plan",
  "Program Convergence Budgeting",
] as const;

function mapProject(proj: IctProject, crossAgency: boolean, totalProjectCost: number): IsspData["part3"]["internalProjects"][number] {
  const saArr = proj.strategicAlignment ?? [];
  const haArr = proj.harmonizationFramework ?? [];

  const strategicAlignment: Record<string, boolean | string> = {
    publicInvestment: saArr.includes("Public Investment Program"),
    nationalCybersecurity: saArr.includes("National Cybersecurity Plan"),
    eGovMasterPlan: saArr.includes("E-Government Master Plan"),
    convergenceBudgeting: saArr.includes("Program Convergence Budgeting"),
    // "Others" is a checkbox sentinel; any other unknown string is the specify-text
    others: saArr.find((s) => !(SA_KNOWN as readonly string[]).includes(s) && s !== "Others") ?? "",
    othersChecked: saArr.includes("Others"),
  };

  const harmonization: Record<string, boolean> = {
    nationalPrioritization: haArr.includes("National Prioritization"),
    resourceOptimization: haArr.includes("Resource Optimization"),
    interoperability: haArr.includes("Interoperability Framework"),
    crossAgency: haArr.includes("Cross-Agency Collaboration"),
    scalability: haArr.includes("Scalability and Sustainability"),
  };

  return {
    id: proj.id,
    title: proj.title,
    description: proj.description,
    objectives: proj.objectives,
    projectType: proj.projectType || undefined,
    linkedSystemIds: proj.linkedSystemIds,
    strategicAlignment,
    harmonization,
    duration: proj.duration,
    year1Deliverables: proj.year1Deliverables,
    year2Deliverables: proj.year2Deliverables,
    year3Deliverables: proj.year3Deliverables,
    implementingUnit: proj.implementingUnit,
    totalProjectCost,
    fundingSource: proj.fundingSource,
    ...(crossAgency && {
      leadAgency: proj.leadAgency,
      implementingAgency: proj.implementingAgencies,
    }),
  };
}

function mapKpiRow(row: KpiRow) {
  return {
    hierarchy: row.hierarchy,
    targetedResult: row.targetedResult ?? "",
    kpi: row.indicator,
    baselineData: row.baseline,
    targets: { year1: row.year1Target, year2: row.year2Target, year3: row.year3Target },
    dataCollectionMethod: row.dataCollectionMethod,
    responsibility: row.responsibleUnit,
  };
}

function mapPerformanceFramework(
  pf: PerformanceFramework,
  titleById: Map<string, string>
): IsspData["part3"]["performanceFramework"] {
  const result: IsspData["part3"]["performanceFramework"] = {};
  for (const [key, entry] of Object.entries(pf)) {
    result[key] = {
      // Stored titles are a point-in-time copy; the live project title (by id) wins
      projectTitle: titleById.get(key) ?? entry.projectTitle,
      projectType: entry.projectCategory,
      rows: entry.rows.map(mapKpiRow),
    };
  }
  return result;
}

function mapEgpChecklist(checklist: EgpChecklist, agencyType: string): IsspData["part2"]["egpChecklist"] {
  const result: IsspData["part2"]["egpChecklist"] = {};
  for (const [key, prog] of Object.entries(checklist)) {
    if (!prog) continue;
    // Only what the II-D form shows for the row's answer (see visible-values.ts)
    const p = visibleEgpProgram(key, prog as EgpChecklist["onlinePortal"] & { adoptionPercentage?: number }, agencyType);
    result[key] = {
      status: p.status ?? "",
      url: p.url,
      equivalentName: p.equivalentName,
      equivalentUrl: p.equivalentUrl,
      adoptionPercentage: p.adoptionPercentage,
      channels: p.channels,
      ifNo: p.ifNo,
      mechanisms: p.mechanisms,
      connectedToPortal: p.connectedToPortal,
    };
  }
  return result;
}

/** II-C / III-D interoperability; the system names print only under "Integration". */
function mapInteroperability(raw: InformationSystem["interoperability"]): IsspData["part2"]["informationSystems"][number]["interoperability"] {
  const i = visibleInteroperability(raw);
  return {
    integrated: i.integrated,
    internalSystems: i.internalSystems ? [i.internalSystems] : [],
    externalSystems: i.externalSystems ? [i.externalSystems] : [],
    generatesData: i.generatesData,
    processesExternalData: i.processesExternalData,
    sharedPlatform: i.sharedPlatform,
  };
}

/**
 * III-D Description & Purpose. The template asks an IS that will be enhanced to
 * "indicate the enhancement to be done" here, so For Enhancement systems append
 * their Enhancement Details; no other status prints them.
 */
function proposedDescription(sys: ProposedSystem): string {
  const enhancement = visibleEnhancementDetails(sys).trim();
  if (!enhancement) return sys.description;
  return sys.description.trim()
    ? `${sys.description}\n\nEnhancement to be done: ${enhancement}`
    : `Enhancement to be done: ${enhancement}`;
}

// ─── Document → render data ───────────────────────────────────────────────────

export function toRenderData(doc: IsspDocument): IsspData {
  const { agency, part1, part2, part3, part4 } = doc;

  const outcomeMap = Object.fromEntries(part1.orgOutcomes.map((o) => [o.id, o.name]));
  const programsByOutcome = Object.fromEntries(
    part1.orgOutcomes.map((o) => [o.id, o.programs])
  );
  const projectTitleById = new Map<string, string>(
    [...part3.internalProjects, ...part3.crossAgencyProjects].map((p) => [p.id, p.title])
  );
  // Total project cost is derived from Part IV resource requirements, never stored
  const internalCosts = computeProjectCosts(part4, "internalProjects");
  const crossAgencyCosts = computeProjectCosts(part4, "crossAgencyProjects");
  // "Concurrently held by CIO" — derive focal fields from CIO so they can't go stale
  const focal = part1.focalSameAsCio
    ? { name: part1.cioName, position: part1.cioPosition, unit: part1.cioUnit, email: part1.cioEmail, contact: part1.cioContact }
    : { name: part1.focalName, position: part1.focalPosition, unit: part1.focalUnit, email: part1.focalEmail, contact: part1.focalContact };

  return {
    title: doc.title,
    startYear: doc.startYear,
    endYear: doc.endYear,
    status: "DRAFT",
    scope: doc.scope,
    amendmentNumber: doc.amendmentNumber,
    agencyHeadName: doc.agencyHeadName ?? "",

    agency: {
      name: agency.name,
      acronym: agency.acronym,
      type: agency.type,
      websiteUrl: agency.websiteUrl || null,
      logoSrc: agency.logoBase64 || null,
    },

    definitions: doc.definitions?.map((d) => ({ term: d.term, definition: d.definition })),

    part1: {
      legalBasis: part1.legalBasis,
      mandateFunction: part1.mandateFunction,
      visionStatement: part1.visionStatement,
      missionStatement: part1.missionStatement,
      // Legacy v11 docs POSTed straight to the API still carry programs as
      // plain strings. Normalize with the same deterministic id formula the
      // migration uses, so I-A.4 names render and the ids match a later
      // in-app load of the same file.
      orgOutcomes: part1.orgOutcomes.map((o) => ({
        id: o.id,
        name: o.name,
        programs: (o.programs ?? []).map((pg: string | Program, i: number) =>
          typeof pg === "string" ? { id: `${o.id}-pg-${i + 1}`, name: pg } : pg
        ),
      })),
      cioName: part1.cioName,
      cioPosition: part1.cioPosition,
      cioUnit: part1.cioUnit,
      cioEmail: part1.cioEmail,
      cioContact: part1.cioContact,
      focalName: focal.name,
      focalPosition: focal.position,
      focalUnit: focal.unit,
      focalEmail: focal.email,
      focalContact: focal.contact,
      humanCapital: part1.humanCapital,
      stakeholders: part1.stakeholders,
    },

    part2: {
      strategicConcerns: mapStrategicConcerns(part2.strategicConcerns, outcomeMap, programsByOutcome),
      networkDiagrams: part2.networkDiagrams.map((d) => ({
        id: d.id,
        path: d.dataUrl,
        title: d.title,
      })),
      networkDescription: part2.networkDescription || null,
      // CyberControls shape is compatible at runtime — same key names
      cybersecurityControls: part2.cybersecurityControls as unknown as IsspData["part2"]["cybersecurityControls"],
      informationSystems: part2.informationSystems.map((sys) => ({
        name: sys.name,
        classification: labelFor(CLASSIFICATION_LABELS, sys.classification),
        frontline: sys.frontline,
        frontlineAccessType: labelFor(FRONTLINE_ACCESS_LABELS, sys.frontlineAccessType) || undefined,
        url: sys.url || undefined,
        description: sys.description,
        developmentStrategy: labelFor(DEV_STRATEGY_LABELS, sys.developmentStrategy) || undefined,
        developmentPlatform: sys.developmentPlatform || undefined,
        databaseName: sys.databaseName || undefined,
        dataStorage: labelFor(DATA_STORAGE_LABELS, sys.dataStorage) || undefined,
        internalUsers: sys.internalUsers ?? "",
        externalUsers: sys.externalUsers ?? "",
        owner: sys.owner || undefined,
        interoperability: mapInteroperability(sys.interoperability),
        pia: {
          processesPersonalInfo: sys.pia.processesPersonalInfo,
          piaCompleted: visiblePiaCompleted(sys.pia),
        },
      })),
      egpChecklist: mapEgpChecklist(part2.egpChecklist, agency.type),
    },

    part3: {
      proposedNetworkDataUrl: part3.proposedNetworkDataUrl,
      proposedNetworkDesc: part3.proposedNetworkDesc || null,
      proposedCybersecControls: part3.proposedCybersecControls as unknown as IsspData["part3"]["proposedCybersecControls"],
      enterpriseArchDataUrl: part3.enterpriseArchDataUrl,
      proposedHumanCapital: part3.proposedHumanCapital.map((r) => ({
        position: r.position,
        employmentStatus: labelFor(EMPLOYMENT_STATUS_LABELS, r.employmentStatus),
        physicalCount: r.quantity,
      })),
      proposedSystems: part3.proposedSystems.map((sys) => ({
        name: sys.name,
        classification: labelFor(CLASSIFICATION_LABELS, sys.classification),
        frontline: sys.frontline,
        frontlineAccessType: labelFor(FRONTLINE_ACCESS_LABELS, sys.frontlineAccessType) || undefined,
        url: sys.url || undefined,
        description: proposedDescription(sys),
        developmentStrategy: labelFor(DEV_STRATEGY_LABELS, sys.developmentStrategy) || undefined,
        developmentPlatform: sys.developmentPlatform || undefined,
        databaseName: sys.databaseName || undefined,
        dataStorage: labelFor(DATA_STORAGE_LABELS, sys.dataStorage) || undefined,
        internalUsers: sys.internalUsers ?? "",
        externalUsers: sys.externalUsers ?? "",
        owner: sys.owner || undefined,
        interoperability: mapInteroperability(sys.interoperability),
        pia: {
          processesPersonalInfo: sys.pia.processesPersonalInfo,
        },
        status: labelFor(PROPOSED_STATUS_LABELS, sys.status) || undefined,
      })),
      internalProjects: part3.internalProjects.map((p) => mapProject(p, false, internalCosts[p.id] ?? 0)),
      crossAgencyProjects: part3.crossAgencyProjects.map((p) => mapProject(p, true, crossAgencyCosts[p.id] ?? 0)),
      performanceFramework: mapPerformanceFramework(part3.performanceFramework, projectTitleById),
    },

    part4: {
      year1: part4.year1,
      year2: part4.year2,
      year3: part4.year3,
    },
  };
}
