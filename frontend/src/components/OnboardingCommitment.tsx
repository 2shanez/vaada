'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

// Live 24-hour challenge card that shows on the main page
export function LiveChallengeCard() {
  const { login, authenticated } = usePrivy()
  const [joinCount, setJoinCount] = useState(0)
  const [hasJoined, setHasJoined] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  // Calculate time until midnight UTC (daily reset)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setUTCHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setTimeLeft(`${hours}h ${minutes}m`)
    }
    
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Load join count and check if user has joined
  useEffect(() => {
    // Get today's date key
    const today = new Date().toISOString().slice(0, 10)
    const storageKey = `vaada_24h_challenge_${today}`
    
    // Check local storage for join count (simulated - in prod this would be an API)
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const data = JSON.parse(stored)
      setJoinCount(data.count || 0)
      setHasJoined(data.joined || false)
    } else {
      // Start with some baseline (social proof)
      setJoinCount(7)
    }
  }, [])

  const handleJoin = () => {
    if (!authenticated) {
      login()
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const storageKey = `vaada_24h_challenge_${today}`
    
    const newCount = joinCount + 1
    setJoinCount(newCount)
    setHasJoined(true)
    
    localStorage.setItem(storageKey, JSON.stringify({
      count: newCount,
      joined: true,
    }))

    // Scroll to promises section
    setTimeout(() => {
      const element = document.getElementById('promises')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 300)
  }

  return (
    <div className="bg-gradient-to-br from-[#2EE59D]/10 to-[#2EE59D]/5 border-2 border-[#2EE59D]/30 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#2EE59D]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Left side - challenge info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2EE59D] text-black uppercase">
              Today's Challenge
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2EE59D] animate-pulse" />
              {timeLeft} left
            </span>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#2EE59D]/20 flex items-center justify-center text-2xl">
              ⏰
            </div>
            <div>
              <p className="font-bold text-lg">24-Hour Commitment</p>
              <p className="text-sm text-[var(--text-secondary)]">Join a promise before midnight UTC</p>
            </div>
          </div>
          
          {/* Live counter */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-[#2EE59D] text-xl">{joinCount}</span>
            <span className="text-[var(--text-secondary)]">people committed today</span>
          </div>
        </div>
        
        {/* Right side - CTA */}
        <div className="flex-shrink-0">
          {hasJoined ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#2EE59D]/20 rounded-xl text-[#2EE59D] font-medium">
              <span>✓</span>
              <span>You're in!</span>
            </div>
          ) : (
            <button
              onClick={handleJoin}
              className="w-full sm:w-auto px-6 py-3 bg-[#2EE59D] text-black font-bold rounded-xl 
                hover:bg-[#26c987] hover:shadow-lg hover:shadow-[#2EE59D]/25 hover:-translate-y-0.5
                active:translate-y-0 transition-all"
            >
              I'm In →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
