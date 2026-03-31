"use client"

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─── Card definitions — overlapping collage with rotations ───
const CARDS = [
  // Regime + stats
  {
    id: 'regime',
    style: { left: '2%', top: '2%', width: 240, rotate: '-2deg', zIndex: 3 },
    light: true,
    depth: 0.12,
    content: (
      <div className="px-5 py-4">
        <span className="text-[9px] font-mono text-[var(--text-muted)] block mb-1">market mood</span>
        <span className="text-3xl font-bold text-[var(--accent)] block mb-3" style={{ fontFamily: 'var(--font-display)' }}>Capitulation</span>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mb-3">Extreme fear + high volume. Historically the best entry window.</p>
        <div className="flex gap-5 text-[10px] font-mono text-[var(--text-muted)] pt-3 border-t border-[var(--border)]">
          <div><span className="text-sm font-bold text-[var(--accent-light)]">91</span><span className="block">days</span></div>
          <div><span className="text-sm font-bold text-[var(--accent-light)]">8/15</span><span className="block">significant</span></div>
          <div><span className="text-sm font-bold text-[var(--accent-light)]">2</span><span className="block">active</span></div>
        </div>
      </div>
    ),
  },
  // Strategy — notification style with equity curve
  {
    id: 'strategy',
    style: { left: '-3%', top: '24%', width: 280, rotate: '1.5deg', zIndex: 5 },
    depth: 0.3,
    content: (
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-[var(--text-muted)]">Strategy active right now</span>
        </div>
        <p className="text-[12px] text-[var(--text)] leading-snug mb-3">
          Buy when fear is extreme and volatility spikes
        </p>
        {/* Mini equity curve */}
        <svg viewBox="0 0 220 35" className="w-full h-7 mb-3">
          <polyline points="0,30 20,28 40,25 60,27 80,20 100,22 120,15 140,18 160,10 180,12 200,5 220,3" fill="none" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" />
          <polyline points="0,30 20,29 40,28 60,30 80,27 100,26 120,25 140,24 160,22 180,20 200,18 220,15" fill="none" stroke="rgba(253,249,240,0.15)" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-mono font-bold text-[var(--text)]">80%</span>
            <span className="text-[9px] text-[var(--text-muted)]">win rate</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-mono text-green-400">+52%</span>
            <span className="text-[9px] text-[var(--text-muted)]">vs HODL</span>
          </div>
        </div>
      </div>
    ),
  },
  // Sparkline chart + metric detail
  {
    id: 'chart',
    style: { left: '5%', top: '50%', width: 230, rotate: '-1deg', zIndex: 2 },
    depth: 0.06,
    content: (
      <div className="px-5 py-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] text-[var(--text-muted)]">Exchange Net Flow</span>
          <span className="text-[10px] font-mono text-green-400">+22.1%</span>
        </div>
        <span className="text-[9px] text-[var(--text-muted)] block mb-2">Outflow from exchanges — accumulation signal</span>
        <svg viewBox="0 0 180 40" className="w-full h-8 mb-2">
          <polyline
            points="0,35 15,30 30,32 45,20 60,25 75,18 90,22 105,10 120,15 135,8 150,12 165,5 180,3"
            fill="none" stroke="#4F6AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
          <polyline
            points="0,35 15,30 30,32 45,20 60,25 75,18 90,22 105,10 120,15 135,8 150,12 165,5 180,3 180,40 0,40"
            fill="url(#sparkFill)" stroke="none"
          />
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F6AFF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#4F6AFF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="flex justify-between text-[8px] font-mono text-[var(--text-muted)]">
          <span>7d ago</span>
          <span>today</span>
        </div>
      </div>
    ),
  },
  // Signals table — raw data
  {
    id: 'signals',
    style: { left: '50%', top: '-2%', width: 310, rotate: '2deg', zIndex: 4 },
    depth: 0.22,
    content: (
      <div className="px-4 py-3">
        <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider block mb-2">correlation matrix</span>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-[var(--text-muted)] text-left">
              <th className="font-normal pb-2">metric</th>
              <th className="font-normal pb-2 text-right">r</th>
              <th className="font-normal pb-2 text-right">p-value</th>
              <th className="font-normal pb-2 text-right">direction</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {[
              { m: 'Volatility 14d', r: 0.485, p: 0.001, bull: true },
              { m: 'Fear & Greed', r: -0.446, p: 0.003, bull: false },
              { m: 'Exchange Flow', r: 0.391, p: 0.008, bull: true },
              { m: 'Funding Rate', r: -0.312, p: 0.012, bull: false },
              { m: 'Open Interest', r: 0.198, p: 0.041, bull: true },
            ].map(s => (
              <tr key={s.m} className="border-t border-[var(--border)]">
                <td className="py-1.5 text-[var(--text-muted)]">{s.m}</td>
                <td className={`py-1.5 text-right ${s.bull ? 'text-[var(--accent)]' : 'text-red-400'}`}>{s.r > 0 ? '+' : ''}{s.r.toFixed(3)}</td>
                <td className="py-1.5 text-right text-[var(--text-muted)]">{s.p.toFixed(3)}</td>
                <td className={`py-1.5 text-right ${s.bull ? 'text-[var(--accent)]' : 'text-red-400'}`}>{s.bull ? '↑ bullish' : '↓ bearish'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="text-[8px] text-[var(--text-muted)] block mt-2">5 of 15 metrics statistically significant (p &lt; 0.05)</span>
      </div>
    ),
  },
  // On-chain alerts — multiple
  {
    id: 'onchain',
    style: { left: '46%', top: '24%', width: 280, rotate: '-1.5deg', zIndex: 6 },
    depth: 0.38,
    content: (
      <div className="px-5 py-4">
        <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider block mb-3">on-chain · 3 chains</span>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mt-1.5" />
            <div>
              <span className="text-[11px] text-[var(--text)] block">Exchange outflow spike</span>
              <span className="text-[9px] text-[var(--text-muted)]">3.2σ above avg · Binance, Coinbase</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
            <div>
              <span className="text-[11px] text-[var(--text)] block">Wash trading detected</span>
              <span className="text-[9px] text-[var(--text-muted)]">18% of volume is round-trip</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0 mt-1.5" />
            <div>
              <span className="text-[11px] text-[var(--text)] block">Vesting schedule found</span>
              <span className="text-[9px] text-[var(--text-muted)]">Recurring 50K transfers every 14d</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  // Briefing — summary with key points
  {
    id: 'briefing',
    style: { left: '52%', top: '50%', width: 300, rotate: '1deg', zIndex: 3 },
    depth: 0.18,
    content: (
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono text-[var(--accent)]">ETH Briefing</span>
          <span className="text-[9px] text-[var(--text-muted)]">just now</span>
        </div>
        <p className="text-[12px] text-[var(--text)] leading-relaxed mb-3">
          Capitulation regime with 2 active strategies signaling buy. Exchange outflow spiking suggests accumulation.
        </p>
        <div className="flex gap-2">
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">panic regime</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-400/10 text-green-400">2 active</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">outflow ↑</span>
        </div>
      </div>
    ),
  },
];

export default function HeroDemos() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Entrance animation
    gsap.from(container.querySelectorAll('.collage-card'), {
      y: 60, opacity: 0, scale: 0.95,
      duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.4,
    });

    // Parallax via rAF — one read, batch writes
    const cardData = Array.from(container.querySelectorAll('.collage-card')).map(el => ({
      el: el as HTMLElement,
      depth: parseFloat((el as HTMLElement).dataset.depth || '0.2'),
      rotate: (el as HTMLElement).dataset.rotate || '0deg',
    }));

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        for (const c of cardData) {
          c.el.style.transform = `rotate(${c.rotate}) translate3d(0, ${-sy * c.depth}px, 0)`;
        }
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="min-h-[110vh] relative overflow-hidden bg-[var(--bg)]">
      {/* Sweeping gradient — Stripe-inspired conic flow */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Primary sweep — conic gradient for directional flow */}
        <div className="absolute top-[-30%] right-[-20%] w-[90%] h-[130%]" style={{
          background: 'conic-gradient(from 220deg at 70% 40%, rgba(79,106,255,0.22) 0deg, rgba(99,102,241,0.15) 60deg, rgba(123,147,255,0.18) 120deg, transparent 200deg, transparent 360deg)',
          filter: 'blur(80px)',
        }} />
        {/* Secondary layer — offset conic for depth */}
        <div className="absolute top-[-10%] right-[-15%] w-[80%] h-[110%]" style={{
          background: 'conic-gradient(from 180deg at 60% 50%, transparent 0deg, rgba(59,130,246,0.1) 90deg, rgba(147,130,220,0.08) 150deg, transparent 220deg, transparent 360deg)',
          filter: 'blur(100px)',
        }} />
        {/* Bright core — the lightest point of the wave */}
        <div className="absolute top-[5%] right-[8%] w-[35%] h-[30%]" style={{
          background: 'radial-gradient(ellipse at center, rgba(123,147,255,0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        {/* Directional fiber lines — silk texture overlay */}
        <svg className="absolute opacity-[0.035] mix-blend-overlay" style={{ top: '-50%', left: '-50%', width: '200%', height: '200%', transform: 'rotate(-35deg)' }} xmlns="http://www.w3.org/2000/svg">
          <filter id="silk">
            <feTurbulence type="fractalNoise" baseFrequency="0.001 0.15" numOctaves="5" seed="8" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#silk)" />
        </svg>
      </div>

      {/* Hero text — left aligned */}
      <div className="relative z-20 pt-28 sm:pt-36 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)]">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="display mb-5 max-w-[600px]" style={{ fontSize: 'clamp(4rem, 10vw, 7rem)', lineHeight: 0.9 }}>
            <span className="block">Every</span>
            <span className="block">token,</span>
            <span className="block text-white">Decoded</span>
          </h1>
          <p className="text-[var(--text-muted)] text-lg max-w-[460px] mb-8 leading-relaxed">
            31 metrics. 7 sources. Every pattern backtested.
          </p>
          <div className="flex gap-4">
            <button className="relative w-full sm:w-auto !px-8 !py-4 text-base font-semibold text-white rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(88,112,247,0.35)] hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #7B93FF, #5870F7, #3448C5)' }}>
              Analyze token
            </button>
          </div>
        </div>
      </div>

      {/* Floating card collage — Stripe style with overlaps and rotations */}
      <div ref={containerRef} className="absolute top-16 right-0 w-[55%] h-full hidden lg:block">
        {CARDS.map((card) => (
          <div
            key={card.id}
            className={`collage-card absolute rounded-2xl border border-white/[0.08] backdrop-blur-xl transition-shadow duration-500 hover:border-white/[0.12] ${(card as any).light ? 'border-light-active' : ''}`}
            data-depth={card.depth}
            data-rotate={card.style.rotate}
            style={{
              left: card.style.left,
              top: card.style.top,
              width: card.style.width,
              transform: `rotate(${card.style.rotate})`,
              zIndex: card.style.zIndex,
              willChange: 'transform',
              background: 'rgba(22, 22, 22, 0.6)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            {/* Top edge highlight */}
            <div className="absolute top-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(79,106,255,0.12), transparent)' }} />
            {card.content}
          </div>
        ))}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 z-30 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))' }} />

      {/* Mobile: cards up to correlation matrix, last one has bottom blur */}
      <div className="lg:hidden mt-12 px-[var(--side-margin-mobile)] relative z-10">
        {/* Regime — full width, running light */}
        <div className="border-light-active rounded-2xl border border-white/[0.08] backdrop-blur-xl mb-3" style={{ background: 'rgba(22, 22, 22, 0.6)' }}>
          {CARDS[0].content}
        </div>
        {/* Strategy + Chart — side by side, equal height */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl border border-white/[0.08] backdrop-blur-xl flex flex-col" style={{ background: 'rgba(22, 22, 22, 0.6)' }}>
            <div className="px-4 py-3 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-[9px] text-[var(--text-muted)]">Strategy active</span>
              </div>
              <p className="text-[11px] text-[var(--text)] leading-snug mb-auto">
                Buy when fear is extreme and volatility spikes
              </p>
              <svg viewBox="0 0 220 35" className="w-full h-6 my-2">
                <polyline points="0,30 20,28 40,25 60,27 80,20 100,22 120,15 140,18 160,10 180,12 200,5 220,3" fill="none" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" />
                <polyline points="0,30 20,29 40,28 60,30 80,27 100,26 120,25 140,24 160,22 180,20 200,18 220,15" fill="none" stroke="rgba(253,249,240,0.15)" strokeWidth="1" strokeDasharray="3 3" />
              </svg>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-mono font-bold text-[var(--text)]">80%</span>
                <span className="text-sm font-mono text-green-400">+52%</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[8px] text-[var(--text-muted)]">win rate</span>
                <span className="text-[8px] text-[var(--text-muted)]">vs HODL</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] backdrop-blur-xl flex flex-col" style={{ background: 'rgba(22, 22, 22, 0.6)' }}>
            <div className="px-4 py-3 flex-1 flex flex-col">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[9px] text-[var(--text-muted)]">Exchange Net Flow</span>
                <span className="text-[9px] font-mono text-green-400">+22.1%</span>
              </div>
              <span className="text-[8px] text-[var(--text-muted)] block mb-auto">Outflow — accumulation signal</span>
              <svg viewBox="0 0 180 50" className="w-full h-10 my-2">
                <polyline
                  points="0,45 15,40 30,42 45,30 60,35 75,28 90,32 105,20 120,25 135,18 150,22 165,15 180,10"
                  fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
                <polyline
                  points="0,45 15,40 30,42 45,30 60,35 75,28 90,32 105,20 120,25 135,18 150,22 165,15 180,10 180,50 0,50"
                  fill="url(#sparkMobile)" stroke="none"
                />
                <defs>
                  <linearGradient id="sparkMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex justify-between text-[8px] font-mono text-[var(--text-muted)]">
                <span>7d ago</span>
                <span>today</span>
              </div>
            </div>
          </div>
        </div>
        {/* Correlation matrix — with bottom blur */}
        <div className="relative rounded-2xl border border-white/[0.08] backdrop-blur-xl overflow-hidden" style={{ background: 'rgba(22, 22, 22, 0.6)' }}>
          {CARDS[3].content}
          <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))' }} />
        </div>
      </div>
    </section>
  );
}
