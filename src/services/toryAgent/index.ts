import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_TORY_COORDINATOR_BASE_URL;

export interface ToryAgentResponse {
  uuid: string;
  timestamp: number;
  response: string;
}

export const pingToryAgent = async () => {
  const res = await axios.get(`${BASE_URL}/`);
  return res.data;
};

export const sendTokenomics = async (uuid: string, timestamp: number, token: string) => {
  const res = await axios.post(`${BASE_URL}/send/tokenomics`, {
    uuid,
    timestamp,
    token,
  });
  return res.data;
};

export const sendUnlocks = async (uuid: string, timestamp: number, token: string) => {
  const res = await axios.post(`${BASE_URL}/send/unlocks`, {
    uuid,
    timestamp,
    token,
  });
  return res.data;
};

export const sendFinancials = async (uuid: string, timestamp: number, token: string) => {
  const res = await axios.post(`${BASE_URL}/send/financials`, {
    uuid,
    timestamp,
    token,
  });
  return res.data;
};

const pollUntilResponse = async (
  endpoint: string,
  uuid: string,
  timestamp: number,
  timeoutMs = 60000,
  intervalMs = 2000
): Promise<any> => {
  const start = Date.now();
  const url = `${BASE_URL}/history/${endpoint}?uuid=${uuid}&timestamp=${timestamp}`;

  while (Date.now() - start < timeoutMs) {
    const res = await axios.get(url);
    if (!res.data.error) {
      return res.data;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Polling timeout exceeded. No response received.');
};

export const getTokenomicsResult = async (uuid: string, timestamp: number) => {
  return await pollUntilResponse('tokenomics', uuid, timestamp);
};

export const getUnlocksResult = async (uuid: string, timestamp: number) => {
  return await pollUntilResponse('unlocks', uuid, timestamp);
};

export const getFinancialsResult = async (uuid: string, timestamp: number) => {
  return await pollUntilResponse('financials', uuid, timestamp);
};
