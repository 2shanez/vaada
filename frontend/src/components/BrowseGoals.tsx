'use client'

import { useState, useEffect, useRef } from 'react'
import { GoalCard, Goal } from './GoalCard'
import { DOMAINS, type DomainKey } from '@/lib/abis'

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
            className="w-full mt-4 px-4 py-3 bg-[#2EE59D] text-white font-semibold rounded-xl
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
  {
    id: '10k-steps-challenge',
    onChainId: 8,
    title: '10K Steps Challenge',
    description: 'Walk 10,000 steps today',
    emoji: '🚶‍♂️',
    category: 'Daily',
    targetMiles: 10000,
    targetUnit: 'steps',
    durationDays: 1,
    minStake: 5,
    maxStake: 5,
    participants: 0,
    totalStaked: 0,
    domain: 'Fitness',
    subdomain: 'Steps',
    live: true,
  },
]

const COMING_SOON = [
  { title: 'Step Counter', emoji: '👟', desc: 'Daily step challenges' },
]

// Export for stats calculation
export { FEATURED_GOALS }

interface BrowseGoalsProps {
  filter?: 'Active' | 'All' | 'Test' | 'Daily' | 'Weekly' | 'Monthly'
}

const TIMEFRAMES = ['All', 'Daily', 'Weekly', 'Monthly'] as const
type Timeframe = typeof TIMEFRAMES[number]

export function BrowseGoals({ filter = 'Active' }: BrowseGoalsProps) {
  const [mounted, setMounted] = useState(false)
  const [notified, setNotified] = useState<string[]>([])
  const [modalFeature, setModalFeature] = useState<string | null>(null)
  const [activeOnly, setActiveOnly] = useState(false)  // Show all goals including previews
  const [selectedDomain, setSelectedDomain] = useState<DomainKey | 'All'>('All')
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('All')
  
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

  // Filter goals by active toggle + domain + timeframe
  // Then sort: active (on-chain) goals first, then coming soon
  const filteredGoals = FEATURED_GOALS.filter(g => {
    const activeMatch = !activeOnly || g.onChainId !== undefined
    const domainMatch = selectedDomain === 'All' || g.domain === selectedDomain
    const timeframeMatch = selectedTimeframe === 'All' || g.category === selectedTimeframe
    return activeMatch && domainMatch && timeframeMatch
  }).sort((a, b) => {
    // Active goals (with onChainId) come first
    const aActive = a.onChainId !== undefined ? 0 : 1
    const bActive = b.onChainId !== undefined ? 0 : 1
    return aActive - bActive
  })

  const showComingSoon = false // Hidden for now

  // Calculate totals
  const totalParticipants = FEATURED_GOALS.reduce((sum, g) => sum + g.participants, 0)
  const totalStaked = FEATURED_GOALS.reduce((sum, g) => sum + g.totalStaked, 0)

  // Domain colors removed — using simple filter pills now

  const FILTERS = ['Live', 'All', 'Daily', 'Weekly', 'Monthly'] as const
  type Filter = typeof FILTERS[number]
  const [activeFilter, setActiveFilter] = useState<Filter>('All')

  // Apply filter logic
  useEffect(() => {
    if (activeFilter === 'Live') {
      setActiveOnly(true)
      setSelectedTimeframe('All')
    } else if (activeFilter === 'All') {
      setActiveOnly(false)
      setSelectedTimeframe('All')
    } else {
      setActiveOnly(false)
      setSelectedTimeframe(activeFilter as Timeframe)
    }
  }, [activeFilter])

  return (
    <div>
      {/* Filter Buttons */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full border text-sm transition-colors ${
              activeFilter === f
                ? 'border-[var(--foreground)] text-[var(--foreground)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]'
            }`}
          >
            {f === 'Live' && (
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${activeFilter === 'Live' ? 'bg-[#2EE59D] animate-pulse' : 'bg-gray-400'}`} />
            )}
            {f}
          </button>
        ))}
      </div>

      {/* Goals Grid with stagger animation */}
      <div className="flex flex-wrap justify-center gap-4">
        {filteredGoals.length === 0 ? (
          <div className="w-full text-center py-16">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold mb-2">No active vaadas right now</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
              New challenges drop regularly. Check back soon or connect your tracker to get notified!
            </p>
          </div>
        ) : (
          filteredGoals.map((goal, index) => (
            <div
              key={goal.id}
              className={`w-full max-w-md transition-all duration-500 ${
                filteredGoals.length > 1 ? 'sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)]' : ''
              } ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <GoalCard goal={goal} />
            </div>
          ))
        )}
        
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
