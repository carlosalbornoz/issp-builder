"use client";

/**
 * AI & compute view: one domain of ten, powered by the proposed AI/compute tag
 * per project. Every amount shown is the tagged projects' Part IV line items
 * read through the same `lines` the rest of the dashboard filters, so the bars,
 * the year shares and the own-build total always describe the active selection;
 * the tag itself is the proposed field, so the whole view locks in current-form
 * mode.
 */

import { Cpu } from "lucide-react";
import type { CorpusAiKind } from "@/lib/repository/corpus-types";
import { BarList, EmptyNote } from "@/components/dataviz/charts";
import { phpCompact } from "@/lib/utils";
import { SCREENS } from "../nav";
import { Panel, ProposedOnly, ViewHeader, ViewProps } from "./shared";

const AI_KIND_META: Record<CorpusAiKind, { label: string; color: string }> = {
  "own-build": { label: "Own GPU cluster", color: "var(--budget-2)" },
  adoption: { label: "Shared platform", color: "var(--budget-3)" },
  education: { label: "Teaching and research", color: "var(--budget-1)" },
};

export function AiView({ corpus, lines, mode }: ViewProps) {
  const ai = corpus.aiLayer;

  // Tagged asks through the active filters: each project's Part IV lines, by year.
  const scoped = ai.projects
    .map((p) => {
      const projectLines = lines.filter((l) => l.slug === p.slug && l.projectId === p.projectId);
      const byYear = new Map<number, number>();
      projectLines.forEach((l) => byYear.set(l.year, (byYear.get(l.year) ?? 0) + l.total));
      return { project: p, byYear, total: projectLines.reduce((s, l) => s + l.total, 0) };
    })
    .filter((x) => x.total > 0);

  const ownBuilds = scoped.filter((x) => x.project.kind === "own-build");
  const ownTotal = ownBuilds.reduce((s, x) => s + x.total, 0);
  const ownAgencies = new Set(ownBuilds.map((x) => x.project.slug)).size;

  const yearShareRows = (() => {
    const totals = new Map<number, number>();
    lines.forEach((l) => totals.set(l.year, (totals.get(l.year) ?? 0) + l.total));
    return [...totals.entries()]
      .sort((x, y) => x[0] - y[0])
      .map(([year, denominator]) => {
        const amount = scoped.reduce((s, x) => s + (x.byYear.get(year) ?? 0), 0);
        return { year, amount, share: denominator ? amount / denominator : 0 };
      })
      .filter((r) => r.amount > 0);
  })();

  const yearSpan = (years: number[]) =>
    years.length > 1 ? `FY${years[0]}–FY${years[years.length - 1]}` : years.length ? `FY${years[0]}` : "";

  return (
    <div className="space-y-6">
      <ViewHeader
        title={SCREENS.ai.label}
        lede={SCREENS.ai.summary}
        insights={[
          ownTotal > 0 ? (
            <>
              <strong>
                {phpCompact(ownTotal)} of the AI request in this selection is for{" "}
                {ownAgencies === 1 ? "one agency's own GPU cluster" : `${ownAgencies} agencies' own GPU clusters`}
              </strong>
              . A shared national compute facility could serve this demand if the decision precedes procurement.
              This is a review question, not a finding: agencies may have binding reasons, such as data-sovereignty
              commitments.
            </>
          ) : null,
          <>
            <strong>
              {scoped.length} tagged AI and compute requests, {ownBuilds.length} of them own-cluster builds
            </strong>
            , measured from the same Part IV line items as every other domain.
          </>,
        ]}
      />

      <ProposedOnly mode={mode} requires="an AI / compute tag per project (proposed field)">
        <Panel
          title="AI and compute requests"
          sub="Tagged projects in scope · the tag is a proposed ISSP\u00A0field"
          hint="Shares are of each fiscal year's total line items in scope. Amounts are the tagged projects' Part IV line items."
          icon={Cpu}
        >
          {scoped.length === 0 ? (
            <EmptyNote>No tagged AI or compute requests in scope.</EmptyNote>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarList
                items={[...scoped]
                  .sort((x, y) => y.total - x.total)
                  .map((x) => ({
                    key: x.project.slug + x.project.projectId,
                    label: `${x.project.acronym} · ${x.project.shortTitle}`,
                    value: x.total,
                    color: AI_KIND_META[x.project.kind].color,
                    sub: `${AI_KIND_META[x.project.kind].label} · ${yearSpan([...x.byYear.keys()].sort((a, b) => a - b))}`,
                    href: `/repository/${x.project.slug}`,
                  }))}
                total={scoped.reduce((s, x) => s + x.total, 0)}
                format={phpCompact}
              />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                  Share of each year&apos;s total request
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {yearShareRows.map((r) => (
                    <span
                      key={r.year}
                      className="inline-flex items-baseline gap-1.5 rounded-md border border-foreground/10 bg-secondary px-2.5 py-1 text-xs"
                    >
                      <span className="font-semibold tabular-nums">FY{r.year}</span>
                      <span className="tabular-nums">{phpCompact(r.amount)}</span>
                      <span className="tabular-nums font-semibold text-primary">{(r.share * 100).toFixed(1)}%</span>
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5 text-xs">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">By kind</p>
                  {(Object.keys(AI_KIND_META) as (keyof typeof AI_KIND_META)[])
                    .map((kind) => ({ kind, total: scoped.filter((x) => x.project.kind === kind).reduce((sum, x) => sum + x.total, 0) }))
                    .filter((r) => r.total > 0)
                    .sort((a, b) => b.total - a.total)
                    .map(({ kind, total }) => (
                      <div key={kind} className="flex items-baseline justify-between gap-3">
                        <span className="inline-flex items-baseline gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0 translate-y-[-1px]" style={{ background: AI_KIND_META[kind].color }} aria-hidden />
                          {AI_KIND_META[kind].label}
                        </span>
                        <span className="tabular-nums font-semibold shrink-0">{phpCompact(total)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </Panel>
      </ProposedOnly>
    </div>
  );
}
