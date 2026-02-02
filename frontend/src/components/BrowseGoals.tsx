'use client'

import { GoalCard, Goal } from './GoalCard'

const FEATURED_GOALS: Goal[] = [
  // Test Goals - $1-$10
  {
    id: 'test-1',
    onChainId: 0,
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

  // Daily Goals - $5-$50
  {
    id: '1',
    onChainId: 2,
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

  // Weekly Goals - $10-$100
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

  // Monthly Goals - $20-$200
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

// Coming soon goals to fill the grid
const COMING_SOON = [
  { title: 'Cycling Goals', emoji: '🚴', category: 'Coming Soon' },
  { title: 'Step Counter', emoji: '👟', category: 'Coming Soon' },
]

interface BrowseGoalsProps {
  filter?: 'All' | 'Test' | 'Daily' | 'Weekly' | 'Monthly'
}

export function BrowseGoals({ filter = 'All' }: BrowseGoalsProps) {
  const filteredGoals = filter === 'All' 
    ? FEATURED_GOALS 
    : FEATURED_GOALS.filter(g => g.category === filter)

  const showComingSoon = filter === 'All'

  return (
    <div>
      {/* Goals Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredGoals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
        
        {/* Coming Soon Placeholders */}
        {showComingSoon && COMING_SOON.map((item, i) => (
          <div 
            key={`coming-${i}`}
            className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[200px] group hover:border-gray-300 transition-colors"
          >
            <span className="text-3xl mb-3 grayscale group-hover:grayscale-0 transition-all">{item.emoji}</span>
            <p className="font-semibold text-sm text-gray-400 mb-1">{item.title}</p>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Coming Soon</span>
            <button className="mt-3 text-xs text-[#2EE59D] font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
              Get notified →
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredGoals.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🏃</div>
          <p className="text-gray-500 mb-2">No {filter.toLowerCase()} goals available yet</p>
          <p className="text-sm text-gray-400">Check back soon or try a different category</p>
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center gap-8 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">{FEATURED_GOALS.length}</p>
          <p className="text-xs text-gray-500">Active Goals</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#2EE59D]">$0</p>
          <p className="text-xs text-gray-500">Total Staked</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-500">Participants</p>
        </div>
      </div>
    </div>
  )
}
