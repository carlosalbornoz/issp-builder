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
