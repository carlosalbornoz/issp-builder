"use client";

/**
 * Money & execution view: the follow-the-peso story. Plan-side figures are real
 * Part IV facts; everything past the NEP comes from the mock COMPASS layer and
 * is labelled as a proposed link. Migrated intact from the pre-navigation
 * dashboard's lifecycle section, so the locks and tables keep their shape.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CompassAgency, CompassYearRecord, CorpusProcurementRow, CorpusProcurementStage, CorpusProfile } from "@/lib/repository/corpus-types";
import { cn, phpCompact } from "@/lib/utils";
import { CycleTile, FUNNEL, InsightBox, ProposedOnly, RatePill, StageTile, ViewHeader, ViewProps, pct, pluralProjects } from "./shared";

const STAGES = [
  { n: "1", label: "Plan", system: "ISSP", detail: "3-year plan, DICT-endorsed. Projects, line items, KPIs.", source: ".issp file", ours: true },
  { n: "2", label: "Propose", system: "NEP", detail: "What the Executive asks Congress for.", source: "COMPASS", ours: false },
  { n: "3", label: "Authorize", system: "GAA", detail: "What Congress approves.", source: "COMPASS", ours: false },
  { n: "4", label: "Release", system: "Allotment", detail: "SARO / comprehensive release.", source: "COMPASS · BTMS", ours: false },
  { n: "5", label: "Commit", system: "Obligation", detail: "Contracts and purchase orders.", source: "COMPASS · PhilGEPS", ours: false },
  { n: "6", label: "Pay", system: "Disbursement", detail: "NCA, checks, ADA.", source: "COMPASS · IFMIS", ours: false },
  { n: "7", label: "Deliver", system: "Results", detail: "KPI actuals vs ISSP targets.", source: "ISSP KPIs · DIME", ours: true },
] as const;

export function MoneyView({ corpus, profiles, mode }: ViewProps) {
  const slugs = new Set(profiles.map((p) => p.slug));
  const gaa = corpus.compass.agencies.filter((ca) => ca.route === "GAA" && slugs.has(ca.slug));
  const sumCompass = (year: number, field: "plan" | "nep" | "gaa" | "allotment" | "obligated" | "disbursed") =>
    gaa.reduce((s, ca) => s + (ca.years.find((y) => y.year === year)?.[field] ?? 0), 0);

  return (
    <div className="space-y-6">
      <ViewHeader
        eyebrow="Budget cycle · ISSP joined with COMPASS (proposed link)"
        title="Follow every peso, starting from the plan"
        lede="The ISSP is the step before the NEP: the plan, the reason and the promised result. COMPASS follows the money from appropriation to disbursement; one project code lines them up."
      />

      <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Where each fiscal year stands · mock COMPASS layer · GAA agencies</p>
        <div className="grid grid-cols-2 gap-2.5">
          <CycleTile year="FY2025" label="closed" value={pct(sumCompass(2025, "obligated"), sumCompass(2025, "allotment"))} sub="of ICT allotments obligated" />
          <CycleTile year="FY2026" label="executing" value={pct(sumCompass(2026, "obligated"), sumCompass(2026, "allotment"))} sub="obligated as of Q2 (30 Jun)" />
          <CycleTile year="FY2027" label="NEP in Congress" value={pct(sumCompass(2027, "nep"), sumCompass(2027, "plan"))} sub="of ISSP ask is in the NEP" />
          <CycleTile year="FY2028" label="Budget Call" value={phpCompact(sumCompass(2028, "plan"))} sub="already planned in ISSPs" />
        </div>
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
            <p className="text-[11px] text-muted-foreground leading-snug mt-1 hidden lg:block min-h-[42px]">{s.detail}</p>
            <p className={cn("text-[10px] font-medium mt-1.5", s.ours ? "text-primary" : "text-muted-foreground")}>{s.source}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-end">
        <Link
          href="/budget/trace/ncwtr-2026-2028/proj-sikap"
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--sidebar)] text-white px-3.5 h-9 text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto"
        >
          Follow one project end-to-end <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Per-FY funnels + absorptive capacity + procurement: every peso past the
          plan comes from the mock COMPASS layer, so the whole execution half
          locks in current-form mode. */}
      <ProposedOnly mode={mode} requires="UACS join keys + a COMPASS execution feed (proposed)">
        <FunnelPanels gaa={gaa} />
        <AbsorptiveTable gaa={gaa} profiles={profiles} />
        <ProcurementPulse rows={corpus.procurement.rows.filter((r) => slugs.has(r.slug))} />
      </ProposedOnly>
    </div>
  );
}

interface FunnelRow {
  label: string;
  value: number | null;
  color: string;
  note?: string;
}

function FunnelPanels({ gaa }: { gaa: CompassAgency[] }) {
  const sum = (year: number, field: "plan" | "nep" | "gaa" | "allotment" | "obligated" | "disbursed") =>
    gaa.reduce((s, ca) => s + (ca.years.find((y) => y.year === year)?.[field] ?? 0), 0);

  const funnelRows = (year: number, stage: CompassYearRecord["stage"]) => {
    const rec = { plan: sum(year, "plan"), nep: sum(year, "nep"), gaa: sum(year, "gaa"), allotment: sum(year, "allotment"), obligated: sum(year, "obligated"), disbursed: sum(year, "disbursed") };
    const rows: FunnelRow[] = [
      { label: "ISSP plan", value: rec.plan, color: FUNNEL.plan },
      { label: "NEP", value: rec.nep || null, color: FUNNEL.budget },
      { label: "GAA", value: rec.gaa || null, color: FUNNEL.budget },
      { label: "Allotment", value: rec.allotment || null, color: FUNNEL.release },
      { label: "Obligated", value: rec.obligated || null, color: FUNNEL.spend, note: stage === "executing" ? "as of Q2" : undefined },
      { label: "Disbursed", value: rec.disbursed || null, color: FUNNEL.spend },
    ];
    return { rows, max: Math.max(rec.plan, rec.nep, 1), rec };
  };

  const f25 = funnelRows(2025, "closed");
  const f26 = funnelRows(2026, "executing");
  const f27 = funnelRows(2027, "nep");

  const nepShare27 = f27.rec.plan ? (f27.rec.nep ?? 0) / f27.rec.plan : 0;
  const unobligated25 = f25.rec.allotment - f25.rec.obligated;

  return (
    <>
      <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold">Each fiscal year sits at a different stage</h3>
          <p className="text-xs text-muted-foreground">GAA agencies ({gaa.length} of the selection)</p>
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
            <strong>{phpCompact(unobligated25)} of FY2025 ICT allotments was never obligated.</strong> Money that cannot
            move until procurement does; see the pulse below for where FY2026 stands.
          </InsightBox>
          <InsightBox>
            <strong>One project code lines all seven stages up.</strong> In the SIKAP trace below, the same ID
            carries from the .issp file into the NEP, the GAA, procurement and payment; without it, each stage
            is a separate spreadsheet.
          </InsightBox>
        </div>
      </div>
    </>
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
  f: { rows: FunnelRow[]; max: number; rec: { plan: number; nep: number; gaa: number; allotment: number; obligated: number; disbursed: number } };
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
                {row.value !== null ? phpCompact(row.value) : <span className="text-muted-foreground">{title === "FY2027" ? "pending" : "–"}</span>}
              </span>
            </div>
          </div>
        ))}
      </div>
      {title === "FY2026" ? <p className="text-[10px] text-muted-foreground mt-2">Obligation and disbursement as of 30 Jun 2026.</p> : null}
    </div>
  );
}

function AbsorptiveTable({ gaa, profiles }: { gaa: CompassAgency[]; profiles: CorpusProfile[] }) {
  const absorptive = absorptiveRows(gaa, profiles);
  const steepest = absorptive.filter((x) => x.ratio !== null).sort((x, y) => (y.ratio ?? 0) - (x.ratio ?? 0))[0];
  if (absorptive.length === 0) return null;
  return (
    <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Absorptive capacity · FY2025 execution vs FY2027 ask</p>
      <h3 className="text-sm font-semibold mt-1 mb-3">Can each agency spend what it asks for?</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agency</th>
              <th scope="col" className="border-b px-3 py-2 text-right font-semibold">FY2025 GAA</th>
              <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Allotment</th>
              <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Obligated</th>
              <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Obligation rate</th>
              <th scope="col" className="border-b px-3 py-2 text-right font-semibold">FY2027 ask</th>
              <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Ask ÷ obligations</th>
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
                    <span className="text-muted-foreground hidden xl:inline"> · {p.name}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{phpCompact(y25.gaa!)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{phpCompact(y25.allotment!)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{phpCompact(y25.obligated!)}</td>
                  <td className="px-3 py-2">
                    <RatePill rate={rate} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{ask27 ? phpCompact(ask27) : "–"}</td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-semibold", ratio && ratio > 2 ? "text-destructive" : "")}>
                    {ratio ? `${ratio.toFixed(1)}×` : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
        Rate bands: On track ≥ 85% · Watch 70–84% · Low &lt; 70%.{" "}
        {steepest
          ? `Steepest step: ${steepest.profile.acronym} asks ${steepest.ratio!.toFixed(1)}× its FY2025 obligations for FY2027, after obligating only ${Math.round(
              (steepest.y25.obligated! / steepest.y25.allotment!) * 100
            )}% of that year's allotment.`
          : "Every GAA agency's FY2027 ask sits below its FY2025 obligations."}{" "}
        An en dash means the agency&apos;s plan years do not cover that column: NFTC, VMSC and CCS plans start in
        FY2028, so they carry no FY2027 ask. Agencies with no FY2025 execution record (NCWTR&apos;s first ISSP starts in
        FY2026) have no row in this table at all. Execution figures are illustrative values in the shape of COMPASS data.
        GOCC and LGU plans are outside the GAA; their execution comes from their own budget systems.
      </p>
    </div>
  );
}

/** GAA agencies with an FY2025 record, joined to their FY2027 ask. */
function absorptiveRows(gaa: CompassAgency[], profiles: CorpusProfile[]) {
  return gaa
    .map((ca) => {
      const y25 = ca.years.find((y) => y.year === 2025);
      const profile = profiles.find((p) => p.slug === ca.slug);
      if (!y25?.obligated || !y25.gaa || !profile) return null;
      const i = 2027 - profile.cycle.startYear;
      const ask27 = i >= 0 && i < 3 ? profile.budget.grandTotals[i] : null;
      return { profile, y25, ask27, ratio: ask27 ? ask27 / y25.obligated : null };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
}

const STAGE_META: Record<CorpusProcurementStage, { label: string; cls: string }> = {
  awarded: { label: "Awarded", cls: "bg-success-bg text-success border border-success-border" },
  bidding: { label: "Bidding", cls: "bg-info-bg text-info border border-info-border" },
  "pre-bid": { label: "Pre-bid", cls: "bg-warning-bg text-warning border border-warning-border" },
  none: { label: "Not started", cls: "bg-muted text-muted-foreground border border-foreground/15" },
};

function ProcurementPulse({ rows }: { rows: CorpusProcurementRow[] }) {
  if (rows.length === 0) return null;
  const sumOf = (stages: CorpusProcurementStage[]) =>
    rows.filter((r) => stages.includes(r.stage)).reduce((s, r) => s + r.amount, 0);
  const countOf = (stages: CorpusProcurementStage[]) => rows.filter((r) => stages.includes(r.stage)).length;
  const awarded = sumOf(["awarded"]);
  const earlier = sumOf(["bidding", "pre-bid", "none"]);

  return (
    <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        Procurement pulse · FY2026 · proposed PhilGEPS status
      </p>
      <h3 className="text-sm font-semibold mt-1 mb-3">Funded work: has procurement started?</h3>
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <StageTile label="Contract awarded" value={phpCompact(awarded)} sub={pluralProjects(countOf(["awarded"]))} />
        <StageTile label="In bidding" value={phpCompact(sumOf(["bidding"]))} sub={pluralProjects(countOf(["bidding"]))} />
        <StageTile label="Pre-bid or earlier" value={phpCompact(sumOf(["pre-bid", "none"]))} sub={pluralProjects(countOf(["pre-bid", "none"]))} />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th scope="col" className="border-b px-2 sm:px-3 py-2 text-left font-semibold">Agency</th>
              <th scope="col" className="border-b px-2 sm:px-3 py-2 text-left font-semibold">Project</th>
              <th scope="col" className="border-b px-2 sm:px-3 py-2 text-right font-semibold">FY2026</th>
              <th scope="col" className="border-b px-2 sm:px-3 py-2 text-left font-semibold">Stage</th>
              <th scope="col" className="border-b px-2 sm:px-3 py-2 text-left font-semibold hidden lg:table-cell">Where it stands</th>
            </tr>
          </thead>
          <tbody>
            {[...rows]
              .sort((x, y) => y.amount - x.amount)
              .map((r) => (
                <tr key={r.slug + r.projectId} className="border-b last:border-b-0 hover:bg-accent/20 align-top">
                  <td className="px-2 sm:px-3 py-2">
                    <Link href={`/repository/${r.slug}`} className="font-medium hover:underline">
                      {r.acronym}
                    </Link>
                  </td>
                  <td className="px-2 sm:px-3 py-2 max-w-64">{r.shortTitle}</td>
                  <td className="px-2 sm:px-3 py-2 text-right tabular-nums whitespace-nowrap">{phpCompact(r.amount)}</td>
                  <td className="px-2 sm:px-3 py-2">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", STAGE_META[r.stage].cls)}>
                      {STAGE_META[r.stage].label}
                    </span>
                  </td>
                  <td className="px-2 sm:px-3 py-2 text-muted-foreground text-xs whitespace-nowrap hidden lg:table-cell">{r.note}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
        Q3 2026 view of the three plans covering FY2026. {phpCompact(awarded)} has a contract behind it;{" "}
        {phpCompact(earlier)} is still short of one: money that cannot move until procurement does. Status in the
        shape of PhilGEPS data an agency-side update loop would feed.
      </p>
    </div>
  );
}
