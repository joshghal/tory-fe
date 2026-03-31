import { NextRequest, NextResponse } from 'next/server';
import { searchTokens } from '@/lib/coingecko';
import { TransformedSearchItem } from '@/types/token';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const cgResults = await searchTokens(query);

    const transformed: TransformedSearchItem[] = cgResults.slice(0, 20).map((coin) => ({
      label: coin.name,
      symbol: coin.symbol.toUpperCase(),
      image: coin.large || coin.thumb || '',
      arkhamSlug: coin.id,
    }));

    return NextResponse.json({
      message: 'SUCCESS',
      status: 200,
      data: transformed,
    });
  } catch (error) {
    console.error('[Search]', error);
    return NextResponse.json({ message: 'Failed', status: 200, data: [] });
  }
}
