"use client";

/**
 * AI & compute view: one domain of ten, powered by the proposed AI/compute tag
 * per project. Amounts are the projects' real Part IV line items; the tag
 * itself is the proposed field, so the whole view locks in current-form mode.
 */

import { Cpu } from "lucide-react";
import type { CorpusAiKind } from "@/lib/repository/corpus-types";
import { BarList } from "@/components/dataviz/charts";
import { phpCompact } from "@/lib/utils";
import { InsightBox, Panel, ProposedOnly, ViewHeader, ViewProps } from "./shared";

const AI_KIND_META: Record<CorpusAiKind, { label: string; color: string }> = {
  "own-build": { label: "Own GPU cluster", color: "var(--budget-2)" },
  adoption: { label: "Shared platform", color: "var(--budget-3)" },
  education: { label: "Teaching & research", color: "var(--budget-1)" },
};

export function AiView({ corpus, mode }: ViewProps) {
  const ai = corpus.aiLayer;
  const ownBuilds = ai.projects.filter((p) => p.kind === "own-build");
  const yearSpan = (years: number[]) =>
    years.length > 1 ? `FY${years[0]}–FY${years[years.length - 1]}` : years.length ? `FY${years[0]}` : "";
  const slugs = new Set(corpus.agencies.map((a) => a.slug));
  const relevant = ai.projects.filter((p) => slugs.has(p.slug));

  return (
    <div className="space-y-6">
      <ViewHeader
        eyebrow="ICT domain · 6 of 10"
        title="AI and compute in the plans"
        lede="The tag that lights this view up is one checkbox per project, a proposed ISSP field. Amounts shown are the projects' real Part IV line items."
      />

      <ProposedOnly mode={mode} requires="an AI / compute tag per project (proposed field)">
        <Panel title="AI and compute asks" sub="corpus-wide · tagged projects; the tag itself is a proposed ISSP field" icon={Cpu}>
          <div className="grid lg:grid-cols-2 gap-6">
            <BarList
              items={[...relevant]
                .sort((x, y) => y.total - x.total)
                .map((p) => ({
                  key: p.slug + p.projectId,
                  label: `${p.acronym} · ${p.shortTitle}`,
                  value: p.total,
                  color: AI_KIND_META[p.kind].color,
                  sub: `${AI_KIND_META[p.kind].label} · ${yearSpan(p.byYear.map((y) => y.year))}`,
                  href: `/repository/${p.slug}`,
                }))}
              format={phpCompact}
            />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                Share of each year&apos;s total ask
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ai.byYear
                  .filter((y) => y.amount > 0)
                  .map((y) => (
                    <span
                      key={y.year}
                      className="inline-flex items-baseline gap-1.5 rounded-md border border-foreground/10 bg-secondary px-2.5 py-1 text-xs"
                    >
                      <span className="font-semibold tabular-nums">FY{y.year}</span>
                      <span className="tabular-nums">{phpCompact(y.amount)}</span>
                      <span className="tabular-nums font-semibold text-primary">{(y.share * 100).toFixed(1)}%</span>
                    </span>
                  ))}
              </div>
              <InsightBox className="mt-4">
                <strong>{phpCompact(ai.ownBuildTotal)} of the AI ask is two agencies&apos; own GPU clusters.</strong> A
                shared national compute facility could serve both; decide together before the hardware is bought, not
                after. A review question, not a finding: agencies can have binding reasons, such as data-sovereignty
                commitments over commuter or sponsor data.
              </InsightBox>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                Shares are of that fiscal year&apos;s total across the plans covering it; later years carry fewer plans
                in this corpus. Amounts are the projects&apos; real Part IV line items.
              </p>
            </div>
          </div>
        </Panel>
      </ProposedOnly>

      <InsightBox>
        <strong>Reading AI as one domain among ten keeps it in proportion.</strong> The corpus-wide lens treats
        cybersecurity, devices, networks, cloud and people the same way; the AI tag simply makes the {relevant.length}{" "}
        tagged asks ({ownBuilds.length} own-cluster builds) visible for the shared-versus-own review question.
      </InsightBox>
    </div>
  );
}
