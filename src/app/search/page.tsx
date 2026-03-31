"use client"

import Navigation from '@/components/Navigation';
import { searchTokenUsingGet } from '@/services/custom';
import { TransformedSearchItem } from '@/types/token';
import { useRequest } from 'ahooks';
import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Popular tokens ──────────────────────────────────────────
const POPULAR = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', color: '#f7931a' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', color: '#627eea' },
  { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', color: '#ff007a' },
  { id: 'aave', name: 'Aave', symbol: 'AAVE', color: '#b6509e' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', color: '#2a5ada' },
  { id: 'maker', name: 'Maker', symbol: 'MKR', color: '#1aab9b' },
  { id: 'pepe', name: 'Pepe', symbol: 'PEPE', color: '#3d9b3d' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', color: '#9945ff' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', color: '#c2a633' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', color: '#28a0f0' },
  { id: 'optimism', name: 'Optimism', symbol: 'OP', color: '#ff0420' },
  { id: 'render-token', name: 'Render', symbol: 'RNDR', color: '#e54b4b' },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { run: search, data: results, loading, mutate, cancel } = useRequest(searchTokenUsingGet, {
    manual: true,
    debounceWait: 300,
  });

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim().length >= 2) {
      search(value.trim());
    } else {
      mutate(undefined);
    }
  }, [search, mutate]);

  const goToToken = (id: string) => {
    router.push(`/detail?id=${id}`);
  };

  const hasResults = results?.data && results.data.length > 0;
  const noResults = results?.data && results.data.length === 0 && query.length >= 2;

  return (
    <>
      <Navigation />

      <section className="min-h-[100svh] flex flex-col pt-28 pb-20 px-[var(--side-margin-mobile)] sm:px-[var(--side-margin)] relative">
        {/* Background grain */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

        <div className="max-w-[700px] mx-auto w-full relative z-10 flex-1 flex flex-col">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="display display-lg mb-3">
              Analyze <span className="text-[var(--accent)]">any</span> token
            </h1>
            <p className="text-[var(--text-muted)] text-lg">
              31 metrics. 7 sources. 90 days. Instant statistical profile.
            </p>
          </div>

          {/* Search input */}
          <div className="relative mb-8">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results?.data?.[0]?.arkhamSlug) {
                    goToToken(results.data[0].arkhamSlug);
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                    setQuery('');
                    mutate({ message: 'SUCCESS', status: 200, data: [] } as any);
                    setTimeout(() => mutate(undefined), 0);
                  }
                }}
                placeholder="Search tokens... Bitcoin, Ethereum, Aave..."
                className="search-input-glow w-full p-5 pl-14 text-lg bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none transition-all duration-300"
                style={{ fontFamily: 'var(--font-geist-sans)' }}
              />
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-dim)]" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
              </svg>
              {loading && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-[var(--text-dim)] border-t-[var(--accent)] rounded-full animate-spin" />
              )}
              {query.length > 0 && !loading && (
                <button
                  onClick={() => { cancel(); setQuery(''); mutate(undefined); inputRef.current?.focus(); }}
                  className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--text)]/10 hover:bg-[var(--text)]/20 transition-colors text-[var(--text-dim)]"
                >
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Keyboard hint */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <span className="text-[10px] font-mono text-[var(--text-dim)] flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--text)]/5 border border-[var(--border)] text-[var(--text-dim)]">Enter</kbd>
                first result
              </span>
              <span className="text-[10px] font-mono text-[var(--text-dim)] flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--text)]/5 border border-[var(--border)] text-[var(--text-dim)]">Esc</kbd>
                clear
              </span>
            </div>
          </div>

          {/* Search results */}
          {hasResults && (
            <div className="space-y-2 mb-12">
              {results.data.map((token: TransformedSearchItem) => (
                <button
                  key={`${token.symbol}-${token.arkhamSlug}`}
                  onClick={() => goToToken(token.arkhamSlug)}
                  className="w-full p-4 flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.03] transition-all duration-200 text-left group"
                >
                  {token.image && (
                    <Image src={token.image} alt={token.label} width={40} height={40} className="rounded-xl" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate">{token.label}</span>
                      <span className="text-xs font-mono text-[var(--text-dim)] shrink-0">{token.symbol}</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-[var(--text-dim)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {noResults && (
            <div className="text-center py-12 mb-12">
              <p className="text-[var(--text-dim)] text-sm">No tokens found for &ldquo;{query}&rdquo;</p>
              <p className="text-[var(--text-dim)] text-xs mt-1">Try a different name or symbol</p>
            </div>
          )}

          {/* Popular tokens — show when no search active */}
          {!hasResults && !noResults && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-[0.15em]">Popular tokens</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {POPULAR.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => goToToken(token.id)}
                    className="group p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] transition-all duration-300 text-left relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-0 group-hover:opacity-15 transition-opacity duration-500" style={{ background: token.color }} />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: token.color }} />
                        <span className="text-xs font-mono text-[var(--text-dim)]">{token.symbol}</span>
                      </div>
                      <span className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{token.name}</span>
                    </div>
                    <svg className="absolute bottom-4 right-4 w-4 h-4 text-[var(--text-dim)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              <p className="text-center text-xs text-[var(--text-dim)] mt-8">
                Any token on CoinGecko is supported. On-chain analysis available for ERC20 tokens on 7 chains.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
