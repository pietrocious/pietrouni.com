import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto('http://localhost:4326/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.click('#dock-about');
await page.waitForTimeout(600);

await page.screenshot({ path: 'repro6.png' });

const report = await page.evaluate(() => {
  const out = {};
  const h1 = document.querySelector('.window-content h1, #win-about h1');
  const els = document.querySelectorAll('#win-about h1, #win-about h2');
  els.forEach((el, i) => {
    const cs = getComputedStyle(el);
    out[`el${i} <${el.tagName}> "${el.textContent.trim().slice(0,30)}"`] = {
      declaredFontFamily: cs.fontFamily,
    };
  });
  return out;
});
console.log(JSON.stringify(report, null, 2));

// check actual loaded/used fonts for Copernicus specifically
const copernicus = await page.evaluate(() => {
  const results = [];
  document.fonts.forEach((f) => {
    if (f.family.includes('Copernicus') || f.family.includes('Outfit') || f.family.includes('Tiempos')) {
      results.push(`${f.family} ${f.weight} ${f.status}`);
    }
  });
  return results;
});
console.log('RELEVANT FONTS:', JSON.stringify(copernicus, null, 1));

await browser.close();
