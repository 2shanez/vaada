'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { GoalCard, Goal } from './GoalCard'
import { GOALSTAKE_ABI } from '@/lib/abis'
import { useContracts } from '@/lib/hooks'

// Fallback client for when wagmi isn't connected yet
const fallbackClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/V2EEs8WP3hd6yldPEx92v'),
})

// Export for backward compat
export const FEATURED_GOALS: Goal[] = []

export function BrowseGoals() {
  const publicClient = usePublicClient()
  const { address } = useAccount()
  const contracts = useContracts()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const FILTERS = ['Live', 'All'] as const
  type Filter = typeof FILTERS[number]
  const [activeFilter, setActiveFilter] = useState<Filter>('Live')

  const fetchGoals = useCallback(async () => {
    if (!contracts.goalStake) return
    const client = publicClient || fallbackClient
    setLoading(true)

    try {
      const goalCount = await client.readContract({
        address: contracts.goalStake,
        abi: GOALSTAKE_ABI,
        functionName: 'goalCount',
      }) as bigint

      const loaded: Goal[] = []

      for (let i = 0; i < Number(goalCount); i++) {
        try {
          const goal = await client.readContract({
            address: contracts.goalStake,
            abi: GOALSTAKE_ABI,
            functionName: 'getGoal',
            args: [BigInt(i)],
          }) as any

          const goalType = await client.readContract({
            address: contracts.goalStake,
            abi: GOALSTAKE_ABI,
            functionName: 'goalTypes',
            args: [BigInt(i)],
          }) as number

          const isSteps = goalType === 1
          const target = Number(goal.targetMiles || goal.target)
          const minStake = Number(formatUnits(goal.minStake, 6))
          const maxStake = Number(formatUnits(goal.maxStake, 6))
          
          // Skip goals with absurd targets (wei-scaling bug from old goals)
          if (target > 1000000) continue

          // Categorize by duration
          const duration = Number(goal.deadline) - Number(goal.startTime)
          let category = 'Daily'
          if (duration > 7 * 86400) category = 'Monthly'
          else if (duration > 86400) category = 'Weekly'

          // Auto-generate description
          const stakeText = minStake === maxStake ? `$${minStake}` : `$${minStake}-$${maxStake}`
          const targetText = target.toLocaleString() + (isSteps ? ' steps' : target === 1 ? ' mile' : ' miles')

          const now = Math.floor(Date.now() / 1000)
          const entryPassed = now > Number(goal.entryDeadline)
          const deadlinePassed = now > Number(goal.deadline)
          const participants = Number(goal.participantCount)

          // Skip dead/empty goals
          if (participants === 0) continue

          loaded.push({
            id: `goal-${i}`,
            onChainId: i,
            title: goal.name,
            description: `${targetText}. Stake ${stakeText}, keep your promise.`,
            emoji: isSteps ? '👟' : '🏃',
            targetMiles: target,
            targetUnit: isSteps ? 'steps' : 'miles',
            durationDays: Math.ceil(duration / 86400),
            minStake,
            maxStake,
            participants,
            totalStaked: Number(formatUnits(goal.totalStaked, 6)),
            category,
            domain: 'Fitness',
            subdomain: isSteps ? 'Steps' : 'Running',
            live: true,
            settled: goal.settled,
            deadlineTimestamp: Number(goal.deadline),
          })
        } catch {
          // Skip goals that error
        }
      }

      // Fetch user results if connected
      if (address && contracts.goalStake) {
        for (const g of loaded) {
          if (g.settled && g.onChainId !== undefined) {
            try {
              const p = await client.readContract({
                address: contracts.goalStake,
                abi: GOALSTAKE_ABI,
                functionName: 'getParticipant',
                args: [BigInt(g.onChainId), address],
              }) as any
              if (p && p.stake > BigInt(0)) {
                g.userResult = p.succeeded ? 'kept' : 'broken'
              }
            } catch {}
          }
        }
      }

      setGoals(loaded)
    } catch (err) {
      console.error('Failed to load goals:', err)
    } finally {
      setLoading(false)
    }
  }, [publicClient, contracts.goalStake, address])

  useEffect(() => {
    setMounted(true)
    fetchGoals()
  }, [fetchGoals])

  // Filter: Live = unsettled only, All = last 30 days
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400
  const filteredGoals = goals.filter(g => {
    if (activeFilter === 'Live') {
      return !g.settled
    }
    // All: show unsettled + settled within last 30 days
    if (g.settled && g.deadlineTimestamp && g.deadlineTimestamp < thirtyDaysAgo) return false
    return true
  }).sort((a, b) => {
    // Unsettled first, then kept, then broken, then newest
    if (a.settled !== b.settled) return a.settled ? 1 : -1
    const resultOrder = { kept: 0, broken: 1, none: 2, undefined: 2 }
    const aOrder = resultOrder[a.userResult || 'undefined']
    const bOrder = resultOrder[b.userResult || 'undefined']
    if (aOrder !== bOrder) return aOrder - bOrder
    return (b.onChainId || 0) - (a.onChainId || 0)
  })

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

      {/* Loading state */}
      {loading ? (
        <div className="w-full text-center py-16">
          <div className="w-14 h-14 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-7 h-7 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Loading promises...</p>
        </div>
      ) : (
        <div>
          {filteredGoals.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No promises yet</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
                Be the first to stake your word.
              </p>
              <a href="/dashboard" className="inline-block mt-4 px-6 py-2 rounded-full bg-[#2EE59D] text-black text-sm font-semibold hover:bg-[#26cc8a] transition-colors">
                Get Started
              </a>
            </div>
          ) : (
            <>
            {activeFilter === 'All' && (
              <p className="text-center text-xs text-[var(--text-secondary)] mb-4">
                Showing promises from the last 30 days
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto" style={{ overflow: 'visible' }}>
              {filteredGoals.map((goal, index) => (
                <div
                  key={goal.id}
                  className={`${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${index * 50}ms`, transition: 'opacity 500ms, transform 500ms', overflow: 'visible' }}
                >
                  <GoalCard goal={goal} />
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
