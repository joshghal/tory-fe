'use client';

import {
  TokenProfile, StrategyBacktest, AssociationRule, BacktestTrade,
} from '@/lib/tokenProfiler';
import { useRequest } from 'ahooks';
import { useState, useRef, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import axios from 'axios';
import { gsap } from 'gsap';
import HowItWorks, { HowItWorksButton } from './HowItWorks';

const API = process.env.NEXT_PUBLIC_API_URL || '';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ─── Utils ───────────────────────────────────────────────────
/** Highlight "low" / "high" keywords in rule text */
function highlightLevels(text: string) {
  return text.split(/\b(low|high)\b/gi).map((part, i) => {
    const l = part.toLowerCase();
    if (l === 'low') return <span key={i} className="text-red-400 font-semibold">{part}</span>;
    if (l === 'high') return <span key={i} className="text-green-400 font-semibold">{part}</span>;
    return part;
  });
}
/** Show max N items with expand/collapse toggle */
function ExpandableList({ items, max = 3, renderItem, className = '' }: {
  items: any[];
  max?: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, max);
  const remaining = items.length - max;

  return (
    <div className={className}>
      {visible.map((item, i) => renderItem(item, i))}
      {remaining > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 px-4 py-2.5 -ml-4 text-xs font-mono text-[var(--accent)] hover:text-[var(--accent-light)] hover:bg-[var(--accent)]/5 transition-colors flex items-center gap-1.5 rounded-lg"
        >
          {expanded ? (
            <>Show less <span className="text-[var(--text-dim)]">↑</span></>
          ) : (
            <>Show {remaining} more <span className="text-[var(--text-dim)]">↓</span></>
          )}
        </button>
      )}
    </div>
  );
}

function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (a >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  if (a >= 1) return n.toFixed(2);
  if (a >= 0.001) return n.toFixed(4);
  return n.toExponential(1);
}

interface OnchainEvents {
  exchangeFlowSpike: { detected: boolean; date: string; magnitude: number; direction: 'inflow' | 'outflow' } | null;
  anomalies: { metric: string; date: string; zScore: number; value: number; avg: number }[];
  washTradingSurge: { detected: boolean; date: string; pct: number } | null;
  vestingCandidates: { from: string; value: number; occurrences: number; interval: string }[];
  burnSpike: { detected: boolean; date: string; amount: number; avgDaily: number } | null;
}

async function fetchProfile(id: string, symbol: string): Promise<TokenProfile & { _priceSeries?: { date: string; time?: string; price: number }[]; _onchainEvents?: OnchainEvents | null; _meta?: { name: string; symbol: string; image: string } | null }> {
  const { data } = await axios.get(`${API}/profile?id=${id}&symbol=${symbol}`);
  const profile = data.data;
  profile._priceSeries = data.priceSeries;
  profile._onchainEvents = data.onchainEvents;
  profile._meta = data.meta;
  return profile;
}

// ─── Global trade modal context ──────────────────────────────
type TradeModalState = { trade: BacktestTrade; idx: number; direction: 'buy' | 'sell' } | null;
const TradeModalCtx = createContext<{ openTrade: (trade: BacktestTrade, idx: number, direction: 'buy' | 'sell') => void }>({ openTrade: () => {} });

const REGIME: Record<string, { word: string; color: string; desc: string }> = {
  EUPHORIA: { word: 'Euphoria', color: '#ff6d38', desc: 'Greed + high volume. Historically precedes sharp corrections.' },
  COMPLACENCY: { word: 'Complacent', color: '#ffc412', desc: 'Greed is high but volume is low. Could break either way.' },
  PANIC_SELLING: { word: 'Panic', color: '#4ADE80', desc: 'Extreme fear + high volume. Best buying opportunities appear here.' },
  CAPITULATION: { word: 'Capitulation', color: '#4ADE80', desc: 'Sellers exhausted. Recovery takes patience.' },
  NEUTRAL: { word: 'Neutral', color: '#4DA8FF', desc: 'No extreme sentiment. Check signals below.' },
};

// ═════════════════════════════════════════════════════════════
// SECTION 0 — BRIEFING (deterministic synthesis)
// ═════════════════════════════════════════════════════════════
function Briefing({ p, events }: { p: TokenProfile; events?: OnchainEvents | null }) {
  const regime = REGIME[p.regime] || REGIME.NEUTRAL;
  const direction = p.signal === 'bullish' ? 'bullish' : p.signal === 'bearish' ? 'bearish' : 'neutral';
  const activeStrats = p.backtests.filter(b => b.currentlyActive);
  const buyStrats = activeStrats.filter(b => b.direction === 'buy');
  const sellStrats = activeStrats.filter(b => b.direction === 'sell');

  // Top correlations (strongest signal by |r|)
  const sigCorrs = p.correlations
    .filter(c => c.significant_7d || c.significant_14d)
    .sort((a, b) => Math.abs(b.r_7d ?? b.r_14d ?? 0) - Math.abs(a.r_7d ?? a.r_14d ?? 0));
  const topBull = sigCorrs.find(c => (c.r_7d ?? c.r_14d ?? 0) > 0);
  const topBear = sigCorrs.find(c => (c.r_7d ?? c.r_14d ?? 0) < 0);

  // On-chain summary
  const exchangeFlow = events?.exchangeFlowSpike;
  const washAlert = events?.washTradingSurge;
  const anomalies = events?.anomalies || [];
  const vestings = events?.vestingCandidates || [];

  // Build sentences
  const lines: { text: string; type: 'bull' | 'bear' | 'warn' | 'info' }[] = [];

  // 1. Regime + score
  lines.push({
    text: `${p.symbol} is in ${regime.word.toLowerCase()} with a ${direction} score of ${p.score}/100.`,
    type: direction === 'bullish' ? 'bull' : direction === 'bearish' ? 'bear' : 'info',
  });

  // 2. Active strategies
  if (activeStrats.length > 0) {
    if (buyStrats.length > 0 && sellStrats.length === 0) {
      const best = buyStrats.sort((a, b) => b.winRate - a.winRate)[0];
      lines.push({
        text: `${buyStrats.length} buy ${buyStrats.length === 1 ? 'strategy' : 'strategies'} active right now — strongest has ${(best.winRate * 100).toFixed(0)}% win rate with ${best.avgReturnPerTrade > 0 ? '+' : ''}${best.avgReturnPerTrade.toFixed(1)}% avg return.`,
        type: 'bull',
      });
    } else if (sellStrats.length > 0 && buyStrats.length === 0) {
      const best = sellStrats.sort((a, b) => b.winRate - a.winRate)[0];
      lines.push({
        text: `${sellStrats.length} sell ${sellStrats.length === 1 ? 'strategy' : 'strategies'} active — strongest has ${(best.winRate * 100).toFixed(0)}% win rate. Conditions favor shorting.`,
        type: 'bear',
      });
    } else if (buyStrats.length > 0 && sellStrats.length > 0) {
      lines.push({
        text: `Mixed signals: ${buyStrats.length} buy and ${sellStrats.length} sell strategies active simultaneously. The data is conflicted.`,
        type: 'warn',
      });
    }
  } else {
    lines.push({
      text: `No strategies active — ${p.backtests.length} monitored, none have all conditions met.`,
      type: 'info',
    });
  }

  // 3. Top signals
  if (topBull && topBear) {
    lines.push({
      text: `Strongest bull signal: ${topBull.label}. Strongest bear signal: ${topBear.label}.`,
      type: 'info',
    });
  } else if (topBull) {
    lines.push({ text: `Strongest signal: ${topBull.label} (bullish).`, type: 'bull' });
  } else if (topBear) {
    lines.push({ text: `Strongest signal: ${topBear.label} (bearish).`, type: 'bear' });
  }

  // 4. On-chain events
  if (exchangeFlow?.detected) {
    lines.push({
      text: exchangeFlow.direction === 'outflow'
        ? `Exchange outflow spiking (${exchangeFlow.magnitude.toFixed(1)}σ) — holders are withdrawing to accumulate.`
        : `Exchange inflow spiking (${exchangeFlow.magnitude.toFixed(1)}σ) — tokens moving to exchanges, selling pressure ahead.`,
      type: exchangeFlow.direction === 'outflow' ? 'bull' : 'bear',
    });
  }

  if (washAlert?.detected) {
    lines.push({
      text: `${washAlert.pct}% of on-chain volume is wash trading — real activity is significantly lower than it appears.`,
      type: 'warn',
    });
  }

  if (anomalies.length > 0) {
    const a = anomalies[0];
    lines.push({
      text: `Anomaly: ${a.metric} is ${a.zScore > 0 ? `${(a.value / a.avg).toFixed(1)}x above` : `${(a.avg / a.value).toFixed(1)}x below`} its 30-day average.`,
      type: 'warn',
    });
  }

  if (vestings.length > 0) {
    const v = vestings[0];
    lines.push({
      text: `Vesting detected: ${v.from} sends ${fmt(v.value)} tokens ${v.interval} — scheduled sell pressure.`,
      type: 'bear',
    });
  }

  if (lines.length <= 1) return null;

  const colors = { bull: 'text-green-400', bear: 'text-red-400', warn: 'text-[var(--accent-orange)]', info: 'text-[var(--accent)]' };
  const icons = { bull: '↑', bear: '↓', warn: '⚠', info: '→' };

  return (
    <div className="s">
      <h4 className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-[0.15em] mb-4">Briefing</h4>
      <div className="card-dark p-5 space-y-3">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className={`text-xs mt-0.5 ${colors[line.type]}`}>{icons[line.type]}</span>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">{line.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SECTION 1 — THE SCORE
// ═════════════════════════════════════════════════════════════
function TheScore({ p }: { p: TokenProfile }) {
  const regime = REGIME[p.regime] || REGIME.NEUTRAL;
  const activeStrats = p.backtests.filter(b => b.currentlyActive);
  const sigCount = p.correlations.filter(c => c.significant_7d || c.significant_14d).length;

  return (
    <div className="s">
      {/* Regime + stats */}
      <div data-guide="regime">
        <div className="flex items-baseline gap-4 mb-4">
          <span className="text-3xl font-bold" style={{ color: regime.color, fontFamily: 'var(--font-display)' }}>
            {regime.word}
          </span>
          <span className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-[0.15em]">Market regime</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-8">{regime.desc}</p>

        <div className="flex gap-8 text-xs font-mono text-[var(--text-dim)]">
          <div>
            <span className="text-lg font-bold text-[var(--text)]">{p.dataPoints}</span>
            <span className="block mt-0.5">days analyzed</span>
          </div>
          <div>
            <span className="text-lg font-bold text-[var(--text)]">{sigCount}/{p.correlations.length}</span>
            <span className="block mt-0.5">metrics significant</span>
          </div>
          <div>
            <span className="text-lg font-bold text-[var(--text)]">{p.backtests.length}</span>
            <span className="block mt-0.5">strategies tested</span>
          </div>
          <div>
            <span className="text-lg font-bold text-[var(--text)]">{activeStrats.length}</span>
            <span className="block mt-0.5">active now</span>
          </div>
        </div>
      </div>

      {/* Active strategies — full width below */}
      {activeStrats.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-mono text-green-400 uppercase tracking-[0.15em]">
              Active right now
            </span>
          </div>

          {activeStrats.map((bt, i) => (
            <div key={i} className="mb-6 pb-6 border-b border-[var(--border)] last:border-0 last:pb-0">
              <p className="text-base text-[var(--text-muted)] leading-relaxed">
                <span className={`font-bold ${bt.direction === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                  {bt.direction === 'buy' ? 'Buy' : 'Sell'}
                </span>
                {' '}when{' '}
                {bt.currentConditions.map((c, j) => (
                  <span key={c.label}>
                    {j > 0 && (j === bt.currentConditions.length - 1 ? ' and ' : ', ')}
                    <span className="text-[var(--text)]">{c.label}</span>
                    <span className="text-[var(--text-dim)]"> is </span>{highlightLevels(c.level)}
                  </span>
                ))}
              </p>
              <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 mt-3">
                <span>
                  <span className="text-xl font-mono font-bold text-green-400">{(bt.winRate * 100).toFixed(0)}%</span>
                  <span className="text-xs text-[var(--text-dim)] ml-2">win rate ({Math.round(bt.winRate * bt.totalTrades)}/{bt.totalTrades})</span>
                </span>
                <span>
                  <span className="text-xl font-mono font-bold text-[var(--text)]">{bt.holdDays}d</span>
                  <span className="text-xs text-[var(--text-dim)] ml-2">hold</span>
                </span>
                <span>
                  <span className={`text-xl font-mono font-bold ${bt.avgReturnPerTrade > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {bt.avgReturnPerTrade > 0 ? '+' : ''}{bt.avgReturnPerTrade.toFixed(1)}%
                  </span>
                  <span className="text-xs text-[var(--text-dim)] ml-2">avg per trade</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeStrats.length === 0 && (
        <p className="text-sm text-[var(--text-dim)] mt-10">
          No strategies active — {p.backtests.length} monitored, waiting for conditions to align.
        </p>
      )}

      <div className="mt-12" data-guide="active">
        <HowItWorksButton step={0} />
      </div>

      {/* Insights — plain-language synthesis */}
      {p.insights.length > 0 && (
        <div className="mt-16 pt-10 border-t border-[var(--border)]">
          <h4 className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-[0.15em] mb-6">What this means</h4>
          <div className="space-y-4">
            {[...p.insights].sort((a, b) => {
              const order = { high: 0, medium: 1, low: 2 };
              return order[a.confidence] - order[b.confidence];
            }).map((ins, i) => {
              const icon = ins.type === 'bullish' ? '↑' : ins.type === 'bearish' ? '↓' : ins.type === 'warning' ? '⚠' : '→';
              const color = ins.type === 'bullish' ? 'text-green-400' : ins.type === 'bearish' ? 'text-red-400' : ins.type === 'warning' ? 'text-[var(--accent-orange)]' : 'text-[var(--accent)]';
              const confLabel = ins.confidence === 'high' ? 'High confidence' : ins.confidence === 'medium' ? 'Medium confidence' : 'Low confidence';
              return (
                <div key={i} className="card-dark p-5">
                  <div className="flex items-start gap-3">
                    <span className={`text-sm ${color} mt-0.5`}>{icon}</span>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-sm font-bold text-[var(--text)]">{ins.title}</span>
                        <span className={`text-xs font-mono ${ins.confidence === 'high' ? 'text-[var(--text-muted)]' : 'text-[var(--text-dim)]'}`}>{confLabel}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">{ins.body}</p>
                      <p className="text-xs text-[var(--accent)] mt-2 leading-relaxed">{ins.action}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SECTION 2 — SIGNALS
// ═════════════════════════════════════════════════════════════
function Signals({ p }: { p: TokenProfile }) {
  const sig = p.correlations
    .filter(c => c.significant_7d || c.significant_14d)
    .sort((a, b) => Math.abs(b.r_7d ?? b.r_14d ?? 0) - Math.abs(a.r_7d ?? a.r_14d ?? 0));
  const nosig = p.correlations.filter(c => !c.significant_7d && !c.significant_14d);

  return (
    <div className="s">
      {sig.length === 0 ? (
        <p className="text-[var(--text-dim)]">No statistically proven signals in this window.</p>
      ) : (
        <ExpandableList
          items={sig}
          max={3}
          renderItem={(c, _i) => {
            const r = c.r_7d ?? c.r_14d ?? 0;
            const absR = Math.abs(r);
            const strength = absR > 0.5 ? 'Very strong' : absR > 0.3 ? 'Strong' : absR > 0.15 ? 'Moderate' : 'Weak';
            const period = c.significant_7d ? '7 days' : '14 days';

            return (
              <div key={c.metric} className="py-4 border-b border-[var(--border)]">
                <div className="flex items-baseline justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${c.direction === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                      {c.direction === 'bullish' ? '↑' : '↓'}
                    </span>
                    <span className="text-sm text-[var(--text)]">{c.label}</span>
                    {ONCHAIN_KEYS.has(c.metric) && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400 uppercase tracking-wider">on-chain</span>
                    )}
                    {c.usedInBacktest && (
                      <span className="text-xs font-mono text-[var(--accent)] opacity-60">BACKTESTED</span>
                    )}
                  </div>
                  <span className={`text-xs font-mono ${absR > 0.3 ? 'text-[var(--text-muted)]' : 'text-[var(--text-dim)]'}`}>
                    {strength}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">{c.interpretation}</p>
                <p className="text-xs text-[var(--text-dim)] font-mono mt-1">
                  r = {r.toFixed(3)} over {period} · p = {(c.significant_7d ? c.p_7d : c.p_14d)?.toFixed(4) || '< 0.05'}
                </p>
              </div>
            );
          }}
        />
      )}

      {nosig.length > 0 && (
        <p className="text-xs text-[var(--text-dim)] mt-6 font-mono">
          No signal: {nosig.map(c => c.label).join(' · ')}
        </p>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SECTION 2.5 — ON-CHAIN METRICS
// ═════════════════════════════════════════════════════════════
const ONCHAIN_KEYS = new Set([
  'supplyInMotion', 'tokenVelocity', 'senderReceiverRatio', 'avgTransferSize',
  'retailRatio', 'exchangeNetFlow', 'washTradingPct', 'newAddressPct',
  'onchainTxCount', 'onchainActiveAddrs',
]);

const ONCHAIN_EXPLAINERS: Record<string, { desc: string; bullish: string; bearish: string }> = {
  exchangeNetFlow:      { desc: 'Net token flow from exchanges', bullish: 'Outflow from exchanges — holders withdrawing to accumulate', bearish: 'Inflow to exchanges — holders depositing to sell' },
  supplyInMotion:       { desc: '% of total supply transferred today', bullish: 'High activity correlates with price increases for this token', bearish: 'High activity correlates with price drops for this token' },
  tokenVelocity:        { desc: 'How fast tokens change hands', bullish: 'Higher velocity predicts price increases here', bearish: 'Higher velocity predicts price drops — speculative frenzy' },
  senderReceiverRatio:  { desc: 'Unique receivers / unique senders', bullish: 'More wallets receiving than sending — accumulation', bearish: 'More wallets sending than receiving — distribution' },
  avgTransferSize:      { desc: 'Average tokens per transfer', bullish: 'Larger transfers = institutional interest entering', bearish: 'Larger transfers preceded price drops — whale dumping' },
  retailRatio:          { desc: '% of transfers under 1,000 tokens', bullish: 'Retail activity rising alongside price — momentum', bearish: 'Retail flooding in — often a top signal' },
  washTradingPct:       { desc: '% of volume in round-trip pairs (A→B→A)', bullish: 'Low wash trading — volume is organic', bearish: 'High wash trading — real activity is lower than it appears' },
  newAddressPct:        { desc: '% of addresses never seen in 90 days', bullish: 'New wallets appearing — fresh interest and adoption', bearish: 'New address surge preceded drops — hype without conviction' },
  onchainTxCount:       { desc: 'Total ERC20 transfers across all chains', bullish: 'Rising tx count correlates with price appreciation', bearish: 'Rising tx count preceded sell-offs for this token' },
  onchainActiveAddrs:   { desc: 'Unique wallet addresses transacting', bullish: 'More active wallets = broader participation = bullish', bearish: 'Address spikes preceded drops — exit liquidity' },
};

function OnchainLiveSection({ tokenId, symbol, profile }: { tokenId: string; symbol: string; profile: TokenProfile & { _onchainEvents?: OnchainEvents | null } }) {
  const [onchainData, setOnchainData] = useState<{
    events: OnchainEvents | null;
    metrics?: Record<string, { date: string; value: number }[]>;
  } | null>(null);
  const [polling, setPolling] = useState(false);
  const [progress, setProgress] = useState<{
    totalChains: number; completedChains: number; currentChain: string; totalTransfers: number;
    currentChainChunks: number; currentChainChunksDone: number; currentChainTransfers: number;
  } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Single effect — ONE /api/onchain call, then poll progress only
  useEffect(() => {
    let cancelled = false;
    let poller: ReturnType<typeof setInterval> | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const abortController = new AbortController();

    const cleanup = () => {
      cancelled = true;
      abortController.abort();
      if (poller) { clearInterval(poller); poller = null; }
      if (timer) { clearInterval(timer); timer = null; }
    };

    const done = (data?: { events: OnchainEvents | null; metrics?: Record<string, { date: string; value: number }[]> }) => {
      if (data) setOnchainData(data);
      setPolling(false);
      if (poller) { clearInterval(poller); poller = null; }
      if (timer) { clearInterval(timer); timer = null; }
    };

    // ONE call to /api/onchain — returns cached, triggers fetch, or says no deployments
    axios.get(`${API}/onchain?id=${tokenId}`, { timeout: 120000, signal: abortController.signal })
      .then(res => {
        if (cancelled) return;
        const d = res.data;
        if (d?.message !== 'SUCCESS') return done();

        // Got data (cached or just completed)
        if (d.summary?.totalTransfers > 0) {
          return done({ events: d.events, metrics: d.metrics });
        }
        // No ERC20 deployments
        if (d.summary?.totalChains === 0) return done();
        // Cached but empty
        if (d.cached) return done();

        // Fetch is running — start polling progress
        setPolling(true);
        timer = setInterval(() => { if (!cancelled) setElapsed(prev => prev + 1); }, 1000);

        let pollCount = 0;
        poller = setInterval(async () => {
          if (cancelled) return;
          if (++pollCount > 40) return done();

          try {
            const prog = await axios.get(`${API}/onchain/progress?id=${tokenId}`, { timeout: 3000 });
            if (cancelled) return;
            if (prog.data.status === 'fetching') {
              setProgress(prog.data);
            } else {
              // idle = done. Get the cached result.
              try {
                const final = await axios.get(`${API}/onchain?id=${tokenId}`, { timeout: 5000 });
                if (!cancelled && final.data?.summary?.totalTransfers > 0) {
                  done({ events: final.data.events, metrics: final.data.metrics });
                } else {
                  done();
                }
              } catch { done(); }
            }
          } catch {}
        }, 3000);
      })
      .catch(() => { if (!cancelled) done(); });

    return cleanup;
  }, [tokenId]);

  const displayEvents = onchainData?.events || profile._onchainEvents || null;

  return (
    <div className="s" data-guide="onchain">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="display display-sm"><span className="text-[var(--accent)]">/</span> On-chain</h3>
        <HowItWorksButton step={3} />
      </div>
      <p className="text-xs text-[var(--text-dim)] mb-6">
        Real blockchain transfer data. Exchange flows, whale activity, and anomaly detection across {symbol}&apos;s deployed chains.
      </p>

      {polling ? (
        <div className="card-dark p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">
              {progress ? `Scanning ${progress.currentChain}...` : 'Starting blockchain scan...'}
            </span>
            <span className="text-xs font-mono text-[var(--text-dim)] ml-auto">{elapsed}s</span>
          </div>

          {progress ? (
            <>
              {/* Overall chain progress */}
              <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                  style={{ width: `${progress.totalChains > 0
                    ? ((progress.completedChains + (progress.currentChainChunks > 0 ? progress.currentChainChunksDone / progress.currentChainChunks : 0)) / progress.totalChains) * 100
                    : 0}%` }}
                />
              </div>

              {/* Chunk detail for current chain */}
              {progress.currentChainChunks > 0 && progress.completedChains < progress.totalChains && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-[var(--accent)]">{progress.currentChain}</span>
                  <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)]/50 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.currentChainChunksDone / progress.currentChainChunks) * 100}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-mono text-[var(--text-dim)]">
                    {progress.currentChainChunksDone}/{progress.currentChainChunks}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-dim)]">
                <span>{progress.completedChains}/{progress.totalChains} chains</span>
                <span>{(progress.totalTransfers + progress.currentChainTransfers).toLocaleString()} transfers</span>
                <span>{elapsed}s</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--text-dim)] font-mono">Discovering chain deployments...</p>
          )}

          <p className="text-[12px] text-[var(--text-dim)] mt-4">
            First scan takes ~60-90s. Results cached for 1 hour.
          </p>
        </div>
      ) : (
        <OnchainSection p={profile} events={displayEvents} rawMetrics={onchainData?.metrics} />
      )}
    </div>
  );
}

function OnchainSection({ p, events, rawMetrics }: { p: TokenProfile; events?: OnchainEvents | null; rawMetrics?: Record<string, { date: string; value: number }[]> }) {
  const onchainCorrelations = p.correlations.filter(c => ONCHAIN_KEYS.has(c.metric));
  const hasEvents = events && (
    events.exchangeFlowSpike?.detected ||
    events.anomalies?.length > 0 ||
    events.washTradingSurge?.detected ||
    events.vestingCandidates?.length > 0 ||
    events.burnSpike?.detected
  );

  if (onchainCorrelations.length === 0 && !hasEvents) {
    return (
      <p className="text-xs text-[var(--text-dim)] font-mono">
        No on-chain data available. Token may not have ERC20 deployments on supported chains.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event alerts */}
      {hasEvents && (
        <div className="space-y-2">
          {events!.exchangeFlowSpike?.detected && (
            <div className={`px-4 py-3 rounded-lg border ${events!.exchangeFlowSpike.direction === 'inflow' ? 'border-red-400/20 bg-red-400/5' : 'border-green-400/20 bg-green-400/5'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-mono font-bold ${events!.exchangeFlowSpike.direction === 'inflow' ? 'text-red-400' : 'text-green-400'}`}>
                  EXCHANGE {events!.exchangeFlowSpike.direction === 'inflow' ? 'INFLOW' : 'OUTFLOW'} SPIKE
                </span>
                <span className="text-xs font-mono text-[var(--text-dim)]">{events!.exchangeFlowSpike.magnitude.toFixed(1)}σ</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {events!.exchangeFlowSpike.direction === 'inflow'
                  ? 'Large amounts moving to exchanges — historically precedes selling pressure.'
                  : 'Large amounts withdrawn from exchanges — holders accumulating.'}
              </p>
            </div>
          )}

          {events!.washTradingSurge?.detected && (
            <div className="px-4 py-3 rounded-lg border border-[var(--accent-orange)]/20 bg-[var(--accent-orange)]/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-[var(--accent-orange)]">WASH TRADING DETECTED</span>
                <span className="text-xs font-mono text-[var(--text-dim)]">{events!.washTradingSurge.pct}% of volume</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {events!.washTradingSurge.pct}% of today&apos;s transfer volume is round-trip (A→B→A). Real activity is significantly lower than it appears.
              </p>
            </div>
          )}

          {events!.anomalies?.map((a, i) => (
            <div key={i} className="px-4 py-3 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-[var(--accent)]">ANOMALY</span>
                <span className="text-xs font-mono text-[var(--text-dim)]">{a.zScore > 0 ? '+' : ''}{a.zScore.toFixed(1)}σ</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {a.metric} is {a.zScore > 0 ? 'unusually high' : 'unusually low'} today ({fmt(a.value)}) vs 30-day average ({fmt(a.avg)}).
              </p>
            </div>
          ))}

          {events!.burnSpike?.detected && (
            <div className="px-4 py-3 rounded-lg border border-purple-400/20 bg-purple-400/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-purple-400">BURN SPIKE</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {fmt(events!.burnSpike.amount)} tokens burned today — {(events!.burnSpike.amount / events!.burnSpike.avgDaily).toFixed(1)}x the daily average.
              </p>
            </div>
          )}

          {events!.vestingCandidates?.length > 0 && (
            <div className="px-4 py-3 rounded-lg border border-[var(--border)] bg-white/[0.02]">
              <span className="text-xs font-mono font-bold text-[var(--text-muted)]">VESTING SCHEDULES DETECTED</span>
              <div className="mt-2 space-y-1">
                {events!.vestingCandidates.map((v, i) => (
                  <p key={i} className="text-xs text-[var(--text-dim)] font-mono">
                    {v.from} sends {fmt(v.value)} tokens {v.interval} ({v.occurrences} occurrences)
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Correlation grid */}
      {onchainCorrelations.length > 0 && (
        <div className="space-y-1">
          {onchainCorrelations
            .sort((a, b) => Math.abs(b.r_7d ?? b.r_14d ?? 0) - Math.abs(a.r_7d ?? a.r_14d ?? 0))
            .map(c => {
              const r = c.r_7d ?? c.r_14d ?? 0;
              const sig = c.significant_7d || c.significant_14d;
              const abs = Math.abs(r);
              const strength = abs > 0.3 ? 'Strong' : abs > 0.15 ? 'Moderate' : abs > 0.05 ? 'Weak' : 'None';
              const color = r > 0 ? 'text-green-400' : r < 0 ? 'text-red-400' : 'text-[var(--text-dim)]';

              // Compute stats from raw time series
              const series = rawMetrics?.[c.metric];
              const last7 = series?.slice(-7);
              const today = series?.[series.length - 1]?.value;
              const allVals = series?.map(p => p.value).sort((a, b) => a - b);
              const median = allVals && allVals.length > 0 ? allVals[Math.floor(allVals.length / 2)] : undefined;
              const todayVsMedian = today !== undefined && median !== undefined && median !== 0
                ? ((today - median) / Math.abs(median)) * 100 : undefined;

              return (
                <div key={c.metric} className="py-3 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--text)]">{c.label}</span>
                        {sig && <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">SIG</span>}
                      </div>
                      <p className="text-[12px] text-[var(--text-dim)] mt-0.5">
                        {ONCHAIN_EXPLAINERS[c.metric]
                          ? `${ONCHAIN_EXPLAINERS[c.metric].desc} — ${r > 0 ? ONCHAIN_EXPLAINERS[c.metric].bullish : ONCHAIN_EXPLAINERS[c.metric].bearish}`
                          : c.interpretation}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-mono font-bold ${color}`}>r = {r > 0 ? '+' : ''}{r.toFixed(3)}</span>
                      <p className="text-[12px] text-[var(--text-dim)]">{strength}</p>
                    </div>
                    <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden shrink-0">
                      <div
                        className={`h-full rounded-full ${r > 0 ? 'bg-green-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(abs * 300, 100)}%`, opacity: sig ? 1 : 0.4 }}
                      />
                    </div>
                  </div>

                  {/* Mini 7d bar chart + median */}
                  {last7 && last7.length > 0 && (() => {
                    const maxVal = Math.max(...last7.map(p => p.value), median || 0);
                    const BAR_H = 48; // px
                    return (
                      <div className="mt-3 flex items-end gap-2">
                        <div className="flex items-end gap-[3px] flex-1" style={{ height: BAR_H }}>
                          {last7.map((p, i) => {
                            const hPx = maxVal > 0 ? Math.max((p.value / maxVal) * BAR_H, 3) : 3;
                            const prev = i > 0 ? last7[i - 1].value : p.value;
                            const isToday = i === last7.length - 1;
                            const barColor = isToday ? 'bg-[var(--accent)]' : p.value > prev ? 'bg-green-400/60' : p.value < prev ? 'bg-red-400/60' : 'bg-[var(--text-dim)]/30';
                            return (
                              <div key={p.date} className="flex-1 flex flex-col items-center gap-1">
                                <div className={`w-full rounded-sm ${barColor} transition-all`} style={{ height: hPx }} />
                                <span className={`text-[10px] font-mono ${isToday ? 'text-[var(--text)]' : 'text-[var(--text-dim)]'}`}>{p.date.slice(8)}</span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Median + vs median */}
                        <div className="shrink-0 text-right pl-3 border-l border-[var(--border)]">
                          <span className="text-[10px] text-[var(--text-dim)] block">today</span>
                          <span className="text-sm font-mono font-bold text-[var(--text)]">{fmt(today!)}</span>
                          {median !== undefined && (
                            <>
                              <span className="text-[10px] text-[var(--text-dim)] block mt-1">median</span>
                              <span className="text-[12px] font-mono text-[var(--text-muted)]">{fmt(median)}</span>
                              {todayVsMedian !== undefined && (
                                <span className={`text-[12px] font-mono block ${todayVsMedian > 20 ? 'text-green-400' : todayVsMedian < -20 ? 'text-red-400' : 'text-[var(--text-dim)]'}`}>
                                  {todayVsMedian > 0 ? '+' : ''}{todayVsMedian.toFixed(0)}%
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SECTION 3 — STRATEGIES
// ═════════════════════════════════════════════════════════════
function StrategiesSection({ backtests }: { backtests: StrategyBacktest[] }) {
  if (backtests.length === 0) {
    return <div className="s"><p className="text-[var(--text-dim)]">Insufficient data for backtesting.</p></div>;
  }

  return (
    <ExpandableList
      items={backtests}
      max={3}
      className="s space-y-10"
      renderItem={(bt, i) => <Strategy key={i} bt={bt} idx={i} />}
    />
  );
}

function Strategy({ bt, idx }: { bt: StrategyBacktest; idx: number }) {
  const [open, setOpen] = useState(false);

  const equityData = bt.equityCurve.map((v, i) => ({
    t: i, strategy: v, hodl: bt.hodlCurve[i] ?? v,
  }));

  return (
    <div className="border-b border-[var(--border)] pb-10 last:border-0">
      {/* Header — always visible */}
      <div className="cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--text-dim)]">#{idx + 1}</span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 ${
              bt.grade === 'A' ? 'text-green-400 bg-green-400/8' :
              bt.grade === 'B' ? 'text-[var(--accent)] bg-[var(--accent)]/8' :
              'text-[var(--text-dim)] bg-white/5'
            }`}>{bt.grade}</span>
            {bt.currentlyActive && (
              <span className="text-xs font-mono text-green-400 animate-pulse">● LIVE</span>
            )}
          </div>
          <span className="text-xs text-[var(--text-dim)] cursor-pointer">{open ? 'collapse' : 'expand'}</span>
        </div>

        {/* Rule as sentence */}
        <p className="text-base text-[var(--text-muted)] mb-5">
          <span className={`font-bold ${bt.direction === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
            {bt.direction === 'buy' ? 'Buy' : 'Sell'}
          </span>
          {' '}when {highlightLevels(bt.trades[0]?.rule || '')}
          <span className="text-[var(--text-dim)]"> · hold {bt.holdDays}d</span>
        </p>

        {/* Numbers inline — large, with context underneath */}
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <Metric
            val={`${(bt.winRate * 100).toFixed(0)}%`}
            label="win rate"
            sub={`${Math.round(bt.winRate * bt.totalTrades)} of ${bt.totalTrades} trades won`}
            good={bt.winRate >= 0.5}
          />
          <Metric
            val={`${bt.avgReturnPerTrade > 0 ? '+' : ''}${bt.avgReturnPerTrade.toFixed(1)}%`}
            label="avg return"
            sub={`$${bt.expectancyPer1000.toFixed(0)} earned per $1,000 risked`}
            good={bt.avgReturnPerTrade > 0}
          />
          <Metric
            val={`-${(bt.trades.reduce((s, t) => s + t.maxDrawdown, 0) / bt.trades.length * 100).toFixed(1)}%`}
            label="avg risk"
            sub={`Average intraday drop per trade`}
            good={false}
          />
          <Metric
            val={`${(bt.totalReturn * 100).toFixed(1)}%`}
            label="total"
            sub={`$1,000 became $${(1000 * (1 + bt.totalReturn)).toFixed(0)}`}
            good={bt.totalReturn > 0}
          />
          <Metric
            val={`-${(bt.maxDrawdown * 100).toFixed(1)}%`}
            label="max loss"
            sub={`Worst intraday drop across ${bt.totalTrades} trades`}
            good={false}
          />
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="mt-8 space-y-10">
          {/* Current conditions */}
          {bt.currentConditions.length > 0 && (
            <div>
              <SectionTag>Current conditions</SectionTag>
              <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
                {bt.currentConditions.map((c) => {
                  const met = c.level === 'high' ? c.value > c.median : c.value <= c.median;
                  return (
                    <div key={c.label}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono ${met ? 'text-green-400' : 'text-red-400'}`}>
                          {met ? '✓' : '✗'}
                        </span>
                        <span className="text-sm text-[var(--text)]">{c.label}</span>
                      </div>
                      <p className="text-xs text-[var(--text-dim)] ml-6">
                        now {c.formatted} · threshold {c.level === 'high' ? '>' : '≤'} {fmt(c.median)} · {c.pctVsMedian > 0 ? '+' : ''}{c.pctVsMedian}% vs median
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chart */}
          <div>
            <SectionTag>Performance</SectionTag>
            <p className="text-xs text-[var(--text-dim)] mt-1 mb-4">
              Solid line = strategy. Dashed = buy & hold. Starting at $1,000.
            </p>
            <div className="h-[200px]">
              <ResponsiveContainer>
                <AreaChart data={equityData}>
                  <defs>
                    <linearGradient id={`g-${bt.ruleId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={bt.totalReturn > 0 ? '#4ADE80' : '#F87171'} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={bt.totalReturn > 0 ? '#4ADE80' : '#F87171'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{ fill: 'rgba(253,249,240,0.15)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(253,249,240,0.15)', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `$${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}`} width={45} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                    formatter={(v: number, n: string) => [`$${v.toFixed(0)}`, n === 'hodl' ? 'Buy & hold' : 'Strategy']}
                    labelFormatter={(l) => `Trade ${l}`}
                  />
                  <ReferenceLine y={1000} stroke="rgba(253,249,240,0.06)" />
                  <Area type="monotone" dataKey="hodl" stroke="rgba(253,249,240,0.45)" fill="none" strokeDasharray="6 4" strokeWidth={1} name="hodl" />
                  <Area type="monotone" dataKey="strategy" stroke={bt.totalReturn > 0 ? '#4ADE80' : '#F87171'}
                    fill={`url(#g-${bt.ruleId})`} strokeWidth={2} name="strategy"
                    dot={{ r: 2.5, fill: 'var(--bg)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hold periods */}
          {bt.holdComparison.length > 0 && (
            <div>
              <SectionTag>
                Hold period · best: {bt.holdDays}d
                {bt.holdComparison.length === 1 && <span className="font-normal text-[var(--text-dim)]"> (only viable)</span>}
              </SectionTag>
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {bt.holdComparison.map((h) => (
                  <div key={h.days} className={`shrink-0 py-2 px-3 min-w-[64px] text-center ${
                    h.days === bt.holdDays ? 'border-b-2 border-green-400' : 'border-b border-[var(--border)]'
                  }`}>
                    <p className={`text-xs font-mono font-bold ${h.days === bt.holdDays ? 'text-[var(--text)]' : 'text-[var(--text-dim)]'}`}>{h.days}d</p>
                    <p className={`text-xs font-mono ${h.avgReturn > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      avg {h.avgReturn > 0 ? '+' : ''}{h.avgReturn.toFixed(1)}%
                    </p>
                    <p className="text-xs text-[var(--text-dim)]">{(h.winRate * 100).toFixed(0)}% · {h.trades}t</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trades */}
          <TradeList trades={bt.trades} direction={bt.direction} />

          {/* Fine print */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-dim)] font-mono">
            <span>profit factor {bt.profitFactor.toFixed(2)}</span>
            <span>sharpe {bt.sharpeRatio.toFixed(2)}</span>
            <span>CI {(bt.winRateCi[0] * 100).toFixed(0)}–{(bt.winRateCi[1] * 100).toFixed(0)}%</span>
            <span>stable {bt.foldsProfitable}/{bt.foldsTotal}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SECTION 4 — PATTERNS
// ═════════════════════════════════════════════════════════════
function PatternsSection({ rules }: { rules: AssociationRule[] }) {
  if (rules.length === 0) return null;
  const buy = rules.filter(r => r.outcome.includes('rises'));
  const sell = rules.filter(r => r.outcome.includes('falls'));

  return (
    <div className="s">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
        <div>
          <span className="text-xs font-mono text-green-400 uppercase tracking-[0.15em]">Bullish ({buy.length})</span>
          <ExpandableList
            items={buy}
            max={3}
            className="mt-3 space-y-3"
            renderItem={(r, i) => <PatternLine key={i} rule={r} />}
          />
          {buy.length === 0 && <p className="text-xs text-[var(--text-dim)] mt-3">—</p>}
        </div>
        <div>
          <span className="text-xs font-mono text-red-400 uppercase tracking-[0.15em]">Bearish ({sell.length})</span>
          <ExpandableList
            items={sell}
            max={3}
            className="mt-3 space-y-3"
            renderItem={(r, i) => <PatternLine key={i} rule={r} />}
          />
          {sell.length === 0 && <p className="text-xs text-[var(--text-dim)] mt-3">—</p>}
        </div>
      </div>
    </div>
  );
}

const ONCHAIN_LABELS = ['Supply In Motion', 'Token Velocity', 'Sender/Receiver Ratio', 'Avg Transfer Size',
  'Retail Ratio', 'Exchange Net Flow', 'Wash Trading', 'New Address', 'On-chain Tx Count', 'On-chain Active Addresses'];

function PatternLine({ rule }: { rule: AssociationRule }) {
  const hasOnchain = ONCHAIN_LABELS.some(l => rule.condition.includes(l));
  return (
    <div className="py-2 border-b border-[var(--border)] last:border-0">
      <div className="flex items-start gap-2">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed flex-1">{highlightLevels(rule.plain)}</p>
        {hasOnchain && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400 uppercase tracking-wider shrink-0 mt-0.5">on-chain</span>
        )}
      </div>
      <p className="text-xs text-[var(--text-dim)] font-mono mt-1">
        {rule.lift.toFixed(1)}× lift · {rule.confidence}% accuracy · {rule.sampleSize} samples
        {rule.backtested && <span className="text-[var(--accent)] ml-2">backtested ✓</span>}
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SECTION 5 — RAW DATA
// ═════════════════════════════════════════════════════════════
function RawData({ p }: { p: TokenProfile }) {
  const [show, setShow] = useState(false);

  return (
    <div className="s">
      <button onClick={() => setShow(!show)} className="text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
        {show ? '− Hide raw data' : '+ Show raw data'}
      </button>

      {show && (
        <div className="mt-6 space-y-8">
          {/* All correlations */}
          <div>
            <SectionTag>All correlations ({p.correlations.length})</SectionTag>
            <div className="mt-3 font-mono text-xs">
              <div className="grid grid-cols-[1fr_60px_60px_70px_70px] gap-x-2 text-[var(--text-dim)] border-b border-[var(--border)] pb-1 mb-1">
                <span>metric</span>
                <span className="text-right">r (7d)</span>
                <span className="text-right">r (14d)</span>
                <span>signal</span>
                <span>status</span>
              </div>
              {p.correlations.map(c => (
                <div key={c.metric} className="grid grid-cols-[1fr_60px_60px_70px_70px] gap-x-2 py-1 border-b border-[var(--border)] last:border-0">
                  <span className="text-[var(--text-muted)] truncate">{c.label}</span>
                  <span className={`text-right ${c.significant_7d ? (c.r_7d! > 0 ? 'text-green-400' : 'text-red-400') : 'text-[var(--text-dim)]'}`}>
                    {c.r_7d !== null ? c.r_7d.toFixed(3) : '—'}
                  </span>
                  <span className={`text-right ${c.significant_14d ? (c.r_14d! > 0 ? 'text-green-400' : 'text-red-400') : 'text-[var(--text-dim)]'}`}>
                    {c.r_14d !== null ? c.r_14d.toFixed(3) : '—'}
                  </span>
                  <span className={c.direction === 'bullish' ? 'text-green-400' : c.direction === 'bearish' ? 'text-red-400' : 'text-[var(--text-dim)]'}>
                    {c.direction}
                  </span>
                  <span className={c.usedInBacktest ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}>
                    {c.usedInBacktest ? 'tested' : c.significant_7d || c.significant_14d ? 'sig' : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cross-correlations */}
          {p.crossCorrelations.filter(c => c.significant).length > 0 && (
            <div>
              <SectionTag>Metric relationships ({p.crossCorrelations.filter(c => c.significant).length} significant)</SectionTag>
              <p className="text-xs text-[var(--text-dim)] mt-1 mb-3">
                How metrics relate to each other (not to price). Values near 1.0 = move together (redundant). Near -1.0 = move opposite. Near 0 = independent signals.
              </p>
              <div className="mt-3 font-mono text-xs">
                <div className="flex justify-between py-1 text-[var(--text-dim)] border-b border-[var(--border)] mb-1">
                  <span>metric pair</span>
                  <span>correlation</span>
                </div>
                {p.crossCorrelations.filter(c => c.significant).slice(0, 15).map((c, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-[var(--text-muted)]">{c.labelA} × {c.labelB}</span>
                    <div className="flex items-center gap-2">
                      <span className={Math.abs(c.r) > 0.7 ? 'text-[var(--accent-warm)]' : Math.abs(c.r) > 0.5 ? 'text-[var(--text-muted)]' : 'text-[var(--text-dim)]'}>
                        {c.r.toFixed(3)}
                      </span>
                      <span className="text-xs text-[var(--text-dim)] w-16 text-right">
                        {Math.abs(c.r) > 0.7 ? 'redundant' : Math.abs(c.r) > 0.4 ? 'linked' : 'independent'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combos */}
          {p.metricCombos.length > 0 && (
            <div>
              <SectionTag>Metric combos ({p.metricCombos.length})</SectionTag>
              <p className="text-xs text-[var(--text-dim)] mt-1 mb-3">
                What happens when two conditions occur together. The % is the average 7-day return when this combo was active. The days (d) show how many days this combo occurred in the data.
              </p>
              <div className="mt-3 font-mono text-xs">
                <div className="flex justify-between py-1 text-[var(--text-dim)] border-b border-[var(--border)] mb-1">
                  <span>conditions</span>
                  <span>avg 7d return · sample</span>
                </div>
                {p.metricCombos.slice(0, 12).map((c, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-[var(--text-muted)]">{c.labels.join(' + ')}</span>
                    <div className="flex items-center gap-2">
                      <span className={`${c.avgReturn7d > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {c.avgReturn7d > 0 ? '+' : ''}{c.avgReturn7d}%
                      </span>
                      <span className="text-[var(--text-dim)] w-10 text-right">{c.sampleSize}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="font-mono text-xs text-[var(--text-dim)]">
            <p>{p.profileSummary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TRADE LIST + PRICE MODAL
// ═════════════════════════════════════════════════════════════
function TradeList({ trades, direction }: { trades: BacktestTrade[]; direction: 'buy' | 'sell' }) {
  const { openTrade } = useContext(TradeModalCtx);

  return (
    <div>
      <SectionTag>Trades</SectionTag>
      <div className="flex items-center gap-4 py-2 text-[12px] font-mono uppercase tracking-wider text-[var(--text-dim)] mt-3 border-b border-[var(--border)]">
        <span className="w-4 text-right">#</span>
        <span>Entry</span>
        <span className="text-transparent">→</span>
        <span>Exit</span>
        <span>Entry $</span>
        <span className="text-transparent">→</span>
        <span>Exit $</span>
        <span className="ml-auto">Risk</span>
        <span className="w-20 text-right">Return</span>
        <span className="w-3" />
      </div>
      <div className="space-y-px">
        {trades.map((t, i) => (
          <div
            key={i}
            onClick={() => openTrade(t, i, direction)}
            className="flex items-center gap-4 py-2 text-xs border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-white/[0.02] transition-colors rounded-sm group"
          >
            <span className="text-[var(--text-dim)] font-mono w-4 text-right">{i + 1}</span>
            <span className="font-mono text-[var(--text-muted)]">{t.entryDate}</span>
            <span className="text-[var(--text-dim)]">→</span>
            <span className="font-mono text-[var(--text-muted)]">{t.exitDate}</span>
            <span className="font-mono text-[var(--text-muted)]">${fmt(t.entryPrice)}</span>
            <span className="text-[var(--text-dim)]">→</span>
            <span className="font-mono text-[var(--text-muted)]">${fmt(t.exitPrice)}</span>
            <span className="ml-auto font-mono text-[var(--accent-orange)]">
              {t.maxDrawdown > 0 ? `-${(t.maxDrawdown * 100).toFixed(1)}%` : '0%'}
            </span>
            <span className={`font-mono font-bold w-20 text-right ${t.returnPct > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {t.returnPct > 0 ? '+' : ''}{(t.returnPct * 100).toFixed(2)}%
            </span>
            <span className="text-[var(--text-dim)] opacity-0 group-hover:opacity-100 transition-opacity text-xs">▸</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Fetch trade prices via server-side proxy (handles rate limiting + caching)
async function fetchTradePrices(tokenId: string, symbol: string, from: string, to: string): Promise<number[]> {
  try {
    const { data } = await axios.get(
      `${API}/prices?id=${tokenId}&symbol=${symbol}&from=${from}&to=${to}`,
      { timeout: 15000 }
    );
    return data.prices ?? [];
  } catch {
    return [];
  }
}

// Compute real max risk from hourly price data
function computeRealMaxRisk(prices: number[], direction: 'buy' | 'sell'): number {
  if (prices.length < 2) return 0;
  const entry = prices[0];
  if (entry <= 0) return 0;
  let worst = 0;
  for (const p of prices) {
    // For long: adverse = price drops below entry
    // For short: adverse = price rises above entry
    const adverse = direction === 'buy'
      ? (entry - p) / entry
      : (p - entry) / entry;
    if (adverse > worst) worst = adverse;
  }
  return worst;
}

function TradeModal({ trade, idx, tokenId, symbol, direction, onClose, priceSeries }: {
  trade: BacktestTrade; idx: number; tokenId: string; symbol: string;
  direction: 'buy' | 'sell'; onClose: () => void;
  priceSeries?: { date: string; time?: string; price: number }[];
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const priceRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const W = 560, H = 220, PAD = 40;
  const dayCount = Math.round((new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime()) / 86400000);

  // Use backtested trade prices as source of truth for stats
  const isWin = trade.returnPct > 0;
  const color = isWin ? '#4ade80' : '#f87171';
  const realMaxRisk = trade.maxDrawdown;

  // Use the profiler's own prices for the chart (same source as backtest).
  // Entry/exit are daily closes, so chart starts at close of entry day (≈ start of next day).
  const pricePath = useMemo(() => {
    if (!priceSeries) return null;
    const entryDayEnd = new Date(trade.entryDate).getTime() + 86400000; // close of entry day
    const exitDayEnd = new Date(trade.exitDate).getTime() + 86400000;   // close of exit day
    const slice = priceSeries.filter(p => {
      const ms = new Date(p.time || p.date).getTime();
      return ms >= entryDayEnd && ms < exitDayEnd;
    });
    // Prepend entry price, append exit price to anchor chart to actual trade prices
    const prices = [trade.entryPrice, ...slice.map(p => p.price), trade.exitPrice];
    return prices.length >= 3 ? prices : null;
  }, [priceSeries, trade.entryDate, trade.exitDate, trade.entryPrice, trade.exitPrice]);
  const loading = false;

  // Entrance animation
  useEffect(() => {
    if (!overlayRef.current || !panelRef.current) return;
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(panelRef.current, { y: 30, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out', delay: 0.05 });
  }, []);

  // Chart draw animation
  useEffect(() => {
    if (!pricePath || !pathRef.current || !fillRef.current) return;
    const path = pathRef.current;
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(fillRef.current, { opacity: 0 });
    const tl = gsap.timeline({ delay: 0.15 });
    tlRef.current = tl;
    tl.to(path, {
      strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut',
      onUpdate: function () {
        const raw = parseFloat(path.style.strokeDashoffset);
        if (isNaN(raw) || len === 0) return;
        const progress = Math.max(0, Math.min(1, 1 - raw / len));
        const i = Math.min(Math.floor(progress * (pricePath.length - 1)), pricePath.length - 1);
        const price = pricePath[i];
        if (price == null) return;
        if (dotRef.current) {
          dotRef.current.setAttribute('cx', toX(i).toString());
          dotRef.current.setAttribute('cy', toY(price).toString());
          dotRef.current.style.opacity = '1';
        }
        if (priceRef.current) {
          priceRef.current.textContent = `$${fmt(price)}`;
        }
      }
    });
    tl.to(fillRef.current, { opacity: 0.08, duration: 0.4, ease: 'power2.out' }, '-=0.3');
    tl.to(dotRef.current, { opacity: 0, duration: 0.3 }, '-=0.1');
    return () => { tl.kill(); };
  }, [pricePath]);

  const close = () => {
    if (!overlayRef.current || !panelRef.current) return;
    if (tlRef.current) tlRef.current.kill();
    gsap.to(panelRef.current, { y: 20, opacity: 0, scale: 0.97, duration: 0.2, ease: 'power3.in' });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, delay: 0.05, onComplete: onClose });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // SVG geometry — include trade entry/exit prices in bounds so dashed lines are visible
  const minP = pricePath ? Math.min(...pricePath, trade.entryPrice, trade.exitPrice) * 0.98 : 0;
  const maxP = pricePath ? Math.max(...pricePath, trade.entryPrice, trade.exitPrice) * 1.02 : 1;
  const toX = (i: number) => PAD + (i / ((pricePath?.length || 1) - 1)) * (W - PAD * 2);
  const toY = (p: number) => PAD + (1 - (p - minP) / (maxP - minP || 1)) * (H - PAD * 2);

  const linePath2 = pricePath?.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p).toFixed(1)}`).join(' ') || '';
  const fillPathD = linePath2 ? linePath2 + ` L${toX(pricePath!.length - 1).toFixed(1)},${H} L${toX(0).toFixed(1)},${H} Z` : '';

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />
      <div ref={panelRef} className="relative w-full max-w-[640px]" style={{ opacity: 0 }}>
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[var(--text-dim)]">Trade #{idx + 1}</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isWin ? 'text-green-400 bg-green-400/8' : 'text-red-400 bg-red-400/8'}`}>
                {isWin ? 'WON' : 'LOST'}
              </span>
            </div>
            <button onClick={close} className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Chart */}
          <div className="px-6">
            {loading ? (
              <div className="flex items-center justify-center" style={{ height: H }}>
                <div className="w-5 h-5 border border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                <span className="text-xs text-[var(--text-dim)] ml-3 font-mono">Loading price data...</span>
              </div>
            ) : !pricePath ? (
              <div className="flex items-center justify-center" style={{ height: H }}>
                <span className="text-xs text-[var(--text-dim)] font-mono">Price data unavailable for this period</span>
              </div>
            ) : (() => {
              // Entry/exit lines use the trade's actual prices (same as stats below)
              const entryY = toY(trade.entryPrice);
              const exitY = toY(trade.exitPrice);
              const minGap = 14;
              let adjExitY = exitY;
              if (Math.abs(entryY - exitY) < minGap) {
                adjExitY = exitY < entryY ? entryY - minGap : entryY + minGap;
              }
              return (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }}>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map(f => {
                const y = PAD + f * (H - PAD * 2);
                return <line key={f} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(253,249,240,0.06)" strokeWidth="0.5" />;
              })}
              {/* Entry/exit dashed lines */}
              <line x1={PAD} y1={entryY} x2={W - PAD} y2={entryY} stroke="rgba(253,249,240,0.15)" strokeWidth="0.5" strokeDasharray="4 3" />
              <line x1={PAD} y1={exitY} x2={W - PAD} y2={exitY} stroke={color} strokeWidth="0.5" strokeDasharray="4 3" opacity="0.4" />
              {/* Labels — offset when overlapping */}
              <text x={PAD - 4} y={entryY} fill="rgba(253,249,240,0.4)" fontSize="9" textAnchor="end" dominantBaseline="middle" fontFamily="var(--font-geist-mono)">entry</text>
              <text x={PAD - 4} y={adjExitY} fill={color} fontSize="9" textAnchor="end" dominantBaseline="middle" fontFamily="var(--font-geist-mono)" opacity="0.6">exit</text>
              {/* Fill area */}
              <path ref={fillRef} d={fillPathD} fill={color} opacity="0" />
              {/* Price line */}
              <path ref={pathRef} d={linePath2} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {/* Tracking dot */}
              <circle ref={dotRef} r="4" fill={color} style={{ opacity: 0, filter: `drop-shadow(0 0 6px ${color})` }} />
            </svg>
              );
            })()}
          </div>

          {/* Stats */}
          <div className="px-6 pb-5 pt-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-mono text-[var(--text-dim)]">{trade.entryDate}</span>
                <span className="text-xs text-[var(--text-dim)] mx-2">→</span>
                <span className="text-xs font-mono text-[var(--text-dim)]">{trade.exitDate}</span>
                <span className="text-xs text-[var(--text-dim)] ml-2">({dayCount}d)</span>
              </div>
              <span ref={priceRef} className="text-sm font-mono text-[var(--text-muted)]" />
            </div>

            <div className="flex gap-8">
              <div>
                <span className="text-xs text-[var(--text-dim)] uppercase tracking-wider">Entry</span>
                <p className="text-lg font-mono font-bold text-[var(--text)]">${fmt(trade.entryPrice)}</p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-dim)] uppercase tracking-wider">Exit</span>
                <p className="text-lg font-mono font-bold text-[var(--text)]">${fmt(trade.exitPrice)}</p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-dim)] uppercase tracking-wider">Return ({direction})</span>
                <p className={`text-lg font-mono font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.returnPct > 0 ? '+' : ''}{(trade.returnPct * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-dim)] uppercase tracking-wider">Max risk</span>
                <p className="text-lg font-mono font-bold text-[var(--accent-orange)]">
                  {realMaxRisk > 0 ? `-${(realMaxRisk * 100).toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>

            {/* Conditions */}
            {trade.conditions && Object.keys(trade.conditions).length > 0 && (
              <div className="mt-5 pt-4 border-t border-[var(--border)]">
                <span className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-wider">Conditions at entry</span>
                <div className="flex flex-col gap-2 mt-2">
                  {Object.entries(trade.conditions).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[var(--accent)]/8 text-[var(--accent)]">
                        {k}: {v.level}
                      </span>
                      <span className="text-xs font-mono text-[var(--text-dim)]">
                        was {fmt(v.value)} · threshold {v.level === 'high' ? '>' : '≤'} {fmt(v.median)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared ─────────────────────────────────────────────────
function Metric({ val, label, sub, good, invert }: {
  val: string; label: string; sub: string; good: boolean; invert?: boolean;
}) {
  const isGood = invert ? !good : good;
  return (
    <div>
      <span className={`text-2xl font-mono font-bold ${isGood ? 'text-green-400' : 'text-red-400'}`}>{val}</span>
      <span className="text-xs text-[var(--text-dim)] uppercase tracking-[0.1em] ml-2">{label}</span>
      <p className="text-xs text-[var(--text-dim)] mt-0.5">{sub}</p>
    </div>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-mono font-bold text-[var(--text-dim)] uppercase tracking-[0.15em]">
      {children}
    </p>
  );
}


// ═════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════
export default function TokenInsights({ tokenId, onMeta }: { tokenId: string; onMeta?: (m: { name: string; symbol: string; image: string }) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: profile, loading } = useRequest(() => fetchProfile(tokenId, tokenId.toUpperCase()));
  const [tradeModal, setTradeModal] = useState<TradeModalState>(null);

  const openTrade = useCallback((trade: BacktestTrade, idx: number, direction: 'buy' | 'sell') => {
    setTradeModal({ trade, idx, direction });
  }, []);

  useEffect(() => {
    if (profile && profile._meta && onMeta) {
      onMeta(profile._meta);
    }
  }, [profile]);

  return (
    <TradeModalCtx.Provider value={{ openTrade }}>
    <div ref={ref}>
      {loading && (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-6 h-6 border border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mb-4" />
          <p className="text-sm text-[var(--text-muted)]">Analyzing {tokenId}</p>
          <p className="text-xs text-[var(--text-dim)] mt-1 font-mono">31 metrics · 7 sources · ~15 seconds</p>
        </div>
      )}

      {profile && !loading && (
        <div className="space-y-20">
          <Briefing p={profile} events={profile._onchainEvents} />

          <div className="section-divider" />

          <TheScore p={profile} />

          <div className="section-divider" />

          <div className="s" data-guide="signals">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="display display-sm"><span className="text-[var(--accent)]">/</span> Signals</h3>
              <HowItWorksButton step={1} />
            </div>
            <p className="text-xs text-[var(--text-dim)] mb-8">
              Each metric tested for statistical correlation with {profile.symbol} price over 7 and 14 days. Only proven signals shown.
            </p>
            <Signals p={profile} />
          </div>

          <div className="section-divider" />

          <OnchainLiveSection tokenId={tokenId} symbol={profile.symbol} profile={profile} />

          <div className="section-divider" />

          <div className="s" data-guide="strategies">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="display display-sm"><span className="text-[var(--accent)]">/</span> Strategies</h3>
              <HowItWorksButton step={2} />
            </div>
            <p className="text-xs text-[var(--text-dim)] mb-8">
              Patterns tested against real trades. Only strategies with 40%+ win rate survive.
            </p>
            <StrategiesSection backtests={profile.backtests} />
          </div>

          <div className="section-divider" />

          <div className="s" data-guide="patterns">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="display display-sm"><span className="text-[var(--accent)]">/</span> Patterns</h3>
              <HowItWorksButton step={4} label="What are patterns?" />
            </div>
            <p className="text-xs text-[var(--text-dim)] mb-8">
              {profile.associationRules.length} repeating patterns found in {profile.dataPoints} days.
            </p>
            <PatternsSection rules={profile.associationRules} />
          </div>

          <div className="section-divider" />

          <div className="s" data-guide="rawdata">
            <h3 className="display display-sm mb-2"><span className="text-[var(--accent)]">/</span> Raw data</h3>
            <p className="text-xs text-[var(--text-dim)] mb-8">
              Full statistical output from the analysis engine.
            </p>
            <RawData p={profile} />
          </div>

          <div className="s text-xs text-[var(--text-dim)] font-mono leading-relaxed border-t border-[var(--border)] pt-8">
            {profile.dateRange.from} — {profile.dateRange.to} · {profile.dataPoints}d ·
            {profile.correlations.length} metrics · {profile.associationRules.length} patterns · {profile.backtests.length} strategies
            <br />
            DYOR — Statistical analysis only. Not financial advice.
          </div>
        </div>
      )}
    </div>

      {/* Global trade modal */}
      {tradeModal && (
        <TradeModal
          trade={tradeModal.trade}
          idx={tradeModal.idx}
          tokenId={tokenId}
          symbol={profile?.symbol || tokenId.toUpperCase()}
          direction={tradeModal.direction}
          onClose={() => setTradeModal(null)}
          priceSeries={profile?._priceSeries}
        />
      )}
    </TradeModalCtx.Provider>
  );
}
