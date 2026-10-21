/**
 * Screenshot + assertion smoke for the demonstration surfaces (/repository,
 * /budget) — the Phase-5 visual-QA input. Captures desktop full-page shots
 * (plus one phone-width budget shot) with the BetterGovPH theme forced, into
 * work/dbm-presentation/screenshots/, and asserts the corpus actually renders.
 *
 * Prereq: dev server on :3000 for this checkout (`ss -tlnp | grep :3000`).
 *   node scripts/smoke-mockup-screenshots.mjs
 */

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const OUT_DIR = path.join(import.meta.dirname, "..", "work", "dbm-presentation", "screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const fails = [];
const fail = (m) => { console.error("  ASSERT FAIL:", m); fails.push(m); };
const ok = (m) => console.log("  ok:", m);

async function newPage(width = 1440, height = 900) {
  const p = await browser.newPage();
  await p.setViewport({ width, height });
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    window.localStorage.setItem("issp-theme", "bettergov");
  });
  return p;
}

async function settle(p) {
  await p.waitForNetworkIdle({ idleTime: 400, timeout: 30000 }).catch(() => {});
  await p.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await new Promise((r) => setTimeout(r, 600));
}

/** Assert the page does not force horizontal scrolling; log offenders when it does. */
async function expectNoOverflow(p, label) {
  const probe = await p.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [];
    if (doc.scrollWidth <= doc.clientWidth + 1) return { overflow: false, offenders };
    for (const el of doc.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 && r.width > 12) {
        offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} right=${Math.round(r.right)}`);
        if (offenders.length >= 8) break;
      }
    }
    return { overflow: true, offenders, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  if (probe.overflow) {
    fail(`${label}: page overflows horizontally (${probe.scrollWidth} > ${probe.clientWidth}) — ${probe.offenders.join(" | ")}`);
  } else {
    ok(`${label}: no horizontal overflow`);
  }
}

async function expectText(p, text, label) {
  // Case-insensitive: eyebrow labels render via CSS text-transform, which
  // Chrome's innerText reflects as uppercase.
  const body = (await p.evaluate(() => document.body.innerText)).toLowerCase();
  (body.includes(text.toLowerCase()) ? ok : fail)(`${label}: page contains "${text}"`);
}

// 1 — Repository list (cards)
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/repository`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await p.waitForFunction(() => document.body.innerText.includes("NCRA"), { timeout: 30000 }).catch(() => {});
  await expectText(p, "Public ISSP Repository", "repository list");
  await expectText(p, "fictitious", "repository list disclaimer");
  await expectText(p, "₱", "repository list money");
  await expectNoOverflow(p, "repository list");
  await p.screenshot({ path: path.join(OUT_DIR, "repository-list.png"), fullPage: true });
  ok("shot repository-list.png");
  errors.forEach((e) => fail(`repository list pageerror: ${e}`));

  // 2 — Table view
  await p.click('button[aria-label="Table view"]');
  await settle(p);
  await expectText(p, "3-yr total", "repository table header");
  await expectNoOverflow(p, "repository table");
  await p.screenshot({ path: path.join(OUT_DIR, "repository-table.png"), fullPage: true });
  ok("shot repository-table.png");
  await p.close();
}

// 3 — Agency detail (hero agency)
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/repository/ncra-2027-2029`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "National Coastal Resilience Authority", "detail identity");
  await expectText(p, "Summary of investments", "detail B.1 section");
  await expectText(p, "Project WATCHFUL", "detail hero project");
  await expectText(p, "ICT asset posture", "detail posture section");
  await expectText(p, "Affected by advisory", "detail advisory callout");
  await expectText(p, "Download .issp", "detail download");
  await expectNoOverflow(p, "repository detail");
  await p.screenshot({ path: path.join(OUT_DIR, "repository-detail.png"), fullPage: true });
  ok("shot repository-detail.png");
  errors.forEach((e) => fail(`detail pageerror: ${e}`));
  await p.close();
}

// 3b — Agency detail with an AI-tagged project (own-build cluster story)
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/repository/mfsc-2027-2029`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "Metro Ferry Systems Corporation", "MFSC detail identity");
  await expectText(p, "Project HULA", "MFSC AI project");
  await expectText(p, "AI · own cluster", "MFSC AI chip");
  await expectText(p, "ICT asset posture", "MFSC posture section");
  await expectNoOverflow(p, "MFSC detail");
  await p.screenshot({ path: path.join(OUT_DIR, "repository-detail-ai.png"), fullPage: true });
  ok("shot repository-detail-ai.png");
  errors.forEach((e) => fail(`MFSC detail pageerror: ${e}`));
  await p.close();
}

// 4 — Budget dashboard
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/budget`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "ICT Budget Dashboard", "budget title");
  await expectText(p, "The next infrastructure wave is digital", "budget why-now band");
  await expectText(p, "AI & compute in the plans", "budget AI panel");
  await expectText(p, "Fund sources", "budget fund panel");
  await expectText(p, "Agencies by proposed investment", "budget ranking");
  await expectText(p, "Follow every peso", "budget lifecycle");
  await expectText(p, "Can each agency spend what it asks for?", "budget absorptive");
  await expectText(p, "has procurement started?", "budget procurement pulse");
  await expectText(p, "duplication watch", "budget convergence");
  await expectText(p, "Unit-price sanity", "budget unit prices");
  await expectText(p, "Government cyber posture", "budget posture panel");
  await expectText(p, "NetGate FX-200", "budget advisory card");
  await expectText(p, "Projects with PAP code", "budget traceability KPI");
  await expectText(p, "Line items (CSV)", "budget CSV export");
  await expectNoOverflow(p, "budget");
  await p.screenshot({ path: path.join(OUT_DIR, "budget.png"), fullPage: true });
  ok("shot budget.png");

  // 5 — Program spotlight deep link
  await p.goto(`${BASE}/budget?program=rapide`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "RAPIDE", "budget program spotlight");
  await expectNoOverflow(p, "budget program");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-program.png"), fullPage: true });
  ok("shot budget-program.png");

// 4b — FY selector interaction
{
  const p = await newPage();
  await p.goto(`${BASE}/budget`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "FY2027")?.click());
  await settle(p);
  await expectText(p, "FY2027 ISSP ask", "budget FY selector KPI");
  await expectText(p, "vs FY2026", "budget FY selector YoY");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-fy2027.png"), fullPage: false });
  ok("shot budget-fy2027.png (viewport)");
  await p.close();
}

// 4c — Data mode: current form (proposed layers ghost out behind locks)
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/budget?mode=current`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "Current form (v14)", "mode chips present");
  await expectText(p, "Requires: an AI / compute tag per project", "AI panel lock");
  await expectText(p, "Requires: the Annex 1 asset inventory", "posture lock");
  await expectText(p, "Requires: UACS join keys", "lifecycle lock");
  await expectText(p, "Computed from today's form", "unit-price live badge");
  await expectText(p, "KPIs fully specified", "hero tile swap");
  await expectText(p, "Unit-price sanity", "unit-price still rendered");
  await expectNoOverflow(p, "budget current mode");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-current-form.png"), fullPage: true });
  ok("shot budget-current-form.png");
  errors.forEach((e) => fail(`current-mode pageerror: ${e}`));
  await p.close();
}

// 5b — Project trace
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/budget/trace/ncwtr-2026-2028/proj-sikap`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "Project SIKAP", "trace title");
  await expectText(p, "money trail", "trace money trail");
  await expectText(p, "Procurement — Contract awarded 14 Apr 2026", "trace procurement pill");
  await expectText(p, "From plan to payment to result", "trace timeline");
  await expectText(p, "Agencies reporting via UQMP API", "trace KPI actuals");
  await expectText(p, "What each source knows", "trace sources card");
  await expectNoOverflow(p, "project trace");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-trace.png"), fullPage: true });
  ok("shot budget-trace.png");
  errors.forEach((e) => fail(`trace pageerror: ${e}`));
  await p.close();
}

// 5c — Data standard
{
  const p = await newPage();
  await p.goto(`${BASE}/budget/data-standard`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "What structured ISSP data should know", "data standard title");
  await expectText(p, "UACS PAP code per project", "data standard join key");
  await expectText(p, "AI / compute tag per project", "data standard v15 field");
  await expectText(p, "Capability matrix", "data standard matrix");
  await expectText(p, "Unlocked by one form refinement each", "data standard matrix tier");
  await expectText(p, "Where this goes", "data standard agency loop");
  await expectText(p, "The row COMPASS can join", "data standard sample");
  await expectNoOverflow(p, "data standard");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-data-standard.png"), fullPage: true });
  ok("shot budget-data-standard.png");
  await p.close();
}

// 5d — Examiner brief + Citizen one-pager (A4 reports)
{
  const p = await newPage();
  await p.goto(`${BASE}/budget/report/examiner`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "Budget Examiner Brief", "examiner header");
  await expectText(p, "Questions for the hearing", "examiner questions");
  await p.screenshot({ path: path.join(OUT_DIR, "report-examiner.png"), fullPage: true });
  ok("shot report-examiner.png");

  await p.goto(`${BASE}/budget/report/citizen`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "Saan napupunta ang pondo", "citizen headline");
  await expectText(p, "Out of every", "citizen waffle legend");
  await p.screenshot({ path: path.join(OUT_DIR, "report-citizen.png"), fullPage: true });
  ok("shot report-citizen.png");
  await p.close();
}

  errors.forEach((e) => fail(`budget pageerror: ${e}`));
  await p.close();
}

// 6 — Budget on a phone viewport
{
  const p = await newPage(390, 844);
  await p.goto(`${BASE}/budget`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectNoOverflow(p, "budget mobile");
  // Procurement table: at scroll position 0 no stage chip may extend past the scroller's
  // right edge (round-9 vision finding — sliced chips read as broken).
  const clippedChips = await p.evaluate(() => {
    const table = [...document.querySelectorAll("table")].find((t) => t.textContent?.includes("Bidding"));
    if (!table) return -1;
    const scroller = table.parentElement;
    if (!scroller) return -1;
    const right = scroller.getBoundingClientRect().right;
    const chips = [...table.querySelectorAll("span")].filter((s) => /^(Awarded|Bidding|Pre-bid|Not started)$/.test(s.textContent?.trim() ?? ""));
    return chips.filter((c) => c.getBoundingClientRect().right > right + 1).length;
  });
  (clippedChips === 0 ? ok : fail)(`budget mobile procurement chips: ${clippedChips === 0 ? "none clipped at the scroller edge" : `${clippedChips} chip(s) clipped`}`);
  await p.screenshot({ path: path.join(OUT_DIR, "budget-mobile.png"), fullPage: true });
  ok("shot budget-mobile.png");
  await p.close();
}

await browser.close();
console.log(fails.length ? `\n❌ ${fails.length} failure(s)` : `\n✅ mockup screenshot smoke passed — shots in ${OUT_DIR}`);
process.exit(fails.length ? 1 : 0);
