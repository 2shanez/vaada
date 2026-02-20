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

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-white/[0.06] p-5">
      <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-[#2EE59D]' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </div>
  )
}

function SectionHeader({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white/90">
        <span>{icon}</span>
        {title}
      </h2>
      {action}
    </div>
  )
}

function ContractRow({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-sm text-white/50">{label}</span>
      <a
        href={`https://basescan.org/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-mono text-[#2EE59D]/70 hover:text-[#2EE59D] transition-colors"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </a>
    </div>
  )
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    contracts: false,
    roles: false,
  })
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

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

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
      <div className="min-h-screen bg-[#0B0B14] flex items-center justify-center p-4">
        <div className="bg-[#13131D] rounded-2xl p-8 border border-white/[0.06] max-w-sm w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-white">Admin Access</h1>
            <p className="text-white/40 text-sm mt-1">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl bg-[#0B0B14] border border-white/[0.08] text-white mb-4 focus:outline-none focus:border-[#2EE59D]/50 transition-colors"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
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

  const nucStakedUSDC = nucActiveStakes ? Number(formatUnits(nucActiveStakes, 6)) : 0
  const nucVaultUSDC = nucMaxWithdraw ? Number(formatUnits(nucMaxWithdraw, 6)) : 0
  const nucYield = nucVaultUSDC - nucStakedUSDC
  const nucPending = (nucTotalChallenges ? Number(nucTotalChallenges) : 0) - 
                     (nucTotalWon ? Number(nucTotalWon) : 0) - 
                     (nucTotalForfeited ? Number(nucTotalForfeited) : 0)

  const treasuryBalanceUSDC = treasuryWalletBalance ? Number(formatUnits(treasuryWalletBalance, 6)) : 0
  const totalTVL = vaultValueUSDC + nucVaultUSDC
  const totalYield = yieldEarned + nucYield

  return (
    <div className="min-h-screen bg-[#0B0B14]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0B0B14]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-xl">⚡</span> Vaada Admin
              </h1>
            </div>
            {/* Tab Navigation */}
            <div className="flex gap-1 ml-6 bg-white/[0.04] rounded-xl p-1">
              {(['dashboard', 'create'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab
                      ? 'bg-[#2EE59D]/10 text-[#2EE59D]'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {tab === 'dashboard' ? 'Dashboard' : 'Create'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              ← Site
            </a>
            <button 
              onClick={() => {
                sessionStorage.removeItem('vaada_admin_auth')
                setAuthenticated(false)
              }}
              className="text-sm text-white/40 hover:text-red-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ==================== DASHBOARD TAB ==================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Top-level KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total TVL" value={`$${totalTVL.toFixed(2)}`} />
              <StatCard label="Total Yield" value={`$${totalYield.toFixed(6)}`} accent />
              <StatCard label="Morpho APY" value="~4.9%" accent />
              <StatCard label="Treasury" value={`$${treasuryBalanceUSDC.toFixed(2)}`} sub={`${TREASURY_WALLET.slice(0, 6)}...${TREASURY_WALLET.slice(-4)}`} />
            </div>

            {/* VaadaV3 + NewUserChallenge side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* VaadaV3 */}
              <div className="rounded-2xl bg-[#13131D] border border-white/[0.06] p-6">
                <SectionHeader icon="💰" title="VaadaV3" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-white/30 mb-1">Active Stakes</div>
                    <div className="text-xl font-bold">${totalStakedUSDC.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/30 mb-1">Vault Value</div>
                    <div className="text-xl font-bold">${vaultValueUSDC.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/30 mb-1">Yield Earned</div>
                    <div className="text-xl font-bold text-[#2EE59D]">${yieldEarned.toFixed(6)}</div>
                    <div className="text-[10px] text-white/20">{yieldPercent}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/30 mb-1">Total Goals</div>
                    <div className="text-xl font-bold">{goalCount?.toString() || '0'}</div>
                  </div>
                </div>
              </div>

              {/* NewUserChallenge */}
              <div className="rounded-2xl bg-[#13131D] border border-white/[0.06] p-6">
                <SectionHeader icon="🚀" title="NewUserChallenge" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-white/30 mb-1">Active Stakes</div>
                    <div className="text-xl font-bold">${nucStakedUSDC.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/30 mb-1">Vault Value</div>
                    <div className="text-xl font-bold">${nucVaultUSDC.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/30 mb-1">Yield Earned</div>
                    <div className="text-xl font-bold text-[#2EE59D]">${nucYield.toFixed(6)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/30 mb-1">Pending</div>
                    <div className="text-xl font-bold text-yellow-400">{nucPending}</div>
                  </div>
                </div>
                <div className="flex gap-4 mt-4 pt-4 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                    <span className="text-xs text-white/40">Total {nucTotalChallenges?.toString() || '0'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#2EE59D]" />
                    <span className="text-xs text-white/40">Won {nucTotalWon?.toString() || '0'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-xs text-white/40">Forfeited {nucTotalForfeited?.toString() || '0'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Created Promises */}
            <AdminGoals />

            {/* Gas Sponsorship */}
            <div className="rounded-2xl bg-[#13131D] border border-white/[0.06] p-6">
              <SectionHeader icon="⛽" title="Gas Sponsorship" />
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#2EE59D]" />
                  <span className="text-sm text-white/60">Enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/40">Network:</span>
                  <span className="text-sm font-medium text-white/80">Base</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#2EE59D]" />
                  <span className="text-sm text-white/60">Client Txns Allowed</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                <p className="text-xs text-white/30">
                  ~$0.001/tx on Base · $20 covers ~6,000+ transactions
                </p>
                <a
                  href="https://dashboard.privy.io/billing?tab=gas-sponsorship"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#2EE59D]/70 hover:text-[#2EE59D] transition-colors"
                >
                  Privy Dashboard →
                </a>
              </div>
            </div>

            {/* Collapsible: Contract Addresses */}
            <div className="rounded-2xl bg-[#13131D] border border-white/[0.06]">
              <button
                onClick={() => toggleSection('contracts')}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <h2 className="flex items-center gap-2 text-base font-semibold text-white/90">
                  <span>📍</span> Contract Addresses
                </h2>
                <span className={`text-white/30 transition-transform ${expandedSections.contracts ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>
              {expandedSections.contracts && (
                <div className="px-6 pb-6 -mt-2">
                  <ContractRow label="VaadaV3" address={contracts.goalStake} />
                  <ContractRow label="AutomationV3" address={contracts.automation} />
                  <ContractRow label="NewUserChallenge" address={contracts.newUserChallenge} />
                  <ContractRow label="VaadaReceipts" address={contracts.vaadaReceipts} />
                  <ContractRow label="Morpho Vault" address={contracts.morphoVault} />
                  <ContractRow label="USDC" address={contracts.usdc} />
                </div>
              )}
            </div>

            {/* Collapsible: Roles */}
            <div className="rounded-2xl bg-[#13131D] border border-white/[0.06]">
              <button
                onClick={() => toggleSection('roles')}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <h2 className="flex items-center gap-2 text-base font-semibold text-white/90">
                  <span>👤</span> Roles
                </h2>
                <span className={`text-white/30 transition-transform ${expandedSections.roles ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>
              {expandedSections.roles && (
                <div className="px-6 pb-6 -mt-2">
                  <ContractRow label="Owner" address={owner || '...'} />
                  <ContractRow label="Treasury" address={treasury || '...'} />
                  <ContractRow label="Oracle" address={oracleAddr || '...'} />
                </div>
              )}
            </div>

            {/* Dev Tools */}
            <div className="rounded-2xl bg-[#13131D] border border-white/[0.06] p-6">
              <SectionHeader icon="🛠️" title="Dev Tools" />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowPreview(true)}
                  className="px-4 py-2 bg-[#2EE59D]/10 text-[#2EE59D] border border-[#2EE59D]/20 rounded-xl text-sm font-medium hover:bg-[#2EE59D]/20 transition-colors"
                >
                  👋 Preview Onboarding
                </button>
                <button
                  onClick={() => {
                    localStorage.clear()
                    sessionStorage.clear()
                    alert('All local data cleared! Refresh to see changes.')
                  }}
                  className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors"
                >
                  🗑️ Clear All Data
                </button>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/[0.04]">
                {[
                  { label: 'Chainlink Functions', url: 'https://functions.chain.link/base/132' },
                  { label: 'Morpho Vault', url: 'https://app.morpho.org/vault?vault=0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61&network=base' },
                  { label: 'BaseScan', url: 'https://basescan.org/address/0xAc67E863221B703CEE9B440a7beFe71EA8725434' },
                ].map(({ label, url }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/30 hover:text-[#2EE59D] transition-colors"
                  >
                    {label} →
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== CREATE PROMISE TAB ==================== */}
        {activeTab === 'create' && (
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl bg-[#13131D] border border-white/[0.06] p-8">
              <SectionHeader icon="➕" title="Create Promise" />
              
              <div className="space-y-5 mt-6">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Name</label>
                  <input
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder="e.g. 10K Steps Daily"
                    className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-[#0B0B14] text-white focus:outline-none focus:border-[#2EE59D]/50 transition-colors"
                  />
                </div>

                {/* Goal Type */}
                <div>
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Type</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setGoalType(1)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                        goalType === 1
                          ? 'border-[#2EE59D]/40 bg-[#2EE59D]/10 text-[#2EE59D]'
                          : 'border-white/[0.08] text-white/40 hover:text-white/60'
                      }`}
                    >
                      👟 Fitbit Steps
                    </button>
                    <button
                      onClick={() => setGoalType(0)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                        goalType === 0
                          ? 'border-[#2EE59D]/40 bg-[#2EE59D]/10 text-[#2EE59D]'
                          : 'border-white/[0.08] text-white/40 hover:text-white/60'
                      }`}
                    >
                      🏃 Strava Miles
                    </button>
                  </div>
                </div>

                {/* Target */}
                <div>
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                    Target ({goalType === 1 ? 'steps' : 'miles'})
                  </label>
                  <input
                    type="number"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    placeholder={goalType === 1 ? 'e.g. 10000' : 'e.g. 3'}
                    className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-[#0B0B14] text-white focus:outline-none focus:border-[#2EE59D]/50 transition-colors"
                  />
                </div>

                {/* Stake */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Min Stake ($)</label>
                    <input
                      type="number"
                      value={goalStake}
                      onChange={(e) => setGoalStake(e.target.value)}
                      placeholder="5"
                      className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-[#0B0B14] text-white focus:outline-none focus:border-[#2EE59D]/50 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Max Stake ($)</label>
                    <input
                      type="number"
                      value={goalMaxStake}
                      onChange={(e) => setGoalMaxStake(e.target.value)}
                      placeholder="Same as min"
                      className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-[#0B0B14] text-white focus:outline-none focus:border-[#2EE59D]/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Timing */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Entry window (min)</label>
                    <input
                      type="number"
                      value={goalEntryMin}
                      onChange={(e) => setGoalEntryMin(e.target.value)}
                      placeholder="60"
                      className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-[#0B0B14] text-white focus:outline-none focus:border-[#2EE59D]/50 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Duration (min)</label>
                    <input
                      type="number"
                      value={goalDeadlineMin}
                      onChange={(e) => setGoalDeadlineMin(e.target.value)}
                      placeholder="120"
                      className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-[#0B0B14] text-white focus:outline-none focus:border-[#2EE59D]/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-xl bg-[#0B0B14] border border-white/[0.04] text-sm space-y-1">
                  <p className="text-xs font-medium text-white/30 uppercase tracking-wider">Preview</p>
                  <p className="text-white/70 mt-2">
                    {goalName || '(unnamed)'} · {goalTarget || '?'} {goalType === 1 ? 'steps' : 'miles'} · ${goalStake || '?'}{goalMaxStake && goalMaxStake !== goalStake ? `-$${goalMaxStake}` : ''}
                  </p>
                  <p className="text-white/40 text-xs">
                    Entry: {goalEntryMin}min · Duration: {goalDeadlineMin}min
                  </p>
                </div>

                {/* Submit */}
                <button
                  onClick={handleCreateGoal}
                  disabled={createLoading || !goalName || !goalTarget || !goalStake}
                  className="w-full py-3.5 bg-[#2EE59D] text-black font-bold rounded-xl hover:bg-[#26c987] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {createLoading ? 'Creating...' : 'Create Promise'}
                </button>

                {/* Result */}
                {createResult && (
                  <div className="p-4 rounded-xl bg-[#2EE59D]/10 border border-[#2EE59D]/20 text-sm">
                    <p className="font-semibold text-[#2EE59D] mb-1">✅ Created!</p>
                    <p className="text-white/40 break-all font-mono text-xs">TX: {createResult.txHash}</p>
                    <p className="text-white/40 text-xs">Block: {createResult.blockNumber}</p>
                  </div>
                )}

                {createError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    {createError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Preview Modal */}
        {showPreview && <OnboardingPreview onClose={() => setShowPreview(false)} />}
      </div>
    </div>
  )
}
