'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useReadContracts, useChainId } from 'wagmi'
import { formatUnits } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { CONTRACTS } from '@/lib/wagmi'
import { USDC_ABI, GOALSTAKE_ABI, AUTOMATION_ABI, type Participant } from '@/lib/abis'

// Get current contracts based on chain
export function useContracts() {
  const chainId = useChainId()
  return CONTRACTS[chainId as keyof typeof CONTRACTS] || CONTRACTS[baseSepolia.id]
}

// Check if on wrong network
export function useNetworkCheck() {
  const chainId = useChainId()
  return {
    chainId,
    isWrongNetwork: chainId !== baseSepolia.id,
    targetChainId: baseSepolia.id,
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
    query: { enabled: !!address },
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
    query: { enabled: goalId !== undefined },
  })

  const { data: goalPhase } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_ABI,
    functionName: 'getGoalPhase',
    args: goalId !== undefined ? [BigInt(goalId)] : undefined,
    query: { enabled: goalId !== undefined },
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
    query: { enabled: goalId !== undefined && !!address },
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

// Platform-wide stats (total staked, participants, active goals)
export function usePlatformStats() {
  const contracts = useContracts()
  const [stats, setStats] = useState({ totalStaked: 0, totalParticipants: 0, activeGoals: 0 })

  const { data: goalCount } = useReadContract({
    address: contracts.goalStake,
    abi: GOALSTAKE_ABI,
    functionName: 'goalCount',
    query: { refetchInterval: 30000 },
  })

  const count = goalCount ? Number(goalCount) : 0

  // Build array of getGoal calls
  const goalCalls = Array.from({ length: count }, (_, i) => ({
    address: contracts.goalStake as `0x${string}`,
    abi: GOALSTAKE_ABI,
    functionName: 'getGoal' as const,
    args: [BigInt(i)],
  }))

  const { data: goalsData } = useReadContracts({
    contracts: goalCalls,
    query: { enabled: count > 0, refetchInterval: 30000 },
  })

  useEffect(() => {
    if (!goalsData) return

    let totalStaked = BigInt(0)
    let totalParticipants = 0
    let activeGoals = 0

    for (const result of goalsData) {
      if (result.status !== 'success' || !result.result) continue
      const goal = result.result as any
      if (goal.active) {
        activeGoals++
        totalStaked += goal.totalStaked
        totalParticipants += Number(goal.participantCount)
      }
    }

    setStats({
      totalStaked: Number(formatUnits(totalStaked, 6)),
      totalParticipants,
      activeGoals,
    })
  }, [goalsData])

  return stats
}
