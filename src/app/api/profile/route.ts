import { NextRequest, NextResponse } from 'next/server';
import { getPriceHistory, getCoinDetail } from '@/lib/coingecko';
import { buildTokenProfile } from '@/lib/tokenProfiler';
import { onchainCache } from '@/lib/onchainCache';

/**
 * GET /api/profile?id=bitcoin&symbol=BTC
 *
 * Computes a per-token statistical profile using 90 days of real data.
 * Cached for 30 minutes — includes on-chain data if available in shared cache.
 */

// Profile-level cache (globalThis survives HMR)
const PROFILE_CACHE_KEY = '__profile_cache__';
const PROFILE_TTL = 30 * 60 * 1000;
function getProfileCache(): Map<string, { response: any; ts: number; hasOnchain: boolean }> {
  if (!(globalThis as any)[PROFILE_CACHE_KEY]) (globalThis as any)[PROFILE_CACHE_KEY] = new Map();
  return (globalThis as any)[PROFILE_CACHE_KEY];
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const symbol = request.nextUrl.searchParams.get('symbol') || id?.toUpperCase() || '';

  if (!id) {
    return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
  }

  // Check profile cache
  const cached = getProfileCache().get(id);
  const onchainNowAvailable = !!onchainCache.get(id);
  if (cached && Date.now() - cached.ts < PROFILE_TTL) {
    // Re-profile if on-chain became available since last cache
    if (!cached.hasOnchain && onchainNowAvailable) {
      // Fall through to re-compute with on-chain data
    } else {
      return NextResponse.json(cached.response);
    }
  }

  try {
    const from = new Date(Date.now() - 90 * 86400000).toISOString();
    const to = new Date().toISOString();
    const fromMs = Date.now() - 90 * 86400000;

    // --- Helper: Santiment GraphQL ---
    const santimentQuery = async (metric: string): Promise<{ datetime: string; value: number }[]> => {
      try {
        const res = await fetch('https://api.santiment.net/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ getMetric(metric: "${metric}") { timeseriesData(slug: "${id}", from: "${from}", to: "${to}", interval: "1d") { datetime value } } }`,
          }),
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json?.data?.getMetric?.timeseriesData || [];
      } catch {
        return [];
      }
    };

    // --- Helper: Binance Futures ---
    const binanceFutures = async (endpoint: string, params: string): Promise<any[]> => {
      try {
        const res = await fetch(`https://fapi.binance.com${endpoint}?${params}`, {
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    };

    // --- Helper: Hyperliquid ---
    const hyperliquidData = async (): Promise<{
      funding: { date: string; value: number }[] | undefined;
      hlVolume: { date: string; value: number }[] | undefined;
      hlDailyRange: { date: string; value: number }[] | undefined;
      hlCandleBody: { date: string; value: number }[] | undefined;
      hlUpperWick: { date: string; value: number }[] | undefined;
      hlLowerWick: { date: string; value: number }[] | undefined;
      hlCandles: { date: string; close: number; volume: number; high: number; low: number }[] | undefined;
    }> => {
      try {
        const hlSymbol = symbol.toUpperCase();

        // Fetch funding rate history (8-hourly → aggregate to daily)
        const fundingRes = await fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'fundingHistory',
            coin: hlSymbol,
            startTime: fromMs,
          }),
        });

        let fundingDaily: { date: string; value: number }[] | undefined;
        if (fundingRes.ok) {
          const fundingRaw: any[] = await fundingRes.json();
          if (fundingRaw.length > 0) {
            const byDate: Record<string, { sum: number; count: number }> = {};
            for (const f of fundingRaw) {
              const date = new Date(f.time).toISOString().split('T')[0];
              if (!byDate[date]) byDate[date] = { sum: 0, count: 0 };
              byDate[date].sum += parseFloat(f.fundingRate);
              byDate[date].count++;
            }
            fundingDaily = Object.entries(byDate).map(([date, { sum, count }]) => ({
              date,
              value: sum / count,
            }));
          }
        }

        // Fetch daily candles → derive 5 metrics from OHLCV
        const candleRes = await fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'candleSnapshot',
            req: {
              coin: hlSymbol,
              interval: '1d',
              startTime: fromMs,
              endTime: Date.now(),
            },
          }),
        });

        let hlVolume: { date: string; value: number }[] | undefined;
        let hlDailyRange: { date: string; value: number }[] | undefined;
        let hlCandleBody: { date: string; value: number }[] | undefined;
        let hlUpperWick: { date: string; value: number }[] | undefined;
        let hlLowerWick: { date: string; value: number }[] | undefined;
        let hlCandles: { date: string; close: number; volume: number; high: number; low: number }[] | undefined;

        if (candleRes.ok) {
          const candles: any[] = await candleRes.json();
          if (candles.length > 0) {
            hlVolume = [];
            hlDailyRange = [];
            hlCandleBody = [];
            hlUpperWick = [];
            hlLowerWick = [];
            hlCandles = [];

            for (const c of candles) {
              const date = new Date(c.t).toISOString().split('T')[0];
              const o = parseFloat(c.o), h = parseFloat(c.h);
              const l = parseFloat(c.l), close = parseFloat(c.c);
              const v = parseFloat(c.v);

              if (close <= 0) continue;

              hlVolume.push({ date, value: v });
              hlDailyRange.push({ date, value: (h - l) / close });
              hlCandleBody.push({ date, value: (close - o) / o });
              hlUpperWick.push({ date, value: (h - Math.max(o, close)) / close });
              hlLowerWick.push({ date, value: (Math.min(o, close) - l) / close });
              hlCandles.push({ date, close, volume: v, high: h, low: l });
            }
          }
        }

        return { funding: fundingDaily, hlVolume, hlDailyRange, hlCandleBody, hlUpperWick, hlLowerWick, hlCandles };
      } catch {
        return { funding: undefined, hlVolume: undefined, hlDailyRange: undefined, hlCandleBody: undefined, hlUpperWick: undefined, hlLowerWick: undefined, hlCandles: undefined };
      }
    };

    // --- Helper: DeFiLlama ---
    const defiLlamaTVL = async (): Promise<{ date: string; value: number }[]> => {
      try {
        const res = await fetch(`https://api.llama.fi/protocol/${id}`);
        if (!res.ok) return [];
        const json = await res.json();
        const tvlHistory = json?.tvl || [];
        return tvlHistory
          .filter((d: any) => d.date * 1000 >= fromMs)
          .map((d: any) => ({
            date: new Date(d.date * 1000).toISOString().split('T')[0],
            value: d.totalLiquidityUSD,
          }));
      } catch {
        return [];
      }
    };

    // --- Map symbol to Binance ticker ---
    const binanceSymbol = `${symbol.toUpperCase()}USDT`;

    // Read on-chain data from shared globalThis cache (no HTTP call, no deadlock).
    const onchainCached = onchainCache.get(id);
    const onchainMetrics = onchainCached ? onchainCached.data.metrics : null;

    // === FETCH ALL DATA IN PARALLEL ===
    const [
      priceHistory,
      fgRes,
      // Santiment: original 4
      sentPos, sentNeg, socialVol, devAct,
      // Santiment: on-chain (new)
      mvrv, exchangeBalance, activeAddresses, networkGrowth,
      whaleTransactions, nvt, socialDominance, devContributors,
      // Binance futures
      binanceFunding, binanceOI, binanceLongShort, binanceTakerRatio,
      // DeFiLlama
      tvlData,
      // Hyperliquid
      hlData,
    ] = await Promise.all([
      // CoinGecko
      getPriceHistory(id, 90),
      fetch('https://api.alternative.me/fng/?limit=90&format=json'),
      // Santiment: sentiment + social
      santimentQuery('sentiment_positive_total'),
      santimentQuery('sentiment_negative_total'),
      santimentQuery('social_volume_total'),
      santimentQuery('dev_activity'),
      // Santiment: on-chain
      santimentQuery('mvrv_usd'),
      santimentQuery('exchange_balance'),
      santimentQuery('daily_active_addresses'),
      santimentQuery('network_growth'),
      santimentQuery('whale_transaction_count_100k_usd_to_inf'),
      santimentQuery('nvt'),
      santimentQuery('social_dominance_total'),
      santimentQuery('dev_activity_contributors_count'),
      // Binance futures
      binanceFutures('/fapi/v1/fundingRate', `symbol=${binanceSymbol}&limit=270`),
      binanceFutures('/futures/data/openInterestHist', `symbol=${binanceSymbol}&period=1d&limit=90`),
      binanceFutures('/futures/data/topLongShortAccountRatio', `symbol=${binanceSymbol}&period=1d&limit=90`),
      binanceFutures('/futures/data/takerlongshortRatio', `symbol=${binanceSymbol}&period=1d&limit=90`),
      // DeFiLlama
      defiLlamaTVL(),
      // Hyperliquid
      hyperliquidData(),
    ]);

    // === TRANSFORM: Fear & Greed ===
    const fgData = fgRes.ok ? await fgRes.json() : { data: [] };
    const fearGreedData = (fgData.data || []).map((d: any) => ({
      date: new Date(parseInt(d.timestamp) * 1000).toISOString().split('T')[0],
      value: parseInt(d.value),
    }));

    // === TRANSFORM: Price data (CoinGecko primary, Hyperliquid fallback) ===
    // CoinGecko returns hourly data for ≤90 days — keep all points for priceSeries chart,
    // but also aggregate to daily with high/low for the profiler's maxDD computation.
    let priceData: { date: string; price: number; volume: number; marketCap: number }[];
    let cgDailyOhlc: { date: string; high: number; low: number }[] = [];

    if (priceHistory.length > 0) {
      priceData = priceHistory.map((p) => ({
        date: p.time.split('T')[0],
        price: p.usd,
        volume: p.volume24h,
        marketCap: p.marketCap,
      }));
      // Aggregate hourly prices into daily high/low (same source = consistent)
      const dailyHL: Record<string, { high: number; low: number }> = {};
      for (const p of priceHistory) {
        const date = p.time.split('T')[0];
        if (!dailyHL[date]) {
          dailyHL[date] = { high: p.usd, low: p.usd };
        } else {
          if (p.usd > dailyHL[date].high) dailyHL[date].high = p.usd;
          if (p.usd < dailyHL[date].low) dailyHL[date].low = p.usd;
        }
      }
      cgDailyOhlc = Object.entries(dailyHL).map(([date, { high, low }]) => ({ date, high, low }));
    } else {
      priceData = (hlData.hlCandles || []).map((c) => ({
        date: c.date,
        price: c.close,
        volume: c.volume,
        marketCap: 0,
      }));
    }

    // === TRANSFORM: Santiment timeseries to {date, value} ===
    const toDateValue = (data: { datetime: string; value: number }[]) =>
      data.length > 0
        ? data.map((d) => ({ date: d.datetime.split('T')[0], value: d.value }))
        : undefined;

    // === TRANSFORM: Santiment sentiment ===
    const sentimentData = sentPos.length > 0 && sentNeg.length > 0
      ? sentPos.map((s, i) => ({
          date: s.datetime.split('T')[0],
          positive: s.value,
          negative: sentNeg[i]?.value || 0,
        }))
      : undefined;

    // === TRANSFORM: Binance funding rates (aggregate to daily) ===
    const binanceFundingDaily = (() => {
      if (!Array.isArray(binanceFunding) || binanceFunding.length === 0) return undefined;
      const byDate: Record<string, { sum: number; count: number }> = {};
      for (const f of binanceFunding) {
        const date = new Date(f.fundingTime).toISOString().split('T')[0];
        if (!byDate[date]) byDate[date] = { sum: 0, count: 0 };
        byDate[date].sum += parseFloat(f.fundingRate);
        byDate[date].count++;
      }
      return Object.entries(byDate).map(([date, { sum, count }]) => ({
        date,
        value: sum / count,
      }));
    })();

    // === TRANSFORM: Binance OI ===
    const binanceOIDaily = (() => {
      if (!Array.isArray(binanceOI) || binanceOI.length === 0) return undefined;
      return binanceOI.map((d: any) => ({
        date: new Date(d.timestamp).toISOString().split('T')[0],
        value: parseFloat(d.sumOpenInterestValue),
      }));
    })();

    // === TRANSFORM: Binance Long/Short ===
    const binanceLSDaily = (() => {
      if (!Array.isArray(binanceLongShort) || binanceLongShort.length === 0) return undefined;
      return binanceLongShort.map((d: any) => ({
        date: new Date(d.timestamp).toISOString().split('T')[0],
        value: parseFloat(d.longShortRatio),
      }));
    })();

    // === TRANSFORM: Binance Taker Buy/Sell ===
    const binanceTakerDaily = (() => {
      if (!Array.isArray(binanceTakerRatio) || binanceTakerRatio.length === 0) return undefined;
      return binanceTakerRatio.map((d: any) => ({
        date: new Date(d.timestamp).toISOString().split('T')[0],
        value: parseFloat(d.buySellRatio),
      }));
    })();

    // === TRANSFORM: OHLC for high/low data (Hyperliquid primary, CoinGecko fallback) ===
    let ohlcData: { date: string; high: number; low: number }[] = (hlData.hlCandles || []).map((c) => ({
      date: c.date,
      high: c.high,
      low: c.low,
    }));

    // Fallback: use daily high/low aggregated from CoinGecko's own hourly data (same source)
    if (ohlcData.length === 0 && cgDailyOhlc.length > 0) {
      ohlcData = cgDailyOhlc;
    }

    // === BUILD PROFILE ===
    const profile = buildTokenProfile(
      id,
      symbol,
      priceData,
      fearGreedData,
      sentimentData,
      // Extra metrics as a generic map
      {
        socialVolume: toDateValue(socialVol),
        devActivity: toDateValue(devAct),
        mvrv: toDateValue(mvrv),
        exchangeBalance: toDateValue(exchangeBalance),
        activeAddresses: toDateValue(activeAddresses),
        networkGrowth: toDateValue(networkGrowth),
        whaleTransactions: toDateValue(whaleTransactions),
        nvt: toDateValue(nvt),
        socialDominance: toDateValue(socialDominance),
        devContributors: toDateValue(devContributors),
        fundingRate: binanceFundingDaily,
        openInterest: binanceOIDaily,
        longShortRatio: binanceLSDaily,
        takerBuySell: binanceTakerDaily,
        tvl: tvlData.length > 0 ? tvlData : undefined,
        hlFundingRate: hlData.funding,
        hlVolume: hlData.hlVolume,
        hlDailyRange: hlData.hlDailyRange,
        hlCandleBody: hlData.hlCandleBody,
        hlUpperWick: hlData.hlUpperWick,
        hlLowerWick: hlData.hlLowerWick,
        // On-chain metrics (from shared cache — no HTTP call)
        ...(onchainMetrics || {}),
      },
      ohlcData.length > 0 ? ohlcData : undefined,
    );

    // Fetch coin detail (cached — shared with onchain route, no extra API call)
    const coinDetail = await getCoinDetail(id);

    // Override symbol with CoinGecko's actual symbol (e.g. "QNT" instead of "QUANT-NETWORK")
    if (coinDetail?.symbol) {
      profile.symbol = coinDetail.symbol.toUpperCase();
    }

    const responseData = {
      message: 'SUCCESS',
      status: 200,
      data: profile,
      meta: coinDetail ? {
        name: coinDetail.name,
        symbol: coinDetail.symbol,
        image: coinDetail.image?.large || coinDetail.image?.small || '',
      } : null,
      onchainEvents: onchainCached ? onchainCached.data.events : null,
      hasOnchain: onchainMetrics !== null,
      priceSeries: priceHistory.length > 0
        ? priceHistory.map(p => ({ date: p.time.split('T')[0], time: p.time, price: p.usd }))
        : priceData.map(p => ({ date: p.date, price: p.price })),
    };

    getProfileCache().set(id, { response: responseData, ts: Date.now(), hasOnchain: onchainMetrics !== null });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('[Profile]', error);
    return NextResponse.json({
      message: `Failed to build profile: ${error?.message || 'Unknown error'}`,
      stack: error?.stack?.split('\n').slice(0, 5),
      status: 500,
      data: null,
    });
  }
}
