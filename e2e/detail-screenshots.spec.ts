import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

test('Capture detail page screenshots for bitcoin', async ({ page }) => {
  // 1. Navigate to the detail page
  await page.goto('/detail?id=bitcoin');

  // 2. Wait for data to load (10 seconds as requested)
  await page.waitForTimeout(10000);

  // Wait for the loading spinner to disappear and content to be present
  await page.waitForSelector('.space-y-20', { timeout: 30000 });

  // 3. Full page screenshot
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'detail-bitcoin-full.png'),
    fullPage: true,
  });

  // 4a. Score / Regime section — the first `.s` with [data-guide="regime"] inside
  const regimeSection = page.locator('[data-guide="regime"]').first();
  if (await regimeSection.isVisible()) {
    // Get the parent .s element which contains the full score section
    const scoreSection = regimeSection.locator('..').first();
    await scoreSection.screenshot({
      path: path.join(SCREENSHOT_DIR, 'detail-bitcoin-score-regime.png'),
    });
  }

  // 4b. Signals section
  const signalsSection = page.locator('[data-guide="signals"]').first();
  if (await signalsSection.isVisible()) {
    await signalsSection.screenshot({
      path: path.join(SCREENSHOT_DIR, 'detail-bitcoin-signals.png'),
    });
  }

  // 4c. Strategies section
  const strategiesSection = page.locator('[data-guide="strategies"]').first();
  if (await strategiesSection.isVisible()) {
    await strategiesSection.screenshot({
      path: path.join(SCREENSHOT_DIR, 'detail-bitcoin-strategies.png'),
    });
  }

  // 4d. On-chain section — has data-guide="onchain"
  const onchainSection = page.locator('[data-guide="onchain"]').first();
  if (await onchainSection.isVisible({ timeout: 5000 }).catch(() => false)) {
    await onchainSection.screenshot({
      path: path.join(SCREENSHOT_DIR, 'detail-bitcoin-onchain.png'),
    });
  }

  // 4e. Patterns section (bonus — captures the association rules)
  const patternsSection = page.locator('[data-guide="patterns"]').first();
  if (await patternsSection.isVisible()) {
    await patternsSection.screenshot({
      path: path.join(SCREENSHOT_DIR, 'detail-bitcoin-patterns.png'),
    });
  }
});
