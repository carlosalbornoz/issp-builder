"use client";

/**
 * Shared primitives for the dashboard's domain views: the view-switch types,
 * the control-bar prop bundle, and the small presentational pieces every view
 * reuses (Panel, Kpi, InsightBox, ProposedOnly, tiles, pills). Styling and
 * tokens are identical to the pre-navigation dashboard; this module exists so
 * ten view files do not each redefine them.
 */

import { useState } from "react";
import { ChevronDown, Info, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CorpusLineItem, CorpusProfile, RepositoryCorpus } from "@/lib/repository/corpus-types";
import type { ScreenKey } from "../nav";

// ─── View-switch types ────────────────────────────────────────────────────────

/** The dashboard screens; the key is the ?view= param value (see ../nav.ts). */
export type ViewKey = ScreenKey;

export type FyFilter = "all" | 2026 | 2027 | 2028 | 2029 | 2030;

/**
 * What the dashboard runs on: everything computable from the current ISSP form
 * (v14), or the same page with the proposed-field layers switched in. Flipping
 * to "current" ghosts every panel that depends on a v15 candidate field or an
 * external feed: the live demo of "extracted today vs. unlocked by refinement".
 */
export type DataMode = "current" | "proposed";

/** A line item with its owning agency attached, as the dashboard filters them. */
export type AgencyLine = CorpusLineItem & { acronym: string; slug: string };

/** Everything a view needs; the orchestrator computes the filtering once. */
export interface ViewProps {
  corpus: RepositoryCorpus;
  profiles: CorpusProfile[];
  lines: AgencyLine[];
  fy: FyFilter;
  mode: DataMode;
}

// ─── Presentational primitives ────────────────────────────────────────────────

export function Panel({
  title,
  sub,
  hint,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  sub?: string;
  /** Methodology note shown as an info-icon tooltip instead of a footnote. */
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5", className)}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          {Icon ? <Icon className="w-4 h-4 text-muted-foreground" /> : null}
          {title}
          {hint ? (
            <span title={hint} tabIndex={0} className="cursor-help inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
              <Info className="w-3.5 h-3.5 text-muted-foreground/80" aria-hidden />
            </span>
          ) : null}
        </h2>
        {sub ? <p className="text-xs text-muted-foreground mt-0.5">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  sub,
  title,
  highlight,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Exact value for the tooltip when `value` is compacted or truncated; defaults to `value`. */
  title?: string;
  highlight?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-lg border border-primary/25 bg-primary/5 px-4 py-3"
          : "rounded-lg ring-1 ring-foreground/10 bg-card px-4 py-3"
      }
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {Icon ? <Icon className="w-3 h-3" /> : null}
        {label}
      </div>
      <p className={cn("text-lg font-bold tabular-nums leading-tight truncate", highlight && "text-primary")} title={title ?? value}>
        {value}
      </p>
      {sub ? <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2" title={sub}>{sub}</p> : null}
    </div>
  );
}

/**
 * The view's ✨ More insights affordance: the narrative prose that used to sit
 * on the page as editorial boxes now opens on demand, presented as an
 * auto-drafted summary (labelled illustrative, same convention as the mock
 * layers). Items are computed from the live selection at render.
 */
export function InsightsButton({ items }: { items: React.ReactNode[] }) {
  const [open, setOpen] = useState(false);
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;
  return (
    <div className="min-w-0 w-full">
      <div className="flex justify-end">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="view-insights"
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            open
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-foreground/15 hover:border-foreground/30"
          )}
        >
          <span aria-hidden className="select-none">✨</span> More insights <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open ? (
        <section id="view-insights" className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5 mt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
            <h3 className="text-sm font-semibold">Insights</h3>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Auto-drafted · illustrative
            </span>
          </div>
          <ul className="space-y-2.5">
            {visible.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-[9px]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Every screen opens with one: its formal title (the sidebar label) and one line of scope. */
export function ViewHeader({
  eyebrow,
  title,
  lede,
  insights,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  /** Optional ✨ More insights content for this view. */
  insights?: React.ReactNode[];
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{eyebrow}</p> : null}
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight">{title}</h1>
          {lede ? <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mt-1">{lede}</p> : null}
        </div>
        {insights ? <InsightsButton items={insights} /> : null}
      </div>
    </div>
  );
}

/**
 * Current-form mode's signature move: the panel stays visible but dimmed behind a
 * lock naming the one field (or link) it waits on, "extracted today" vs "unlocked
 * by refinement", demonstrated live instead of asserted. The badge sits in flow
 * above the ghost, not overlaid: whatever its height, it can never cover the
 * title of the panel it locks.
 */
export function ProposedOnly({ mode, requires, children }: { mode: DataMode; requires: string; children: React.ReactNode }) {
  if (mode === "proposed") return <>{children}</>;
  return (
    <div className="rounded-xl">
      <div className="flex justify-center px-4 pb-3">
        <div className="rounded-lg border border-dashed border-foreground/30 bg-card px-4 py-3 text-center max-w-sm">
          <p className="text-xs font-semibold text-balance">
            <Lock className="w-3.5 h-3.5 inline-block align-[-2px] mr-1" /> Requires: {requires}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Unlocked by the revised ISSP form. Shown with mock data in Revised-form mode.
          </p>
        </div>
      </div>
      <div aria-hidden inert className="opacity-30 grayscale-[50%] select-none pointer-events-none">{children}</div>
    </div>
  );
}

/** The pill a panel earns when it runs on today's form with no new fields. */
export function TodayBadge({ children }: { children: React.ReactNode }) {
  return (
      <p className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success border border-success-border px-2.5 py-0.5 text-[10px] font-semibold">
        <span aria-hidden className="select-none">✓</span> {children}
      </p>
  );
}

export function CycleTile({ year, label, value, sub }: { year: string; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-card px-3 py-2.5 flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {year} · {label}
      </p>
      <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground leading-snug">{sub}</p>
    </div>
  );
}

export function StageTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-card px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-snug min-h-7">{label}</p>
      <p className="text-base font-bold tabular-nums leading-tight mt-0.5">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export function PostureTile({ label, value, sub, danger }: { label: string; value: string; sub: string; danger?: boolean }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", danger ? "border-destructive/30 bg-danger-bg/40" : "border-foreground/10 bg-card")}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-snug">{label}</p>
      <p className={cn("text-base font-bold tabular-nums leading-tight mt-0.5", danger && "text-destructive")}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export function RatePill({ rate }: { rate: number }) {
  const pctValue = Math.round(rate * 100);
  const cls =
    rate >= 0.85
      ? "bg-success-bg text-success border border-success-border"
      : rate >= 0.7
        ? "bg-warning-bg text-warning border border-warning-border"
        : "bg-danger-bg text-destructive border border-danger-border";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", cls)}>{pctValue}%</span>;
}

export function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={cn("h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50", className)}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function pct(part: number, total: number): string {
  if (!total) return "–";
  return `${Math.round((part / total) * 100)}%`;
}

export const pluralProjects = (n: number) => `${n} ${n === 1 ? "project" : "projects"}`;

/** Lifecycle funnel ramp (stage identity, not the budget-category palette). */
export const FUNNEL = { plan: "#7FA3EE", budget: "#3F74E3", release: "#0B4FD9", spend: "#062365" };
