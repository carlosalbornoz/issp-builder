/**
 * Fast assertion smoke for the /budget navigation redesign (round 9): screen
 * routing, legacy deep links, the sidebar frame, the scope bar and the Home
 * cards. No screenshots (smoke-mockup-screenshots.mjs owns the captures).
 *
 * Prereq: dev server on :3000 for this checkout (`ss -tlnp | grep :3000`).
 *   node scripts/smoke-budget-nav.mjs
 */

import puppeteer from "puppeteer";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";

const browser = await puppeteer.launch({
  executablePath: "/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const fails = [];
let passes = 0;
const check = (cond, m) => {
  if (cond) {
    passes += 1;
    console.log("  ok:", m);
  } else {
    console.error("  FAIL:", m);
    fails.push(m);
  }
};

async function open(url, width = 1440, height = 900) {
  const p = await browser.newPage();
  await p.setViewport({ width, height });
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    window.localStorage.setItem("issp-theme", "bettergov");
  });
  await p.goto(`${BASE}${url}`, { waitUntil: "networkidle0", timeout: 60000 });
  await p.waitForFunction(() => !document.querySelector("[aria-busy]"), { timeout: 30000 }).catch(() => {});
  return p;
}

const text = (p) => p.evaluate(() => document.body.innerText.toLowerCase());
// Panel headings and table headers only: "lacks" checks must not trip on
// filter-control labels ("All fund sources") that every screen carries.
const headings = (p) =>
  p.evaluate(() => [...document.querySelectorAll("h1,h2,h3,th")].map((h) => h.textContent ?? "").join("\n").toLowerCase());
const has = async (p, s) => (await text(p)).includes(s.toLowerCase());

async function screen(url, { contains = [], lacks = [] }, label) {
  const p = await open(url);
  const body = await text(p);
  const heads = await headings(p);
  for (const s of contains) check(body.includes(s.toLowerCase()), `${label}: contains "${s}"`);
  for (const s of lacks) check(!heads.includes(s.toLowerCase()), `${label}: no heading "${s}"`);
  await p.close();
}

try {
  console.log("\n[1] Screens: one question each");
  await screen("/budget?view=posture", { contains: ["Whole-of-government posture", "Agriculture and food"], lacks: ["Fund sources", "Agency drill-down"] }, "posture");
  await screen("/budget?view=ask", { contains: ["₱4.82B", "Fund sources", "Projects with PAP code"], lacks: ["Agency drill-down", "Where the money goes"] }, "ask");
  await screen("/budget?view=buys", { contains: ["Where the money goes"], lacks: ["Fund sources"] }, "buys");
  await screen("/budget?view=agencies", { contains: ["Agency drill-down", "Line items (CSV)"], lacks: ["Fund sources"] }, "agencies");
  await screen("/budget?view=absorptive", { contains: ["Obligation rate"], lacks: ["Each fiscal year sits at a different stage"] }, "absorptive");
  await screen("/budget?view=money", { contains: ["Each fiscal year sits at a different stage"], lacks: ["Ask ÷ obligations"] }, "money");

  console.log("\n[1] Legacy deep links");
  await screen("/budget", { contains: ["The next infrastructure wave is digital"], lacks: ["Agency drill-down"] }, "bare /budget → home");
  await screen("/budget?view=overview", { contains: ["The next infrastructure wave is digital"], lacks: ["Agency drill-down"] }, "?view=overview → home");
  await screen("/budget?agency=ncra-2027-2029", { contains: ["Fund sources", "NCRA"], lacks: ["Agency drill-down"] }, "?agency= → ask");
  await screen("/budget?view=shared&program=rapide", { contains: ["RAPIDE"] }, "program deep link");
} finally {
  await browser.close();
}

console.log(`\n${passes} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
