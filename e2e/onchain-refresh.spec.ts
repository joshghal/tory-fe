import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080';

test('profile refresh after onchain load does not cause infinite loop', async ({ page }) => {
  // Use a token with cached onchain data (don't clear cache)
  // render-token should have cached data from the previous scan

  const apiCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/profile') || (url.includes('/onchain') && !url.includes('/progress'))) {
      apiCalls.push(`${req.method()} ${url.replace(API, '').replace('http://localhost:3000', '').split('?')[0]}`);
    }
  });

  await page.goto('/detail?id=render-token', { waitUntil: 'domcontentloaded' });

  // Wait for everything to settle
  await page.waitForTimeout(10000);
  const count1 = apiCalls.length;
  console.log(`After 10s: ${count1} calls`);
  apiCalls.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));

  // Wait another 10s — no new profile/onchain calls should happen
  await page.waitForTimeout(10000);
  const count2 = apiCalls.length;
  const delta = count2 - count1;
  console.log(`\nAfter 20s: ${count2} calls (delta: ${delta})`);
  if (delta > 0) {
    apiCalls.slice(count1).forEach((c, i) => console.log(`  NEW: ${c}`));
  }

  // Expect: 1 /profile + 1 /onchain (cached). Maybe 1 more /profile refresh. That's it.
  expect(count1).toBeLessThanOrEqual(4); // initial calls
  expect(delta).toBe(0); // no new calls after settling
});
