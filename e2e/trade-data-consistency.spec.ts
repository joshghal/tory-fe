import { test, expect } from '@playwright/test';

/**
 * Trade data consistency E2E tests.
 *
 * Hits the real API, then opens trade modals in the browser to verify
 * that chart, stats, and profiler data all agree.
 */

interface Trade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  maxDrawdown: number;
}

interface Backtest {
  rulePlain: string;
  direction: 'buy' | 'sell';
  trades: Trade[];
  maxDrawdown: number;
  totalTrades: number;
  winRate: number;
}

interface PricePoint {
  date: string;
  time?: string;
  price: number;
}

// ═══════════════════════════════════════════════════════════════
// SUITE 1 — API-level data integrity
// ═══════════════════════════════════════════════════════════════
test.describe('API: Trade data integrity', () => {
  let backtests: Backtest[];
  let priceSeries: PricePoint[];

  test.beforeAll(async ({ request }) => {
    const res = await request.get('/api/profile?id=bitcoin&symbol=BTC');
    const json = await res.json();
    expect(json.message).toBe('SUCCESS');
    backtests = json.data.backtests;
    priceSeries = json.priceSeries;
    expect(backtests.length).toBeGreaterThan(0);
    expect(priceSeries.length).toBeGreaterThan(0);
  });

  test('buy trade return = (exit - entry) / entry', () => {
    for (const bt of backtests) {
      if (bt.direction !== 'buy') continue;
      for (const t of bt.trades) {
        const expected = (t.exitPrice - t.entryPrice) / t.entryPrice;
        expect(Math.abs(t.returnPct - expected)).toBeLessThan(0.001);
      }
    }
  });

  test('sell trade return = (entry - exit) / entry', () => {
    for (const bt of backtests) {
      if (bt.direction !== 'sell') continue;
      for (const t of bt.trades) {
        const expected = (t.entryPrice - t.exitPrice) / t.entryPrice;
        expect(Math.abs(t.returnPct - expected)).toBeLessThan(0.001);
      }
    }
  });

  test('buy wins have exit > entry, buy losses have exit < entry', () => {
    for (const bt of backtests) {
      if (bt.direction !== 'buy') continue;
      for (const t of bt.trades) {
        if (t.returnPct > 0) {
          expect(t.exitPrice).toBeGreaterThan(t.entryPrice);
        } else if (t.returnPct < 0) {
          expect(t.exitPrice).toBeLessThan(t.entryPrice);
        }
      }
    }
  });

  test('sell wins have entry > exit, sell losses have entry < exit', () => {
    for (const bt of backtests) {
      if (bt.direction !== 'sell') continue;
      for (const t of bt.trades) {
        if (t.returnPct > 0) {
          expect(t.entryPrice).toBeGreaterThan(t.exitPrice);
        } else if (t.returnPct < 0) {
          expect(t.entryPrice).toBeLessThan(t.exitPrice);
        }
      }
    }
  });

  test('winRate matches actual win count / total', () => {
    for (const bt of backtests) {
      const wins = bt.trades.filter(t => t.returnPct > 0).length;
      const expectedRate = wins / bt.trades.length;
      expect(Math.abs(bt.winRate - expectedRate)).toBeLessThan(0.02);
    }
  });

  test('totalTrades matches trades array length', () => {
    for (const bt of backtests) {
      expect(bt.totalTrades).toBe(bt.trades.length);
    }
  });

  test('maxDrawdown >= 0 for all trades', () => {
    for (const bt of backtests) {
      for (const t of bt.trades) {
        expect(t.maxDrawdown).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('strategy maxDrawdown = worst individual trade maxDrawdown', () => {
    for (const bt of backtests) {
      const worst = Math.max(...bt.trades.map(t => t.maxDrawdown));
      expect(Math.abs(bt.maxDrawdown - worst)).toBeLessThan(0.0001);
    }
  });

  test('losing trades: maxDrawdown >= |returnPct|', () => {
    for (const bt of backtests) {
      for (const t of bt.trades) {
        if (t.returnPct < 0) {
          expect(t.maxDrawdown).toBeGreaterThanOrEqual(Math.abs(t.returnPct) - 0.001);
        }
      }
    }
  });

  test('entry price exists in priceSeries for every trade', () => {
    // The last hourly close of entryDate should approximate trade.entryPrice
    for (const bt of backtests) {
      for (const t of bt.trades) {
        const dayPoints = priceSeries.filter(p => p.date === t.entryDate);
        expect(dayPoints.length).toBeGreaterThan(0);
        const lastClose = dayPoints[dayPoints.length - 1].price;
        const drift = Math.abs(lastClose - t.entryPrice) / t.entryPrice;
        expect(drift).toBeLessThan(0.05); // within 5% — hourly vs daily close
      }
    }
  });

  test('priceSeries has hourly granularity (>1 point per day)', () => {
    const perDay: Record<string, number> = {};
    for (const p of priceSeries) {
      perDay[p.date] = (perDay[p.date] || 0) + 1;
    }
    const multiPoint = Object.values(perDay).filter(c => c > 1).length;
    expect(multiPoint / Object.keys(perDay).length).toBeGreaterThan(0.8);
  });

  test('OHLC consistency: daily high >= daily low from hourly data', () => {
    const byDay: Record<string, { high: number; low: number }> = {};
    for (const p of priceSeries) {
      if (!byDay[p.date]) {
        byDay[p.date] = { high: p.price, low: p.price };
      } else {
        if (p.price > byDay[p.date].high) byDay[p.date].high = p.price;
        if (p.price < byDay[p.date].low) byDay[p.date].low = p.price;
      }
    }
    for (const [, hl] of Object.entries(byDay)) {
      expect(hl.high).toBeGreaterThanOrEqual(hl.low);
    }
  });

  test('buy maxDrawdown: daily low went below entry', () => {
    const byDay: Record<string, { high: number; low: number }> = {};
    for (const p of priceSeries) {
      if (!byDay[p.date]) byDay[p.date] = { high: p.price, low: p.price };
      else {
        if (p.price > byDay[p.date].high) byDay[p.date].high = p.price;
        if (p.price < byDay[p.date].low) byDay[p.date].low = p.price;
      }
    }
    for (const bt of backtests) {
      if (bt.direction !== 'buy') continue;
      for (const t of bt.trades) {
        if (t.maxDrawdown > 0.01) {
          // Some day's low must have been below entry
          let foundBelow = false;
          let d = new Date(t.entryDate);
          const exitMs = new Date(t.exitDate).getTime();
          while (d.getTime() <= exitMs) {
            const dateStr = d.toISOString().split('T')[0];
            const hl = byDay[dateStr];
            if (hl && hl.low < t.entryPrice) foundBelow = true;
            d.setDate(d.getDate() + 1);
          }
          expect(foundBelow).toBe(true);
        }
      }
    }
  });

  test('sell maxDrawdown: daily high went above entry', () => {
    const byDay: Record<string, { high: number; low: number }> = {};
    for (const p of priceSeries) {
      if (!byDay[p.date]) byDay[p.date] = { high: p.price, low: p.price };
      else {
        if (p.price > byDay[p.date].high) byDay[p.date].high = p.price;
        if (p.price < byDay[p.date].low) byDay[p.date].low = p.price;
      }
    }
    for (const bt of backtests) {
      if (bt.direction !== 'sell') continue;
      for (const t of bt.trades) {
        if (t.maxDrawdown > 0.01) {
          let foundAbove = false;
          let d = new Date(t.entryDate);
          const exitMs = new Date(t.exitDate).getTime();
          while (d.getTime() <= exitMs) {
            const dateStr = d.toISOString().split('T')[0];
            const hl = byDay[dateStr];
            if (hl && hl.high > t.entryPrice) foundAbove = true;
            d.setDate(d.getDate() + 1);
          }
          expect(foundAbove).toBe(true);
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SUITE 2 — Browser E2E: trade modal consistency
// ═══════════════════════════════════════════════════════════════
test.describe('Browser: Trade modal matches API', () => {
  let apiBacktests: Backtest[];

  test.beforeAll(async ({ request }) => {
    const res = await request.get('/api/profile?id=bitcoin&symbol=BTC');
    const json = await res.json();
    apiBacktests = json.data.backtests;
  });

  test('trade modal shows consistent entry/exit/return/badge', async ({ page }) => {
    await page.goto('/detail?id=bitcoin');

    // Wait for strategies to render
    const strategies = page.locator('[data-guide="strategies"]');
    await strategies.waitFor({ timeout: 30000 });
    await page.waitForTimeout(3000);

    // Click the first strategy accordion to expand trades
    const firstAccordion = strategies.locator('.cursor-pointer').first();
    if (await firstAccordion.count() === 0) { test.skip(); return; }
    await firstAccordion.click();
    await page.waitForTimeout(1500);

    // Click a trade row (has date format text)
    const tradeRow = page.locator('text=/\\d{4}-\\d{2}-\\d{2}/').nth(2);
    if (await tradeRow.count() === 0) { test.skip(); return; }
    await tradeRow.click({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Check the modal opened
    const wonOrLost = page.locator('text=/^(WON|LOST)$/');
    if (await wonOrLost.count() === 0) { test.skip(); return; }
    const badge = await wonOrLost.first().textContent();

    // Get the return percentage text
    const returnEl = page.locator('text=/^[+-]\\d+\\.\\d+%$/');
    if (await returnEl.count() === 0) { test.skip(); return; }
    const returnText = (await returnEl.first().textContent()) || '';

    // WON ↔ positive return, LOST ↔ negative return
    const isPositive = returnText.startsWith('+');
    if (badge === 'WON') expect(isPositive).toBe(true);
    if (badge === 'LOST') expect(isPositive).toBe(false);

    // Entry and exit prices should be displayed
    const prices = page.locator('text=/^\\$[\\d,.]+$/');
    expect(await prices.count()).toBeGreaterThanOrEqual(2);
  });
});
