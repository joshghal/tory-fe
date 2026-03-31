import { chromium } from 'playwright';
import * as path from 'path';

const OUT = path.join(__dirname);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto('https://nvg8.io/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  // Capture the bottom 40% of the page in 300px steps
  const startY = Math.floor(pageHeight * 0.6);
  const stepSize = 300;

  for (let i = 0; i < 40; i++) {
    const scrollTo = Math.min(startY + i * stepSize, pageHeight - 900);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), scrollTo);
    await page.waitForTimeout(800);
    const idx = String(i + 1).padStart(2, '0');
    await page.screenshot({ path: path.join(OUT, `bottom-${idx}.png`), fullPage: false });
    if (i % 10 === 0) console.log(`  ${i + 1}/40 (y=${scrollTo})`);
    if (scrollTo >= pageHeight - 900) break;
  }

  console.log('Done — bottom captures saved.');
  await browser.close();
})();
