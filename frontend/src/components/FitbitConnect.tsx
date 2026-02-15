'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'

// Fitbit brand color
const FITBIT_TEAL = '#00B0B9'

// Fitbit logo SVG
const FitbitLogo = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.5 2.5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0 5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0 5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0 5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm-5-10c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0 5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm5 0c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm5-5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0 5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5z"/>
  </svg>
)

// Detect mobile device
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
}

export function FitbitConnect() {
  const { authenticated } = usePrivy()
  const { address, isConnected } = useAccount()
  const [fitbitConnected, setFitbitConnected] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Check for Fitbit connection on mount and after OAuth callback
  const checkConnection = useCallback(() => {
    // Check URL params (OAuth redirect callback)
    const params = new URLSearchParams(window.location.search)
    const fitbitStatus = params.get('fitbit')
    const name = params.get('fitbit_user')
    
    if (fitbitStatus === 'success') {
      setFitbitConnected(true)
      setIsConnecting(false)
      if (name) setUserName(decodeURIComponent(name))
      // Clean URL without refresh
      window.history.replaceState({}, '', window.location.pathname)
      return true
    }
    
    // Check cookie for existing connection
    const userId = document.cookie
      .split('; ')
      .find(row => row.startsWith('fitbit_user_id='))
      ?.split('=')[1]
    
    if (userId) {
      setFitbitConnected(true)
      return true
    }
    
    return false
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  // Listen for popup messages (desktop flow)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'fitbit-auth-success') {
        setFitbitConnected(true)
        setIsConnecting(false)
        if (event.data.userName) setUserName(event.data.userName)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Poll for connection after initiating OAuth (fallback)
  useEffect(() => {
    if (!isConnecting) return
    
    const pollInterval = setInterval(() => {
      const connected = checkConnection()
      if (connected) {
        setIsConnecting(false)
        clearInterval(pollInterval)
      }
    }, 1000)
    
    // Stop polling after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollInterval)
      setIsConnecting(false)
    }, 5 * 60 * 1000)
    
    return () => {
      clearInterval(pollInterval)
      clearTimeout(timeout)
    }
  }, [isConnecting, checkConnection])

  const handleConnectFitbit = () => {
    setIsConnecting(true)
    
    const authUrl = address 
      ? `/api/fitbit/auth?wallet=${address}`
      : '/api/fitbit/auth'
    
    if (isMobile()) {
      // Mobile: full redirect (popups are unreliable)
      window.location.href = authUrl
    } else {
      // Desktop: popup keeps user on page
      const width = 500
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      
      const popup = window.open(
        authUrl + '&popup=true',
        'fitbit-auth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      )
      
      // Check if popup was blocked
      if (!popup || popup.closed) {
        // Fallback to redirect
        window.location.href = authUrl
      }
    }
  }

  const handleDisconnect = async () => {
    try {
      await fetch('/api/fitbit/disconnect', { method: 'POST' })
      setFitbitConnected(false)
      setUserName(null)
      // Clear cookie client-side too
      document.cookie = 'fitbit_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    } catch (err) {
      console.error('Error disconnecting Fitbit:', err)
    }
  }

  // Only show if user is authenticated
  if (!authenticated || !isConnected) return null

  // Connected state - clean checkmark
  if (fitbitConnected) {
    return (
      <button
        onClick={handleDisconnect}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[#2EE59D]/30 hover:border-red-500/50 hover:bg-red-500/5 transition-all text-sm group"
        title="Click to disconnect"
      >
        <svg className="w-4 h-4 text-[#2EE59D] group-hover:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <svg className="w-4 h-4 text-red-500 hidden group-hover:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span style={{ color: FITBIT_TEAL }}>
          <FitbitLogo />
        </span>
        <span className="text-[var(--foreground)] group-hover:text-red-500">
          {userName || 'Fitbit'}
        </span>
      </button>
    )
  }

  // Connecting state
  if (isConnecting) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium text-sm opacity-80 cursor-wait"
        style={{ backgroundColor: FITBIT_TEAL }}
      >
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Connecting...
      </button>
    )
  }

  // Default: Connect button with Apple Health tip
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleConnectFitbit}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
        style={{ backgroundColor: FITBIT_TEAL }}
      >
        <FitbitLogo />
        Connect Fitbit
      </button>
      <p className="text-[10px] text-[var(--text-secondary)] text-center max-w-[200px]">
        📱 Use Apple Health? Install the{' '}
        <a 
          href="https://apps.apple.com/app/fitbit-health-fitness/id462638897" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[#00B0B9] hover:underline"
        >
          free Fitbit app
        </a>
        {' '}to sync your steps.
      </p>
    </div>
  )
}

// Hook to check Fitbit connection status
export function useFitbitConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const userId = document.cookie
      .split('; ')
      .find(row => row.startsWith('fitbit_user_id='))
      ?.split('=')[1]
    setIsConnected(!!userId)
    setIsLoading(false)
  }, [])
  
  return { isConnected, isLoading }
}

// Simple link to Fitbit auth
export function FitbitHeaderButton() {
  const { address } = useAccount()

  const fitbitUrl = address 
    ? `/api/fitbit/auth?wallet=${address}`
    : '/api/fitbit/auth'

  return (
    <a
      href={fitbitUrl}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00B0B9] text-white text-sm font-medium hover:bg-[#009BA3] transition-all"
    >
      <span>⌚</span>
      <span className="hidden sm:inline">Connect Fitbit</span>
    </a>
  )
}
