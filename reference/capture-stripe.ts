import { chromium } from 'playwright';
import * as path from 'path';

const OUT = path.join(__dirname);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  console.log('Loading stripe.com/startups...');
  await page.goto('https://stripe.com/startups', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Capture hero
  await page.screenshot({ path: path.join(OUT, 'stripe-hero.png'), fullPage: false });

  // Scroll through in tight steps
  for (let i = 1; i <= 12; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), i * 400);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, `stripe-${String(i).padStart(2, '0')}.png`), fullPage: false });
  }

  // Also capture main stripe.com
  console.log('Loading stripe.com...');
  await page.goto('https://stripe.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, 'stripe-main-hero.png'), fullPage: false });

  for (let i = 1; i <= 6; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), i * 400);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, `stripe-main-${String(i).padStart(2, '0')}.png`), fullPage: false });
  }

  console.log('Done.');
  await browser.close();
})();
