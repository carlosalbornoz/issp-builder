"use client";

/**
 * Hand-rolled, dependency-free chart pieces for the demonstration surfaces.
 * Colors come exclusively from theme tokens (--chart-1..5, --budget-1..4) so
 * every chart follows the active theme; numbers use tabular-nums and the
 * shared php/phpCompact formatters. Motion is none — these are print-friendly,
 * reduced-motion-safe by construction.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Ranked horizontal bar list ───────────────────────────────────────────────

export interface BarListItem {
  key: string;
  label: string;
  sub?: string;
  value: number;
  href?: string;
  color?: string;
}

export function BarList({
  items,
  format,
  className,
  total,
}: {
  items: BarListItem[];
  format: (n: number) => string;
  className?: string;
  /** Whole the rows are a part of; when given, each row also shows its share of it. */
  total?: number;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0) {
    return <p className={cn("text-xs text-muted-foreground", className)}>Nothing matches the current filters.</p>;
  }
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const pct = Math.max((item.value / max) * 100, item.value > 0 ? 1.5 : 0);
        const share = total ? item.value / total : null;
        const row = (
          <div className="group">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-sm text-foreground break-words line-clamp-2 text-pretty" title={item.label}>
                {item.label}
              </span>
              {/* Value right-aligned against the fixed share column, so both columns stay tidy. */}
              <span className="flex items-baseline justify-end gap-2 shrink-0">
                <span className="text-sm font-semibold tabular-nums text-foreground">{format(item.value)}</span>
                {share !== null ? (
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                    {share > 0 && share < 0.001
                      ? "<0.1%"
                      : share < 0.01
                        ? `${+(share * 100).toFixed(1)}%`
                        : `${Math.round(share * 100)}%`}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-2 rounded-sm bg-muted overflow-hidden" aria-hidden>
              <div
                className="h-full rounded-sm transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${pct}%`, background: item.color ?? "var(--chart-1)" }}
              />
            </div>
            {item.sub ? <p className="text-xs text-muted-foreground mt-1">{item.sub}</p> : null}
          </div>
        );
        return item.href ? (
          <Link key={item.key} href={item.href} className="block px-2 -mx-2 rounded-md py-1 hover:bg-accent/50 transition-colors">
            {row}
          </Link>
        ) : (
          <div key={item.key}>{row}</div>
        );
      })}
    </div>
  );
}

// ─── Stacked columns (per-year, per-category) ─────────────────────────────────

export interface StackSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function StackedColumns({
  columns,
  format,
  height = 192,
}: {
  columns: { label: string; segments: StackSegment[] }[];
  format: (n: number) => string;
  height?: number;
}) {
  const totals = columns.map((c) => c.segments.reduce((s, x) => s + x.value, 0));
  const max = Math.max(...totals, 1);
  // Pixel heights, not percentages: the value/year labels live outside the bar,
  // so every bar's height is exactly proportional to its total.
  const LABEL_SPACE = 48;
  const chartH = height - LABEL_SPACE;
  return (
    <div>
      <div className="flex items-end gap-3 sm:gap-6" style={{ height }}>
        {columns.map((col, ci) => {
          const total = totals[ci];
          const barH = Math.max(Math.round((total / max) * chartH), total > 0 ? 3 : 0);
          return (
            <div
              key={col.label}
              className="flex-1 min-w-0 flex flex-col items-center justify-end h-full"
              role="img"
              aria-label={`${col.label}: ${format(total)}${col.segments
                .filter((s) => s.value > 0)
                .map((s) => `; ${s.label} ${format(s.value)}`)
                .join("")}`}
            >
              <span className="text-xs font-semibold tabular-nums mb-1.5 text-foreground whitespace-nowrap">
                {format(total)}
              </span>
              <div
                className="w-full max-w-24 sm:max-w-28 rounded-sm overflow-hidden flex flex-col-reverse border border-foreground/10"
                style={{ height: barH }}
              >
                {col.segments
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <div
                      key={s.key}
                      title={`${s.label}: ${format(s.value)}`}
                      className="w-full"
                      style={{
                        height: `${total > 0 ? (s.value / total) * 100 : 0}%`,
                        background: s.color,
                        minHeight: s.value > 0 ? 2 : 0,
                      }}
                    />
                  ))}
              </div>
              <span className="text-xs text-muted-foreground mt-1.5 tabular-nums whitespace-nowrap">{col.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  centerLabel,
  centerValue,
  format,
  size = 176,
  stackLegend = false,
}: {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
  format: (n: number) => string;
  size?: number;
  /** Legend below the ring at full width — for narrow panels where side legends truncate. */
  stackLegend?: boolean;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  const arcs = segments.reduce<{ seg: DonutSegment; dash: string; offset: number; acc: number }[]>((out, seg) => {
    const frac = seg.value / total;
    const acc = out.length ? out[out.length - 1].acc : 0;
    out.push({ seg, dash: `${frac * c} ${c - frac * c}`, offset: -acc * c, acc: acc + frac });
    return out;
  }, []);
  return (
    <div className={cn("flex items-center gap-6", stackLegend ? "flex-col" : "flex-col sm:flex-row")}>
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={segments.map((s) => `${s.label}: ${format(s.value)}`).join(", ")}>
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="16" />
          {arcs.map(({ seg, dash, offset }) => (
            <circle
              key={seg.key}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeDasharray={dash}
              strokeDashoffset={offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue ? <span className="text-lg font-bold tabular-nums text-foreground leading-tight">{centerValue}</span> : null}
          {centerLabel ? <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{centerLabel}</span> : null}
        </div>
      </div>
      <ul className={cn("space-y-2 min-w-0", stackLegend ? "w-full" : "w-full sm:w-auto sm:flex-1")}>
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} aria-hidden />
            <span className="text-foreground break-words min-w-0 flex-1">{s.label}</span>
            <span className="font-semibold tabular-nums shrink-0 text-right">{format(s.value)}</span>
            <span className="text-muted-foreground tabular-nums text-xs shrink-0 w-9 text-right">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Paired horizontal bars (request vs. allotment) ───────────────────────────

export interface PairedGroup {
  key: string;
  label: string;
  sub?: string;
  a: number;
  b: number | null;
}

export function PairedBars({
  groups,
  labelA,
  labelB,
  colorA = "var(--chart-1)",
  colorB = "var(--chart-5)",
  format,
  utilizationLabel = "allotted",
}: {
  groups: PairedGroup[];
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
  format: (n: number) => string;
  utilizationLabel?: string;
}) {
  const max = Math.max(...groups.flatMap((g) => [g.a, g.b ?? 0]), 1);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorA }} aria-hidden /> {labelA}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorB }} aria-hidden /> {labelB}
        </span>
      </div>
      {groups.map((g) => (
        <div key={g.key}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="text-sm text-foreground truncate">{g.label}</span>
            {g.b !== null ? (
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                {Math.round((g.b / g.a) * 100)}% {utilizationLabel}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground shrink-0">pending the GAA</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 rounded-sm bg-muted overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${(g.a / max) * 100}%`, background: colorA }} />
              </div>
              <span className="text-xs font-medium tabular-nums w-24 text-right shrink-0">{format(g.a)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 rounded-sm bg-muted overflow-hidden">
                {g.b !== null ? (
                  <div className="h-full rounded-sm" style={{ width: `${(g.b / max) * 100}%`, background: colorB }} />
                ) : (
                  <div className="h-full w-0" />
                )}
              </div>
              <span className="text-xs tabular-nums w-24 text-right shrink-0 text-muted-foreground">
                {g.b !== null ? format(g.b) : "–"}
              </span>
            </div>
          </div>
          {g.sub ? <p className="text-xs text-muted-foreground mt-1">{g.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}

// ─── Legend chips ─────────────────────────────────────────────────────────────

export function SwatchLegend({
  items,
  className,
}: {
  items: { key: string; label: string; color: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-2", className)}>
      {items.map((i) => (
        <li key={i.key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
