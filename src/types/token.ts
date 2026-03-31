export interface TokenPriceHistory {
  time: string;
  usd: number;
  volume24h: number;
  marketCap: number;
}

export interface TransformedSearchItem {
  label: string;
  symbol: string;
  image: string;
  arkhamSlug: string;
}
