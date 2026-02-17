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
        className="px-4 py-2 bg-[#2EE59D] text-white rounded-xl text-sm font-semibold hover:bg-[#26c987] transition-all"
      >
        Sign In
      </button>
    )
  }

  // Authenticated - show balance + send, and logout
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowSend(true)}
          title="Click to send USDC"
          className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm hover:border-[#2EE59D]/50 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span className="text-[#2EE59D] font-medium">${(balanceNum ?? 0).toFixed(2)}</span>
          <svg className="w-3 h-3 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
        <button
          onClick={logout}
          className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm hover:border-[#2EE59D]/50 transition-all"
        >
          Sign Out
        </button>
      </div>
      {showSend && <SendModal onClose={() => setShowSend(false)} />}
    </>
  )
}
