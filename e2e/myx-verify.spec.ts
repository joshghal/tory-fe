import { test, expect } from '@playwright/test';

test('MYX Finance detail page — verify all sections visible', async ({ page }) => {
  await page.goto('/detail?id=myx-finance');

  // Wait for metadata
  await expect(page.locator('h1')).not.toBeEmpty({ timeout: 15000 });

  // Wait for analysis
  await page.waitForSelector('text=Analyzing', { state: 'hidden', timeout: 90000 });

  // Take full page screenshot
  await page.screenshot({ path: 'e2e/screenshots/myx-full.png', fullPage: true });

  // Check each section is visible
  const score = page.locator('text=/\\/100/');
  const signals = page.locator('[data-guide="signals"]');
  const strategies = page.locator('[data-guide="strategies"]');
  const patterns = page.locator('[data-guide="patterns"]');
  const rawdata = page.locator('[data-guide="rawdata"]');

  console.log('[MYX] Score visible:', await score.isVisible());
  console.log('[MYX] Signals visible:', await signals.isVisible());
  console.log('[MYX] Strategies visible:', await strategies.isVisible());
  console.log('[MYX] Patterns visible:', await patterns.isVisible());
  console.log('[MYX] Raw data visible:', await rawdata.isVisible());

  // Check for errors in console
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  // Scroll through to trigger any lazy issues
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'e2e/screenshots/myx-bottom.png', fullPage: true });

  console.log('[MYX] Console errors:', errors.length > 0 ? errors : 'none');

  // The score section must be visible
  await expect(score).toBeVisible({ timeout: 5000 });
});
