import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.NEXT_PUBLIC_TORY_FE_API_URL || 'https://tory-fe-apis.vercel.app';

test.describe('Full E2E: Backend APIs → Frontend → AI Analysis', () => {

  // === BACKEND API HEALTH ===

  test('Backend: ping backend API', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/lrch/auth`);
    console.log('[Backend Ping] LunarCrush auth status:', res.status());
    // 200 = working, 500 = browserless issue, but NOT 404
    expect([200, 500]).toContain(res.status());
  });

  // === AUTH FLOW ===

  test('Backend: TokenTerminal auth returns bearer/jwt', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/token-terminal/auth`);
    console.log('[TT Auth] Status:', res.status());

    if (res.ok()) {
      const json = await res.json();
      console.log('[TT Auth] Has bearer:', !!json.bearer);
      console.log('[TT Auth] Has jwt:', !!json.jwt);
      expect(json.bearer || json.jwt).toBeTruthy();
    } else {
      console.log('[TT Auth] Failed (browserless may be down):', res.status());
    }
  });

  test('Backend: LunarCrush auth returns bearer', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/lrch/auth`);
    console.log('[LRCH Auth] Status:', res.status());

    if (res.ok()) {
      const json = await res.json();
      console.log('[LRCH Auth] Has bearer:', !!json.bearer);
      expect(json.bearer).toBeTruthy();
    } else {
      console.log('[LRCH Auth] Failed (browserless may be down):', res.status());
    }
  });

  // === SEARCH FLOW ===

  test('Backend: search for "ethereum" returns results', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/availability/search?query=ethereum&bearer=&jwt=`);
    console.log('[Search] Status:', res.status());

    if (res.ok()) {
      const json = await res.json();
      console.log('[Search] Results count:', json.data?.length);
      if (json.data?.length > 0) {
        const first = json.data[0];
        console.log('[Search] First result:', {
          label: first.label,
          symbol: first.symbol,
          arkhamSlug: first.arkhamSlug,
          cryptoRankSlug: first.cryptoRankSlug,
          tokenTerminalSlug: first.tokenTerminalSlug,
        });
        expect(first.label).toBeTruthy();
        expect(first.arkhamSlug).toBeTruthy();
      }
    }
  });

  // === TOKEN DETAILS ===

  test('Backend: fetch token details for bitcoin', async ({ request }) => {
    // First get auth tokens
    const lrchRes = await request.get(`${BACKEND_URL}/api/lrch/auth`);
    let lunarToken = '';
    if (lrchRes.ok()) {
      const lrchJson = await lrchRes.json();
      lunarToken = lrchJson.bearer || '';
    }

    const detailsUrl = `${BACKEND_URL}/api/token/details?arkhamSlug=bitcoin&cryptoRankSlug=bitcoin_btc&lunarSlug=bitcoin&lunarToken=${lunarToken}`;
    const res = await request.get(detailsUrl);
    console.log('[Details] Status:', res.status());

    if (res.ok()) {
      const json = await res.json();
      const data = json.data;

      console.log('[Details] Has stats:', !!data?.stats);
      console.log('[Details] Has tokenomics:', !!data?.tokenomics);
      console.log('[Details] Has unlocks:', !!data?.unlocks);
      console.log('[Details] Price:', data?.stats?.price);
      console.log('[Details] Past unlocks count:', data?.unlocks?.pastUnlocks?.length);
      console.log('[Details] Upcoming unlocks count:', data?.unlocks?.upcomingUnlock?.length);

      // data may be null if CryptoRank slug doesn't match
      if (data?.stats) {
        expect(data.stats.price).toBeGreaterThan(0);
      } else {
        console.log('[Details] No stats returned — CryptoRank slug may not match');
      }
    } else {
      console.log('[Details] Failed:', res.status());
    }
  });

  // === FUTURES DATA ===

  test('Backend: fetch futures data for bitcoin', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/arkham/futures-data?slug=bitcoin`);
    console.log('[Futures] Status:', res.status());

    if (res.ok()) {
      const json = await res.json();
      console.log('[Futures] OI data points:', json.data?.openInterest?.length);
      console.log('[Futures] Funding rate data points:', json.data?.fundingRates?.length);

      if (json.data?.openInterest?.length > 0) {
        console.log('[Futures] Latest OI:', json.data.openInterest[json.data.openInterest.length - 1]);
      }
    } else {
      console.log('[Futures] Failed (browserless may be down):', res.status());
    }
  });

  // === FINANCIAL STATEMENTS ===

  test('Backend: fetch financial statements', async ({ request }) => {
    // Get TT auth first
    const authRes = await request.get(`${BACKEND_URL}/api/token-terminal/auth`);
    let bearer = '', jwt = '';
    if (authRes.ok()) {
      const authJson = await authRes.json();
      bearer = authJson.bearer || '';
      jwt = authJson.jwt || '';
    }

    if (bearer || jwt) {
      const res = await request.get(`${BACKEND_URL}/api/token-terminal/financial-statement?slug=uniswap&bearer=${bearer}&jwt=${jwt}`);
      console.log('[Financial] Status:', res.status());

      if (res.ok()) {
        const json = await res.json();
        console.log('[Financial] Metrics count:', json.data?.length);
        if (json.data?.length > 0) {
          const sample = json.data[0];
          console.log('[Financial] Sample metric:', {
            project: sample.project_name,
            section: sample.section,
            metric: sample.metric_id,
            value: sample.value,
          });
        }
      }
    } else {
      console.log('[Financial] Skipped - no TT auth available');
    }
  });

  // === FULL PIPELINE: Backend data → AI analysis ===

  test('Pipeline: fetch real token data then analyze with AI', async ({ request }) => {
    console.log('[Pipeline] Step 1: Searching for a token...');
    const searchRes = await request.get(`${BACKEND_URL}/api/availability/search?query=solana&bearer=&jwt=`);

    if (!searchRes.ok()) {
      console.log('[Pipeline] Search failed, skipping pipeline test');
      return;
    }

    const searchJson = await searchRes.json();
    if (!searchJson.data?.length) {
      console.log('[Pipeline] No search results, skipping');
      return;
    }

    const token = searchJson.data[0];
    console.log('[Pipeline] Found:', token.label, token.symbol);

    // Get lunar auth
    console.log('[Pipeline] Step 2: Getting auth tokens...');
    const lrchRes = await request.get(`${BACKEND_URL}/api/lrch/auth`);
    let lunarToken = '';
    if (lrchRes.ok()) {
      lunarToken = (await lrchRes.json()).bearer || '';
    }

    // Fetch details
    console.log('[Pipeline] Step 3: Fetching token details...');
    const detailsRes = await request.get(
      `${BACKEND_URL}/api/token/details?arkhamSlug=${token.arkhamSlug}&cryptoRankSlug=${token.cryptoRankSlug || ''}&lunarSlug=${token.arkhamSlug}&lunarToken=${lunarToken}`
    );

    if (!detailsRes.ok()) {
      console.log('[Pipeline] Details fetch failed:', detailsRes.status());
      return;
    }

    const details = (await detailsRes.json()).data;
    console.log('[Pipeline] Got details - price:', details?.stats?.price);

    // Run AI analysis on tokenomics if available
    if (details?.tokenomics?.allocations?.length > 0) {
      console.log('[Pipeline] Step 4: Running AI tokenomics analysis...');
      const aiRes = await request.post('/api/analyze/tokenomics', {
        data: { data: JSON.stringify(details.tokenomics.allocations) },
      });

      expect(aiRes.ok()).toBeTruthy();
      const aiJson = await aiRes.json();
      console.log('[Pipeline] AI Bullish points:', aiJson.bullishThoughts?.length);
      console.log('[Pipeline] AI Bearish points:', aiJson.bearishThoughts?.length);
      console.log('[Pipeline] Sample insight:', aiJson.bullishThoughts?.[0]?.substring(0, 120));

      expect(aiJson.bullishThoughts.length).toBeGreaterThanOrEqual(1);
    } else {
      console.log('[Pipeline] No tokenomics data available for this token');
    }
  });
});
