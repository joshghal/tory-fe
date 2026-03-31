'use client';

import { useState, useRef, useEffect, createContext, useContext, useCallback } from 'react';
import { gsap } from 'gsap';

const STEPS = [
  {
    n: '01', title: 'Score & Regime',
    desc: 'A composite score from 0–100 tells you the overall outlook. Above 60 = bullish, below 40 = bearish. The market regime (Panic, Euphoria, Neutral) gives context — historically, Panic = best buying opportunities.',
  },
  {
    n: '02', title: 'Signals',
    desc: 'Each metric is tested for statistical correlation with price over 7 and 14 days. "Strong ↓ bearish" means when that metric is high, price reliably drops. Only statistically proven relationships are shown (p < 0.05).',
  },
  {
    n: '03', title: 'Strategies',
    desc: 'Multi-condition patterns backtested as trading rules against real price data. Win rate = how often it profits. The engine tests 8 hold periods (1d to 30d) and picks the best. Expand any strategy to see the equity curve and every trade.',
  },
  {
    n: '04', title: 'On-chain',
    desc: 'Real blockchain transfer data from Etherscan — not estimates, not social signals, actual token movements. Exchange Net Flow tells you if holders are moving tokens to exchanges (selling) or out (accumulating). Wash Trading % reveals how much volume is fake. Anomaly alerts fire when any metric deviates 2.5+ standard deviations from its 30-day average. Vesting schedules are auto-detected from recurring same-value transfers.',
  },
  {
    n: '05', title: 'Active & Patterns',
    desc: 'When ALL conditions of a backtested strategy are met right now, it becomes a live signal. Patterns show every repeating condition discovered — those marked "backtested" were verified as strategies.',
  },
];

function StepVisual({ step }: { step: number }) {
  if (step === 0) return (
    <div className="p-6 w-full">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-6xl font-bold text-[var(--accent)]" style={{ fontFamily: 'var(--font-display)' }}>72</span>
            <span className="text-sm font-mono text-[var(--text-dim)] pb-2">/100</span>
            <span className="text-xs font-mono text-green-400 uppercase pb-2.5">Bullish</span>
          </div>
          <div className="flex gap-6 text-xs font-mono text-[var(--text-dim)]">
            <span><span className="text-lg font-bold text-[var(--text)]">91</span> days analyzed</span>
            <span><span className="text-lg font-bold text-[var(--text)]">8</span> of 15 metrics significant</span>
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-wider mb-1">Market regime</span>
          <span className="text-2xl font-bold text-green-400 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Panic</span>
          <span className="text-xs text-[var(--text-muted)]">Extreme fear + high volume. Best buying opportunities historically appear here.</span>
        </div>
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="p-6 w-full">
      {[
        { name: 'Volatility (14d)', dir: '↑', s: 'Strong', r: '0.485', c: 'text-green-400', desc: 'When volatility rises, price tends to follow' },
        { name: 'Fear & Greed Index', dir: '↓', s: 'Moderate', r: '-0.312', c: 'text-red-400', desc: 'High greed predicts price drops (contrarian)' },
        { name: 'Funding Rate (Binance)', dir: '↓', s: 'Strong', r: '-0.446', c: 'text-red-400', desc: 'Overcrowded longs get liquidated' },
      ].map((m, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
          <div className="flex items-center gap-3 flex-1">
            <span className={`text-sm ${m.c}`}>{m.dir}</span>
            <div>
              <span className="text-sm text-[var(--text)]">{m.name}</span>
              <span className="block text-xs text-[var(--text-dim)]">{m.desc}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-[var(--text-muted)] block">{m.s}</span>
            <span className="text-xs font-mono text-[var(--text-dim)]">r = {m.r}</span>
          </div>
        </div>
      ))}
    </div>
  );
  if (step === 2) return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-green-400 px-2.5 py-1 bg-green-400/8 rounded">A</span>
          <span className="text-xs font-mono text-green-400 animate-pulse">● LIVE</span>
        </div>
        <span className="text-xs text-[var(--text-dim)]">hold 7 days · 10 trades</span>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-5">
        <span className="font-bold text-green-400">Buy</span> when Fear & Greed is low and Volatility is high
      </p>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <span className="text-2xl font-mono font-bold text-green-400">80%</span>
          <span className="block text-xs text-[var(--text-dim)] mt-0.5">win rate</span>
          <span className="block text-xs text-[var(--text-dim)]">8 of 10 won</span>
        </div>
        <div>
          <span className="text-2xl font-mono font-bold text-green-400">+4.2%</span>
          <span className="block text-xs text-[var(--text-dim)] mt-0.5">avg return</span>
          <span className="block text-xs text-[var(--text-dim)]">$42 per $1K</span>
        </div>
        <div>
          <span className="text-2xl font-mono font-bold text-[var(--text)]">+38%</span>
          <span className="block text-xs text-[var(--text-dim)] mt-0.5">total return</span>
          <span className="block text-xs text-[var(--text-dim)]">$1K → $1,380</span>
        </div>
        <div>
          <span className="text-2xl font-mono font-bold text-green-400">+52%</span>
          <span className="block text-xs text-[var(--text-dim)] mt-0.5">vs buy & hold</span>
          <span className="block text-xs text-[var(--text-dim)]">beat passive</span>
        </div>
      </div>
    </div>
  );
  if (step === 3) return (
    <div className="p-6 w-full space-y-3">
      <div className="px-3 py-2.5 rounded-lg border border-green-400/20 bg-green-400/5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold text-green-400">EXCHANGE OUTFLOW SPIKE</span>
          <span className="text-xs font-mono text-[var(--text-dim)]">3.2σ</span>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Large amounts withdrawn from exchanges — holders accumulating.</p>
      </div>
      <div className="px-3 py-2.5 rounded-lg border border-[var(--accent-orange)]/20 bg-[var(--accent-orange)]/5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold text-[var(--accent-orange)]">WASH TRADING DETECTED</span>
          <span className="text-xs font-mono text-[var(--text-dim)]">34% of volume</span>
        </div>
        <p className="text-xs text-[var(--text-muted)]">34% of today&apos;s volume is round-trip. Real activity is lower than it appears.</p>
      </div>
      {[
        { name: 'Exchange Net Flow', r: '+22.1%', desc: 'Off-exchange = accumulation', color: 'text-green-400', bar: 70 },
        { name: 'Token Velocity', r: '+15.3%', desc: 'How fast tokens change hands', color: 'text-green-400', bar: 48 },
        { name: 'Wash Trading %', r: '+20.9%', desc: 'Round-trip transfer detection', color: 'text-green-400', bar: 65 },
      ].map((m, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
          <div className="flex-1">
            <span className="text-sm text-[var(--text)]">{m.name}</span>
            <span className="block text-[10px] text-[var(--text-dim)]">{m.desc}</span>
          </div>
          <span className={`text-sm font-mono font-bold ${m.color}`}>{m.r}</span>
          <div className="w-12 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-green-400" style={{ width: `${m.bar}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-2 mb-5">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-mono text-green-400 uppercase tracking-wider">2 strategies active right now</span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
          <div>
            <span className="text-sm text-[var(--text)]"><span className="text-green-400 font-bold">Buy</span> · hold 7 days</span>
            <span className="block text-xs text-[var(--text-dim)]">F&G low AND Volatility high AND OI low</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono font-bold text-green-400">80% win</span>
            <span className="block text-xs text-[var(--text-dim)]">avg +4.2%</span>
          </div>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <span className="text-sm text-[var(--text)]"><span className="text-red-400 font-bold">Sell</span> · hold 3 days</span>
            <span className="block text-xs text-[var(--text-dim)]">Momentum high AND Funding Rate high</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono font-bold text-green-400">75% win</span>
            <span className="block text-xs text-[var(--text-dim)]">avg +2.1%</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-[var(--text-dim)] mt-4">These conditions are met right now based on the latest metric values. Act accordingly.</p>
    </div>
  );
}

// ── Context so any button can open the modal ──
type GuideCtx = { open: (step: number) => void };
const GuideContext = createContext<GuideCtx>({ open: () => {} });

export function HowItWorksProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  const openModal = useCallback((s: number) => { setStep(s); setIsOpen(true); }, []);

  const close = () => {
    if (!overlayRef.current || !panelRef.current) return;
    gsap.to(panelRef.current, { y: 20, opacity: 0, duration: 0.25, ease: 'power3.in' });
    gsap.to(overlayRef.current, {
      opacity: 0, duration: 0.25, delay: 0.05,
      onComplete: () => { setIsOpen(false); document.body.style.overflow = ''; }
    });
  };

  const goTo = (i: number) => {
    if (visualRef.current) {
      gsap.to(visualRef.current, {
        opacity: 0, y: 10, duration: 0.15, ease: 'power2.in',
        onComplete: () => {
          setStep(i);
          gsap.fromTo(visualRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' });
        }
      });
    } else setStep(i);
  };

  const next = () => step < STEPS.length - 1 ? goTo(step + 1) : close();
  const prev = () => step > 0 && goTo(step - 1);

  useEffect(() => {
    if (isOpen && overlayRef.current && panelRef.current) {
      document.body.style.overflow = 'hidden';
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(panelRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', delay: 0.05 });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, step]);

  const current = STEPS[step];

  return (
    <GuideContext.Provider value={{ open: openModal }}>
      {children}

      {isOpen && (
        <div ref={overlayRef} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8" style={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />
          <div ref={panelRef} className="relative w-full max-w-[720px]" style={{ opacity: 0 }}>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
              <div ref={visualRef} className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                <StepVisual step={step} />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-[var(--accent)]">{step + 1} / {STEPS.length}</span>
                  <button onClick={close} className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-start gap-3 mb-5">
                  <span className="text-3xl font-bold text-[var(--text)]/[0.08] leading-none" style={{ fontFamily: 'var(--font-display)' }}>{current.n}</span>
                  <div>
                    <h4 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-display)' }}>{current.title}</h4>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-2">{current.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={prev} disabled={step === 0}
                    className="text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] transition-colors disabled:opacity-20">
                    ← Back
                  </button>
                  <div className="flex gap-1.5">
                    {STEPS.map((_, i) => (
                      <button key={i} onClick={() => goTo(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === step ? 'w-6 bg-[var(--accent)]' : 'w-1.5 bg-[var(--border)] hover:bg-[var(--text-dim)]'
                        }`} />
                    ))}
                  </div>
                  <button onClick={next}
                    className="text-xs font-mono text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
                    {step === STEPS.length - 1 ? 'Got it ✓' : 'Next →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </GuideContext.Provider>
  );
}

// ── Button that any section can render ──
export function HowItWorksButton({ step = 0, label }: { step?: number; label?: string }) {
  const { open } = useContext(GuideContext);
  return (
    <button onClick={() => open(step)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)]/8 text-[var(--accent)] hover:bg-[var(--accent)]/15 hover:text-[var(--accent-light)] transition-all text-xs font-mono">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5.5 5.5C5.5 4.67 6.17 4 7 4C7.83 4 8.5 4.67 8.5 5.5C8.5 6.33 7.83 7 7 7V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
      </svg>
      {label || 'How to read'}
    </button>
  );
}

// Default export for backward compat (renders just the button for step 0)
export default function HowItWorks() {
  return <HowItWorksButton step={0} label="How to read this analysis" />;
}
