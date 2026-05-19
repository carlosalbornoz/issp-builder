"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SaveStatusIndicator } from "@/components/issp-editor/save-status-indicator";
import { useLocalSave } from "@/hooks/use-local-save";
import { UacsCombobox } from "@/components/issp-editor/uacs-combobox";
import { Plus, Trash2, Info, ExternalLink } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LineItem {
  id: string;
  item: string;
  office: string;
  uacsCode: string;
  uacsLabel: string;
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

const BLANK_LINE = (): LineItem => ({
  id: genId(),
  item: "",
  office: "",
  uacsCode: "",
  uacsLabel: "",
  fundSource: "General Appropriations Act (GAA)",
  qty: 1,
  unitCost: 0,
});

function totalLine(l: LineItem) {
  return l.qty * l.unitCost;
}

function sumLines(lines: LineItem[]) {
  return lines.reduce((s, l) => s + totalLine(l), 0);
}

function php(n: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(n);
}

function alpha(n: number) {
  return String.fromCharCode(65 + n); // 0→A, 1→B, …
}

// ─── Line Item Row ─────────────────────────────────────────────────────────────

function LineRow({
  line,
  context,
  onChange,
  onRemove,
}: {
  line: LineItem;
  context: "co" | "mooe";
  onChange: (updated: LineItem) => void;
  onRemove: () => void;
}) {
  function set<K extends keyof LineItem>(k: K, v: LineItem[K]) {
    onChange({ ...line, [k]: v });
  }

  const cellCls = "border-r border-border last:border-r-0 px-3 py-1";
  const inputCls =
    "w-full bg-transparent text-sm outline-none focus:bg-muted/40 rounded px-2 py-0.5 placeholder:text-muted-foreground/50";

  return (
    <tr className="border-b border-border hover:bg-muted/10 group">
      <td className={cn(cellCls, "min-w-[260px]")}>
        <input
          type="text"
          className={inputCls}
          placeholder="Description of item/service"
          value={line.item}
          onChange={(e) => set("item", e.target.value)}
        />
      </td>
      <td className={cn(cellCls, "min-w-[140px]")}>
        <input
          type="text"
          className={inputCls}
          placeholder="Office/unit"
          value={line.office}
          onChange={(e) => set("office", e.target.value)}
        />
      </td>
      <td className={cn(cellCls, "min-w-[260px]")}>
        <UacsCombobox
          value={line.uacsCode}
          context={context}
          onChange={(uacs, label) => onChange({ ...line, uacsCode: uacs, uacsLabel: label })}
        />
      </td>
      <td className={cn(cellCls, "min-w-[160px]")}>
        <select
          className={cn(inputCls, "cursor-pointer")}
          value={line.fundSource}
          onChange={(e) => set("fundSource", e.target.value)}
        >
          <option>General Appropriations Act (GAA)</option>
          <option>Foreign-Assisted</option>
          <option>Locally Funded</option>
          <option>Other Income Generating Sources</option>
        </select>
      </td>
      <td className={cn(cellCls, "w-20 text-right")}>
        <input
          type="number"
          min={1}
          className={cn(inputCls, "text-right")}
          value={line.qty}
          onChange={(e) => set("qty", Math.max(1, Number(e.target.value)))}
        />
      </td>
      <td className={cn(cellCls, "w-32 text-right")}>
        <input
          type="number"
          min={0}
          step={0.01}
          className={cn(inputCls, "text-right")}
          value={line.unitCost}
          onChange={(e) => set("unitCost", Number(e.target.value))}
        />
      </td>
      <td className={cn(cellCls, "w-32 text-right font-medium text-sm bg-muted/30")}>
        {php(totalLine(line))}
      </td>
      <td className="px-2 py-1 w-10 text-center border-l border-border">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove line item"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

// ─── Line Items Table ──────────────────────────────────────────────────────────

function LineTable({
  title,
  context,
  lines,
  onUpdate,
  badge,
}: {
  title: string;
  context: "co" | "mooe";
  lines: LineItem[];
  onUpdate: (lines: LineItem[]) => void;
  badge?: string;
}) {
  function addLine() {
    onUpdate([...lines, BLANK_LINE()]);
  }

  function updateLine(idx: number, updated: LineItem) {
    onUpdate(lines.map((l, i) => (i === idx ? updated : l)));
  }

  function removeLine(idx: number) {
    onUpdate(lines.filter((_, i) => i !== idx));
  }

  const total = sumLines(lines);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge && (
            <Badge variant="outline" className="text-[10px] h-4">
              {badge}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            ({lines.length} item{lines.length !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">{php(total)}</span>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addLine}>
            <Plus className="h-3 w-3" />
            Add Line
          </Button>
        </div>
      </div>

      {lines.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 text-xs font-medium text-muted-foreground">
                <th className="border-r border-b border-border px-3 py-2 text-left">Item / Description</th>
                <th className="border-r border-b border-border px-3 py-2 text-left">Office Location</th>
                <th className="border-r border-b border-border px-3 py-2 text-left">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <a
                            href="/uacs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                          />
                        }
                      >
                        UACS Code
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Browse all UACS codes in the UACS Explorer
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </th>
                <th className="border-r border-b border-border px-3 py-2 text-left">Fund Source</th>
                <th className="border-r border-b border-border px-3 py-2 text-right">Physical Target</th>
                <th className="border-r border-b border-border px-3 py-2 text-right">Unit Cost (₱)</th>
                <th className="border-r border-b border-border px-3 py-2 text-right bg-muted/30">Total (₱)</th>
                <th className="border-b border-border w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <LineRow
                  key={line.id}
                  line={line}
                  context={context}
                  onChange={(u) => updateLine(idx, u)}
                  onRemove={() => removeLine(idx)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-semibold text-sm">
                <td colSpan={6} className="border-t border-border px-3 py-2 text-right text-muted-foreground">
                  Subtotal
                </td>
                <td className="border-t border-border px-3 py-2 text-right text-primary font-bold">{php(total)}</td>
                <td className="border-t border-l border-border w-10" />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-muted/20 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            No items yet.{" "}
            <button type="button" onClick={addLine} className="font-medium text-primary hover:underline">
              Add one.
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  colorClass,
  children,
}: {
  title: string;
  description?: string;
  colorClass: string;
  children: React.ReactNode;
}) {
  const total = 0; // totals shown inside via LineTable
  void total;
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className={cn("h-1 w-8 rounded-full mt-2 shrink-0", colorClass)} />
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

// ─── Main Form ─────────────────────────────────────────────────────────────────

const EMPTY_BUDGET = (): YearBudget => ({
  officeProductivity: { capitalOutlay: [], mooe: [] },
  internalProjects: {},
  crossAgencyProjects: {},
  continuingCosts: { mooe: [] },
});

export function Part4YearForm({
  year,
  yearKey,
  initialData,
  internalProjects,
  crossAgencyProjects,
}: Part4YearFormProps) {
  const router = useRouter();
    const [budget, setBudget] = useState<YearBudget>(() => {
    const base = EMPTY_BUDGET();
    if (!initialData) return base;
    // Ensure all project slots exist
    const ip: Record<string, ProjectBudget> = { ...base.internalProjects, ...initialData.internalProjects };
    const cp: Record<string, ProjectBudget> = { ...base.crossAgencyProjects, ...initialData.crossAgencyProjects };
    internalProjects.forEach((p) => {
      if (!ip[p.id]) ip[p.id] = { projectTitle: p.title, capitalOutlay: [], mooe: [] };
    });
    crossAgencyProjects.forEach((p) => {
      if (!cp[p.id]) cp[p.id] = { projectTitle: p.title, capitalOutlay: [], mooe: [] };
    });
    return { ...base, ...initialData, internalProjects: ip, crossAgencyProjects: cp };
  });

  const { status, debouncedSave } = useLocalSave("part4");

  const save = useCallback(
    (next: YearBudget) => {
      setBudget(next);
      debouncedSave({ [yearKey]: next });
    },
    [debouncedSave, yearKey]
  );

  // ─── Grand total ────────────────────────────────────────────────────────────
  const grandTotal =
    sumLines(budget.officeProductivity.capitalOutlay) +
    sumLines(budget.officeProductivity.mooe) +
    Object.values(budget.internalProjects).reduce(
      (s, p) => s + sumLines(p.capitalOutlay) + sumLines(p.mooe), 0
    ) +
    Object.values(budget.crossAgencyProjects).reduce(
      (s, p) => s + sumLines(p.capitalOutlay) + sumLines(p.mooe), 0
    ) +
    sumLines(budget.continuingCosts.mooe);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-1">
            Part IV · Year {year - (internalProjects.length > 0 ? 0 : 0)} Breakdown
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            Resource Requirements — {year}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter all ICT expenditures for {year}. Totals are computed automatically.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Year {year === internalProjects.length ? "" : ""} Total</p>
            <p className="text-lg font-bold text-primary">{php(grandTotal)}</p>
          </div>
          <SaveStatusIndicator status={status} />
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm flex gap-2">
        <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-800">
          <strong>Tip:</strong> Capital Outlay (CO) items are assets over ₱50,000 with useful life &gt;1 year.
          MOOE covers recurring costs and items under ₱50,000. Use the UACS combobox to select the correct accounting code.
        </div>
      </div>

      {/* A — Office Productivity */}
      <SectionCard
        title="A. Office Productivity / General ICT"
        description="Agency-wide ICT expenses not tied to a specific project"
        colorClass="bg-blue-500"
      >
        <LineTable
          title="Capital Outlay (CO)"
          context="co"
          badge="CO"
          lines={budget.officeProductivity.capitalOutlay}
          onUpdate={(lines) =>
            save({ ...budget, officeProductivity: { ...budget.officeProductivity, capitalOutlay: lines } })
          }
        />
        <LineTable
          title="Maintenance & Other Operating Expenses (MOOE)"
          context="mooe"
          badge="MOOE"
          lines={budget.officeProductivity.mooe}
          onUpdate={(lines) =>
            save({ ...budget, officeProductivity: { ...budget.officeProductivity, mooe: lines } })
          }
        />
      </SectionCard>

      {/* B… — Internal Projects (one letter each) */}
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
          const letter = alpha(1 + idx); // A=office prod, B=first project, …
          const pb = budget.internalProjects[proj.id] ?? {
            projectTitle: proj.title,
            capitalOutlay: [],
            mooe: [],
          };
          return (
            <SectionCard
              key={proj.id}
              title={`${letter}. Internal Project: ${proj.title}`}
              description="Costs directly attributable to this internal ICT project"
              colorClass="bg-violet-500"
            >
              <LineTable
                title="Capital Outlay (CO)"
                context="co"
                badge="CO"
                lines={pb.capitalOutlay}
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
                title="MOOE"
                context="mooe"
                badge="MOOE"
                lines={pb.mooe}
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

      {/* Cross-Agency Projects — letters continue after internal projects */}
      {crossAgencyProjects.length > 0 &&
        crossAgencyProjects.map((proj, idx) => {
          const letter = alpha(1 + internalProjects.length + idx);
          const pb = budget.crossAgencyProjects[proj.id] ?? {
            projectTitle: proj.title,
            capitalOutlay: [],
            mooe: [],
          };
          return (
            <SectionCard
              key={proj.id}
              title={`${letter}. Cross-Agency Project: ${proj.title}`}
              description="Costs for this cross-agency ICT project"
              colorClass="bg-amber-500"
            >
              <LineTable
                title="Capital Outlay (CO)"
                context="co"
                badge="CO"
                lines={pb.capitalOutlay}
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
                title="MOOE"
                context="mooe"
                badge="MOOE"
                lines={pb.mooe}
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

      {/* Last letter — Continuing Costs */}
      <SectionCard
        title={`${alpha(1 + internalProjects.length + crossAgencyProjects.length)}. Continuing / Recurring Costs`}
        description="Subscriptions, maintenance contracts, and other ongoing ICT costs"
        colorClass="bg-rose-500"
      >
        <LineTable
          title="MOOE"
          context="mooe"
          badge="MOOE"
          lines={budget.continuingCosts.mooe}
          onUpdate={(lines) =>
            save({ ...budget, continuingCosts: { mooe: lines } })
          }
        />
      </SectionCard>

      {/* Grand Total Bar */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-6 py-4">
        <span className="font-semibold">Grand Total — Year {year}</span>
        <span className="text-xl font-bold text-primary">{php(grandTotal)}</span>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => router.push(yearKey === "year1"
                  ? "/editor/part3/f"
                  : yearKey === "year2"
                  ? "/editor/part4/year1"
                  : "/editor/part4/year2")}
        >
          ←{" "}
          {yearKey === "year1"
            ? "Part III-F: Performance"
            : yearKey === "year2"
            ? `Year ${year - 1}`
            : `Year ${year - 1}`}
        </Button>
        <Button
          onClick={() => router.push(
            yearKey === "year3"
              ? "/editor/part4/summary"
              : `/editor/part4/${yearKey === "year1" ? "year2" : "year3"}`
          )}
        >
          {yearKey === "year3" ? "Summary of Investments →" : `Year ${year + 1} →`}
        </Button>
      </div>
    </div>
  );
}
