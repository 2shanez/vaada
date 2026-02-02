'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { BrowseGoals } from '@/components/BrowseGoals'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PrivyConnectButton } from '@/components/PrivyConnectButton'

const categories = ['All', 'Test', 'Daily', 'Weekly', 'Monthly'] as const
type Category = typeof categories[number]

export default function Home() {
  const { isConnected } = useAccount()
  const [activeCategory, setActiveCategory] = useState<Category>('All')

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <a href="/" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xl font-bold text-[#2EE59D] hover:opacity-80 transition-opacity cursor-pointer">goalstake</a>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">How it works</a>
            <a href="#goals" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">Goals</a>
            <ThemeToggle />
            <PrivyConnectButton />
          </div>
        </div>
      </header>

      {/* Trust Bar - Kalshi style */}
      <div className="fixed top-[57px] left-0 right-0 z-40 bg-gray-50 border-b border-gray-200 py-2">
        <div className="max-w-6xl mx-auto flex justify-center gap-8 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#2EE59D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            $0 Platform Fees
          </span>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#2EE59D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            100% Auto-Verified
          </span>
          <span className="flex items-center gap-2 hidden sm:flex">
            <svg className="w-4 h-4 text-[#2EE59D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            2x More Likely to Succeed
          </span>
        </div>
      </div>

      {/* Hero - Compact */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EE59D] animate-pulse" />
            Live on Base Sepolia
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            Stake Money on <span className="text-[#2EE59D]">Your Goals</span>
          </h1>
          
          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
            Hit your goal, keep your stake + earn from those who don't.
          </p>
          
          <a href="#goals" className="inline-flex px-6 py-3 bg-[#2EE59D] text-black font-semibold rounded-lg hover:bg-[#26c987] transition-all">
            Browse Goals
          </a>
        </div>
      </section>

      {/* Category Filter Pills - Sticky */}
      <div id="goals" className="sticky top-[97px] z-30 bg-white border-b border-gray-200 py-3">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
                  ${activeCategory === cat 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-400 hidden sm:block">
            8 goals available
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <section className="py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <BrowseGoals filter={activeCategory} />
        </div>
      </section>

      {/* How It Works - Compact horizontal */}
      <section id="how-it-works" className="py-16 px-6 bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: '01', icon: '👤', title: 'Sign up', desc: 'Email or Google. No crypto needed.' },
              { step: '02', icon: '🎯', title: 'Pick a goal', desc: 'Choose your challenge level.' },
              { step: '03', icon: '💵', title: 'Stake money', desc: 'Put real money on the line.' },
              { step: '04', icon: '🏆', title: 'Hit your goal', desc: 'Win = keep stake + bonus.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="text-xs text-[#2EE59D] font-mono mb-1">{item.step}</div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Works - Compact */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Why It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-gray-200 hover:border-[#2EE59D]/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center mb-4">
                <span className="text-xl">🧠</span>
              </div>
              <h3 className="font-semibold mb-2">Loss Aversion</h3>
              <p className="text-sm text-gray-500">
                We work 2x harder to avoid losing money than to gain it.
              </p>
            </div>
            
            <div className="p-6 rounded-xl border border-gray-200 hover:border-[#2EE59D]/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center mb-4">
                <span className="text-xl">🔗</span>
              </div>
              <h3 className="font-semibold mb-2">Trustless Verification</h3>
              <p className="text-sm text-gray-500">
                Chainlink oracles verify Strava data automatically.
              </p>
            </div>
            
            <div className="p-6 rounded-xl border border-gray-200 hover:border-[#2EE59D]/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#2EE59D]/10 flex items-center justify-center mb-4">
                <span className="text-xl">💸</span>
              </div>
              <h3 className="font-semibold mb-2">Real Consequences</h3>
              <p className="text-sm text-gray-500">
                Miss your goal = stake goes to winners. No excuses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to bet on yourself?
          </h2>
          <p className="text-gray-400 mb-8">
            Join the commitment market. Put money on your goals.
          </p>
          <a href="#goals" className="inline-flex px-6 py-3 bg-[#2EE59D] text-black font-semibold rounded-lg hover:bg-[#26c987] transition-all">
            Get Started
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="font-bold text-[#2EE59D]">goalstake</span>
            <span className="text-sm text-gray-400">The Commitment Market</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="https://github.com/2shanez/goalstake" target="_blank" rel="noopener noreferrer" className="hover:text-[#2EE59D] transition-colors">
              GitHub
            </a>
            <a href="https://github.com/2shanez/goalstake/blob/main/WHITEPAPER.md" target="_blank" rel="noopener noreferrer" className="hover:text-[#2EE59D] transition-colors">
              Whitepaper
            </a>
            <span>
              Built on{' '}
              <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="text-[#2EE59D] hover:underline">Base</a>
              {' '}×{' '}
              <a href="https://chain.link" target="_blank" rel="noopener noreferrer" className="text-[#2EE59D] hover:underline">Chainlink</a>
            </span>
          </div>
        </div>
      </footer>
    </main>
  )
}
