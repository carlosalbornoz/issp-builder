"use client";

/**
 * Devices view: what the estate looks like (Annex 1 fleet, proposed) and what
 * the plan spends on devices (categories, today's form), plus the unit-price
 * sanity check that already runs on today's fields.
 */

import Link from "next/link";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { SPEND_DOMAINS } from "@/lib/ict-domains";
import { php, phpCompact } from "@/lib/utils";
import { BarList } from "@/components/dataviz/charts";
import { SCREENS } from "../nav";
import { Panel, PostureTile, ProposedOnly, TodayBadge, ViewHeader, ViewProps } from "./shared";

const DEVICES = SPEND_DOMAINS.find((d) => d.key === "devices")!;
const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));

export function DevicesView({ corpus, profiles, lines, fy, mode }: ViewProps) {
  const scope = fy === "all" ? lines : lines.filter((l) => l.year === fy);
  const devicesLines = scope.filter((l) => DEVICES.categoryIds.includes(l.categoryId));
  const devicesTotal = devicesLines.reduce((s, l) => s + l.total, 0);

  const byCategory = new Map<string, number>();
  devicesLines.forEach((l) => byCategory.set(l.categoryId, (byCategory.get(l.categoryId) ?? 0) + l.total));

  const fleets = profiles.map((p) => ({ profile: p, fleet: corpus.security.fleetBySlug[p.slug] })).filter((f) => f.fleet);
  const endpoints = fleets.reduce((s, f) => s + f.fleet.endpoints, 0);
  const endpointsEol = fleets.reduce((s, f) => s + f.fleet.endpointsEol, 0);

  const up = corpus.unitPrices;
  const upRows = up.rows.filter((r) => profiles.some((p) => p.slug === r.slug));
  const flagged = upRows.filter((r) => r.medianUnitCost > up.corpusMedian * 1.4);

  return (
    <div className="space-y-6">
      <ViewHeader
        title={SCREENS.devices.label}
        lede={SCREENS.devices.summary}
        insights={[
          flagged.length > 0 ? (
            <>
              <strong>
                {flagged.map((r) => r.acronym).join(" and ")} pay well above the corpus median for laptop-class units
              </strong>{" "}
              ({flagged.map((r) => `${(r.medianUnitCost / up.corpusMedian).toFixed(1)}×`).join(" and ")}). One buys
              ruggedized field equipment, where the specification justifies the cost; the other buys a standard office
              specification and is a candidate for procurement-planning support.
            </>
          ) : (
            <>
              <strong>No agency in this selection pays well above the corpus median</strong> for laptop-class units.
            </>
          ),
        ]}
      />

      <ProposedOnly mode={mode} requires="the Annex 1 asset inventory as structured fields (proposed)">
        <Panel title="Device estate" sub="Annex 1 inventory (proposed fields) · fictitious models">
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agency</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Endpoints</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Past support</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Servers</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Network devices</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Average age</th>
                </tr>
              </thead>
              <tbody>
                {fleets.map(({ profile, fleet }) => (
                  <tr key={profile.slug} className="border-b last:border-b-0 hover:bg-accent/20">
                    <td className="px-3 py-2">
                      <Link href={`/repository/${profile.slug}`} className="font-medium hover:underline">
                        {profile.acronym}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fleet.endpoints.toLocaleString("en-PH")}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${fleet.endpointsEol / fleet.endpoints > 0.3 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {fleet.endpointsEol.toLocaleString("en-PH")} ({Math.round((fleet.endpointsEol / fleet.endpoints) * 100)}%)
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fleet.servers}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fleet.networkDevices}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fleet.avgAgeYears.toFixed(1)} yrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <PostureTile label="Endpoints in scope" value={endpoints.toLocaleString("en-PH")} sub="all agencies in scope" />
            <PostureTile
              label="Endpoints past support"
              value={`${Math.round((endpointsEol / endpoints) * 100)}%`}
              sub={`${endpointsEol.toLocaleString("en-PH")} devices`}
              danger={endpointsEol / endpoints > 0.3}
            />
          </div>
        </Panel>
      </ProposedOnly>

      <div className="grid lg:grid-cols-2 lg:items-start gap-4">
        <Panel
          title="Device spending by category"
          sub={`Part IV, grouped from the 30 DICT categories · ${phpCompact(devicesTotal)}, ${fy === "all" ? "all plan\u00a0years" : `FY${fy}`}`}
        >
          <TodayBadge>Current form · no new fields required</TodayBadge>
          <BarList
            className="mt-3"
            items={[...byCategory.entries()]
              .sort((x, y) => y[1] - x[1])
              .map(([id, total]) => ({
                key: id,
                label: categoryNameById.get(id) ?? id,
                value: total,
              }))}
            total={devicesTotal}
            format={phpCompact}
          />
        </Panel>

        <Panel
          title="Unit price comparison: laptop-class purchases"
          sub="Median unit cost against the corpus median"
          hint="Derived from each agency's Part IV line items. A variance is a question for procurement planning, not a finding: specifications and logistics differ."
        >
          {mode === "current" ? <TodayBadge>Current form · no new fields required</TodayBadge> : null}
          <p className="text-xs text-muted-foreground mb-3">
            Corpus median: <strong className="text-foreground tabular-nums">{php(up.corpusMedian)}</strong> per unit,
            across {upRows.reduce((s, r) => s + r.units, 0).toLocaleString("en-PH")} laptop-class units.
          </p>
          <BarList
            items={upRows.map((r) => ({
              key: r.slug,
              label: `${r.acronym} · ${r.units} units`,
              value: r.medianUnitCost,
              color: r.medianUnitCost > up.corpusMedian * 1.4 ? "var(--budget-2)" : "var(--chart-1)",
              href: `/repository/${r.slug}`,
              sub: r.note,
            }))}
            format={(n) => php(n)}
          />
        </Panel>
      </div>
    </div>
  );
}
