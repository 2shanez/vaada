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
          onClick={() => setShowFaucets(!showFaucets)}
          className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm hover:border-[#2EE59D]/50 transition-all flex items-center gap-1.5"
        >
          <span className="text-base">💰</span>
          <span className="hidden sm:inline">Fund</span>
        </button>

        {showFaucets && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowFaucets(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-xl p-3 w-56 animate-in fade-in zoom-in-95 duration-150">
              <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">Testnet Faucets</p>
              
              <a
                href={FAUCETS.usdc}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface)] transition-colors text-sm"
              >
                <span className="text-[#2EE59D]">💵</span>
                Get USDC
                <svg className="w-3 h-3 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              
              <a
                href={FAUCETS.eth}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface)] transition-colors text-sm"
              >
                <span className="text-blue-400">⛽</span>
                Get ETH (gas)
                <svg className="w-3 h-3 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <div className="mt-2 pt-2 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address)
                    setShowFaucets(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface)] transition-colors text-sm w-full text-left"
                >
                  <span>📋</span>
                  Copy wallet address
                </button>
              </div>
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
