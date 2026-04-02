import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080';

test.describe('Onchain Loading Flow', () => {
  test('should show loading, progress, then results that persist after refresh', async ({ page }) => {
    // Clear cache
    await fetch(`${API}/onchain/cache?id=superfortune`, { method: 'DELETE' });
    console.log('Cache cleared');

    const apiCalls: string[] = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/onchain')) {
        let body: any = null;
        try { body = await response.json(); } catch {}
        const short = url.replace(API, '').replace('http://localhost:3000', '');
        const info = `[${response.status()}] ${short.split('?')[0]} cached=${body?.cached} status=${body?.status} transfers=${body?.summary?.totalTransfers || '-'}`;
        apiCalls.push(info);
        console.log(info);
      }
    });

    // === PHASE 1: Initial load — should trigger loading flow ===
    console.log('\n=== PHASE 1: Initial load ===');
    await page.goto('/detail?id=superfortune', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/onchain-phase1-initial.png', fullPage: true });

    // === PHASE 2: Wait for progress polling ===
    console.log('\n=== PHASE 2: Progress polling ===');
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(3000);
      // Check for loading indicators
      const loadingText = await page.locator('text=/scanning|fetching|chain|loading.*onchain/i').first().textContent().catch(() => null);
      const progressBar = await page.locator('[role="progressbar"], .animate-pulse').first().isVisible().catch(() => false);
      console.log(`Tick ${i + 1}: loadingText="${loadingText || 'none'}" progressBar=${progressBar}`);
    }
    await page.screenshot({ path: 'e2e/screenshots/onchain-phase2-polling.png', fullPage: true });

    // === PHASE 3: Wait for completion + verify data shows ===
    console.log('\n=== PHASE 3: Wait for results ===');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'e2e/screenshots/onchain-phase3-results.png', fullPage: true });

    const vestingVisible = await page.locator('text=/vesting|VESTING/i').first().isVisible().catch(() => false);
    const eventsVisible = await page.locator('text=/exchange.*flow|outflow|inflow|wash.*trad/i').first().isVisible().catch(() => false);
    const anomalyVisible = await page.locator('text=/anomal|spike|surge/i').first().isVisible().catch(() => false);
    console.log(`Vesting: ${vestingVisible}, Events: ${eventsVisible}, Anomaly: ${anomalyVisible}`);

    // Scroll to onchain section and screenshot just that area
    const onchainHeading = page.locator('text=/On-chain/i').first();
    if (await onchainHeading.isVisible()) {
      await onchainHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/onchain-phase3-section.png' });
    }

    // === PHASE 4: Refresh page — data should load from cache instantly ===
    console.log('\n=== PHASE 4: Refresh — cache test ===');
    apiCalls.length = 0;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'e2e/screenshots/onchain-phase4-refresh.png', fullPage: true });

    const vestingAfterRefresh = await page.locator('text=/vesting|VESTING/i').first().isVisible().catch(() => false);
    const eventsAfterRefresh = await page.locator('text=/exchange.*flow|outflow|inflow|wash.*trad/i').first().isVisible().catch(() => false);
    console.log(`After refresh — Vesting: ${vestingAfterRefresh}, Events: ${eventsAfterRefresh}`);

    // Check the onchain call was a cache hit
    const cachedCall = apiCalls.find(c => c.includes('/onchain') && !c.includes('/progress') && c.includes('cached=true'));
    console.log(`Cache hit on refresh: ${!!cachedCall}`);

    // Scroll to onchain section after refresh
    const onchainHeading2 = page.locator('text=/On-chain/i').first();
    if (await onchainHeading2.isVisible()) {
      await onchainHeading2.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/onchain-phase4-section.png' });
    }

    // === ASSERTIONS ===
    console.log('\n=== ASSERTIONS ===');
    console.log(`All API calls: ${apiCalls.length}`);
    apiCalls.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));

    expect(vestingVisible || eventsVisible, 'Onchain data should be visible after scan').toBeTruthy();
    expect(vestingAfterRefresh || eventsAfterRefresh, 'Onchain data should persist after refresh').toBeTruthy();
    expect(cachedCall, 'Refresh should hit cache').toBeTruthy();
  });
});
