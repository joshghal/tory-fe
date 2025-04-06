import { NextRequest, NextResponse } from 'next/server';
import {
  DateEntry,
  SocialAnalyticsResponse,
  Tokenomics,
  TokenPriceHistory,
  TokenStats,
  VestingSchedule,
} from '@/types/token';
import {
  getPriceHistory,
  getSocialStats,
  getTokenomicsData,
  getUnlockSchedules,
  processVestingData,
} from './vestingDataProcessor';

export interface ITokenDetail {
  stats?: TokenStats;
  tokenomics?: Tokenomics;
  unlocks?: {
    pastUnlocks?: DateEntry[];
    upcomingUnlock?: DateEntry[];
  };
  priceHistory?: TokenPriceHistory[];
  socialHistory?: SocialAnalyticsResponse;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const arkhamSlug = searchParams.get('arkhamSlug');
  const cryptoRankSlug = searchParams.get('cryptoRankSlug');
  const lunarSlug = searchParams.get('lunarSlug');
  const lunarToken = searchParams.get('lunarToken');

  if (!arkhamSlug || !cryptoRankSlug || !lunarSlug) {
    return NextResponse.json(
      { error: 'all slug parameters are required' },
      { status: 400 }
    );
  }

  // // Convert slugs to lowercase and remove common separators for comparison
  // const normalizeSlug = (slug: string) =>
  //   slug.toLowerCase().replace(/[-_]/g, '');
  // const arkhamNormalized = normalizeSlug(arkhamSlug);
  // const cryptoRankNormalized = normalizeSlug(cryptoRankSlug);
  // const lunarNormalized = normalizeSlug(lunarSlug);

  // function areAllSlugsRelated(slugs: string[]): boolean {
  //   const normalize = (slug: string) => slug.toLowerCase().replace(/[-_]/g, '');

  //   const normalizedSlugs = slugs
  //     .filter(Boolean) // Remove undefined or empty values
  //     .map(normalize);

  //   return normalizedSlugs.every((baseSlug, i) =>
  //     normalizedSlugs.every(
  //       (compareSlug, j) =>
  //         i === j ||
  //         baseSlug === compareSlug ||
  //         baseSlug.includes(compareSlug) ||
  //         compareSlug.includes(baseSlug)
  //     )
  //   );
  // }

  // // Check if slugs are related
  // const areRelatedSlugs = areAllSlugsRelated([
  //   arkhamNormalized,
  //   cryptoRankNormalized,
  //   lunarNormalized,
  // ]);

  // if (!areRelatedSlugs) {
  //   return NextResponse.json(
  //     {
  //       error:
  //         'Invalid slug combination. The slugs must be related to the same token.',
  //     },
  //     { status: 400 }
  //   );
  // }

  try {
    // Fetch price history from Arkham
    const priceHistoryResponse = await fetch(
      `https://api.arkm.com/token/price/history/${arkhamSlug}?daily=true`,
      {
        method: 'GET',
        headers: {
          'Api-Key': process.env.ARKM_API_KEY || '',
          Accept: 'application/json',
        },
      }
    );

    // Fetch token statistics from Arkham
    const tokenStatisticsResponse = await fetch(
      `https://api.arkm.com/token/market/${arkhamSlug}`,
      {
        method: 'GET',
        headers: {
          'Api-Key': process.env.ARKM_API_KEY || '',
          Accept: 'application/json',
        },
      }
    );

    // Fetch vesting data from Cryptorank
    const vestingResponse = await fetch(
      `https://api.cryptorank.io/v0/coins/vesting/${cryptoRankSlug}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    // Fetch social stats data from LunarCrush
    const socialStatsResponse = await fetch(
      `https://lunarcrush.com/api3/storm/time-series/topic/$${lunarSlug}?bucket=day`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${lunarToken}`,
        },
      }
    );

    const priceHistory: TokenPriceHistory[] = await priceHistoryResponse.json();
    const tokenStats: TokenStats = await tokenStatisticsResponse.json();
    const vestingData: { data: VestingSchedule } = await vestingResponse.json();
    const socialStatsData: SocialAnalyticsResponse =
      await socialStatsResponse.json();

    if (!vestingData?.data) {
      return NextResponse.json({
        stats: tokenStats,
        priceHistory: priceHistory,
        socialHistory: socialStatsData,
      });
    }

    const tokenomics = getTokenomicsData(vestingData.data);
    const result = processVestingData(vestingData.data);
    const unlocks = getUnlockSchedules(result);
    const unlockWithPriceHistory = getPriceHistory(unlocks, priceHistory);
    const unlockWithSocialStats = getSocialStats(
      unlockWithPriceHistory,
      socialStatsData.data
    );

    return NextResponse.json({
      message: 'SUCCESS',
      status: 200,
      data: {
        stats: tokenStats,
        tokenomics: tokenomics,
        unlocks: unlockWithSocialStats,
        priceHistory: priceHistory,
        socialHistory: socialStatsData,
      },
    });
  } catch (error) {
    console.error('Token details error:', error);
    return NextResponse.json({
      message: 'Failed to fetch token details',
      status: 500,
      data: {},
    });
  }
}
