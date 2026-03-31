import { test } from '@playwright/test';

test.describe('Arkham Network Monitor', () => {
  test.describe.configure({ timeout: 120000 });

  test('Monitor all api.arkm.com calls on token page', async ({ page }) => {
    const captured: {
      url: string;
      method: string;
      status: number;
      body: string;
      keys: string;
    }[] = [];

    // Intercept all responses from Arkham API
    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('api.arkm.com') && !url.includes('arkhamintelligence')) return;

      const status = response.status();
      let body = '';
      let keys = '';

      try {
        body = await response.text();
        const json = JSON.parse(body);
        if (Array.isArray(json)) {
          keys = `Array[${json.length}]`;
          if (json[0]) keys += ` → {${Object.keys(json[0]).join(', ')}}`;
        } else {
          keys = `{${Object.keys(json).join(', ')}}`;
        }
      } catch {
        keys = `(non-JSON, ${body.length} chars)`;
      }

      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search.substring(0, 80);

      captured.push({
        url: path,
        method: response.request().method(),
        status,
        body: body.substring(0, 500),
        keys,
      });

      const emoji = status === 200 ? '✅' : '❌';
      console.log(`${emoji} ${status} ${response.request().method().padEnd(4)} ${(body.length / 1024).toFixed(1).padStart(7)}KB | ${path}`);
      console.log(`   Schema: ${keys}`);
    });

    console.log('\n🔍 Navigating to Arkham token page: bitcoin\n');
    await page.goto('https://intel.arkm.com/explorer/token/bitcoin', {
      waitUntil: 'networkidle',
      timeout: 60000,
    }).catch(() => console.log('⚠️  Navigation timeout (continuing)\n'));

    // Wait for lazy API calls
    console.log('\n⏳ Waiting 10s for lazy-loaded calls...\n');
    await page.waitForTimeout(10000);

    // Scroll down to trigger more
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(5000);

    // Print summary
    console.log('\n' + '='.repeat(90));
    console.log(`📊 CAPTURED ${captured.length} API CALLS`);
    console.log('='.repeat(90));

    captured.forEach((api, i) => {
      console.log(`\n── [${i + 1}] ${api.status === 200 ? '✅' : '❌'} ${api.method} ${api.url}`);
      console.log(`   Status: ${api.status}`);
      console.log(`   Schema: ${api.keys}`);
      console.log(`   Body preview: ${api.body.substring(0, 200)}`);
    });

    // Group by endpoint pattern
    console.log('\n\n📋 UNIQUE ENDPOINTS:');
    const uniquePaths = [...new Set(captured.map(c => c.url.split('?')[0]))];
    uniquePaths.forEach(p => {
      const calls = captured.filter(c => c.url.startsWith(p));
      const statuses = calls.map(c => c.status);
      console.log(`   ${statuses.every(s => s === 200) ? '✅' : '❌'} ${p} (${calls.length}x, statuses: ${[...new Set(statuses)].join(',')})`);
    });

    // Take screenshot of the page state
    await page.screenshot({ path: 'e2e/screenshots/arkham-page-state.png', fullPage: true });
  });

  test('Monitor search page API calls', async ({ page }) => {
    const captured: { url: string; status: number; keys: string; body: string }[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('api.arkm.com') && !url.includes('arkhamintelligence')) return;

      let body = '';
      let keys = '';
      try {
        body = await response.text();
        const json = JSON.parse(body);
        if (Array.isArray(json)) {
          keys = `Array[${json.length}]`;
          if (json[0]) keys += ` → {${Object.keys(json[0]).join(', ')}}`;
        } else {
          keys = `{${Object.keys(json).join(', ')}}`;
        }
      } catch {
        keys = `(${body.length} chars)`;
      }

      const path = new URL(url).pathname + new URL(url).search.substring(0, 100);
      captured.push({ url: path, status: response.status(), keys, body: body.substring(0, 300) });

      console.log(`${response.status() === 200 ? '✅' : '❌'} ${response.status()} | ${path}`);
      console.log(`   ${keys}`);
    });

    console.log('\n🔍 Navigating to Arkham main page + searching...\n');
    await page.goto('https://intel.arkm.com/', {
      waitUntil: 'networkidle',
      timeout: 60000,
    }).catch(() => console.log('⚠️  Timeout (continuing)\n'));

    await page.waitForTimeout(3000);

    // Try to find and use the search
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      console.log('\n🔎 Typing "solana" in search...\n');
      await searchInput.fill('solana');
      await page.waitForTimeout(5000);
    } else {
      console.log('\n⚠️  Search input not found, trying URL navigation...\n');
      await page.goto('https://intel.arkm.com/explorer/token/solana', {
        waitUntil: 'networkidle',
        timeout: 60000,
      }).catch(() => {});
      await page.waitForTimeout(5000);
    }

    console.log('\n📊 SEARCH CAPTURED:', captured.length, 'calls');
    captured.forEach((api, i) => {
      console.log(`\n[${i + 1}] ${api.status === 200 ? '✅' : '❌'} ${api.url}`);
      console.log(`   ${api.keys}`);
    });
  });
});
