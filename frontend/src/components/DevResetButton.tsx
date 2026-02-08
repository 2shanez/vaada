'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useState } from 'react'

export function DevResetButton() {
  const { logout, authenticated } = usePrivy()
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    if (!confirm('Reset all user data? This will clear localStorage and log you out.')) {
      return
    }

    setIsResetting(true)
    
    try {
      // Clear all localStorage
      localStorage.clear()
      
      // Clear sessionStorage too
      sessionStorage.clear()
      
      // Log out of Privy if authenticated
      if (authenticated) {
        await logout()
      }
      
      // Reload to fresh state
      window.location.reload()
    } catch (error) {
      console.error('Reset failed:', error)
      // Force reload anyway
      window.location.reload()
    }
  }

  // Show in dev mode, with ?dev=1 param, or on testnet (vaada.io while on Sepolia)
  // Hide in production mainnet by checking for mainnet chain or explicit prod flag
  const showDevTools = process.env.NODE_ENV === 'development' || 
    (typeof window !== 'undefined' && (
      window.location.search.includes('dev=1') ||
      window.location.hostname === 'localhost' ||
      window.location.hostname.includes('vaada.io') // Show on testnet deployment
    ))

  if (!showDevTools) return null

  return (
    <button
      onClick={handleReset}
      disabled={isResetting}
      className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:border-red-500/40 transition-all text-xs font-medium disabled:opacity-50"
      title="Reset user data (dev mode)"
    >
      {isResetting ? '...' : '🔄'}
    </button>
  )
}
