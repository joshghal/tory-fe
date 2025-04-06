'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { DateEntry } from '@/types/token';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { avgFuturesData } from '@/app/api/arkham/futures-data/route';
import { prepareUnlockAnalysisData } from '@/utils/tokenUnlockUtils';

export type FuturesData = {
  [exchange: string]: {
    timestamp: number;
    value: number;
    value2: number;
  }[];
};

interface Props {
  data: any;
  openInterest: avgFuturesData[];
  fundingRates: avgFuturesData[];
}

const getLabelColor = (value: number) => {
  return value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400'
}

const TokenUnlocksChart: React.FC<Props> = ({
  data,
  openInterest,
  fundingRates
}) => {
  const { pastUnlocks, upcomingUnlock } = data;

  const [view, setView] = useState<'past' | 'upcoming'>('past');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const selectedList = view === 'past' ? pastUnlocks : upcomingUnlock;

  useEffect(() => {
    if (selectedList.length > 0) {
      setSelectedDate(selectedList[0].date);
    }
  }, [view]);

  const getChartData = (entry: DateEntry) => {
    const unlockTime = new Date(entry.date).getTime();
    const dayMs = 86400000;
    const windowDates = Array.from({ length: 15 }, (_, i) => {
      const offset = i - 7;
      const date = dayjs(unlockTime + offset * dayMs).format('YYYY-MM-DD');
      return date;
    });

    const priceMap = Object.fromEntries(
      entry.priceHistory?.map((p) => [dayjs(p.time).format('YYYY-MM-DD'), p]) || []
    );
    const socialMap = Object.fromEntries(
      entry.socialStatsHistory?.map((s) => [dayjs.unix(Number(s.time)).format('YYYY-MM-DD'), s]) || []
    );
    const oiMap = Object.fromEntries(
      openInterest.map((o) => [dayjs(o.date).format('YYYY-MM-DD'), o])
    );
    const fundingMap = Object.fromEntries(
      fundingRates.map((f) => [dayjs(f.date).format('YYYY-MM-DD'), f])
    );

    return windowDates.map((d) => ({
      date: d,
      price: priceMap[d]?.usd,
      volume: priceMap[d]?.volume24h,
      interactions: socialMap[d]?.interactions,
      creators: socialMap[d]?.contributors_active,
      openInterest: oiMap[d]?.averageValue,
      fundingRate: fundingMap[d]?.averageValue,
    }));
  };

  const selectedUnlock = selectedList.find((u: any) => u.date === selectedDate);
  const chartData = selectedUnlock ? getChartData(selectedUnlock) : [];

  const getPercentageChange = (data: any[], key: string) => {
    const start = data[0]?.[key] || 0;
    const mid = data[7]?.[key] || 0;
    const end = data[14]?.[key] || 0;
    if (start && mid && end) {
      return {
        changeBefore: (((mid - start) / start) * 100).toFixed(2),
        changeAfter: (((end - mid) / mid) * 100).toFixed(2),
      };
    }
    return null;
  };

  const summaryMetrics = [
    { key: 'price', label: 'Price ($)' },
    { key: 'volume', label: 'Volume (24h)' },
    { key: 'openInterest', label: 'Open Interest' },
    { key: 'fundingRate', label: 'Funding Rate' },
    { key: 'interactions', label: 'Socials Interactions' },
    { key: 'creators', label: 'Socials Active Creators' },
  ];

  const tokenUnlockPromptData = useMemo(() => {
    if (pastUnlocks.length > 0 && upcomingUnlock.length > 0 && openInterest.length > 0 && fundingRates.length > 0) {
      return JSON.stringify(JSON.stringify(prepareUnlockAnalysisData([...pastUnlocks, ...upcomingUnlock], openInterest, fundingRates)));
    }
  }, [pastUnlocks, upcomingUnlock, openInterest, fundingRates]);

  return (
    <div className="text-white space-y-4 w-full max-w-[1160px] min-w-[360px]">
      <div className="flex justify-between items-center mb-4">
        <div className='flex gap-4'>
          <button
            className={`px-4 py-2 rounded ${view === 'past' ? 'bg-white text-black' : 'bg-gray-800/40 text-white border border-white/5'}`}
            onClick={() => setView('past')}
          >
            Past Unlocks
          </button>
          <button
            className={`px-4 py-2 rounded ${view === 'upcoming' ? 'bg-white text-black' : 'bg-gray-800/40 text-white border border-white/5'}`}
            onClick={() => setView('upcoming')}
          >
            Upcoming Unlocks
          </button>
        </div>

        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-800/30 border border-white/5 text-sm px-4 py-2 rounded ml-4 text-white/80"
        >
          {selectedList.map((u: any) => (
            <option key={u.date} value={u.date} className="text-black">
              {dayjs(u.date).format('MMM D, YYYY')}
            </option>
          ))}
        </select>
      </div>

      <div className='grid sm:grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        {selectedUnlock?.details?.length > 0 && (
          <div className="bg-gray-900/20 p-5 rounded-xl text-sm border border-white/5">
            <h2 className="text-gray-300 mb-5 font-bold text-lg">Unlock Proposition</h2>
            <ul className="space-y-1 text-gray-200">
              {selectedUnlock.details.map((d: any, i: any) => (
                <li key={i} className="flex justify-between">
                  <span>{d.name}</span>
                  <span>{d.unlockedTokens.toLocaleString()} ({d.percentUnlocked.toFixed(2)}%)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {chartData.length > 0 && (
          <div className="bg-gray-900/20 p-5 rounded-xl text-sm space-y-2 border-1 border-white/5">
            <h2 className="text-gray-300 mb-5 font-bold text-lg">Change Percentages</h2>
            {summaryMetrics.map(({ key, label }) => {
              const change = getPercentageChange(chartData, key);
              return change ? (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-100">{label}</span>

                  <span className="text-gray-400">
                    <span className={`${getLabelColor(Number(change.changeBefore))} mr-1`}>
                      Pre-Unlock (-7D): {change.changeBefore}%
                    </span> | <span className={`${getLabelColor(Number(change.changeAfter))} ml-1`}>
                      Post-Unlock (+7D): {change.changeAfter}%
                    </span>
                  </span>
                </div>
              ) : null;
            })}
          </div>
        )}


      </div>

      <div className="w-full h-[400px] rounded-xl p-4 bg-gray-800/10 border-1 border-white/5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="date" stroke="#ccc" />
            <YAxis yAxisId="left" stroke="#ccc" domain={['auto', 'auto']} />
            <YAxis stroke="#ccc" orientation="right" yAxisId="right" />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563' }} labelStyle={{ color: '#f3f4f6' }} itemStyle={{ color: '#f3f4f6' }} />
            <Legend wrapperStyle={{ color: '#f3f4f6' }} />
            <Line type="monotone" dataKey="price" stroke="#4ade80" name="Price ($)" dot={false} yAxisId="left" />
            <Line type="monotone" dataKey="volume" stroke="#facc15" name="Volume (24h)" dot={false} yAxisId="right" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TokenUnlocksChart;
