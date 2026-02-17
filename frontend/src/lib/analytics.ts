import mixpanel from 'mixpanel-browser'

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN

// Initialize Mixpanel
export const initAnalytics = () => {
  if (MIXPANEL_TOKEN && typeof window !== 'undefined') {
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: process.env.NODE_ENV === 'development',
      track_pageview: true,
      persistence: 'localStorage',
    })
  }
}

// Identify user (call after login)
export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (!MIXPANEL_TOKEN) return
  mixpanel.identify(userId)
  if (traits) {
    mixpanel.people.set(traits)
  }
}

// Track events
export const track = (event: string, properties?: Record<string, any>) => {
  if (!MIXPANEL_TOKEN) return
  mixpanel.track(event, properties)
}

// Pre-defined events for Vaada
export const analytics = {
  // Auth & Onboarding
  signedUp: (method: string) => 
    track('🔐 Signed Up', { method }),
  loggedIn: (method: string) => 
    track('🔑 Logged In', { method }),
  walletConnected: (address: string) => 
    track('👛 Wallet Connected', { address: address.slice(0, 10) }),
  onboardingViewed: () => 
    track('👀 Onboarding Viewed'),
  onboardingCompleted: (stakeAmount: number) => 
    track('✅ Onboarding Completed', { stakeAmount }),
  onboardingFundWalletClicked: () => 
    track('💰 Onboarding Fund Wallet Clicked'),
  
  // Fitness Integrations
  stravaConnected: () => track('🏃 Strava Connected'),
  stravaDisconnected: () => track('🏃 Strava Disconnected'),
  fitbitConnected: () => track('⌚ Fitbit Connected'),
  fitbitDisconnected: () => track('⌚ Fitbit Disconnected'),
  
  // Goals
  goalViewed: (goalId: number, goalName: string) => 
    track('👁️ Goal Viewed', { goalId, goalName }),
  goalJoined: (goalId: number, goalName: string, stakeAmount: number) => 
    track('🎯 Goal Joined', { goalId, goalName, stakeAmount }),
  goalClaimed: (goalId: number, amount: number, won: boolean) => 
    track('🏆 Goal Claimed', { goalId, amount, won }),
  
  // New User Challenge
  challengeJoined: (stakeAmount: number) => 
    track('🤝 Challenge Joined', { stakeAmount }),
  challengeWon: () => 
    track('🎉 Challenge Won'),
  challengeLost: () => 
    track('😢 Challenge Lost'),
  challengeResultDismissed: (won: boolean) => 
    track('👋 Challenge Result Dismissed', { won }),
  
  // Transactions
  networkSwitchStarted: () => 
    track('🔄 Network Switch Started'),
  networkSwitchCompleted: () => 
    track('🔄 Network Switch Completed'),
  approveStarted: (amount: number) => 
    track('📝 Approve Started', { amount }),
  approveCompleted: (amount: number) => 
    track('📝 Approve Completed', { amount }),
  joinStarted: (goalId: number, amount: number) => 
    track('⚡ Join Started', { goalId, amount }),
  joinCompleted: (goalId: number, amount: number) => 
    track('⚡ Join Completed', { goalId, amount }),
  
  // Fund Wallet
  fundWalletOpened: () => 
    track('💵 Fund Wallet Opened'),
  fundWalletCoinbaseClicked: (type: string) => 
    track('💵 Fund Wallet Coinbase Clicked', { type }),
  walletAddressCopied: () => 
    track('📋 Wallet Address Copied'),
  
  // Navigation
  pageViewed: (page: string) => 
    track('📄 Page Viewed', { page }),
  ctaClicked: (cta: string, location: string) => 
    track('👆 CTA Clicked', { cta, location }),
  
  // Errors
  transactionFailed: (action: string, error: string) => 
    track('❌ Transaction Failed', { action, error }),
}
