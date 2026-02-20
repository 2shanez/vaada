'use client'

import { useState, useEffect } from 'react'
import { usePublicClient, useReadContract } from 'wagmi'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { useContracts } from '@/lib/hooks'
import { VAADA_RECEIPTS_ABI } from '@/lib/abis'
import { fetchProfiles } from './ProfileName'
import { useInView } from '@/lib/useInView'

const fallbackClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/V2EEs8WP3hd6yldPEx92v'),
})

interface LeaderboardEntry {
  address: string
  name?: string
  attempted: number
  completed: number
  winRate: number
  streak: number
  totalStaked: number
}

export function Leaderboard() {
  const contracts = useContracts()
  const publicClient = usePublicClient()
  const leaderboardView = useInView(0.2)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contracts.vaadaReceipts) return
    const client = publicClient || fallbackClient

    const fetchLeaderboard = async () => {
      try {
        // Check total supply first
        const supply = await client.readContract({
          address: contracts.vaadaReceipts,
          abi: VAADA_RECEIPTS_ABI,
          functionName: 'totalSupply',
        }) as bigint

        if (Number(supply) === 0) {
          setLoading(false)
          return
        }

        // Get all Transfer events (mints) from receipts contract — from address(0) = mint
        const logs = await client.getLogs({
          address: contracts.vaadaReceipts,
          event: {
            type: 'event',
            name: 'Transfer',
            inputs: [
              { type: 'address', name: 'from', indexed: true },
              { type: 'address', name: 'to', indexed: true },
              { type: 'uint256', name: 'tokenId', indexed: true },
            ],
          },
          args: {
            from: '0x0000000000000000000000000000000000000000',
          },
          fromBlock: 'earliest',
        })

        // Unique addresses
        const uniqueAddresses = [...new Set(logs.map(l => l.args.to as string))]

        // Fetch reputation for each
        const reputations = await Promise.all(
          uniqueAddresses.map(async (addr) => {
            try {
              const rep = await client.readContract({
                address: contracts.vaadaReceipts,
                abi: VAADA_RECEIPTS_ABI,
                functionName: 'getReputation',
                args: [addr as `0x${string}`],
              }) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint]

              return {
                address: addr,
                attempted: Number(rep[0]),
                completed: Number(rep[1]),
                winRate: Number(rep[2]),
                streak: Number(rep[5]),
                totalStaked: Number(formatUnits(rep[3], 6)),
              }
            } catch {
              return null
            }
          })
        )

        const valid = reputations.filter(Boolean) as LeaderboardEntry[]

        // Fetch display names
        const profiles = await fetchProfiles(valid.map(e => e.address))
        valid.forEach(e => {
          e.name = profiles[e.address.toLowerCase()]
        })

        // Sort by completed desc, then win rate, then streak
        valid.sort((a, b) => b.completed - a.completed || b.winRate - a.winRate || b.streak - a.streak)

        setEntries(valid)
      } catch (err) {
        console.error('Leaderboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [publicClient, contracts.vaadaReceipts])

  // Show section even when empty

  const rankEmoji = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

  return (
    <section ref={leaderboardView.ref} className={`border-t border-[var(--border)] py-8 sm:py-12 px-4 sm:px-6 transition-all duration-700 ${leaderboardView.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <span className="text-xs font-semibold text-[#2EE59D] uppercase tracking-wider">Leaderboard</span>
          <h2 className="text-2xl font-bold mt-2">Top Promisers</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No promises settled yet. Be the first!</p>
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[28px_1fr_50px_50px_60px] sm:grid-cols-[50px_1fr_80px_80px_80px_100px] gap-1 sm:gap-2 px-3 sm:px-4 py-3 border-b border-[var(--border)] text-[10px] sm:text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              <span></span>
              <span>User</span>
              <span className="text-center">Kept</span>
              <span className="text-center">Rate</span>
              <span className="text-center hidden sm:block">Streak</span>
              <span className="text-right">Staked</span>
            </div>

            {/* Rows */}
            {entries.map((entry, i) => (
              <div
                key={entry.address}
                className={`grid grid-cols-[28px_1fr_50px_50px_60px] sm:grid-cols-[50px_1fr_80px_80px_80px_100px] gap-1 sm:gap-2 px-3 sm:px-4 py-3 items-center ${
                  i === 0 ? 'bg-[#2EE59D]/5' : ''
                } ${i < entries.length - 1 ? 'border-b border-[var(--border)]/50' : ''}`}
              >
                <span className={`text-sm font-bold ${i < 3 ? 'text-[#2EE59D]' : 'text-[var(--text-secondary)]'}`}>
                  {rankEmoji(i)}
                </span>
                <a
                  href={`/profile/${entry.address}`}
                  className="text-sm font-medium truncate hover:text-[#2EE59D] transition-colors"
                >
                  {entry.name || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                </a>
                <span className="text-sm font-semibold text-center text-[#2EE59D]">
                  {entry.completed}/{entry.attempted}
                </span>
                <span className="text-sm font-semibold text-center">
                  {entry.attempted > 0 ? `${entry.winRate}%` : '—'}
                </span>
                <span className="text-sm font-semibold text-center hidden sm:block">
                  {entry.streak > 0 ? `${entry.streak} 🔥` : '0'}
                </span>
                <span className="text-sm font-semibold text-right">
                  ${entry.totalStaked.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
