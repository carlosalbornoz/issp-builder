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
    const main = document.querySelector("[data-screen-col]") ?? document.body;
    return {
      title: main.querySelector("h1")?.textContent?.trim() ?? "",
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
    await p.keyboard.press("Escape");
    await p.waitForFunction(() => document.querySelector('[data-scope-bar="full"] [data-filter-count]')?.textContent?.trim() === "1", { timeout: 15000 }).catch(() => {});
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
  {
    // The continuing-cost insight must end on the last full plan year (FY2029),
    // the same endpoint as the Home outlook tile, never the FY2030 tail.
    const p = await open("/budget?view=ask");
    await p.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("More insights"));
      if (btn?.getAttribute("aria-expanded") === "false") btn.click();
    });
    await new Promise((r) => setTimeout(r, 350));
    const sentence = await p.evaluate(
      () => document.body.innerText.match(/Continuing costs rise from \d+% of the FY\d{4} request to \d+% in FY\d{4}/)?.[0] ?? ""
    );
    check(sentence.endsWith("to 13% in FY2029"), `Investment insight ends at FY2029 like the Home tile (got "${sentence}")`);
    await p.close();
  }
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
  {
    // The data-mode explanation is a real tooltip: absent on phones (the sr-only
    // group label keeps its name), keyboard-reachable at full width, opening
    // with its text on focus.
    const p = await open("/budget", 390, 844);
    const phone = await p.evaluate(() => document.querySelector('[data-scope-bar="compact"] [aria-label="About the data modes"]') === null);
    check(phone, "390: compact data mode renders no tooltip trigger");
    await p.close();
    const d = await open("/budget");
    const desk = await d.evaluate(() => document.querySelector('[aria-label="About the data modes"]')?.tabIndex);
    check(desk === 0, `1440: data-mode hint is keyboard reachable (tabIndex ${desk})`);
    await d.evaluate(() => document.querySelector('[aria-label="About the data modes"]')?.focus());
    await new Promise((r) => setTimeout(r, 500));
    const tip = await d.evaluate(
      () => [...document.querySelectorAll("body *")].find((n) => n.children.length === 0 && n.textContent?.startsWith("Revised form: includes proposed"))?.textContent?.slice(0, 30) ?? null
    );
    check(tip !== null, `data-mode tooltip opens on keyboard focus (${tip})`);
    await d.close();
  }
  {
    const p = await open("/budget?view=ask");
    const hint = await p.evaluate(() => document.querySelector('[aria-label="Fund sources methodology"]')?.tabIndex);
    check(hint === 0, `panel methodology hint is keyboard reachable (tabIndex ${hint})`);
    await p.evaluate(() => document.querySelector('[aria-label="Fund sources methodology"]')?.focus());
    await new Promise((r) => setTimeout(r, 500));
    const tip = await p.evaluate(() =>
      [...document.querySelectorAll("body *")].some((n) => n.children.length === 0 && n.textContent?.startsWith("LGU and GOCC budgets"))
    );
    check(tip, "panel methodology tooltip opens on keyboard focus");
    await p.close();
  }

  console.log("\n[5f] Round-10 audit: honest figures and controls");
  {
    // The toolbar readout must follow the FY filter the screens apply (FY2027 = 172 lines, 1.48B).
    const p = await open("/budget");
    await p.select('select[aria-label="Filter by fiscal year"]', "2027");
    await p.waitForFunction(() => location.search.includes("fy=2027"), { timeout: 15000 }).catch(() => {});
    await p.waitForFunction(() => [...document.querySelectorAll("span")].some((s) => s.textContent?.includes("172 line items")), { timeout: 15000 }).catch(() => {});
    const summary = await p.evaluate(() => [...document.querySelectorAll("span")].find((s) => s.textContent?.includes("line items"))?.textContent?.trim() ?? "");
    check(/172 line items · ₱1\.48B FY2027/.test(summary), `toolbar summary follows the FY filter (got "${summary}")`);
    await p.close();
  }
  {
    // Ghosted panels in current form are removed from keyboard reach (inert), and the
    // lock badge sits in flow, flat.
    const p = await open("/budget?view=money&mode=current");
    const ghosts = await p.evaluate(() => ({
      inert: document.querySelectorAll('[aria-hidden="true"][inert]').length,
      focusableInGhost: [...document.querySelectorAll('[aria-hidden="true"]:not([inert])')].filter((n) => n.querySelector("a[href], button, select")).length,
      badgeShadow: !!document.querySelector(".shadow-md.rounded-lg.border-dashed"),
    }));
    check(ghosts.inert >= 2 && ghosts.focusableInGhost === 0, `current-form ghosts are inert (inert ${ghosts.inert}, stray focusables ${ghosts.focusableInGhost})`);
    check(!ghosts.badgeShadow, "current-form lock badge is flat (no shadow)");
    const tiles = await p.evaluate(() => [...document.querySelectorAll("a")].filter((a) => a.getAttribute("href") === "/budget?view=money" && /FY\d{4}/.test(a.textContent ?? "")).length);
    check(tiles === 0, `fiscal-year tiles are static figures, not links (${tiles} links)`);
    await p.close();
  }
  {
    // Disclosure triggers announce their open state; the trace page marks its parent
    // entry as related, not as the current page.
    const p = await open("/budget", 390, 844);
    const triggers = await p.evaluate(() => ({
      scope: document.querySelector('button[aria-label^="Scope"]')?.getAttribute("aria-expanded"),
      menu: document.querySelector('button[aria-label="Open dashboard menu"]')?.getAttribute("aria-expanded"),
    }));
    check(triggers.scope === "false" && triggers.menu === "false", `390: scope and menu triggers expose aria-expanded (${JSON.stringify(triggers)})`);
    await p.close();
    const t = await open("/budget/trace/ncwtr-2026-2028/proj-sikap");
    const moneyCurrent = await t.evaluate(() => document.querySelector('nav[aria-label="Dashboard"] a[aria-current]')?.getAttribute("aria-current"));
    check(moneyCurrent === "true", `trace page marks Plan to obligation aria-current="true", not "page" (got "${moneyCurrent}")`);
    await t.close();
  }

  console.log("\n[5g] The whole scope bar lives in the URL");
  {
    const p = await open("/budget");
    await p.select('select[aria-label="Filter by fiscal year"]', "2027");
    await p.waitForFunction(() => location.search.includes("fy=2027"), { timeout: 15000 }).catch(() => {});
    await p.evaluate(() => document.querySelector("button[data-filters-trigger]")?.click());
    await new Promise((r) => setTimeout(r, 400));
    const cycleValue = await p.evaluate(() => [...(document.querySelector('select[aria-label="Filter by plan cycle"]')?.options ?? [])].map((o) => o.value).find((v) => v !== "all"));
    const fundValue = await p.evaluate(() => [...(document.querySelector('select[aria-label="Filter by fund source"]')?.options ?? [])].map((o) => o.value).find((v) => v !== "all"));
    await p.select('select[aria-label="Filter by plan cycle"]', cycleValue ?? "x");
    await p.select('select[aria-label="Filter by agency type"]', "NGA");
    await p.select('select[aria-label="Filter by fund source"]', fundValue ?? "x");
    await p.keyboard.press("Escape");
    await p.waitForFunction(
      () => ["fy=2027", "cycle=", "type=NGA", "fund="].every((k) => location.search.includes(k)),
      { timeout: 15000 }
    ).catch(() => {});
    const qs = await p.evaluate(() => location.search);
    check(["fy=2027", "type=NGA"].every((k) => qs.includes(k)) && qs.includes("cycle=") && qs.includes("fund="), `all four filters land in the URL (${qs})`);
    // Round trip through the data standard keeps every key.
    await p.evaluate(() => document.querySelector('nav[aria-label="Dashboard"] a[href^="/budget/data-standard"]')?.click());
    await p.waitForFunction(() => location.pathname === "/budget/data-standard", { timeout: 15000 }).catch(() => {});
    await p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Dashboard"] a')].find((a) => a.getAttribute("href")?.startsWith("/budget?"))?.click());
    await p.waitForFunction(() => location.pathname === "/budget", { timeout: 15000 }).catch(() => {});
    const back = await p.evaluate(() => location.search);
    check(["fy=2027", "type=NGA"].every((k) => back.includes(k)) && back.includes("cycle=") && back.includes("fund="), `data standard round trip keeps the whole scope (${back})`);
    // Clear all filters empties every key.
    await p.goto(`${BASE}/budget?view=ask&agency=nope&fy=2027&cycle=${encodeURIComponent(cycleValue ?? "x")}&type=NGA&fund=${encodeURIComponent(fundValue ?? "x")}`, { waitUntil: "networkidle0", timeout: 60000 });
    await p.waitForFunction(() => document.body.innerText.includes("No agencies match"), { timeout: 15000 }).catch(() => {});
    await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Clear all filters"))?.click());
    await p.waitForFunction(() => !/[&?](fy|cycle|type|fund|agency)=/.test(location.search), { timeout: 15000 }).catch(() => {});
    const cleared = await p.evaluate(() => location.search);
    check(!/[&?](fy|cycle|type|fund|agency)=/.test(cleared), `Clear all filters empties every scope key (${cleared})`);
    await p.close();
  }

  console.log("\n[5h] Wayfinding: crumbs, scope line, sidebar groups");
  {
    const urls = [
      "/budget?view=posture", "/budget?view=sectors", "/budget?view=ask", "/budget?view=buys",
      "/budget?view=domains", "/budget?view=cybersecurity", "/budget?view=devices", "/budget?view=networks",
      "/budget?view=cloud", "/budget?view=ai", "/budget?view=people", "/budget?view=services",
      "/budget?view=shared", "/budget?view=money", "/budget?view=absorptive", "/budget?view=agencies",
      "/budget/data-standard", "/budget/trace/ncwtr-2026-2028/proj-sikap",
    ];
    const p = await open("/budget?view=cybersecurity");
    for (const url of urls) {
      await p.goto(`${BASE}${url}`, { waitUntil: "networkidle0", timeout: 60000 });
      await p.waitForFunction(() => !document.querySelector("[aria-busy]"), { timeout: 30000 }).catch(() => {});
      const dead = await p.evaluate(() => {
        const lis = [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')];
        const last = lis.length - 1;
        return lis.filter((li, i) => i !== last && !li.querySelector("a")).length;
      });
      check(dead === 0, `${url}: every crumb before the current screen is a link (${dead} dead)`);
    }
    await p.close();
  }
  {
    const p = await open("/budget?view=posture&sector=agricultureFood");
    const crumbs = await p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')].map((li) => li.textContent?.trim()));
    check(crumbs.join(" > ") === "Home > Sector comparison > Agriculture and food", `sector drill-down trail (${crumbs.join(" > ")})`);
    const backHref = await p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Breadcrumb"] a')].find((a) => a.textContent?.includes("Sector comparison"))?.getAttribute("href"));
    check(backHref === "/budget?view=sectors&sector=agricultureFood", `trail links back to the scoped Sector comparison (${backHref})`);
    const note = await p.evaluate(() => document.querySelector("[data-scope-note]")?.textContent?.trim());
    check(note === "Sector: Agriculture and food", `scope line on a sector-scoped screen (${note})`);
    await p.close();
  }
  {
    const p = await open("/budget?view=cybersecurity&agency=ncra-2027-2029");
    const note = await p.evaluate(() => document.querySelector("[data-scope-note]")?.textContent?.trim());
    check(note === "Agency: NCRA", `scope line on an agency-scoped screen (${note})`);
    await p.close();
    const q = await open("/budget?view=ask");
    check((await q.evaluate(() => document.querySelector("[data-scope-note]"))) === null, "no scope line without a scope");
    await q.close();
  }
  {
    const p = await open("/budget");
    const minGap = await p.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Dashboard"]');
      const groups = [...(nav?.querySelectorAll("div.mt-4") ?? [])];
      let min = Infinity;
      groups.forEach((g) => {
        const prev = g.previousElementSibling;
        if (prev) min = Math.min(min, g.getBoundingClientRect().top - prev.getBoundingClientRect().bottom);
      });
      return Number.isFinite(min) ? Math.round(min) : -1;
    });
    check(minGap >= 15, `sidebar groups separated by clear space (min gap ${minGap}px) and the list fits 900px`);
    await p.close();
  }

  console.log("\n[5i] Feedback: sheet summary, insights in view, scoped demo link");
  {
    const p = await open("/budget", 390, 844);
    await p.click('button[aria-label^="Scope"]');
    await new Promise((r) => setTimeout(r, 500));
    const sheetSummary = await p.evaluate(() => {
      const el = document.querySelector("[data-sheet-summary]");
      const dlg = document.querySelector("[role=dialog]");
      return { present: !!el && !!dlg?.contains(el), text: el?.textContent?.trim() ?? "" };
    });
    check(sheetSummary.present && /line items/.test(sheetSummary.text), `scope sheet shows the live summary (${sheetSummary.text})`);
    await p.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 300));
    await p.close();
  }
  {
    const p = await open("/budget?view=ask");
    await p.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.includes("More insights"));
      if (b?.getAttribute("aria-expanded") === "false") b.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    const vis = await p.evaluate(() => {
      const el = document.getElementById("view-insights");
      if (!el) return { exists: false };
      const r = el.getBoundingClientRect();
      return { exists: true, hidden: el.hidden, inView: r.top < innerHeight && r.bottom > 0 };
    });
    check(vis.exists && !vis.hidden && vis.inView, `insights panel is mounted, open and in view (${JSON.stringify(vis)})`);
    await p.close();
    const q = await open("/budget?view=ask");
    const mounted = await q.evaluate(() => {
      const el = document.getElementById("view-insights");
      return el !== null && el.hidden;
    });
    check(mounted, "insights panel stays mounted and hidden when closed");
    await q.close();
  }
  {
    const p = await open("/budget/data-standard?sector=agricultureFood");
    const href = await p.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("Open the current-form dashboard"))?.getAttribute("href"));
    check(href === "/budget?view=posture&mode=current&sector=agricultureFood", `demo link carries the scope (${href})`);
    await p.close();
  }

  console.log("\n[5j] Consistency: KPI icons, plural, share boundary, by-kind order, funnel scale");
  {
    const p = await open("/budget?view=ask");
    const kpis = await p.evaluate(() => {
      const tiles = [...document.querySelectorAll("[data-kpi]")];
      return { total: tiles.length, withIcon: tiles.filter((t) => t.querySelector("svg")).length };
    });
    check(kpis.total === 5 && kpis.withIcon === 5, `all five KPI tiles carry the icon pattern (${kpis.withIcon}/${kpis.total})`);
    await p.close();
  }
  {
    const p = await open("/budget?agency=ncra-2027-2029");
    check(await has(p, "1 agency ·"), "agency-scoped KPI sub reads 1 agency (plural)");
    await p.close();
  }
  {
    const p = await open("/budget?view=buys");
    const shares = await p.evaluate(() => document.body.innerText);
    check(!shares.includes("1.0%"), "sub-1 percent shares trim the trailing .0");
    await p.close();
  }
  {
    const p = await open("/budget?view=ai");
    const order = await p.evaluate(() => {
      const head = [...document.querySelectorAll("p")].find((n) => n.textContent?.trim() === "By kind");
      const box = head?.parentElement;
      return box ? [...box.querySelectorAll(":scope > div > span:first-child")].map((n) => n.textContent?.trim()) : [];
    });
    check(order.join("|") === "Own GPU cluster|Teaching and research|Shared platform", `By kind rows sort by value (${order.join(" | ")})`);
    await p.close();
  }
  {
    const p = await open("/budget?view=money");
    const scale = await p.evaluate(() => {
      const h3 = [...document.querySelectorAll("h3")].find((x) => x.textContent?.includes("Budget stage"));
      const card = h3?.closest("div.rounded-xl");
      const blocks = card ? [...card.querySelectorAll(":scope > div.grid > div")] : [];
      const ratios = blocks
        .map((b) => {
          const planRow = [...b.querySelectorAll("div.grid")].find((r) => r.querySelector("span")?.textContent === "ISSP plan");
          const bar = planRow?.querySelector(".h-4 > div");
          const value = planRow?.querySelector(".w-20")?.textContent ?? "";
          return bar && value ? bar.getBoundingClientRect().width / (parseFloat(value.replace(/[^0-9.]/g, "")) || 1) : null;
        })
        .filter((r) => r !== null);
      if (ratios.length !== 3) return { ok: false, ratios };
      const max = Math.max(...ratios);
      const min = Math.min(...ratios);
      return { ok: max - min <= max * 0.05, spread: Math.round(((max - min) / max) * 100) };
    });
    check(scale.ok, `budget-stage year columns share one scale (spread ${scale.spread ?? "?"}%)`);
    await p.close();
  }
  {
    const p = await open("/budget?view=agencies", 390, 844);
    const nowrap = await p.evaluate(() => {
      const cell = [...document.querySelectorAll("td")].find((td) => td.textContent?.includes("SUC"));
      return cell ? getComputedStyle(cell).whiteSpace : null;
    });
    check(nowrap === "nowrap", `agency type cell does not wrap on phones (${nowrap})`);
    const foot = await p.evaluate(() => {
      const link = [...document.querySelectorAll("footer a")].find((a) => a.textContent?.includes("View on GitHub"));
      const brandBlock = link?.parentElement?.previousElementSibling;
      if (!link || !brandBlock) return null;
      return Math.round(Math.abs(link.getBoundingClientRect().left - brandBlock.getBoundingClientRect().left));
    });
    check(foot !== null && foot <= 2, `stacked phone footer shares one alignment (left delta ${foot}px)`);
    await p.close();
  }

  console.log("\n[5k] No single-word last lines on the flagged text");
  {
    // Word-level check: the last visual line of each flagged element carries at
    // least two words (non-breaking joins and text-wrap: pretty keep pairs together).
    const lastLineWords = (p, suffix) =>
      p.evaluate((sfx) => {
        const el = [...document.querySelectorAll("p, span")].find((n) => n.childElementCount === 0 && n.textContent?.trim().endsWith(sfx));
        if (!el) return null;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const words = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const parts = node.textContent.split(/(\s+)/);
          let off = 0;
          for (const part of parts) {
            if (part.trim()) {
              const r = document.createRange();
              r.setStart(node, off);
              r.setEnd(node, off + part.length);
              const rect = r.getClientRects()[0];
              if (rect) words.push({ w: part, top: Math.round(rect.top) });
            }
            off += part.length;
          }
        }
        const lastTop = words[words.length - 1]?.top;
        return words.filter((x) => x.top === lastTop).map((x) => x.w).join(" ");
      }, suffix);
    const home = await open("/budget");
    const lede = await lastLineWords(home, "ISSP.");
    check(lede !== null && lede.split(" ").length >= 2, `Home lede ends with a full pair (${lede})`);
    await home.close();
    const money = await open("/budget?view=money", 390, 844);
    const t26 = await lastLineWords(money, "Jun)");
    const t27 = await lastLineWords(money, "NEP");
    check(t26 === "(30 Jun)", `FY2026 tile keeps its date together (${t26})`);
    check(t27 === "the NEP", `FY2027 tile keeps its phrase together (${t27})`);
    await money.close();
    const ds = await open("/budget/data-standard");
    const detail = await lastLineWords(ds, "key.");
    check(detail !== null && detail.split(" ").length >= 2, `question card detail ends with a full pair (${detail})`);
    await ds.close();
    const h = await open("/budget", 390, 844);
    const delta = await h.evaluate(() => {
      const footerBlock = [...document.querySelectorAll("footer a")].find((a) => a.textContent?.includes("View on GitHub"))?.parentElement?.previousElementSibling;
      const card = document.querySelector("a[data-card]");
      return footerBlock && card ? Math.round(Math.abs(footerBlock.getBoundingClientRect().left - card.getBoundingClientRect().left)) : null;
    });
    check(delta !== null && delta <= 2, `phone footer aligns with the page column (left delta ${delta}px)`);
    await h.close();
  }

  console.log("\n[5l] Expense class filter (capital outlay vs MOOE)");
  {
    const p = await open("/budget");
    await p.evaluate(() => document.querySelector("button[data-filters-trigger]")?.click());
    await new Promise((r) => setTimeout(r, 400));
    await p.select('select[aria-label="Filter by expense class"]', "capitalOutlay");
    await p.keyboard.press("Escape");
    await p.waitForFunction(() => location.search.includes("class=capitalOutlay"), { timeout: 15000 }).catch(() => {});
    await p.waitForFunction(() => [...document.querySelectorAll("span")].some((s) => s.textContent?.includes("line items · ₱3.84B")), { timeout: 15000 }).catch(() => {});
    const qs = await p.evaluate(() => location.search);
    const summary = await p.evaluate(() => [...document.querySelectorAll("span")].find((s) => s.textContent?.includes("line items"))?.textContent?.trim() ?? "");
    check(qs.includes("class=capitalOutlay") && summary.includes("₱3.84B"), `expense class filter scopes the corpus to capital outlay (${qs} / ${summary})`);
    await p.close();
  }
  {
    // The trace CTA must carry the scope so the round trip returns to the same lens.
    const p = await open("/budget?view=money&sector=agricultureFood&mode=current");
    const href = await p.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("View a project trace"))?.getAttribute("href"));
    check(href === "/budget/trace/ncwtr-2026-2028/proj-sikap?sector=agricultureFood&mode=current", `money trace link carries the scope (${href})`);
    await p.close();
  }

  console.log("\n[5e] Formal tone: Agencies");
  await formal("/budget?view=agencies", "Agency ISSPs", { contains: ["Budget by agency", "Select an agency to open its ISSP"], lacks: ["drill-down", "click through", "click the acronym"] });

  console.log("\n[6] Data standard and trace share the frame");
  for (const [url, current, crumb] of [
    ["/budget/data-standard", "Data standard", "Data standard"],
    ["/budget/trace/ncwtr-2026-2028/proj-sikap", "Plan to obligation", "Plan to obligation"],
  ]) {
    const p = await open(url);
    const f = await p.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Dashboard"]');
      return {
        current: nav?.querySelector('[aria-current="page"], [aria-current="true"]')?.textContent?.trim() ?? null,
        home: !![...(nav?.querySelectorAll("a") ?? [])].find((a) => a.textContent?.trim() === "Home"),
        crumb: document.querySelector('nav[aria-label="Breadcrumb"]')?.textContent ?? "",
        budgetChip: document.querySelector("header nav a.bg-accent")?.innerText?.trim() ?? null,
      };
    });
    check(f.home, `${url}: sidebar Home link`);
    check(f.current === current, `${url}: sidebar marks ${current} (got ${f.current})`);
    check(f.crumb.includes(crumb), `${url}: breadcrumb includes ${crumb} (got "${f.crumb}")`);
    check(f.budgetChip === "Budget Dashboard", `${url}: header marks Budget Dashboard (got ${f.budgetChip})`);
    await p.close();
  }
  {
    const p = await open("/budget/data-standard");
    const href = await p.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("Open the current-form dashboard"))?.getAttribute("href"));
    check(href === "/budget?view=posture&mode=current", `data standard links to the posture grid in Current form (${href})`);
    const tone = await p.evaluate(() => ({
      h1: document.querySelector("h1")?.textContent?.trim() ?? "",
      questions: [...document.querySelectorAll("h1,h2,h3")].map((h) => h.textContent?.trim() ?? "").filter((t) => t.endsWith("?")),
      emDash: document.body.innerText.includes("\u2014"),
      askBand: document.body.innerText.toUpperCase().includes("THE ASK"),
    }));
    check(tone.h1 === "Data standard", `data standard: h1 equals the sidebar label (got "${tone.h1}")`);
    check(tone.questions.length === 0, `data standard: no question headings (${tone.questions.join(" | ")})`);
    check(!tone.emDash, "data standard: no em dashes");
    check(!tone.askBand, "data standard: no \"The ask\" band label");
    await p.close();
    const m = await open("/budget/data-standard", 390, 844);
    check(!(await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)), "390: data standard does not overflow");
    check(await m.evaluate(() => !!document.querySelector('button[aria-label="Open dashboard menu"]')), "390: data standard has the dashboard menu");
    const pre = await m.evaluate(() => {
      const el = document.querySelector("pre");
      return el ? { client: el.clientWidth, scroll: el.scrollWidth } : null;
    });
    check(pre === null || pre.scroll <= pre.client, `390: sample record code block shows every line (scroll ${pre?.scroll} vs client ${pre?.client})`);
    await m.close();
  }

  console.log("\n[7] Demo path rehearsal: posture → sector lens → domain → mode flip → money → data standard");
  {
    const p = await open("/budget");
    const click = async (selector, label) => {
      const hit = await p.evaluate((sel) => {
        const el = document.querySelector(sel);
        el?.click();
        return !!el;
      }, selector);
      check(hit, `demo: ${label} is clickable`);
      await new Promise((r) => setTimeout(r, 900));
    };
    const at = () => p.evaluate(() => location.pathname + location.search);
    await click('a[data-card][href*="view=posture"]', "Home card Government-wide posture");
    check((await at()).includes("view=posture") && (await has(p, "Posture by agency")), `demo 1: posture grid (${await at()})`);
    await click('nav[aria-label="Dashboard"] a[href*="view=sectors"]', "sidebar Sector comparison");
    await p.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.getAttribute("href")?.includes("sector=agricultureFood") && a.textContent?.includes("Agriculture and food"))?.click());
    await new Promise((r) => setTimeout(r, 900));
    check((await at()).includes("sector=agricultureFood") && (await has(p, "PDP Ch. 5")), `demo 2: sector lens on the posture grid (${await at()})`);
    await click('nav[aria-label="Dashboard"] a[href*="view=cybersecurity"]', "sidebar Cybersecurity");
    check((await at()).includes("sector=agricultureFood"), "demo 3: domain keeps the sector lens");
    await p.evaluate(() => [...document.querySelectorAll('[data-scope-bar="full"] button')].find((b) => b.textContent?.includes("Current form"))?.click());
    await new Promise((r) => setTimeout(r, 900));
    check((await has(p, "Requires: the Annex 1 asset inventory")) && (await has(p, "Cybersecurity control coverage")), "demo 4: mode flip locks the fleet panel, controls grid stays live");
    await click('nav[aria-label="Dashboard"] a[href*="view=money"]', "sidebar Plan to obligation");
    check((await at()).includes("mode=current") && (await has(p, "Requires: UACS join keys")), `demo 5: Plan to obligation keeps the mode and shows its locks (${await at()})`);
    await click('nav[aria-label="Dashboard"] a[href^="/budget/data-standard"]', "sidebar Data standard");
    check((await at()).startsWith("/budget/data-standard?") && (await at()).includes("mode=current") && (await p.evaluate(() => document.querySelector("h1")?.textContent?.trim() === "Data standard")), `demo 6: data standard, scope carried (${await at()})`);
    await p.close();
  }

  console.log("\n[R] Final-review fixes");
  for (const width of [360, 390]) {
    for (const url of ["/budget?agency=ncra-2027-2029", "/budget?view=posture&agency=ncwtr-2026-2028&sector=governanceAdministration"]) {
      const p = await open(url, width, 800);
      const r = await p.evaluate(() => {
        const d = document.documentElement;
        const mode = [...document.querySelectorAll('[data-scope-bar="compact"] button[aria-pressed]')];
        return { over: d.scrollWidth - d.clientWidth, modeRight: Math.max(...mode.map((b) => b.getBoundingClientRect().right)), client: d.clientWidth };
      });
      check(r.over <= 1 && r.modeRight <= r.client, `${width} ${url}: agency scope fits, mode toggle on screen (overflow ${r.over}, toggle right ${Math.round(r.modeRight)})`);
      await p.close();
    }
  }
  {
    const p = await open("/budget?agency=ncra-2027-2029");
    await p.evaluate(() => document.querySelector('[data-scope-bar="full"] button[aria-label^="Clear agency filter"]')?.click());
    await p.waitForFunction(() => !location.search.includes("agency="), { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 600));
    const q = await p.evaluate(() => location.search);
    check(q.includes("view=ask") && !q.includes("agency=") && (await has(p, "Investment summary")) && !(await has(p, "Select an area to review")), `clearing the agency on a bare ?agency= link stays on Investment summary (${q})`);
    await p.close();
  }
  for (const url of ["/budget?agency=nope", "/budget?view=ask&agency=nope&sector=agricultureFood"]) {
    const p = await open(url);
    await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Clear all filters"))?.click());
    await p.waitForFunction(() => !location.search.includes("agency="), { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 600));
    const q = await p.evaluate(() => location.search);
    check(!q.includes("agency=") && !q.includes("sector=") && !(await has(p, "No agencies match the current filters")), `Clear all filters recovers from ${url} (${q})`);
    if (url.includes("view=ask")) check(q.includes("view=ask"), "Clear all filters keeps the screen");
    await p.close();
  }
  {
    const p = await open("/budget?view=cybersecurity&sector=agricultureFood&mode=current");
    await p.evaluate(() => document.querySelector('nav[aria-label="Dashboard"] a[href^="/budget/data-standard"]')?.click());
    await p.waitForFunction(() => location.pathname === "/budget/data-standard", { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 800));
    await p.evaluate(() => document.querySelector('nav[aria-label="Dashboard"] a[href*="view=cybersecurity"]')?.click());
    await p.waitForFunction(() => location.pathname === "/budget", { timeout: 15000 }).catch(() => {});
    const q = await p.evaluate(() => location.search);
    check(q.includes("view=cybersecurity") && q.includes("sector=agricultureFood") && q.includes("mode=current"), `scope survives a Data standard round trip (${q})`);
    await p.close();
    const h = await open("/budget?sector=agricultureFood&mode=current");
    const cardHref = await h.evaluate(() => document.querySelector('a[data-card][href^="/budget/data-standard"]')?.getAttribute("href"));
    check(!!cardHref && cardHref.includes("sector=agricultureFood") && cardHref.includes("mode=current"), `Home Data standard card keeps the scope (${cardHref})`);
    await h.close();
  }
  for (const view of ["domains", "sectors"]) {
    const p = await open(`/budget?view=${view}&agency=ncra-2027-2029`);
    await trySelect(p, '[data-scope-bar="full"] select[aria-label="Filter by fiscal year"]', "2026");
    await new Promise((r) => setTimeout(r, 600));
    check(!(await has(p, "₱0.00")), `${view}: no ₱0.00 when the year has no line items (en-dash null)`);
    await p.close();
  }
  {
    const p = await open("/budget?agency=ncra-2027-2029&view=home");
    const body = await text(p);
    check(!/\b1 pdp sectors\b/.test(body) && !/in 1 sectors\b/.test(body) && !/\b1\s*agencies\b/.test(body), "Home card details pluralise for one agency and one sector");
    await p.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${passes} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
