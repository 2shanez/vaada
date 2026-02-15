'use client'

import { useEffect, useState } from 'react'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { base } from 'wagmi/chains'

const ADMIN_PASSWORD = 'ripplepigdetect098'

const VAULT_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'maxWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

const VAADA_ABI = [
  {
    name: 'totalActiveStakes',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'goalCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'treasury',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'oracle',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const

export default function AdminPage() {
  const [mounted, setMounted] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const contracts = CONTRACTS[base.id]

  // All hooks must be called unconditionally
  const { data: totalActiveStakes } = useReadContract({
    address: contracts.goalStake,
    abi: VAADA_ABI,
    functionName: 'totalActiveStakes',
  })

  const { data: goalCount } = useReadContract({
    address: contracts.goalStake,
    abi: VAADA_ABI,
    functionName: 'goalCount',
  })

  const { data: owner } = useReadContract({
    address: contracts.goalStake,
    abi: VAADA_ABI,
    functionName: 'owner',
  })

  const { data: treasury } = useReadContract({
    address: contracts.goalStake,
    abi: VAADA_ABI,
    functionName: 'treasury',
  })

  const { data: oracleAddr } = useReadContract({
    address: contracts.goalStake,
    abi: VAADA_ABI,
    functionName: 'oracle',
  })

  const { data: vaultShares } = useReadContract({
    address: contracts.morphoVault,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: [contracts.goalStake],
  })

  const { data: maxWithdraw } = useReadContract({
    address: contracts.morphoVault,
    abi: VAULT_ABI,
    functionName: 'maxWithdraw',
    args: [contracts.goalStake],
  })

  useEffect(() => {
    setMounted(true)
    const saved = sessionStorage.getItem('vaada_admin_auth')
    if (saved === 'true') setAuthenticated(true)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      sessionStorage.setItem('vaada_admin_auth', 'true')
      setError('')
    } else {
      setError('Wrong password')
    }
  }

  if (!mounted) return null

  // Password gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="bg-[var(--surface)] rounded-2xl p-8 border border-[var(--border)] max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-2">🔐 Admin Access</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-6">Enter admin password to continue</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] mb-4 focus:outline-none focus:border-[#2EE59D]"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-[#2EE59D] text-black font-semibold rounded-xl hover:bg-[#2EE59D]/90 transition"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Calculate stats
  const totalStakedUSDC = totalActiveStakes ? Number(formatUnits(totalActiveStakes, 6)) : 0
  const vaultValueUSDC = maxWithdraw ? Number(formatUnits(maxWithdraw, 6)) : 0
  const yieldEarned = vaultValueUSDC - totalStakedUSDC
  const yieldPercent = totalStakedUSDC > 0 ? ((yieldEarned / totalStakedUSDC) * 100).toFixed(4) : '0'

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔐 Admin Dashboard</h1>
        <p className="text-[var(--text-secondary)] mb-8">VaadaV3 Contract Stats</p>

        {/* Contract Addresses */}
        <div className="bg-[var(--surface)] rounded-2xl p-6 mb-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold mb-4">📍 Contract Addresses</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-[var(--text-secondary)]">VaadaV3:</span>
              <a href={`https://basescan.org/address/${contracts.goalStake}`} target="_blank" rel="noopener noreferrer" className="text-[#2EE59D] hover:underline truncate">
                {contracts.goalStake}
              </a>
            </div>
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-[var(--text-secondary)]">AutomationV3:</span>
              <a href={`https://basescan.org/address/${contracts.automation}`} target="_blank" rel="noopener noreferrer" className="text-[#2EE59D] hover:underline truncate">
                {contracts.automation}
              </a>
            </div>
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-[var(--text-secondary)]">NewUserChallenge:</span>
              <a href={`https://basescan.org/address/${contracts.newUserChallenge}`} target="_blank" rel="noopener noreferrer" className="text-[#2EE59D] hover:underline truncate">
                {contracts.newUserChallenge}
              </a>
            </div>
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-[var(--text-secondary)]">Morpho Vault:</span>
              <a href={`https://basescan.org/address/${contracts.morphoVault}`} target="_blank" rel="noopener noreferrer" className="text-[#2EE59D] hover:underline truncate">
                {contracts.morphoVault}
              </a>
            </div>
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-[var(--text-secondary)]">USDC:</span>
              <a href={`https://basescan.org/address/${contracts.usdc}`} target="_blank" rel="noopener noreferrer" className="text-[#2EE59D] hover:underline truncate">
                {contracts.usdc}
              </a>
            </div>
          </div>
        </div>

        {/* Treasury Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4">💰 Treasury</h2>
            <div className="space-y-4">
              <div>
                <div className="text-[var(--text-secondary)] text-sm">Total Active Stakes</div>
                <div className="text-2xl font-bold">${totalStakedUSDC.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)] text-sm">Vault Value</div>
                <div className="text-2xl font-bold">${vaultValueUSDC.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)] text-sm">Yield Earned</div>
                <div className="text-2xl font-bold text-[#2EE59D]">
                  ${yieldEarned.toFixed(6)} ({yieldPercent}%)
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4">📊 Stats</h2>
            <div className="space-y-4">
              <div>
                <div className="text-[var(--text-secondary)] text-sm">Total Goals</div>
                <div className="text-2xl font-bold">{goalCount?.toString() || '0'}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)] text-sm">Vault Shares</div>
                <div className="text-lg font-mono truncate">{vaultShares?.toString() || '0'}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)] text-sm">Morpho APY</div>
                <div className="text-2xl font-bold text-[#2EE59D]">~4.9%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Roles */}
        <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold mb-4">👤 Roles</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-[var(--text-secondary)]">Owner:</span>
              <span className="truncate">{owner || 'Loading...'}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-[var(--text-secondary)]">Treasury:</span>
              <span className="truncate">{treasury || 'Loading...'}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-[var(--text-secondary)]">Oracle:</span>
              <span className="truncate">{oracleAddr || 'Loading...'}</span>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mt-8 text-center text-[var(--text-secondary)] text-sm">
          <a href="https://functions.chain.link/base/132" target="_blank" rel="noopener noreferrer" className="hover:text-[#2EE59D]">
            Chainlink Functions →
          </a>
          {' · '}
          <a href="https://app.morpho.org/vault?vault=0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61&network=base" target="_blank" rel="noopener noreferrer" className="hover:text-[#2EE59D]">
            Morpho Vault →
          </a>
          {' · '}
          <button 
            onClick={() => {
              sessionStorage.removeItem('vaada_admin_auth')
              setAuthenticated(false)
            }}
            className="hover:text-red-500"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
