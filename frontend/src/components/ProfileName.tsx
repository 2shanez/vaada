'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { VAADA_RECEIPTS_ABI, type Receipt } from '@/lib/abis'
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
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
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
  
  // Compact display when not editing - name with dropdown
  if (!isEditing) {
    return (
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
            <div ref={dropdownRef} style={{ top: dropdownPos.top, right: dropdownPos.right }} className="fixed w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-[100] max-h-[80vh] overflow-y-auto">
              {/* Account Actions */}
              <div className="border-b border-[var(--border)]">
                <button
                  onClick={() => { setShowDropdown(false); setIsEditing(true) }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-[var(--border)] transition-colors text-left"
                >
                  <span>✏️</span> {displayName ? 'Edit Name' : 'Set Name'}
                </button>
                <button
                  onClick={() => { handleCopy(); setTimeout(() => setShowDropdown(false), 500) }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-[var(--border)] transition-colors text-left"
                >
                  <span>{copied ? '✓' : '📋'}</span> {copied ? 'Copied!' : 'Copy Address'}
                </button>
              </div>

              {/* Profile Stats + History */}
              <ProfileDropdownStats address={address} />
            </div>
          </>,
          document.body
        )}
      </div>
    )
  }
  
  // Editing modal
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsEditing(false)}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => setIsEditing(false)}
          className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">👤</span>
          </div>
          <h3 className="font-semibold text-lg">Set your name</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            This will show on leaderboards instead of your wallet address.
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter a display name"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] 
                focus:outline-none focus:border-[#2EE59D] focus:ring-1 focus:ring-[#2EE59D]/50
                placeholder:text-[var(--text-secondary)] transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 text-right">
              {inputValue.length}/20 characters
            </p>
          </div>
          
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          
          <button
            onClick={handleSave}
            disabled={saving || !inputValue.trim() || inputValue.length < 2}
            className="w-full py-3 bg-[#2EE59D] text-white font-semibold rounded-xl
              hover:bg-[#26c987] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          
          <p className="text-[10px] text-[var(--text-secondary)] text-center">
            Wallet: {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
      </div>
    </>
  )
}

// ── Inline Profile Stats for Dropdown ──

function ProfileDropdownStats({ address }: { address: `0x${string}` }) {
  const contracts = CONTRACTS[base.id]

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

  const isLoading = loadingRep || loadingReceipts

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-[#2EE59D] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const [attempted, completed, winRate, totalStaked, totalEarned, streak, bestStreak] = reputation || [BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]
  const receiptList = (receipts as Receipt[]) || []

  return (
    <div className="p-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold">{Number(attempted)}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Promises</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[#2EE59D]">{Number(completed)}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Kept</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{Number(attempted) > 0 ? `${(Number(winRate) / 100).toFixed(0)}%` : '—'}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Win Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center px-2 py-1.5 rounded-lg bg-[var(--background)]">
          <p className="text-sm font-semibold">{Number(streak) > 0 ? `${Number(streak)} 🔥` : '0'}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Streak</p>
        </div>
        <div className="text-center px-2 py-1.5 rounded-lg bg-[var(--background)]">
          <p className="text-sm font-semibold">${Number(totalStaked) > 0 ? formatUnits(totalStaked as bigint, 6) : '0'}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Staked</p>
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
                </div>
                <span className={`font-medium ${r.succeeded ? 'text-[#2EE59D]' : 'text-red-400'}`}>
                  ${formatUnits(r.payout, 6)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-secondary)] text-center py-2">No promises yet</p>
      )}
    </div>
  )
}
