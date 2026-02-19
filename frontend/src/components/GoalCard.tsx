'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useWaitForTransactionReceipt, useSwitchChain, useReadContracts, useReadContract } from 'wagmi'
import { useSponsoredWrite } from '@/lib/useSponsoredWrite'
import { usePrivy } from '@privy-io/react-auth'
import { parseUnits, formatUnits } from 'viem'
import { base } from 'wagmi/chains'
import { isStravaConnected, getStravaAuthUrl } from '@/lib/strava'
import { useContracts, useNetworkCheck, useUSDC, useGoalState, useGoalDetails, useParticipant, useStravaToken } from '@/lib/hooks'
import { USDC_ABI, GOALSTAKE_ABI, AUTOMATION_ABI, NEW_USER_CHALLENGE_ABI, PHASE_LABELS, CATEGORY_STYLES, GoalPhase, type Goal } from '@/lib/abis'
import { analytics } from '@/lib/analytics'
import { UserRepBadge } from './UserRepBadge'
import { DuolingoConnect, useDuolingoConnection } from './DuolingoConnect'
import { WithingsConnect, useWithingsConnection } from './WithingsConnect'
import { RescueTimeConnect, useRescueTimeConnection } from './RescueTimeConnect'
import { FitbitConnect, useFitbitConnection } from './FitbitConnect'
import { OnboardingCommitment } from './OnboardingCommitment'
import { fetchProfiles } from './ProfileName'
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


function openGoogleCalendar(goal: Goal, deadline: number) {
  const startDate = new Date(deadline * 1000)
  const endDate = new Date((deadline + 3600) * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const title = encodeURIComponent(goal.title || 'Vaada Promise')
  const goalId = goal.onChainId || goal.id
  const details = encodeURIComponent('Your promise deadline is here. Check your progress at https://vaada.io/goal/' + goalId)
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=⏰+Vaada:+${title}+deadline&dates=${fmt(startDate)}/${fmt(endDate)}&details=${details}`
  window.open(url, '_blank')
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
  const [justStakedAmount, setJustStakedAmount] = useState<number | null>(null) // Store stake amount for immediate display
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<{address: string, name?: string, steps: number, stake: number}[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, string>>({})
  
  // Ref for click-outside handling on player dropdown
  const playersDropdownRef = useRef<HTMLDivElement>(null)
  const playersButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{top: number, left: number, width: number}>({top: 0, left: 0, width: 0})
  
  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showPlayers) return
    
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        playersDropdownRef.current && !playersDropdownRef.current.contains(event.target as Node) &&
        playersButtonRef.current && !playersButtonRef.current.contains(event.target as Node)
      ) {
        setShowPlayers(false)
      }
    }
    
    // Use both mouse and touch events for mobile compatibility
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    
    // Close on scroll, update on resize
    const closeOnScroll = () => setShowPlayers(false)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', closeOnScroll)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', closeOnScroll)
    }
  }, [showPlayers])
  
  // Combine on-chain state with local state for immediate UI feedback
  // Only show joined state if user is authenticated
  const hasJoined = authenticated && (hasJoinedOnChain || justJoined)
  const stravaConnected = isStravaConnected()
  const { isConnected: fitbitConnected } = useFitbitConnection()
  
  // Determine which tracker is needed based on goal type
  const isStepsGoal = goal.targetUnit === 'steps'
  const trackerConnected = isStepsGoal ? fitbitConnected : stravaConnected

  // Contract writes with error tracking
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, error: approveError } = useSponsoredWrite()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess, error: approveConfirmError } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: writeJoin, data: joinHash, isPending: isJoinPending, error: joinError } = useSponsoredWrite()
  const { isLoading: isJoinConfirming, isSuccess: isJoinSuccess, error: joinConfirmError } = useWaitForTransactionReceipt({ hash: joinHash })

  const { writeContract: writeStoreToken, data: storeTokenHash, isPending: isStorePending, error: storeError } = useSponsoredWrite()
  const { isLoading: isStoreConfirming, isSuccess: isStoreSuccess, error: storeConfirmError } = useWaitForTransactionReceipt({ hash: storeTokenHash })

  const { writeContract: writeClaim, data: claimHash, isPending: isClaimPending, error: claimError } = useSponsoredWrite()
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess, error: claimConfirmError } = useWaitForTransactionReceipt({ hash: claimHash })

  // Parse user-friendly error messages
  const getErrorMessage = (error: Error | null): string | null => {
    if (!error) return null
    const msg = error.message.toLowerCase()
    if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled'
    if (msg.includes('insufficient funds')) return 'Insufficient USDC balance'
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
  const canClaim = isSettled && hasJoined && userWon && !userClaimed && !isWrongNetwork
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
      setJustStakedAmount(Number(stakeAmount)) // Store the stake amount for immediate display
      setExpanded(false) // Collapse the stake panel
      setStep('idle') // Go back to idle (skip 'done' screen)
      refetchParticipant()
      onJoined?.()
      analytics.goalJoined(goal.onChainId ?? 0, goal.title, Number(stakeAmount))
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
        await switchChain({ chainId: base.id })
      } catch {
        alert('Please switch to Base network in your wallet')
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
      // Approve 1000 USDC once — no repeated approvals for future goals
      const approveAmount = parseUnits('1000', 6)
      writeApprove({
        address: contracts.usdc,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [contracts.goalStake, approveAmount],
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

  const handleFitbitPopup = () => {
    const authUrl = address 
      ? `/api/fitbit/auth?wallet=${address}&popup=true`
      : '/api/fitbit/auth?popup=true'
    
    const width = 500, height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    
    const popup = window.open(authUrl, 'fitbit-auth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`)
    
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'fitbit-auth-success') {
        // Reload page to pick up new cookie state
        window.location.reload()
        window.removeEventListener('message', handleMessage)
        popup?.close()
      }
    }
    window.addEventListener('message', handleMessage)
    setTimeout(() => window.removeEventListener('message', handleMessage), 5 * 60 * 1000)
  }

  const handleActionButton = () => {
    // Steps goal - use Fitbit
    if (isStepsGoal) {
      if (!fitbitConnected) {
        handleFitbitPopup()
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

  // Fetch leaderboard data (step counts for all participants)
  const fetchLeaderboard = async () => {
    if (!goalDetails.startTime || !goalDetails.deadline || playerList.length === 0) return
    
    setLeaderboardLoading(true)
    setLeaderboardError(null)
    
    try {
      // Fetch profile names in parallel with step data
      const addresses = playerList.map(p => p.address)
      const [profilesMap, ...stepResults] = await Promise.all([
        fetchProfiles(addresses),
        ...playerList.map(async (p) => {
          try {
            const res = await fetch(
              `/api/verify?user=${p.address}&start=${goalDetails.startTime}&end=${goalDetails.deadline}&type=${isStepsGoal ? 'steps' : 'miles'}`
            )
            const data = await res.json()
            return {
              address: p.address,
              steps: data.success ? (data.steps || data.miles || 0) : 0,
              stake: p.stake,
            }
          } catch {
            return { address: p.address, steps: 0, stake: p.stake }
          }
        })
      ])
      
      // Add names to results
      const resultsWithNames = stepResults.map(r => ({
        ...r,
        name: profilesMap[r.address.toLowerCase()] || undefined,
      }))
      
      // Sort by steps descending
      resultsWithNames.sort((a, b) => b.steps - a.steps)
      setLeaderboardData(resultsWithNames)
    } catch (err) {
      setLeaderboardError('Failed to fetch leaderboard')
    } finally {
      setLeaderboardLoading(false)
    }
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

  // Fetch player profiles when addresses change
  useEffect(() => {
    if (playerAddresses.length > 0) {
      fetchProfiles(playerAddresses).then(profiles => {
        setPlayerProfiles(profiles)
      })
    }
  }, [playerAddresses.join(',')])

  // Auto-fetch leaderboard data for joined users (for progress bar)
  useEffect(() => {
    if (hasJoined && address && leaderboardData.length === 0) {
      fetchLeaderboard()
    }
  }, [hasJoined, address])

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

  // Win moment celebration overlay
  if (showClaimCelebration) {
    const goalId = goal.onChainId || goal.id
    const shareUrl = `https://vaada.io/goal/${goalId}`
    const shareText = `I kept my promise and won $${userStake} USDC on Vaada ✅\n\n${goal.emoji} ${goal.title}\n\nStake your word →`
    return (
      <div className="bg-[var(--surface)] border border-[#2EE59D] rounded-2xl relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => setShowClaimCelebration(false)}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>        {/* Falling confetti */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${5 + Math.random() * 10}%`,
                width: `${4 + Math.random() * 6}px`,
                height: `${4 + Math.random() * 6}px`,
                backgroundColor: ["#2EE59D", "#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA", "#F59E0B"][i % 6],
                animation: `confettiFall ${2 + Math.random() * 3}s ease-in ${Math.random() * 2}s infinite`,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes confettiFall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
          }
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(46,229,157,0.2); }
            50% { box-shadow: 0 0 40px rgba(46,229,157,0.4); }
          }
          @keyframes scaleIn {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <div className="relative px-6 py-10 text-center" style={{ animation: "scaleIn 0.4s ease-out" }}>
          {/* Promise emoji */}
          <div className="text-6xl mb-3">{goal.emoji}</div>

          {/* Status badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2EE59D]/15 mb-4">
            <span className="text-xs font-bold text-[#2EE59D] uppercase tracking-wider">✓ Promise Kept</span>
          </div>

          {/* Promise name */}
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">{goal.title}</h3>

          {/* Amount won */}
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2EE59D]/10 border border-[#2EE59D]/20 mb-6" style={{ animation: "pulseGlow 2s ease-in-out infinite" }}>
            <span className="text-3xl font-bold text-[#2EE59D]">+${userStake}</span>
            <span className="text-sm font-medium text-[#2EE59D]/70">USDC</span>
          </div>

          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs mx-auto">
            You staked your word and kept it. The winnings are yours.
          </p>

          {/* Share buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank")
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--foreground)] text-[var(--background)] text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share Win
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "I kept my promise on Vaada!", text: shareText, url: shareUrl }).catch(() => {})
                } else {
                  navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border)] text-[var(--foreground)] text-sm font-semibold hover:border-[var(--foreground)] active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>

          {/* Vaada branding */}
          <p className="text-[10px] text-[var(--text-secondary)]/50 mt-6 uppercase tracking-widest">vaada.io</p>
        </div>
      </div>
    )
  }


  // Hide settled goals from browse view (unless user can claim)
  // Active goals = not settled. Once settled, they're no longer "live"
  if (isSettled && !hasJoinedOnChain) {
    return null
  }

  return (
    <>
      {/* New User Challenge Modal */}
      {showOnboarding && (
        <OnboardingCommitment onComplete={handleOnboardingComplete} />
      )}
      
      <div className={`group bg-[var(--surface)] border rounded-2xl transition-all duration-200 relative
        ${showPlayers ? 'z-40' : 'z-0'}
        ${expanded 
          ? 'border-[#2EE59D] shadow-lg shadow-[#2EE59D]/10' 
          : 'border-[var(--border)] hover:border-[#2EE59D]/50 hover:shadow-lg'
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
                {phase === GoalPhase.Entry && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2EE59D] animate-pulse" />
                )}
                {phase === GoalPhase.Competition && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                {phase === GoalPhase.AwaitingSettlement && (
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                {phase === GoalPhase.Settled && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                )}
                {phaseInfo.label}
              </span>
            )}
            {/* WIN/LOSE badge after verification */}
            {hasJoined && participantData?.verified && (
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                userWon 
                  ? 'bg-[#2EE59D]/10 text-[#2EE59D]' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                {userWon ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                {userWon ? 'KEPT' : 'BROKEN'}
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
                  const text = `${goal.emoji} ${goal.title} — keeping my promise on Vaada`
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--background)] active:scale-95 transition-all"
                title="Share to X"
              >
                <svg className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>
              {/* Calendar button */}
              {goalDetails?.deadline && !goal.settled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (goalDetails.deadline) openGoogleCalendar(goal, goalDetails.deadline)
                  }}
                  className="p-1.5 rounded-lg hover:bg-[var(--background)] active:scale-95 transition-all"
                  title="Add to Calendar"
                >
                  <svg className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
              {/* Invite friend button */}
              {!goal.settled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const goalId = goal.onChainId || goal.id
                    const shareUrl = `https://vaada.io/goal/${goalId}`
                    const text = `I just staked on ${goal.title}. Join me:`
                    if (navigator.share) {
                      navigator.share({ title: `Join my Vaada promise`, text, url: shareUrl }).catch(() => {})
                    } else {
                      navigator.clipboard.writeText(`${text} ${shareUrl}`)
                      setLinkCopied(true)
                      setTimeout(() => setLinkCopied(false), 2000)
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-[var(--background)] active:scale-95 transition-all"
                  title="Invite a friend"
                >
                  <svg className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </button>
              )}
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
            <p className={`font-bold text-[var(--foreground)] ${goal.targetMiles >= 10000 ? 'text-sm' : goal.targetMiles >= 1000 ? 'text-lg' : 'text-xl'}`}>{goal.targetMiles.toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">{goal.targetUnit || (goal.targetMiles === 1 ? 'mile' : 'miles')}</p>
          </div>
          {goal.minStake === goal.maxStake ? (
            // Fixed stake - single box
            <div className="flex-1 min-w-0 bg-[var(--surface)] rounded-xl px-2 py-2.5 text-center border border-[#2EE59D]/30">
              <p className="text-xl font-bold text-[#2EE59D]">${goal.minStake}</p>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">stake</p>
            </div>
          ) : (
            // Variable stake - min/max boxes
            <>
              <div className="flex-1 min-w-0 bg-[var(--surface)] rounded-xl px-2 py-2.5 text-center border border-[var(--border)]/50">
                <p className="text-xl font-bold text-[#2EE59D]">${goal.minStake}</p>
                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">min stake</p>
              </div>
              <div className="flex-1 min-w-0 bg-[var(--surface)] rounded-xl px-2 py-2.5 text-center border border-[var(--border)]/50">
                <p className="text-xl font-bold text-[#2EE59D]">${goal.maxStake}</p>
                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">max stake</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* Countdown timer */}
        {!isSettled && goalDetails?.deadline && formatTimeLeft(goalDetails.deadline) !== 'Passed' && (
          <div className="flex items-center justify-center gap-2 py-3 mb-1 border-t border-[var(--border)]/50">
            <svg className="w-4 h-4 text-[#2EE59D] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold text-[var(--foreground)]">
              {formatTimeLeft(goalDetails.deadline)} left
            </span>
          </div>
        )}

        {/* Progress bar for joined users */}
        {!isSettled && hasJoined && leaderboardData.length > 0 && address && (() => {
          const userData = leaderboardData.find(d => d.address.toLowerCase() === address.toLowerCase())
          if (!userData) return null
          const pct = Math.min(100, Math.round((userData.steps / goal.targetMiles) * 100))
          const isComplete = userData.steps >= goal.targetMiles
          return (
            <div className="px-0 pb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[var(--text-secondary)]">Your progress</span>
                <span className={`text-xs font-bold ${isComplete ? 'text-[#2EE59D]' : 'text-[var(--foreground)]'}`}>
                  {userData.steps.toLocaleString()} / {goal.targetMiles.toLocaleString()} {goal.targetUnit || 'steps'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--border)]/50">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${isComplete ? 'bg-[#2EE59D]' : 'bg-[#2EE59D]/70'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {isComplete && (
                <p className="text-[10px] text-[#2EE59D] font-medium mt-1 text-center">✓ Target reached!</p>
              )}
            </div>
          )
        })()}

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
                    : goal.targetUnit === 'steps'
                      ? 'Via Fitbit'
                      : goal.subdomain === 'Running' 
                        ? 'Via Strava' 
                        : 'Coming soon'
                },
                { 
                  label: 'Payout', 
                  desc: 'Winners split' 
                },
              ].map((step, i) => (
                <div key={i} className="flex-1 flex flex-col items-center min-w-0">
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
                  <p className={`text-[10px] font-semibold text-center leading-tight ${i <= currentPhaseStep ? 'text-[var(--foreground)]' : 'text-[var(--text-secondary)]'}`}>
                    {step.label}
                  </p>
                  <p className="text-[8px] text-[var(--text-secondary)] text-center leading-tight px-0.5">{step.desc}</p>
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
          <div className="relative flex items-center gap-2">
            <button 
              ref={playersButtonRef}
              type="button"
              onClick={(e) => { 
                e.preventDefault()
                e.stopPropagation()
                const shouldShow = !showPlayers
                if (shouldShow && playersButtonRef.current) {
                  const rect = playersButtonRef.current.getBoundingClientRect()
                  setDropdownPos({ top: rect.bottom + 4, left: rect.right - 280, width: 280 })
                }
                setShowPlayers(shouldShow)
                // Auto-fetch leaderboard for steps goals when opening
                if (shouldShow && isStepsGoal && leaderboardData.length === 0 && (participants > 0 || hasJoined)) {
                  fetchLeaderboard()
                }
              }}
              disabled={participants === 0 && !hasJoined}
              className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] py-1 px-3 transition-colors select-none touch-manipulation ${
                participants > 0 || hasJoined ? 'hover:border-[#2EE59D]/50 cursor-pointer' : 'opacity-60 cursor-default'
              }`}
            >
              <span className="text-[11px] font-medium text-[var(--foreground)]">
                {participants === 0 ? '0' : participants.toLocaleString()} {participants === 1 ? 'player' : 'players'}
              </span>
              <span className={`text-[var(--text-secondary)] text-xs transition-transform duration-150 ${showPlayers ? 'rotate-90' : ''}`}>›</span>
            </button>
          
          {/* Players dropdown - rendered via portal to escape grid stacking */}
          {showPlayers && (participants > 0 || hasJoined) && typeof document !== 'undefined' && createPortal(
            <div 
              ref={playersDropdownRef}
              className="fixed bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 shadow-xl"
              style={{ top: dropdownPos.top, left: Math.max(16, dropdownPos.left), width: dropdownPos.width, zIndex: 9999 }}
            >
              {/* Header with refresh for steps goals */}
              {isStepsGoal && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--foreground)]">Leaderboard</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); fetchLeaderboard() }}
                    disabled={leaderboardLoading}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-[#2EE59D] bg-[#2EE59D]/10 rounded-full hover:bg-[#2EE59D]/20 transition-all disabled:opacity-50"
                  >
                    <svg className={`w-3 h-3 ${leaderboardLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {leaderboardLoading ? '' : 'Refresh'}
                  </button>
                </div>
              )}
              
              {leaderboardError && (
                <p className="text-[10px] text-red-500 mb-2">{leaderboardError}</p>
              )}
              
              {/* Loading state for steps goals */}
              {isStepsGoal && leaderboardLoading && leaderboardData.length === 0 ? (
                <div className="py-4 text-center">
                  <div className="w-5 h-5 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-[10px] text-[var(--text-secondary)] mt-2">Fetching steps...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Sort by steps if we have leaderboard data, otherwise show player list */}
                  {(isStepsGoal && leaderboardData.length > 0
                    ? leaderboardData
                    : playerList.map(p => ({ address: p.address, stake: p.stake, steps: 0, name: playerProfiles[p.address.toLowerCase()] }))
                  ).map((p, i) => (
                    <div key={i} className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${
                      i === 0 && isStepsGoal && leaderboardData.length > 0 ? 'bg-[#2EE59D]/10' : 'hover:bg-[var(--background)]'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {isStepsGoal && leaderboardData.length > 0 && (
                          <span className={`text-xs font-bold flex-shrink-0 ${i === 0 ? 'text-[#2EE59D]' : 'text-[var(--text-secondary)]'}`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--text-secondary)] truncate">
                          {p.name || playerProfiles[p.address.toLowerCase()] || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
                        </span>
                        <UserRepBadge address={p.address as `0x${string}`} />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isStepsGoal && leaderboardData.length > 0 && (
                          <span className={`text-[11px] font-bold ${p.steps >= goal.targetMiles ? 'text-[#2EE59D]' : 'text-[var(--foreground)]'}`}>
                            {p.steps.toLocaleString()}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-[#2EE59D]">${p.stake}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Target footer for steps goals - always show */}
              {isStepsGoal && (
                <div className="mt-2 pt-2 border-t border-[var(--border)]">
                  <p className="text-[9px] text-[var(--text-secondary)] text-center">
                    Target: {goal.targetMiles.toLocaleString()} steps
                  </p>
                </div>
              )}
            </div>,
            document.body
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
                onClick={async (e) => {
                  e.stopPropagation()
                  if (isWrongNetwork) {
                    try {
                      await switchChain({ chainId: base.id })
                    } catch {
                      alert('Please switch to Base network to claim')
                    }
                    return
                  }
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
                {isWrongNetwork ? 'Switch to Base ⚠️' : isClaimConfirming ? 'Claiming...' : isClaimPending ? 'Confirm in wallet...' : isClaimSuccess ? 'Claimed! 🎉' : 'Claim Winnings 💰'}
              </button>
            ) : isWrongNetwork && isSettled && hasJoined && userWon && !userClaimed ? (
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  try {
                    await switchChain({ chainId: base.id })
                  } catch {
                    alert('Please switch to Base network in your wallet to claim')
                  }
                }}
                className="w-full py-3 text-sm font-bold rounded-xl transition-all duration-150 bg-amber-500 text-black hover:bg-amber-400 active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                Switch to Base to Claim ⚠️
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
                  if (hasJoined) return
                  // Allow expanding even for preview goals (onChainId undefined)
                  if (!entryOpen && goal.onChainId !== undefined) return
                  authenticated ? setExpanded(true) : login()
                }}
                disabled={hasJoined || (!entryOpen && goal.onChainId !== undefined)}
                className={`w-full py-3 text-sm font-bold rounded-xl transition-all duration-150 ${
                  hasJoined
                    ? 'bg-[#2EE59D]/20 text-[#2EE59D] cursor-default border border-[#2EE59D]/30'
                    : goal.onChainId === undefined
                    ? 'bg-[#2EE59D] text-white hover:bg-[#26c987] active:scale-[0.98] shadow-sm hover:shadow-md'
                    : !entryOpen
                    ? 'bg-[var(--border)] text-[var(--text-secondary)] cursor-not-allowed'
                    : 'bg-[#2EE59D] text-white hover:bg-[#26c987] active:scale-[0.98] shadow-sm hover:shadow-md'
                }`}
              >
                {hasJoined 
                  ? `Joined ✓ · $${userStake || justStakedAmount || stakeAmount}` 
                  : goal.onChainId === undefined 
                  ? `Stake $${goal.minStake}` 
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
              isPreview={goal.onChainId === undefined}
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
  const isFixedStake = goal.minStake === goal.maxStake
  
  // Fixed stake mode - clean single display
  if (isFixedStake) {
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm text-[var(--text-secondary)]">Stake:</span>
            <span className="text-lg font-semibold text-[#2EE59D]">${goal.minStake}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm text-[var(--text-secondary)]">Balance:</span>
            <span className="text-lg font-semibold">${balanceNum.toFixed(2)}</span>
          </div>
        </div>
      </div>
    )
  }
  
  // Variable stake mode - show selector
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
      // Steps goal - check if already connected
      if (fitbitConnected) {
        // Already connected - show connected state
        return (
          <div className="mb-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="p-2.5 rounded-xl bg-[#00B0B9]/10 border border-[#00B0B9]/20 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm">⌚</span>
                <p className="text-xs text-[#00B0B9] font-medium">✓ Fitbit Connected</p>
              </div>
            </div>
          </div>
        )
      }
      // Not connected - show connect button
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

function ActionButton({ stravaConnected, fitbitConnected, trackerConnected, isStepsGoal, hasTokenOnChain, hasBalance, isLoading, isWrongNetwork, isStorePending, isStoreConfirming, stakeAmount, onClick, isPreview }: {
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
  isPreview?: boolean
}) {
  // Disable only when insufficient balance, loading, or preview mode
  const disabled = isLoading || !hasBalance || isPreview
  
  const getLabel = () => {
    if (isPreview) return '🚀 Coming Soon'
    if (!hasBalance) return 'Insufficient USDC'
    if (isLoading) return 'Processing...'
    if (isWrongNetwork) return '⚠️ Switch to Base'
    if (isStorePending || isStoreConfirming) return 'Verifying...'
    return `Stake $${stakeAmount}`
  }

  const getStyle = () => {
    if (isPreview) return 'bg-gradient-to-r from-[#2EE59D]/80 to-[#26c987]/80 text-white cursor-not-allowed opacity-90'
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
