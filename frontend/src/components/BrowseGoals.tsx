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

interface BrowseGoalsProps {
  filter?: 'All' | 'Test' | 'Daily' | 'Weekly' | 'Monthly'
}

export function BrowseGoals({ filter = 'All' }: BrowseGoalsProps) {
  const filteredGoals = filter === 'All' 
    ? FEATURED_GOALS 
    : FEATURED_GOALS.filter(g => g.category === filter)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {filteredGoals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  )
}
