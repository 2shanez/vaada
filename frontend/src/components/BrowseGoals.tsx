'use client'

import { useState, useEffect } from 'react'
import { GoalCard, Goal } from './GoalCard'

const FEATURED_GOALS: Goal[] = [
  // Test Goals
  {
    id: 'test-1',
    onChainId: 9,
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
  { title: 'Cycling Goals', emoji: '🚴', desc: 'Track your rides' },
  { title: 'Step Counter', emoji: '👟', desc: 'Daily step challenges' },
]

interface BrowseGoalsProps {
  filter?: 'All' | 'Test' | 'Daily' | 'Weekly' | 'Monthly'
}

export function BrowseGoals({ filter = 'All' }: BrowseGoalsProps) {
  const [mounted, setMounted] = useState(false)
  const [notified, setNotified] = useState<string[]>([])
  
  useEffect(() => {
    setMounted(true)
    // Load notified items from localStorage
    const saved = localStorage.getItem('goalstake_notified')
    if (saved) setNotified(JSON.parse(saved))
  }, [])

  const handleNotify = (title: string) => {
    const updated = [...notified, title]
    setNotified(updated)
    localStorage.setItem('goalstake_notified', JSON.stringify(updated))
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
                  onClick={() => handleNotify(item.title)}
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
          <p className="text-[var(--text-secondary)] font-medium mb-2">No {filter.toLowerCase()} goals yet</p>
          <p className="text-sm text-[var(--text-secondary)]">Check back soon or try a different category</p>
        </div>
      )}

      </div>
  )
}
