"use client";

/**
 * Cloud & software view: the storage mix the plans carry (Part II-C for current
 * systems, Part III-D for proposed ones, both today's form) and the
 * hosting/subscription spend trajectory from today's categories.
 */

import { CloudCog } from "lucide-react";
import { Donut } from "@/components/dataviz/charts";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { SPEND_DOMAINS } from "@/lib/ict-domains";
import { SECTOR_SHORT } from "@/lib/repository/corpus";
import { phpCompact } from "@/lib/utils";
import { InsightBox, Panel, TodayBadge, ViewHeader, ViewProps, pct } from "./shared";

const CLOUD = SPEND_DOMAINS.find((d) => d.key === "cloudSoftware")!;
const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));

const STORAGE_LABELS: Record<string, string> = { CLOUD: "Cloud", ON_PREMISE: "On-premise", HYBRID: "Hybrid" };
const STORAGE_COLORS: Record<string, string> = {
  CLOUD: "var(--chart-1)",
  ON_PREMISE: "var(--chart-5)",
  HYBRID: "var(--chart-4)",
};

export function CloudView({ profiles, lines, fy }: ViewProps) {
  const slugs = new Set(profiles.map((p) => p.slug));
  const scope = (fy === "all" ? lines : lines.filter((l) => l.year === fy)).filter((l) => slugs.has(l.slug));
  const cloudLines = scope.filter((l) => CLOUD.categoryIds.includes(l.categoryId));

  const byYear = new Map<number, number>();
  cloudLines.forEach((l) => byYear.set(l.year, (byYear.get(l.year) ?? 0) + l.total));
  const byCategory = new Map<string, number>();
  cloudLines.forEach((l) => byCategory.set(l.categoryId, (byCategory.get(l.categoryId) ?? 0) + l.total));

  const storageMix = (systems: { dataStorage: string }[]) => {
    const mix = new Map<string, number>();
    systems.forEach((s) => mix.set(s.dataStorage, (mix.get(s.dataStorage) ?? 0) + 1));
    return [...mix.entries()].sort((x, y) => y[1] - x[1]);
  };
  const currentSystems = profiles.flatMap((p) => p.systems);
  const proposedSystems = profiles.flatMap((p) => p.proposedSystems);

  const govcloudLines = scope.filter((l) => /govcloud/i.test(l.item));

  return (
    <div className="space-y-6">
      <ViewHeader
        eyebrow="ICT domain · 5 of 10"
        title="Software, cloud and hosting"
        lede="Where systems live and where that money goes: the storage fields the ISSP already carries, and the subscription, hosting and cloud lines that become the permanent MOOE floor."
      />

      <div className="grid lg:grid-cols-2 lg:items-start gap-4">
        <Panel title="Where systems live today" sub="Part II-C inventory storage field · today's form" icon={CloudCog}>
          <TodayBadge>Computed from today&apos;s form, no new fields needed</TodayBadge>
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <Donut
              segments={storageMix(currentSystems).map(([k, v]) => ({
                key: k,
                label: STORAGE_LABELS[k] ?? k,
                value: v,
                color: STORAGE_COLORS[k] ?? "var(--chart-3)",
              }))}
              format={(n) => `${n} systems`}
              size={148}
              stackLegend
            />
            <div className="space-y-2 text-xs">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">By sector · cloud-hosted share</p>
              {[...new Set(profiles.map((p) => p.sector))].map((sector) => {
                const inSector = profiles.filter((p) => p.sector === sector);
                const systems = inSector.flatMap((p) => p.systems);
                return (
                  <div key={sector} className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground">{SECTOR_SHORT[sector]}</span>
                    <span className="tabular-nums font-semibold">{pct(systems.filter((s) => s.dataStorage === "CLOUD").length, systems.length)}</span>
                  </div>
                );
              })}
              <p className="text-muted-foreground leading-relaxed">
                {currentSystems.length} systems across {profiles.length} agencies; {pct(currentSystems.filter((s) => s.dataStorage === "CLOUD").length, currentSystems.length)} cloud-hosted.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Where the new systems will live" sub="Part III-D proposed systems · same storage field">
          <Donut
            segments={storageMix(proposedSystems).map(([k, v]) => ({
              key: k,
              label: STORAGE_LABELS[k] ?? k,
              value: v,
              color: STORAGE_COLORS[k] ?? "var(--chart-3)",
            }))}
            format={(n) => `${n} systems`}
            size={148}
            stackLegend
          />
          <InsightBox className="mt-4">
            <strong>The plans shift hosting toward the cloud.</strong> Current systems sit{" "}
            {pct(currentSystems.filter((s) => s.dataStorage === "ON_PREMISE").length, currentSystems.length)} on-premise;
            proposed systems move to {pct(proposedSystems.filter((s) => s.dataStorage === "CLOUD").length, proposedSystems.length)}{" "}
            cloud-hosted. A cloud-first check per plan is one rule on a field the form already carries.
          </InsightBox>
        </Panel>
      </div>

      <Panel title="Hosting and subscription spend" sub="Part IV line items rolled up from the 30 DICT categories · today's form">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">By plan year</p>
            <div className="space-y-1.5">
              {[...byYear.entries()].sort((x, y) => x[0] - y[0]).map(([year, total]) => (
                <div key={year} className="grid grid-cols-[64px_1fr_88px] gap-2 items-center">
                  <span className="text-xs tabular-nums text-muted-foreground">FY{year}</span>
                  <div className="h-3.5 rounded-sm bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${Math.max((total / Math.max(...byYear.values(), 1)) * 100, 1)}%`, background: "var(--chart-1)" }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-right font-semibold">{phpCompact(total)}</span>
                </div>
              ))}
              {byYear.size === 0 ? <p className="text-xs text-muted-foreground">No hosting or subscription lines in this selection.</p> : null}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">By category</p>
            <div className="space-y-1.5 text-xs">
              {[...byCategory.entries()].sort((x, y) => y[1] - x[1]).map(([id, total]) => (
                <div key={id} className="flex items-baseline justify-between gap-3">
                  <span className="text-foreground">{categoryNameById.get(id) ?? id}</span>
                  <span className="tabular-nums font-semibold shrink-0">{phpCompact(total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
          Every new system adds a recurring line: hosting, licences, support. That is the future MOOE floor the
          continuing-costs trend on the Overview tracks.
          {govcloudLines.length > 0
            ? ` ${govcloudLines.length} lines name GovCloud PH explicitly (₱${(govcloudLines.reduce((s, l) => s + l.total, 0) / 1_000_000).toFixed(1)}M total).`
            : ""}
        </p>
      </Panel>
    </div>
  );
}
