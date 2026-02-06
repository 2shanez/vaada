'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from 'wagmi'

const FAUCETS = {
  eth: 'https://www.alchemy.com/faucets/base-sepolia',
  usdc: 'https://faucet.circle.com',
}

export function FundWalletButton() {
  const { address } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleCopy = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address)
      setIsOpen(false)
    }
  }, [address])
  
  if (!address) return null

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        style={{ touchAction: 'manipulation' }}
        className="min-h-[44px] min-w-[44px] px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm hover:border-[#2EE59D]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
      >
        <span className="text-lg">💰</span>
        <span className="hidden sm:inline">Fund</span>
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
            <p className="text-base font-semibold mb-4 text-center">Get Testnet Tokens</p>
            
            <a
              href={FAUCETS.usdc}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-2 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">💵</span>
              <div>
                <p className="font-medium">Get USDC</p>
                <p className="text-sm text-[var(--text-secondary)]">Circle Faucet</p>
              </div>
              <svg className="w-5 h-5 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            
            <a
              href={FAUCETS.eth}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-2 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">⛽</span>
              <div>
                <p className="font-medium">Get ETH (gas)</p>
                <p className="text-sm text-[var(--text-secondary)]">Alchemy Faucet</p>
              </div>
              <svg className="w-5 h-5 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-3 px-4 py-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] w-full active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">📋</span>
              <div className="text-left">
                <p className="font-medium">Copy Wallet Address</p>
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
