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
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-[#2EE59D]">goalstake</span>
          <div className="flex items-center gap-4">
            <a href="#how-it-works" className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors hidden sm:block">How it works</a>
            <a href="#goals" className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors hidden sm:block">Goals</a>
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
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2EE59D]/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#2EE59D]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)] text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-[#2EE59D] animate-pulse" />
            <span className="text-[var(--text-secondary)]">Live on Base Sepolia</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Stake Money on<br />
            <span className="text-[#2EE59D]">Your Goals</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            The Commitment Market. Put money on the line, hit your goals, 
            keep your stake + earn from those who don't.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#goals" className="px-8 py-4 bg-[#2EE59D] text-black font-semibold rounded-xl hover:bg-[#26c987] transition-all hover:scale-105">
              Browse Goals
            </a>
            <a href="#how-it-works" className="px-8 py-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-hover)] transition-all">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-[var(--border)] bg-[var(--surface)]/50">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl md:text-4xl font-bold text-[#2EE59D]">$0</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Platform Fee</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold">100%</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">On-chain Verified</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold text-[#2EE59D]">2x</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Motivation Boost</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#2EE59D] font-medium mb-3">How it works</p>
            <h2 className="text-3xl md:text-5xl font-bold">Four steps to<br />financial accountability</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                step: '01', 
                icon: '🎯', 
                title: 'Join a goal', 
                desc: 'Pick a curated fitness challenge that matches your level.' 
              },
              { 
                step: '02', 
                icon: '💰', 
                title: 'Stake USDC', 
                desc: 'Put real money on the line. $1 minimum, no maximum.' 
              },
              { 
                step: '03', 
                icon: '📲', 
                title: 'Connect Strava', 
                desc: 'Link your account. We verify your activity automatically.' 
              },
              { 
                step: '04', 
                icon: '🏆', 
                title: 'Win or lose', 
                desc: 'Hit your goal = keep stake + bonus. Miss = distributed to winners.' 
              },
            ].map((item) => (
              <div 
                key={item.step} 
                className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[#2EE59D]/50 transition-all group"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-[#2EE59D] font-mono text-xs mb-2">{item.step}</div>
                <h3 className="font-semibold text-lg mb-2 group-hover:text-[#2EE59D] transition-colors">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Works */}
      <section className="py-24 px-6 bg-[var(--surface)]/50 border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#2EE59D] font-medium mb-3">Why it works</p>
            <h2 className="text-3xl md:text-5xl font-bold">Built for commitment,<br />not willpower</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl bg-[var(--background)] border border-[var(--border)]">
              <div className="w-12 h-12 rounded-xl bg-[#2EE59D]/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="font-semibold text-xl mb-3">Loss Aversion</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Behavioral economics shows we work 2x harder to avoid losing money than to gain it. GoalStake leverages this.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-[var(--background)] border border-[var(--border)]">
              <div className="w-12 h-12 rounded-xl bg-[#2EE59D]/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🔗</span>
              </div>
              <h3 className="font-semibold text-xl mb-3">Trustless Verification</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Chainlink oracles verify your Strava data automatically. No humans, no disputes, no excuses.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-[var(--background)] border border-[var(--border)]">
              <div className="w-12 h-12 rounded-xl bg-[#2EE59D]/10 flex items-center justify-center mb-4">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="font-semibold text-xl mb-3">Real Consequences</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Miss your goal and your stake goes to winners. No refunds, no second chances. Just results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Browse Goals */}
      <section id="goals" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[#2EE59D] font-medium mb-2">Active Goals</p>
              <h2 className="text-3xl font-bold">Join a challenge</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2EE59D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2EE59D]"></span>
              </div>
              <span className="text-sm text-[var(--text-secondary)]">Live</span>
            </div>
          </div>
          <BrowseGoals />
        </div>
      </section>

      {/* My Goals */}
      {isConnected && (
        <section className="pb-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <p className="text-[#2EE59D] font-medium mb-2">Your Commitments</p>
              <h2 className="text-3xl font-bold">My Goals</h2>
            </div>
            <MyChallenges />
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-[var(--surface)]/50 to-transparent border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to bet on<br /><span className="text-[#2EE59D]">yourself?</span>
          </h2>
          <p className="text-xl text-[var(--text-secondary)] mb-10">
            Join thousands who've discovered that money on the line means goals get done.
          </p>
          <a href="#goals" className="inline-flex px-8 py-4 bg-[#2EE59D] text-black font-semibold rounded-xl hover:bg-[#26c987] transition-all hover:scale-105">
            Get Started — It's Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
              <span className="text-xl font-bold text-[#2EE59D]">goalstake</span>
              <span className="text-sm text-[var(--text-secondary)]">The Commitment Market</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
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
        </div>
      </footer>
    </main>
  )
}
