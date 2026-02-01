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
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
        <p className="text-gray-500">Connect wallet to view challenges</p>
      </div>
    )
  }

  if (isLoadingIds) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
        <div className="w-6 h-6 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    )
  }

  if (!challengeIds || challengeIds.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <p className="text-gray-500">No challenges yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first challenge to get started</p>
        </div>
        
        {loserPool !== undefined && loserPool > BigInt(0) && (
          <div className="p-4 rounded-xl bg-[#2EE59D]/5 border border-[#2EE59D]/20">
            <p className="text-xs text-gray-500 text-center">Current Prize Pool</p>
            <p className="text-2xl font-semibold text-[#2EE59D] text-center">
              ${formatUnits(loserPool, 6)}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Loser Pool Banner */}
      {loserPool !== undefined && loserPool > BigInt(0) && (
        <div className="bg-gray-50 border border-[#2EE59D]/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Prize Pool</span>
            <span className="text-lg font-semibold text-[#2EE59D]">${formatUnits(loserPool, 6)}</span>
          </div>
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
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-1/3 mb-3"></div>
        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
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
  const deadline = Number(challenge.deadline) * 1000
  
  const progress = targetMiles > 0 ? (actualMiles / targetMiles) * 100 : 0
  const now = Date.now()
  const isActive = !challenge.settled && deadline > now
  const isPastDeadline = deadline <= now && !challenge.settled
  const daysLeft = Math.ceil((deadline - now) / (24 * 60 * 60 * 1000))

  return (
    <div className={`bg-gray-50 border rounded-xl p-5 ${
      challenge.settled 
        ? challenge.success 
          ? 'border-[#2EE59D]/50' 
          : 'border-red-500/50'
        : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">#{challenge.id.toString()}</p>
          <p className="font-semibold">{targetMiles.toFixed(0)} miles</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">${stakeAmount.toFixed(0)}</p>
          <p className="text-xs text-gray-500">staked</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Progress</span>
          <span>{actualMiles.toFixed(1)} / {targetMiles.toFixed(0)} mi</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              progress >= 100 ? 'bg-[#2EE59D]' : 'bg-[#2EE59D]/50'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        {challenge.settled ? (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            challenge.success 
              ? 'bg-[#2EE59D]/10 text-[#2EE59D]'
              : 'bg-red-500/10 text-red-400'
          }`}>
            {challenge.success ? '✓ Won' : '✗ Lost'}
          </span>
        ) : isActive ? (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#2EE59D]/10 text-[#2EE59D]">
            {daysLeft}d left
          </span>
        ) : isPastDeadline ? (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
            Pending
          </span>
        ) : null}

        <span className="text-xs text-gray-500">
          {new Date(deadline).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}
