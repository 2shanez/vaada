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
    ? `${Math.round(goal.durationDays * 24 * 60)}m`
    : goal.durationDays === 1 
      ? '24h' 
      : `${goal.durationDays}d`

  // Category colors
  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    Test: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    Daily: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    Weekly: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    Monthly: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  }
  const catStyle = categoryColors[goal.category] || categoryColors.Daily

  if (step === 'done') {
    return (
      <div className="bg-gradient-to-br from-[#2EE59D]/5 to-[#2EE59D]/10 border border-[#2EE59D]/30 rounded-xl p-4">
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-[#2EE59D]/20 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <svg className="w-6 h-6 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-bold text-lg mb-1">You're in! 🎉</p>
          <p className="text-sm text-gray-500">Goal starts now. Time to move!</p>
          <div className="mt-4 pt-4 border-t border-[#2EE59D]/20">
            <p className="text-xs text-gray-400">Staked ${stakeAmount} USDC</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`group bg-white border rounded-xl transition-all duration-200 cursor-pointer
        ${expanded 
          ? 'border-[#2EE59D] shadow-lg shadow-[#2EE59D]/10 scale-[1.02]' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5'
        }`}
    >
      {/* Card Content */}
      <div className="p-4">
        {/* Header Row: Category + Duration + Emoji */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${catStyle.bg} ${catStyle.text}`}>
              {goal.category.toUpperCase()}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">{durationText}</span>
          </div>
          <span className="text-2xl group-hover:scale-110 transition-transform">{goal.emoji}</span>
        </div>

        {/* Title + Description */}
        <h3 className="font-bold text-sm text-gray-900 mb-1 group-hover:text-[#2EE59D] transition-colors">
          {goal.title}
        </h3>
        <p className="text-xs text-gray-500 mb-4 line-clamp-2">{goal.description}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-lg font-bold text-gray-900">{goal.targetMiles}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">miles</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-lg font-bold text-[#2EE59D]">${goal.minStake}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">min stake</p>
          </div>
        </div>

        {/* Pool Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>{goal.participants === 0 ? 'Be the first to join' : `${goal.participants} joined`}</span>
            <span>${goal.totalStaked} pooled</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#2EE59D] to-[#26c987] rounded-full transition-all duration-500"
              style={{ width: `${Math.min((goal.participants / 10) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Join Button */}
        {!expanded && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              isConnected ? setExpanded(true) : login()
            }}
            className="w-full py-2.5 bg-[#2EE59D] text-black text-sm font-bold rounded-lg 
              hover:bg-[#26c987] active:scale-[0.98] transition-all duration-150
              shadow-sm hover:shadow-md"
          >
            Join Goal · ${goal.minStake}+
          </button>
        )}
      </div>

      {/* Expanded Stake Panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 animate-in slide-in-from-top-2 duration-200">
          {/* Quick Stakes */}
          <div className="flex gap-2 mb-3">
            {[goal.minStake, Math.round((goal.minStake + goal.maxStake) / 2), goal.maxStake].map((amount) => (
              <button
                key={amount}
                onClick={() => setStakeAmount(amount.toString())}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  stakeAmount === amount.toString()
                    ? 'bg-[#2EE59D]/10 border-[#2EE59D] text-[#2EE59D]'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                ${amount}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="mb-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-[#2EE59D] focus-within:ring-1 focus-within:ring-[#2EE59D]/20 transition-all">
              <span className="text-gray-400 text-sm font-medium">$</span>
              <input
                type="number"
                min={goal.minStake}
                max={goal.maxStake}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-transparent outline-none text-sm font-bold text-gray-900"
                placeholder={goal.minStake.toString()}
              />
              <span className="text-[10px] text-gray-400 font-medium">USDC</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
              <span>Min ${goal.minStake}</span>
              <span>Balance: {balanceNum.toFixed(2)}</span>
              <span>Max ${goal.maxStake}</span>
            </div>
          </div>

          {/* Strava Warning */}
          {isConnected && !stravaConnected && (
            <div className="mb-3 p-2.5 rounded-lg bg-orange-50 border border-orange-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-orange-700">Connect Strava to verify your runs</p>
            </div>
          )}

          {/* Progress Indicator */}
          {isLoading && (
            <div className="mb-3 p-3 rounded-lg bg-[#2EE59D]/5 border border-[#2EE59D]/20">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[#2EE59D] font-medium">
                  {isApprovePending ? 'Confirm in wallet...' :
                   isApproveConfirming ? 'Approving USDC...' :
                   isJoinPending ? 'Confirm transaction...' :
                   isJoinConfirming ? 'Joining goal...' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setExpanded(false)}
              className="px-4 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={isLoading || (isConnected && !hasBalance)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-150 ${
                isLoading || (isConnected && !hasBalance)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#2EE59D] text-black hover:bg-[#26c987] active:scale-[0.98] shadow-sm hover:shadow-md'
              }`}
            >
              {!stravaConnected
                ? 'Connect Strava'
                : !hasBalance
                  ? 'Insufficient USDC'
                  : isLoading
                    ? 'Processing...'
                    : `Stake $${stakeAmount} →`
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
