"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { UacsCombobox } from "@/components/issp-editor/uacs-combobox";
import { SectionShell } from "@/components/editor/section-shell";
import { useIsspStore } from "@/lib/store";
import { php } from "@/lib/utils";
import { durationCoversYear } from "@/lib/duration";
import type { IctProject, LineItem, Part4Data } from "@/lib/store/types";
import {
  YEAR_KEYS,
  groupLineItemsAcrossCycle,
  updateRowSharedFields,
  updateYearCell,
  addYearCell,
  clearYearCell,
  reassignRow,
  addNewRow,
  deleteRow,
  type CycleGroupDescriptor,
  type CycleRow as CycleRowData,
  type CycleYearCell,
  type ExpenseClass,
  type YearKey,
} from "./part4-cycle-model";

const FUND_SOURCES = [
  "General Appropriations Act",
  "Foreign-assisted projects",
  "Locally funded",
  "Other Income Generating Sources",
];
const OFFICE_SUGGESTIONS = ["Central Office", "Regional Offices", "Central Office and Regional Offices"];
const OFFICE_LIST_ID = "issp-cycle-office-suggestions";
const INPUT_CLS =
  "w-full rounded px-2 py-1.5 text-sm bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring";

function lineTotal(cell: CycleYearCell | null) {
  return cell ? cell.qty * cell.unitCost : 0;
}
function rowTotal(row: CycleRowData) {
  return YEAR_KEYS.reduce((s, y) => s + lineTotal(row.cells[y]), 0);
}
function groupKeyOf(g: CycleGroupDescriptor) {
  return `${g.kind}::${g.projectId ?? ""}`;
}

interface Part4CycleViewProps {
  part4: Part4Data;
  planYears: [string, string, string];
  internalProjects: IctProject[];
  crossAgencyProjects: IctProject[];
  hideNonProjectCategories: boolean;
}

export function Part4CycleView({
  part4: initialPart4,
  planYears,
  internalProjects,
  crossAgencyProjects,
  hideNonProjectCategories,
}: Part4CycleViewProps) {
  const { updatePart4, updateSectionMeta } = useIsspStore();
  const [part4, setPart4] = useState(initialPart4);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function save(next: Part4Data, touchedYears: YearKey[]) {
    setPart4(next);
    if (touchedYears.length === 0) return;
    const patch: Partial<Part4Data> = {};
    for (const y of touchedYears) patch[y] = next[y];
    updatePart4(patch);
    const ts = new Date().toISOString();
    for (const y of touchedYears) updateSectionMeta(`part4/${y}`, { lastEditedAt: ts });
  }

  const groups = useMemo<CycleGroupDescriptor[]>(() => {
    const activeYearsFor = (duration: string): YearKey[] =>
      YEAR_KEYS.filter((_, i) => durationCoversYear(duration ?? "", planYears[i], planYears));
    const list: CycleGroupDescriptor[] = [];
    if (!hideNonProjectCategories) {
      list.push({ kind: "officeProductivity", label: "Office Productivity", activeYears: YEAR_KEYS });
    }
    for (const p of internalProjects) {
      list.push({ kind: "internalProject", projectId: p.id, label: p.title, activeYears: activeYearsFor(p.duration) });
    }
    for (const p of crossAgencyProjects) {
      list.push({ kind: "crossAgencyProject", projectId: p.id, label: p.title, activeYears: activeYearsFor(p.duration) });
    }
    if (!hideNonProjectCategories) {
      list.push({ kind: "continuingCosts", label: "Continuing Costs", activeYears: YEAR_KEYS });
    }
    return list;
  }, [internalProjects, crossAgencyProjects, hideNonProjectCategories, planYears]);

  const allRows = useMemo(() => groupLineItemsAcrossCycle(part4, groups), [part4, groups]);

  const q = query.trim().toLowerCase();
  const visibleRows = q
    ? allRows.filter((r) => [r.item, r.office, r.uacsCode, r.uacsLabel, r.group.label].some((f) => f.toLowerCase().includes(q)))
    : allRows;

  const grandTotal = allRows.reduce((s, r) => s + rowTotal(r), 0);

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleReassign(row: CycleRowData, group: CycleGroupDescriptor, expenseClass: ExpenseClass) {
    const finalClass: ExpenseClass = group.kind === "continuingCosts" ? "mooe" : expenseClass;
    const r = reassignRow(part4, row, group, finalClass);
    save(r.part4, r.touchedYears);
  }

  return (
    <SectionShell
      sectionId="part4/cycle"
      title="Cycle View — All Years"
      description="Every Part IV line item across the full 3-year cycle, grouped by project and expense class."
      statBlock={{ label: "Cycle Total", value: php(grandTotal) }}
      hideMarkDone
    >
      <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by item, office, UACS code, or project…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <datalist id={OFFICE_LIST_ID}>
        {OFFICE_SUGGESTIONS.map((o) => <option key={o} value={o} />)}
      </datalist>

      {groups.map((group) => {
        const key = groupKeyOf(group);
        const groupRows = visibleRows.filter((r) => r.group === group);
        if (q && groupRows.length === 0) return null;
        const isCollapsed = collapsed.has(key);
        const groupTotal = allRows.filter((r) => r.group === group).reduce((s, r) => s + rowTotal(r), 0);
        const classes: ExpenseClass[] = group.kind === "continuingCosts" ? ["mooe"] : ["capitalOutlay", "mooe"];

        return (
          <div key={key} className="space-y-3 border-t pt-6 first:border-t-0 first:pt-0">
            <button type="button" onClick={() => toggle(key)} className="flex w-full items-center justify-between gap-2 text-left">
              <span className="flex items-center gap-1.5 font-semibold text-base">
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {group.label}
              </span>
              <span className="text-sm font-semibold tabular-nums">{php(groupTotal)}</span>
            </button>
            {!isCollapsed && classes.map((expenseClass) => (
              <CycleSubTable
                key={expenseClass}
                title={expenseClass === "capitalOutlay" ? "Capital Outlay" : "Maintenance and Other Operating Expenses"}
                planYears={planYears}
                rows={groupRows.filter((r) => r.expenseClass === expenseClass)}
                groups={groups}
                currentGroup={group}
                currentExpenseClass={expenseClass}
                onAdd={() => { const r = addNewRow(part4, group, expenseClass); save(r.part4, r.touchedYears); }}
                onEditShared={(row, patch) => { const r = updateRowSharedFields(part4, row, patch); save(r.part4, r.touchedYears); }}
                onEditYear={(row, year, patch) => { const r = updateYearCell(part4, row, year, patch); save(r.part4, r.touchedYears); }}
                onAddYear={(row, year) => { const r = addYearCell(part4, row, year); save(r.part4, r.touchedYears); }}
                onClearYear={(row, year) => { const r = clearYearCell(part4, row, year); save(r.part4, r.touchedYears); }}
                onDeleteRow={(row) => {
                  if (!confirm(`Remove "${row.item || "this item"}" from every year? This cannot be undone.`)) return;
                  const r = deleteRow(part4, row);
                  save(r.part4, r.touchedYears);
                }}
                onReassign={handleReassign}
              />
            ))}
          </div>
        );
      })}

      {allRows.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 font-bold">
          <span>Grand Total (All Years)</span>
          <span className="tabular-nums">{php(grandTotal)}</span>
        </div>
      )}
    </SectionShell>
  );
}

function CycleSubTable({
  title,
  planYears,
  rows,
  groups,
  currentGroup,
  currentExpenseClass,
  onAdd,
  onEditShared,
  onEditYear,
  onAddYear,
  onClearYear,
  onDeleteRow,
  onReassign,
}: {
  title: string;
  planYears: [string, string, string];
  rows: CycleRowData[];
  groups: CycleGroupDescriptor[];
  currentGroup: CycleGroupDescriptor;
  currentExpenseClass: ExpenseClass;
  onAdd: () => void;
  onEditShared: (row: CycleRowData, patch: Partial<Pick<LineItem, "item" | "office" | "uacsCode" | "uacsLabel" | "fundSource">>) => void;
  onEditYear: (row: CycleRowData, year: YearKey, patch: Partial<Pick<LineItem, "qty" | "unitCost">>) => void;
  onAddYear: (row: CycleRowData, year: YearKey) => void;
  onClearYear: (row: CycleRowData, year: YearKey) => void;
  onDeleteRow: (row: CycleRowData) => void;
  onReassign: (row: CycleRowData, group: CycleGroupDescriptor, expenseClass: ExpenseClass) => void;
}) {
  const subtotal = rows.reduce((s, r) => s + rowTotal(r), 0);

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="flex items-center justify-between gap-2 bg-muted/40 border-b px-4 py-2.5">
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tabular-nums">{php(subtotal)}</span>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onAdd}>
            <Plus className="h-3 w-3" /> Add Line
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="border-r px-3 py-2 text-left font-semibold w-40">Project / Category</th>
              <th className="border-r px-3 py-2 text-left font-semibold w-28">Class</th>
              <th className="border-r px-3 py-2 text-left font-semibold">Item / Description</th>
              <th className="border-r px-3 py-2 text-left font-semibold w-28">Office</th>
              <th className="border-r px-3 py-2 text-left font-semibold w-32">UACS</th>
              <th className="border-r px-3 py-2 text-left font-semibold w-36">Fund Source</th>
              {planYears.map((label) => (
                <th key={label} className="border-r px-3 py-2 text-right font-semibold w-44">{label}</th>
              ))}
              <th className="border-r px-3 py-2 text-right font-semibold w-28">Cycle Total</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-muted-foreground text-sm border-b">
                  No items yet.{" "}
                  <button type="button" onClick={onAdd} className="font-medium text-primary hover:underline">Add one.</button>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.rowKey} className="hover:bg-muted/20 border-b align-top">
                <td className="border-r px-2 py-1">
                  <select
                    className="w-full rounded px-2 py-1.5 text-xs bg-card/70 hover:bg-card border-0 cursor-pointer"
                    value={groupKeyOf(currentGroup)}
                    onChange={(e) => {
                      const target = groups.find((g) => groupKeyOf(g) === e.target.value);
                      if (target) onReassign(row, target, currentExpenseClass);
                    }}
                  >
                    {groups.map((g) => <option key={groupKeyOf(g)} value={groupKeyOf(g)}>{g.label}</option>)}
                  </select>
                </td>
                <td className="border-r px-2 py-1">
                  <select
                    className="w-full rounded px-2 py-1.5 text-xs bg-card/70 hover:bg-card border-0 cursor-pointer disabled:opacity-50"
                    value={currentExpenseClass}
                    disabled={currentGroup.kind === "continuingCosts"}
                    onChange={(e) => onReassign(row, currentGroup, e.target.value as ExpenseClass)}
                  >
                    <option value="capitalOutlay">Capital Outlay</option>
                    <option value="mooe">MOOE</option>
                  </select>
                </td>
                <td className="border-r px-2 py-1">
                  <input
                    type="text" className={INPUT_CLS} placeholder="Item description…"
                    value={row.item} onChange={(e) => onEditShared(row, { item: e.target.value })}
                  />
                </td>
                <td className="border-r px-2 py-1">
                  <input
                    type="text" list={OFFICE_LIST_ID} className={INPUT_CLS} placeholder="Office…"
                    value={row.office} onChange={(e) => onEditShared(row, { office: e.target.value })}
                  />
                </td>
                <td className="border-r px-2 py-1">
                  <UacsCombobox
                    value={row.uacsCode}
                    context={currentExpenseClass === "capitalOutlay" ? "co" : "mooe"}
                    onChange={(uacs, label) => onEditShared(row, { uacsCode: uacs, uacsLabel: label })}
                    className="text-xs"
                  />
                </td>
                <td className="border-r px-2 py-1">
                  <select
                    className="w-full rounded px-2 py-1.5 text-xs bg-card/70 hover:bg-card border-0 cursor-pointer"
                    value={row.fundSource} onChange={(e) => onEditShared(row, { fundSource: e.target.value })}
                  >
                    {FUND_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                {YEAR_KEYS.map((year) => (
                  <td key={year} className="border-r px-2 py-1">
                    {row.cells[year] ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <NumberInput
                            unstyled min={1} className={`${INPUT_CLS} text-right`}
                            value={row.cells[year]!.qty} onValueChange={(n) => onEditYear(row, year, { qty: n })}
                            aria-label={`${year} quantity`}
                          />
                          <span className="text-xs text-muted-foreground shrink-0">×</span>
                          <NumberInput
                            unstyled min={0} currency className={`${INPUT_CLS} text-right`}
                            value={row.cells[year]!.unitCost} onValueChange={(n) => onEditYear(row, year, { unitCost: n })}
                            aria-label={`${year} unit cost`}
                          />
                          <button
                            type="button" aria-label={`Clear ${year}`}
                            className="shrink-0 text-muted-foreground/50 hover:text-destructive"
                            onClick={() => onClearYear(row, year)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-right text-xs text-muted-foreground tabular-nums">{php(lineTotal(row.cells[year]))}</div>
                      </div>
                    ) : currentGroup.activeYears.includes(year) ? (
                      <button
                        type="button" onClick={() => onAddYear(row, year)}
                        className="w-full rounded px-2 py-1.5 text-xs text-muted-foreground/60 italic hover:bg-card hover:text-foreground text-center"
                      >
                        — add —
                      </button>
                    ) : (
                      <span className="block text-center text-xs text-muted-foreground/30 italic">n/a</span>
                    )}
                  </td>
                ))}
                <td className="border-r px-3 py-2 text-right tabular-nums text-sm font-medium">{php(rowTotal(row))}</td>
                <td className="px-1 py-1 text-center">
                  <Button
                    variant="ghost" size="icon" aria-label="Delete row"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteRow(row)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
