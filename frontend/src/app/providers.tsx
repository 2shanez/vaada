'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { privyConfig } from '@/lib/wagmi'
import { useState, useEffect } from 'react'
import { base } from 'viem/chains'
import { PasswordGate } from '@/components/PasswordGate'
import { initAnalytics } from '@/lib/analytics'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000, // Data is fresh for 5 seconds (reduces redundant fetches)
        gcTime: 5 * 60 * 1000, // Keep unused data for 5 minutes
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnReconnect: true, // Refetch on network reconnect
        refetchOnReconnect: true, // Refetch on network reconnect
        retry: 2, // Retry failed requests twice
      },
    },
  }))

  // Initialize Mixpanel
  useEffect(() => {
    initAnalytics()
  }, [])

  return (
    <PasswordGate>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cml5laaq800q3lk0cokl3jrm3'}
        config={{
          appearance: {
            theme: 'dark',
            accentColor: '#2EE59D',
            showWalletLoginFirst: false,
          },
          loginMethods: ['email', 'wallet', 'google'],
          embeddedWallets: {
            ethereum: {
              createOnLogin: 'users-without-wallets',
            },
          },
          defaultChain: base,
          supportedChains: [base],
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={privyConfig}>
            {children}
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </PasswordGate>
  )
}
