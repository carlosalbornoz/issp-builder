"use client";

/**
 * Money & execution view: the follow-the-peso story. Plan-side figures are real
 * Part IV facts; everything past the NEP comes from the mock COMPASS layer and
 * is labelled as a proposed link. Migrated intact from the pre-navigation
 * dashboard's lifecycle section, so the locks and tables keep their shape.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EmptyNote } from "@/components/dataviz/charts";
import type { CompassAgency, CompassYearRecord, CorpusProcurementRow, CorpusProcurementStage } from "@/lib/repository/corpus-types";
import { cn, php, phpCompact } from "@/lib/utils";
import { SCREENS, withScope } from "../nav";
import { CycleTile, FUNNEL, ProposedOnly, StageTile, ViewHeader, ViewProps, pct, pluralProjects } from "./shared";

const STAGES = [
  { n: "1", label: "Plan", system: "ISSP", detail: "3-year plan, DICT‑endorsed. Projects, line items, KPIs.", source: ".issp file", ours: true },
  { n: "2", label: "Propose", system: "NEP", detail: "Executive budget proposal to Congress.", source: "COMPASS", ours: false },
  { n: "3", label: "Authorize", system: "GAA", detail: "Appropriation approved by Congress.", source: "COMPASS", ours: false },
  { n: "4", label: "Release", system: "Allotment", detail: "SARO / comprehensive release.", source: "COMPASS · BTMS", ours: false },
  { n: "5", label: "Commit", system: "Obligation", detail: "Contracts and purchase orders.", source: "COMPASS · PhilGEPS", ours: false },
  { n: "6", label: "Pay", system: "Disbursement", detail: "NCA, checks, ADA.", source: "COMPASS · IFMIS", ours: false },
  { n: "7", label: "Deliver", system: "Results", detail: "KPI actuals against ISSP targets.", source: "ISSP KPIs · DIME", ours: true },
] as const;

export function MoneyView({ corpus, profiles, mode, params }: ViewProps & { params: URLSearchParams }) {
  const slugs = new Set(profiles.map((p) => p.slug));
  const gaa = corpus.compass.agencies.filter((ca) => ca.route === "GAA" && slugs.has(ca.slug));
  const sumCompass = (year: number, field: "plan" | "nep" | "gaa" | "allotment" | "obligated" | "disbursed") =>
    gaa.reduce((s, ca) => s + (ca.years.find((y) => y.year === year)?.[field] ?? 0), 0);

  return (
    <div className="space-y-6">
      <ViewHeader
        title={SCREENS.money.label}
        lede={`${SCREENS.money.summary} Execution figures use a mock COMPASS layer (proposed link).`}
        insights={[
          sumCompass(2027, "plan") > 0 ? (
            <>
              <strong>
                The FY2027 NEP covers {pct(sumCompass(2027, "nep"), sumCompass(2027, "plan"))} of the ISSP request
              </strong>
              . The remainder is planned ICT work without funding, which no single report lists.
            </>
          ) : null,
          sumCompass(2025, "allotment") > 0 ? (
            <>
              <strong>
                {phpCompact(sumCompass(2025, "allotment") - sumCompass(2025, "obligated"))} of FY2025 ICT allotments
                was not obligated
              </strong>
              . These funds remain unused until procurement proceeds.
            </>
          ) : null,
          <>
            <strong>One project code links all seven stages.</strong> In the SIKAP trace, the same identifier
            carries from the .issp file into the NEP, the GAA, procurement and payment. Without it, each stage is a
            separate record.
          </>,
        ]}
      />

      {/* Cycle status tiles read the mock COMPASS layer, so they lock with the
          rest of the execution half in current-form mode. */}
      <ProposedOnly mode={mode} requires="UACS join keys + a COMPASS execution feed (proposed)">
        <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Fiscal year status · mock COMPASS layer · GAA agencies</p>
          <div className="grid grid-cols-2 gap-2.5">
            <CycleTile year="FY2025" label="closed" value={pct(sumCompass(2025, "obligated"), sumCompass(2025, "allotment"))} sub="of ICT allotments obligated" />
            <CycleTile year="FY2026" label="executing" value={pct(sumCompass(2026, "obligated"), sumCompass(2026, "allotment"))} sub="obligated as of Q2 (30 Jun)" />
            <CycleTile year="FY2027" label="NEP in Congress" value={pct(sumCompass(2027, "nep"), sumCompass(2027, "plan"))} sub="of the ISSP request in the NEP" />
            <CycleTile year="FY2028" label="Budget Call" value={phpCompact(sumCompass(2028, "plan"))} sub="planned in ISSPs" />
          </div>
        </div>
      </ProposedOnly>

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
          href={withScope("/budget/trace/ncwtr-2026-2028/proj-sikap", params)}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-band text-band-foreground px-3.5 h-9 coarse:h-11 text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          View a project trace <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>

      {/* Per-FY funnels + procurement: every peso past the
          plan comes from the mock COMPASS layer, so the whole execution half
          locks in current-form mode. */}
      {gaa.length === 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
          <EmptyNote className="text-sm leading-relaxed">No GAA agencies in scope. GOCC and LGU budgets do not pass through the GAA.</EmptyNote>
        </div>
      ) : (
        <ProposedOnly mode={mode} requires="UACS join keys + a COMPASS execution feed (proposed)">
          <FunnelPanels gaa={gaa} />
          <ProcurementPulse rows={corpus.procurement.rows.filter((r) => slugs.has(r.slug))} />
        </ProposedOnly>
      )}
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
    return { rows, max: Math.max(rec.plan, rec.nep, rec.gaa, rec.allotment, rec.obligated, rec.disbursed, 1), rec };
  };

  const f25 = funnelRows(2025, "closed");
  const f26 = funnelRows(2026, "executing");
  const f27 = funnelRows(2027, "nep");
  // One shared scale across the three years, so equal amounts draw equal bars
  // instead of each column maxing its own year.
  const sharedMax = Math.max(f25.max, f26.max, f27.max);


  return (
    <>
      <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold">Budget stage by fiscal year</h3>
          <p className="text-xs text-muted-foreground">GAA agencies in scope: {gaa.length}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FunnelPanel title="FY2025" pill="Closed" pillCls="bg-success-bg text-success border border-success-border" f={{ ...f25, max: sharedMax }} />
          <FunnelPanel title="FY2026" pill="Executing · Q2" pillCls="bg-warning-bg text-warning border border-warning-border" f={{ ...f26, max: sharedMax }} />
          <FunnelPanel title="FY2027" pill="NEP in Congress" pillCls="bg-info-bg text-info border border-info-border" f={{ ...f27, max: sharedMax }} />
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
        FY2026 · proposed PhilGEPS link
      </p>
      <h3 className="text-sm font-semibold mt-1 mb-3">Procurement status of funded projects</h3>
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <StageTile label="Contract awarded" value={phpCompact(awarded)} sub={pluralProjects(countOf(["awarded"]))} />
        <StageTile label="In bidding" value={phpCompact(sumOf(["bidding"]))} sub={pluralProjects(countOf(["bidding"]))} />
        <StageTile label="Pre-bid or earlier" value={phpCompact(sumOf(["pre-bid", "none"]))} sub={pluralProjects(countOf(["pre-bid", "none"]))} />
      </div>
      <div className="overflow-x-auto scroll-x-fade rounded-lg border">
        <table className="min-w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th scope="col" className="border-b px-2 sm:px-3 py-2 text-left font-semibold">Agency</th>
              <th scope="col" className="border-b px-2 sm:px-3 py-2 text-left font-semibold">Project</th>
              <th scope="col" className="border-b px-2 sm:px-3 py-2 text-right font-semibold">FY2026</th>
              <th scope="col" className="border-b px-2 sm:px-3 py-2 text-left font-semibold">Stage</th>
              <th scope="col" className="border-b px-2 sm:px-3 py-2 text-left font-semibold hidden lg:table-cell">Status note</th>
            </tr>
          </thead>
          <tbody>
            {[...rows]
              .sort((x, y) => y.amount - x.amount)
              .map((r) => (
                <tr key={r.slug + r.projectId} className="border-b last:border-b-0 hover:bg-accent/20 align-top">
                  <td className="px-2 sm:px-3 py-2">
                    <Link href={`/repository/${r.slug}`} className="font-medium hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
                      {r.acronym}
                    </Link>
                  </td>
                  <td className="px-2 sm:px-3 py-2 max-w-64">{r.shortTitle}</td>
                  <td className="px-2 sm:px-3 py-2 text-right tabular-nums whitespace-nowrap" title={php(r.amount)}>
                    {phpCompact(r.amount)}
                  </td>
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
      <p className="text-[11px] text-muted-foreground mt-2">
        As of Q3 2026 · <strong className="text-foreground tabular-nums">{phpCompact(awarded)}</strong> awarded ·{" "}
        <strong className="text-foreground tabular-nums">{phpCompact(earlier)}</strong> pre-contract · illustrative
        values in PhilGEPS format
      </p>
    </div>
  );
}
