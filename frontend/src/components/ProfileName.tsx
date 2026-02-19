'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { VAADA_RECEIPTS_ABI, NEW_USER_CHALLENGE_ABI, GOALSTAKE_ABI, type Receipt } from '@/lib/abis'
import { CONTRACTS } from '@/lib/wagmi'
import { base } from 'wagmi/chains'

export function useProfileName(wallet?: string) {
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (!wallet) return
    
    setLoading(true)
    fetch(`/api/profile?wallet=${wallet}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setDisplayName(data.displayName)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [wallet])
  
  return { displayName, loading, setDisplayName }
}

// Bulk fetch profiles for leaderboard
export async function fetchProfiles(wallets: string[]): Promise<Record<string, string>> {
  if (wallets.length === 0) return {}
  
  try {
    const res = await fetch(`/api/profile?wallets=${wallets.join(',')}`)
    const data = await res.json()
    return data.success ? data.profiles : {}
  } catch {
    return {}
  }
}

export function ProfileNameButton() {
  const { address, isConnected } = useAccount()
  const { displayName, setDisplayName } = useProfileName(address)
  const [isEditing, setIsEditing] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])
  
  useEffect(() => {
    if (displayName) setInputValue(displayName)
  }, [displayName])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  // Update dropdown position when opened
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = Math.min(320, window.innerWidth - 32)
      const rightEdge = window.innerWidth - rect.right
      // Ensure dropdown doesn't overflow left side of viewport
      const maxRight = window.innerWidth - dropdownWidth - 16
      setDropdownPos({
        top: rect.bottom + 8,
        right: Math.min(Math.max(16, rightEdge), maxRight),
      })
    }
  }, [showDropdown])
  
  if (!isConnected || !address) return null
  
  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
  
  const handleSave = async () => {
    if (!inputValue.trim()) return
    
    setSaving(true)
    setError(null)
    
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, displayName: inputValue.trim() }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return
      }
      
      setDisplayName(data.displayName)
      setIsEditing(false)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setShowDropdown(!showDropdown)}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors px-1 py-1 flex items-center gap-1"
        >
          {displayName ? (
            <span>{displayName}</span>
          ) : (
            <span className="font-mono text-xs">{shortAddress}</span>
          )}
          <svg className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && createPortal(
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[99]" onClick={() => setShowDropdown(false)} />
            <div ref={dropdownRef} style={{ top: dropdownPos.top, right: dropdownPos.right }} className="fixed w-[min(320px,calc(100vw-32px))] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-[100] max-h-[80vh] overflow-y-auto">
              {/* Account Actions / Edit Name */}
              {isEditing ? (
                <div className="p-3 border-b border-[var(--border)]">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Display name"
                      maxLength={20}
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm
                        focus:outline-none focus:border-[#2EE59D] focus:ring-1 focus:ring-[#2EE59D]/50
                        placeholder:text-[var(--text-secondary)] transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving || !inputValue.trim() || inputValue.length < 2}
                      className="px-3 py-2 bg-[#2EE59D] text-white text-sm font-semibold rounded-lg
                        hover:bg-[#26c987] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-2 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>
              ) : (
                <div className="flex items-center border-b border-[var(--border)]">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 flex-1 px-4 py-3 text-sm hover:bg-[var(--border)] transition-colors justify-center"
                  >
                    <svg className="w-4 h-4 text-[var(--text-secondary)] inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg> {displayName ? 'Edit Name' : 'Set Name'}
                  </button>
                  <div className="w-px h-8 bg-[var(--border)]" />
                  <button
                    onClick={() => { handleCopy(); setTimeout(() => setShowDropdown(false), 500) }}
                    className="flex items-center gap-2 flex-1 px-4 py-3 text-sm hover:bg-[var(--border)] transition-colors justify-center"
                  >
                    {copied 
                      ? <svg className="w-4 h-4 text-[#2EE59D] inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      : <svg className="w-4 h-4 text-[var(--text-secondary)] inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                    } {copied ? 'Copied!' : 'Copy Address'}
                  </button>
                </div>
              )}

              {/* Profile Stats + History */}
              <ProfileDropdownStats address={address} />
            </div>
          </>,
          document.body
        )}
      </div>
    </>
  )
}

// ── Inline Profile Stats for Dropdown ──

function ProfileDropdownStats({ address }: { address: `0x${string}` }) {
  const contracts = CONTRACTS[base.id]

  // Receipts data (onchain permanent record)
  const { data: reputation, isLoading: loadingRep } = useReadContract({
    address: contracts.vaadaReceipts,
    abi: VAADA_RECEIPTS_ABI,
    functionName: 'getReputation',
    args: [address],
  })

  const { data: receipts, isLoading: loadingReceipts } = useReadContract({
    address: contracts.vaadaReceipts,
    abi: VAADA_RECEIPTS_ABI,
    functionName: 'getWalletReceipts',
    args: [address],
  })

  const { data: tokenIds } = useReadContract({
    address: contracts.vaadaReceipts,
    abi: VAADA_RECEIPTS_ABI,
    functionName: 'tokensOf',
    args: [address],
  })

  // NewUserChallenge data
  const { data: hasJoinedChallenge, isLoading: loadingChallenge } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'hasJoinedChallenge',
    args: [address],
  })

  const { data: challengeData } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_CHALLENGE_ABI,
    functionName: 'getChallenge',
    args: [address],
    query: { enabled: !!hasJoinedChallenge },
  })

  // VaadaV3 goals — check participation for goals 9+ (1-8 were test goals)
  const { data: goalParticipants } = useReadContracts({
    contracts: Array.from({ length: 20 }, (_, i) => ({
      address: contracts.goalStake,
      abi: GOALSTAKE_ABI as any,
      functionName: 'getParticipant',
      args: [BigInt(i + 9), address],
    })),
  })

  const isLoading = loadingRep || loadingReceipts || loadingChallenge

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Base stats from receipts
  const [repAttempted, repCompleted, repWinRate, repTotalStaked, repTotalEarned, repStreak, repBestStreak] = reputation || [BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]
  const receiptList = (receipts as Receipt[]) || []

  // Count goals from VaadaV3 participation (goals the user joined)
  let v3Attempted = 0
  let v3Completed = 0
  let v3Settled = 0
  let v3Staked = BigInt(0)
  let v3Earned = BigInt(0)
  if (goalParticipants) {
    for (const gp of goalParticipants) {
      if (gp.status === 'success' && gp.result) {
        const p = gp.result as any
        if (p.user && p.user !== '0x0000000000000000000000000000000000000000' && Number(p.stake) > 0) {
          v3Attempted++
          if (p.verified) v3Settled++
          if (p.verified && p.succeeded) v3Completed++
          v3Staked += BigInt(p.stake)
          if (p.claimed) v3Earned += BigInt(p.stake) // approximate — claimed means they got payout
        }
      }
    }
  }

  // Count NewUserChallenge
  let nucAttempted = 0
  let nucCompleted = 0
  let nucSettled = 0
  let nucStaked = BigInt(0)
  let nucEarned = BigInt(0)
  if (hasJoinedChallenge && challengeData) {
    const [amount, , settled, won] = challengeData as [bigint, bigint, boolean, boolean, boolean]
    nucAttempted = 1
    if (settled) {
      nucSettled = 1
      nucCompleted = won ? 1 : 0
      nucEarned = won ? amount : BigInt(0)
    }
    nucStaked = amount
  }

  // Combine: receipts + v3 goals + NUC (avoid double counting — receipts will eventually cover everything, but for now they're empty)
  const receiptGoalIds = new Set(receiptList.map(r => Number(r.goalId)))
  // Only add v3/nuc stats if not already in receipts
  const totalAttempted = Number(repAttempted) + (Number(repAttempted) === 0 ? v3Attempted + nucAttempted : 0)
  const totalCompleted = Number(repCompleted) + (Number(repCompleted) === 0 ? v3Completed + nucCompleted : 0)
  const totalStakedBig = repTotalStaked + (Number(repTotalStaked) === 0 ? v3Staked + nucStaked : BigInt(0))
  const totalEarnedBig = repTotalEarned + (Number(repTotalEarned) === 0 ? v3Earned + nucEarned : BigInt(0))

  const totalSettled = Number(repAttempted) + (Number(repAttempted) === 0 ? v3Settled + nucSettled : 0)
  const broken = totalSettled - totalCompleted
  const winRate = totalSettled > 0 ? Math.round((totalCompleted / totalSettled) * 100) : 0
  const streak = Number(repStreak) // streak only from receipts for now
  const stakedNum = Number(totalStakedBig)
  const earnedNum = Number(totalEarnedBig)
  // P&L only for settled goals — active stakes aren't losses yet
  const settledStaked = totalSettled > 0 ? stakedNum : 0
  const netPnl = earnedNum - settledStaked
  const netFormatted = settledStaked > 0 || earnedNum > 0 ? (netPnl >= 0 ? `+$${formatUnits(BigInt(Math.abs(netPnl)), 6)}` : `-$${formatUnits(BigInt(Math.abs(netPnl)), 6)}`) : '$0'

  return (
    <div className="p-4">
      {/* Stats Row 1 */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold">{totalAttempted}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">{totalAttempted === 1 ? 'Promise' : 'Promises'}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[#2EE59D]">{totalCompleted}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Kept</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold ${broken > 0 ? 'text-red-400' : ''}`}>{broken}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Broken</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-orange-400">{Number(streak) > 0 ? `${Number(streak)} 🔥` : '0'}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Streak</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{totalAttempted > 0 ? `${winRate}%` : '—'}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Win Rate</p>
        </div>
      </div>

      {/* Stats Row 2 - Cash */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center px-1 py-1.5 rounded-lg bg-[var(--background)]">
          <p className="text-sm font-semibold">${stakedNum > 0 ? formatUnits(totalStakedBig, 6) : '0'}</p>
          <p className="text-[10px] text-[var(--text-secondary)] whitespace-nowrap">Total Staked</p>
        </div>
        <div className="text-center px-1 py-1.5 rounded-lg bg-[var(--background)]">
          <p className="text-sm font-semibold">${earnedNum > 0 ? formatUnits(totalEarnedBig, 6) : '0'}</p>
          <p className="text-[10px] text-[var(--text-secondary)] whitespace-nowrap">Total Earned</p>
        </div>
        <div className="text-center px-1 py-1.5 rounded-lg bg-[var(--background)]">
          <p className={`text-sm font-semibold ${netPnl > 0 ? 'text-[#2EE59D]' : netPnl < 0 ? 'text-red-400' : ''}`}>{netFormatted}</p>
          <p className={`text-[10px] whitespace-nowrap ${netPnl > 0 ? 'text-[#2EE59D]' : netPnl < 0 ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>{netPnl > 0 ? 'Profit' : netPnl < 0 ? 'Loss' : 'Profit / Loss'}</p>
        </div>
      </div>

      {/* Promise History */}
      {receiptList.length > 0 ? (
        <div>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-2">Promise History</p>
          <div className="space-y-1.5">
            {[...receiptList].reverse().map((r, i) => (
              <div key={i} className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs ${r.succeeded ? 'bg-[#2EE59D]/5' : 'bg-red-500/5'}`}>
                <div className="flex items-center gap-1.5">
                  <span>{r.succeeded ? '✅' : '❌'}</span>
                  <span className="font-medium truncate max-w-[120px]">{r.goalName || `Goal #${Number(r.goalId)}`}</span>
                  {tokenIds && (tokenIds as bigint[])[i] && <a href={`https://opensea.io/assets/base/${contracts.vaadaReceipts}/${Number((tokenIds as bigint[])[i])}`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--text-secondary)] transition-colors ml-1.5 whitespace-nowrap">View Receipt</a>}
                </div>
                <span className={`font-medium ${r.succeeded ? 'text-[#2EE59D]' : 'text-red-400'}`}>
                  {r.succeeded ? `+$${formatUnits(r.payout, 6)}` : `-$${formatUnits(r.stakeAmount, 6)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-secondary)] text-center py-2">No settled promises yet</p>
      )}
    </div>
  )
}
