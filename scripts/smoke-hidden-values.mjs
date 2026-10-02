// Browser smoke for the 2026-10-02 hidden-values fix (docs/audit-pdf-hidden-values-2026-10-02.md):
//   A. Part IV year pages name uncounted lines (deleted project / outside duration)
//   B. Summary B.1–B.4 and Cycle View leave them out of every total
//   C. III-E project delete: hard confirmation lists KPIs + budget lines, then
//      removes the project, its III-F KPI set and its Part IV budget
// Fixture = the NCWTR demo (excluded from the usage log) plus two planted lines.
// Run: SMOKE_BASE=http://localhost:3000 node scripts/smoke-hidden-values.mjs
import puppeteer from "puppeteer";
import fs from "node:fs";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const DEMO = new URL("../public/demo/ncwtr-issp-2026-2028.issp", import.meta.url).pathname;
const OUT = "/tmp/smoke-hidden-values";
const GHOST = "777,777.77";    // budget of a project no longer in III-E
const OFF = "666,666.66";      // HANDA (2026 only) line planted in Year 2

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const doc = JSON.parse(fs.readFileSync(DEMO, "utf8"));
const line = (id, item, unitCost) => ({ id, item, office: "", categoryId: "co-ict-software", fundSource: "General Appropriations Act", qty: 1, unitCost });
doc.part4.year1.internalProjects["proj-ghost"] = { projectTitle: "Ghost Project", capitalOutlay: [line("ghost-1", "Ghost server", 777777.77)], mooe: [] };
doc.part4.year2.internalProjects["proj-handa"] ??= { projectTitle: "HANDA", capitalOutlay: [], mooe: [] };
doc.part4.year2.internalProjects["proj-handa"].capitalOutlay.push(line("off-1", "Off-duration router", 666666.66));
const FIXTURE = `${OUT}/fixture.issp`;
fs.writeFileSync(FIXTURE, JSON.stringify(doc));

const browser = await puppeteer.launch({
  executablePath: "/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const fails = [];
const fail = (m) => { console.error("  ASSERT FAIL:", m); fails.push(m); };
const ok = (m) => console.log("  ok:", m);
const check = (cond, m) => (cond ? ok(m) : fail(m));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fresh page per phase (dev HMR sockets pile up on one tab); non-secure context simulated.
async function freshPage(viewport = { width: 1280, height: 900 }) {
  const p = await browser.newPage();
  await p.setViewport(viewport);
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  });
  p.on("pageerror", (e) => fail(`page error: ${e.message}`));
  return p;
}
async function loadFixture(page) {
  await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 90000 });
  await sleep(3000); // dev servers may reload the page once after first load; upload after it
  const input = await page.$('input[type="file"]');
  if (!input) throw new Error("no file input on home page");
  await input.uploadFile(FIXTURE);
  await page.waitForFunction(() => location.pathname.endsWith("/editor"), { timeout: 60000 }).catch(async (e) => {
    await page.screenshot({ path: `${OUT}/load-failed.png` });
    throw new Error(`fixture did not open the editor (${page.url()}): ${e.message}`);
  });
  await page.waitForSelector("aside nav", { timeout: 60000 }).catch(async (e) => {
    await page.screenshot({ path: `${OUT}/load-failed.png` });
    throw new Error(`editor did not render its sidebar (${page.url()}): ${e.message}`);
  });
  await sleep(600);
}
async function open(page, path) {
  await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 90000 });
  // The client store restores the doc from IndexedDB after hydration (spinner until then)
  await page.waitForFunction(() => !!document.querySelector("aside nav") && (document.querySelector("main")?.innerText.length ?? 0) > 200, { timeout: 120000 });
  await sleep(800);
  return page.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText);
}
async function readDoc(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open("issp-builder");
    req.onsuccess = () => {
      const tx = req.result.transaction("documents", "readonly");
      const get = tx.objectStore("documents").get("current");
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    };
    req.onerror = () => reject(req.error);
  }));
}
/** Trusted click on the "Delete project" button of the card whose text includes `title`. */
async function clickDeleteFor(page, title) {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button[aria-label="Delete project"]')];
    return btns.find((b) => (b.closest("[id]")?.textContent ?? b.parentElement?.parentElement?.textContent ?? "").includes(t)) ?? null;
  }, title);
  const el = handle.asElement();
  if (!el) throw new Error(`no Delete project button for ${title}`);
  await el.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await sleep(400);
}

try {
  console.log("\n=== A. Year pages name the uncounted lines ===");
  let page = await freshPage();
  await loadFixture(page);
  const y2 = await open(page, "/editor/part4/year2");
  check(/Outside project duration:/.test(y2) && y2.includes(OFF), "Year 2 warns: Outside project duration, ₱666,666.66");
  await page.screenshot({ path: `${OUT}/year2-duration-warning.png` });
  const y1 = await open(page, "/editor/part4/year1");
  check(/Deleted project:/.test(y1) && y1.includes("Ghost Project") && y1.includes(GHOST), "Year 1 warns: Deleted project — Ghost Project, ₱777,777.77");
  check(!/Outside project duration:/.test(y1), "Year 1 has no off-duration warning");
  await page.screenshot({ path: `${OUT}/year1-deleted-warning.png` });
  // Two-tap removal of the deleted project's lines
  const bin = await page.$('button[aria-label="Remove the deleted project\'s lines"]');
  if (!bin) fail("no remove button on the Deleted project warning");
  else {
    await bin.click();
    await sleep(300);
    await (await page.$('button[aria-label="Remove lines?"]')).click();
    await sleep(2500);
    const d = await readDoc(page);
    check(!d.part4.year1.internalProjects["proj-ghost"], "two taps remove the deleted project's lines from the file");
    check(!(await page.evaluate(() => document.body.innerText)).includes("Deleted project:"), "the warning goes away");
  }
  await page.close();

  console.log("\n=== B. Summary and Cycle View leave them out ===");
  page = await freshPage();
  await loadFixture(page);
  const summary = await open(page, "/editor/part4/summary");
  check(!summary.includes(GHOST) && !summary.includes(OFF), "Summary B.1–B.4 contain neither planted amount");
  const cycle = await open(page, "/editor/part4/cycle");
  check(cycle.includes("Outside duration · not counted"), "Cycle View marks the off-duration cell");
  check(!cycle.includes("Ghost server"), "Cycle View does not list the deleted project's line");
  await page.close();

  console.log("\n=== C. III-E delete: hard confirmation, then cascade ===");
  page = await freshPage();
  await loadFixture(page);
  await open(page, "/editor/part3/e1");
  const before = await readDoc(page);
  const kpiCount = before.part3.performanceFramework["proj-sikap"]?.rows.length ?? 0;
  const lineCount = ["year1", "year2", "year3"].reduce((s, y) => {
    const pb = before.part4[y].internalProjects["proj-sikap"];
    return s + (pb ? pb.capitalOutlay.length + pb.mooe.length : 0);
  }, 0);
  check(kpiCount > 0 && lineCount > 0, `fixture SIKAP has ${kpiCount} KPI rows and ${lineCount} budget lines`);
  await clickDeleteFor(page, "Project SIKAP");
  const dlg = await page.$eval('[role="dialog"]', (e) => e.innerText);
  check(dlg.includes(`${kpiCount} KPI row`), `dialog lists ${kpiCount} KPI rows`);
  check(dlg.includes(`${lineCount} line item`), `dialog lists ${lineCount} budget line items`);
  const disabled = () => page.$eval('[role="dialog"]', (d) =>
    [...d.querySelectorAll("button")].find((b) => b.textContent.trim() === "Delete project")?.disabled);
  check((await disabled()) === true, "Delete project is disabled before the acknowledgement");
  await page.screenshot({ path: `${OUT}/delete-dialog-desktop.png` });
  await (await page.$('[role="dialog"] [role="checkbox"]')).click();
  await sleep(200);
  check((await disabled()) === false, "Delete project is enabled after the acknowledgement");
  const confirm = await page.evaluateHandle(() =>
    [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent.trim() === "Delete project"));
  await confirm.asElement().click();
  await sleep(2500); // store save debounce
  const after = await readDoc(page);
  check(!after.part3.internalProjects.some((p) => p.id === "proj-sikap"), "project removed from III-E");
  check(!after.part3.performanceFramework["proj-sikap"], "its III-F KPI set removed");
  check(["year1", "year2", "year3"].every((y) => !after.part4[y].internalProjects["proj-sikap"]), "its Part IV budget removed from every year");
  check(after.part3.internalProjects.length === before.part3.internalProjects.length - 1, "other projects kept");
  check(!!after.part4.year1.internalProjects["proj-ghost"], "unrelated stored records untouched");
  await page.close();

  console.log("\n=== D. Mobile: the dialog fits and Cancel keeps everything ===");
  page = await freshPage({ width: 390, height: 844 });
  await loadFixture(page);
  await open(page, "/editor/part3/e1");
  await clickDeleteFor(page, "Project BILIS");
  const box = await page.$eval('[role="dialog"]', (d) => { const r = d.getBoundingClientRect(); return { l: r.left, r: r.right }; });
  check(box.l >= 0 && box.r <= 390, "dialog fits the 390px viewport");
  await page.screenshot({ path: `${OUT}/delete-dialog-mobile.png` });
  const cancel = await page.evaluateHandle(() =>
    [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent.trim() === "Cancel"));
  await cancel.asElement().click();
  await sleep(2000);
  const kept = await readDoc(page);
  check(kept.part3.internalProjects.some((p) => p.id === "proj-bilis"), "Cancel deletes nothing");
  await page.close();
} catch (e) {
  fail(`FATAL: ${e.message}`);
} finally {
  await browser.close();
}

console.log(`\n=== Summary ===\n${fails.length ? `FAIL — ${fails.length} assertion(s)` : "PASS — hidden-values smoke green"}  (screenshots in ${OUT})`);
process.exit(fails.length ? 1 : 0);
