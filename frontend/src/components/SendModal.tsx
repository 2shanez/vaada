'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { useSponsoredWrite } from '@/lib/useSponsoredWrite'
import { parseUnits } from 'viem'
import { useUSDC, useContracts } from '@/lib/hooks'
import { USDC_ABI } from '@/lib/abis'

interface SendModalProps {
  onClose: () => void
}

export function SendModal({ onClose }: SendModalProps) {
  const { address } = useAccount()
  const contracts = useContracts()
  const { balanceNum, refetchBalance } = useUSDC()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { writeContract, data: hash, error: writeError, isPending } = useSponsoredWrite()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't auto-focus on mobile to avoid keyboard popping up
  useEffect(() => {
    if (mounted && window.innerWidth >= 640) {
      inputRef.current?.focus()
    }
  }, [mounted])

  useEffect(() => {
    if (isSuccess) {
      refetchBalance()
      // Auto-close after success with brief delay
      setTimeout(onClose, 1500)
    }
  }, [isSuccess, refetchBalance, onClose])

  const handleSend = () => {
    setError('')

    // Validate recipient
    if (!recipient || !recipient.startsWith('0x') || recipient.length !== 42) {
      setError('Enter a valid wallet address (0x...)')
      return
    }

    // Validate amount
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      setError('Enter an amount greater than 0')
      return
    }
    if (amountNum > balanceNum) {
      setError(`Insufficient balance. You have $${balanceNum.toFixed(2)}`)
      return
    }

    // Send USDC transfer
    writeContract({
      address: contracts.usdc,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [recipient as `0x${string}`, parseUnits(amount, 6)],
    })
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[var(--background)] border-t sm:border border-[var(--border)] rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 w-full sm:max-w-sm shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {isSuccess ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Sent!</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              ${amount} USDC sent successfully
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#2EE59D]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#2EE59D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Send USDC</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Balance: <span className="text-[#2EE59D] font-medium">${balanceNum.toFixed(2)}</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Recipient Address</label>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] 
                    focus:outline-none focus:border-[#2EE59D] focus:ring-2 focus:ring-[#2EE59D]/30
                    placeholder:text-[var(--text-secondary)] transition-all text-base font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Amount (USDC)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-lg">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amount}
                    onChange={(e) => {
                      // Only allow numbers and decimal point
                      const val = e.target.value.replace(/[^0-9.]/g, '')
                      setAmount(val)
                    }}
                    placeholder="0.00"
                    className="w-full pl-9 pr-16 py-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] 
                      focus:outline-none focus:border-[#2EE59D] focus:ring-2 focus:ring-[#2EE59D]/30
                      placeholder:text-[var(--text-secondary)] transition-all text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(balanceNum.toFixed(2))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-[#2EE59D] font-semibold bg-[#2EE59D]/10 rounded-md active:scale-95"
                  >
                    MAX
                  </button>
                </div>
              </div>
            </div>

            {(error || writeError) && (
              <p className="text-red-500 text-sm mt-3">
                {error || writeError?.message?.split('\n')[0] || 'Transaction failed'}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[48px] px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] font-semibold rounded-xl
                  hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending || isConfirming}
                className="flex-1 min-h-[48px] px-4 py-3.5 bg-[#2EE59D] text-white font-semibold rounded-xl
                  hover:bg-[#26c987] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming ? 'Confirming...' : isPending ? 'Confirm...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
