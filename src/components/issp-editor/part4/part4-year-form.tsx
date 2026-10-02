"use client";

import Link from "next/link";
import { DEFAULT_FUND_SOURCE, FUND_SOURCE_OPTIONS } from "@/lib/fund-sources";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { useLocalSave } from "@/hooks/use-local-save";
import { CategorySelect, CategoryMissing } from "./category-select";
import { categoryName } from "@/lib/expense-categories";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Plus, Trash2, Pencil } from "lucide-react";
import { LineModeToggle, usePersistedLineMode, type LineMode } from "./line-mode";
import { SectionShell } from "@/components/editor/section-shell";
import { php } from "@/lib/utils";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LineItem {
  id: string;
  item: string;
  office: string;
  categoryId: string;
  fundSource: string;
  qty: number;
  unitCost: number;
}

export interface ProjectBudget {
  projectTitle: string;
  capitalOutlay: LineItem[];
  mooe: LineItem[];
}

export interface YearBudget {
  officeProductivity: { capitalOutlay: LineItem[]; mooe: LineItem[] };
  internalProjects: Record<string, ProjectBudget>;
  crossAgencyProjects: Record<string, ProjectBudget>;
  continuingCosts: { mooe: LineItem[] };
}

interface Part4YearFormProps {
  year: number;
  yearKey: "year1" | "year2" | "year3";
  initialData: YearBudget;
  internalProjects: { id: string; title: string }[];
  crossAgencyProjects: { id: string; title: string }[];
  /** Hide the two agency-wide budget categories — project-filtered scoped
   *  files only (the slice also empties their data). Default false. */
  hideNonProjectCategories?: boolean;
  /** Every Part III-E project id (any duration). A budget for an id not in
   *  this list belongs to a deleted project. */
  liveProjectIds: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

const BLANK_LINE = (): LineItem => ({
  id: genId(),
  item: "",
  office: "",
  categoryId: "",
  fundSource: DEFAULT_FUND_SOURCE,
  qty: 1,
  unitCost: 0,
});

function totalLine(l: LineItem) {
  return l.qty * l.unitCost;
}

function sumLines(lines: LineItem[]) {
  return lines.reduce((s, l) => s + totalLine(l), 0);
}

const FUND_SOURCES = FUND_SOURCE_OPTIONS;

const OFFICE_SUGGESTIONS = [
  "Central Office",
  "Regional Offices",
  "Central Office and Regional Offices",
];

const OFFICE_LIST_ID = "issp-office-suggestions";

// ─── Line Item Drawer ─────────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  item: LineItem | null;
  isNew: boolean;
  context: "co" | "mooe";
  onSave: (item: LineItem) => void;
  onDelete: () => void;
  onClose: () => void;
}

function LineItemDrawer({ open, item, isNew, context, onSave, onDelete, onClose }: DrawerProps) {
  const [draft, setDraft] = useState<LineItem>(() => item ?? BLANK_LINE());
  const [attemptedSave, setAttemptedSave] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) { setDraft(item ?? BLANK_LINE()); setAttemptedSave(false); }
  }, [open, item]);

  function set<K extends keyof LineItem>(k: K, v: LineItem[K]) {
    setDraft((prev) => ({ ...prev, [k]: v }));
  }

  const lineTotal = draft.qty * draft.unitCost;

  const itemError = draft.item.trim() ? null : "Description is required.";
  const costError = draft.unitCost > 0 ? null : "Unit cost must be greater than ₱0.";
  const hasErrors = !!(itemError || costError);

  function handleSaveClick() {
    if (hasErrors) { setAttemptedSave(true); return; }
    onSave(draft);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        style={{ maxWidth: 560 }}
        className="flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <SheetTitle>
            {isNew
              ? `Add Line Item — ${context === "co" ? "Capital Outlay" : "Maintenance and Other Operating Expenses"}`
              : `Edit Line Item — ${context === "co" ? "Capital Outlay" : "Maintenance and Other Operating Expenses"}`}
          </SheetTitle>
          <SheetDescription>
            {context === "co"
              ? "Capital Outlay — assets and intangible property with useful life > 1 year, typically above the ₱50,000 capitalization threshold"
              : "MOOE — recurring costs, subscriptions, consumables, cloud hosting, and low-value items"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Item / Description</label>
            <Textarea
              value={draft.item}
              onChange={(e) => set("item", e.target.value)}
              placeholder="Describe the item or service being procured…"
              rows={3}
              aria-invalid={attemptedSave && !!itemError}
            />
            {attemptedSave && itemError && <p className="text-xs text-destructive">{itemError}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Office / Unit</label>
            <Input
              type="text"
              list={OFFICE_LIST_ID}
              value={draft.office}
              onChange={(e) => set("office", e.target.value)}
              placeholder="Which office or unit will use this?"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Expense Category</label>
            <CategorySelect
              value={draft.categoryId}
              expenseClass={context === "co" ? "capitalOutlay" : "mooe"}
              onChange={(categoryId) => set("categoryId", categoryId)}
            />
            <p className="text-xs text-muted-foreground">
              One of the 30 official DICT expense categories (ISSP handout). Items without a
              category are excluded from B.4.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Fund Source</label>
            <select
              className="h-8 w-full rounded-lg border border-border bg-card px-2.5 py-1 text-sm text-foreground outline-none hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer"
              value={draft.fundSource}
              onChange={(e) => set("fundSource", e.target.value)}
            >
              {FUND_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit Cost (₱)</label>
              <NumberInput
                min={0}
                currency
                value={draft.unitCost}
                onValueChange={(n) => set("unitCost", n)}
                aria-invalid={attemptedSave && !!costError}
              />
              {attemptedSave && costError && <p className="text-xs text-destructive">{costError}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Physical Target</label>
              <NumberInput
                min={1}
                value={draft.qty}
                onValueChange={(n) => set("qty", n)}
              />
              <p className="text-xs text-muted-foreground">Units to procure or deploy in this year.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">Line Total</span>
            <span className="font-bold text-base tabular-nums">{php(lineTotal)}</span>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t flex-row items-center justify-between gap-2 shrink-0">
          {!isNew ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSaveClick}>
              {isNew ? "Add Item" : "Save Changes"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Line Items Table ──────────────────────────────────────────────────────────

interface DrawerState {
  open: boolean;
  idx: number;
  item: LineItem | null;
}

const INPUT_CLS =
  "w-full rounded px-2 py-1.5 text-sm bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring";

function LineTable({
  title,
  context,
  lines,
  mode,
  onUpdate,
}: {
  title: string;
  context: "co" | "mooe";
  lines: LineItem[];
  mode: LineMode;
  onUpdate: (lines: LineItem[]) => void;
}) {
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, idx: -1, item: null });

  function openNew() { setDrawer({ open: true, idx: -1, item: null }); }
  function openEdit(idx: number) { setDrawer({ open: true, idx, item: lines[idx] }); }
  function closeDrawer() { setDrawer({ open: false, idx: -1, item: null }); }

  function handleSave(updated: LineItem) {
    if (drawer.idx === -1) {
      onUpdate([...lines, updated]);
    } else {
      onUpdate(lines.map((l, i) => (i === drawer.idx ? updated : l)));
    }
    closeDrawer();
  }

  function handleDelete() {
    onUpdate(lines.filter((_, i) => i !== drawer.idx));
    closeDrawer();
  }

  function updateField(idx: number, field: keyof LineItem, value: string | number) {
    onUpdate(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function deleteLine(idx: number) {
    onUpdate(lines.filter((_, i) => i !== idx));
  }

  const total = sumLines(lines);

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        {/* Header band */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-muted/40 border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-xs text-muted-foreground">
              {lines.length} item{lines.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-sm font-bold">{php(total)}</span>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={openNew}>
              <Plus className="h-3 w-3" />
              Add Line
            </Button>
          </div>
        </div>

        {/* ── List mode ──────────────────────────────────────────────────── */}
        {mode === "list" && (
          lines.length > 0 ? (
            <div className="divide-y divide-border">
              {lines.map((line, idx) => (
                <div
                  key={line.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 group transition-colors cursor-pointer"
                  onClick={() => openEdit(idx)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 break-words">
                      {line.item || (
                        <span className="text-muted-foreground/60 italic">Unnamed item</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {line.categoryId ? (
                        categoryName(line.categoryId)
                      ) : (
                        <CategoryMissing />
                      )}
                      {line.office ? ` · ${line.office}` : ""}
                      {line.fundSource !== FUND_SOURCES[0] ? ` · ${line.fundSource}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {php(totalLine(line))}
                  </span>
                  <button
                    type="button"
                    aria-label="Edit line item"
                    className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
                    onClick={(e) => { e.stopPropagation(); openEdit(idx); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-t">
                <span className="text-sm font-semibold text-muted-foreground">Subtotal</span>
                <span className="text-sm font-bold tabular-nums">{php(total)}</span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">
                No items yet.{" "}
                <button type="button" onClick={openNew} className="font-medium text-primary hover:underline">
                  Add one.
                </button>
              </p>
            </div>
          )
        )}

        {/* ── Table mode ─────────────────────────────────────────────────── */}
        {mode === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="border-r px-3 py-2 text-left font-semibold">Item / Description</th>
                  <th className="border-r px-3 py-2 text-left font-semibold w-32">Office / Unit</th>
                  <th className="border-r px-3 py-2 text-left font-semibold w-44">Category</th>
                  <th className="border-r px-3 py-2 text-left font-semibold w-44">Fund Source</th>
                  <th className="border-r px-3 py-2 text-right font-semibold w-28">Unit Cost ₱</th>
                  <th className="border-r px-3 py-2 text-right font-semibold w-24">Physical Target</th>
                  <th className="border-r px-3 py-2 text-right font-semibold w-28">Total ₱</th>
                  <th className="px-2 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground text-sm border-b">
                      No items yet.{" "}
                      <button type="button" onClick={openNew} className="font-medium text-primary hover:underline">
                        Add one.
                      </button>
                    </td>
                  </tr>
                )}
                {lines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-muted/20 border-b">
                    <td className="border-r px-2 py-1">
                      <input
                        type="text"
                        className={INPUT_CLS}
                        placeholder="Item description…"
                        value={line.item}
                        onChange={(e) => updateField(idx, "item", e.target.value)}
                      />
                    </td>
                    <td className="border-r px-2 py-1">
                      <input
                        type="text"
                        list={OFFICE_LIST_ID}
                        className={INPUT_CLS}
                        placeholder="Office…"
                        value={line.office}
                        onChange={(e) => updateField(idx, "office", e.target.value)}
                      />
                    </td>
                    <td className="border-r px-2 py-1">
                      <button
                        type="button"
                        onClick={() => openEdit(idx)}
                        className="w-full text-left rounded px-2 py-1.5 text-xs bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring group flex items-center justify-between gap-1 min-h-[2rem]"
                        title="Click to edit expense category"
                      >
                        <span
                          className={
                            line.categoryId
                              ? "text-foreground truncate"
                              : "text-warning italic"
                          }
                        >
                          {line.categoryId ? categoryName(line.categoryId) : "Set category…"}
                        </span>
                        <Pencil className="h-3 w-3 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground" />
                      </button>
                    </td>
                    <td className="border-r px-2 py-1">
                      <select
                        className="w-full rounded px-2 py-1.5 text-xs bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring border-0 cursor-pointer"
                        value={line.fundSource}
                        onChange={(e) => updateField(idx, "fundSource", e.target.value)}
                      >
                        {FUND_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="border-r px-2 py-1">
                      <NumberInput
                        unstyled
                        min={0}
                        currency
                        className={`${INPUT_CLS} text-right`}
                        value={line.unitCost}
                        onValueChange={(n) => updateField(idx, "unitCost", n)}
                      />
                    </td>
                    <td className="border-r px-2 py-1">
                      <NumberInput
                        unstyled
                        min={1}
                        className={`${INPUT_CLS} text-right`}
                        value={line.qty}
                        onValueChange={(n) => updateField(idx, "qty", n)}
                      />
                    </td>
                    <td className="border-r px-3 py-2 text-right tabular-nums text-sm font-medium">
                      {php(totalLine(line))}
                    </td>
                    <td className="px-1 py-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete line"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteLine(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {lines.length > 0 && (
                  <tr className="bg-muted/50 font-semibold">
                    <td colSpan={6} className="border-r px-3 py-2 text-right text-sm text-muted-foreground">
                      Subtotal
                    </td>
                    <td className="border-r px-3 py-2 text-right text-sm tabular-nums">
                      {php(total)}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LineItemDrawer
        open={drawer.open}
        item={drawer.item}
        isNew={drawer.idx === -1}
        context={context}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={closeDrawer}
      />
    </>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  color,
  children,
}: {
  title: string;
  description?: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
      <div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

// ─── Main Form ─────────────────────────────────────────────────────────────────

const EMPTY_BUDGET = (): YearBudget => ({
  officeProductivity: { capitalOutlay: [], mooe: [] },
  internalProjects: {},
  crossAgencyProjects: {},
  continuingCosts: { mooe: [] },
});

const LINE_MODE_STORAGE_KEY = "issp-part4-line-mode";

export function Part4YearForm({
  year,
  yearKey,
  initialData,
  internalProjects,
  crossAgencyProjects,
  hideNonProjectCategories = false,
  liveProjectIds,
}: Part4YearFormProps) {
  const [budget, setBudget] = useState<YearBudget>(() => {
    const base = EMPTY_BUDGET();
    if (!initialData) return base;
    const ip: Record<string, ProjectBudget> = { ...base.internalProjects, ...initialData.internalProjects };
    const cp: Record<string, ProjectBudget> = {
      ...base.crossAgencyProjects,
      ...initialData.crossAgencyProjects,
    };
    internalProjects.forEach((p) => {
      if (!ip[p.id]) ip[p.id] = { projectTitle: p.title, capitalOutlay: [], mooe: [] };
    });
    crossAgencyProjects.forEach((p) => {
      if (!cp[p.id]) cp[p.id] = { projectTitle: p.title, capitalOutlay: [], mooe: [] };
    });
    return { ...base, ...initialData, internalProjects: ip, crossAgencyProjects: cp };
  });

  const [lineMode, switchLineMode] = usePersistedLineMode(LINE_MODE_STORAGE_KEY);

  const sectionId = `part4/${yearKey}` as `part4/${"year1" | "year2" | "year3"}`;
  const { debouncedSave } = useLocalSave("part4", sectionId);

  const save = useCallback(
    (next: YearBudget) => {
      setBudget(next);
      debouncedSave({ [yearKey]: next });
    },
    [debouncedSave, yearKey]
  );

  // Totals follow the sections this page renders (duration-filtered), not
  // every bucket in state — legacy off-duration buckets must not count.
  const bucketTotal = (pid: string) => {
    const pb = budget.internalProjects[pid] ?? budget.crossAgencyProjects[pid];
    return pb ? sumLines(pb.capitalOutlay) + sumLines(pb.mooe) : 0;
  };
  const grandTotal =
    sumLines(budget.officeProductivity.capitalOutlay) +
    sumLines(budget.officeProductivity.mooe) +
    internalProjects.reduce((s, p) => s + bucketTotal(p.id), 0) +
    crossAgencyProjects.reduce((s, p) => s + bucketTotal(p.id), 0) +
    sumLines(budget.continuingCosts.mooe);

  // Legacy data guard: budget lines this page does not list, so no total
  // counts them (countedPart4). Two causes — the project's Part III-E duration
  // does not cover this year (the duration picker now blocks creating these),
  // or the project was deleted (project delete now removes its budget). Loaded
  // files may still carry either — name them instead of silently dropping.
  const unlistedBuckets = (Object.entries(budget.internalProjects) as [string, ProjectBudget][])
    .concat(Object.entries(budget.crossAgencyProjects) as [string, ProjectBudget][])
    .filter(([pid, pb]) =>
      (pb.capitalOutlay?.length ?? 0) + (pb.mooe?.length ?? 0) > 0 &&
      !internalProjects.some((p) => p.id === pid) &&
      !crossAgencyProjects.some((p) => p.id === pid),
    );
  const deletedBuckets = unlistedBuckets.filter(([pid]) => !liveProjectIds.includes(pid));
  const offDurationBuckets = unlistedBuckets.filter(([pid]) => liveProjectIds.includes(pid));
  const describeBuckets = (buckets: [string, ProjectBudget][]) =>
    buckets
      .map(([pid, pb]) => {
        const lines = [...(pb.capitalOutlay ?? []), ...(pb.mooe ?? [])];
        return `${pb.projectTitle || pid} (${lines.length} line${lines.length === 1 ? "" : "s"}, ${php(sumLines(lines))})`;
      })
      .join(", ");

  function removeDeletedProjectLines() {
    const drop = new Set(deletedBuckets.map(([pid]) => pid));
    const keep = (m: Record<string, ProjectBudget>) => Object.fromEntries(Object.entries(m).filter(([pid]) => !drop.has(pid)));
    save({ ...budget, internalProjects: keep(budget.internalProjects), crossAgencyProjects: keep(budget.crossAgencyProjects) });
  }

  const sectionTitle = `Resource Requirements — ${year}`;
  const sectionDesc = `Enter all ICT expenditures for ${year}. Totals are computed automatically.`;

  return (
    <SectionShell
      sectionId={sectionId}
      title={sectionTitle}
      description={sectionDesc}
      statBlock={{ label: "Year Total", value: php(grandTotal) }}
    >
      <datalist id={OFFICE_LIST_ID}>
        {OFFICE_SUGGESTIONS.map((office) => (
          <option key={office} value={office} />
        ))}
      </datalist>
      {offDurationBuckets.length > 0 && (
        <div className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-xs text-warning" role="alert">
          <span className="font-medium">Outside project duration:</span>{" "}
          {describeBuckets(offDurationBuckets)}.
          These lines are hidden from {year} because the project&rsquo;s Part III-E duration does not cover it. They are
          not counted in any total (year, Summary B.1–B.4, Total Project Cost) and are not printed.
          Lengthen the duration in Part III-E or move the lines to another category.
        </div>
      )}
      {deletedBuckets.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-xs text-warning" role="alert">
          <p className="flex-1 min-w-0">
            <span className="font-medium">Deleted project:</span>{" "}
            {describeBuckets(deletedBuckets)}.
            These lines belong to a project that is no longer in Part III-E. They are not counted in any total and
            are not printed.
          </p>
          <ConfirmDeleteButton
            onDelete={removeDeletedProjectLines}
            ariaLabel="Remove the deleted project's lines"
            confirmText="Remove lines?"
          />
        </div>
      )}

      {/* Legend + view toggle */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground rounded-lg border bg-muted/20 px-4 py-2.5">
        <span className="font-medium text-foreground/50">Legend:</span>
        {[
          { color: "var(--budget-1)", label: "Office Productivity" },
          { color: "var(--budget-2)", label: "Internal ICT Projects" },
          { color: "var(--budget-3)", label: "Cross-Agency ICT Projects" },
          { color: "var(--budget-4)", label: "Continuing Costs" },
        ]
          // Tokens stay bound to their labels — hidden categories drop out
          // rather than shifting the remaining colors.
          .filter(({ label }) =>
            !hideNonProjectCategories ||
            (label !== "Office Productivity" && label !== "Continuing Costs")
          )
          .map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
        <LineModeToggle mode={lineMode} onChange={switchLineMode} className="ml-auto" />
      </div>

      {/* A — Office Productivity — hidden in project-filtered scoped files
          only (the slice also empties its data) */}
      {!hideNonProjectCategories && (
        <SectionCard
          title="Office Productivity"
          description="Agency-wide ICT expenses not tied to a specific project"
          color="var(--budget-1)"
        >
          <LineTable
            title="Capital Outlay"
            context="co"
            lines={budget.officeProductivity.capitalOutlay}
            mode={lineMode}
            onUpdate={(lines) =>
              save({
                ...budget,
                officeProductivity: { ...budget.officeProductivity, capitalOutlay: lines },
              })
            }
          />
          <LineTable
            title="Maintenance and Other Operating Expenses"
            context="mooe"
            lines={budget.officeProductivity.mooe}
            mode={lineMode}
            onUpdate={(lines) =>
              save({
                ...budget,
                officeProductivity: { ...budget.officeProductivity, mooe: lines },
              })
            }
          />
        </SectionCard>
      )}

      {/* B… — Internal Projects */}
      {internalProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <p>No Internal ICT Projects defined in Part III-E.1.</p>
          <Link
            href="/editor/part3/e1"
            className="mt-1 inline-block font-medium text-primary hover:underline"
          >
            Add projects in Part III-E.1 →
          </Link>
        </div>
      ) : (
        internalProjects.map((proj, idx) => {
          const pb = budget.internalProjects[proj.id] ?? {
            projectTitle: proj.title,
            capitalOutlay: [],
            mooe: [],
          };
          return (
            <SectionCard
              key={proj.id}
              title={`Internal ICT Project #${idx + 1}: ${proj.title}`}
              description="Costs directly attributable to this internal ICT project"
              color="var(--budget-2)"
            >
              <LineTable
                title="Capital Outlay"
                context="co"
                lines={pb.capitalOutlay}
                mode={lineMode}
                onUpdate={(lines) =>
                  save({
                    ...budget,
                    internalProjects: {
                      ...budget.internalProjects,
                      [proj.id]: { ...pb, capitalOutlay: lines },
                    },
                  })
                }
              />
              <LineTable
                title="Maintenance and Other Operating Expenses"
                context="mooe"
                lines={pb.mooe}
                mode={lineMode}
                onUpdate={(lines) =>
                  save({
                    ...budget,
                    internalProjects: {
                      ...budget.internalProjects,
                      [proj.id]: { ...pb, mooe: lines },
                    },
                  })
                }
              />
            </SectionCard>
          );
        })
      )}

      {/* Cross-Agency Projects */}
      {crossAgencyProjects.length > 0 &&
        crossAgencyProjects.map((proj, idx) => {
          const pb = budget.crossAgencyProjects[proj.id] ?? {
            projectTitle: proj.title,
            capitalOutlay: [],
            mooe: [],
          };
          return (
            <SectionCard
              key={proj.id}
              title={`Cross-Agency ICT Project #${idx + 1}: ${proj.title}`}
              description="Costs for this cross-agency ICT project"
              color="var(--budget-3)"
            >
              <LineTable
                title="Capital Outlay"
                context="co"
                lines={pb.capitalOutlay}
                mode={lineMode}
                onUpdate={(lines) =>
                  save({
                    ...budget,
                    crossAgencyProjects: {
                      ...budget.crossAgencyProjects,
                      [proj.id]: { ...pb, capitalOutlay: lines },
                    },
                  })
                }
              />
              <LineTable
                title="Maintenance and Other Operating Expenses"
                context="mooe"
                lines={pb.mooe}
                mode={lineMode}
                onUpdate={(lines) =>
                  save({
                    ...budget,
                    crossAgencyProjects: {
                      ...budget.crossAgencyProjects,
                      [proj.id]: { ...pb, mooe: lines },
                    },
                  })
                }
              />
            </SectionCard>
          );
        })}

      {/* Continuing Costs — hidden in project-filtered scoped files only
          (the slice also empties its data) */}
      {!hideNonProjectCategories && (
        <SectionCard
          title="Continuing Costs"
          description="Subscriptions, maintenance contracts, and other ongoing ICT costs"
          color="var(--budget-4)"
        >
          <LineTable
            title="Maintenance and Other Operating Expenses"
            context="mooe"
            lines={budget.continuingCosts.mooe}
            mode={lineMode}
            onUpdate={(lines) => save({ ...budget, continuingCosts: { mooe: lines } })}
          />
        </SectionCard>
      )}

      {/* Grand Total */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-6 py-4">
        <span className="font-semibold">Grand Total — Year {year}</span>
        <span className="text-xl font-bold text-primary">{php(grandTotal)}</span>
      </div>
    </SectionShell>
  );
}
