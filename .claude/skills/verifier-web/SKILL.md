---
name: verifier-web
description: Puppeteer verification setup for the ISSP Builder web app. Covers the dev server handle, Chrome path, viewport, and — critically — the correct way to load a document so that savedSnapshot is set properly.
---

# ISSP Builder — Web Verifier

Dev server: `http://localhost:3000` (already running via pm2, do NOT restart it).  
Chrome: `/root/.cache/puppeteer/chrome/linux-148.0.7778.167/chrome-linux64/chrome`  
Viewport: `1400 × 900`  
Demo file: `/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp`  
Screenshots: write to `/tmp/verify-shots/`

---

## Puppeteer boilerplate

```js
const puppeteer = require('puppeteer');
const fs = require('fs');

const CHROME = '/root/.cache/puppeteer/chrome/linux-148.0.7778.167/chrome-linux64/chrome';
const BASE   = 'http://localhost:3000';
const SHOTS  = '/tmp/verify-shots';
fs.mkdirSync(SHOTS, { recursive: true });

async function shot(page, name) {
  const p = `${SHOTS}/${name}.png`;
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${name}.png`);
  return p;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
```

---

## Loading a document — do this RIGHT

The store has an in-memory `savedSnapshot` that is set **only** by `loadFromFile()`, `saveToFile()`, or `createNew()`. It is **NOT** set when the app hydrates from IndexedDB on mount.

**WRONG — direct IDB injection (breaks `savedSnapshot`):**
```js
// ❌ Do NOT do this. savedSnapshot stays null.
// The app will fall back to timestamp comparison and may show false positives.
await page.evaluate(async (doc) => {
  const req = indexedDB.open('issp-builder', 1);
  // ...
}, demo);
```

**RIGHT — use `setInputFiles` on the hidden file input:**
```js
// ✅ This calls loadFromFile() in the app, which sets savedSnapshot correctly.
await page.goto(BASE, { waitUntil: 'networkidle2' });

// Expose the demo file path to the browser via setInputFiles
const fileInput = await page.$('input[type="file"]');
await fileInput.uploadFile('/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp');

// Wait for navigation to /editor (the app redirects automatically)
await page.waitForNavigation({ waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1000)); // let React settle
```

**Alternative RIGHT — click through the sample flow:**
```js
// ✅ Also calls loadFromFile() correctly.
await page.goto(BASE, { waitUntil: 'networkidle2' });

// Click "Explore a sample ISSP" button
await page.click('button:has-text("Explore a sample ISSP")');
// Wait for the NCWTR intro modal
await page.waitForSelector('button:has-text("Open Sample ISSP")');
await page.click('button:has-text("Open Sample ISSP")');
// Wait for navigation to /editor
await page.waitForNavigation({ waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1000));
```

---

## Editing number inputs

Triple-click does **not** reliably select-all in number inputs. Use Ctrl+A instead:

```js
// ❌ Unreliable — may append characters instead of replacing
await input.click({ clickCount: 3 });
await input.type('42');

// ✅ Reliable
await input.click();
await page.keyboard.down('Control');
await page.keyboard.press('a');
await page.keyboard.up('Control');
await page.keyboard.type('42');
```

---

## Debounce timing

`useLocalSave` debounces saves by **1500 ms**. After any edit, wait at least 2000 ms before checking store state or the sidebar:

```js
await new Promise(r => setTimeout(r, 2000));
```

---

## Checking the sidebar

```js
const sidebarText = await page.evaluate(() => {
  const sidebar = document.querySelector('aside');
  return sidebar ? sidebar.innerText : '';
});
const hasUnsaved = sidebarText.includes('Unsaved changes');
const isSaved    = sidebarText.includes('Up to date') || sidebarText.includes('Saved');
```

---

## IDB timing note

IDB writes are also async and debounced. Reading from IDB directly in `page.evaluate()` may not reflect the latest React state. Trust what you see in the DOM (sidebar text, button label, button classes) rather than reading IDB values for verification.
