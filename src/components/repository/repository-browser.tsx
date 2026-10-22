"use client";

/**
 * Public ISSP Repository — list surface (demonstration).
 * Search + filters over the fictitious corpus, cards/table views, and a
 * cross-agency programs section. Mirrors the marketing home page's rhythm
 * (hero → stats → bordered sections with bg-secondary/30 alternation).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarRange,
  Download,
  FolderSearch,
  Grid3x3,
  Layers,
  List,
  Search,
  X,
} from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { DemoNotice } from "@/components/repository/demo-notice";
import { PlanStatusPill } from "@/components/ui/plan-status-pill";
import { useCorpus, TYPE_LABELS, TYPE_SHORT, BUCKETS } from "@/lib/repository/corpus";
import type { CorpusProfile } from "@/lib/repository/corpus-types";
import { cn, phpCompact } from "@/lib/utils";

type SortKey = "total" | "agency" | "updated";

const EMPTY_AGENCIES: CorpusProfile[] = [];

export function RepositoryBrowser() {
  const { corpus, error } = useCorpus();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [cycle, setCycle] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [sort, setSort] = useState<SortKey>("total");

  const agencies = corpus?.agencies ?? EMPTY_AGENCIES;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = agencies.filter((a) => {
      if (type !== "all" && a.type !== type) return false;
      if (cycle !== "all" && a.cycleLabel !== cycle) return false;
      if (status !== "all" && a.planStatus !== status) return false;
      if (!needle) return true;
      return (
        a.name.toLowerCase().includes(needle) ||
        a.acronym.toLowerCase().includes(needle) ||
        a.tagline.toLowerCase().includes(needle) ||
        a.projects.some((p) => p.title.toLowerCase().includes(needle)) ||
        a.systems.some((s) => s.name.toLowerCase().includes(needle))
      );
    });
    return [...list].sort((a, b) => {
      if (sort === "agency") return a.name.localeCompare(b.name);
      if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
      return b.budget.grandTotal - a.budget.grandTotal;
    });
  }, [agencies, q, type, cycle, status, sort]);

  const cycles = useMemo(() => [...new Set(agencies.map((a) => a.cycleLabel))].sort(), [agencies]);

  const activeChips = [
    type !== "all" && { key: "type", label: TYPE_SHORT[type] ?? type, clear: () => setType("all") },
    cycle !== "all" && { key: "cycle", label: cycle, clear: () => setCycle("all") },
    status !== "all" && { key: "status", label: status === "for_review" ? "For review" : status, clear: () => setStatus("all") },
    q.trim() !== "" && { key: "q", label: `“${q.trim()}”`, clear: () => setQ("") },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <PublicShell active="repository">
      {/* ── Hero ── */}
      <section className="border-b bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Public archive · Structured ISSP data
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-3">Public ISSP Repository</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-8">
            Every agency ISSP, filed as structured data instead of buried PDFs: searchable by agency, program,
            project or system, with budgets that mean the same thing across agencies because they come from the same
            DICT 2026 template.
          </p>

          {error ? null : (
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Plans on file" value={corpus ? String(corpus.totals.plans) : "…"} icon={Layers} />
              <Stat label="Agencies" value={corpus ? String(corpus.totals.agencies) : "…"} icon={Building2} />
              <Stat label="3-yr ICT investment" value={corpus ? phpCompact(corpus.totals.grandTotal) : "…"} icon={CalendarRange} />
              <Stat
                label="Cross-agency programs"
                value={corpus ? String(corpus.totals.crossAgencyCount) : "…"}
                icon={FolderSearch}
              />
            </dl>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <DemoNotice />

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-danger-bg text-destructive px-4 py-3 text-sm">
            {error} Try reloading the page.
          </div>
        ) : !corpus ? (
          <LoadingState />
        ) : (
          <>
            {/* ── Search & filters ── */}
            <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 space-y-3">
              <div className="flex flex-col lg:flex-row gap-3">
                <label className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search agency, project or system…"
                    aria-label="Search plans"
                    className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <FilterSelect ariaLabel="Filter by agency type" value={type} onChange={setType} options={[["all", "All types"], ...(["NGA", "GOCC", "LGU", "OTHER"] as const).map((t) => [t, TYPE_LABELS[t]] as [string, string])]} />
                  <FilterSelect ariaLabel="Filter by plan cycle" value={cycle} onChange={setCycle} options={[["all", "All cycles"], ...cycles.map((c) => [c, c] as [string, string])]} />
                  <FilterSelect
                    ariaLabel="Filter by plan status"
                    value={status}
                    onChange={setStatus}
                    options={[
                      ["all", "Any status"],
                      ["submitted", "Submitted"],
                      ["for_review", "For review"],
                      ["draft", "Draft"],
                    ]}
                  />
                  <FilterSelect
                    ariaLabel="Sort plans"
                    value={sort}
                    onChange={(v) => setSort(v as SortKey)}
                    options={[
                      ["total", "Sort: total investment"],
                      ["agency", "Sort: agency A–Z"],
                      ["updated", "Sort: recently updated"],
                    ]}
                  />
                </div>
                <div className="flex rounded-md border border-input overflow-hidden h-9 self-start" role="group" aria-label="Result view">
                  <button
                    onClick={() => setView("cards")}
                    aria-label="Card view"
                    aria-pressed={view === "cards"}
                    className={cn("px-2.5 flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60", view === "cards" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground")}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView("table")}
                    aria-label="Table view"
                    aria-pressed={view === "table"}
                    className={cn("px-2.5 flex items-center border-l border-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60", view === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground")}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {activeChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">
                    {filtered.length} of {corpus.agencies.length} plans
                  </span>
                  {activeChips.map((chip) => (
                    <button
                      key={chip.key}
                      onClick={chip.clear}
                      className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground hover:bg-accent transition-colors"
                    >
                      {chip.label}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Results ── */}
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No plans match those filters.{" "}
                  <button
                    className="font-medium text-primary hover:underline"
                    onClick={() => {
                      setQ("");
                      setType("all");
                      setCycle("all");
                      setStatus("all");
                    }}
                  >
                    Clear all filters.
                  </button>
                </p>
              </div>
            ) : view === "cards" ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((a) => (
                  <AgencyCard key={a.slug} agency={a} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Agency</th>
                      <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Type</th>
                      <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Cycle</th>
                      <th scope="col" className="border-b px-3 py-2 text-center font-semibold">Projects</th>
                      <th scope="col" className="border-b px-3 py-2 text-center font-semibold">Systems</th>
                      <th scope="col" className="border-b px-3 py-2 text-right font-semibold">3-yr total</th>
                      <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.slug} className="border-b last:border-b-0 hover:bg-accent/20">
                        <td className="px-3 py-2">
                          <Link href={`/repository/${a.slug}`} className="font-medium hover:underline">
                            {a.acronym}
                          </Link>
                          <span className="text-muted-foreground"> · {a.name}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{TYPE_SHORT[a.type]}</td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{a.cycleLabel}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{a.counts.internalProjects + a.counts.crossAgencyProjects}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{a.counts.systems}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{phpCompact(a.budget.grandTotal)}</td>
                        <td className="px-3 py-2">
                          <PlanStatusPill status={a.planStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Cross-agency programs ── */}
            {corpus.crossAgencyPrograms.length > 0 && (
              <section className="pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Program convergence
                </p>
                <h2 className="font-display text-lg font-bold tracking-tight mb-4">Cross-agency programs in this corpus</h2>
                <div className="grid md:grid-cols-3 gap-4">
                {corpus.crossAgencyPrograms.map((p) => (
                  <Link
                    key={p.key}
                    href={`/budget?view=shared&program=${p.key}`}
                    className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 hover:bg-accent/30 transition-colors flex flex-col"
                  >
                    <p className="text-sm font-semibold leading-snug mb-2 text-balance">{p.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3 text-pretty">{p.description}</p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{p.participants.join(" · ")}</span>
                      <span className="text-xs font-semibold tabular-nums text-primary whitespace-nowrap">{phpCompact(p.combinedCost)}</span>
                    </div>
                  </Link>
                ))}
                </div>
              </section>
            )}

            <p className="text-xs text-muted-foreground pt-2">
              Every plan entry links to a full detail page (Parts I–IV) and downloads as a real{" "}
              <code className="rounded bg-muted px-1 py-0.5">.issp</code> file that opens in the ISSP Builder editor.{" "}
              <Download className="inline w-3 h-3 -mt-0.5" /> Totals are computed by the same aggregation engine as the
              editor&apos;s official Summary of Investments (B.1–B.4).
            </p>
          </>
        )}
      </div>
    </PublicShell>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg ring-1 ring-foreground/10 bg-card px-4 py-3 flex items-center gap-3">
      <span className="w-8 h-8 rounded-md bg-secondary border flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
        <dd className="text-lg font-bold tabular-nums leading-tight truncate">{value}</dd>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/50"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function AgencyCard({ agency: a }: { agency: CorpusProfile }) {
  const bucketTotals = BUCKETS.map((b) => ({
    ...b,
    amount: a.budget.b1.find((r) => r.label === b.label)?.total ?? 0,
  }));
  const maxBucket = Math.max(...bucketTotals.map((b) => b.amount), 1);
  return (
    <Link
      href={`/repository/${a.slug}`}
      className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 flex flex-col gap-3 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="min-w-9 h-9 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 px-1 leading-none">
            {a.acronym}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{a.acronym}</p>
            <p className="text-xs text-muted-foreground truncate">{a.name}</p>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap">
          <PlanStatusPill status={a.planStatus} />
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{a.tagline}</p>

      <div className="flex flex-wrap gap-1.5">
        <Chip>{TYPE_SHORT[a.type]}</Chip>
        <Chip>{a.cycleLabel}</Chip>
        <Chip>
          {(() => {
            const n = a.counts.internalProjects + a.counts.crossAgencyProjects;
            return `${n} ${n === 1 ? "project" : "projects"}`;
          })()}
        </Chip>
        <Chip>
          {(() => {
            const n = a.counts.systems;
            return `${n} ${n === 1 ? "system" : "systems"}`;
          })()}
        </Chip>
      </div>

      <div className="mt-auto pt-1">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">3-yr ICT investment</span>
          <span className="text-sm font-bold tabular-nums text-primary">{phpCompact(a.budget.grandTotal)}</span>
        </div>
        <div className="h-1.5 rounded-sm bg-muted overflow-hidden flex" aria-hidden>
          {bucketTotals.map((b) =>
            b.amount > 0 ? (
              <div key={b.key} style={{ width: `${(b.amount / maxBucket) * 100}%`, background: b.color }} className="h-full first:rounded-l-sm last:rounded-r-sm" />
            ) : null
          )}
        </div>
      </div>
    </Link>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-20 rounded-xl bg-muted animate-pulse" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center pt-2">Loading corpus…</p>
    </div>
  );
}
