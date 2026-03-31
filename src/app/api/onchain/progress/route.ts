import { NextRequest, NextResponse } from 'next/server';
import { onchainProgress } from '@/lib/onchainCache';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const prog = onchainProgress.get(id);
  if (!prog) {
    return NextResponse.json({ status: 'idle' });
  }

  return NextResponse.json({
    status: prog.status,
    totalChains: prog.totalChains,
    completedChains: prog.completedChains,
    currentChain: prog.currentChain,
    totalTransfers: prog.totalTransfers,
    elapsed: Math.floor((Date.now() - prog.startedAt) / 1000),
    currentChainChunks: prog.currentChainChunks,
    currentChainChunksDone: prog.currentChainChunksDone,
    currentChainTransfers: prog.currentChainTransfers,
  });
}
