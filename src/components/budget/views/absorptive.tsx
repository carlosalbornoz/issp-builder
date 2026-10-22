"use client";

/**
 * Absorptive capacity: each GAA agency's FY2025 obligation rate beside its
 * FY2027 ask. Execution figures come from the mock COMPASS layer (a proposed
 * link), so the screen locks in current-form mode.
 */

import Link from "next/link";
import { Info } from "lucide-react";
import type { CompassAgency, CorpusProfile } from "@/lib/repository/corpus-types";
import { cn, phpCompact } from "@/lib/utils";
import { SCREENS } from "../nav";
import { ProposedOnly, RatePill, ViewHeader, ViewProps } from "./shared";

export function AbsorptiveView({ corpus, profiles, mode }: ViewProps) {
  const slugs = new Set(profiles.map((p) => p.slug));
  const gaa = corpus.compass.agencies.filter((ca) => ca.route === "GAA" && slugs.has(ca.slug));
  return (
    <div className="space-y-6">
      <ViewHeader title={SCREENS.absorptive.label} lede={`${SCREENS.absorptive.summary} Execution figures use a mock COMPASS layer (proposed link).`} />
      {gaa.length === 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            No GAA agencies in scope. GOCC and LGU budgets do not pass through the GAA.
          </p>
        </div>
      ) : (
        <ProposedOnly mode={mode} requires="UACS join keys + a COMPASS execution feed (proposed)">
          <AbsorptiveTable gaa={gaa} profiles={profiles} />
        </ProposedOnly>
      )}
    </div>
  );
}

function AbsorptiveTable({ gaa, profiles }: { gaa: CompassAgency[]; profiles: CorpusProfile[] }) {
  const absorptive = absorptiveRows(gaa, profiles);
  const steepest = absorptive.filter((x) => x.ratio !== null).sort((x, y) => (y.ratio ?? 0) - (x.ratio ?? 0))[0];
  const withoutY25 = gaa.length - absorptive.length;
  if (absorptive.length === 0) return null;
  return (
    <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">FY2025 execution against FY2027 request</p>
      <h3 className="text-sm font-semibold mt-1 mb-3">
        Obligation rate and FY2027 request by agency
        <span
          title="An en dash means the agency's plan years do not cover that column (FY2028-start plans carry no FY2027 request). Agencies without an FY2025 execution record are not listed. Execution figures are illustrative values in the shape of COMPASS data; GOCC and LGU plans sit outside the GAA."
          tabIndex={0}
          className="cursor-help inline-flex ml-1 align-[-2px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Info className="w-3.5 h-3.5 text-muted-foreground/80" aria-hidden />
        </span>
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agency</th>
              <th scope="col" className="border-b px-3 py-2 text-right font-semibold">FY2025 GAA</th>
              <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Allotment</th>
              <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Obligated</th>
              <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Obligation rate</th>
              <th scope="col" className="border-b px-3 py-2 text-right font-semibold">FY2027 request</th>
              <th scope="col" className="border-b px-3 py-2 text-right font-semibold">Request ÷ obligations</th>
            </tr>
          </thead>
          <tbody>
            {absorptive.map(({ profile: p, y25, ask27, ratio }) => {
              const rate = y25.obligated! / y25.allotment!;
              return (
                <tr key={p.slug} className="border-b last:border-b-0 hover:bg-accent/20">
                  <td className="px-3 py-2">
                    <Link href={`/repository/${p.slug}`} className="font-medium hover:underline">
                      {p.acronym}
                    </Link>
                    <span className="text-muted-foreground hidden xl:inline"> · {p.name}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{phpCompact(y25.gaa!)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{phpCompact(y25.allotment!)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{phpCompact(y25.obligated!)}</td>
                  <td className="px-3 py-2">
                    <RatePill rate={rate} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{ask27 ? phpCompact(ask27) : "–"}</td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-semibold", ratio && ratio > 2 ? "text-destructive" : "")}>
                    {ratio ? `${ratio.toFixed(1)}×` : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
        <span>
          On track ≥ 85% · Watch 70–84% · Low &lt; 70%
        </span>
        {steepest ? (
          <span>
            Largest increase: <strong className="text-foreground">{steepest.profile.acronym}</strong> at{" "}
            <strong className="text-foreground tabular-nums">{steepest.ratio!.toFixed(1)}×</strong>, after obligating{" "}
            {Math.round((steepest.y25.obligated! / steepest.y25.allotment!) * 100)}% in FY2025
          </span>
        ) : (
          <span>Each GAA agency&apos;s FY2027 request is below its FY2025 obligations.</span>
        )}
        {withoutY25 > 0 ? (
          <span>
            {withoutY25 === 1 ? "1 GAA agency" : `${withoutY25} GAA agencies`} without an FY2025 record (not listed)
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** GAA agencies with an FY2025 record, joined to their FY2027 ask. */
export function absorptiveRows(gaa: CompassAgency[], profiles: CorpusProfile[]) {
  return gaa
    .map((ca) => {
      const y25 = ca.years.find((y) => y.year === 2025);
      const profile = profiles.find((p) => p.slug === ca.slug);
      if (!y25?.obligated || !y25.allotment || !y25.gaa || !profile) return null;
      const i = 2027 - profile.cycle.startYear;
      const ask27 = i >= 0 && i < 3 ? profile.budget.grandTotals[i] : null;
      return { profile, y25, ask27, ratio: ask27 ? ask27 / y25.obligated : null };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
}
