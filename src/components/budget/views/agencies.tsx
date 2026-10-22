"use client";

/**
 * Agency ISSPs: each agency's proposed investment, ranked, and the drill-down
 * table with its yearly split. Rows link to the agency's full ISSP record.
 */

import { useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Download } from "lucide-react";
import { BarList } from "@/components/dataviz/charts";
import { BUCKETS, TYPE_SHORT } from "@/lib/repository/corpus";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import type { CorpusProfile } from "@/lib/repository/corpus-types";
import { cn, php, phpCompact } from "@/lib/utils";
import { SCREENS } from "../nav";
import { Panel, ViewHeader, ViewProps, pct } from "./shared";

const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));

export function AgenciesView({ corpus, profiles, lines, fy, mode, fund, exportCsv }: ViewProps & { fund: string; exportCsv: () => void }) {
  return (
    <div className="space-y-6">
      <ViewHeader title={SCREENS.agencies.label} lede={SCREENS.agencies.summary} />
      <RankingPanel profiles={profiles} lines={lines} fy={fy} mode={mode} corpus={corpus} />

      {/* Drill-down */}
      <Panel title="Budget by agency" sub="Expand a row for the category split" icon={Building2}>
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
                <th scope="col" className="border-b px-3 py-2 text-right font-semibold whitespace-nowrap">CO share</th>
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
    </div>
  );
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

function RankingPanel({ profiles, lines, fy, mode, corpus }: { profiles: CorpusProfile[]; lines: ViewProps["lines"]; fy: ViewProps["fy"]; mode: ViewProps["mode"]; corpus: ViewProps["corpus"] }) {
  const compassBySlug = new Map(corpus.compass.agencies.map((ca) => [ca.slug, ca]));
  const fyForRanking = fy === "all" ? null : fy;
  const bars = profiles
    .map((a) => {
      const ca = compassBySlug.get(a.slug);
      const oblig25 = ca ? ca.years.find((y) => y.year === 2025)?.obligated : undefined;
      // The same lines the KPIs count, so bar lengths respect the fund and FY
      // filters (per-year line sums equal the engine's B.1 year totals).
      const value = lines
        .filter((l) => l.slug === a.slug && (fyForRanking === null || l.year === fyForRanking))
        .reduce((s, l) => s + l.total, 0);
      const basis = fyForRanking ? value : value / 3;
      const ratio = oblig25 && basis ? basis / oblig25 : null;
      return { slug: a.slug, acronym: a.acronym, name: a.name, value, ratio };
    })
    .filter((a) => a.value > 0)
    .sort((x, y) => y.value - x.value);

  return (
    <Panel title={fyForRanking ? `Agencies by FY${fyForRanking} request` : "Agencies by proposed investment"} sub="Select an agency to open its ISSP" icon={Building2}>
      <BarList
        items={bars.map((a) => ({
          key: a.slug,
          label: `${a.acronym} · ${a.name}`,
          value: a.value,
          href: `/repository/${a.slug}`,
          ...(a.ratio && a.ratio > 2 && mode === "proposed"
            ? {
                sub: `${fyForRanking ? `FY${fyForRanking} request` : "Average annual request"} is ${a.ratio.toFixed(1)}× the agency's FY2025 ICT obligations (mock)`,
              }
            : {}),
        }))}
        total={bars.reduce((s, a) => s + a.value, 0)}
        format={phpCompact}
      />
      {mode === "proposed" && bars.some((b) => b.ratio && b.ratio > 2) ? (
        <p className="text-[11px] text-muted-foreground mt-3">
          Notes compare the {fyForRanking ? `FY${fyForRanking} request` : "average annual request"} with the
          agency&apos;s FY2025 ICT obligations (mock).
        </p>
      ) : null}
    </Panel>
  );
}

// ─── Drill-down row ───────────────────────────────────────────────────────────

function AgencyRow({ agency: a, fund }: { agency: CorpusProfile; fund: string }) {
  const [open, setOpen] = useState(false);
  const visible = a.lineItems.filter((l) => fund === "all" || l.fundSource === fund);
  const filteredTotal = visible.reduce((s, l) => s + l.total, 0);
  // Per-year sums of the same lines the engine counts (verified equal to B.1
  // grandTotals), so Y1..Y3 add up to the 3-yr total under any fund filter.
  const yearTotal = (offset: number) =>
    visible.filter((l) => l.year === a.cycle.startYear + offset).reduce((s, l) => s + l.total, 0);
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
        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{TYPE_SHORT[a.type]}</td>
        {[0, 1, 2].map((i) => (
          <td key={i} className="px-3 py-2 text-right tabular-nums">
            {php(yearTotal(i))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">By strategic category</p>
                <BarList
                  items={BUCKETS.map((b) => ({
                    key: b.key,
                    label: b.label,
                    value: visible.filter((l) => l.bucket === b.key).reduce((s, l) => s + l.total, 0),
                    color: b.color,
                  }))}
                  total={filteredTotal}
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
                  Open ISSP record <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
