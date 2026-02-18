'use client'

import { useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { ProfileView } from '@/components/ProfileView'
import { PrivyConnectButton } from '@/components/PrivyConnectButton'
import Link from 'next/link'

export default function ProfilePage() {
  const params = useParams()
  const profileAddress = params.address as string

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-[#2EE59D]">vaada</Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">
              Browse
            </Link>
            <Link href="/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">
              Dashboard
            </Link>
            <PrivyConnectButton />
          </div>
        </div>
      </header>

      <div className="pt-24 pb-16 px-6">
        <ProfileView address={profileAddress as `0x${string}`} />
      </div>
    </main>
  )
}
