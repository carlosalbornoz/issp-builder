const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DEMO_FILE = '/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp';

async function run() {
  const demoDoc = JSON.parse(fs.readFileSync(DEMO_FILE, 'utf8'));

  const browser = await puppeteer.launch({
    executablePath: '/root/.cache/puppeteer/chrome/linux-148.0.7778.167/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Load editor page first to initialize IDB
  await page.goto('http://localhost:3100/issp/editor', { waitUntil: 'networkidle2' });

  // Inject demo doc into IDB
  await page.evaluate(async (doc) => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('issp-builder', 1);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('documents', 'readwrite');
        tx.objectStore('documents').put(doc, 'current');
        tx.oncomplete = resolve;
        tx.onerror = reject;
      };
      req.onerror = reject;
    });
  }, demoDoc);

  // Navigate to Part IV Year 1
  await page.goto('http://localhost:3100/issp/editor/part4/year1', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot of the full page
  await page.screenshot({ path: '/root/.claude/jobs/d558daf7/part4-year1.png', fullPage: false });

  // Scroll down to see more content
  await page.evaluate(() => window.scrollBy(0, 400));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: '/root/.claude/jobs/d558daf7/part4-year1-scroll.png', fullPage: false });

  await browser.close();
  console.log('Done');
}

run().catch(err => { console.error(err); process.exit(1); });
