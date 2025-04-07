'use client';

import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import useAccountStore from '@/hooks/useTokenInfoStore';
import { useRequest } from 'ahooks';
import { getFinancialsResult, sendFinancials } from '@/services/toryAgent';
import { v4 as uuidv4 } from 'uuid';
import { ProjectMetric } from '@/services/tokenTerminal';

interface Props {
  data: ProjectMetric[];
}

const FinancialStatement: React.FC<Props> = ({ data }) => {
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [showChanges, setShowChanges] = useState(true);

  const { toryApiStatus } = useAccountStore()
  const { runAsync: postFinancialData, loading: isPostFinancialDataLoading } = useRequest(sendFinancials, {
    manual: true,
    onError: (err) => {
      console.error(err)
    }
  })

  const { run: getFinancialThoughts, data: financialThoughtsData, loading: isGetFinancialThoughtsLoading } = useRequest(getFinancialsResult, {
    manual: true,
    onError: (err) => {
      console.error(err)
    }
  })

  const financialPromptData = React.useMemo(() => {
    if (data.length > 0) {
      const periodSet = Array.from(new Set(data.map(d => d.timestamp_label_heading)));
      const periodMap = data.reduce((acc, item) => {
        acc[item.timestamp_label_heading] = new Date(item.timestamp).getTime();
        return acc;
      }, {} as Record<string, number>);

      const latestPeriods = periodSet
        .sort((a, b) => periodMap[b] - periodMap[a])
        .slice(0, 6);

      const cleanedData = data
        .filter(d => latestPeriods.includes(d.timestamp_label_heading))
        .map(({ timestamp, metric_id, value, pop_change }) => ({
          date: new Date(timestamp).toLocaleDateString("en-US"),
          name: metric_id,
          val: Number(value.toFixed(2)),
          chg: pop_change !== null ? Number(pop_change.toFixed(2)) : null
        }));

      return JSON.stringify(JSON.stringify(cleanedData));
    }

    return "";
  }, [data]);

  const grouped = data.reduce((acc, item) => {
    const { section, metric_id } = item;
    if (!acc[section]) acc[section] = {};
    if (!acc[section][metric_id]) {
      acc[section][metric_id] = {
        label: item.metric_id.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        definition: item.definition,
        values: {}
      };
    }
    acc[section][metric_id].values[item.timestamp_label_heading] = item;
    return acc;
  }, {} as Record<
    string,
    Record<
      string,
      {
        label: string;
        definition: string | null;
        values: Record<string, ProjectMetric>;
      }
    >
  >);

  const periodMap = data.reduce((acc, item) => {
    acc[item.timestamp_label_heading] = item.timestamp;
    return acc;
  }, {} as Record<string, string>);

  const periods = Array.from(new Set(data.map(d => d.timestamp_label_heading)))
    .sort((a, b) => new Date(periodMap[b]).getTime() - new Date(periodMap[a]).getTime());

  const generateFinancialThoughts = useCallback(async () => {
    const uuid = uuidv4();
    const timestamp = Math.floor(Date.now() / 1000);

    await postFinancialData(
      uuid,
      timestamp,
      financialPromptData
    ).then(() => {
      getFinancialThoughts(uuid, timestamp)
    })
  }, [financialPromptData])

  const isLoading = useMemo(() => {
    return isPostFinancialDataLoading || isGetFinancialThoughtsLoading
  }, [isPostFinancialDataLoading, isGetFinancialThoughtsLoading])

  return (
    <div className="flex flex-col gap-6 w-full text-gray-200 max-w-[1160px]">
      <h2 className="text-lg font-semibold [font-family:var(--font-press-start)]">Financial Statements</h2>
      {data.length === 0 ? (
        <h3 className="text-sm text-gray-400">
          No financial statement data available for this token.
        </h3>
      ) :
        <div className='flex flex-col w-full gap-6'>
          {/* Toggles */}
          <div className="flex justify-between items-center">
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDefinitions}
                  onChange={() => setShowDefinitions(!showDefinitions)}
                  className="accent-white"
                />
                Show definitions
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showChanges}
                  onChange={() => setShowChanges(!showChanges)}
                  className="accent-white"
                />
                Show changes
              </label>
            </div>
          </div>

          <div className="p-6 border border-white/10 rounded-xl bg-gray-900/40 flex flex-col gap-4">
            <div className="flex items-center justify-between w-full">
              <h3 className="text-lg font-semibold">AI Thoughts</h3>
              <button
                onClick={generateFinancialThoughts}
                disabled={isLoading || !toryApiStatus}
                className="text-sm bg-white text-black font-medium py-1.5 px-4 rounded hover:bg-gray-100 disabled:bg-gray-600"
              >
                {isLoading ? "Thinking..." : "Generate"}
              </button>
            </div>

            {financialThoughtsData?.response && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <h4 className="text-sm text-green-400 font-semibold">Bullish Thoughts</h4>
                  <ul className="list-disc list-inside text-sm">
                    {JSON.parse(financialThoughtsData?.response)?.bullishThoughts?.map((b: any, i: any) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm text-red-400 font-semibold">Bearish Thoughts</h4>
                  <ul className="list-disc list-inside text-sm">
                    {JSON.parse(financialThoughtsData?.response)?.bearishThoughts?.map((b: any, i: any) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-700 rounded-lg bg-gray-800/10 w-full max-w-[1160px] border-1 border-white/5 shadow-sm">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-400/5 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-medium text-gray-300">Metric</th>
                  {periods.map((p) => (
                    <th key={p} className="p-4 font-medium text-gray-300 text-right whitespace-nowrap">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([section, metrics]) => (
                  <React.Fragment key={section}>
                    {/* Section Row */}
                    <tr className="bg-gray-400/5">
                      <td
                        colSpan={periods.length + 1}
                        className="p-4 font-semibold text-gray-200 uppercase sticky left-0 z-10 bg-gray-800/10 backdrop-blur-sm"
                      >
                        {section}
                      </td>
                    </tr>
                    {Object.entries(metrics).map(([metricKey, metric]) => (
                      <tr key={metricKey} className="border-none">
                        {/* Sticky Metric Label Column */}
                        <td className="p-4 text-gray-200 font-medium sticky left-0 z-10 bg-gray-800/10 backdrop-blur-sm">
                          {metric.label}
                          {showDefinitions && metric.definition && (
                            <p className="text-xs text-gray-400 mt-1">{metric.definition}</p>
                          )}
                        </td>

                        {/* Scrollable Number Columns */}
                        {periods.map((period) => {
                          const entry = metric.values[period];
                          const value = entry?.value ?? null;
                          const change = entry?.pop_change ?? null;
                          return (
                            <td key={period} className="p-4 text-right whitespace-nowrap text-gray-200">
                              {value !== null ? (
                                <div className="flex flex-col items-end">
                                  <span>{value.toLocaleString()}</span>
                                  {showChanges && change !== null && (
                                    <span
                                      className={clsx(
                                        'text-xs font-medium',
                                        change > 0
                                          ? 'text-green-700'
                                          : change < 0
                                            ? 'text-red-700'
                                            : 'text-gray-700'
                                      )}
                                    >
                                      {change > 0 ? '+' : ''}
                                      {change.toFixed(2)}%
                                    </span>
                                  )}
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>

            </table>
          </div>
        </div>
      }
    </div>
  );
};

export default FinancialStatement;