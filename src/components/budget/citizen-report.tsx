"use client";

/**
 * Citizen one-pager (demonstration) — A4, print-ready, Filipino/English.
 * The waffle and figures are computed live from the corpus (FY2027 shares
 * of the B.1 categories), so the plain-language numbers stay tied to the
 * same math as the dashboard.
 */

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { useCorpus, BUCKETS } from "@/lib/repository/corpus";
import { phpCompact } from "@/lib/utils";

const FY = 2027;

const WAFfle_META = [
  { key: "internalProjects", fil: "Bagong sistema at proyekto", en: "New systems and projects" },
  { key: "crossAgencyProjects", fil: "Proyektong pinagsasaluhan ng mga ahensya", en: "Projects shared by several agencies" },
  { key: "continuingCosts", fil: "Pagpapatakbo: internet, cloud, lisensya", en: "Keeping systems running" },
  { key: "officeProductivity", fil: "Kompyuter at gamit ng kawani", en: "Computers and tools for staff" },
] as const;
// Real KPI rows from the corpus, translated to plain language.
const PROMISES = [
  { tag: "Coastal warnings · NCRA", title: "Time for a warning to reach barangays", value: "2h 40m → 15 min", en: "by 2029, through the AWARE platform" },
  { tag: "Food safety · NFTC", title: "Time to trace a food safety incident", value: "9 days → 24 hrs", en: "by 2029, through the National Traceability Registry" },
  { tag: "Municipal · San Prospero", title: "Time per transaction, including travel", value: "3.5 hrs → 30 min", en: "by 2029, through the Digital Frontline" },
] as const;

export function CitizenReport() {
  const { corpus, error } = useCorpus();

  const shares = (() => {
    if (!corpus) return null;
    const yearValue = (row: { year1: number; year2: number; year3: number }, i: number) =>
      i === 0 ? row.year1 : i === 1 ? row.year2 : row.year3;
    const totals = BUCKETS.map((b) => {
      const total = corpus.agencies.reduce((s, a) => {
        const i = FY - a.cycle.startYear;
        if (i < 0 || i > 2) return s;
        const row = a.budget.b1.find((x) => x.label === b.label);
        return s + (row ? yearValue(row, i) : 0);
      }, 0);
      return { ...b, total };
    });
    const grand = totals.reduce((s, t) => s + t.total, 0);
    return { totals, grand };
  })();

  const squares = shares
    ? WAFfle_META.map((meta) => {
        const total = shares.totals.find((t) => t.key === meta.key)?.total ?? 0;
        return { ...meta, count: shares.grand ? Math.round((total / shares.grand) * 100) : 0, color: `var(--budget-${BUCKETS.findIndex((b) => b.key === meta.key) + 1})`, total };
      })
    : [];

  return (
    <PublicShell active="budget">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <Link href="/budget" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Budget Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary text-primary-foreground px-3.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-danger-bg text-destructive px-4 py-3 text-sm no-print">{error}</div>
        ) : !corpus || !shares ? (
          <div className="h-[70vh] rounded-xl bg-muted animate-pulse" aria-busy />
        ) : (
          <article className="report-page" lang="fil">
            <style>{`@media print { .no-print { display: none !important; } .report-page { box-shadow: none; margin: 0; width: 100%; max-width: none; } } @page { size: A4; margin: 12mm; }`}</style>

            <header className="flex justify-between items-center border-b-2 border-[var(--sidebar)] pb-2">
              <span className="report-eyebrow text-[var(--sidebar)]">Para sa mamamayan · For citizens · FY{FY}</span>
              <span className="report-eyebrow text-destructive" lang="en">Illustrative · fictitious data</span>
            </header>

            <div>
              <h1 className="text-[30px] font-extrabold leading-[1.12]" style={{ textWrap: "balance" }}>
                Saan napupunta ang pondo para sa digital na serbisyo?
              </h1>
              <p lang="en" className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
                Where does the money for digital government services go? A plain guide to the FY{FY} ICT plans of 12
                sample agencies.
              </p>
            </div>

            {/* Waffle */}
            <section className="flex gap-6 items-start bg-muted/50 rounded-lg p-4">
              <div className="shrink-0">
                <div className="grid grid-cols-10 gap-[3px] w-[230px]" role="img" aria-label={squares.map((s) => `${s.en}: ${s.count} of every 100 pesos`).join(", ")}>
                  {squares.flatMap((s) =>
                    Array.from({ length: s.count }).map((_, i) => (
                      <span key={s.key + i} className="aspect-square rounded-[2px] block" style={{ background: s.color }} />
                    ))
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">1 square = ₱1 out of every ₱100</p>
              </div>
              <div className="flex-1 min-w-0 space-y-2.5">
                <div>
                  <p className="report-eyebrow">Planong gastos sa FY{FY}</p>
                  <p className="text-[32px] font-extrabold tabular-nums leading-tight">{phpCompact(shares.grand)}</p>
                  <p lang="en" className="text-[10px] text-muted-foreground">summed from 12 structured ISSPs (demonstration corpus)</p>
                </div>
                <p className="font-bold text-[13px]">Sa bawat ₱100 · Out of every ₱100:</p>
                {squares.map((s) => (
                  <div key={s.key} className="grid grid-cols-[12px_52px_1fr] gap-2 items-baseline text-[12px] leading-snug">
                    <span className="w-3 h-3 rounded-[2px]" style={{ background: s.color }} />
                    <b className="text-[15px] tabular-nums">₱{s.count}</b>
                    <span>
                      <b>{s.fil}</b>
                      <br />
                      <span lang="en" className="text-muted-foreground">{s.en}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Promises */}
            <section>
              <h2 className="text-[15px] font-extrabold mb-1">Mga pagbabagong ipinangako · What the plans promise</h2>
              <p lang="en" className="text-[10px] text-muted-foreground mb-2.5">
                Every project in an ISSP must state a starting point and a target (Part III-F). These are three of them.
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {PROMISES.map((p) => (
                  <div key={p.tag} className="rounded-md border px-3 py-2.5 flex flex-col gap-1">
                    <span className="report-eyebrow">{p.tag}</span>
                    <b className="text-[12px] leading-snug">{p.title}</b>
                    <span className="text-[19px] font-extrabold tabular-nums">{p.value}</span>
                    <span lang="en" className="text-[10px] text-muted-foreground leading-snug">{p.en}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* How to follow */}
            <section>
              <h2 className="text-[15px] font-extrabold mb-2.5">Paano sumubaybay · How to follow the money</h2>
              <div className="grid grid-cols-3 gap-3.5 text-[12px] leading-snug">
                {[
                  ["Tingnan ang plano.", "Read each agency's ISSP — projects, costs and targets — in the public ISSP repository."],
                  ["Tingnan ang gastos.", "See budgets, releases and spending on DBM COMPASS: compass.dbm.gov.ph"],
                  ["Mag-ulat.", "Report a delayed or poor project through the eGovPH app."],
                ].map(([fil, en], i) => (
                  <div key={fil} className="grid grid-cols-[24px_1fr] gap-2.5">
                    <b className="w-6 h-6 rounded-full bg-[var(--sidebar)] text-white flex items-center justify-center text-[11px]">{i + 1}</b>
                    <span>
                      <b>{fil}</b> <span lang="en">{en}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-auto rounded-lg bg-[var(--sidebar)] text-white px-4 py-3.5 text-[12px] leading-relaxed">
              <b className="text-[13px]">Bakit mahalaga ito?</b>{" "}
              <span lang="en">When plans are open data, anyone can check that the money buys what the agency promised — and that the promised service arrives.</span>
            </section>

            <footer className="border-t pt-2 flex justify-between gap-4 text-[9px] text-muted-foreground" lang="en">
              <span>Sample only. Agencies and figures are fictitious. Shares are from Part IV of each plan (B.1 General Summary). COMPASS is a proposed link.</span>
              <span className="whitespace-nowrap">ISSP Builder · BetterGovPH</span>
            </footer>
          </article>
        )}
      </div>
    </PublicShell>
  );
}
