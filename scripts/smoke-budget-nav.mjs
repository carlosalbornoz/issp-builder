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
/** page.select that records a failure instead of aborting the run. */
const trySelect = async (p, selector, value) => {
  try {
    await p.select(selector, value);
  } catch {
    check(false, `select ${selector} exists`);
  }
};
const has = async (p, s) => (await text(p)).includes(s.toLowerCase());

/** Formal-tone contract for one screen: title = sidebar label, no question headings, no em dashes. */
async function formal(url, label, { contains = [], lacks = [] } = {}) {
  const p = await open(url);
  const probe = await p.evaluate(() => {
    const main = document.querySelector('nav[aria-label="Breadcrumb"]')?.parentElement ?? document.body;
    return {
      title: main.querySelector("h1, h2")?.textContent?.trim() ?? "",
      questions: [...main.querySelectorAll("h1, h2, h3")].map((h) => h.textContent?.trim() ?? "").filter((t) => t.endsWith("?")),
      emDash: document.body.innerText.includes("\u2014"),
      body: document.body.innerText.toLowerCase(),
    };
  });
  check(probe.title === label, `${label}: screen title (got "${probe.title}")`);
  check(probe.questions.length === 0, `${label}: no question headings (${probe.questions.join(" | ")})`);
  check(!probe.emDash, `${label}: no em dashes`);
  for (const s of contains) check(probe.body.includes(s.toLowerCase()), `${label}: contains "${s}"`);
  for (const s of lacks) check(!probe.body.includes(s.toLowerCase()), `${label}: lacks "${s}"`);
  await p.close();
}

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
  await screen("/budget?view=posture", { contains: ["Posture by agency", "Agriculture and food"], lacks: ["Fund sources", "Budget by agency"] }, "posture");
  await screen("/budget?view=ask", { contains: ["₱4.82B", "Fund sources", "Projects with PAP code"], lacks: ["Budget by agency", "DICT expense categories"] }, "ask");
  await screen("/budget?view=buys", { contains: ["DICT expense categories"], lacks: ["Fund sources"] }, "buys");
  await screen("/budget?view=agencies", { contains: ["Budget by agency", "Line items (CSV)"], lacks: ["Fund sources"] }, "agencies");
  await screen("/budget?view=absorptive", { contains: ["Obligation rate"], lacks: ["Budget stage by fiscal year"] }, "absorptive");
  await screen("/budget?view=money", { contains: ["Budget stage by fiscal year"], lacks: ["Ask ÷ obligations"] }, "money");

  console.log("\n[1] Legacy deep links");
  await screen("/budget", { contains: ["ICT spending is reaching infrastructure scale"], lacks: ["Budget by agency"] }, "bare /budget → home");
  await screen("/budget?view=overview", { contains: ["ICT spending is reaching infrastructure scale"], lacks: ["Budget by agency"] }, "?view=overview → home");
  await screen("/budget?agency=ncra-2027-2029", { contains: ["Fund sources", "NCRA"], lacks: ["Budget by agency"] }, "?agency= → ask");
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
    await p.waitForFunction(() => document.body.innerText.includes("ICT spending is reaching infrastructure"), { timeout: 15000 }).catch(() => {});
    check(await has(p, "ICT spending is reaching infrastructure scale"), "Home reachable under an agency scope");
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

  console.log("\n[3] Scope bar");
  {
    const p = await open("/budget?view=ask");
    const bar = await p.evaluate(() => {
      const el = document.querySelector('[data-scope-bar="full"]');
      return { visible: !!el && el.getBoundingClientRect().width > 0, height: el ? Math.round(el.getBoundingClientRect().height) : 0 };
    });
    check(bar.visible, "1440: full scope bar visible");
    check(bar.height > 0 && bar.height <= 56, `1440: scope bar is one row (${bar.height}px)`);
    await trySelect(p, '[data-scope-bar="full"] select[aria-label="Filter by PDP sector"]', "agricultureFood");
    await p.waitForFunction(() => location.search.includes("sector=agricultureFood"), { timeout: 15000 }).catch(() => {});
    check((await p.evaluate(() => location.search)).includes("sector=agricultureFood"), "sector dropdown sets ?sector=");
    await trySelect(p, '[data-scope-bar="full"] select[aria-label="Filter by fiscal year"]', "2027");
    await new Promise((r) => setTimeout(r, 500));
    check(await has(p, "FY2027 ISSP request"), "FY dropdown scopes the Investment summary KPI");
    await p.evaluate(() => document.querySelector('[data-scope-bar="full"] button[data-filters-trigger]')?.click());
    await new Promise((r) => setTimeout(r, 400));
    const popover = await p.evaluate(() => !!document.querySelector('select[aria-label="Filter by fund source"]'));
    check(popover, "Filters popover opens with the fund-source filter");
    const fundValue = await p.evaluate(() => [...(document.querySelector('select[aria-label="Filter by fund source"]')?.options ?? [])].map((o) => o.value).find((v) => v !== "all"));
    await trySelect(p, 'select[aria-label="Filter by fund source"]', fundValue ?? "x");
    await new Promise((r) => setTimeout(r, 400));
    await p.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 300));
    const badge = await p.evaluate(() => document.querySelector('[data-scope-bar="full"] [data-filter-count]')?.textContent?.trim());
    check(badge === "1", `Filters badge counts one active filter (got ${badge})`);
    await p.evaluate(() => [...document.querySelectorAll('[data-scope-bar="full"] button')].find((b) => b.textContent?.includes("Current form"))?.click());
    await p.waitForFunction(() => location.search.includes("mode=current"), { timeout: 15000 }).catch(() => {});
    check((await p.evaluate(() => location.search)).includes("mode=current"), "data-mode toggle sets ?mode=current");
    await p.close();
  }
  for (const width of [1280, 1440, 1920]) {
    const p = await open("/budget?view=ask&agency=ncra-2027-2029&mode=current", width, 900);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(over <= 1, `${width}: scope bar with agency chip fits (overflow ${over}px)`);
    await p.close();
  }
  await screen("/budget?agency=nope", { contains: ["No agencies match the current filters", "Clear all filters"] }, "empty scope");
  {
    const p = await open("/budget?view=posture", 390, 844);
    const compact = await p.evaluate(() => {
      const full = document.querySelector('[data-scope-bar="full"]');
      const mode = [...document.querySelectorAll('[data-scope-bar="compact"] button[aria-pressed]')].filter((b) => b.getBoundingClientRect().width > 0);
      return { fullHidden: !full || full.getBoundingClientRect().width === 0, modeButtons: mode.length };
    });
    check(compact.fullHidden, "390: full scope bar hidden");
    check(compact.modeButtons === 2, `390: data-mode toggle visible without opening anything (${compact.modeButtons})`);
    await p.evaluate(() => document.querySelector('button[aria-label^="Scope"]')?.click());
    await new Promise((r) => setTimeout(r, 500));
    const sheet = await p.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? "");
    check(sheet.includes("Fiscal year") && sheet.includes("Sector"), "390: Scope opens a sheet with the filters");
    check(!(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)), "390: no overflow with the scope sheet open");
    await p.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 500));
    check(!(await p.evaluate(() => !!document.querySelector('[role="dialog"]'))), "390: Esc closes the scope sheet");
    const tall = await p.evaluate(() => Math.round(document.querySelector('[data-scope-bar="compact"]')?.closest(".sticky")?.getBoundingClientRect().height ?? 999));
    check(tall <= 64, `390: sticky bar stays one row (${tall}px)`);
    await p.close();
  }

  console.log("\n[4] Home cards, ICT domains hub, Sector comparison");
  {
    const p = await open("/budget");
    const home = await p.evaluate(() => ({
      cards: document.querySelectorAll("a[data-card]").length,
      askCard: document.querySelector('a[data-card][href*="view=ask"]')?.textContent ?? "",
      heading: [...document.querySelectorAll("h2")].some((h) => h.textContent?.trim() === "Select an area to review"),
      locked: document.querySelectorAll("a[data-card][data-locked]").length,
    }));
    check(home.heading, "Home heading: Select an area to review");
    check(home.cards === 9, `Home shows 9 area cards (${home.cards})`);
    check(home.askCard.includes("Investment summary") && home.askCard.includes("₱4.82B"), `Investment summary card carries ₱4.82B (${home.askCard})`);
    check(home.locked === 0, "Revised form: no locked cards");
    await p.close();
  }
  {
    const p = await open("/budget?mode=current");
    const locked = await p.evaluate(() => [...document.querySelectorAll("a[data-card][data-locked]")].map((a) => a.getAttribute("href")));
    check(locked.length === 2 && locked.some((h) => h.includes("view=money")) && locked.some((h) => h.includes("view=absorptive")), `Current form: Plan to obligation and Absorptive capacity cards lock (${locked.join(" ")})`);
    await p.close();
  }
  {
    const p = await open("/budget?view=sectors");
    check(await has(p, "Agriculture and food"), "Sector comparison lists Agriculture and food");
    await p.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("Agriculture and food") && a.getAttribute("href")?.includes("sector=agricultureFood"))?.click());
    await p.waitForFunction(() => location.search.includes("view=posture"), { timeout: 15000 }).catch(() => {});
    const qs = await p.evaluate(() => location.search);
    check(qs.includes("view=posture") && qs.includes("sector=agricultureFood"), `sector row opens the posture grid for that sector (${qs})`);
    await new Promise((r) => setTimeout(r, 600));
    check(await has(p, "PDP Ch. 5"), "posture grid shows the sector group");
    await p.close();
  }
  {
    const p = await open("/budget?view=domains");
    const cards = await p.evaluate(() => [...document.querySelectorAll("a[data-card]")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent ?? "" })));
    check(cards.length === 8, `ICT domains hub shows 8 cards (${cards.length})`);
    const cyberCard = cards.find((c) => c.href?.includes("view=cybersecurity"))?.text ?? "";
    const devicesCard = cards.find((c) => c.href?.includes("view=devices"))?.text ?? "";
    await p.close();
    const cyber = await open("/budget?view=cybersecurity");
    const avg = (await cyber.evaluate(() => document.body.innerText.match(/Selection average:? (\d+%)/)?.[1])) ?? "?";
    await cyber.close();
    check(cyberCard.includes(avg), `Cybersecurity card matches the view's selection average ${avg} (${cyberCard})`);
    const dev = await open("/budget?view=devices");
    const devTotal = (await dev.evaluate(() => document.body.innerText.match(/(₱[\d.]+[KMB]),? (?:across )?all plan/)?.[1])) ?? "?";
    await dev.close();
    check(devicesCard.includes(devTotal), `Devices card matches the view's device spend ${devTotal} (${devicesCard})`);
  }

  console.log("\n[5a] Formal tone: Home and Overview");
  await formal("/budget", "ICT Budget Dashboard", {
    contains: ["ICT spending is reaching infrastructure scale", "AI and compute requests"],
    lacks: ["plan first, then spend", "Why now", "one domain at a time", "one domain of ten"],
  });
  await formal("/budget?view=posture", "Government-wide posture", { lacks: ["Flip the Data mode", "no FY2025 row", "computed from today's form"] });
  await formal("/budget?view=posture&mode=current", "Government-wide posture", { lacks: ["Flip back to Revised form"] });
  await formal("/budget?view=sectors", "Sector comparison");
  await formal("/budget?view=domains", "ICT domains");

  console.log("\n[5b] Formal tone: Investment");
  await formal("/budget?view=ask", "Investment summary", {
    contains: ["By Part IV strategic category", "Part IV B.2"],
    lacks: ["stacked by", "across the selection", "ISSP ask"],
  });
  await formal("/budget?view=ask&mode=current", "Investment summary", { contains: ["Baseline and three targets set"] });
  await formal("/budget?view=buys", "Expenditure by category", { contains: ["DICT expense categories"], lacks: ["Where the money goes"] });

  console.log("\n[5c] Formal tone: ICT domains");
  const informal = ["Computed from today's form", "today's form"];
  await formal("/budget?view=cybersecurity", "Cybersecurity", { contains: ["Current form · no new fields required", "Fleet exposure and advisory impact"], lacks: [...informal, "blast radius", "Government cyber posture"] });
  await formal("/budget?view=devices", "Devices", { contains: ["Device estate", "Unit price comparison"], lacks: [...informal, "Unit-price sanity", "The estate today"] });
  await formal("/budget?view=networks", "Networks", { contains: ["Planned network links"], lacks: [...informal, "The links the plans name"] });
  await formal("/budget?view=cloud", "Cloud and software", { contains: ["Current system hosting", "Planned system hosting"], lacks: [...informal, "Where systems live today", "on the Overview"] });
  await formal("/budget?view=ai", "AI and compute", { contains: ["AI and compute requests"], lacks: ["AI and compute asks", "lights this view up"] });
  await formal("/budget?view=people", "ICT workforce", { contains: ["Planned ICT training", "Capability spending"], lacks: [...informal, "Training in the plans"] });
  await formal("/budget?view=services", "eGovernment services", { contains: ["Frontline service access"], lacks: [...informal, "How frontline services are reached"] });
  await formal("/budget?view=shared", "Shared services", { contains: ["Duplicate system clusters", "Alignment with national plans"], lacks: ["buy once, together", "Where a shared service could replace separate builds"] });

  console.log("\n[5d] Formal tone: Budget execution");
  await formal("/budget?view=money", "Plan to obligation", {
    contains: ["Budget stage by fiscal year", "Procurement status of funded projects", "proposed link"],
    lacks: ["Follow every peso", "has procurement started", "nobody", "Procurement pulse"],
  });
  await formal("/budget?view=money&mode=current", "Plan to obligation", { contains: ["View a project trace"] });
  await formal("/budget?view=money&sector=energy", "Plan to obligation", { contains: ["No GAA agencies in scope"], lacks: ["bring the loop back"] });
  await formal("/budget?view=absorptive", "Absorptive capacity", { contains: ["FY2027 request", "Request ÷ obligations"], lacks: ["Can each agency spend", "Steepest step"] });

  console.log("\n[5e] Formal tone: Agencies");
  await formal("/budget?view=agencies", "Agency ISSPs", { contains: ["Budget by agency", "Select an agency to open its ISSP"], lacks: ["drill-down", "click through", "click the acronym"] });
} finally {
  await browser.close();
}

console.log(`\n${passes} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
