import type { IsspDocument, KpiRow, LineItem, Part3Data, Part4Data, YearBudget } from "@/lib/store/types";

/**
 * Deleting a Part III-E project deletes what belongs to it: its III-F KPI set
 * and its Part IV budget in every year. `projectCasualties` is what the
 * confirmation dialog lists; `withoutProjectData` is the removal. Leaving them
 * behind kept the money in the Part IV summaries with no visible line
 * (audit 2026-10-02, F2/F10).
 */

export type ProjectListKey = "internalProjects" | "crossAgencyProjects";

export interface CasualtyLine {
  year: number;
  expenseClass: "capitalOutlay" | "mooe";
  line: LineItem;
}

export interface ProjectCasualties {
  kpiRows: KpiRow[];
  budgetLines: CasualtyLine[];
  budgetTotal: number;
}

type DeleteDoc = Pick<IsspDocument, "part4" | "startYear" | "endYear"> & { part3: Pick<Part3Data, "performanceFramework"> };

const YEARS = ["year1", "year2", "year3"] as const;

function yearLabels(doc: DeleteDoc): Record<(typeof YEARS)[number], number> {
  return { year1: doc.startYear, year2: doc.startYear + 1, year3: doc.endYear };
}

export function projectCasualties(doc: DeleteDoc, list: ProjectListKey, projectId: string): ProjectCasualties {
  const labels = yearLabels(doc);
  const budgetLines: CasualtyLine[] = [];
  for (const y of YEARS) {
    const pb = doc.part4[y]?.[list]?.[projectId];
    if (!pb) continue;
    for (const line of pb.capitalOutlay ?? []) budgetLines.push({ year: labels[y], expenseClass: "capitalOutlay", line });
    for (const line of pb.mooe ?? []) budgetLines.push({ year: labels[y], expenseClass: "mooe", line });
  }
  return {
    kpiRows: doc.part3.performanceFramework[projectId]?.rows ?? [],
    budgetLines,
    budgetTotal: budgetLines.reduce((s, b) => s + (b.line.qty ?? 0) * (b.line.unitCost ?? 0), 0),
  };
}

/** The III-F framework and Part IV without the project's records. Pure. */
export function withoutProjectData(
  doc: DeleteDoc,
  list: ProjectListKey,
  projectId: string
): { performanceFramework: Part3Data["performanceFramework"]; part4: Part4Data } {
  const performanceFramework = Object.fromEntries(
    Object.entries(doc.part3.performanceFramework).filter(([id]) => id !== projectId)
  );
  const year = (y: YearBudget): YearBudget => ({
    ...y,
    [list]: Object.fromEntries(Object.entries(y[list] ?? {}).filter(([id]) => id !== projectId)),
  });
  return { performanceFramework, part4: { year1: year(doc.part4.year1), year2: year(doc.part4.year2), year3: year(doc.part4.year3) } };
}
