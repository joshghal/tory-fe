import { NextRequest, NextResponse } from 'next/server';
import { getCoinDetail } from '@/lib/coingecko';

/**
 * GET /api/meta?id=bitcoin
 * Lightweight endpoint — returns cached coin metadata.
 * Uses the same cache as profile + onchain routes. Zero extra CoinGecko calls
 * if the token was recently analyzed.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const coin = await getCoinDetail(id);
  if (!coin) {
    return NextResponse.json({ name: id, symbol: id.toUpperCase(), image: '' });
  }

  return NextResponse.json({
    name: coin.name,
    symbol: coin.symbol,
    image: coin.image?.large || coin.image?.small || '',
  });
}
