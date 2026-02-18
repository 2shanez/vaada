'use client'

import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { useContracts } from '@/lib/hooks'
import { VAADA_RECEIPTS_ABI, type Receipt } from '@/lib/abis'
import { useState } from 'react'

const GOAL_TYPE_LABELS: Record<number, { label: string; unit: string }> = {
  0: { label: 'Strava', unit: 'miles' },
  1: { label: 'Fitbit', unit: 'steps' },
}

function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

interface ProfileViewProps {
  address: `0x${string}`
}

export function ProfileView({ address }: ProfileViewProps) {
  const { address: viewerAddress } = useAccount()
  const contracts = useContracts()
  const isOwnProfile = viewerAddress?.toLowerCase() === address.toLowerCase()
  const [copiedLink, setCopiedLink] = useState(false)

  // Fetch reputation stats
  const { data: reputation, isLoading: loadingRep } = useReadContract({
    address: contracts.vaadaReceipts,
    abi: VAADA_RECEIPTS_ABI,
    functionName: 'getReputation',
    args: [address],
  })

  // Fetch all receipts
  const { data: receipts, isLoading: loadingReceipts } = useReadContract({
    address: contracts.vaadaReceipts,
    abi: VAADA_RECEIPTS_ABI,
    functionName: 'getWalletReceipts',
    args: [address],
  })

  const isLoading = loadingRep || loadingReceipts

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const [attempted, completed, winRate, totalStaked, totalEarned, streak, bestStreak] = reputation || [0n, 0n, 0n, 0n, 0n, 0n, 0n]
  const receiptList = (receipts as Receipt[]) || []

  const handleShare = () => {
    const url = `${window.location.origin}/profile/${address}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2EE59D] to-[#1BC47D] flex items-center justify-center text-white font-bold text-lg">
                {address.slice(2, 4).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{isOwnProfile ? 'My Profile' : shortenAddress(address)}</h1>
                <p className="text-sm text-[var(--text-secondary)] font-mono">{shortenAddress(address)}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:border-[#2EE59D]/50 transition-colors"
          >
            {copiedLink ? '✓ Copied!' : '🔗 Share Profile'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard label="Promises" value={Number(attempted).toString()} />
        <StatCard label="Kept" value={Number(completed).toString()} accent />
        <StatCard
          label="Win Rate"
          value={Number(attempted) > 0 ? `${(Number(winRate) / 100).toFixed(0)}%` : '—'}
        />
        <StatCard
          label="Streak"
          value={Number(streak) > 0 ? `${Number(streak)} 🔥` : '0'}
          sub={Number(bestStreak) > 0 ? `Best: ${Number(bestStreak)}` : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <StatCard
          label="Total Staked"
          value={Number(totalStaked) > 0 ? `$${formatUnits(totalStaked as bigint, 6)}` : '$0'}
        />
        <StatCard
          label="Total Earned"
          value={Number(totalEarned) > 0 ? `$${formatUnits(totalEarned as bigint, 6)}` : '$0'}
          accent={Number(totalEarned) > Number(totalStaked)}
        />
      </div>

      {/* Promise History */}
      <div>
        <h2 className="text-xl font-bold mb-4">Promise History</h2>

        {receiptList.length === 0 ? (
          <div className="text-center py-16 border border-[var(--border)] rounded-xl">
            <span className="text-4xl mb-4 block">🧾</span>
            <p className="text-[var(--text-secondary)] mb-1">No promises yet</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {isOwnProfile ? 'Make your first promise to start building your history.' : 'This wallet has no promise history.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...receiptList].reverse().map((receipt, i) => (
              <ReceiptCard key={i} receipt={receipt} />
            ))}
          </div>
        )}
      </div>

      {/* Onchain verification note */}
      {receiptList.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            All records are verified onchain on{' '}
            <a
              href={`https://basescan.org/address/${contracts.vaadaReceipts}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2EE59D] hover:underline"
            >
              Base
            </a>
            {' '}· Permanent and tamper-proof
          </p>
        </div>
      )}
    </div>
  )
}

// ── Stat Card ──

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-[#2EE59D]' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-secondary)] mt-1">{sub}</p>}
    </div>
  )
}

// ── Receipt Card ──

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const goalType = GOAL_TYPE_LABELS[receipt.goalType] || { label: 'Unknown', unit: 'units' }
  const stakeFormatted = formatUnits(receipt.stakeAmount, 6)
  const payoutFormatted = formatUnits(receipt.payout, 6)
  const targetNum = Number(receipt.target)
  const actualNum = Number(receipt.actual)
  const progress = targetNum > 0 ? Math.min((actualNum / targetNum) * 100, 100) : 0

  return (
    <div className={`p-4 rounded-xl border ${receipt.succeeded ? 'border-[#2EE59D]/30 bg-[#2EE59D]/5' : 'border-red-500/20 bg-red-500/5'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{receipt.succeeded ? '✅' : '❌'}</span>
          <div>
            <p className="font-semibold">{receipt.goalName || `Goal #${Number(receipt.goalId)}`}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {formatDate(receipt.startTime)} → {formatDate(receipt.endTime)}
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${receipt.succeeded ? 'bg-[#2EE59D]/20 text-[#2EE59D]' : 'bg-red-500/20 text-red-400'}`}>
          {receipt.succeeded ? 'Promise Kept' : 'Promise Broken'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
          <span>{actualNum.toLocaleString()} {goalType.unit}</span>
          <span>Target: {targetNum.toLocaleString()} {goalType.unit}</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${receipt.succeeded ? 'bg-[#2EE59D]' : 'bg-red-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stake details */}
      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-[var(--text-secondary)]">Staked: </span>
          <span className="font-medium">${stakeFormatted}</span>
        </div>
        <div>
          <span className="text-[var(--text-secondary)]">Payout: </span>
          <span className={`font-medium ${receipt.succeeded ? 'text-[#2EE59D]' : 'text-red-400'}`}>
            ${payoutFormatted}
          </span>
        </div>
        <div className="text-xs text-[var(--text-secondary)] ml-auto flex items-center gap-1">
          <span>📱</span> {goalType.label}
        </div>
      </div>
    </div>
  )
}
