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

  console.log("\n[2] Sidebar frame");
  {
    const p = await open("/budget?view=cybersecurity&sector=agricultureFood&mode=current");
    const side = await p.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Dashboard"]');
      const visible = !!nav && nav.getBoundingClientRect().width > 0;
      return {
        visible,
        current: nav?.querySelector('[aria-current="page"]')?.textContent?.trim() ?? null,
        home: !![...(nav?.querySelectorAll("a") ?? [])].find((a) => a.textContent?.trim() === "Home"),
        crumb: document.querySelector('nav[aria-label="Breadcrumb"]')?.textContent ?? "",
        // Same accent as the header's active chip: no theme rule may re-skin the sidebar.
        // The whole list fits a 1440×900 viewport without an inner scroll.
        fits: nav ? nav.parentElement.scrollHeight <= nav.parentElement.clientHeight + 1 : false,
        activeBg: nav ? getComputedStyle(nav.querySelector('[aria-current="page"]')).backgroundColor : null,
        headerBg: getComputedStyle(document.querySelector("header nav a.bg-accent")).backgroundColor,
      };
    });
    check(side.visible, "sidebar visible at 1440");
    check(side.current === "Cybersecurity", `sidebar marks Cybersecurity current (got ${side.current})`);
    check(side.home, "sidebar carries a Home link");
    check(side.fits, "sidebar fits a 900px-tall viewport");
    check(side.activeBg === side.headerBg, `sidebar active item uses the page accent (${side.activeBg} vs ${side.headerBg})`);
    check(side.crumb.includes("Home") && side.crumb.includes("ICT domains") && side.crumb.includes("Cybersecurity"), `breadcrumb Home › ICT domains › Cybersecurity (got "${side.crumb}")`);
    check(!(await has(p, "Fiscal transparency · Structured ISSP data")), "old hero section removed");
    check(await has(p, "Demonstration · fictitious data"), "sidebar footer carries the fictitious-data label");
    check(!(await has(p, "Every agency, officer, program and figure")), "full demo notice only on Home");
    await p.evaluate(() => document.querySelector('nav[aria-label="Dashboard"] a[href*="view=money"]')?.click());
    await p.waitForFunction(() => location.search.includes("view=money"), { timeout: 15000 }).catch(() => {});
    const qs = await p.evaluate(() => location.search);
    check(qs.includes("view=money") && qs.includes("sector=agricultureFood") && qs.includes("mode=current"), `scope survives sidebar navigation (${qs})`);
    await p.close();
  }
  {
    const p = await open("/budget?view=ask&agency=ncra-2027-2029");
    await p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Dashboard"] a')].find((a) => a.textContent?.trim() === "Home")?.click());
    await p.waitForFunction(() => document.body.innerText.includes("The next infrastructure wave"), { timeout: 15000 }).catch(() => {});
    check(await has(p, "The next infrastructure wave is digital"), "Home reachable under an agency scope");
    check(await has(p, "ICT Budget Dashboard"), "Home carries the dashboard H1");
    check(await has(p, "Every agency, officer, program and figure"), "Home carries the full demo notice");
    await p.close();
  }
  {
    const p = await open("/budget?view=cybersecurity", 390, 844);
    const sideVisible = await p.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Dashboard"]');
      return !!nav && nav.getBoundingClientRect().width > 0;
    });
    check(!sideVisible, "no in-flow sidebar at 390");
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    check(!(await overflow()), "390: no horizontal overflow (drawer closed)");
    await p.evaluate(() => document.querySelector('button[aria-label="Open dashboard menu"]')?.click());
    await new Promise((r) => setTimeout(r, 500));
    const drawer = await p.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? "");
    check(drawer.includes("Cybersecurity") && drawer.includes("Plan to obligation"), "Menu opens the navigation drawer");
    check(!(await overflow()), "390: no horizontal overflow (drawer open)");
    await p.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 500));
    check(!(await p.evaluate(() => !!document.querySelector('[role="dialog"]'))), "Esc closes the drawer");
    const homeBtn = await p.evaluate(() => !!document.querySelector('a[aria-label="Dashboard home"]'));
    check(homeBtn, "390: Home is one tap away without the drawer");
    await p.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${passes} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
