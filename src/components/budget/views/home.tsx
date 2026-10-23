"use client";

/**
 * Home: the dashboard's entry screen. The why-now band frames the scale of the
 * whole-of-government ICT plan; the area cards below open each screen.
 */

import Link from "next/link";
import { Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { phpCompact } from "@/lib/utils";
import { EXTERNAL_ITEMS, SCREENS, externalHref, screenHref, type ScreenKey } from "../nav";
import { homeHeadline, type Headline } from "./headlines";
import { ViewProps } from "./shared";

/** Home's areas, in reading order: the picture, the money, the detail, the ask. */
const HOME_CARDS: (ScreenKey | "dataStandard")[] = ["posture", "sectors", "domains", "ask", "buys", "money", "absorptive", "agencies", "dataStandard"];

export function HomeView({ params, fyLabel, ...props }: ViewProps & { params: URLSearchParams; fyLabel: string }) {
  const { corpus, mode } = props;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">ICT Budget Dashboard</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mt-2 text-pretty">
          Proposed ICT investment across government, compiled from the Part IV Summary of Investments in each
          agency{"\u00A0"}ISSP.
        </p>
      </div>
      <WhyNowBand corpus={corpus} mode={mode} />
      <section>
        <h2 className="text-sm font-semibold mb-3">Select an area to review</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HOME_CARDS.map((key) =>
            key === "dataStandard" ? (
              <TaskCard key={key} href={externalHref("dataStandard", params)} title={EXTERNAL_ITEMS.dataStandard.label} summary={EXTERNAL_ITEMS.dataStandard.summary} headline={homeHeadline(key, props, fyLabel)} mode={mode} icon={EXTERNAL_ITEMS.dataStandard.icon} />
            ) : (
              <TaskCard key={key} href={screenHref(key, params)} title={SCREENS[key].label} summary={SCREENS[key].summary} headline={homeHeadline(key, props, fyLabel)} mode={mode} icon={SCREENS[key].icon} />
            )
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * One area of the dashboard: its name, what it covers, and one live figure.
 * The whole card is the link. A figure that needs a proposed field shows the
 * lock in current-form mode, the same contract as ProposedOnly panels.
 */
export function TaskCard({ href, title, summary, headline, mode, icon: Icon }: { href: string; title: string; summary: string; headline: Headline; mode: ViewProps["mode"]; icon?: LucideIcon }) {
  const locked = headline.proposed && mode === "current";
  return (
    <Link
      href={href}
      data-card
      data-locked={locked ? "" : undefined}
      className="group flex flex-col rounded-xl ring-1 ring-foreground/10 bg-card p-4 hover:bg-accent/40 active:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <span className="text-sm font-semibold group-hover:text-primary transition-colors flex items-center gap-1.5">
        {Icon ? <Icon className="w-4 h-4 text-muted-foreground shrink-0 select-none" aria-hidden /> : null}
        {title}
      </span>
      <span className="text-xs text-muted-foreground leading-snug mt-1 text-pretty">{summary}</span>
      <span className="mt-auto pt-3 flex items-baseline gap-2 min-w-0">
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" aria-hidden /> Requires the revised ISSP form
          </span>
        ) : (
          <>
            <span className="text-lg font-bold tabular-nums leading-none shrink-0">{headline.value}</span>
            <span className="text-[11px] text-muted-foreground truncate" title={headline.detail}>
              {headline.detail}
            </span>
          </>
        )}
      </span>
    </Link>
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
      <p className="text-[10px] uppercase tracking-widest font-semibold text-[#B9C8EE] mb-1.5">ICT investment outlook</p>
      <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight max-w-3xl">
        ICT spending is reaching infrastructure scale
      </h2>
      <p className="text-sm text-[#E6ECF7] leading-relaxed max-w-3xl mt-2.5">
        AI services, government data centers and continuously operated platforms are raising public ICT budgets
        to infrastructure levels. This investment warrants line-item review at the planning stage, in the ISSP,
        before the NEP.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
        <WhyTile
          label="Planned ICT investment"
          value={phpCompact(corpus.totals.grandTotal)}
          sub={`${corpus.totals.plans} agency plans · Part IV line items`}
        />
        <WhyTile
          label="Peak year"
          value={`FY${peak?.year ?? "–"}`}
          sub={`${phpCompact(peak?.total ?? 0)} planned`}
        />
        <WhyTile
          label="Continuing costs"
          value={`${Math.round(share26 * 100)}% → ${Math.round(share29 * 100)}%`}
          sub="share of the annual request, FY2026 to FY2029"
        />
        <WhyTile
          label="AI and compute requests"
          value={mode === "current" ? "–" : phpCompact(aiTotal)}
          sub={
            mode === "current"
              ? "requires an AI and compute tag per project (proposed field)"
              : "one of eight ICT domains"
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
