let mixpanelInstance: any = null

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN

const getMixpanel = async () => {
  if (!MIXPANEL_TOKEN || typeof window === 'undefined') return null
  if (mixpanelInstance) return mixpanelInstance
  const { default: mixpanel } = await import('mixpanel-browser')
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === 'development',
    track_pageview: true,
    persistence: 'localStorage',
  })
  mixpanelInstance = mixpanel
  return mixpanel
}

// Initialize Mixpanel
export const initAnalytics = () => {
  getMixpanel() // fire and forget
}

// Identify user (call after login)
export const identifyUser = async (userId: string, traits?: Record<string, any>) => {
  const mp = await getMixpanel()
  if (!mp) return
  mp.identify(userId)
  if (traits) mp.people.set(traits)
}

// Track events
const track = async (event: string, properties?: Record<string, any>) => {
  const mp = await getMixpanel()
  if (!mp) return
  mp.track(event, properties)
}

// Pre-defined events for Vaada
export const analytics = {
  signedUp: (method: string) => track('🔐 Signed Up', { method }),
  loggedIn: (method: string) => track('🔑 Logged In', { method }),
  walletConnected: (address: string) => track('👛 Wallet Connected', { address: address.slice(0, 10) }),
  onboardingViewed: () => track('👀 Onboarding Viewed'),
  onboardingCompleted: (stakeAmount: number) => track('✅ Onboarding Completed', { stakeAmount }),
  onboardingFundWalletClicked: () => track('💰 Onboarding Fund Wallet Clicked'),
  stravaConnected: () => track('🏃 Strava Connected'),
  stravaDisconnected: () => track('🏃 Strava Disconnected'),
  fitbitConnected: () => track('⌚ Fitbit Connected'),
  fitbitDisconnected: () => track('⌚ Fitbit Disconnected'),
  goalViewed: (goalId: number, goalName: string) => track('👁️ Goal Viewed', { goalId, goalName }),
  goalJoined: (goalId: number, goalName: string, stakeAmount: number) => track('🎯 Goal Joined', { goalId, goalName, stakeAmount }),
  goalClaimed: (goalId: number, amount: number, won: boolean) => track('🏆 Goal Claimed', { goalId, amount, won }),
  challengeJoined: (stakeAmount: number) => track('🤝 Challenge Joined', { stakeAmount }),
  challengeWon: () => track('🎉 Challenge Won'),
  challengeLost: () => track('😢 Challenge Lost'),
  challengeResultDismissed: (won: boolean) => track('👋 Challenge Result Dismissed', { won }),
  networkSwitchStarted: () => track('🔄 Network Switch Started'),
  networkSwitchCompleted: () => track('🔄 Network Switch Completed'),
  approveStarted: (amount: number) => track('📝 Approve Started', { amount }),
  approveCompleted: (amount: number) => track('📝 Approve Completed', { amount }),
  joinStarted: (goalId: number, amount: number) => track('⚡ Join Started', { goalId, amount }),
  joinCompleted: (goalId: number, amount: number) => track('⚡ Join Completed', { goalId, amount }),
  fundWalletOpened: () => track('💵 Fund Wallet Opened'),
  fundWalletCoinbaseClicked: (type: string) => track('💵 Fund Wallet Coinbase Clicked', { type }),
  walletAddressCopied: () => track('📋 Wallet Address Copied'),
  pageViewed: (page: string) => track('📄 Page Viewed', { page }),
  ctaClicked: (cta: string, location: string) => track('👆 CTA Clicked', { cta, location }),
  transactionFailed: (action: string, error: string) => track('❌ Transaction Failed', { action, error }),
}
