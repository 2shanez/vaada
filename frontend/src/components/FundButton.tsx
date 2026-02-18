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
        <span className="text-xs sm:text-sm text-[#2EE59D]">${balance}</span>
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
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm">Buy USDC</span>
              </a>

              <button
                type="button"
                onClick={() => { handleClose(); setShowSend(true) }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--surface)] transition-colors w-full"
              >
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                <span className="text-sm">Send USDC</span>
              </button>
              
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--surface)] transition-colors w-full"
              >
                {copied 
                  ? <svg className="w-4 h-4 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                }
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
