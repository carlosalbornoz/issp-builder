/**
 * Verifies the demonstration repository corpus (public/demo/repository/):
 *
 *  1. Shape — 12 fictitious agencies, disclaimer present, required fields set.
 *  2. Totals — independently recomputed line sums match the corpus B.1/B.2/B.3/B.4
 *     grand totals (the corpus is derived through the real editor aggregation
 *     engine; this script is the second, naive implementation as a cross-check).
 *  3. Duration discipline — no project is budgeted in a year its Part III-E
 *     duration does not cover (anything else would be silently dropped by
 *     countedPart4 and understate the corpus against the .issp files).
 *  4. Determinism — regeneration is byte-identical (delegates to
 *     `npx tsx scripts/build-mock-corpus.ts --check`).
 *
 * Run:  node scripts/verify-mock-corpus.mjs [--skip-determinism]
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO = path.join(import.meta.dirname, "..");
const DIR = path.join(REPO, "public", "demo", "repository");
const failures = [];
const ok = (cond, label) => {
  if (!cond) failures.push(label);
  else console.log(`  ✓ ${label}`);
};

const corpus = JSON.parse(fs.readFileSync(path.join(DIR, "corpus.json"), "utf-8"));

// ─── 1. Shape ─────────────────────────────────────────────────────────────────
console.log("Shape");
ok(corpus.disclaimer && corpus.disclaimer.includes("fictitious"), "corpus carries the fictitious-data disclaimer");
ok(corpus.agencies.length === 12, `12 agencies (got ${corpus.agencies.length})`);
const types = new Set(corpus.agencies.map((a) => a.type));
ok(types.has("NGA") && types.has("GOCC") && types.has("LGU") && types.has("OTHER"), "agency types NGA/GOCC/LGU/OTHER all present");
ok(new Set(corpus.agencies.map((a) => a.cycleLabel)).size >= 3, "≥3 plan cycles represented");
ok(new Set(corpus.agencies.map((a) => a.planStatus)).size === 3, "all three plan statuses represented");
ok(corpus.crossAgencyPrograms.length >= 3, `≥3 cross-agency programs (got ${corpus.crossAgencyPrograms.length})`);
const funds = new Set();
corpus.agencies.forEach((a) => a.lineItems.forEach((l) => funds.add(l.fundSource)));
ok(funds.size === 4, `all 4 fund sources used (got ${funds.size})`);
const cats = new Set();
corpus.agencies.forEach((a) => a.lineItems.forEach((l) => cats.add(l.categoryId)));
ok(cats.size === 30, `all 30 expense categories used (got ${cats.size})`);

// ─── 2 & 3. Totals + duration discipline, per agency ─────────────────────────
for (const a of corpus.agencies) {
  console.log(`Totals — ${a.acronym} (${a.cycleLabel})`);
  const file = path.join(DIR, `${a.slug}.issp`);
  ok(fs.existsSync(file), `.issp file exists (${a.slug}.issp)`);
  const doc = JSON.parse(fs.readFileSync(file, "utf-8"));
  ok(doc.fileType === "issp-main" && doc.schemaVersion === 14, "file is issp-main schema v14");
  ok(doc.agency.acronym === a.acronym && doc.startYear === a.cycle.startYear, "identity matches corpus entry");

  // Naive independent sum: every line in every year and bucket.
  const sum = (lines) => lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
  let raw = 0;
  const planYears = [doc.startYear, doc.startYear + 1, doc.endYear];
  [doc.part4.year1, doc.part4.year2, doc.part4.year3].forEach((y, yi) => {
    raw += sum(y.officeProductivity.capitalOutlay) + sum(y.officeProductivity.mooe) + sum(y.continuingCosts.mooe);
    raw += Object.values(y.internalProjects).reduce((s, p) => s + sum(p.capitalOutlay) + sum(p.mooe), 0);
    raw += Object.values(y.crossAgencyProjects).reduce((s, p) => s + sum(p.capitalOutlay) + sum(p.mooe), 0);

    // Duration discipline: budgeted projects must exist in Part III-E with a duration covering this year.
    const covers = (duration, year) => {
      const m = String(duration || "").trim().match(/^(\d{4})(?:\s*[-–]\s*(\d{4}))?$/);
      if (!m) return true; // unset durations cover the whole plan (parseDuration's rule)
      return Number(year) >= Number(m[1]) && Number(year) <= Number(m[2] ?? m[1]);
    };
    const iii = [...doc.part3.internalProjects, ...doc.part3.crossAgencyProjects];
    for (const [pid, pb] of [...Object.entries(y.internalProjects), ...Object.entries(y.crossAgencyProjects)]) {
      const amount = sum(pb.capitalOutlay) + sum(pb.mooe);
      if (amount === 0) continue; // empty stubs from the editor are fine
      const proj = iii.find((p) => p.id === pid);
      ok(!!proj, `${a.acronym} y${yi + 1} ${pid}: budgeted project exists in Part III-E`);
      if (proj) ok(covers(proj.duration, planYears[yi]), `${a.acronym} y${yi + 1} ${pid}: duration ${proj.duration} covers ${planYears[yi]}`);
    }
  });

  ok(raw === a.budget.grandTotal, `raw line sum ₱${raw.toLocaleString("en-PH")} == corpus grandTotal ₱${a.budget.grandTotal.toLocaleString("en-PH")}`);
  const b1Total = a.budget.b1.at(-1);
  const b2Total = a.budget.b2.at(-1);
  const b3Total = a.budget.b3.at(-1);
  ok(b1Total.isTotal && b1Total.total === a.budget.grandTotal, "B.1 grand total matches");
  ok(b2Total.isTotal && b2Total.total === a.budget.grandTotal, "B.2 grand total matches");
  ok(b3Total.isTotal && b3Total.total === a.budget.grandTotal, "B.3 grand total matches");
  const b4Sum = a.budget.b4.reduce((s, r) => s + r.total, 0);
  ok(b4Sum === a.budget.grandTotal, `B.4 rows sum to grand total (Δ ${b4Sum - a.budget.grandTotal})`);
  ok(a.budget.totalCo + a.budget.totalMooe === a.budget.grandTotal, "CO + MOOE == grand total");
  const lineSum = a.lineItems.reduce((s, l) => s + l.total, 0);
  ok(lineSum === a.budget.grandTotal, "corpus lineItems sum == grand total");
}

// Corpus-level totals
console.log("Corpus totals");
const grand = corpus.agencies.reduce((s, a) => s + a.budget.grandTotal, 0);
ok(grand === corpus.totals.grandTotal, `agency grand totals sum to corpus grandTotal (₱${grand.toLocaleString("en-PH")})`);
ok(corpus.totals.byYear.reduce((s, y) => s + y.total, 0) === grand, "byYear totals sum to grandTotal");
ok(corpus.totals.byType.reduce((s, t) => s + t.total, 0) === grand, "byType totals sum to grandTotal");
ok(corpus.totals.cycles.reduce((s, c) => s + c.total, 0) === grand, "cycle totals sum to grandTotal");

// ─── Mock COMPASS layer ───────────────────────────────────────────────────────
console.log("COMPASS layer (mock)");
const compass = corpus.compass;
ok(compass.fictitious === true && /COMPASS/.test(compass.note), "compass layer carries the fictitious/proposed-link note");
ok(compass.agencies.length === 12, `compass covers all 12 agencies (got ${compass.agencies.agents?.length ?? compass.agencies.length})`);
ok(compass.agencies.filter((a) => a.route === "GAA").length === 8, "8 of 12 agencies travel the GAA route");
const papCodes = corpus.agencies.flatMap((a) => a.projects.filter((p) => p.papCode).map((p) => p.papCode));
ok(new Set(papCodes).size === papCodes.length, "mock PAP codes are unique");
ok(papCodes.length === 31, `31 of 39 projects carry a PAP code (got ${papCodes.length})`);
const orgCodes = corpus.agencies.map((a) => a.identifiers.uacsOrgCode);
ok(new Set(orgCodes).size === orgCodes.length, "mock UACS org codes are unique");

for (const ca of compass.agencies) {
  const profile = corpus.agencies.find((a) => a.slug === ca.slug);
  for (const rec of ca.years) {
    if (rec.planFromCorpus) {
      const idx = rec.year - profile.cycle.startYear;
      ok(rec.plan === profile.budget.grandTotals[idx], `${ca.acronym} FY${rec.year}: compass plan == corpus year total`);
    }
    if (rec.nep !== undefined) ok(rec.nep <= rec.plan * 1.1, `${ca.acronym} FY${rec.year}: NEP ≤ 110% of plan`);
    if (rec.gaa !== undefined && rec.nep !== undefined) ok(rec.gaa >= rec.nep * 0.8 && rec.gaa <= rec.nep * 1.2, `${ca.acronym} FY${rec.year}: GAA within 80–120% of NEP`);
    if (rec.allotment !== undefined && rec.gaa !== undefined) ok(rec.allotment <= rec.gaa * 1.05, `${ca.acronym} FY${rec.year}: allotment ≤ 105% of GAA`);
    if (rec.obligated !== undefined && rec.allotment !== undefined) ok(rec.obligated <= rec.allotment, `${ca.acronym} FY${rec.year}: obligated ≤ allotment`);
    if (rec.disbursed !== undefined && rec.obligated !== undefined) ok(rec.disbursed <= rec.obligated, `${ca.acronym} FY${rec.year}: disbursed ≤ obligated`);
  }
}
const fy27Corpus = corpus.totals.byYear.find((y) => y.year === 2027)?.total ?? 0;
const fy27Compass = compass.agencies.reduce((s, a) => s + (a.years.find((y) => y.year === 2027 && y.planFromCorpus)?.plan ?? 0), 0);
ok(fy27Compass === fy27Corpus, `compass FY2027 corpus-covered plans sum to the corpus FY2027 total (₱${fy27Compass.toLocaleString("en-PH")})`);

const ncwtrP = corpus.agencies.find((a) => a.acronym === "NCWTR");
const trace = compass.agencies.flatMap((a) => a.traces).find((t) => t.projectId === "proj-sikap");
ok(!!trace, "SIKAP project trace exists");
if (trace) {
  const sikapY1 = ncwtrP.lineItems.filter((l) => l.projectId === "proj-sikap" && l.year === 2026).reduce((s, l) => s + l.total, 0);
  ok(trace.money.plan === sikapY1, `SIKAP trace FY2026 plan == Part IV line items (₱${sikapY1.toLocaleString("en-PH")})`);
  ok(trace.kpiActuals.length >= 3, "SIKAP trace carries KPI actuals");
}
const dupFunding = corpus.agencies.every((a) => a.proposedSystems.length === a.counts.proposedSystems);
ok(dupFunding, "every proposed system (III-D) is exported for duplication watch");

// ─── AI & compute layer ───────────────────────────────────────────────────────
console.log("AI & compute layer");
const ai = corpus.aiLayer;
ok(ai.fictitious === true && ai.note.length > 0, "AI layer carries the fictitious note");
ok(ai.projects.length === 4, `4 AI-tagged projects (got ${ai.projects.length})`);
ok(ai.projects.filter((p) => p.kind === "own-build").length === 2, "2 own-build clusters (MFSC, PRPGC)");
for (const p of ai.projects) {
  const a = corpus.agencies.find((x) => x.slug === p.slug);
  const proj = a && a.projects.find((x) => x.id === p.projectId);
  ok(!!proj, `${p.acronym}: tagged project ${p.projectId} exists`);
  if (!proj) continue;
  const byLine = {};
  a.lineItems.filter((l) => l.projectId === p.projectId).forEach((l) => { byLine[l.year] = (byLine[l.year] ?? 0) + l.total; });
  const byLinePairs = Object.entries(byLine).map(([y, v]) => [Number(y), v]).sort((x, y) => x[0] - y[0]);
  ok(JSON.stringify(p.byYear.map((y) => [y.year, y.amount])) === JSON.stringify(byLinePairs), `${p.acronym} ${p.shortTitle}: byYear amounts == real line items`);
  ok(p.total === proj.totalCost, `${p.acronym} ${p.shortTitle}: total == project totalCost`);
}
ok(ai.ownBuildTotal === ai.projects.filter((p) => p.kind === "own-build").reduce((s, p) => s + p.total, 0), `ownBuildTotal consistent (₱${ai.ownBuildTotal.toLocaleString("en-PH")})`);
const yearMap = Object.fromEntries(corpus.totals.byYear.map((y) => [y.year, y.total]));
for (const y of ai.byYear) {
  const expect = yearMap[y.year] ? y.amount / yearMap[y.year] : 0;
  ok(Math.abs(y.share - expect) < 1e-9, `AI share FY${y.year} == amount / corpus year total (${(y.share * 100).toFixed(1)}%)`);
}

// ─── Security posture (Annex 1 mock) ──────────────────────────────────────────
console.log("Security posture (Annex 1 mock)");
const sec = corpus.security;
ok(Object.keys(sec.fleetBySlug).length === 12, "fleet entries for all 12 agencies");
for (const [slug, fleet] of Object.entries(sec.fleetBySlug)) {
  ok(fleet.fictitious === true, `${slug}: fleet marked fictitious`);
  ok(fleet.endpointsEol <= fleet.endpoints && fleet.serversEol <= fleet.servers && fleet.networkEol <= fleet.networkDevices, `${slug}: EOL counts within fleet totals`);
}
const adv = sec.advisory;
ok(adv.fictitious === true, "advisory marked fictitious");
for (const hit of adv.agencies) {
  const fleet = sec.fleetBySlug[hit.slug];
  const model = fleet && fleet.models.find((m) => m.name === adv.model);
  ok(!!model, `${hit.acronym}: advisory model ${adv.model} present in fleet`);
  ok(!!model && model.count === hit.units, `${hit.acronym}: advisory units (${hit.units}) == fleet model count`);
  ok(!!model && model.eol === true, `${hit.acronym}: advisory model past vendor support`);
  if (hit.refreshInPlan) {
    const a = corpus.agencies.find((x) => x.slug === hit.slug);
    ok(a.projects.some((p) => p.shortTitle === hit.refreshProject), `${hit.acronym}: refresh project "${hit.refreshProject}" exists in its plan`);
  }
}
ok(adv.agencies.filter((h) => h.refreshInPlan).length === 2, "2 of 5 hit agencies carry replacement budget in their plans");

// ─── Procurement layer (FY2026) ───────────────────────────────────────────────
console.log("Procurement layer (FY2026)");
const proc = corpus.procurement;
const stageValues = new Set(["awarded", "bidding", "pre-bid", "none"]);
for (const r of proc.rows) {
  const a = corpus.agencies.find((x) => x.slug === r.slug);
  const amount = a.lineItems.filter((l) => l.projectId === r.projectId && l.year === 2026).reduce((s, l) => s + l.total, 0);
  ok(stageValues.has(r.stage), `${r.acronym} ${r.shortTitle}: valid stage`);
  ok(r.amount === amount, `${r.acronym} ${r.shortTitle}: amount == FY2026 line items (₱${amount.toLocaleString("en-PH")})`);
}
let expectedRows = 0;
corpus.agencies
  .filter((a) => a.cycle.startYear <= 2026 && 2026 <= a.cycle.endYear)
  .forEach((a) => a.projects.forEach((p) => {
    if (a.lineItems.some((l) => l.projectId === p.id && l.year === 2026 && l.total > 0)) expectedRows++;
  }));
ok(expectedRows === proc.rows.length, `every FY2026-budgeted project has a procurement row (${expectedRows} of ${proc.rows.length})`);

// ─── Unit prices ──────────────────────────────────────────────────────────────
console.log("Unit prices");
const up = corpus.unitPrices;
const laptopSlugs = new Set(corpus.agencies.filter((a) => a.lineItems.some((l) => /laptop|notebook/i.test(l.item))).map((a) => a.slug));
ok(up.rows.length === laptopSlugs.size, `one row per agency with laptop lines (${up.rows.length})`);
const vmscRow = up.rows.find((r) => r.acronym === "VMSC");
ok(!!vmscRow && vmscRow.medianUnitCost > up.corpusMedian * 1.4, `VMSC median (₱${vmscRow?.medianUnitCost.toLocaleString()}) is >1.4× the corpus median (₱${up.corpusMedian.toLocaleString()})`);
const bccmRow = up.rows.find((r) => r.acronym === "BCCM");
ok(!!bccmRow && !!bccmRow.note, "BCCM carries the ruggedized-spec note");

// ─── 4. Determinism ───────────────────────────────────────────────────────────
if (!process.argv.includes("--skip-determinism")) {
  console.log("Determinism");
  try {
    execFileSync("npx", ["tsx", "scripts/build-mock-corpus.ts", "--check"], { cwd: REPO, stdio: "inherit" });
  } catch {
    failures.push("regeneration is not byte-identical (run npx tsx scripts/build-mock-corpus.ts to sync)");
  }
}

console.log(failures.length ? `\n❌ ${failures.length} failure(s):` : "\n✅ corpus verification passed");
failures.forEach((f) => console.log(`  ✗ ${f}`));
process.exit(failures.length ? 1 : 0);
