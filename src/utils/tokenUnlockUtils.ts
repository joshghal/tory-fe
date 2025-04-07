import { avgFuturesData } from '@/services/arkham';
import dayjs from 'dayjs';

export const prepareUnlockAnalysisData = (unlocks: any[], openInterest: avgFuturesData[], fundingRates: avgFuturesData[]) => {
  const getVal = (list: any[], target: dayjs.Dayjs, key: string) => {
    if (!list || list.length === 0) return null;
    const match = list.reduce((prev, curr) => {
      const prevDiff = Math.abs(dayjs(prev.date || prev.time).diff(target));
      const currDiff = Math.abs(dayjs(curr.date || curr.time).diff(target));
      return currDiff < prevDiff ? curr : prev;
    });
    return match?.[key] ?? null;
  };

  return unlocks.map(entry => {
    const unlockDate = dayjs(entry.date);
    return {
      date: entry.date,
      totalUnlockedTokens: entry.unlockedTokensSum,
      percentOfSupplyUnlocked: entry.percentUnlockedSum,
      categories: entry.details.map((d: any) => ({
        name: d.name,
        unlockedTokens: d.unlockedTokens,
        percentUnlocked: d.percentUnlocked
      })),
      metrics: {
        price: {
          sevenDaysBefore: getVal(entry.priceHistory, unlockDate.subtract(7, 'day'), 'usd'),
          at: getVal(entry.priceHistory, unlockDate, 'usd'),
          sevenDaysAfter: getVal(entry.priceHistory, unlockDate.add(7, 'day'), 'usd')
        },
        volume: {
          sevenDaysBefore: getVal(entry.priceHistory, unlockDate.subtract(7, 'day'), 'volume24h'),
          at: getVal(entry.priceHistory, unlockDate, 'volume24h'),
          sevenDaysAfter: getVal(entry.priceHistory, unlockDate.add(7, 'day'), 'volume24h')
        },
        openInterest: {
          sevenDaysBefore: getVal(openInterest, unlockDate.subtract(7, 'day'), 'averageValue'),
          at: getVal(openInterest, unlockDate, 'averageValue'),
          sevenDaysAfter: getVal(openInterest, unlockDate.add(7, 'day'), 'averageValue')
        },
        fundingRate: {
          sevenDaysBefore: getVal(fundingRates, unlockDate.subtract(7, 'day'), 'averageValue'),
          at: getVal(fundingRates, unlockDate, 'averageValue'),
          sevenDaysAfter: getVal(fundingRates, unlockDate.add(7, 'day'), 'averageValue')
        },
        social: {
          interactions: {
            sevenDaysBefore: getVal(entry.socialStatsHistory, unlockDate.subtract(7, 'day'), 'interactions'),
            at: getVal(entry.socialStatsHistory, unlockDate, 'interactions'),
            sevenDaysAfter: getVal(entry.socialStatsHistory, unlockDate.add(7, 'day'), 'interactions')
          },
          creators: {
            sevenDaysBefore: getVal(entry.socialStatsHistory, unlockDate.subtract(7, 'day'), 'contributors_active'),
            at: getVal(entry.socialStatsHistory, unlockDate, 'contributors_active'),
            sevenDaysAfter: getVal(entry.socialStatsHistory, unlockDate.add(7, 'day'), 'contributors_active')
          }
        }
      }
    }
  });
};