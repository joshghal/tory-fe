import { TransformedSearchItem } from '@/types/token';
import axios from 'axios';

export const searchTokenUsingGet = async (query: string) => {
  const response = await axios.get(`/api/search?query=${query}`);
  return response.data as {
    message: string;
    status: number;
    data: TransformedSearchItem[];
  };
};
