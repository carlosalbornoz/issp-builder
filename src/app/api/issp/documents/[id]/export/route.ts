import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderIsspHtml, type IsspData } from "@/lib/pdf/render-issp-html";
import { generatePdf } from "@/lib/pdf/generate-pdf";

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function emptyCyber() {
  return { physical: {}, perimeter: {}, network: {}, endpoint: {}, data: {}, application: {}, other: {} };
}

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { agency: true, part1: true, part2: true, part3: true, part4: true },
  });

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const p1 = doc.part1;
  const p2 = doc.part2;
  const p3 = doc.part3;
  const p4 = doc.part4;

  const issp: IsspData = {
    title: doc.title,
    startYear: doc.startYear,
    endYear: doc.endYear,
    status: doc.status,
    scope: doc.scope,
    amendmentNumber: doc.amendmentNumber,
    agencyHeadName: "",

    agency: {
      name: doc.agency.name,
      acronym: doc.agency.acronym,
      type: doc.agency.type,
      websiteUrl: doc.agency.websiteUrl ?? null,
    },

    part1: {
      legalBasis: p1?.legalBasis ?? "",
      mandateFunction: p1?.mandateFunction ?? "",
      visionStatement: p1?.visionStatement ?? "",
      missionStatement: p1?.missionStatement ?? "",
      orgOutcomes: parseJson(p1?.orgOutcomes, []),
      cioName: p1?.cioName ?? "",
      cioPosition: p1?.cioPosition ?? "",
      cioUnit: p1?.cioUnit ?? "",
      cioEmail: p1?.cioEmail ?? "",
      cioContact: p1?.cioContact ?? "",
      focalName: p1?.focalName ?? "",
      focalPosition: p1?.focalPosition ?? "",
      focalUnit: p1?.focalUnit ?? "",
      focalEmail: p1?.focalEmail ?? "",
      focalContact: p1?.focalContact ?? "",
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
      proposedNetworkDesc: p3?.proposedNetworkDesc ?? null,
      proposedCybersecControls: parseJson(p3?.proposedCybersecControls, emptyCyber()),
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

  // Resolve agency logo as base64 data URI for both the running header and the cover page
  let logoSrc: string | null = null;
  if (doc.agency.logoPath) {
    const logoAbsPath = path.join(process.cwd(), "public", doc.agency.logoPath.replace(/^\//, ""));
    if (fs.existsSync(logoAbsPath)) {
      const ext = path.extname(logoAbsPath).slice(1).toLowerCase();
      const mime = ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : "image/jpeg";
      const data = fs.readFileSync(logoAbsPath).toString("base64");
      logoSrc = `data:${mime};base64,${data}`;
    }
  }

  // Attach logoSrc to agency so renderIsspHtml can embed it in the cover page
  issp.agency.logoSrc = logoSrc;

  const html = renderIsspHtml(issp);
  const pdf = await generatePdf(html, {
    agencyAcronym: doc.agency.acronym,
    agencyName: doc.agency.name,
    logoSrc,
    startYear: doc.startYear,
    endYear: doc.endYear,
  });

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
