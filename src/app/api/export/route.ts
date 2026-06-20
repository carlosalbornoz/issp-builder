import { renderContentHtml, renderFrontMatterHtml, renderAnnex1Html, type IsspData } from "@/lib/pdf/render-issp-html";
import { generatePdf } from "@/lib/pdf/generate-pdf";
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
} from "@/lib/store/types";

// ─── Field mapping helpers ────────────────────────────────────────────────────

function mapStrategicConcerns(
  concerns: IsspDocument["part2"]["strategicConcerns"],
  outcomeMap: Record<string, string>
): IsspData["part2"]["strategicConcerns"] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function mapEgpChecklist(checklist: EgpChecklist): IsspData["part2"]["egpChecklist"] {
  const result: IsspData["part2"]["egpChecklist"] = {};
  for (const [key, prog] of Object.entries(checklist)) {
    if (!prog) continue;
    const p = prog as EgpChecklist["onlinePortal"] & { adoptionPercentage?: number };
    result[key] = {
      status: p.status ?? "",
      url: p.url,
      equivalentName: p.equivalentName,
      equivalentUrl: p.equivalentUrl,
      notes: p.notes,
      adoptionPercentage: p.adoptionPercentage,
      channels: p.channels,
      ifNo: p.ifNo,
      mechanisms: p.mechanisms,
      connectedToPortal: p.connectedToPortal,
    };
  }
  return result;
}

// ─── Document → render data ───────────────────────────────────────────────────

function toRenderData(doc: IsspDocument): IsspData {
  const { agency, part1, part2, part3, part4 } = doc;

  const outcomeMap = Object.fromEntries(part1.orgOutcomes.map((o) => [o.id, o.name]));
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
      orgOutcomes: part1.orgOutcomes.map((o) => ({ name: o.name, programs: o.programs })),
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
        classification: labelFor(CLASSIFICATION_LABELS, sys.classification),
        frontline: sys.frontline,
        deploymentType: labelFor(FRONTLINE_ACCESS_LABELS, sys.deploymentType) || undefined,
        url: sys.url || undefined,
        description: sys.description,
        developmentStrategy: labelFor(DEV_STRATEGY_LABELS, sys.developmentStrategy) || undefined,
        developmentPlatform: sys.developmentPlatform || undefined,
        databaseName: sys.databaseName || undefined,
        dataStorage: labelFor(DATA_STORAGE_LABELS, sys.dataStorage) || undefined,
        internalUsers: sys.internalUsers ?? "",
        externalUsers: sys.externalUsers ?? "",
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
        deploymentType: labelFor(FRONTLINE_ACCESS_LABELS, sys.deploymentType) || undefined,
        description: sys.description || sys.enhancementDetails || "",
        developmentStrategy: labelFor(DEV_STRATEGY_LABELS, sys.developmentStrategy) || undefined,
        developmentPlatform: sys.developmentPlatform || undefined,
        databaseName: sys.databaseName || undefined,
        dataStorage: labelFor(DATA_STORAGE_LABELS, sys.dataStorage) || undefined,
        internalUsers: sys.internalUsers ?? "",
        externalUsers: sys.externalUsers ?? "",
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
          piaCompleted: sys.pia.piaRequired ?? null,
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
  // Front matter and content are printed separately: the agency header and
  // page numbering start at Part I. Pass 1 of the content carries invisible
  // TOC markers; the scanned pages feed both the final content and the TOC.
  const pdf = await generatePdf(
    {
      contentHtml: renderContentHtml(issp, { withTocMarkers: true }),
      finalizeContentHtml: () => renderContentHtml(issp),
      frontHtml: (tocPages) => renderFrontMatterHtml(issp, tocPages),
      annex1Html: renderAnnex1Html(doc.title, doc.annexedOffices ?? []),
    },
    {
      agencyAcronym: doc.agency.acronym,
      agencyName: doc.agency.name,
      logoSrc: doc.agency.logoBase64 || null,
      startYear: doc.startYear,
      endYear: doc.endYear,
    }
  );

  const safeAcronym = (doc.agency.acronym ?? "AGENCY").replace(/[^\w\-]/g, "_");
  const filename = `${safeAcronym}-ISSP-${doc.startYear}-${doc.endYear}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
    },
  });
}
