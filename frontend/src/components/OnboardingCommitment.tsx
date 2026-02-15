'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi'
import { base } from 'wagmi/chains'
import { formatUnits } from 'viem'
import { NEW_USER_CHALLENGE_ABI, USDC_ABI } from '@/lib/abis'
import { useContracts } from '@/lib/hooks'
// Faucet removed - mainnet only

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

// Links to get mainnet USDC/ETH
const FUND_LINKS = {
  eth: 'https://www.coinbase.com/price/ethereum', // Buy ETH on Coinbase
  usdc: 'https://www.coinbase.com/price/usdc', // Buy USDC on Coinbase
  bridge: 'https://superbridge.app/base', // Bridge to Base
}

// Modal shown to first-time users after sign-in
export function OnboardingCommitment({ onComplete }: OnboardingCommitmentProps) {
  const { user } = usePrivy()
  const { address } = useAccount()
  const contracts = useContracts()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [step, setStep] = useState<'intro' | 'approve' | 'join' | 'done'>('intro')
  const [error, setError] = useState<string | null>(null)
  const [showFundModal, setShowFundModal] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const isWrongNetwork = chainId !== base.id

  // Check if contract is deployed (address is not zero)
  const isContractDeployed = contracts.newUserChallenge !== '0x0000000000000000000000000000000000000000'

  // Check if user already joined (refetch to catch state changes)
  const { data: hasJoined, refetch: refetchHasJoined } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'hasJoinedChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isContractDeployed, refetchInterval: 3000 },
  })

  // Get stake amount from contract
  const { data: stakeAmount } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'stakeAmount',
    query: { enabled: isContractDeployed },
  })

  // Check ETH balance (for gas)
  const { data: ethBalance } = useBalance({
    address: address,
  })
  const hasEnoughGas = ethBalance && ethBalance.value > BigInt(0)

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Check USDC allowance
  const { data: allowance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, contracts.newUserChallenge] : undefined,
    query: { enabled: !!address && isContractDeployed },
  })
  
  // Derived state
  const hasEnoughUSDC = usdcBalance !== undefined && stakeAmount !== undefined && 
    (usdcBalance as bigint) >= (stakeAmount as bigint)
  const canStake = hasEnoughUSDC && hasEnoughGas

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

    // Check balances first
    if (!hasEnoughGas) {
      setError('No ETH for gas fees. Fund your wallet first.')
      return
    }
    if (!hasEnoughUSDC) {
      setError(`Insufficient USDC balance. You need $${stakeAmountFormatted} USDC.`)
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
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Now join a vaada within 24h
              </p>
              <p className="text-xs text-[var(--text-secondary)] bg-[var(--surface)] rounded-lg px-3 py-2 inline-block">
                💰 Your ${stakeAmountFormatted} will be returned after verification
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
                    <p className="text-sm font-medium">Keep your promise, keep your stake</p>
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
                    Stake ${stakeAmountFormatted} • Join a vaada within 24h
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)]/70 mt-0.5">
                    ✓ Join → ${stakeAmountFormatted} returned after verification
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)]/70">
                    ✗ Don't join → ${stakeAmountFormatted} forfeited
                  </p>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Balance display */}
              <div className={`mb-3 p-3 rounded-xl text-sm ${
                canStake 
                  ? 'bg-[#2EE59D]/10 border border-[#2EE59D]/30' 
                  : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={hasEnoughGas ? 'text-[#2EE59D]' : 'text-orange-600 dark:text-orange-400'}>
                    {hasEnoughGas ? '✓' : '✗'} ETH (gas)
                  </span>
                  <span className={`font-mono text-xs ${hasEnoughGas ? 'text-[#2EE59D]' : 'text-orange-600 dark:text-orange-400'}`}>
                    {ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4) : '0'} ETH
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={hasEnoughUSDC ? 'text-[#2EE59D]' : 'text-orange-600 dark:text-orange-400'}>
                    {hasEnoughUSDC ? '✓' : '✗'} USDC (stake)
                  </span>
                  <span className={`font-mono text-xs ${hasEnoughUSDC ? 'text-[#2EE59D]' : 'text-orange-600 dark:text-orange-400'}`}>
                    ${usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0'} / ${stakeAmountFormatted}
                  </span>
                </div>
                {!canStake && (
                  <p className="text-xs text-center mt-2 text-orange-600 dark:text-orange-400">
                    Fund your wallet below ↓
                  </p>
                )}
              </div>

              {/* Wrong Network Warning */}
              {isWrongNetwork && (
                <button
                  onClick={() => switchChain({ chainId: base.id })}
                  disabled={isSwitching}
                  className="w-full py-3 mb-3 font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {isSwitching ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Switching...
                    </span>
                  ) : (
                    '⚠️ Switch to Base'
                  )}
                </button>
              )}

              {/* CTA */}
              <button
                onClick={handleCommit}
                disabled={isApproving || isJoining || !canStake || isWrongNetwork}
                className={`w-full py-3 font-bold rounded-xl transition-colors disabled:cursor-not-allowed ${
                  canStake && !isWrongNetwork
                    ? 'bg-[#2EE59D] text-white hover:bg-[#26c987] disabled:opacity-50' 
                    : 'bg-[var(--border)] text-[var(--text-secondary)]'
                }`}
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
                ) : isWrongNetwork ? (
                  'Switch network first ↑'
                ) : !canStake ? (
                  !hasEnoughGas ? 'Need ETH for gas' : 'Need USDC to stake'
                ) : (
                  `Stake $${stakeAmountFormatted} — I'm In`
                )}
              </button>

              {/* Fund wallet button */}
              <button
                onClick={() => setShowFundModal(true)}
                className="w-full mt-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface)] transition-colors"
              >
                💰 I need to fund my wallet first
              </button>

              {/* Fund Modal */}
              {showFundModal && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center sm:items-center">
                  <div 
                    className="absolute inset-0 bg-black/50"
                    onClick={() => setShowFundModal(false)}
                  />
                  <div className="relative bg-[var(--background)] rounded-t-2xl p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:rounded-2xl sm:max-w-sm sm:w-full sm:mx-4 sm:pb-4 animate-in slide-in-from-bottom duration-200">
                    <p className="text-base font-semibold mb-4 text-center">Get USDC on Base</p>
                    
                    <p className="text-sm text-[var(--text-secondary)] mb-4 text-center">
                      You need USDC on Base to stake. Here are some ways to get it:
                    </p>
                    
                    <a
                      href={FUND_LINKS.usdc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-2 active:scale-[0.98] transition-transform text-sm"
                    >
                      <span className="text-xl">💵</span>
                      <div>
                        <p className="font-medium">Buy USDC on Coinbase</p>
                      </div>
                      <svg className="w-4 h-4 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    
                    <a
                      href={FUND_LINKS.eth}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-2 active:scale-[0.98] transition-transform text-sm"
                    >
                      <span className="text-xl">⛽</span>
                      <div>
                        <p className="font-medium">Buy ETH on Coinbase</p>
                      </div>
                      <svg className="w-4 h-4 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (address) {
                          navigator.clipboard.writeText(address)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-4 rounded-xl border w-full active:scale-[0.98] transition-all ${
                        copied 
                          ? 'bg-[#2EE59D]/10 border-[#2EE59D]' 
                          : 'bg-[var(--surface)] border-[var(--border)]'
                      }`}
                    >
                      <span className="text-2xl">{copied ? '✅' : '📋'}</span>
                      <div className="text-left">
                        <p className={`font-medium ${copied ? 'text-[#2EE59D]' : ''}`}>
                          {copied ? 'Copied!' : 'Copy Wallet Address'}
                        </p>
                        {address && (
                          <p className="text-sm text-[var(--text-secondary)] font-mono">{address.slice(0, 10)}...{address.slice(-6)}</p>
                        )}
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setShowFundModal(false)}
                      className="w-full mt-4 px-4 py-3 bg-[#2EE59D] text-white font-bold rounded-xl active:scale-[0.98] transition-transform"
                    >
                      Done — Back to Challenge
                    </button>
                  </div>
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
  const { login, authenticated } = usePrivy()
  const { address } = useAccount()
  const contracts = useContracts()
  const [timeLeft, setTimeLeft] = useState('')
  const [dismissed, setDismissed] = useState(false)

  // Check if contract is deployed
  const isContractDeployed = contracts.newUserChallenge !== '0x0000000000000000000000000000000000000000'

  // Get stats from contract
  const { data: stats } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'getStats',
    query: { enabled: isContractDeployed },
  })

  // Check if current user has joined (refetch every 5s to catch updates)
  const { data: hasJoined, refetch: refetchHasJoined } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'hasJoinedChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isContractDeployed, refetchInterval: 5000 },
  })

  // Get user's challenge details
  const { data: challenge } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'getChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!hasJoined && isContractDeployed },
  })

  // Parse challenge data
  // Structure: [joinTime, deadline, hasJoinedVaada, claimed, forfeited]
  const challengeData = challenge as [bigint, bigint, boolean, boolean, boolean] | undefined
  const deadline = challengeData ? Number(challengeData[1]) * 1000 : 0
  const hasJoinedVaada = challengeData ? challengeData[2] : false
  const claimed = challengeData ? challengeData[3] : false
  const forfeited = challengeData ? challengeData[4] : false
  const isExpired = deadline > 0 && Date.now() > deadline
  const isCompleted = hasJoinedVaada || claimed
  const isFailed = isExpired && !isCompleted && !forfeited

  // Check localStorage for dismissed state
  useEffect(() => {
    if (typeof window !== 'undefined' && address) {
      const dismissKey = `vaada_challenge_dismissed_${address}`
      if (localStorage.getItem(dismissKey)) {
        setDismissed(true)
      }
    }
  }, [address])

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
      const updateTime = () => {
        const now = Date.now()
        const diff = deadline - now
        if (diff <= 0) {
          setTimeLeft('Ended')
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
  }, [challenge, deadline])

  const handleJoin = () => {
    if (!authenticated) {
      login()
      return
    }
    // Scroll to show the onboarding modal will appear
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDismiss = () => {
    if (address) {
      localStorage.setItem(`vaada_challenge_dismissed_${address}`, 'true')
    }
    setDismissed(true)
  }

  // Stats from contract or defaults
  const statsData = stats as [bigint, bigint, bigint, bigint] | undefined
  const totalChallenges = statsData ? Number(statsData[0]) : 0
  const totalWon = statsData ? Number(statsData[1]) : 0
  const pendingCount = statsData ? totalChallenges - totalWon - Number(statsData[2]) : 0

  // Don't show if dismissed
  if (dismissed) return null

  // Show result state (expired challenge)
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
              ? 'You joined a vaada in time. Your $5 will be returned!' 
              : 'You didn\'t join a vaada within 24h. $5 forfeited.'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#2EE59D]/10 via-[#2EE59D]/5 to-transparent border border-[#2EE59D]/30 rounded-xl p-4 relative overflow-hidden max-w-sm mx-auto">
      <div className="relative">
        {/* Top row: Badge + Timer */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#2EE59D] text-white uppercase tracking-wide">
            New User Challenge
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EE59D] animate-pulse" />
            {timeLeft} left
          </span>
        </div>
        
        {/* Content row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2EE59D]/20 to-[#2EE59D]/10 flex items-center justify-center text-xl flex-shrink-0 border border-[#2EE59D]/20">
            🚀
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm leading-tight">24-Hour Promise</h3>
            <p className="text-xs text-[var(--text-secondary)]">Join a vaada within 24h or lose your $5</p>
            <p className="text-[10px] text-[var(--text-secondary)]/70">Your $5 returns after 24h verification</p>
          </div>
        </div>
        
        {/* CTA */}
        {hasJoined ? (
          <div className="w-full flex items-center justify-center gap-2 py-2 bg-[#2EE59D]/15 rounded-xl text-[#2EE59D] font-bold text-sm border border-[#2EE59D]/30">
            <span>✓</span>
            <span>You're in!</span>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            className="w-full py-2.5 bg-[#2EE59D] text-white font-bold text-sm rounded-xl 
              hover:bg-[#26c987] hover:shadow-md hover:shadow-[#2EE59D]/25
              active:scale-[0.98] transition-all"
          >
            Take the challenge →
          </button>
        )}
      </div>
    </div>
  )
}
