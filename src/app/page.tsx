"use client"

import Navigation from '@/components/Navigation';
import SmoothScroll from '@/components/SmoothScroll';
import Image from "next/image";
import { useEffect, useRef, useState } from 'react';
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
        style={{ animationDuration: `${speed}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}

// ─── FAQ Chat Bubble (nvg8 style) ────────────────────────────
function FAQBubble({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="mb-4">
      {/* Question — dark pill, left-aligned */}
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--bg)] text-[var(--text)] text-sm font-semibold hover:bg-[var(--bg)]/90 transition-all mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {q}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Answer — light bubble, right-aligned */}
      <div className={`overflow-hidden transition-all duration-500 ${open ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <div className="ml-8 sm:ml-12 p-5 rounded-2xl bg-[var(--bg-cream)] text-[var(--bg)] text-sm leading-relaxed max-w-[550px]">
          {a}
        </div>
      </div>
    </div>
  );
}

// ─── FAQ Section ─────────────────────────────────────────────
const FAQ_DATA = [
  { q: 'What is TORY?', a: 'A statistical analysis engine for crypto tokens. 31 metrics from 7 data sources — cross-correlations, association rules, backtested strategies, and on-chain transfer analysis. No opinions, no predictions — just statistically proven patterns from 90 days of real data.' },
  { q: 'Is this financial advice?', a: 'Absolutely not. TORY shows what has historically correlated with price movement and which patterns have worked in the past. Past performance doesn\'t guarantee future results. Always DYOR.' },
  { q: 'What tokens are supported?', a: 'Any token on CoinGecko. For on-chain analysis, we support ERC20 tokens on Ethereum, Polygon, Arbitrum, Base, Optimism, Avalanche, and BSC. Chain detection is automatic.' },
  { q: 'How fresh is the data?', a: 'Every analysis is computed fresh on request — no pre-cached scores. Price data spans 90 days. On-chain transfers are fetched in real-time from block explorers. Full analysis takes ~15 seconds.' },
  { q: 'What does the score mean?', a: 'The composite score (0–100) aggregates all statistically significant metrics weighted by correlation strength. Above 60 = bullish, below 40 = bearish. The market regime adds context about what historically happens in similar conditions.' },
  { q: 'How do strategies work?', a: 'Multi-condition patterns (e.g., "when Fear & Greed is low AND Volatility is high → buy, hold 7 days") backtested against real price data. Win rate, avg return, max drawdown, and vs buy-and-hold comparison. Only strategies beating random chance are shown.' },
];

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section id="faq" className="py-24 sm:py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)]" style={{ background: '#2B6CB0' }}>
      <div className="max-w-[800px] mx-auto">
        <div className="faq-reveal mb-4">
          <span className="text-xs font-mono text-[var(--bg)]/50 uppercase tracking-[0.15em]">You ask, we answer</span>
        </div>
        <h2 className="faq-reveal display text-[var(--bg)] mb-16" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 0.95 }}>
          Most Common<br />Questions
        </h2>
        <div className="faq-reveal">
          {FAQ_DATA.map((item, i) => (
            <FAQBubble
              key={i}
              q={item.q}
              a={item.a}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
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

// ─── Hero Section (collage cards + gradient) ─────────────────
const HERO_CARDS = [
  { id: 'regime', style: { left: '2%', top: '2%', width: 240, rotate: '-2deg', zIndex: 3 }, light: true, depth: 0.12, content: (
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
  )},
  { id: 'strategy', style: { left: '-3%', top: '24%', width: 280, rotate: '1.5deg', zIndex: 5 }, depth: 0.3, content: (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-3"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-[10px] text-[var(--text-muted)]">Strategy active right now</span></div>
      <p className="text-[12px] text-[var(--text)] leading-snug mb-3">Buy when fear is extreme and volatility spikes</p>
      <svg viewBox="0 0 220 35" className="w-full h-7 mb-3"><polyline points="0,30 20,28 40,25 60,27 80,20 100,22 120,15 140,18 160,10 180,12 200,5 220,3" fill="none" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" /><polyline points="0,30 20,29 40,28 60,30 80,27 100,26 120,25 140,24 160,22 180,20 200,18 220,15" fill="none" stroke="rgba(253,249,240,0.15)" strokeWidth="1" strokeDasharray="3 3" /></svg>
      <div className="flex items-baseline justify-between"><div className="flex items-baseline gap-2"><span className="text-xl font-mono font-bold text-[var(--text)]">80%</span><span className="text-[9px] text-[var(--text-muted)]">win rate</span></div><div className="flex items-baseline gap-2"><span className="text-sm font-mono text-green-400">+52%</span><span className="text-[9px] text-[var(--text-muted)]">vs HODL</span></div></div>
    </div>
  )},
  { id: 'chart', style: { left: '5%', top: '50%', width: 230, rotate: '-1deg', zIndex: 2 }, depth: 0.06, content: (
    <div className="px-5 py-4">
      <div className="flex items-baseline justify-between mb-1"><span className="text-[10px] text-[var(--text-muted)]">Exchange Net Flow</span><span className="text-[10px] font-mono text-green-400">+22.1%</span></div>
      <span className="text-[9px] text-[var(--text-muted)] block mb-2">Outflow from exchanges — accumulation signal</span>
      <svg viewBox="0 0 180 40" className="w-full h-8 mb-2"><polyline points="0,35 15,30 30,32 45,20 60,25 75,18 90,22 105,10 120,15 135,8 150,12 165,5 180,3" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><polyline points="0,35 15,30 30,32 45,20 60,25 75,18 90,22 105,10 120,15 135,8 150,12 165,5 180,3 180,40 0,40" fill="url(#hSparkFill)" stroke="none" /><defs><linearGradient id="hSparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs></svg>
      <div className="flex justify-between text-[8px] font-mono text-[var(--text-muted)]"><span>7d ago</span><span>today</span></div>
    </div>
  )},
  { id: 'signals', style: { left: '50%', top: '-2%', width: 310, rotate: '2deg', zIndex: 4 }, depth: 0.22, content: (
    <div className="px-4 py-3">
      <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider block mb-2">correlation matrix</span>
      <table className="w-full text-[10px]"><thead><tr className="text-[var(--text-muted)] text-left"><th className="font-normal pb-2">metric</th><th className="font-normal pb-2 text-right">r</th><th className="font-normal pb-2 text-right">p-value</th><th className="font-normal pb-2 text-right">direction</th></tr></thead><tbody className="font-mono">
        {[{m:'Volatility 14d',r:0.485,p:0.001,bull:true},{m:'Fear & Greed',r:-0.446,p:0.003,bull:false},{m:'Exchange Flow',r:0.391,p:0.008,bull:true},{m:'Funding Rate',r:-0.312,p:0.012,bull:false},{m:'Open Interest',r:0.198,p:0.041,bull:true}].map(s=>(<tr key={s.m} className="border-t border-[var(--border)]"><td className="py-1.5 text-[var(--text-muted)]">{s.m}</td><td className={`py-1.5 text-right ${s.bull?'text-[var(--accent)]':'text-red-400'}`}>{s.r>0?'+':''}{s.r.toFixed(3)}</td><td className="py-1.5 text-right text-[var(--text-muted)]">{s.p.toFixed(3)}</td><td className={`py-1.5 text-right ${s.bull?'text-[var(--accent)]':'text-red-400'}`}>{s.bull?'↑ bullish':'↓ bearish'}</td></tr>))}
      </tbody></table>
      <span className="text-[8px] text-[var(--text-muted)] block mt-2">5 of 15 metrics statistically significant (p &lt; 0.05)</span>
    </div>
  )},
  { id: 'onchain', style: { left: '46%', top: '24%', width: 280, rotate: '-1.5deg', zIndex: 6 }, depth: 0.38, content: (
    <div className="px-5 py-4">
      <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider block mb-3">on-chain · 3 chains</span>
      <div className="space-y-2.5">
        <div className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mt-1.5" /><div><span className="text-[11px] text-[var(--text)] block">Exchange outflow spike</span><span className="text-[9px] text-[var(--text-muted)]">3.2σ above avg · Binance, Coinbase</span></div></div>
        <div className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" /><div><span className="text-[11px] text-[var(--text)] block">Wash trading detected</span><span className="text-[9px] text-[var(--text-muted)]">18% of volume is round-trip</span></div></div>
        <div className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0 mt-1.5" /><div><span className="text-[11px] text-[var(--text)] block">Vesting schedule found</span><span className="text-[9px] text-[var(--text-muted)]">Recurring 50K transfers every 14d</span></div></div>
      </div>
    </div>
  )},
  { id: 'briefing', style: { left: '52%', top: '50%', width: 300, rotate: '1deg', zIndex: 3 }, depth: 0.18, content: (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-mono text-[var(--accent)]">ETH Briefing</span><span className="text-[9px] text-[var(--text-muted)]">just now</span></div>
      <p className="text-[12px] text-[var(--text)] leading-relaxed mb-3">Capitulation regime with 2 active strategies signaling buy. Exchange outflow spiking suggests accumulation.</p>
      <div className="flex gap-2"><span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">capitulation</span><span className="text-[9px] px-2 py-0.5 rounded-full bg-green-400/10 text-green-400">2 active</span><span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">outflow ↑</span></div>
    </div>
  )},
];

function HeroSection({ onAnalyze }: { onAnalyze: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    gsap.from(container.querySelectorAll('.collage-card'), {
      y: 60, opacity: 0, scale: 0.95,
      duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.4,
    });

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
    <section className="min-h-[110vh] relative overflow-hidden">
      {/* Gradient background — blurred orbs + diagonal silk texture */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-30%] right-[-20%] w-[90%] h-[130%]" style={{
          background: 'conic-gradient(from 220deg at 70% 40%, rgba(79,106,255,0.22) 0deg, rgba(99,102,241,0.15) 60deg, rgba(123,147,255,0.18) 120deg, transparent 200deg, transparent 360deg)',
          filter: 'blur(80px)',
        }} />
        <div className="absolute top-[-10%] right-[-15%] w-[80%] h-[110%]" style={{
          background: 'conic-gradient(from 180deg at 60% 50%, transparent 0deg, rgba(59,130,246,0.1) 90deg, rgba(147,130,220,0.08) 150deg, transparent 220deg, transparent 360deg)',
          filter: 'blur(100px)',
        }} />
        <div className="absolute top-[5%] right-[8%] w-[35%] h-[30%]" style={{
          background: 'radial-gradient(ellipse at center, rgba(123,147,255,0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <svg className="absolute opacity-[0.035] mix-blend-overlay" style={{ top: '-50%', left: '-50%', width: '200%', height: '200%', transform: 'rotate(-35deg)' }} xmlns="http://www.w3.org/2000/svg">
          <filter id="silk">
            <feTurbulence type="fractalNoise" baseFrequency="0.001 0.15" numOctaves="5" seed="8" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#silk)" />
        </svg>
      </div>

      {/* Hero text */}
      <div className="relative z-20 pt-36 sm:pt-48 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)]">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="hero-line display mb-5 max-w-[600px]" style={{ fontSize: 'clamp(4rem, 10vw, 7rem)', lineHeight: 0.9 }}>
            <span className="block">Every</span>
            <span className="block">token,</span>
            <span className="block text-white">Decoded</span>
          </h1>
          <p className="hero-line text-[var(--text-muted)] text-lg max-w-[460px] mb-8 leading-relaxed">
            31 metrics. 7 sources. Every pattern backtested.
          </p>
          <div className="hero-line flex gap-4">
            <button onClick={onAnalyze} className="relative w-full sm:w-auto !px-8 !py-4 text-base font-semibold text-white rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(88,112,247,0.35)] hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #8196FF, #5870F7, #3448C5)' }}>
              Analyze token
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: floating card collage */}
      <div ref={containerRef} className="absolute top-[120px] right-0 w-[55%] h-full hidden lg:block">
        {HERO_CARDS.map((card) => (
          <div
            key={card.id}
            className={`collage-card absolute rounded-2xl border border-white/[0.08]  transition-shadow duration-500 hover:border-white/[0.12] ${(card as any).light ? 'border-light-active' : ''}`}
            data-depth={card.depth}
            data-rotate={card.style.rotate}
            style={{ left: card.style.left, top: card.style.top, width: card.style.width, transform: `rotate(${card.style.rotate})`, zIndex: card.style.zIndex, willChange: 'transform', background: 'rgba(22,22,22,0.85)', boxShadow: '0 4px 24px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)' }}
          >
            <div className="absolute top-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(88,112,247,0.12), transparent)' }} />
            {card.content}
          </div>
        ))}
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 z-30 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))' }} />

      {/* Mobile: cards up to correlation matrix */}
      <div className="lg:hidden mt-12 px-[var(--side-margin-mobile)] relative z-10">
        <div className="border-light-active rounded-2xl border border-white/[0.08]  mb-3" style={{ background: 'rgba(22,22,22,0.85)' }}>{HERO_CARDS[0].content}</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl border border-white/[0.08]  flex flex-col" style={{ background: 'rgba(22,22,22,0.85)' }}>
            <div className="px-4 py-3 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-[9px] text-[var(--text-muted)]">Strategy active</span></div>
              <p className="text-[11px] text-[var(--text)] leading-snug mb-auto">Buy when fear is extreme and volatility spikes</p>
              <svg viewBox="0 0 220 35" className="w-full h-6 my-2"><polyline points="0,30 20,28 40,25 60,27 80,20 100,22 120,15 140,18 160,10 180,12 200,5 220,3" fill="none" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" /><polyline points="0,30 20,29 40,28 60,30 80,27 100,26 120,25 140,24 160,22 180,20 200,18 220,15" fill="none" stroke="rgba(253,249,240,0.15)" strokeWidth="1" strokeDasharray="3 3" /></svg>
              <div className="flex items-baseline justify-between"><span className="text-lg font-mono font-bold text-[var(--text)]">80%</span><span className="text-sm font-mono text-green-400">+52%</span></div>
              <div className="flex items-baseline justify-between"><span className="text-[8px] text-[var(--text-muted)]">win rate</span><span className="text-[8px] text-[var(--text-muted)]">vs HODL</span></div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08]  flex flex-col" style={{ background: 'rgba(22,22,22,0.85)' }}>
            <div className="px-4 py-3 flex-1 flex flex-col">
              <div className="flex items-baseline justify-between mb-1"><span className="text-[9px] text-[var(--text-muted)]">Exchange Net Flow</span><span className="text-[9px] font-mono text-green-400">+22.1%</span></div>
              <span className="text-[8px] text-[var(--text-muted)] block mb-auto">Outflow — accumulation signal</span>
              <svg viewBox="0 0 180 50" className="w-full h-10 my-2"><polyline points="0,45 15,40 30,42 45,30 60,35 75,28 90,32 105,20 120,25 135,18 150,22 165,15 180,10" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><polyline points="0,45 15,40 30,42 45,30 60,35 75,28 90,32 105,20 120,25 135,18 150,22 165,15 180,10 180,50 0,50" fill="url(#hSparkMob)" stroke="none" /><defs><linearGradient id="hSparkMob" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs></svg>
              <div className="flex justify-between text-[8px] font-mono text-[var(--text-muted)]"><span>7d ago</span><span>today</span></div>
            </div>
          </div>
        </div>
        <div className="relative rounded-2xl border border-white/[0.08]  overflow-hidden" style={{ background: 'rgba(22,22,22,0.85)' }}>
          {HERO_CARDS[3].content}
          <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))' }} />
        </div>
      </div>
    </section>
  );
}

// ─── Skeleton Reveal Section (nvg8 style) ────────────────────
const REVEAL_WORDS = [
  { text: 'With', highlight: false },
  { text: 'TORY', highlight: true },
  { text: 'every', highlight: false },
  { text: 'metric', highlight: false },
  { text: 'is', highlight: false },
  { text: 'cross-correlated,', highlight: false },
  { text: 'every', highlight: false },
  { text: 'pattern', highlight: false },
  { text: 'backtested,', highlight: false },
  { text: 'and', highlight: false },
  { text: 'every', highlight: false },
  { text: 'on-chain', highlight: false },
  { text: 'signal', highlight: false },
  { text: 'decoded', highlight: false },
  { text: '—', highlight: false },
  { text: 'in', highlight: false },
  { text: 'a', highlight: false },
  { text: 'single', highlight: false },
  { text: 'pass.', highlight: false },
];

function SkeletonRevealSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasRevealed = useRef(false);

  useEffect(() => {
    if (!sectionRef.current) return;

    const words = sectionRef.current.querySelectorAll('.skeleton-word');
    const skeletons = sectionRef.current.querySelectorAll('.skeleton-pill');
    const totalItems = words.length;

    // Scrub timeline — words reveal as you scroll through the section
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
        end: 'top 40%',
        scrub: 0.3,
      },
    });

    words.forEach((word, i) => {
      const skeleton = skeletons[i];
      if (!skeleton || !word) return;

      const start = i / totalItems;
      const reveal = 0.15;

      tl.fromTo(skeleton,
        { opacity: 1 },
        { opacity: 0, duration: reveal, ease: 'none' },
        start,
      );

      tl.fromTo(word,
        { opacity: 0 },
        { opacity: 1, duration: reveal, ease: 'power1.in' },
        start,
      );
    });

    return () => { tl.kill(); };
  }, []);

  return (
    <section className="py-32 sm:py-40 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] border-t border-[var(--border)]">
      <div ref={sectionRef} className="max-w-[900px] mx-auto text-center">
        <div className="flex flex-wrap justify-center gap-x-[0.3em] gap-y-[0.1em]" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}>
          {REVEAL_WORDS.map((w, i) => (
            <span key={i} className="relative inline-block">
              {/* Skeleton pill — behind text, fades out on scroll */}
              <span
                className="skeleton-pill absolute inset-0 rounded-xl z-0"
                style={{ background: 'rgba(253, 249, 240, 0.08)' }}
              />
              {/* Actual word — on top, starts dim, brightens on scroll */}
              <span
                className={`skeleton-word relative z-10 display ${
                  w.highlight
                    ? 'text-white px-3 py-1 rounded-xl'
                    : ''
                }`}
                style={{ opacity: 0, ...(w.highlight ? { background: 'linear-gradient(135deg, #8196FF, #5870F7, #3448C5)' } : {}) }}
              >
                {w.text}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════
export default function Home() {
  const router = useRouter();

  // GSAP scroll animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero stagger
      gsap.from('.hero-line', {
        y: 120, opacity: 0, duration: 1.4,
        ease: 'power3.out', stagger: 0.12, delay: 0.3,
      });

      // Intro section — text reveal on scroll
      gsap.from('.intro-text', {
        scrollTrigger: { trigger: '.section-intro', start: 'top 60%', once: true },
        y: 60, opacity: 0, duration: 1.2, ease: 'power3.out',
      });

      // Data pills — stagger in
      gsap.from('.data-pill', {
        scrollTrigger: { trigger: '.data-pills-grid', start: 'top 75%', once: true },
        y: 20, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.03,
      });

      // Feature chapters — slide in
      gsap.utils.toArray<HTMLElement>('.chapter-reveal').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 75%', once: true },
          y: 80, opacity: 0, duration: 1, ease: 'power3.out',
        });
      });

      // Stats reveal
      gsap.from('.stat-section', {
        scrollTrigger: { trigger: '.stat-section', start: 'top 75%', once: true },
        y: 40, opacity: 0, duration: 1, ease: 'power3.out',
      });

      // FAQ reveal
      gsap.from('.faq-reveal', {
        scrollTrigger: { trigger: '.faq-reveal', start: 'top 75%', once: true },
        y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
      });

      // Footer CTA
      gsap.from('.footer-cta', {
        scrollTrigger: { trigger: '.footer-cta', start: 'top 80%', once: true },
        y: 60, opacity: 0, duration: 1, ease: 'power3.out',
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <SmoothScroll>
      <Navigation />

      {/* ════════════════════════════════════════════════════════
          HERO — Collage cards + gradient background
          ════════════════════════════════════════════════════════ */}
      <HeroSection onAnalyze={() => router.push('/search')} />

      {/* ════════════════════════════════════════════════════════
          MARQUEE — Scrolling metric names
          ════════════════════════════════════════════════════════ */}
      <section className="py-6 border-y border-[var(--border)] overflow-hidden">
        <Marquee speed={45}>
          {['Exchange Flow', 'Wash Trading Detection', 'Token Velocity', 'Supply In Motion',
            'Fear & Greed Index', 'Funding Rates', 'Open Interest', 'Volatility',
            'Association Rules', 'Backtested Strategies', 'Cross-Correlation',
            'Anomaly Detection', 'Whale Tracking', 'Vesting Schedules',
          ].map((t) => (
            <span key={t} className="text-sm font-mono text-[var(--text-dim)] uppercase tracking-wider flex items-center gap-3">
              <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
              {t}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ════════════════════════════════════════════════════════
          INTRO — Skeleton stagger reveal (nvg8 style)
          ════════════════════════════════════════════════════════ */}
      <SkeletonRevealSection />

      {/* ════════════════════════════════════════════════════════
          FEATURES — Colored chapter sections (nvg8 style)
          ════════════════════════════════════════════════════════ */}
      <section id="features" className="relative">

        {/* Chapter 1: Score & Regime — Dark bg with feature preview */}
        <div className="chapter-reveal py-24 sm:py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] border-t border-[var(--border)]">
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="chapter-number" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>1</span>
                <span className="text-xs font-mono text-[var(--accent)] uppercase tracking-[0.15em]">Score & Regime</span>
              </div>
              <h3 className="display" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 0.95 }}>
                One number.<br />Infinite context.
              </h3>
              <p className="text-[var(--text-muted)] text-lg max-w-[450px] mt-6 leading-relaxed">
                A composite score from 0-100 distills 31 metrics into a single signal.
                The market regime tells you historically what happens next.
              </p>
            </div>
            {/* Feature preview — mirrors actual UI */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
              <div className="flex items-baseline gap-4 mb-4">
                <span className="text-3xl font-bold text-green-400" style={{ fontFamily: 'var(--font-display)' }}>Panic</span>
                <span className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-[0.15em]">Market regime</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-8">Extreme fear + high volume. Best buying opportunities historically appear here.</p>
              <div className="flex flex-wrap gap-6 text-xs font-mono text-[var(--text-dim)]">
                <div>
                  <span className="text-lg font-bold text-[var(--text)]">91</span>
                  <span className="block mt-0.5">days analyzed</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-[var(--text)]">8/15</span>
                  <span className="block mt-0.5">metrics significant</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-[var(--text)]">12</span>
                  <span className="block mt-0.5">strategies tested</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-[var(--text)]">2</span>
                  <span className="block mt-0.5">active now</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chapter 2: Signals — Dark bg with feature preview */}
        <div className="chapter-reveal py-24 sm:py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] border-t border-[var(--border)]">
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="chapter-number" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>2</span>
                <span className="text-xs font-mono text-[var(--accent)] uppercase tracking-[0.15em]">Signals</span>
              </div>
              <h3 className="display" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 0.95 }}>
                Which metrics<br />actually matter?
              </h3>
              <p className="text-[var(--text-muted)] text-lg max-w-[450px] mt-6 leading-relaxed">
                Every metric tested for correlation with price at 7 and 14-day horizons.
                Only statistically significant results (p &lt; 0.05) survive.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
              {[
                { name: 'Volatility (14d)', dir: '↑', strength: 'Strong', r: '0.485', bullish: true, bar: 85 },
                { name: 'Fear & Greed Index', dir: '↓', strength: 'Moderate', r: '-0.312', bullish: false, bar: 55 },
                { name: 'Funding Rate', dir: '↓', strength: 'Strong', r: '-0.446', bullish: false, bar: 78 },
              ].map((m) => (
                <div key={m.name} className="flex items-center justify-between py-4 border-b border-[var(--border)] last:border-0 gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-sm font-bold ${m.bullish ? 'text-green-400' : 'text-red-400'}`}>{m.dir}</span>
                    <div className="min-w-0">
                      <span className="text-sm text-[var(--text)] block truncate">{m.name}</span>
                      <span className="text-[11px] text-[var(--text-dim)]">{m.strength} · {m.bullish ? 'bullish' : 'bearish'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m.bullish ? 'bg-green-400' : 'bg-red-400'}`} style={{ width: `${m.bar}%` }} />
                    </div>
                    <span className="text-xs font-mono text-[var(--text-dim)] w-14 text-right">r = {m.r}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chapter 3: Strategies — Blue bg */}
        <div className="chapter-reveal py-24 sm:py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)]" style={{ background: '#4DA8FF' }}>
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="chapter-number">3</span>
                <span className="text-xs font-mono text-[var(--bg)]/60 uppercase tracking-[0.15em]">Strategies</span>
              </div>
              <h3 className="display text-[var(--bg)]" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 0.95 }}>
                Patterns that<br />print money.
              </h3>
              <p className="text-[var(--bg)]/70 text-lg max-w-[450px] mt-6 leading-relaxed">
                Multi-condition patterns backtested as trading rules. Win rates, equity curves,
                hold period optimization — all from real price data.
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--bg)] p-6 sm:p-8 text-[var(--text)]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-green-400 px-2 py-1 bg-green-400/10 rounded">A</span>
                  <span className="text-xs font-mono text-green-400 animate-pulse">LIVE</span>
                </div>
                <span className="text-xs text-[var(--text-dim)]">hold 7 days · 10 trades</span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-5">
                <span className="font-bold text-green-400">Buy</span> when Fear & Greed is low and Volatility is high
              </p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { v: '80%', l: 'win rate', c: 'text-green-400' },
                  { v: '+4.2%', l: 'avg return', c: 'text-green-400' },
                  { v: '+38%', l: 'total', c: 'text-[var(--text)]' },
                  { v: '+52%', l: 'vs HODL', c: 'text-green-400' },
                ].map((s) => (
                  <div key={s.l}>
                    <span className={`text-xl font-mono font-bold ${s.c}`}>{s.v}</span>
                    <span className="block text-[11px] text-[var(--text-dim)] mt-0.5">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chapter 4: On-chain — Dark bg with alert previews */}
        <div className="chapter-reveal py-24 sm:py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] border-t border-[var(--border)]">
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="chapter-number" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>4</span>
                <span className="text-xs font-mono text-[var(--accent)] uppercase tracking-[0.15em]">On-Chain</span>
              </div>
              <h3 className="display" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 0.95 }}>
                See what the<br />blockchain sees.
              </h3>
              <p className="text-[var(--text-muted)] text-lg max-w-[450px] mt-6 leading-relaxed">
                Real ERC20 transfers from 7 chains. Exchange flow detection, wash trading
                analysis, anomaly alerts — directly from Etherscan. No estimates.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8 space-y-3">
              <div className="px-4 py-3 rounded-xl border border-green-400/20 bg-green-400/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-green-400">EXCHANGE OUTFLOW SPIKE</span>
                  <span className="text-xs font-mono text-[var(--text-dim)]">3.2σ</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Large withdrawals from exchanges — holders accumulating.</p>
              </div>
              <div className="px-4 py-3 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-[var(--accent)]">WASH TRADING DETECTED</span>
                  <span className="text-xs font-mono text-[var(--text-dim)]">34%</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">34% of volume is round-trip. Real activity lower than it appears.</p>
              </div>
              <div className="px-4 py-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-yellow-400">VESTING SCHEDULE</span>
                  <span className="text-xs font-mono text-[var(--text-dim)]">recurring</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Periodic same-value transfers detected — possible token unlock.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          STATS — Animated counters
          ════════════════════════════════════════════════════════ */}
      <section className="stat-section py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] border-y border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto flex flex-wrap justify-center gap-16 sm:gap-24">
          <AnimatedStat value={31} label="Metrics per token" />
          <AnimatedStat value={7} label="Data sources" />
          <AnimatedStat value={11700} label="Tests per analysis" suffix="+" />
          <AnimatedStat value={90} label="Days of data" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS — Three steps
          ════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-32 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)]">
        <div className="max-w-[1200px] mx-auto">
          <div className="chapter-reveal text-center mb-20">
            <span className="tag-lime block mb-4">How it works</span>
            <h2 className="display display-md">
              Three steps. <span className="text-[var(--accent)]">Zero trust required</span>.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              { n: '01', title: 'Search', desc: 'Enter any token. We find it across CoinGecko, identify its chain deployments, and locate its contract addresses automatically.', color: '#1A3A5C' },
              { n: '02', title: 'Analyze', desc: '31 metrics fetched in parallel from 7 sources. 90 days of data. Correlations computed, association rules mined, strategies backtested.', color: '#4DA8FF' },
              { n: '03', title: 'Act', desc: 'Briefing tells you what matters. Signals show what correlates. Strategies tell you what historically works. On-chain shows what\'s happening now.', color: '#90CDF4' },
            ].map((step) => (
              <div key={step.n} className="chapter-reveal relative p-8 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] group hover:border-[var(--border-hover)] transition-all">
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-15 transition-opacity duration-700" style={{ background: step.color }} />
                <span className="display text-6xl block mb-6" style={{ color: step.color, opacity: 0.3 }}>{step.n}</span>
                <h3 className="display text-2xl mb-4">{step.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          DATA SOURCES — Pills
          ════════════════════════════════════════════════════════ */}
      <section className="py-24 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] border-t border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto text-center">
          <span className="tag-lime block mb-4">Data sources</span>
          <h2 className="display display-sm mb-12">
            Real data. <span className="text-[var(--accent)]">Seven sources</span>.
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: 'CoinGecko', desc: 'price · volume · mcap' },
              { name: 'Etherscan', desc: 'on-chain transfers' },
              { name: 'Binance Futures', desc: 'funding · OI · L/S' },
              { name: 'Hyperliquid', desc: 'perp data · funding' },
              { name: 'Alternative.me', desc: 'Fear & Greed' },
              { name: 'DeFiLlama', desc: 'TVL' },
              { name: 'Blockchain RPCs', desc: '7 chains' },
            ].map((s) => (
              <div key={s.name} className="flex items-center gap-3 px-5 py-3 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]/30 transition-colors">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-sm text-[var(--text)]">{s.name}</span>
                <span className="text-xs font-mono text-[var(--text-dim)]">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FAQ — nvg8 chat-bubble style on orange
          ════════════════════════════════════════════════════════ */}
      <FAQSection />

      {/* ════════════════════════════════════════════════════════
          FOOTER CTA — nvg8 style large text on cream
          ════════════════════════════════════════════════════════ */}
      <section className="py-32 sm:py-40 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] bg-[var(--bg-cream)]">
        <div className="footer-cta max-w-[1100px] mx-auto text-center">
          <h2 className="display text-[var(--bg)]" style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)', lineHeight: 0.95 }}>
            Start analyzing<br />
            <span style={{ color: 'var(--accent)' }}>your tokens</span>.
          </h2>
          <p className="text-[var(--bg)]/60 text-lg mt-6 mb-12 max-w-[500px] mx-auto">
            31 metrics, 7 sources, every correlation tested.
            Free. No signup required.
          </p>
          <button onClick={() => router.push('/search')} className="btn-primary text-lg !px-12 !py-5 !bg-[var(--accent)] !text-[var(--bg)] hover:!shadow-[0_0_40px_rgba(77,168,255,0.3)]">
            Launch Analysis
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════════════════ */}
      <footer className="py-12 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] border-t border-[var(--border)]">
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
