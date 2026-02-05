'use client'

import { useState, useRef, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
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
  const inputRef = useRef<HTMLInputElement>(null)

  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pt-20">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-200">
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
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#2EE59D]/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="font-semibold text-lg">Send USDC</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Balance: <span className="text-[#2EE59D] font-medium">${balanceNum.toFixed(2)}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Recipient Address</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] 
                    focus:outline-none focus:border-[#2EE59D] focus:ring-1 focus:ring-[#2EE59D]/50
                    placeholder:text-[var(--text-secondary)] transition-all text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Amount (USDC)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-16 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] 
                      focus:outline-none focus:border-[#2EE59D] focus:ring-1 focus:ring-[#2EE59D]/50
                      placeholder:text-[var(--text-secondary)] transition-all text-sm"
                  />
                  <button
                    onClick={() => setAmount(balanceNum.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#2EE59D] font-medium hover:underline"
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

            <button
              onClick={handleSend}
              disabled={isPending || isConfirming}
              className="w-full mt-4 px-4 py-3 bg-[#2EE59D] text-white font-semibold rounded-xl
                hover:bg-[#26c987] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? 'Confirming...' : isPending ? 'Confirm in wallet...' : 'Send'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
