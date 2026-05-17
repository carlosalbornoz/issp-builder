import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part4Summary, Part4SummaryData, SummaryRow, UacsRow } from "@/components/issp-editor/part4/part4-summary";
import type { YearBudget, LineItem, ProjectBudget } from "@/components/issp-editor/part4/part4-year-form";

// ─── Aggregation helpers ───────────────────────────────────────────────────────

function lineTotal(l: LineItem) {
  return (l.qty ?? 0) * (l.unitCost ?? 0);
}

function sumLines(lines: LineItem[]) {
  return lines.reduce((s, l) => s + lineTotal(l), 0);
}

function yearTotal(y: YearBudget): number {
  const opTotal = sumLines(y.officeProductivity.capitalOutlay) + sumLines(y.officeProductivity.mooe);
  const intTotal = Object.values(y.internalProjects).reduce(
    (s, p) => s + sumLines(p.capitalOutlay) + sumLines(p.mooe),
    0
  );
  const crossTotal = Object.values(y.crossAgencyProjects).reduce(
    (s, p) => s + sumLines(p.capitalOutlay) + sumLines(p.mooe),
    0
  );
  const ccTotal = sumLines(y.continuingCosts.mooe);
  return opTotal + intTotal + crossTotal + ccTotal;
}

function allLines(y: YearBudget): LineItem[] {
  const lines: LineItem[] = [
    ...y.officeProductivity.capitalOutlay,
    ...y.officeProductivity.mooe,
    ...y.continuingCosts.mooe,
  ];
  for (const p of Object.values(y.internalProjects)) {
    lines.push(...p.capitalOutlay, ...p.mooe);
  }
  for (const p of Object.values(y.crossAgencyProjects)) {
    lines.push(...p.capitalOutlay, ...p.mooe);
  }
  return lines;
}

function allCoLines(y: YearBudget): LineItem[] {
  const lines: LineItem[] = [...y.officeProductivity.capitalOutlay];
  for (const p of Object.values(y.internalProjects)) lines.push(...p.capitalOutlay);
  for (const p of Object.values(y.crossAgencyProjects)) lines.push(...p.capitalOutlay);
  return lines;
}

function allMooeLines(y: YearBudget): LineItem[] {
  const lines: LineItem[] = [
    ...y.officeProductivity.mooe,
    ...y.continuingCosts.mooe,
  ];
  for (const p of Object.values(y.internalProjects)) lines.push(...p.mooe);
  for (const p of Object.values(y.crossAgencyProjects)) lines.push(...p.mooe);
  return lines;
}

function categoryTotals(y: YearBudget) {
  const projects = (projects: Record<string, ProjectBudget>) =>
    Object.values(projects).reduce((s, p) => s + sumLines(p.capitalOutlay) + sumLines(p.mooe), 0);

  return {
    officeProductivity: sumLines(y.officeProductivity.capitalOutlay) + sumLines(y.officeProductivity.mooe),
    internalProjects: projects(y.internalProjects),
    crossAgencyProjects: projects(y.crossAgencyProjects),
    continuingCosts: sumLines(y.continuingCosts.mooe),
  };
}

// ─── Build B.1 General Summary ────────────────────────────────────────────────

function buildB1(years: [YearBudget, YearBudget, YearBudget]): SummaryRow[] {
  const cats = years.map(categoryTotals);
  const fields: (keyof ReturnType<typeof categoryTotals>)[] = [
    "officeProductivity",
    "internalProjects",
    "crossAgencyProjects",
    "continuingCosts",
  ];
  const labels: Record<string, string> = {
    officeProductivity: "Office Productivity",
    internalProjects: "Internal ICT Projects",
    crossAgencyProjects: "Cross-Agency ICT Projects",
    continuingCosts: "Continuing Costs / Expenses",
  };

  const rows: SummaryRow[] = fields.map((f) => ({
    label: labels[f],
    year1: cats[0][f],
    year2: cats[1][f],
    year3: cats[2][f],
    total: cats[0][f] + cats[1][f] + cats[2][f],
  }));

  const totals = years.map(yearTotal);
  rows.push({
    label: "Grand Total",
    year1: totals[0],
    year2: totals[1],
    year3: totals[2],
    total: totals[0] + totals[1] + totals[2],
    isTotal: true,
  });

  return rows;
}

// ─── Build B.2 By Fund Source ─────────────────────────────────────────────────

const FUND_SOURCE_ORDER = [
  "General Appropriations Act (GAA)",
  "Foreign-Assisted",
  "Locally Funded",
  "Other Income Generating Sources",
];

function buildB2(years: [YearBudget, YearBudget, YearBudget]): SummaryRow[] {
  const map: Record<string, [number, number, number]> = {};

  years.forEach((y, yi) => {
    for (const l of allLines(y)) {
      const fs = l.fundSource || "Unspecified";
      if (!map[fs]) map[fs] = [0, 0, 0];
      map[fs][yi] += lineTotal(l);
    }
  });

  // Sort by canonical order first, then alphabetically for any others
  const keys = Object.keys(map).sort((a, b) => {
    const ai = FUND_SOURCE_ORDER.indexOf(a);
    const bi = FUND_SOURCE_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  const rows: SummaryRow[] = keys.map((fs) => ({
    label: fs,
    year1: map[fs][0],
    year2: map[fs][1],
    year3: map[fs][2],
    total: map[fs][0] + map[fs][1] + map[fs][2],
  }));

  const totals = years.map(yearTotal);
  rows.push({
    label: "Grand Total",
    year1: totals[0],
    year2: totals[1],
    year3: totals[2],
    total: totals[0] + totals[1] + totals[2],
    isTotal: true,
  });

  return rows;
}

// ─── Build B.3 Statement of Expenditure ───────────────────────────────────────

function buildB3(years: [YearBudget, YearBudget, YearBudget]): SummaryRow[] {
  const coTotals = years.map((y) => sumLines(allCoLines(y)));
  const mooeTotals = years.map((y) => sumLines(allMooeLines(y)));
  const grandTotals = years.map(yearTotal);

  return [
    {
      label: "Capital Outlay (CO)",
      year1: coTotals[0],
      year2: coTotals[1],
      year3: coTotals[2],
      total: coTotals.reduce((s, v) => s + v, 0),
    },
    {
      label: "Maintenance and Other Operating Expenses (MOOE)",
      year1: mooeTotals[0],
      year2: mooeTotals[1],
      year3: mooeTotals[2],
      total: mooeTotals.reduce((s, v) => s + v, 0),
    },
    {
      label: "Grand Total",
      year1: grandTotals[0],
      year2: grandTotals[1],
      year3: grandTotals[2],
      total: grandTotals.reduce((s, v) => s + v, 0),
      isTotal: true,
    },
  ];
}

// ─── Build B.4 Object of Expenditure by UACS ─────────────────────────────────

function buildB4(years: [YearBudget, YearBudget, YearBudget]): UacsRow[] {
  const map: Record<string, { label: string; amounts: [number, number, number] }> = {};

  years.forEach((y, yi) => {
    for (const l of allLines(y)) {
      if (!l.uacsCode) continue;
      if (!map[l.uacsCode]) map[l.uacsCode] = { label: l.uacsLabel || l.uacsCode, amounts: [0, 0, 0] };
      map[l.uacsCode].amounts[yi] += lineTotal(l);
      // Keep the most descriptive label we've seen
      if (!map[l.uacsCode].label && l.uacsLabel) map[l.uacsCode].label = l.uacsLabel;
    }
  });

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, { label, amounts }]) => ({
      uacsCode: code,
      uacsLabel: label,
      year1: amounts[0],
      year2: amounts[1],
      year3: amounts[2],
      total: amounts[0] + amounts[1] + amounts[2],
    }));
}

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

  return <Part4Summary docId={id} data={data} />;
}
