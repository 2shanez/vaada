'use client'

import { useAccount } from 'wagmi'

// Mock data for UI preview
const mockChallenges = [
  {
    id: 0,
    targetMiles: 20,
    actualMiles: 12,
    stakeAmount: 100,
    deadline: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
    settled: false,
    success: false,
  },
  {
    id: 1,
    targetMiles: 15,
    actualMiles: 18,
    stakeAmount: 50,
    deadline: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    settled: true,
    success: true,
  },
]

export function MyChallenges() {
  const { address } = useAccount()

  // TODO: Fetch real challenges from contract
  const challenges = mockChallenges

  if (challenges.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
        <p className="text-gray-400">No challenges yet</p>
        <p className="text-sm text-gray-500 mt-2">Create your first challenge to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {challenges.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} />
      ))}
    </div>
  )
}

function ChallengeCard({ challenge }: { challenge: typeof mockChallenges[0] }) {
  const progress = (challenge.actualMiles / challenge.targetMiles) * 100
  const isActive = !challenge.settled && challenge.deadline > Date.now()
  const daysLeft = Math.ceil((challenge.deadline - Date.now()) / (24 * 60 * 60 * 1000))

  return (
    <div className={`bg-gray-900 rounded-xl p-6 border ${
      challenge.settled 
        ? challenge.success 
          ? 'border-emerald-500/50' 
          : 'border-red-500/50'
        : 'border-gray-800'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-sm text-gray-400">Challenge #{challenge.id}</span>
          <h4 className="font-bold text-lg">
            Run {challenge.targetMiles} miles
          </h4>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold">${challenge.stakeAmount}</span>
          <p className="text-sm text-gray-400">at stake</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progress</span>
          <span>{challenge.actualMiles} / {challenge.targetMiles} miles</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex justify-between items-center">
        {challenge.settled ? (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            challenge.success 
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {challenge.success ? '✓ Completed' : '✗ Failed'}
          </span>
        ) : isActive ? (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">
            {daysLeft} days left
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">
            Pending verification
          </span>
        )}

        {challenge.settled && challenge.success && (
          <span className="text-emerald-400 font-medium">
            +${challenge.stakeAmount} + bonus
          </span>
        )}
      </div>
    </div>
  )
}
