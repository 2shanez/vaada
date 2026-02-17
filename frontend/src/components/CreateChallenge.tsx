'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi'
import { useSponsoredWrite } from '@/lib/useSponsoredWrite'
import { parseUnits, formatUnits } from 'viem'
import { getStravaAuthUrl, isStravaConnected, getStravaAthleteId } from '@/lib/strava'
import { CONTRACTS } from '@/lib/wagmi'
import { base } from 'wagmi/chains'

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
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS] || CONTRACTS[base.id]
  
  const [targetMiles, setTargetMiles] = useState('20')
  const [stakeAmount, setStakeAmount] = useState('5')
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
  } = useSponsoredWrite()
  
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ 
    hash: approveHash 
  })

  // Create Challenge
  const { 
    writeContract: writeCreate, 
    data: createHash, 
    isPending: isCreatePending,
    reset: resetCreate
  } = useSponsoredWrite()
  
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ 
    hash: createHash 
  })

  // Handle approval success
  useEffect(() => {
    if (isApproveSuccess && step === 'approving') {
      refetchAllowance()
      setStep('creating')
      handleCreate()
    }
  }, [isApproveSuccess])

  // Handle create success
  useEffect(() => {
    if (isCreateSuccess && step === 'creating') {
      setStep('done')
    }
  }, [isCreateSuccess])

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
        parseUnits(targetMiles, 18),
        stakeAmountWei,
        BigInt(durationDays * 24 * 60 * 60),
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
      handleApprove()
    } else {
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

  if (step === 'done') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold mb-2">Challenge Created</h3>
        <p className="text-gray-500 mb-6">
          Run {targetMiles} miles in {formatDuration()} to win.
        </p>
        <button
          onClick={handleReset}
          className="text-[#2EE59D] hover:underline text-sm"
        >
          Create another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
      {/* Target Miles */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm text-gray-500">Target</label>
          <span className="text-sm text-gray-500">miles</span>
        </div>
        <input
          type="number"
          min="0"
          max="100"
          value={targetMiles}
          onChange={(e) => setTargetMiles(e.target.value)}
          disabled={isLoading}
          className="w-full bg-transparent text-4xl font-semibold focus:outline-none placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="0"
        />
        <input
          type="range"
          min="0"
          max="100"
          value={targetMiles}
          onChange={(e) => setTargetMiles(e.target.value)}
          disabled={isLoading}
          className="w-full h-1 mt-4 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2EE59D] [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      <div className="h-px bg-gray-200 my-6"></div>

      {/* Stake Amount */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm text-gray-500">Stake</label>
          <span className="text-sm text-gray-500">
            Balance: <span className={hasBalance ? 'text-white' : 'text-red-400'}>{balanceNum.toFixed(2)} USDC</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-4xl font-semibold text-gray-500">$</span>
          <input
            type="number"
            min="0"
            max="1000"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            disabled={isLoading}
            className="w-full bg-transparent text-4xl font-semibold focus:outline-none placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          step="1"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          disabled={isLoading}
          className="w-full h-1 mt-4 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2EE59D] [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      <div className="h-px bg-gray-200 my-6"></div>

      {/* Duration */}
      <div className="mb-6">
        <label className="text-sm text-gray-500 block mb-3">Duration</label>
        <div className="flex gap-2 mb-4">
          {(['days', 'weeks', 'months'] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => {
                setDurationUnit(unit)
                setDurationValue(1)
              }}
              disabled={isLoading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                durationUnit === unit
                  ? 'bg-[#2EE59D] text-white'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              {unit.charAt(0).toUpperCase() + unit.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setDurationValue(Math.max(1, durationValue - 1))}
            disabled={isLoading || durationValue <= 1}
            className="w-10 h-10 rounded-lg bg-gray-100 text-xl font-medium disabled:opacity-30"
          >
            −
          </button>
          <span className="flex-1 text-center text-2xl font-semibold">{formatDuration()}</span>
          <button
            type="button"
            onClick={() => setDurationValue(durationValue + 1)}
            disabled={isLoading}
            className="w-10 h-10 rounded-lg bg-gray-100 text-xl font-medium disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <div className="h-px bg-gray-200 my-6"></div>

      {/* Strava */}
      <div className="mb-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stravaConnected ? 'bg-[#2EE59D]/10' : 'bg-orange-500/10'}`}>
              <span className="text-xl">🏃</span>
            </div>
            <div>
              <p className={`font-medium ${stravaConnected ? 'text-[#2EE59D]' : 'text-orange-400'}`}>
                {stravaConnected ? 'Strava Connected' : 'Connect Strava'}
              </p>
              {stravaConnected && athleteId && (
                <p className="text-xs text-gray-500">ID: {athleteId}</p>
              )}
            </div>
          </div>
          {!stravaConnected && (
            <button
              type="button"
              onClick={handleStravaConnect}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Connect
            </button>
          )}
          {stravaConnected && (
            <svg className="w-5 h-5 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Progress */}
      {(step === 'approving' || step === 'creating') && (
        <div className="mb-6 p-4 rounded-xl bg-gray-100">
          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              isApproveSuccess ? 'bg-[#2EE59D] text-white' : step === 'approving' ? 'bg-[#2EE59D]/20 text-[#2EE59D]' : 'bg-gray-200 text-gray-500'
            }`}>
              {isApproveSuccess ? '✓' : '1'}
            </div>
            <div className="flex-1 h-0.5 bg-gray-200">
              <div className={`h-full bg-[#2EE59D] transition-all ${isApproveSuccess ? 'w-full' : 'w-0'}`}></div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              isCreateSuccess ? 'bg-[#2EE59D] text-white' : step === 'creating' ? 'bg-[#2EE59D]/20 text-[#2EE59D]' : 'bg-gray-200 text-gray-500'
            }`}>
              {isCreateSuccess ? '✓' : '2'}
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-3">
            {isApprovePending ? 'Confirm approval in wallet...' :
             isApproveConfirming ? 'Approving USDC...' :
             isCreatePending ? 'Confirm transaction in wallet...' :
             isCreateConfirming ? 'Creating challenge...' : ''}
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !stravaConnected || !hasBalance || !stakeAmount || stakeAmount === '0'}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
          isLoading || !stravaConnected || !hasBalance || !stakeAmount || stakeAmount === '0'
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-[#2EE59D] text-white hover:bg-[#26c987]'
        }`}
      >
        {!stravaConnected 
          ? 'Connect Strava to continue'
          : !hasBalance
            ? 'Insufficient USDC'
            : !stakeAmount || stakeAmount === '0'
              ? 'Enter stake amount'
              : isLoading
                ? 'Processing...'
                : `Stake $${stakeAmount}`
        }
      </button>
    </form>
  )
}
