'use client'

import { GoalCard, Goal } from './GoalCard'

// Hardcoded goals for MVP - later these come from contract/admin
const FEATURED_GOALS: Goal[] = [
  // Daily Goals (sorted by miles ascending)
  {
    id: '1',
    title: 'Morning Mile',
    description: 'Run 1 mile to start your day',
    emoji: '🌅',
    targetMiles: 1,
    durationDays: 1,
    minStake: 2,
    maxStake: 25,
    participants: 489,
    totalStaked: 2445,
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
    participants: 312,
    totalStaked: 4680,
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
    minStake: 5,
    maxStake: 75,
    participants: 234,
    totalStaked: 3510,
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
    participants: 156,
    totalStaked: 5460,
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
    maxStake: 500,
    participants: 127,
    totalStaked: 8450,
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
    maxStake: 1000,
    participants: 43,
    totalStaked: 12750,
    category: 'running',
  },
]

export function BrowseGoals() {
  return (
    <div className="space-y-8">
      {/* Daily Goals */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-4">Daily</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.durationDays === 1).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Weekly Goals */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-4">Weekly</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.durationDays >= 3 && g.durationDays <= 7).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Monthly Goals */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-4">Monthly</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURED_GOALS.filter(g => g.durationDays >= 28).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>
    </div>
  )
}
