"use client"

const COLORS = [
  { name: 'Current', hex: '#4DA8FF', desc: 'Sky blue — soft, informational' },
  { name: 'Electric', hex: '#3B82F6', desc: 'Tailwind blue-500 — saturated, punchy' },
  { name: 'Vivid', hex: '#2563EB', desc: 'Deeper blue — authority, trust' },
  { name: 'Cyan', hex: '#38BDF8', desc: 'Sky-400 — energetic, fresh' },
  { name: 'Neon', hex: '#60A5FA', desc: 'Blue-400 — lighter, vibrant' },
  { name: 'Custom', hex: '#5B8DEF', desc: 'Periwinkle-electric hybrid — unique' },
  { name: 'Indigo', hex: '#6366F1', desc: 'Indigo-500 — modern, premium' },
  { name: 'Royal', hex: '#4F6AFF', desc: 'Deep electric — bold, distinctive' },
];

function ColorDemo({ color }: { color: typeof COLORS[0] }) {
  return (
    <div className="p-8 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(14,14,14,0.95)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ background: color.hex }} />
          <span className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{color.name}</span>
          <code className="text-[10px] font-mono text-white/40">{color.hex}</code>
        </div>
        <span className="text-[10px] text-white/40">{color.desc}</span>
      </div>

      {/* Hero text preview */}
      <div className="mb-6">
        <h2 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)', lineHeight: 0.9 }}>
          Every token, <span style={{ color: color.hex }}>Decoded</span>
        </h2>
        <p className="text-sm text-white/50 mt-3">31 metrics. 7 sources. Every pattern backtested.</p>
      </div>

      {/* Button */}
      <button className="px-6 py-2.5 rounded-full text-sm font-semibold mb-6" style={{ background: color.hex, color: '#0e0e0e' }}>
        Analyze token
      </button>

      {/* UI elements preview */}
      <div className="grid grid-cols-2 gap-4">
        {/* Signal row */}
        <div className="p-3 rounded-xl border border-white/[0.06]" style={{ background: 'rgba(22,22,22,0.8)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold" style={{ color: color.hex }}>↑</span>
            <span className="text-[11px] text-white/80">Volatility (14d)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full w-[85%]" style={{ background: color.hex }} />
            </div>
            <span className="text-[9px] font-mono" style={{ color: color.hex }}>0.485</span>
          </div>
        </div>

        {/* Badge + tag */}
        <div className="p-3 rounded-xl border border-white/[0.06]" style={{ background: 'rgba(22,22,22,0.8)' }}>
          <span className="text-[9px] font-mono text-white/40 block mb-2">market mood</span>
          <span className="text-xl font-bold" style={{ color: color.hex, fontFamily: 'var(--font-display)' }}>Panic</span>
          <div className="flex gap-2 mt-2">
            <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: `${color.hex}15`, color: color.hex }}>2 active</span>
            <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: `${color.hex}15`, color: color.hex }}>outflow ↑</span>
          </div>
        </div>

        {/* Alert */}
        <div className="p-3 rounded-xl" style={{ background: `${color.hex}08`, border: `1px solid ${color.hex}20` }}>
          <span className="text-[10px] font-mono font-bold" style={{ color: color.hex }}>EXCHANGE OUTFLOW</span>
          <span className="text-[9px] text-white/40 ml-2">3.2σ</span>
          <p className="text-[9px] text-white/50 mt-1">Holders accumulating</p>
        </div>

        {/* Mono data */}
        <div className="p-3 rounded-xl border border-white/[0.06]" style={{ background: 'rgba(22,22,22,0.8)' }}>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-white">80%</span>
            <span className="text-[9px] text-white/40">win rate</span>
          </div>
          <span className="text-sm font-mono" style={{ color: color.hex }}>+52% <span className="text-white/30">vs HODL</span></span>
        </div>
      </div>

      {/* Link text */}
      <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px]" style={{ color: color.hex }}>ETH Briefing</span>
        <span className="text-[10px] text-white/30">Correlation r = <span style={{ color: color.hex }}>0.485</span></span>
      </div>
    </div>
  );
}

export default function ColorsPage() {
  return (
    <div className="min-h-screen bg-[#0e0e0e] p-6 sm:p-12">
      <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>Accent color comparison</h1>
      <p className="text-sm text-white/40 mb-10">Same UI, different blue. Pick one.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1400px]">
        {COLORS.map(c => <ColorDemo key={c.hex} color={c} />)}
      </div>
    </div>
  );
}
