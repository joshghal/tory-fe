import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import dayjs from 'dayjs';
import { SocialAnalyticsSnapshot } from '@/types/token';

const METRICS = [
  { key: 'market_cap', label: 'Market Cap', color: '#FF4560' },
  { key: 'interactions', label: 'Socials Interactions', color: '#FFA07A' },
  { key: 'contributors_active', label: 'Socials Active Creators', color: '#4A90E2' },
  { key: 'contributors_created', label: 'New Creators', color: '#007AB5' },
  { key: 'posts_active', label: 'Active Posts', color: '#9C27B0' },
  { key: 'posts_created', label: 'New Posts', color: '#6B5B95' },
  { key: 'sentiment', label: 'Sentiment (%)', color: '#FFD700' },
  { key: 'galaxy_score', label: 'Galaxy Score', color: '#00B8D9' },
  { key: 'alt_rank', label: 'AltRank', color: '#FF66C4' },
  { key: 'social_dominance', label: 'Social Dominance', color: '#29ABE2' },
];

const formatDate = (unix: number) => dayjs.unix(unix).format('MMM D, YY');

interface Props {
  data: SocialAnalyticsSnapshot[];
}

const SocialMetricsChart: React.FC<Props> = ({ data }) => {
  const [activeMetrics, setActiveMetrics] = useState<string[]>([
    'interactions'
  ]);

  const toggleMetric = (key: string) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="bg-gray-800/10 text-gray-100 p-6 rounded-lg border border-white/5 max-w-[1160px] w-full">
      <h2 className="text-xl font-semibold mb-6">Social Metrics</h2>
      {/* Metric Toggles */}
      <div className="flex flex-wrap gap-4 mb-6">
        {METRICS.map((metric) => (
          <label key={metric.key} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={activeMetrics.includes(metric.key)}
              onChange={() => toggleMetric(metric.key)}
              className="accent-white"
            />
            <span style={{ color: metric.color }}>{metric.label}</span>
          </label>
        ))}
      </div>

      {/* Line Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <XAxis
            dataKey="time"
            tickFormatter={formatDate}
            stroke="#aaa"
            tick={{ fill: '#aaa', fontSize: 12 }}
          />
          <YAxis
            stroke="#aaa"
            tick={{ fill: '#aaa', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }}
            labelStyle={{ color: '#fff' }}
            itemStyle={{ color: '#ddd' }}
            labelFormatter={formatDate}
            formatter={(value: any) => {
              if (typeof value === 'number') {
                if (value > 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                if (value > 1_000) return `${(value / 1_000).toFixed(1)}K`;
              }
              return value;
            }}
          />
          <Legend wrapperStyle={{ color: '#ccc' }} />
          {METRICS.filter((m) => activeMetrics.includes(m.key)).map((metric) => (
            <Line
              key={metric.key}
              type="monotone"
              dataKey={metric.key}
              stroke={metric.color}
              strokeWidth={2}
              dot={false}
              name={metric.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SocialMetricsChart;
