import type { YearBudget, LineItem, ProjectBudget } from "./part4-year-form";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SummaryRow {
  label: string;
  year1: number;
  year2: number;
  year3: number;
  total: number;
  isTotal?: boolean;
}

export interface UacsRow {
  uacsCode: string;
  uacsLabel: string;
  year1: number;
  year2: number;
  year3: number;
  total: number;
}

export interface Part4SummaryData {
  yearLabels: [string, string, string];
  b1: SummaryRow[];
  b2: SummaryRow[];
  b3: SummaryRow[];
  b4: UacsRow[];
  grandTotals: [number, number, number];
}

// ─── Low-level helpers ─────────────────────────────────────────────────────────

export function lineTotal(l: LineItem) {
  return (l.qty ?? 0) * (l.unitCost ?? 0);
}

export function sumLines(lines: LineItem[]) {
  return lines.reduce((s, l) => s + lineTotal(l), 0);
}

export function yearTotal(y: YearBudget): number {
  const opTotal = sumLines(y.officeProductivity.capitalOutlay) + sumLines(y.officeProductivity.mooe);
  const intTotal = Object.values(y.internalProjects).reduce(
    (s, p) => s + sumLines(p.capitalOutlay) + sumLines(p.mooe), 0
  );
  const crossTotal = Object.values(y.crossAgencyProjects).reduce(
    (s, p) => s + sumLines(p.capitalOutlay) + sumLines(p.mooe), 0
  );
  return opTotal + intTotal + crossTotal + sumLines(y.continuingCosts.mooe);
}

/**
 * Total cost per project id across all three years (CO + MOOE).
 * Part III-E displays and the PDF export derive Total Project Cost from this —
 * it is never stored on the project itself.
 */
export function computeProjectCosts(
  part4: { year1: YearBudget; year2: YearBudget; year3: YearBudget },
  kind: "internalProjects" | "crossAgencyProjects"
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const year of [part4.year1, part4.year2, part4.year3]) {
    for (const [projectId, budget] of Object.entries(year?.[kind] ?? {})) {
      totals[projectId] =
        (totals[projectId] ?? 0) + sumLines(budget.capitalOutlay ?? []) + sumLines(budget.mooe ?? []);
    }
  }
  return totals;
}

function allLines(y: YearBudget): LineItem[] {
  const lines: LineItem[] = [
    ...y.officeProductivity.capitalOutlay,
    ...y.officeProductivity.mooe,
    ...y.continuingCosts.mooe,
  ];
  for (const p of Object.values(y.internalProjects)) lines.push(...p.capitalOutlay, ...p.mooe);
  for (const p of Object.values(y.crossAgencyProjects)) lines.push(...p.capitalOutlay, ...p.mooe);
  return lines;
}

function allCoLines(y: YearBudget): LineItem[] {
  const lines: LineItem[] = [...y.officeProductivity.capitalOutlay];
  for (const p of Object.values(y.internalProjects)) lines.push(...p.capitalOutlay);
  for (const p of Object.values(y.crossAgencyProjects)) lines.push(...p.capitalOutlay);
  return lines;
}

function allMooeLines(y: YearBudget): LineItem[] {
  const lines: LineItem[] = [...y.officeProductivity.mooe, ...y.continuingCosts.mooe];
  for (const p of Object.values(y.internalProjects)) lines.push(...p.mooe);
  for (const p of Object.values(y.crossAgencyProjects)) lines.push(...p.mooe);
  return lines;
}

function categoryTotals(y: YearBudget) {
  const projects = (p: Record<string, ProjectBudget>) =>
    Object.values(p).reduce((s, b) => s + sumLines(b.capitalOutlay) + sumLines(b.mooe), 0);
  return {
    officeProductivity: sumLines(y.officeProductivity.capitalOutlay) + sumLines(y.officeProductivity.mooe),
    internalProjects: projects(y.internalProjects),
    crossAgencyProjects: projects(y.crossAgencyProjects),
    continuingCosts: sumLines(y.continuingCosts.mooe),
  };
}

// ─── Build functions ───────────────────────────────────────────────────────────

export function buildB1(years: [YearBudget, YearBudget, YearBudget]): SummaryRow[] {
  const cats = years.map(categoryTotals);
  const fields = ["officeProductivity", "internalProjects", "crossAgencyProjects", "continuingCosts"] as const;
  const labels: Record<string, string> = {
    officeProductivity: "Office Productivity",
    internalProjects: "Internal ICT Projects",
    crossAgencyProjects: "Cross-Agency ICT Projects",
    continuingCosts: "Continuing Costs",
  };
  const rows: SummaryRow[] = fields.map((f) => ({
    label: labels[f],
    year1: cats[0][f], year2: cats[1][f], year3: cats[2][f],
    total: cats[0][f] + cats[1][f] + cats[2][f],
  }));
  const totals = years.map(yearTotal);
  rows.push({
    label: "Grand Total",
    year1: totals[0], year2: totals[1], year3: totals[2],
    total: totals[0] + totals[1] + totals[2],
    isTotal: true,
  });
  return rows;
}

export const FUND_SOURCE_ORDER = [
  "General Appropriations Act (GAA)",
  "Foreign-Assisted",
  "Locally Funded",
  "Other Income Generating Sources",
];

export function buildB2(years: [YearBudget, YearBudget, YearBudget]): SummaryRow[] {
  const map: Record<string, [number, number, number]> = {};
  years.forEach((y, yi) => {
    for (const l of allLines(y)) {
      const fs = l.fundSource || "Unspecified";
      if (!map[fs]) map[fs] = [0, 0, 0];
      map[fs][yi] += lineTotal(l);
    }
  });
  const keys = Object.keys(map).sort((a, b) => {
    const ai = FUND_SOURCE_ORDER.indexOf(a), bi = FUND_SOURCE_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  const rows: SummaryRow[] = keys.map((fs) => ({
    label: fs, year1: map[fs][0], year2: map[fs][1], year3: map[fs][2],
    total: map[fs][0] + map[fs][1] + map[fs][2],
  }));
  const totals = years.map(yearTotal);
  rows.push({
    label: "Grand Total",
    year1: totals[0], year2: totals[1], year3: totals[2],
    total: totals[0] + totals[1] + totals[2],
    isTotal: true,
  });
  return rows;
}

export function buildB3(years: [YearBudget, YearBudget, YearBudget]): SummaryRow[] {
  const coTotals = years.map((y) => sumLines(allCoLines(y)));
  const mooeTotals = years.map((y) => sumLines(allMooeLines(y)));
  const grandTotals = years.map(yearTotal);
  return [
    {
      label: "Capital Outlay (CO)",
      year1: coTotals[0], year2: coTotals[1], year3: coTotals[2],
      total: coTotals.reduce((s, v) => s + v, 0),
    },
    {
      label: "Maintenance and Other Operating Expenses (MOOE)",
      year1: mooeTotals[0], year2: mooeTotals[1], year3: mooeTotals[2],
      total: mooeTotals.reduce((s, v) => s + v, 0),
    },
    {
      label: "Grand Total",
      year1: grandTotals[0], year2: grandTotals[1], year3: grandTotals[2],
      total: grandTotals.reduce((s, v) => s + v, 0),
      isTotal: true,
    },
  ];
}

export function buildB4(years: [YearBudget, YearBudget, YearBudget]): UacsRow[] {
  const map: Record<string, { label: string; amounts: [number, number, number] }> = {};
  years.forEach((y, yi) => {
    for (const l of allLines(y)) {
      if (!l.uacsCode) continue;
      if (!map[l.uacsCode]) map[l.uacsCode] = { label: l.uacsLabel || l.uacsCode, amounts: [0, 0, 0] };
      map[l.uacsCode].amounts[yi] += lineTotal(l);
      if (!map[l.uacsCode].label && l.uacsLabel) map[l.uacsCode].label = l.uacsLabel;
    }
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, { label, amounts }]) => ({
      uacsCode: code, uacsLabel: label,
      year1: amounts[0], year2: amounts[1], year3: amounts[2],
      total: amounts[0] + amounts[1] + amounts[2],
    }));
}
