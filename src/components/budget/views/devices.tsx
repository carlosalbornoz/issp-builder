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
        eyebrow="ICT domain · 3 of 10"
        title="Compute devices"
        lede={DEVICES.blurb + ". Spend comes from today's categories; the fleet picture (counts, ages, support status) waits on Annex 1 as structured fields."}
        insights={[
          flagged.length > 0 ? (
            <>
              <strong>
                {flagged.map((r) => r.acronym).join(" and ")} sit well above the corpus median
              </strong>{" "}
              ({flagged.map((r) => `${(r.medianUnitCost / up.corpusMedian).toFixed(1)}×`).join(" and ")}). One is
              ruggedized field kit where the spec justifies it; the other is a standard office spec, and that one is
              a procurement-planning support candidate, the same agency already flagged for FY2025 execution.
            </>
          ) : (
            <>
              <strong>No agency sits far above the corpus median</strong> on laptop-class purchases in this
              selection.
            </>
          ),
        ]}
      />

      <ProposedOnly mode={mode} requires="the Annex 1 asset inventory as structured fields (proposed)">
        <Panel title="The estate today" sub="Annex 1 fleet inventory (proposed fields, fictitious models)">
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agency</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Endpoints</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Past support</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Servers</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Network devices</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Avg fleet age</th>
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
            <PostureTile label="Endpoints in scope" value={endpoints.toLocaleString("en-PH")} sub="all selected agencies" />
            <PostureTile
              label="Endpoints past support"
              value={`${Math.round((endpointsEol / endpoints) * 100)}%`}
              sub={`${endpointsEol.toLocaleString("en-PH")} devices, replacement not always budgeted`}
              danger={endpointsEol / endpoints > 0.3}
            />
          </div>
        </Panel>
      </ProposedOnly>

      <div className="grid lg:grid-cols-2 lg:items-start gap-4">
        <Panel
          title="Device spend by category"
          sub={`Part IV line items rolled up from the 30 DICT categories · today's form · ${phpCompact(devicesTotal)} ${fy === "all" ? "across all plan\u00a0years" : `in FY${fy}`}`}
        >
          <TodayBadge>Computed from today&apos;s form, no new fields needed</TodayBadge>
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
          title="Unit-price sanity: laptop-class purchases"
          sub="Corpus-wide · median unit cost vs the corpus median"
          hint="Derived from each agency's Part IV line items. Variance is a prompt to ask before the bid, not a finding after it: specs and logistics differ."
        >
          {mode === "current" ? <TodayBadge>Computed from today&apos;s form, no new fields needed</TodayBadge> : null}
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
