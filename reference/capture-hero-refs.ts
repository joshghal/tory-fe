import { chromium } from 'playwright';
import * as path from 'path';

const OUT = path.join(__dirname);

const SITES = [
  { name: 'linear', url: 'https://linear.app/' },
  { name: 'raycast', url: 'https://www.raycast.com/' },
  { name: 'clerk', url: 'https://clerk.com/' },
  { name: 'vercel', url: 'https://vercel.com/' },
  { name: 'supabase', url: 'https://supabase.com/' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const site of SITES) {
    console.log(`Capturing ${site.name}...`);
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(site.url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(OUT, `ref-${site.name}-hero.png`), fullPage: false });
      // Scroll down a bit for below-fold
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, `ref-${site.name}-below.png`), fullPage: false });
    } catch (e: any) {
      console.log(`  Failed: ${e.message?.slice(0, 60)}`);
    }
    await ctx.close();
  }

  console.log('Done.');
  await browser.close();
})();
