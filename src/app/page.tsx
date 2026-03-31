"use client"

import Navigation from '@/components/Navigation';
import SmoothScroll from '@/components/SmoothScroll';
import { searchTokenUsingGet } from '@/services/custom';
import { useRequest } from 'ahooks';
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─── Marquee ─────────────────────────────────────────────────
function Marquee({ children, speed = 30, reverse = false }: { children: React.ReactNode; speed?: number; reverse?: boolean }) {
  return (
    <div className="overflow-hidden whitespace-nowrap select-none">
      <div
        className="inline-flex gap-8 animate-marquee"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}

// ─── Stat counter ────────────────────────────────────────────
function AnimatedStat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (!ref.current || counted.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !counted.current) {
        counted.current = true;
        gsap.fromTo(ref.current, { innerText: 0 }, {
          innerText: value, duration: 2, ease: 'power2.out', snap: { innerText: 1 },
          onUpdate: function () {
            if (ref.current) ref.current.textContent = Math.round(parseFloat(ref.current.textContent || '0')).toLocaleString() + suffix;
          },
        });
      }
    }, { threshold: 0.5 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, suffix]);

  return (
    <div className="text-center">
      <span ref={ref} className="display text-5xl sm:text-7xl text-[var(--accent)]">0{suffix}</span>
      <p className="text-xs font-mono text-[var(--text-dim)] mt-3 uppercase tracking-[0.15em]">{label}</p>
    </div>
  );
}

// ─── Feature card ────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accent }: { icon: string; title: string; desc: string; accent: string }) {
  return (
    <div className="feat-card group relative p-8 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] transition-all duration-500 overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700" style={{ background: accent }} />
      <span className="text-3xl mb-5 block">{icon}</span>
      <h3 className="display text-xl mb-3">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Data source pill ────────────────────────────────────────
function SourcePill({ name, count }: { name: string; count: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]/30 transition-colors">
      <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
      <span className="text-sm text-[var(--text)]">{name}</span>
      <span className="text-xs font-mono text-[var(--text-dim)]">{count}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════
export default function Home() {
  const router = useRouter();
  const [searchKeyword, setSearchKeyword] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { run: search, data: results, loading } = useRequest(searchTokenUsingGet, {
    manual: true,
    onError: (err) => console.log(err),
  });

  // GSAP animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero stagger
      gsap.from('.hero-line', {
        y: 100, opacity: 0, duration: 1.2,
        ease: 'power3.out', stagger: 0.12, delay: 0.2,
      });

      // Feature cards scroll reveal
      gsap.from('.feat-card', {
        scrollTrigger: { trigger: '.feat-grid', start: 'top 80%' },
        y: 60, opacity: 0, duration: 0.8,
        ease: 'power3.out', stagger: 0.1,
      });

      // Stats scroll reveal
      gsap.from('.stat-section', {
        scrollTrigger: { trigger: '.stat-section', start: 'top 75%' },
        y: 40, opacity: 0, duration: 1, ease: 'power3.out',
      });

      // Sources reveal
      gsap.from('.source-pill', {
        scrollTrigger: { trigger: '.sources-grid', start: 'top 80%' },
        y: 30, opacity: 0, scale: 0.95, duration: 0.6,
        ease: 'power3.out', stagger: 0.05,
      });

      // Search section parallax
      gsap.from('.search-section', {
        scrollTrigger: { trigger: '.search-section', start: 'top 80%' },
        y: 50, opacity: 0, duration: 1, ease: 'power3.out',
      });
    });
    return () => ctx.revert();
  }, []);

  // Animate results
  useEffect(() => {
    if (results?.data) {
      gsap.from('.result-row', {
        y: 20, opacity: 0, duration: 0.4,
        ease: 'power3.out', stagger: 0.05,
      });
    }
  }, [results]);

  const scrollToSearch = useCallback(() => {
    searchRef.current?.focus();
    document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <SmoothScroll>
      <Navigation />

      {/* ── HERO ── */}
      <section ref={heroRef} className="min-h-[100svh] flex flex-col justify-center px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] relative overflow-hidden">
        {/* Background grain */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

        {/* Gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />

        <div className="max-w-[1200px] mx-auto w-full relative z-10">
          <div className="hero-line mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 text-xs font-mono text-[var(--accent)] uppercase tracking-[0.1em]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              On-chain intelligence
            </span>
          </div>

          <h1 className="display mb-8" style={{ fontSize: 'clamp(3.5rem, 9vw, 9rem)', lineHeight: 0.9 }}>
            <span className="hero-line block">See what the</span>
            <span className="hero-line block">blockchain<span className="text-[var(--accent)]"> sees</span></span>
          </h1>

          <p className="hero-line text-[var(--text-muted)] text-lg sm:text-xl max-w-[560px] mb-14 leading-relaxed">
            31 metrics. 7 data sources. Real on-chain transfer analysis.
            Every correlation tested. Every pattern backtested. Per token.
          </p>

          <div className="hero-line flex items-center gap-4">
            <button onClick={scrollToSearch} className="btn-primary text-base px-8 py-4">
              Analyze a token
            </button>
            <button
              onClick={() => router.push('/detail?id=ethereum')}
              className="btn-ghost text-base px-6 py-4"
            >
              See ETH analysis →
            </button>
          </div>
        </div>
      </section>

      {/* ── MARQUEE TICKER ── */}
      <section className="py-8 border-y border-[var(--border)] overflow-hidden">
        <Marquee speed={40}>
          {['Exchange Flow Detection', 'Wash Trading Analysis', 'Vesting Schedules', 'Supply In Motion',
            'Token Velocity', 'Whale Tracking', 'Anomaly Detection', 'Association Rules',
            'Backtested Strategies', 'Cross-Correlation Engine', 'On-chain Metrics',
          ].map((t) => (
            <span key={t} className="text-sm font-mono text-[var(--text-dim)] uppercase tracking-wider flex items-center gap-3">
              <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
              {t}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)]">
        <div className="max-w-[1200px] mx-auto">
          <span className="tag-lime block mb-4">What we analyze</span>
          <h2 className="display display-md mb-16 max-w-[700px]">
            Not another dashboard.<br />
            A <span className="text-[var(--accent)]">statistical engine</span>.
          </h2>

          <div className="feat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon="⛓"
              title="On-chain signals"
              desc="Exchange flows, wallet accumulation, wash trading detection, vesting schedules — directly from the blockchain. No third-party estimates."
              accent="var(--accent)"
            />
            <FeatureCard
              icon="📊"
              title="Cross-correlation"
              desc="Every metric tested against price returns at 7 and 14-day horizons. Only statistically significant relationships (p < 0.05) survive."
              accent="var(--accent-lime)"
            />
            <FeatureCard
              icon="🔁"
              title="Backtested strategies"
              desc="Multi-condition patterns tested as trading rules against real price data. Win rates, equity curves, hold period optimization."
              accent="var(--accent-orange)"
            />
            <FeatureCard
              icon="🔍"
              title="Association rules"
              desc="When Fear & Greed is low AND volume spikes → what happens? Mined from 90 days of data. Every repeating pattern found."
              accent="var(--accent-purple)"
            />
            <FeatureCard
              icon="⚡"
              title="Live alerts"
              desc="Exchange inflow spikes, anomalous activity, burn events — detected in real-time. Not daily summaries. Event-level signals."
              accent="var(--accent-orange)"
            />
            <FeatureCard
              icon="🎯"
              title="Briefing"
              desc="One synthesized summary at the top. Regime, active strategies, strongest signals, on-chain events — no more scattered data."
              accent="var(--accent)"
            />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stat-section py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] border-y border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto flex flex-wrap justify-center gap-16 sm:gap-24">
          <AnimatedStat value={31} label="Metrics per token" />
          <AnimatedStat value={7} label="Data sources" />
          <AnimatedStat value={11700} label="Tests per analysis" suffix="+" />
          <AnimatedStat value={90} label="Days of data" />
        </div>
      </section>

      {/* ── DATA SOURCES ── */}
      <section className="py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <span className="tag-lime block mb-4">Data sources</span>
            <h2 className="display display-md">
              Real data. <span className="text-[var(--accent)]">Seven sources</span>.
            </h2>
          </div>

          <div className="sources-grid flex flex-wrap justify-center gap-3">
            <SourcePill name="CoinGecko" count="price · volume · mcap" />
            <SourcePill name="Etherscan" count="on-chain transfers" />
            <SourcePill name="Binance Futures" count="funding · OI · L/S" />
            <SourcePill name="Hyperliquid" count="perp data · funding" />
            <SourcePill name="Alternative.me" count="Fear & Greed" />
            <SourcePill name="DeFiLlama" count="TVL" />
            <SourcePill name="Blockchain RPCs" count="7 chains" />
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-[var(--text-dim)] max-w-[500px] mx-auto leading-relaxed">
              Every metric is fetched, cross-correlated, and backtested in a single pass.
              No pre-computed scores. No stale data. Fresh analysis on every request.
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] border-t border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto">
          <span className="tag-lime block mb-4">How it works</span>
          <h2 className="display display-md mb-20">Three steps. <span className="text-[var(--accent)]">Zero trust required</span>.</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              { n: '01', title: 'Search', desc: 'Enter any token. We find it across CoinGecko, identify its chain deployments, and locate its contract addresses automatically.' },
              { n: '02', title: 'Analyze', desc: '31 metrics fetched in parallel from 7 sources. 90 days of data. Correlations computed, association rules mined, strategies backtested. ~15 seconds.' },
              { n: '03', title: 'Act', desc: 'Briefing tells you what matters. Signals show what correlates. On-chain shows what\'s happening right now. Strategies tell you what historically works.' },
            ].map((step) => (
              <div key={step.n} className="relative">
                <span className="display text-[8rem] text-[var(--text)]/[0.03] absolute -top-8 -left-2 select-none">{step.n}</span>
                <div className="relative pt-16">
                  <h3 className="display text-2xl mb-4">{step.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEARCH ── */}
      <section id="search" className="search-section min-h-[80svh] flex flex-col justify-center py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)]">
        <div className="max-w-[800px] mx-auto w-full text-center">
          <h2 className="display display-lg mb-4">
            Find <span className="text-[var(--accent)]">your</span> token
          </h2>
          <p className="text-[var(--text-muted)] text-lg mb-12">
            Any ERC20 token. Instant statistical profile.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchKeyword.trim()) search(searchKeyword);
            }}
            className="mb-8"
          >
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Bitcoin, Ethereum, Maker, Aave..."
                className="w-full p-6 pl-14 text-lg bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] transition-colors duration-300"
                style={{ fontFamily: 'var(--font-geist-sans)' }}
              />
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-dim)]" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
              </svg>
              {loading && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-[var(--text-dim)] border-t-[var(--accent)] rounded-full animate-spin" />
              )}
            </div>
          </form>

          {/* Quick picks */}
          {!results?.data && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['bitcoin', 'ethereum', 'maker', 'aave', 'uniswap', 'chainlink'].map((t) => (
                <button
                  key={t}
                  onClick={() => router.push(`/detail?id=${t}`)}
                  className="px-4 py-2 text-xs font-mono text-[var(--text-dim)] border border-[var(--border)] rounded-full hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="text-left space-y-2">
            {results?.data?.map((token) => (
              <div
                key={`${token.symbol}-${token.label}`}
                onClick={() => {
                  if (token.arkhamSlug) router.push(`/detail?id=${token.arkhamSlug}`);
                }}
                className={`result-row card-dark p-5 flex items-center gap-5 group ${token.arkhamSlug ? 'cursor-pointer' : 'opacity-40'}`}
              >
                <Image src={token.image} alt={token.label} width={44} height={44} className="rounded-xl" />
                <div className="flex-1">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-base font-semibold group-hover:text-[var(--accent)] transition-colors">{token.label}</h3>
                    <span className="text-xs font-mono text-[var(--text-dim)]">{token.symbol}</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-[var(--text-dim)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>

          {results?.data?.length === 0 && (
            <p className="text-[var(--text-dim)] py-8">No tokens found. Try a different search.</p>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-16 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] border-t border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/tory-logo.png" alt="Tory" width={24} height={24} className="rounded-full" />
            <span className="text-sm font-bold text-[var(--accent)]" style={{ fontFamily: 'var(--font-display)' }}>TORY</span>
            <span className="text-xs text-[var(--text-dim)]">Crypto Intelligence</span>
          </div>
          <p className="text-xs text-[var(--text-dim)]">
            Statistical analysis only. Not financial advice. DYOR.
          </p>
        </div>
      </footer>
    </SmoothScroll>
  );
}
