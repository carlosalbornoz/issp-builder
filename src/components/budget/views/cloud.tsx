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
import { SECTORS } from "@/lib/repository/corpus";
import { phpCompact } from "@/lib/utils";
import { SCREENS } from "../nav";
import { Panel, TodayBadge, ViewHeader, ViewProps, pct } from "./shared";

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
        title={SCREENS.cloud.label}
        lede={SCREENS.cloud.summary}
        insights={[
          <>
            <strong>
              Hosting moves toward the cloud:{" "}
              {pct(currentSystems.filter((s) => s.dataStorage === "ON_PREMISE").length, currentSystems.length)} of
              current systems are on-premise;{" "}
              {pct(proposedSystems.filter((s) => s.dataStorage === "CLOUD").length, proposedSystems.length)} of
              proposed systems are cloud-hosted
            </strong>
            . A cloud-first check per plan requires one rule on an existing field.
          </>,
          <>
            <strong>Each new system adds recurring costs</strong> (hosting, licences and support), which appear as
            continuing costs in the Investment summary.
            {govcloudLines.length > 0
              ? ` ${govcloudLines.length} lines here name GovCloud PH explicitly.`
              : ""}
          </>,
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-4">
        <Panel title="Current system hosting" sub="Part II-C inventory storage field" icon={CloudCog}>
          <TodayBadge>Current form · no new fields required</TodayBadge>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <Donut
              segments={storageMix(currentSystems).map(([k, v]) => ({
                key: k,
                label: STORAGE_LABELS[k] ?? k,
                value: v,
                color: STORAGE_COLORS[k] ?? "var(--chart-3)",
              }))}
              format={(n) => `${n} ${n === 1 ? "system" : "systems"}`}
              size={148}
              stackLegend
            />
            <div className="space-y-2 text-xs">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cloud-hosted share by sector</p>
              {SECTORS.filter((s) => profiles.some((p) => p.sector === s.key)).map((s) => {
                const inSector = profiles.filter((p) => p.sector === s.key);
                const systems = inSector.flatMap((p) => p.systems);
                return (
                  <div key={s.key} className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground">{s.short}</span>
                    <span className="tabular-nums font-semibold">{pct(systems.filter((sys) => sys.dataStorage === "CLOUD").length, systems.length)}</span>
                  </div>
                );
              })}
              <p className="text-muted-foreground leading-relaxed">
                {currentSystems.length} systems across {profiles.length} agencies; {pct(currentSystems.filter((s) => s.dataStorage === "CLOUD").length, currentSystems.length)} cloud-hosted.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Planned system hosting" sub="Part III-D proposed systems · same storage field">
          <Donut
            segments={storageMix(proposedSystems).map(([k, v]) => ({
              key: k,
              label: STORAGE_LABELS[k] ?? k,
              value: v,
              color: STORAGE_COLORS[k] ?? "var(--chart-3)",
            }))}
            format={(n) => `${n} ${n === 1 ? "system" : "systems"}`}
            size={148}
            stackLegend
          />
        </Panel>
      </div>

      <Panel title="Hosting and subscription spending" sub="Part IV, grouped from the 30 DICT categories">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
              {byYear.size === 0 ? <p className="text-xs text-muted-foreground">No hosting or subscription line items in scope.</p> : null}
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
        {govcloudLines.length > 0 ? (
          <p className="text-[11px] text-muted-foreground mt-4">
            GovCloud PH: <strong className="text-foreground tabular-nums">{govcloudLines.length}</strong> lines ·{" "}
            <strong className="text-foreground tabular-nums">₱{(govcloudLines.reduce((s, l) => s + l.total, 0) / 1_000_000).toFixed(1)}M</strong>
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
