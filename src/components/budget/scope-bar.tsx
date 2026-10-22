"use client";

/**
 * The scope bar: what the dashboard is looking at, on one row. Sector, fiscal
 * year (dropdowns, so the row fits beside the sidebar), the secondary filters (cycle, type, fund) behind a Filters popover, the
 * agency chip, and the data-mode toggle, which stays visible at every width
 * because flipping it is the demo's lock beat. Below xl the filters move into
 * a Scope sheet and only the mode toggle stays inline.
 */

import { useId, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Info, Lock, SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { FilterSelect, type DataMode, type FyFilter } from "./views/shared";

const FY_OPTIONS: FyFilter[] = ["all", 2026, 2027, 2028, 2029, 2030];

export interface ScopeBarProps {
  sectors: { key: string; label: string; count: number }[];
  sector: string;
  onSector: (key: string | null) => void;
  fy: FyFilter;
  onFy: (fy: FyFilter) => void;
  cycle: string;
  onCycle: (v: string) => void;
  cycleOptions: [string, string][];
  type: string;
  onType: (v: string) => void;
  typeOptions: [string, string][];
  fund: string;
  onFund: (v: string) => void;
  fundOptions: [string, string][];
  agency?: { slug: string; acronym: string };
  onClearAgency: () => void;
  mode: DataMode;
  onMode: (mode: DataMode) => void;
  /** "700 line items · ₱4.82B across 5 fiscal years" */
  summary: string;
}

export function ScopeBar(props: ScopeBarProps) {
  const { sector, fy, cycle, type, fund, agency, onClearAgency, summary } = props;
  const secondaryCount = [cycle, type, fund].filter((v) => v !== "all").length;
  const scopeCount = secondaryCount + (sector !== "all" ? 1 : 0) + (fy !== "all" ? 1 : 0);

  return (
    <>
      {/* xl and up: everything on one row */}
      <div data-scope-bar="full" className="hidden xl:flex items-center gap-x-3 gap-y-2 min-w-0">
        <SectorSelect {...props} className="w-48" />
        <FySelect {...props} />
        <FiltersPopover {...props} count={secondaryCount} />
        {agency ? <AgencyChip agency={agency} onClear={onClearAgency} /> : null}
        <span className="hidden 2xl:inline text-xs text-muted-foreground truncate min-w-0">{summary}</span>
        <ModeToggle {...props} className="ml-auto" />
      </div>

      {/* below xl: a Scope sheet beside the always-visible mode toggle */}
      <div data-scope-bar="compact" className="flex xl:hidden items-center gap-2 min-w-0">
        <ScopeSheet {...props} count={scopeCount} />
        {agency ? <AgencyChip agency={agency} onClear={onClearAgency} compact /> : null}
        <ModeToggle {...props} compact className="ml-auto" />
      </div>
    </>
  );
}

const chipCls = (on: boolean) =>
  cn(
    "min-h-8 px-2.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    on ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
  );

const groupLabelCls = "text-[10px] uppercase tracking-widest text-muted-foreground";

function SectorSelect({ sectors, sector, onSector, className }: ScopeBarProps & { className?: string }) {
  return (
    <FilterSelect
      ariaLabel="Filter by PDP sector"
      className={className}
      value={sector}
      onChange={(v) => onSector(v === "all" ? null : v)}
      options={[["all", "All government"], ...sectors.map((s) => [s.key, `${s.label} · ${s.count}`] as [string, string])]}
    />
  );
}

function FySelect({ fy, onFy }: ScopeBarProps) {
  return (
    <FilterSelect
      ariaLabel="Filter by fiscal year"
      value={String(fy)}
      onChange={(v) => onFy(v === "all" ? "all" : (Number(v) as FyFilter))}
      options={FY_OPTIONS.map((o) => [String(o), o === "all" ? "All years" : `FY${o}`] as [string, string])}
    />
  );
}

function FyChips({ fy, onFy, wrap }: ScopeBarProps & { wrap?: boolean }) {
  return (
    <div className={cn("flex gap-1", wrap && "flex-wrap")} role="group" aria-label="Fiscal year">
      {FY_OPTIONS.map((option) => (
        <button key={String(option)} type="button" onClick={() => onFy(option)} aria-pressed={fy === option} className={chipCls(fy === option)}>
          {option === "all" ? "All years" : `FY${option}`}
        </button>
      ))}
    </div>
  );
}

function SecondaryFilters({ cycle, onCycle, cycleOptions, type, onType, typeOptions, fund, onFund, fundOptions }: ScopeBarProps) {
  return (
    <>
      <FilterSelect ariaLabel="Filter by plan cycle" className="w-full" value={cycle} onChange={onCycle} options={cycleOptions} />
      <FilterSelect ariaLabel="Filter by agency type" className="w-full" value={type} onChange={onType} options={typeOptions} />
      <FilterSelect ariaLabel="Filter by fund source" className="w-full" value={fund} onChange={onFund} options={fundOptions} />
    </>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span data-filter-count className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tabular-nums">
      {count}
    </span>
  );
}

function FiltersPopover(props: ScopeBarProps & { count: number }) {
  const { count, onCycle, onType, onFund } = props;
  return (
    <Popover.Root>
      <Popover.Trigger
        data-filters-trigger
        className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden /> Filters <CountBadge count={count} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="isolate z-50 outline-none">
          <Popover.Popup className="w-72 rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none space-y-2">
            <Popover.Title className={groupLabelCls}>Filters</Popover.Title>
            <SecondaryFilters {...props} />
            {count > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onCycle("all");
                  onType("all");
                  onFund("all");
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ScopeSheet(props: ScopeBarProps & { count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Scope${props.count ? `, ${props.count} active` : ""}`}
        className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden /> Scope <CountBadge count={props.count} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="gap-0 p-4 pb-6">
          <SheetTitle className="text-sm font-semibold mb-3">Scope</SheetTitle>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className={groupLabelCls}>Sector</p>
              <SectorSelect {...props} className="w-full" />
            </div>
            <div className="space-y-1.5">
              <p className={groupLabelCls}>Fiscal year</p>
              <FyChips {...props} wrap />
            </div>
            <div className="space-y-1.5">
              <p className={groupLabelCls}>Filters</p>
              <div className="grid sm:grid-cols-3 gap-2">
                <SecondaryFilters {...props} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function AgencyChip({ agency, onClear, compact }: { agency: { slug: string; acronym: string }; onClear: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Clear agency filter: ${agency.acronym}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/5 h-9 text-sm text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        compact ? "px-2" : "px-2.5"
      )}
    >
      {agency.acronym} <X className="w-3.5 h-3.5" aria-hidden />
    </button>
  );
}

function ModeToggle({ mode, onMode, compact, className }: ScopeBarProps & { compact?: boolean; className?: string }) {
  const options: [DataMode, string, string][] = [
    ["current", "Current form (v14)", "Current"],
    ["proposed", "Revised form (proposed)", "Revised"],
  ];
  const labelId = useId();
  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)} role="group" aria-labelledby={labelId}>
      <span id={labelId} className={cn(groupLabelCls, "items-center gap-1", compact ? "sr-only" : "inline-flex")}>
        {/* The word shows only where the row has room; the group keeps its name. */}
        <span className="sr-only 2xl:not-sr-only">Data mode</span>
        <span
          title={
            mode === "current"
              ? "Current form: figures from the ISSP form in use today. Each dimmed panel requires one proposed field or link."
              : "Revised form: includes proposed fields with mock data. Select Current form to show only what today's ISSP provides."
          }
          tabIndex={0}
          className="cursor-help inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Info className="w-3 h-3 text-muted-foreground/80" aria-hidden />
        </span>
      </span>
      <div className="flex gap-1">
        {options.map(([value, label, short]) => (
          <button
            key={value}
            type="button"
            onClick={() => onMode(value)}
            aria-pressed={mode === value}
            aria-label={compact ? label : undefined}
            className={cn(chipCls(mode === value), "inline-flex items-center gap-1.5")}
          >
            {value === "current" ? <Lock className="w-3 h-3" aria-hidden /> : null}
            {compact ? short : label}
          </button>
        ))}
      </div>
    </div>
  );
}
