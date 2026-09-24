// End-to-end smoke for the Part IV Cycle View (/editor/part4/cycle):
//   load the demo fixture → open Cycle View → exercise Table mode (add,
//   rename, delete, n/a-cell invariant) → exercise List mode (add, edit via
//   the details drawer, delete via the drawer) → assert every change lands
//   in IDB.
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
// post-edit wait below is 2000ms.
//
// NOTE: List is the default line-item view mode (persisted to localStorage
// under "issp-part4-cycle-line-mode"), so Table-mode selectors below only
// work after explicitly switching to Table via the toggle — this script does
// that before its Table-mode checks and switches back to List afterward.
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

// Click the mode toggle ("List" or "Table") and wait for the corresponding
// markup to actually appear — the click alone doesn't guarantee the render
// committed before the next assertion runs.
async function switchMode(page, mode) {
  const clicked = await page.evaluate((label) => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === label
    );
    if (!btn) return false;
    btn.click();
    return true;
  }, mode === "table" ? "Table" : "List");
  if (!clicked) throw new Error(`mode toggle button "${mode}" not found`);
  if (mode === "table") {
    await page.waitForSelector("table", { timeout: 5000 });
  } else {
    await page.waitForFunction(() => document.querySelector("table") === null, { timeout: 5000 });
  }
}

let page;
try {
  console.log("\n=== Load fixture, open Cycle View ===");
  page = await freshPage();
  await loadFile(page, DEMO);

  await page.goto(BASE + "/editor/part4/cycle", { waitUntil: "networkidle2", timeout: 20000 });
  await page.waitForSelector('input[placeholder="Item description…"]', { timeout: 15000 });
  const heading = await page.evaluate(() => document.body.textContent || "");
  if (!/Cycle View/.test(heading)) fail("page heading missing 'Cycle View'");
  else ok("Cycle View page rendered");

  const navText = await page.$eval("aside nav", (el) => el.textContent || "");
  if (!/Cycle View/.test(navText)) fail("sidebar nav missing Cycle View entry");
  else ok("sidebar nav shows Cycle View");

  const startsAsTable = await page.evaluate(() => document.querySelector("table") !== null);
  if (startsAsTable) fail("List should be the default view mode, but a <table> rendered on first load");
  else ok("List is the default view mode (no <table> on first load)");

  // ═══ Table mode ═════════════════════════════════════════════════════════
  console.log("\n=== Switch to Table mode ===");
  await switchMode(page, "table");
  ok("switched to Table mode");

  console.log("\n=== Table mode: add a new line item ===");
  const before = await readPart4(page);
  const beforeCount = countAllLines(before);

  const addBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((b) => /Add Line/.test(b.textContent || ""))
  );
  if (!(await addBtn.asElement())) fail("no 'Add Line' button found");
  else await addBtn.asElement().click();
  await sleep(2000); // past the 1500ms save debounce

  const afterAdd = await readPart4(page);
  const afterAddCount = countAllLines(afterAdd);
  if (afterAddCount <= beforeCount) fail(`expected line count to grow, before=${beforeCount} after=${afterAddCount}`);
  else ok(`Add Line grew total line count ${beforeCount} → ${afterAddCount}`);

  console.log("\n=== Table mode: edit the new row's item name ===");
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

  console.log("\n=== Table mode: delete the row ===");
  // NOTE: an <input>'s value is never part of its element's textContent (only
  // literal child text/elements are), so matching the row via
  // `row.textContent` against the typed value can never succeed for a cell
  // that's rendered as an input. Locate the row by the input's .value
  // instead, then walk up to its delete button.
  const deleteBtn = await page.evaluateHandle(() => {
    const input = [...document.querySelectorAll('table input[placeholder="Item description…"]')].find(
      (el) => el.value === "Smoke Test Line Item"
    );
    return input?.closest("tr")?.querySelector('button[aria-label="Delete row"]') ?? null;
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

  console.log("\n=== Table mode: out-of-duration year cells ('n/a') are never editable ===");
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

  // ═══ List mode ══════════════════════════════════════════════════════════
  console.log("\n=== Switch to List mode ===");
  await switchMode(page, "list");
  ok("switched to List mode");

  console.log("\n=== List mode: add a new line item ===");
  const beforeList = await readPart4(page);
  const beforeListCount = countAllLines(beforeList);

  const addBtnList = await page.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((b) => /Add Line/.test(b.textContent || ""))
  );
  if (!(await addBtnList.asElement())) fail("List mode: no 'Add Line' button found");
  else await addBtnList.asElement().click();
  await sleep(2000);

  const afterAddList = await readPart4(page);
  const afterAddListCount = countAllLines(afterAddList);
  if (afterAddListCount <= beforeListCount) fail(`List mode: expected line count to grow, before=${beforeListCount} after=${afterAddListCount}`);
  else ok(`List mode: Add Line grew total line count ${beforeListCount} → ${afterAddListCount}`);

  console.log("\n=== List mode: open the details drawer and edit Office ===");
  // Same "value === ''" disambiguation as the table-mode rename above —
  // List mode's item input carries the same placeholder on every row.
  const listNameInputHandle = await page.evaluateHandle(() =>
    [...document.querySelectorAll('input[placeholder="Item description…"]')].find((el) => el.value === "")
  );
  const listNameInput = await listNameInputHandle.asElement();
  if (!listNameInput) fail("List mode: new row's item-description input not found");
  else {
    await listNameInput.click({ clickCount: 3 });
    await listNameInput.type("Smoke Drawer Item");
    await listNameInput.evaluate((el) => el.blur());
  }
  await sleep(2000);

  const editBtn = await page.evaluateHandle(() => {
    const input = [...document.querySelectorAll('input[placeholder="Item description…"]')].find(
      (el) => el.value === "Smoke Drawer Item"
    );
    // The item input and its row's "Edit details" button are siblings within
    // the same flex row container (not a <tr> in List mode).
    const row = input?.closest("div.flex.items-start");
    return row?.querySelector('button[aria-label="Edit details"]') ?? null;
  });
  if (!(await editBtn.asElement())) fail("List mode: 'Edit details' button for the new row not found");
  else await editBtn.asElement().click();

  await page.waitForFunction(
    () => /Office \/ Unit/.test(document.body.textContent || ""),
    { timeout: 5000 }
  ).catch(() => fail("details drawer did not open (Office / Unit field not found)"));
  ok("details drawer opened for the new row");

  const officeInput = await page.evaluateHandle(() =>
    [...document.querySelectorAll("input")].find((el) => el.placeholder === "Which office or unit will use this?")
  );
  if (!(await officeInput.asElement())) fail("drawer's Office input not found");
  else {
    await officeInput.asElement().click({ clickCount: 3 });
    await officeInput.asElement().type("Smoke Test Office");
  }
  await sleep(2000);

  const afterOfficeEdit = await readPart4(page);
  if (!JSON.stringify(afterOfficeEdit).includes("Smoke Test Office")) fail("drawer's Office edit not found in IDB part4");
  else ok("drawer's Office edit persisted to IDB");

  console.log("\n=== List mode: delete via the drawer ===");
  const drawerDeleteBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Delete")
  );
  if (!(await drawerDeleteBtn.asElement())) fail("drawer's Delete button not found");
  else {
    page.once("dialog", (d) => d.accept());
    await drawerDeleteBtn.asElement().click();
  }
  await sleep(2000);

  const afterListDelete = await readPart4(page);
  if (JSON.stringify(afterListDelete).includes("Smoke Drawer Item")) fail("List-mode row still present in IDB after drawer delete");
  else ok("List-mode row removed from IDB after drawer delete");
  const afterListDeleteCount = countAllLines(afterListDelete);
  if (afterListDeleteCount !== beforeListCount) fail(`List mode: expected line count back to ${beforeListCount}, got ${afterListDeleteCount}`);
  else ok("List mode: line count returned to baseline after delete");
} catch (e) {
  fail(`unexpected exception: ${e.message}`);
} finally {
  if (page) await page.close();
  await browser.close();
}

console.log(`\n${fails.length === 0 ? "ALL CHECKS PASSED" : `${fails.length} CHECK(S) FAILED`}`);
process.exit(fails.length === 0 ? 0 : 1);
