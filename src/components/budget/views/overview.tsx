"use client";

/**
 * Overview view: the whole of government at a glance. KPIs and the rebalanced
 * why-now band (AI as one tile of four, not the headline), the posture grid
 * (agencies grouped by PDP sector × domain columns, v14 columns live and
 * proposed columns locked in current-form mode), the by-year/category/fund
 * charts, rankings and the drill-down table.
 */

import { Fragment, useState } from "react";
import Link from "next/link";
import { Building2, Check, ChevronRight, Coins, Download, Landmark, Lock, PieChart, ReceiptText } from "lucide-react";
import { BarList, Donut, StackedColumns, SwatchLegend } from "@/components/dataviz/charts";
import { BUCKETS, SECTORS, TYPE_SHORT } from "@/lib/repository/corpus";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import type { CompassAgency, CorpusProfile } from "@/lib/repository/corpus-types";
import { cn, php, phpCompact } from "@/lib/utils";
import { InsightBox, Kpi, Panel, RatePill, ViewProps, pct } from "./shared";

const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));
const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const DOMAIN_LINKS = [
  { href: "/budget?view=cybersecurity", label: "Cybersecurity", desc: "Part II-B controls, fleet exposure, advisory blast radius" },
  { href: "/budget?view=devices", label: "Devices", desc: "the estate, unit-price sanity, device spend" },
  { href: "/budget?view=networks", label: "Networks", desc: "connectivity spend and the links the plans name" },
  { href: "/budget?view=cloud", label: "Cloud & software", desc: "storage mix, hosting spend, cloud-first" },
  { href: "/budget?view=ai", label: "AI & compute", desc: "tagged asks, own-build versus shared" },
  { href: "/budget?view=people", label: "People", desc: "ICT workforce and capability spend" },
  { href: "/budget?view=services", label: "eGov services", desc: "eGovPH adoption, PNPKI, online reach" },
  { href: "/budget?view=money", label: "Money & execution", desc: "follow every peso, absorptive capacity" },
  { href: "/budget?view=shared", label: "Shared services", desc: "duplication watch, cross-agency programs" },
];

export function OverviewView({ corpus, profiles, lines, fy, mode, exportCsv, fyLabel, fund }: ViewProps & { exportCsv: () => void; fyLabel: string; fund: string }) {
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

  const fundSegments = (() => {
    const map = new Map<string, number>();
    lines.forEach((l) => map.set(l.fundSource, (map.get(l.fundSource) ?? 0) + l.total));
    return [...map.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([label, value], i) => ({ key: label, label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  })();

  return (
    <div className="space-y-6">
      <WhyNowBand corpus={corpus} mode={mode} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi
          label={fy === "all" ? "Proposed ICT investment" : `FY${fy} ISSP ask`}
          value={phpCompact(total)}
          sub={
            yoyDelta !== null && fy !== "all"
              ? `${yoyDelta >= 0 ? "▲" : "▼"} ${Math.abs(yoyDelta).toFixed(1)}% vs FY${fy - 1} (${phpCompact(priorFyTotal)})`
              : `${profiles.length} agencies · ${fyLabel}`
          }
          highlight
          icon={Coins}
        />
        <Kpi label="Capital outlay" value={phpCompact(co)} sub={`${pct(co, total)} of total`} />
        <Kpi label="MOOE" value={phpCompact(total - co)} sub={`${pct(total - co, total)} of total`} />
        <Kpi
          label="Top expense category"
          value={categories[0]?.name.split(" ").slice(0, 3).join(" ") ?? "–"}
          sub={categories[0] ? phpCompact(categories[0].total) : ""}
          icon={ReceiptText}
        />
        {mode === "proposed" ? (
          <Kpi
            label="Projects with PAP code"
            value={papStats.all ? `${papStats.withPap} of ${papStats.all}` : "–"}
            sub={`${papStats.all ? Math.round((papStats.withPap / papStats.all) * 100) : 0}% traceable to the NEP / GAA (mock)`}
            icon={Landmark}
          />
        ) : (
          <Kpi
            label="KPIs fully specified"
            value={kpiStats.total ? `${kpiStats.complete} of ${kpiStats.total}` : "–"}
            sub="baseline + all three targets, from today's form"
            icon={Landmark}
          />
        )}
      </div>

      <PostureGrid corpus={corpus} profiles={profiles} mode={mode} />

      {/* Charts row 1: by year + fund sources */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Proposed investment by year" sub="stacked by Part IV strategic category" className="lg:col-span-2">
          <StackedColumns columns={byYearColumns} format={phpCompact} />
          <SwatchLegend className="mt-4" items={BUCKETS.map((b) => ({ key: b.key, label: b.label, color: b.color }))} />
          <InsightBox className="mt-4">
            <strong>Continuing costs are the quiet story.</strong> New systems become yearly subscriptions,
            hosting and licences: the future MOOE floor of every approved project. Watch the Continuing Costs
            share of each year grow in the stacked bars above.
          </InsightBox>
        </Panel>
        <Panel title="Fund sources" sub="B.2 across the selection" icon={PieChart}>
          <Donut segments={fundSegments} centerValue={phpCompact(total)} centerLabel="proposed" format={phpCompact} size={160} stackLegend />
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-4">
            LGU and GOCC budgets do not pass through the GAA. For them, the ISSP is the only national view of
            ICT intent.
          </p>
        </Panel>
      </div>

      {/* Charts row 2: categories + domain links */}
      <div className="grid lg:grid-cols-3 lg:items-start gap-4">
        <Panel title="Where the money goes" sub="DICT expense categories (B.4)" className="lg:col-span-2">
          <BarList
            items={[
              ...categories.slice(0, 10).map((c) => ({
                key: c.id,
                label: c.name,
                value: c.total,
              })),
              ...(categories.length > 10
                ? [
                    {
                      key: "__other",
                      label: `Other ${categories.length - 10} categories`,
                      value: categories.slice(10).reduce((s, c) => s + c.total, 0),
                      color: "var(--muted-foreground)",
                    },
                  ]
                : []),
            ]}
            format={phpCompact}
          />
        </Panel>
        <Panel title="Explore by domain" sub="every view reads the same fields">
          <div className="space-y-1">
            {DOMAIN_LINKS.map((v) => (
              <Link key={v.href} href={v.href} className="flex items-baseline justify-between gap-2 rounded-md px-2.5 -mx-2.5 py-1.5 hover:bg-accent/40 transition-colors">
                <span className="min-w-0">
                  <span className="text-sm font-medium">{v.label}</span>
                  <span className="block text-[11px] text-muted-foreground leading-snug">{v.desc}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 self-center" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <RankingPanel profiles={profiles} lines={lines} fy={fy} mode={mode} corpus={corpus} />

      {/* Drill-down */}
      <Panel title="Agency drill-down" sub="expand a row for its split; click the acronym for the full record" icon={Building2}>
        <div className="flex justify-end mb-3">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Line items (CSV)
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-card -m-1">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agency</th>
                <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Type</th>
                <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Y1</th>
                <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Y2</th>
                <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Y3</th>
                <th scope="col" className="border-b px-3 py-2 text-right font-semibold">3-yr total</th>
                <th scope="col" className="border-b px-3 py-2 text-right font-semibold">CO share</th>
                <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...profiles]
                .sort((a, b) => b.budget.grandTotal - a.budget.grandTotal)
                .map((a) => (
                  <AgencyRow key={a.slug} agency={a} fund={fund} />
                ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-xs text-muted-foreground pt-2">
        All plan figures derive from each agency&apos;s Part IV line items through the same aggregation engine as
        the editor&apos;s Summary of Investments (B.1–B.4), counted budget only. The execution layer (NEP, GAA,
        allotments, obligations, disbursements) and all join codes are fictitious demonstration data standing in
        for a future DBM COMPASS feed.
      </p>
    </div>
  );
}

// ─── Why-now band (rebalanced: whole of government, AI as one tile) ───────────

function WhyNowBand({ corpus, mode }: { corpus: ViewProps["corpus"]; mode: ViewProps["mode"] }) {
  const byYear = corpus.totals.byYear;
  const peak = byYear.reduce((best, y) => (y.total > (best?.total ?? 0) ? y : best), byYear[0]);
  const aiTotal = corpus.aiLayer.projects.reduce((s, p) => s + p.total, 0);

  const continuingShare = (year: number) => {
    let cc = 0;
    let total = 0;
    corpus.agencies.forEach((a) =>
      a.lineItems.forEach((l) => {
        if (l.year !== year) return;
        total += l.total;
        if (l.bucket === "continuingCosts") cc += l.total;
      })
    );
    return total ? cc / total : 0;
  };
  const share26 = continuingShare(2026);
  const share29 = continuingShare(2029);

  return (
    <section className="rounded-xl bg-[var(--sidebar)] text-white p-5 sm:p-6">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-[#B9C8EE] mb-1.5">Why now · the ICT spend wave</p>
      <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight max-w-3xl">
        The next infrastructure wave is digital: plan first, then spend
      </h2>
      <p className="text-sm text-[#E6ECF7] leading-relaxed max-w-3xl mt-2.5">
        AI services, government data centers and always-on platforms are lifting public ICT budgets to
        infrastructure scale worldwide. Infrastructure money gets line-item scrutiny from day one. This wave
        deserves the same, starting in the ISSP, before the NEP, not after the audit.
      </p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
        <WhyTile
          label="Planned ICT, whole of government"
          value={phpCompact(corpus.totals.grandTotal)}
          sub={`across ${corpus.totals.plans} plans · every peso a Part IV line item`}
        />
        <WhyTile
          label="Peak year"
          value={`FY${peak?.year ?? "–"}`}
          sub={`${phpCompact(peak?.total ?? 0)} planned, before the NEP exists`}
        />
        <WhyTile
          label="Continuing-cost share"
          value={`${Math.round(share26 * 100)}% → ${Math.round(share29 * 100)}%`}
          sub="of each year's ask, FY2026 → FY2029: new systems become permanent subscriptions"
        />
        <WhyTile
          label="AI & compute asks"
          value={mode === "current" ? "–" : phpCompact(aiTotal)}
          sub={
            mode === "current"
              ? "requires an AI/compute tag per project (a proposed field)"
              : "one domain of ten · see the AI & compute view"
          }
        />
      </div>
    </section>
  );
}

function WhyTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="h-full rounded-lg bg-white/10 border border-white/15 px-4 py-3 flex flex-col">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-[#B9C8EE]">{label}</p>
      <p className="text-lg font-bold tabular-nums leading-tight mt-1">{value}</p>
      <p className="text-[11px] text-[#E6ECF7]/85 leading-snug mt-1">{sub}</p>
    </div>
  );
}

// ─── Posture grid: agencies × domains, grouped by PDP sector ─────────────────

function PostureGrid({ corpus, profiles, mode }: { corpus: ViewProps["corpus"]; profiles: CorpusProfile[]; mode: ViewProps["mode"] }) {
  const cyberBySlug = new Map(corpus.cyber.agencies.map((a) => [a.slug, a]));
  const compassBySlug = new Map(corpus.compass.agencies.map((ca) => [ca.slug, ca]));
  const sectors = SECTORS.map((s) => ({ ...s, list: profiles.filter((p) => p.sector === s.key) })).filter((s) => s.list.length > 0);

  return (
    <Panel title="Whole-of-government posture" sub="agencies grouped by PDP sector · one column per ICT domain">
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agency</th>
              <th scope="col" className="border-b px-3 py-2 text-center font-semibold whitespace-nowrap">
                <span className="inline-flex items-center gap-1">Cyber controls <BasisMark /></span>
              </th>
              <th scope="col" className="border-b px-3 py-2 text-center font-semibold whitespace-nowrap">
                <span className="inline-flex items-center gap-1">Cloud-hosted <BasisMark /></span>
              </th>
              <th scope="col" className="border-b px-3 py-2 text-center font-semibold whitespace-nowrap">
                <span className="inline-flex items-center gap-1">Continuing share <BasisMark /></span>
              </th>
              <th scope="col" className="border-b px-3 py-2 text-center font-semibold whitespace-nowrap">
                <span className="inline-flex items-center gap-1">Endpoints past support <BasisMark proposed /></span>
              </th>
              <th scope="col" className="border-b px-3 py-2 text-center font-semibold whitespace-nowrap">
                <span className="inline-flex items-center gap-1">FY2025 obligated <BasisMark proposed /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((sector) => (
              <Fragment key={sector.key}>
                <tr className="bg-muted/30">
                  <td colSpan={6} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {sector.label} · {sector.pdp} · {sector.list.length} {sector.list.length === 1 ? "agency" : "agencies"}
                  </td>
                </tr>
                {sector.list.map((p) => (
                  <PostureRow
                    key={p.slug}
                    profile={p}
                    cyber={cyberBySlug.get(p.slug)?.overall}
                    compass={compassBySlug.get(p.slug)}
                    fleet={corpus.security.fleetBySlug[p.slug]}
                    proposedCols={mode === "proposed"}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Check className="w-3 h-3 text-success" /> computed from today&apos;s form</span>
        <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> waits on a proposed field or link</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
        Cyber controls and cloud share come from today&apos;s form. Endpoint exposure needs the Annex 1 asset
        inventory and obligation rates need a COMPASS link, both proposed: flip the Data mode to see the grid run
        on today&apos;s form alone. Sectors follow the PDP 2023-2028 chapter structure (mock assignment; a
        proposed ISSP field).
      </p>
    </Panel>
  );
}

/** Column-header marker for the column's data basis. */
function BasisMark({ proposed }: { proposed?: boolean }) {
  return proposed ? (
    <Lock className="w-3 h-3 text-muted-foreground" aria-label="proposed field" />
  ) : (
    <Check className="w-3 h-3 text-success" aria-label="today's form" />
  );
}

function PostureRow({
  profile: p,
  cyber,
  compass,
  fleet,
  proposedCols,
}: {
  profile: CorpusProfile;
  cyber?: number;
  compass?: CompassAgency;
  fleet?: ViewProps["corpus"]["security"]["fleetBySlug"][string];
  proposedCols: boolean;
}) {
  const cloudShare = p.systems.length ? p.systems.filter((s) => s.dataStorage === "CLOUD").length / p.systems.length : 0;
  const ccRow = p.budget.b1.find((r) => r.label === "Continuing Costs");
  const ccShare = ccRow && p.budget.grandTotals[2] > 0 ? ccRow.year3 / p.budget.grandTotals[2] : 0;
  const y25 = compass?.years.find((y) => y.year === 2025);

  return (
    <tr className="border-b last:border-b-0 hover:bg-accent/20">
      <td className="px-3 py-2 whitespace-nowrap">
        <Link href={`/repository/${p.slug}`} className="font-medium hover:underline">
          {p.acronym}
        </Link>
        <span className="text-muted-foreground text-[10px] block">{TYPE_SHORT[p.type]}</span>
      </td>
      <td className="px-3 py-2 text-center">{cyber !== undefined ? <BandPill share={cyber} bands={[0.3, 0.5]} /> : "–"}</td>
      <td className="px-3 py-2 text-center tabular-nums">{Math.round(cloudShare * 100)}%</td>
      <td className="px-3 py-2 text-center tabular-nums">{Math.round(ccShare * 100)}%</td>
      <td className="px-3 py-2 text-center">
        {proposedCols && fleet ? (
          <BandPill share={fleet.endpointsEol / fleet.endpoints} bands={[0.1, 0.3]} invert />
        ) : (
          <LockedCell />
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {proposedCols && y25?.obligated && y25?.allotment ? (
          <RatePill rate={y25.obligated / y25.allotment} />
        ) : y25 ? (
          <span className="text-muted-foreground text-[10px]">no FY2025 row</span>
        ) : (
          <LockedCell />
        )}
      </td>
    </tr>
  );
}

function LockedCell() {
  return (
    <span className="inline-flex items-center justify-center gap-1 text-muted-foreground" title="Needs a proposed field or link">
      <Lock className="w-3 h-3" aria-label="locked" /> –
    </span>
  );
}

/** Compact share chip with three bands; `invert` flips the reading (high share = worse). */
function BandPill({ share, bands, invert }: { share: number; bands: [number, number]; invert?: boolean }) {
  const value = Math.round(share * 100);
  const [a, b] = bands;
  const level = share >= b ? 2 : share >= a ? 1 : 0;
  const effective = invert ? 2 - level : level;
  const cls =
    effective === 2
      ? "bg-success-bg text-success border border-success-border"
      : effective === 1
        ? "bg-warning-bg text-warning border border-warning-border"
        : "bg-danger-bg text-destructive border border-danger-border";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums", cls)}>{value}%</span>;
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

function RankingPanel({ profiles, lines, fy, mode, corpus }: { profiles: CorpusProfile[]; lines: ViewProps["lines"]; fy: ViewProps["fy"]; mode: ViewProps["mode"]; corpus: ViewProps["corpus"] }) {
  const compassBySlug = new Map(corpus.compass.agencies.map((ca) => [ca.slug, ca]));
  const yearTotalOf = (a: CorpusProfile, year: number) => {
    const i = year - a.cycle.startYear;
    return i >= 0 && i < 3 ? a.budget.grandTotals[i] : null;
  };
  const fyForRanking = fy === "all" ? null : fy;
  const bars = profiles
    .map((a) => {
      const ca = compassBySlug.get(a.slug);
      const oblig25 = ca ? ca.years.find((y) => y.year === 2025)?.obligated : undefined;
      const value =
        (fyForRanking ? yearTotalOf(a, fyForRanking) : null) ??
        lines.filter((l) => l.slug === a.slug).reduce((s, l) => s + l.total, 0);
      const basis = fyForRanking ? yearTotalOf(a, fyForRanking) : a.budget.grandTotal / 3;
      const ratio = oblig25 && basis ? basis / oblig25 : null;
      return { slug: a.slug, acronym: a.acronym, name: a.name, value, ratio };
    })
    .filter((a) => a.value !== null)
    .sort((x, y) => y.value - x.value);

  return (
    <Panel title={fyForRanking ? `Agencies by FY${fyForRanking} ask` : "Agencies by proposed investment"} sub="click through to the full ISSP record" icon={Building2}>
      <BarList
        items={bars.map((a) => ({
          key: a.slug,
          label: `${a.acronym} · ${a.name}`,
          value: a.value,
          href: `/repository/${a.slug}`,
          ...(a.ratio && a.ratio > 2 && mode === "proposed"
            ? {
                sub: `${fyForRanking ? `FY${fyForRanking} ask` : "Average yearly ask"} is ${a.ratio.toFixed(1)}× the agency's FY2025 ICT obligations (mock)`,
              }
            : {}),
        }))}
        format={phpCompact}
      />
      <p className="text-[11px] text-muted-foreground mt-3">
        Annotation basis: {fyForRanking ? `FY${fyForRanking} ask` : "3-year plan total ÷ 3"} vs FY2025
        obligations, the same comparison as the absorptive-capacity table in Money &amp; execution.
      </p>
    </Panel>
  );
}

// ─── Drill-down row ───────────────────────────────────────────────────────────

function fundShare(a: CorpusProfile, fund: string): number {
  if (fund === "all") return 1;
  const total = a.lineItems.reduce((s, l) => s + l.total, 0);
  if (total === 0) return 0;
  return a.lineItems.filter((l) => l.fundSource === fund).reduce((s, l) => s + l.total, 0) / total;
}

function AgencyRow({ agency: a, fund }: { agency: CorpusProfile; fund: string }) {
  const [open, setOpen] = useState(false);
  const visible = a.lineItems.filter((l) => fund === "all" || l.fundSource === fund);
  const filteredTotal = visible.reduce((s, l) => s + l.total, 0);
  const share = filteredTotal > 0 ? fundShare(a, fund) : 0;
  const co = visible.filter((l) => l.expenseClass === "capitalOutlay").reduce((s, l) => s + l.total, 0);
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
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`${open ? "Collapse" : "Expand"} ${a.acronym} budget split`}
              className="flex items-center cursor-pointer select-none rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
            </button>
            <Link href={`/repository/${a.slug}`} className="font-medium hover:underline">
              {a.acronym}
            </Link>
            <span className="text-muted-foreground hidden xl:inline"> · {a.name}</span>
          </div>
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
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
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
                <BarList items={topCategories.map((c) => ({ key: c.id, label: c.name, value: c.total }))} format={phpCompact} />
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
