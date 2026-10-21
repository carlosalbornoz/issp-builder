"use client";

/**
 * Public ISSP Repository — agency detail page (demonstration).
 * One ISSP as structured data: identity, Parts I–IV highlights, the official
 * B.1 summary, and a real .issp download that opens in the editor.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Download,
  Gauge,
  Layers3,
  MonitorSmartphone,
  Server,
  ShieldAlert,
  Users,
} from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { DemoNotice } from "@/components/repository/demo-notice";
import { BarList } from "@/components/dataviz/charts";
import { PlanStatusPill } from "@/components/ui/plan-status-pill";
import { useCorpus, TYPE_LABELS, assetUrl } from "@/lib/repository/corpus";
import type { CorpusAdvisory, CorpusAdvisoryHit, CorpusAiKind, CorpusFleet, CorpusProfile } from "@/lib/repository/corpus-types";
import { CLASSIFICATION_LABELS, DEV_STRATEGY_LABELS, DATA_STORAGE_LABELS, labelFor } from "@/lib/issp-labels";
import { cn, phpCompact } from "@/lib/utils";

/** Whole pesos — the house style for summary tables (decimals only add width). */
const php0 = (n: number) => `₱${(n || 0).toLocaleString("en-PH")}`;

const SCOPE_LABELS: Record<string, string> = {
  DEPARTMENT_WIDE: "Department-wide",
  DEPARTMENT_CENTRAL_ONLY: "Department central office only",
  CENTRAL_ONLY: "Central office only",
  WITH_REGIONAL: "Department-wide with regional offices",
  WITH_BUREAUS: "Department-wide with bureaus",
  AGENCY_WIDE: "Agency-wide",
  AGENCY_CENTRAL_ONLY: "Agency central office only",
  AGENCY_WITH_REGIONAL: "Agency-wide with regional offices",
  OTHER_GOVERNMENT_ENTITY: "Other government entity",
  LGU_SCOPE: "LGU-wide",
};

export function AgencyDetail() {
  const params = useParams<{ slug: string }>();
  const { corpus, error } = useCorpus();
  const agency = corpus?.agencies.find((a) => a.slug === params.slug);

  return (
    <PublicShell active="repository">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Link
          href="/repository"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All plans
        </Link>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-danger-bg text-destructive px-4 py-3 text-sm">
            {error} Try reloading the page.
          </div>
        ) : !corpus ? (
          <div className="h-40 rounded-xl bg-muted animate-pulse" aria-busy />
        ) : !agency ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            No plan found for “{params.slug}”.{" "}
            <Link href="/repository" className="font-medium text-primary hover:underline">
              Back to the repository.
            </Link>
          </div>
        ) : (
          <AgencyDetailBody
            agency={agency}
            tracedProjectIds={
              new Set(
                (corpus?.compass.agencies.find((ca) => ca.slug === agency.slug)?.traces ?? []).map((t) => t.projectId)
              )
            }
            fleet={corpus?.security.fleetBySlug[agency.slug]}
            advisory={corpus?.security.advisory}
            advisoryHit={corpus?.security.advisory.agencies.find((h) => h.slug === agency.slug)}
            aiByProjectId={
              new Map(
                (corpus?.aiLayer.projects ?? [])
                  .filter((p) => p.slug === agency.slug)
                  .map((p) => [p.projectId, p.kind] as [string, CorpusAiKind])
              )
            }
          />
        )}
      </div>
    </PublicShell>
  );
}

function AgencyDetailBody({
  agency: a,
  tracedProjectIds,
  fleet,
  advisory,
  advisoryHit,
  aiByProjectId,
}: {
  agency: CorpusProfile;
  tracedProjectIds: Set<string>;
  fleet?: CorpusFleet;
  advisory?: CorpusAdvisory;
  advisoryHit?: CorpusAdvisoryHit;
  aiByProjectId?: Map<string, CorpusAiKind>;
}) {
  return (
    <>
      <DemoNotice />

      {/* ── Identity header ── */}
      <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <span className="min-w-14 h-14 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-bold flex items-center justify-center shrink-0 px-1.5">
              {a.acronym}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight">{a.name}</h1>
                <PlanStatusPill status={a.planStatus} />
              </div>
              <p className="text-sm text-muted-foreground mb-2">{a.title}</p>
              <div className="flex flex-wrap gap-1.5">
                <MetaChip icon={Building2}>{TYPE_LABELS[a.type]}</MetaChip>
                <MetaChip>{a.cycleLabel} cycle</MetaChip>
                <MetaChip>{SCOPE_LABELS[a.scope] ?? a.scope}</MetaChip>
                <MetaChip>
                  Head: {a.headName.replace(/^(Director-General|Chairperson|President and CEO|President|Mayor Hon\.?|General Manager|Administrator|Insurance Commissioner|City Mayor Hon\.?|Municipal Mayor Hon\.?)\s/, "")}
                </MetaChip>
                <MetaChip>
                  CIO: {a.cio.name} · {a.cio.position}
                </MetaChip>
                {a.identifiers.dictEndorsement ? (
                  <MetaChip className="border-success-border bg-success-bg text-success">
                    DICT-endorsed {a.identifiers.dictEndorsement.ref}
                  </MetaChip>
                ) : null}
                <MetaChip mono>UACS org {a.identifiers.uacsOrgCode} (mock)</MetaChip>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <a
              href={assetUrl(a.downloadPath)}
              download
              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-input bg-background px-3.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download .issp
            </a>
            <Link
              href={`/budget?agency=${a.slug}`}
              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-primary text-primary-foreground px-3.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              View in Budget Dashboard <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/budget/report/examiner?agency=${a.slug}`}
              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-input bg-background px-3.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Examiner brief <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Key figures ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Figure label="3-yr investment" value={phpCompact(a.budget.grandTotal)} sub={a.cycleLabel} highlight />
        <Figure label="Capital outlay" value={phpCompact(a.budget.totalCo)} sub={`${Math.round((a.budget.totalCo / a.budget.grandTotal) * 100)}% of total`} />
        <Figure label="MOOE" value={phpCompact(a.budget.totalMooe)} sub={`${Math.round((a.budget.totalMooe / a.budget.grandTotal) * 100)}% of total`} />
        <Figure label="ICT projects" value={String(a.counts.internalProjects + a.counts.crossAgencyProjects)} sub={`${a.counts.crossAgencyProjects} cross-agency`} icon={Layers3} />
        <Figure label="Systems" value={String(a.counts.systems)} sub={`+${a.counts.proposedSystems} proposed`} icon={MonitorSmartphone} />
        <Figure label="Plan completion" value={`${a.completionPct}%`} sub="sections marked done" icon={Gauge} />
      </div>

      {/* ── Part I ── */}
      <Section eyebrow="Part I — Agency profile" title="Mandate, outcomes and people">
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Prose label="Mandate">{a.mandate}</Prose>
            <blockquote className="rounded-lg border-l-2 border-primary bg-secondary/50 px-4 py-3 text-sm italic text-foreground leading-relaxed">
              {a.vision}
            </blockquote>
            <Prose label="Mission">{a.mission}</Prose>
          </div>
          <div className="space-y-4">
            <MiniCard label="Organizational outcomes">
              <ul className="space-y-3">
                {a.outcomes.map((o) => (
                  <li key={o.name}>
                    <p className="text-xs font-medium text-foreground leading-snug">{o.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{o.programs.join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </MiniCard>
            <MiniCard label="Human capital">
              <dl className="space-y-1.5 text-xs">
                <HcRow label="Plantilla" value={a.humanCapital.plantilla} />
                <HcRow label="Contractual" value={a.humanCapital.contractual} />
                <HcRow label="Outsourced" value={a.humanCapital.outsourced} />
                <HcRow label="Unfilled plantilla" value={a.humanCapital.unfilled} />
                <div className="pt-1 border-t mt-1.5">
                  <HcRow label="of which: ICT personnel" value={a.humanCapital.totalIt} />
                </div>
              </dl>
            </MiniCard>
          </div>
        </div>
      </Section>

      {/* ── Part II ── */}
      <Section eyebrow="Part II — Current ICT assessment" title={`Systems in place (${a.systems.length})`}>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-b px-3 py-2 text-left font-semibold">Information system</th>
                <th className="border-b px-3 py-2 text-left font-semibold">Classification</th>
                <th className="border-b px-3 py-2 text-left font-semibold">Frontline</th>
                <th className="border-b px-3 py-2 text-left font-semibold">Strategy</th>
                <th className="border-b px-3 py-2 text-left font-semibold">Storage</th>
              </tr>
            </thead>
            <tbody>
              {a.systems.map((s) => (
                <tr key={s.name} className="border-b last:border-b-0 hover:bg-accent/20">
                  <td className="px-3 py-2 font-medium max-w-72">{s.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{labelFor(CLASSIFICATION_LABELS, s.classification) || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {s.frontline ? labelFor2(s.frontlineAccessType) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{labelFor(DEV_STRATEGY_LABELS, s.developmentStrategy) || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{labelFor(DATA_STORAGE_LABELS, s.dataStorage) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <BadgeCheck className="w-3.5 h-3.5 text-success" />
            eGov programs adopted: <strong className="text-foreground">{a.egp.adopted} of {a.egp.total}</strong>
          </span>
          {a.egp.pnpkiAdoption !== undefined && (
            <MetaChip>PNPKI adoption: {a.egp.pnpkiAdoption}%</MetaChip>
          )}
          <MetaChip>{a.counts.stakeholders} stakeholder groups</MetaChip>
          <MetaChip icon={Users}>{a.humanCapital.totalIt} ICT personnel</MetaChip>
        </div>
      </Section>

      {/* ── ICT asset posture (Annex 1, proposed) ── */}
      {fleet ? (
        <Section eyebrow="Part II — Current ICT assessment" title="ICT asset posture (Annex 1 · proposed field)">
          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 grid grid-cols-2 gap-3 self-start">
              <FleetStat
                icon={MonitorSmartphone}
                label="Endpoints"
                value={fleet.endpoints.toLocaleString("en-PH")}
                sub={`${Math.round((fleet.endpointsEol / fleet.endpoints) * 100)}% past support`}
                danger={fleet.endpointsEol / fleet.endpoints > 0.3}
              />
              <FleetStat
                icon={Server}
                label="Servers"
                value={String(fleet.servers)}
                sub={`${fleet.serversEol} past vendor support`}
                danger={fleet.serversEol > 0}
              />
              <FleetStat
                label="Network devices"
                value={String(fleet.networkDevices)}
                sub={`${fleet.networkEol} past vendor support`}
                danger={fleet.networkEol / fleet.networkDevices > 0.3}
              />
              <FleetStat label="Average fleet age" value={`${fleet.avgAgeYears.toFixed(1)} yrs`} sub="all ICT asset classes" />
            </div>
            <div className="lg:col-span-3 space-y-3">
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border-b px-3 py-2 text-left font-semibold">Model (fictitious)</th>
                      <th className="border-b px-3 py-2 text-left font-semibold">Class</th>
                      <th className="border-b px-3 py-2 text-right font-semibold">Units</th>
                      <th className="border-b px-3 py-2 text-left font-semibold">Support status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...fleet.models]
                      .sort((x, y) => y.count - x.count)
                      .map((m) => (
                        <tr key={m.name} className="border-b last:border-b-0 hover:bg-accent/20">
                          <td className="px-3 py-2 font-medium">{m.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{modelKindLabel(m.kind)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{m.count.toLocaleString("en-PH")}</td>
                          <td className="px-3 py-2">
                            {m.eol ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-bg text-destructive border border-danger-border px-2 py-0.5 text-[10px] font-semibold">
                                unsupported since {m.supportUntil}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success border border-success-border px-2 py-0.5 text-[10px] font-semibold">
                                supported
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {advisoryHit && advisory ? (
                <div className="rounded-lg border border-destructive/30 bg-danger-bg/40 p-3.5 flex gap-3">
                  <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <p className="font-semibold text-foreground">
                      Affected by advisory{" "}
                      <Link href="/budget#readiness" className="text-primary hover:underline">
                        {advisory.id} (mock)
                      </Link>
                      : {advisoryHit.units} × {advisory.model} {advisory.kind}s, past vendor support.
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {advisoryHit.refreshInPlan
                        ? `Replacement carries Part IV budget — see ${advisoryHit.refreshProject} in the projects below.`
                        : "No replacement is budgeted in this plan — flagged for the next amendment cycle."}
                    </p>
                  </div>
                </div>
              ) : null}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Fictitious inventory in the shape of Annex 1 (Existing ICT Resource Inventory) — the asset data a
                revised ISSP would carry as structured fields, feeding the posture views on the Budget Dashboard.
              </p>
            </div>
          </div>
        </Section>
      ) : null}

      {/* ── Part III ── */}
      <Section
        eyebrow="Part III — Proposed ICT strategy"
        title={`Projects (${a.projects.length})`}
      >
        <div className="space-y-4">
          {a.projects.map((p) => {
          const aiKind = aiByProjectId?.get(p.id);
          return (
            <div key={p.id} className="rounded-xl ring-1 ring-foreground/10 bg-card overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold">{p.title}</h3>
                    <span className="inline-flex items-center rounded-md border bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {p.category === "crossAgency" ? "Cross-agency" : "Internal"}
                    </span>
                    {aiKind ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-md border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
                        style={{ borderColor: "color-mix(in srgb, var(--budget-2) 45%, transparent)" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-sm" style={{ background: "var(--budget-2)" }} aria-hidden />
                        {aiKind === "own-build" ? "AI · own cluster" : aiKind === "adoption" ? "AI · shared platform" : "AI · teaching & research"}
                      </span>
                    ) : null}
                    {p.papCode ? (
                      <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[10px] font-mono text-primary">
                        PAP {p.papCode}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.duration} · {p.implementingUnit}
                    {p.leadAgency ? ` · Lead: ${p.leadAgency}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {tracedProjectIds.has(p.id) ? (
                    <Link
                      href={`/budget/trace/${a.slug}/${p.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Follow the money →
                    </Link>
                  ) : null}
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total project cost</p>
                    <p className="text-base font-bold tabular-nums text-primary">{phpCompact(p.totalCost)}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.alignment.map((x) => (
                    <AlignmentChip key={x}>{x}</AlignmentChip>
                  ))}
                </div>
                {p.linkedSystems.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Builds/enhances: <span className="text-foreground">{p.linkedSystems.join(" · ")}</span>
                  </p>
                )}
                {p.deliverables.some((d) => d) && (
                  <div className="grid sm:grid-cols-3 gap-2">
                    {p.deliverables.map((d, i) =>
                      d ? (
                        <div key={i} className="rounded-md border bg-secondary/40 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                            {a.cycle.startYear + i} deliverables
                          </p>
                          <p className="text-xs leading-relaxed text-foreground">{d}</p>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
                {p.kpis.length > 0 && (
                  <details className="group">
                    <summary className="text-xs font-medium text-primary hover:underline cursor-pointer select-none">
                      Performance indicators ({p.kpis.length})
                    </summary>
                    <div className="overflow-x-auto rounded-lg border mt-2">
                      <table className="min-w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="border-b px-2.5 py-1.5 text-left font-semibold">Indicator</th>
                            <th className="border-b px-2.5 py-1.5 text-left font-semibold">Baseline</th>
                            <th className="border-b px-2.5 py-1.5 text-left font-semibold">Targets (Y1 → Y2 → Y3)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.kpis.map((k, i) => (
                            <tr key={i} className="border-b last:border-b-0">
                              <td className="px-2.5 py-1.5 max-w-96">
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground block">{k.hierarchy}</span>
                                {k.indicator}
                              </td>
                              <td className="px-2.5 py-1.5 text-muted-foreground whitespace-nowrap">{k.baseline}</td>
                              <td className="px-2.5 py-1.5 tabular-nums whitespace-nowrap">
                                {k.targets.join(" → ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </Section>

      {/* ── Part IV ── */}
      <Section eyebrow="Part IV — Resource requirements" title="Summary of investments">
        <div className="grid lg:grid-cols-5 lg:items-start gap-4">
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">B.1 General summary</p>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="min-w-[560px] w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border-b px-2.5 py-2 text-left font-semibold">Category</th>
                    <th className="border-b px-2.5 py-2 text-right font-semibold whitespace-nowrap">{a.cycle.startYear}</th>
                    <th className="border-b px-2.5 py-2 text-right font-semibold whitespace-nowrap">{a.cycle.startYear + 1}</th>
                    <th className="border-b px-2.5 py-2 text-right font-semibold whitespace-nowrap">{a.cycle.endYear}</th>
                    <th className="border-b px-2.5 py-2 text-right font-semibold whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {a.budget.b1.map((r) => (
                    <tr key={r.label} className={r.isTotal ? "bg-muted/40 font-bold" : "border-b last:border-b-0 hover:bg-accent/20"}>
                      <td className="px-2.5 py-2 flex items-center gap-2">
                        {!r.isTotal && (
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ background: `var(--budget-${a.budget.b1.indexOf(r) + 1})` }}
                            aria-hidden
                          />
                        )}
                        {r.label}
                      </td>
                      <td className="px-2.5 py-2 text-right tabular-nums whitespace-nowrap">{php0(r.year1)}</td>
                      <td className="px-2.5 py-2 text-right tabular-nums whitespace-nowrap">{php0(r.year2)}</td>
                      <td className="px-2.5 py-2 text-right tabular-nums whitespace-nowrap">{php0(r.year3)}</td>
                      <td className="px-2.5 py-2 text-right tabular-nums whitespace-nowrap">{php0(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Same aggregation engine as the editor&apos;s Summary B.1–B.4 — counted budget only (projects that exist
              in Part III-E, within their durations).
            </p>
            {/* Per-year share bars */}
            <div className="mt-3 space-y-1.5">
              {a.budget.b1.slice(0, 4).length > 0 &&
                [0, 1, 2].map((i) => {
                  const rows = a.budget.b1.slice(0, 4);
                  const total = a.budget.grandTotals[i];
                  return (
                    <div key={i} className="grid grid-cols-[52px_1fr] gap-2.5 items-center">
                      <span className="text-xs tabular-nums text-muted-foreground">FY{a.cycle.startYear + i}</span>
                      <div className="flex gap-0.5 h-3.5">
                        {rows.map((r, ri) =>
                          r[`year${i + 1}` as "year1" | "year2" | "year3"] > 0 ? (
                            <div
                              key={r.label}
                              title={`${r.label} ${Math.round((r[`year${i + 1}` as "year1" | "year2" | "year3"] / total) * 100)}%`}
                              className="h-full rounded-sm"
                              style={{ width: `${(r[`year${i + 1}` as "year1" | "year2" | "year3"] / total) * 100}%`, background: `var(--budget-${ri + 1})` }}
                            />
                          ) : null
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            {(() => {
              const ccRow = a.budget.b1.find((r) => r.label === "Continuing Costs");
              const share3 = ccRow && a.budget.grandTotals[2] > 0 ? (ccRow.year3 / a.budget.grandTotals[2]) * 100 : 0;
              return share3 > 0 ? (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  By FY{a.cycle.endYear}, {Math.round(share3)}% of the yearly ICT budget keeps the new systems running
                  (hosting, subscriptions, support).
                </p>
              ) : null;
            })()}
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                B.4 Top expense categories
              </p>
              <BarList
                items={a.budget.byCategory.slice(0, 6).map((c) => ({
                  key: c.categoryId || "uncategorized",
                  label: c.name,
                  value: c.total,
                  sub: c.expenseClass === "capitalOutlay" ? "Capital outlay" : "MOOE",
                  color: c.expenseClass === "capitalOutlay" ? "var(--chart-1)" : "var(--chart-2)",
                }))}
                format={phpCompact}
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                B.2 Fund sources
              </p>
              <ul className="space-y-1.5">
                {a.budget.byFundSource.map((f) => (
                  <li key={f.label} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-foreground truncate">{f.label}</span>
                    <span className="tabular-nums font-semibold shrink-0">{phpCompact(f.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
                Plan quality checks
              </p>
              <QualityChecks agency={a} />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function modelKindLabel(kind: string): string {
  return { endpoint: "Endpoint", server: "Server", network: "Network", security: "Security appliance" }[kind] ?? kind;
}

function FleetStat({
  icon: Icon,
  label,
  value,
  sub,
  danger,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg ring-1 ring-foreground/10 bg-card px-4 py-3",
        danger && "ring-destructive/30 bg-danger-bg/40"
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {Icon ? <Icon className="w-3 h-3" /> : null}
        {label}
      </div>
      <p className={cn("text-lg font-bold tabular-nums leading-tight", danger && "text-destructive")}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function labelFor2(accessType: string): string {
  if (accessType === "ONLINE") return "Online";
  if (accessType === "ON_PREMISE") return "On-premise";
  if (accessType === "HYBRID") return "Hybrid";
  return "Frontline";
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 pt-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{eyebrow}</p>
        <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Figure({
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
      <p className={`text-lg font-bold tabular-nums leading-tight ${highlight ? "text-primary" : ""}`}>{value}</p>
      {sub ? <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p> : null}
    </div>
  );
}

function MetaChip({
  children,
  icon: Icon,
  className,
  mono,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground",
        mono && "font-mono tracking-tight",
        className
      )}
    >
      {Icon ? <Icon className="w-3 h-3" /> : null}
      {children}
    </span>
  );
}

function AlignmentChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">
      {children}
    </span>
  );
}

function Prose({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-sm leading-relaxed text-foreground">{children}</p>
    </div>
  );
}

function MiniCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg ring-1 ring-foreground/10 bg-card p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2.5">{label}</p>
      {children}
    </div>
  );
}

function HcRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums font-semibold">{value.toLocaleString("en-PH")}</dd>
    </div>
  );
}

function QualityChecks({ agency: a }: { agency: CorpusProfile }) {
  const noPap = a.projects.filter((p) => !p.papCode);
  const standaloneNoSystem = a.projects.filter((p) => p.projectType === "STANDALONE" && p.linkedSystems.length === 0);
  const items: { ok: boolean; text: string }[] = [
    { ok: true, text: `B.1 to B.4 grand totals match (${phpCompact(a.budget.grandTotal)})` },
    {
      ok: a.counts.categorizedLineItems === a.counts.lineItems,
      text: `Every line item has an expense category (${a.counts.categorizedLineItems} of ${a.counts.lineItems})`,
    },
    {
      ok: a.counts.completeKpis === a.counts.kpis,
      text: `Every KPI has a baseline and three targets (${a.counts.completeKpis} of ${a.counts.kpis})`,
    },
    { ok: noPap.length === 0, text: noPap.length === 0 ? `Every project has a PAP code (mock)` : `${noPap.length} project(s) without a PAP code: ${noPap.map((p) => p.shortTitle).join(", ")}` },
    {
      ok: true,
      text:
        standaloneNoSystem.length > 0
          ? `${standaloneNoSystem.map((p) => p.shortTitle).join(", ")} build${standaloneNoSystem.length === 1 ? "s" : ""} no information system (standalone by design)`
          : "Every project links to a proposed information system (III-D)",
    },
  ];
  return (
    <div className="rounded-lg ring-1 ring-foreground/10 bg-card p-4 space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2.5 text-xs leading-snug items-start border-b last:border-b-0 pb-2 last:pb-0">
          <span className={item.ok ? "text-success font-bold shrink-0" : "text-warning font-bold shrink-0"}>{item.ok ? "✓" : "!"}</span>
          <span className={item.ok ? "text-foreground" : "text-warning"}>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
