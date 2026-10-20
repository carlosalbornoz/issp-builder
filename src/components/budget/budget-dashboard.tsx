"use client";

/**
 * ICT Budget Dashboard (demonstration).
 * Cross-agency views of ISSP-proposed ICT investment, computed client-side
 * from the corpus line items — the same Part IV facts the editor's Summary
 * tables use — plus the fictitious DBM allotment layer for the
 * request-vs-allotment story. Zero chart libraries: everything is the
 * hand-rolled dataviz components on theme tokens.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronRight, Coins, Landmark, Layers3, PieChart, ReceiptText } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { DemoNotice } from "@/components/repository/demo-notice";
import { BarList, Donut, PairedBars, StackedColumns, SwatchLegend } from "@/components/dataviz/charts";
import { useCorpus, BUCKETS, TYPE_LABELS, TYPE_SHORT } from "@/lib/repository/corpus";
import type { CorpusLineItem, CorpusProfile } from "@/lib/repository/corpus-types";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { cn, php, phpCompact } from "@/lib/utils";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));
const EMPTY_AGENCIES: CorpusProfile[] = [];

type AgencyLine = CorpusLineItem & { acronym: string; slug: string };

export function BudgetDashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const { corpus, error } = useCorpus();
  const [cycle, setCycle] = useState("all");
  const [type, setType] = useState("all");
  const [fund, setFund] = useState("all");

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

  const totals = useMemo(() => {
    const total = lines.reduce((s, l) => s + l.total, 0);
    const co = lines.filter((l) => l.expenseClass === "capitalOutlay").reduce((s, l) => s + l.total, 0);
    const byCategory = new Map<string, number>();
    lines.forEach((l) => byCategory.set(l.categoryId || "uncategorized", (byCategory.get(l.categoryId || "uncategorized") ?? 0) + l.total));
    const categories = [...byCategory.entries()]
      .map(([id, v]) => ({ id, name: id === "uncategorized" ? "Uncategorized" : categoryNameById.get(id) ?? id, total: v }))
      .sort((x, y) => y.total - x.total);
    return { total, co, mooe: total - co, categories };
  }, [lines]);

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

  const agencyBars = useMemo(
    () =>
      [...selected]
        .map((a) => ({
          slug: a.slug,
          acronym: a.acronym,
          name: a.name,
          value: a.lineItems.filter((l) => fund === "all" || l.fundSource === fund).reduce((s, l) => s + l.total, 0),
        }))
        .sort((x, y) => y.value - x.value),
    [selected, fund]
  );

  // Allotment comparison — agency-level filters only (allotments are whole-of-year figures).
  const allotmentGroups = useMemo(
    () =>
      selected
        .filter((a) => a.allotments.entries.length > 0)
        .flatMap((a) =>
          a.allotments.entries.map((e) => ({
            key: `${a.slug}-${e.year}`,
            label: `${a.acronym} · FY${e.year}`,
            a: e.request,
            b: e.allotment,
          }))
        ),
    [selected]
  );
  const allotmentUtilization = allotmentGroups.length
    ? Math.round((allotmentGroups.reduce((s, g) => s + g.b / g.a, 0) / allotmentGroups.length) * 100)
    : null;

  return (
    <PublicShell active="budget" width="wide">
      {/* ── Hero ── */}
      <section className="border-b bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Fiscal transparency · Structured ISSP data
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-3">ICT Budget Dashboard</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-8">
            ISSP-proposed ICT investment across agencies and years — computed from the same Part IV facts behind each
            agency&apos;s official Summary of Investments, so requests mean exactly what the agency signed. The
            allotment layer demonstrates the request-vs-release loop DBM could close with a live GAA feed.
          </p>
          {error || !corpus ? null : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Kpi label="Proposed ICT investment" value={phpCompact(totals.total)} sub={`${selected.length} agencies · 3-year plans`} highlight icon={Coins} />
              <Kpi label="Capital outlay" value={phpCompact(totals.co)} sub={`${pct(totals.co, totals.total)} of total`} />
              <Kpi label="MOOE" value={phpCompact(totals.mooe)} sub={`${pct(totals.mooe, totals.total)} of total`} />
              <Kpi
                label="Top expense category"
                value={totals.categories[0]?.name.split(" ").slice(0, 3).join(" ") ?? "—"}
                sub={totals.categories[0] ? phpCompact(totals.categories[0].total) : ""}
                icon={ReceiptText}
              />
              <Kpi
                label="FY2026 allotment coverage"
                value={allotmentUtilization !== null ? `${allotmentUtilization}%` : "—"}
                sub={`${allotmentGroups.length} agency-years elapsed (mock)`}
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
              <span className="text-xs text-muted-foreground lg:ml-auto">
                {lines.length.toLocaleString("en-PH")} line items · {phpCompact(totals.total)} across {new Set(lines.map((l) => l.year)).size} fiscal years
              </span>
            </div>

            {/* ── Charts row 1: by year + fund sources ── */}
            <div className="grid lg:grid-cols-3 gap-4">
              <Panel title="Proposed investment by year" sub="stacked by Part IV strategic category" className="lg:col-span-2">
                <StackedColumns columns={byYearColumns} format={phpCompact} />
                <SwatchLegend className="mt-4" items={BUCKETS.map((b) => ({ key: b.key, label: b.label, color: b.color }))} />
              </Panel>
              <Panel title="Fund sources" sub="B.2 across the selection" icon={PieChart}>
                <Donut segments={fundSegments} centerValue={phpCompact(totals.total)} centerLabel="proposed" format={phpCompact} size={160} stackLegend />
              </Panel>
            </div>

            {/* ── Charts row 2: categories + request vs allotment ── */}
            <div className="grid lg:grid-cols-3 gap-4">
              <Panel title="Where the money goes" sub="DICT expense categories (B.4)" className="lg:col-span-2">
                <BarList
                  items={totals.categories.slice(0, 10).map((c) => ({
                    key: c.id,
                    label: c.name,
                    value: c.total,
                    color: categoryClassColor(c.id),
                  }))}
                  format={phpCompact}
                />
                {totals.categories.length > 10 && (
                  <p className="text-[11px] text-muted-foreground mt-3">
                    + {totals.categories.length - 10} more categories, together{" "}
                    {phpCompact(totals.categories.slice(10).reduce((s, c) => s + c.total, 0))}
                  </p>
                )}
              </Panel>
              <Panel title="Requests vs. allotments" sub="fictitious DBM layer — elapsed fiscal years only" icon={Landmark}>
                {allotmentGroups.length > 0 ? (
                  <PairedBars groups={allotmentGroups} labelA="ISSP request" labelB="Allotment (mock)" format={phpCompact} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No elapsed fiscal years in this selection — allotments exist only after the GAA, which is the
                    loop this dashboard is built to close.
                  </p>
                )}
              </Panel>
            </div>

            {/* ── Agencies ranked ── */}
            <Panel title="Agencies by proposed investment" sub="click through to the full ISSP record" icon={Building2}>
              <BarList
                items={agencyBars.map((a) => ({
                  key: a.slug,
                  label: `${a.acronym} — ${a.name}`,
                  value: a.value,
                  href: `/repository/${a.slug}`,
                }))}
                format={phpCompact}
              />
            </Panel>

            {/* ── Cross-agency programs ── */}
            <section id="programs" className="pt-2 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Program convergence budgeting
                </p>
                <h2 className="font-display text-lg font-bold tracking-tight">
                  Cross-agency programs <Layers3 className="inline w-4 h-4 -mt-1 text-muted-foreground" />
                </h2>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {corpus.crossAgencyPrograms.map((p) => (
                  <div
                    key={p.key}
                    className={cn(
                      "rounded-xl ring-1 bg-card p-4",
                      highlightProgram === p.key ? "ring-2 ring-primary" : "ring-foreground/10"
                    )}
                  >
                    <p className="text-sm font-semibold leading-snug mb-1.5">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground mb-3">Led by {p.leadAgency}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{p.description}</p>
                    <div className="space-y-1.5 mb-3">
                      {p.agencies.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/repository/${s.slug}`}
                          className="flex items-baseline justify-between gap-2 text-xs hover:underline"
                        >
                          <span className="text-foreground">
                            {s.acronym}
                            {p.leadAgency.includes(s.acronym) ? " (lead)" : ""}
                          </span>
                          <span className="tabular-nums text-muted-foreground">{phpCompact(s.share)}</span>
                        </Link>
                      ))}
                    </div>
                    <div className="flex items-baseline justify-between border-t pt-2">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Combined 3-yr cost</span>
                      <span className="text-sm font-bold tabular-nums text-primary">{phpCompact(p.combinedCost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Drill-down table ── */}
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
              All figures derive from each agency&apos;s Part IV line items through the same aggregation engine as
              the editor&apos;s Summary of Investments (B.1–B.4) — counted budget only. The allotment layer is
              fictitious demonstration data standing in for a future DBM GAA feed.
            </p>
          </>
        )}
      </div>
    </PublicShell>
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
