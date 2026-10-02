// Full scoped round-trip smoke (current UI):
//   master → Distribute (kebab) → edit scoped file → Consolidate return
//
// Drives the REAL dialogs (no fixture authoring). Carlos reaches dev over HTTP
// at the public IP = a NON-SECURE browsing context, where crypto.randomUUID is
// undefined. We reproduce that condition faithfully on localhost (reliable;
// the server's headless Chrome hitting its own public IP instead fails the dev
// HMR websocket via hairpin-NAT, a harness artifact unrelated to the code) by
// neutralizing crypto.randomUUID before each load. Any unguarded direct call
// would crash; the uuid() fallback must carry it.
//
// Prereq: dev server on :3000; NCWTR demo present.
//   node scripts/smoke-roundtrip.mjs
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const DEMO = "/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp";
const DOWNLOAD_DIR = "/tmp/smoke-roundtrip";
const EDITED_VALUE = "Atty. Renz Testvalue";

const browser = await puppeteer.launch({
  executablePath: "/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const fails = [];
const fail = (m) => { console.error("  ASSERT FAIL:", m); fails.push(m); };
const ok = (m) => console.log("  ok:", m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.rmSync(DOWNLOAD_DIR, { recursive: true, force: true });
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// ── helpers ────────────────────────────────────────────────────────────────

// A fresh page per phase. Repeated page.goto on one tab accumulates dev HMR
// websockets past networkidle's threshold and eventually hangs; a fresh page
// each phase keeps every navigation a reliable "first". Pages share the
// browser's default context (same IDB origin), and each phase loads its own
// file first, so IDB state is always re-established.
async function freshPage({ downloads = false } = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  // Simulate Carlos's non-secure access: randomUUID is undefined there.
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  });
  p.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  if (downloads) {
    const client = await p.target().createCDPSession();
    await client.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DOWNLOAD_DIR });
  }
  return p;
}

// The visible kebab trigger (desktop OR mobile render — pick the one with size).
async function visibleKebab(page) {
  return page.evaluateHandle(() => {
    const btns = [...document.querySelectorAll('button[aria-label="More file actions"]')];
    const vis = btns.find((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return vis || btns[0];
  });
}

// Open the kebab and click the menu item whose text matches `re`.
async function kebabClick(page, re) {
  const trig = await visibleKebab(page);
  if (!(await trig.asElement())) throw new Error("kebab trigger not found");
  await trig.asElement().click();
  await sleep(250);
  const clicked = await page.evaluate((reSrc) => {
    const re = new RegExp(reSrc);
    const items = [...document.querySelectorAll('[role="menuitem"]')];
    const t = items.find((el) => re.test(el.textContent || ""));
    if (!t) return false;
    t.click();
    return true;
  }, re.source);
  if (!clicked) throw new Error(`kebab item ${re} not found`);
  await sleep(150);
}

// Read the menu's item texts (kebab must be open). Does not close it.
async function kebabItems(page) {
  return page.$$eval('[role="menuitem"]', (els) => els.map((e) => e.textContent || ""));
}

// Wait for any .issp to appear in DOWNLOAD_DIR (cleared before each capture),
// returning the newest by mtime. Race-free: no before-snapshot to miss a fast
// download on.
async function captureDownload(label) {
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) => f.endsWith(".issp"));
    if (files.length > 0) {
      let newest = files[0];
      for (const f of files) {
        if (fs.statSync(path.join(DOWNLOAD_DIR, f)).mtimeMs >
            fs.statSync(path.join(DOWNLOAD_DIR, newest)).mtimeMs) newest = f;
      }
      ok(`${label}: downloaded ${newest}`);
      return path.join(DOWNLOAD_DIR, newest);
    }
  }
  fail(`${label}: no .issp downloaded`);
  return null;
}

// Read the current doc straight from IDB.
async function readDoc(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open("issp-builder");
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("documents", "readonly");
      const getReq = tx.objectStore("documents").get("current");
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
      tx.oncomplete = () => db.close();
    };
    req.onerror = () => reject(req.error);
  }));
}

async function loadFile(page, filePath) {
  // networkidle2 (not 0): dev's persistent HMR websocket is a lingering
  // connection, so networkidle0 hangs; networkidle2 tolerates it while still
  // waiting long enough for React hydration so the upload's change event lands.
  await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 45000 });
  const input = await page.$('input[type="file"]');
  if (!input) throw new Error("no file input on home page");
  await input.uploadFile(filePath);
  await page.waitForFunction(() => location.pathname === "/editor", { timeout: 20000 });
  await page.waitForSelector("aside nav", { timeout: 15000 });
  await sleep(600);
}

let page;
try {
  // ═══ Phase A: Distribute via kebab ════════════════════════════════════════
  console.log("\n=== A: Distribute scoped slice (via kebab) ===");
  page = await freshPage({ downloads: true });
  await loadFile(page, DEMO);

  // Sanity: master has Properties + Export PDF in the secondary grid.
  const masterAsideBtns = await page.$$eval("aside button", (bs) => bs.map((b) => b.textContent || ""));
  if (!masterAsideBtns.some((t) => /Properties/.test(t))) fail("master missing Properties button");
  if (!masterAsideBtns.some((t) => /Export PDF/.test(t))) fail("master missing Export PDF button");
  else ok("master shows Properties + Export PDF");

  await kebabClick(page, /Distribute to offices/);
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await sleep(300);
  if (!/Distribute to offices/.test(await page.$eval('[role="dialog"]', (e) => e.textContent || "")))
    fail("Distribute dialog title missing");
  else ok("Distribute dialog opened from kebab");

  // Select only Part I → B → CIO Name field (reused from task8 smoke).
  await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    const rows = [...dlg.querySelectorAll("li li")];
    const bRow = rows.find((li) => /B\. Organizational Structure/.test(li.textContent || ""));
    bRow?.querySelector(":scope > div button")?.click(); // expand section B
  });
  await sleep(150);
  await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    const spans = [...dlg.querySelectorAll("li span")];
    const cioName = spans.find((s) => /^CIO Name$/.test((s.textContent || "").trim()));
    cioName?.closest("li")?.querySelector("[role='checkbox']")?.click();
  });
  await sleep(150);

  // Office name.
  await page.evaluate((name) => {
    const dlg = document.querySelector('[role="dialog"]');
    const inp = dlg?.querySelector('input[aria-label="Office name"], input[placeholder*="Information Systems"]');
    if (inp) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(inp, name);
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, "Information Systems Division");
  await sleep(250);

  const rosterText = await page.$eval('[role="dialog"]', (e) => e.textContent || "");
  if (!/Information Systems Division/.test(rosterText)) fail("roster missing office name");
  if (!/part1\/b/.test(rosterText)) fail("roster missing part1/b editable path");
  else ok("roster shows office + part1/b editable path");

  // Generate. Trusted (Puppeteer native) click is required: the button's
  // onClick does a programmatic a.click() download, which headless Chrome
  // suppresses without a user-activation chain (an evaluate .click() yields
  // no download and no toast).
  const gen = await page.evaluateHandle(() => {
    const dlg = document.querySelector('[role="dialog"]');
    return [...dlg.querySelectorAll("button")].find((x) => /Generate/.test(x.textContent || ""));
  });
  const genState = await page.evaluate((el) => el ? { text: el.textContent.trim(), disabled: el.disabled } : null, await gen.asElement());
  console.log("  Generate button state:", JSON.stringify(genState));
  if (!(await gen.asElement())) fail("Generate button not found");
  else await gen.asElement().click();
  const scopedPath = await captureDownload("A");
  if (scopedPath && !/information-systems-division\.issp$/i.test(scopedPath))
    fail(`filename slug wrong: ${path.basename(scopedPath)}`);
  else if (scopedPath) ok("filename slug matches office display label");

  await sleep(400);
  if (!/Generated 1 scoped file/.test(await page.evaluate(() => document.body.textContent || "")))
    fail("toast 'Generated 1 scoped file' not seen");
  else ok("toast 'Generated 1 scoped file' shown");

  // ═══ Phase B: edit the scoped file ════════════════════════════════════════
  console.log("\n=== B: load scoped file, verify invariants, edit owned field ===");
  if (!scopedPath) throw new Error("no scoped file from Phase A");
  await page.close();
  page = await freshPage();
  await loadFile(page, scopedPath);

  // Banner: shows office name only; NO "Edits:" / raw paths line.
  const bannerInfo = await page.evaluate(() => {
    const els = [...document.querySelectorAll("aside div")];
    const banner = els.find((d) => /^Scoped file/.test((d.textContent || "").trim()));
    if (!banner) return null;
    const t = banner.textContent || "";
    return { text: t.trim(), hasEdits: /Edits:/.test(t), hasPath: /part1\//.test(t) };
  });
  if (!bannerInfo) fail("scoped banner missing");
  else {
    if (!/Information Systems Division/.test(bannerInfo.text)) fail("banner missing office name");
    if (bannerInfo.hasEdits) fail("banner still shows 'Edits:' (should be trimmed)");
    if (bannerInfo.hasPath) fail("banner shows raw path (should be trimmed to office name only)");
    if (/Information Systems Division/.test(bannerInfo.text) && !bannerInfo.hasEdits && !bannerInfo.hasPath)
      ok(`banner trimmed to office name: "${bannerInfo.text}"`);
  }

  // Sidebar: only part1/b visible.
  const navText = await page.$eval("aside nav", (e) => e.textContent || "");
  const see = (t) => navText.includes(t);
  if (!see("B. Organizational Structure")) fail("sidebar missing part1/b");
  if (see("A. Mandate")) fail("sidebar shows part1/a (should be stripped)");
  if (see("Year 1 Breakdown")) fail("sidebar shows Part IV (should be stripped)");
  if (see("Definition of Terms")) fail("sidebar shows definitions (should be stripped)");
  else ok("sidebar shows ONLY part1/b");

  // Kebab: Distribute + Consolidate must be ABSENT on a scoped file.
  await (await visibleKebab(page)).asElement().click();
  await sleep(250);
  const itemsOpen = await kebabItems(page);
  if (itemsOpen.some((t) => /Distribute to offices/.test(t))) fail("Distribute present in kebab on scoped file");
  if (itemsOpen.some((t) => /Consolidate returned files/.test(t))) fail("Consolidate present in kebab on scoped file");
  else ok("kebab hides Distribute + Consolidate on scoped file (masters-only)");
  await page.keyboard.press("Escape");
  await sleep(200);

  // Secondary grid: Properties + Export PDF hidden on scoped file.
  const scopedAsideBtns = await page.$$eval("aside button", (bs) => bs.map((b) => b.textContent || ""));
  if (scopedAsideBtns.some((t) => /Properties/.test(t))) fail("Properties visible on scoped file (should be hidden)");
  if (scopedAsideBtns.some((t) => /Export PDF/.test(t))) fail("Export PDF visible on scoped file (should be hidden)");
  else ok("Properties + Export PDF hidden on scoped file");

  // Field allowlist: only cioName renders on part1/b.
  await page.goto(BASE + "/editor/part1/b", { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(800);
  const formText = await page.$eval("main", (e) => e.textContent || "");
  if (!/Chief Information Officer/.test(formText)) fail("part1/b missing CIO section");
  if (!/Full Name/.test(formText)) fail("part1/b missing Full Name (cioName owned)");
  if (/Position \/ Designation/.test(formText)) fail("CIO Position renders (should be dropped)");
  if (/Email Address/.test(formText)) fail("CIO Email renders (should be dropped)");
  else ok("field allowlist: only cioName renders; sibling fields dropped");

  // EDIT the owned field (real keystrokes on the React-controlled input).
  let editedDoc = null;
  const cioInput = await page.$('input[placeholder="e.g., Juan dela Cruz"]');
  if (!cioInput) fail("CIO Full Name input not found");
  else {
    await cioInput.click();
    await cioInput.evaluate((el) => el.select()); // select existing text so type replaces it
    await cioInput.type(EDITED_VALUE);
    await sleep(100);
    // scheduleSave debounce is 1500ms.
    await sleep(2200);
    editedDoc = await readDoc(page);
    if (!editedDoc) fail("could not read edited doc from IDB");
    else if (editedDoc.part1.cioName !== EDITED_VALUE)
      fail(`cioName not saved: expected "${EDITED_VALUE}", got ${JSON.stringify(editedDoc.part1.cioName)}`);
    else ok(`edited cioName saved to IDB = "${EDITED_VALUE}"`);
  }

  // The office's RETURN = the edited scoped doc, written to disk byte-for-byte
  // as the kebab's "Download .issp" would emit (JSON.stringify of the doc).
  // Writing it directly avoids the trusted-activation download quirk and gives
  // Phase C reliable bytes to consolidate.
  const editedPath = path.join(DOWNLOAD_DIR, "edited-return.issp");
  if (editedDoc) {
    fs.writeFileSync(editedPath, JSON.stringify(editedDoc, null, 2));
    ok("wrote edited return to disk for consolidate");
  }

  // ═══ Phase C: Consolidate the return into a fresh master ══════════════════
  console.log("\n=== C: Consolidate edited return into master (via kebab) ===");
  if (!editedPath) throw new Error("no edited return from Phase B");
  await page.close();
  page = await freshPage();
  await loadFile(page, DEMO);
  const beforeMaster = await readDoc(page);
  const beforeCio = beforeMaster?.part1?.cioName;
  console.log(`  master cioName before consolidate: ${JSON.stringify(beforeCio)}`);

  await kebabClick(page, /Consolidate returned files/);
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await sleep(300);
  if (!/Consolidate returned files/.test(await page.$eval('[role="dialog"]', (e) => e.textContent || "")))
    fail("Consolidate dialog title missing");
  else ok("Consolidate dialog opened from kebab");

  const dialogInput = await page.$('[role="dialog"] input[type="file"][multiple]');
  if (!dialogInput) fail("Consolidate dialog file input missing");
  else await dialogInput.uploadFile(editedPath);
  await sleep(900); // parse + preview

  const preview = await page.$eval('[role="dialog"]', (e) => e.textContent || "");
  if (!/Information Systems Division/.test(preview)) fail("preview missing office label");
  if (/conflict/i.test(preview) && /Resolve \d+ conflict/.test(preview))
    fail("unexpected scalar conflict (single-office overlay should not conflict)");
  else ok("preview shows office return with no conflict (clean overlay)");

  // Apply. Trusted click (same user-activation rule as Generate).
  const apply = await page.evaluateHandle(() =>
    [...document.querySelectorAll('[role="dialog"] button')].find((b) => /Apply merge/.test(b.textContent || "")));
  if (!(await apply.asElement())) fail("Apply merge button not found");
  else {
    await apply.asElement().click();
    await sleep(900);
    if (await page.$('[role="dialog"]')) fail("dialog did not close after Apply");
    else ok("dialog closed after Apply");
  }
  await sleep(2200); // persist
  const merged = await readDoc(page);
  if (!merged) fail("could not read merged doc from IDB");
  else if (merged.part1.cioName !== EDITED_VALUE)
    fail(`master cioName not merged: expected "${EDITED_VALUE}", got ${JSON.stringify(merged.part1.cioName)}`);
  else ok(`master cioName merged = "${EDITED_VALUE}" (round-trip complete)`);
} catch (err) {
  console.error("FATAL:", err);
  fails.push(`FATAL: ${err.message}`);
} finally {
  await browser.close();
}

console.log("\n=== Summary ===");
if (fails.length === 0) {
  console.log("PASS — full scoped round-trip green on dev (public IP / non-secure context)");
  process.exit(0);
} else {
  console.log(`FAIL — ${fails.length} assertion(s):`);
  for (const f of fails) console.log("  -", f);
  process.exit(1);
}
