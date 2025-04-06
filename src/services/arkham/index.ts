import { IFuturesData } from '@/app/api/arkham/futures-data/route';
import axios from 'axios';

export const getFuturesData = async (
  slug: string,
) => {
  const response = await axios.get(`/api/arkham/futures-data?slug=${slug}`);
  const { data } = response;
  return data as {
    message: string;
    status: number;
    data: IFuturesData;
  };
};
