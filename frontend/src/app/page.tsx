'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { BrowseGoals } from '@/components/BrowseGoals'
import { MyChallenges } from '@/components/MyChallenges'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-2xl font-bold text-[#2EE59D]">GoalStake</span>
          <ConnectButton 
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-12 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          Bet on <span className="text-[#2EE59D]">yourself</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Join a Goal. Stake Money. Win it back + more. Miss it, it's gone.
        </p>
      </section>

      {/* Browse Goals */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2EE59D] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2EE59D]"></span>
          </div>
          <h2 className="text-lg font-medium text-gray-500">Active Goals</h2>
        </div>
        <BrowseGoals />
      </section>

      {/* My Goals */}
      {isConnected && (
        <section className="max-w-6xl mx-auto px-6 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-[#2EE59D]"></div>
            <h2 className="text-lg font-medium text-gray-500">My Goals</h2>
          </div>
          <MyChallenges />
        </section>
      )}

      {/* How It Works */}
      <section className="border-t border-gray-200 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">How it works</h3>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', emoji: '🎯', title: 'Join a goal', desc: 'Pick a challenge that fits' },
              { step: '02', emoji: '💰', title: 'Stake USDC', desc: 'Put money on the line' },
              { step: '03', emoji: '📲', title: 'Connect Strava', desc: 'We verify automatically' },
              { step: '04', emoji: '🏆', title: 'Win or lose', desc: 'Hit goal = keep stake + bonus' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-3xl mb-2">{item.emoji}</div>
                <div className="text-[#2EE59D] font-mono text-xs mb-2">{item.step}</div>
                <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex justify-center items-center text-sm text-gray-500">
          <span>Built on <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors underline">Base</a> with <a href="https://chain.link" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors underline">Chainlink</a></span>
        </div>
      </footer>
    </main>
  )
}
