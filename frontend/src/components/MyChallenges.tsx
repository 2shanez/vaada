'use client'

import { useAccount, useReadContract, useChainId } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { baseSepolia } from 'wagmi/chains'

// ABI for reading challenges
const GOALSTAKE_ABI = [
  {
    name: 'getUserChallenges',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    name: 'getChallenge',
    type: 'function',
    inputs: [{ name: 'challengeId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'user', type: 'address' },
        { name: 'targetMiles', type: 'uint256' },
        { name: 'stakeAmount', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'actualMiles', type: 'uint256' },
        { name: 'settled', type: 'bool' },
        { name: 'success', type: 'bool' },
      ],
    }],
    stateMutability: 'view',
  },
  {
    name: 'getLoserPool',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

interface Challenge {
  id: bigint
  user: string
  targetMiles: bigint
  stakeAmount: bigint
  deadline: bigint
  actualMiles: bigint
  settled: boolean
  success: boolean
}

export function MyChallenges() {
  const { address } = useAccount()
  const chainId = useChainId()
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS] || CONTRACTS[baseSepolia.id]

  // Get user's challenge IDs
  const { data: challengeIds, isLoading: isLoadingIds } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_ABI,
    functionName: 'getUserChallenges',
    args: address ? [address] : undefined,
  })

  // Get loser pool
  const { data: loserPool } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_ABI,
    functionName: 'getLoserPool',
  })

  if (!address) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
        <p className="text-gray-400">Connect wallet to see challenges</p>
      </div>
    )
  }

  if (isLoadingIds) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
        <p className="text-gray-400">Loading challenges...</p>
      </div>
    )
  }

  if (!challengeIds || challengeIds.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
        <p className="text-gray-400">No challenges yet</p>
        <p className="text-sm text-gray-500 mt-2">Create your first challenge to get started</p>
        {loserPool !== undefined && loserPool > 0n && (
          <p className="text-sm text-emerald-400 mt-4">
            🏆 Loser pool: ${formatUnits(loserPool, 6)} USDC
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Loser Pool Banner */}
      {loserPool !== undefined && loserPool > 0n && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">Current Loser Pool</p>
          <p className="text-2xl font-bold text-emerald-400">
            ${formatUnits(loserPool, 6)} USDC
          </p>
          <p className="text-xs text-gray-500 mt-1">Winners get 10% of this as bonus</p>
        </div>
      )}

      {/* Challenge Cards */}
      {challengeIds.map((id) => (
        <ChallengeCardWrapper key={id.toString()} challengeId={id} contracts={contracts} />
      ))}
    </div>
  )
}

function ChallengeCardWrapper({ 
  challengeId, 
  contracts 
}: { 
  challengeId: bigint
  contracts: typeof CONTRACTS[typeof baseSepolia.id]
}) {
  const { data: challenge, isLoading } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_ABI,
    functionName: 'getChallenge',
    args: [challengeId],
  })

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-800 rounded w-2/3" />
      </div>
    )
  }

  if (!challenge) return null

  return <ChallengeCard challenge={challenge} />
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const targetMiles = Number(formatUnits(challenge.targetMiles, 18))
  const actualMiles = Number(formatUnits(challenge.actualMiles, 18))
  const stakeAmount = Number(formatUnits(challenge.stakeAmount, 6))
  const deadline = Number(challenge.deadline) * 1000 // Convert to ms
  
  const progress = targetMiles > 0 ? (actualMiles / targetMiles) * 100 : 0
  const now = Date.now()
  const isActive = !challenge.settled && deadline > now
  const isPastDeadline = deadline <= now && !challenge.settled
  const daysLeft = Math.ceil((deadline - now) / (24 * 60 * 60 * 1000))

  return (
    <div className={`bg-gray-900 rounded-xl p-6 border ${
      challenge.settled 
        ? challenge.success 
          ? 'border-emerald-500/50' 
          : 'border-red-500/50'
        : 'border-gray-800'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-sm text-gray-400">Challenge #{challenge.id.toString()}</span>
          <h4 className="font-bold text-lg">
            Run {targetMiles.toFixed(0)} miles
          </h4>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold">${stakeAmount.toFixed(0)}</span>
          <p className="text-sm text-gray-400">at stake</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progress</span>
          <span>{actualMiles.toFixed(1)} / {targetMiles.toFixed(0)} miles</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Deadline */}
      <div className="text-sm text-gray-400 mb-4">
        Deadline: {new Date(deadline).toLocaleDateString()} at {new Date(deadline).toLocaleTimeString()}
      </div>

      {/* Status */}
      <div className="flex justify-between items-center">
        {challenge.settled ? (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            challenge.success 
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {challenge.success ? '✓ Completed - You Won!' : '✗ Failed - Stake Lost'}
          </span>
        ) : isActive ? (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">
            ⏱ {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
          </span>
        ) : isPastDeadline ? (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">
            ⏳ Pending verification
          </span>
        ) : null}

        {challenge.settled && challenge.success && (
          <span className="text-emerald-400 font-medium">
            +${stakeAmount.toFixed(0)} returned
          </span>
        )}
      </div>
    </div>
  )
}
