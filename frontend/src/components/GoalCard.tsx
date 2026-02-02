'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { baseSepolia } from 'wagmi/chains'
import { isStravaConnected, getStravaAuthUrl } from '@/lib/strava'

const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

const GOALSTAKE_ABI = [
  {
    name: 'joinGoal',
    type: 'function',
    inputs: [
      { name: 'goalId', type: 'uint256' },
      { name: 'stake', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

export interface Goal {
  id: string
  onChainId?: number
  title: string
  description: string
  emoji: string
  targetMiles: number
  durationDays: number
  minStake: number
  maxStake: number
  participants: number
  totalStaked: number
  category: string
}

interface GoalCardProps {
  goal: Goal
  onJoined?: () => void
}

export function GoalCard({ goal, onJoined }: GoalCardProps) {
  const { address, isConnected } = useAccount()
  const { login } = usePrivy()
  const chainId = useChainId()
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS] || CONTRACTS[baseSepolia.id]
  
  const [expanded, setExpanded] = useState(false)
  const [stakeAmount, setStakeAmount] = useState(goal.minStake.toString())
  const [step, setStep] = useState<'idle' | 'approving' | 'joining' | 'done'>('idle')
  const stravaConnected = isStravaConnected()

  // Read USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [address!, contracts.goalStake],
    query: { enabled: !!address },
  })

  // Read USDC balance
  const { data: balance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  })

  // Approve USDC
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  // Join Challenge
  const { writeContract: writeJoin, data: joinHash, isPending: isJoinPending } = useWriteContract()
  const { isLoading: isJoinConfirming, isSuccess: isJoinSuccess } = useWaitForTransactionReceipt({ hash: joinHash })

  const stakeAmountWei = parseUnits(stakeAmount || '0', 6)
  const hasAllowance = allowance != null && (allowance as bigint) >= stakeAmountWei
  const hasBalance = balance != null && (balance as bigint) >= stakeAmountWei
  const balanceNum = balance ? Number(formatUnits(balance as bigint, 6)) : 0

  const handleStravaConnect = () => {
    const callbackUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/strava/callback`
      : 'http://localhost:3000/api/strava/callback'
    window.location.href = getStravaAuthUrl(callbackUrl)
  }

  const handleJoin = async () => {
    if (!isConnected) {
      login()
      return
    }

    if (!stravaConnected) {
      handleStravaConnect()
      return
    }

    if (!hasBalance) {
      alert(`Insufficient USDC balance. You need ${stakeAmount} USDC.`)
      return
    }

    if (!hasAllowance) {
      setStep('approving')
      writeApprove({
        address: contracts.usdc,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [contracts.goalStake, stakeAmountWei],
      })
    } else {
      if (goal.onChainId === undefined) {
        alert('This goal is not yet available on-chain.')
        return
      }
      setStep('joining')
      writeJoin({
        address: contracts.goalStake,
        abi: GOALSTAKE_ABI,
        functionName: 'joinGoal',
        args: [BigInt(goal.onChainId), stakeAmountWei],
      })
    }
  }

  // Handle approval success
  if (isApproveSuccess && step === 'approving' && goal.onChainId !== undefined) {
    refetchAllowance()
    setStep('joining')
    writeJoin({
      address: contracts.goalStake,
      abi: GOALSTAKE_ABI,
      functionName: 'joinGoal',
      args: [BigInt(goal.onChainId), stakeAmountWei],
    })
  }

  // Handle join success
  if (isJoinSuccess && step === 'joining') {
    setStep('done')
    onJoined?.()
  }

  const isLoading = isApprovePending || isApproveConfirming || isJoinPending || isJoinConfirming

  // Duration display
  const durationText = goal.durationDays < 1 
    ? `${Math.round(goal.durationDays * 24 * 60)} min`
    : goal.durationDays === 1 
      ? '1 day' 
      : `${goal.durationDays} days`

  if (step === 'done') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#2EE59D]/5" />
        <div className="relative text-center py-4">
          <div className="w-10 h-10 rounded-full bg-[#2EE59D]/20 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-sm">You're in! 🎉</p>
          <p className="text-xs text-gray-500 mt-1">Time to get moving</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`bg-white border rounded-xl transition-all hover:border-[#2EE59D]/50 hover:shadow-sm ${
        expanded ? 'border-[#2EE59D]/50 shadow-sm' : 'border-gray-200'
      }`}
    >
      {/* Compact View */}
      <div className="p-4">
        {/* Category Badge + Icon */}
        <div className="flex items-start justify-between mb-3">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            goal.category === 'Test' 
              ? 'bg-orange-100 text-orange-600' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {goal.category.toUpperCase()}
          </span>
          <span className="text-xl">{goal.emoji}</span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm mb-1">{goal.title}</h3>
        <p className="text-xs text-gray-500 mb-3">{goal.description}</p>

        {/* Compact Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {durationText}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {goal.targetMiles} mi
          </span>
        </div>

        {/* Activity Row */}
        <div className="text-xs text-gray-400 mb-3">
          {goal.participants} joined · ${goal.totalStaked} staked
        </div>

        {/* Join Button or Expand */}
        {!expanded ? (
          <button
            onClick={() => isConnected ? setExpanded(true) : login()}
            className="w-full py-2 bg-[#2EE59D] text-black text-sm font-semibold rounded-lg hover:bg-[#26c987] transition-colors"
          >
            Join · ${goal.minStake}+
          </button>
        ) : null}
      </div>

      {/* Expanded Stake Input */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          {/* Stake Amount */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Stake amount</span>
              <span>Balance: {balanceNum.toFixed(2)} USDC</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                min={goal.minStake}
                max={goal.maxStake}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-transparent outline-none text-sm font-semibold"
              />
              <span className="text-gray-400 text-xs">USDC</span>
            </div>
            <input
              type="range"
              min={goal.minStake}
              max={goal.maxStake}
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              disabled={isLoading}
              className="w-full h-1 mt-2 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2EE59D]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>${goal.minStake}</span>
              <span>${goal.maxStake}</span>
            </div>
          </div>

          {/* Strava Warning */}
          {!stravaConnected && (
            <div className="mb-3 p-2 rounded-lg bg-orange-50 border border-orange-100">
              <p className="text-xs text-orange-600">Connect Strava to verify your runs</p>
            </div>
          )}

          {/* Progress */}
          {isLoading && (
            <div className="mb-3 p-2 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                {isApprovePending ? 'Confirm approval...' :
                 isApproveConfirming ? 'Approving USDC...' :
                 isJoinPending ? 'Confirm in wallet...' :
                 isJoinConfirming ? 'Joining...' : ''}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setExpanded(false)}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={isLoading || !hasBalance}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                isLoading || !hasBalance
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#2EE59D] text-black hover:bg-[#26c987]'
              }`}
            >
              {!stravaConnected
                ? 'Connect Strava'
                : !hasBalance
                  ? 'Insufficient USDC'
                  : isLoading
                    ? 'Processing...'
                    : `Stake $${stakeAmount}`
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
