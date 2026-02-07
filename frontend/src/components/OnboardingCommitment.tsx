'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

interface OnboardingCommitmentProps {
  onComplete: () => void
}

export function OnboardingCommitment({ onComplete }: OnboardingCommitmentProps) {
  const { user } = usePrivy()

  const handleStart = () => {
    // Store commitment with 48-hour deadline
    const deadline = Date.now() + (48 * 60 * 60 * 1000) // 48 hours from now
    localStorage.setItem('vaada_onboarding', JSON.stringify({
      deadline,
      userId: user?.id,
      createdAt: Date.now(),
    }))
    
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
        {/* Preview Card */}
        <div className="p-5">
          {/* Mini goal card preview */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                DAILY
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-[#2EE59D]/10 flex items-center justify-center text-2xl">
                🏃
              </div>
              <div>
                <p className="font-semibold">Daily Mile</p>
                <p className="text-xs text-[var(--text-secondary)]">Run 1 mile today</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Stake $5-$50</span>
              <span className="text-[#2EE59D] font-medium">Join now →</span>
            </div>
          </div>

          {/* Timer info */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-[#2EE59D]/10 rounded-lg">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-sm font-medium">48 hours to join</p>
              <p className="text-xs text-[var(--text-secondary)]">Your countdown starts now</p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleStart}
            className="w-full py-3 bg-[#2EE59D] text-white font-semibold rounded-xl hover:bg-[#26c987] transition-colors"
          >
            Start My 48 Hours
          </button>
        </div>
      </div>
    </div>
  )
}

// Countdown banner component
export function OnboardingCountdownBanner() {
  const [onboarding, setOnboarding] = useState<{
    deadline: number
    userId: string
  } | null>(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('vaada_onboarding')
    if (stored) {
      setOnboarding(JSON.parse(stored))
    }
  }, [])

  useEffect(() => {
    if (!onboarding) return

    const updateCountdown = () => {
      const now = Date.now()
      const diff = onboarding.deadline - now

      if (diff <= 0) {
        setExpired(true)
        setTimeLeft('Expired')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`)
      } else {
        setTimeLeft(`${minutes}m`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [onboarding])

  if (!onboarding) return null

  const clearOnboarding = () => {
    localStorage.removeItem('vaada_onboarding')
    setOnboarding(null)
  }

  if (expired) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="font-medium text-red-500">Time's up!</p>
              <p className="text-sm text-[var(--text-secondary)]">Your 48-hour window expired</p>
            </div>
          </div>
          <button
            onClick={clearOnboarding}
            className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#2EE59D]/10 border border-[#2EE59D]/30 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2EE59D]/20 flex items-center justify-center">
            <span className="text-xl">⏳</span>
          </div>
          <p className="font-medium">
            <span className="text-[#2EE59D]">{timeLeft}</span> to join your first promise
          </p>
        </div>
        <a 
          href="#promises"
          className="px-4 py-2 bg-[#2EE59D] text-white text-sm font-semibold rounded-lg hover:bg-[#26c987] transition-colors flex-shrink-0"
        >
          Browse Promises →
        </a>
      </div>
    </div>
  )
}

// Helper to clear onboarding when user joins a promise
export function clearOnboardingCommitment() {
  localStorage.removeItem('vaada_onboarding')
}

// Helper to check if user needs onboarding
export function needsOnboarding(): boolean {
  if (typeof window === 'undefined') return false
  
  const stored = localStorage.getItem('vaada_onboarding')
  const hasJoinedPromise = localStorage.getItem('vaada_has_joined')
  
  // If they've joined a promise before, no onboarding needed
  if (hasJoinedPromise) return false
  
  // If they have an active onboarding commitment, don't show modal again
  if (stored) return false
  
  return true
}

// Mark that user has joined a promise
export function markHasJoined() {
  localStorage.setItem('vaada_has_joined', 'true')
  localStorage.removeItem('vaada_onboarding')
}
