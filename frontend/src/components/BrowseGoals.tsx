'use client'

import { GoalCard, Goal } from './GoalCard'

// Hardcoded goals for MVP - later these come from contract/admin
const FEATURED_GOALS: Goal[] = [
  // Test Goals (for development)
  {
    id: 'test-1',
    title: '🧪 Quick Test',
    description: 'Run 0.2 miles in 2 minutes (testing)',
    emoji: '🧪',
    targetMiles: 0.2,
    durationDays: 0.00139, // ~2 minutes (2/1440)
    minStake: 1,
    maxStake: 5,
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
    durationDays: 0.00347, // ~5 minutes (5/1440)
    minStake: 1,
    maxStake: 10,
    participants: 0,
    totalStaked: 0,
    category: 'running',
  },
  // Daily Goals (sorted by miles ascending)
  {
    id: '1',
    title: 'Daily Mile',
    description: 'Run 1 mile today',
    emoji: '🌅',
    targetMiles: 1,
    durationDays: 1,
    minStake: 5,
    maxStake: 25,
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
  // Weekly Goals (sorted by miles ascending)
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
    minStake: 15,
    maxStake: 150,
    participants: 198,
    totalStaked: 5940,
    category: 'running',
  },
  // Monthly Goals
  {
    id: '5',
    title: 'February 50',
    description: 'Run 50 miles this month',
    emoji: '🏃',
    targetMiles: 50,
    durationDays: 28,
    minStake: 25,
    maxStake: 250,
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
    minStake: 50,
    maxStake: 500,
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
        <h3 className="text-sm font-medium text-orange-400 mb-4">🧪 Test (Dev Only)</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.id.startsWith('test-')).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Daily Goals */}
      <div>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Daily</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.durationDays === 1).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Weekly Goals */}
      <div>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Weekly</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.durationDays >= 3 && g.durationDays <= 7).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Monthly Goals */}
      <div>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Monthly</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.durationDays >= 28).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>
    </div>
  )
}
