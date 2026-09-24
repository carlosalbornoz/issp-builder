import { uuid } from "@/lib/uuid";
import type { Part4Data } from "@/lib/store/types";
import type { LineItem, YearBudget } from "./part4-year-form";

export type YearKey = "year1" | "year2" | "year3";
export type BudgetGroupKind = "officeProductivity" | "internalProject" | "crossAgencyProject" | "continuingCosts";
export type ExpenseClass = "capitalOutlay" | "mooe";

export const YEAR_KEYS: YearKey[] = ["year1", "year2", "year3"];

export interface CycleGroupDescriptor {
  kind: BudgetGroupKind;
  /** Set when kind is internalProject or crossAgencyProject. */
  projectId?: string;
  label: string;
  /** Years this group's project duration covers (all three for non-project groups). */
  activeYears: YearKey[];
}

export interface CycleYearCell {
  id: string;
  qty: number;
  unitCost: number;
}

export interface CycleRow {
  rowKey: string;
  group: CycleGroupDescriptor;
  expenseClass: ExpenseClass;
  item: string;
  office: string;
  uacsCode: string;
  uacsLabel: string;
  fundSource: string;
  cells: Record<YearKey, CycleYearCell | null>;
}

function expenseClassesForGroup(kind: BudgetGroupKind): ExpenseClass[] {
  return kind === "continuingCosts" ? ["mooe"] : ["capitalOutlay", "mooe"];
}

/** Read the LineItem[] at a group+class location for one year. */
export function getBucket(year: YearBudget, group: CycleGroupDescriptor, expenseClass: ExpenseClass): LineItem[] {
  if (group.kind === "officeProductivity") return year.officeProductivity[expenseClass];
  if (group.kind === "continuingCosts") return year.continuingCosts.mooe;
  if (!group.projectId) return [];
  const budget = group.kind === "internalProject"
    ? year.internalProjects[group.projectId]
    : year.crossAgencyProjects[group.projectId];
  return budget ? budget[expenseClass] : [];
}

/**
 * Replace the LineItem[] at a group+class location for one year. For a
 * project group whose per-year ProjectBudget record doesn't exist yet
 * (e.g. the project's duration starts in a later year, or it was only just
 * added), this CREATES the record rather than silently discarding the
 * write — a caller must never lose an edit because the year's bucket
 * hadn't been initialized.
 */
export function setBucket(
  year: YearBudget,
  group: CycleGroupDescriptor,
  expenseClass: ExpenseClass,
  lines: LineItem[]
): YearBudget {
  if (group.kind === "officeProductivity") {
    return { ...year, officeProductivity: { ...year.officeProductivity, [expenseClass]: lines } };
  }
  if (group.kind === "continuingCosts") {
    return { ...year, continuingCosts: { mooe: lines } };
  }
  if (!group.projectId) return year;
  if (group.kind === "internalProject") {
    const existing = year.internalProjects[group.projectId] ?? { projectTitle: group.label, capitalOutlay: [], mooe: [] };
    return {
      ...year,
      internalProjects: { ...year.internalProjects, [group.projectId]: { ...existing, [expenseClass]: lines } },
    };
  }
  const existing = year.crossAgencyProjects[group.projectId] ?? { projectTitle: group.label, capitalOutlay: [], mooe: [] };
  return {
    ...year,
    crossAgencyProjects: { ...year.crossAgencyProjects, [group.projectId]: { ...existing, [expenseClass]: lines } },
  };
}

/**
 * Group LineItems across year1/year2/year3 into cross-year rows, matched on
 * (group, expense class, item name). Processes years in order and, within a
 * year, items in array order — an item pairs with the FIRST existing row in
 * its group+class whose name matches and which doesn't have this year's
 * cell filled yet, else it starts a new row. Two distinct items that share a
 * name within the same group+class can therefore mis-pair; this is an
 * accepted trade-off documented in the design spec (no schema change).
 */
export function groupLineItemsAcrossCycle(part4: Part4Data, groups: CycleGroupDescriptor[]): CycleRow[] {
  const rows: CycleRow[] = [];
  let seq = 0;

  for (const year of YEAR_KEYS) {
    const yearBudget = part4[year];
    for (const group of groups) {
      for (const expenseClass of expenseClassesForGroup(group.kind)) {
        const lines = getBucket(yearBudget, group, expenseClass);
        for (const lineItem of lines) {
          const name = lineItem.item.trim();
          const match = rows.find(
            (r) =>
              r.group.kind === group.kind &&
              r.group.projectId === group.projectId &&
              r.expenseClass === expenseClass &&
              r.item.trim() === name &&
              r.cells[year] === null
          );
          const cell: CycleYearCell = { id: lineItem.id, qty: lineItem.qty, unitCost: lineItem.unitCost };
          if (match) {
            match.cells[year] = cell;
          } else {
            rows.push({
              rowKey: `row-${seq++}`,
              group,
              expenseClass,
              item: lineItem.item,
              office: lineItem.office,
              uacsCode: lineItem.uacsCode,
              uacsLabel: lineItem.uacsLabel,
              fundSource: lineItem.fundSource,
              cells: { year1: null, year2: null, year3: null, [year]: cell },
            });
          }
        }
      }
    }
  }
  return rows;
}

function applyToYears(
  part4: Part4Data,
  row: CycleRow,
  years: YearKey[],
  mutate: (lines: LineItem[], year: YearKey) => LineItem[]
): { part4: Part4Data; touchedYears: YearKey[] } {
  let next = part4;
  for (const year of years) {
    const yearBudget = next[year];
    const lines = getBucket(yearBudget, row.group, row.expenseClass);
    const nextLines = mutate(lines, year);
    next = { ...next, [year]: setBucket(yearBudget, row.group, row.expenseClass, nextLines) };
  }
  return { part4: next, touchedYears: years };
}

/** Row-level fields (name/office/UACS/fund source) — edits every populated year at once. */
export function updateRowSharedFields(
  part4: Part4Data,
  row: CycleRow,
  patch: Partial<Pick<LineItem, "item" | "office" | "uacsCode" | "uacsLabel" | "fundSource">>
): { part4: Part4Data; touchedYears: YearKey[] } {
  const years = YEAR_KEYS.filter((y) => row.cells[y] !== null);
  return applyToYears(part4, row, years, (lines, year) => {
    const cell = row.cells[year];
    return cell ? lines.map((l) => (l.id === cell.id ? { ...l, ...patch } : l)) : lines;
  });
}

/** Per-year-cell fields (qty/unit cost) — edits only the given year. */
export function updateYearCell(
  part4: Part4Data,
  row: CycleRow,
  year: YearKey,
  patch: Partial<Pick<LineItem, "qty" | "unitCost">>
): { part4: Part4Data; touchedYears: YearKey[] } {
  const cell = row.cells[year];
  if (!cell) return { part4, touchedYears: [] };
  return applyToYears(part4, row, [year], (lines) => lines.map((l) => (l.id === cell.id ? { ...l, ...patch } : l)));
}

/** Creates a new LineItem in a blank year cell, copying the row's shared fields. */
export function addYearCell(part4: Part4Data, row: CycleRow, year: YearKey): { part4: Part4Data; touchedYears: YearKey[] } {
  if (row.cells[year] !== null) return { part4, touchedYears: [] };
  const newLine: LineItem = {
    id: uuid(), item: row.item, office: row.office, uacsCode: row.uacsCode,
    uacsLabel: row.uacsLabel, fundSource: row.fundSource, qty: 1, unitCost: 0,
  };
  return applyToYears(part4, row, [year], (lines) => [...lines, newLine]);
}

/** Removes just one year's LineItem, leaving the row's other years intact. */
export function clearYearCell(part4: Part4Data, row: CycleRow, year: YearKey): { part4: Part4Data; touchedYears: YearKey[] } {
  const cell = row.cells[year];
  if (!cell) return { part4, touchedYears: [] };
  return applyToYears(part4, row, [year], (lines) => lines.filter((l) => l.id !== cell.id));
}

/** Removes the row's LineItem from every year it currently spans. */
export function deleteRow(part4: Part4Data, row: CycleRow): { part4: Part4Data; touchedYears: YearKey[] } {
  const years = YEAR_KEYS.filter((y) => row.cells[y] !== null);
  return applyToYears(part4, row, years, (lines, year) => {
    const cell = row.cells[year];
    return cell ? lines.filter((l) => l.id !== cell.id) : lines;
  });
}

/**
 * Moves every populated year's LineItem from the row's current group+class
 * to a new one. Never drops a year's data, even if the target group's
 * activeYears is narrower than the row's populated years — a reassignment
 * that lands outside the target project's duration surfaces through the
 * same "outside project duration" legacy-data warning the per-year pages
 * already show, rather than silently discarding budget data.
 */
export function reassignRow(
  part4: Part4Data,
  row: CycleRow,
  newGroup: CycleGroupDescriptor,
  newExpenseClass: ExpenseClass
): { part4: Part4Data; touchedYears: YearKey[] } {
  const years = YEAR_KEYS.filter((y) => row.cells[y] !== null);
  let next = part4;
  for (const year of years) {
    const cell = row.cells[year];
    if (!cell) continue;
    const yearBudget = next[year];
    const oldLines = getBucket(yearBudget, row.group, row.expenseClass);
    const moved = oldLines.find((l) => l.id === cell.id);
    if (!moved) continue;
    const withoutOld = setBucket(yearBudget, row.group, row.expenseClass, oldLines.filter((l) => l.id !== cell.id));
    const newLines = getBucket(withoutOld, newGroup, newExpenseClass);
    const withNew = setBucket(withoutOld, newGroup, newExpenseClass, [...newLines, moved]);
    next = { ...next, [year]: withNew };
  }
  return { part4: next, touchedYears: years };
}

/** Creates a brand-new row, populated in every year the group is active for. */
export function addNewRow(
  part4: Part4Data,
  group: CycleGroupDescriptor,
  expenseClass: ExpenseClass
): { part4: Part4Data; touchedYears: YearKey[]; row: CycleRow } {
  const cells: Record<YearKey, CycleYearCell | null> = { year1: null, year2: null, year3: null };
  let next = part4;
  for (const year of group.activeYears) {
    const newLine: LineItem = {
      id: uuid(), item: "", office: "", uacsCode: "", uacsLabel: "",
      fundSource: "General Appropriations Act", qty: 1, unitCost: 0,
    };
    const yearBudget = next[year];
    const lines = getBucket(yearBudget, group, expenseClass);
    next = { ...next, [year]: setBucket(yearBudget, group, expenseClass, [...lines, newLine]) };
    cells[year] = { id: newLine.id, qty: newLine.qty, unitCost: newLine.unitCost };
  }
  const row: CycleRow = {
    rowKey: `row-new-${uuid()}`, group, expenseClass,
    item: "", office: "", uacsCode: "", uacsLabel: "", fundSource: "General Appropriations Act",
    cells,
  };
  return { part4: next, touchedYears: [...group.activeYears], row };
}
