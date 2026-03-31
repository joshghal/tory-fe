import { chromium } from 'playwright';
import * as path from 'path';

const OUT = path.join(__dirname);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  try {
    await page.goto('http://localhost:3000/hero-demos', { waitUntil: 'networkidle', timeout: 15000 });
  } catch {
    // Try domcontentloaded fallback
    await page.goto('http://localhost:3000/hero-demos', { waitUntil: 'domcontentloaded', timeout: 10000 });
  }
  await page.waitForTimeout(3000);

  await page.screenshot({ path: path.join(OUT, 'hero-current-1.png'), fullPage: false });

  await page.evaluate(() => window.scrollTo({ top: 500 }));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, 'hero-current-2.png'), fullPage: false });

  console.log('Done');
  await browser.close();
})();
