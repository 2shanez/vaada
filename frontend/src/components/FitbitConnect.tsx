'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSwitchChain, useChainId } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { CONTRACTS } from '@/lib/wagmi'

const FITBIT_CLIENT_ID = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID

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

// Fitbit brand color
const FITBIT_TEAL = '#00B0B9'

export function FitbitConnect() {
  const { authenticated } = usePrivy()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [fitbitConnected, setFitbitConnected] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [isStoring, setIsStoring] = useState(false)
  const [tokenNeedsRefresh, setTokenNeedsRefresh] = useState(false)

  const isWrongNetwork = chainId !== baseSepolia.id

  const { writeContract, data: hash, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Check if user already has token stored on-chain
  // Note: For multi-source support, we'd need a separate mapping per source
  // For now, this checks the same storage as Strava (MVP limitation)
  const { data: hasTokenOnChain, refetch: refetchHasToken } = useReadContract({
    address: CONTRACTS[baseSepolia.id].oracle,
    abi: automationAbi,
    functionName: 'hasToken',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Check for Fitbit connection on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fitbitStatus = params.get('fitbit')
    const name = params.get('fitbit_user')
    
    if (fitbitStatus === 'success') {
      setFitbitConnected(true)
      if (name) setUserName(decodeURIComponent(name))
      // Clean URL
      window.history.replaceState({}, '', '/')
    }
    
    // Also check cookie for user_id
    const userId = document.cookie
      .split('; ')
      .find(row => row.startsWith('fitbit_user_id='))
      ?.split('=')[1]
    
    if (userId) {
      setFitbitConnected(true)
    }
  }, [])

  // Check if token needs refresh (every 5 minutes)
  useEffect(() => {
    if (!fitbitConnected) return

    const checkTokenExpiry = async () => {
      try {
        const res = await fetch('/api/fitbit/update-onchain')
        if (res.ok) {
          const data = await res.json()
          setTokenNeedsRefresh(data.needsRefresh || false)
        }
      } catch (err) {
        console.error('Failed to check Fitbit token expiry:', err)
      }
    }

    checkTokenExpiry()
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fitbitConnected])

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
      await fetch('/api/fitbit/disconnect', { method: 'POST' })
      setFitbitConnected(false)
      setUserName(null)
      setTokenNeedsRefresh(false)
    } catch (err) {
      console.error('Error disconnecting Fitbit:', err)
    }
  }

  const handleConnectFitbit = () => {
    // Use the auth route which handles OAuth initiation
    // Pass wallet address to save token to database
    const authUrl = address 
      ? `/api/fitbit/auth?wallet=${address}`
      : '/api/fitbit/auth'
    window.location.href = authUrl
  }

  const handleReconnect = async () => {
    await handleDisconnect()
    handleConnectFitbit()
  }

  const handleStoreToken = async () => {
    setIsStoring(true)
    try {
      const res = await fetch('/api/fitbit/update-onchain')
      if (!res.ok) throw new Error('Failed to get token')
      const { token } = await res.json()

      writeContract({
        address: CONTRACTS[baseSepolia.id].oracle,
        abi: automationAbi,
        functionName: 'storeToken',
        args: [token],
      })
    } catch (err) {
      console.error('Error storing Fitbit token:', err)
      setIsStoring(false)
    }
  }

  const handleRefreshToken = async () => {
    setIsStoring(true)
    try {
      const res = await fetch('/api/fitbit/update-onchain')
      if (!res.ok) throw new Error('Failed to refresh token')
      const { token } = await res.json()

      writeContract({
        address: CONTRACTS[baseSepolia.id].oracle,
        abi: automationAbi,
        functionName: 'storeToken',
        args: [token],
      })
      setTokenNeedsRefresh(false)
    } catch (err) {
      console.error('Error refreshing Fitbit token:', err)
      setIsStoring(false)
    }
  }

  // Only show if user is authenticated
  if (!authenticated || !isConnected) return null

  // Fitbit logo SVG (simplified)
  const FitbitLogo = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.5 2.5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0 5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0 5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0 5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm-5-10c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0 5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm5 0c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm5-5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0 5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5z"/>
    </svg>
  )

  // Already stored on-chain
  if (hasTokenOnChain && fitbitConnected) {
    if (tokenNeedsRefresh) {
      if (isWrongNetwork) {
        return (
          <button
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            disabled={isSwitching}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm font-medium hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        >
          <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-yellow-600">
            {isConfirming ? 'Confirming...' : isStoring ? 'Refreshing...' : 'Refresh Fitbit Token'}
          </span>
        </button>
      )
    }

    // Verified badge
    return (
      <button
        onClick={handleReconnect}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[#00B0B9]/50 transition-all text-sm"
        title="Fitbit connected — Click to reconnect"
      >
        <svg className="w-4 h-4 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span style={{ color: FITBIT_TEAL }}>
          <FitbitLogo />
        </span>
        <span className="text-[var(--foreground)]">Fitbit</span>
      </button>
    )
  }

  // Connected but not stored on-chain
  if (fitbitConnected) {
    if (isWrongNetwork) {
      return (
        <button
          onClick={() => switchChain({ chainId: baseSepolia.id })}
          disabled={isSwitching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm font-medium hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ 
          backgroundColor: `${FITBIT_TEAL}20`,
          border: `1px solid ${FITBIT_TEAL}50`,
          color: FITBIT_TEAL,
        }}
      >
        <FitbitLogo />
        <span>
          {isConfirming ? 'Confirming...' : isStoring ? 'Signing...' : 'Verify Fitbit'}
        </span>
      </button>
    )
  }

  // Not connected
  return (
    <button
      onClick={handleConnectFitbit}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-colors"
      style={{ backgroundColor: FITBIT_TEAL }}
    >
      <FitbitLogo />
      Connect Fitbit
    </button>
  )
}

// Hook to check Fitbit connection status
export function useFitbitConnection() {
  const [isConnected, setIsConnected] = useState(false)
  
  useEffect(() => {
    const userId = document.cookie
      .split('; ')
      .find(row => row.startsWith('fitbit_user_id='))
      ?.split('=')[1]
    setIsConnected(!!userId)
  }, [])
  
  return { isConnected }
}
