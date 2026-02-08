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
    live: true,
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
  // FITNESS - CYCLING (Strava)
  // ═══════════════════════════════════════════
  
  // Daily Cycling
  {
    id: 'fitness-cycling-daily-1',
    title: 'Daily Ride',
    description: 'Ride 5 miles today',
    emoji: '🚴',
    targetMiles: 5,
    targetUnit: 'miles',
    durationDays: 1,
    minStake: 5,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Fitness',
    subdomain: 'Cycling',
  },
  
  // Weekly Cycling
  {
    id: 'fitness-cycling-weekly-1',
    title: 'Weekend Warrior',
    description: 'Ride 30 miles this weekend',
    emoji: '🚵',
    targetMiles: 30,
    targetUnit: 'miles',
    durationDays: 3,
    minStake: 15,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Fitness',
    subdomain: 'Cycling',
  },
  {
    id: 'fitness-cycling-weekly-2',
    title: 'Weekly 50',
    description: 'Ride 50 miles this week',
    emoji: '⚡',
    targetMiles: 50,
    targetUnit: 'miles',
    durationDays: 7,
    minStake: 15,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Fitness',
    subdomain: 'Cycling',
  },
  
  // Monthly Cycling
  {
    id: 'fitness-cycling-monthly-1',
    title: 'Century Month',
    description: 'Ride 200 miles this month',
    emoji: '🏆',
    targetMiles: 200,
    targetUnit: 'miles',
    durationDays: 30,
    minStake: 25,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Fitness',
    subdomain: 'Cycling',
  },

  // ═══════════════════════════════════════════
  // FITNESS - SWIMMING (Garmin/Apple Watch/Strava)
  // ═══════════════════════════════════════════
  
  // Daily Swimming
  {
    id: 'fitness-swimming-daily-1',
    title: 'Daily Swim',
    description: 'Swim 1000m today',
    emoji: '🏊',
    targetMiles: 1000,
    targetUnit: 'meters',
    durationDays: 1,
    minStake: 5,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Fitness',
    subdomain: 'Swimming',
  },
  
  // Weekly Swimming
  {
    id: 'fitness-swimming-weekly-1',
    title: 'Swim 5K',
    description: 'Swim 5000m this week',
    emoji: '🌊',
    targetMiles: 5000,
    targetUnit: 'meters',
    durationDays: 7,
    minStake: 15,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Fitness',
    subdomain: 'Swimming',
  },
  
  // Monthly Swimming
  {
    id: 'fitness-swimming-monthly-1',
    title: 'Swim 20K',
    description: 'Swim 20,000m this month',
    emoji: '🏅',
    targetMiles: 20000,
    targetUnit: 'meters',
    durationDays: 30,
    minStake: 25,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Fitness',
    subdomain: 'Swimming',
  },

  // ═══════════════════════════════════════════
  // FITNESS - STEPS (Fitbit/Google Fit)
  // ═══════════════════════════════════════════
  
  // Daily Steps
  {
    id: 'fitness-steps-daily-1',
    title: '10K Steps',
    description: 'Hit 10,000 steps today',
    emoji: '👟',
    targetMiles: 10000,
    targetUnit: 'steps',
    durationDays: 1,
    minStake: 5,
    maxStake: 25,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Fitness',
    subdomain: 'Steps',
  },
  
  // Weekly Steps
  {
    id: 'fitness-steps-weekly-1',
    title: '70K Week',
    description: 'Average 10K steps daily for 7 days',
    emoji: '🚶',
    targetMiles: 70000,
    targetUnit: 'steps',
    durationDays: 7,
    minStake: 15,
    maxStake: 75,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Fitness',
    subdomain: 'Steps',
  },
  
  // Monthly Steps
  {
    id: 'fitness-steps-monthly-1',
    title: '300K Month',
    description: 'Walk 300,000 steps this month',
    emoji: '🏆',
    targetMiles: 300000,
    targetUnit: 'steps',
    durationDays: 30,
    minStake: 25,
    maxStake: 150,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Fitness',
    subdomain: 'Steps',
  },

  // ═══════════════════════════════════════════
  // CREATIVE - YOUTUBE
  // ═══════════════════════════════════════════
  
  // Weekly YouTube
  {
    id: 'creative-youtube-weekly-1',
    title: 'Weekly Upload',
    description: 'Upload 1 YouTube video (3+ min)',
    emoji: '🎬',
    targetMiles: 1,
    targetUnit: 'videos',
    durationDays: 7,
    minStake: 10,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Creative',
    subdomain: 'YouTube',
  },
  
  // Monthly YouTube
  {
    id: 'creative-youtube-monthly-1',
    title: 'Content Machine',
    description: 'Upload 4 YouTube videos (3+ min each)',
    emoji: '📹',
    targetMiles: 4,
    targetUnit: 'videos',
    durationDays: 30,
    minStake: 20,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Creative',
    subdomain: 'YouTube',
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

  // ═══════════════════════════════════════════
  // EDUCATIONAL - LEETCODE
  // ═══════════════════════════════════════════
  
  // Daily LeetCode
  {
    id: 'edu-leetcode-daily-1',
    title: 'Daily Problem',
    description: 'Solve 1 LeetCode problem today',
    emoji: '💻',
    targetMiles: 1,
    targetUnit: 'problems',
    durationDays: 1,
    minStake: 5,
    maxStake: 25,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Educational',
    subdomain: 'LeetCode',
  },
  
  // Weekly LeetCode
  {
    id: 'edu-leetcode-weekly-1',
    title: 'Weekly Grind',
    description: 'Solve 7 LeetCode problems this week',
    emoji: '⚡',
    targetMiles: 7,
    targetUnit: 'problems',
    durationDays: 7,
    minStake: 15,
    maxStake: 75,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Educational',
    subdomain: 'LeetCode',
  },
  {
    id: 'edu-leetcode-weekly-2',
    title: 'Hard Mode',
    description: 'Solve 1 Hard problem this week',
    emoji: '🔥',
    targetMiles: 1,
    targetUnit: 'hard problem',
    durationDays: 7,
    minStake: 25,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Educational',
    subdomain: 'LeetCode',
  },
  
  // Monthly LeetCode
  {
    id: 'edu-leetcode-monthly-1',
    title: 'LeetCode 30',
    description: 'Solve 30 problems this month',
    emoji: '🏆',
    targetMiles: 30,
    targetUnit: 'problems',
    durationDays: 30,
    minStake: 30,
    maxStake: 150,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Educational',
    subdomain: 'LeetCode',
  },

  // ═══════════════════════════════════════════
  // EDUCATIONAL - READING (Goodreads)
  // ═══════════════════════════════════════════
  
  // Daily Reading
  {
    id: 'edu-reading-daily-1',
    title: '30 Min Reading',
    description: 'Read for 30 minutes today',
    emoji: '📖',
    targetMiles: 30,
    targetUnit: 'minutes',
    durationDays: 1,
    minStake: 5,
    maxStake: 25,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Educational',
    subdomain: 'Reading',
  },
  
  // Weekly Reading
  {
    id: 'edu-reading-weekly-1',
    title: 'Finish a Book',
    description: 'Complete 1 book this week',
    emoji: '📚',
    targetMiles: 1,
    targetUnit: 'books',
    durationDays: 7,
    minStake: 15,
    maxStake: 75,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Educational',
    subdomain: 'Reading',
  },
  
  // Monthly Reading
  {
    id: 'edu-reading-monthly-1',
    title: 'Book Club',
    description: 'Read 2 books this month',
    emoji: '📕',
    targetMiles: 2,
    targetUnit: 'books',
    durationDays: 30,
    minStake: 20,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Educational',
    subdomain: 'Reading',
  },
  {
    id: 'edu-reading-monthly-2',
    title: 'Bookworm',
    description: 'Read 4 books this month',
    emoji: '🐛',
    targetMiles: 4,
    targetUnit: 'books',
    durationDays: 30,
    minStake: 40,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Educational',
    subdomain: 'Reading',
  },

  // ═══════════════════════════════════════════
  // HEALTH - WEIGHT (Smart Scale)
  // ═══════════════════════════════════════════
  
  // Weekly Weight
  {
    id: 'health-weight-weekly-1',
    title: 'Daily Weigh-In',
    description: 'Log weight 7 days straight',
    emoji: '⚖️',
    targetMiles: 7,
    targetUnit: 'weigh-ins',
    durationDays: 7,
    minStake: 10,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Health',
    subdomain: 'Weight',
  },
  
  // Monthly Weight
  {
    id: 'health-weight-monthly-1',
    title: 'Lose 5 lbs',
    description: 'Hit your target weight in 30 days',
    emoji: '📉',
    targetMiles: 5,
    targetUnit: 'lbs',
    durationDays: 30,
    minStake: 25,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Health',
    subdomain: 'Weight',
  },
  {
    id: 'health-weight-monthly-2',
    title: 'Lose 10 lbs',
    description: 'Serious weight loss in 60 days',
    emoji: '🏆',
    targetMiles: 10,
    targetUnit: 'lbs',
    durationDays: 60,
    minStake: 50,
    maxStake: 500,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Health',
    subdomain: 'Weight',
  },

  // ═══════════════════════════════════════════
  // HEALTH - NUTRITION (No Delivery)
  // ═══════════════════════════════════════════
  
  // Weekly Nutrition
  {
    id: 'health-nutrition-weekly-1',
    title: 'No Delivery Week',
    description: 'Zero DoorDash/UberEats orders for 7 days',
    emoji: '🚫🍔',
    targetMiles: 0,
    targetUnit: 'orders',
    durationDays: 7,
    minStake: 10,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Health',
    subdomain: 'Nutrition',
  },
  
  // Monthly Nutrition
  {
    id: 'health-nutrition-monthly-1',
    title: 'No Delivery Month',
    description: 'Zero food delivery for 30 days',
    emoji: '🥗',
    targetMiles: 0,
    targetUnit: 'orders',
    durationDays: 30,
    minStake: 50,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Health',
    subdomain: 'Nutrition',
  },
  {
    id: 'health-nutrition-monthly-2',
    title: 'Home Cook Challenge',
    description: 'Max 4 delivery orders in 30 days',
    emoji: '👨‍🍳',
    targetMiles: 4,
    targetUnit: 'orders max',
    durationDays: 30,
    minStake: 25,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Health',
    subdomain: 'Nutrition',
  },

  // ═══════════════════════════════════════════
  // HEALTH - WELLNESS (Meditation/Mindfulness)
  // ═══════════════════════════════════════════
  
  // Daily Wellness
  {
    id: 'health-wellness-daily-1',
    title: 'Daily Meditation',
    description: 'Meditate for 10+ minutes today',
    emoji: '🧘',
    targetMiles: 10,
    targetUnit: 'minutes',
    durationDays: 1,
    minStake: 5,
    maxStake: 25,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Health',
    subdomain: 'Wellness',
  },
  
  // Weekly Wellness
  {
    id: 'health-wellness-weekly-1',
    title: 'Meditation Week',
    description: 'Meditate 7 days straight (Headspace/Calm)',
    emoji: '🧠',
    targetMiles: 7,
    targetUnit: 'sessions',
    durationDays: 7,
    minStake: 15,
    maxStake: 75,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Health',
    subdomain: 'Wellness',
  },
  {
    id: 'health-wellness-weekly-2',
    title: 'Journal Week',
    description: 'Write in your journal 7 days straight',
    emoji: '📓',
    targetMiles: 7,
    targetUnit: 'entries',
    durationDays: 7,
    minStake: 10,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Health',
    subdomain: 'Wellness',
  },
  
  // Monthly Wellness
  {
    id: 'health-wellness-monthly-1',
    title: '30 Day Meditation',
    description: 'Build a daily meditation habit',
    emoji: '🕯️',
    targetMiles: 30,
    targetUnit: 'sessions',
    durationDays: 30,
    minStake: 25,
    maxStake: 150,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Health',
    subdomain: 'Wellness',
  },

  // ═══════════════════════════════════════════
  // HEALTH - SLEEP (Oura/Whoop/Fitbit)
  // ═══════════════════════════════════════════
  
  // Daily Sleep
  {
    id: 'health-sleep-daily-1',
    title: '7+ Hours Tonight',
    description: 'Get at least 7 hours of sleep',
    emoji: '😴',
    targetMiles: 7,
    targetUnit: 'hours',
    durationDays: 1,
    minStake: 5,
    maxStake: 25,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Health',
    subdomain: 'Sleep',
  },
  
  // Weekly Sleep
  {
    id: 'health-sleep-weekly-1',
    title: 'Sleep Week',
    description: 'Average 7+ hours for 7 nights',
    emoji: '🛏️',
    targetMiles: 7,
    targetUnit: 'hours avg',
    durationDays: 7,
    minStake: 15,
    maxStake: 75,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Health',
    subdomain: 'Sleep',
  },
  {
    id: 'health-sleep-weekly-2',
    title: 'Early Bird Week',
    description: 'Wake before 7am for 7 days',
    emoji: '🌅',
    targetMiles: 7,
    targetUnit: 'days',
    durationDays: 7,
    minStake: 15,
    maxStake: 75,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Health',
    subdomain: 'Sleep',
  },
  
  // Monthly Sleep
  {
    id: 'health-sleep-monthly-1',
    title: 'Sleep Consistency',
    description: 'Average 7+ hours for 30 nights',
    emoji: '💤',
    targetMiles: 7,
    targetUnit: 'hours avg',
    durationDays: 30,
    minStake: 30,
    maxStake: 150,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Health',
    subdomain: 'Sleep',
  },

  // ═══════════════════════════════════════════
  // HEALTH - SCREEN TIME (RescueTime)
  // ═══════════════════════════════════════════
  
  // Daily Screen Time
  {
    id: 'health-screen-daily-1',
    title: 'Under 2 Hours',
    description: 'Keep phone screen time under 2 hours today',
    emoji: '📵',
    targetMiles: 2,
    targetUnit: 'hours max',
    durationDays: 1,
    minStake: 5,
    maxStake: 25,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Health',
    subdomain: 'Screen Time',
  },
  
  // Weekly Screen Time
  {
    id: 'health-screen-weekly-1',
    title: 'Digital Detox Week',
    description: 'Average under 2 hours daily for 7 days',
    emoji: '📱',
    targetMiles: 2,
    targetUnit: 'hours avg',
    durationDays: 7,
    minStake: 20,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Health',
    subdomain: 'Screen Time',
  },
  {
    id: 'health-screen-weekly-2',
    title: 'No Social Media',
    description: 'Zero social media apps for 7 days',
    emoji: '🚫',
    targetMiles: 0,
    targetUnit: 'social hours',
    durationDays: 7,
    minStake: 25,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Health',
    subdomain: 'Screen Time',
  },
  
  // Monthly Screen Time
  {
    id: 'health-screen-monthly-1',
    title: '30 Day Digital Diet',
    description: 'Average under 2 hours screen time daily',
    emoji: '✨',
    targetMiles: 2,
    targetUnit: 'hours avg',
    durationDays: 30,
    minStake: 50,
    maxStake: 200,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Health',
    subdomain: 'Screen Time',
  },

  // ═══════════════════════════════════════════
  // STARTUP - LAUNCH (Product Hunt)
  // ═══════════════════════════════════════════
  
  // Weekly Launch
  {
    id: 'startup-launch-weekly-1',
    title: 'Launch This Week',
    description: 'Ship your product on Product Hunt',
    emoji: '🚀',
    targetMiles: 1,
    targetUnit: 'launch',
    durationDays: 7,
    minStake: 50,
    maxStake: 500,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Startup',
    subdomain: 'Launch',
  },
  
  // Monthly Launch
  {
    id: 'startup-launch-monthly-1',
    title: 'Launch by End of Month',
    description: 'Get your product live on Product Hunt',
    emoji: '🎯',
    targetMiles: 1,
    targetUnit: 'launch',
    durationDays: 30,
    minStake: 100,
    maxStake: 1000,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Startup',
    subdomain: 'Launch',
  },

  // ═══════════════════════════════════════════
  // STARTUP - SHIPPING (GitHub)
  // ═══════════════════════════════════════════
  
  // Daily Shipping
  {
    id: 'startup-shipping-daily-1',
    title: 'Daily Commit',
    description: 'Push code to GitHub today',
    emoji: '💻',
    targetMiles: 1,
    targetUnit: 'commits',
    durationDays: 1,
    minStake: 5,
    maxStake: 25,
    participants: 0,
    totalStaked: 0,
    category: 'Daily',
    domain: 'Startup',
    subdomain: 'Shipping',
  },
  
  // Weekly Shipping
  {
    id: 'startup-shipping-weekly-1',
    title: 'Ship 3 Features',
    description: 'Merge 3 PRs this week',
    emoji: '⚡',
    targetMiles: 3,
    targetUnit: 'PRs',
    durationDays: 7,
    minStake: 25,
    maxStake: 100,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Startup',
    subdomain: 'Shipping',
  },
  {
    id: 'startup-shipping-weekly-2',
    title: 'Build in Public',
    description: 'Tweet your progress 7 days straight',
    emoji: '🐦',
    targetMiles: 7,
    targetUnit: 'tweets',
    durationDays: 7,
    minStake: 10,
    maxStake: 50,
    participants: 0,
    totalStaked: 0,
    category: 'Weekly',
    domain: 'Startup',
    subdomain: 'Shipping',
  },
  
  // Monthly Shipping
  {
    id: 'startup-shipping-monthly-1',
    title: '30 Day Streak',
    description: 'Commit to GitHub every day for 30 days',
    emoji: '🔥',
    targetMiles: 30,
    targetUnit: 'commits',
    durationDays: 30,
    minStake: 50,
    maxStake: 250,
    participants: 0,
    totalStaked: 0,
    category: 'Monthly',
    domain: 'Startup',
    subdomain: 'Shipping',
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
  const [showLive, setShowLive] = useState(true)  // true = Live vaadas, false = Coming Soon
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

  // Filter goals by live/coming soon + domain + timeframe
  const filteredGoals = FEATURED_GOALS.filter(g => {
    const liveMatch = showLive ? g.live === true : g.live !== true
    const domainMatch = selectedDomain === 'All' || g.domain === selectedDomain
    const timeframeMatch = selectedTimeframe === 'All' || g.category === selectedTimeframe
    return liveMatch && domainMatch && timeframeMatch
  })

  const showComingSoon = false // Hidden for now

  // Calculate totals
  const totalParticipants = FEATURED_GOALS.reduce((sum, g) => sum + g.participants, 0)
  const totalStaked = FEATURED_GOALS.reduce((sum, g) => sum + g.totalStaked, 0)

  // Domain colors
  const domainColors: Record<string, { bg: string; text: string; border: string }> = {
    All: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600' },
    Fitness: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700' },
    Health: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-300 dark:border-pink-700' },
    Creative: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700' },
    Educational: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700' },
    Startup: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700' },
  }

  return (
    <div>
      {/* Filter Section - Clean 2-row layout */}
      <div className="mb-6 space-y-3">
        {/* Row 1: Live indicator + Timeframes in single pill */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-0.5 p-1 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
            {/* Live indicator */}
            <div
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                showLive
                  ? 'bg-[#2EE59D] text-white'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${showLive ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
              Live
            </div>
            
            {/* Divider */}
            <div className="w-px h-5 bg-[var(--border)] mx-1" />
            
            {/* Timeframes */}
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedTimeframe === tf
                    ? 'bg-[var(--foreground)] text-[var(--background)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Domain chips + Coming Soon */}
        <div className="relative">
          <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center justify-start sm:justify-center gap-2 min-w-max">
              {(Object.keys(DOMAINS) as DomainKey[]).map((domain) => (
                <button
                  key={domain}
                  onClick={() => { setSelectedDomain(selectedDomain === domain ? 'All' : domain); setShowLive(true); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                    selectedDomain === domain && showLive
                      ? `${domainColors[domain]?.bg || 'bg-gray-100 dark:bg-gray-800'} ${domainColors[domain]?.text || 'text-gray-700'} ${domainColors[domain]?.border || 'border-transparent'}`
                      : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--foreground)]/20'
                  }`}
                >
                  <span>{DOMAINS[domain].emoji}</span>
                  <span>{domain}</span>
                </button>
              ))}
              
              {/* Coming Soon tab */}
              <button
                onClick={() => { setShowLive(false); setSelectedDomain('All'); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                  !showLive
                    ? 'bg-[var(--foreground)] text-[var(--background)] border-transparent'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--foreground)]/20'
                }`}
              >
                <span>✨</span>
                <span>Coming Soon</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active filters indicator */}
      {(selectedDomain !== 'All' || selectedTimeframe !== 'All' || !showLive) && (
        <div className="mb-4 flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>Showing {filteredGoals.length} {filteredGoals.length === 1 ? 'goal' : 'goals'}</span>
          <button 
            onClick={() => { setSelectedDomain('All'); setSelectedTimeframe('All'); setShowLive(true); }}
            className="text-[#2EE59D] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

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
                setShowLive(true)
                setSelectedDomain('All')
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
