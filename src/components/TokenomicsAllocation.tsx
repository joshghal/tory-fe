import useAccountStore from '@/hooks/useTokenInfoStore';
import { getTokenomicsResult, sendTokenomics } from '@/services/toryAgent';
import { TokenAllocation } from '@/types/token';
import { useRequest } from 'ahooks';
import React, { useCallback, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { v4 as uuidv4 } from 'uuid';

const COLORS = [
  '#5A627E', '#007AB5', '#796DC5', '#5CB9EE',
  '#6BCFB3', '#DEC361', '#D9ED92', '#95A06C',
  '#9F97D4', '#4AA0C9', '#E2F0B0'
];

const TokenomicsAllocation = ({ data, maxSupplyLabel }: {
  data: TokenAllocation[];
  maxSupplyLabel: string;
}) => {
  const { toryApiStatus } = useAccountStore()
  const { runAsync: postTokenomicThoughts, loading: isPostTokenomicThoughtsLoading } = useRequest(sendTokenomics, {
    manual: true,
    onError: (err) => {
      console.error(err)
    }
  })

  const { run: getTokenomicsThoughts, data: tokenomicThoughtsData, loading: isGetTokenomicThoughtsLoading } = useRequest(getTokenomicsResult, {
    manual: true,
    onError: (err) => {
      console.error(err)
    }
  })

  function formatTokenAllocationForPrompt(data: any[]): string {
    return JSON.stringify(JSON.stringify(data));
  }

  const tokenAllocationPrompt = useMemo(() => {
    return formatTokenAllocationForPrompt(data);
  }, [data]);

  const generateTokenomicThoughts = useCallback(async () => {
    const uuid = uuidv4();
    const timestamp = Math.floor(Date.now() / 1000);

    await postTokenomicThoughts(
      uuid,
      timestamp,
      tokenAllocationPrompt
    ).then(() => {
      getTokenomicsThoughts(uuid, timestamp)
    })
  }, [tokenAllocationPrompt])

  const isLoading = useMemo(() => {
    return isPostTokenomicThoughtsLoading || isGetTokenomicThoughtsLoading
  }, [isPostTokenomicThoughtsLoading, isGetTokenomicThoughtsLoading])

  return (
    <div className="text-white rounded-xl p-8 max-w-[1160px] mx-auto w-full bg-gray-800/10 border-1 border-white/5">
      <div className="mb-6">
        <h2 className="text-md font-semibold [font-family:var(--font-press-start)] mb-2">Allocation</h2>
        <p className="text-sm text-gray-400">
          Max. Supply: <span className="ml-2 text-white font-semibold">{maxSupplyLabel}</span>
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-[50%] h-[300px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="tokenPercent"
                nameKey="name"
                innerRadius={70}
                outerRadius={100}
                labelLine={false}
                label={({ percent }) =>
                  percent > 0.05 ? `${(percent * 100).toFixed(1)}%` : ''
                }
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="text-left pb-2">Name</th>
                <th className="text-right pb-2">Total</th>
                <th className="text-right pb-2">Unlocked</th>
                <th className="text-right pb-2">Locked</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={item.name} className="border-b border-gray-800">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      {item.name}
                    </div>
                  </td>
                  <td className="text-right">{item.tokenPercent.toFixed(2)}%</td>
                  <td className="text-right">{item.unlockedTokens.toFixed(2)}%</td>
                  <td className="text-right">{item.lockedTokens.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-10 p-6 border border-white/10 rounded-xl bg-gray-900/40 flex flex-col gap-4">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold">AI Thoughts</h3>
          <button
            onClick={generateTokenomicThoughts}
            disabled={isPostTokenomicThoughtsLoading || isGetTokenomicThoughtsLoading || !toryApiStatus}
            className="text-sm bg-white text-black font-medium py-1.5 px-4 rounded hover:bg-gray-100 disabled:bg-gray-600"
          >
            {isLoading ? "Thinking..." : "Generate"}
          </button>
        </div>

        {tokenomicThoughtsData?.response && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h4 className="text-sm text-green-400 font-semibold">Bullish Thoughts</h4>
              <ul className="list-disc list-inside text-sm">
                {JSON.parse(tokenomicThoughtsData?.response)?.bullishThoughts?.map((b: any, i: any) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm text-red-400 font-semibold">Bearish Thoughts</h4>
              <ul className="list-disc list-inside text-sm">
                {JSON.parse(tokenomicThoughtsData?.response)?.bearishThoughts?.map((b: any, i: any) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenomicsAllocation;
