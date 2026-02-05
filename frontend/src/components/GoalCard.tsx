'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { parseUnits } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { isStravaConnected, getStravaAuthUrl } from '@/lib/strava'
import { useContracts, useNetworkCheck, useUSDC, useGoalState, useGoalDetails, useParticipant, useStravaToken } from '@/lib/hooks'
import { USDC_ABI, GOALSTAKE_ABI, AUTOMATION_ABI, PHASE_LABELS, CATEGORY_STYLES, GoalPhase, type Goal } from '@/lib/abis'

// Re-export Goal type for other components
export type { Goal }

interface GoalCardProps {
  goal: Goal
  onJoined?: () => void
}

type Step = 'idle' | 'approving' | 'joining' | 'storing-token' | 'done'

function formatTimeLeft(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = timestamp - now
  if (diff <= 0) return 'Passed'
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
  return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h`
}

export function GoalCard({ goal, onJoined }: GoalCardProps) {
  const { address, isConnected } = useAccount()
  const { login } = usePrivy()
  const { switchChain } = useSwitchChain()
  const contracts = useContracts()
  const { isWrongNetwork } = useNetworkCheck()
  
  // Custom hooks for contract state
  const { balance, balanceNum, allowance, refetchAllowance } = useUSDC(contracts.goalStake)
  const { entryOpen, phase } = useGoalState(goal.onChainId)
  const { participant: participantData, hasJoined, userStake, refetch: refetchParticipant } = useParticipant(goal.onChainId)
  const { hasTokenOnChain, refetch: refetchToken } = useStravaToken()
  const goalDetails = useGoalDetails(goal.onChainId)
  
  // Tick every 60s to update countdowns
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  // Local state
  const [expanded, setExpanded] = useState(false)
  const [stakeAmount, setStakeAmount] = useState(goal.minStake.toString())
  const [step, setStep] = useState<Step>('idle')
  const stravaConnected = isStravaConnected()

  // Contract writes
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: writeJoin, data: joinHash, isPending: isJoinPending } = useWriteContract()
  const { isLoading: isJoinConfirming, isSuccess: isJoinSuccess } = useWaitForTransactionReceipt({ hash: joinHash })

  const { writeContract: writeStoreToken, data: storeTokenHash, isPending: isStorePending } = useWriteContract()
  const { isLoading: isStoreConfirming, isSuccess: isStoreSuccess } = useWaitForTransactionReceipt({ hash: storeTokenHash })

  const { writeContract: writeClaim, data: claimHash, isPending: isClaimPending } = useWriteContract()
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash })

  // Derived state
  const isSettled = phase === GoalPhase.Settled
  const userWon = participantData?.succeeded === true
  const userClaimed = participantData?.claimed === true
  const canClaim = isSettled && hasJoined && userWon && !userClaimed
  const stakeAmountWei = parseUnits(stakeAmount || '0', 6)
  const hasAllowance = allowance != null && allowance >= stakeAmountWei
  const hasBalance = balance != null && balance >= stakeAmountWei
  const isLoading = isApprovePending || isApproveConfirming || isJoinPending || isJoinConfirming || isStorePending || isStoreConfirming

  // Effects
  useEffect(() => {
    if (isStoreSuccess) {
      refetchToken()
      setStep('idle')
    }
  }, [isStoreSuccess, refetchToken])

  // Handle approval → join flow
  useEffect(() => {
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
  }, [isApproveSuccess, step, goal.onChainId, contracts.goalStake, stakeAmountWei, refetchAllowance, writeJoin])

  // Handle join success
  useEffect(() => {
    if (isJoinSuccess && step === 'joining') {
      setStep('done')
      refetchParticipant()
      onJoined?.()
    }
  }, [isJoinSuccess, step, refetchParticipant, onJoined])

  // Handlers
  const handleStravaConnect = () => {
    const callbackUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/strava/callback`
      : 'http://localhost:3000/api/strava/callback'
    window.location.href = getStravaAuthUrl(callbackUrl)
  }
  
  const handleStoreToken = async () => {
    if (isWrongNetwork) {
      try {
        await switchChain({ chainId: baseSepolia.id })
      } catch {
        alert('Please switch to Base Sepolia network in your wallet')
      }
      return
    }
    
    setStep('storing-token')
    try {
      const res = await fetch('/api/strava/token')
      
      if (!res.ok) {
        document.cookie = 'strava_athlete_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie = 'strava_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        handleStravaConnect()
        return
      }
      const { token } = await res.json()
      
      writeStoreToken({
        address: contracts.oracle,
        abi: AUTOMATION_ABI,
        functionName: 'storeToken',
        args: [token],
      })
    } catch {
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
    
    const stakeNum = parseFloat(stakeAmount)
    if (stakeNum < goal.minStake || stakeNum > goal.maxStake) {
      alert(`Stake must be between $${goal.minStake} and $${goal.maxStake}`)
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
    } else if (goal.onChainId !== undefined) {
      setStep('joining')
      writeJoin({
        address: contracts.goalStake,
        abi: GOALSTAKE_ABI,
        functionName: 'joinGoal',
        args: [BigInt(goal.onChainId), stakeAmountWei],
      })
    }
  }

  const handleActionButton = () => {
    if (!stravaConnected) handleStravaConnect()
    else if (!hasTokenOnChain) handleStoreToken()
    else handleJoin()
  }

  // Format duration
  const durationText = goal.durationDays < 1 
    ? `${Math.round(goal.durationDays * 24 * 60)}m`
    : goal.durationDays === 1 ? '24h' : `${goal.durationDays}d`

  const catStyle = CATEGORY_STYLES[goal.category] || CATEGORY_STYLES.Daily
  const phaseInfo = phase !== undefined ? PHASE_LABELS[phase as GoalPhase] : null

  // Success state
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
    <div className={`group bg-[var(--surface)] border rounded-xl transition-all duration-200 cursor-pointer
      ${expanded 
        ? 'border-[#2EE59D] shadow-lg shadow-[#2EE59D]/10 scale-[1.02]' 
        : 'border-[var(--border)] hover:border-[var(--text-secondary)]/30 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${catStyle.bg} ${catStyle.text}`}>
              {goal.category.toUpperCase()}
            </span>
            {phaseInfo && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${phaseInfo.color}`}>
                {phaseInfo.emoji} {phaseInfo.label}
              </span>
            )}
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">{durationText}</span>
          </div>
          <span className="text-2xl group-hover:scale-110 transition-transform">{goal.emoji}</span>
        </div>

        {/* Title + Description */}
        <h3 className="font-bold text-sm text-[var(--foreground)] mb-1 group-hover:text-[#2EE59D] transition-colors">
          {goal.title}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{goal.description}</p>

        {/* Deadlines */}
        {goalDetails.entryDeadline && !isSettled && (
          <div className="flex flex-col gap-1 mb-4 text-[10px] text-[var(--text-secondary)]">
            {entryOpen && goalDetails.entryDeadline && (
              <span className="whitespace-nowrap">🟢 Entry closes in <strong className="text-[var(--foreground)]">{formatTimeLeft(goalDetails.entryDeadline)}</strong></span>
            )}
            {goalDetails.deadline && (
              <span className="whitespace-nowrap">⏰ Deadline in <strong className="text-[var(--foreground)]">{formatTimeLeft(goalDetails.deadline)}</strong></span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[var(--background)] rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-[var(--foreground)]">{goal.targetMiles}</p>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">miles</p>
          </div>
          <div className="bg-[var(--background)] rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-[#2EE59D]">${goal.minStake}</p>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">min stake</p>
          </div>
        </div>

        {/* Participants + Pool */}
        <div className="flex justify-between items-center mb-4 px-3 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]/50">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">👥</span>
            <span className="text-xs font-medium text-[var(--foreground)]">{(goalDetails.participantCount || 0) === 0 ? 'Be the first' : `${goalDetails.participantCount} joined`}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#2EE59D]">${goalDetails.totalStaked || 0}</span>
            <span className="text-[10px] text-[var(--text-secondary)]">pooled</span>
          </div>
        </div>

        {/* Action Button (collapsed) */}
        {!expanded && (
          canClaim ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                writeClaim({
                  address: contracts.goalStake,
                  abi: GOALSTAKE_ABI,
                  functionName: 'claimPayout',
                  args: [BigInt(goal.onChainId!)],
                })
              }}
              disabled={isClaimPending || isClaimConfirming}
              className="w-full py-2.5 text-sm font-bold rounded-lg transition-all duration-150 bg-[#2EE59D] text-black hover:bg-[#26c987] active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              {isClaimConfirming ? 'Claiming...' : isClaimPending ? 'Confirm in wallet...' : isClaimSuccess ? 'Claimed! 🎉' : 'Claim Winnings 💰'}
            </button>
          ) : userClaimed ? (
            <button
              disabled
              className="w-full py-2.5 text-sm font-bold rounded-lg bg-[#2EE59D]/20 text-[#2EE59D] cursor-default border border-[#2EE59D]/30"
            >
              Claimed ✓ · ${userStake}
            </button>
          ) : isSettled && hasJoined && !userWon ? (
            <button
              disabled
              className="w-full py-2.5 text-sm font-bold rounded-lg bg-red-500/10 text-red-400 cursor-default border border-red-500/20"
            >
              Missed target ✗
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (goal.onChainId === undefined || !entryOpen || hasJoined) return
                isConnected ? setExpanded(true) : login()
              }}
              disabled={goal.onChainId === undefined || !entryOpen || hasJoined}
              className={`w-full py-2.5 text-sm font-bold rounded-lg transition-all duration-150 ${
                hasJoined
                  ? 'bg-[#2EE59D]/20 text-[#2EE59D] cursor-default border border-[#2EE59D]/30'
                  : goal.onChainId === undefined || !entryOpen
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#2EE59D] text-black hover:bg-[#26c987] active:scale-[0.98] shadow-sm hover:shadow-md'
              }`}
            >
              {hasJoined 
                ? `Joined ✓ · $${userStake}` 
                : goal.onChainId === undefined 
                ? 'Coming Soon' 
                : !entryOpen 
                ? 'Entry Closed' 
                : `Stake $${goal.minStake}+`}
            </button>
          )
        )}
      </div>

      {/* Expanded Panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-4 animate-in slide-in-from-top-2 duration-200">
          <StakeSelector 
            goal={goal} 
            stakeAmount={stakeAmount} 
            setStakeAmount={setStakeAmount}
            balanceNum={balanceNum}
          />
          
          <StatusIndicators 
            stravaConnected={stravaConnected}
            hasTokenOnChain={hasTokenOnChain}
            isConnected={isConnected}
          />
          
          {isLoading && (
            <LoadingIndicator 
              isApprovePending={isApprovePending}
              isApproveConfirming={isApproveConfirming}
              isJoinPending={isJoinPending}
              isJoinConfirming={isJoinConfirming}
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setExpanded(false)}
              className="px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-gray-700 hover:bg-[var(--surface)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <ActionButton
              stravaConnected={stravaConnected}
              hasTokenOnChain={hasTokenOnChain}
              hasBalance={hasBalance}
              isLoading={isLoading}
              isWrongNetwork={isWrongNetwork}
              isStorePending={isStorePending}
              isStoreConfirming={isStoreConfirming}
              stakeAmount={stakeAmount}
              onClick={handleActionButton}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-components

function StakeSelector({ goal, stakeAmount, setStakeAmount, balanceNum }: {
  goal: Goal
  stakeAmount: string
  setStakeAmount: (v: string) => void
  balanceNum: number
}) {
  const quickStakes = [goal.minStake, Math.round((goal.minStake + goal.maxStake) / 2), goal.maxStake]
  
  return (
    <>
      <div className="flex gap-2 mb-3">
        {quickStakes.map((amount) => (
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

      <div className="mb-3">
        <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 focus-within:border-[#2EE59D] focus-within:ring-1 focus-within:ring-[#2EE59D]/20 transition-all">
          <span className="text-[var(--text-secondary)] text-sm font-medium">$</span>
          <input
            type="number"
            min={goal.minStake}
            max={goal.maxStake}
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
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
    </>
  )
}

function StatusIndicators({ stravaConnected, hasTokenOnChain, isConnected }: {
  stravaConnected: boolean
  hasTokenOnChain: boolean | undefined
  isConnected: boolean
}) {
  if (!isConnected) return null

  if (!stravaConnected) {
    return (
      <div className="mb-3 p-2.5 rounded-lg bg-orange-50 border border-orange-100 flex items-center gap-2">
        <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-xs text-orange-700">Connect fitness app to verify progress</p>
      </div>
    )
  }

  if (!hasTokenOnChain) {
    return (
      <div className="mb-3 p-2.5 rounded-lg bg-[#FC4C02]/10 border border-[#FC4C02]/20 flex items-center gap-2">
        <svg className="w-4 h-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        <p className="text-xs text-[#FC4C02]">Strava connected — one more step to enable verification</p>
      </div>
    )
  }

  return (
    <div className="mb-3 p-2.5 rounded-lg bg-[#2EE59D]/10 border border-[#2EE59D]/20 flex items-center gap-2">
      <svg className="w-4 h-4 text-[#2EE59D]" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      <p className="text-xs text-[#2EE59D] font-medium">Auto-verification enabled</p>
    </div>
  )
}

function LoadingIndicator({ isApprovePending, isApproveConfirming, isJoinPending, isJoinConfirming }: {
  isApprovePending: boolean
  isApproveConfirming: boolean
  isJoinPending: boolean
  isJoinConfirming: boolean
}) {
  const message = isApprovePending ? 'Confirm in wallet...' :
    isApproveConfirming ? 'Approving USDC...' :
    isJoinPending ? 'Confirm transaction...' :
    isJoinConfirming ? 'Joining goal...' : ''

  return (
    <div className="mb-3 p-3 rounded-lg bg-[#2EE59D]/5 border border-[#2EE59D]/20">
      <div className="flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#2EE59D] font-medium">{message}</p>
      </div>
    </div>
  )
}

function ActionButton({ stravaConnected, hasTokenOnChain, hasBalance, isLoading, isWrongNetwork, isStorePending, isStoreConfirming, stakeAmount, onClick }: {
  stravaConnected: boolean
  hasTokenOnChain: boolean | undefined
  hasBalance: boolean
  isLoading: boolean
  isWrongNetwork: boolean
  isStorePending: boolean
  isStoreConfirming: boolean
  stakeAmount: string
  onClick: () => void
}) {
  const disabled = isLoading || (stravaConnected && hasTokenOnChain && !hasBalance)
  
  const getLabel = () => {
    if (!stravaConnected) return '🏃 Connect Strava'
    if (!hasTokenOnChain) {
      if (isWrongNetwork) return '⚠️ Switch to Base Sepolia'
      if (isStorePending || isStoreConfirming) return 'Verifying...'
      return '🔗 Enable Auto-Verify'
    }
    if (!hasBalance) return 'Insufficient USDC'
    if (isLoading) return 'Processing...'
    return `Stake $${stakeAmount} →`
  }

  const getStyle = () => {
    if (disabled) return 'bg-gray-100 text-[var(--text-secondary)] cursor-not-allowed'
    if (!stravaConnected || !hasTokenOnChain) return 'bg-[#FC4C02] text-white hover:bg-[#FC4C02]/90 active:scale-[0.98] shadow-sm hover:shadow-md'
    return 'bg-[#2EE59D] text-black hover:bg-[#26c987] active:scale-[0.98] shadow-sm hover:shadow-md'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-150 ${getStyle()}`}
    >
      {getLabel()}
    </button>
  )
}
