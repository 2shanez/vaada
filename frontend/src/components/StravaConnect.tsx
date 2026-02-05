'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSwitchChain, useChainId } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { CONTRACTS } from '@/lib/wagmi'

const STRAVA_CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID

// Automation contract ABI (just the functions we need)
const automationAbi = [
  {
    name: 'storeToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'token', type: 'string' }],
    outputs: [],
  },
  {
    name: 'hasToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
] as const

export function StravaConnect() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [stravaConnected, setStravaConnected] = useState(false)
  const [athleteName, setAthleteName] = useState<string | null>(null)
  const [isStoring, setIsStoring] = useState(false)
  const [tokenNeedsRefresh, setTokenNeedsRefresh] = useState(false)

  const isWrongNetwork = chainId !== baseSepolia.id

  const { writeContract, data: hash, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Check if user already has token stored on-chain
  const { data: hasTokenOnChain, refetch: refetchHasToken } = useReadContract({
    address: CONTRACTS[baseSepolia.id].oracle,
    abi: automationAbi,
    functionName: 'hasToken',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Check if token needs refresh (every 5 minutes)
  useEffect(() => {
    if (!hasTokenOnChain) return

    const checkTokenExpiry = async () => {
      try {
        const res = await fetch('/api/strava/update-onchain')
        if (res.ok) {
          const data = await res.json()
          setTokenNeedsRefresh(data.needsRefresh || false)
        }
      } catch (err) {
        console.error('Failed to check token expiry:', err)
      }
    }

    checkTokenExpiry()
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000) // Check every 5 minutes

    return () => clearInterval(interval)
  }, [hasTokenOnChain])

  // Check for Strava connection on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stravaStatus = params.get('strava')
    const name = params.get('athlete_name')
    
    if (stravaStatus === 'success') {
      setStravaConnected(true)
      if (name) setAthleteName(decodeURIComponent(name))
      // Clean URL
      window.history.replaceState({}, '', '/')
    }
    
    // Also check cookie for athlete_id
    const athleteId = document.cookie
      .split('; ')
      .find(row => row.startsWith('strava_athlete_id='))
      ?.split('=')[1]
    
    if (athleteId) {
      setStravaConnected(true)
    }
  }, [])

  // Refetch on-chain status after successful store
  useEffect(() => {
    if (isSuccess) {
      refetchHasToken()
      setIsStoring(false)
      setTokenNeedsRefresh(false)
    }
  }, [isSuccess, refetchHasToken])

  const handleDisconnect = async () => {
    try {
      await fetch('/api/strava/disconnect', { method: 'POST' })
      // Clear cookie-based state
      setStravaConnected(false)
      setAthleteName(null)
      setTokenNeedsRefresh(false)
    } catch (err) {
      console.error('Error disconnecting Strava:', err)
    }
  }

  const handleReconnect = async () => {
    await handleDisconnect()
    // Redirect to Strava OAuth
    const redirectUri = `${window.location.origin}/api/strava/callback`
    const scope = 'read,activity:read_all'
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`
    window.location.href = stravaAuthUrl
  }

  const handleConnectStrava = () => {
    const redirectUri = `${window.location.origin}/api/strava/callback`
    const scope = 'read,activity:read_all'
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`
    window.location.href = stravaAuthUrl
  }

  const handleStoreToken = async () => {
    setIsStoring(true)
    try {
      // Fetch token from our API (auto-refreshes if needed)
      const res = await fetch('/api/strava/update-onchain')
      if (!res.ok) throw new Error('Failed to get token')
      const { token } = await res.json()

      // Store on-chain
      writeContract({
        address: CONTRACTS[baseSepolia.id].oracle,
        abi: automationAbi,
        functionName: 'storeToken',
        args: [token],
      })
    } catch (err) {
      console.error('Error storing token:', err)
      setIsStoring(false)
    }
  }

  const handleRefreshToken = async () => {
    setIsStoring(true)
    try {
      // Get fresh token
      const res = await fetch('/api/strava/update-onchain')
      if (!res.ok) throw new Error('Failed to refresh token')
      const { token } = await res.json()

      // Update on-chain
      writeContract({
        address: CONTRACTS[baseSepolia.id].oracle,
        abi: automationAbi,
        functionName: 'storeToken',
        args: [token],
      })
      setTokenNeedsRefresh(false)
    } catch (err) {
      console.error('Error refreshing token:', err)
      setIsStoring(false)
    }
  }

  if (!isConnected) return null

  // Already stored on-chain - fully verified
  if (hasTokenOnChain) {
    // Token needs refresh
    if (tokenNeedsRefresh) {
      // Wrong network - need to switch first
      if (isWrongNetwork) {
        return (
          <button
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            disabled={isSwitching}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm font-medium hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Switch to Base Sepolia to refresh token"
          >
            <span className="text-yellow-600">
              {isSwitching ? 'Switching...' : '⚠️ Switch to Base Sepolia'}
            </span>
          </button>
        )
      }

      return (
        <button
          onClick={handleRefreshToken}
          disabled={isStoring || isConfirming}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm font-medium hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Your Strava token expired. Click to refresh and update on-chain."
        >
          <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-yellow-600">
            {isConfirming ? 'Confirming...' : isStoring ? 'Refreshing...' : 'Refresh Strava Token'}
          </span>
        </button>
      )
    }

    // Token is fresh - show compact verified badge
    return (
      <button
        onClick={handleReconnect}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[#FC4C02]/50 transition-all text-sm"
        title="Strava connected — Click to reconnect"
      >
        <div className="relative">
          <svg className="w-4 h-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#2EE59D] rounded-full border border-[var(--background)]" />
        </div>
        <span className="hidden sm:inline text-[var(--foreground)]">Strava</span>
      </button>
    )
  }

  // Connected to Strava but not stored on-chain yet
  if (stravaConnected) {
    // Wrong network - need to switch first
    if (isWrongNetwork) {
      return (
        <button
          onClick={() => switchChain({ chainId: baseSepolia.id })}
          disabled={isSwitching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm font-medium hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Switch to Base Sepolia to continue"
        >
          <span className="text-yellow-600">
            {isSwitching ? 'Switching...' : '⚠️ Switch to Base Sepolia'}
          </span>
        </button>
      )
    }
    
    return (
      <button
        onClick={handleStoreToken}
        disabled={isStoring || isConfirming}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FC4C02]/10 border border-[#FC4C02]/30 text-sm font-medium hover:bg-[#FC4C02]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Sign a transaction to enable automatic Strava verification"
      >
        <svg className="w-4 h-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        <span className="text-[#FC4C02]">
          {isConfirming ? 'Confirming...' : isStoring ? 'Signing...' : 'Verify Strava'}
        </span>
      </button>
    )
  }

  // Not connected to Strava yet
  return (
    <button
      onClick={handleConnectStrava}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FC4C02] text-white font-medium text-sm hover:bg-[#FC4C02]/90 transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
      Connect Strava
    </button>
  )
}
