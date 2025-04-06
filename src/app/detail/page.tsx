"use client";
import FinancialStatement from '@/components/FinancialStatements';
import OpenInterestChart from '@/components/OpenInterestChart';
import SocialMetricsChart from '@/components/SocialMetricsChart';
import TokenomicsAllocation from '@/components/TokenomicsAllocation';
import useAuth from '@/hooks/useAuth';
import useTokenInfoStore from '@/hooks/useTokenInfoStore';
import { getFuturesData } from '@/services/arkham';
import { getTokenDetails } from '@/services/custom';
import { getFinancialStatement } from '@/services/tokenTerminal';

import { useRequest } from 'ahooks';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import FundingRatesChart from '@/components/FundingRatesChart';
import TokenUnlocksTable from '@/components/TokenUnlockStatement';

const renderTokenStatsItem = (label: string, stat: string) => {
  return (
    <p className='text-sm text-gray-400 font-medium'>{label} <br></br><span className='whitespace-pre-line text-white font-bold break-all'>{stat}</span></p>
  )
}

const TokenDetailPage = () => {
  const searchParams = useSearchParams();
  const arkhamSlug = searchParams.get('arkhamSlug') || '';
  const cryptoRankSlug = searchParams.get('cryptoRankSlug') || '';
  const tokenTerminalSlug = searchParams.get('tokenTerminalSlug') || '';
  const lunarSlug = searchParams.get('lunarSlug') || '';
  const image = searchParams.get('image') || '';
  const label = searchParams.get('label') || '';
  const symbol = searchParams.get('symbol') || '';

  const {
    tokenTerminalAuth
  } = useTokenInfoStore();

  const {
    getTokenTerminalToken,
    isGetTokenTerminalAuthLoading,
    getLunarToken,
    lunarTokenResponse,
    isGetLunarTokenLoading
  } = useAuth();


  const { run: getTokenDetail, data: tokenDetailData, loading: isGetTokenDetailLoading } = useRequest(getTokenDetails, {
    manual: true,
    onError: (err) => {
      console.log(err);
    }
  })

  const { run: getFinancialStatementData, data: financialStatementData, loading: isgetFinancialStatementLoading } = useRequest(getFinancialStatement, {
    manual: true,
    onError: (err) => {
      console.log(err);
    }
  })

  const { run: getFuturesStats, data: futuresData, loading: isgetFuturesStatsLoading } = useRequest(getFuturesData, {
    manual: true,
    onError: (err) => {
      console.log(err);
    }
  })

  useEffect(() => {
    if (!Boolean(tokenTerminalAuth?.bearer) && !Boolean(tokenTerminalAuth?.jwt) && !isGetTokenTerminalAuthLoading) {
      getTokenTerminalToken()
    }
    if (!isGetLunarTokenLoading) {
      getLunarToken()
    }
  }, [])

  const lunarToken: string = useMemo(() => {
    return lunarTokenResponse?.bearer ?? ''
  }, [lunarTokenResponse])

  useEffect(() => {
    if (lunarToken) {
      getTokenDetail(arkhamSlug, cryptoRankSlug, lunarSlug, lunarToken)
      getFinancialStatementData(tokenTerminalSlug, tokenTerminalAuth?.bearer, tokenTerminalAuth?.jwt)
      getFuturesStats(arkhamSlug)
    }
  }, [lunarToken])

  return (
    <div className='flex flex-col min-w-[360px] gap-[60px] p-10 items-center justify-center'>
      <nav className="flex items-center justify-center w-full">
        <div className="flex items-center gap-2 max-w-[1160px] w-full">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TORY</h1>
        </div>
      </nav>
      {isGetLunarTokenLoading && <div>Lunar Crush auth loading...</div>}
      {isGetTokenTerminalAuthLoading && <div>Token Terminal auth loading...</div>}
      {isGetTokenDetailLoading && <div>Getting Token Details...</div>}
      {isgetFinancialStatementLoading && <div>Getting Financial Data...</div>}
      {isgetFuturesStatsLoading && <div>Getting Futures Data...</div>}

      <div
        className='flex flex-col items-start gap-2 px-8 py-7 rounded-2xl shadow-md bg-gray-800/10 w-full max-w-[1160px] border-1 border-white/5'
      >
        <Image src={image} alt={label} width={50} height={50} />
        <div className='w-full flex flex-col gap-4'>
          <div className='flex gap-2'>
            <h2 className="text-lg font-semibold">{label}</h2>
            <h2 className="text-lg font-semibold text-slate-500">{symbol.toUpperCase()}</h2>
          </div>
          <div className=' w-full h-[1px] bg-white/10'></div>
          {!isGetTokenDetailLoading && !isGetLunarTokenLoading && !isGetTokenTerminalAuthLoading && (
            <div className="w-full">
              {
                tokenDetailData?.data?.stats ? (
                  <div className='grid grid-cols-2 lg:grid-cols-4 justify-between gap-3 w-full'>
                    {renderTokenStatsItem('Price', `$${tokenDetailData?.data?.stats?.price}`)}
                    {renderTokenStatsItem('Total Volume', `$${tokenDetailData?.data?.stats?.totalVolume.toLocaleString()}`)}
                    {renderTokenStatsItem('Price 24h Ago', `$${tokenDetailData?.data?.stats?.price24hAgo.toLocaleString()}`)}
                    {renderTokenStatsItem('Max Price 24h', `$${tokenDetailData?.data?.stats?.maxPrice24h.toLocaleString()}`)}
                    {renderTokenStatsItem('Min Price 24h', `$${tokenDetailData?.data?.stats?.minPrice24h.toLocaleString()}`)}
                    {renderTokenStatsItem('Circulating Supply', `${tokenDetailData?.data?.stats?.circulatingSupply.toLocaleString()}`)}
                    {renderTokenStatsItem('Total Supply', `${tokenDetailData?.data?.stats?.totalSupply.toLocaleString()}`)}
                    {renderTokenStatsItem('Price 7d Ago', `$${tokenDetailData?.data?.stats?.price7dAgo.toLocaleString()}`)}
                    {renderTokenStatsItem('Price 30d Ago', `$${tokenDetailData?.data?.stats?.price30dAgo.toLocaleString()}`)}
                    {renderTokenStatsItem('Price 180d Ago', `$${tokenDetailData?.data?.stats?.price180dAgo.toLocaleString()}`)}
                    {renderTokenStatsItem('All Time High', `$${tokenDetailData?.data?.stats?.allTimeHigh.toLocaleString()}`)}
                    {renderTokenStatsItem('All Time Low', `$${tokenDetailData?.data?.stats?.allTimeLow.toLocaleString()}`)}
                  </div>
                ) : (
                  <h3 className='text-gray-400 text-sm'>This token has no vesting data</h3>
                )
              }
            </div>
          )}
        </div>
      </div>

      {
        tokenDetailData?.data?.tokenomics &&
        <TokenomicsAllocation
          data={tokenDetailData?.data?.tokenomics?.allocations}
          maxSupplyLabel={`${symbol.toUpperCase()} ${tokenDetailData?.data?.stats?.totalSupply.toLocaleString()}`}
        />
      }

      {
        tokenDetailData?.data?.unlocks && futuresData?.data?.raw?.openInterest && futuresData?.data?.raw?.fundingRates &&
        <TokenUnlocksTable data={tokenDetailData?.data?.unlocks} fundingRates={futuresData?.data?.fundingRates || []} openInterest={futuresData?.data?.openInterest || []} />
      }

      {
        tokenDetailData?.data?.socialHistory &&
        <SocialMetricsChart data={tokenDetailData?.data?.socialHistory?.data ?? []} />
      }

      {
        futuresData?.data?.raw?.openInterest &&
        <OpenInterestChart openInterest={futuresData?.data?.raw?.openInterest} />
      }

      {
        futuresData?.data?.raw?.fundingRates &&
        <FundingRatesChart fundingRates={futuresData?.data?.raw?.fundingRates} />
      }

      {
        financialStatementData?.data &&
        <FinancialStatement data={financialStatementData?.data || []} />
      }

      <div></div>
    </div>
  );
}

export default TokenDetailPage;