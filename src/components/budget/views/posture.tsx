"use client";

/**
 * Government-wide posture: the whole of government in one picture. Agencies
 * grouped by PDP sector × five posture columns; today's-form columns stay live
 * and proposed columns lock in current-form mode.
 */

import { Fragment } from "react";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { SECTORS, TYPE_SHORT } from "@/lib/repository/corpus";
import type { CompassAgency, CorpusProfile } from "@/lib/repository/corpus-types";
import { cn } from "@/lib/utils";
import { SCREENS } from "../nav";
import { Panel, RatePill, ViewHeader, ViewProps } from "./shared";

export function PostureView({ corpus, profiles, mode }: ViewProps) {
  return (
    <div className="space-y-6">
      <ViewHeader title={SCREENS.posture.label} lede={SCREENS.posture.summary} />
      <PostureGrid corpus={corpus} profiles={profiles} mode={mode} />
    </div>
  );
}

// ─── Posture grid: agencies × domains, grouped by PDP sector ─────────────────

function PostureGrid({ corpus, profiles, mode }: { corpus: ViewProps["corpus"]; profiles: CorpusProfile[]; mode: ViewProps["mode"] }) {
  const cyberBySlug = new Map(corpus.cyber.agencies.map((a) => [a.slug, a]));
  const compassBySlug = new Map(corpus.compass.agencies.map((ca) => [ca.slug, ca]));
  const sectors = SECTORS.map((s) => ({ ...s, list: profiles.filter((p) => p.sector === s.key) })).filter((s) => s.list.length > 0);

  return (
    <Panel title="Posture by agency" sub="Grouped by PDP sector · five posture measures">
      <div className="overflow-x-auto scroll-x-fade rounded-lg border">
        <table className="min-w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agency</th>
              <th scope="col" className="border-b px-3 py-2 text-center font-semibold whitespace-nowrap" title="Share of the 29 Part II-B checklist controls enabled">
                <span className="inline-flex items-center gap-1">Cyber controls <BasisMark /></span>
              </th>
              <th scope="col" className="border-b px-3 py-2 text-center font-semibold whitespace-nowrap" title="Share of the agency's inventoried systems hosted in the cloud (Part II-C)">
                <span className="inline-flex items-center gap-1">Cloud-hosted <BasisMark /></span>
              </th>
              <th scope="col" className="border-b px-3 py-2 text-center font-semibold whitespace-nowrap" title="Continuing costs as a share of the final plan year's ask (B.1)">
                <span className="inline-flex items-center gap-1">Continuing share <BasisMark /></span>
              </th>
              <th scope="col" className="border-b px-3 py-2 text-center font-semibold whitespace-nowrap" title="Share of endpoints past vendor support (Annex 1 fleet, proposed)">
                <span className="inline-flex items-center gap-1">Endpoints past support <BasisMark proposed /></span>
              </th>
              <th scope="col" className="border-b px-3 py-2 text-center font-semibold whitespace-nowrap" title="FY2025 obligations over allotments (COMPASS feed, proposed)">
                <span className="inline-flex items-center gap-1">FY2025 obligated <BasisMark proposed /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((sector) => (
              <Fragment key={sector.key}>
                <tr className="bg-muted/30">
                  <td colSpan={6} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {sector.label} · {sector.pdp} · {sector.list.length} {sector.list.length === 1 ? "agency" : "agencies"}
                  </td>
                </tr>
                {sector.list.map((p) => (
                  <PostureRow
                    key={p.slug}
                    profile={p}
                    cyber={cyberBySlug.get(p.slug)?.overall}
                    compass={compassBySlug.get(p.slug)}
                    fleet={corpus.security.fleetBySlug[p.slug]}
                    proposedCols={mode === "proposed"}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Check className="w-3 h-3 text-success" /> Current form</span>
        <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Requires a proposed field or link</span>
        <span>Sectors follow PDP 2023-2028 chapters (mock assignment, proposed field)</span>
      </div>
    </Panel>
  );
}

/** Column-header marker for the column's data basis. */
function BasisMark({ proposed }: { proposed?: boolean }) {
  return proposed ? (
    <Lock className="w-3 h-3 text-muted-foreground" aria-label="proposed field" />
  ) : (
    <Check className="w-3 h-3 text-success" aria-label="today's form" />
  );
}

function PostureRow({
  profile: p,
  cyber,
  compass,
  fleet,
  proposedCols,
}: {
  profile: CorpusProfile;
  cyber?: number;
  compass?: CompassAgency;
  fleet?: ViewProps["corpus"]["security"]["fleetBySlug"][string];
  proposedCols: boolean;
}) {
  const cloudShare = p.systems.length ? p.systems.filter((s) => s.dataStorage === "CLOUD").length / p.systems.length : 0;
  const ccRow = p.budget.b1.find((r) => r.label === "Continuing Costs");
  const ccShare = ccRow && p.budget.grandTotals[2] > 0 ? ccRow.year3 / p.budget.grandTotals[2] : 0;
  const y25 = compass?.years.find((y) => y.year === 2025);

  return (
    <tr className="border-b last:border-b-0 hover:bg-accent/20">
      <td className="px-3 py-2 whitespace-nowrap">
        <Link href={`/repository/${p.slug}`} className="font-medium hover:underline">
          {p.acronym}
        </Link>
        <span className="text-muted-foreground text-[10px] block">{TYPE_SHORT[p.type]}</span>
      </td>
      <td className="px-3 py-2 text-center">{cyber !== undefined ? <BandPill share={cyber} bands={[0.3, 0.5]} /> : "–"}</td>
      <td className="px-3 py-2 text-center tabular-nums">{p.systems.length ? `${Math.round(cloudShare * 100)}%` : "–"}</td>
      <td className="px-3 py-2 text-center tabular-nums">
        {p.budget.grandTotals[2] > 0 ? `${Math.round(ccShare * 100)}%` : "–"}
      </td>
      <td className="px-3 py-2 text-center">
        {proposedCols && fleet ? (
          <BandPill share={fleet.endpointsEol / fleet.endpoints} bands={[0.1, 0.3]} invert />
        ) : (
          <LockedCell />
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {!proposedCols ? (
          <LockedCell />
        ) : y25?.obligated && y25?.allotment ? (
          <RatePill rate={y25.obligated / y25.allotment} />
        ) : (
          <span className="text-muted-foreground text-[10px]" title="This agency has no FY2025 execution record">No FY2025 record</span>
        )}
      </td>
    </tr>
  );
}

function LockedCell() {
  return (
    <span className="inline-flex items-center justify-center gap-1 text-muted-foreground" title="Needs a proposed field or link">
      <Lock className="w-3 h-3" aria-label="locked" /> –
    </span>
  );
}

/** Compact share chip with three bands; `invert` flips the reading (high share = worse). */
function BandPill({ share, bands, invert }: { share: number; bands: [number, number]; invert?: boolean }) {
  const value = Math.round(share * 100);
  const [a, b] = bands;
  const level = share >= b ? 2 : share >= a ? 1 : 0;
  const effective = invert ? 2 - level : level;
  const cls =
    effective === 2
      ? "bg-success-bg text-success border border-success-border"
      : effective === 1
        ? "bg-warning-bg text-warning border border-warning-border"
        : "bg-danger-bg text-destructive border border-danger-border";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums", cls)}>{value}%</span>;
}
