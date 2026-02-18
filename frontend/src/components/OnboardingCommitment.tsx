'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy, useFundWallet } from '@privy-io/react-auth'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { useSponsoredWrite } from '@/lib/useSponsoredWrite'
import { base } from 'wagmi/chains'
import { formatUnits, maxUint256 } from 'viem'
import { NEW_USER_CHALLENGE_ABI, USDC_ABI } from '@/lib/abis'
import { useContracts } from '@/lib/hooks'
import { analytics } from '@/lib/analytics'

// Check if this is a first-time user (never completed onboarding)
export function isFirstTimeUser(): boolean {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem('vaada_onboarded')
}

// Mark user as onboarded (completed first-time flow)
export function markOnboarded() {
  localStorage.setItem('vaada_onboarded', 'true')
}

interface OnboardingCommitmentProps {
  onComplete: () => void
}

// Streamlined single-screen onboarding modal
export function OnboardingCommitment({ onComplete }: OnboardingCommitmentProps) {
  const { user, logout } = usePrivy()
  const { fundWallet } = useFundWallet()
  const { address } = useAccount()
  const contracts = useContracts()
  const { chain } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [phase, setPhase] = useState<'ready' | 'switching' | 'approving' | 'joining' | 'done'>('ready')
  const [error, setError] = useState<string | null>(null)
  
  const isWrongNetwork = !chain || chain.id !== base.id
  const isContractDeployed = contracts.newUserChallenge !== '0x0000000000000000000000000000000000000000'

  // Contract reads
  const { data: hasJoined } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'hasJoinedChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isContractDeployed, refetchInterval: 3000 },
  })

  const { data: stakeAmount } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'stakeAmount',
    query: { enabled: isContractDeployed },
  })

  // Gas is sponsored via Privy — no ETH needed

  const { data: usdcBalance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 3000 }, // Poll every 3s to detect incoming funds
  })

  const { data: allowance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, contracts.newUserChallenge] : undefined,
    query: { enabled: !!address && isContractDeployed },
  })

  const hasEnoughUSDC = usdcBalance !== undefined && stakeAmount !== undefined && 
    (usdcBalance as bigint) >= (stakeAmount as bigint)
  const canStake = hasEnoughUSDC
  const needsApproval = !allowance || (allowance as bigint) < (stakeAmount as bigint || BigInt(0))

  // Contract writes
  const { writeContract: approve, data: approveTxHash, error: approveError } = useSponsoredWrite()
  const { writeContract: join, data: joinTxHash, error: joinError } = useSponsoredWrite()

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash })
  const { isLoading: isJoining, isSuccess: joinSuccess } = useWaitForTransactionReceipt({ hash: joinTxHash })

  // Auto-advance: approve success → join
  useEffect(() => {
    if (approveSuccess && phase === 'approving') {
      setPhase('joining')
      join({
        address: contracts.newUserChallenge,
        abi: NEW_USER_CHALLENGE_ABI,
        functionName: 'join',
      })
    }
  }, [approveSuccess, phase])

  // Auto-advance: join success → done
  useEffect(() => {
    if (joinSuccess) {
      setPhase('done')
      markOnboarded()
      analytics.challengeJoined(Number(stakeAmountFormatted))
      analytics.onboardingCompleted(Number(stakeAmountFormatted))
      setTimeout(() => {
        onComplete()
        const element = document.getElementById('promises')
        if (element) element.scrollIntoView({ behavior: 'smooth' })
      }, 2000)
    }
  }, [joinSuccess, onComplete])

  // Handle errors
  useEffect(() => {
    if (approveError) {
      setError('Approval failed. Please try again.')
      setPhase('ready')
    }
    if (joinError) {
      setError('Join failed. Please try again.')
      setPhase('ready')
    }
  }, [approveError, joinError])

  // If user already joined, just close
  useEffect(() => {
    if (hasJoined) {
      markOnboarded()
      onComplete()
    }
  }, [hasJoined, onComplete])

  // Auto-switch network when wrong
  useEffect(() => {
    if (isWrongNetwork && phase === 'switching') {
      switchChain({ chainId: base.id })
    }
  }, [isWrongNetwork, phase])

  // After network switch succeeds, continue flow
  useEffect(() => {
    if (!isWrongNetwork && phase === 'switching') {
      handleCommitFlow()
    }
  }, [isWrongNetwork, phase])

  // Auto-advance: when USDC arrives (e.g. via Coinbase Onramp, transfer), start the stake flow
  const [waitingForFunds, setWaitingForFunds] = useState(false)
  useEffect(() => {
    if (hasEnoughUSDC && waitingForFunds && phase === 'ready') {
      setWaitingForFunds(false)
      setError(null)
      // Small delay so user sees their balance update before tx fires
      setTimeout(() => handleCommitFlow(), 500)
    }
  }, [hasEnoughUSDC, waitingForFunds, phase])

  const stakeAmountFormatted = stakeAmount ? formatUnits(stakeAmount as bigint, 6) : '5'

  // One-click commit: handles network switch → approve → join automatically
  const handleCommitFlow = useCallback(async () => {
    if (!address || !stakeAmount) return
    setError(null)

    // If contract not deployed, fall back to localStorage-only
    if (!isContractDeployed) {
      markOnboarded()
      onComplete()
      return
    }

    // Step 1: Auto-switch network if needed
    if (isWrongNetwork) {
      setPhase('switching')
      analytics.networkSwitchStarted()
      return // useEffect will continue after switch
    }

    // Step 2: Check USDC balance (gas is sponsored — no ETH needed)
    if (!hasEnoughUSDC) {
      setError(`You need $${stakeAmountFormatted} USDC on Base. Tap "Fund Wallet" below.`)
      setWaitingForFunds(true) // Will auto-advance when funds arrive
      return
    }

    try {
      if (needsApproval) {
        // Use max approval so they never need to approve again
        setPhase('approving')
        analytics.approveStarted(Number(stakeAmountFormatted))
        approve({
          address: contracts.usdc,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [contracts.newUserChallenge, maxUint256],
        })
      } else {
        // Already approved — go straight to join
        setPhase('joining')
        join({
          address: contracts.newUserChallenge,
          abi: NEW_USER_CHALLENGE_ABI,
          functionName: 'join',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
      setPhase('ready')
    }
  }, [address, stakeAmount, isContractDeployed, isWrongNetwork, hasEnoughUSDC, needsApproval, contracts, stakeAmountFormatted])

  const [showFundLinks, setShowFundLinks] = useState(false)

  const handleFundWallet = async () => {
    if (!address) return
    analytics.onboardingFundWalletClicked()
    setWaitingForFunds(true) // Start watching for incoming funds
    try {
      await fundWallet({ address, options: { chain: base } })
    } catch {
      // Privy fund modal not configured or user closed — show fallback links
      setShowFundLinks(true)
    }
  }

  // Progress steps for the indicator
  const steps = [
    { label: 'Start', done: !isWrongNetwork, active: phase === 'switching' },
    { label: 'Approve', done: approveSuccess || !needsApproval, active: phase === 'approving' },
    { label: 'Join', done: joinSuccess, active: phase === 'joining' },
  ]

  const isProcessing = phase !== 'ready' && phase !== 'done'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-[var(--background)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl w-full max-w-sm animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {phase === 'done' ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[#2EE59D]/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-xl font-bold mb-2">You&apos;re in!</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Now join any goal within 24h to get your ${stakeAmountFormatted} back
              </p>
            </div>
          ) : (
            <>
              {/* Welcome header */}
              <div className="text-center mb-3">
                <img src="/vaada-v.png" alt="Vaada" className="w-12 h-12 mx-auto mb-2" />
                <h2 className="text-xl font-bold mb-0.5">Welcome to Vaada</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Keep Your Promise
                </p>
              </div>

              {/* How it works - compact */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 mb-3 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">💰</div>
                  <div>
                    <p className="text-sm font-medium">Make a promise</p>
                    <p className="text-xs text-[var(--text-secondary)]">Stake $$$ on your promise</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">✅</div>
                  <div>
                    <p className="text-sm font-medium">Keep your promise</p>
                    <p className="text-xs text-[var(--text-secondary)]">We verify automatically</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">🏆</div>
                  <div>
                    <p className="text-sm font-medium">Earn from your promise</p>
                    <p className="text-xs text-[var(--text-secondary)]">Keep stake + earn from those who don&apos;t</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">🧾</div>
                  <div>
                    <p className="text-sm font-medium">Own your promise</p>
                    <p className="text-xs text-[var(--text-secondary)]">Every promise recorded onchain forever</p>
                  </div>
                </div>
              </div>

              {/* New User Challenge */}
              <div className="mb-3 p-3 bg-[#2EE59D]/10 rounded-xl border border-[#2EE59D]/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⏰</span>
                  <p className="text-sm font-bold">Your First Promise</p>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  By joining Vaada, you&apos;re making your first promise.
                </p>
                <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                  <p>1. Stake ${stakeAmountFormatted} to join</p>
                  <p>2. Join a goal within 24h → get your ${stakeAmountFormatted} back</p>
                  <p>3. Miss the deadline → your ${stakeAmountFormatted} is gone</p>
                </div>
              </div>

              {/* Progress bar - only shown when processing */}
              {isProcessing && (
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    {steps.map((s, i) => (
                      <div key={s.label} className="flex items-center gap-1.5 text-xs">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          s.done ? 'bg-[#2EE59D] text-white' : 
                          s.active ? 'bg-[#2EE59D]/20 text-[#2EE59D] border-2 border-[#2EE59D]' : 
                          'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'
                        }`}>
                          {s.done ? '✓' : s.active ? (
                            <span className="w-2.5 h-2.5 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" />
                          ) : i + 1}
                        </div>
                        <span className={s.done ? 'text-[#2EE59D]' : s.active ? 'text-[var(--foreground)] font-medium' : 'text-[var(--text-secondary)]'}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div className={`h-full bg-[#2EE59D] rounded-full transition-all duration-500 ${
                      phase === 'switching' ? 'w-1/6' :
                      phase === 'approving' ? 'w-2/6' :
                      phase === 'joining' ? 'w-4/6' : 'w-0'
                    }`} />
                  </div>
                </div>
              )}

              {/* Waiting for funds indicator */}
              {waitingForFunds && !hasEnoughUSDC && phase === 'ready' && (
                <div className="mb-4 p-3 bg-[#2EE59D]/10 border border-[#2EE59D]/30 rounded-xl flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <p className="text-sm text-[#2EE59D]">Waiting for funds — will auto-continue when USDC arrives</p>
                </div>
              )}

              {/* Error message */}
              {error && !waitingForFunds && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Balance indicator */}
              {address && (
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-[var(--text-secondary)]">Your balance</span>
                  <span className={`text-sm font-semibold ${canStake ? 'text-[#2EE59D]' : 'text-red-400'}`}>
                    {usdcBalance !== undefined 
                      ? `$${Number(formatUnits(usdcBalance as bigint, 6)).toFixed(2)} USDC` 
                      : 'Loading...'}
                  </span>
                </div>
              )}

              {/* Single CTA button */}
              <button
                onClick={canStake ? handleCommitFlow : handleFundWallet}
                disabled={isProcessing}
                className={`w-full py-3 font-bold rounded-xl transition-all disabled:cursor-not-allowed ${
                  isProcessing
                    ? 'bg-[#2EE59D]/50 text-white'
                    : canStake
                      ? 'bg-[#2EE59D] text-white hover:bg-[#26c987] hover:shadow-lg hover:shadow-[#2EE59D]/25 active:scale-[0.98]'
                      : 'bg-[#2EE59D] text-white hover:bg-[#26c987] active:scale-[0.98]'
                }`}
              >
                {phase === 'switching' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Setting up...
                  </span>
                ) : phase === 'approving' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Approving USDC...
                  </span>
                ) : phase === 'joining' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </span>
                ) : canStake ? (
                  `Stake $${stakeAmountFormatted} — I'm In`
                ) : (
                  '💰 Fund Wallet to Continue'
                )}
              </button>

              {/* Fallback fund links when Privy on-ramp not available */}
              {showFundLinks && !canStake && phase === 'ready' && (
                <div className="mt-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-2">
                  <p className="text-xs text-[var(--text-secondary)] text-center mb-2">Get USDC on Base:</p>
                  <div className="flex gap-2">
                    <a
                      href="https://www.coinbase.com/price/usdc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 text-center text-sm font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition-colors"
                    >
                      💵 Get USDC
                    </a>
                  </div>
                  {address && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(address); }}
                      className="w-full py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                    >
                      📋 Copy wallet: {address.slice(0, 8)}...{address.slice(-4)}
                    </button>
                  )}
                </div>
              )}

              {/* Not ready - log out and go home */}
              {!isProcessing && (
                <button
                  onClick={() => { logout(); onComplete(); }}
                  className="w-full mt-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                >
                  I&apos;m not ready yet
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Live 24-hour challenge card that shows on the main page
export function LiveChallengeCard() {
  const { address, isConnecting } = useAccount()
  const contracts = useContracts()
  const [timeLeft, setTimeLeft] = useState('')
  const [dismissed, setDismissed] = useState(false)

  const isContractDeployed = contracts.newUserChallenge !== '0x0000000000000000000000000000000000000000'

  const { data: stats } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'getStats',
    query: { enabled: isContractDeployed },
  })

  const { data: hasJoined } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'hasJoinedChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isContractDeployed, refetchInterval: 5000 },
  })

  const { data: challenge } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'getChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!hasJoined && isContractDeployed },
  })

  const challengeData = challenge as [bigint, bigint, boolean, boolean, boolean] | undefined
  const deadline = challengeData ? Number(challengeData[1]) * 1000 : 0
  const hasJoinedVaada = challengeData ? challengeData[2] : false
  const claimed = challengeData ? challengeData[3] : false
  const forfeited = challengeData ? challengeData[4] : false
  const isExpired = deadline > 0 && Date.now() > deadline
  const isCompleted = hasJoinedVaada || claimed
  const isFailed = isExpired && !isCompleted && !forfeited

  useEffect(() => {
    if (typeof window !== 'undefined' && address) {
      const dismissKey = `vaada_challenge_dismissed_${address}`
      if (localStorage.getItem(dismissKey)) setDismissed(true)
    }
  }, [address])

  useEffect(() => {
    if (!challenge) {
      // Before joining: always show 24h (countdown starts when they join)
      setTimeLeft('24h 0m')
      return
    }
    // After joining: count down from their personal deadline
    const updateTime = () => {
      const now = Date.now()
      const diff = deadline - now
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setTimeLeft(`${hours}h ${minutes}m`)
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [challenge, deadline])

  const handleDismiss = () => {
    if (address) localStorage.setItem(`vaada_challenge_dismissed_${address}`, 'true')
    setDismissed(true)
  }

  const statsData = stats as [bigint, bigint, bigint, bigint] | undefined
  const totalChallenges = statsData ? Number(statsData[0]) : 0
  const totalWon = statsData ? Number(statsData[1]) : 0

  if (dismissed) return null

  // Hide if not logged in
  if (!address) return null
  
  // Still connecting wallet or loading contract data — don't flash
  if (isConnecting || hasJoined === undefined) return null
  
  // User hasn't joined the new user challenge
  if (hasJoined === false) return null

  // Show win result (completed challenge — joined a goal in time)
  if (isCompleted) {
    // Check if they've already seen the win notification
    const seenKey = address ? `vaada_challenge_result_seen_${address}` : null
    if (seenKey && typeof window !== 'undefined' && localStorage.getItem(seenKey)) return null

    return (
      <div className="rounded-xl p-4 relative overflow-hidden max-w-sm mx-auto border bg-gradient-to-br from-[#2EE59D]/20 via-[#2EE59D]/10 to-transparent border-[#2EE59D]/50">
        <button
          onClick={() => {
            if (seenKey) localStorage.setItem(seenKey, 'true')
            handleDismiss()
          }}
          className="absolute top-2 right-2 p-1.5 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 bg-[#2EE59D]/20">
            <span className="text-2xl">🎉</span>
          </div>
          <h3 className="font-bold text-base mb-1">Promise Kept!</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            You joined a goal in time. Your $5 will be returned!
          </p>
        </div>
      </div>
    )
  }

  // Show fail result (expired without joining a goal)
  if (isExpired) {
    return (
      <div className="rounded-xl p-4 relative overflow-hidden max-w-sm mx-auto border bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/30">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 bg-red-500/20">
            <span className="text-2xl">😢</span>
          </div>
          <h3 className="font-bold text-base mb-1">Promise Broken</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            You didn&apos;t join a goal within 24h. Your $5 is gone. Promise broken.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#2EE59D]/10 via-[#2EE59D]/5 to-transparent border border-[#2EE59D]/30 rounded-xl p-4 relative overflow-hidden max-w-sm mx-auto">
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#2EE59D] text-white uppercase tracking-wide">
            New User Challenge
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EE59D] animate-pulse" />
            {timeLeft} left
          </span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2EE59D]/20 to-[#2EE59D]/10 flex items-center justify-center text-xl flex-shrink-0 border border-[#2EE59D]/20">
            🚀
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm leading-tight">New User Challenge</h3>
            <p className="text-xs text-[var(--text-secondary)]">Your first promise. Join one within 24h to keep your $5.</p>
          </div>
        </div>
        <div className="w-full flex items-center justify-center gap-2 py-2 bg-[#2EE59D]/15 rounded-xl text-[#2EE59D] font-bold text-sm border border-[#2EE59D]/30">
          <span>✓</span>
          <span>You're in — now join a promise to win!</span>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// PREVIEW MODE - For admin testing only
// ==========================================
export function OnboardingPreview({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'intro' | 'approve' | 'join' | 'done'>('intro')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-500 text-black text-sm font-bold rounded-full z-[60]">
        👁️ PREVIEW MODE — No transactions
      </div>
      
      <div 
        className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-5">
          {step === 'done' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#2EE59D]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-xl font-bold mb-2">You&apos;re in!</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Now join any goal within 24h to get your $5 back
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <img src="/vaada-v.png" alt="Vaada" className="w-14 h-14 mx-auto mb-3" />
                <h2 className="text-xl font-bold mb-1">Welcome to Vaada</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-2">Keep Your Promise</p>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">💰</div>
                  <div>
                    <p className="text-sm font-medium">Make a promise</p>
                    <p className="text-xs text-[var(--text-secondary)]">Stake $$$ on your promise</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">✅</div>
                  <div>
                    <p className="text-sm font-medium">Keep your promise</p>
                    <p className="text-xs text-[var(--text-secondary)]">We verify automatically</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">🏆</div>
                  <div>
                    <p className="text-sm font-medium">Earn from your promise</p>
                    <p className="text-xs text-[var(--text-secondary)]">Keep stake + earn from those who don&apos;t</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">🧾</div>
                  <div>
                    <p className="text-sm font-medium">Own your promise</p>
                    <p className="text-xs text-[var(--text-secondary)]">Every promise recorded onchain forever</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4 p-3 bg-[#2EE59D]/10 rounded-xl border border-[#2EE59D]/30">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="text-sm font-bold">New User Challenge</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    By signing up, you&apos;re making your first promise. If you don&apos;t join a goal within 24 hours, your $5 is gone. Ready?
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                {['intro', 'approve', 'join'].map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setStep(s as 'intro' | 'approve' | 'join')}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                      step === s 
                        ? 'bg-[#2EE59D]/10 border-[#2EE59D] text-[#2EE59D]' 
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[#2EE59D]/50'
                    }`}
                  >
                    {i + 1}. {s === 'intro' ? 'Start' : s === 'approve' ? 'Approve' : 'Join'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (step === 'intro') setStep('approve')
                  else if (step === 'approve') setStep('join')
                  else setStep('done')
                }}
                className="w-full py-3 font-bold rounded-xl bg-[#2EE59D] text-white hover:bg-[#26c987] transition-colors"
              >
                {step === 'intro' ? "Stake $5 — I'm In" : 
                 step === 'approve' ? (
                   <span className="flex items-center justify-center gap-2">
                     <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                     Approving USDC...
                   </span>
                 ) : (
                   <span className="flex items-center justify-center gap-2">
                     <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                     Joining Challenge...
                   </span>
                 )}
              </button>

              <button className="w-full mt-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface)] transition-colors">
                💰 I need to fund my wallet first
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
