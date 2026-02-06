'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { useNetworkCheck } from '@/lib/hooks'

// Coinbase Onramp URL (works without SDK for basic flow)
const COINBASE_ONRAMP_BASE = 'https://pay.coinbase.com/buy/select-asset'
// CDP Project ID — set in env for mainnet
const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID

// Testnet faucets
const FAUCETS = {
  eth: 'https://www.alchemy.com/faucets/base-sepolia',
  usdc: 'https://faucet.circle.com',
}

export function FundWalletButton() {
  const { address } = useAccount()
  const { isWrongNetwork } = useNetworkCheck()
  const [showFaucets, setShowFaucets] = useState(false)
  
  if (!address) return null

  const isTestnet = true // TODO: flip to false on mainnet

  // Testnet: show faucet links
  if (isTestnet) {
    return (
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowFaucets(!showFaucets); }}
          className="min-h-[44px] px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm hover:border-[#2EE59D]/50 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span className="text-base">💰</span>
          <span className="hidden sm:inline">Fund</span>
        </button>

        {showFaucets && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowFaucets(false)} />
            <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto sm:right-0 bottom-20 sm:bottom-auto sm:top-full sm:mt-2 z-50 bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-xl p-4 sm:p-3 sm:w-56 animate-in slide-in-from-bottom-4 sm:animate-in sm:fade-in sm:zoom-in-95 duration-200">
              <p className="text-sm sm:text-xs text-[var(--text-secondary)] mb-3 sm:mb-2 font-medium">Testnet Faucets</p>
              
              <a
                href={FAUCETS.usdc}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 sm:px-3 sm:py-2 rounded-lg hover:bg-[var(--surface)] active:bg-[var(--surface)] transition-colors text-base sm:text-sm"
              >
                <span className="text-xl sm:text-base text-[#2EE59D]">💵</span>
                Get USDC
                <svg className="w-4 h-4 sm:w-3 sm:h-3 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              
              <a
                href={FAUCETS.eth}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 sm:px-3 sm:py-2 rounded-lg hover:bg-[var(--surface)] active:bg-[var(--surface)] transition-colors text-base sm:text-sm"
              >
                <span className="text-xl sm:text-base text-blue-400">⛽</span>
                Get ETH (gas)
                <svg className="w-4 h-4 sm:w-3 sm:h-3 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <div className="mt-3 sm:mt-2 pt-3 sm:pt-2 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address)
                    setShowFaucets(false)
                  }}
                  className="flex items-center gap-3 px-4 py-3 sm:px-3 sm:py-2 rounded-lg hover:bg-[var(--surface)] active:bg-[var(--surface)] transition-colors text-base sm:text-sm w-full text-left"
                >
                  <span className="text-xl sm:text-base">📋</span>
                  Copy wallet address
                </button>
              </div>
              
              <button
                onClick={() => setShowFaucets(false)}
                className="sm:hidden w-full mt-3 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-base font-medium"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Mainnet: Coinbase Onramp
  const onrampUrl = CDP_PROJECT_ID 
    ? `${COINBASE_ONRAMP_BASE}?appId=${CDP_PROJECT_ID}&addresses=${encodeURIComponent(JSON.stringify({[address]: ['base']}))}&assets=${encodeURIComponent(JSON.stringify(['USDC']))}&presetFiatAmount=20&fiatCurrency=USD`
    : null

  if (!onrampUrl) return null

  return (
    <a
      href={onrampUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm hover:border-[#2EE59D]/50 transition-all flex items-center gap-1.5"
    >
      <span className="text-base">💰</span>
      <span className="hidden sm:inline">Buy USDC</span>
    </a>
  )
}
