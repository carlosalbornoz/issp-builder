"use client";

/**
 * ICT Budget Dashboard (demonstration).
 * Cross-agency views of ISSP-proposed ICT investment, computed client-side
 * from the corpus line items — the same Part IV facts the editor's Summary
 * tables use — plus the mock COMPASS execution layer (NEP → GAA → allotment →
 * obligation → disbursement) for the follow-the-peso story. Zero chart
 * libraries: everything is the hand-rolled dataviz components on theme tokens;
 * the lifecycle funnel uses its own sequential blue ramp (adopted from the
 * budget-canvas design, separate from the --budget-1..4 category identity).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Coins,
  Download,
  Landmark,
  Layers3,
  PieChart,
  ReceiptText,
  Route,
  ShieldQuestion,
} from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { DemoNotice } from "@/components/repository/demo-notice";
import { BarList, Donut, StackedColumns, SwatchLegend } from "@/components/dataviz/charts";
import { useCorpus, BUCKETS, TYPE_LABELS, TYPE_SHORT } from "@/lib/repository/corpus";
import type { CompassAgency, CompassYearRecord, CorpusLineItem, CorpusProfile } from "@/lib/repository/corpus-types";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { cn, php, phpCompact } from "@/lib/utils";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
/** Lifecycle funnel ramp (stage identity, not the budget-category palette). */
const FUNNEL = { plan: "#7FA3EE", budget: "#3F74E3", release: "#0B4FD9", spend: "#062365" };
const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));
const EMPTY_AGENCIES: CorpusProfile[] = [];

type AgencyLine = CorpusLineItem & { acronym: string; slug: string };
type FyFilter = "all" | 2026 | 2027 | 2028 | 2029;

export function BudgetDashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const { corpus, error } = useCorpus();
  const [cycle, setCycle] = useState("all");
  const [type, setType] = useState("all");
  const [fund, setFund] = useState("all");
  const [fy, setFy] = useState<FyFilter>("all");

  // Deep links, straight from the URL: ?agency=slug filters to one agency; ?program=key spotlights it.
  const agencySlug = params.get("agency");
  const highlightProgram = params.get("program");

  const clearAgency = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("agency");
    router.replace(next.toString() ? `/budget?${next.toString()}` : "/budget");
  };

  const agencies = corpus?.agencies ?? EMPTY_AGENCIES;

  const selected = useMemo(
    () =>
      agencies.filter((a) => {
        if (agencySlug && a.slug !== agencySlug) return false;
        if (cycle !== "all" && a.cycleLabel !== cycle) return false;
        if (type !== "all" && a.type !== type) return false;
        return true;
      }),
    [agencies, agencySlug, cycle, type]
  );

  const lines: AgencyLine[] = useMemo(
    () =>
      selected.flatMap((a) =>
        a.lineItems
          .filter((l) => fund === "all" || l.fundSource === fund)
          .map((l) => ({ ...l, acronym: a.acronym, slug: a.slug }))
      ),
    [selected, fund]
  );

  const cycles = useMemo(() => [...new Set(agencies.map((a) => a.cycleLabel))].sort(), [agencies]);
  const funds = useMemo(() => [...new Set(lines.map((l) => l.fundSource))], [lines]);

  const yearTotalOf = (a: CorpusProfile, year: number) => {
    const i = year - a.cycle.startYear;
    return i >= 0 && i < 3 ? a.budget.grandTotals[i] : null;
  };
  const corpusYearTotal = (year: number) =>
    selected.reduce((s, a) => s + (yearTotalOf(a, year) ?? 0), 0);

  const totals = useMemo(() => {
    const scope: AgencyLine[] = fy === "all" ? lines : lines.filter((l) => l.year === fy);
    const total = scope.reduce((s, l) => s + l.total, 0);
    const co = scope.filter((l) => l.expenseClass === "capitalOutlay").reduce((s, l) => s + l.total, 0);
    const byCategory = new Map<string, number>();
    scope.forEach((l) => byCategory.set(l.categoryId || "uncategorized", (byCategory.get(l.categoryId || "uncategorized") ?? 0) + l.total));
    const categories = [...byCategory.entries()]
      .map(([id, v]) => ({ id, name: id === "uncategorized" ? "Uncategorized" : categoryNameById.get(id) ?? id, total: v }))
      .sort((x, y) => y.total - x.total);
    const scopeLabel = fy === "all" ? `across ${new Set(scope.map((l) => l.year)).size} fiscal years` : `FY${fy}`;
    return { total, co, mooe: total - co, categories, scopeLabel };
  }, [lines, fy]);

  // ── COMPASS helpers ──
  const compassBySlug = useMemo(
    () => new Map((corpus?.compass.agencies ?? []).map((ca) => [ca.slug, ca])),
    [corpus]
  );
  const fyRecord = (ca: CompassAgency, year: number): CompassYearRecord | undefined => ca.years.find((y) => y.year === year);
  const gaaCompass = useMemo(() => {
    const slugs = new Set(selected.map((a) => a.slug));
    return [...compassBySlug.values()].filter((ca) => ca.route === "GAA" && slugs.has(ca.slug));
  }, [compassBySlug, selected]);
  const sumCompass = (year: number, field: "plan" | "nep" | "gaa" | "allotment" | "obligated" | "disbursed") =>
    gaaCompass.reduce((s, ca) => s + (fyRecord(ca, year)?.[field] ?? 0), 0);

  const byYearColumns = useMemo(() => {
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
  }, [lines]);

  const fundSegments = useMemo(() => {
    const map = new Map<string, number>();
    lines.forEach((l) => map.set(l.fundSource, (map.get(l.fundSource) ?? 0) + l.total));
    return [...map.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([label, value], i) => ({ key: label, label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [lines]);

  const fyForRanking = fy === "all" ? null : fy;
  const agencyBars = useMemo(
    () =>
      [...selected]
        .map((a) => {
          const ca = compassBySlug.get(a.slug);
          const oblig25 = ca ? fyRecord(ca, 2025)?.obligated : undefined;
          const value =
            (fyForRanking ? yearTotalOf(a, fyForRanking) : null) ??
            a.lineItems.filter((l) => fund === "all" || l.fundSource === fund).reduce((s, l) => s + l.total, 0);
          const basis = fyForRanking ? yearTotalOf(a, fyForRanking) : a.budget.grandTotal / 3;
          const ratio = oblig25 && basis ? basis / oblig25 : null;
          return {
            slug: a.slug,
            acronym: a.acronym,
            name: a.name,
            value,
            ratio,
          };
        })
        .filter((a) => a.value !== null)
        .sort((x, y) => y.value - x.value),
    [selected, fund, fyForRanking, compassBySlug]
  );

  const papStats = useMemo(() => {
    let withPap = 0;
    let total = 0;
    selected.forEach((a) =>
      a.projects.forEach((p) => {
        total += 1;
        if (p.papCode) withPap += 1;
      })
    );
    return { withPap, total };
  }, [selected]);

  const priorFyTotal = fy === "all" ? 0 : corpusYearTotal(fy - 1);
  const yoyDelta = fy !== "all" && priorFyTotal > 0 ? ((totals.total - priorFyTotal) / priorFyTotal) * 100 : null;

  const exportCsv = () => {
    const header = ["agency", "acronym", "type", "cycle", "year", "category", "expense_class", "bucket", "project", "item", "office", "fund_source", "qty", "unit_cost", "total"];
    const rows = selected.flatMap((a) =>
      a.lineItems
        .filter((l) => fund === "all" || l.fundSource === fund)
        .map((l) => [
          a.name, a.acronym, a.type, a.cycleLabel, String(l.year),
          categoryNameById.get(l.categoryId) ?? l.categoryId, l.expenseClass, l.bucket, l.projectTitle ?? "",
          l.item, l.office, l.fundSource, String(l.qty), String(l.unitCost), String(l.total),
        ].map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "issp-line-items.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PublicShell active="budget" width="wide">
      {/* ── Hero ── */}
      <section className="border-b bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Fiscal transparency · Structured ISSP data
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-3">ICT Budget Dashboard</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-6">
            ISSP-proposed ICT investment across agencies and years — computed from the same Part IV facts behind each
            agency&apos;s official Summary of Investments, so requests mean exactly what the agency signed. The
            execution layer below demonstrates the follow-the-peso loop a live COMPASS link would close.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Fiscal year</span>
            <div className="flex flex-wrap gap-1.5">
              {(["all", 2026, 2027, 2028, 2029] as FyFilter[]).map((option) => (
                <button
                  key={String(option)}
                  onClick={() => setFy(option)}
                  aria-pressed={fy === option}
                  className={cn(
                    "min-h-8 px-3 rounded-full border text-xs font-medium transition-colors",
                    fy === option ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  {option === "all" ? "All years" : `FY${option}`}
                </button>
              ))}
            </div>
          </div>

          {error || !corpus ? null : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Kpi
                label={fy === "all" ? "Proposed ICT investment" : `FY${fy} ISSP ask`}
                value={phpCompact(totals.total)}
                sub={
                  yoyDelta !== null && fy !== "all"
                    ? `${yoyDelta >= 0 ? "▲" : "▼"} ${Math.abs(yoyDelta).toFixed(1)}% vs FY${fy - 1} (${phpCompact(priorFyTotal)})`
                    : `${selected.length} agencies · ${totals.scopeLabel}`
                }
                highlight
                icon={Coins}
              />
              <Kpi label="Capital outlay" value={phpCompact(totals.co)} sub={`${pct(totals.co, totals.total)} of total`} />
              <Kpi label="MOOE" value={phpCompact(totals.mooe)} sub={`${pct(totals.mooe, totals.total)} of total`} />
              <Kpi
                label="Top expense category"
                value={totals.categories[0]?.name.split(" ").slice(0, 3).join(" ") ?? "—"}
                sub={totals.categories[0] ? phpCompact(totals.categories[0].total) : ""}
                icon={ReceiptText}
              />
              <Kpi
                label="Projects with PAP code"
                value={papStats.total ? `${papStats.withPap} of ${papStats.total}` : "—"}
                sub={`${papStats.total ? Math.round((papStats.withPap / papStats.total) * 100) : 0}% traceable to the NEP / GAA (mock codes)`}
                icon={Landmark}
              />
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <DemoNotice />

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-danger-bg text-destructive px-4 py-3 text-sm">
            {error} Try reloading the page.
          </div>
        ) : !corpus ? (
          <div className="h-64 rounded-xl bg-muted animate-pulse" aria-busy />
        ) : (
          <>
            {/* ── Filters ── */}
            <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex flex-wrap gap-2">
                <Select value={cycle} onChange={setCycle} options={[["all", "All cycles"], ...cycles.map((c) => [c, c] as [string, string])]} />
                <Select
                  value={type}
                  onChange={setType}
                  options={[["all", "All types"], ...(["NGA", "GOCC", "LGU", "OTHER"] as const).map((t) => [t, TYPE_LABELS[t]] as [string, string])]}
                />
                <Select value={fund} onChange={setFund} options={[["all", "All fund sources"], ...funds.map((f) => [f, f] as [string, string])]} />
                {agencySlug && (
                  <button
                    onClick={clearAgency}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/5 px-2.5 h-9 text-sm text-primary hover:bg-primary/10 transition-colors"
                  >
                    {agencies.find((a) => a.slug === agencySlug)?.acronym ?? agencySlug} ✕
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <span className="text-xs text-muted-foreground">
                  {lines.length.toLocaleString("en-PH")} line items · {phpCompact(totals.total)} {totals.scopeLabel}
                </span>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Line items (CSV)
                </button>
                <Link
                  href="/budget/data-standard"
                  className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Data standard
                </Link>
              </div>
            </div>

            {/* ── Charts row 1: by year + fund sources ── */}
            <div className="grid lg:grid-cols-3 gap-4">
              <Panel title="Proposed investment by year" sub="stacked by Part IV strategic category" className="lg:col-span-2">
                <StackedColumns columns={byYearColumns} format={phpCompact} />
                <SwatchLegend className="mt-4" items={BUCKETS.map((b) => ({ key: b.key, label: b.label, color: b.color }))} />
                <InsightBox className="mt-4">
                  <strong>Continuing costs are the quiet story.</strong> New systems become yearly subscriptions,
                  hosting and licences — the future MOOE floor of every approved project. Watch the Continuing Costs
                  share of each year grow in the stacked bars above.
                </InsightBox>
              </Panel>
              <Panel title="Fund sources" sub="B.2 across the selection" icon={PieChart}>
                <Donut segments={fundSegments} centerValue={phpCompact(totals.total)} centerLabel="proposed" format={phpCompact} size={160} stackLegend />
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-4">
                  LGU, water-district and GOCC budgets do not pass through the GAA. For them, the ISSP is the only
                  national view of ICT intent.
                </p>
              </Panel>
            </div>

            {/* ── Charts row 2: categories ── */}
            <div className="grid lg:grid-cols-3 gap-4">
              <Panel title="Where the money goes" sub="DICT expense categories (B.4)" className="lg:col-span-2">
                <BarList
                  items={[
                    ...totals.categories.slice(0, 10).map((c) => ({
                      key: c.id,
                      label: c.name,
                      value: c.total,
                      color: categoryClassColor(c.id),
                    })),
                    ...(totals.categories.length > 10
                      ? [
                          {
                            key: "__other",
                            label: `Other ${totals.categories.length - 10} categories`,
                            value: totals.categories.slice(10).reduce((s, c) => s + c.total, 0),
                            color: "var(--muted-foreground)",
                          },
                        ]
                      : []),
                  ]}
                  format={phpCompact}
                />
              </Panel>
              {/* ── Budget cycle status tiles ── */}
              <Panel title="Where each fiscal year stands" sub="mock COMPASS layer · GAA agencies">
                <div className="grid grid-cols-2 gap-2.5">
                  <CycleTile year="FY2025" label="closed" value={pct(sumCompass(2025, "obligated"), sumCompass(2025, "allotment"))} sub="of ICT allotments obligated" />
                  <CycleTile year="FY2026" label="executing · Q2" value={pct(sumCompass(2026, "obligated"), sumCompass(2026, "allotment"))} sub="obligated as of Q2" />
                  <CycleTile year="FY2027" label="NEP in Congress" value={pct(sumCompass(2027, "nep"), sumCompass(2027, "plan"))} sub="of ISSP ask is in the NEP" />
                  <CycleTile year="FY2028" label="Budget Call" value={phpCompact(sumCompass(2028, "plan"))} sub="already planned in ISSPs" />
                </div>
              </Panel>
            </div>

            {/* ── Lifecycle: follow the peso ── */}
            <LifecycleSection gaa={gaaCompass} profiles={selected} />

            {/* ── Agencies ranked ── */}
            <Panel title={fyForRanking ? `Agencies by FY${fyForRanking} ask` : "Agencies by proposed investment"} sub="click through to the full ISSP record" icon={Building2}>
              <BarList
                items={agencyBars.map((a) => ({
                  key: a.slug,
                  label: `${a.acronym} — ${a.name}`,
                  value: a.value,
                  href: `/repository/${a.slug}`,
                  ...(a.ratio && a.ratio > 2
                    ? {
                        sub: `${fyForRanking ? `FY${fyForRanking} ask` : "Average yearly ask"} is ${a.ratio.toFixed(
                          1
                        )}× the agency's FY2025 ICT obligations (mock)`,
                      }
                    : {}),
                }))}
                format={phpCompact}
              />
              <p className="text-[11px] text-muted-foreground mt-3">
                Annotation basis: {fyForRanking ? `FY${fyForRanking} ask` : "3-year plan total ÷ 3"} vs FY2025
                obligations — the same comparison as the absorptive-capacity table below.
              </p>
            </Panel>

            {/* ── Convergence ── */}
            <ConvergenceSection profiles={selected} highlightProgram={highlightProgram} />

            {/* ── Drill-down ── */}
            <Panel title="Agency drill-down" sub="expand a row for its split; click the acronym for the full record">
              <div className="overflow-x-auto rounded-lg border bg-card -m-1">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border-b px-3 py-2 text-left font-semibold">Agency</th>
                      <th className="border-b px-3 py-2 text-left font-semibold">Type</th>
                      <th className="border-b px-3 py-2 text-right font-semibold">Y1</th>
                      <th className="border-b px-3 py-2 text-right font-semibold">Y2</th>
                      <th className="border-b px-3 py-2 text-right font-semibold">Y3</th>
                      <th className="border-b px-3 py-2 text-right font-semibold">3-yr total</th>
                      <th className="border-b px-3 py-2 text-right font-semibold">CO share</th>
                      <th className="border-b px-3 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected
                      .slice()
                      .sort((a, b) => b.budget.grandTotal - a.budget.grandTotal)
                      .map((a) => (
                        <AgencyRow key={a.slug} agency={a} fund={fund} />
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40 font-bold">
                      <td className="px-3 py-2" colSpan={2}>
                        {selected.length} agencies
                      </td>
                      {[0, 1, 2].map((i) => (
                        <td key={i} className="px-3 py-2 text-right tabular-nums">
                          {phpCompact(
                            selected.reduce((s, a) => s + a.budget.grandTotals[i] * fundShare(a, fund), 0)
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right tabular-nums">{phpCompact(agencyBars.reduce((s, x) => s + x.value, 0))}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{pct(totals.co, totals.total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Panel>

            <p className="text-xs text-muted-foreground pt-2">
              All plan figures derive from each agency&apos;s Part IV line items through the same aggregation engine as
              the editor&apos;s Summary of Investments (B.1–B.4) — counted budget only. The execution layer (NEP, GAA,
              allotments, obligations, disbursements) and all join codes are fictitious demonstration data standing in
              for a future DBM COMPASS feed.
            </p>
          </>
        )}
      </div>
    </PublicShell>
  );
}

// ─── Lifecycle: follow the peso ───────────────────────────────────────────────

interface FunnelRow {
  label: string;
  value: number | null;
  color: string;
  note?: string;
}

interface FunnelData {
  rows: FunnelRow[];
  max: number;
  stage: CompassYearRecord["stage"];
  rec: { plan: number; nep: number; gaa: number; allotment: number; obligated: number; disbursed: number };
}

const STAGES = [
  { n: "1", label: "Plan", system: "ISSP", detail: "3-year plan, DICT-endorsed. Projects, line items, KPIs.", source: ".issp file", ours: true },
  { n: "2", label: "Propose", system: "NEP", detail: "What the Executive asks Congress for.", source: "COMPASS", ours: false },
  { n: "3", label: "Authorize", system: "GAA", detail: "What Congress approves.", source: "COMPASS", ours: false },
  { n: "4", label: "Release", system: "Allotment", detail: "SARO / comprehensive release.", source: "COMPASS · BTMS", ours: false },
  { n: "5", label: "Commit", system: "Obligation", detail: "Contracts and purchase orders.", source: "COMPASS · PhilGEPS", ours: false },
  { n: "6", label: "Pay", system: "Disbursement", detail: "NCA, checks, ADA.", source: "COMPASS · IFMIS", ours: false },
  { n: "7", label: "Deliver", system: "Results", detail: "KPI actuals vs ISSP targets.", source: "ISSP KPIs · DIME", ours: true },
] as const;

function LifecycleSection({ gaa, profiles }: { gaa: CompassAgency[]; profiles: CorpusProfile[] }) {
  const sum = (year: number, field: "plan" | "nep" | "gaa" | "allotment" | "obligated" | "disbursed") =>
    gaa.reduce((s, ca) => s + (ca.years.find((y) => y.year === year)?.[field] ?? 0), 0);

  const funnelRows = (year: number, stage: CompassYearRecord["stage"]): FunnelData => {
    const rec = { plan: sum(year, "plan"), nep: sum(year, "nep"), gaa: sum(year, "gaa"), allotment: sum(year, "allotment"), obligated: sum(year, "obligated"), disbursed: sum(year, "disbursed") };
    const rows: FunnelRow[] = [
      { label: "ISSP plan", value: rec.plan, color: FUNNEL.plan },
      { label: "NEP", value: rec.nep || null, color: FUNNEL.budget },
      { label: "GAA", value: rec.gaa || null, color: FUNNEL.budget },
      { label: "Allotment", value: rec.allotment || null, color: FUNNEL.release },
      { label: "Obligated", value: rec.obligated || null, color: FUNNEL.spend, note: stage === "executing" ? "as of Q2" : undefined },
      { label: "Disbursed", value: rec.disbursed || null, color: FUNNEL.spend },
    ];
    const max = Math.max(rec.plan, rec.nep, 1);
    return { rows, max, stage, rec };
  };

  const f25 = funnelRows(2025, "closed");
  const f26 = funnelRows(2026, "executing");
  const f27 = funnelRows(2027, "nep");

  // Absorptive capacity: GAA agencies with an FY2025 record.
  const absorptive = profiles
    .map((p) => {
      const ca = gaa.find((x) => x.slug === p.slug);
      const y25 = ca?.years.find((y) => y.year === 2025);
      if (!y25?.obligated || !y25.gaa) return null;
      const i = 2027 - p.cycle.startYear;
      const ask27 = i >= 0 && i < 3 ? p.budget.grandTotals[i] : null;
      return { profile: p, y25, ask27, ratio: ask27 ? ask27 / y25.obligated : null };
    })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));

  const nepShare27 = f27.rec.plan ? (f27.rec.nep ?? 0) / f27.rec.plan : 0;
  const unobligated25 = f25.rec.allotment - f25.rec.obligated;

  return (
    <section className="space-y-3" id="lifecycle">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Budget cycle · ISSP joined with COMPASS (proposed link)
          </p>
          <h2 className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
            <Route className="w-4 h-4 text-muted-foreground" /> Follow every peso — starting from the plan
          </h2>
        </div>
        <Link
          href="/budget/trace/ncwtr-2026-2028/proj-sikap"
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--sidebar)] text-white px-3.5 h-9 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Follow one project end-to-end <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Stage strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STAGES.map((s) => (
          <div
            key={s.n}
            className={cn(
              "rounded-lg border bg-card px-3 py-2.5",
              s.ours ? "border-primary/50 bg-accent/40" : "border-foreground/10"
            )}
          >
            <p className={cn("text-[10px] font-semibold uppercase tracking-widest", s.ours ? "text-primary" : "text-muted-foreground")}>
              {s.n} · {s.label}
            </p>
            <p className="text-sm font-semibold mt-0.5">{s.system}</p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-1 hidden lg:block">{s.detail}</p>
            <p className={cn("text-[10px] font-medium mt-1.5", s.ours ? "text-primary" : "text-muted-foreground")}>{s.source}</p>
          </div>
        ))}
      </div>

      {/* Per-FY funnels */}
      <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold">Each fiscal year sits at a different stage</h3>
          <p className="text-xs text-muted-foreground">GAA agencies ({gaa.length} of the selection) · percent = share of the stage before it</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <FunnelPanel title="FY2025" pill="Closed" pillCls="bg-success-bg text-success border border-success-border" f={f25} />
          <FunnelPanel title="FY2026" pill="Executing · Q2" pillCls="bg-warning-bg text-warning border border-warning-border" f={f26} />
          <FunnelPanel title="FY2027" pill="NEP in Congress" pillCls="bg-info-bg text-info border border-info-border" f={f27} />
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-5">
          <InsightBox>
            <strong>The NEP keeps {Math.round(nepShare27 * 100)}% of the FY2027 ISSP ask.</strong> The gap is the list of
            planned ICT work that did not get funded. Today nobody sees that list in one place.
          </InsightBox>
          <InsightBox>
            <strong>₱{phpCompact(unobligated25)} of FY2025 ICT allotments was never obligated.</strong> Two agencies
            below ask for more than double their FY2025 obligations in FY2027.
          </InsightBox>
          <InsightBox>
            <strong>The ISSP is the step before the NEP.</strong> COMPASS follows money from appropriation to
            disbursement; the ISSP holds the plan, the reason and the promised result. One project code lines them up.
          </InsightBox>
        </div>
      </div>

      {/* Absorptive capacity */}
      <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Absorptive capacity · FY2025 execution vs FY2027 ask</p>
        <h3 className="text-sm font-semibold mt-1 mb-3">Can each agency spend what it asks for?</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-b px-3 py-2 text-left font-semibold">Agency</th>
                <th className="border-b px-3 py-2 text-right font-semibold">FY2025 GAA</th>
                <th className="border-b px-3 py-2 text-right font-semibold">Allotment</th>
                <th className="border-b px-3 py-2 text-right font-semibold">Obligated</th>
                <th className="border-b px-3 py-2 text-left font-semibold">Obligation rate</th>
                <th className="border-b px-3 py-2 text-right font-semibold">FY2027 ask</th>
                <th className="border-b px-3 py-2 text-right font-semibold">Ask ÷ obligations</th>
              </tr>
            </thead>
            <tbody>
              {absorptive.map(({ profile: p, y25, ask27, ratio }) => {
                const rate = y25.obligated! / y25.allotment!;
                return (
                  <tr key={p.slug} className="border-b last:border-b-0 hover:bg-accent/20">
                    <td className="px-3 py-2">
                      <Link href={`/repository/${p.slug}`} className="font-medium hover:underline">
                        {p.acronym}
                      </Link>
                      <span className="text-muted-foreground hidden xl:inline"> — {p.name}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{phpCompact(y25.gaa!)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{phpCompact(y25.allotment!)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{phpCompact(y25.obligated!)}</td>
                    <td className="px-3 py-2">
                      <RatePill rate={rate} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{ask27 ? phpCompact(ask27) : "—"}</td>
                    <td className={cn("px-3 py-2 text-right tabular-nums font-semibold", ratio && ratio > 2 ? "text-destructive" : "")}>
                      {ratio ? `${ratio.toFixed(1)}×` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          Rate bands: On track ≥ 85% · Watch 70–84% · Low &lt; 70%. Execution figures are illustrative values in the
          shape of COMPASS data. GOCC and LGU plans are outside the GAA; their execution comes from their own budget
          systems. NCWTR&apos;s first ISSP starts in FY2026, so it has no FY2025 row.
        </p>
      </div>
    </section>
  );
}

function FunnelPanel({
  title,
  pill,
  pillCls,
  f,
}: {
  title: string;
  pill: string;
  pillCls: string;
  f: FunnelData;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between border-b pb-1.5 mb-2">
        <span className="font-display font-bold text-base">{title}</span>
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", pillCls)}>{pill}</span>
      </div>
      <div className="space-y-1.5">
        {f.rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[86px_1fr] gap-2 items-center">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-4 rounded-sm bg-muted overflow-hidden">
                {row.value !== null ? (
                  <div className="h-full rounded-sm" style={{ width: `${Math.max((row.value / f.max) * 100, 1)}%`, background: row.color }} />
                ) : (
                  <div className="h-full border border-dashed border-muted-foreground/40 rounded-sm" style={{ width: "70%" }} />
                )}
              </div>
              <span className="text-[11px] tabular-nums w-20 text-right shrink-0">
                {row.value !== null ? phpCompact(row.value) : <span className="text-muted-foreground">{title === "FY2027" ? "pending" : "—"}</span>}
              </span>
            </div>
          </div>
        ))}
      </div>
      {f.stage === "executing" ? <p className="text-[10px] text-muted-foreground mt-2">Obligation and disbursement as of 30 June 2026.</p> : null}
    </div>
  );
}

// Type shared by the lifecycle funnel panels.

function RatePill({ rate }: { rate: number }) {
  const pctValue = Math.round(rate * 100);
  const cls =
    rate >= 0.85
      ? "bg-success-bg text-success border border-success-border"
      : rate >= 0.7
        ? "bg-warning-bg text-warning border border-warning-border"
        : "bg-danger-bg text-destructive border border-danger-border";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", cls)}>{pctValue}%</span>;
}

// ─── Convergence ──────────────────────────────────────────────────────────────

const DUP_CLUSTERS = [
  { key: "hris", type: "HR information system", check: "A shared government HRIS (candidate)", question: "Can these agencies use one SaaS contract?", patterns: [/hr\b/i, /human resource/i, /payroll/i, /personnel/i, /crew hr/i] },
  { key: "permits", type: "Permits and licensing", check: "eLGU shared services", question: "Can member LGUs share one permits platform?", patterns: [/permit/i, /licens/i, /bpls/i, /one-stop/i] },
  { key: "records", type: "Document tracking and records", check: "A shared records service (candidate)", question: "Is a common standard enough, or one platform?", patterns: [/record/i, /document/i, /archive/i, /registry/i] },
  { key: "financial", type: "Financial management and accounting", check: "IFMIS · eNGAS", question: "Which functions are not in the government-wide systems?", patterns: [/financ/i, /accounting/i] },
  { key: "feedback", type: "Citizen feedback and complaints", check: "eGovPH App · 8888 hotline", question: "Can reports go through the eGovPH channel?", patterns: [/feedback/i, /complaint/i] },
] as const;

const ALIGNMENT_TAGS = ["E-Government Master Plan", "National Cybersecurity Plan", "Public Investment Program", "Program Convergence Budgeting"];

function ConvergenceSection({ profiles, highlightProgram }: { profiles: CorpusProfile[]; highlightProgram: string | null }) {
  // Duplication watch: group proposed systems (III-D) across agencies by cluster.
  const dupGroups = useMemo(() => {
    return DUP_CLUSTERS.map((cluster) => {
      const members: { acronym: string; slug: string; system: string; fundingProject?: string; cost: number }[] = [];
      profiles.forEach((a) => {
        a.proposedSystems.forEach((s) => {
          if (cluster.patterns.some((p) => p.test(s.name))) {
            const linked = a.projects.find((p) => p.linkedSystems.includes(s.name));
            members.push({
              acronym: a.acronym,
              slug: a.slug,
              system: s.shortName,
              ...(s.fundingProject ? { fundingProject: s.fundingProject } : {}),
              cost: linked?.totalCost ?? 0,
            });
          }
        });
      });
      const agencyCount = new Set(members.map((m) => m.acronym)).size;
      return { cluster, members, agencyCount, cost: members.reduce((s, m) => s + m.cost, 0) };
    })
      .filter((g) => g.agencyCount >= 2)
      .sort((a, b) => b.cost - a.cost || b.agencyCount - a.agencyCount);
  }, [profiles]);

  // Alignment share: share of project cost tagged to each national plan (+ untagged).
  const alignment = useMemo(() => {
    const per = new Map<string, number>();
    let tagged = 0;
    let untagged = 0;
    let all = 0;
    profiles.forEach((a) =>
      a.projects.forEach((p) => {
        all += p.totalCost;
        if (p.alignment.length === 0) untagged += p.totalCost;
        else tagged += p.totalCost;
        p.alignment.forEach((t) => per.set(t, (per.get(t) ?? 0) + p.totalCost));
      })
    );
    return { per, tagged, untagged, all };
  }, [profiles]);

  return (
    <section id="programs" className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Program convergence budgeting</p>
        <h2 className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
          <Layers3 className="w-4 h-4 text-muted-foreground" /> Convergence &amp; duplication watch
        </h2>
      </div>

      {/* Duplication table */}
      <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Proposed systems (Part III-D) grouped by type</p>
        <h3 className="text-sm font-semibold mt-1 mb-3">Where a shared service could replace separate builds</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-b px-3 py-2 text-left font-semibold">System type</th>
                <th className="border-b px-3 py-2 text-left font-semibold">Agencies planning it</th>
                <th className="border-b px-3 py-2 text-left font-semibold">Cost via linked projects</th>
                <th className="border-b px-3 py-2 text-left font-semibold">Check first</th>
                <th className="border-b px-3 py-2 text-left font-semibold">Suggested review question</th>
              </tr>
            </thead>
            <tbody>
              {dupGroups.map((g) => (
                <tr key={g.cluster.key} className="border-b last:border-b-0 hover:bg-accent/20 align-top">
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{g.cluster.type}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {g.members.map((m) => (
                        <Link
                          key={m.slug + m.system}
                          href={`/repository/${m.slug}`}
                          className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] hover:bg-accent transition-colors"
                          title={m.system}
                        >
                          {m.acronym}
                        </Link>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{g.members.length} systems · {g.agencyCount} agencies</p>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                    {g.cost > 0 ? phpCompact(g.cost) : <span className="text-muted-foreground">not yet costed</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{g.cluster.check}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{g.cluster.question}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          Grouping uses the system name and classification in Part III-D. A match is a review prompt, not a finding:
          agencies can have valid reasons for their own system. Costs show the linked Part III-E project where one
          exists.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Alignment share */}
        <Panel title="Which national plans the money serves" sub="strategic alignment tags · share of project cost" icon={ShieldQuestion}>
          <BarList
            items={[
              ...ALIGNMENT_TAGS.map((tag) => ({
                key: tag,
                label: tag,
                value: alignment.per.get(tag) ?? 0,
              })),
              {
                key: "__none",
                label: "No alignment tag",
                value: alignment.untagged,
                color: "var(--destructive)",
              },
            ]}
            format={phpCompact}
          />
          {alignment.untagged > 0 ? (
            <InsightBox className="mt-4">
              <strong>{phpCompact(alignment.untagged)} of project cost has no link to a national plan.</strong> In a
              Budget Call, these items need a written justification first.
            </InsightBox>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-3">Every project in this selection carries at least one alignment tag.</p>
          )}
        </Panel>

        {/* Cross-agency programs */}
        <Panel title="Cross-agency programs" sub="Part III-E.2 · each agency carries its share in its own plan">
          <CrossAgencyPrograms highlight={highlightProgram} />
        </Panel>
      </div>
    </section>
  );
}

function usePrograms() {
  const { corpus } = useCorpus();
  return corpus?.crossAgencyPrograms ?? [];
}

function CrossAgencyPrograms({ highlight }: { highlight: string | null }) {
  const programs = usePrograms();
  return (
    <div className="space-y-3">
      {programs.map((p) => (
        <div key={p.key} className={cn("rounded-lg border bg-card p-3.5", highlight === p.key ? "border-primary ring-2 ring-primary/40" : "border-foreground/10")}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <p className="text-sm font-semibold leading-snug">{p.title}</p>
            <span className="text-sm font-bold tabular-nums text-primary">{phpCompact(p.combinedCost)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2.5">Led by {p.leadAgency} · {p.participants.join(" · ")}</p>
          <div className="space-y-1">
            {p.agencies.map((s) => (
              <Link key={s.slug} href={`/repository/${s.slug}`} className="flex items-baseline justify-between gap-2 text-xs hover:underline">
                <span className="text-foreground">
                  {s.acronym}
                  {p.leadAgency.includes(s.acronym) ? " (lead)" : ""}
                </span>
                <span className="tabular-nums text-muted-foreground">{phpCompact(s.share)}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">
        The program total exists only when the plans are read together — no agency file holds it.
      </p>
    </div>
  );
}

// ─── Row + small pieces ───────────────────────────────────────────────────────

function AgencyRow({ agency: a, fund }: { agency: CorpusProfile; fund: string }) {
  const [open, setOpen] = useState(false);
  const visible = a.lineItems.filter((l) => fund === "all" || l.fundSource === fund);
  const filteredTotal = visible.reduce((s, l) => s + l.total, 0);
  const co = visible.filter((l) => l.expenseClass === "capitalOutlay").reduce((s, l) => s + l.total, 0);
  const share = filteredTotal > 0 ? fundShare(a, fund) : 0;
  const topCategories = (() => {
    const map = new Map<string, number>();
    visible.forEach((l) => map.set(l.categoryId || "uncategorized", (map.get(l.categoryId || "uncategorized") ?? 0) + l.total));
    return [...map.entries()]
      .map(([id, v]) => ({ id, name: id === "uncategorized" ? "Uncategorized" : categoryNameById.get(id) ?? id, total: v }))
      .sort((x, y) => y.total - x.total)
      .slice(0, 5);
  })();

  return (
    <>
      <tr className={cn("border-b", open && "bg-accent/10", "hover:bg-accent/20")}>
        <td className="px-3 py-2">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-1.5 cursor-pointer select-none text-left"
          >
            <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
            <Link href={`/repository/${a.slug}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
              {a.acronym}
            </Link>
            <span className="text-muted-foreground hidden xl:inline">— {a.name}</span>
          </button>
        </td>
        <td className="px-3 py-2 text-muted-foreground">{TYPE_SHORT[a.type]}</td>
        {[0, 1, 2].map((i) => (
          <td key={i} className="px-3 py-2 text-right tabular-nums">
            {php(a.budget.grandTotals[i] * share)}
          </td>
        ))}
        <td className="px-3 py-2 text-right tabular-nums font-semibold">{php(filteredTotal)}</td>
        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(co, filteredTotal)}</td>
        <td className="px-3 py-2">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                a.planStatus === "submitted" ? "bg-success" : a.planStatus === "for_review" ? "bg-info" : "bg-warning"
              )}
            />
            <span className="text-xs text-muted-foreground">
              {a.planStatus === "for_review" ? "For review" : a.planStatus === "submitted" ? "Submitted" : "Draft"}
            </span>
          </span>
        </td>
      </tr>
      {open && (
        <tr className="bg-muted/20">
          <td colSpan={8} className="px-3 py-3">
            <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">By strategic category</p>
                <BarList
                  items={BUCKETS.map((b) => ({
                    key: b.key,
                    label: b.label,
                    value: visible.filter((l) => l.bucket === b.key).reduce((s, l) => s + l.total, 0),
                    color: b.color,
                  }))}
                  format={phpCompact}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Top expense categories</p>
                <BarList
                  items={topCategories.map((c) => ({
                    key: c.id,
                    label: c.name,
                    value: c.total,
                    color: categoryClassColor(c.id),
                  }))}
                  format={phpCompact}
                />
                <Link
                  href={`/repository/${a.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-3"
                >
                  Open the full ISSP record <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function fundShare(a: CorpusProfile, fund: string): number {
  if (fund === "all") return 1;
  const total = a.lineItems.reduce((s, l) => s + l.total, 0);
  if (total === 0) return 0;
  return a.lineItems.filter((l) => l.fundSource === fund).reduce((s, l) => s + l.total, 0) / total;
}

function categoryClassColor(categoryId: string): string {
  const cls = EXPENSE_CATEGORIES.find((c) => c.id === categoryId)?.expenseClass;
  return cls === "capitalOutlay" ? "var(--chart-1)" : "var(--chart-2)";
}

function pct(part: number, total: number): string {
  if (!total) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

function Kpi({
  label,
  value,
  sub,
  highlight,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
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
      <p className={cn("text-lg font-bold tabular-nums leading-tight truncate", highlight && "text-primary")} title={value}>
        {value}
      </p>
      {sub ? <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{sub}</p> : null}
    </div>
  );
}

function CycleTile({ year, label, value, sub }: { year: string; label: string; value: string; sub: string }) {
  return (
    <Link
      href="#lifecycle"
      className="rounded-lg border border-foreground/10 bg-card px-3 py-2.5 flex flex-col gap-1 hover:bg-accent/30 transition-colors"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {year} · {label}
      </p>
      <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground leading-snug">{sub}</p>
    </Link>
  );
}

function InsightBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-md bg-muted/60 px-3.5 py-2.5 text-xs leading-relaxed text-foreground", className)}>{children}</div>
  );
}

function Panel({
  title,
  sub,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  sub?: string;
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
        </h2>
        {sub ? <p className="text-xs text-muted-foreground mt-0.5">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/50"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
