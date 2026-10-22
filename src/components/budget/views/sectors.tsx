"use client";

/**
 * Sector comparison: the selection's proposed investment by PDP 2023-2028
 * sector (a proposed field, mock assignment). Each row opens the posture grid
 * scoped to that sector.
 */

import { BarList } from "@/components/dataviz/charts";
import { SECTORS } from "@/lib/repository/corpus";
import { phpCompact } from "@/lib/utils";
import { SCREENS, screenHref } from "../nav";
import { Panel, ViewHeader, ViewProps } from "./shared";

export function SectorsView({ profiles, lines, fy, params }: ViewProps & { params: URLSearchParams }) {
  const scope = fy === "all" ? lines : lines.filter((l) => l.year === fy);
  const sectorBySlug = new Map(profiles.map((p) => [p.slug, p.sector]));
  const rows = SECTORS.map((s) => {
    const agencies = profiles.filter((p) => p.sector === s.key).length;
    const total = scope.filter((l) => sectorBySlug.get(l.slug) === s.key).reduce((sum, l) => sum + l.total, 0);
    const next = new URLSearchParams(params.toString());
    next.set("sector", s.key);
    return { ...s, agencies, total, href: screenHref("posture", next) };
  })
    .filter((r) => r.agencies > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <ViewHeader title={SCREENS.sectors.label} lede={SCREENS.sectors.summary} />
      <Panel title="Proposed investment by sector" sub="PDP 2023-2028 chapters · mock assignment, proposed field" hint="Select a sector to open its posture grid.">
        <BarList
          items={rows.map((r) => ({
            key: r.key,
            label: r.label,
            value: r.total,
            href: r.href,
            sub: `${r.pdp} · ${r.agencies} ${r.agencies === 1 ? "agency" : "agencies"}`,
          }))}
          total={rows.reduce((s, r) => s + r.total, 0)}
          format={(n) => (n > 0 ? phpCompact(n) : "–")}
        />
      </Panel>
    </div>
  );
}
