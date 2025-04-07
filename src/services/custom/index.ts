import { DateEntry, SocialAnalyticsResponse, Tokenomics, TokenPriceHistory, TokenStats } from '@/types/token';
import axios from 'axios';

export interface TransformedItem {
  label: string;
  symbol: string;
  image: string;
  arkhamSlug: string;
  chainBrokerSlug?: string;
  tokenTerminalSlug?: string;
  cmcSlug?: string;
  cryptoRankSlug?: string;
}

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

export const searchTokenUsingGet = async (
  query: string,
  bearer: string,
  jwt: string
) => {
  const response = await axios.get(`${process.env.NEXT_PUBLIC_TORY_FE_API_URL}/api/availability/search?query=${query}&bearer=${bearer}&jwt=${jwt}`);
  const { data } = response;
  return data as {
    message: string;
    status: number;
    data: TransformedItem[];
  };
};

export const getTokenDetails = async (
  arkhamSlug: string,
  cryptoRankSlug: string,
  lunarSlug: string,
  lunarToken: string
) => {
  const response = await axios.get(`${process.env.NEXT_PUBLIC_TORY_FE_API_URL}/api/token/details?arkhamSlug=${arkhamSlug}&cryptoRankSlug=${cryptoRankSlug}&lunarSlug=${lunarSlug}&lunarToken=${lunarToken}`);
  const { data } = response;
  return data as {
    message: string;
    status: number;
    data: ITokenDetail;
  };
};
