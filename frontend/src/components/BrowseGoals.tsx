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
  // ═══════════════════════════════════════════
  // FITNESS - RUNNING
  // ═══════════════════════════════════════════
  
  // Daily Running
  {
    id: 'fitness-running-daily-1',
    onChainId: 11,
    title: 'Daily Mile',
    description: 'Run 1 mile today',
    emoji: '🌅',
    targetMiles: 1,
    targetUnit: 'miles',
    durationDays: 1,
    minStake: 5,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Fitness',
    subdomain: 'Running',
  },
  {
    id: 'fitness-running-daily-2',
    title: 'Daily 3',
    description: 'Run 3 miles today',
    emoji: '☀️',
    targetMiles: 3,
    targetUnit: 'miles',
    durationDays: 1,
    minStake: 5,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Fitness',
    subdomain: 'Running',
  },
  
  // Weekly Running
  {
    id: 'fitness-running-weekly-1',
    title: 'Weekend Warrior',
    description: 'Run 10 miles this weekend',
    emoji: '💪',
    targetMiles: 10,
    targetUnit: 'miles',
    durationDays: 3,
    minStake: 10,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Fitness',
    subdomain: 'Running',
  },
  {
    id: 'fitness-running-weekly-2',
    title: 'Weekly 15',
    description: 'Run 15 miles this week',
    emoji: '⚡',
    targetMiles: 15,
    targetUnit: 'miles',
    durationDays: 7,
    minStake: 10,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Fitness',
    subdomain: 'Running',
  },
  
  // Monthly Running
  {
    id: 'fitness-running-monthly-1',
    title: 'February 50',
    description: 'Run 50 miles this month',
    emoji: '🏃',
    targetMiles: 50,
    targetUnit: 'miles',
    durationDays: 28,
    minStake: 20,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Fitness',
    subdomain: 'Running',
  },
  {
    id: 'fitness-running-monthly-2',
    title: 'Marathon Prep',
    description: 'Hit 100 miles in 30 days',
    emoji: '🏅',
    targetMiles: 100,
    targetUnit: 'miles',
    durationDays: 30,
    minStake: 20,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Fitness',
    subdomain: 'Running',
  },

  // ═══════════════════════════════════════════
  // CREATIVE - SUBSTACK
  // ═══════════════════════════════════════════
  
  // Weekly Substack
  {
    id: 'creative-substack-weekly-1',
    title: 'Weekly Writer',
    description: 'Publish 1 Substack post this week',
    emoji: '✍️',
    targetMiles: 1,
    targetUnit: 'posts',
    durationDays: 7,
    minStake: 10,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Creative',
    subdomain: 'Substack',
  },
  
  // Monthly Substack
  {
    id: 'creative-substack-monthly-1',
    title: 'Content Creator',
    description: 'Publish 4 posts this month',
    emoji: '📝',
    targetMiles: 4,
    targetUnit: 'posts',
    durationDays: 30,
    minStake: 20,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Creative',
    subdomain: 'Substack',
  },

  // ═══════════════════════════════════════════
  // EDUCATIONAL - DUOLINGO
  // ═══════════════════════════════════════════
  
  // Daily Duolingo
  {
    id: 'edu-duolingo-daily-1',
    title: 'Daily Streak',
    description: 'Complete 1 Duolingo lesson',
    emoji: '🦉',
    targetMiles: 1,
    targetUnit: 'lessons',
    durationDays: 1,
    minStake: 5,
    maxStake: 25,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Educational',
    subdomain: 'Duolingo',
  },
  
  // Weekly Duolingo
  {
    id: 'edu-duolingo-weekly-1',
    title: 'Language Learner',
    description: 'Complete 7 lessons this week',
    emoji: '🗣️',
    targetMiles: 7,
    targetUnit: 'lessons',
    durationDays: 7,
    minStake: 10,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Educational',
    subdomain: 'Duolingo',
  },
  
  // Monthly Duolingo
  {
    id: 'edu-duolingo-monthly-1',
    title: '30 Day Streak',
    description: 'Maintain a 30-day streak',
    emoji: '🔥',
    targetMiles: 30,
    targetUnit: 'days',
    durationDays: 30,
    minStake: 25,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Educational',
    subdomain: 'Duolingo',
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
  const [selectedDomain, setSelectedDomain] = useState<DomainKey | 'Active'>('Active')
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

  // Filter goals by domain and timeframe
  const filteredGoals = FEATURED_GOALS.filter(g => {
    // 'Active' shows only on-chain goals, domain filters show all in that domain
    const domainMatch = selectedDomain === 'Active' 
      ? g.onChainId !== undefined 
      : g.domain === selectedDomain
    const timeframeMatch = selectedTimeframe === 'All' || g.category === selectedTimeframe
    return domainMatch && timeframeMatch
  })

  const showComingSoon = false // Hidden for now

  // Calculate totals
  const totalParticipants = FEATURED_GOALS.reduce((sum, g) => sum + g.participants, 0)
  const totalStaked = FEATURED_GOALS.reduce((sum, g) => sum + g.totalStaked, 0)

  // Domain colors
  const domainColors: Record<string, { bg: string; text: string; border: string }> = {
    All: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600' },
    Fitness: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700' },
    Creative: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700' },
    Educational: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700' },
  }

  return (
    <div>
      {/* Filter Section */}
      <div className="mb-8 space-y-4">
        {/* Domain Filter */}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setSelectedDomain('Active')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              selectedDomain === 'Active'
                ? 'bg-[#2EE59D] text-white shadow-lg shadow-[#2EE59D]/25'
                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] hover:border-[#2EE59D]/50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedDomain === 'Active' ? 'bg-white' : 'bg-[#2EE59D]'} animate-pulse`} />
            Active Promises
          </button>
          {(Object.keys(DOMAINS) as DomainKey[]).map((domain) => (
            <button
              key={domain}
              onClick={() => setSelectedDomain(domain)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedDomain === domain
                  ? `${domainColors[domain].bg} ${domainColors[domain].text} border ${domainColors[domain].border}`
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--text-secondary)]/50'
              }`}
            >
              {DOMAINS[domain].emoji} {domain}
            </button>
          ))}
        </div>

        {/* Timeframe Pills */}
        <div className="flex justify-center gap-2">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedTimeframe === tf
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Active filter indicator */}
        {(selectedDomain !== 'Active' || selectedTimeframe !== 'All') && (
          <div className="flex justify-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Showing {filteredGoals.length} {filteredGoals.length === 1 ? 'promise' : 'promises'}
              {selectedDomain !== 'Active' && ` in ${selectedDomain}`}
              {selectedTimeframe !== 'All' && ` • ${selectedTimeframe}`}
            </p>
          </div>
        )}
      </div>

      {/* Goals Grid with stagger animation */}
      <div className="flex flex-wrap justify-center gap-4">
        {filteredGoals.length === 0 ? (
          <div className="w-full text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-[var(--text-secondary)] mb-2">No promises found</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Try adjusting your filters or check back soon!
            </p>
            <button
              onClick={() => {
                setSelectedDomain('Active')
                setSelectedTimeframe('All')
              }}
              className="mt-4 px-4 py-2 text-sm font-medium text-[#2EE59D] hover:bg-[#2EE59D]/10 rounded-lg transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredGoals.map((goal, index) => (
            <div
              key={goal.id}
              className={`w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] transition-all duration-500 ${
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
