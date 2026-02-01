'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi'
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
    name: 'createChallenge',
    type: 'function',
    inputs: [
      { name: 'targetMiles', type: 'uint256' },
      { name: 'stakeAmount', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

export interface Goal {
  id: string
  title: string
  description: string
  emoji: string
  targetMiles: number
  durationDays: number
  minStake: number
  maxStake: number
  participants: number
  totalStaked: number
  category: 'running' | 'cycling' | 'walking'
}

interface GoalCardProps {
  goal: Goal
  onJoined?: () => void
}

export function GoalCard({ goal, onJoined }: GoalCardProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS] || CONTRACTS[baseSepolia.id]
  
  const [stakeAmount, setStakeAmount] = useState(goal.minStake.toString())
  const [isJoining, setIsJoining] = useState(false)
  const [step, setStep] = useState<'idle' | 'approving' | 'joining' | 'done'>('idle')
  const stravaConnected = isStravaConnected()

  // Read USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, contracts.goalStake] : undefined,
  })

  // Read USDC balance
  const { data: balance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
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
    if (!stravaConnected) {
      handleStravaConnect()
      return
    }

    if (!hasBalance) {
      alert(`Insufficient USDC balance. You need ${stakeAmount} USDC.`)
      return
    }

    setIsJoining(true)

    if (!hasAllowance) {
      setStep('approving')
      writeApprove({
        address: contracts.usdc,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [contracts.goalStake, stakeAmountWei],
      })
    } else {
      setStep('joining')
      writeJoin({
        address: contracts.goalStake,
        abi: GOALSTAKE_ABI,
        functionName: 'createChallenge',
        args: [
          parseUnits(goal.targetMiles.toString(), 18),
          stakeAmountWei,
          BigInt(goal.durationDays * 24 * 60 * 60),
        ],
      })
    }
  }

  // Handle approval success
  if (isApproveSuccess && step === 'approving') {
    refetchAllowance()
    setStep('joining')
    writeJoin({
      address: contracts.goalStake,
      abi: GOALSTAKE_ABI,
      functionName: 'createChallenge',
      args: [
        parseUnits(goal.targetMiles.toString(), 18),
        stakeAmountWei,
        BigInt(goal.durationDays * 24 * 60 * 60),
      ],
    })
  }

  // Handle join success
  if (isJoinSuccess && step === 'joining') {
    setStep('done')
    setIsJoining(false)
    onJoined?.()
  }

  const isLoading = isApprovePending || isApproveConfirming || isJoinPending || isJoinConfirming

  if (step === 'done') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-1">You're in! 🎉</h3>
          <p className="text-gray-500 text-sm">Goal joined. Time to get moving!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:border-[#2EE59D]/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{goal.emoji}</span>
          <div>
            <h3 className="font-semibold text-lg">{goal.title}</h3>
            <p className="text-sm text-gray-500">{goal.description}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-y border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold">{goal.targetMiles}</p>
          <p className="text-xs text-gray-500">miles</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{goal.durationDays}</p>
          <p className="text-xs text-gray-500">days</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#2EE59D]">{goal.participants}</p>
          <p className="text-xs text-gray-500">joined</p>
        </div>
      </div>

      {/* Stake Input */}
      {isConnected && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Your stake</span>
            <span className="text-gray-500">Balance: {balanceNum.toFixed(2)} USDC</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              min={goal.minStake}
              max={goal.maxStake}
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none text-lg font-semibold"
            />
            <span className="text-gray-400 text-sm">USDC</span>
          </div>
          <input
            type="range"
            min={goal.minStake}
            max={goal.maxStake}
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            disabled={isLoading}
            className="w-full h-1 mt-2 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2EE59D] [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      )}

      {/* Strava Status */}
      {isConnected && !stravaConnected && (
        <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
          <p className="text-sm text-orange-700">Connect Strava to join this goal</p>
        </div>
      )}

      {/* Progress */}
      {isLoading && (
        <div className="mb-4 p-3 rounded-lg bg-gray-100">
          <p className="text-sm text-gray-600 text-center">
            {isApprovePending ? 'Confirm approval in wallet...' :
             isApproveConfirming ? 'Approving USDC...' :
             isJoinPending ? 'Confirm in wallet...' :
             isJoinConfirming ? 'Joining goal...' : ''}
          </p>
        </div>
      )}

      {/* Join Button */}
      <button
        onClick={handleJoin}
        disabled={isLoading || (isConnected && !hasBalance)}
        className={`w-full py-3 rounded-xl font-semibold transition-all ${
          isLoading || (isConnected && !hasBalance)
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-[#2EE59D] text-black hover:bg-[#26c987]'
        }`}
      >
        {!isConnected 
          ? 'Connect Wallet to Join'
          : !stravaConnected
            ? 'Connect Strava & Join'
            : !hasBalance
              ? 'Insufficient USDC'
              : isLoading
                ? 'Processing...'
                : `Stake $${stakeAmount} & Join`
        }
      </button>

      {/* Pool Info */}
      <p className="text-center text-xs text-gray-400 mt-3">
        ${goal.totalStaked.toLocaleString()} total staked by {goal.participants} people
      </p>
    </div>
  )
}
