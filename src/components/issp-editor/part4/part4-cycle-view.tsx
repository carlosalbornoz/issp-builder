"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Trash2, Pencil, ChevronDown, ChevronRight, Table2, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { UacsCombobox } from "@/components/issp-editor/uacs-combobox";
import { SectionShell } from "@/components/editor/section-shell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
const LS_KEY = "issp-part4-cycle-line-mode";
const INPUT_CLS =
  "w-full rounded px-2 py-1.5 text-sm bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring";
const SELECT_CLS =
  "h-8 w-full rounded-lg border border-border bg-card px-2.5 py-1 text-sm text-foreground outline-none hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer disabled:opacity-50";

function lineTotal(cell: CycleYearCell | null) {
  return cell ? cell.qty * cell.unitCost : 0;
}
function rowTotal(row: CycleRowData) {
  return YEAR_KEYS.reduce((s, y) => s + lineTotal(row.cells[y]), 0);
}
function groupKeyOf(g: CycleGroupDescriptor) {
  return `${g.kind}::${g.projectId ?? ""}`;
}
function rowSubtitle(row: Pick<CycleRowData, "uacsLabel" | "uacsCode" | "office" | "fundSource">) {
  return (
    [
      row.uacsLabel || (row.uacsCode ? `UACS ${row.uacsCode}` : null),
      row.office || null,
      row.fundSource !== FUND_SOURCES[0] ? row.fundSource : null,
    ]
      .filter(Boolean)
      .join(" · ") || "No details yet"
  );
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
  const [mode, setMode] = useState<"list" | "table">(() => {
    try { return (localStorage.getItem(LS_KEY) as "list" | "table") ?? "list"; } catch { return "list"; }
  });
  // The row a drawer edit targets is tracked by a stable LineItem id (one of
  // its populated cells), not the row object itself or its rowKey — both are
  // recomputed fresh by groupLineItemsAcrossCycle on every edit (including an
  // edit made from inside this same drawer), so a captured-at-open-time
  // reference would go stale the moment anything changes. Re-resolving by id
  // on every render keeps the drawer pointed at the same conceptual row.
  const [drawerAnchorId, setDrawerAnchorId] = useState<string | null>(null);

  function switchMode(m: "list" | "table") {
    setMode(m);
    try { localStorage.setItem(LS_KEY, m); } catch {}
  }

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

  const drawerRow = drawerAnchorId
    ? allRows.find((r) => YEAR_KEYS.some((y) => r.cells[y]?.id === drawerAnchorId)) ?? null
    : null;

  function openDrawer(row: CycleRowData) {
    const anchor = YEAR_KEYS.map((y) => row.cells[y]?.id).find((id) => id !== undefined);
    if (anchor) setDrawerAnchorId(anchor);
  }
  function closeDrawer() {
    setDrawerAnchorId(null);
  }

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

  function handleDelete(row: CycleRowData) {
    if (!confirm(`Remove "${row.item || "this item"}" from every year? This cannot be undone.`)) return;
    const r = deleteRow(part4, row);
    save(r.part4, r.touchedYears);
    closeDrawer();
  }

  return (
    <SectionShell
      sectionId="part4/cycle"
      title="Cycle View — All Years"
      description="Every Part IV line item across the full 3-year cycle, grouped by project and expense class."
      statBlock={{ label: "Cycle Total", value: php(grandTotal) }}
      hideMarkDone
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by item, office, UACS code, or project…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center rounded-md border p-0.5 bg-muted/30">
          {(["list", "table"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                mode === m
                  ? "bg-card shadow-sm font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "list" ? <LayoutList className="h-3 w-3" /> : <Table2 className="h-3 w-3" />}
              {m === "list" ? "List" : "Table"}
            </button>
          ))}
        </div>
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
                mode={mode}
                planYears={planYears}
                rows={groupRows.filter((r) => r.expenseClass === expenseClass)}
                groups={groups}
                currentGroup={group}
                currentExpenseClass={expenseClass}
                onAdd={() => {
                  // The new row starts with an empty item name, so an active
                  // search would filter it out and the click would look like a
                  // no-op (repeat clicks silently piling up hidden blank rows).
                  setQuery("");
                  const r = addNewRow(part4, group, expenseClass);
                  save(r.part4, r.touchedYears);
                }}
                onEditShared={(row, patch) => { const r = updateRowSharedFields(part4, row, patch); save(r.part4, r.touchedYears); }}
                onEditYear={(row, year, patch) => { const r = updateYearCell(part4, row, year, patch); save(r.part4, r.touchedYears); }}
                onAddYear={(row, year) => { const r = addYearCell(part4, row, year); save(r.part4, r.touchedYears); }}
                onClearYear={(row, year) => { const r = clearYearCell(part4, row, year); save(r.part4, r.touchedYears); }}
                onDeleteRow={handleDelete}
                onReassign={handleReassign}
                onOpenDrawer={openDrawer}
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

      <CycleRowDrawer
        row={drawerRow}
        groups={groups}
        onClose={closeDrawer}
        onEditShared={(row, patch) => { const r = updateRowSharedFields(part4, row, patch); save(r.part4, r.touchedYears); }}
        onReassign={handleReassign}
        onDelete={handleDelete}
      />
    </SectionShell>
  );
}

/**
 * Item-description input that writes to the store only on blur / Enter.
 *
 * The item name is the ONLY field `groupLineItemsAcrossCycle` matches rows on,
 * and grouping re-runs from scratch on every store change. Committing on every
 * keystroke would let an in-progress name transiently equal another row's name
 * (typing "Laptop Bag" passes through "Laptop"), and the regroup would then
 * split this row's year cells onto the unrelated row. Holding the text in a
 * local draft until the edit is finished keeps the store's `item` unchanged
 * while typing, so no transient collision can happen.
 *
 * While not focused the input renders `value` directly, so it always shows the
 * store's current name (external changes from another tab / the per-year page,
 * or a different row reusing this positional `rowKey` after a regroup). The
 * draft is re-seeded from `value` on every focus. Enter blurs, so blur is the
 * single commit path and the input is never left focused on a stale draft
 * after the regroup its own commit triggers.
 */
function ItemNameInput({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (item: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  return (
    <input
      type="text" className={className ?? INPUT_CLS} placeholder="Item description…"
      value={focused ? draft : value}
      onFocus={() => { setDraft(value); setFocused(true); }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
    />
  );
}

/** One year's qty × unit-cost controls, shared between table-mode cells and list-mode rows. */
function YearCellControls({
  cell,
  canAdd,
  yearLabel,
  onEdit,
  onAdd,
  onClear,
}: {
  cell: CycleYearCell | null;
  canAdd: boolean;
  yearLabel: string;
  onEdit: (patch: Partial<Pick<LineItem, "qty" | "unitCost">>) => void;
  onAdd: () => void;
  onClear: () => void;
}) {
  if (!cell) {
    return canAdd ? (
      <button
        type="button" onClick={onAdd}
        className="w-full rounded px-2 py-1.5 text-xs text-muted-foreground/60 italic hover:bg-card hover:text-foreground text-center"
      >
        — add —
      </button>
    ) : (
      <span className="block text-center text-xs text-muted-foreground/30 italic py-1.5">n/a</span>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <NumberInput
          unstyled min={1}
          className="w-11 shrink-0 rounded px-1.5 py-1.5 text-sm text-right bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
          value={cell.qty} onValueChange={(n) => onEdit({ qty: n })}
          aria-label={`${yearLabel} quantity`}
        />
        <span className="text-xs text-muted-foreground shrink-0">×</span>
        <NumberInput
          unstyled min={0} currency
          className="flex-1 min-w-0 rounded px-2 py-1.5 text-sm text-right bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
          value={cell.unitCost} onValueChange={(n) => onEdit({ unitCost: n })}
          aria-label={`${yearLabel} unit cost`}
        />
        <button
          type="button" aria-label={`Clear ${yearLabel}`}
          className="shrink-0 text-muted-foreground/50 hover:text-destructive"
          onClick={onClear}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="text-right text-xs text-muted-foreground tabular-nums">{php(lineTotal(cell))}</div>
    </div>
  );
}

/**
 * Slideout for everything a List-mode row doesn't show inline: office, UACS,
 * fund source, and where the row belongs (project/category, expense class),
 * plus delete. Table mode keeps all of these inline instead and has no
 * drawer of its own — this component only ever renders for List mode.
 *
 * `row` is re-resolved by the parent on every render from a stable LineItem
 * id (see `drawerAnchorId` in Part4CycleView), so editing a field here —
 * including reassigning the row to a different project/class, which changes
 * which group+class bucket it lives in — never leaves the drawer pointing at
 * stale data.
 */
function CycleRowDrawer({
  row,
  groups,
  onClose,
  onEditShared,
  onReassign,
  onDelete,
}: {
  row: CycleRowData | null;
  groups: CycleGroupDescriptor[];
  onClose: () => void;
  onEditShared: (row: CycleRowData, patch: Partial<Pick<LineItem, "office" | "uacsCode" | "uacsLabel" | "fundSource">>) => void;
  onReassign: (row: CycleRowData, group: CycleGroupDescriptor, expenseClass: ExpenseClass) => void;
  onDelete: (row: CycleRowData) => void;
}) {
  return (
    <Sheet open={row !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" showCloseButton={false} style={{ maxWidth: 480 }} className="flex flex-col p-0 gap-0">
        {row && (
          <>
            <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
              <SheetTitle className="line-clamp-2 break-words">
                {row.item || <span className="text-muted-foreground italic">Unnamed item</span>}
              </SheetTitle>
              <SheetDescription>Office, UACS, fund source, and where this item belongs.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Project / Category</label>
                <select
                  className={SELECT_CLS}
                  value={groupKeyOf(row.group)}
                  onChange={(e) => {
                    const target = groups.find((g) => groupKeyOf(g) === e.target.value);
                    if (target) onReassign(row, target, row.expenseClass);
                  }}
                >
                  {groups.map((g) => <option key={groupKeyOf(g)} value={groupKeyOf(g)}>{g.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Expense Class</label>
                <select
                  className={SELECT_CLS}
                  value={row.expenseClass}
                  disabled={row.group.kind === "continuingCosts"}
                  onChange={(e) => onReassign(row, row.group, e.target.value as ExpenseClass)}
                >
                  <option value="capitalOutlay">Capital Outlay</option>
                  <option value="mooe">Maintenance and Other Operating Expenses</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Office / Unit</label>
                <Input
                  type="text" list={OFFICE_LIST_ID}
                  value={row.office}
                  onChange={(e) => onEditShared(row, { office: e.target.value })}
                  placeholder="Which office or unit will use this?"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">UACS Code</label>
                <UacsCombobox
                  value={row.uacsCode}
                  context={row.expenseClass === "capitalOutlay" ? "co" : "mooe"}
                  onChange={(uacs, label) => onEditShared(row, { uacsCode: uacs, uacsLabel: label })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fund Source</label>
                <select
                  className={SELECT_CLS}
                  value={row.fundSource}
                  onChange={(e) => onEditShared(row, { fundSource: e.target.value })}
                >
                  {FUND_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <SheetFooter className="px-6 py-4 border-t flex-row items-center justify-between gap-2 shrink-0">
              <Button
                variant="ghost" size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(row)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
              <Button size="sm" onClick={onClose}>Done</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CycleSubTable({
  title,
  mode,
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
  onOpenDrawer,
}: {
  title: string;
  mode: "list" | "table";
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
  onOpenDrawer: (row: CycleRowData) => void;
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

      {mode === "list" ? (
        rows.length > 0 ? (
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div key={row.rowKey} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
                <div className="flex-1 min-w-0 pt-0.5">
                  <ItemNameInput
                    value={row.item}
                    onCommit={(item) => onEditShared(row, { item })}
                    className="w-full rounded px-2 py-1 -mx-2 text-sm font-medium bg-transparent hover:bg-card/70 focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring truncate"
                  />
                  <p className="text-xs text-muted-foreground truncate mt-0.5 px-2">{rowSubtitle(row)}</p>
                </div>
                {YEAR_KEYS.map((year, i) => (
                  <div key={year} className="w-44 shrink-0">
                    <YearCellControls
                      cell={row.cells[year]}
                      canAdd={currentGroup.activeYears.includes(year)}
                      yearLabel={planYears[i]}
                      onEdit={(patch) => onEditYear(row, year, patch)}
                      onAdd={() => onAddYear(row, year)}
                      onClear={() => onClearYear(row, year)}
                    />
                  </div>
                ))}
                <div className="w-24 shrink-0 pt-1.5 text-right text-sm font-semibold tabular-nums">
                  {php(rowTotal(row))}
                </div>
                <button
                  type="button"
                  aria-label="Edit details"
                  className="h-7 w-7 shrink-0 mt-0.5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  onClick={() => onOpenDrawer(row)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-muted-foreground">
              No items yet.{" "}
              <button type="button" onClick={onAdd} className="font-medium text-primary hover:underline">Add one.</button>
            </p>
          </div>
        )
      ) : (
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
                    <ItemNameInput value={row.item} onCommit={(item) => onEditShared(row, { item })} />
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
                  {YEAR_KEYS.map((year, i) => (
                    <td key={year} className="border-r px-2 py-1">
                      <YearCellControls
                        cell={row.cells[year]}
                        canAdd={currentGroup.activeYears.includes(year)}
                        yearLabel={planYears[i]}
                        onEdit={(patch) => onEditYear(row, year, patch)}
                        onAdd={() => onAddYear(row, year)}
                        onClear={() => onClearYear(row, year)}
                      />
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
      )}
    </div>
  );
}
