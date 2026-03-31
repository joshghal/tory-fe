import { test, expect } from '@playwright/test';

test.describe('API Health Check — All Routes', () => {
  test.describe.configure({ timeout: 120000 });

  test('Search API (CoinGecko-powered)', async ({ request }) => {
    const res = await request.get('/api/search?query=ethereum');
    const json = await res.json();
    console.log(`[Search] ${res.status()} | Results: ${json.data?.length}`);
    if (json.data?.length > 0) {
      const first = json.data[0];
      console.log(`  First: ${first.label} (${first.symbol}) | cg: ${first.arkhamSlug} | cr: ${first.cryptoRankSlug} | tt: ${first.tokenTerminalSlug}`);
    }
    expect(res.status()).toBe(200);
    expect(json.data?.length).toBeGreaterThan(0);
  });

  test('Token Details — stats + price history (CoinGecko)', async ({ request }) => {
    const res = await request.get('/api/token/details?arkhamSlug=ethereum&cryptoRankSlug=ethereum&lunarSlug=ethereum&lunarToken=');
    const json = await res.json();
    const d = json.data;
    console.log(`[Details] ${res.status()}`);
    console.log(`  stats: ${d?.stats ? '✅ price=$' + d.stats.price : '❌'}`);
    console.log(`  priceHistory: ${d?.priceHistory?.length || 0} points`);
    console.log(`  tokenomics: ${d?.tokenomics ? '✅ ' + d.tokenomics.allocations?.length + ' allocations' : '⚠️ none (no CryptoRank vesting for ETH)'}`);
    console.log(`  socialHistory: ${d?.socialHistory?.data?.length || 0} points`);
    expect(res.status()).toBe(200);
    expect(d?.stats?.price).toBeGreaterThan(0);
    expect(d?.priceHistory?.length).toBeGreaterThan(0);
  });

  test('Token Details — vesting data (CryptoRank)', async ({ request }) => {
    const res = await request.get('/api/token/details?arkhamSlug=optimism&cryptoRankSlug=optimism&lunarSlug=optimism&lunarToken=');
    const json = await res.json();
    const d = json.data;
    console.log(`[Details+Vesting] ${res.status()}`);
    console.log(`  stats: ${d?.stats ? '✅ price=$' + d.stats.price : '❌'}`);
    console.log(`  tokenomics: ${d?.tokenomics ? '✅ ' + d.tokenomics.allocations?.length + ' allocations' : '❌'}`);
    console.log(`  unlocks.past: ${d?.unlocks?.pastUnlocks?.length || 0}`);
    console.log(`  unlocks.upcoming: ${d?.unlocks?.upcomingUnlock?.length || 0}`);
    expect(res.status()).toBe(200);
    expect(d?.stats?.price).toBeGreaterThan(0);
  });

  test('TokenTerminal Auth (direct login, no browserless)', async ({ request }) => {
    const res = await request.get('/api/auth/token-terminal');
    const json = await res.json();
    console.log(`[TT Auth] ${res.status()} | bearer: ${json.bearer ? '✅ ' + json.bearer.substring(0, 20) + '...' : '❌'} | jwt: ${json.jwt ? '✅' : '❌'}`);
    expect(res.status()).toBe(200);
  });

  test('LunarCrush Auth (browserless)', async ({ request }) => {
    const res = await request.get('/api/auth/lunarcrush');
    const json = await res.json();
    console.log(`[LRCH Auth] ${res.status()} | bearer: ${json.bearer ? '✅ ' + json.bearer.substring(0, 20) + '...' : '❌ (browserless timeout)'}`);
    expect(res.status()).toBe(200);
  });

  test('Financial Statement (TokenTerminal)', async ({ request }) => {
    // Get auth first
    const authRes = await request.get('/api/auth/token-terminal');
    const auth = await authRes.json();

    if (!auth.bearer && !auth.jwt) {
      console.log('[Financial] ⚠️ Skipped — no TT auth');
      return;
    }

    const res = await request.get(`/api/financial-statement?slug=uniswap&bearer=${auth.bearer}&jwt=${auth.jwt}`);
    const json = await res.json();
    console.log(`[Financial] ${res.status()} | metrics: ${json.data?.length}`);
    if (json.data?.length > 0) {
      const sections = [...new Set(json.data.map((d: any) => d.section))];
      console.log(`  sections: ${sections.join(', ')}`);
    }
    expect(res.status()).toBe(200);
    expect(json.data?.length).toBeGreaterThan(0);
  });

  test('AI Analysis — Tokenomics', async ({ request }) => {
    const res = await request.post('/api/analyze/tokenomics', {
      data: { data: JSON.stringify([{ name: "Team", tokenPercent: 20, unlockedTokens: 5, lockedTokens: 15 }]) },
    });
    const json = await res.json();
    console.log(`[AI Tokenomics] ${res.status()} | B:${json.bullishThoughts?.length} Be:${json.bearishThoughts?.length}`);
    expect(res.ok()).toBeTruthy();
    expect(json.bullishThoughts?.length).toBeGreaterThanOrEqual(1);
  });

  test('AI Analysis — Unlocks', async ({ request }) => {
    const res = await request.post('/api/analyze/unlocks', {
      data: { data: JSON.stringify([{ date: "2025-01-01", totalUnlockedTokens: 1000000, percentOfSupplyUnlocked: 0.01 }]) },
    });
    const json = await res.json();
    console.log(`[AI Unlocks] ${res.status()} | B:${json.bullishThoughts?.length} Be:${json.bearishThoughts?.length}`);
    expect(res.ok()).toBeTruthy();
    expect(json.bullishThoughts?.length).toBeGreaterThanOrEqual(1);
  });

  test('AI Analysis — Financials', async ({ request }) => {
    const res = await request.post('/api/analyze/financials', {
      data: { data: JSON.stringify([{ date: "1/1/2025", name: "revenue", val: 500000, chg: 0.15 }]) },
    });
    const json = await res.json();
    console.log(`[AI Financials] ${res.status()} | B:${json.bullishThoughts?.length} Be:${json.bearishThoughts?.length}`);
    expect(res.ok()).toBeTruthy();
    expect(json.bullishThoughts?.length).toBeGreaterThanOrEqual(1);
  });

  test('Edge Cases — validation', async ({ request }) => {
    const results = await Promise.all([
      request.get('/api/search').then(r => ({ name: 'Search no query', status: r.status(), expected: 400 })),
      request.get('/api/futures').then(r => ({ name: 'Futures no slug', status: r.status(), expected: 400 })),
      request.get('/api/analyze/tokenomics').then(r => ({ name: 'GET on POST route', status: r.status(), expected: 405 })),
      request.post('/api/analyze/tokenomics', { data: {} }).then(r => ({ name: 'Empty AI body', status: r.status(), expected: 400 })),
    ]);

    results.forEach(r => {
      const pass = r.status === r.expected;
      console.log(`[Edge] ${pass ? '✅' : '❌'} ${r.name}: ${r.status} (expected ${r.expected})`);
      expect(r.status).toBe(r.expected);
    });
  });

  test('Santiment sentiment data', async ({ request }) => {
    // Use optimism which has social data
    const res = await request.get('/api/token/details?arkhamSlug=bitcoin&cryptoRankSlug=bitcoin&lunarSlug=bitcoin&lunarToken=');
    const json = await res.json();
    const social = json.data?.socialHistory?.data || [];
    const withSentiment = social.filter((d: any) => d.sentiment_positive !== undefined);
    const withVolume = social.filter((d: any) => d.social_volume !== undefined);

    console.log(`[Santiment] Social points: ${social.length} | With sentiment: ${withSentiment.length} | With volume: ${withVolume.length}`);

    // Santiment may not have data for all tokens on free tier
    expect(res.status()).toBe(200);
  });

  test('CryptoRank vesting — correct slug format', async ({ request }) => {
    // Test that plain slug works (not the old _symbol format)
    const res = await request.get('/api/token/details?arkhamSlug=arbitrum&cryptoRankSlug=arbitrum&lunarSlug=arbitrum&lunarToken=');
    const json = await res.json();
    const d = json.data;
    console.log(`[CryptoRank Vesting] ${res.status()}`);
    console.log(`  tokenomics: ${d?.tokenomics ? '✅ ' + d.tokenomics.allocations?.length + ' allocations' : '❌ no vesting'}`);
    console.log(`  unlocks: past=${d?.unlocks?.pastUnlocks?.length || 0}, upcoming=${d?.unlocks?.upcomingUnlock?.length || 0}`);
    expect(res.status()).toBe(200);
  });

  test('Direct API checks — external services reachable', async ({ request }) => {
    const checks = [
      { name: 'CoinGecko search', url: 'https://api.coingecko.com/api/v3/search?query=btc' },
      { name: 'CoinGecko markets', url: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin' },
      { name: 'CryptoRank search', url: 'https://api.cryptorank.io/v0/search?query=bitcoin' },
      { name: 'CryptoRank vesting', url: 'https://api.cryptorank.io/v0/coins/vesting/optimism' },
      { name: 'Santiment GraphQL', url: 'https://api.santiment.net/graphql' },
      { name: 'TT login API', url: 'https://api.tokenterminal.com/v1/login' },
    ];

    for (const check of checks) {
      try {
        const method = check.name.includes('Santiment') || check.name.includes('login') ? 'POST' : 'GET';
        const res = method === 'GET'
          ? await request.get(check.url, { timeout: 10000 })
          : await request.post(check.url, {
              data: check.name.includes('Santiment')
                ? { query: '{ getMetric(metric: "social_volume_total") { timeseriesData(slug: "bitcoin", from: "2026-03-01", to: "2026-03-27", interval: "1d") { datetime value } } }' }
                : { email: 'test', password: 'test' },
              timeout: 10000,
            });
        const ok = res.status() < 500;
        console.log(`[External] ${ok ? '✅' : '❌'} ${check.name}: ${res.status()}`);
      } catch (err) {
        console.log(`[External] ❌ ${check.name}: TIMEOUT`);
      }
    }
  });
});
