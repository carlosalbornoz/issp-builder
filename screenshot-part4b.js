const puppeteer = require('puppeteer');
const fs = require('fs');

const DEMO_FILE = '/root/apps/issp/public/demo/ncwtr-issp-2026-2028.issp';

async function run() {
  const demoDoc = JSON.parse(fs.readFileSync(DEMO_FILE, 'utf8'));
  const browser = await puppeteer.launch({
    executablePath: '/root/.cache/puppeteer/chrome/linux-148.0.7778.167/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto('http://localhost:3100/issp/editor', { waitUntil: 'networkidle2' });
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
  await page.goto('http://localhost:3100/issp/editor/part4/year1', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Shot 1: top of page (header + first card)
  await page.screenshot({ path: '/root/.claude/jobs/d558daf7/p4-top.png' });

  // Shot 2: scroll to show full first section card
  await page.evaluate(() => window.scrollTo(0, 300));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: '/root/.claude/jobs/d558daf7/p4-mid.png' });

  // Shot 3: scroll to show card boundary + second card
  await page.evaluate(() => window.scrollTo(0, 750));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: '/root/.claude/jobs/d558daf7/p4-lower.png' });

  await browser.close();
  console.log('done');
}
run().catch(e => { console.error(e); process.exit(1); });
