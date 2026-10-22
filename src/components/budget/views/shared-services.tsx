"use client";

/**
 * Shared services view: convergence and duplication watch. Where a shared
 * service could replace separate builds, which national plans the money serves,
 * and the cross-agency programs that only exist when plans are read together.
 * All computed from today's form (Parts II-C, III-D, III-E).
 */

import Link from "next/link";
import { Info, Layers3, ShieldQuestion } from "lucide-react";
import { BarList } from "@/components/dataviz/charts";
import { phpCompact } from "@/lib/utils";
import type { CorpusProfile } from "@/lib/repository/corpus-types";
import { SCREENS } from "../nav";
import { Panel, ViewHeader, ViewProps } from "./shared";
import { cn } from "@/lib/utils";

const DUP_CLUSTERS = [
  { key: "hris", type: "HR information system", check: "A shared government HRIS (candidate)", question: "Can these agencies use one SaaS contract?", patterns: [/hr\b/i, /human resource/i, /payroll/i, /personnel/i, /crew hr/i] },
  { key: "permits", type: "Permits and licensing", check: "eLGU shared services", question: "Can member LGUs share one permits platform?", patterns: [/permit/i, /licens/i, /bpls/i, /one-stop/i] },
  { key: "records", type: "Document tracking and records", check: "A shared records service (candidate)", question: "Is a common standard enough, or one platform?", patterns: [/record/i, /document/i, /archive/i, /registry/i] },
  { key: "financial", type: "Financial management and accounting", check: "IFMIS · eNGAS", question: "Which functions are not in the government-wide systems?", patterns: [/financ/i, /accounting/i] },
  { key: "feedback", type: "Citizen feedback and complaints", check: "eGovPH App · 8888 hotline", question: "Can reports go through the eGovPH channel?", patterns: [/feedback/i, /complaint/i] },
] as const;

const ALIGNMENT_TAGS = ["E-Government Master Plan", "National Cybersecurity Plan", "Public Investment Program", "Program Convergence Budgeting"];

/** Duplication watch: proposed systems (III-D) grouped by cluster across two or more agencies. */
export function duplicationGroups(profiles: CorpusProfile[]) {
  return DUP_CLUSTERS.map((cluster) => {
    const members: { acronym: string; slug: string; system: string; fundingProject?: string; cost: number }[] = [];
    profiles.forEach((a) => {
      a.proposedSystems.forEach((s) => {
        if (cluster.patterns.some((p) => p.test(s.name))) {
          const linked = a.projects.find((p) => p.linkedSystems.includes(s.name));
          members.push({
            acronym: a.acronym,
            slug: a.slug,
            system: s.shortName,
            ...(s.fundingProject ? { fundingProject: s.fundingProject } : {}),
            cost: linked?.totalCost ?? 0,
          });
        }
      });
    });
    const agencyCount = new Set(members.map((m) => m.acronym)).size;
    return { cluster, members, agencyCount, cost: members.reduce((s, m) => s + m.cost, 0) };
  })
    .filter((g) => g.agencyCount >= 2)
    .sort((a, b) => b.cost - a.cost || b.agencyCount - a.agencyCount);
}

export function SharedServicesView({ corpus, profiles, highlightProgram }: ViewProps & { highlightProgram: string | null }) {
  const dupGroups = duplicationGroups(profiles);

  // Alignment share: share of project cost tagged to each national plan (+ untagged).
  const alignment = (() => {
    const per = new Map<string, number>();
    let untagged = 0;
    profiles.forEach((a) =>
      a.projects.forEach((p) => {
        if (p.alignment.length === 0) untagged += p.totalCost;
        p.alignment.forEach((t) => per.set(t, (per.get(t) ?? 0) + p.totalCost));
      })
    );
    return { per, untagged };
  })();

  const programs = corpus.crossAgencyPrograms;

  return (
    <div className="space-y-6">
      <ViewHeader
        title={SCREENS.shared.label}
        lede={SCREENS.shared.summary}
        insights={[
          alignment.untagged > 0 ? (
            <>
              <strong>{phpCompact(alignment.untagged)} of project cost has no link to a national plan.</strong> These
              items require written justification in the Budget Call.
            </>
          ) : (
            <>
              <strong>Every project in scope carries at least one alignment tag</strong> to a national plan.
            </>
          ),
          <>
            <strong>Cross-agency program totals are available only when plans are combined.</strong> No single
            agency file holds them.
          </>,
        ]}
      />

      <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Proposed systems (Part III-D) grouped by type</p>
        <h3 className="text-sm font-semibold mt-1 mb-3">
          Duplicate system clusters
          <span
            title="Grouping uses the system name and classification in Part III-D. Agencies can have valid reasons for their own system. Costs show the linked Part III-E project where one exists."
            tabIndex={0}
            className="cursor-help inline-flex ml-1 align-[-2px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Info className="w-3.5 h-3.5 text-muted-foreground/80" aria-hidden />
          </span>
        </h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th scope="col" className="border-b px-3 py-2 text-left font-semibold">System type</th>
                <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agencies planning it</th>
                <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Cost via linked projects</th>
                <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Check first</th>
                <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Suggested review question</th>
              </tr>
            </thead>
            <tbody>
              {dupGroups.map((g) => (
                <tr key={g.cluster.key} className="border-b last:border-b-0 hover:bg-accent/20 align-top">
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{g.cluster.type}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {g.members.map((m) => (
                        <Link
                          key={m.slug + m.system}
                          href={`/repository/${m.slug}`}
                          className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] hover:bg-accent transition-colors"
                          title={m.system}
                        >
                          {m.acronym}
                        </Link>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{g.members.length} systems · {g.agencyCount} agencies</p>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                    {g.cost > 0 ? phpCompact(g.cost) : <span className="text-muted-foreground">Not yet costed</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{g.cluster.check}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{g.cluster.question}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      <div className="grid lg:grid-cols-2 lg:items-start gap-4">
        <Panel title="Alignment with national plans" sub="Strategic alignment tags · share of project cost" icon={ShieldQuestion}>
          <BarList
            items={[
              ...ALIGNMENT_TAGS.map((tag) => ({
                key: tag,
                label: tag,
                value: alignment.per.get(tag) ?? 0,
              })),
              {
                key: "__none",
                label: "No alignment tag",
                value: alignment.untagged,
                color: "var(--destructive)",
              },
            ]}
            format={phpCompact}
          />

        </Panel>

        <Panel title="Cross-agency programs" sub="Part III-E.2 · each agency carries its share in its own plan" icon={Layers3}>
          <div className="space-y-3">
            {programs.map((p) => (
              <div key={p.key} className={cn("rounded-lg border bg-card p-3.5", highlightProgram === p.key ? "border-primary ring-2 ring-primary/40" : "border-foreground/10")}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold leading-snug">{p.title}</p>
                  <span className="text-sm font-bold tabular-nums text-primary ml-auto text-right">{phpCompact(p.combinedCost)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2.5">Led by {p.leadAgency} · {p.participants.join(" · ")}</p>
                <div className="space-y-1">
                  {p.agencies.map((s) => (
                    <Link key={s.slug} href={`/repository/${s.slug}`} className="flex items-baseline justify-between gap-2 text-xs hover:underline">
                      <span className="text-foreground">
                        {s.acronym}
                        {p.leadAgency.includes(s.acronym) ? " (lead)" : ""}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{phpCompact(s.share)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
