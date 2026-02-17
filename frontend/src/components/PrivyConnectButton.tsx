'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useUSDC } from '@/lib/hooks'
import { SendModal } from './SendModal'

export function PrivyConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { balanceNum } = useUSDC()
  const [showSend, setShowSend] = useState(false)

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
        className="px-5 py-2 bg-[#2EE59D] text-white rounded-full text-sm font-semibold hover:bg-[#26c987] transition-all"
      >
        Sign In
      </button>
    )
  }

  // Authenticated - show balance + send, and logout
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#2EE59D] font-medium px-1 py-1">
          ${(balanceNum ?? 0).toFixed(2)}
        </span>
        <button
          type="button"
          onClick={() => setShowSend(true)}
          title="Send USDC"
          className="text-[var(--text-secondary)] hover:text-[#2EE59D] transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
        <button
          onClick={logout}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors px-1 py-1"
        >
          Sign Out
        </button>
      </div>
      {showSend && <SendModal onClose={() => setShowSend(false)} />}
    </>
  )
}
