'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

// Check if this is a first-time user (never completed onboarding)
export function isFirstTimeUser(): boolean {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem('vaada_onboarded')
}

// Mark user as onboarded (completed first-time flow)
export function markOnboarded() {
  localStorage.setItem('vaada_onboarded', 'true')
}

interface OnboardingCommitmentProps {
  onComplete: () => void
}

// Modal shown to first-time users after sign-in
export function OnboardingCommitment({ onComplete }: OnboardingCommitmentProps) {
  const { user } = usePrivy()

  const handleCommit = () => {
    // Get today's date key for the 24h challenge
    const today = new Date().toISOString().slice(0, 10)
    const storageKey = `vaada_24h_challenge_${today}`
    
    // Get current count or start fresh
    const stored = localStorage.getItem(storageKey)
    const currentCount = stored ? JSON.parse(stored).count || 7 : 7
    
    // Store their commitment
    localStorage.setItem(storageKey, JSON.stringify({
      count: currentCount + 1,
      joined: true,
    }))
    
    // Mark as onboarded so modal never shows again
    markOnboarded()
    
    onComplete()
    
    // Scroll to promises section
    setTimeout(() => {
      const element = document.getElementById('promises')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5">
          {/* Welcome header */}
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#2EE59D] flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-black text-3xl leading-none">v</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Welcome to vaada</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              The commitment market
            </p>
            <p className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--surface)] rounded-full border border-[var(--border)]">
              <span className="font-semibold text-[#2EE59D]">vaada</span>
              <span>=</span>
              <span>promise</span>
              <span className="text-[10px]">(Hindi)</span>
            </p>
          </div>

          {/* How it works - compact */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">
                💰
              </div>
              <div>
                <p className="text-sm font-medium">Stake money on your vaada</p>
                <p className="text-xs text-[var(--text-secondary)]">Put $5-$50 on the line</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">
                ✅
              </div>
              <div>
                <p className="text-sm font-medium">Keep your vaada, keep your stake</p>
                <p className="text-xs text-[var(--text-secondary)]">Auto-verified by oracles</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">
                🏆
              </div>
              <div>
                <p className="text-sm font-medium">Earn from those who don't</p>
                <p className="text-xs text-[var(--text-secondary)]">Winners split the losers' stakes</p>
              </div>
            </div>
          </div>

          {/* 24-hour challenge intro */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-[#2EE59D]/10 rounded-xl border border-[#2EE59D]/30">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-sm font-bold">Your 24-Hour Challenge</p>
              <p className="text-xs text-[var(--text-secondary)]">Join a vaada within 24 hours</p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleCommit}
            className="w-full py-3 bg-[#2EE59D] text-black font-bold rounded-xl hover:bg-[#26c987] transition-colors"
          >
            I'm In — Show Me Promises
          </button>
        </div>
      </div>
    </div>
  )
}

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
      setJoinCount(data.count || 7)
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
    <div className="bg-gradient-to-br from-[#2EE59D]/10 via-[#2EE59D]/5 to-transparent border border-[#2EE59D]/30 rounded-2xl p-5 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#2EE59D]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <div className="relative">
        {/* Top row: Badge + Timer */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#2EE59D] text-black uppercase tracking-wide">
            New User Challenge
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EE59D] animate-pulse" />
            {timeLeft} left
          </span>
        </div>
        
        {/* Main content row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2EE59D]/20 to-[#2EE59D]/10 flex items-center justify-center text-3xl flex-shrink-0 border border-[#2EE59D]/20">
            🚀
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg leading-tight">24-Hour Commitment</h3>
            <p className="text-sm text-[var(--text-secondary)]">Join a vaada within 24 hours</p>
          </div>
        </div>
        
        {/* Stats + CTA row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-[#2EE59D]">{joinCount}</span>
              <span className="text-xs text-[var(--text-secondary)]">joined today</span>
            </div>
            <span className="text-[var(--border)]">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-secondary)]">From</span>
              <span className="text-sm font-semibold text-[#2EE59D]">$5</span>
            </div>
          </div>
          
          {hasJoined ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2EE59D]/15 rounded-xl text-[#2EE59D] font-semibold text-sm border border-[#2EE59D]/30">
              <span>✓</span>
              <span>You're in!</span>
            </div>
          ) : (
            <button
              onClick={handleJoin}
              className="px-5 py-2.5 bg-[#2EE59D] text-black font-bold text-sm rounded-xl 
                hover:bg-[#26c987] hover:shadow-lg hover:shadow-[#2EE59D]/25 hover:-translate-y-0.5
                active:translate-y-0 transition-all"
            >
              Browse Promises →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
