"use client";

/**
 * Cybersecurity view: posture-led, because none of the 30 DICT expense
 * categories is security-specific, so today's form cannot see security spend.
 * The Part II-B control checklist IS today's form (the coverage grid runs
 * live); the Annex 1 fleet and advisory blast radius wait on the proposed
 * inventory fields.
 */

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { formatDay } from "@/lib/utils";
import { SECTOR_SHORT } from "@/lib/repository/corpus";
import { InsightBox, Panel, PostureTile, ProposedOnly, TodayBadge, ViewHeader, ViewProps } from "./shared";
import { cn } from "@/lib/utils";

export function CybersecurityView({ corpus, profiles, mode }: ViewProps) {
  const cyber = corpus.cyber;
  const bySlug = new Map(cyber.agencies.map((a) => [a.slug, a]));
  const slugs = new Set(profiles.map((p) => p.slug));
  const rows = profiles
    .map((p) => ({ profile: p, coverage: bySlug.get(p.slug) }))
    .filter((r): r is { profile: (typeof profiles)[number]; coverage: NonNullable<ReturnType<typeof bySlug.get>> } => r.coverage !== undefined)
    .sort((a, b) => b.coverage.overall - a.coverage.overall);
  const groups = cyber.groups;

  const corpusOverall = rows.length ? rows.reduce((s, r) => s + r.coverage.overall, 0) / rows.length : 0;

  const fleets = profiles.map((p) => corpus.security.fleetBySlug[p.slug]).filter(Boolean);
  const endpoints = fleets.reduce((s, f) => s + f.endpoints, 0);
  const endpointsEol = fleets.reduce((s, f) => s + f.endpointsEol, 0);
  const serversEol = fleets.reduce((s, f) => s + f.serversEol, 0);
  const adv = corpus.security.advisory;
  const advRows = adv.agencies.filter((h) => slugs.has(h.slug));
  const advUnits = advRows.reduce((s, h) => s + h.units, 0);

  return (
    <div className="space-y-6">
      <ViewHeader
        eyebrow="ICT domain · 2 of 10"
        title="Government cyber posture"
        lede="What the ISSP already carries as a checklist (Part II-B), what a national CERT advisory would light up (Annex 1, proposed), and the one thing today's form cannot see: security spend."
      />

      {/* Part II-B coverage grid: today's form */}
      <Panel title="Cybersecurity control coverage" sub="Part II-B checklist · Yes/No controls counted per group · today's form">
        <TodayBadge>Computed from today&apos;s form, no new fields needed</TodayBadge>
        <div className="overflow-x-auto rounded-lg border mt-3">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agency</th>
                {groups.map((g) => (
                  <th key={g.key} scope="col" className="border-b px-2.5 py-2 text-center font-semibold whitespace-nowrap" title={`${g.label} (${g.controls} controls)`}>
                    <span className="block">{groupShort(g.key)}</span>
                  </th>
                ))}
                <th scope="col" className="border-b px-3 py-2 text-right font-semibold">All controls</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ profile, coverage }) => (
                <tr key={profile.slug} className="border-b last:border-b-0 hover:bg-accent/20">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/repository/${profile.slug}`} className="font-medium hover:underline">
                      {profile.acronym}
                    </Link>
                    <span className="text-muted-foreground text-[10px] block">{SECTOR_SHORT[profile.sector]}</span>
                  </td>
                  {groups.map((g) => {
                    const share = coverage.enabled[g.key] / g.controls;
                    return (
                      <td key={g.key} className="px-2.5 py-2 text-center">
                        <CoverageCell share={share} label={`${coverage.enabled[g.key]} of ${g.controls}`} />
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right">
                    <CoverageCell share={coverage.overall} label={`${Math.round(coverage.overall * 100)}%`} strong />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-muted-foreground">
          <span>Columns: Physical · Perimeter · Network · Endpoint · Data · Application · Security ops</span>
          <span className="inline-flex items-center gap-1"><CellSwatch band="none" /> none</span>
          <span className="inline-flex items-center gap-1"><CellSwatch band="low" /> under half</span>
          <span className="inline-flex items-center gap-1"><CellSwatch band="mid" /> half or more</span>
          <span className="inline-flex items-center gap-1"><CellSwatch band="high" /> full</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          Counted from the Part II-B checklist each .issp carries ({groups.reduce((s, g) => s + g.controls, 0)} Yes/No
          controls across 7 groups). Average across the selection: {Math.round(corpusOverall * 100)}% today; the
          corpus-wide Part III-A target state averages {Math.round(cyber.proposedOverall * 100)}%. Fictitious agencies;
          the checklist itself is today&apos;s ISSP form.
        </p>
      </Panel>

      {/* The one field away: security spend */}
      <InsightBox>
        <strong>Security spend is invisible in today&apos;s categories.</strong> None of the 30 DICT expense categories
        is security-specific: a firewall lands under equipment, a VA under professional services. A security tag per
        project or line item (a proposed field, same shape as the AI tag) would give this view its spend column, and
        the cybersecurity budget conversation its numbers.
      </InsightBox>

      {/* Annex 1 fleet + advisory: proposed fields */}
      <ProposedOnly mode={mode} requires="the Annex 1 asset inventory as structured fields (proposed)">
        <Panel title="Fleet exposure and advisory blast radius" sub="Annex 1 inventory as data (proposed) · fictitious models" icon={ShieldAlert}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            <PostureTile label="Endpoints on supported OS" value={`${Math.round(((endpoints - endpointsEol) / endpoints) * 100)}%`} sub={`${endpoints.toLocaleString("en-PH")} devices`} />
            <PostureTile label="Servers past support" value={String(serversEol)} sub="vendor EOL, all fleets" />
            <PostureTile label="Network gear past support" value={String(fleets.reduce((s, f) => s + f.networkEol, 0))} sub="switches, radios, edge" />
            <PostureTile label="Advisory exposure" value={String(advUnits)} sub={`${adv.model} units`} danger />
          </div>

          <div className="rounded-lg border border-destructive/30 bg-danger-bg/40 p-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
              <p className="text-sm font-semibold leading-snug">
                {adv.id} (mock) · <AdvisoryTitle title={adv.title} model={adv.model} />
              </p>
              <span className="inline-flex items-center rounded-full bg-destructive text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {adv.severity}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              {adv.kind.charAt(0).toUpperCase() + adv.kind.slice(1)} <span className="font-medium text-foreground">{adv.model}</span>,
              vendor support ended before the advisory, so there is no patch: affected units must be replaced. Published{" "}
              {formatDay(adv.published)} (fictitious).
            </p>
            <div className="overflow-x-auto rounded-md border bg-card">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th scope="col" className="border-b px-2.5 py-1.5 text-left font-semibold">Agency</th>
                    <th scope="col" className="border-b px-2.5 py-1.5 text-right font-semibold">Units</th>
                    <th scope="col" className="border-b px-2.5 py-1.5 text-left font-semibold">Replacement in the plan?</th>
                  </tr>
                </thead>
                <tbody>
                  {advRows.map((h) => (
                    <tr key={h.slug} className="border-b last:border-b-0">
                      <td className="px-2.5 py-1.5">
                        <Link href={`/repository/${h.slug}`} className="font-medium hover:underline">
                          {h.acronym}
                        </Link>
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{h.units}</td>
                      <td className="px-2.5 py-1.5">
                        {h.refreshInPlan ? (
                          <span className="text-success">
                            ✓ {h.refreshProject}
                          </span>
                        ) : (
                          <span className="text-destructive font-medium">✗ none in plan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-2.5">
              When a national CERT advisory lands, the corpus answers in one query: who runs the model, how many
              units, and whether replacement money already exists. That inventory is Annex 1 of the ISSP, carried as
              structured data in a revised form.
            </p>
          </div>
        </Panel>
      </ProposedOnly>
    </div>
  );
}

const GROUP_SHORT: Record<string, string> = {
  physical: "Physical",
  perimeter: "Perimeter",
  network: "Network",
  endpoint: "Endpoint",
  data: "Data",
  application: "App",
  other: "Sec ops",
};

function groupShort(key: string): string {
  return GROUP_SHORT[key] ?? key;
}

function CoverageCell({ share, label, strong }: { share: number; label: string; strong?: boolean }) {
  const band = share >= 0.999 ? "high" : share >= 0.5 ? "mid" : share > 0 ? "low" : "none";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        band === "high" && "bg-success-bg text-success border border-success-border",
        band === "mid" && "bg-warning-bg text-warning border border-warning-border",
        band === "low" && "bg-danger-bg text-destructive border border-danger-border",
        band === "none" && "bg-muted text-muted-foreground border border-foreground/15",
        strong && "px-2.5"
      )}
    >
      {label}
    </span>
  );
}

function CellSwatch({ band }: { band: "none" | "low" | "mid" | "high" }) {
  return (
    <span
      className={cn(
        "inline-block w-2.5 h-2.5 rounded-sm border",
        band === "high" && "bg-success-bg border-success-border",
        band === "mid" && "bg-warning-bg border-warning-border",
        band === "low" && "bg-danger-bg border-danger-border",
        band === "none" && "bg-muted text-muted-foreground border-foreground/15"
      )}
    />
  );
}

/** Advisory title with the model number kept on one line ("NetGate FX-200" must not hyphen-break). */
function AdvisoryTitle({ title, model }: { title: string; model: string }) {
  const at = title.indexOf(model);
  if (at === -1) return <>{title}</>;
  return (
    <>
      {title.slice(0, at)}
      <span className="whitespace-nowrap">{model}</span>
      {title.slice(at + model.length)}
    </>
  );
}
