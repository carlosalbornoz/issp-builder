"use client";

/**
 * eGov services view: the citizen-facing posture the ISSP already describes:
 * eGovPH program adoption, PNPKI, frontline systems and how they are reached
 * (Part II checklists and inventory, all today's form).
 */

import Link from "next/link";
import { MonitorSmartphone } from "lucide-react";
import { BarList, Donut } from "@/components/dataviz/charts";
import { SECTOR_SHORT } from "@/lib/repository/corpus";
import { Kpi, Panel, TodayBadge, ViewHeader, ViewProps, pct } from "./shared";

const ACCESS_LABELS: Record<string, string> = { ONLINE: "Online", ON_PREMISE: "Walk-in only", HYBRID: "Hybrid" };
const ACCESS_COLORS: Record<string, string> = { ONLINE: "var(--chart-1)", ON_PREMISE: "var(--chart-5)", HYBRID: "var(--chart-4)" };

export function ServicesView({ profiles }: ViewProps) {
  const systems = profiles.flatMap((p) => p.systems);
  const frontline = systems.filter((s) => s.frontline);
  const egpTotal = profiles.reduce((s, p) => s + p.egp.total, 0);
  const egpAdopted = profiles.reduce((s, p) => s + p.egp.adopted, 0);
  const pnpki = profiles.filter((p) => p.egp.pnpkiAdoption !== undefined);

  const accessMix = new Map<string, number>();
  frontline.forEach((s) => accessMix.set(s.frontlineAccessType, (accessMix.get(s.frontlineAccessType) ?? 0) + 1));

  return (
    <div className="space-y-6">
      <ViewHeader
        eyebrow="ICT domain · 8 of 10"
        title="eGov services"
        lede="The services citizens actually touch: which eGovPH programs each agency adopted, whether identity is PNPKI-backed, and which frontline systems can be reached online."
        insights={[
          <>
            <strong>
              {frontline.filter((s) => s.frontlineAccessType !== "ONLINE").length} of {frontline.length} frontline
              systems still require a counter visit
            </strong>{" "}
            (walk-in only or hybrid): a frontline system that cannot be reached online shortens no queue, and the
            access-type field the form already carries makes that visible per agency and per sector.
          </>,
          pnpki.length > 0 ? (
            <>
              <strong>PNPKI is the prerequisite for every other eGov service.</strong> Certificate adoption across
              the selection runs {Math.min(...pnpki.map((p) => p.egp.pnpkiAdoption ?? 0))}% to{" "}
              {Math.max(...pnpki.map((p) => p.egp.pnpkiAdoption ?? 0))}%.
            </>
          ) : null,
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Frontline systems" value={String(frontline.length)} sub={`${pct(frontline.length, systems.length)} of ${systems.length} systems`} highlight icon={MonitorSmartphone} />
        <Kpi label="Frontline, online" value={pct(frontline.filter((s) => s.frontlineAccessType === "ONLINE").length, frontline.length)} sub="reachable without a counter visit" />
        <Kpi label="eGovPH adoption" value={pct(egpAdopted, egpTotal)} sub={`${egpAdopted} of ${egpTotal} program slots adopted`} />
        <Kpi label="High PNPKI adoption" value={`${pnpki.filter((p) => (p.egp.pnpkiAdoption ?? 0) > 50).length} of ${profiles.length}`} sub="agencies above 50% certificate adoption" />
      </div>

      <div className="grid lg:grid-cols-3 lg:items-start gap-4">
        <Panel title="eGovPH program adoption" sub="Part II eGov checklist · today's form" className="lg:col-span-2">
          <TodayBadge>Computed from today&apos;s form, no new fields needed</TodayBadge>
          <BarList
            className="mt-3"
            items={[...profiles]
              .sort((x, y) => y.egp.adopted - x.egp.adopted)
              .map((p) => ({
                key: p.slug,
                label: p.acronym,
                value: p.egp.adopted,
                href: `/repository/${p.slug}`,
                color: p.egp.adopted / p.egp.total >= 0.6 ? "var(--chart-1)" : "var(--chart-5)",
                sub: `of ${p.egp.total} programs · ${SECTOR_SHORT[p.sector]}`,
              }))}
            total={egpAdopted}
            format={(n) => `${n} programs`}
          />
        </Panel>

        <div className="space-y-4">
        <Panel title="How frontline services are reached" sub="Part II-C access field · today's form">
          <Donut
            segments={[...accessMix.entries()].map(([k, v]) => ({
              key: k,
              label: ACCESS_LABELS[k] ?? k,
              value: v,
              color: ACCESS_COLORS[k] ?? "var(--chart-3)",
            }))}
            format={(n) => `${n} ${n === 1 ? "system" : "systems"}`}
            size={148}
            stackLegend
          />
        </Panel>

        <Panel
          title="PNPKI certificate adoption"
          sub="Part II eGov checklist · today's form"
          hint="Share of the agency's officers and staff with active PNPKI certificates."
        >
          <div className="space-y-1.5 text-xs">
            {profiles
              .filter((p) => p.egp.pnpkiAdoption !== undefined)
              .sort((x, y) => (y.egp.pnpkiAdoption ?? 0) - (x.egp.pnpkiAdoption ?? 0))
              .map((p) => (
                <div key={p.slug} className="flex items-baseline justify-between gap-3">
                  <Link href={`/repository/${p.slug}`} className="hover:underline">
                    {p.acronym}
                  </Link>
                  <span className="tabular-nums font-semibold">{p.egp.pnpkiAdoption}%</span>
                </div>
              ))}
          </div>
        </Panel>
        </div>
      </div>
    </div>
  );
}
