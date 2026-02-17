'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useAccount, useReadContract } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { FEATURED_GOALS } from '@/components/BrowseGoals'
import { ThemeToggle } from '@/components/ThemeToggle'
import { usePlatformStats, useContracts, useNetworkCheck } from '@/lib/hooks'
import { useSwitchChain } from 'wagmi'
import { base } from 'viem/chains'
import { useInView } from '@/lib/useInView'
import { useCountUp } from '@/lib/useCountUp'
import { LiveChallengeCard, OnboardingCommitment } from '@/components/OnboardingCommitment'
import { NEW_USER_CHALLENGE_ABI } from '@/lib/abis'
import { analytics, identifyUser } from '@/lib/analytics'
import { VaadaLogo } from '@/components/VaadaLogo'

// Dynamic imports for heavy components - don't block first paint
const BrowseGoals = dynamic(() => import('@/components/BrowseGoals').then(m => ({ default: m.BrowseGoals })), {
  loading: () => <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" /></div>,
  ssr: false,
})
const PrivyConnectButton = dynamic(() => import('@/components/PrivyConnectButton').then(m => ({ default: m.PrivyConnectButton })), { ssr: false })
// StravaConnect removed from header - now shown contextually in GoalCard for Running goals
const FundWalletButton = dynamic(() => import('@/components/FundButton').then(m => ({ default: m.FundWalletButton })), { ssr: false })
const ProfileNameButton = dynamic(() => import('@/components/ProfileName').then(m => ({ default: m.ProfileNameButton })), { ssr: false })
const DevResetButton = dynamic(() => import('@/components/DevResetButton').then(m => ({ default: m.DevResetButton })), { ssr: false })
// Network warning banner - shows when user is on wrong network
function NetworkBanner() {
  const { isConnected } = useAccount()
  const { isWrongNetwork } = useNetworkCheck()
  const { switchChain } = useSwitchChain()

  if (!isConnected || !isWrongNetwork) return null

  return (
    <div className="fixed top-[61px] left-0 right-0 z-40 bg-red-500 text-white py-3 px-4 text-center text-sm font-semibold shadow-lg animate-pulse">
      ⚠️ You&apos;re on the wrong network — Vaada runs on Base. 
      <button 
        onClick={() => switchChain({ chainId: base.id })}
        className="ml-2 bg-white text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-100 transition-colors"
      >
        Switch to Base →
      </button>
    </div>
  )
}

// Integrations dropdown with connect/disconnect for Fitbit
function IntegrationsDropdown() {
  const { address } = useAccount()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  
  const [fitbitConnected, setFitbitConnected] = useState(false)
  const [stravaConnected, setStravaConnected] = useState(false)
  useEffect(() => {
    const fitbitUserId = document.cookie
      .split('; ')
      .find(row => row.startsWith('fitbit_user_id='))
      ?.split('=')[1]
    setFitbitConnected(!!fitbitUserId)
    const stravaUserId = document.cookie
      .split('; ')
      .find(row => row.startsWith('strava_athlete_id='))
      ?.split('=')[1]
    setStravaConnected(!!stravaUserId)
  }, [])
  
  // Use absolute URL to bypass any routing interception
  const fitbitUrl = address 
    ? `https://www.vaada.io/api/fitbit/auth?wallet=${address}`
    : 'https://www.vaada.io/api/fitbit/auth'

  const stravaClientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || '199295'
  const stravaRedirectUri = 'https://www.vaada.io/api/strava/callback'
  const stravaState = address ? encodeURIComponent(JSON.stringify({ wallet: address })) : ''
  const stravaUrl = `https://www.strava.com/oauth/authorize?client_id=${stravaClientId}&redirect_uri=${stravaRedirectUri}&response_type=code&scope=activity:read_all&state=${stravaState}`

  const updateMenuPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuWidth = 280
      let left = rect.left
      // Ensure menu stays within viewport with padding
      if (left + menuWidth > window.innerWidth - 16) {
        left = window.innerWidth - menuWidth - 16
      }
      if (left < 16) left = 16
      setMenuPos({
        top: rect.bottom + 8,
        left: left,
      })
    }
  }, [])

  const handleToggle = () => {
    if (!open) {
      updateMenuPosition()
    }
    setOpen(!open)
  }

  // Update position on resize/scroll while open
  useEffect(() => {
    if (!open) return
    
    const handleResize = () => updateMenuPosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
    }
  }, [open, updateMenuPosition])

  const handleDisconnect = () => {
    document.cookie = 'fitbit_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    setFitbitConnected(false)
    setOpen(false)
    analytics.fitbitDisconnected()
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors px-1 py-1"
      >
        <span className="text-xs sm:text-sm">Integrations</span>
        <svg className={`w-3 h-3 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div 
            className="fixed bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-lg z-[101]"
            style={{ top: menuPos.top, left: menuPos.left, width: '280px', maxWidth: 'calc(100vw - 32px)' }}
          >
            {/* Fitbit Section */}
            <div className="px-4 py-3 border-b border-[var(--border)]">
              {fitbitConnected ? (
                <div className="flex items-center gap-3">
                  <span>⌚</span>
                  <span className="text-sm font-medium">Fitbit</span>
                  <span className="text-xs text-[#00B0B9] bg-[#00B0B9]/10 px-2 py-0.5 rounded-full whitespace-nowrap">Connected</span>
                  <button
                    type="button"
                    onClick={() => handleDisconnect()}
                    className="text-xs text-[var(--text-secondary)] hover:text-red-500 transition-colors whitespace-nowrap ml-auto"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span>⌚</span>
                    <span className="text-sm font-medium">Fitbit</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { window.location.href = fitbitUrl; }}
                    className="block w-full text-center px-3 py-1.5 text-xs font-medium bg-[#00B0B9] text-white rounded-lg hover:bg-[#009BA3] transition-colors cursor-pointer"
                  >
                    Connect Fitbit
                  </button>
                </>
              )}
            </div>
            
            {/* Strava Section */}
            <div className="px-4 py-3">
              {stravaConnected ? (
                <div className="flex items-center gap-3">
                  <span>🏃</span>
                  <span className="text-sm font-medium">Strava</span>
                  <span className="text-xs text-[#FC4C02] bg-[#FC4C02]/10 px-2 py-0.5 rounded-full whitespace-nowrap">Connected</span>
                  <button
                    type="button"
                    onClick={() => {
                      document.cookie = 'strava_athlete_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                      setStravaConnected(false)
                      setOpen(false)
                    }}
                    className="text-xs text-[var(--text-secondary)] hover:text-red-500 transition-colors whitespace-nowrap ml-auto"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span>🏃</span>
                    <span className="text-sm font-medium">Strava</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { window.location.href = stravaUrl; }}
                    className="block w-full text-center px-3 py-1.5 text-xs font-medium bg-[#FC4C02] text-white rounded-lg hover:bg-[#E34402] transition-colors cursor-pointer"
                  >
                    Connect Strava
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Stats card component with count-up animation
function StatsCard({ 
  label, 
  value, 
  icon, 
  isInView, 
  delay = 0,
  prefix = '',
  suffix = ''
}: { 
  label: string
  value: number
  icon: React.ReactNode
  isInView: boolean
  delay?: number
  prefix?: string
  suffix?: string
}) {
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const displayValue = useCountUp(value, shouldAnimate, 2000, prefix, suffix)

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setShouldAnimate(true), delay)
      return () => clearTimeout(timer)
    }
  }, [isInView, delay])

  return (
    <div 
      className={`bg-[var(--surface)] rounded-2xl p-5 transition-all duration-500 ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
        {icon}
      </div>
      <p className="text-4xl font-bold tabular-nums tracking-tight">{displayValue}</p>
    </div>
  )
}

export default function Home() {
  const { isConnected, address } = useAccount()
  const contracts = useContracts()
  const onChainIds = FEATURED_GOALS.filter(g => g.onChainId !== undefined).map(g => g.onChainId!)
  const platformStats = usePlatformStats(onChainIds, FEATURED_GOALS.length)
  const { login, authenticated } = usePrivy()
  const [mounted, setMounted] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [checkedLocalStorage, setCheckedLocalStorage] = useState(false)
  const [browseFilter, setBrowseFilter] = useState('All')

  const statsView = useInView(0.2)
  const howView = useInView(0.1)
  const whyView = useInView(0.1)
  const ctaView = useInView(0.2)

  // Check if user has completed the new user challenge (contract state)
  const isNewUserChallengeDeployed = contracts.newUserChallenge !== '0x0000000000000000000000000000000000000000'
  const { data: hasCompletedChallenge, isLoading: isCheckingChallenge } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'hasJoinedChallenge',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isNewUserChallengeDeployed },
  })

  useEffect(() => {
    setMounted(true)
    // Check localStorage immediately on mount
    const isOnboarded = localStorage.getItem('vaada_onboarded') === 'true'
    setCheckedLocalStorage(true)
    if (!isOnboarded) {
      // Will show onboarding once authenticated
    }
  }, [])

  // Identify user in analytics when authenticated
  useEffect(() => {
    if (authenticated && address) {
      identifyUser(address, { wallet: address.slice(0, 10) })
    }
  }, [authenticated, address])

  // Show onboarding modal for users who haven't completed the challenge
  // Check localStorage first (instant), then verify with contract
  useEffect(() => {
    if (!authenticated || !mounted || !checkedLocalStorage) return
    
    const isOnboardedLocally = localStorage.getItem('vaada_onboarded') === 'true'
    
    // If locally marked as onboarded, don't show modal
    if (isOnboardedLocally) {
      setShowOnboarding(false)
      return
    }
    
    // If contract check is still loading and not onboarded locally, show onboarding
    // This prevents the flash
    if (isNewUserChallengeDeployed && isCheckingChallenge) {
      setShowOnboarding(true)
      return
    }
    
    // If contract says completed, mark locally and hide
    if (hasCompletedChallenge === true) {
      localStorage.setItem('vaada_onboarded', 'true')
      setShowOnboarding(false)
      return
    }
    
    // If contract says not completed (or not deployed), show onboarding
    if (hasCompletedChallenge === false || !isNewUserChallengeDeployed) {
      setShowOnboarding(true)
    }
  }, [authenticated, mounted, checkedLocalStorage, isNewUserChallengeDeployed, hasCompletedChallenge, isCheckingChallenge])

  const scrollToSection = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault()
    const element = document.getElementById(sectionId)
    if (element) {
      const headerOffset = 70
      const top = element.offsetTop - headerOffset
      window.scrollTo({ top, behavior: 'smooth' })
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
    <>
      {/* Header - outside main to avoid overflow clipping on iOS */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--surface)]/90 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-6">
          <a 
            href="/" 
            onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className="flex items-center gap-2 text-xl font-bold text-[#2EE59D] hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
          >
            <VaadaLogo size={28} />
            vaada
          </a>
          <div className="flex-1 overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-1 sm:gap-5 justify-end min-w-max">
              <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hidden sm:block text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors cursor-pointer px-1 py-1">
                How it works
              </a>
              <a href="#promises" onClick={(e) => scrollToSection(e, 'promises')} className="hidden sm:block text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors cursor-pointer px-1 py-1">
                Vaadas
              </a>
              {authenticated && <IntegrationsDropdown />}
              {authenticated && <ProfileNameButton />}
              {authenticated && <FundWalletButton />}
              <PrivyConnectButton />
              <ThemeToggle />
              <DevResetButton />
            </div>
          </div>
        </div>
      </header>

      {/* Network Warning Banner */}
      <NetworkBanner />

      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] scroll-smooth overflow-x-hidden">
        {/* Subtle Background Pattern - hidden on mobile for performance */}
        <div className="hidden sm:block fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#2EE59D]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#2EE59D]/3 rounded-full blur-3xl" />
        </div>

      {/* Hero - Compact with animation */}
      <section className={`pt-28 sm:pt-24 pb-8 px-6 relative transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] text-xs text-[var(--text-secondary)] mb-6 border border-[var(--border)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0052FF] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0052FF]" />
            </span>
            Live on Base
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            The Promise{' '}
            <span className="text-[#2EE59D] relative">
              Market
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#2EE59D]/20" viewBox="0 0 200 12" preserveAspectRatio="none">
                <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </h1>
          
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Keep your promise. Keep your stake. Earn from those who don't.
          </p>
          
          <button 
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2EE59D] text-white font-semibold rounded-lg 
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

      {/* Scroll anchor */}
      <div id="promises" />

      {/* New User Challenge - above browse section */}
      {authenticated && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
          <LiveChallengeCard />
        </div>
      )}

      {/* Section Divider */}
      <div className="py-6 sm:py-8">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-widest whitespace-nowrap">Browse vaadas</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
      </div>

      {/* Promises Grid */}
      <section className="pb-6 sm:pb-8 px-4 sm:px-6 relative">
        <div className="max-w-6xl mx-auto">
          <BrowseGoals />
        </div>
      </section>

      {/* Stats Section - Vertical Cards */}
      <section ref={statsView.ref} className="border-t border-[var(--border)] py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-[#2EE59D] uppercase tracking-wider">Platform Stats</span>
            <h2 className="text-2xl font-bold mt-2">The Numbers</h2>
          </div>
          <div className="space-y-4">
          <StatsCard
            label="Total Staked"
            value={platformStats.totalStaked}
            prefix="$"
            icon={
              <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            isInView={statsView.isInView}
            delay={0}
          />
          <StatsCard
            label="Total Participants"
            value={platformStats.totalParticipants}
            icon={
              <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            isInView={statsView.isInView}
            delay={100}
          />
          <StatsCard
            label="Active Vaadas"
            value={platformStats.activeGoals}
            icon={
              <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            isInView={statsView.isInView}
            delay={200}
          />
          <StatsCard
            label="Total Vaadas"
            value={platformStats.totalGoals}
            icon={
              <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
            isInView={statsView.isInView}
            delay={300}
          />
          </div>
        </div>
      </section>

      {/* How It Works - Compact horizontal */}
      <section ref={howView.ref} id="how-it-works" className={`py-12 px-6 bg-[var(--surface)] border-t border-[var(--border)] transition-all duration-700 ${howView.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-[#2EE59D] uppercase tracking-wider">Simple Process</span>
            <h2 className="text-2xl font-bold mt-2">How It Works</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            
            {[
              { step: '01', icon: '💰', title: 'Make a promise', desc: 'Stake money on your promise. Put real skin in the game to back your word.' },
              { step: '02', icon: '✅', title: 'Keep your promise', desc: 'We verify automatically. Connect your fitness app and we track your progress.' },
              { step: '03', icon: '🏆', title: 'Earn from your promise', desc: "Keep your stake + earn from those who don't. Winners split the pool." },
            ].map((item, i) => (
              <div 
                key={item.step} 
                className="text-center group relative"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--background)] shadow-sm border border-[var(--border)] mb-3 group-hover:shadow-md group-hover:border-[#2EE59D]/30 group-hover:scale-105 transition-all duration-300">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#2EE59D] text-[10px] font-bold text-black flex items-center justify-center">
                    {item.step.slice(-1)}
                  </span>
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-[#2EE59D] transition-colors">{item.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-[200px] mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Works - Compact */}
      <section ref={whyView.ref} className={`py-12 px-6 transition-all duration-700 ${whyView.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-[#2EE59D] uppercase tracking-wider">The Science</span>
            <h2 className="text-2xl font-bold mt-2">Why It Works</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🧠', title: 'Loss Aversion', desc: 'We work 2x harder to avoid losing money than to gain it.' },
              { icon: '📱', title: 'Automatic Verification', desc: 'Your fitness tracker syncs and verifies your progress automatically.' },
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
      <section ref={ctaView.ref} className={`py-10 sm:py-16 px-4 sm:px-6 bg-[var(--surface)] relative overflow-hidden transition-all duration-700 ${ctaView.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        {/* Background decoration - hidden on mobile for performance */}
        <div className="hidden sm:block absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#2EE59D]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-[#2EE59D]/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            Ready to keep your promise?
          </h2>
          <p className="text-[var(--text-secondary)] mb-6 sm:mb-8 text-base sm:text-lg">
            Join the Promise Market.
          </p>
          <button 
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[#2EE59D] text-white font-bold rounded-xl 
              hover:bg-[#26c987] hover:shadow-xl hover:shadow-[#2EE59D]/25 hover:-translate-y-1
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
      <footer className="border-t border-[var(--border)] py-8 px-6 bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto">
          {/* Footer columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-6 text-center sm:text-left justify-items-center sm:justify-items-start">
            {/* Resources */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                <li><a href="/faq" className="hover:text-[var(--foreground)] transition-colors">FAQ</a></li>
                <li><a href="/support" className="hover:text-[var(--foreground)] transition-colors">Help & Support</a></li>
              </ul>
            </div>
            {/* Built With */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] mb-4">Built With</h4>
              <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                <li><a href="https://base.org" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Base</a></li>
                <li><a href="https://privy.io" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Privy</a></li>
                <li><a href="https://www.circle.com/usdc" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">USDC</a></li>
              </ul>
            </div>
            {/* Community */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] mb-4">Community</h4>
              <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                <li><a href="mailto:hello@vaada.io" className="hover:text-[var(--foreground)] transition-colors">Contact</a></li>
                <li><a href="/support" className="hover:text-[var(--foreground)] transition-colors">Bug Reports</a></li>
              </ul>
            </div>
            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                <li><a href="/terms.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Terms of Service</a></li>
                <li><a href="/privacy.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          {/* Bottom bar */}
        </div>
        <div className="border-t border-[var(--border)] -mx-6" />
        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <VaadaLogo size={24} />
              <span className="font-bold text-[#2EE59D]">vaada</span>
              <span className="text-xs text-[var(--text-secondary)]">· Keep Your Promise</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">© 2026 Vaada. All rights reserved.</p>
        </div>
      </footer>
    </main>

    {/* First-time user onboarding modal */}
    {showOnboarding && (
      <OnboardingCommitment onComplete={() => setShowOnboarding(false)} />
    )}
    </>
  )
}
