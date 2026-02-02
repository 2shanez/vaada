'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { BrowseGoals } from '@/components/BrowseGoals'
import { MyChallenges } from '@/components/MyChallenges'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <span className="text-[1.75rem] font-bold text-[#2EE59D]">goalstake</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ConnectButton 
              showBalance={false}
              chainStatus="icon"
              accountStatus="address"
            />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-12 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          Bet on <span className="text-[#2EE59D]">yourself</span>
        </h1>
        <p className="text-xl md:text-2xl text-[var(--text-secondary)] dark:text-gray-300 max-w-2xl mx-auto font-medium">
          The Accountability Market.
        </p>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-[var(--border)]"></div>
      </div>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h3 className="text-2xl font-bold mb-8 text-center">How it works</h3>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: '01', emoji: '🎯', title: 'Join a goal', desc: 'Pick a challenge that fits' },
            { step: '02', emoji: '💰', title: 'Stake USDC', desc: 'Put money on the line' },
            { step: '03', emoji: '📲', title: 'Connect Strava', desc: 'We verify automatically' },
            { step: '04', emoji: '🏆', title: 'Win or lose', desc: 'Hit = keep stake + bonus\nMiss = distributed to winners' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="text-4xl mb-3">{item.emoji}</div>
              <div className="text-[#2EE59D] font-mono text-sm mb-2">{item.step}</div>
              <h4 className="font-semibold text-lg mb-2">{item.title}</h4>
              <p className="text-sm text-[var(--text-secondary)] dark:text-gray-400 whitespace-pre-line">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-[var(--border)]"></div>
      </div>

      {/* Browse Goals */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2EE59D] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2EE59D]"></span>
          </div>
          <h2 className="text-xl font-semibold">Active Goals</h2>
        </div>
        <BrowseGoals />
      </section>

      {/* My Goals */}
      {isConnected && (
        <section className="max-w-6xl mx-auto px-6 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-[#2EE59D]"></div>
            <h2 className="text-xl font-semibold">My Goals</h2>
          </div>
          <MyChallenges />
        </section>
      )}
    </main>
  )
}
