import axios from 'axios';

export type FuturesData = {
  [exchange: string]: {
    timestamp: number;
    value: number;
    value2: number;
  }[];
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

export const getFuturesData = async (
  slug: string,
) => {
  const response = await axios.get(`${process.env.NEXT_PUBLIC_TORY_FE_API_URL}/api/arkham/futures-data?slug=${slug}`);
  const { data } = response;
  return data as {
    message: string;
    status: number;
    data: IFuturesData;
  };
};
