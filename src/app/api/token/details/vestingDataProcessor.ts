import {
  DateEntry,
  PastFutureUnlocks,
  SocialAnalyticsSnapshot,
  TokenAllocation,
  Tokenomics,
  TokenPriceHistory,
  VestingSchedule,
} from '@/types/token';

export const processVestingData = (
  vestingData: VestingSchedule
): DateEntry[] => {
  const result: DateEntry[] = [];

  vestingData.allocations.forEach((allocation) => {
    allocation.batches.forEach((batch) => {
      const date = batch.date;
      const unlockedTokens = (batch.unlock_percent / 100) * allocation.tokens;
      const percentUnlocked = batch.unlock_percent;

      // Find or create the entry for this date
      let dateEntry = result.find((entry) => entry.date === date);
      if (!dateEntry) {
        dateEntry = {
          date: date,
          unlockedTokensSum: 0,
          percentUnlockedSum: 0,
          details: [],
        };
        result.push(dateEntry);
      }

      // Update the sums and details
      dateEntry.unlockedTokensSum += unlockedTokens;
      dateEntry.percentUnlockedSum =
        dateEntry.unlockedTokensSum /
        vestingData.allocations.reduce(
          (sum: number, alloc) => sum + alloc.tokens,
          0
        );
      dateEntry.details.push({
        name: allocation.name,
        unlockedTokens: unlockedTokens,
        percentUnlocked: percentUnlocked,
      });
    });
  });

  return result.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const getUnlockSchedules = (
  result: DateEntry[]
): { pastUnlocks: DateEntry[]; upcomingUnlock: DateEntry[] } => {
  const today = new Date();
  const pastUnlocks =
    result.filter((entry) => new Date(entry.date) < today).slice(0, 6) || [];
  const upcomingUnlock =
    result
      .filter((entry) => new Date(entry.date) > today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 1) || [];

  return { pastUnlocks, upcomingUnlock };
};

export const getPriceHistory = (
  unlockData: PastFutureUnlocks,
  priceHistoryData: TokenPriceHistory[]
) => {
  const data = { ...unlockData };

  if (data?.pastUnlocks) {
    data.pastUnlocks.forEach((unlock) => {
      const unlockDate = new Date(unlock.date);
      const sevenDaysBefore = new Date(unlockDate);
      const sevenDaysAfter = new Date(unlockDate);
      sevenDaysBefore.setDate(unlockDate.getDate() - 7);
      sevenDaysAfter.setDate(unlockDate.getDate() + 8 );

      unlock.priceHistory = priceHistoryData.filter((entry) => {
        const entryDate = new Date(entry.time);
        return entryDate >= sevenDaysBefore && entryDate <= sevenDaysAfter;
      });
    });
  }

  if (data?.upcomingUnlock) {
    data.upcomingUnlock.forEach((unlock) => {
      const unlockDate = new Date(unlock.date);
      const sevenDaysBefore = new Date(unlockDate);
      const sevenDaysAfter = new Date(unlockDate);
      sevenDaysBefore.setDate(unlockDate.getDate() - 7);
      sevenDaysAfter.setDate(unlockDate.getDate() + 7);

      unlock.priceHistory = priceHistoryData.filter((entry) => {
        const entryDate = new Date(entry.time);
        return entryDate >= sevenDaysBefore && entryDate <= sevenDaysAfter;
      });
    });
  }

  return data;
};

export const getSocialStats = (
  unlockData: PastFutureUnlocks,
  socialStatsHistory: SocialAnalyticsSnapshot[]
) => {
  const data = { ...unlockData };

  if (data?.pastUnlocks) {
    data.pastUnlocks.forEach((unlock) => {
      const unlockDate = new Date(unlock.date);
      const sevenDaysBefore = new Date(unlockDate);
      const sevenDaysAfter = new Date(unlockDate);
      sevenDaysBefore.setDate(unlockDate.getDate() - 7);
      sevenDaysAfter.setDate(unlockDate.getDate() + 7);

      unlock.socialStatsHistory = socialStatsHistory.filter((entry) => {
        const entryDate = new Date(entry.time * 1000);
        return entryDate >= sevenDaysBefore && entryDate <= sevenDaysAfter;
      });
    });
  }

  if (data?.upcomingUnlock) {
    data.upcomingUnlock.forEach((unlock) => {
      const unlockDate = new Date(unlock.date);
      const sevenDaysBefore = new Date(unlockDate);
      const sevenDaysAfter = new Date(unlockDate);
      sevenDaysBefore.setDate(unlockDate.getDate() - 7);
      sevenDaysAfter.setDate(unlockDate.getDate() + 7);

      unlock.socialStatsHistory = socialStatsHistory.filter((entry) => {
        const entryDate = new Date(entry.time * 1000);
        return entryDate >= sevenDaysBefore && entryDate <= sevenDaysAfter;
      });
    });
  }

  return data;
}

export const getTokenomicsData = (vestingData: VestingSchedule): Tokenomics => {
  const today = new Date();
  const tokenomicAllocations: TokenAllocation[] = [];

  let totalLocked = 0;
  let totalUnlocked = 0;
  vestingData?.allocations?.forEach((item) => {
    const tempTokenDetail: TokenAllocation = {
      name: item.name,
      tokenPercent: item.tokens_percent,
      totalTokenAllocation: item.tokens,
      unlockedTokens: 0,
      lockedTokens: 0,
    };

    const { unlocked, locked } = item?.batches?.reduce(
      (acc, batch) => {
        const batchDate = new Date(batch.date);
        if (batchDate <= today) {
          acc.unlocked += batch.unlock_percent;
        } else {
          acc.locked += batch.unlock_percent;
        }
        return acc;
      },
      { unlocked: 0, locked: 0 }
    );
    const tempUnlockedTokens =
      Math.ceil((unlocked / 100) * tempTokenDetail.tokenPercent * 100) / 100;
    tempTokenDetail.unlockedTokens = tempUnlockedTokens;
    totalUnlocked += tempUnlockedTokens;

    const tempLockedTokens =
      Math.ceil((locked / 100) * tempTokenDetail.tokenPercent * 100) / 100;
    tempTokenDetail.lockedTokens = tempLockedTokens;
    totalLocked += tempLockedTokens;

    tokenomicAllocations.push(tempTokenDetail);
  });

  return {
    allocations: tokenomicAllocations,
    totalUnlocked,
    totalLocked,
  };
};
