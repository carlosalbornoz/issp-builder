"use client";

/**
 * Home: the dashboard's entry screen. The why-now band frames the scale of the
 * whole-of-government ICT plan; the area cards below open each screen.
 */

import Link from "next/link";
import { Lock } from "lucide-react";
import { cn, phpCompact } from "@/lib/utils";
import { EXTERNAL_ITEMS, SCREENS, screenHref, type ScreenKey } from "../nav";
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
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mt-2">
          The ICT posture of the whole government, one domain at a time: every figure is the same Part IV data
          behind each agency&apos;s official Summary of Investments, with a mock execution layer standing in for a
          future COMPASS link.
        </p>
      </div>
      <WhyNowBand corpus={corpus} mode={mode} />
      <section>
        <h2 className="text-sm font-semibold mb-3">Select an area to review</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HOME_CARDS.map((key) =>
            key === "dataStandard" ? (
              <TaskCard key={key} href={EXTERNAL_ITEMS.dataStandard.href} title={EXTERNAL_ITEMS.dataStandard.label} summary={EXTERNAL_ITEMS.dataStandard.summary} headline={homeHeadline(key, props, fyLabel)} mode={mode} />
            ) : (
              <TaskCard key={key} href={screenHref(key, params)} title={SCREENS[key].label} summary={SCREENS[key].summary} headline={homeHeadline(key, props, fyLabel)} mode={mode} />
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
export function TaskCard({ href, title, summary, headline, mode }: { href: string; title: string; summary: string; headline: Headline; mode: ViewProps["mode"] }) {
  const locked = headline.proposed && mode === "current";
  return (
    <Link
      href={href}
      data-card
      data-locked={locked ? "" : undefined}
      className="group flex flex-col rounded-xl ring-1 ring-foreground/10 bg-card p-4 hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <span className="text-sm font-semibold group-hover:text-primary transition-colors">{title}</span>
      <span className="text-xs text-muted-foreground leading-snug mt-1">{summary}</span>
      <span className="mt-auto pt-3 flex items-baseline gap-2 min-w-0">
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Requires the revised ISSP form">
            <Lock className="w-3.5 h-3.5" aria-hidden /> Requires the revised form
          </span>
        ) : (
          <>
            <span className="text-lg font-bold tabular-nums leading-none shrink-0">{headline.value}</span>
            <span className={cn("text-[11px] text-muted-foreground truncate")} title={headline.detail}>
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
