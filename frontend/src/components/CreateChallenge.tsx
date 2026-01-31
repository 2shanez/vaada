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
  const [stakeAmount, setStakeAmount] = useState('10')
  const [durationValue, setDurationValue] = useState(1)
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months'>('weeks')
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
  const balanceNum = balance ? Number(formatUnits(balance, 6)) : 0

  // Calculate total days from duration
  const getDurationDays = () => {
    switch (durationUnit) {
      case 'days': return durationValue
      case 'weeks': return durationValue * 7
      case 'months': return durationValue * 30
    }
  }
  const durationDays = getDurationDays()

  // Format duration for display
  const formatDuration = () => {
    if (durationUnit === 'days') return `${durationValue} day${durationValue !== 1 ? 's' : ''}`
    if (durationUnit === 'weeks') return `${durationValue} week${durationValue !== 1 ? 's' : ''}`
    return `${durationValue} month${durationValue !== 1 ? 's' : ''}`
  }

  // Get max value for current unit
  const getMaxValue = () => {
    switch (durationUnit) {
      case 'days': return 90
      case 'weeks': return 12
      case 'months': return 3
    }
  }

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
        BigInt(durationDays * 24 * 60 * 60), // days to seconds
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

  // Calculate slider percentages for styling
  const milesPercent = (Number(targetMiles) / 100) * 100
  const stakePercent = (Number(stakeAmount) / 1000) * 100

  return (
    <form onSubmit={handleSubmit} className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-8 border border-gray-800 shadow-xl">
      {/* Target Miles */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            🎯 Target Miles
          </label>
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-4 py-2">
            <span className="text-3xl font-bold text-emerald-400">{targetMiles}</span>
            <span className="text-emerald-400/70 ml-1">mi</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 h-3 bg-gray-800 rounded-full" />
          <div 
            className="absolute h-3 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
            style={{ width: `${milesPercent}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={targetMiles}
            onChange={(e) => setTargetMiles(e.target.value)}
            disabled={isLoading}
            className="relative w-full h-3 bg-transparent rounded-full appearance-none cursor-pointer z-10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:border-4
              [&::-webkit-slider-thumb]:border-emerald-500
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>0 mi</span>
          <span>100 mi</span>
        </div>
      </div>

      {/* Stake Amount */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            💰 Stake Amount
          </label>
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl px-4 py-2">
            <span className="text-blue-400/70 mr-1">$</span>
            <span className="text-3xl font-bold text-blue-400">{stakeAmount}</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 h-3 bg-gray-800 rounded-full" />
          <div 
            className="absolute h-3 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
            style={{ width: `${stakePercent}%` }}
          />
          <input
            type="range"
            min="0"
            max="1000"
            step="1"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            disabled={isLoading}
            className="relative w-full h-3 bg-transparent rounded-full appearance-none cursor-pointer z-10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:border-4
              [&::-webkit-slider-thumb]:border-blue-500
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
        </div>
        <div className="flex justify-between items-center text-xs mt-2">
          <span className="text-gray-500">$0</span>
          <span className={`font-medium ${hasBalance ? 'text-emerald-400' : 'text-red-400'}`}>
            Balance: ${balanceNum.toFixed(2)}
          </span>
          <span className="text-gray-500">$1,000</span>
        </div>
      </div>

      {/* Duration */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            ⏱️ Duration
          </label>
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl px-4 py-2">
            <span className="text-3xl font-bold text-purple-400">{formatDuration()}</span>
            <span className="text-purple-400/50 ml-2 text-sm">({durationDays} days)</span>
          </div>
        </div>
        
        {/* Unit Selector */}
        <div className="flex bg-gray-800/50 rounded-xl p-1 mb-4">
          {(['days', 'weeks', 'months'] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => {
                setDurationUnit(unit)
                // Reset to 1 when changing units
                setDurationValue(1)
              }}
              disabled={isLoading}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                durationUnit === unit
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {unit.charAt(0).toUpperCase() + unit.slice(1)}
            </button>
          ))}
        </div>

        {/* Value Picker */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setDurationValue(Math.max(1, durationValue - 1))}
            disabled={isLoading || durationValue <= 1}
            className="w-12 h-12 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-2xl font-bold text-gray-300 transition-all"
          >
            −
          </button>
          <div className="flex-1 relative">
            <div className="absolute inset-0 h-3 bg-gray-800 rounded-full top-1/2 -translate-y-1/2" />
            <div 
              className="absolute h-3 bg-gradient-to-r from-purple-500 to-purple-400 rounded-full top-1/2 -translate-y-1/2 transition-all"
              style={{ width: `${((durationValue - 1) / (getMaxValue() - 1)) * 100}%` }}
            />
            <input
              type="range"
              min="1"
              max={getMaxValue()}
              value={durationValue}
              onChange={(e) => setDurationValue(Number(e.target.value))}
              disabled={isLoading}
              className="relative w-full h-3 bg-transparent rounded-full appearance-none cursor-pointer z-10
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-6
                [&::-webkit-slider-thumb]:h-6
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:border-4
                [&::-webkit-slider-thumb]:border-purple-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setDurationValue(Math.min(getMaxValue(), durationValue + 1))}
            disabled={isLoading || durationValue >= getMaxValue()}
            className="w-12 h-12 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-2xl font-bold text-gray-300 transition-all"
          >
            +
          </button>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>1 {durationUnit.slice(0, -1)}</span>
          <span>{getMaxValue()} {durationUnit}</span>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gray-800/30 backdrop-blur rounded-xl p-5 mb-6 border border-gray-700/50">
        <div className="text-center mb-4">
          <span className="text-gray-400 text-sm">Your Challenge</span>
          <h3 className="text-2xl font-bold mt-1">
            Run <span className="text-emerald-400">{targetMiles} miles</span> in <span className="text-purple-400">{formatDuration()}</span>
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase">At Stake</p>
            <p className="text-xl font-bold text-white">${stakeAmount}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase">Win Bonus</p>
            <p className="text-xl font-bold text-emerald-400">+Pool Share</p>
          </div>
        </div>
      </div>

      {/* Strava Connection */}
      <div className={`rounded-xl p-4 mb-6 transition-all ${
        stravaConnected 
          ? 'bg-emerald-500/10 border border-emerald-500/30'
          : 'bg-orange-500/10 border border-orange-500/30'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
            stravaConnected ? 'bg-emerald-500/20' : 'bg-orange-500/20'
          }`}>
            🏃
          </div>
          <div className="flex-1">
            {stravaConnected ? (
              <>
                <p className="font-semibold text-emerald-400">Strava Connected</p>
                <p className="text-sm text-gray-400">ID: {athleteId}</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-orange-400">Connect Strava</p>
                <p className="text-sm text-gray-400">Required to verify your runs</p>
              </>
            )}
          </div>
          {!stravaConnected ? (
            <button
              type="button"
              onClick={handleStravaConnect}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            >
              Connect
            </button>
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-xl">✓</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Steps (shown when active) */}
      {step !== 'idle' && step !== 'done' && (
        <div className="bg-gray-800/50 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all ${
              step === 'approving' 
                ? 'bg-blue-500 text-white animate-pulse' 
                : isApproveSuccess 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-gray-700 text-gray-400'
            }`}>
              {isApproveSuccess ? '✓' : '1'}
            </div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ${
                isApproveSuccess ? 'w-full' : 'w-0'
              }`} />
            </div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all ${
              step === 'creating' 
                ? 'bg-blue-500 text-white animate-pulse' 
                : isCreateSuccess 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-gray-700 text-gray-400'
            }`}>
              {isCreateSuccess ? '✓' : '2'}
            </div>
          </div>
          <div className="flex justify-between mt-3 text-xs font-medium">
            <span className={isApproveSuccess ? 'text-emerald-400' : 'text-gray-400'}>Approve USDC</span>
            <span className={isCreateSuccess ? 'text-emerald-400' : 'text-gray-400'}>Create Challenge</span>
          </div>
        </div>
      )}

      {/* Submit / Status */}
      {step === 'done' ? (
        <div className="text-center py-6">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-emerald-400 mb-2">Challenge Created!</h3>
          <p className="text-gray-400 mb-6">
            Run {targetMiles} miles in {formatDuration()} to win your stake back + bonus.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4"
          >
            Create another challenge
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={isLoading || !stravaConnected || !hasBalance}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            !stravaConnected || !hasBalance
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : isLoading
                ? 'bg-blue-600 text-white cursor-wait'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {!stravaConnected 
            ? '🔗 Connect Strava First'
            : !hasBalance
              ? `💸 Need ${Number(stakeAmount) - balanceNum} more USDC`
              : isApprovePending
                ? '⏳ Approve in Wallet...'
                : isApproveConfirming
                  ? '⏳ Approving...'
                  : isCreatePending
                    ? '⏳ Confirm in Wallet...'
                    : isCreateConfirming
                      ? '⏳ Creating Challenge...'
                      : !hasAllowance
                        ? `🚀 Approve & Stake $${stakeAmount}`
                        : `🚀 Stake $${stakeAmount}`
          }
        </button>
      )}
    </form>
  )
}
