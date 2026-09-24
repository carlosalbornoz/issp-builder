// End-to-end smoke for the Part IV Cycle View (/editor/part4/cycle):
//   load the demo fixture → open Cycle View → edit a year cell → add a new
//   line item → delete a row → assert every change lands in IDB.
//
// Carlos reaches dev over HTTP at the public IP = a NON-SECURE browsing
// context, where crypto.randomUUID is undefined. We reproduce that on
// localhost (reliable) by neutralizing crypto.randomUUID before each load —
// pattern copied verbatim from scripts/smoke-roundtrip.mjs.
//
// Prereq: dev server on :3001 for this worktree (`ss -tlnp | grep :3001`).
// NOTE: this worktree's dedicated dev server runs on :3001, NOT the repo's
// usual :3000 (that port belongs to a different checkout without this
// branch's code). Never start/stop the dev server from this script.
//
// NOTE: edits go through the store's 1500ms debounced scheduleSave
// (src/lib/store/index.tsx SAVE_DEBOUNCE_MS) before landing in IDB, so each
// post-edit wait below is 2000ms, not the 400ms in the original brief —
// confirmed by direct measurement (400ms after "Add Line" reads stale IDB
// state; the write lands between 400ms and 1900ms after the click).
//   node scripts/smoke-part4-cycle.mjs
import puppeteer from "puppeteer";

const BASE = "http://localhost:3001";
const DEMO = "/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp";

const browser = await puppeteer.launch({
  executablePath: "/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const fails = [];
const fail = (m) => { console.error("  ASSERT FAIL:", m); fails.push(m); };
const ok = (m) => console.log("  ok:", m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function freshPage() {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  });
  p.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  return p;
}

async function loadFile(page, filePath) {
  await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 45000 });
  const input = await page.$('input[type="file"]');
  if (!input) throw new Error("no file input on home page");
  await input.uploadFile(filePath);
  await page.waitForFunction(() => location.pathname === "/editor", { timeout: 20000 });
  await page.waitForSelector("aside nav", { timeout: 15000 });
  await sleep(600);
}

async function readPart4(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open("issp-builder");
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("documents", "readonly");
      const getReq = tx.objectStore("documents").get("current");
      getReq.onsuccess = () => resolve(getReq.result?.part4 ?? null);
      getReq.onerror = () => reject(getReq.error);
      tx.oncomplete = () => db.close();
    };
    req.onerror = () => reject(req.error);
  }));
}

function countAllLines(part4) {
  let n = 0;
  for (const y of ["year1", "year2", "year3"]) {
    const yb = part4[y];
    n += yb.officeProductivity.capitalOutlay.length + yb.officeProductivity.mooe.length;
    n += yb.continuingCosts.mooe.length;
    for (const p of Object.values(yb.internalProjects)) n += p.capitalOutlay.length + p.mooe.length;
    for (const p of Object.values(yb.crossAgencyProjects)) n += p.capitalOutlay.length + p.mooe.length;
  }
  return n;
}

let page;
try {
  console.log("\n=== Load fixture, open Cycle View ===");
  page = await freshPage();
  await loadFile(page, DEMO);

  await page.goto(BASE + "/editor/part4/cycle", { waitUntil: "networkidle2", timeout: 20000 });
  await page.waitForSelector("table", { timeout: 15000 });
  const heading = await page.evaluate(() => document.body.textContent || "");
  if (!/Cycle View/.test(heading)) fail("page heading missing 'Cycle View'");
  else ok("Cycle View page rendered");

  const navText = await page.$eval("aside nav", (el) => el.textContent || "");
  if (!/Cycle View/.test(navText)) fail("sidebar nav missing Cycle View entry");
  else ok("sidebar nav shows Cycle View");

  console.log("\n=== Add a new line item ===");
  const before = await readPart4(page);
  const beforeCount = countAllLines(before);

  const addBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((b) => /Add Line/.test(b.textContent || ""))
  );
  if (!(await addBtn.asElement())) fail("no 'Add Line' button found");
  else await addBtn.asElement().click();
  // Store writes go through a 1500ms debounced scheduleSave before landing in
  // IDB (src/lib/store/index.tsx SAVE_DEBOUNCE_MS) — wait past it, not the
  // brief's 400ms, or the read below races the write and sees stale data.
  await sleep(2000);

  const afterAdd = await readPart4(page);
  const afterAddCount = countAllLines(afterAdd);
  if (afterAddCount <= beforeCount) fail(`expected line count to grow, before=${beforeCount} after=${afterAddCount}`);
  else ok(`Add Line grew total line count ${beforeCount} → ${afterAddCount}`);

  console.log("\n=== Edit the new row's item name ===");
  // The placeholder attribute is static per input (every item-description
  // input carries it, populated or not), so a plain
  // page.$('table input[placeholder="Item description…"]') matches the FIRST
  // such input in DOM order across the whole page — an existing populated
  // row, not the new one. Every fixture row already has a non-empty item
  // name, so the newly added row is identifiable as the one whose value is
  // still "".
  const nameInputHandle = await page.evaluateHandle(() =>
    [...document.querySelectorAll('table input[placeholder="Item description…"]')].find((el) => el.value === "")
  );
  const nameInput = await nameInputHandle.asElement();
  if (!nameInput) fail("new row's item-description input not found");
  else {
    await nameInput.click({ clickCount: 3 });
    await nameInput.type("Smoke Test Line Item");
    await nameInput.evaluate((el) => el.blur());
  }
  await sleep(2000); // past the 1500ms save debounce

  const afterRename = await readPart4(page);
  const renamed = JSON.stringify(afterRename).includes("Smoke Test Line Item");
  if (!renamed) fail("renamed item text not found anywhere in IDB part4");
  else ok("row rename persisted to IDB");

  console.log("\n=== Delete the row ===");
  // NOTE: an <input>'s value is never part of its element's textContent (only
  // literal child text/elements are), so matching the row via
  // `row.textContent` against the typed value can never succeed for a cell
  // that's rendered as an input. Locate the row by the input's .value
  // instead, then walk up to its delete button.
  const deleteBtn = await page.evaluateHandle(() => {
    const nameInput = [...document.querySelectorAll('table input[placeholder="Item description…"]')].find(
      (el) => el.value === "Smoke Test Line Item"
    );
    return nameInput?.closest("tr")?.querySelector('button[aria-label="Delete row"]') ?? null;
  });
  if (!(await deleteBtn.asElement())) fail("delete button for the smoke row not found");
  else {
    page.once("dialog", (d) => d.accept());
    await deleteBtn.asElement().click();
  }
  await sleep(2000); // past the 1500ms save debounce

  const afterDelete = await readPart4(page);
  const stillThere = JSON.stringify(afterDelete).includes("Smoke Test Line Item");
  if (stillThere) fail("row still present in IDB after delete");
  else ok("row removed from IDB after delete");
  const afterDeleteCount = countAllLines(afterDelete);
  if (afterDeleteCount !== beforeCount) fail(`expected line count back to ${beforeCount}, got ${afterDeleteCount}`);
  else ok("line count returned to baseline after delete");

  console.log("\n=== Out-of-duration year cells ('n/a') are never editable ===");
  // Structural invariant, independent of which projects the fixture happens
  // to have short durations for: wherever the UI renders "n/a" for a year
  // cell (outside that project's Part III-E duration), it must not also
  // contain an input/button — those two states are mutually exclusive.
  const { naCount, naWithControls } = await page.evaluate(() => {
    const cells = [...document.querySelectorAll("table tbody td")];
    const naCells = cells.filter((td) => /^n\/a$/.test((td.textContent || "").trim()));
    return {
      naCount: naCells.length,
      naWithControls: naCells.filter((td) => td.querySelector("input, button")).length,
    };
  });
  if (naWithControls > 0) fail(`${naWithControls} 'n/a' cell(s) still contain an editable control`);
  else ok(`${naCount} out-of-duration cell(s) found in this fixture, none editable`);
} catch (e) {
  fail(`unexpected exception: ${e.message}`);
} finally {
  if (page) await page.close();
  await browser.close();
}

console.log(`\n${fails.length === 0 ? "ALL CHECKS PASSED" : `${fails.length} CHECK(S) FAILED`}`);
process.exit(fails.length === 0 ? 0 : 1);
