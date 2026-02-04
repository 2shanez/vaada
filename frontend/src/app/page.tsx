'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { BrowseGoals } from '@/components/BrowseGoals'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PrivyConnectButton } from '@/components/PrivyConnectButton'

const categories = ['All', 'Test', 'Daily', 'Weekly', 'Monthly'] as const
type Category = typeof categories[number]

export default function Home() {
  const { isConnected } = useAccount()
  const { login } = usePrivy()
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const scrollToSection = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault()
    const element = document.getElementById(sectionId)
    if (element) {
      const headerOffset = 70
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
    }
  }

  const handleGetStarted = () => {
    if (isConnected) {
      const element = document.getElementById('promises')
      if (element) {
        const headerOffset = 70
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
      }
    } else {
      login()
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] scroll-smooth">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#2EE59D]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#2EE59D]/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <a 
            href="/" 
            onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className="text-xl font-bold text-[#2EE59D] hover:scale-105 transition-transform cursor-pointer"
          >
            vaada
          </a>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors hidden sm:block relative group cursor-pointer">
              How it works
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2EE59D] group-hover:w-full transition-all duration-300" />
            </a>
            <a href="#promises" onClick={(e) => scrollToSection(e, 'promises')} className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors hidden sm:block relative group cursor-pointer">
              Promises
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2EE59D] group-hover:w-full transition-all duration-300" />
            </a>
            <ThemeToggle />
            <PrivyConnectButton />
          </div>
        </div>
      </header>

      {/* Hero - Compact with animation */}
      <section className={`pt-24 pb-12 px-6 relative transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface)] text-xs text-[var(--text-secondary)] mb-6 border border-[var(--border)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2EE59D] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2EE59D]" />
            </span>
            Live on Base Sepolia
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            The Commitment{' '}
            <span className="text-[#2EE59D] relative">
              Market
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#2EE59D]/20" viewBox="0 0 200 12" preserveAspectRatio="none">
                <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </h1>
          
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Keep your promise, keep your stake + earn from those who don't.
          </p>
          
          <button 
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2EE59D] text-black font-semibold rounded-lg 
              hover:bg-[#26c987] hover:shadow-lg hover:shadow-[#2EE59D]/25 hover:-translate-y-0.5
              active:translate-y-0 active:shadow-md
              transition-all duration-200"
          >
            Get Started
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </section>

      {/* Category Filter Pills - Sticky */}
      <div id="promises" className="sticky top-[57px] z-30 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)] py-3">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex gap-1.5 sm:gap-2 p-1 bg-[var(--surface)] rounded-full overflow-x-auto hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap
                  ${activeCategory === cat 
                    ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="text-xs sm:text-sm text-[var(--text-secondary)] hidden sm:flex items-center gap-2 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#2EE59D] animate-pulse" />
            8 promises live
          </div>
        </div>
      </div>

      {/* Promises Grid */}
      <section className="py-6 sm:py-8 px-4 sm:px-6 relative">
        <div className="max-w-6xl mx-auto">
          <BrowseGoals filter={activeCategory} />
        </div>
      </section>

      {/* Stats Bar - Full Width */}
      <section className="border-t border-[var(--border)] py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center gap-6 sm:gap-12">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold tabular-nums">8</p>
              <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase tracking-wider mt-1">Active Promises</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-[#2EE59D] tabular-nums">$0</p>
              <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase tracking-wider mt-1">Total Staked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold tabular-nums">0</p>
              <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase tracking-wider mt-1">Participants</p>
            </div>
          </div>
          <p className="text-center text-xs sm:text-sm text-[var(--text-secondary)] mt-4">
            Be the first to stake on a promise ✨
          </p>
        </div>
      </section>

      {/* How It Works - Compact horizontal */}
      <section id="how-it-works" className="py-16 px-6 bg-[var(--surface)] border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-[#2EE59D] uppercase tracking-wider">Simple Process</span>
            <h2 className="text-2xl font-bold mt-2">How It Works</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            
            {[
              { step: '01', icon: '👤', title: 'Sign up', desc: 'Email or Google. No crypto needed.' },
              { step: '02', icon: '🤝', title: 'Make a promise', desc: 'Choose your commitment.' },
              { step: '03', icon: '💵', title: 'Stake money', desc: 'Put real money on the line.' },
              { step: '04', icon: '🏆', title: 'Keep it', desc: 'Keep stake + earn from those who don\'t.' },
            ].map((item, i) => (
              <div 
                key={item.step} 
                className="text-center group relative"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--background)] shadow-sm border border-[var(--border)] mb-4 group-hover:shadow-md group-hover:border-[#2EE59D]/30 group-hover:scale-110 transition-all duration-300">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#2EE59D] text-[10px] font-bold text-black flex items-center justify-center">
                    {item.step.slice(-1)}
                  </span>
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-[#2EE59D] transition-colors">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Works - Compact */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-[#2EE59D] uppercase tracking-wider">The Science</span>
            <h2 className="text-2xl font-bold mt-2">Why It Works</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🧠', title: 'Loss Aversion', desc: 'We work 2x harder to avoid losing money than to gain it.' },
              { icon: '🔗', title: 'Trustless Verification', desc: 'Chainlink oracles verify your progress automatically.' },
              { icon: '💸', title: 'Real Consequences', desc: 'Break your promise = stake goes to winners. No excuses.' },
            ].map((item, i) => (
              <div 
                key={item.title}
                className="group p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[#2EE59D]/50 hover:shadow-lg hover:shadow-[#2EE59D]/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2EE59D]/10 to-[#2EE59D]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-semibold mb-2 group-hover:text-[#2EE59D] transition-colors">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-gray-900 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#2EE59D]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-[#2EE59D]/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            Ready to stake your word?
          </h2>
          <p className="text-gray-400 mb-6 sm:mb-8 text-base sm:text-lg">
            Join the commitment market. Put money on your promises.
          </p>
          <button 
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[#2EE59D] text-black font-bold rounded-xl 
              hover:bg-white hover:shadow-xl hover:shadow-[#2EE59D]/25 hover:-translate-y-1
              active:translate-y-0
              transition-all duration-200 text-base sm:text-lg"
          >
            Get Started
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-6 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="font-bold text-[#2EE59D] text-lg">vaada</span>
            <span className="text-sm text-[var(--text-secondary)]">The Commitment Market</span>
          </div>
          
          <div className="text-sm text-[var(--text-secondary)]">
            Built on{' '}
            <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="text-[#2EE59D] hover:underline">Base</a>
            {' '}×{' '}
            <a href="https://chain.link" target="_blank" rel="noopener noreferrer" className="text-[#2EE59D] hover:underline">Chainlink</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
