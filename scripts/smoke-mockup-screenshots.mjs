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
  const body = await p.evaluate(() => document.body.innerText);
  (body.includes(text) ? ok : fail)(`${label}: page contains "${text}"`);
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
  await expectText(p, "Download .issp", "detail download");
  await expectNoOverflow(p, "repository detail");
  await p.screenshot({ path: path.join(OUT_DIR, "repository-detail.png"), fullPage: true });
  ok("shot repository-detail.png");
  errors.forEach((e) => fail(`detail pageerror: ${e}`));
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
  await expectText(p, "Fund sources", "budget fund panel");
  await expectText(p, "Agencies by proposed investment", "budget ranking");
  await expectText(p, "Requests vs. allotments", "budget allotment panel");
  await expectText(p, "Cross-agency programs", "budget programs");
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
  errors.forEach((e) => fail(`budget pageerror: ${e}`));
  await p.close();
}

// 6 — Budget on a phone viewport
{
  const p = await newPage(390, 844);
  await p.goto(`${BASE}/budget`, { waitUntil: "networkidle0", timeout: 60000 });
  await settle(p);
  await expectNoOverflow(p, "budget mobile");
  await p.screenshot({ path: path.join(OUT_DIR, "budget-mobile.png"), fullPage: true });
  ok("shot budget-mobile.png");
  await p.close();
}

await browser.close();
console.log(fails.length ? `\n❌ ${fails.length} failure(s)` : `\n✅ mockup screenshot smoke passed — shots in ${OUT_DIR}`);
process.exit(fails.length ? 1 : 0);
