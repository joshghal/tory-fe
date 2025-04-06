import { TokenAllocation } from '@/types/token';
import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = [
  '#5A627E', '#007AB5', '#796DC5', '#5CB9EE',
  '#6BCFB3', '#DEC361', '#D9ED92', '#95A06C',
  '#9F97D4', '#4AA0C9', '#E2F0B0'
];

const TokenomicsAllocation = ({ data, maxSupplyLabel }: {
  data: TokenAllocation[];
  maxSupplyLabel: string;
}) => {
  function formatTokenAllocationForPrompt(data: any[]): string {
    return JSON.stringify(JSON.stringify(data));
  }

  const tokenAllocationPrompt = useMemo(() => {
    return formatTokenAllocationForPrompt(data);
  }, [data]);

  return (
    <div className="text-white rounded-xl p-8 max-w-[1160px] mx-auto w-full bg-gray-800/10 border-1 border-white/5">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Allocation</h2>
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
    </div>
  );
};

export default TokenomicsAllocation;
