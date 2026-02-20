'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useReadContracts, useChainId } from 'wagmi'
import { formatUnits } from 'viem'
import { base } from 'wagmi/chains'
import { CONTRACTS } from '@/lib/wagmi'
import { USDC_ABI, GOALSTAKE_ABI, AUTOMATION_ABI, type Participant } from '@/lib/abis'

// Shared hook: fetch hidden goal IDs from Supabase via API
export function useHiddenGoals() {
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch('/api/admin/hidden-goals')
      .then(r => r.json())
      .then(data => setHiddenIds(new Set(data.hiddenIds || [])))
      .catch(() => {})
  }, [])

  return hiddenIds
}

// Get current contracts based on chain
export function useContracts() {
  const chainId = useChainId()
  return CONTRACTS[chainId as keyof typeof CONTRACTS] || CONTRACTS[base.id]
}

// Check if on wrong network
export function useNetworkCheck() {
  const chainId = useChainId()
  return {
    chainId,
    isWrongNetwork: chainId !== base.id,
    targetChainId: base.id,
  }
}

// USDC balance and allowance
export function useUSDC(spender?: `0x${string}`) {
  const { address } = useAccount()
  const contracts = useContracts()

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 }, // Poll every 5s to keep balance fresh
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address && spender ? [address, spender] : undefined,
    query: { enabled: !!address && !!spender },
  })

  const balanceNum = balance ? Number(formatUnits(balance as bigint, 6)) : 0
  const allowanceNum = allowance ? Number(formatUnits(allowance as bigint, 6)) : 0

  return {
    balance: balance as bigint | undefined,
    balanceNum,
    allowance: allowance as bigint | undefined,
    allowanceNum,
    refetchBalance,
    refetchAllowance,
  }
}

// Goal state (phase, entry status)
export function useGoalState(goalId?: number) {
  const contracts = useContracts()

  const { data: isEntryOpen } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_ABI,
    functionName: 'isEntryOpen',
    args: goalId !== undefined ? [BigInt(goalId)] : undefined,
    query: { enabled: goalId !== undefined, refetchInterval: 10000 },
  })

  const { data: goalPhase } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_ABI,
    functionName: 'getGoalPhase',
    args: goalId !== undefined ? [BigInt(goalId)] : undefined,
    query: { enabled: goalId !== undefined, refetchInterval: 10000 },
  })

  return {
    isEntryOpen: isEntryOpen as boolean | undefined,
    entryOpen: isEntryOpen === undefined ? true : isEntryOpen as boolean,
    phase: goalPhase as number | undefined,
  }
}

// User's participation in a goal
export function useParticipant(goalId?: number) {
  const { address } = useAccount()
  const contracts = useContracts()

  const { data: participantData, refetch } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_ABI,
    functionName: 'getParticipant',
    args: goalId !== undefined && address ? [BigInt(goalId), address] : undefined,
    query: { enabled: goalId !== undefined && !!address, refetchInterval: 10000 },
  })

  const participant = participantData as Participant | undefined
  const hasJoined = participant && participant.stake > BigInt(0)
  const userStake = participant ? Number(formatUnits(participant.stake, 6)) : 0

  return {
    participant,
    hasJoined,
    userStake,
    refetch,
  }
}

// Strava token on-chain status
export function useStravaToken() {
  const { address } = useAccount()
  const contracts = useContracts()

  const { data: hasToken, refetch } = useReadContract({
    address: contracts.oracle,
    abi: AUTOMATION_ABI,
    functionName: 'hasToken',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  return {
    hasTokenOnChain: hasToken as boolean | undefined,
    refetch,
  }
}

// On-chain goal details (timestamps)
export function useGoalDetails(goalId?: number) {
  const contracts = useContracts()

  const { data: goalData, isLoading, isPending } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_ABI as any,
    functionName: 'getGoal',
    args: goalId !== undefined ? [BigInt(goalId)] : undefined,
    query: { enabled: goalId !== undefined, refetchInterval: 5000 },
  })

  const goal = goalData as any

  return {
    isLoading: isLoading || (isPending && !goalData),
    startTime: goal ? Number(goal.startTime) : undefined,
    entryDeadline: goal ? Number(goal.entryDeadline) : undefined,
    deadline: goal ? Number(goal.deadline) : undefined,
    totalStaked: goal ? Number(formatUnits(goal.totalStaked, 6)) : 0,
    participantCount: goal ? Number(goal.participantCount) : 0,
    settled: goal?.settled as boolean | undefined,
  }
}

// Platform-wide stats — reads goalCount from contract, fetches all goals
export function usePlatformStats() {
  const contracts = useContracts()
  const hiddenIds = useHiddenGoals()
  const [stats, setStats] = useState({ totalStaked: 0, totalParticipants: 0, activeGoals: 0, totalGoals: 0 })

  const { data: goalCount } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_ABI,
    functionName: 'goalCount',
    query: { refetchInterval: 60000 },
  })

  const count = goalCount ? Number(goalCount as bigint) : 0

  const goalCalls = Array.from({ length: count }, (_, i) => ({
    address: contracts.goalStake as `0x${string}`,
    abi: GOALSTAKE_ABI as any,
    functionName: 'getGoal',
    args: [BigInt(i)],
  }))

  const { data: goalsData } = useReadContracts({
    contracts: goalCalls as any,
    query: { enabled: count > 0, refetchInterval: 60000 },
  })

  useEffect(() => {
    if (!goalsData) return

    let totalStaked = BigInt(0)
    let totalParticipants = 0
    let activeGoals = 0
    let validGoals = 0

    for (let i = 0; i < goalsData.length; i++) {
      const result = goalsData[i]
      if (result.status !== 'success' || !result.result) continue
      if (hiddenIds.has(i)) continue
      const goal = result.result as any
      const target = Number(goal.targetMiles || 0)
      // Skip wei-scaled old goals
      if (target > 1000000) continue
      validGoals++
      totalStaked += goal.totalStaked
      totalParticipants += Number(goal.participantCount)
      if (goal.active && !goal.settled) activeGoals++
    }

    setStats({
      totalStaked: Math.floor(Number(formatUnits(totalStaked, 6))),
      totalParticipants,
      activeGoals,
      totalGoals: validGoals,
    })
  }, [goalsData, hiddenIds])

  return stats
}
