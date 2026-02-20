'use client'

import { createPortal } from 'react-dom'
import type { RefObject } from 'react'
import type { Goal } from '@/lib/abis'
import { UserRepBadge } from './UserRepBadge'

interface GoalLeaderboardProps {
  goal: Goal
  isStepsGoal: boolean
  leaderboardData: { address: string; name?: string; steps: number; stake: number }[]
  leaderboardLoading: boolean
  leaderboardError: string | null
  playerList: { address: string; stake: number }[]
  playerProfiles: Record<string, string>
  fetchLeaderboard: () => void
  dropdownPos: { top: number; left: number; width: number }
  playersDropdownRef: RefObject<HTMLDivElement | null>
}

export function GoalLeaderboard({
  goal,
  isStepsGoal,
  leaderboardData,
  leaderboardLoading,
  leaderboardError,
  playerList,
  playerProfiles,
  fetchLeaderboard,
  dropdownPos,
  playersDropdownRef,
}: GoalLeaderboardProps) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div 
      ref={playersDropdownRef}
      className="fixed bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 shadow-xl"
      style={{ top: dropdownPos.top, left: Math.max(16, dropdownPos.left), width: dropdownPos.width, zIndex: 9999 }}
    >
      {/* Header with refresh for steps goals */}
      {isStepsGoal && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--foreground)]">Leaderboard</span>
          <button 
            onClick={(e) => { e.stopPropagation(); fetchLeaderboard() }}
            disabled={leaderboardLoading}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-[#2EE59D] bg-[#2EE59D]/10 rounded-full hover:bg-[#2EE59D]/20 transition-all disabled:opacity-50"
          >
            <svg className={`w-3 h-3 ${leaderboardLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {leaderboardLoading ? '' : 'Refresh'}
          </button>
        </div>
      )}
      
      {leaderboardError && (
        <p className="text-[10px] text-red-500 mb-2">{leaderboardError}</p>
      )}
      
      {isStepsGoal && leaderboardLoading && leaderboardData.length === 0 ? (
        <div className="py-4 text-center">
          <div className="w-5 h-5 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">Fetching steps...</p>
        </div>
      ) : (
        <div className="space-y-1">
          {(isStepsGoal && leaderboardData.length > 0
            ? leaderboardData
            : playerList.map(p => ({ address: p.address, stake: p.stake, steps: 0, name: playerProfiles[p.address.toLowerCase()] }))
          ).map((p, i) => (
            <div key={i} className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${
              i === 0 && isStepsGoal && leaderboardData.length > 0 ? 'bg-[#2EE59D]/10' : 'hover:bg-[var(--background)]'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {isStepsGoal && leaderboardData.length > 0 && (
                  <span className={`text-xs font-bold flex-shrink-0 ${i === 0 ? 'text-[#2EE59D]' : 'text-[var(--text-secondary)]'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                )}
                <span className="text-[11px] text-[var(--text-secondary)] truncate">
                  {p.name || playerProfiles[p.address.toLowerCase()] || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
                </span>
                <UserRepBadge address={p.address as `0x${string}`} />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isStepsGoal && leaderboardData.length > 0 && (
                  <span className={`text-[11px] font-bold ${p.steps >= goal.targetMiles ? 'text-[#2EE59D]' : 'text-[var(--foreground)]'}`}>
                    {p.steps.toLocaleString()}
                  </span>
                )}
                <span className="text-[11px] font-medium text-[#2EE59D]">${p.stake}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isStepsGoal && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]">
          <p className="text-[9px] text-[var(--text-secondary)] text-center">
            Target: {goal.targetMiles.toLocaleString()} steps
          </p>
        </div>
      )}
    </div>,
    document.body
  )
}
