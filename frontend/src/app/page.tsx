'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { CreateChallenge } from '@/components/CreateChallenge'
import { MyChallenges } from '@/components/MyChallenges'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💪</span>
            <h1 className="text-xl font-bold">GoalStake</h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl md:text-6xl font-bold mb-4">
          Bet on Your Goals
        </h2>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Stake money on your fitness goals. Hit them, keep your stake + bonus from losers. 
          Miss them, lose it. No willpower required — just consequences.
        </p>
        
        {!isConnected && (
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        )}
      </section>

      {/* Main Content */}
      {isConnected && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Create Challenge */}
            <div>
              <h3 className="text-2xl font-bold mb-6">Create Challenge</h3>
              <CreateChallenge />
            </div>

            {/* My Challenges */}
            <div>
              <h3 className="text-2xl font-bold mb-6">My Challenges</h3>
              <MyChallenges />
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h3 className="text-2xl font-bold mb-8 text-center">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h4 className="font-bold mb-2">Set a Goal</h4>
              <p className="text-gray-400 text-sm">Choose your running target (miles per week)</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <h4 className="font-bold mb-2">Stake USDC</h4>
              <p className="text-gray-400 text-sm">Put your money where your mouth is</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🏃</div>
              <h4 className="font-bold mb-2">Connect Strava</h4>
              <p className="text-gray-400 text-sm">We verify your runs automatically</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h4 className="font-bold mb-2">Win or Lose</h4>
              <p className="text-gray-400 text-sm">Hit your goal = keep stake + bonus</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500">
          <p>Built with Chainlink Functions on Base</p>
        </div>
      </footer>
    </main>
  )
}
