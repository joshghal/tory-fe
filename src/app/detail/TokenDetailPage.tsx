"use client"

import Navigation from '@/components/Navigation';
import SmoothScroll from '@/components/SmoothScroll';
import TokenInsights from '@/components/TokenInsights';
import { HowItWorksProvider } from '@/components/HowItWorks';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import axios from 'axios';

gsap.registerPlugin(ScrollTrigger);

interface TokenMeta {
  name: string;
  symbol: string;
  image: string;
}

const TokenDetailPage = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || searchParams.get('arkhamSlug') || '';
  const [meta, setMeta] = useState<TokenMeta | null>(null);

  // Meta comes from /api/profile response (no separate call needed).
  // Show placeholder header immediately, update when profile loads.
  useEffect(() => {
    if (!id) return;
    setMeta({ name: id, symbol: id.toUpperCase(), image: '' });
  }, [id]);

  useEffect(() => {
    if (meta) {
      gsap.from('.detail-reveal', {
        y: 40, opacity: 0, duration: 0.8,
        ease: 'power3.out', stagger: 0.1, delay: 0.2,
      });
    }
  }, [meta]);

  if (!id) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
    </div>
  );

  return (
    <HowItWorksProvider>
    <SmoothScroll>
      <Navigation />

      <section className="pt-24 pb-8 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)]">
        <div className="max-w-[1200px] mx-auto w-full">
          {meta ? (
            <>
              <div className="detail-reveal flex items-center gap-5 mb-4">
                {meta.image && (
                  <div className="relative">
                    <img src={meta.image} alt={meta.name} width={56} height={56} className="rounded-2xl relative z-10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="absolute -inset-1 rounded-2xl bg-[var(--accent)]/15 blur-lg" />
                  </div>
                )}
                <div>
                  <h1 className="display display-md">{meta.name}</h1>
                  <span className="text-sm font-mono text-[var(--accent)]">{meta.symbol}</span>
                </div>
              </div>

              <div className="detail-reveal w-full h-px bg-gradient-to-r from-[var(--accent)]/30 via-[var(--border)] to-transparent my-6" />

              <p className="detail-reveal text-[var(--text-muted)] text-sm max-w-[600px]">
                Statistical analysis of <span className="text-[var(--accent)]">{meta.symbol}</span> using 31 metrics from 7 data sources.
                All correlations, association rules, and strategies are computed from 90 days of real data.
                <span className="block mt-2 text-xs text-[var(--text-dim)]">DYOR — Statistical analysis only. Not financial advice.</span>
              </p>
            </>
          ) : (
            <div className="h-20 flex items-center">
              <div className="w-5 h-5 border border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </section>

      <section className="px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] pb-32">
        <div className="max-w-[1200px] mx-auto w-full">
          <TokenInsights tokenId={id} onMeta={setMeta} />
        </div>
      </section>
    </SmoothScroll>
    </HowItWorksProvider>
  );
}

export default TokenDetailPage;
