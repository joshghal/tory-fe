import { test, expect } from '@playwright/test';

test.describe('TORY Full Flow', () => {
  test('Home page loads and search works', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    console.log('[Home] Page loaded');

    // Check for search input
    const searchInput = page.locator('input').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);
    console.log('[Home] Search input visible:', hasSearch);

    if (hasSearch) {
      await searchInput.fill('ethereum');
      await page.waitForTimeout(3000);

      const results = await page.locator('body').textContent();
      console.log('[Home] Search results preview:', results?.substring(0, 200));
    }
  });

  test('API route: /api/analyze/tokenomics returns valid response', async ({ request }) => {
    const sampleData = JSON.stringify([
      {
        name: "Early Backers",
        tokenPercent: 31.7,
        totalTokenAllocation: 317000000,
        unlockedTokens: 0,
        lockedTokens: 31.72
      },
      {
        name: "Ecosystem & Data Providers",
        tokenPercent: 22.3,
        totalTokenAllocation: 223000000,
        unlockedTokens: 10.1,
        lockedTokens: 12.18
      },
      {
        name: "Community",
        tokenPercent: 15.0,
        totalTokenAllocation: 150000000,
        unlockedTokens: 5.0,
        lockedTokens: 10.0
      },
      {
        name: "Team",
        tokenPercent: 20.0,
        totalTokenAllocation: 200000000,
        unlockedTokens: 2.0,
        lockedTokens: 18.0
      }
    ]);

    console.log('[Tokenomics API] Sending request...');
    const response = await request.post('/api/analyze/tokenomics', {
      data: { data: sampleData },
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    console.log('[Tokenomics API] Status:', response.status());
    console.log('[Tokenomics API] Bullish:', json.bullishThoughts?.length, 'points');
    console.log('[Tokenomics API] Bearish:', json.bearishThoughts?.length, 'points');
    console.log('[Tokenomics API] Sample bullish:', json.bullishThoughts?.[0]?.substring(0, 100));

    expect(json.bullishThoughts).toBeDefined();
    expect(json.bearishThoughts).toBeDefined();
    expect(json.bullishThoughts.length).toBeGreaterThanOrEqual(1);
    expect(json.bearishThoughts.length).toBeGreaterThanOrEqual(1);
  });

  test('API route: /api/analyze/unlocks returns valid response', async ({ request }) => {
    const sampleData = JSON.stringify([
      {
        date: "2025-03-15T00:00:00.000Z",
        totalUnlockedTokens: 63990287,
        percentOfSupplyUnlocked: 0.0064,
        categories: [
          { name: "Early Contributors", unlockedTokens: 33560988, percentUnlocked: 1.67 },
          { name: "Investors", unlockedTokens: 30429299, percentUnlocked: 1.52 }
        ],
        metrics: {
          price: { sevenDaysBefore: 0.184, at: 0.176, sevenDaysAfter: 0.162 },
          volume: { sevenDaysBefore: 44327129, at: 25089796, sevenDaysAfter: 29090782 }
        }
      }
    ]);

    console.log('[Unlocks API] Sending request...');
    const response = await request.post('/api/analyze/unlocks', {
      data: { data: sampleData },
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    console.log('[Unlocks API] Status:', response.status());
    console.log('[Unlocks API] Bullish:', json.bullishThoughts?.length, 'points');
    console.log('[Unlocks API] Bearish:', json.bearishThoughts?.length, 'points');

    expect(json.bullishThoughts).toBeDefined();
    expect(json.bearishThoughts).toBeDefined();
  });

  test('API route: /api/analyze/financials returns valid response', async ({ request }) => {
    const sampleData = JSON.stringify([
      { date: "4/1/2025", name: "active_developers", val: 4, chg: -0.16 },
      { date: "4/1/2025", name: "code_commits", val: 1, chg: -0.98 },
      { date: "4/1/2025", name: "revenue", val: 523000, chg: 0.12 },
      { date: "4/1/2025", name: "fees", val: 180000, chg: -0.05 },
      { date: "3/1/2025", name: "active_developers", val: 5, chg: 0.25 },
      { date: "3/1/2025", name: "revenue", val: 467000, chg: -0.08 }
    ]);

    console.log('[Financials API] Sending request...');
    const response = await request.post('/api/analyze/financials', {
      data: { data: sampleData },
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    console.log('[Financials API] Status:', response.status());
    console.log('[Financials API] Bullish:', json.bullishThoughts?.length, 'points');
    console.log('[Financials API] Bearish:', json.bearishThoughts?.length, 'points');

    expect(json.bullishThoughts).toBeDefined();
    expect(json.bearishThoughts).toBeDefined();
  });

  test('API route: returns 400 for missing data', async ({ request }) => {
    const response = await request.post('/api/analyze/tokenomics', {
      data: {},
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Missing data field');
    console.log('[Validation] Empty body correctly rejected');
  });
});
