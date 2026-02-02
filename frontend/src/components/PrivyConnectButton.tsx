'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'

export function PrivyConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { address } = useAccount()

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
      <span className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm">
        {displayAddress}
      </span>
      <button
        onClick={logout}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm hover:bg-[var(--surface-hover)] transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}
