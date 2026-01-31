'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'

export function CreateChallenge() {
  const { address } = useAccount()
  const [targetMiles, setTargetMiles] = useState('20')
  const [stakeAmount, setStakeAmount] = useState('100')
  const [duration, setDuration] = useState('7') // days

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // TODO: First approve USDC, then create challenge
    // For now, just show the flow
    
    console.log({
      targetMiles: parseUnits(targetMiles, 18), // 1e18 = 1 mile
      stakeAmount: parseUnits(stakeAmount, 6),  // USDC has 6 decimals
      duration: Number(duration) * 24 * 60 * 60, // days to seconds
    })

    alert('Challenge creation coming soon! Contract not deployed yet.')
  }

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
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="text-2xl font-bold w-24 text-right">${stakeAmount}</span>
        </div>
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
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏃</span>
          <div>
            <p className="font-medium text-orange-400">Connect Strava</p>
            <p className="text-sm text-gray-400">Required to verify your runs</p>
          </div>
          <button
            type="button"
            className="ml-auto bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Connect
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || isConfirming}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white py-4 rounded-xl font-bold text-lg transition"
      >
        {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Creating...' : 'Create Challenge'}
      </button>

      {isSuccess && (
        <p className="mt-4 text-center text-emerald-400">
          Challenge created! 🎉
        </p>
      )}
    </form>
  )
}
