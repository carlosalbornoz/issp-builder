import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part4Summary } from "@/components/issp-editor/part4/part4-summary";
import type { Part4SummaryData } from "@/components/issp-editor/part4/part4-aggregations";
import { buildB1, buildB2, buildB3, buildB4, yearTotal } from "@/components/issp-editor/part4/part4-aggregations";
import type { YearBudget } from "@/components/issp-editor/part4/part4-year-form";

// ─── Page ──────────────────────────────────────────────────────────────────────

const EMPTY_YEAR: YearBudget = {
  officeProductivity: { capitalOutlay: [], mooe: [] },
  internalProjects: {},
  crossAgencyProjects: {},
  continuingCosts: { mooe: [] },
};

function parseYear(raw: string | null | undefined): YearBudget {
  if (!raw) return EMPTY_YEAR;
  try {
    const p = JSON.parse(raw) as Partial<YearBudget>;
    return {
      officeProductivity: {
        capitalOutlay: p.officeProductivity?.capitalOutlay ?? [],
        mooe: p.officeProductivity?.mooe ?? [],
      },
      internalProjects: p.internalProjects ?? {},
      crossAgencyProjects: p.crossAgencyProjects ?? {},
      continuingCosts: { mooe: p.continuingCosts?.mooe ?? [] },
    };
  } catch {
    return EMPTY_YEAR;
  }
}

export default async function Part4SummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    select: { startYear: true, endYear: true, part4: true },
  });

  if (!doc) notFound();

  const y1 = parseYear(doc.part4?.year1);
  const y2 = parseYear(doc.part4?.year2);
  const y3 = parseYear(doc.part4?.year3);
  const years: [YearBudget, YearBudget, YearBudget] = [y1, y2, y3];

  const yearLabels: [string, string, string] = [
    `Year 1 (${doc.startYear})`,
    `Year 2 (${doc.startYear + 1})`,
    `Year 3 (${doc.endYear})`,
  ];

  const data: Part4SummaryData = {
    yearLabels,
    b1: buildB1(years),
    b2: buildB2(years),
    b3: buildB3(years),
    b4: buildB4(years),
    grandTotals: years.map(yearTotal) as [number, number, number],
  };

  return <Part4Summary data={data} />;
}
