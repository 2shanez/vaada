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
        <button
          type="button"
          onClick={() => setShowSend(true)}
          title="Click to send USDC"
          className="text-sm text-[#2EE59D] font-medium hover:opacity-80 transition-opacity px-1 py-1"
        >
          ${(balanceNum ?? 0).toFixed(2)}
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
