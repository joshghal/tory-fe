import { test, expect } from '@playwright/test';

test.describe('Consolidated App — Full E2E Verification', () => {
  test.describe.configure({ timeout: 120000 });

  // ================================================================
  // FLOW 1: Auth scrapers (migrated from tory-fe-apis)
  // ================================================================

  test('Flow 1a: LunarCrush auth via local /api/auth/lunarcrush', async ({ request, page }) => {
    const res = await request.get('/api/auth/lunarcrush');
    const json = await res.json();

    console.log('[Auth - LunarCrush] Status:', res.status());
    console.log('[Auth - LunarCrush] Has bearer:', !!json.bearer);
    console.log('[Auth - LunarCrush] Token length:', json.bearer?.length || 0);

    await page.goto('about:blank');
    await page.setContent(`
      <div style="background:#111;color:#fff;padding:40px;font-family:monospace;">
        <h1>Flow 1a: LunarCrush Auth</h1>
        <p>Status: ${res.status()}</p>
        <p>Bearer: ${json.bearer ? '✅ ' + json.bearer.substring(0, 20) + '...' : '❌ Missing'}</p>
        <p>Length: ${json.bearer?.length || 0} chars</p>
      </div>
    `);
    await page.screenshot({ path: 'e2e/screenshots/flow-1a-lunarcrush-auth.png' });

    expect(res.status()).toBe(200);
    expect(json.bearer).toBeTruthy();
  });

  test('Flow 1b: TokenTerminal auth via local /api/auth/token-terminal', async ({ request, page }) => {
    const res = await request.get('/api/auth/token-terminal');
    const json = await res.json();

    console.log('[Auth - TT] Status:', res.status());
    console.log('[Auth - TT] Has bearer:', !!json.bearer);
    console.log('[Auth - TT] Has jwt:', !!json.jwt);

    await page.goto('about:blank');
    await page.setContent(`
      <div style="background:#111;color:#fff;padding:40px;font-family:monospace;">
        <h1>Flow 1b: TokenTerminal Auth</h1>
        <p>Status: ${res.status()}</p>
        <p>Bearer: ${json.bearer ? '✅ ' + json.bearer.substring(0, 20) + '...' : '❌ Missing'}</p>
        <p>JWT: ${json.jwt ? '✅ ' + json.jwt.substring(0, 20) + '...' : '❌ Missing'}</p>
      </div>
    `);
    await page.screenshot({ path: 'e2e/screenshots/flow-1b-tt-auth.png' });

    expect(res.status()).toBe(200);
    expect(json.bearer || json.jwt).toBeTruthy();
  });

  // ================================================================
  // FLOW 2: Search (migrated + CoinGecko resolver)
  // ================================================================

  test('Flow 2: Token search via local /api/search', async ({ request, page }) => {
    const res = await request.get('/api/search?query=bitcoin&bearer=&jwt=');
    const json = await res.json();

    console.log('[Search] Status:', res.status());
    console.log('[Search] Results:', json.data?.length);
    if (json.data?.length > 0) {
      console.log('[Search] First:', JSON.stringify(json.data[0]).substring(0, 200));
    }

    await page.goto('about:blank');
    await page.setContent(`
      <div style="background:#111;color:#fff;padding:40px;font-family:monospace;">
        <h1>Flow 2: Token Search</h1>
        <p>Status: ${res.status()}</p>
        <p>Results: ${json.data?.length || 0}</p>
        <ul>
          ${(json.data || []).slice(0, 5).map((t: any) => `
            <li>${t.label} (${t.symbol}) — arkham: ${t.arkhamSlug}, cr: ${t.cryptoRankSlug || 'N/A'}, tt: ${t.tokenTerminalSlug || 'N/A'}</li>
          `).join('')}
        </ul>
      </div>
    `);
    await page.screenshot({ path: 'e2e/screenshots/flow-2-search.png' });

    expect(res.status()).toBe(200);
  });

  // ================================================================
  // FLOW 3: Token details (migrated + Santiment)
  // ================================================================

  test('Flow 3: Token details via local /api/token/details', async ({ request, page }) => {
    // Get lunar auth first
    const authRes = await request.get('/api/auth/lunarcrush');
    const authJson = await authRes.json();
    const lunarToken = authJson.bearer || '';

    const res = await request.get(
      `/api/token/details?arkhamSlug=bitcoin&cryptoRankSlug=bitcoin&lunarSlug=bitcoin&lunarToken=${lunarToken}`
    );
    const json = await res.json();
    const data = json.data;

    console.log('[Details] Status:', res.status());
    console.log('[Details] Has stats:', !!data?.stats);
    console.log('[Details] Has tokenomics:', !!data?.tokenomics);
    console.log('[Details] Has unlocks:', !!data?.unlocks);
    console.log('[Details] Has priceHistory:', !!data?.priceHistory);
    console.log('[Details] Has socialHistory:', !!data?.socialHistory);
    console.log('[Details] Price:', data?.stats?.price);

    // Check Santiment data merged
    const hasSentiment = data?.socialHistory?.data?.some((d: any) => d.sentiment_positive !== undefined);
    console.log('[Details] Santiment merged:', hasSentiment);

    await page.goto('about:blank');
    await page.setContent(`
      <div style="background:#111;color:#fff;padding:40px;font-family:monospace;">
        <h1>Flow 3: Token Details (Bitcoin)</h1>
        <p>Status: ${res.status()}</p>
        <p>Price: $${data?.stats?.price?.toLocaleString() || 'N/A'}</p>
        <p>Stats: ${data?.stats ? '✅' : '❌'} | Tokenomics: ${data?.tokenomics ? '✅' : '⚠️ No vesting'} | Unlocks: ${data?.unlocks ? '✅' : '⚠️'}</p>
        <p>Price History: ${data?.priceHistory?.length || 0} points</p>
        <p>Social History: ${data?.socialHistory?.data?.length || 0} points</p>
        <p>Santiment Sentiment: ${hasSentiment ? '✅ Merged' : '⚠️ Not available'}</p>
      </div>
    `);
    await page.screenshot({ path: 'e2e/screenshots/flow-3-token-details.png' });

    expect(res.status()).toBe(200);
    expect(data?.stats || data?.priceHistory).toBeTruthy();
  });

  // ================================================================
  // FLOW 4: Financial statement (migrated)
  // ================================================================

  test('Flow 4: Financial statement via local /api/financial-statement', async ({ request, page }) => {
    // Get TT auth
    const authRes = await request.get('/api/auth/token-terminal');
    const authJson = await authRes.json();

    const res = await request.get(
      `/api/financial-statement?slug=uniswap&bearer=${authJson.bearer}&jwt=${authJson.jwt}`
    );
    const json = await res.json();

    console.log('[Financial] Status:', res.status());
    console.log('[Financial] Metrics:', json.data?.length);

    const sections = [...new Set((json.data || []).map((d: any) => d.section))];
    const metrics = [...new Set((json.data || []).slice(0, 30).map((d: any) => d.metric_id))];

    await page.goto('about:blank');
    await page.setContent(`
      <div style="background:#111;color:#fff;padding:40px;font-family:monospace;">
        <h1>Flow 4: Financial Statement (Uniswap)</h1>
        <p>Status: ${res.status()}</p>
        <p>Total Metrics: ${json.data?.length || 0}</p>
        <p>Sections: ${sections.join(', ')}</p>
        <p>Sample Metrics: ${metrics.slice(0, 8).join(', ')}</p>
      </div>
    `);
    await page.screenshot({ path: 'e2e/screenshots/flow-4-financial.png' });

    expect(res.status()).toBe(200);
    expect(json.data?.length).toBeGreaterThan(0);
  });

  // ================================================================
  // FLOW 5: AI Analysis (already consolidated)
  // ================================================================

  test('Flow 5: AI analysis — all 3 routes', async ({ request, page }) => {
    const tokenomicsData = JSON.stringify([
      { name: "Team", tokenPercent: 20, totalTokenAllocation: 200000, unlockedTokens: 2, lockedTokens: 18 },
      { name: "Investors", tokenPercent: 30, totalTokenAllocation: 300000, unlockedTokens: 15, lockedTokens: 15 },
      { name: "Public", tokenPercent: 50, totalTokenAllocation: 500000, unlockedTokens: 40, lockedTokens: 10 },
    ]);

    const financialsData = JSON.stringify([
      { date: "1/1/2025", name: "revenue", val: 500000, chg: 0.15 },
      { date: "1/1/2025", name: "fees", val: 120000, chg: -0.1 },
      { date: "1/1/2025", name: "active_developers", val: 12, chg: 0.2 },
    ]);

    const unlocksData = JSON.stringify([{
      date: "2025-03-15T00:00:00.000Z",
      totalUnlockedTokens: 63990287,
      percentOfSupplyUnlocked: 0.0064,
      categories: [{ name: "Early Contributors", unlockedTokens: 33560988, percentUnlocked: 1.67 }],
      metrics: { price: { sevenDaysBefore: 0.184, at: 0.176, sevenDaysAfter: 0.162 } },
    }]);

    const start = Date.now();
    const [tokRes, unlRes, finRes] = await Promise.all([
      request.post('/api/analyze/tokenomics', { data: { data: tokenomicsData } }),
      request.post('/api/analyze/unlocks', { data: { data: unlocksData } }),
      request.post('/api/analyze/financials', { data: { data: financialsData } }),
    ]);
    const elapsed = Date.now() - start;

    const tokJson = await tokRes.json();
    const unlJson = await unlRes.json();
    const finJson = await finRes.json();

    console.log(`[AI] All 3 in ${elapsed}ms`);
    console.log(`[AI] Tokenomics: ${tokJson.bullishThoughts?.length}B/${tokJson.bearishThoughts?.length}Be`);
    console.log(`[AI] Unlocks: ${unlJson.bullishThoughts?.length}B/${unlJson.bearishThoughts?.length}Be`);
    console.log(`[AI] Financials: ${finJson.bullishThoughts?.length}B/${finJson.bearishThoughts?.length}Be`);

    await page.goto('about:blank');
    await page.setContent(`
      <div style="background:#111;color:#fff;padding:40px;font-family:monospace;max-width:900px;">
        <h1>Flow 5: AI Analysis (3 routes parallel)</h1>
        <p>Total time: ${elapsed}ms</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:20px;">
          <div style="background:#1a1a1a;padding:16px;border-radius:8px;">
            <h3 style="color:#4ade80;">Tokenomics</h3>
            <p>Status: ${tokRes.status()}</p>
            <p>Bullish: ${tokJson.bullishThoughts?.length} pts</p>
            <p>Bearish: ${tokJson.bearishThoughts?.length} pts</p>
            <p style="font-size:11px;color:#888;margin-top:8px;">${tokJson.bullishThoughts?.[0]?.substring(0, 80)}...</p>
          </div>
          <div style="background:#1a1a1a;padding:16px;border-radius:8px;">
            <h3 style="color:#facc15;">Unlocks</h3>
            <p>Status: ${unlRes.status()}</p>
            <p>Bullish: ${unlJson.bullishThoughts?.length} pts</p>
            <p>Bearish: ${unlJson.bearishThoughts?.length} pts</p>
            <p style="font-size:11px;color:#888;margin-top:8px;">${unlJson.bullishThoughts?.[0]?.substring(0, 80)}...</p>
          </div>
          <div style="background:#1a1a1a;padding:16px;border-radius:8px;">
            <h3 style="color:#60a5fa;">Financials</h3>
            <p>Status: ${finRes.status()}</p>
            <p>Bullish: ${finJson.bullishThoughts?.length} pts</p>
            <p>Bearish: ${finJson.bearishThoughts?.length} pts</p>
            <p style="font-size:11px;color:#888;margin-top:8px;">${finJson.bullishThoughts?.[0]?.substring(0, 80)}...</p>
          </div>
        </div>
      </div>
    `);
    await page.screenshot({ path: 'e2e/screenshots/flow-5-ai-analysis.png' });

    expect(tokRes.ok()).toBeTruthy();
    expect(unlRes.ok()).toBeTruthy();
    expect(finRes.ok()).toBeTruthy();
  });

  // ================================================================
  // FLOW 6: Frontend UI loads
  // ================================================================

  test('Flow 6: Home page renders and is interactive', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'e2e/screenshots/flow-6-homepage.png', fullPage: true });

    const body = await page.locator('body').textContent();
    console.log('[Homepage] Content length:', body?.length);
    expect(body?.length).toBeGreaterThan(0);
  });

  // ================================================================
  // FLOW 7: Santiment sentiment data
  // ================================================================

  test('Flow 7: Santiment sentiment integration', async ({ request, page }) => {
    // Call token details — Santiment data should be merged
    const authRes = await request.get('/api/auth/lunarcrush');
    const authJson = await authRes.json();

    const res = await request.get(
      `/api/token/details?arkhamSlug=ethereum&cryptoRankSlug=ethereum&lunarSlug=ethereum&lunarToken=${authJson.bearer || ''}`
    );
    const json = await res.json();
    const socialData = json.data?.socialHistory?.data || [];

    const withSentiment = socialData.filter((d: any) => d.sentiment_positive !== undefined);
    const withSocialVol = socialData.filter((d: any) => d.social_volume !== undefined);

    console.log('[Santiment] Total social data points:', socialData.length);
    console.log('[Santiment] With sentiment_positive:', withSentiment.length);
    console.log('[Santiment] With social_volume:', withSocialVol.length);

    if (withSentiment.length > 0) {
      const sample = withSentiment[withSentiment.length - 1];
      console.log('[Santiment] Latest:', {
        sentiment_positive: sample.sentiment_positive,
        sentiment_negative: sample.sentiment_negative,
        social_volume: sample.social_volume,
        computed_sentiment: sample.sentiment,
      });
    }

    await page.goto('about:blank');
    await page.setContent(`
      <div style="background:#111;color:#fff;padding:40px;font-family:monospace;">
        <h1>Flow 7: Santiment Integration (Ethereum)</h1>
        <p>Social data points: ${socialData.length}</p>
        <p>With sentiment_positive: ${withSentiment.length} ${withSentiment.length > 0 ? '✅' : '⚠️'}</p>
        <p>With social_volume: ${withSocialVol.length} ${withSocialVol.length > 0 ? '✅' : '⚠️'}</p>
        ${withSentiment.length > 0 ? `
          <p style="margin-top:12px;">Latest sentiment_positive: ${withSentiment[withSentiment.length - 1]?.sentiment_positive?.toFixed(2)}</p>
          <p>Latest sentiment_negative: ${withSentiment[withSentiment.length - 1]?.sentiment_negative?.toFixed(2)}</p>
          <p>Latest social_volume: ${withSentiment[withSentiment.length - 1]?.social_volume}</p>
        ` : '<p style="color:#facc15;">Santiment free tier may have limited data window</p>'}
      </div>
    `);
    await page.screenshot({ path: 'e2e/screenshots/flow-7-santiment.png' });

    expect(res.status()).toBe(200);
  });

  // ================================================================
  // FLOW 8: Edge cases
  // ================================================================

  test('Flow 8: Edge cases — validation', async ({ request, page }) => {
    const [emptySearch, noSlug, badMethod, emptyAI] = await Promise.all([
      request.get('/api/search'),
      request.get('/api/futures'),
      request.get('/api/analyze/tokenomics'),
      request.post('/api/analyze/tokenomics', { data: {} }),
    ]);

    const results = [
      { name: 'Search without query', status: emptySearch.status(), expected: 400 },
      { name: 'Futures without slug', status: noSlug.status(), expected: 400 },
      { name: 'GET on analyze (POST only)', status: badMethod.status(), expected: 405 },
      { name: 'AI with empty body', status: emptyAI.status(), expected: 400 },
    ];

    console.log('[Edge Cases]');
    results.forEach(r => console.log(`  ${r.name}: ${r.status} (expected ${r.expected}) ${r.status === r.expected ? '✅' : '❌'}`));

    await page.goto('about:blank');
    await page.setContent(`
      <div style="background:#111;color:#fff;padding:40px;font-family:monospace;">
        <h1>Flow 8: Edge Case Validation</h1>
        ${results.map(r => `
          <p>${r.status === r.expected ? '✅' : '❌'} ${r.name}: ${r.status} (expected ${r.expected})</p>
        `).join('')}
      </div>
    `);
    await page.screenshot({ path: 'e2e/screenshots/flow-8-edge-cases.png' });

    results.forEach(r => expect(r.status).toBe(r.expected));
  });
});
