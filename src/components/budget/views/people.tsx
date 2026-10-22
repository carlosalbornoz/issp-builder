"use client";

/**
 * People view: the ICT workforce the plans describe (Part I human capital) and
 * the capability spend (training, professional services) from today's
 * categories. All v14 fields.
 */

import Link from "next/link";
import { Users } from "lucide-react";
import { SPEND_DOMAINS } from "@/lib/ict-domains";
import { phpCompact } from "@/lib/utils";
import { BarList } from "@/components/dataviz/charts";
import { SCREENS } from "../nav";
import { Kpi, Panel, TodayBadge, ViewHeader, ViewProps, pct } from "./shared";

const PEOPLE = SPEND_DOMAINS.find((d) => d.key === "peopleServices")!;

export function PeopleView({ profiles, lines, fy }: ViewProps) {
  const slugs = new Set(profiles.map((p) => p.slug));
  const scope = (fy === "all" ? lines : lines.filter((l) => l.year === fy)).filter((l) => slugs.has(l.slug));
  const peopleLines = scope.filter((l) => PEOPLE.categoryIds.includes(l.categoryId));
  const trainingLines = peopleLines.filter((l) => l.categoryId === "mooe-ict-training");
  const trainingTotal = (slug: string) => trainingLines.filter((l) => l.slug === slug).reduce((s, l) => s + l.total, 0);

  const totalIt = profiles.reduce((s, p) => s + p.humanCapital.totalIt, 0);
  const totalStaff = profiles.reduce((s, p) => s + p.humanCapital.plantilla + p.humanCapital.contractual + p.humanCapital.outsourced, 0);
  const unfilled = profiles.reduce((s, p) => s + p.humanCapital.unfilled, 0);
  const outsourcedIt = profiles.reduce((s, p) => s + p.humanCapital.outsourced, 0);

  return (
    <div className="space-y-6">
      <ViewHeader
        title={SCREENS.people.label}
        lede={SCREENS.people.summary}
        insights={[
          <>
            <strong>Outsourced staff make up {pct(outsourcedIt, totalStaff)} of the workforce in scope.</strong>{" "}
            Planned ICT training determines who operates the systems after contracts end.
          </>,
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="ICT personnel" value={totalIt.toLocaleString("en-PH")} sub={`across ${profiles.length} agencies`} highlight icon={Users} />
        <Kpi label="ICT share of workforce" value={pct(totalIt, totalStaff)} sub={`${totalStaff.toLocaleString("en-PH")} total staff (Part I)`} />
        <Kpi label="Unfilled plantilla" value={unfilled.toLocaleString("en-PH")} sub="IT posts, current cycle" />
        <Kpi label="Capability spending" value={phpCompact(peopleLines.reduce((s, l) => s + l.total, 0))} sub={`training and professional services${fy === "all" ? "" : `, FY${fy}`}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-4">
        <div className="space-y-4">
        <Panel title="ICT staff per agency" sub="Part I human capital">
          <TodayBadge>Current form · no new fields required</TodayBadge>
          <BarList
            className="mt-3"
            items={[...profiles]
              .sort((x, y) => y.humanCapital.totalIt - x.humanCapital.totalIt)
              .map((p) => {
                const staff = p.humanCapital.plantilla + p.humanCapital.contractual + p.humanCapital.outsourced;
                return {
                  key: p.slug,
                  label: p.acronym,
                  value: p.humanCapital.totalIt,
                  href: `/repository/${p.slug}`,
                  sub: `${pct(p.humanCapital.totalIt, staff)} of ${staff.toLocaleString("en-PH")} staff`,
                };
              })}
            total={totalIt}
            format={(n) => n.toLocaleString("en-PH")}
          />
        </Panel>
        </div>
        <div className="space-y-4">
        <Panel title="Planned ICT training" sub="ICT training line items">
          <div className="space-y-1.5">
            {[...profiles]
              .filter((p) => trainingLines.some((l) => l.slug === p.slug))
              .sort((x, y) => trainingTotal(y.slug) - trainingTotal(x.slug))
              .map((p) => {
                const items = trainingLines.filter((l) => l.slug === p.slug);
                const total = items.reduce((s, l) => s + l.total, 0);
                // The total spans several line items; name the largest one, not "the" item.
                const largest = [...items].sort((x, y) => y.total - x.total)[0];
                return (
                  <div key={p.slug} className="flex items-baseline justify-between gap-3 text-xs border-b last:border-b-0 pb-1.5 last:pb-0">
                    <span className="min-w-0">
                      <Link href={`/repository/${p.slug}`} className="font-medium hover:underline">
                        {p.acronym}
                      </Link>
                      <span className="text-muted-foreground block truncate max-w-md">
                        {items.length} training {items.length === 1 ? "line" : "lines"} · largest: {largest.item}
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold shrink-0">{phpCompact(total)}</span>
                  </div>
                );
              })}
            {trainingLines.length === 0 ? <p className="text-xs text-muted-foreground">No ICT training line items in scope.</p> : null}
          </div>
        </Panel>

        <Panel
          title="Workforce mix"
          sub="Part I human capital"
          hint="Employment status of all staff (IT and non-IT) in scope. Unfilled plantilla posts are in addition to this base."
        >
          <div className="space-y-1.5 text-xs">
            {([
              ["Plantilla", profiles.reduce((s2, p) => s2 + p.humanCapital.plantilla, 0)],
              ["Contractual", profiles.reduce((s2, p) => s2 + p.humanCapital.contractual, 0)],
              ["Outsourced", profiles.reduce((s2, p) => s2 + p.humanCapital.outsourced, 0)],
            ] as [string, number][]).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <span>{label}</span>
                <span className="tabular-nums font-semibold">{value.toLocaleString("en-PH")} · {pct(value, totalStaff)}</span>
              </div>
            ))}
          </div>
        </Panel>
        </div>
      </div>
    </div>
  );
}
