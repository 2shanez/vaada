'use client'

import { useAccount } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { MyGoals } from '@/components/MyGoals'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PrivyConnectButton } from '@/components/PrivyConnectButton'
import Link from 'next/link'

export default function Dashboard() {
  const { address } = useAccount()
  const { ready, authenticated } = usePrivy()

  if (!ready) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    )
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-[#2EE59D]">goalstake</Link>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <PrivyConnectButton />
            </div>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center h-screen px-6">
          <div className="w-16 h-16 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mb-6">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Sign in to view your goals</h1>
          <p className="text-[var(--text-secondary)] mb-8 text-center">
            Connect your wallet or sign in with email to see your active stakes.
          </p>
          <PrivyConnectButton />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-[#2EE59D]">goalstake</Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">
              Browse Goals
            </Link>
            <ThemeToggle />
            <PrivyConnectButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Goals</h1>
            <p className="text-[var(--text-secondary)]">
              Track your active stakes and claim winnings.
            </p>
          </div>

          <MyGoals />
        </div>
      </div>
    </main>
  )
}
