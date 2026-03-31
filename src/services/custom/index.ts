import { TransformedSearchItem } from '@/types/token';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export const searchTokenUsingGet = async (query: string) => {
  const response = await axios.get(`${API}/search?query=${query}`);
  return response.data as {
    message: string;
    status: number;
    data: TransformedSearchItem[];
  };
};
