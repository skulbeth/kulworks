/**
 * Real-device mobile audit: drives installed Chrome at phone widths and reports
 * layout problems that a Tailwind class audit cannot see (injected iframes,
 * intrinsic content widths, actual computed font sizes and tap-target boxes).
 *
 * Requires: npm i -D playwright-core   (uses your installed Chrome, no download)
 *
 * Usage:
 *   node scripts/mobile-audit.mjs                      # localhost:3000 (start `npm run dev` first)
 *   BASE=https://kulworks.com node scripts/mobile-audit.mjs   # NOTE: Cloudflare will challenge automation
 *   HEADED=1 node scripts/mobile-audit.mjs             # watch it happen in a visible window
 *
 * Output: scripts/.mobile-audit/results.json + one PNG per page per width.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = path.join(process.cwd(), 'scripts', '.mobile-audit');
fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  { name: '320-se', width: 320, height: 568 }, // narrowest realistic phone
  { name: '390-14', width: 390, height: 844 }, // iPhone 14/15
  { name: '768-ipad', width: 768, height: 1024 },
];

const ROUTES = [
  ['home', '/'],
  ['order', '/order'],
  ['upload', '/upload'],
  ['pricing', '/pricing'],
  ['services', '/services'],
  ['card-printing', '/services/card-printing'],
  ['portfolio', '/portfolio'],
  ['contact', '/contact'],
  ['guides', '/guides'],
  ['who-its-for', '/who-its-for'],
  ['about', '/about'],
];

const DIAG = `(() => {
  const vw = window.innerWidth;
  const out = { vw, docScrollWidth: document.documentElement.scrollWidth,
    horizontalScroll: document.documentElement.scrollWidth > vw + 1,
    overflowers: [], smallInputs: [], smallTaps: [], iframes: [] };

  const desc = (el) => {
    const cls = (typeof el.className === 'string' ? el.className : '').trim();
    const txt = (el.innerText || el.value || '').trim().replace(/\\s+/g,' ').slice(0,40);
    return el.tagName.toLowerCase()
      + (el.id ? '#'+el.id : '')
      + (cls ? '.'+cls.split(/\\s+/).slice(0,6).join('.') : '')
      + (txt ? ' :: "'+txt+'"' : '');
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  };
  // inside an intentional horizontal-scroll container? then overflow is by design
  const inScroller = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
      p = p.parentElement;
    }
    return false;
  };

  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.width > vw + 1) && !inScroller(el)) {
      // only report if no ancestor already reported (outermost offender wins)
      out.overflowers.push({ el: desc(el), width: Math.round(r.width), right: Math.round(r.right) });
    }
  }
  out.overflowers = out.overflowers.slice(0, 15);

  for (const el of document.querySelectorAll('input, select, textarea')) {
    if (!visible(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) out.smallInputs.push({ el: desc(el), fontSize: fs }); // <16px => iOS zooms on focus
  }

  for (const el of document.querySelectorAll('a,button,[role=button],input[type=submit],input[type=checkbox],input[type=radio],label[for],summary')) {
    if (!visible(el)) continue;
    if (el.tagName === 'A' && el.closest('p,li')) continue; // inline prose link, not a tap target
    const r = el.getBoundingClientRect();
    if (r.height < 44 || r.width < 24) out.smallTaps.push({ el: desc(el), w: Math.round(r.width), h: Math.round(r.height) });
  }
  out.smallTaps = out.smallTaps.slice(0, 25);

  // third-party iframes (Turnstile, maps, embeds) have intrinsic widths our CSS doesn't control
  for (const f of document.querySelectorAll('iframe')) {
    const r = f.getBoundingClientRect();
    out.iframes.push({ src: (f.src||'').slice(0,60), w: Math.round(r.width), h: Math.round(r.height), overflows: r.right > vw + 1 });
  }
  return out;
})()`;

const isChallenge = async (page) => {
  const t = (await page.title().catch(() => '')) || '';
  const body = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '').catch(() => '');
  return /just a moment|checking your browser|attention required|cf-chl/i.test(t + body);
};

const browser = await chromium.launch({
  channel: 'chrome',
  headless: process.env.HEADED !== '1',
});

const report = {};
let challenged = false;

for (const vp of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  });

  for (const [name, route] of ROUTES) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
    const key = `${name}@${vp.name}`;
    try {
      // domcontentloaded, NOT networkidle: a Cloudflare interstitial never goes idle
      const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500); // let fonts/images/hydration settle
      if (await isChallenge(page)) {
        report[key] = { blocked: 'cloudflare-challenge' };
        challenged = true;
        await page.close();
        continue;
      }
      const diag = await page.evaluate(DIAG);
      diag.status = resp?.status() ?? null;
      diag.pageErrors = errors;
      report[key] = diag;
      await page.screenshot({ path: path.join(OUT, `${key}.png`) });
      if (name === 'order' || name === 'upload' || name === 'home') {
        await page.screenshot({ path: path.join(OUT, `${key}-full.png`), fullPage: true });
      }
    } catch (e) {
      report[key] = { error: String(e.message).slice(0, 200) };
    }
    await page.close();
  }
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(report, null, 2));

// ---- console summary ----
let problems = 0;
for (const [key, r] of Object.entries(report)) {
  if (r.blocked) { console.log(`${key}: BLOCKED (${r.blocked})`); continue; }
  if (r.error) { console.log(`${key}: ERROR ${r.error}`); problems++; continue; }
  const bad = r.horizontalScroll || r.overflowers.length || r.smallInputs.length || r.smallTaps.length
    || r.iframes.some((f) => f.overflows);
  if (bad) problems++;
  console.log(
    `${bad ? 'FAIL' : 'ok  '} ${key} hscroll=${r.horizontalScroll} overflow=${r.overflowers.length} smallInput=${r.smallInputs.length} smallTap=${r.smallTaps.length} iframeOverflow=${r.iframes.filter((f) => f.overflows).length}`
  );
  for (const o of r.overflowers.slice(0, 3)) console.log(`      overflow: ${o.el} (w=${o.width} right=${o.right})`);
  for (const i of r.smallInputs.slice(0, 3)) console.log(`      ${i.fontSize}px input: ${i.el}`);
}
if (challenged) {
  console.log('\nSome pages were blocked by the Cloudflare bot challenge.');
  console.log('Run against the dev server instead: npm run dev, then node scripts/mobile-audit.mjs');
}
console.log(`\nScreenshots + results.json in scripts/.mobile-audit/  (${problems} page/width combos with findings)`);
