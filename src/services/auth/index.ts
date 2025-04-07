import axios from 'axios';

export const getLunarCrushAuthToken = async () => {
  const response = await axios.get(`${process.env.NEXT_PUBLIC_TORY_FE_API_URL}/api/lrch/auth`);
  const { data } = response;
  return data as {
    message: string;
    status: number;
    bearer: string;
  };
};

export const getTokenTerminalAuthToken = async () => {
  const response = await axios.get(`${process.env.NEXT_PUBLIC_TORY_FE_API_URL}/api/token-terminal/auth`);
  const { data } = response;
  return data as {
    message: string;
    status: number;
    bearer: string;
    jwt: string;
  };
};
