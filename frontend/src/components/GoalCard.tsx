'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId, useSwitchChain } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { baseSepolia } from 'wagmi/chains'
import { isStravaConnected, getStravaAuthUrl } from '@/lib/strava'

// Automation contract ABI for token storage
const AUTOMATION_ABI = [
  {
    name: 'storeToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'token', type: 'string' }],
    outputs: [],
  },
  {
    name: 'hasToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
] as const

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
  const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain()
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS] || CONTRACTS[baseSepolia.id]
  const isWrongNetwork = chainId !== baseSepolia.id
  
  const [expanded, setExpanded] = useState(false)
  const [stakeAmount, setStakeAmount] = useState(goal.minStake.toString())
  const [step, setStep] = useState<'idle' | 'approving' | 'joining' | 'storing-token' | 'done'>('idle')
  const stravaConnected = isStravaConnected()
  
  // Check if user has token stored on-chain for Chainlink
  const { data: hasTokenOnChain, refetch: refetchToken } = useReadContract({
    address: contracts.oracle,
    abi: AUTOMATION_ABI,
    functionName: 'hasToken',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  
  // Store token on-chain
  const { writeContract: writeStoreToken, data: storeTokenHash, isPending: isStorePending } = useWriteContract()
  const { isLoading: isStoreConfirming, isSuccess: isStoreSuccess } = useWaitForTransactionReceipt({ hash: storeTokenHash })
  
  // Refetch token status after storing
  useEffect(() => {
    if (isStoreSuccess) {
      refetchToken()
      setStep('idle')
    }
  }, [isStoreSuccess, refetchToken])

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
  
  const handleStoreToken = async () => {
    console.log('handleStoreToken called', { isWrongNetwork, chainId })
    
    if (isWrongNetwork) {
      try {
        await switchChain({ chainId: baseSepolia.id })
      } catch (err) {
        alert('Please switch to Base Sepolia network in your wallet')
      }
      return
    }
    
    setStep('storing-token')
    try {
      console.log('Fetching Strava token...')
      const res = await fetch('/api/strava/token')
      console.log('Token response:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Token fetch failed:', errorText)
        alert('Could not retrieve Strava token. Please reconnect Strava.')
        setStep('idle')
        return
      }
      const { token } = await res.json()
      console.log('Got token, storing on chain...')
      
      writeStoreToken({
        address: contracts.oracle,
        abi: AUTOMATION_ABI,
        functionName: 'storeToken',
        args: [token],
      })
    } catch (err) {
      console.error('Error storing token:', err)
      alert('Failed to enable verification. Please try again.')
      setStep('idle')
    }
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

  const isLoading = isApprovePending || isApproveConfirming || isJoinPending || isJoinConfirming || isStorePending || isStoreConfirming

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
          <p className="text-sm text-[var(--text-secondary)]">Goal starts now. Time to move!</p>
          <div className="mt-4 pt-4 border-t border-[#2EE59D]/20">
            <p className="text-xs text-[var(--text-secondary)]">Staked ${stakeAmount} USDC</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`group bg-[var(--surface)] border rounded-xl transition-all duration-200 cursor-pointer
        ${expanded 
          ? 'border-[#2EE59D] shadow-lg shadow-[#2EE59D]/10 scale-[1.02]' 
          : 'border-[var(--border)] hover:border-[var(--text-secondary)]/30 hover:shadow-md hover:-translate-y-0.5'
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
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">{durationText}</span>
          </div>
          <span className="text-2xl group-hover:scale-110 transition-transform">{goal.emoji}</span>
        </div>

        {/* Title + Description */}
        <h3 className="font-bold text-sm text-[var(--foreground)] mb-1 group-hover:text-[#2EE59D] transition-colors">
          {goal.title}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4 line-clamp-2">{goal.description}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[var(--surface)] rounded-lg px-3 py-2">
            <p className="text-lg font-bold text-[var(--foreground)]">{goal.targetMiles}</p>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">miles</p>
          </div>
          <div className="bg-[var(--surface)] rounded-lg px-3 py-2">
            <p className="text-lg font-bold text-[#2EE59D]">${goal.minStake}</p>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">min stake</p>
          </div>
        </div>

        {/* Pool Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
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
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-4 animate-in slide-in-from-top-2 duration-200">
          {/* Quick Stakes */}
          <div className="flex gap-2 mb-3">
            {[goal.minStake, Math.round((goal.minStake + goal.maxStake) / 2), goal.maxStake].map((amount) => (
              <button
                key={amount}
                onClick={() => setStakeAmount(amount.toString())}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  stakeAmount === amount.toString()
                    ? 'bg-[#2EE59D]/10 border-[#2EE59D] text-[#2EE59D]'
                    : 'bg-[var(--surface)] border-[var(--border)] text-gray-600 hover:border-gray-300'
                }`}
              >
                ${amount}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="mb-3">
            <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 focus-within:border-[#2EE59D] focus-within:ring-1 focus-within:ring-[#2EE59D]/20 transition-all">
              <span className="text-[var(--text-secondary)] text-sm font-medium">$</span>
              <input
                type="number"
                min={goal.minStake}
                max={goal.maxStake}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-transparent outline-none text-sm font-bold text-[var(--foreground)]"
                placeholder={goal.minStake.toString()}
              />
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">USDC</span>
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1 px-1">
              <span>Min ${goal.minStake}</span>
              <span>Balance: {balanceNum.toFixed(2)}</span>
              <span>Max ${goal.maxStake}</span>
            </div>
          </div>

          {/* Strava Connection Status */}
          {isConnected && !stravaConnected && (
            <div className="mb-3 p-2.5 rounded-lg bg-orange-50 border border-orange-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-orange-700">Connect fitness app to verify progress</p>
            </div>
          )}
          
          {/* Strava connected but needs on-chain verification - just show status */}
          {isConnected && stravaConnected && !hasTokenOnChain && (
            <div className="mb-3 p-2.5 rounded-lg bg-[#FC4C02]/10 border border-[#FC4C02]/20 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              <p className="text-xs text-[#FC4C02]">Strava connected — one more step to enable verification</p>
            </div>
          )}
          
          {/* Token stored - ready to go */}
          {isConnected && stravaConnected && hasTokenOnChain && (
            <div className="mb-3 p-2.5 rounded-lg bg-[#2EE59D]/10 border border-[#2EE59D]/20 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#2EE59D]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-[#2EE59D] font-medium">Auto-verification enabled</p>
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
              className="px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-gray-700 hover:bg-[var(--surface)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                console.log('Button clicked', { stravaConnected, hasTokenOnChain })
                if (!stravaConnected) {
                  handleStravaConnect()
                } else if (!hasTokenOnChain) {
                  handleStoreToken()
                } else {
                  handleJoin()
                }
              }}
              disabled={isLoading || (isConnected && stravaConnected && hasTokenOnChain && !hasBalance)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-150 ${
                isLoading || (isConnected && stravaConnected && hasTokenOnChain && !hasBalance)
                  ? 'bg-gray-100 text-[var(--text-secondary)] cursor-not-allowed'
                  : !stravaConnected || !hasTokenOnChain
                    ? 'bg-[#FC4C02] text-white hover:bg-[#FC4C02]/90 active:scale-[0.98] shadow-sm hover:shadow-md'
                    : 'bg-[#2EE59D] text-black hover:bg-[#26c987] active:scale-[0.98] shadow-sm hover:shadow-md'
              }`}
            >
              {!stravaConnected
                ? '🏃 Connect Strava'
                : !hasTokenOnChain
                  ? isWrongNetwork 
                    ? '⚠️ Switch to Base Sepolia'
                    : isStorePending || isStoreConfirming
                      ? 'Verifying...'
                      : '🔗 Enable Auto-Verify'
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
