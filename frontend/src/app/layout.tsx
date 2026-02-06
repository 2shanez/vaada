import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'vaada | keep your promise',
  description: 'Stake money on your goals. Hit them, keep it. Miss them, lose it. The commitment market built on Base.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  metadataBase: new URL('https://vaada.io'),
  openGraph: {
    title: 'vaada | keep your promise',
    description: 'Stake money on your goals. Hit them, keep it. Miss them, lose it.',
    url: 'https://vaada.io',
    siteName: 'vaada',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'vaada | keep your promise',
    description: 'Stake money on your goals. Hit them, keep it. Miss them, lose it.',
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
