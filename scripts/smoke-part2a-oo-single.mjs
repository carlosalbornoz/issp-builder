// Part II-A smoke: OO linkage is single-select, "General / Agency-Wide" is not
// selectable, stored "general" tags normalize away, untagged-with-content
// concerns get a flag chip, and switching OOs prunes stale programIds.
//
// Fixture: demo NCWTR doc (orgOutcomes oo-1/oo-2/oo-3). After upload we
// overwrite part2.strategicConcerns in IDB with four crafted concerns, then
// reload /editor/part2/a and assert against the rendered form + persisted doc.
import puppeteer from "puppeteer";

const CHROME = "/root/.cache/puppeteer/chrome/linux-148.0.7778.167/chrome-linux64/chrome";
const BASE = "http://localhost:3000";
const DEMO = "/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp";
const SAVE_SETTLE_MS = 1800;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

let fails = 0;
function check(cond, msg) {
  if (cond) console.log("PASS:", msg);
  else { console.error("ASSERT FAIL:", msg); fails++; }
}

async function withDoc(page, fn) {
  return await page.evaluate(async (fnBody) => {
    const fn = new Function("db", "resolve", "reject", fnBody);
    return await new Promise((resolve, reject) => {
      const req = indexedDB.open("issp-builder", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("documents")) db.createObjectStore("documents");
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        fn(db, resolve, reject);
      };
      req.onerror = () => reject(req.error);
    });
  }, fn.toString());
}

async function readDoc(page) {
  return await withDoc(page, `
    const tx = db.transaction("documents", "readonly");
    const getReq = tx.objectStore("documents").get("current");
    getReq.onsuccess = () => resolve(getReq.result);
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => db.close();
  `);
}

async function writeDoc(page, mutateSrc) {
  const fnBody = `
    const tx = db.transaction("documents", "readwrite");
    const store = tx.objectStore("documents");
    const getReq = store.get("current");
    getReq.onsuccess = () => {
      const doc = getReq.result;
      const next = (${mutateSrc})(doc);
      store.put(next, "current");
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => reject(tx.error);
  `;
  return await withDoc(page, fnBody);
}

// Click an item inside the currently-OPEN select popup (stale closed popups
// stay mounted in the DOM and would swallow the click otherwise).
async function clickOpenItem(page, nameFragment, label) {
  await page.waitForSelector('[data-slot="select-content"]:not([data-closed])', { timeout: 5000 });
  const clicked = await page.evaluate((frag) => {
    const popup = document.querySelector('[data-slot="select-content"]:not([data-closed])');
    if (!popup) return false;
    const item = [...popup.querySelectorAll('[data-slot="select-item"]')]
      .find((e) => e.innerText.includes(frag));
    if (!item) return false;
    item.click();
    return true;
  }, nameFragment);
  if (!clicked) throw new Error(`${label} item not found in open popup`);
}

// ── Scenario ──
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

  // 1. Load demo fixture
  await page.goto(BASE + "/", { waitUntil: "networkidle0", timeout: 30000 });
  const input = await page.$('input[type="file"]');
  if (!input) throw new Error("no file input on home page");
  await input.uploadFile(DEMO);
  await page.waitForFunction(() => location.pathname === "/editor", { timeout: 15000 });
  await page.waitForSelector("aside nav", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  // 2. Overwrite part2 concerns with crafted cases
  const oos = await readDoc(page);
  const oo1 = oos.part1.orgOutcomes.find((o) => o.id === "oo-1");
  const oo1ProgId = typeof oo1.programs[0] === "string"
    ? `${oo1.id}-pg-1`
    : oo1.programs[0].id;
  const OO1_NAME = oo1.name;
  const OO3_NAME = oos.part1.orgOutcomes.find((o) => o.id === "oo-3").name;

  await writeDoc(page, `(doc) => {
    doc.part2.strategicConcerns = [
      { id: "sc-gen", outcomeIds: ["general"], programIds: [], criticalSystem: "Legacy system", concern: "Legacy general-tagged concern", desiredStrategy: "Modernize" },
      { id: "sc-oo", outcomeIds: ["oo-2"], programIds: ["${oo1ProgId}"], criticalSystem: "Sys", concern: "Tagged to oo-2 with stale oo-1 program", desiredStrategy: "Strat" },
      { id: "sc-empty", outcomeIds: [], programIds: [], criticalSystem: "", concern: "Untagged but has content", desiredStrategy: "" },
      { id: "sc-blank", outcomeIds: [], programIds: [], criticalSystem: "", concern: "", desiredStrategy: "" },
    ];
    return doc;
  }`);

  // 3. Reload the form (same page, domcontentloaded dodges the HMR hang)
  await page.goto(BASE + "/editor/part2/a", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(
    () => document.body.innerText.includes("Strategic ICT Concerns"),
    { timeout: 20000 }
  );
  await new Promise((r) => setTimeout(r, 500));

  // A. four concern cards
  const cards = await page.$$eval("[data-reveal-id]", (els) =>
    els.map((e) => e.getAttribute("data-reveal-id"))
  );
  check(cards.filter((id) => id.startsWith("sc-")).length === 4, "four crafted concerns render");

  // B. flag chips: sc-gen + sc-empty only (sc-blank has no content)
  const chipCount = await page.$$eval("[data-reveal-id]", (els) =>
    els.filter((el) => el.textContent.includes("No OO/SO/MFO tagged")).length
  );
  check(chipCount === 2, `flag chip on untagged-with-content concerns only (got ${chipCount})`);

  // C. trigger states: sc-gen placeholder, sc-oo shows oo-2 name
  const triggerText = async (cardId) =>
    (await page.$eval(`[data-reveal-id="${cardId}"] [data-slot="select-trigger"]`, (t) => t.innerText)).trim();
  const genText = await triggerText("sc-gen");
  const ooText = await triggerText("sc-oo");
  check(genText.includes("Select one outcome"), `stored "general" renders as unselected placeholder (got "${genText}")`);
  check(ooText.includes("compliance rate"), `tagged concern shows its OO label (got "${ooText}")`);

  // D. dropdown offers only the 3 OOs — no General / Agency-Wide item
  await page.click('[data-reveal-id="sc-gen"] [data-slot="select-trigger"]');
  try {
    await page.waitForSelector('[data-slot="select-content"]:not([data-closed])', { timeout: 5000 });
  } catch (e) {
    const diag = await page.evaluate(() => ({
      url: location.pathname,
      popups: [...document.querySelectorAll('[data-slot="select-content"]')].map((p) =>
        [...p.attributes].filter((a) => a.name.startsWith("data-")).map((a) => `${a.name}=${a.value}`)
      ),
      trigger: (() => {
        const t = document.querySelector('[data-reveal-id="sc-gen"] [data-slot="select-trigger"]');
        return t ? { disabled: t.disabled, attrs: [...t.attributes].map((a) => a.name) } : null;
      })(),
    })).catch(() => "evaluate also failed");
    console.error("STEP D DIAG:", JSON.stringify(diag, null, 1));
    throw e;
  }
  const items = await page.$$eval('[data-slot="select-content"]:not([data-closed]) [data-slot="select-item"]', (els) =>
    els.map((e) => e.innerText.trim())
  );
  check(items.length === 3, `dropdown lists exactly the 3 OOs (got ${items.length}: ${items.join(" | ")})`);
  check(!items.some((t) => t.includes("General")), "no General / Agency-Wide option in dropdown");

  // E. pick oo-1 for sc-gen → persisted as single-element outcomeIds, no "general"
  await clickOpenItem(page, OO1_NAME.slice(0, 30), "oo-1");
  await new Promise((r) => setTimeout(r, SAVE_SETTLE_MS));

  let doc = await readDoc(page);
  let scGen = doc.part2.strategicConcerns.find((c) => c.id === "sc-gen");
  check(
    scGen && Array.isArray(scGen.outcomeIds) && scGen.outcomeIds.length === 1 && scGen.outcomeIds[0] === "oo-1",
    `sc-gen persisted as single OO link (got ${JSON.stringify(scGen?.outcomeIds)})`
  );
  check(
    !doc.part2.strategicConcerns.some((c) => (c.outcomeIds || []).includes("general")),
    "no \"general\" tag remains in persisted concerns"
  );

  // F. switch sc-oo (oo-2 + stale oo-1 program) → oo-3 prunes the stale program
  await page.click('[data-reveal-id="sc-oo"] [data-slot="select-trigger"]');
  await clickOpenItem(page, OO3_NAME.slice(0, 30), "oo-3");
  await new Promise((r) => setTimeout(r, SAVE_SETTLE_MS));

  doc = await readDoc(page);
  const scOo = doc.part2.strategicConcerns.find((c) => c.id === "sc-oo");
  check(
    scOo && scOo.outcomeIds.length === 1 && scOo.outcomeIds[0] === "oo-3" && scOo.programIds.length === 0,
    `switching OO prunes stale programIds (got outcomeIds=${JSON.stringify(scOo?.outcomeIds)} programIds=${JSON.stringify(scOo?.programIds)})`
  );

  await page.close();
} catch (err) {
  console.error("SMOKE ERROR:", err.message);
  fails++;
}

await browser.close();
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
