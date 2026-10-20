"use client";

/**
 * Budget Examiner Brief (demonstration) — an A4, print-ready one-pager for a
 * technical budget hearing, generated from one agency's corpus record plus
 * the mock COMPASS layer. Plan figures are real corpus data; NEP and execution
 * figures are illustrative (proposed COMPASS link).
 */

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { useCorpus, TYPE_LABELS } from "@/lib/repository/corpus";
import type { CorpusProfile } from "@/lib/repository/corpus-types";
import { cn, php, phpCompact } from "@/lib/utils";

const FOCUS_YEAR = 2027;

export function ExaminerBrief() {
  const params = useParams<{ slug?: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { corpus, error } = useCorpus();
  const agencies = corpus?.agencies ?? [];
  const initial = params.slug ?? search.get("agency") ?? "pdrio-2027-2029";
  const [slug, setSlug] = useState(initial);

  const agency = agencies.find((a) => a.slug === slug);
  const compassAgency = corpus?.compass.agencies.find((ca) => ca.slug === slug);
  const fy25 = compassAgency?.years.find((y) => y.year === 2025);
  const fy27 = compassAgency?.years.find((y) => y.year === 2027);
  const brief = agency ? buildBrief(agency, fy27, fy25) : null;

  return (
    <PublicShell active="budget">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <Link href="/budget" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Budget Dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                router.replace(`/budget/report/examiner?agency=${e.target.value}`);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            >
              {agencies.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.acronym} — {a.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary text-primary-foreground px-3.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-danger-bg text-destructive px-4 py-3 text-sm no-print">{error}</div>
        ) : !corpus || !agency || !brief ? (
          <div className="h-96 rounded-xl bg-muted animate-pulse" aria-busy />
        ) : (
          <article className="report-page">
            <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } .report-page { box-shadow: none; margin: 0; width: 100%; max-width: none; } } @page { size: A4; margin: 12mm; }`}</style>

            <header className="flex justify-between items-center border-b-2 border-[var(--sidebar)] pb-2">
              <span className="report-eyebrow text-[var(--sidebar)]">Budget Examiner Brief · FY{FOCUS_YEAR} Technical Budget Hearing</span>
              <span className="report-eyebrow text-destructive">Illustrative · fictitious data</span>
            </header>

            <div>
              <h1 className="text-[22px] font-bold leading-tight">{agency.name}</h1>
              <p className="text-[11px] text-muted-foreground mt-1">
                {TYPE_LABELS[agency.type]} · ISSP {agency.cycleLabel} · Amendment {agency.amendmentNumber} ·{" "}
                {agency.identifiers.dictEndorsement ? `DICT-endorsed ${agency.identifiers.dictEndorsement.ref}` : "not yet endorsed"} ·{" "}
                UACS org {agency.identifiers.uacsOrgCode} (mock) · Built 20 Oct 2026 from the agency&apos;s .issp file and COMPASS (proposed link)
              </p>
            </div>

            {/* Headline tiles */}
            <div className="grid grid-cols-4 gap-2">
              <Tile label={`FY${FOCUS_YEAR} ISSP ask`}>{brief.ask === null ? "—" : phpCompact(brief.ask)}</Tile>
              <Tile label="In the NEP">
                {brief.nep === null ? "—" : `${phpCompact(brief.nep)} · ${brief.ask ? Math.round((brief.nep / brief.ask) * 100) : 0}%`}
              </Tile>
              <Tile label="FY2025 obligation rate" danger={fy25 && fy25.obligated && fy25.allotment ? fy25.obligated / fy25.allotment < 0.7 : false}>
                {fy25?.obligated && fy25?.allotment ? `${Math.round((fy25.obligated / fy25.allotment) * 100)}%` : "—"}
              </Tile>
              <Tile label="Continuing costs">
                {phpCompact(brief.ccFirst)} → {phpCompact(brief.ccLast)}
                <span className="block text-[10px] text-muted-foreground font-normal">
                  FY{agency.cycle.startYear} → FY{agency.cycle.endYear}
                </span>
              </Tile>
            </div>

            {/* 1. What the ask contains */}
            <Section title={`1. What the FY${FOCUS_YEAR} ask contains`}>
              <table className="report-table">
                <thead>
                  <tr>
                    <th className="text-left">Project / category (₱)</th>
                    <th className="text-left">Type</th>
                    <th>ISSP ask</th>
                    <th>NEP</th>
                    <th>Gap</th>
                    <th className="text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {brief.rows.map((r) => (
                    <tr key={r.label}>
                      <td className="text-left">{r.label}</td>
                      <td className="text-left text-muted-foreground">{r.type}</td>
                      <td>{php(r.ask)}</td>
                      <td>{r.nep === null ? "—" : php(r.nep)}</td>
                      <td>{r.nep === null ? "—" : php(r.nep - r.ask)}</td>
                      <td className={cn("text-left", r.noteDestructive ? "text-destructive" : "text-muted-foreground")}>{r.note}</td>
                    </tr>
                  ))}
                  <tr className="report-total">
                    <td className="text-left">Total</td>
                    <td />
                    <td>{php(brief.ask ?? 0)}</td>
                    <td>{brief.nep === null ? "—" : php(brief.nep)}</td>
                    <td>{brief.nep === null ? "—" : php(brief.nep - (brief.ask ?? 0))}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
              <p className="report-footnote">NEP split across projects is proportional to the agency NEP total (illustrative). Plan figures are the agency&apos;s Part IV (B.1 engine).</p>
            </Section>

            {/* 2. Execution record */}
            <Section title="2. Execution record (ICT, from COMPASS — proposed link)">
              <div className="space-y-1.5 text-[11px]">
                {[2025, 2026].map((year) => {
                  const rec = compassAgency?.years.find((y) => y.year === year);
                  if (!rec?.allotment) return null;
                  const oblig = rec.obligated ?? 0;
                  return (
                    <div key={year} className="grid grid-cols-[110px_1fr_190px] gap-2.5 items-center">
                      <span>{year === 2025 ? "FY2025 · closed" : "FY2026 · as of Q2"}</span>
                      <div className="h-3 rounded-sm bg-muted relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${(rec.allotment / rec.allotment) * 100}%`, background: "var(--muted-foreground)", opacity: 0.25 }} />
                        <div className="absolute inset-y-0 left-0 rounded-sm bg-[var(--sidebar)]" style={{ width: `${(oblig / rec.allotment) * 100}%` }} />
                      </div>
                      <span className="tabular-nums text-right">
                        {phpCompact(oblig)} of {phpCompact(rec.allotment)} · {Math.round((oblig / rec.allotment) * 100)}%
                      </span>
                    </div>
                  );
                })}
                <p className="text-[10px] text-muted-foreground">Grey = allotment released. Dark = obligated. FY2025 obligation-rate bands: On track ≥ 85% · Watch 70–84% · Low &lt; 70%.</p>
              </div>
            </Section>

            {/* 3. Flags */}
            <Section title="3. Flags">
              <div className="space-y-1.5">
                {brief.flags.length === 0 ? <p className="text-[11px] text-muted-foreground">No flags on this plan.</p> : null}
                {brief.flags.map((f) => (
                  <div key={f.text} className="grid grid-cols-[16px_1fr] gap-2 text-[11px] leading-snug">
                    <span className={cn("font-extrabold", f.level === "high" ? "text-destructive" : "text-warning")}>▲</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* 4. Questions */}
            <Section title="4. Questions for the hearing">
              <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
                {brief.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </Section>

            <footer className="mt-auto border-t pt-2 flex justify-between gap-4 text-[9px] text-muted-foreground">
              <span>
                Plan figures: agency .issp file, Part III-E and Part IV (B.1–B.4 engine). Budget and execution: COMPASS, matched by UACS PAP code (proposed). All data fictitious.
              </span>
              <span className="whitespace-nowrap">Page 1 of 1</span>
            </footer>
          </article>
        )}
      </div>
    </PublicShell>
  );
}

function buildBrief(
  agency: CorpusProfile,
  fy27: { plan?: number; nep?: number } | undefined,
  fy25: { obligated?: number; allotment?: number } | undefined
) {
  const i = FOCUS_YEAR - agency.cycle.startYear;
  const ask = i >= 0 && i < 3 ? agency.budget.grandTotals[i] : null;
  const nep = fy27?.nep ?? null;
  const nepRate = ask && nep ? nep / ask : null;
  const ccRow = agency.budget.b1.find((r) => r.label === "Continuing Costs");
  const ccFirst = ccRow?.year1 ?? 0;
  const ccLast = ccRow?.year3 ?? 0;

  const b1Rows = agency.budget.b1.slice(0, 4);
  const rows = [
    ...agency.projects
      .filter((p) => p.totalCost > 0)
      .map((p) => {
        const fyShare = (() => {
          const lines = agency.lineItems.filter((l) => l.projectId === p.id && l.year === FOCUS_YEAR);
          return lines.reduce((s, l) => s + l.total, 0);
        })();
        return {
          label: p.shortTitle,
          type: p.category === "crossAgency" ? "Cross-agency" : "Internal",
          ask: fyShare,
          nep: nepRate !== null ? Math.round(fyShare * nepRate) : null,
          note: p.papCode ? `PAP ${p.papCode} (mock)` : "No PAP code yet (mock)",
          noteDestructive: !p.papCode,
        };
      }),
    ...b1Rows
      .filter((r) => r.label === "Office Productivity" || r.label === "Continuing Costs")
      .map((r) => ({
        label: r.label,
        type: "—",
        ask: i >= 0 && i < 3 ? [r.year1, r.year2, r.year3][i] : 0,
        nep: nepRate !== null ? Math.round([r.year1, r.year2, r.year3][i >= 0 && i < 3 ? i : 0] * nepRate) : null,
        note: r.label === "Continuing Costs" ? `rises to ${phpCompact(r.total)} over 3 years` : "",
        noteDestructive: false,
      })),
  ].filter((r) => r.ask > 0);

  const flags: { text: string; level: "high" | "watch" }[] = [];
  const rate25 = fy25?.obligated && fy25?.allotment ? fy25.obligated / fy25.allotment : null;
  const ratio = ask && fy25?.obligated ? ask / fy25.obligated : null;
  if (ratio && ratio > 2 && rate25 && rate25 < 0.7) {
    flags.push({ text: `Ask is ${ratio.toFixed(1)}× FY2025 ICT obligations, in a year the agency obligated only ${Math.round(rate25 * 100)}% of its allotment.`, level: "high" });
  }
  if (ccLast > ccFirst * 2 && ccLast > 0) {
    flags.push({ text: `Continuing costs more than double across the plan (${phpCompact(ccFirst)} → ${phpCompact(ccLast)}) — a future MOOE floor of ${phpCompact(ccLast)} a year.`, level: "watch" });
  }
  const untagged = agency.projects.filter((p) => p.alignment.length === 0).reduce((s, p) => s + p.totalCost, 0);
  if (untagged > 0) {
    flags.push({ text: `${phpCompact(untagged)} of project cost carries no national-plan alignment tag.`, level: "watch" });
  }
  const noPap = agency.projects.filter((p) => !p.papCode);
  if (noPap.length > 0) {
    flags.push({ text: `${noPap.length} of ${agency.projects.length} projects have no PAP code yet — not traceable into the NEP/GAA (mock).`, level: "watch" });
  }

  const questions: string[] = [];
  if (rate25 !== null && rate25 < 0.7) questions.push(`What held FY2025 obligations at ${Math.round(rate25 * 100)}%, and what changed for FY${FOCUS_YEAR}?`);
  if (ccLast > ccFirst * 2) questions.push(`Who funds the ${phpCompact(ccLast)} of continuing costs in FY${agency.cycle.endYear} once the projects complete?`);
  if (ratio && ratio > 2) questions.push("Can the agency absorb this ask in one year, or should it be released in tranches tied to obligation milestones?");
  questions.push(`Which FY${FOCUS_YEAR} items can start procurement in Q1?`);

  return { ask, nep, ccFirst, ccLast, rows, flags, questions };
}

function Tile({ label, children, danger }: { label: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className="rounded border border-foreground/15 px-2.5 py-2">
      <p className="report-eyebrow">{label}</p>
      <p className={cn("text-lg font-extrabold tabular-nums leading-tight mt-0.5", danger && "text-destructive")}>{children}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-[13px] font-extrabold">{title}</h2>
      {children}
    </section>
  );
}
