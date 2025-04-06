import { NextRequest, NextResponse } from 'next/server';
interface TokenResponse {
  identifier: {
    pricingID: string;
  };
  name: string;
  symbol: string;
}

interface TokenTerminalProject {
  slug: string;
  id: string;
  data_id: string;
  name: string;
  chains: string[];
  symbol: string;
  logo: string;
  is_new: boolean;
  is_datapartner: boolean;
  market_sectors: string[];
  tags: string[];
  is_chain: boolean;
  is_public: boolean;
  tier: string;
  flattened_tags: string[];
}

export interface TransformedItem {
  label: string;
  symbol: string;
  image: string;
  arkhamSlug: string;
  chainBrokerSlug?: string;
  tokenTerminalSlug?: string;
  cmcSlug?: string;
  cryptoRankSlug?: string;
}

interface CMCTokenInfo {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  category: string;
  is_active: number;
  is_listed: number;
  rank: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const bearer = searchParams.get('bearer') || undefined;
  const jwt = searchParams.get('jwt') || undefined;

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Call Arkham API
    const arkhamResponse = await fetch(
      `https://api.arkm.com/intelligence/search?query=${encodeURIComponent(
        query
      )}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Api-Key': process.env.ARKM_API_KEY || '',
        },
      }
    );

    const tokenTerminalResponse = await fetch(
      'https://api.tokenterminal.com/v3/internal/projects',
      {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
          Accept: 'application/json',
          Origin: 'https://tokenterminal.com',
          Referer: 'https://tokenterminal.com/explorer',
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
          ...(jwt ? { 'x-tt-terminal-jwt': jwt } : {}),
        },
      }
    );

    // const cmcResponse = await fetch(
    //   'https://api.coinmarketcap.com/gravity/v4/gravity/global-search',
    //   {
    //     method: 'POST',
    //     headers: {
    //       'User-Agent':
    //         'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    //       'Content-Type': 'application/json',
    //       Accept: 'application/json',
    //       Origin: 'https://coinmarketcap.com',
    //       Referer: 'https://coinmarketcap.com/',
    //     },
    //     body: JSON.stringify({
    //       keyword: query,
    //       scene: 'community',
    //       limit: 5,
    //     }),
    //   }
    // );

    const cryptorankResponse = await fetch(
      'https://api.cryptorank.io/v0/search',
      {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Referer: 'https://cryptorank.io/',
        },
      }
    );

    // Handle responses
    if (
      !arkhamResponse.ok ||
      !tokenTerminalResponse.ok ||
      // !cmcResponse.ok ||
      !cryptorankResponse.ok
    ) {
      console.error(
        `API errors: Arkham=${arkhamResponse.status}, TokenTerminal=${tokenTerminalResponse.status}, CryptoRank=${cryptorankResponse.status}`
      );
      throw new Error('One or more API requests failed');
    }

    const arkhamData = await arkhamResponse.json();
    const tokenTerminalData = await tokenTerminalResponse.json();
    // const cmcData = await cmcResponse.json();
    const cryptoRankData = await cryptorankResponse.json();

    // const cmcTokenData: CMCTokenInfo[] = cmcData?.data?.suggestions?.find(
    //   (item: any) => item.type === 'token'
    // )?.tokens;

    // Transform Arkham tokens data
    const transformedTokens: TransformedItem[] = (arkhamData.tokens || []).map(
      (token: TokenResponse) => {
        const cryptoRankItem = cryptoRankData?.coins?.find(
          (cryptoRankItem: any) =>
            token.name.toLocaleLowerCase() === cryptoRankItem?.name ||
            token.identifier.pricingID.toLocaleLowerCase() ===
              cryptoRankItem?.key ||
            token.symbol.toLocaleLowerCase() ===
              cryptoRankItem?.symbol?.toLocaleLowerCase()
        );
        // const cmcDataItem = cmcTokenData?.find(
        //   (cmcItem) =>
        //     token.name.toLocaleLowerCase() === cmcItem.name ||
        //     token.identifier.pricingID.toLocaleLowerCase() === cmcItem.slug ||
        //     token.symbol.toLocaleLowerCase() ===
        //       cmcItem.symbol.toLocaleLowerCase()
        // );
        const tokenTerminalItem = tokenTerminalData.data.find(
          (tokenTerminalItem: TokenTerminalProject) =>
            tokenTerminalItem?.name?.toLowerCase() ===
              token.name.toLocaleLowerCase() ||
            tokenTerminalItem?.symbol?.toLowerCase() ===
              token.identifier.pricingID.toLocaleLowerCase() ||
            tokenTerminalItem?.symbol?.toLowerCase() ===
              token.symbol.toLocaleLowerCase()
        );
        return {
          label: token.name,
          symbol: token.symbol,
          image: `https://static.arkhamintelligence.com/tokens/${token.identifier.pricingID}.png`,
          arkhamSlug: token.identifier.pricingID,
          tokenTerminalSlug: tokenTerminalItem?.slug,
          // cmcSlug: cmcDataItem?.slug,
          cryptoRankSlug: cryptoRankItem?.key,
        };
      }
    );

    return NextResponse.json({
      message: 'SUCCESS',
      status: 200,
      data: transformedTokens,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({
      message: 'Failed to fetch data',
      status: 200,
      data: []
    });
  }
}
