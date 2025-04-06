"use client"

import useTokenInfoStore from '@/hooks/useTokenInfoStore';
import { searchTokenUsingGet } from '@/services/custom';
import { useRequest } from 'ahooks';
import Image from "next/image";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';

function generateChip(vendorName: string, isAvailable: string | undefined) {
  return (
    <span className={`px-4 py-1 rounded-sm text-sm ${isAvailable ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
      {vendorName}
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const {
    tokenTerminalAuth
  } = useTokenInfoStore();

  const {
    getTokenTerminalToken,
    isGetTokenTerminalAuthLoading
  } = useAuth();

  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const { run: getTokenAvailability, data: availableTokenData, loading: isGetTokenAvailabilityLoading } = useRequest(searchTokenUsingGet, {
    manual: true,
    onError: (err) => {
      console.log(err);
    }
  })

  const queryAvailableToken = () => {
    getTokenAvailability(searchKeyword, tokenTerminalAuth?.bearer, tokenTerminalAuth?.jwt);
  }

  useEffect(() => {
    if (!Boolean(tokenTerminalAuth?.bearer) && !Boolean(tokenTerminalAuth?.jwt) && !isGetTokenTerminalAuthLoading) {
      getTokenTerminalToken()
    }
  }, [tokenTerminalAuth])

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-8 pb-20 gap-10 sm:p-20 min-w-[360px]">
      <nav className="flex items-center justify-between w-full max-w-[1160px]">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TORY</h1>
        </div>
      </nav>
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-[1160px]">
        {
          isGetTokenAvailabilityLoading || isGetTokenTerminalAuthLoading ? <p>Loading</p> : (<form className='w-full max-w-[1160px]' onSubmit={(e) => {
            e.preventDefault();
            queryAvailableToken()
          }}>
            <div className="relative">
              <div className="absolute inset-y-0 start-2 flex items-center ps-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                </svg>
              </div>
              <input
                type="tokenName"
                id="tokenName"
                className="w-full p-5 ps-[56px] text-sm focus:outline-none bg-slate-600/20 rounded-lg"
                placeholder="Input Token Name"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                }}
              />
            </div>
          </form>)
        }
        <section className="flex flex-col gap-4 w-full max-w-[1160px]">
          {!isGetTokenAvailabilityLoading && !isGetTokenTerminalAuthLoading && availableTokenData?.data.map((token) => (
            <div
              key={`${token.symbol}-${token.label}`}
              className={`flex items-center gap-4 p-4 rounded-lg shadow-md ${token.arkhamSlug && token.cryptoRankSlug ? 'cursor-pointer' : 'opacity-50'} border-1 border-white/5 bg-gray-800/10 w-full`}
              onClick={() => {
                if (token.arkhamSlug && token.cryptoRankSlug) {
                  router.push(`/detail?arkhamSlug=${token.arkhamSlug}&cryptoRankSlug=${token.cryptoRankSlug}&lunarSlug=$${token.symbol}&image=${token.image}&label=${token.label}&symbol=${token.symbol}&tokenTerminalSlug=${token.tokenTerminalSlug}`);
                }
              }}
            >
              <Image src={token.image} alt={token.label} width={50} height={50} />
              <div>
                <div className='flex gap-2'>
                  <h2 className="text-lg font-semibold">{token.label}</h2>
                  <h2 className="text-lg font-semibold text-slate-500">{token.symbol.toUpperCase()}</h2>
                </div>
                <div className="flex gap-2 mt-2">
                  {generateChip('Arkham', token.arkhamSlug)}
                  {generateChip('Crypto Rank', token.cryptoRankSlug)}
                  {generateChip('LunarCrush', token.symbol)}
                  {generateChip('Token Terminal', token.tokenTerminalSlug)}
                </div>
              </div>
            </div>
          ))}
        </section>

      </main>
    </div>
  );
}
