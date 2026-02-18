'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { PrivyConnectButton } from '@/components/PrivyConnectButton'
import Link from 'next/link'

export default function ProfileRedirect() {
  const router = useRouter()
  const { address } = useAccount()
  const { ready, authenticated } = usePrivy()

  useEffect(() => {
    if (ready && authenticated && address) {
      router.replace(`/profile/${address}`)
    }
  }, [ready, authenticated, address, router])

  if (!ready) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-[#2EE59D]">vaada</Link>
            <PrivyConnectButton />
          </div>
        </header>
        <div className="flex flex-col items-center justify-center h-screen px-6">
          <div className="w-16 h-16 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mb-6">
            <span className="text-3xl">👤</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">View your profile</h1>
          <p className="text-[var(--text-secondary)] mb-8">Sign in to see your promise history.</p>
          <PrivyConnectButton />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" />
    </main>
  )
}
