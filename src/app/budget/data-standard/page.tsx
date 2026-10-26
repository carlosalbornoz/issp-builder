"use client";

/**
 * Data standard page (demonstration) — the pitch behind the mockups: what the
 * ISSP already carries as structured data, the seven join keys that would
 * connect it to COMPASS, and the publishing rules for an open-data release.
 */

import Link from "next/link";
import { Fragment, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheck, Plus } from "lucide-react";
import { ScopedBudgetFrame } from "@/components/budget/budget-frame";
import { CAPABILITY_MATRIX } from "@/lib/repository/data-standard";
import { DemoNotice } from "@/components/repository/demo-notice";

const STAKEHOLDER_QUESTIONS = [
  { who: "DBM · budget examiners", q: "Is this ask in the plan, and can the agency spend it?", detail: "Plan vs NEP per project · past obligation rate · future MOOE each project creates." },
  { who: "DICT · ISSP evaluators", q: "Does it follow national ICT policy?", detail: "E-Government Master Plan tags · cloud-first · cybersecurity controls · duplicate builds." },
  { who: "DICT · national CERT", q: "Who runs the affected model when an advisory lands?", detail: "Annex 1 asset inventory × advisories × replacement budgets, answered in one query." },
  { who: "COA · Ombudsman", q: "Did the contract buy what the plan listed?", detail: "Line item ↔ PhilGEPS award ↔ obligation, by one project key." },
  { who: "Congress budget offices", q: "Which changes fund a planned project?", detail: "Each GAA change matched to an ISSP project, or to none." },
  { who: "Agency head · CIO", q: "Are we on track against our own plan?", detail: "KPI actuals vs targets · execution per project · next-year commitments." },
  { who: "Citizens · CSOs · media", q: "Which digital services do I get, and when?", detail: "Plain-language projects, results and money, per agency and place." },
] as const;

const FIELD_MAP = [
  { group: "Already structured", rows: [
    { field: "Agency name, acronym, type (NGA · GOCC · LGU · other)", part: "Envelope", joins: "COMPASS agency list (by name)", answers: "Who plans it" },
    { field: "Plan years, amendment number, plan status", part: "Envelope", joins: "–", answers: "Which version is official" },
    { field: "Project ID, title, category, duration", part: "III-E", joins: "–", answers: "What is planned, when" },
    { field: "Strategic alignment and harmonization tags", part: "III-E", joins: "National plans (EGMP, NCSP, PIP, PCB)", answers: "Why it is needed" },
    { field: "Linked information systems (classification, hosting, interoperability)", part: "III-E ↔ II-C, III-D", joins: "Other agencies' plans", answers: "Duplicate builds, cloud-first" },
    { field: "Line items: item, office, quantity, unit cost (total is derived)", part: "IV", joins: "–", answers: "What the money buys" },
    { field: "Expense category (30 DICT categories) and CO / MOOE class", part: "IV", joins: "UACS object codes (by name)", answers: "Comparable spending" },
    { field: "Fund source", part: "IV", joins: "GAA · foreign-assisted · local · income", answers: "Who pays" },
    { field: "KPIs: hierarchy, indicator, baseline, 3 yearly targets", part: "III-F", joins: "DIME · agency performance", answers: "Results promised" },
    { field: "Cybersecurity control checklist (29 Yes/No controls, 7 groups)", part: "II-B", joins: "DICT · national CERT", answers: "Whole-of-government control coverage (the Cybersecurity view)" },
    { field: "System storage / access type per information system", part: "II-C · III-D", joins: "Cloud-first checks", answers: "Where systems live, and how citizens reach them" },
  ] },
  { group: "Join keys to add", rows: [
    { field: "UACS organization code", part: "Envelope", joins: "COMPASS · NEP · GAA", answers: "Exact agency match, no name guessing", add: true },
    { field: "UACS PAP code per project", part: "III-E", joins: "NEP · GAA · allotments", answers: "Plan row ↔ budget row", add: true },
    { field: "UACS object code per line item (from the category)", part: "IV", joins: "Allotments · obligations", answers: "Spending ↔ plan, by object", add: true, caveat: "category → object is many-to-many; store it manually or let COMPASS map it on its side" },
    { field: "DICT endorsement reference and date", part: "Envelope", joins: "DICT", answers: "Which plan the budget used", add: true },
    { field: "PhilGEPS reference per procured item", part: "IV (execution)", joins: "PhilGEPS", answers: "Contract ↔ line item", add: true, caveat: "execution state goes stale inside a 3-year plan; joining via the PAP code may be enough" },
    { field: "KPI actuals per year", part: "III-F", joins: "DIME", answers: "Results delivered", add: true },
    { field: "PSGC code per implementing office", part: "I · IV office", joins: "COMPASS regional view", answers: "Where the money lands", add: true },
  ] },
  { group: "Deeper fields for the revised ISSP (v15 candidates)", rows: [
    { field: "ICT asset inventory (Annex 1): make, model, class, count, OS, support status", part: "Annex 1", joins: "National CERT advisories · DICT asset views", answers: "Who runs an affected model, and is replacement budgeted", add: true, caveat: "shown as mock data on the posture views: the government cyber-posture picture" },
    { field: "AI / compute tag per project: own-build, shared platform, adoption, or teaching", part: "III-E", joins: "National compute planning", answers: "Which AI asks duplicate shared compute", add: true, caveat: "one checkbox per project; powers the spend-wave review" },
    { field: "Security tag per project or line item", part: "III-E · IV", joins: "Security spend views", answers: "What the cybersecurity budget actually buys", add: true, caveat: "none of the 30 DICT categories is security-specific, so today's form cannot see security spend" },
    { field: "PDP sector code per agency (aligned to PDP 2023-2028 chapters)", part: "Envelope", joins: "PDP / RDP results matrices", answers: "ICT posture per functional sector (mock in the corpus today)", add: true, caveat: "shown as the sector lens on the dashboard; mock assignment in the demonstration corpus" },
    { field: "Procurement stage per project-year (execution-side)", part: "IV (execution)", joins: "PhilGEPS", answers: "Has funded work started procurement", add: true, caveat: "agency-portal updates, not plan content: the plan holds the key, the portal the status" },
  ] },
] as const;

const SAMPLE_ROW = `{
  "planId":         "NCWTR-ISSP-2026-2028-A0",
  "uacsOrgCode":    "010010310000",      // + add (mock)
  "projectId":      "proj-sikap",
  "papCode":        "310100100001000",   // + add (mock)
  "fiscalYear":     2026,
  "bucket":         "internalProjects",
  "expenseClass":   "capitalOutlay",
  "categoryId":     "co-ict-software",
  "uacsObjectCode": "5060405015",        // + derive
  "item":           "UQMP and CFCP system development",
  "qty": 1, "unitCost": 9500000, "total": 9500000,
  "fundSource":     "General Appropriations Act",
  "philgepsRef":    null                 // + at award
}`;

const PUBLISHING_RULES = [
  ["One calculation method.", "Totals are derived from line items through the B.1–B.4 engine. No total is entered manually."],
  ["Versioned files.", "Each amendment is a new file. Earlier versions remain public, so changes are visible."],
  ["Machine-readable.", "The .issp JSON plus a flat CSV of line items, under an open licence."],
  ["Security exclusions.", "Network diagrams and cybersecurity details (Part II-B, III-A) remain outside the public release."],
  ["Privacy protection.", "Only official names and positions appear. No other personal data is published (RA 10173)."],
  ["Status is explicit.", "Draft, submitted and endorsed plans are labelled. Dashboards count endorsed plans by default."],
] as const;


/** The demo CTA keeps the sector and agency scope, with current form forced. */
function CurrentFormDemoLink() {
  const params = useSearchParams();
  const next = new URLSearchParams();
  next.set("view", "posture");
  next.set("mode", "current");
  ["sector", "agency"].forEach((k) => {
    const v = params.get(k);
    if (v) next.set(k, v);
  });
  return (
    <Link
      href={`/budget?${next.toString()}`}
      className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent transition-colors"
    >
      Open the current-form dashboard →
    </Link>
  );
}

export default function DataStandardPage() {
  return (
    <ScopedBudgetFrame active="dataStandard">
      <div className="space-y-6">

        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Draft for discussion</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-3">Data standard</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            The structured fields the ISSP form already carries, the seven join keys that connect it to COMPASS, and
            the publishing rules for an open-data release. Most fields exist in the ISSP Builder today; the join keys
            are the proposed addition.
          </p>
        </section>

        <DemoNotice />

        {/* ── Stakeholder questions ── */}
        <section>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2.5">Questions the standard must answer</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STAKEHOLDER_QUESTIONS.map((s) => (
              <div key={s.who} className="rounded-lg ring-1 ring-foreground/10 bg-card p-4 flex flex-col gap-1.5">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">{s.who}</p>
                <p className="text-sm font-semibold leading-snug text-balance">{s.q}</p>
                <p className="text-xs text-muted-foreground leading-relaxed text-pretty">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Field map ── */}
        <section className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Field map · ISSP schema v14</p>
              <h2 className="font-display text-lg font-bold tracking-tight mt-0.5">ISSP fields and their connections</h2>
            </div>
            <div className="flex gap-2 text-[10px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success border border-success-border px-2 py-0.5 font-semibold">
                <CircleCheck className="w-3 h-3" /> In the ISSP today
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-info-bg text-info border border-info-border px-2 py-0.5 font-semibold">
                <Plus className="w-3 h-3" /> Proposed addition
              </span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Field</th>
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">ISSP part</th>
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Status</th>
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Joins to</th>
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">Answers</th>
                </tr>
              </thead>
              <tbody>
                {FIELD_MAP.map((group) => (
                  <Fragment key={group.group}>
                    <tr className="bg-muted/30">
                      <td colSpan={5} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {group.group}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.field} className="border-b last:border-b-0 hover:bg-accent/20 align-top">
                        <td className="px-3 py-2 font-medium max-w-80">{row.field}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.part}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {"add" in row && row.add ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-info-bg text-info border border-info-border px-2 py-0.5 text-[10px] font-semibold">
                              <Plus className="w-3 h-3" /> Add
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success border border-success-border px-2 py-0.5 text-[10px] font-semibold">
                              <CircleCheck className="w-3 h-3" /> Today
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.joins}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.answers}
                          {"caveat" in row && row.caveat ? (
                            <span className="block text-[10px] text-muted-foreground/80 mt-1 leading-snug">{row.caveat}</span>
                          ) : null}
                        </td>
                      </tr>
                      ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Sample record + publishing rules ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">One line item, as open data</p>
            <h2 className="font-display text-base font-bold tracking-tight mb-3">Sample record with join keys</h2>
            <pre className="rounded-lg bg-[#0E1A33] text-[#E6ECF7] p-3.5 text-[11px] leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap">{SAMPLE_ROW}</pre>
            <p className="text-[11px] text-muted-foreground mt-2.5">
              Codes are mock values. The same record also exports as one CSV row per line item: the dashboard&apos;s
              CSV button produces exactly that from the corpus.
            </p>
          </section>

          <section className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Publishing rules</p>
            <h2 className="font-display text-base font-bold tracking-tight mb-3">Open data within security and privacy limits</h2>
            <ol className="space-y-2.5 text-sm leading-relaxed list-decimal pl-5">
              {PUBLISHING_RULES.map(([head, body]) => (
                <li key={head}>
                  <strong>{head}</strong> <span className="text-muted-foreground">{body}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ── Where this goes: the agency-side loop ── */}
        <section>
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Agency-side updates</p>
            <h2 className="font-display text-lg font-bold tracking-tight">The ISSP as the single source of record</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
              Execution facts (procurement status, KPI actuals, physical progress) become stale inside a static plan. An
              agency-side portal records them against the same project keys: one update refreshes every view below.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                n: "1",
                who: "Agency portal (planned)",
                what: "Agencies update execution per project: procurement stage, % complete, KPI actuals. A short quarterly update.",
              },
              {
                n: "2",
                who: "Oversight dashboards",
                what: "DBM, DICT, COA and Congress read the same trail this demonstration shows: plan, money, procurement, results.",
              },
              {
                n: "3",
                who: "Public reports",
                what: "Citizens receive the plain-language brief; endorsed plans are published as open data beside COMPASS.",
              },
            ].map((s) => (
              <div key={s.n} className="rounded-lg ring-1 ring-foreground/10 bg-card p-4 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-semibold leading-snug">{s.who}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1 text-pretty">{s.what}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Capability matrix: today vs refinements ── */}
        <section className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Capability matrix</p>
              <h2 className="font-display text-lg font-bold tracking-tight mt-0.5">
                Current-form capability and proposed refinements
              </h2>
            </div>
            <Suspense
              fallback={
                <Link
                  href="/budget?view=posture&mode=current"
                  className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Open the current-form dashboard →
                </Link>
              }
            >
              <CurrentFormDemoLink />
            </Suspense>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">View (as demonstrated in this mockup)</th>
                  <th scope="col" className="border-b px-3 py-2 text-left font-semibold">What it needs</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_MATRIX.map((group) => (
                  <Fragment key={group.tier}>
                    <tr className="bg-muted/30">
                      <td colSpan={2} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {group.tier}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.view} className="border-b last:border-b-0 hover:bg-accent/20 align-top">
                        <td className="px-3 py-2 font-medium max-w-96">{row.view}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.needs}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2.5 leading-relaxed">
            The dashboard&apos;s <strong>Data mode</strong> switch demonstrates this live: in{" "}
            <em>Current form (v14)</em>, every panel in the lower tiers dims behind a lock naming the field it requires.
            The top tier keeps running without change.
          </p>
        </section>

        {/* ── The ask ── */}
        <section className="rounded-xl bg-band text-band-foreground p-6 flex flex-wrap gap-6 items-center">
          <div className="flex-1 min-w-72">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-band-foreground/75 mb-1.5">Request</p>
            <p className="text-lg font-semibold leading-snug">
              Adopt the ISSP as the primary record of ICT spending in COMPASS: the plan against which the rest of the
              spending trail is checked.
            </p>
          </div>
          <ol className="flex-1 min-w-64 list-decimal pl-5 space-y-1.5 text-sm leading-relaxed text-band-foreground/90">
            <li>Agree on the 7 join keys with DBM, DICT and COA.</li>
            <li>Pilot with 3–5 agencies in the FY2028 Budget Call.</li>
            <li>Publish endorsed ISSPs as open data beside COMPASS.</li>
          </ol>
        </section>
      </div>
    </ScopedBudgetFrame>
  );
}
