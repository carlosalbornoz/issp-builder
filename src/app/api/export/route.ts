import { renderIsspHtml, type IsspData } from "@/lib/pdf/render-issp-html";
import { generatePdf } from "@/lib/pdf/generate-pdf";
import type {
  IsspDocument,
  IctProject,
  KpiRow,
  PerformanceFramework,
  EgpChecklist,
} from "@/lib/store/types";

// ─── Field mapping helpers ────────────────────────────────────────────────────

function mapStrategicConcerns(
  concerns: IsspDocument["part2"]["strategicConcerns"],
  outcomeMap: Record<string, string>
): IsspData["part2"]["strategicConcerns"] {
  return concerns.map((sc: any) => {
    // Backward compatibility: handle both new outcomeIds and old outcomeId
    const ids = Array.isArray(sc.outcomeIds) && sc.outcomeIds.length > 0 
      ? sc.outcomeIds 
      : (sc.outcomeId ? [sc.outcomeId] : []);
    
    const labels = ids.map((id: string) => outcomeMap[id] ?? id);
    const ooSoMfoText = labels.length > 1 
      ? labels.map((l: string) => `• ${l}`).join("\n") 
      : (labels[0] || "");

    return {
      ooSoMfo: ooSoMfoText,
      criticalSystem: sc.criticalSystem || "",
      problem: sc.concern,
      intendedIctUse: sc.desiredStrategy,
    };
  });
}

const SA_KEYS = ["publicInvestment", "nationalCybersecurity", "eGovMasterPlan", "convergenceBudgeting"] as const;
const HA_KEYS = ["nationalPrioritization", "resourceOptimization", "interoperability", "crossAgency", "scalability"] as const;

function mapProject(proj: IctProject, crossAgency = false): IsspData["part3"]["internalProjects"][number] {
  const saArr = proj.strategicAlignment ?? [];
  const haArr = proj.harmonizationFramework ?? [];

  const strategicAlignment: Record<string, boolean | string> = {
    publicInvestment: saArr.includes("publicInvestment"),
    nationalCybersecurity: saArr.includes("nationalCybersecurity"),
    eGovMasterPlan: saArr.includes("eGovMasterPlan"),
    convergenceBudgeting: saArr.includes("convergenceBudgeting"),
    others: saArr.find((s) => !(SA_KEYS as readonly string[]).includes(s)) ?? "",
  };

  const harmonization: Record<string, boolean> = {
    nationalPrioritization: haArr.includes("nationalPrioritization"),
    resourceOptimization: haArr.includes("resourceOptimization"),
    interoperability: haArr.includes("interoperability"),
    crossAgency: haArr.includes("crossAgency"),
    scalability: haArr.includes("scalability"),
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
    totalProjectCost: proj.totalProjectCost,
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
    kpi: row.indicator,
    baselineData: row.baseline,
    targets: { year1: row.year1Target, year2: row.year2Target, year3: row.year3Target },
    dataCollectionMethod: row.dataCollectionMethod,
    responsibility: row.responsibleUnit,
  };
}

function mapPerformanceFramework(pf: PerformanceFramework): IsspData["part3"]["performanceFramework"] {
  const result: IsspData["part3"]["performanceFramework"] = {};
  for (const [key, entry] of Object.entries(pf)) {
    result[key] = {
      projectTitle: entry.projectTitle,
      projectType: entry.projectCategory,
      rows: entry.rows.map(mapKpiRow),
    };
  }
  return result;
}

function mapEgpChecklist(checklist: EgpChecklist): IsspData["part2"]["egpChecklist"] {
  const result: IsspData["part2"]["egpChecklist"] = {};
  for (const [key, prog] of Object.entries(checklist)) {
    if (!prog) continue;
    const utilizing = prog.status === "utilizing";
    result[key] = { utilizing, proposed: prog.status === "proposed" };
    if (key === "pnpki" && "adoptionPercentage" in prog) {
      result[key].adoptionPercentage = (prog as typeof prog & { adoptionPercentage?: number }).adoptionPercentage ?? 0;
    }
    if (key === "recordsMgmt" || key === "pscp") {
      result[key].exists = utilizing;
    }
  }
  return result;
}

// ─── Document → render data ───────────────────────────────────────────────────

function toRenderData(doc: IsspDocument): IsspData {
  const { agency, part1, part2, part3, part4 } = doc;

  const outcomeMap = Object.fromEntries(part1.orgOutcomes.map((o) => [o.id, o.name]));

  return {
    title: doc.title,
    startYear: doc.startYear,
    endYear: doc.endYear,
    status: "DRAFT",
    scope: doc.scope,
    amendmentNumber: doc.amendmentNumber,

    agency: {
      name: agency.name,
      acronym: agency.acronym,
      type: agency.type,
      websiteUrl: agency.websiteUrl || null,
      logoSrc: agency.logoBase64 || null,
    },

    part1: {
      legalBasis: part1.legalBasis,
      mandateFunction: part1.mandateFunction,
      visionStatement: part1.visionStatement,
      missionStatement: part1.missionStatement,
      orgOutcomes: part1.orgOutcomes.map((o) => ({ name: o.name, programs: o.programs })),
      cioName: part1.cioName,
      cioPosition: part1.cioPosition,
      cioUnit: part1.cioUnit,
      cioEmail: part1.cioEmail,
      cioContact: part1.cioContact,
      focalName: part1.focalName,
      focalPosition: part1.focalPosition,
      focalUnit: part1.focalUnit,
      focalEmail: part1.focalEmail,
      focalContact: part1.focalContact,
      humanCapital: part1.humanCapital,
      stakeholders: part1.stakeholders,
    },

    part2: {
      strategicConcerns: mapStrategicConcerns(part2.strategicConcerns, outcomeMap),
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
        classification: sys.classification,
        frontline: sys.frontline,
        deploymentType: sys.deploymentType || undefined,
        url: sys.url || undefined,
        description: sys.description,
        developmentStrategy: sys.developmentStrategy || undefined,
        developmentPlatform: sys.developmentPlatform || undefined,
        databaseName: sys.databaseName || undefined,
        dataStorage: sys.dataStorage || undefined,
        internalUsers: String(sys.internalUsers ?? ""),
        externalUsers: String(sys.externalUsers ?? ""),
        owner: sys.owner || undefined,
        interoperability: {
          integrated: sys.interoperability.integrated,
          internalSystems: sys.interoperability.internalSystems
            ? [sys.interoperability.internalSystems]
            : [],
          externalSystems: sys.interoperability.externalSystems
            ? [sys.interoperability.externalSystems]
            : [],
          generatesData: sys.interoperability.generatesData,
          processesExternalData: sys.interoperability.processesExternalData,
          sharedPlatform: sys.interoperability.sharedPlatform,
        },
        pia: {
          processesPersonalInfo: sys.pia.processesPersonalInfo,
          piaCompleted: sys.pia.piaCompleted,
        },
      })),
      egpChecklist: mapEgpChecklist(part2.egpChecklist),
    },

    part3: {
      proposedNetworkDesc: part3.proposedNetworkDesc || null,
      proposedCybersecControls: part3.proposedCybersecControls as unknown as IsspData["part3"]["proposedCybersecControls"],
      proposedHumanCapital: part3.proposedHumanCapital.map((r) => ({
        position: r.position,
        employmentStatus: r.employmentStatus,
        physicalCount: r.quantity,
      })),
      proposedSystems: part3.proposedSystems.map((sys) => ({
        name: sys.name,
        classification: sys.classification,
        frontline: sys.frontline,
        deploymentType: sys.deploymentType || undefined,
        description: sys.enhancementDetails || "",
        developmentStrategy: sys.developmentStrategy || undefined,
        developmentPlatform: sys.developmentPlatform || undefined,
        databaseName: sys.databaseName || undefined,
        dataStorage: sys.dataStorage || undefined,
        internalUsers: String(sys.internalUsers ?? ""),
        externalUsers: String(sys.externalUsers ?? ""),
        owner: sys.owner || undefined,
        interoperability: {
          integrated: sys.interoperability.integrated,
          internalSystems: sys.interoperability.internalSystems
            ? [sys.interoperability.internalSystems]
            : [],
          externalSystems: sys.interoperability.externalSystems
            ? [sys.interoperability.externalSystems]
            : [],
        },
        pia: {
          processesPersonalInfo: sys.pia.processesPersonalInfo,
          piaCompleted: sys.pia.piaRequired ?? null,
        },
        status: sys.status || undefined,
      })),
      internalProjects: part3.internalProjects.map((p) => mapProject(p, false)),
      crossAgencyProjects: part3.crossAgencyProjects.map((p) => mapProject(p, true)),
      performanceFramework: mapPerformanceFramework(part3.performanceFramework),
    },

    part4: {
      year1: part4.year1,
      year2: part4.year2,
      year3: part4.year3,
    },
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let doc: IsspDocument;
  try {
    doc = (await req.json()) as IsspDocument;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!doc?.agency?.acronym || !doc?.startYear || !doc?.endYear) {
    return Response.json({ error: "Invalid ISSP document" }, { status: 400 });
  }

  const issp = toRenderData(doc);
  const html = renderIsspHtml(issp);
  const pdf = await generatePdf(html, {
    agencyAcronym: doc.agency.acronym,
    agencyName: doc.agency.name,
    logoSrc: doc.agency.logoBase64 || null,
    startYear: doc.startYear,
    endYear: doc.endYear,
  });

  const filename = `${doc.agency.acronym}-ISSP-${doc.startYear}-${doc.endYear}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
    },
  });
}
