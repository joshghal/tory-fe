"use client"

import Navigation from '@/components/Navigation';
import TokenInsights from '@/components/TokenInsights';
import { HowItWorksProvider } from '@/components/HowItWorks';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TokenMeta {
  name: string;
  symbol: string;
  image: string;
}

const TokenDetailPage = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || searchParams.get('arkhamSlug') || '';
  const [meta, setMeta] = useState<TokenMeta | null>(null);

  useEffect(() => {
    if (!id) return;
    setMeta({ name: id, symbol: id.toUpperCase(), image: '' });
  }, [id]);

  if (!id) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
    </div>
  );

  return (
    <HowItWorksProvider>
      <Navigation />

      <section className="pt-24 pb-6 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)]">
        <div className="max-w-[1200px] mx-auto w-full">
          {meta ? (
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              {/* Left — token identity */}
              <div className="flex items-center gap-4">
                {meta.image && (
                  <img
                    src={meta.image}
                    alt={meta.name}
                    width={48}
                    height={48}
                    className="rounded-xl"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div>
                  <div className="flex items-baseline gap-3">
                    <h1 className="display text-3xl sm:text-4xl">{meta.name}</h1>
                    <span className="text-sm font-mono text-[var(--accent)]">{meta.symbol}</span>
                  </div>
                  <p className="text-xs text-[var(--text-dim)] mt-1">
                    31 metrics · 7 sources · 90 days · DYOR
                  </p>
                </div>
              </div>

              {/* Right — compact meta */}
              <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-dim)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  Statistical analysis
                </span>
                <span className="hidden sm:inline text-[var(--border)]">|</span>
                <span className="hidden sm:inline">Not financial advice</span>
              </div>
            </div>
          ) : (
            <div className="h-16 flex items-center">
              <div className="w-5 h-5 border border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </section>

      <div className="px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] mb-8">
        <div className="max-w-[1200px] mx-auto w-full h-px bg-gradient-to-r from-[var(--accent)]/20 via-[var(--border)] to-transparent" />
      </div>

      <section className="px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] pb-32">
        <div className="max-w-[1200px] mx-auto w-full">
          <TokenInsights tokenId={id} onMeta={setMeta} />
        </div>
      </section>
    </HowItWorksProvider>
  );
}

export default TokenDetailPage;
