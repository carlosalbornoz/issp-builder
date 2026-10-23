"use client";

/**
 * ICT Budget Dashboard (demonstration): the orchestrator. A grouped sidebar and
 * a one-row scope bar (fiscal year · PDP sector · agency · data mode · filters)
 * frame one screen per question; every screen reads the same corpus and the
 * same filtering. Cross-agency figures are computed client-side from the corpus
 * line items, the same Part IV facts the editor's Summary tables use, plus the
 * mock COMPASS / Annex 1 / AI-tag layers for the execution and posture stories.
 * Zero chart libraries.
 */

import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BudgetFrame } from "./budget-frame";
import { ScopeBar } from "./scope-bar";
import { DemoNotice } from "@/components/repository/demo-notice";
import { useCorpus, TYPE_LABELS, SECTORS, BUCKETS } from "@/lib/repository/corpus";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import type { CorpusProfile } from "@/lib/repository/corpus-types";
import { phpCompact } from "@/lib/utils";
import type { AgencyLine, DataMode, FyFilter } from "./views/shared";
import { resolveScreen } from "./nav";
import { HomeView } from "./views/home";
import { PostureView } from "./views/posture";
import { AskView } from "./views/ask";
import { BuysView } from "./views/buys";
import { DomainsView } from "./views/domains";
import { SectorsView } from "./views/sectors";
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
const FY_VALUES = [2026, 2027, 2028, 2029, 2030] as const satisfies readonly FyFilter[];
const TYPE_KEYS = ["NGA", "GOCC", "LGU", "OTHER"] as const;
const BUCKET_KEYS: readonly string[] = BUCKETS.map((b) => b.key);

export function BudgetDashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const { corpus, error } = useCorpus();

  // Deep links, straight from the URL: ?view= picks the screen (legacy keys
  // resolve to their successor; default Home); ?sector= filters to one PDP
  // sector; ?agency=slug filters to one agency; ?program= spotlights it;
  // ?mode=current runs the page on current-form data only.
  const sector = params.get("sector") ?? "all";
  const agencySlug = params.get("agency");
  const view = resolveScreen(params.get("view"), agencySlug);
  const highlightProgram = params.get("program");
  const dataMode: DataMode = params.get("mode") === "current" ? "current" : "proposed";

  // Every scope change is one router.replace built from the current URL. The
  // resolved screen is written into ?view= first, so clearing the agency on a
  // bare ?agency= link (which opens Investment summary) stays on that screen.
  // A ref carries the latest written query until the URL catches up, so rapid
  // changes cannot overwrite each other from a stale snapshot.
  const writtenRef = useRef<URLSearchParams | null>(null);
  useEffect(() => {
    writtenRef.current = null;
  }, [params]);
  const replaceScope = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams((writtenRef.current ?? params).toString());
    if (!next.has("view") && view !== "home") next.set("view", view);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === "all") next.delete(key);
      else next.set(key, value);
    });
    writtenRef.current = next;
    router.replace(next.toString() ? `/budget?${next.toString()}` : "/budget");
  };
  const setParam = (key: string, value: string | null) => replaceScope({ [key]: value });
  // The secondary controls write through the same URL writer, so the whole
  // scope bar is shareable and survives every round trip.
  const setFy = (v: FyFilter) => setParam("fy", v === "all" ? "all" : String(v));
  const setCycle = (v: string) => setParam("cycle", v);
  const setType = (v: string) => setParam("type", v);
  const setFund = (v: string) => setParam("fund", v);
  const setClass = (v: string) => setParam("class", v);
  const setBucket = (v: string) => setParam("bucket", v);

  const agencies = corpus?.agencies ?? EMPTY_AGENCIES;

  // Invalid URL values (a stale corpus, a hand-edited link) fall back to "all".
  const cycles = useMemo(() => [...new Set(agencies.map((a) => a.cycleLabel))].sort(), [agencies]);
  const fyParam = params.get("fy");
  const fy: FyFilter = FY_VALUES.includes(Number(fyParam) as (typeof FY_VALUES)[number]) ? (Number(fyParam) as FyFilter) : "all";
  const cycleParam = params.get("cycle");
  const cycle = cycleParam !== null && cycles.includes(cycleParam) ? cycleParam : "all";
  const typeParam = params.get("type");
  const type = typeParam !== null && TYPE_KEYS.includes(typeParam as (typeof TYPE_KEYS)[number]) ? typeParam : "all";

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

  const allLines: AgencyLine[] = useMemo(
    () => selected.flatMap((a) => a.lineItems.map((l) => ({ ...l, acronym: a.acronym, slug: a.slug }))),
    [selected]
  );
  // Fund options come from the unfiltered lines, so picking a fund never
  // shrinks its own dropdown.
  const funds = useMemo(() => [...new Set(allLines.map((l) => l.fundSource))], [allLines]);
  const fundParam = params.get("fund");
  const fund = fundParam !== null && funds.includes(fundParam) ? fundParam : "all";
  // Expense class: the examiner's asset-vs-recurring split (Capital outlay / MOOE).
  const classParam = params.get("class");
  const expenseClass = classParam === "capitalOutlay" || classParam === "mooe" ? classParam : "all";
  // Strategic bucket (Part IV B.x: new projects vs subscriptions we already pay).
  const bucketParam = params.get("bucket");
  const bucket = bucketParam !== null && BUCKET_KEYS.includes(bucketParam) ? bucketParam : "all";
  const lines: AgencyLine[] = useMemo(
    () =>
      allLines.filter(
        (l) =>
          (fund === "all" || l.fundSource === fund) &&
          (expenseClass === "all" || l.expenseClass === expenseClass) &&
          (bucket === "all" || l.bucket === bucket)
      ),
    [allLines, fund, expenseClass, bucket]
  );

  const fyLabel = fy === "all" ? `across ${new Set(lines.map((l) => l.year)).size} fiscal years` : `FY${fy}`;
  // The toolbar readout and the CSV carry the same FY scope the screens show.
  const scopedLines = fy === "all" ? lines : lines.filter((l) => l.year === fy);
  const lineCount = scopedLines.length.toLocaleString("en-PH");
  const lineTotal = scopedLines.reduce((s, l) => s + l.total, 0);

  const viewProps = corpus ? { corpus, profiles: selected, lines, fy, mode: dataMode } : null;

  const exportCsv = () => {
    const header = ["agency", "acronym", "type", "cycle", "year", "category", "expense_class", "bucket", "project", "item", "office", "fund_source", "qty", "unit_cost", "total"];
    const rows = selected.flatMap((a) =>
      a.lineItems
        .filter((l) => (fund === "all" || l.fundSource === fund) && (fy === "all" || l.year === fy) && (expenseClass === "all" || l.expenseClass === expenseClass) && (bucket === "all" || l.bucket === bucket))
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

  return (
    <BudgetFrame
      active={view}
      params={params}
      toolbar={
        <ScopeBar
          sectors={SECTORS.map((s) => ({ key: s.key, label: s.label, count: agencies.filter((a) => a.sector === s.key).length })).filter((s) => s.count > 0)}
          sector={sector}
          onSector={(key) => setParam("sector", key)}
          fy={fy}
          onFy={setFy}
          cycle={cycle}
          onCycle={setCycle}
          cycleOptions={[["all", "All cycles"], ...cycles.map((c) => [c, c] as [string, string])]}
          type={type}
          onType={setType}
          typeOptions={[["all", "All types"], ...TYPE_KEYS.map((t) => [t, TYPE_LABELS[t]] as [string, string])]}
          fund={fund}
          onFund={setFund}
          fundOptions={[["all", "All fund sources"], ...funds.map((f) => [f, f] as [string, string])]}
          expenseClass={expenseClass}
          onClass={setClass}
          classOptions={[["all", "All expense classes"], ["capitalOutlay", "Capital outlay"], ["mooe", "MOOE"]]}
          bucket={bucket}
          onBucket={setBucket}
          bucketOptions={[["all", "All strategic buckets"], ...BUCKETS.map((b) => [b.key, b.label] as [string, string])]}
          agency={agencySlug ? { slug: agencySlug, acronym: agencies.find((a) => a.slug === agencySlug)?.acronym ?? agencySlug } : undefined}
          onClearAgency={() => setParam("agency", null)}
          mode={dataMode}
          onMode={(m) => setParam("mode", m === "current" ? "current" : null)}
          summary={corpus ? `${lineCount} line items · ${phpCompact(lineTotal)} ${fyLabel}` : "Loading the corpus"}
        />
      }
    >
        {view === "home" ? <DemoNotice className="mb-6" /> : null}

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
                  replaceScope({ agency: null, sector: null, fy: "all", cycle: "all", type: "all", fund: "all", class: "all", bucket: "all" });
                }}
              >
                Clear all filters
              </button>.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {view === "home" ? (
              <HomeView {...viewProps} params={params} fyLabel={fyLabel} />
            ) : view === "posture" ? (
              <PostureView {...viewProps} />
            ) : view === "sectors" ? (
              <SectorsView {...viewProps} params={params} />
            ) : view === "ask" ? (
              <AskView {...viewProps} fyLabel={fyLabel} />
            ) : view === "buys" ? (
              <BuysView {...viewProps} />
            ) : view === "domains" ? (
              <DomainsView {...viewProps} params={params} />
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
              <MoneyView {...viewProps} params={params} />
            ) : (
              <SharedServicesView {...viewProps} highlightProgram={highlightProgram} />
            )}
          </div>
        )}
    </BudgetFrame>
  );
}
