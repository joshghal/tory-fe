import { NextRequest, NextResponse } from 'next/server';
import { getCoinDetail } from '@/lib/coingecko';
import { processTransfers, type RawTransfer, type ProcessedOnchain } from '@/lib/onchainProcessor';

/**
 * GET /api/onchain?id=uniswap
 *
 * Fetches ERC20 transfers via Etherscan V2 → processes into daily metrics + events.
 * Results are cached in-memory (1 hour TTL).
 */

const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || '';
const PAGE_SIZE = 10000;
const MAX_PAGES = 100; // Up to 1M transfers per chain — covers 90d for even the most active tokens

// Chain config: Etherscan V2 for supported chains, Blockscout/Routescan for others
interface ChainConfig {
  chainId: number;
  name: string;
  // 'etherscan' = use Etherscan V2, 'custom' = use custom API URL
  source: 'etherscan' | 'custom';
  customApi?: string;
}

const CHAINS: Record<string, ChainConfig> = {
  ethereum:               { chainId: 1,     name: 'Ethereum',  source: 'etherscan' },
  'polygon-pos':          { chainId: 137,   name: 'Polygon',   source: 'etherscan' },
  'arbitrum-one':         { chainId: 42161, name: 'Arbitrum',  source: 'etherscan' },
  base:                   { chainId: 8453,  name: 'Base',      source: 'custom', customApi: 'https://base.blockscout.com/api' },
  'optimistic-ethereum':  { chainId: 10,    name: 'Optimism',  source: 'custom', customApi: 'https://api.routescan.io/v2/network/mainnet/evm/10/etherscan/api' },
  avalanche:              { chainId: 43114, name: 'Avalanche', source: 'custom', customApi: 'https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api' },
  'binance-smart-chain':  { chainId: 56,    name: 'BSC',       source: 'custom', customApi: 'https://api.bscscan.com/api' }, // may not work without key
};

import { onchainCache, onchainProgress } from '@/lib/onchainCache';

// ─── Token transfer fetch (multi-source) ─────────────────────

async function fetchTokenTxs(
  chain: ChainConfig, contract: string, startTimestamp: number,
  onProgress?: (chunksDone: number, totalChunks: number, txsSoFar: number) => void,
): Promise<RawTransfer[]> {
  const allTxs: RawTransfer[] = [];

  if (chain.source === 'etherscan') {
    // Etherscan V2: 10k cap per query. Use block-range chunking.
    // Etherscan is fast (5 calls/sec) so we can do 15 chunks safely.
    let startBlock = 0, endBlock = 0;
    try {
      const [startRes, endRes] = await Promise.all([
        fetch(`https://api.etherscan.io/v2/api?chainid=${chain.chainId}&module=block&action=getblocknobytime&timestamp=${startTimestamp}&closest=after&apikey=${ETHERSCAN_KEY}`, { signal: AbortSignal.timeout(10000) }),
        fetch(`https://api.etherscan.io/v2/api?chainid=${chain.chainId}&module=block&action=getblocknobytime&timestamp=${Math.floor(Date.now() / 1000)}&closest=before&apikey=${ETHERSCAN_KEY}`, { signal: AbortSignal.timeout(10000) }),
      ]);
      const startJson = await startRes.json();
      const endJson = await endRes.json();
      if (startJson.status === '1') startBlock = parseInt(startJson.result);
      if (endJson.status === '1') endBlock = parseInt(endJson.result);
    } catch { /* fallback below */ }

    if (endBlock > startBlock) {
      const totalBlocks = endBlock - startBlock;
      const NUM_CHUNKS = 15;
      const chunkSize = Math.ceil(totalBlocks / NUM_CHUNKS);
      onProgress?.(0, NUM_CHUNKS, 0);

      for (let i = 0; i < NUM_CHUNKS; i++) {
        const fromBlock = startBlock + (i * chunkSize);
        const toBlock = Math.min(fromBlock + chunkSize - 1, endBlock);
        try {
          const res = await fetch(
            `https://api.etherscan.io/v2/api?chainid=${chain.chainId}&module=account&action=tokentx` +
            `&contractaddress=${contract}&startblock=${fromBlock}&endblock=${toBlock}` +
            `&page=1&offset=${PAGE_SIZE}&sort=asc&apikey=${ETHERSCAN_KEY}`,
            { signal: AbortSignal.timeout(30000) }
          );
          const json = await res.json();
          if (json.status === '1' && Array.isArray(json.result)) {
            for (const tx of json.result) allTxs.push(tx);
          }
        } catch { /* skip chunk */ }
        onProgress?.(i + 1, NUM_CHUNKS, allTxs.length);
        await new Promise(r => setTimeout(r, 200));
      }
    }
  } else if (chain.customApi) {
    // Blockscout / Routescan: etherscan-compatible API, no key needed
    // These APIs cap at 10k results per query. Use block-range chunking for full 90d coverage.
    // Step 1: Get start and end block numbers
    let startBlock = 0, endBlock = 0;
    try {
      const [startRes, endRes] = await Promise.all([
        fetch(`${chain.customApi}?module=block&action=getblocknobytime&timestamp=${startTimestamp}&closest=after`, { signal: AbortSignal.timeout(10000) }),
        fetch(`${chain.customApi}?module=block&action=getblocknobytime&timestamp=${Math.floor(Date.now() / 1000)}&closest=before`, { signal: AbortSignal.timeout(10000) }),
      ]);
      const startJson = await startRes.json();
      const endJson = await endRes.json();
      startBlock = parseInt(startJson.result?.blockNumber || startJson.result || '0');
      endBlock = parseInt(endJson.result?.blockNumber || endJson.result || '0');
    } catch { /* fall through with block 0 */ }

    if (endBlock > startBlock) {
      const totalBlocks = endBlock - startBlock;
      const NUM_CHUNKS = 15;
      const chunkSize = Math.ceil(totalBlocks / NUM_CHUNKS);
      onProgress?.(0, NUM_CHUNKS, 0);

      for (let i = 0; i < NUM_CHUNKS; i++) {
        const fromBlock = startBlock + (i * chunkSize);
        const toBlock = Math.min(fromBlock + chunkSize - 1, endBlock);
        try {
          const res = await fetch(
            `${chain.customApi}?module=account&action=tokentx` +
            `&contractaddress=${contract}&startblock=${fromBlock}&endblock=${toBlock}` +
            `&page=1&offset=${PAGE_SIZE}&sort=asc`,
            { signal: AbortSignal.timeout(30000) }
          );
          const json = await res.json();
          if (json.status === '1' && Array.isArray(json.result)) {
            for (const tx of json.result) allTxs.push(tx);
          }
        } catch { /* skip chunk */ }
        onProgress?.(i + 1, NUM_CHUNKS, allTxs.length);
        await new Promise(r => setTimeout(r, 500));
      }
    } else {
      // Fallback: simple desc query if block lookup failed
      try {
        const res = await fetch(
          `${chain.customApi}?module=account&action=tokentx` +
          `&contractaddress=${contract}&page=1&offset=${PAGE_SIZE}&sort=desc`,
          { signal: AbortSignal.timeout(30000) }
        );
        const json = await res.json();
        if (json.status === '1' && Array.isArray(json.result)) {
          const filtered = json.result.filter((tx: any) => parseInt(tx.timeStamp) >= startTimestamp);
          allTxs.push(...filtered);
        }
      } catch { /* no data */ }
    }
  }

  return allTxs;
}

// ─── Route handler ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!ETHERSCAN_KEY) return NextResponse.json({ error: 'ETHERSCAN_API_KEY not configured' }, { status: 500 });

  // Check cache (skip with ?nocache=1)
  const noCache = request.nextUrl.searchParams.get('nocache') === '1';
  const cached = onchainCache.get(id);
  if (!noCache && cached) {
    return NextResponse.json({ message: 'SUCCESS', cached: true, ...cached.data });
  }

  // If a fetch is already in progress, return immediately — don't start a second one
  const existingProgress = onchainProgress.get(id);
  if (existingProgress && existingProgress.status === 'fetching') {
    return NextResponse.json({ message: 'SUCCESS', status: 'fetching', cached: false, summary: { totalChains: existingProgress.totalChains } });
  }

  try {
    // Step 1: Get coin detail (cached — shared with profile route)
    const coin = await getCoinDetail(id);
    if (!coin) return NextResponse.json({ error: 'Token not found' }, { status: 404 });

    const platforms = coin.platforms;
    const tokenName = coin.name;
    const tokenSymbol = coin.symbol;
    const circulatingSupply = coin.market_data?.circulating_supply || 0;

    let decimals = 18;
    const decVals = Object.values(coin.detail_platforms)
      .map(p => p.decimal_place)
      .filter(n => typeof n === 'number' && n > 0);
    if (decVals.length > 0) decimals = Math.max(...decVals);

    // Prioritize Etherscan V2 chains (faster), then Blockscout. Max 3 chains.
    const allSupported = Object.entries(platforms)
      .filter(([chain, addr]) => CHAINS[chain] && addr && addr.length > 0)
      .map(([chain, addr]) => ({ chain, address: addr, ...CHAINS[chain] }))
      .sort((a, b) => (a.source === 'etherscan' ? 0 : 1) - (b.source === 'etherscan' ? 0 : 1));
    const supported = allSupported.slice(0, 3);

    if (supported.length === 0) {
      return NextResponse.json({
        message: 'SUCCESS',
        token: { id, name: tokenName, symbol: tokenSymbol },
        chains: [], metrics: {}, events: {},
        summary: { totalChains: 0, note: 'No ERC20 deployments on supported chains' },
      });
    }

    // Step 2: Fetch 90 days of transfers from all chains
    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 86400;
    const allTransfers: RawTransfer[] = [];
    const chainSummaries: { name: string; chainId: number; contract: string; transfers: number; error?: string }[] = [];

    // Track progress
    onchainProgress.set(id, {
      status: 'fetching',
      totalChains: supported.length,
      completedChains: 0,
      currentChain: supported[0]?.name || '',
      totalTransfers: 0,
      startedAt: Date.now(),
      currentChainChunks: 0,
      currentChainChunksDone: 0,
      currentChainTransfers: 0,
    });

    for (const entry of supported) {
      const { address, chainId, name } = entry;
      const prog = onchainProgress.get(id);
      if (prog) { prog.currentChain = name; }

      try {
        const txs = await fetchTokenTxs(entry, address, ninetyDaysAgo, (chunksDone, totalChunks, txsSoFar) => {
          const prog = onchainProgress.get(id);
          if (prog) {
            prog.currentChainChunks = totalChunks;
            prog.currentChainChunksDone = chunksDone;
            prog.currentChainTransfers = txsSoFar;
          }
        });
        for (const tx of txs) allTransfers.push(tx);
        chainSummaries.push({ name, chainId, contract: address, transfers: txs.length });
        if (prog) {
          prog.completedChains++;
          prog.totalTransfers += txs.length;
        }
      } catch (err: any) {
        chainSummaries.push({ name, chainId, contract: address, transfers: 0, error: err?.message?.slice(0, 80) });
        if (prog) { prog.completedChains++; }
      }
      await new Promise(r => setTimeout(r, 250));
    }

    // Step 3: Process all transfers
    const prog = onchainProgress.get(id);
    if (prog) { prog.currentChain = 'Processing...'; }
    const processed = processTransfers(allTransfers, circulatingSupply, decimals);
    processed.summary.chainsWithData = chainSummaries.filter(c => c.transfers > 0).length;

    const result = {
      token: { id, name: tokenName, symbol: tokenSymbol, decimals, circulatingSupply },
      chains: chainSummaries,
      ...processed,
    };

    // Cache BEFORE clearing progress (prevents race condition)
    onchainCache.set(id, result);
    onchainProgress.delete(id);

    return NextResponse.json({ message: 'SUCCESS', cached: false, ...result });
  } catch (error: any) {
    console.error('[Onchain]', error);
    return NextResponse.json({ error: `Failed: ${error?.message}` }, { status: 500 });
  }
}
