'use client'

import { useReadContract, useReadContracts } from 'wagmi'
import { VAADA_RECEIPTS_ABI, NEW_USER_CHALLENGE_ABI, GOALSTAKE_ABI } from '@/lib/abis'
import { CONTRACTS } from '@/lib/wagmi'
import { base } from 'wagmi/chains'

interface UserRepBadgeProps {
  address: `0x${string}`
}

export function UserRepBadge({ address }: UserRepBadgeProps) {
  const contracts = CONTRACTS[base.id]

  // Receipts reputation
  const { data: reputation } = useReadContract({
    address: contracts.vaadaReceipts,
    abi: VAADA_RECEIPTS_ABI,
    functionName: 'getReputation',
    args: [address],
  })

  // NewUserChallenge
  const { data: hasJoinedChallenge } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'hasJoinedChallenge',
    args: [address],
  })

  const { data: challengeData } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'getChallenge',
    args: [address],
    query: { enabled: !!hasJoinedChallenge },
  })

  // VaadaV3 goals 9+
  const { data: goalParticipants } = useReadContracts({
    contracts: Array.from({ length: 20 }, (_, i) => ({
      address: contracts.goalStake,
      abi: GOALSTAKE_ABI as any,
      functionName: 'getParticipant',
      args: [BigInt(i + 9), address],
    })),
  })

  // Calculate combined stats
  const [repAttempted, repCompleted, , , , repStreak] = reputation || [BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]

  let v3Attempted = 0
  let v3Completed = 0
  if (goalParticipants) {
    for (const gp of goalParticipants) {
      if (gp.status === 'success' && gp.result) {
        const p = gp.result as any
        if (p.user && p.user !== '0x0000000000000000000000000000000000000000' && Number(p.stake) > 0) {
          v3Attempted++
          if (p.verified && p.succeeded) v3Completed++
        }
      }
    }
  }

  let nucAttempted = 0
  let nucCompleted = 0
  if (hasJoinedChallenge && challengeData) {
    const [, , settled, won] = challengeData as [bigint, bigint, boolean, boolean, boolean]
    nucAttempted = 1
    if (settled && won) nucCompleted = 1
  }

  const totalAttempted = Number(repAttempted) + (Number(repAttempted) === 0 ? v3Attempted + nucAttempted : 0)
  const totalCompleted = Number(repCompleted) + (Number(repCompleted) === 0 ? v3Completed + nucCompleted : 0)
  const broken = totalAttempted - totalCompleted
  const streak = Number(repStreak)
  const winRate = totalAttempted > 0 ? Math.round((totalCompleted / totalAttempted) * 100) : 0

  if (totalAttempted === 0) return null

  return (
    <div className="flex items-center gap-1.5 text-[9px] font-medium flex-shrink-0">
      <span title="Promises">{totalAttempted}</span>
      <span className="text-[#2EE59D]" title="Kept">{totalCompleted}✓</span>
      {broken > 0 && <span className="text-red-400" title="Broken">{broken}✗</span>}
      {streak > 0 && <span className="text-orange-400" title="Streak">{streak}🔥</span>}
      <span className="text-[var(--text-secondary)]" title="Win Rate">{winRate}%</span>
    </div>
  )
}
