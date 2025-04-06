import axios from 'axios';

export const getLunarCrushAuthToken = async () => {
  const response = await axios.get('/api/lrch/auth');
  const { data } = response;
  return data as {
    message: string;
    status: number;
    bearer: string;
  };
};

export const getTokenTerminalAuthToken = async () => {
  const response = await axios.get('/api/token-terminal/auth');
  const { data } = response;
  return data as {
    message: string;
    status: number;
    bearer: string;
    jwt: string;
  };
};
