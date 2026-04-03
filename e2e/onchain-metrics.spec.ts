import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080';

test('on-chain metrics render after fresh scan (no cache, no refresh)', async ({ page }) => {
  // Clear cache
  await fetch(`${API}/onchain/cache?id=render-token`, { method: 'DELETE' });
  console.log('Cache cleared');

  // Track API calls
  const apiCalls: string[] = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/onchain') && !url.includes('/progress')) {
      let body: any = null;
      try { body = await res.json(); } catch {}
      apiCalls.push(`[${res.status()}] cached=${body?.cached} transfers=${body?.summary?.totalTransfers || '-'} status=${body?.status || '-'}`);
      console.log(`[API] ${apiCalls[apiCalls.length - 1]}`);
    }
  });

  await page.goto('/detail?id=render-token', { waitUntil: 'domcontentloaded' });

  // Wait for scan to complete (render-token has ETH+ARB, takes ~60-90s)
  console.log('Waiting for scan to complete...');
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(5000);
    const prog = await (await fetch(`${API}/onchain/progress?id=render-token`)).json();
    console.log(`  ${i * 5}s: status=${prog.status} chain=${prog.currentChain} txs=${prog.totalTransfers}`);
    if (prog.status === 'idle' || prog.status === 'done') {
      console.log('Scan complete!');
      break;
    }
  }

  // Give the frontend 5s to process the final response
  await page.waitForTimeout(5000);

  // NOW check for metrics
  const metricNames = ['Supply In Motion', 'Token Velocity', 'New Address', 'Exchange Net Flow', 'Wash Trading', 'Active Addr', 'Tx Count', 'Retail Ratio', 'Avg Transfer'];
  const foundMetrics: string[] = [];
  for (const name of metricNames) {
    const el = page.locator(`text=/${name}/i`).first();
    if (await el.isVisible().catch(() => false)) {
      foundMetrics.push(name);
    }
  }
  console.log(`\nFound metric charts: ${foundMetrics.length}/${metricNames.length}`);
  foundMetrics.forEach(m => console.log(`  ✓ ${m}`));

  const bars = await page.locator('.rounded-sm').count();
  console.log(`Bar chart elements: ${bars}`);

  const noData = await page.locator('text=/No on-chain data/i').isVisible().catch(() => false);
  console.log(`"No data" visible: ${noData}`);

  expect(foundMetrics.length, 'Metrics should be visible after scan without refresh').toBeGreaterThan(0);
  expect(noData, 'Should not show "No data" message').toBeFalsy();
});
