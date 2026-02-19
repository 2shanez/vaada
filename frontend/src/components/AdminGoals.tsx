'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { GOALSTAKE_ABI } from '@/lib/abis'
import { useContracts } from '@/lib/hooks'

const fallbackClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/V2EEs8WP3hd6yldPEx92v'),
})

interface AdminGoal {
  id: number
  name: string
  goalType: number
  target: number
  minStake: number
  maxStake: number
  totalStaked: number
  participantCount: number
  startTime: number
  entryDeadline: number
  deadline: number
  active: boolean
  settled: boolean
  phase: string
}

function getPhaseLabel(goal: AdminGoal): { label: string; color: string } {
  const now = Math.floor(Date.now() / 1000)
  if (goal.settled) return { label: 'Settled', color: 'text-gray-400' }
  if (!goal.active) return { label: 'Cancelled', color: 'text-red-400' }
  if (now < goal.entryDeadline) return { label: 'Entry', color: 'text-[#2EE59D]' }
  if (now < goal.deadline) return { label: 'Compete', color: 'text-yellow-400' }
  return { label: 'Awaiting Settlement', color: 'text-orange-400' }
}

function formatTime(ts: number): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  })
}

function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}hr`
  return `${(seconds / 86400).toFixed(1)}d`
}

export function AdminGoals() {
  const contracts = useContracts()
  const [goals, setGoals] = useState<AdminGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  const fetchGoals = useCallback(async () => {
    if (!contracts.goalStake) return
    setLoading(true)

    try {
      const goalCount = await fallbackClient.readContract({
        address: contracts.goalStake,
        abi: GOALSTAKE_ABI,
        functionName: 'goalCount',
      }) as bigint

      const loaded: AdminGoal[] = []

      for (let i = 0; i < Number(goalCount); i++) {
        try {
          const goal = await fallbackClient.readContract({
            address: contracts.goalStake,
            abi: GOALSTAKE_ABI,
            functionName: 'getGoal',
            args: [BigInt(i)],
          }) as any

          let goalType = 0
          try {
            goalType = Number(await fallbackClient.readContract({
              address: contracts.goalStake,
              abi: GOALSTAKE_ABI,
              functionName: 'goalTypes',
              args: [BigInt(i)],
            }))
          } catch {}

          const target = Number(goal.targetMiles || goal.target)
          // Skip broken goals with absurd targets
          if (target > 1000000) continue

          loaded.push({
            id: i,
            name: goal.name || `Goal #${i}`,
            goalType,
            target,
            minStake: Number(formatUnits(goal.minStake, 6)),
            maxStake: Number(formatUnits(goal.maxStake, 6)),
            totalStaked: Number(formatUnits(goal.totalStaked, 6)),
            participantCount: Number(goal.participantCount),
            startTime: Number(goal.startTime),
            entryDeadline: Number(goal.entryDeadline),
            deadline: Number(goal.deadline),
            active: goal.active,
            settled: goal.settled,
            phase: '',
          })
        } catch (e) {
          console.warn(`Skipping goal ${i}:`, e)
        }
      }

      // Reverse so newest first
      setGoals(loaded.reverse())
    } catch (e) {
      console.error('Failed to fetch goals:', e)
    } finally {
      setLoading(false)
    }
  }, [contracts.goalStake])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleCancel = async (goalId: number) => {
    if (!confirm(`Cancel goal #${goalId}? This cannot be undone.`)) return
    setCancellingId(goalId)
    try {
      const res = await fetch('/api/admin/cancel-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert(`Goal #${goalId} cancelled. TX: ${data.txHash}`)
      fetchGoals()
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`)
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
        <h2 className="text-lg font-semibold mb-4">📋 Created Promises</h2>
        <div className="text-[var(--text-secondary)] text-sm animate-pulse">Loading goals from contract...</div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">📋 Created Promises ({goals.length})</h2>
        <button
          onClick={fetchGoals}
          className="text-xs text-[var(--text-secondary)] hover:text-[#2EE59D] transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="text-[var(--text-secondary)] text-sm">No promises created yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)] text-xs uppercase tracking-wider border-b border-[var(--border)]">
                <th className="pb-3 pr-3">#</th>
                <th className="pb-3 pr-3">Name</th>
                <th className="pb-3 pr-3">Type</th>
                <th className="pb-3 pr-3">Target</th>
                <th className="pb-3 pr-3">Stake</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3 pr-3">Users</th>
                <th className="pb-3 pr-3">TVL</th>
                <th className="pb-3 pr-3">Deadline</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => {
                const { label, color } = getPhaseLabel(goal)
                const isActive = goal.active && !goal.settled
                return (
                  <tr key={goal.id} className={`border-b border-[var(--border)]/50 ${!isActive ? 'opacity-50' : ''}`}>
                    <td className="py-3 pr-3 font-mono text-[var(--text-secondary)]">{goal.id}</td>
                    <td className="py-3 pr-3 font-medium">{goal.name}</td>
                    <td className="py-3 pr-3">
                      <span className="text-xs">{goal.goalType === 1 ? '👟 Steps' : '🏃 Miles'}</span>
                    </td>
                    <td className="py-3 pr-3 font-mono">
                      {goal.target.toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 font-mono">
                      ${goal.minStake}{goal.maxStake !== goal.minStake ? `-$${goal.maxStake}` : ''}
                    </td>
                    <td className={`py-3 pr-3 font-medium ${color}`}>
                      {label}
                    </td>
                    <td className="py-3 pr-3 font-mono">{goal.participantCount}</td>
                    <td className="py-3 pr-3 font-mono">${goal.totalStaked.toFixed(2)}</td>
                    <td className="py-3 pr-3 text-xs text-[var(--text-secondary)]">
                      {formatTime(goal.deadline)}
                      <br />
                      <span className="text-[10px]">{formatDuration(goal.deadline - goal.startTime)} duration</span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {isActive && (
                          <button
                            onClick={() => handleCancel(goal.id)}
                            disabled={cancellingId === goal.id}
                            className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {cancellingId === goal.id ? '...' : 'Cancel'}
                          </button>
                        )}
                        <a
                          href={`https://basescan.org/address/${contracts.goalStake}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded-lg bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[#2EE59D] transition-colors"
                        >
                          View
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
