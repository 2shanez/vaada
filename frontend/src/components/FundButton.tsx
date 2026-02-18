'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from 'wagmi'
import { useUSDC } from '@/lib/hooks'
import { SendModal } from './SendModal'

export function FundWalletButton() {
  const { address } = useAccount()
  const { balanceNum } = useUSDC()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleToggle = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 8, left: rect.left })
    }
    setIsOpen(prev => !prev)
    setCopied(false)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setCopied(false)
  }, [])

  const handleCopy = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => {
        setIsOpen(false)
        setCopied(false)
      }, 1000)
    }
  }, [address])
  
  if (!address) return null

  const balance = (balanceNum ?? 0).toFixed(2)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        style={{ touchAction: 'manipulation' }}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors px-1 py-1"
      >
        <span className="text-xs sm:text-sm">${balance}</span>
        <svg className={`w-3 h-3 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && mounted && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={handleClose} />
          {createPortal(
            <div 
              className="fixed z-[101] bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-lg p-3 min-w-[240px]"
              style={{ top: menuPos.top, left: Math.max(16, menuPos.left - 100) }}
            >
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2 px-1">Wallet</p>
              
              <a
                href="https://www.coinbase.com/price/usdc"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--surface)] transition-colors w-full"
              >
                <span>💵</span>
                <span className="text-sm">Buy USDC</span>
              </a>

              <button
                type="button"
                onClick={() => { handleClose(); setShowSend(true) }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--surface)] transition-colors w-full"
              >
                <span>📤</span>
                <span className="text-sm">Send USDC</span>
              </button>
              
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--surface)] transition-colors w-full"
              >
                <span>{copied ? '✅' : '📋'}</span>
                <span className="text-sm">{copied ? 'Copied!' : 'Copy Address'}</span>
              </button>
            </div>,
            document.body
          )}
        </>
      )}

      {showSend && <SendModal onClose={() => setShowSend(false)} />}
    </>
  )
}
