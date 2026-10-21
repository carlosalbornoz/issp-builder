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

// 4 — Budget dashboard: overview
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/budget`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "ICT Budget Dashboard", "budget title");
  await expectText(p, "The next infrastructure wave is digital", "budget why-now band");
  await expectText(p, "Planned ICT, whole of government", "whole-of-gov why-now tile");
  // Known-totals pin: the corpus grand total (4,823,520,000 → ₱4.82B) must reach the page.
  await expectText(p, "₱4.82B", "budget grand total matches corpus");
  await expectText(p, "Whole-of-government posture", "budget posture grid");
  await expectText(p, "Agriculture and food", "posture grid PDP sector group");
  await expectText(p, "Fund sources", "budget fund panel");
  await expectText(p, "Agencies by proposed investment", "budget ranking");
  await expectText(p, "Projects with PAP code", "budget traceability KPI");
  await expectText(p, "Agency drill-down", "budget drill-down");
  await expectText(p, "Line items (CSV)", "budget CSV export");
  await expectNoOverflow(p, "budget");
  await p.screenshot({ path: path.join(OUT_DIR, "budget.png"), fullPage: true });
  ok("shot budget.png");

  // 5 — Program spotlight deep link (shared-services view)
  await p.goto(`${BASE}/budget?view=shared&program=rapide`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "RAPIDE", "budget program spotlight");
  await expectText(p, "Where a shared service could replace separate builds", "shared view present on program deep link");
  await expectNoOverflow(p, "budget program");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-program.png"), fullPage: true });
  ok("shot budget-program.png");

// 4b — FY selector interaction (overview KPIs)
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

// 4c — Data mode: current form (overview locks the grid's proposed columns)
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/budget?mode=current`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "Current form (v14)", "mode chips present");
  await expectText(p, "KPIs fully specified", "hero tile swap");
  await expectText(p, "Whole-of-government posture", "posture grid still rendered");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-current-form.png"), fullPage: true });
  ok("shot budget-current-form.png");
  errors.forEach((e) => fail(`current-mode pageerror: ${e}`));
  await p.close();
}

// 4d — Domain views (one shot + assertions each)
{
  const views = [
    ["cybersecurity", "budget-cyber.png", ["Cybersecurity control coverage", "NetGate FX-200", "Security spend is invisible"]],
    ["devices", "budget-devices.png", ["Unit-price sanity", "The estate today", "Device spend by category"]],
    ["networks", "budget-networks.png", ["Connectivity spend by category", "The links the plans name"]],
    ["cloud", "budget-cloud.png", ["Where systems live today", "Where the new systems will live", "Hosting and subscription spend"]],
    ["ai", "budget-ai.png", ["AI and compute asks", "own GPU clusters"]],
    ["people", "budget-people.png", ["ICT staff per agency", "Training in the plans"]],
    ["services", "budget-services.png", ["eGovPH program adoption", "How frontline services are reached"]],
    ["money", "budget-money.png", ["Follow every peso", "Can each agency spend what it asks for?", "has procurement started?"]],
    ["shared", "budget-shared.png", ["Where a shared service could replace separate builds", "Cross-agency programs", "Which national plans the money serves"]],
  ];
  for (const [view, file, expects] of views) {
    const p = await newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(`${BASE}/budget?view=${view}`, { waitUntil: "networkidle0", timeout: 60000 });
    await settle(p);
    for (const text of expects) await expectText(p, text, `${view} view`);
    await expectNoOverflow(p, `${view} view`);
    await p.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
    ok(`shot ${file}`);
    errors.forEach((e) => fail(`${view} pageerror: ${e}`));
    await p.close();
  }
}

// 4d2 — Current-form mode on money and devices: the execution layer locks
// (cycle tiles included), today's-form panels stay live with their numbers.
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/budget?view=money&mode=current`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "Requires: UACS join keys + a COMPASS execution feed", "money cycle tiles + execution half lock");
  await expectText(p, "Follow one project end-to-end", "money stage strip + CTA stay live");
  await expectNoOverflow(p, "money current mode");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-money-current.png"), fullPage: true });
  ok("shot budget-money-current.png");

  await p.goto(`${BASE}/budget?view=devices&mode=current`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "Requires: the Annex 1 asset inventory", "devices estate panel locks");
  await expectText(p, "30 DICT categories", "device spend panel stays live with its total");
  await expectText(p, "Computed from today", "device spend keeps its today's-form badge");
  await expectNoOverflow(p, "devices current mode");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-devices-current.png"), fullPage: true });
  ok("shot budget-devices-current.png");
  errors.forEach((e) => fail(`money/devices current-mode pageerror: ${e}`));
  await p.close();
}

// 4d3 — AI view under a sector filter: shares must derive from the selection
// (HULA ₱105M over MFSC's FY2028 ₱304.71M = 34.5%), not the corpus-wide layer.
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/budget?view=ai&sector=transport`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "34.5%", "AI year-share chip derives from the selection");
  await expectText(p, "one agency's own GPU cluster", "own-build insight counts the selection only");
  await expectNoOverflow(p, "ai sector lens");
  errors.forEach((e) => fail(`ai sector pageerror: ${e}`));
  await p.close();
}

// 4e — Sector lens (PDP sectors) + current-form locks on the cyber view
{
  const p = await newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}/budget?sector=agricultureFood`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "PDP Ch. 5", "sector group header carries the PDP ref");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-sector-agri.png"), fullPage: true });
  ok("shot budget-sector-agri.png");
  await p.goto(`${BASE}/budget?view=cybersecurity&mode=current`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectText(p, "Requires: the Annex 1 asset inventory", "cyber view fleet lock");
  await expectText(p, "Cybersecurity control coverage", "controls grid stays live in current mode");
  await expectNoOverflow(p, "cyber current mode");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-cyber-current.png"), fullPage: true });
  ok("shot budget-cyber-current.png");
  errors.forEach((e) => fail(`sector/cyber-current pageerror: ${e}`));
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
  await expectText(p, "Procurement: Contract awarded 14 Apr 2026", "trace procurement pill");
  await expectText(p, "From plan to payment to result", "trace timeline");
  await expectText(p, "Agencies reporting via UQMP API", "trace KPI actuals");
  await expectText(p, "What each source knows", "trace sources card");
  await expectNoOverflow(p, "project trace");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-trace.png"), fullPage: true });
  ok("shot budget-trace.png");
  errors.forEach((e) => fail(`trace pageerror: ${e}`));
  await p.close();
}

  errors.forEach((e) => fail(`budget pageerror: ${e}`));
  await p.close();
}

// 6 — Budget on a phone viewport (overview + the table-heavy money view)
{
  const p = await newPage(390, 844);
  await p.goto(`${BASE}/budget`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectNoOverflow(p, "budget mobile overview");
  // Shell header: the brand and the nav must never overlap (round-22 vision finding).
  const headerOverlap = await p.evaluate(() => {
    const header = document.querySelector("header");
    const brand = header.querySelector("a");
    const nav = header.querySelector("nav");
    const a = brand.getBoundingClientRect();
    const b = nav.getBoundingClientRect();
    return a.right > b.left + 1 ? Math.round(a.right - b.left) : 0;
  });
  (headerOverlap === 0 ? ok : fail)(`budget mobile shell header: ${headerOverlap === 0 ? "brand and nav clear" : `overlap ${headerOverlap}px`}`);
  await p.screenshot({ path: path.join(OUT_DIR, "budget-mobile.png"), fullPage: true });
  ok("shot budget-mobile.png");

  await p.goto(`${BASE}/budget?view=money`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectNoOverflow(p, "budget mobile money view");
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
  await p.screenshot({ path: path.join(OUT_DIR, "budget-mobile-money.png"), fullPage: true });
  ok("shot budget-mobile-money.png");
  await p.close();
}

// 7 — QA widths: ultrawide (3440) must not overflow either (qa.md three-width pass).
{
  const p = await newPage(3440, 1200);
  for (const [url, label] of [["/budget", "ultrawide overview"], ["/budget?view=money", "ultrawide money"]]) {
    await p.goto(`${BASE}${url}`, { waitUntil: "networkidle0", timeout: 60000 });
    await settle(p);
    await expectNoOverflow(p, label);
  }
  await p.close();
}

await browser.close();
console.log(fails.length ? `\n❌ ${fails.length} failure(s)` : `\n✅ mockup screenshot smoke passed — shots in ${OUT_DIR}`);
process.exit(fails.length ? 1 : 0);
