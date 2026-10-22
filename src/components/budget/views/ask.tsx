"use client";

/**
 * Investment summary: how much the selection proposes, in which years, and
 * from which fund sources. Every figure sums the same filtered Part IV lines
 * the editor's Summary of Investments uses.
 */

import { Coins, Landmark, ReceiptText } from "lucide-react";
import { Donut, StackedColumns, SwatchLegend } from "@/components/dataviz/charts";
import { BUCKETS } from "@/lib/repository/corpus";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { php, phpCompact } from "@/lib/utils";
import { SCREENS } from "../nav";
import { Kpi, Panel, ViewHeader, ViewProps, pct } from "./shared";

const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));
const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function AskView({ profiles, lines, fy, mode, fyLabel }: ViewProps & { fyLabel: string }) {
  const scope: typeof lines = fy === "all" ? lines : lines.filter((l) => l.year === fy);
  const total = scope.reduce((s, l) => s + l.total, 0);
  const co = scope.filter((l) => l.expenseClass === "capitalOutlay").reduce((s, l) => s + l.total, 0);
  const byCategory = new Map<string, number>();
  scope.forEach((l) => byCategory.set(l.categoryId || "uncategorized", (byCategory.get(l.categoryId || "uncategorized") ?? 0) + l.total));
  const categories = [...byCategory.entries()]
    .map(([id, v]) => ({ id, name: id === "uncategorized" ? "Uncategorized" : categoryNameById.get(id) ?? id, total: v }))
    .sort((x, y) => y.total - x.total);

  const papStats = (() => {
    let withPap = 0;
    let all = 0;
    profiles.forEach((a) => a.projects.forEach((p) => { all += 1; if (p.papCode) withPap += 1; }));
    return { withPap, all };
  })();

  // Year-over-year delta for a single-year filter (prior-year total across the selection).
  const priorFyTotal = fy === "all" ? 0 : profiles.reduce((s, a) => {
    const i = fy - 1 - a.cycle.startYear;
    return s + (i >= 0 && i < 3 ? a.budget.grandTotals[i] : 0);
  }, 0);
  const yoyDelta = fy !== "all" && priorFyTotal > 0 ? ((total - priorFyTotal) / priorFyTotal) * 100 : null;
  const kpiStats = profiles.reduce(
    (acc, a) => ({ complete: acc.complete + a.counts.completeKpis, total: acc.total + a.counts.kpis }),
    { complete: 0, total: 0 }
  );

  const byYearColumns = (() => {
    const years = [...new Set(lines.map((l) => l.year))].sort((a, b) => a - b);
    return years.map((year) => ({
      label: String(year),
      segments: BUCKETS.map((b) => ({
        key: b.key,
        label: b.label,
        value: lines.filter((l) => l.year === year && l.bucket === b.key).reduce((s, l) => s + l.total, 0),
        color: b.color,
      })),
    }));
  })();

  // Continuing-cost share of the ask, first to last plan year (drives the insight copy).
  const ccTrajectory = byYearColumns.map((col) => {
    const total = col.segments.reduce((s2, x) => s2 + x.value, 0);
    const cc = col.segments.find((x) => x.key === "continuingCosts")?.value ?? 0;
    return { year: col.label, share: total ? cc / total : 0 };
  }).filter((x) => x.share > 0);
  const ccFirst = ccTrajectory[0];
  const ccLast = ccTrajectory[ccTrajectory.length - 1];

  // Fund split over the same scope the KPI counts (the FY filter applies), so the
  // ring, its legend and the center total always describe the same money.
  const fundSegments = (() => {
    const map = new Map<string, number>();
    scope.forEach((l) => map.set(l.fundSource, (map.get(l.fundSource) ?? 0) + l.total));
    return [...map.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([label, value], i) => ({ key: label, label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  })();

  // The view's on-demand insights: computed from the selection, presented as an
  // auto-drafted summary (labelled illustrative) behind the ✨ button.
  const nonGaa = profiles.filter((p) => p.type === "LGU" || p.type === "GOCC").length;
  const insights: React.ReactNode[] = [
    ccFirst && ccLast ? (
      <span key="cc">
        <strong>
          Continuing costs rise from {Math.round(ccFirst.share * 100)}% of the FY{ccFirst.year} request to{" "}
          {Math.round(ccLast.share * 100)}% in FY{ccLast.year}
        </strong>
        , as completed projects add subscriptions, hosting and licences.
      </span>
    ) : null,
    nonGaa > 0 ? (
      <span key="gaa">
        <strong>
          {nonGaa} of {profiles.length} agencies fund ICT outside the GAA
        </strong>{" "}
        (LGUs and GOCCs). Their ISSPs are the only national record of this spending.
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <ViewHeader title={SCREENS.ask.label} lede={SCREENS.ask.summary} insights={insights} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi
          label={fy === "all" ? "Proposed ICT investment" : `FY${fy} ISSP request`}
          value={scope.length === 0 ? "–" : phpCompact(total)}
          title={scope.length === 0 ? undefined : php(total)}
          sub={
            scope.length === 0
              ? "No line items in scope"
              : yoyDelta !== null && fy !== "all"
                ? `${yoyDelta >= 0 ? "▲" : "▼"} ${Math.abs(yoyDelta).toFixed(1)}% vs FY${fy - 1} (${phpCompact(priorFyTotal)})`
                : `${profiles.length} agencies · ${fyLabel}`
          }
          highlight
          icon={Coins}
        />
        <Kpi label="Capital outlay" value={scope.length === 0 ? "–" : phpCompact(co)} title={scope.length === 0 ? undefined : php(co)} sub={scope.length === 0 ? "No line items in scope" : `${pct(co, total)} of total`} />
        <Kpi label="MOOE" value={scope.length === 0 ? "–" : phpCompact(total - co)} title={scope.length === 0 ? undefined : php(total - co)} sub={scope.length === 0 ? "No line items in scope" : `${pct(total - co, total)} of total`} />
        <Kpi
          label="Top expense category"
          value={categories[0]?.name ?? "–"}
          sub={categories[0] ? `${phpCompact(categories[0].total)} · ${pct(categories[0].total, total)} of total` : ""}
          icon={ReceiptText}
        />
        {mode === "proposed" ? (
          <Kpi
            label="Projects with PAP code"
            value={papStats.all ? `${papStats.withPap} of ${papStats.all}` : "–"}
            sub={`${papStats.all ? Math.round((papStats.withPap / papStats.all) * 100) : 0}% traceable to NEP and GAA\u00A0(mock)`}
            icon={Landmark}
          />
        ) : (
          <Kpi
            label="KPIs fully specified"
            value={kpiStats.total ? `${kpiStats.complete} of ${kpiStats.total}` : "–"}
            sub="Baseline and three targets set (current form)"
            icon={Landmark}
          />
        )}
      </div>

      {/* Charts row 1: by year + fund sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Proposed investment by year" sub="By Part IV strategic category" className="lg:col-span-2">
          <StackedColumns columns={byYearColumns} format={phpCompact} />
          <SwatchLegend className="mt-4" items={BUCKETS.map((b) => ({ key: b.key, label: b.label, color: b.color }))} />
        </Panel>
        <Panel title="Fund sources" sub="Part IV B.2" hint="LGU and GOCC budgets do not pass through the GAA.">
          {fundSegments.length > 0 ? (
            <Donut segments={fundSegments} centerValue={phpCompact(total)} centerLabel="proposed" format={phpCompact} size={160} stackLegend />
          ) : (
            <p className="text-xs text-muted-foreground">No line items in scope.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
