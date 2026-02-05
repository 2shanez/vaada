'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { baseSepolia } from 'wagmi/chains'
import Link from 'next/link'

// V2 ABI
const GOALSTAKE_V2_ABI = [
  {
    name: 'getUserGoals',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    name: 'getGoal',
    type: 'function',
    inputs: [{ name: 'goalId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'name', type: 'string' },
        { name: 'targetMiles', type: 'uint256' },
        { name: 'minStake', type: 'uint256' },
        { name: 'maxStake', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'active', type: 'bool' },
        { name: 'settled', type: 'bool' },
        { name: 'totalStaked', type: 'uint256' },
        { name: 'participantCount', type: 'uint256' },
      ],
    }],
    stateMutability: 'view',
  },
  {
    name: 'getParticipant',
    type: 'function',
    inputs: [
      { name: 'goalId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'user', type: 'address' },
        { name: 'stake', type: 'uint256' },
        { name: 'actualMiles', type: 'uint256' },
        { name: 'verified', type: 'bool' },
        { name: 'succeeded', type: 'bool' },
        { name: 'claimed', type: 'bool' },
      ],
    }],
    stateMutability: 'view',
  },
  {
    name: 'calculatePayout',
    type: 'function',
    inputs: [
      { name: 'goalId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'claimPayout',
    type: 'function',
    inputs: [{ name: 'goalId', type: 'uint256' }],
    outputs: [],
  },
] as const

interface Goal {
  id: bigint
  name: string
  targetMiles: bigint
  minStake: bigint
  maxStake: bigint
  startTime: bigint
  deadline: bigint
  active: boolean
  settled: boolean
  totalStaked: bigint
  participantCount: bigint
}

interface Participant {
  user: string
  stake: bigint
  actualMiles: bigint
  verified: boolean
  succeeded: boolean
  claimed: boolean
}

export function MyGoals() {
  const { address } = useAccount()
  const chainId = useChainId()
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS] || CONTRACTS[baseSepolia.id]

  const { data: goalIds, isLoading } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_V2_ABI,
    functionName: 'getUserGoals',
    args: address ? [address] : undefined,
  })

  if (!address) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">Connect wallet to view your promises</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
        <div className="w-6 h-6 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    )
  }

  if (!goalIds || !Array.isArray(goalIds) || goalIds.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">No active promises</h3>
          <p className="text-[var(--text-secondary)] mb-6">
            Make a promise to start putting your money where your mouth is.
          </p>
          <Link 
            href="/#promises"
            className="inline-flex px-6 py-3 bg-[#2EE59D] text-white font-semibold rounded-xl hover:bg-[#26c987] transition-all"
          >
            Browse Promises
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {(goalIds as bigint[]).map((goalId) => (
        <GoalCard key={goalId.toString()} goalId={goalId} contracts={contracts} userAddress={address} />
      ))}
    </div>
  )
}

function GoalCard({ 
  goalId, 
  contracts,
  userAddress,
}: { 
  goalId: bigint
  contracts: typeof CONTRACTS[typeof baseSepolia.id]
  userAddress: `0x${string}`
}) {
  const { data: goal, isLoading: isLoadingGoal } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_V2_ABI,
    functionName: 'getGoal',
    args: [goalId],
  })

  const { data: participant, isLoading: isLoadingParticipant, refetch: refetchParticipant } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_V2_ABI,
    functionName: 'getParticipant',
    args: [goalId, userAddress],
  })

  const { data: expectedPayout } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_V2_ABI,
    functionName: 'calculatePayout',
    args: [goalId, userAddress],
  })

  const { writeContract, data: claimHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: claimHash })

  // Refetch after successful claim
  if (isSuccess) {
    refetchParticipant()
  }

  if (isLoadingGoal || isLoadingParticipant) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    )
  }

  if (!goal || !participant) return null

  // Type assertions for contract return data
  const g = goal as Goal
  const p = participant as Participant

  const targetMiles = Number(formatUnits(g.targetMiles, 18))
  const actualMiles = Number(formatUnits(p.actualMiles, 18))
  const stake = Number(formatUnits(p.stake, 6))
  const payout = expectedPayout ? Number(formatUnits(expectedPayout as bigint, 6)) : 0
  const deadline = Number(g.deadline) * 1000
  const now = Date.now()
  
  const progress = targetMiles > 0 ? (actualMiles / targetMiles) * 100 : 0
  const isActive = !g.settled && deadline > now
  const isPastDeadline = deadline <= now && !g.settled
  const timeLeft = deadline - now
  const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000))
  const hoursLeft = Math.ceil(timeLeft / (60 * 60 * 1000))

  const canClaim = g.settled && p.succeeded && !p.claimed

  const handleClaim = () => {
    writeContract({
      address: contracts.goalStake,
      abi: GOALSTAKE_V2_ABI,
      functionName: 'claimPayout',
      args: [goalId],
    })
  }

  return (
    <div className={`bg-[var(--surface)] border rounded-xl p-6 ${
      g.settled 
        ? p.succeeded 
          ? 'border-[#2EE59D]/50' 
          : 'border-red-500/50'
        : 'border-[var(--border)]'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="font-semibold text-lg">{g.name}</p>
          <p className="text-sm text-[var(--text-secondary)]">{targetMiles} miles target</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-lg">${stake.toFixed(2)}</p>
          <p className="text-xs text-[var(--text-secondary)]">staked</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-[var(--text-secondary)] mb-2">
          <span>Your Progress</span>
          <span>{actualMiles.toFixed(1)} / {targetMiles.toFixed(0)} mi ({progress.toFixed(0)}%)</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              progress >= 100 ? 'bg-[#2EE59D]' : 'bg-[#2EE59D]/60'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center justify-between">
        {g.settled ? (
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              p.succeeded 
                ? 'bg-[#2EE59D]/10 text-[#2EE59D]'
                : 'bg-red-500/10 text-red-400'
            }`}>
              {p.succeeded ? '✓ Success' : '✗ Missed'}
            </span>
            {p.succeeded && (
              <span className="text-sm text-[var(--text-secondary)]">
                Payout: <span className="text-[#2EE59D] font-semibold">${payout.toFixed(2)}</span>
              </span>
            )}
          </div>
        ) : isActive ? (
          <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#2EE59D]/10 text-[#2EE59D]">
            {daysLeft > 1 ? `${daysLeft} days left` : `${hoursLeft} hours left`}
          </span>
        ) : isPastDeadline ? (
          <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-500/10 text-yellow-500">
            ⏳ Awaiting verification
          </span>
        ) : null}

        {canClaim && !p.claimed && (
          <button
            onClick={handleClaim}
            disabled={isPending || isConfirming}
            className="px-4 py-2 bg-[#2EE59D] text-white font-semibold rounded-lg hover:bg-[#26c987] transition-all disabled:opacity-50"
          >
            {isPending ? 'Confirm...' : isConfirming ? 'Claiming...' : `Claim $${payout.toFixed(2)}`}
          </button>
        )}

        {p.claimed && (
          <span className="text-sm text-[var(--text-secondary)]">✓ Claimed</span>
        )}
      </div>

      {/* Goal Stats */}
      <div className="mt-4 pt-4 border-t border-[var(--border)] flex gap-6 text-sm">
        <div>
          <span className="text-[var(--text-secondary)]">Pool: </span>
          <span className="font-medium">${Number(formatUnits(g.totalStaked, 6)).toFixed(0)}</span>
        </div>
        <div>
          <span className="text-[var(--text-secondary)]">Participants: </span>
          <span className="font-medium">{g.participantCount.toString()}</span>
        </div>
        <div>
          <span className="text-[var(--text-secondary)]">Deadline: </span>
          <span className="font-medium">{new Date(deadline).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}
