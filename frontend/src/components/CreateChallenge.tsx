'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { getStravaAuthUrl, isStravaConnected, getStravaAthleteId } from '@/lib/strava'
import { CONTRACTS } from '@/lib/wagmi'
import { baseSepolia } from 'wagmi/chains'

// ABIs (minimal)
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

export function CreateChallenge() {
  const { address } = useAccount()
  const chainId = useChainId()
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS] || CONTRACTS[baseSepolia.id]
  
  const [targetMiles, setTargetMiles] = useState('20')
  const [stakeAmount, setStakeAmount] = useState('100')
  const [duration, setDuration] = useState('7') // days
  const [stravaConnected, setStravaConnected] = useState(false)
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'approving' | 'creating' | 'done'>('idle')

  // Check Strava connection
  useEffect(() => {
    setStravaConnected(isStravaConnected())
    setAthleteId(getStravaAthleteId())
  }, [])

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
  const { 
    writeContract: writeApprove, 
    data: approveHash, 
    isPending: isApprovePending,
    reset: resetApprove 
  } = useWriteContract()
  
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ 
    hash: approveHash 
  })

  // Create Challenge
  const { 
    writeContract: writeCreate, 
    data: createHash, 
    isPending: isCreatePending,
    reset: resetCreate
  } = useWriteContract()
  
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ 
    hash: createHash 
  })

  // Handle approval success
  useEffect(() => {
    if (isApproveSuccess && step === 'approving') {
      refetchAllowance()
      setStep('creating')
      // Auto-proceed to create
      handleCreate()
    }
  }, [isApproveSuccess])

  // Handle create success
  useEffect(() => {
    if (isCreateSuccess && step === 'creating') {
      setStep('done')
    }
  }, [isCreateSuccess])

  const stakeAmountWei = parseUnits(stakeAmount, 6) // USDC has 6 decimals
  const hasAllowance = allowance !== undefined && allowance >= stakeAmountWei
  const hasBalance = balance !== undefined && balance >= stakeAmountWei

  const handleStravaConnect = () => {
    const callbackUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/strava/callback`
      : 'http://localhost:3000/api/strava/callback'
    window.location.href = getStravaAuthUrl(callbackUrl)
  }

  const handleApprove = () => {
    setStep('approving')
    writeApprove({
      address: contracts.usdc,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [contracts.goalStake, stakeAmountWei],
    })
  }

  const handleCreate = () => {
    writeCreate({
      address: contracts.goalStake,
      abi: GOALSTAKE_ABI,
      functionName: 'createChallenge',
      args: [
        parseUnits(targetMiles, 18), // 1e18 = 1 mile
        stakeAmountWei,
        BigInt(Number(duration) * 24 * 60 * 60), // days to seconds
      ],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stravaConnected) {
      alert('Please connect Strava first!')
      return
    }

    if (!hasBalance) {
      alert(`Insufficient USDC balance. You need ${stakeAmount} USDC.`)
      return
    }

    if (!hasAllowance) {
      // Need to approve first
      handleApprove()
    } else {
      // Already approved, go straight to create
      setStep('creating')
      handleCreate()
    }
  }

  const handleReset = () => {
    setStep('idle')
    resetApprove()
    resetCreate()
    refetchAllowance()
  }

  const isLoading = isApprovePending || isApproveConfirming || isCreatePending || isCreateConfirming

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      {/* Target Miles */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Target Miles
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="5"
            max="100"
            value={targetMiles}
            onChange={(e) => setTargetMiles(e.target.value)}
            disabled={isLoading}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="text-2xl font-bold w-20 text-right">{targetMiles} mi</span>
        </div>
      </div>

      {/* Stake Amount */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Stake Amount (USDC)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            disabled={isLoading}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="text-2xl font-bold w-24 text-right">${stakeAmount}</span>
        </div>
        {balance !== undefined && (
          <p className="text-sm text-gray-500 mt-1">
            Balance: {formatUnits(balance, 6)} USDC
          </p>
        )}
      </div>

      {/* Duration */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Duration
        </label>
        <div className="grid grid-cols-4 gap-2">
          {['7', '14', '30', '90'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              disabled={isLoading}
              className={`py-2 px-4 rounded-lg text-sm font-medium transition ${
                duration === d
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Challenge</span>
          <span>Run {targetMiles} miles in {duration} days</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">At stake</span>
          <span>${stakeAmount} USDC</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Potential bonus</span>
          <span className="text-emerald-400">+ Loser pool share</span>
        </div>
      </div>

      {/* Strava Connection */}
      <div className={`rounded-lg p-4 mb-6 ${
        stravaConnected 
          ? 'bg-emerald-500/10 border border-emerald-500/30'
          : 'bg-orange-500/10 border border-orange-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏃</span>
          <div className="flex-1">
            {stravaConnected ? (
              <>
                <p className="font-medium text-emerald-400">Strava Connected</p>
                <p className="text-sm text-gray-400">Athlete ID: {athleteId}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-orange-400">Connect Strava</p>
                <p className="text-sm text-gray-400">Required to verify your runs</p>
              </>
            )}
          </div>
          {!stravaConnected && (
            <button
              type="button"
              onClick={handleStravaConnect}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Connect
            </button>
          )}
          {stravaConnected && (
            <span className="text-emerald-400">✓</span>
          )}
        </div>
      </div>

      {/* Progress Steps (shown when active) */}
      {step !== 'idle' && step !== 'done' && (
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
              step === 'approving' ? 'bg-emerald-500 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              {isApproveSuccess ? '✓' : '1'}
            </div>
            <div className="flex-1 h-1 bg-gray-600 rounded">
              <div className={`h-full bg-emerald-500 rounded transition-all ${
                isApproveSuccess ? 'w-full' : 'w-0'
              }`} />
            </div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
              step === 'creating' ? 'bg-emerald-500 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              {isCreateSuccess ? '✓' : '2'}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Approve USDC</span>
            <span>Create Challenge</span>
          </div>
        </div>
      )}

      {/* Submit / Status */}
      {step === 'done' ? (
        <div className="text-center">
          <div className="text-4xl mb-4">🎉</div>
          <p className="text-emerald-400 font-bold text-lg mb-4">Challenge Created!</p>
          <p className="text-gray-400 text-sm mb-4">
            Run {targetMiles} miles in {duration} days to win your stake back + bonus.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="text-emerald-400 underline text-sm"
          >
            Create another challenge
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={isLoading || !stravaConnected || !hasBalance}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition"
        >
          {!stravaConnected 
            ? 'Connect Strava First'
            : !hasBalance
              ? 'Insufficient USDC'
              : isApprovePending
                ? 'Approve in Wallet...'
                : isApproveConfirming
                  ? 'Approving...'
                  : isCreatePending
                    ? 'Confirm in Wallet...'
                    : isCreateConfirming
                      ? 'Creating Challenge...'
                      : !hasAllowance
                        ? `Approve & Stake $${stakeAmount}`
                        : `Stake $${stakeAmount}`
          }
        </button>
      )}
    </form>
  )
}
