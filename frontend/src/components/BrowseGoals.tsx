'use client'

import { GoalCard, Goal } from './GoalCard'

// Tiered stakes (10x ratio):
// - Test (< 1 day): $1 - $10
// - Daily (1 day): $5 - $50
// - Weekly (2-7 days): $10 - $100
// - Monthly (8+ days): $20 - $200

const FEATURED_GOALS: Goal[] = [
  // Test Goals - $1-$10
  {
    id: 'test-1',
    title: '🧪 Quick Test',
    description: 'Run 0.2 miles in 2 minutes (testing)',
    emoji: '🧪',
    targetMiles: 0.2,
    durationDays: 0.00139, // ~2 minutes
    minStake: 1,
    maxStake: 10,
    participants: 0,
    totalStaked: 0,
    category: 'running',
  },
  {
    id: 'test-2',
    title: '🧪 5-Min Test',
    description: 'Run 0.5 miles in 5 minutes (testing)',
    emoji: '⚗️',
    targetMiles: 0.5,
    durationDays: 0.00347, // ~5 minutes
    minStake: 1,
    maxStake: 10,
    participants: 0,
    totalStaked: 0,
    category: 'running',
  },

  // Daily Goals - $5-$50
  {
    id: '1',
    title: 'Daily Mile',
    description: 'Run 1 mile today',
    emoji: '🌅',
    targetMiles: 1,
    durationDays: 1,
    minStake: 5,
    maxStake: 50,
    participants: 847,
    totalStaked: 4235,
    category: 'running',
  },
  {
    id: '2',
    title: 'Daily 3',
    description: 'Run 3 miles today',
    emoji: '☀️',
    targetMiles: 3,
    durationDays: 1,
    minStake: 5,
    maxStake: 50,
    participants: 423,
    totalStaked: 3175,
    category: 'running',
  },

  // Weekly Goals - $10-$100
  {
    id: '3',
    title: 'Weekend Warrior',
    description: 'Run 10 miles this weekend',
    emoji: '💪',
    targetMiles: 10,
    durationDays: 3,
    minStake: 10,
    maxStake: 100,
    participants: 312,
    totalStaked: 6240,
    category: 'running',
  },
  {
    id: '4', 
    title: 'Weekly 15',
    description: 'Run 15 miles this week',
    emoji: '⚡',
    targetMiles: 15,
    durationDays: 7,
    minStake: 10,
    maxStake: 100,
    participants: 198,
    totalStaked: 5940,
    category: 'running',
  },

  // Monthly Goals - $20-$200
  {
    id: '5',
    title: 'February 50',
    description: 'Run 50 miles this month',
    emoji: '🏃',
    targetMiles: 50,
    durationDays: 28,
    minStake: 20,
    maxStake: 200,
    participants: 156,
    totalStaked: 11700,
    category: 'running',
  },
  {
    id: '6',
    title: 'Marathon Prep',
    description: 'Hit 100 miles in 30 days',
    emoji: '🏅',
    targetMiles: 100,
    durationDays: 30,
    minStake: 20,
    maxStake: 200,
    participants: 67,
    totalStaked: 8710,
    category: 'running',
  },
]

export function BrowseGoals() {
  return (
    <div className="space-y-8">
      {/* Test Goals (Development) */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-semibold text-orange-400">🧪 Test (Dev Only)</h3>
          <span className="text-base text-[var(--text-secondary)]">$1–$10</span>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.id.startsWith('test-')).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Daily Goals */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-semibold">Daily</h3>
          <span className="text-base font-medium text-[#2EE59D]">$5–$50</span>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.durationDays === 1).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Weekly Goals */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-semibold">Weekly</h3>
          <span className="text-base font-medium text-[#2EE59D]">$10–$100</span>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.durationDays >= 3 && g.durationDays <= 7).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Monthly Goals */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-semibold">Monthly</h3>
          <span className="text-base font-medium text-[#2EE59D]">$20–$200</span>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.durationDays >= 28).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>
    </div>
  )
}
