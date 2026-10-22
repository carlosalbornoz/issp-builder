"use client";

/**
 * ICT Budget Dashboard (demonstration): the orchestrator. A sticky domain rail
 * and a persistent control bar (fiscal year · PDP sector · data mode · filters)
 * frame one of ten views; every view reads the same corpus and the same
 * filtering. Cross-agency views computed client-side from the corpus line
 * items, the same Part IV facts the editor's Summary tables use, plus the mock
 * COMPASS / Annex 1 / AI-tag layers for the follow-the-peso and posture
 * stories. Zero chart libraries.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, Lock } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { DemoNotice } from "@/components/repository/demo-notice";
import { useCorpus, TYPE_LABELS, SECTORS } from "@/lib/repository/corpus";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import type { CorpusProfile } from "@/lib/repository/corpus-types";
import { cn, phpCompact } from "@/lib/utils";
import { type AgencyLine, type DataMode, type FyFilter, FilterSelect } from "./views/shared";
import { NAV, SCREENS, isScreenKey, resolveScreen, screenHref } from "./nav";
import { HomeView } from "./views/home";
import { PostureView } from "./views/posture";
import { AskView } from "./views/ask";
import { BuysView } from "./views/buys";
import { DomainsView } from "./views/domains";
import { AgenciesView } from "./views/agencies";
import { AbsorptiveView } from "./views/absorptive";
import { CybersecurityView } from "./views/cybersecurity";
import { DevicesView } from "./views/devices";
import { NetworksView } from "./views/networks";
import { CloudView } from "./views/cloud";
import { AiView } from "./views/ai";
import { PeopleView } from "./views/people";
import { ServicesView } from "./views/services";
import { MoneyView } from "./views/money";
import { SharedServicesView } from "./views/shared-services";

const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));
const EMPTY_AGENCIES: CorpusProfile[] = [];

export function BudgetDashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const { corpus, error } = useCorpus();
  const [cycle, setCycle] = useState("all");
  const [type, setType] = useState("all");
  const [fund, setFund] = useState("all");
  const [fy, setFy] = useState<FyFilter>("all");

  // Deep links, straight from the URL: ?view= picks the domain view (default overview);
  // ?sector= filters to one PDP sector; ?agency=slug filters to one agency; ?program=key
  // spotlights it; ?mode=current runs the page on current-form data only.
  const sector = params.get("sector") ?? "all";
  const agencySlug = params.get("agency");
  const view = resolveScreen(params.get("view"), agencySlug);
  const highlightProgram = params.get("program");
  const dataMode: DataMode = params.get("mode") === "current" ? "current" : "proposed";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "all") next.delete(key);
    else next.set(key, value);
    router.replace(next.toString() ? `/budget?${next.toString()}` : "/budget");
  };

  const agencies = corpus?.agencies ?? EMPTY_AGENCIES;

  const selected = useMemo(
    () =>
      agencies.filter((a) => {
        if (agencySlug && a.slug !== agencySlug) return false;
        if (sector !== "all" && a.sector !== sector) return false;
        if (cycle !== "all" && a.cycleLabel !== cycle) return false;
        if (type !== "all" && a.type !== type) return false;
        return true;
      }),
    [agencies, agencySlug, sector, cycle, type]
  );

  const lines: AgencyLine[] = useMemo(
    () =>
      selected.flatMap((a) =>
        a.lineItems
          .filter((l) => fund === "all" || l.fundSource === fund)
          .map((l) => ({ ...l, acronym: a.acronym, slug: a.slug }))
      ),
    [selected, fund]
  );

  const cycles = useMemo(() => [...new Set(agencies.map((a) => a.cycleLabel))].sort(), [agencies]);
  const funds = useMemo(() => [...new Set(lines.map((l) => l.fundSource))], [lines]);

  const fyLabel = fy === "all" ? `across ${new Set(lines.map((l) => l.year)).size} fiscal years` : `FY${fy}`;
  const lineCount = lines.length.toLocaleString("en-PH");
  const lineTotal = lines.reduce((s, l) => s + l.total, 0);

  const viewProps = corpus ? { corpus, profiles: selected, lines, fy, mode: dataMode } : null;

  const exportCsv = () => {
    const header = ["agency", "acronym", "type", "cycle", "year", "category", "expense_class", "bucket", "project", "item", "office", "fund_source", "qty", "unit_cost", "total"];
    const rows = selected.flatMap((a) =>
      a.lineItems
        .filter((l) => fund === "all" || l.fundSource === fund)
        .map((l) => [
          a.name, a.acronym, a.type, a.cycleLabel, String(l.year),
          categoryNameById.get(l.categoryId) ?? l.categoryId, l.expenseClass, l.bucket, l.projectTitle ?? "",
          l.item, l.office, l.fundSource, String(l.qty), String(l.unitCost), String(l.total),
        ].map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "issp-line-items.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Keep the active rail item visible on narrow screens, where the rail scrolls.
  const railRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const active = railRef.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  }, [view]);


  return (
    <PublicShell active="budget" width="wide">
      {/* ── Sticky view rail + control bar ── */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-6">
          <nav ref={railRef} className="flex gap-1 overflow-x-auto -mx-1 px-1 py-2" aria-label="Dashboard views">
            {["home" as const, ...NAV.flatMap((g) => g.items).filter(isScreenKey)].map((key) => (
              <Link
                key={key}
                href={screenHref(key, params)}
                aria-current={view === key ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  view === key ? "text-primary font-medium bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {SCREENS[key].label}
              </Link>
            ))}
          </nav>

          {/* Control bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-2.5 pt-0.5">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="fy-filter-label">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground" id="fy-filter-label">
                Fiscal year
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(["all", 2026, 2027, 2028, 2029, 2030] as FyFilter[]).map((option) => (
                  <button
                    key={String(option)}
                    onClick={() => setFy(option)}
                    aria-pressed={fy === option}
                    className={cn(
                      "min-h-8 px-3 rounded-full border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      fy === option ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    )}
                  >
                    {option === "all" ? "All years" : `FY${option}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="sector-filter-label">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground" id="sector-filter-label">
                Sector
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setParam("sector", null)}
                  aria-pressed={sector === "all"}
                  title="All government (PDP-aligned sectors, mock assignment)"
                  className={cn(
                    "min-h-8 px-3 rounded-full border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    sector === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  All government
                </button>
                {SECTORS.map((s) => {
                  const count = agencies.filter((a) => a.sector === s.key).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setParam("sector", s.key)}
                      aria-pressed={sector === s.key}
                      title={`${s.label} · ${s.pdp}`}
                      className={cn(
                        "min-h-8 px-3 rounded-full border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        sector === s.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                      )}
                    >
                      {s.short} <span className="tabular-foreground opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="data-mode-label">
              <span
                id="data-mode-label"
                className="text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1"
              >
                Data mode
                <span
                  title={
                    dataMode === "current"
                      ? "This is today's form: every dimmed panel is one proposed field (or one link) away."
                      : "Flip to Current form to see what today's ISSP already yields: every dimmed panel is one proposed field (or one link) away."
                  }
                  tabIndex={0}
                  className="cursor-help inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <Info className="w-3 h-3 text-muted-foreground/80" aria-hidden />
                </span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["current", "Current form (v14)"],
                    ["proposed", "Revised form (proposed)"],
                  ] as [DataMode, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setParam("mode", value === "current" ? "current" : null)}
                    aria-pressed={dataMode === value}
                    className={cn(
                      "min-h-8 px-3 rounded-full border text-xs font-medium transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      dataMode === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    )}
                  >
                    {value === "current" ? <Lock className="w-3 h-3" /> : null}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2 pb-3">
            <FilterSelect ariaLabel="Filter by plan cycle"
              className="w-full sm:w-auto" value={cycle} onChange={setCycle} options={[["all", "All cycles"], ...cycles.map((c) => [c, c] as [string, string])]} />
            <FilterSelect
              ariaLabel="Filter by agency type"
              className="w-full sm:w-auto"
              value={type}
              onChange={setType}
              options={[["all", "All types"], ...(["NGA", "GOCC", "LGU", "OTHER"] as const).map((t) => [t, TYPE_LABELS[t]] as [string, string])]}
            />
            <FilterSelect ariaLabel="Filter by fund source"
              className="w-full sm:w-auto" value={fund} onChange={setFund} options={[["all", "All fund sources"], ...funds.map((f) => [f, f] as [string, string])]} />
            {agencySlug && (
              <button
                onClick={() => setParam("agency", null)}
                aria-label={`Clear agency filter: ${agencies.find((a) => a.slug === agencySlug)?.acronym ?? agencySlug}`}
                className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/5 px-2.5 h-9 text-sm text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                {agencies.find((a) => a.slug === agencySlug)?.acronym ?? agencySlug} ✕
              </button>
            )}
            <span className="text-xs text-muted-foreground ml-auto hidden md:inline">
              {lineCount} line items · {phpCompact(lineTotal)} {fyLabel}
            </span>
            {/* Nav carries this link from md up; below that the nav item is
                space-hidden, so the in-bar entry stays phone-only. */}
            <Link
              href="/budget/data-standard"
              className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent transition-colors md:hidden"
            >
              Data standard
            </Link>
          </div>
        </div>
      </div>

      {/* ── Page header + view content ── */}
      <section className="border-b bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Fiscal transparency · Structured ISSP data
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-3">ICT Budget Dashboard</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            The ICT posture of the whole government, one domain at a time: every figure is the same Part IV data
            behind each agency&apos;s official Summary of Investments, with a mock execution layer standing in for a
            future COMPASS link.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <DemoNotice className="mb-6" />

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-danger-bg text-destructive px-4 py-3 text-sm">
            {error} Try reloading the page.
          </div>
        ) : !viewProps ? (
          <div className="h-64 rounded-xl bg-muted animate-pulse" aria-busy />
        ) : selected.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No agencies match the current filters.{" "}
              <button
                className="font-medium text-primary hover:underline"
                onClick={() => {
                  setCycle("all");
                  setType("all");
                  setFund("all");
                  setParam("agency", null);
                  setParam("sector", null);
                }}
              >
                Clear all filters.
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {view === "home" ? (
              <HomeView {...viewProps} />
            ) : view === "posture" || view === "sectors" ? (
              <PostureView {...viewProps} />
            ) : view === "ask" ? (
              <AskView {...viewProps} fyLabel={fyLabel} />
            ) : view === "buys" ? (
              <BuysView {...viewProps} />
            ) : view === "domains" ? (
              <DomainsView />
            ) : view === "agencies" ? (
              <AgenciesView {...viewProps} fund={fund} exportCsv={exportCsv} />
            ) : view === "absorptive" ? (
              <AbsorptiveView {...viewProps} />
            ) : view === "cybersecurity" ? (
              <CybersecurityView {...viewProps} />
            ) : view === "devices" ? (
              <DevicesView {...viewProps} />
            ) : view === "networks" ? (
              <NetworksView {...viewProps} />
            ) : view === "cloud" ? (
              <CloudView {...viewProps} />
            ) : view === "ai" ? (
              <AiView {...viewProps} />
            ) : view === "people" ? (
              <PeopleView {...viewProps} />
            ) : view === "services" ? (
              <ServicesView {...viewProps} />
            ) : view === "money" ? (
              <MoneyView {...viewProps} />
            ) : (
              <SharedServicesView {...viewProps} highlightProgram={highlightProgram} />
            )}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
