'use client'

import { useEffect, useState } from 'react'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { base } from 'wagmi/chains'
import { OnboardingPreview } from '@/components/OnboardingCommitment'
import { AdminGoals } from '@/components/AdminGoals'

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

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

const TREASURY_WALLET = '0xBf16F926d7732B22d4AaA9177b71AB7ba3159640' as const

const NEW_USER_ABI = [
  {
    name: 'totalActiveStakes',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalChallenges',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalWon',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalForfeited',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'stakeAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

type Tab = 'dashboard' | 'create'

export default function AdminPage() {
  const [mounted, setMounted] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const contracts = CONTRACTS[base.id]

  // === Create Goal State ===
  const [createLoading, setCreateLoading] = useState(false)
  const [createResult, setCreateResult] = useState<any>(null)
  const [createError, setCreateError] = useState('')
  const [goalName, setGoalName] = useState('')
  const [goalType, setGoalType] = useState(1)
  const [goalTarget, setGoalTarget] = useState('')
  const [goalStake, setGoalStake] = useState('')
  const [goalMaxStake, setGoalMaxStake] = useState('')
  const [goalEntryMin, setGoalEntryMin] = useState('60')
  const [goalDeadlineMin, setGoalDeadlineMin] = useState('120')

  // VaadaV3 hooks
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

  // NewUserChallenge hooks
  const { data: nucActiveStakes } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_ABI,
    functionName: 'totalActiveStakes',
  })

  const { data: nucTotalChallenges } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_ABI,
    functionName: 'totalChallenges',
  })

  const { data: nucTotalWon } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_ABI,
    functionName: 'totalWon',
  })

  const { data: nucTotalForfeited } = useReadContract({
    address: contracts.newUserChallenge,
    abi: NEW_USER_ABI,
    functionName: 'totalForfeited',
  })

  const { data: nucMaxWithdraw } = useReadContract({
    address: contracts.morphoVault,
    abi: VAULT_ABI,
    functionName: 'maxWithdraw',
    args: [contracts.newUserChallenge],
  })

  // Treasury wallet USDC balance
  const { data: treasuryWalletBalance } = useReadContract({
    address: contracts.usdc,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [TREASURY_WALLET],
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

  const handleCreateGoal = async () => {
    setCreateLoading(true)
    setCreateError('')
    setCreateResult(null)

    const now = Math.floor(Date.now() / 1000)
    const entryDeadline = now + Number(goalEntryMin) * 60
    const deadline = now + Number(goalDeadlineMin) * 60
    const minStakeUsdc = Number(goalStake) * 1e6
    const maxStakeUsdc = (goalMaxStake ? Number(goalMaxStake) : Number(goalStake)) * 1e6

    try {
      const res = await fetch('/api/admin/create-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: goalName,
          goalType,
          target: Number(goalTarget),
          minStake: minStakeUsdc,
          maxStake: maxStakeUsdc,
          startTime: now,
          entryDeadline,
          deadline,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCreateResult(data)
      // Reset form
      setGoalName('')
      setGoalTarget('')
      setGoalStake('')
      setGoalMaxStake('')
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreateLoading(false)
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

  // Calculate VaadaV3 stats
  const totalStakedUSDC = totalActiveStakes ? Number(formatUnits(totalActiveStakes, 6)) : 0
  const vaultValueUSDC = maxWithdraw ? Number(formatUnits(maxWithdraw, 6)) : 0
  const yieldEarned = vaultValueUSDC - totalStakedUSDC
  const yieldPercent = totalStakedUSDC > 0 ? ((yieldEarned / totalStakedUSDC) * 100).toFixed(4) : '0'

  // Calculate NewUserChallenge stats
  const nucStakedUSDC = nucActiveStakes ? Number(formatUnits(nucActiveStakes, 6)) : 0
  const nucVaultUSDC = nucMaxWithdraw ? Number(formatUnits(nucMaxWithdraw, 6)) : 0
  const nucYield = nucVaultUSDC - nucStakedUSDC
  const nucPending = (nucTotalChallenges ? Number(nucTotalChallenges) : 0) - 
                     (nucTotalWon ? Number(nucTotalWon) : 0) - 
                     (nucTotalForfeited ? Number(nucTotalForfeited) : 0)

  // Treasury wallet balance
  const treasuryBalanceUSDC = treasuryWalletBalance ? Number(formatUnits(treasuryWalletBalance, 6)) : 0

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">🔐 Admin</h1>
            <p className="text-[var(--text-secondary)] text-sm">Vaada Platform Management</p>
          </div>
          <a href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">
            ← Back to site
          </a>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-[var(--border)] pb-px">
          {(['dashboard', 'create'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab
                  ? 'text-[#2EE59D]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab === 'dashboard' ? '📊 Dashboard' : '➕ Create Promise'}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2EE59D] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ==================== DASHBOARD TAB ==================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Contract Addresses */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold mb-4">📍 Contract Addresses</h2>
              <div className="space-y-2 font-mono text-sm">
                {[
                  ['VaadaV3', contracts.goalStake],
                  ['AutomationV3', contracts.automation],
                  ['NewUserChallenge', contracts.newUserChallenge],
                  ['VaadaReceipts', contracts.vaadaReceipts],
                  ['Morpho Vault', contracts.morphoVault],
                  ['USDC', contracts.usdc],
                ].map(([label, addr]) => (
                  <div key={label} className="flex justify-between flex-wrap gap-2">
                    <span className="text-[var(--text-secondary)]">{label}:</span>
                    <a href={`https://basescan.org/address/${addr}`} target="_blank" rel="noopener noreferrer" className="text-[#2EE59D] hover:underline truncate">
                      {addr}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Treasury Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
                <h2 className="text-lg font-semibold mb-4">💰 VaadaV3 Treasury</h2>
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
                  <div>
                    <div className="text-[var(--text-secondary)] text-sm">Total Goals</div>
                    <div className="text-xl font-bold">{goalCount?.toString() || '0'}</div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
                <h2 className="text-lg font-semibold mb-4">🚀 NewUserChallenge</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-[var(--text-secondary)] text-sm">Active Stakes</div>
                    <div className="text-2xl font-bold">${nucStakedUSDC.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] text-sm">Vault Value</div>
                    <div className="text-2xl font-bold">${nucVaultUSDC.toFixed(6)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] text-sm">Yield Earned</div>
                    <div className="text-2xl font-bold text-[#2EE59D]">${nucYield.toFixed(6)}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                      <div className="text-[var(--text-secondary)] text-xs">Total</div>
                      <div className="font-bold">{nucTotalChallenges?.toString() || '0'}</div>
                    </div>
                    <div>
                      <div className="text-[var(--text-secondary)] text-xs">Won</div>
                      <div className="font-bold text-green-500">{nucTotalWon?.toString() || '0'}</div>
                    </div>
                    <div>
                      <div className="text-[var(--text-secondary)] text-xs">Forfeited</div>
                      <div className="font-bold text-red-500">{nucTotalForfeited?.toString() || '0'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] text-sm">Pending</div>
                    <div className="text-xl font-bold text-yellow-500">{nucPending}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold mb-4">📊 Platform Totals</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Total TVL</div>
                  <div className="text-2xl font-bold">${(vaultValueUSDC + nucVaultUSDC).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Total Yield</div>
                  <div className="text-2xl font-bold text-[#2EE59D]">${(yieldEarned + nucYield).toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Morpho APY</div>
                  <div className="text-2xl font-bold text-[#2EE59D]">~4.9%</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Vault Shares</div>
                  <div className="text-sm font-mono truncate">{vaultShares?.toString() || '0'}</div>
                </div>
              </div>
            </div>

            {/* Created Promises */}
            <AdminGoals />

            {/* Treasury Wallet */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold mb-4">💳 Treasury Wallet</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">USDC Balance</div>
                  <div className="text-2xl font-bold">${treasuryBalanceUSDC.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Address</div>
                  <a 
                    href={`https://basescan.org/address/${TREASURY_WALLET}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#2EE59D] hover:underline font-mono text-sm truncate block"
                  >
                    {TREASURY_WALLET.slice(0, 10)}...{TREASURY_WALLET.slice(-8)}
                  </a>
                </div>
              </div>
            </div>

            {/* Gas Sponsorship */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold mb-4">⛽ Gas Sponsorship (Privy)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Status</div>
                  <div className="text-lg font-bold text-[#2EE59D]">✅ Enabled</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Network</div>
                  <div className="text-lg font-bold">Base</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Client Txns</div>
                  <div className="text-lg font-bold text-[#2EE59D]">✅ Allowed</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  Gas credits balance is only available in the Privy dashboard. At ~$0.001/tx on Base, $20 covers ~6,000+ transactions.
                </p>
                <a
                  href="https://dashboard.privy.io/billing?tab=gas-sponsorship"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#2EE59D] bg-[#2EE59D]/10 border border-[#2EE59D]/30 rounded-lg hover:bg-[#2EE59D]/20 transition-colors"
                >
                  Check Balance → Privy Dashboard
                </a>
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

            {/* Dev Tools */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold mb-4">🛠️ Dev Tools</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowPreview(true)}
                  className="px-4 py-2 bg-[#2EE59D]/10 text-[#2EE59D] border border-[#2EE59D]/30 rounded-xl text-sm font-medium hover:bg-[#2EE59D]/20 transition-colors"
                >
                  👋 Preview Onboarding
                </button>
                <button
                  onClick={() => {
                    localStorage.clear()
                    sessionStorage.clear()
                    alert('All local data cleared! Refresh to see changes.')
                  }}
                  className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors"
                >
                  🗑️ Clear All Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== CREATE PROMISE TAB ==================== */}
        {activeTab === 'create' && (
          <div className="max-w-lg mx-auto space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g. 10K Steps Daily"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
              />
            </div>

            {/* Goal Type */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGoalType(1)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    goalType === 1
                      ? 'border-[#2EE59D] bg-[#2EE59D]/10 text-[#2EE59D]'
                      : 'border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >
                  👟 Fitbit Steps
                </button>
                <button
                  onClick={() => setGoalType(0)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    goalType === 0
                      ? 'border-[#2EE59D] bg-[#2EE59D]/10 text-[#2EE59D]'
                      : 'border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >
                  🏃 Strava Miles
                </button>
              </div>
            </div>

            {/* Target */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Target ({goalType === 1 ? 'steps' : 'miles'})
              </label>
              <input
                type="number"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder={goalType === 1 ? 'e.g. 10000' : 'e.g. 3'}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
              />
            </div>

            {/* Stake */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Min Stake ($)</label>
                <input
                  type="number"
                  value={goalStake}
                  onChange={(e) => setGoalStake(e.target.value)}
                  placeholder="5"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Max Stake ($)</label>
                <input
                  type="number"
                  value={goalMaxStake}
                  onChange={(e) => setGoalMaxStake(e.target.value)}
                  placeholder="Same as min"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
                />
              </div>
            </div>

            {/* Timing */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Entry window (min)</label>
                <input
                  type="number"
                  value={goalEntryMin}
                  onChange={(e) => setGoalEntryMin(e.target.value)}
                  placeholder="60"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Total duration (min)</label>
                <input
                  type="number"
                  value={goalDeadlineMin}
                  onChange={(e) => setGoalDeadlineMin(e.target.value)}
                  placeholder="120"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm space-y-1">
              <p className="font-medium">Preview</p>
              <p className="text-[var(--text-secondary)]">
                {goalName || '(unnamed)'} · {goalTarget || '?'} {goalType === 1 ? 'steps' : 'miles'} · ${goalStake || '?'}{goalMaxStake && goalMaxStake !== goalStake ? `-$${goalMaxStake}` : ''} stake
              </p>
              <p className="text-[var(--text-secondary)]">
                Entry: {goalEntryMin}min · Deadline: {goalDeadlineMin}min from now
              </p>
            </div>

            {/* Submit */}
            <button
              onClick={handleCreateGoal}
              disabled={createLoading || !goalName || !goalTarget || !goalStake}
              className="w-full py-3 bg-[#2EE59D] text-white font-bold rounded-xl hover:bg-[#26c987] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createLoading ? 'Creating...' : 'Create Promise'}
            </button>

            {/* Result */}
            {createResult && (
              <div className="p-4 rounded-xl bg-[#2EE59D]/10 border border-[#2EE59D]/30 text-sm">
                <p className="font-semibold text-[#2EE59D] mb-1">✅ Created!</p>
                <p className="text-[var(--text-secondary)] break-all">TX: {createResult.txHash}</p>
                <p className="text-[var(--text-secondary)]">Block: {createResult.blockNumber}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-2">Goal will appear in Browse Promises automatically.</p>
              </div>
            )}

            {createError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-500">
                {createError}
              </div>
            )}
          </div>
        )}

        {/* Onboarding Preview Modal */}
        {showPreview && <OnboardingPreview onClose={() => setShowPreview(false)} />}

        {/* Footer Links */}
        <div className="mt-8 text-center text-[var(--text-secondary)] text-sm">
          <a href="https://functions.chain.link/base/132" target="_blank" rel="noopener noreferrer" className="hover:text-[#2EE59D]">
            Chainlink Functions →
          </a>
          {' · '}
          <a href="https://app.morpho.org/vault?vault=0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61&network=base" target="_blank" rel="noopener noreferrer" className="hover:text-[#2EE59D]">
            Morpho Vault →
          </a>
          {' · '}
          <a href="https://basescan.org/address/0xAc67E863221B703CEE9B440a7beFe71EA8725434" target="_blank" rel="noopener noreferrer" className="hover:text-[#2EE59D]">
            BaseScan →
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
