import type { YearBudget, LineItem, ProjectBudget } from "./part4-year-form";
import { groupByFundSource } from "@/lib/fund-sources";
import { categoryName, categoryOrder } from "@/lib/expense-categories";
import { durationCoversYear, yearsBetween } from "@/lib/duration";
import type { IsspDocument, Part4Data } from "@/lib/store/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SummaryRow {
  label: string;
  year1: number;
  year2: number;
  year3: number;
  total: number;
  isTotal?: boolean;
}

export interface CategoryRow {
  categoryId: string;
  name: string;
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
  b4: CategoryRow[];
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

/**
 * B.1 General Summary rows. `hideNonProjectCategories` drops the Office
 * Productivity and Continuing Costs rows for project-filtered scoped files
 * (their data is empty there by slice and the year forms hide the same
 * categories); Grand Total is computed from the year data independently and
 * is unaffected — in a project-filtered file the dropped categories sum to 0.
 */
export function buildB1(
  years: [YearBudget, YearBudget, YearBudget],
  opts?: { hideNonProjectCategories?: boolean }
): SummaryRow[] {
  const cats = years.map(categoryTotals);
  const allFields = ["officeProductivity", "internalProjects", "crossAgencyProjects", "continuingCosts"] as const;
  const fields = allFields.filter(
    (f) => !opts?.hideNonProjectCategories || f === "internalProjects" || f === "crossAgencyProjects"
  );
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

export function buildB2(years: [YearBudget, YearBudget, YearBudget]): SummaryRow[] {
  // One row per fund source (old and new spellings share a row — see
  // fund-sources.ts), in template order.
  const perYear = years.map((y) => groupByFundSource(allLines(y), lineTotal));
  const map: Record<string, [number, number, number]> = {};
  perYear.forEach((sums, yi) => {
    for (const [fs, amount] of sums) {
      if (!map[fs]) map[fs] = [0, 0, 0];
      map[fs][yi] += amount;
    }
  });
  const keys = [...groupByFundSource(years.flatMap((y) => allLines(y)), lineTotal).keys()];
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
      label: "Capital Outlay",
      year1: coTotals[0], year2: coTotals[1], year3: coTotals[2],
      total: coTotals.reduce((s, v) => s + v, 0),
    },
    {
      label: "Maintenance and Other Operating Expenses",
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

/**
 * B.4 rows: one per expense category (the 30 DICT handout categories), in
 * handout order. Uncategorized line items keep their own final
 * "Uncategorized" row — same as the PDF — so this table's grand total always
 * matches B.1–B.3; the editor flags those lines with "Set category".
 */
export function buildB4(years: [YearBudget, YearBudget, YearBudget]): CategoryRow[] {
  const map: Record<string, { amounts: [number, number, number] }> = {};
  years.forEach((y, yi) => {
    for (const l of allLines(y)) {
      const key = l.categoryId || "";
      if (!map[key]) map[key] = { amounts: [0, 0, 0] };
      map[key].amounts[yi] += lineTotal(l);
    }
  });
  return Object.entries(map)
    .sort(([a], [b]) => (a ? categoryOrder(a) : Infinity) - (b ? categoryOrder(b) : Infinity) || a.localeCompare(b))
    .map(([categoryId, { amounts }]) => ({
      categoryId,
      name: categoryId ? categoryName(categoryId) : "Uncategorized",
      year1: amounts[0], year2: amounts[1], year3: amounts[2],
      total: amounts[0] + amounts[1] + amounts[2],
    }));
}

// ─── Counting rule ─────────────────────────────────────────────────────────────

/** What counting needs: the III-E projects (id + duration), the plan years and Part IV. */
type CountingDoc = Pick<IsspDocument, "part4" | "startYear" | "endYear"> & {
  part3: Record<"internalProjects" | "crossAgencyProjects", { id: string; duration?: string }[]>;
};

/**
 * The Part IV budget that counts: project budgets only for projects that still
 * exist in Part III-E, and only in years their duration covers — exactly the
 * records the year pages and the PDF year tables list. Every total (B.1–B.4 in
 * the editor and the PDF, III-E Total Project Cost) reads this, never the raw
 * `part4`, so no money is counted without a visible line. The stored records
 * are untouched: the year pages name the excluded lines in a warning.
 */
export function countedPart4(doc: CountingDoc): Part4Data {
  const planYears = yearsBetween(doc.startYear, doc.endYear);
  const keep = (projects: { id: string; duration?: string }[], year: string, budgets: Record<string, ProjectBudget>) => {
    const out: Record<string, ProjectBudget> = {};
    for (const p of projects) {
      if (budgets[p.id] && durationCoversYear(p.duration ?? "", year, planYears)) out[p.id] = budgets[p.id];
    }
    return out;
  };
  // Same year labels as the Part IV year pages (year 3 = endYear)
  const year = (y: YearBudget, label: number): YearBudget => ({
    ...y,
    internalProjects: keep(doc.part3.internalProjects, String(label), y.internalProjects ?? {}),
    crossAgencyProjects: keep(doc.part3.crossAgencyProjects, String(label), y.crossAgencyProjects ?? {}),
  });
  return {
    year1: year(doc.part4.year1, doc.startYear),
    year2: year(doc.part4.year2, doc.startYear + 1),
    year3: year(doc.part4.year3, doc.endYear),
  };
}

/** Summary B.1–B.4 for the editor, from the counted budget. */
export function buildPart4Summary(doc: CountingDoc & Pick<IsspDocument, "editScope">): Part4SummaryData {
  const part4 = countedPart4(doc);
  const years: [YearBudget, YearBudget, YearBudget] = [part4.year1, part4.year2, part4.year3];
  return {
    yearLabels: [`Year 1 (${doc.startYear})`, `Year 2 (${doc.startYear + 1})`, `Year 3 (${doc.endYear})`],
    // Project-filtered scoped files: hide the agency-wide categories (empty
    // by slice; the year forms hide the same ones).
    b1: buildB1(years, { hideNonProjectCategories: doc.editScope?.projectIds !== undefined }),
    b2: buildB2(years),
    b3: buildB3(years),
    b4: buildB4(years),
    grandTotals: years.map(yearTotal) as [number, number, number],
  };
}
