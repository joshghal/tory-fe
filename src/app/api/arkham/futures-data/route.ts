import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export type FuturesData = {
  [exchange: string]: {
    timestamp: number;
    value: number;
    value2: number;
  }[];
};

type FuturesAggregated = {
  timestamp: number;
  value: number;
};

export interface avgFuturesData {
  date: string;
  averageValue: number;
}

export interface IFuturesData {
  openInterest?: avgFuturesData[];
  fundingRates?: avgFuturesData[];
  raw?: {
    openInterest?: FuturesData;
    fundingRates?: FuturesData;
  };
}

async function getFuturesData(slug: string) {
  const browser = await puppeteer.launch({ headless: true });

  let openInterestData = null;
  let fundingRatesData = null;

  let resolved = false;
  let resolveDone: () => void;
  const done = new Promise<void>((resolve) => (resolveDone = resolve));

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    const onRequest = (request: any) => request.continue();
    const onResponse = async (response: any) => {
      const url = response.url();

      if (
        url.includes(
          `marketdata/max_instrument_funding_rates_time_series?baseToken=${slug}`
        )
      ) {
        if (response.status() === 200) {
          try {
            const json = await response.json();
            fundingRatesData = json;

            await page.evaluate(() => {
              const tabs = document.querySelectorAll(
                '.Tabs_tabs__OW3fg .Tabs_tab__782uP'
              );
              for (const tab of tabs) {
                const title = tab.querySelector('.Tabs_title__xMlit');
                if (title && title.textContent === 'OPEN INTEREST') {
                  (title as HTMLElement).click();
                  break;
                }
              }
            });
          } catch (err) {
            console.error('[❌ Error parsing funding JSON]', err);
          }
        }
      }

      if (
        url.includes(
          `marketdata/max_instrument_usd_open_interest_time_series?baseToken=${slug}`
        )
      ) {
        if (response.status() === 200) {
          const json = await response.json();
          openInterestData = json;
          await page.close();
          await browser.close();
        } else if (response.status() === 204 && !resolved) {
          resolved = true;
        }
      }
    };

    page.on('request', onRequest);
    page.on('response', onResponse);

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
    );
    await page.setCacheEnabled(false);

    await page.goto(`https://intel.arkm.com/explorer/token/${slug}`, {
      waitUntil: 'networkidle0',
    });

    await done;

    return {
      openInterest: openInterestData,
      fundingRates: fundingRatesData,
    };
  } catch (err) {
    await browser.close();
    return {
      openInterest: openInterestData,
      fundingRates: fundingRatesData,
    };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug') || '';

  function sumByTimestamp(data: FuturesData): FuturesAggregated[] {
    const map = new Map<number, number>();

    for (const exchange in data) {
      data[exchange]?.forEach((item) => {
        const { timestamp, value } = item;
        const current = map.get(timestamp) || 0;
        map.set(timestamp, current + value);
      });
    }

    return Array.from(map.entries()).map(([timestamp, value]) => ({
      timestamp,
      value,
    }));
  }

  function averageFundingByTimestamp(data: FuturesData): FuturesAggregated[] {
    const sumMap = new Map<number, number>();
    const countMap = new Map<number, number>();

    for (const exchange in data) {
      const entries = data[exchange];

      if (!Array.isArray(entries) || entries.length === 0) {
        continue;
      }

      for (const { timestamp, value } of entries) {
        if (typeof timestamp !== 'number' || typeof value !== 'number') {
          continue;
        }

        sumMap.set(timestamp, (sumMap.get(timestamp) || 0) + value);
        countMap.set(timestamp, (countMap.get(timestamp) || 0) + 1);
      }
    }

    return Array.from(sumMap.entries()).map(([timestamp, value]) => ({
      timestamp,
      value,
    }));
  }

  function averageDaily(summedOI: { timestamp: number; value: number }[]) {
    const dailyMap = new Map<string, { sum: number; count: number }>();

    for (const { timestamp, value } of summedOI) {
      const date = new Date(timestamp).toISOString().split('T')[0];
      const current = dailyMap.get(date) || { sum: 0, count: 0 };
      current.sum += value;
      current.count += 1;
      dailyMap.set(date, current);
    }

    return Array.from(dailyMap.entries()).map(([date, { sum, count }]) => ({
      date,
      averageValue: sum / count,
    }));
  }

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    const { openInterest, fundingRates } = await getFuturesData(slug);

    const finalOpenInterest = averageDaily(
      sumByTimestamp(openInterest as unknown as FuturesData)
    );
    const finalFundingRates = averageDaily(
      averageFundingByTimestamp(fundingRates as unknown as FuturesData)
    );

    return NextResponse.json({
      message: 'SUCCESS',
      status: 200,
      data: {
        openInterest: finalOpenInterest as avgFuturesData[],
        fundingRates: finalFundingRates as avgFuturesData[],
        raw: {
          openInterest: openInterest as unknown as FuturesData,
          fundingRates: fundingRates as unknown as FuturesData,
        },
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      message:
        error instanceof Error ? error.message : 'Failed to get futures data',
      status: 500,
      data: {},
    });
  }
}
