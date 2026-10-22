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
import { SCREENS } from "../nav";
import { Panel, TodayBadge, ViewHeader, ViewProps } from "./shared";

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
        title={SCREENS.networks.label}
        lede={SCREENS.networks.summary}
        insights={[
          <>
            <strong>Links for isolated offices are named and budgeted.</strong> VSAT terminals for off-grid sites and
            fixed wireless for geographically isolated offices appear as Part IV line items. With Annex 1 as
            structured fields, link coverage per office becomes a single query.
          </>,
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 lg:items-start gap-4">
        <div className="space-y-4">
          <Panel title="Connectivity spending by category" sub="Part IV, grouped from the 30 DICT categories">
            <TodayBadge>Current form · no new fields required</TodayBadge>
            <BarList
              className="mt-3"
              items={[...byCategory.entries()]
                .sort((x, y) => y[1] - x[1])
                .map(([id, total]) => ({ key: id, label: categoryNameById.get(id) ?? id, value: total }))}
              total={netTotal}
              format={phpCompact}
            />
            <p className="text-[11px] text-muted-foreground mt-3">
              Selection total <strong className="text-foreground tabular-nums">{phpCompact(netTotal)}</strong>,{" "}
              {fy === "all" ? "all plan years" : `FY${fy}`}
            </p>
          </Panel>
        </div>

        <Panel title="Planned network links" sub="Subscription and broadband line items" className="lg:col-span-2">
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
