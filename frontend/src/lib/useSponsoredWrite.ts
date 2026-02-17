'use client'

import { useState, useCallback } from 'react'
import { useSendTransaction, usePrivy } from '@privy-io/react-auth'
import { useWriteContract as useWagmiWriteContract } from 'wagmi'
import { encodeFunctionData, type Abi } from 'viem'

/**
 * Drop-in replacement for wagmi's useWriteContract that uses Privy's
 * useSendTransaction with gas sponsorship for embedded wallet users.
 *
 * - Embedded wallet (email/Google login) → Privy sendTransaction with sponsor: true (gasless)
 * - External wallet (MetaMask etc.) → falls back to wagmi writeContract (user pays ~$0.001 gas)
 *
 * API surface matches useWriteContract:
 *   const { writeContract, data: hash, isPending, error } = useSponsoredWrite()
 */
export function useSponsoredWrite() {
  const { user } = usePrivy()
  const { sendTransaction } = useSendTransaction()
  const wagmi = useWagmiWriteContract()

  const [data, setData] = useState<`0x${string}` | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Check if user has an embedded wallet (eligible for sponsorship)
  const hasEmbeddedWallet = user?.linkedAccounts?.some(
    (a) => a.type === 'wallet' && (a as any).walletClientType === 'privy'
  )

  const writeContract = useCallback(
    async (params: {
      address: `0x${string}`
      abi: Abi | readonly unknown[]
      functionName: string
      args?: readonly unknown[]
      value?: bigint
    }) => {
      const { address, abi, functionName, args, value } = params

      // External wallet → use wagmi (no sponsorship, but gas is ~$0.001 on Base)
      if (!hasEmbeddedWallet) {
        wagmi.writeContract({
          address,
          abi: abi as any,
          functionName,
          args: args as any,
          ...(value !== undefined ? { value } : {}),
        })
        return
      }

      // Embedded wallet → use Privy with gas sponsorship
      setError(null)
      setIsPending(true)
      setData(undefined)

      try {
        const calldata = encodeFunctionData({
          abi: abi as Abi,
          functionName,
          args: args as any,
        })

        const receipt = await sendTransaction(
          {
            to: address,
            data: calldata,
            ...(value !== undefined ? { value: `0x${value.toString(16)}` } : {}),
            chainId: 8453, // Base mainnet
          },
          { sponsor: true },
        )

        setData(receipt.hash)
        return receipt.hash
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsPending(false)
      }
    },
    [hasEmbeddedWallet, sendTransaction, wagmi],
  )

  const reset = useCallback(() => {
    setData(undefined)
    setIsPending(false)
    setError(null)
    wagmi.reset()
  }, [wagmi])

  // Merge state: if using wagmi fallback, proxy its state
  if (!hasEmbeddedWallet) {
    return {
      writeContract,
      data: wagmi.data,
      isPending: wagmi.isPending,
      error: wagmi.error,
      reset: wagmi.reset,
    }
  }

  return { writeContract, data, isPending, error, reset }
}
