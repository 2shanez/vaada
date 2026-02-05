'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'
import { useUSDC } from '@/lib/hooks'

export function PrivyConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { address } = useAccount()
  const { balanceNum } = useUSDC()
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!ready) {
    return (
      <button 
        disabled
        className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-medium opacity-50"
      >
        Loading...
      </button>
    )
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-4 py-2 bg-[#2EE59D] text-black rounded-xl text-sm font-semibold hover:bg-[#26c987] transition-all"
      >
        Sign In
      </button>
    )
  }

  // Authenticated - show address and logout
  const displayAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : user?.email?.address || 'Connected'

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={copyAddress}
        title={address ? `Click to copy: ${address}` : 'No address'}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm hover:border-[#2EE59D]/50 transition-all flex items-center gap-2"
      >
        {copied ? (
          <span className="text-[#2EE59D] flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </span>
        ) : (
          <>
            <span className="text-[#2EE59D] font-medium">${balanceNum.toFixed(2)}</span>
            <span className="text-[var(--border)]">|</span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {displayAddress}
            </span>
          </>
        )}
      </button>
      <button
        onClick={logout}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm hover:bg-[var(--surface-hover)] transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}
