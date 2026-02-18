'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'

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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
      <div className="relative" ref={dropdownRef}>
        <button
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

        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50">
            <a
              href="/profile"
              className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--border)] transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              <span>👤</span> View Profile
            </a>
            <button
              onClick={() => { setShowDropdown(false); setIsEditing(true) }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-[var(--border)] transition-colors text-left"
            >
              <span>✏️</span> {displayName ? 'Edit Name' : 'Set Name'}
            </button>
            <button
              onClick={() => { handleCopy(); setShowDropdown(false) }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-[var(--border)] transition-colors text-left border-t border-[var(--border)]"
            >
              <span>{copied ? '✓' : '📋'}</span> {copied ? 'Copied!' : 'Copy Address'}
            </button>
          </div>
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
