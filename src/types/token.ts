export interface TokenPriceHistory {
  time: string; // ISO date string
  usd: number;
  volume24h: number;
  marketCap: number;
}

export interface VestingSchedule {
  vesting: VestingInfo;
  allocations: Allocation[];
}

export interface VestingInfo {
  coin_id: number;
  total_start_date: string; // ISO date string
  tge_start_date: string; // ISO date string
  links: string[];
  is_hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Allocation {
  name: string;
  tokens_percent: number;
  tokens: number;
  unlock_type: string;
  unlock_frequency_type: string | null;
  unlock_frequency_value: number | null;
  vesting_duration_type: string | null;
  vesting_duration_value: number | null;
  round_date: string | null;
  batches: Batch[];
}

export interface Batch {
  date: string; // ISO date string
  is_tge: boolean;
  unlock_percent: number;
}

export interface DateEntry {
  date: string;
  unlockedTokensSum: number;
  percentUnlockedSum: number;
  details: Array<{
    name: string;
    unlockedTokens: number;
    percentUnlocked: number;
  }>;
  priceHistory?: TokenPriceHistory[];
  socialStatsHistory?: SocialAnalyticsSnapshot[];
}

export interface PastFutureUnlocks {
  pastUnlocks: DateEntry[];
  upcomingUnlock: DateEntry[];
}

export interface TokenAllocation {
  name: string;
  tokenPercent: number;
  totalTokenAllocation: number;
  unlockedTokens: number;
  lockedTokens: number;
}

export interface Tokenomics {
  allocations: TokenAllocation[];
  totalUnlocked: number;
  totalLocked: number;
}

export interface TokenStats {
  price: number;
  totalVolume: number;
  price24hAgo: number;
  maxPrice24h: number;
  minPrice24h: number;
  circulatingSupply: number;
  totalSupply: number;
  price7dAgo: number;
  price30dAgo: number;
  price180dAgo: number;
  allTimeHigh: number;
  allTimeLow: number;
}


//LunarCrush Interfaces
export interface SocialAnalyticsSnapshot {
  time: number;
  contributors_active?: number;
  contributors_created?: number;
  interactions?: number;
  posts_active?: number;
  posts_created?: number;
  sentiment?: number;
  alt_rank?: number;
  close?: number;
  galaxy_score?: number;
  market_cap?: number;
  volume_24h?: number;
  social_dominance?: number;
}

export interface SocialAnalyticsConfig {
  bucket: string;
  topic: string;
  interval: string;
  start: number;
  end: number;
  asset: string;
  remote_api: string;
  generated: number;
}

export interface SocialAnalyticsResponse {
  config: SocialAnalyticsConfig;
  data: SocialAnalyticsSnapshot[];
}
