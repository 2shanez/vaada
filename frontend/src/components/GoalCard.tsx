'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContracts, useReadContract } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { parseUnits, formatUnits } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { isStravaConnected, getStravaAuthUrl } from '@/lib/strava'
import { useContracts, useNetworkCheck, useUSDC, useGoalState, useGoalDetails, useParticipant, useStravaToken } from '@/lib/hooks'
import { USDC_ABI, GOALSTAKE_ABI, AUTOMATION_ABI, NEW_USER_CHALLENGE_ABI, PHASE_LABELS, CATEGORY_STYLES, GoalPhase, type Goal } from '@/lib/abis'
import { DuolingoConnect, useDuolingoConnection } from './DuolingoConnect'
import { WithingsConnect, useWithingsConnection } from './WithingsConnect'
import { RescueTimeConnect, useRescueTimeConnection } from './RescueTimeConnect'
import { FitbitConnect, useFitbitConnection } from './FitbitConnect'
import { OnboardingCommitment } from './OnboardingCommitment'
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
  const { login, authenticated } = usePrivy()
  const { switchChain } = useSwitchChain()
  const contracts = useContracts()
  const { isWrongNetwork } = useNetworkCheck()
  
  // Custom hooks for contract state
  const { balance, balanceNum, allowance, refetchAllowance } = useUSDC(contracts.goalStake)
  const { entryOpen, phase } = useGoalState(goal.onChainId)
  const { participant: participantData, hasJoined: hasJoinedOnChain, userStake, refetch: refetchParticipant } = useParticipant(goal.onChainId)
  const { hasTokenOnChain, refetch: refetchToken } = useStravaToken()
  const goalDetails = useGoalDetails(goal.onChainId)
  
  // Check if user has completed the new user challenge (required before joining any goal)
  const isNewUserChallengeDeployed = contracts.newUserChallenge !== '0x0000000000000000000000000000000000000000'
  const { data: hasCompletedNewUserChallenge, refetch: refetchChallengeStatus } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'hasJoinedChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isNewUserChallengeDeployed },
  })
  
  // Tick every second to update countdowns live
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Local state
  const [expanded, setExpanded] = useState(false)
  const [showPlayers, setShowPlayers] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [stakeAmount, setStakeAmount] = useState(goal.minStake.toString())
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [showClaimCelebration, setShowClaimCelebration] = useState(false)
  const [justJoined, setJustJoined] = useState(false) // Local flag to show Joined state immediately
  
  // Combine on-chain state with local state for immediate UI feedback
  const hasJoined = hasJoinedOnChain || justJoined
  const stravaConnected = isStravaConnected()
  const { isConnected: fitbitConnected } = useFitbitConnection()
  
  // Determine which tracker is needed based on goal type
  const isStepsGoal = goal.targetUnit === 'steps'
  const trackerConnected = isStepsGoal ? fitbitConnected : stravaConnected

  // Contract writes with error tracking
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, error: approveError } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess, error: approveConfirmError } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: writeJoin, data: joinHash, isPending: isJoinPending, error: joinError } = useWriteContract()
  const { isLoading: isJoinConfirming, isSuccess: isJoinSuccess, error: joinConfirmError } = useWaitForTransactionReceipt({ hash: joinHash })

  const { writeContract: writeStoreToken, data: storeTokenHash, isPending: isStorePending, error: storeError } = useWriteContract()
  const { isLoading: isStoreConfirming, isSuccess: isStoreSuccess, error: storeConfirmError } = useWaitForTransactionReceipt({ hash: storeTokenHash })

  const { writeContract: writeClaim, data: claimHash, isPending: isClaimPending, error: claimError } = useWriteContract()
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess, error: claimConfirmError } = useWaitForTransactionReceipt({ hash: claimHash })

  // Parse user-friendly error messages
  const getErrorMessage = (error: Error | null): string | null => {
    if (!error) return null
    const msg = error.message.toLowerCase()
    if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled'
    if (msg.includes('insufficient funds')) return 'Insufficient funds for gas'
    if (msg.includes('insufficient allowance')) return 'Please approve USDC first'
    if (msg.includes('already joined') || msg.includes('already participant')) return 'Already joined this goal'
    if (msg.includes('entry closed') || msg.includes('entry deadline')) return 'Entry period has closed'
    if (msg.includes('not participant')) return 'You haven\'t joined this goal'
    if (msg.includes('not verified')) return 'Results not verified yet'
    if (msg.includes('already claimed')) return 'Already claimed'
    if (msg.includes('did not succeed')) return 'Goal not completed'
    return 'Transaction failed. Please try again.'
  }

  const txError = approveError || approveConfirmError || joinError || joinConfirmError || storeError || storeConfirmError || claimError || claimConfirmError
  const errorMessage = getErrorMessage(txError as Error | null)

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

  // Handle claim success - show celebration
  useEffect(() => {
    if (isClaimSuccess) {
      setShowClaimCelebration(true)
      refetchParticipant()
      // Auto-hide after 5 seconds
      const timeout = setTimeout(() => setShowClaimCelebration(false), 5000)
      return () => clearTimeout(timeout)
    }
  }, [isClaimSuccess, refetchParticipant])

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

  // Handle join success - immediately show Joined state in same card (no separate success screen)
  useEffect(() => {
    if (isJoinSuccess && step === 'joining') {
      setJustJoined(true) // Immediately show Joined state
      setExpanded(false) // Collapse the stake panel
      setStep('idle') // Go back to idle (skip 'done' screen)
      refetchParticipant()
      onJoined?.()
    }
  }, [isJoinSuccess, step, refetchParticipant, onJoined])

  // Note: Success screen removed - we now go straight to 'idle' with Joined state visible

  // Handlers
  const handleStravaConnect = () => {
    const callbackUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/strava/callback`
      : 'http://localhost:3000/api/strava/callback'
    window.location.href = getStravaAuthUrl(callbackUrl, address)
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
    if (!authenticated) {
      login()
      return
    }

    // Gate: Must complete new user challenge first (unless contract not deployed)
    if (isNewUserChallengeDeployed && !hasCompletedNewUserChallenge) {
      setShowOnboarding(true)
      return
    }

    // Check tracker connection based on goal type
    if (isStepsGoal) {
      if (!fitbitConnected) {
        window.location.href = address ? `/api/fitbit/auth?wallet=${address}` : '/api/fitbit/auth'
        return
      }
    } else {
      if (!stravaConnected) {
        handleStravaConnect()
        return
      }
    }

    // Auto-refresh Strava token before joining to ensure it's fresh (for miles goals only)
    // This prevents "expired token" errors during verification
    if (!isStepsGoal) {
      try {
        const res = await fetch('/api/strava/update-onchain')
        if (res.ok) {
          const data = await res.json()
          // If token was refreshed, update on-chain before joining
          if (data.refreshed && data.token) {
            console.log('Refreshing Strava token on-chain before join...')
            writeStoreToken({
              address: contracts.oracle,
              abi: AUTOMATION_ABI,
              functionName: 'storeToken',
              args: [data.token],
            })
            // Wait a moment for the store transaction to start
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      } catch (err) {
        console.warn('Could not check/refresh Strava token:', err)
        // Continue with join anyway - token might still be valid
      }
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
    // Steps goal - use Fitbit
    if (isStepsGoal) {
      if (!fitbitConnected) {
        // Redirect to Fitbit OAuth
        window.location.href = address ? `/api/fitbit/auth?wallet=${address}` : '/api/fitbit/auth'
        return
      }
      handleJoin()
      return
    }
    // Miles goal - use Strava
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

  const pooled = goalDetails.totalStaked || 0
  const participants = goalDetails.participantCount || 0

  // Fetch participant addresses from on-chain array
  const participantIndexCalls = goal.onChainId !== undefined && participants > 0
    ? Array.from({ length: participants }, (_, i) => ({
        address: contracts.goalStake as `0x${string}`,
        abi: [{
          name: 'goalParticipants',
          type: 'function',
          inputs: [{ name: 'goalId', type: 'uint256' }, { name: '', type: 'uint256' }],
          outputs: [{ type: 'address' }],
          stateMutability: 'view',
        }] as const,
        functionName: 'goalParticipants' as const,
        args: [BigInt(goal.onChainId!), BigInt(i)],
      }))
    : []

  const { data: participantAddrsData } = useReadContracts({
    contracts: participantIndexCalls,
    query: { enabled: participantIndexCalls.length > 0 },
  })

  // Read each participant's stake
  const playerAddresses = (participantAddrsData?.map(r => r.result as string).filter(Boolean)) || []
  
  const participantDetailCalls = goal.onChainId !== undefined && playerAddresses.length > 0
    ? playerAddresses.map(addr => ({
        address: contracts.goalStake as `0x${string}`,
        abi: GOALSTAKE_ABI as any,
        functionName: 'getParticipant' as const,
        args: [BigInt(goal.onChainId!), addr],
      }))
    : []

  const { data: participantDetailsData } = useReadContracts({
    contracts: participantDetailCalls as any,
    query: { enabled: participantDetailCalls.length > 0 },
  })

  const playerList = playerAddresses.map((addr, i) => {
    const detail = participantDetailsData?.[i]?.result as any
    return {
      address: addr,
      stake: detail ? Number(formatUnits(detail.stake || BigInt(0), 6)) : 0,
    }
  })

  // Phase timeline - maps contract phase to timeline step (0=Entry, 1=Compete, 2=Verify, 3=Payout)
  const getPhaseStep = () => {
    if (isSettled) return 3
    if (phase === GoalPhase.AwaitingSettlement) return 2
    if (phase === GoalPhase.Competition) return 1
    if (phase === GoalPhase.Entry || entryOpen) return 0
    // Fallback: check timestamps if phase not yet updated
    const now = Math.floor(Date.now() / 1000)
    if (goalDetails.deadline && now >= goalDetails.deadline) return 2
    if (goalDetails.entryDeadline && now >= goalDetails.entryDeadline) return 1
    return 0
  }
  const currentPhaseStep = getPhaseStep()

  // Note: Success state card removed - we now show "Joined ✓" in the main card immediately

  // New User Challenge onboarding modal
  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    refetchChallengeStatus()
  }

  // Claim celebration overlay
  if (showClaimCelebration) {
    return (
      <div className="bg-gradient-to-br from-[#2EE59D]/20 to-[#2EE59D]/5 border border-[#2EE59D] rounded-2xl p-8 text-center relative overflow-hidden">
        {/* Confetti effect */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ['#2EE59D', '#FFD700', '#FF6B6B', '#4ECDC4'][i % 4],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
        <div className="relative">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-[#2EE59D] mb-2">Winnings Claimed!</h3>
          <p className="text-[var(--text-secondary)]">You kept your promise and earned from those who didn't.</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#2EE59D]/10 rounded-full">
            <span className="text-sm font-bold text-[#2EE59D]">+${userStake} USDC</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* New User Challenge Modal */}
      {showOnboarding && (
        <OnboardingCommitment onComplete={handleOnboardingComplete} />
      )}
      
      <div className={`group bg-[var(--surface)] border rounded-2xl transition-all duration-200 relative overflow-hidden
        ${showPlayers ? 'z-40' : 'z-0'}
        ${expanded 
          ? 'border-[#2EE59D] shadow-lg shadow-[#2EE59D]/10' 
          : 'border-[var(--border)] hover:border-[var(--text-secondary)]/30 hover:shadow-lg'
        }`}
      >
        {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[var(--background)] to-[var(--surface)] px-5 pt-6 pb-5 rounded-t-2xl">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${catStyle.bg} ${catStyle.text}`}>
              {goal.category.toUpperCase()}
            </span>
            {phaseInfo && (
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${phaseInfo.color}`}>
                {phase === GoalPhase.AwaitingSettlement ? (
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <span>{phaseInfo.emoji}</span>
                )}
                {phaseInfo.label}
              </span>
            )}
            {/* WIN/LOSE badge after verification */}
            {hasJoined && participantData?.verified && (
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                userWon 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {userWon ? '🏆 WON' : '❌ LOST'}
              </span>
            )}
          </div>
          {/* Share buttons */}
          <div className="relative flex-shrink-0">
            <div className="flex items-center gap-1">
              {/* X/Twitter button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const goalId = goal.onChainId || goal.id
                  const shareUrl = `https://vaada.io/goal/${goalId}`
                  const text = `${goal.emoji} ${goal.title} - betting on myself`
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--background)] active:scale-95 transition-all"
                title="Share to X"
              >
                <svg className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>
              {/* Share link button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const goalId = goal.onChainId || goal.id
                  const shareUrl = `https://vaada.io/goal/${goalId}`
                  const text = `${goal.emoji} ${goal.title} - stake $${goal.minStake}-$${goal.maxStake} on your promise`
                  if (navigator.share) {
                    navigator.share({ title: goal.title, text, url: shareUrl }).catch(() => {})
                  } else {
                    navigator.clipboard.writeText(shareUrl)
                    setLinkCopied(true)
                    setTimeout(() => setLinkCopied(false), 2000)
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--background)] active:scale-95 transition-all"
                title="Share"
              >
                {linkCopied ? (
                  <svg className="w-4 h-4 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Large emoji hero */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2EE59D]/20 via-[#2EE59D]/10 to-transparent flex items-center justify-center flex-shrink-0 border border-[#2EE59D]/15 shadow-sm shadow-[#2EE59D]/5">
            <span className="text-3xl">{goal.emoji}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-[var(--foreground)] leading-tight mb-1">
              {goal.title}
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{goal.description}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-2 overflow-hidden">
          <div className="flex-1 min-w-0 bg-[var(--surface)] rounded-xl px-2 py-2.5 text-center border border-[var(--border)]/50">
            <p className={`font-bold text-[var(--foreground)] truncate ${goal.targetMiles >= 10000 ? 'text-base' : 'text-xl'}`}>{goal.targetMiles.toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium truncate">{goal.targetUnit || (goal.targetMiles === 1 ? 'mile' : 'miles')}</p>
          </div>
          <div className="flex-1 min-w-0 bg-[var(--surface)] rounded-xl px-2 py-2.5 text-center border border-[var(--border)]/50">
            <p className="text-xl font-bold text-[#2EE59D]">${goal.minStake}</p>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">min stake</p>
          </div>
          <div className="flex-1 min-w-0 bg-[var(--surface)] rounded-xl px-2 py-2.5 text-center border border-[var(--border)]/50">
            <p className="text-xl font-bold text-[#2EE59D]">${goal.maxStake}</p>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">max stake</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* Timeline */}
        {!isSettled && (
          <div className="py-5 border-t border-[var(--border)]/50">
            <div className="flex items-start">
              {[
                { 
                  label: 'Entry', 
                  desc: goalDetails.entryDeadline 
                    ? (formatTimeLeft(goalDetails.entryDeadline) === 'Passed' ? 'Closed' : `Closes in ${formatTimeLeft(goalDetails.entryDeadline)}`)
                    : 'Join now'
                },
                { 
                  label: 'Compete', 
                  desc: (() => {
                    if (!goalDetails.deadline) return `${durationText} window`;
                    if (formatTimeLeft(goalDetails.deadline) === 'Passed') return 'Ended';
                    // During entry phase, show the competition window duration (not countdown)
                    if (currentPhaseStep === 0 && goalDetails.entryDeadline && goalDetails.deadline) {
                      const competeDuration = goalDetails.deadline - goalDetails.entryDeadline;
                      if (competeDuration < 3600) return `${Math.floor(competeDuration / 60)}m window`;
                      if (competeDuration < 86400) return `${Math.floor(competeDuration / 3600)}h ${Math.floor((competeDuration % 3600) / 60)}m window`;
                      return `${Math.floor(competeDuration / 86400)}d ${Math.floor((competeDuration % 86400) / 3600)}h window`;
                    }
                    // After entry closes, show countdown to deadline
                    return `${formatTimeLeft(goalDetails.deadline)} left`;
                  })()
                },
                { 
                  label: 'Verify', 
                  desc: currentPhaseStep === 2 
                    ? 'Verifying...' 
                    : goal.subdomain === 'Running' 
                      ? 'Via Strava' 
                      : 'Coming soon'
                },
                { 
                  label: 'Payout', 
                  desc: 'Split the pool' 
                },
              ].map((step, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="flex items-center w-full mb-2">
                    {i > 0 && (
                      <div className={`flex-1 h-0.5 ${i <= currentPhaseStep ? 'bg-[#2EE59D]' : 'bg-[var(--border)]'}`} />
                    )}
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      i <= currentPhaseStep ? 'bg-[#2EE59D]' : 'bg-[var(--border)]'
                    }`} />
                    {i < 3 && (
                      <div className={`flex-1 h-0.5 ${i < currentPhaseStep ? 'bg-[#2EE59D]' : 'bg-[var(--border)]'}`} />
                    )}
                  </div>
                  <p className={`text-[10px] font-semibold ${i <= currentPhaseStep ? 'text-[var(--foreground)]' : 'text-[var(--text-secondary)]'}`}>
                    {step.label}
                  </p>
                  <p className="text-[9px] text-[var(--text-secondary)]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pool + Players */}
        <div className="flex items-center justify-between py-3 border-t border-[var(--border)]/50 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Pool</span>
            <span className="text-sm font-bold text-[#2EE59D]">${pooled}</span>
          </div>
          <div className="relative flex items-center">
            <button 
              onClick={(e) => { e.stopPropagation(); if (participants > 0) setShowPlayers(!showPlayers) }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] py-1 px-3 hover:border-[#2EE59D]/50 transition-colors"
            >
              <span className="text-[11px] font-medium text-[var(--foreground)]">
                {participants === 0 ? '0' : participants.toLocaleString()} {participants === 1 ? 'player' : 'players'}
              </span>
              <span className={`text-[var(--text-secondary)] text-xs transition-transform ${showPlayers ? 'rotate-90' : ''}`}>›</span>
            </button>
          
          {showPlayers && playerList.length > 0 && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2 min-w-[200px] shadow-xl">
              {playerList.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--background)]">
                  <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                    {p.address.slice(0, 6)}...{p.address.slice(-4)}
                  </span>
                  <span className="text-[11px] font-medium text-[#2EE59D]">${p.stake}</span>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400 text-center">{errorMessage}</p>
          </div>
        )}

        {/* Action Button (collapsed) */}
        {!expanded && (
          <div className="pt-2">
            {canClaim ? (
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
                className="w-full py-3 text-sm font-bold rounded-xl transition-all duration-150 bg-[#2EE59D] text-white hover:bg-[#26c987] active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                {isClaimConfirming ? 'Claiming...' : isClaimPending ? 'Confirm in wallet...' : isClaimSuccess ? 'Claimed! 🎉' : 'Claim Winnings 💰'}
              </button>
            ) : userClaimed ? (
              <button
                disabled
                className="w-full py-3 text-sm font-bold rounded-xl bg-[#2EE59D]/20 text-[#2EE59D] cursor-default border border-[#2EE59D]/30"
              >
                Claimed ✓ · ${userStake}
              </button>
            ) : isSettled && hasJoined && !userWon ? (
              <button
                disabled
                className="w-full py-3 text-sm font-bold rounded-xl bg-red-500/10 text-red-400 cursor-default border border-red-500/20"
              >
                Missed target ✗
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (goal.onChainId === undefined || !entryOpen || hasJoined) return
                  authenticated ? setExpanded(true) : login()
                }}
                disabled={goal.onChainId === undefined || !entryOpen || hasJoined}
                className={`w-full py-3 text-sm font-bold rounded-xl transition-all duration-150 ${
                  hasJoined
                    ? 'bg-[#2EE59D]/20 text-[#2EE59D] cursor-default border border-[#2EE59D]/30'
                    : goal.onChainId === undefined || !entryOpen
                    ? 'bg-[var(--border)] text-[var(--text-secondary)] cursor-not-allowed'
                    : 'bg-[#2EE59D] text-white hover:bg-[#26c987] active:scale-[0.98] shadow-sm hover:shadow-md'
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
            )}
          </div>
        )}
      </div>

      {/* Expanded Panel */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-[var(--border)]/50 pt-4 animate-in slide-in-from-top-2 duration-200">
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
            subdomain={goal.subdomain}
            goalId={goal.id}
            address={address}
            targetUnit={goal.targetUnit}
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
              className="px-4 py-3 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-xl transition-colors border border-[var(--border)]"
            >
              Cancel
            </button>
            <ActionButton
              stravaConnected={stravaConnected}
              fitbitConnected={fitbitConnected}
              trackerConnected={trackerConnected}
              isStepsGoal={isStepsGoal}
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
    </>
  )
}

// Sub-components

function StakeSelector({ goal, stakeAmount, setStakeAmount, balanceNum }: {
  goal: Goal
  stakeAmount: string
  setStakeAmount: (v: string) => void
  balanceNum: number
}) {
  // Round middle value to nearest 5 for cleaner UI
  const midStake = Math.round((goal.minStake + goal.maxStake) / 2 / 5) * 5
  const quickStakes = [goal.minStake, midStake, goal.maxStake]
  
  return (
    <>
      <div className="flex gap-2 mb-3">
        {quickStakes.map((amount) => (
          <button
            key={amount}
            onClick={() => setStakeAmount(amount.toString())}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
              stakeAmount === amount.toString()
                ? 'bg-[#2EE59D]/10 border-[#2EE59D] text-[#2EE59D]'
                : 'bg-[var(--background)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]/50'
            }`}
          >
            ${amount}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 focus-within:border-[#2EE59D] focus-within:ring-2 focus-within:ring-[#2EE59D]/20 transition-all">
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
        <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1.5 px-1">
          <span>Min ${goal.minStake}</span>
          <span>Balance: {balanceNum.toFixed(2)}</span>
          <span>Max ${goal.maxStake}</span>
        </div>
      </div>
    </>
  )
}

function StatusIndicators({ stravaConnected, hasTokenOnChain, isConnected, subdomain, goalId, address, targetUnit }: {
  stravaConnected: boolean
  hasTokenOnChain: boolean | undefined
  isConnected: boolean
  subdomain?: string
  goalId?: string
  address?: `0x${string}`
  targetUnit?: string
}) {
  const duolingo = useDuolingoConnection()
  const withings = useWithingsConnection()
  const rescuetime = useRescueTimeConnection()
  const { isConnected: fitbitConnected } = useFitbitConnection()
  
  // Data source selection for fitness goals (stored per goal in localStorage)
  const storageKey = goalId ? `vaada_datasource_${goalId}` : null
  const [dataSource, setDataSource] = useState<'strava' | 'fitbit' | null>(() => {
    if (typeof window === 'undefined' || !storageKey) return null
    return localStorage.getItem(storageKey) as 'strava' | 'fitbit' | null
  })
  
  const selectDataSource = (source: 'strava' | 'fitbit') => {
    setDataSource(source)
    if (storageKey) localStorage.setItem(storageKey, source)
  }
  
  if (!isConnected) return null

  // Duolingo goals - show connect component
  if (subdomain === 'Duolingo') {
    if (duolingo.isConnected) {
      return (
        <div className="mb-3 p-2.5 rounded-lg bg-[#58CC02]/10 border border-[#58CC02]/20 flex items-center gap-2">
          <span className="text-lg">🦉</span>
          <div>
            <p className="text-xs text-[#58CC02] font-medium">Duolingo connected</p>
            <p className="text-[10px] text-[var(--text-secondary)]">🔥 {duolingo.streak} day streak</p>
          </div>
        </div>
      )
    }
    return (
      <div className="mb-3">
        <DuolingoConnect 
          onConnect={() => {}} 
          onDisconnect={() => {}}
        />
      </div>
    )
  }

  // Weight goals - show Withings connect
  if (subdomain === 'Weight') {
    if (withings.isConnected) {
      return (
        <div className="mb-3 p-2.5 rounded-lg bg-[#00B4D8]/10 border border-[#00B4D8]/20 flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <p className="text-xs text-[#00B4D8] font-medium">Withings scale connected</p>
        </div>
      )
    }
    return (
      <div className="mb-3">
        <WithingsConnect 
          onConnect={() => {}} 
          onDisconnect={() => {}}
        />
      </div>
    )
  }

  // Steps goals - also use data source picker (Strava or Fitbit can track steps)
  // Falls through to the Running/fitness picker below

  // Screen Time goals - show RescueTime connect
  if (subdomain === 'Screen Time') {
    if (rescuetime.isConnected) {
      return (
        <div className="mb-3 p-2.5 rounded-lg bg-[#4A90D9]/10 border border-[#4A90D9]/20 flex items-center gap-2">
          <span className="text-lg">⏱️</span>
          <div>
            <p className="text-xs text-[#4A90D9] font-medium">RescueTime connected</p>
            {rescuetime.todayHours !== null && (
              <p className="text-[10px] text-[var(--text-secondary)]">Today: {rescuetime.todayHours.toFixed(1)}hr</p>
            )}
          </div>
        </div>
      )
    }
    return (
      <div className="mb-3">
        <RescueTimeConnect 
          onConnect={() => {}} 
          onDisconnect={() => {}}
        />
      </div>
    )
  }

  // For non-fitness goals, show "Coming Soon" indicator
  const fitnessSubdomains = ['Running', 'Steps', 'Cycling', 'Walking', 'Workout']
  if (subdomain && !fitnessSubdomains.includes(subdomain)) {
    return (
      <div className="mb-3 p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center gap-2">
        <span className="text-sm">🔜</span>
        <p className="text-xs text-[var(--text-secondary)]">Verification coming soon</p>
      </div>
    )
  }

  // Helper to force reconnect Strava
  const handleReconnectStrava = async () => {
    // Clear cookies and disconnect
    try {
      await fetch('/api/strava/disconnect', { method: 'POST' })
    } catch (e) {
      console.error('Disconnect failed:', e)
    }
    // Redirect to fresh Strava OAuth with wallet in state
    const callbackUrl = `${window.location.origin}/api/strava/callback`
    window.location.href = getStravaAuthUrl(callbackUrl, address)
  }

  // Helper to force reconnect Fitbit
  const handleReconnectFitbit = async () => {
    try {
      await fetch('/api/fitbit/disconnect', { method: 'POST' })
    } catch (e) {
      console.error('Fitbit disconnect failed:', e)
    }
    // Redirect to fresh Fitbit OAuth with wallet in state
    window.location.href = address ? `/api/fitbit/auth?wallet=${address}` : '/api/fitbit/auth'
  }

  // Running/Fitness goals - auto-select tracker based on goal type
  // Miles goals = Strava only, Steps goals = Fitbit only
  const isStepsGoal = targetUnit === 'steps'
  const isMilesGoal = targetUnit === 'miles' || !targetUnit // default to miles

  // Auto-select data source based on goal type if not already selected
  if (!dataSource) {
    if (isStepsGoal) {
      // Steps goal - show Fitbit only
      return (
        <div className="mb-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)] mb-2 text-center">Connect Fitbit to track steps</p>
          <button
            onClick={() => selectDataSource('fitbit')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#00B0B9]/10 border border-[#00B0B9]/30 hover:bg-[#00B0B9]/20 transition-colors"
          >
            <span className="text-xs">⌚</span>
            <span className="text-xs font-medium text-[#00B0B9]">Connect Fitbit</span>
          </button>
          <button
            onClick={handleReconnectFitbit}
            className="w-full mt-2 text-[10px] text-[var(--text-secondary)] hover:text-[#00B0B9] transition-colors"
          >
            🔄 Reconnect Fitbit
          </button>
        </div>
      )
    } else {
      // Miles goal - show Strava only
      return (
        <div className="mb-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)] mb-2 text-center">Connect Strava to track miles</p>
          <button
            onClick={() => selectDataSource('strava')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#FC4C02]/10 border border-[#FC4C02]/30 hover:bg-[#FC4C02]/20 transition-colors"
          >
            <svg className="w-4 h-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            <span className="text-xs font-medium text-[#FC4C02]">Connect Strava</span>
          </button>
          <button
            onClick={handleReconnectStrava}
            className="w-full mt-2 text-[10px] text-[var(--text-secondary)] hover:text-[#FC4C02] transition-colors"
          >
            🔄 Reconnect Strava
          </button>
        </div>
      )
    }
  }

  // Step 2: Show connect UI for selected data source
  if (dataSource === 'fitbit') {
    if (fitbitConnected) {
      return (
        <div className="mb-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)] mb-2 text-center">Connect Fitbit to track steps</p>
          <div className="p-2.5 rounded-xl bg-[#00B0B9]/10 border border-[#00B0B9]/20 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <span className="text-sm">⌚</span>
              <p className="text-xs text-[#00B0B9] font-medium">✓ Fitbit Connected</p>
            </div>
          </div>
          <button
            onClick={handleReconnectFitbit}
            className="w-full mt-2 text-[10px] text-[var(--text-secondary)] hover:text-[#00B0B9] transition-colors"
          >
            🔄 Reconnect Fitbit (new wallet)
          </button>
        </div>
      )
    }
    return (
      <div className="mb-3 p-3 rounded-xl bg-[#00B0B9]/10 border border-[#00B0B9]/20">
        <p className="text-xs text-[var(--text-secondary)] mb-2">Connect Fitbit to verify steps</p>
        <FitbitConnect />
      </div>
    )
  }

  // Strava flow (existing logic)
  if (!stravaConnected) {
    return (
      <div className="mb-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <p className="text-xs text-[var(--text-secondary)] mb-2 text-center">Connect Strava to track miles</p>
        <button
          onClick={() => {
            const callbackUrl = `${window.location.origin}/api/strava/callback`
            window.location.href = `https://www.strava.com/oauth/authorize?client_id=199295&response_type=code&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=activity:read_all&state=${address || ''}`
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#FC4C02]/10 border border-[#FC4C02]/30 hover:bg-[#FC4C02]/20 transition-colors"
        >
          <svg className="w-4 h-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          <span className="text-xs font-medium text-[#FC4C02]">Connect Strava</span>
        </button>
        <button
          onClick={handleReconnectStrava}
          className="w-full mt-2 text-[10px] text-[var(--text-secondary)] hover:text-[#FC4C02] transition-colors"
        >
          🔄 Reconnect Strava
        </button>
      </div>
    )
  }

  if (!hasTokenOnChain) {
    return (
      <div className="mb-3 p-3 rounded-xl bg-[#2EE59D]/10 border border-[#2EE59D]/20">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#2EE59D]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          <p className="text-xs text-[#2EE59D] font-medium">✓ Strava Connected - Ready to stake</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-3 p-2.5 rounded-xl bg-[#2EE59D]/10 border border-[#2EE59D]/20 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-[#2EE59D]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-[#2EE59D] font-medium">✓ Runs will be verified via Strava</p>
      </div>
      <button onClick={() => setDataSource(null)} className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--foreground)]">
        Switch
      </button>
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

function ActionButton({ stravaConnected, fitbitConnected, trackerConnected, isStepsGoal, hasTokenOnChain, hasBalance, isLoading, isWrongNetwork, isStorePending, isStoreConfirming, stakeAmount, onClick }: {
  stravaConnected: boolean
  fitbitConnected: boolean
  trackerConnected: boolean
  isStepsGoal: boolean
  hasTokenOnChain: boolean | undefined
  hasBalance: boolean
  isLoading: boolean
  isWrongNetwork: boolean
  isStorePending: boolean
  isStoreConfirming: boolean
  stakeAmount: string
  onClick: () => void
}) {
  // Disable only when insufficient balance or loading
  const disabled = isLoading || !hasBalance
  
  const getLabel = () => {
    if (!hasBalance) return 'Insufficient USDC'
    if (isLoading) return 'Processing...'
    if (isWrongNetwork) return '⚠️ Switch to Base Sepolia'
    if (isStorePending || isStoreConfirming) return 'Verifying...'
    return `Stake $${stakeAmount}`
  }

  const getStyle = () => {
    if (disabled || !hasBalance) return 'bg-gray-100 dark:bg-gray-800 text-[var(--text-secondary)] cursor-not-allowed'
    return 'bg-[#2EE59D] text-white hover:bg-[#26c987] active:scale-[0.98] shadow-sm hover:shadow-md'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-150 ${getStyle()}`}
    >
      {getLabel()}
    </button>
  )
}
