'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from 'wagmi'

// Links to get mainnet USDC/ETH
const FUND_LINKS = {
  eth: 'https://www.coinbase.com/price/ethereum',
  usdc: 'https://www.coinbase.com/price/usdc',
}

export function FundWalletButton() {
  const { address } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleToggle = useCallback(() => {
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

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        style={{ touchAction: 'manipulation' }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[#2EE59D]/50 active:scale-95 transition-all text-sm"
      >
        <span>💰</span>
        <span>Fund</span>
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center sm:items-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <div className="relative bg-[var(--background)] rounded-t-2xl p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:rounded-2xl sm:max-w-sm sm:w-full sm:mx-4 sm:pb-4 animate-slide-up">
            <p className="text-base font-semibold mb-4 text-center">Get USDC on Base</p>
            
            <a
              href={FUND_LINKS.usdc}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-2 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">💵</span>
              <div>
                <p className="font-medium">Get USDC</p>
                <p className="text-sm text-[var(--text-secondary)]">Buy on Coinbase</p>
              </div>
              <svg className="w-5 h-5 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            
            <a
              href={FUND_LINKS.eth}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-2 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">⛽</span>
              <div>
                <p className="font-medium">Get ETH (gas)</p>
                <p className="text-sm text-[var(--text-secondary)]">Buy on Coinbase</p>
              </div>
              <svg className="w-5 h-5 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-3 px-4 py-4 rounded-xl border w-full active:scale-[0.98] transition-all ${
                copied 
                  ? 'bg-[#2EE59D]/10 border-[#2EE59D]' 
                  : 'bg-[var(--surface)] border-[var(--border)]'
              }`}
            >
              <span className="text-2xl">{copied ? '✅' : '📋'}</span>
              <div className="text-left">
                <p className={`font-medium ${copied ? 'text-[#2EE59D]' : ''}`}>
                  {copied ? 'Copied!' : 'Copy Wallet Address'}
                </p>
                <p className="text-sm text-[var(--text-secondary)] font-mono">{address.slice(0, 10)}...{address.slice(-6)}</p>
              </div>
            </button>
            
            <button
              type="button"
              onClick={handleClose}
              className="w-full mt-4 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-base font-medium active:scale-[0.98] transition-transform"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
