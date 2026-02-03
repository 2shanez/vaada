'use client'

import { useState, useEffect, useRef } from 'react'
import { GoalCard, Goal } from './GoalCard'

// Email Modal Component
function NotifyModal({ 
  feature, 
  onClose, 
  onSuccess 
}: { 
  feature: string
  onClose: () => void
  onSuccess: () => void 
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, feature }),
      })

      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      onSuccess()
    } catch {
      setError('Failed to subscribe')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🔔</span>
          </div>
          <h3 className="font-semibold text-lg">Get notified</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            We'll email you when <span className="font-medium text-[var(--foreground)]">{feature}</span> launches.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] 
              focus:outline-none focus:border-[#2EE59D] focus:ring-1 focus:ring-[#2EE59D]/50
              placeholder:text-[var(--text-secondary)] transition-all"
          />
          
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 px-4 py-3 bg-[#2EE59D] text-black font-semibold rounded-xl
              hover:bg-[#26c987] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Subscribing...' : 'Notify me'}
          </button>
        </form>

        <p className="text-xs text-[var(--text-secondary)] text-center mt-4">
          No spam, just one email when it's ready.
        </p>
      </div>
    </div>
  )
}

const FEATURED_GOALS: Goal[] = [
  // Test Goals
  {
    id: 'test-1',
    onChainId: 13,
    title: 'Quick Test',
    description: 'Run 0.2 miles in 2 minutes',
    emoji: '🧪',
    targetMiles: 0.2,
    durationDays: 0.00139,
    minStake: 1,
    maxStake: 10,
    participants: 0,
    totalStaked: 0,
    category: 'Test',
  },
  {
    id: 'test-2',
    onChainId: 1,
    title: '5-Min Test',
    description: 'Run 0.5 miles in 5 minutes',
    emoji: '⚗️',
    targetMiles: 0.5,
    durationDays: 0.00347,
    minStake: 1,
    maxStake: 10,
    participants: 0,
    totalStaked: 0,
    category: 'Test',
  },

  // Daily Goals
  {
    id: '1',
    onChainId: 10,
    title: 'Daily Mile',
    description: 'Run 1 mile today',
    emoji: '🌅',
    targetMiles: 1,
    durationDays: 1,
    minStake: 5,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
  },
  {
    id: '2',
    onChainId: 3,
    title: 'Daily 3',
    description: 'Run 3 miles today',
    emoji: '☀️',
    targetMiles: 3,
    durationDays: 1,
    minStake: 5,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
  },

  // Weekly Goals
  {
    id: '3',
    onChainId: 4,
    title: 'Weekend Warrior',
    description: 'Run 10 miles this weekend',
    emoji: '💪',
    targetMiles: 10,
    durationDays: 3,
    minStake: 10,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
  },
  {
    id: '4', 
    onChainId: 5,
    title: 'Weekly 15',
    description: 'Run 15 miles this week',
    emoji: '⚡',
    targetMiles: 15,
    durationDays: 7,
    minStake: 10,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
  },

  // Monthly Goals
  {
    id: '5',
    onChainId: 6,
    title: 'February 50',
    description: 'Run 50 miles this month',
    emoji: '🏃',
    targetMiles: 50,
    durationDays: 28,
    minStake: 20,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
  },
  {
    id: '6',
    onChainId: 7,
    title: 'Marathon Prep',
    description: 'Hit 100 miles in 30 days',
    emoji: '🏅',
    targetMiles: 100,
    durationDays: 30,
    minStake: 20,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
  },
]

const COMING_SOON = [
  { title: 'Step Counter', emoji: '👟', desc: 'Daily step challenges' },
]

interface BrowseGoalsProps {
  filter?: 'All' | 'Test' | 'Daily' | 'Weekly' | 'Monthly'
}

export function BrowseGoals({ filter = 'All' }: BrowseGoalsProps) {
  const [mounted, setMounted] = useState(false)
  const [notified, setNotified] = useState<string[]>([])
  const [modalFeature, setModalFeature] = useState<string | null>(null)
  
  useEffect(() => {
    setMounted(true)
    // Load notified items from localStorage
    const saved = localStorage.getItem('vaada_notified')
    if (saved) setNotified(JSON.parse(saved))
  }, [])

  const handleNotifyClick = (title: string) => {
    setModalFeature(title)
  }

  const handleNotifySuccess = () => {
    if (modalFeature) {
      const updated = [...notified, modalFeature]
      setNotified(updated)
      localStorage.setItem('vaada_notified', JSON.stringify(updated))
    }
    setModalFeature(null)
  }

  const filteredGoals = filter === 'All' 
    ? FEATURED_GOALS 
    : FEATURED_GOALS.filter(g => g.category === filter)

  const showComingSoon = filter === 'All'

  // Calculate totals
  const totalParticipants = FEATURED_GOALS.reduce((sum, g) => sum + g.participants, 0)
  const totalStaked = FEATURED_GOALS.reduce((sum, g) => sum + g.totalStaked, 0)

  return (
    <div>
      {/* Goals Grid with stagger animation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredGoals.map((goal, index) => (
          <div
            key={goal.id}
            className={`transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            <GoalCard goal={goal} />
          </div>
        ))}
        
        {/* Coming Soon Placeholders */}
        {showComingSoon && COMING_SOON.map((item, i) => (
          <div 
            key={`coming-${i}`}
            className={`transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: `${(filteredGoals.length + i) * 50}ms` }}
          >
            <div className="h-full bg-gradient-to-br from-[var(--surface)] to-[var(--surface)]/50 border border-dashed border-[var(--border)] rounded-xl p-4 flex flex-col items-center justify-center min-h-[240px] group hover:border-gray-300 hover:from-[var(--surface)] hover:to-[var(--surface)] transition-all duration-300">
              <div className="relative">
                <span className="text-4xl grayscale group-hover:grayscale-0 transition-all duration-300">{item.emoji}</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-gray-300 rounded-full animate-pulse" />
              </div>
              <p className="font-semibold text-sm text-[var(--text-secondary)] mt-4 mb-1">{item.title}</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">{item.desc}</p>
              {notified.includes(item.title) ? (
                <span className="px-4 py-1.5 text-xs font-medium text-[#2EE59D] bg-[#2EE59D]/10 border border-[#2EE59D]/30 rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  You'll be notified
                </span>
              ) : (
                <button 
                  onClick={() => handleNotifyClick(item.title)}
                  className="px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--background)] border border-[var(--border)] rounded-full hover:border-[#2EE59D] hover:text-[#2EE59D] transition-colors"
                >
                  Notify me
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredGoals.length === 0 && (
        <div className="text-center py-16 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏃</span>
          </div>
          <p className="text-[var(--text-secondary)] font-medium mb-2">No {filter.toLowerCase()} promises yet</p>
          <p className="text-sm text-[var(--text-secondary)]">Check back soon or try a different category</p>
        </div>
      )}

      {/* Notify Modal */}
      {modalFeature && (
        <NotifyModal
          feature={modalFeature}
          onClose={() => setModalFeature(null)}
          onSuccess={handleNotifySuccess}
        />
      )}
      </div>
  )
}
