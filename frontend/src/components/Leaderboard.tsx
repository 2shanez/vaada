"use client"

import { useState, useEffect } from "react"
import { usePublicClient } from "wagmi"
import { createPublicClient, http, formatUnits } from "viem"
import { base } from "viem/chains"
import { useContracts } from "@/lib/hooks"
import { VAADA_RECEIPTS_ABI } from "@/lib/abis"
import { fetchProfiles } from "./ProfileName"
import { useInView } from "@/lib/useInView"

const fallbackClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://base-mainnet.g.alchemy.com/v2/V2EEs8WP3hd6yldPEx92v"),
})

// GoalType enum matches contract: 0 = STRAVA_MILES, 1 = FITBIT_STEPS
const GOAL_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  all: { label: "All", emoji: "🏆" },
  strava: { label: "Strava", emoji: "🏃" },
  fitbit: { label: "Fitbit", emoji: "👟" },
}

interface Receipt {
  goalId: bigint
  goalType: number
  succeeded: boolean
  stakeAmount: bigint
  payout: bigint
}

interface LeaderboardEntry {
  address: string
  name?: string
  attempted: number
  completed: number
  winRate: number
  streak: number
  totalStaked: number
}

function computeStats(receipts: Receipt[]): Omit<LeaderboardEntry, "address" | "name"> {
  const attempted = receipts.length
  const completed = receipts.filter((r) => r.succeeded).length
  const winRate = attempted > 0 ? Math.round((completed / attempted) * 100) : 0
  const totalStaked = receipts.reduce((sum, r) => sum + Number(formatUnits(r.stakeAmount, 6)), 0)

  // Calculate current streak (most recent consecutive wins)
  let streak = 0
  // Receipts are in mint order, walk backwards
  for (let i = receipts.length - 1; i >= 0; i--) {
    if (receipts[i].succeeded) streak++
    else break
  }

  return { attempted, completed, winRate, streak, totalStaked }
}

export function Leaderboard() {
  const contracts = useContracts()
  const publicClient = usePublicClient()
  const leaderboardView = useInView(0.2)
  const [allData, setAllData] = useState<Map<string, Receipt[]>>(new Map())
  const [profiles, setProfiles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    if (!contracts.vaadaReceipts) return
    const client = publicClient || fallbackClient

    const fetchLeaderboard = async () => {
      try {
        const supply = await client.readContract({
          address: contracts.vaadaReceipts,
          abi: VAADA_RECEIPTS_ABI,
          functionName: "totalSupply",
        }) as bigint

        if (Number(supply) === 0) {
          setLoading(false)
          return
        }

        // Batch ownerOf calls via multicall
        const ownerOfCalls = Array.from({ length: Number(supply) }, (_, i) => ({
          address: contracts.vaadaReceipts as `0x${string}`,
          abi: [{ type: "function" as const, name: "ownerOf" as const, inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" as const }],
          functionName: "ownerOf" as const,
          args: [BigInt(i + 1)],
        }))

        const ownerResults = await client.multicall({ contracts: ownerOfCalls })
        const owners = ownerResults.map(r => r.status === 'success' ? r.result as unknown as string : null)
        const uniqueAddresses = [...new Set(owners.filter(Boolean) as string[])]

        // Batch getWalletReceipts calls via multicall
        const receiptCalls = uniqueAddresses.map(addr => ({
          address: contracts.vaadaReceipts as `0x${string}`,
          abi: VAADA_RECEIPTS_ABI,
          functionName: "getWalletReceipts" as const,
          args: [addr as `0x${string}`],
        }))

        const receiptResults = await client.multicall({ contracts: receiptCalls })
        const receiptMap = new Map<string, Receipt[]>()
        uniqueAddresses.forEach((addr, i) => {
          if (receiptResults[i].status === 'success') {
            receiptMap.set(addr, receiptResults[i].result as unknown as Receipt[])
          }
        })

        setAllData(receiptMap)

        // Fetch display names
        const profs = await fetchProfiles(uniqueAddresses)
        setProfiles(profs)
      } catch (err) {
        console.error("Leaderboard fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [publicClient, contracts.vaadaReceipts])

  // Compute entries based on active tab
  const entries: LeaderboardEntry[] = []
  allData.forEach((receipts, address) => {
    const filtered = activeTab === "all"
      ? receipts
      : activeTab === "strava"
        ? receipts.filter((r) => r.goalType === 0)
        : receipts.filter((r) => r.goalType === 1)

    if (filtered.length === 0) return

    const stats = computeStats(filtered)
    entries.push({ address, name: profiles[address.toLowerCase()], ...stats })
  })

  // Sort: win rate > completed > streak
  entries.sort((a, b) => b.winRate - a.winRate || b.completed - a.completed || b.streak - a.streak)
  const topEntries = entries.slice(0, 100)

  const rankEmoji = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`)

  const tabs = Object.entries(GOAL_TYPE_LABELS)

  return (
    <section
      ref={leaderboardView.ref}
      className={`border-t border-[var(--border)] py-8 sm:py-12 px-4 sm:px-6 transition-all duration-700 ${leaderboardView.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <span className="text-xs font-semibold text-[#2EE59D] uppercase tracking-wider">Leaderboard</span>
          <h2 className="text-2xl font-bold mt-2">Top Promisers</h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {tabs.map(([key, { label, emoji }]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-[#2EE59D]/15 text-[#2EE59D] border border-[#2EE59D]/30"
                  : "text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-transparent"
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : topEntries.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              {activeTab === "all" ? "No promises settled yet. Be the first!" : `No ${GOAL_TYPE_LABELS[activeTab]?.label} promises settled yet.`}
            </p>
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_60px_60px_60px_80px] sm:grid-cols-[50px_1fr_80px_80px_80px_100px] gap-2 px-4 py-3 border-b border-[var(--border)] text-[10px] sm:text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              <span></span>
              <span>User</span>
              <span className="text-center">Kept</span>
              <span className="text-center">Rate</span>
              <span className="text-center">Streak</span>
              <span className="text-right">Staked</span>
            </div>

            {/* Rows */}
            {topEntries.map((entry, i) => (
              <div
                key={entry.address}
                className={`grid grid-cols-[40px_1fr_60px_60px_60px_80px] sm:grid-cols-[50px_1fr_80px_80px_80px_100px] gap-2 px-4 py-3 items-center ${
                  i === 0 ? "bg-[#2EE59D]/5" : ""
                } ${i < topEntries.length - 1 ? "border-b border-[var(--border)]/50" : ""}`}
              >
                <span className={`text-sm font-bold ${i < 3 ? "text-[#2EE59D]" : "text-[var(--text-secondary)]"}`}>
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
                  {entry.attempted > 0 ? `${entry.winRate}%` : "—"}
                </span>
                <span className="text-sm font-semibold text-center">
                  {entry.streak > 0 ? `${entry.streak} 🔥` : "0"}
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
