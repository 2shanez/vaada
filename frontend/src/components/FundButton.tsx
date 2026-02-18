'use client'

import { useState, useCallback, useEffect } from 'react'
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

  const balance = (balanceNum ?? 0).toFixed(2)
  const isLow = (balanceNum ?? 0) < 5

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        style={{ touchAction: 'manipulation' }}
        className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
          isLow 
            ? 'text-amber-400 border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10' 
            : 'text-[#2EE59D] border-[#2EE59D]/20 bg-[#2EE59D]/5 hover:bg-[#2EE59D]/10'
        }`}
      >
        <span>${balance}</span>
        {isLow && (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )}
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
            <p className="text-base font-semibold mb-1 text-center">Get USDC on Base</p>
            <p className="text-xs text-[var(--text-secondary)] mb-4 text-center">Gas fees are covered — you only need USDC</p>
            
            <a
              href="https://www.coinbase.com/price/usdc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-2 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">💵</span>
              <div>
                <p className="font-medium">Buy USDC</p>
                <p className="text-sm text-[var(--text-secondary)]">Via Coinbase</p>
              </div>
              <svg className="w-5 h-5 ml-auto text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <button
              type="button"
              onClick={() => { handleClose(); setShowSend(true) }}
              className="flex items-center gap-3 px-4 py-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-2 w-full active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">📤</span>
              <div className="text-left">
                <p className="font-medium">Send USDC</p>
                <p className="text-sm text-[var(--text-secondary)]">Transfer to another wallet</p>
              </div>
            </button>
            
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

      {showSend && <SendModal onClose={() => setShowSend(false)} />}
    </>
  )
}
