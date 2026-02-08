'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
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

// Modal shown to first-time users after sign-in
export function OnboardingCommitment({ onComplete }: OnboardingCommitmentProps) {
  const { user } = usePrivy()
  const { address } = useAccount()
  const contracts = useContracts()
  const [step, setStep] = useState<'intro' | 'approve' | 'join' | 'done'>('intro')
  const [error, setError] = useState<string | null>(null)

  // Check if contract is deployed (address is not zero)
  const isContractDeployed = contracts.newUserChallenge !== '0x0000000000000000000000000000000000000000'

  // Check if user already joined
  const { data: hasJoined } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'hasJoinedChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isContractDeployed },
  })

  // Get stake amount from contract
  const { data: stakeAmount } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'stakeAmount',
    query: { enabled: isContractDeployed },
  })

  // Check USDC allowance
  const { data: allowance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, contracts.newUserChallenge] : undefined,
    query: { enabled: !!address && isContractDeployed },
  })

  // Contract writes
  const { writeContract: approve, data: approveTxHash } = useWriteContract()
  const { writeContract: join, data: joinTxHash } = useWriteContract()

  // Wait for transactions
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  })
  const { isLoading: isJoining, isSuccess: joinSuccess } = useWaitForTransactionReceipt({
    hash: joinTxHash,
  })

  // Handle approve success
  useEffect(() => {
    if (approveSuccess) {
      setStep('join')
    }
  }, [approveSuccess])

  // Handle join success
  useEffect(() => {
    if (joinSuccess) {
      setStep('done')
      markOnboarded()
      setTimeout(() => {
        onComplete()
        // Scroll to goals
        const element = document.getElementById('promises')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 2000)
    }
  }, [joinSuccess, onComplete])

  const handleCommit = async () => {
    if (!address || !stakeAmount) return
    setError(null)

    // If contract not deployed, fall back to localStorage-only flow
    if (!isContractDeployed) {
      markOnboarded()
      onComplete()
      setTimeout(() => {
        const element = document.getElementById('promises')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
      return
    }

    try {
      // Check if we need approval
      const stakeAmountBigInt = stakeAmount as bigint
      const allowanceBigInt = allowance as bigint | undefined
      const needsApproval = !allowanceBigInt || allowanceBigInt < stakeAmountBigInt

      if (needsApproval) {
        setStep('approve')
        approve({
          address: contracts.usdc,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [contracts.newUserChallenge, stakeAmountBigInt],
        })
      } else {
        // Already approved, go straight to join
        setStep('join')
        join({
          address: contracts.newUserChallenge,
          abi: NEW_USER_CHALLENGE_ABI,
          functionName: 'join',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
      setStep('intro')
    }
  }

  // If already approved, trigger join
  useEffect(() => {
    if (step === 'join' && !isJoining && !joinTxHash) {
      join({
        address: contracts.newUserChallenge,
        abi: NEW_USER_CHALLENGE_ABI,
        functionName: 'join',
      })
    }
  }, [step, isJoining, joinTxHash, join])

  // If user already joined, just close
  useEffect(() => {
    if (hasJoined) {
      markOnboarded()
      onComplete()
    }
  }, [hasJoined, onComplete])

  const stakeAmountFormatted = stakeAmount ? formatUnits(stakeAmount as bigint, 6) : '5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5">
          {step === 'done' ? (
            // Success state
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#2EE59D]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-xl font-bold mb-2">You're in!</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Now pick a goal to complete within 24 hours
              </p>
            </div>
          ) : (
            <>
              {/* Welcome header */}
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-[#2EE59D] flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-black text-3xl leading-none">v</span>
                </div>
                <h2 className="text-xl font-bold mb-1">Welcome to vaada</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-2">
                  The commitment market
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
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">
                    💰
                  </div>
                  <div>
                    <p className="text-sm font-medium">Stake money on your vaada</p>
                    <p className="text-xs text-[var(--text-secondary)]">Put $5-$50 on the line</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">
                    ✅
                  </div>
                  <div>
                    <p className="text-sm font-medium">Keep your vaada, keep your stake</p>
                    <p className="text-xs text-[var(--text-secondary)]">Auto-verified by oracles</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center text-lg flex-shrink-0">
                    🏆
                  </div>
                  <div>
                    <p className="text-sm font-medium">Earn from those who don't</p>
                    <p className="text-xs text-[var(--text-secondary)]">Winners split the pool from those who don't</p>
                  </div>
                </div>
              </div>

              {/* New User Challenge */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-[#2EE59D]/10 rounded-xl border border-[#2EE59D]/30">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="text-sm font-bold">New User Challenge</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Stake ${stakeAmountFormatted} • Join a goal within 24h or lose it
                  </p>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleCommit}
                disabled={isApproving || isJoining}
                className="w-full py-3 bg-[#2EE59D] text-white font-bold rounded-xl hover:bg-[#26c987] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Approving USDC...
                  </span>
                ) : isJoining ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining Challenge...
                  </span>
                ) : (
                  `Stake $${stakeAmountFormatted} — I'm In`
                )}
              </button>

              {/* Skip option for testing */}
              {!isContractDeployed && (
                <button
                  onClick={() => {
                    markOnboarded()
                    onComplete()
                  }}
                  className="w-full mt-2 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                >
                  Skip for now (contract not deployed)
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
  const { login, authenticated } = usePrivy()
  const { address } = useAccount()
  const contracts = useContracts()
  const [timeLeft, setTimeLeft] = useState('')

  // Check if contract is deployed
  const isContractDeployed = contracts.newUserChallenge !== '0x0000000000000000000000000000000000000000'

  // Get stats from contract
  const { data: stats } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'getStats',
    query: { enabled: isContractDeployed },
  })

  // Check if current user has joined
  const { data: hasJoined } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'hasJoinedChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isContractDeployed },
  })

  // Get user's challenge details
  const { data: challenge } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'getChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!hasJoined && isContractDeployed },
  })

  // Calculate time left for user's challenge
  useEffect(() => {
    if (!challenge) {
      // Default: time until midnight UTC
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
      // User has a challenge, show their deadline
      const challengeData = challenge as [bigint, bigint, boolean, boolean, boolean]
      const deadline = Number(challengeData[1]) * 1000 // Convert to ms
      const updateTime = () => {
        const now = Date.now()
        const diff = deadline - now
        if (diff <= 0) {
          setTimeLeft('Expired')
          return
        }
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setTimeLeft(`${hours}h ${minutes}m`)
      }
      updateTime()
      const interval = setInterval(updateTime, 60000)
      return () => clearInterval(interval)
    }
  }, [challenge])

  const handleJoin = () => {
    if (!authenticated) {
      login()
      return
    }
    // Scroll to show the onboarding modal will appear
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Stats from contract or defaults
  const statsData = stats as [bigint, bigint, bigint, bigint] | undefined
  const totalChallenges = statsData ? Number(statsData[0]) : 0
  const totalWon = statsData ? Number(statsData[1]) : 0
  const pendingCount = statsData ? totalChallenges - totalWon - Number(statsData[2]) : 0

  return (
    <div className="bg-gradient-to-br from-[#2EE59D]/10 via-[#2EE59D]/5 to-transparent border border-[#2EE59D]/30 rounded-2xl p-5 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#2EE59D]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <div className="relative">
        {/* Top row: Badge + Timer */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold px-3 py-2 rounded-xl bg-[#2EE59D] text-white uppercase tracking-wide">
            New User Challenge
          </span>
          <span className="text-xs font-bold px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EE59D] animate-pulse" />
            {timeLeft} left
          </span>
        </div>
        
        {/* Main content row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2EE59D]/20 to-[#2EE59D]/10 flex items-center justify-center text-2xl flex-shrink-0 border border-[#2EE59D]/20">
            🚀
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base leading-tight">24-Hour Commitment</h3>
            <p className="text-xs text-[var(--text-secondary)]">Stake $5 • Join a goal within 24h or lose it</p>
          </div>
        </div>
        
        {/* Stats + CTA row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-[#2EE59D]">{pendingCount || totalChallenges}</span>
              <span className="text-xs text-[var(--text-secondary)]">active</span>
            </div>
            <span className="text-[var(--border)]">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-secondary)]">From</span>
              <span className="text-xs font-bold text-[#2EE59D]">$5</span>
            </div>
          </div>
          
          {hasJoined ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#2EE59D]/15 rounded-xl text-[#2EE59D] font-bold text-xs border border-[#2EE59D]/30">
              <span>✓</span>
              <span>You're in!</span>
            </div>
          ) : (
            <button
              onClick={handleJoin}
              className="px-3 py-2 bg-[#2EE59D] text-white font-bold text-xs rounded-xl 
                hover:bg-[#26c987] hover:shadow-lg hover:shadow-[#2EE59D]/25 hover:-translate-y-0.5
                active:translate-y-0 transition-all"
            >
              Take the challenge →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
