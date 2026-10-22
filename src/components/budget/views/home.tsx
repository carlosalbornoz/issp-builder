"use client";

/**
 * Home: the dashboard's entry screen. The why-now band frames the scale of the
 * whole-of-government ICT plan; the area cards below open each screen.
 */

import { phpCompact } from "@/lib/utils";
import { ViewProps } from "./shared";
import { DomainsView } from "./domains";

export function HomeView({ corpus, mode }: ViewProps) {
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
      <DomainsView />
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
