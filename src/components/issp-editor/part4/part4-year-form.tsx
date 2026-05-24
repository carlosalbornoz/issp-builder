"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocalSave } from "@/hooks/use-local-save";
import { UacsCombobox } from "@/components/issp-editor/uacs-combobox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { SectionShell } from "@/components/editor/section-shell";

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
  return String.fromCharCode(65 + n);
}

const FUND_SOURCES = [
  "General Appropriations Act (GAA)",
  "Foreign-Assisted",
  "Locally Funded",
  "Other Income Generating Sources",
];

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

  useEffect(() => {
    // Drawer state intentionally resets when a different line item opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setDraft(item ?? BLANK_LINE());
  }, [open, item]);

  function set<K extends keyof LineItem>(k: K, v: LineItem[K]) {
    setDraft((prev) => ({ ...prev, [k]: v }));
  }

  const lineTotal = draft.qty * draft.unitCost;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
              ? `Add Line Item — ${context === "co" ? "Capital Outlay" : "Maintenance & Other Operating Expenses"}`
              : `Edit Line Item — ${context === "co" ? "Capital Outlay" : "Maintenance & Other Operating Expenses"}`}
          </SheetTitle>
          <SheetDescription>
            {context === "co"
              ? "Capital Outlay — assets and intangible property with useful life > 1 year, typically above the ₱50,000 capitalization threshold"
              : "MOOE — recurring costs, subscriptions, consumables, cloud hosting, and low-value items"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Item / Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Item / Description</label>
            <Textarea
              value={draft.item}
              onChange={(e) => set("item", e.target.value)}
              placeholder="Describe the item or service being procured…"
              rows={3}
            />
          </div>

          {/* Office / Unit */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Office / Unit</label>
            <Input
              type="text"
              value={draft.office}
              onChange={(e) => set("office", e.target.value)}
              placeholder="Which office or unit will use this?"
            />
          </div>

          {/* UACS Code */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">UACS Code</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <a
                        href={`${basePath}/uacs`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      />
                    }
                  >
                    Browse codes
                    <ExternalLink className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent side="left">Open UACS Explorer in a new tab</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <UacsCombobox
              value={draft.uacsCode}
              context={context}
              onChange={(uacs, label) => setDraft((prev) => ({ ...prev, uacsCode: uacs, uacsLabel: label }))}
            />
          </div>

          {/* Fund Source */}
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

          {/* Qty + Unit Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Physical Target</label>
              <Input
                type="number"
                min={1}
                value={draft.qty}
                onChange={(e) => set("qty", Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit Cost (₱)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={draft.unitCost}
                onChange={(e) => set("unitCost", Number(e.target.value))}
              />
            </div>
          </div>

          {/* Line total */}
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
            <Button size="sm" onClick={() => onSave(draft)}>
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

function LineTable({
  title,
  context,
  lines,
  onUpdate,
}: {
  title: string;
  context: "co" | "mooe";
  lines: LineItem[];
  onUpdate: (lines: LineItem[]) => void;
}) {
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, idx: -1, item: null });

  function openNew() {
    setDrawer({ open: true, idx: -1, item: null });
  }

  function openEdit(idx: number) {
    setDrawer({ open: true, idx, item: lines[idx] });
  }

  function closeDrawer() {
    setDrawer({ open: false, idx: -1, item: null });
  }

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

  const total = sumLines(lines);

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        {/* Table header band */}
        <div className="flex items-center justify-between bg-muted/40 border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-xs text-muted-foreground">
              {lines.length} item{lines.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">{php(total)}</span>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={openNew}>
              <Plus className="h-3 w-3" />
              Add Line
            </Button>
          </div>
        </div>

        {lines.length > 0 ? (
          <div className="divide-y divide-border">
            {lines.map((line, idx) => (
              <div
                key={line.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 group transition-colors cursor-pointer"
                onClick={() => openEdit(idx)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {line.item || <span className="text-muted-foreground/60 italic">Unnamed item</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {[
                      line.uacsLabel || (line.uacsCode ? `UACS ${line.uacsCode}` : null),
                      line.office || null,
                      line.fundSource !== FUND_SOURCES[0] ? line.fundSource : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No details yet"}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">{php(totalLine(line))}</span>
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
    <Card className="relative overflow-hidden pl-0">
      <div className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: color }} />
      <CardHeader className="pb-4 pl-5">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6 pl-5">{children}</CardContent>
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
  const [budget, setBudget] = useState<YearBudget>(() => {
    const base = EMPTY_BUDGET();
    if (!initialData) return base;
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

  const sectionId = `part4/${yearKey}` as `part4/${"year1" | "year2" | "year3"}`;
  const { debouncedSave } = useLocalSave("part4", sectionId);

  const save = useCallback(
    (next: YearBudget) => {
      setBudget(next);
      debouncedSave({ [yearKey]: next });
    },
    [debouncedSave, yearKey]
  );

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
  const sectionTitle = `Resource Requirements — ${year}`;
  const sectionDesc = `Enter all ICT expenditures for ${year}. Totals are computed automatically.`;

  return (
    <SectionShell
      sectionId={sectionId}
      title={sectionTitle}
      description={sectionDesc}
      statBlock={{ label: "Year Total", value: php(grandTotal) }}
    >

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground rounded-lg border bg-muted/20 px-4 py-2.5">
        <span className="font-medium text-foreground/50">Legend:</span>
        {[
          { color: "#3B82F6", label: "Office Productivity" },
          { color: "#8B5CF6", label: "Internal Projects" },
          { color: "#F59E0B", label: "Cross-Agency Projects" },
          { color: "#F43F5E", label: "Recurring Costs" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* A — Office Productivity */}
      <SectionCard
        title="A. Office Productivity / General ICT"
        description="Agency-wide ICT expenses not tied to a specific project"
        color="#3B82F6"
      >
        <LineTable
          title="Capital Outlay (CO)"
          context="co"
          lines={budget.officeProductivity.capitalOutlay}
          onUpdate={(lines) =>
            save({ ...budget, officeProductivity: { ...budget.officeProductivity, capitalOutlay: lines } })
          }
        />
        <LineTable
          title="Maintenance & Other Operating Expenses (MOOE)"
          context="mooe"
          lines={budget.officeProductivity.mooe}
          onUpdate={(lines) =>
            save({ ...budget, officeProductivity: { ...budget.officeProductivity, mooe: lines } })
          }
        />
      </SectionCard>

      {/* B… — Internal Projects */}
      {internalProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <p>No Internal ICT Projects defined in Part III-E.1.</p>
          <Link href="/editor/part3/e1" className="mt-1 inline-block font-medium text-primary hover:underline">
            Add projects in Part III-E.1 →
          </Link>
        </div>
      ) : (
        internalProjects.map((proj, idx) => {
          const letter = alpha(1 + idx);
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
              color="#8B5CF6"
            >
              <LineTable
                title="Capital Outlay (CO)"
                context="co"
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

      {/* Cross-Agency Projects */}
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
              color="#F59E0B"
            >
              <LineTable
                title="Capital Outlay (CO)"
                context="co"
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

      {/* Continuing Costs */}
      <SectionCard
        title={`${alpha(1 + internalProjects.length + crossAgencyProjects.length)}. Continuing / Recurring Costs`}
        description="Subscriptions, maintenance contracts, and other ongoing ICT costs"
        color="#F43F5E"
      >
        <LineTable
          title="MOOE"
          context="mooe"
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
    </SectionShell>
  );
}
