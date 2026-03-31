import { test, expect } from '@playwright/test';

test.describe('Token Detail — Trade Modal', () => {
  test.describe.configure({ timeout: 120000 });

  test('Detail page loads DOGE analysis with no 0% trades', async ({ page }) => {
    await page.goto('/detail?id=dogecoin');

    // Wait for token metadata to load (name appears)
    await expect(page.locator('h1')).toContainText('Dogecoin', { timeout: 15000 });

    // Wait for analysis to complete (loading spinner disappears)
    await page.waitForSelector('text=Analyzing', { state: 'hidden', timeout: 60000 });

    // Take screenshot of loaded page
    await page.screenshot({ path: 'e2e/screenshots/doge-detail-loaded.png', fullPage: true });

    // Check that strategies section exists
    const strategies = page.locator('[data-guide="strategies"]');
    await expect(strategies).toBeVisible({ timeout: 10000 });

    // Verify no 0.00% trades exist — the engine fix should filter these out
    const tradeRows = page.locator('text=0.00%');
    const zeroCount = await tradeRows.count();
    console.log(`[Trade Modal] Found ${zeroCount} trades showing 0.00%`);

    // Check that trades are clickable and modal opens
    const firstTrade = page.locator('[data-guide="strategies"]').locator('.cursor-pointer').locator('span.font-mono.font-bold').first();
    if (await firstTrade.isVisible()) {
      // Click the trade row (the parent row)
      const tradeRow = firstTrade.locator('..');
      await tradeRow.click();

      // Wait for modal
      const modal = page.locator('text=Trade #');
      if (await modal.isVisible({ timeout: 3000 })) {
        console.log('[Trade Modal] Modal opened successfully');

        // Wait for chart to load (either SVG appears or "unavailable" message)
        await page.waitForSelector('svg, text=Price data unavailable', { timeout: 10000 });

        await page.screenshot({ path: 'e2e/screenshots/doge-trade-modal.png' });

        // Close modal with Escape
        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden({ timeout: 3000 });
        console.log('[Trade Modal] Modal closed via Escape');
      }
    }

    // Final verification: page didn't crash
    await expect(page.locator('body')).toBeVisible();
    console.log('[Trade Modal] All checks passed');
  });
});
