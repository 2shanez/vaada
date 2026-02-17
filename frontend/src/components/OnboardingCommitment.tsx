'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy, useFundWallet } from '@privy-io/react-auth'
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi'
import { base } from 'wagmi/chains'
import { formatUnits, maxUint256 } from 'viem'
import { NEW_USER_CHALLENGE_ABI, USDC_ABI } from '@/lib/abis'
import { useContracts } from '@/lib/hooks'

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
  const { user } = usePrivy()
  const { fundWallet } = useFundWallet()
  const { address } = useAccount()
  const contracts = useContracts()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [phase, setPhase] = useState<'ready' | 'switching' | 'approving' | 'joining' | 'done'>('ready')
  const [error, setError] = useState<string | null>(null)
  
  const isWrongNetwork = chainId !== base.id
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

  const { data: ethBalance } = useBalance({ address })
  const hasEnoughGas = ethBalance && ethBalance.value > BigInt(0)

  const { data: usdcBalance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
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
  const canStake = hasEnoughUSDC && hasEnoughGas
  const needsApproval = !allowance || (allowance as bigint) < (stakeAmount as bigint || BigInt(0))

  // Contract writes
  const { writeContract: approve, data: approveTxHash, error: approveError } = useWriteContract()
  const { writeContract: join, data: joinTxHash, error: joinError } = useWriteContract()

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
      return // useEffect will continue after switch
    }

    // Step 2: Check balances
    if (!hasEnoughGas) {
      setError('You need ETH on Base for gas. Tap "Fund Wallet" below.')
      return
    }
    if (!hasEnoughUSDC) {
      setError(`You need $${stakeAmountFormatted} USDC on Base. Tap "Fund Wallet" below.`)
      return
    }

    try {
      if (needsApproval) {
        // Use max approval so they never need to approve again
        setPhase('approving')
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
  }, [address, stakeAmount, isContractDeployed, isWrongNetwork, hasEnoughGas, hasEnoughUSDC, needsApproval, contracts, stakeAmountFormatted])

  const [showFundLinks, setShowFundLinks] = useState(false)

  const handleFundWallet = async () => {
    if (!address) return
    try {
      await fundWallet({ address, options: { chain: base } })
    } catch {
      // Privy fund modal not configured or user closed — show fallback links
      setShowFundLinks(true)
    }
  }

  // Progress steps for the indicator
  const steps = [
    { label: 'Network', done: !isWrongNetwork, active: phase === 'switching' },
    { label: 'Approve', done: approveSuccess || !needsApproval, active: phase === 'approving' },
    { label: 'Join', done: joinSuccess, active: phase === 'joining' },
  ]

  const isProcessing = phase !== 'ready' && phase !== 'done'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-[var(--background)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {phase === 'ready' && (
          <button
            onClick={() => { markOnboarded(); onComplete(); }}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors z-10"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {phase === 'done' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#2EE59D]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-xl font-bold mb-2">You&apos;re in!</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Now join any goal within 24h to get your ${stakeAmountFormatted} back
              </p>
            </div>
          ) : (
            <>
              {/* Welcome header */}
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-[#2EE59D] flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-black text-3xl leading-none">v</span>
                </div>
                <h2 className="text-xl font-bold mb-1">Welcome to Vaada</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-2">
                  The promise market
                </p>
                <p className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--surface)] rounded-full border border-[var(--border)]">
                  <span className="font-semibold text-[#2EE59D]">vaada</span>
                  <span>=</span>
                  <span>promise</span>
                </p>
              </div>

              {/* How it works - compact */}
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
              </div>

              {/* New User Challenge */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-[#2EE59D]/10 rounded-xl border border-[#2EE59D]/30">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="text-sm font-bold">New User Challenge</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    By signing up, you&apos;re making your first promise. If you don&apos;t join a goal within 24 hours, your ${stakeAmountFormatted} will be split among those who did. Ready?
                  </p>
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

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
                    Switching to Base...
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
                  <p className="text-xs text-[var(--text-secondary)] text-center mb-2">Get USDC + ETH on Base:</p>
                  <div className="flex gap-2">
                    <a
                      href="https://www.coinbase.com/price/usdc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 text-center text-sm font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition-colors"
                    >
                      💵 Get USDC
                    </a>
                    <a
                      href="https://www.coinbase.com/price/ethereum"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 text-center text-sm font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition-colors"
                    >
                      ⛽ Get ETH
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Live 24-hour challenge card that shows on the main page
export function LiveChallengeCard() {
  const { address } = useAccount()
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
      const updateTime = () => {
        const now = new Date()
        const midnight = new Date(now)
        midnight.setUTCHours(24, 0, 0, 0)
        const diff = midnight.getTime() - now.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setTimeLeft(`${hours}h ${minutes}m`)
      }
      updateTime()
      const interval = setInterval(updateTime, 60000)
      return () => clearInterval(interval)
    } else {
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
    }
  }, [challenge, deadline])

  const handleDismiss = () => {
    if (address) localStorage.setItem(`vaada_challenge_dismissed_${address}`, 'true')
    setDismissed(true)
  }

  const statsData = stats as [bigint, bigint, bigint, bigint] | undefined
  const totalChallenges = statsData ? Number(statsData[0]) : 0
  const totalWon = statsData ? Number(statsData[1]) : 0

  if (dismissed) return null

  // Hide if user hasn't joined the challenge (not a new user, or not logged in)
  if (!hasJoined) return null

  // Hide if challenge is completed (joined a goal) or already claimed
  if (isCompleted || claimed) return null

  // Show result state (expired challenge — they failed)
  if (isExpired && hasJoined) {
    return (
      <div className={`rounded-xl p-4 relative overflow-hidden max-w-sm mx-auto border ${
        isCompleted 
          ? 'bg-gradient-to-br from-[#2EE59D]/20 via-[#2EE59D]/10 to-transparent border-[#2EE59D]/50' 
          : 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/30'
      }`}>
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
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
            isCompleted ? 'bg-[#2EE59D]/20' : 'bg-red-500/20'
          }`}>
            <span className="text-2xl">{isCompleted ? '🎉' : '😢'}</span>
          </div>
          <h3 className="font-bold text-base mb-1">
            {isCompleted ? 'Challenge Complete!' : 'Challenge Failed'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {isCompleted 
              ? 'You joined a goal in time. Your $5 will be returned!' 
              : 'You didn\'t join a goal within 24h. Your $5 was split among those who did.'
            }
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
            <p className="text-xs text-[var(--text-secondary)]">Your first promise. Join a goal within 24h or your $5 goes to those who did.</p>
          </div>
        </div>
        <div className="w-full flex items-center justify-center gap-2 py-2 bg-[#2EE59D]/15 rounded-xl text-[#2EE59D] font-bold text-sm border border-[#2EE59D]/30">
          <span>✓</span>
          <span>Challenge accepted — join a goal to win!</span>
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
              <button onClick={() => setStep('intro')} className="mt-4 text-sm text-[#2EE59D] hover:underline">
                ← Back to start
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-[#2EE59D] flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-black text-3xl leading-none">v</span>
                </div>
                <h2 className="text-xl font-bold mb-1">Welcome to Vaada</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-2">The promise market</p>
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
              </div>

              <div className="flex items-center gap-3 mb-4 p-3 bg-[#2EE59D]/10 rounded-xl border border-[#2EE59D]/30">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="text-sm font-bold">New User Challenge</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    By signing up, you&apos;re making your first promise. If you don&apos;t join a goal within 24 hours, your $5 will be split among those who did. Ready?
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
