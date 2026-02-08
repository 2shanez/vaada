'use client'

import { useState, useEffect } from 'react'

interface RescueTimeConnectProps {
  onConnect: (apiKey: string) => void
  onDisconnect: () => void
}

export function RescueTimeConnect({ onConnect, onDisconnect }: RescueTimeConnectProps) {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [todayHours, setTodayHours] = useState<number | null>(null)

  // Load saved API key on mount
  useEffect(() => {
    const saved = localStorage.getItem('vaada_rescuetime_key')
    if (saved) {
      setApiKey(saved)
      setConnected(true)
      fetchTodayData(saved)
    }
  }, [])

  const fetchTodayData = async (key: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/rescuetime/summary?key=${key}&start=${today}&end=${today}`)
      const data = await res.json()
      if (data.summaries && data.summaries.length > 0) {
        setTodayHours(data.summaries[0].totalHours)
      }
    } catch {
      // Silently fail
    }
  }

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/rescuetime/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid API key')
        setLoading(false)
        return
      }

      localStorage.setItem('vaada_rescuetime_key', apiKey.trim())
      setConnected(true)
      fetchTodayData(apiKey.trim())
      onConnect(apiKey.trim())
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem('vaada_rescuetime_key')
    setApiKey('')
    setConnected(false)
    setTodayHours(null)
    onDisconnect()
  }

  if (connected) {
    return (
      <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏱️</span>
            <div>
              <p className="text-sm font-medium text-[#4A90D9]">RescueTime connected</p>
              {todayHours !== null && (
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Today: {todayHours.toFixed(1)}hr screen time
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-[var(--text-secondary)] hover:text-red-500 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">⏱️</span>
        <span className="text-sm font-medium">Connect RescueTime</span>
      </div>
      
      <div className="flex gap-2 overflow-hidden">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste API key"
          className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)]
            focus:outline-none focus:border-[#4A90D9] focus:ring-1 focus:ring-[#4A90D9]/50"
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
        />
        <button
          onClick={handleConnect}
          disabled={loading}
          className="flex-shrink-0 px-4 py-2 text-sm font-bold rounded-lg bg-[#4A90D9] text-white
            hover:bg-[#3A7BC8] disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Connect'}
        </button>
      </div>
      
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
      
      <p className="text-[10px] text-[var(--text-secondary)] mt-2">
        Get your API key at{' '}
        <a 
          href="https://www.rescuetime.com/anapi/manage" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[#4A90D9] hover:underline"
        >
          rescuetime.com/anapi/manage
        </a>
      </p>
    </div>
  )
}

// Hook to check if RescueTime is connected
export function useRescueTimeConnection() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [todayHours, setTodayHours] = useState<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('vaada_rescuetime_key')
    if (saved) {
      setApiKey(saved)
      // Fetch today's data
      const today = new Date().toISOString().split('T')[0]
      fetch(`/api/rescuetime/summary?key=${saved}&start=${today}&end=${today}`)
        .then(res => res.json())
        .then(data => {
          if (data.summaries?.[0]) {
            setTodayHours(data.summaries[0].totalHours)
          }
        })
        .catch(() => {})
    }
  }, [])

  return { apiKey, todayHours, isConnected: !!apiKey }
}
