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
import { BarList } from "@/components/dataviz/charts";
import { phpCompact } from "@/lib/utils";
import { Panel, ProposedOnly, ViewHeader, ViewProps } from "./shared";

const AI_KIND_META: Record<CorpusAiKind, { label: string; color: string }> = {
  "own-build": { label: "Own GPU cluster", color: "var(--budget-2)" },
  adoption: { label: "Shared platform", color: "var(--budget-3)" },
  education: { label: "Teaching & research", color: "var(--budget-1)" },
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
        eyebrow="ICT domain · 6 of 10"
        title="AI and compute in the plans"
        lede="The tag that lights this view up is one checkbox per project, a proposed ISSP field. Amounts shown are the projects' real Part IV line items."
        insights={[
          ownTotal > 0 ? (
            <>
              <strong>
                {phpCompact(ownTotal)} of the AI ask in this selection is{" "}
                {ownAgencies === 1 ? "one agency's own GPU cluster" : `${ownAgencies} agencies' own GPU clusters`}
              </strong>
              . A shared national compute facility could serve them; decide together before the hardware is bought,
              not after. A review question, not a finding: agencies can have binding reasons, such as
              data-sovereignty commitments over commuter or sponsor data.
            </>
          ) : null,
          <>
            <strong>
              AI is {scoped.length} tagged asks ({ownBuilds.length} own-cluster builds) against the whole ICT estate
            </strong>
            : one domain of ten on this dashboard, sized by the same line items as everything else.
          </>,
        ]}
      />

      <ProposedOnly mode={mode} requires="an AI / compute tag per project (proposed field)">
        <Panel
          title="AI and compute asks"
          sub="Tagged projects through the active filters · the tag itself is a proposed ISSP field"
          hint="Shares are of that fiscal year's total line items across the selection. Amounts are the tagged projects' real Part IV line items."
          icon={Cpu}
        >
          {scoped.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tagged AI or compute asks in this selection.</p>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
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
                  Share of each year&apos;s total ask
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
              </div>
            </div>
          )}
        </Panel>
      </ProposedOnly>
    </div>
  );
}
