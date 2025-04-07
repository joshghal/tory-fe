'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';
import { FuturesData } from '@/app/api/arkham/futures-data/route';

interface Props {
  openInterest: FuturesData;
}

const timeOptions = [
  { label: '24h', ms: 1000 * 60 * 60 * 24 },
  { label: '1w', ms: 1000 * 60 * 60 * 24 * 7 },
  { label: '1m', ms: 1000 * 60 * 60 * 24 * 30 },
  { label: '3m', ms: 1000 * 60 * 60 * 24 * 90 },
  { label: '6m', ms: 1000 * 60 * 60 * 24 * 180 }
];

const COLORS = [
  '#975B8A',
  '#5E3C89',
  '#FEC260',
  '#29ABE2',
  '#FF66C4',
  '#00B8D9',
  '#FF4560',
  '#00E396',
  '#9C27B0'
];

const OpenInterestChart: React.FC<Props> = ({ openInterest }) => {
  const [range, setRange] = useState('1m');

  const selectedRange = useMemo(() => {
    return timeOptions.find((t) => t.label === range)?.ms ?? timeOptions[2].ms;
  }, [range]);

  const exchanges = Object.keys(openInterest);

  // Merge and format data
  const mergedData = useMemo(() => {
    const now = Date.now();
    const result: Record<number, any> = {};

    exchanges.forEach((exchange) => {
      openInterest[exchange].forEach((entry) => {
        if (entry.timestamp >= now - selectedRange) {
          if (!result[entry.timestamp]) result[entry.timestamp] = { time: entry.timestamp };
          result[entry.timestamp][exchange] = entry.value;
        }
      });
    });

    return Object.values(result).sort((a, b) => a.time - b.time);
  }, [openInterest, selectedRange]);

  return (
    <div className="bg-gray-800/10 text-gray-100 p-6 rounded-lg border border-white/5 max-w-[1160px] w-full">
      <h2 className="text-lg font-semibold mb-6 [font-family:var(--font-press-start)]">Open Interest</h2>
      {mergedData.length === 0 ? (
        <h3 className="text-sm text-gray-400">
          No open interest data available for this token.
        </h3>
      ) :
        <div className='flex flex-col w-full gap-6'>
          {/* Time Range Filters */}
          <div className="flex gap-4 mb-4 text-sm">
            {timeOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setRange(opt.label)}
                className={`px-3 py-1 rounded-md border ${opt.label === range
                    ? 'bg-white text-black font-semibold'
                    : 'border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={mergedData}>
              <XAxis
                dataKey="time"
                tickFormatter={(ts) => dayjs(ts).format('MMM D')}
                stroke="#aaa"
                tick={{ fill: '#aaa', fontSize: 12 }}
              />
              <YAxis
                stroke="#aaa"
                tick={{ fill: '#aaa', fontSize: 12 }}
              />
              <Tooltip
                labelFormatter={(ts) => dayjs(ts).format('MMM D, YYYY HH:mm')}
                formatter={(val: any) =>
                  typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : val
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

export default OpenInterestChart;
