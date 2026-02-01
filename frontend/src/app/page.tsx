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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2EE59D] to-[#1DB877] flex items-center justify-center shadow-lg shadow-[#2EE59D]/25">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight">GoalStake</span>
          </div>
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
          Join a goal. Stake money. Win it back + more. Miss it, it's gone.
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
      <section className="border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h3 className="text-2xl font-bold text-gray-900 mb-12 text-center">How it works</h3>
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
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center text-sm text-gray-500">
          <span>Built on Base with Chainlink</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-900 transition-colors">Docs</a>
            <a href="#" className="hover:text-gray-900 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
