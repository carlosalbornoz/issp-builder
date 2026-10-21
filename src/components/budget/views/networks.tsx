"use client";

/**
 * Networks view: connectivity spend from today's categories, plus what the
 * line items say about links (fibre, VSAT, fixed wireless) per agency.
 */

import Link from "next/link";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { SPEND_DOMAINS } from "@/lib/ict-domains";
import { phpCompact } from "@/lib/utils";
import { BarList } from "@/components/dataviz/charts";
import { InsightBox, Panel, TodayBadge, ViewHeader, ViewProps } from "./shared";

const NETWORKS = SPEND_DOMAINS.find((d) => d.key === "networks")!;
const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));

export function NetworksView({ profiles, lines, fy }: ViewProps) {
  const slugs = new Set(profiles.map((p) => p.slug));
  const scope = (fy === "all" ? lines : lines.filter((l) => l.year === fy)).filter((l) => slugs.has(l.slug));
  const netLines = scope.filter((l) => NETWORKS.categoryIds.includes(l.categoryId));
  const netTotal = netLines.reduce((s, l) => s + l.total, 0);

  const byCategory = new Map<string, number>();
  netLines.forEach((l) => byCategory.set(l.categoryId, (byCategory.get(l.categoryId) ?? 0) + l.total));

  // Per-agency connectivity links named in the plan lines.
  const linkRows = new Map<string, { acronym: string; slug: string; items: Map<string, number> }>();
  netLines.forEach((l) => {
    if (!/subscription|fibre|fiber|wireless|vsat|broadband|internet/i.test(l.item)) return;
    const row = linkRows.get(l.slug) ?? { acronym: l.acronym, slug: l.slug, items: new Map<string, number>() };
    row.items.set(l.item, (row.items.get(l.item) ?? 0) + l.total);
    linkRows.set(l.slug, row);
  });

  return (
    <div className="space-y-6">
      <ViewHeader
        eyebrow="ICT domain · 4 of 10"
        title="Networks and connectivity"
        lede={NETWORKS.blurb + ". The line items name the links themselves: fibre upgrades, fixed wireless for isolated offices, VSAT where nothing else reaches."}
      />

      <div className="grid lg:grid-cols-3 lg:items-start gap-4">
        <div className="space-y-4">
          <Panel title="Connectivity spend by category" sub="Part IV line items rolled up from the 30 DICT categories · today's form">
            <TodayBadge>Computed from today&apos;s form, no new fields needed</TodayBadge>
            <BarList
              className="mt-3"
              items={[...byCategory.entries()]
                .sort((x, y) => y[1] - x[1])
                .map(([id, total]) => ({ key: id, label: categoryNameById.get(id) ?? id, value: total }))}
              format={phpCompact}
            />
            <p className="text-[11px] text-muted-foreground mt-3">
              Selection total: <strong className="text-foreground tabular-nums">{phpCompact(netTotal)}</strong>{" "}
              {fy === "all" ? "across all plan years" : `in FY${fy}`}.
            </p>
          </Panel>
          <InsightBox>
            <strong>Isolated offices are named and budgeted.</strong> VSAT terminals for off-grid sites and fixed
            wireless for geographically isolated offices appear as literal Part IV lines; with the fleet inventory as
            structured fields (proposed), resilient-link coverage per office becomes a query.
          </InsightBox>
        </div>

        <Panel title="The links the plans name" sub="subscription and broadband line items · today's form" className="lg:col-span-2">
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agency</th>
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Line item</th>
                  <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...linkRows.values()]
                  .flatMap((r) => [...r.items.entries()].map(([item, total]) => ({ ...r, item, total })))
                  .sort((x, y) => y.total - x.total)
                  .map((r) => (
                    <tr key={r.slug + r.item} className="border-b last:border-b-0 hover:bg-accent/20 align-top">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Link href={`/repository/${r.slug}`} className="font-medium hover:underline">
                          {r.acronym}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{r.item}</td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{phpCompact(r.total)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
