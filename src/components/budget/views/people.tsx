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
        eyebrow="ICT domain · 7 of 10"
        title="People and capability"
        lede="The ICT workforce behind the plans and the money set aside to skill it up: both carried by today's form (Part I human capital and the training/professional-services categories)."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="ICT personnel" value={totalIt.toLocaleString("en-PH")} sub={`across ${profiles.length} agencies`} highlight icon={Users} />
        <Kpi label="ICT share of workforce" value={pct(totalIt, totalStaff)} sub={`${totalStaff.toLocaleString("en-PH")} total staff (Part I)`} />
        <Kpi label="Unfilled plantilla" value={unfilled.toLocaleString("en-PH")} sub="IT posts, this cycle" />
        <Kpi label="Capability spend" value={phpCompact(peopleLines.reduce((s, l) => s + l.total, 0))} sub={`training + professional services${fy === "all" ? "" : `, FY${fy}`}`} />
      </div>

      <div className="grid lg:grid-cols-2 lg:items-start gap-4">
        <div className="space-y-4">
        <Panel title="ICT staff per agency" sub="Part I human capital · today's form">
          <TodayBadge>Computed from today&apos;s form, no new fields needed</TodayBadge>
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
            format={(n) => n.toLocaleString("en-PH")}
          />
        </Panel>
        </div>
        <div className="space-y-4">
        <Panel title="Training in the plans" sub="ICT training line items · today's form">
          <div className="space-y-1.5">
            {[...profiles]
              .filter((p) => trainingLines.some((l) => l.slug === p.slug))
              .sort((x, y) => trainingTotal(y.slug) - trainingTotal(x.slug))
              .map((p) => {
                const total = trainingLines.filter((l) => l.slug === p.slug).reduce((s, l) => s + l.total, 0);
                const items = trainingLines.filter((l) => l.slug === p.slug);
                return (
                  <div key={p.slug} className="flex items-baseline justify-between gap-3 text-xs border-b last:border-b-0 pb-1.5 last:pb-0">
                    <span className="min-w-0">
                      <Link href={`/repository/${p.slug}`} className="font-medium hover:underline">
                        {p.acronym}
                      </Link>
                      <span className="text-muted-foreground block truncate max-w-md">{items[0].item}</span>
                    </span>
                    <span className="tabular-nums font-semibold shrink-0">{phpCompact(total)}</span>
                  </div>
                );
              })}
            {trainingLines.length === 0 ? <p className="text-xs text-muted-foreground">No ICT training lines in this selection.</p> : null}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Outsourced staff make up {pct(outsourcedIt, totalStaff)} of the selected workforce; the capability question
            (who runs the systems after the contractors leave) is what the training lines answer.
          </p>
        </Panel>

        <Panel title="Workforce mix" sub="Part I human capital · today's form">
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
            <p className="text-muted-foreground leading-relaxed pt-1">
              Employment status of all staff (IT and non-IT) across the selection; unfilled plantilla posts sit
              on top of this base.
            </p>
          </div>
        </Panel>
        </div>
      </div>
    </div>
  );
}
