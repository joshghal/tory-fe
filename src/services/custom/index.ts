import { TransformedItem } from '@/app/api/availability/search/route';
import { ITokenDetail } from '@/app/api/token/details/route';
import axios from 'axios';

export const searchTokenUsingGet = async (
  query: string,
  bearer: string,
  jwt: string
) => {
  const response = await axios.get(`/api/availability/search?query=${query}&bearer=${bearer}&jwt=${jwt}`);
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
  const response = await axios.get(`/api/token/details?arkhamSlug=${arkhamSlug}&cryptoRankSlug=${cryptoRankSlug}&lunarSlug=${lunarSlug}&lunarToken=${lunarToken}`);
  const { data } = response;
  return data as {
    message: string;
    status: number;
    data: ITokenDetail;
  };
};
