import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vaada | Own Your Promise',
  description: 'Stake money on your goals. Hit your target, earn rewards. Miss it, lose your stake. Secured on the blockchain.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  metadataBase: new URL('https://vaada.io'),
  openGraph: {
    title: 'Vaada | Own Your Promise',
    description: 'Stake money on your goals. Hit your target, earn rewards. Miss it, lose your stake. Secured on the blockchain.',
    url: 'https://vaada.io',
    siteName: 'Vaada',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vaada | Own Your Promise',
    description: 'Stake money on your goals. Hit your target, earn rewards. Miss it, lose your stake. Secured on the blockchain.',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://auth.privy.io" />
        <link rel="dns-prefetch" href="https://auth.privy.io" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2EE59D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} bg-[var(--background)] text-[var(--foreground)]`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
