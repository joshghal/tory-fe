import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  console.log('Loading nvg8.io...');
  await page.goto('https://nvg8.io/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);

  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = 900;
  // Scroll by 300px each step (only 1/3 of viewport) for tight overlap
  const stepSize = 300;
  const totalSteps = Math.ceil(pageHeight / stepSize);
  const maxCaptures = 40;

  console.log(`Page height: ${pageHeight}px, step: ${stepSize}px, total: ${totalSteps} steps, capturing up to ${maxCaptures}`);

  for (let i = 0; i < Math.min(totalSteps, maxCaptures); i++) {
    const scrollTo = Math.min(i * stepSize, pageHeight - viewportHeight);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), scrollTo);
    await page.waitForTimeout(800);
    const idx = String(i + 1).padStart(2, '0');
    await page.screenshot({ path: path.join(OUT, `tight-${idx}.png`), fullPage: false });
    if (i % 10 === 0) console.log(`  ${i + 1}/${Math.min(totalSteps, maxCaptures)} (y=${scrollTo})`);
  }

  console.log('Done — tight captures saved.');
  await browser.close();
})();
