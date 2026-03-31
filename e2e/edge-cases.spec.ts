import { test, expect } from '@playwright/test';

test.describe('API Edge Cases', () => {

  // === MISSING / INVALID INPUT ===

  test('POST with empty body returns 400', async ({ request }) => {
    const res = await request.post('/api/analyze/tokenomics', { data: {} });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing data field');
  });

  test('POST with null data returns 400', async ({ request }) => {
    const res = await request.post('/api/analyze/unlocks', {
      data: { data: null },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing data field');
  });

  test('POST with empty string data returns 400', async ({ request }) => {
    const res = await request.post('/api/analyze/financials', {
      data: { data: '' },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing data field');
  });

  // === MALFORMED DATA ===

  test('POST with non-JSON string still gets a response', async ({ request }) => {
    const res = await request.post('/api/analyze/tokenomics', {
      data: { data: 'this is just plain text, not JSON at all' },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.bullishThoughts).toBeDefined();
    expect(json.bearishThoughts).toBeDefined();
    console.log('[Malformed] Plain text handled, got', json.bullishThoughts.length, 'bullish,', json.bearishThoughts.length, 'bearish');
  });

  test('POST with minimal single-item array works', async ({ request }) => {
    const res = await request.post('/api/analyze/tokenomics', {
      data: {
        data: JSON.stringify([{ name: "Test", tokenPercent: 100, totalTokenAllocation: 1000000, unlockedTokens: 50, lockedTokens: 50 }]),
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.bullishThoughts.length).toBeGreaterThanOrEqual(1);
    expect(json.bearishThoughts.length).toBeGreaterThanOrEqual(1);
    console.log('[Minimal] Single item array:', json.bullishThoughts.length, 'bullish,', json.bearishThoughts.length, 'bearish');
  });

  // === LARGE PAYLOAD ===

  test('POST with large dataset does not timeout', async ({ request }) => {
    const largeData = Array.from({ length: 50 }, (_, i) => ({
      date: `${i + 1}/1/2025`,
      name: `metric_${i}`,
      val: Math.random() * 10000,
      chg: (Math.random() - 0.5) * 2,
    }));

    const res = await request.post('/api/analyze/financials', {
      data: { data: JSON.stringify(largeData) },
      timeout: 90000,
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.bullishThoughts).toBeDefined();
    console.log('[Large] 50 metrics handled:', json.bullishThoughts.length, 'bullish,', json.bearishThoughts.length, 'bearish');
  });

  // === OBJECT INSTEAD OF STRING ===

  test('POST with object data (not stringified) still works', async ({ request }) => {
    const res = await request.post('/api/analyze/tokenomics', {
      data: {
        data: [
          { name: "Founders", tokenPercent: 40, totalTokenAllocation: 400000, unlockedTokens: 5, lockedTokens: 35 },
          { name: "Community", tokenPercent: 60, totalTokenAllocation: 600000, unlockedTokens: 30, lockedTokens: 30 },
        ],
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.bullishThoughts.length).toBeGreaterThanOrEqual(1);
    console.log('[Object] Non-string data handled:', json.bullishThoughts.length, 'bullish,', json.bearishThoughts.length, 'bearish');
  });

  // === ALL 3 ROUTES IN PARALLEL ===

  test('All 3 routes respond concurrently', async ({ request }) => {
    const tokenomicsData = JSON.stringify([
      { name: "Team", tokenPercent: 20, totalTokenAllocation: 200000, unlockedTokens: 2, lockedTokens: 18 },
      { name: "Investors", tokenPercent: 30, totalTokenAllocation: 300000, unlockedTokens: 15, lockedTokens: 15 },
      { name: "Public", tokenPercent: 50, totalTokenAllocation: 500000, unlockedTokens: 40, lockedTokens: 10 },
    ]);

    const unlocksData = JSON.stringify([{
      date: "2025-01-15T00:00:00.000Z",
      totalUnlockedTokens: 5000000,
      percentOfSupplyUnlocked: 0.5,
      categories: [{ name: "Seed Round", unlockedTokens: 5000000, percentUnlocked: 2.5 }],
      metrics: { price: { sevenDaysBefore: 1.2, at: 1.1, sevenDaysAfter: 0.95 } },
    }]);

    const financialsData = JSON.stringify([
      { date: "1/1/2025", name: "revenue", val: 500000, chg: 0.15 },
      { date: "1/1/2025", name: "fees", val: 120000, chg: -0.1 },
      { date: "1/1/2025", name: "active_developers", val: 12, chg: 0.2 },
    ]);

    const start = Date.now();

    const [tokRes, unlRes, finRes] = await Promise.all([
      request.post('/api/analyze/tokenomics', { data: { data: tokenomicsData } }),
      request.post('/api/analyze/unlocks', { data: { data: unlocksData } }),
      request.post('/api/analyze/financials', { data: { data: financialsData } }),
    ]);

    const elapsed = Date.now() - start;

    expect(tokRes.ok()).toBeTruthy();
    expect(unlRes.ok()).toBeTruthy();
    expect(finRes.ok()).toBeTruthy();

    const tokJson = await tokRes.json();
    const unlJson = await unlRes.json();
    const finJson = await finRes.json();

    console.log(`[Parallel] All 3 completed in ${elapsed}ms`);
    console.log(`  Tokenomics: ${tokJson.bullishThoughts.length}B/${tokJson.bearishThoughts.length}Be`);
    console.log(`  Unlocks: ${unlJson.bullishThoughts.length}B/${unlJson.bearishThoughts.length}Be`);
    console.log(`  Financials: ${finJson.bullishThoughts.length}B/${finJson.bearishThoughts.length}Be`);

    expect(tokJson.bullishThoughts.length).toBeGreaterThanOrEqual(1);
    expect(unlJson.bullishThoughts.length).toBeGreaterThanOrEqual(1);
    expect(finJson.bullishThoughts.length).toBeGreaterThanOrEqual(1);
  });

  // === WRONG HTTP METHOD ===

  test('GET on analyze routes returns 405', async ({ request }) => {
    const res = await request.get('/api/analyze/tokenomics');
    expect(res.status()).toBe(405);
    console.log('[Method] GET correctly rejected with', res.status());
  });
});
