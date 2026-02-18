'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
const Leaderboard = dynamic(() => import('@/components/Leaderboard').then(m => ({ default: m.Leaderboard })), { ssr: false })
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
                  <svg className="w-4 h-4 text-[#00B0B9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                    <svg className="w-4 h-4 text-[#00B0B9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                  <svg className="w-4 h-4 text-[#FC4C02]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" /></svg>
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
                    <svg className="w-4 h-4 text-[#FC4C02]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" /></svg>
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

function AuthErrorToast() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const strava = searchParams.get('strava')
    const fitbit = searchParams.get('fitbit')
    if (strava === 'error') setError('Strava connection failed. Please try again.')
    else if (strava === 'missing_code') setError('Strava authorization was cancelled.')
    else if (fitbit === 'error') setError('Fitbit connection failed. Please try again.')
    if (strava || fitbit) {
      // Clean URL
      window.history.replaceState({}, '', '/')
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  if (!error) return null
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-red-500/90 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg animate-in slide-in-from-top-2">
      {error}
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
      <Suspense fallback={null}><AuthErrorToast /></Suspense>
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
              {authenticated && <ProfileNameButton />}
              {authenticated && <IntegrationsDropdown />}
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
            Make a Promise. Keep Your Promise. Earn From Your Promise. Own Your Promise.
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
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-widest whitespace-nowrap">Browse promises</span>
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
              <div className="w-10 h-10 rounded-full bg-[#2EE59D]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
            isInView={statsView.isInView}
            delay={0}
          />
          <StatsCard
            label="Total Participants"
            value={platformStats.totalParticipants}
            icon={
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
            }
            isInView={statsView.isInView}
            delay={100}
          />
          <StatsCard
            label="Active Promises"
            value={platformStats.activeGoals}
            icon={
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
            }
            isInView={statsView.isInView}
            delay={200}
          />
          <StatsCard
            label="Total Promises"
            value={platformStats.totalGoals}
            icon={
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
            isInView={statsView.isInView}
            delay={300}
          />
          </div>
        </div>
      </section>

      {/* Leaderboard - auto-hides when empty */}
      <Leaderboard />

      {/* How It Works - Compact horizontal */}
      <section ref={howView.ref} id="how-it-works" className={`py-12 px-6 bg-[var(--surface)] border-t border-[var(--border)] transition-all duration-700 ${howView.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-[#2EE59D] uppercase tracking-wider">Simple Process</span>
            <h2 className="text-2xl font-bold mt-2">How It Works</h2>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 sm:gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            
            {[
              { step: '01', title: 'Make a Promise', desc: 'Stake money on your promise. Skin in the game makes it real.', color: '#2EE59D',
                svg: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { step: '02', title: 'Keep Your Promise', desc: 'We verify automatically. Connect your app and we track the rest.', color: '#3B82F6',
                svg: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { step: '03', title: 'Earn From Your Promise', desc: "Keep your promise, keep your money — and earn from broken ones.", color: '#F59E0B',
                svg: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" /></svg> },
              { step: '04', title: 'Own Your Promise', desc: 'Every promise — kept or broken — is recorded onchain forever.', color: '#A855F7',
                svg: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.114 5.07m3.16.65a48.29 48.29 0 01-1.653-.823c-.296-.168-.534-.452-.534-.79v-.002c0-.337.237-.621.534-.79a48.333 48.333 0 016.607-3.07m3.16.65a48.29 48.29 0 001.653-.823c.296-.168.534-.452.534-.79v-.002c0-.337-.237-.621-.534-.79a48.333 48.333 0 00-6.607-3.07" /></svg> },
            ].map((item, i) => (
              <div 
                key={item.step} 
                className="text-center group relative"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--background)] shadow-sm border border-[var(--border)] mb-3 group-hover:shadow-md group-hover:border-[#2EE59D]/30 group-hover:scale-105 transition-all duration-300" style={{ color: item.color }}>
                  {item.svg}
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

      {/* Section divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Footer CTA */}
      <section ref={ctaView.ref} className={`py-10 sm:py-16 px-4 sm:px-6 bg-[var(--background)] relative overflow-hidden transition-all duration-700 ${ctaView.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        {/* Background decoration - hidden on mobile for performance */}
        <div className="hidden sm:block absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#2EE59D]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-[#2EE59D]/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            Ready to make a promise?
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
                {/* <li><a href="/whitepaper.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Whitepaper</a></li> */}
              </ul>
            </div>
            {/* Built With */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] mb-4">Built With</h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-[var(--text-secondary)]">
                <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Base</a>
                <a href="https://morpho.org" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Morpho</a>
                <a href="https://privy.io" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Privy</a>
                <a href="https://www.alchemy.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Alchemy</a>
                <a href="https://www.circle.com/usdc" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">USDC</a>
              </div>
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
              <span className="font-bold text-[#2EE59D] leading-none">vaada</span>
              <span className="text-sm text-[var(--text-secondary)] leading-none">· Keep Your Promise</span>
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
