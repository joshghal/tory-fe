import { type ProcessedOnchain } from './onchainProcessor';

/**
 * Shared on-chain data cache.
 * Imported by both /api/onchain (writes) and /api/profile (reads).
 * In Next.js dev mode, module-level globals persist across API routes
 * only if they're in a shared lib file (not in route files).
 */

// Use globalThis to survive HMR in dev mode
const CACHE_KEY = '__onchain_cache__';

function getCache(): Map<string, { data: ProcessedOnchain & { chains: any[] }; ts: number }> {
  if (!(globalThis as any)[CACHE_KEY]) {
    (globalThis as any)[CACHE_KEY] = new Map();
  }
  return (globalThis as any)[CACHE_KEY];
}

export const onchainCache = {
  get(id: string) {
    const cache = getCache();
    const entry = cache.get(id);
    if (!entry) return null;
    if (Date.now() - entry.ts > 3600000) { // 1 hour TTL
      cache.delete(id);
      return null;
    }
    return entry;
  },
  set(id: string, data: ProcessedOnchain & { chains: any[] }) {
    getCache().set(id, { data, ts: Date.now() });
  },
};

// Progress tracker — same pattern
const PROGRESS_KEY = '__onchain_progress__';

export interface OnchainProgressEntry {
  status: 'fetching' | 'done' | 'error';
  totalChains: number;
  completedChains: number;
  currentChain: string;
  totalTransfers: number;
  startedAt: number;
  currentChainChunks: number;
  currentChainChunksDone: number;
  currentChainTransfers: number;
}

function getProgress(): Map<string, OnchainProgressEntry> {
  if (!(globalThis as any)[PROGRESS_KEY]) {
    (globalThis as any)[PROGRESS_KEY] = new Map();
  }
  return (globalThis as any)[PROGRESS_KEY];
}

export const onchainProgress = {
  get(id: string) { return getProgress().get(id) || null; },
  set(id: string, entry: OnchainProgressEntry) { getProgress().set(id, entry); },
  delete(id: string) { getProgress().delete(id); },
};
