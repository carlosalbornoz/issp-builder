"use client";

/**
 * Project trace (demonstration) — one project followed from the ISSP plan
 * through NEP / GAA / release / procurement / obligation / payment to results.
 * Plan-side data is real corpus data; everything past the NEP comes from the
 * mock COMPASS layer and is labelled as a proposed link.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CircleCheck, CircleX, Landmark } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { DemoNotice } from "@/components/repository/demo-notice";
import { useCorpus } from "@/lib/repository/corpus";
import { cn, php, phpCompact } from "@/lib/utils";

const FUNNEL = { plan: "#7FA3EE", budget: "#3F74E3", release: "#0B4FD9", spend: "#062365" };

const STAGE_PILL_CLS: Record<string, string> = {
  awarded: "border-success-border bg-success-bg text-success",
  bidding: "border-info-border bg-info-bg text-info",
  "pre-bid": "border-warning-border bg-warning-bg text-warning",
  none: "",
};

export function ProjectTrace() {
  const params = useParams<{ slug: string; projectId: string }>();
  const { corpus, error } = useCorpus();

  const agency = corpus?.agencies.find((a) => a.slug === params.slug);
  const project = agency?.projects.find((p) => p.id === params.projectId);
  const compassAgency = corpus?.compass.agencies.find((ca) => ca.slug === params.slug);
  const trace = compassAgency?.traces.find((t) => t.projectId === params.projectId);
  const procurement = corpus?.procurement.rows.find((r) => r.slug === params.slug && r.projectId === params.projectId);

  return (
    <PublicShell active="budget">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Link href={agency ? `/repository/${agency.slug}` : "/budget"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {agency ? agency.name : "Back to the dashboard"}
        </Link>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-danger-bg text-destructive px-4 py-3 text-sm">
            {error} Try reloading the page.
          </div>
        ) : !corpus ? (
          <div className="h-40 rounded-xl bg-muted animate-pulse" aria-busy />
        ) : !agency || !project ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            No traced project found.{" "}
            <Link href="/budget" className="font-medium text-primary hover:underline">
              Back to the dashboard.
            </Link>
          </div>
        ) : (
          <>
            <DemoNotice />

            {/* ── Header ── */}
            <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">
                    Project trace · {agency.acronym} · FY{trace?.fiscalYear ?? agency.cycle.startYear}
                  </p>
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight">{project.title}</h1>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-2xl">{project.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Pill>{project.duration} · {project.implementingUnit}</Pill>
                    <Pill>Total project cost {phpCompact(project.totalCost)} over {project.duration}</Pill>
                    {project.papCode ? (
                      <Pill className="border-primary/25 bg-primary/5 text-primary" mono>PAP {project.papCode} (mock)</Pill>
                    ) : null}
                    {procurement ? (
                      <Pill className={STAGE_PILL_CLS[procurement.stage]}>
                        {`Procurement: ${procurement.note.split("·")[0].trim()}`}
                      </Pill>
                    ) : (
                      <Pill>Procurement: follows the FY{trace?.fiscalYear ?? agency.cycle.startYear} GAA</Pill>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {trace ? (
              <>
                {/* ── Money trail ── */}
                <section className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
                    FY{trace.fiscalYear} money trail · proposed COMPASS link
                  </p>
                  <div className="space-y-2 max-w-3xl">
                    {[
                      { label: "ISSP plan", value: trace.money.plan, color: FUNNEL.plan },
                      { label: "NEP", value: trace.money.nep, color: FUNNEL.budget },
                      { label: "GAA", value: trace.money.gaa, color: FUNNEL.budget },
                      { label: "Allotment", value: trace.money.allotment, color: FUNNEL.release },
                      { label: "Obligated", value: trace.money.obligated, color: FUNNEL.spend },
                      { label: "Disbursed", value: trace.money.disbursed, color: FUNNEL.spend },
                    ].map((row) => (
                      <div key={row.label} className="grid grid-cols-[92px_1fr_118px] gap-2.5 items-center">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <div className="h-4 rounded-sm bg-muted overflow-hidden">
                          {row.value > 0 ? (
                            <div
                              className="h-full rounded-sm"
                              style={{ width: `${Math.max((row.value / trace.money.plan) * 100, 1)}%`, background: row.color }}
                            />
                          ) : (
                            <div className="h-full w-[70%] border border-dashed border-muted-foreground/40 rounded-sm" />
                          )}
                        </div>
                        <span className="text-xs font-medium tabular-nums text-right">
                          {row.value > 0 ? php(row.value) : <span className="text-muted-foreground font-normal">pending</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-foreground leading-relaxed mt-3 max-w-3xl">
                    {trace.money.allotment > 0
                      ? `Fully funded and ${Math.round((trace.money.obligated / trace.money.allotment) * 100)}% obligated. Only ${Math.round(
                          (trace.money.disbursed / trace.money.obligated) * 100
                        )}% is paid, because the contract pays on milestones. The KPI cards below show whether the work is on schedule.`
                      : `At the NEP stage: ${phpCompact(trace.money.nep)} (${Math.round(
                          (trace.money.nep / trace.money.plan) * 100
                        )}% of the ask) is in the FY${trace.fiscalYear} NEP. The GAA, release and obligation bars fill as the budget cycle advances; nothing can be obligated before Congress signs.`}
                  </p>
                </section>

                <div className="grid lg:grid-cols-3 gap-4 items-start">
                  {/* ── Timeline ── */}
                  <section className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5 lg:col-span-2">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-4">
                      From plan to payment to result
                    </p>
                    <ol className="space-y-0">
                      {trace.steps.map((step, i) => (
                        <li key={i} className="grid grid-cols-[28px_1fr] gap-3.5">
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                                step.source.includes("ISSP") || step.source.includes(".issp")
                                  ? "bg-primary text-primary-foreground"
                                  : step.source.includes("PhilGEPS") || step.source.includes("DICT")
                                    ? "bg-[var(--sidebar)] text-white"
                                    : "bg-muted text-foreground"
                              )}
                            >
                              {i + 1}
                            </span>
                            {i < trace.steps.length - 1 ? <span className="w-0.5 flex-1 bg-border min-h-3" /> : null}
                          </div>
                          <div className="pb-5 min-w-0">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                              {step.date} · {step.stage} <span className="normal-case tracking-normal font-medium text-muted-foreground/80">· {step.source}</span>
                            </p>
                            <p className="text-sm font-semibold mt-0.5 leading-snug">{step.title}</p>
                            {step.detail ? <p className="text-xs text-muted-foreground leading-relaxed mt-1">{step.detail}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>

                  {/* ── Side cards ── */}
                  <div className="space-y-4">
                    <section className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
                        {trace.kpiActuals.length > 0 ? "Results against the ISSP targets (Q2)" : "Results promised (targets from the ISSP)"}
                      </p>
                      {trace.kpiActuals.length > 0 ? (
                        <div className="space-y-2.5">
                          {trace.kpiActuals.map((k) => (
                            <div key={k.indicator} className="rounded-lg border px-3 py-2.5">
                              <p className="text-xs text-muted-foreground leading-snug">{k.indicator}</p>
                              <p className="text-base font-bold tabular-nums mt-0.5">
                                {k.actual} <span className="text-xs font-normal text-muted-foreground">/ {k.target}</span>
                              </p>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold mt-1.5",
                                  k.status === "on-track"
                                    ? "bg-success-bg text-success border border-success-border"
                                    : "bg-warning-bg text-warning border border-warning-border"
                                )}
                              >
                                {k.status === "on-track" ? <CircleCheck className="w-3 h-3" /> : <CircleX className="w-3 h-3" />}
                                {k.status === "on-track" ? "On track" : "Behind"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {project.kpis.slice(0, 4).map((k) => (
                            <div key={k.indicator} className="rounded-lg border px-3 py-2.5">
                              <p className="text-xs text-muted-foreground leading-snug">{k.indicator}</p>
                              <p className="text-base font-bold tabular-nums mt-0.5">
                                {k.baseline} <span className="text-xs font-normal text-muted-foreground">→ {k.targets[0]} (Year 1)</span>
                              </p>
                            </div>
                          ))}
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            FY{trace.fiscalYear} has not started, so there are no actuals to report. The trace will
                            carry them as the year advances (proposed ISSP field).
                          </p>
                        </div>
                      )}
                    </section>

                    <section className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5 text-sm space-y-3 leading-relaxed">
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">What each source knows</p>
                      <p><span className="font-semibold text-primary">ISSP</span> · <em>why</em> and <em>what</em>: the outcome it serves, the systems it builds, each line item, and the KPI it promises.</p>
                      <p><span className="font-semibold">COMPASS</span> · <em>how much, when</em>: NEP, GAA, allotment, obligation, disbursement.</p>
                      <p><span className="font-semibold">PhilGEPS</span> · <em>who</em>: bid, award, supplier, contract price.</p>
                      <p><span className="font-semibold">DIME</span> · <em>where it stands</em>: physical progress and site checks.</p>
                    </section>

                    <section className="rounded-xl bg-[var(--sidebar)] text-white p-5">
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-[#B9C8EE] mb-2">The missing piece</p>
                      <p className="text-sm font-semibold leading-relaxed">
                        One key per project, written into the ISSP, makes these four sources one story.
                      </p>
                      <div className="mt-3 space-y-1.5 text-[11px] font-mono">
                        <p>issp.projectId = {project.id}</p>
                        {project.papCode ? <p>uacs.papCode = {project.papCode}</p> : null}
                        <p>philgeps.refNo = [REF-NO.]</p>
                        <p>dime.projectId = [DIME-ID]</p>
                      </div>
                      <Link href="/budget/data-standard" className="inline-block mt-3.5 text-[#FCD116] text-xs font-semibold hover:underline">
                        See the data standard →
                      </Link>
                    </section>
                  </div>
                </div>
              </>
            ) : (
              <section className="rounded-xl ring-1 ring-foreground/10 bg-card p-6">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Plan-side record</p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  No execution trace has been mocked for this project yet; the demonstration trace follows one project
                  end-to-end. Its plan-side facts: {project.totalCost > 0 ? `total project cost ${php(project.totalCost)} across ${project.duration}.` : "no Part IV budget lines yet."}
                </p>
                <Link
                  href="/budget/trace/ncwtr-2026-2028/proj-sikap"
                  className="inline-flex items-center gap-1.5 mt-4 h-9 rounded-md bg-primary text-primary-foreground px-3.5 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Landmark className="w-3.5 h-3.5" /> Open the traced project (Project SIKAP)
                </Link>
              </section>
            )}
          </>
        )}
      </div>
    </PublicShell>
  );
}

function Pill({ children, className, mono }: { children: React.ReactNode; className?: string; mono?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground",
        mono && "font-mono tracking-tight",
        className
      )}
    >
      {children}
    </span>
  );
}
