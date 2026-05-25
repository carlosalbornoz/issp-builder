// Social media cards — May 2026 update
// Run: node scripts/social-cards.js  (dev server must be on http://localhost:3000)

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE   = 'http://localhost:3000';
const OUT    = path.join(__dirname, '../public/screenshots/social');
const DEMO   = path.join(__dirname, '../public/demo/ncwtr-issp-2026-2028.issp');
const CHROME = '/root/.cache/puppeteer/chrome/linux-148.0.7778.167/chrome-linux64/chrome';

// Warm dark palette
const DARK = {
  bg:     '#1C1A17', card:   '#242220', border: '#383430',
  fg:     '#F0EDE8', muted:  '#9C9893', accent: '#2C2925',
  blue:   '#60A5FA', amber:  '#FB923C', green:  '#4ADE80', purple: '#A78BFA',
};

// Warm light palette
const LIGHT = {
  bg:     '#FAFAF7', card:   '#FFFFFF', border: '#E5E3DC',
  fg:     '#18181B', muted:  '#52525B', accent: '#EAE8E1',
  blue:   '#2563EB', amber:  '#C2680C', green:  '#15803D', purple: '#6D28D9',
};

const THEMES = [
  { id: 'system-light', label: 'System Light' },
  { id: 'system-dark',  label: 'System Dark'  },
  { id: 'warm-light',   label: 'Warm Light'   },
  { id: 'warm-dark',    label: 'Warm Dark'    },
];

// Load local fonts as base64 for reliable rendering in headless Chromium
function fontB64(name) {
  return fs.readFileSync(path.join(__dirname, 'fonts', name)).toString('base64');
}
const FONT_FACES = `
  @font-face { font-family: 'IBM Plex Sans'; font-weight: 400; font-style: normal;
    src: url('data:font/woff2;base64,${fontB64('ibm-plex-sans-400.woff2')}') format('woff2'); }
  @font-face { font-family: 'IBM Plex Sans'; font-weight: 500; font-style: normal;
    src: url('data:font/woff2;base64,${fontB64('ibm-plex-sans-500.woff2')}') format('woff2'); }
  @font-face { font-family: 'IBM Plex Sans'; font-weight: 600; font-style: normal;
    src: url('data:font/woff2;base64,${fontB64('ibm-plex-sans-600.woff2')}') format('woff2'); }
  @font-face { font-family: 'IBM Plex Sans'; font-weight: 700; font-style: normal;
    src: url('data:font/woff2;base64,${fontB64('ibm-plex-sans-700.woff2')}') format('woff2'); }
  @font-face { font-family: 'Fraunces'; font-weight: 700; font-style: normal;
    src: url('data:font/woff2;base64,${fontB64('fraunces-700.woff2')}') format('woff2'); }
  @font-face { font-family: 'Fraunces'; font-weight: 800; font-style: normal;
    src: url('data:font/woff2;base64,${fontB64('fraunces-800.woff2')}') format('woff2'); }
`;
const FONT      = `'IBM Plex Sans', sans-serif, 'Noto Color Emoji'`;
const FONT_HEAD = `'Fraunces', serif`;

fs.mkdirSync(OUT, { recursive: true });

// ─── helpers ──────────────────────────────────────────────────────────────────

async function newPage(browser, { width = 1400, height = 900, theme = 'warm-dark', mobile = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: mobile ? 3 : 2, isMobile: mobile });
  await page.evaluateOnNewDocument((t) => localStorage.setItem('issp-theme', t), theme);
  return page;
}

async function injectDemo(page, doc) {
  await page.evaluate(async (d) => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('issp-builder', 1);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('documents', 'readwrite');
        tx.objectStore('documents').put(d, 'current');
        tx.oncomplete = resolve;
        tx.onerror = reject;
      };
      req.onerror = reject;
    });
  }, doc);
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ─── screenshots ──────────────────────────────────────────────────────────────

async function takeScreenshots(browser) {
  const shots = {};
  const demo  = JSON.parse(fs.readFileSync(DEMO, 'utf8'));

  // Splash (warm dark)
  {
    const page = await newPage(browser, { width: 1280, height: 800 });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await wait(1200);
    shots.splash = await page.screenshot({ encoding: 'base64' });
    await page.close();
  }

  // New ISSP dialog (warm dark)
  {
    const page = await newPage(browser, { width: 1280, height: 800 });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await wait(800);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Start New ISSP'));
      if (b) b.click();
    });
    await wait(700);
    shots.newDialog = await page.screenshot({ encoding: 'base64' });
    await page.close();
  }

  // Four theme screenshots (editor Part I-A, top crop)
  shots.themes = {};
  for (const { id } of THEMES) {
    const page = await newPage(browser, { width: 1280, height: 800, theme: id });
    await page.goto(`${BASE}/editor`, { waitUntil: 'networkidle2' });
    await injectDemo(page, demo);
    await page.goto(`${BASE}/editor/part1/a`, { waitUntil: 'networkidle2' });
    await wait(1500);
    shots.themes[id] = await page.screenshot({ encoding: 'base64', clip: { x: 0, y: 0, width: 1280, height: 480 } });
    await page.close();
  }

  // Grid screenshots for title card — various sections, warm dark
  const gridRoutes = [
    'part1/a', 'part1/b', 'part1/c',
    'part2/a', 'part2/c',
    'part3/e1', 'part4/year1',
  ];
  shots.grid = [];
  for (const route of gridRoutes) {
    const page = await newPage(browser, { width: 1280, height: 800 });
    await page.goto(`${BASE}/editor`, { waitUntil: 'networkidle2' });
    await injectDemo(page, demo);
    await page.goto(`${BASE}/editor/${route}`, { waitUntil: 'networkidle2' });
    await wait(1500);
    shots.grid.push(await page.screenshot({ encoding: 'base64', clip: { x: 0, y: 0, width: 1280, height: 640 } }));
    await page.close();
  }

  // Mobile — home page
  {
    const page = await newPage(browser, { width: 390, height: 844, mobile: true });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await wait(1200);
    shots.mobileHome = await page.screenshot({ encoding: 'base64' });
    await page.close();
  }

  // Mobile — section selector open
  {
    const page = await newPage(browser, { width: 390, height: 844, mobile: true });
    await page.goto(`${BASE}/editor`, { waitUntil: 'networkidle2' });
    await injectDemo(page, demo);
    await page.goto(`${BASE}/editor/part1/a`, { waitUntil: 'networkidle2' });
    await wait(1800);
    await page.evaluate(() => {
      const menu = [...document.querySelectorAll('button')].find(b => b.querySelector('svg.lucide-menu'));
      if (menu) menu.click();
    });
    await wait(600);
    shots.mobileSidebar = await page.screenshot({ encoding: 'base64' });
    await page.close();
  }

  // Mobile — Part I-B
  {
    const page = await newPage(browser, { width: 390, height: 844, mobile: true });
    await page.goto(`${BASE}/editor`, { waitUntil: 'networkidle2' });
    await injectDemo(page, demo);
    await page.goto(`${BASE}/editor/part1/b`, { waitUntil: 'networkidle2' });
    await wait(1800);
    shots.mobilePart1b = await page.screenshot({ encoding: 'base64' });
    await page.close();
  }

  // Mobile — Part II-A
  {
    const page = await newPage(browser, { width: 390, height: 844, mobile: true });
    await page.goto(`${BASE}/editor`, { waitUntil: 'networkidle2' });
    await injectDemo(page, demo);
    await page.goto(`${BASE}/editor/part2/a`, { waitUntil: 'networkidle2' });
    await wait(1800);
    shots.mobilePart2a = await page.screenshot({ encoding: 'base64' });
    await page.close();
  }

  return shots;
}

// ─── card primitives ──────────────────────────────────────────────────────────

function card(html, P = DARK) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    ${FONT_FACES}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{width:1200px;height:630px;overflow:hidden;background:${P.bg};
      font-family:${FONT};color:${P.fg};}
  </style></head><body>${html}</body></html>`;
}

function browserFrame(b64, P = DARK, { radius = 10 } = {}) {
  return `<div style="background:${P.card};border:1.5px solid ${P.border};border-radius:${radius}px;
    overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.45);">
    <div style="display:flex;align-items:center;gap:6px;padding:9px 14px;
      background:${P.accent};border-bottom:1px solid ${P.border};">
      <span style="width:9px;height:9px;border-radius:50%;background:#EF4444;opacity:.8;"></span>
      <span style="width:9px;height:9px;border-radius:50%;background:#F59E0B;opacity:.8;"></span>
      <span style="width:9px;height:9px;border-radius:50%;background:#10B981;opacity:.8;"></span>
    </div>
    <img src="data:image/png;base64,${b64}" style="display:block;width:100%;"/>
  </div>`;
}

function phoneFrame(b64, P = DARK, { width = 210 } = {}) {
  return `<div style="background:${P.card};border:2px solid ${P.border};border-radius:36px;
    overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.5);width:${width}px;flex-shrink:0;">
    <div style="height:22px;background:${P.accent};display:flex;align-items:center;justify-content:center;">
      <div style="width:56px;height:5px;border-radius:3px;background:${P.border};"></div>
    </div>
    <img src="data:image/png;base64,${b64}" style="display:block;width:100%;"/>
  </div>`;
}

function logo(P = DARK) {
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
    <div style="display:flex;gap:3px;align-items:center;">
      ${[P.blue, P.amber, P.green, P.purple].map(c =>
        `<span style="width:5px;height:22px;border-radius:99px;background:${c};"></span>`
      ).join('')}
    </div>
    <span style="font-size:15px;font-weight:700;letter-spacing:-.01em;">ISSP Builder</span>
    <span style="font-size:11px;color:${P.muted};margin-left:2px;">· May 2026</span>
  </div>`;
}

// ─── cards ────────────────────────────────────────────────────────────────────

// Card 0 — Title card (warm dark): "Another weekend…" over washed-out screenshot grid
function card0_title(shots) {
  const P = DARK;
  const cols = 4;
  const imgs = shots.grid.slice(0, cols * 2); // up to 8 in a 4×2 grid
  const gridImgs = imgs.map(b64 =>
    `<img src="data:image/png;base64,${b64}"
      style="width:${100/cols}%;object-fit:cover;object-position:top left;flex-shrink:0;display:block;"/>`
  ).join('');

  return card(`
    <div style="position:relative;width:1200px;height:630px;overflow:hidden;">

      <!-- washed-out screenshot grid background -->
      <div style="position:absolute;inset:0;display:flex;flex-wrap:wrap;align-content:flex-start;">
        ${gridImgs}
      </div>
      <!-- dark overlay + fade -->
      <div style="position:absolute;inset:0;background:${P.bg};opacity:.82;"></div>
      <div style="position:absolute;inset:0;
        background:radial-gradient(ellipse at 40% 55%, transparent 30%, ${P.bg} 75%);"></div>

      <!-- copy -->
      <div style="position:relative;z-index:10;height:100%;display:flex;flex-direction:column;
        justify-content:center;padding:64px 72px;max-width:760px;">
        ${logo(P)}
        <p style="font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
          color:${P.amber};margin-bottom:18px;">May 2026 Update</p>
        <h1 style="font-family:${FONT_HEAD};font-size:48px;font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:20px;">
          Another weekend<br>has passed.<br>Another commit<br>was pushed.
        </h1>
        <p style="font-size:15px;color:${P.muted};line-height:1.65;max-width:520px;">
          Here's what changed in the ISSP Builder — themes, mobile editing, coverage period enforcement, and a nod from the DICT ISSP team. 🏅
        </p>
      </div>
    </div>`, P);
}

// Card 1 — Announcement (warm light)
function card1_announcement(shots) {
  const P = LIGHT;
  return card(`
    <div style="display:flex;height:630px;">
      <div style="width:480px;flex-shrink:0;padding:52px 48px;display:flex;flex-direction:column;justify-content:center;gap:20px;">
        ${logo(P)}
        <div style="display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:99px;
          width:fit-content;background:${P.amber}22;border:1px solid ${P.amber}55;
          font-size:11px;font-weight:700;letter-spacing:.08em;color:${P.amber};">
          ✦ WHAT'S NEW
        </div>
        <h1 style="font-family:${FONT_HEAD};font-size:38px;font-weight:800;line-height:1.15;letter-spacing:-.02em;">
          Themes. Mobile.<br>DICT gave us<br>a nod. 🏅
        </h1>
        <p style="font-size:14px;color:${P.muted};line-height:1.6;max-width:340px;">
          The ISSP Builder just got its biggest update yet — and the DICT ISSP team gave it a nod at the official ISSP Caravan. Coverage period is now locked to FY 2028–2030.
        </p>
      </div>
      <div style="flex:1;position:relative;overflow:hidden;background:${P.accent};">
        <div style="position:absolute;inset:0;
          background:linear-gradient(to right, ${P.bg} 0%, transparent 18%);z-index:2;"></div>
        <img src="data:image/png;base64,${shots.splash}"
          style="position:absolute;top:0;left:0;height:100%;width:auto;object-fit:cover;object-position:left;"/>
      </div>
    </div>`, P);
}

// Card 2 — Template update (warm dark)
function card2_template(shots) {
  const P = DARK;
  return card(`
    <div style="display:flex;height:630px;">
      <div style="width:460px;flex-shrink:0;padding:52px 48px;display:flex;flex-direction:column;justify-content:center;gap:18px;">
        ${logo(P)}
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:${P.amber};text-transform:uppercase;">Template Update</div>
        <h1 style="font-family:${FONT_HEAD};font-size:32px;font-weight:800;line-height:1.2;letter-spacing:-.02em;">
          Strictly MITHI<br>Reso 2026-02.<br>No exceptions.
        </h1>
        <p style="font-size:13.5px;color:${P.muted};line-height:1.65;">
          Coverage period is locked to <strong style="color:${P.fg}">FY 2028–2030</strong>. The fields are read-only. No, we will not let you create ISSPs using the old template.
        </p>
        <p style="font-size:13px;color:${P.muted};line-height:1.6;padding:14px 16px;
          background:${P.amber}15;border-left:3px solid ${P.amber};border-radius:4px;">
          The DICT ISSP team gave this tool a nod at the ISSP Caravan (May 25, 2026). No official endorsement, but DICT didn't tell anyone to stop using it either — so we'll take that as a win. 🏅
        </p>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;
        padding:40px 36px;background:${P.accent};position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;
          background:radial-gradient(ellipse at center, ${P.amber}08 0%, transparent 70%);"></div>
        <div style="width:100%;max-width:520px;transform:perspective(800px) rotateY(-4deg);">
          ${browserFrame(shots.newDialog, P)}
        </div>
      </div>
    </div>`, P);
}

// Card 3 — 4 Themes (warm light)
function card3_themes(shots) {
  const P = LIGHT;
  const themeColors = {
    'system-light': '#E5E5EA', 'system-dark':  '#1C1C1E',
    'warm-light':   '#F5F0E8', 'warm-dark':    '#1C1A17',
  };
  return card(`
    <div style="display:flex;height:630px;">
      <div style="width:310px;flex-shrink:0;padding:52px 40px;display:flex;flex-direction:column;justify-content:center;gap:18px;">
        ${logo(P)}
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:${P.blue};text-transform:uppercase;">Themes</div>
        <h1 style="font-family:${FONT_HEAD};font-size:36px;font-weight:800;line-height:1.2;letter-spacing:-.02em;">
          4 themes.<br>Pick your vibe.
        </h1>
        <p style="font-size:13.5px;color:${P.muted};line-height:1.65;">
          System Light, System Dark, Warm Light, Warm Dark.
        </p>
      </div>
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:8px;padding:20px;background:${P.accent};">
        ${THEMES.map(({ id, label }) => `
          <div style="border-radius:10px;overflow:hidden;border:1.5px solid ${P.border};
            position:relative;box-shadow:0 8px 32px rgba(0,0,0,.15);">
            <img src="data:image/png;base64,${shots.themes[id]}"
              style="display:block;width:100%;height:100%;object-fit:cover;object-position:top left;"/>
            <div style="position:absolute;bottom:0;left:0;right:0;
              background:linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 100%);
              padding:10px 12px;">
              <span style="font-size:11px;font-weight:600;color:#fff;letter-spacing:.02em;">${label}</span>
            </div>
            <div style="position:absolute;top:8px;right:8px;width:12px;height:12px;border-radius:50%;
              background:${themeColors[id]};border:1.5px solid rgba(255,255,255,.4);
              box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>
          </div>`).join('')}
      </div>
    </div>`, P);
}

// Card 4 — Mobile (warm dark)
function card4_mobile(shots) {
  const P = DARK;
  const phones = [
    { b64: shots.mobileHome,    rot: '-3deg', mt: '-24px' },
    { b64: shots.mobileSidebar, rot:  '1deg', mt:  '18px' },
    { b64: shots.mobilePart1b,  rot: '-1deg', mt: '-12px' },
    { b64: shots.mobilePart2a,  rot:  '3deg', mt:  '24px' },
  ];
  return card(`
    <div style="display:flex;height:630px;">
      <div style="width:340px;flex-shrink:0;padding:50px 44px;display:flex;flex-direction:column;justify-content:center;gap:16px;">
        ${logo(P)}
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:${P.purple};text-transform:uppercase;">Mobile Editing</div>
        <h1 style="font-family:${FONT_HEAD};font-size:30px;font-weight:800;line-height:1.2;letter-spacing:-.02em;">
          Your ISSP,<br>anywhere.<br>Mostly.
        </h1>
        <p style="font-size:13px;color:${P.muted};line-height:1.65;">
          Mobile editing is live — forms, navigation, and saving all work. The sidebar turns into a hamburger menu with a full-screen section selector.
        </p>
        <p style="font-size:12.5px;color:${P.muted};line-height:1.6;padding:13px 15px;
          background:${P.purple}15;border-left:3px solid ${P.purple};border-radius:4px;">
          Still a work in progress, UX-wise. But usable enough that you could, hypothetically, fill this out during the very meeting where someone is presenting the ISSP template. 👀
        </p>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:14px;
        padding:28px 32px;background:${P.accent};position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;
          background:radial-gradient(ellipse at center, ${P.purple}12 0%, transparent 70%);"></div>
        ${phones.map(({ b64, rot, mt }) => `
          <div style="transform:rotate(${rot});margin-top:${mt};flex-shrink:0;position:relative;z-index:1;">
            ${phoneFrame(b64, P, { width: 168 })}
          </div>`).join('')}
      </div>
    </div>`, P);
}

// ─── render ───────────────────────────────────────────────────────────────────

async function renderCard(browser, html, filename) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await wait(400);
  const out = path.join(OUT, filename);
  await page.screenshot({ path: out, type: 'png' });
  await page.close();
  console.log(`✓  ${filename}`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('Launching browser…');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  try {
    console.log('Taking app screenshots…');
    const shots = await takeScreenshots(browser);
    console.log('  done');

    console.log('Rendering cards…');
    await renderCard(browser, card0_title(shots),        'card0-title.png');
    await renderCard(browser, card1_announcement(shots), 'card1-announcement.png');
    await renderCard(browser, card2_template(shots),     'card2-template.png');
    await renderCard(browser, card3_themes(shots),       'card3-themes.png');
    await renderCard(browser, card4_mobile(shots),       'card4-mobile.png');

    console.log('\nDone → public/screenshots/social/');
  } finally {
    await browser.close();
  }
})();
