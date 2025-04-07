'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';
import { FuturesData } from '@/services/arkham';

interface Props {
  fundingRates: FuturesData;
}

const timeOptions = [
  { label: '24h', ms: 1000 * 60 * 60 * 24 },
  { label: '1w', ms: 1000 * 60 * 60 * 24 * 7 },
  { label: '2w', ms: 1000 * 60 * 60 * 24 * 14 },
  { label: '1m', ms: 1000 * 60 * 60 * 24 * 30 },
  { label: '3m', ms: 1000 * 60 * 60 * 24 * 90 },
  { label: '6m', ms: 1000 * 60 * 60 * 24 * 180 }
];

const COLORS = [
  '#975B8A',
  '#5E3C89',
  '#FFD700',
  '#29ABE2',
  '#FF66C4',
  '#00B8D9'
];

const FundingRatesChart: React.FC<Props> = ({ fundingRates }) => {
  const [range, setRange] = useState('1m');

  const selectedRange = useMemo(() => {
    return timeOptions.find((t) => t.label === range)?.ms ?? timeOptions[3].ms;
  }, [range]);

  const exchanges = Object.keys(fundingRates);

  // Merge data across all exchanges
  const mergedData = useMemo(() => {
    const now = Date.now();
    const result: Record<number, any> = {};

    exchanges.forEach((exchange) => {
      (fundingRates[exchange] ?? []).forEach((entry) => {
        if (entry.timestamp >= now - selectedRange) {
          if (!result[entry.timestamp]) result[entry.timestamp] = { time: entry.timestamp };
          result[entry.timestamp][exchange] = entry.value;
        }
      });
    });

    return Object.values(result).sort((a, b) => a.time - b.time);
  }, [fundingRates, selectedRange]);

  return (
    <div className="bg-gray-800/10 text-gray-100 p-6 rounded-lg border border-white/5 max-w-[1160px] w-full">
      <h2 className="text-lg font-semibold mb-6 [font-family:var(--font-press-start)]">Funding Rates</h2>
      {mergedData.length === 0 ? (
        <h3 className="text-sm text-gray-400">
          No funding rates data available for this token.
        </h3>
      ) :
        <div className='flex flex-col w-full gap-6'>
          {/* Chart header options */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2 md:gap-4">
            {/* Time Filter */}
            <div className="flex gap-2 text-sm">
              {timeOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setRange(opt.label)}
                  className={`px-3 py-1 rounded-md border transition ${opt.label === range
                      ? 'bg-white text-black font-semibold'
                      : 'border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Funding Rates Line Chart */}
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={mergedData}>
              <XAxis
                dataKey="time"
                tickFormatter={(ts) => dayjs(ts).format('MMM D')}
                stroke="#aaa"
                tick={{ fill: '#aaa', fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(v) => `${(v * 100).toFixed(2)}%`}
                stroke="#aaa"
                tick={{ fill: '#aaa', fontSize: 12 }}
              />
              <Tooltip
                labelFormatter={(ts) => dayjs(ts).format('MMM D, YYYY HH:mm')}
                formatter={(value: any) =>
                  typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : value
                }
                contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#ddd' }}
              />
              <Legend wrapperStyle={{ color: '#ccc' }} />
              {exchanges.map((exchange, idx) => (
                <Line
                  key={exchange}
                  type="monotone"
                  dataKey={exchange}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  name={exchange.toUpperCase()}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      }

    </div>
  );
};

export default FundingRatesChart;
