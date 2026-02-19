// Shared ABIs for vaada contracts

export const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

export const GOALSTAKE_ABI = [
  {
    name: 'joinGoal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'goalId', type: 'uint256' },
      { name: 'stake', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'isEntryOpen',
    type: 'function',
    inputs: [{ name: 'goalId', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    name: 'getGoalPhase',
    type: 'function',
    inputs: [{ name: 'goalId', type: 'uint256' }],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'getParticipant',
    type: 'function',
    inputs: [
      { name: 'goalId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'user', type: 'address' },
          { name: 'stake', type: 'uint256' },
          { name: 'actualMiles', type: 'uint256' },
          { name: 'verified', type: 'bool' },
          { name: 'succeeded', type: 'bool' },
          { name: 'claimed', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    name: 'claimPayout',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'goalId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'goalCount',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'getGoal',
    type: 'function',
    inputs: [{ name: 'goalId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'name', type: 'string' },
        { name: 'targetMiles', type: 'uint256' },
        { name: 'minStake', type: 'uint256' },
        { name: 'maxStake', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'entryDeadline', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'active', type: 'bool' },
        { name: 'settled', type: 'bool' },
        { name: 'totalStaked', type: 'uint256' },
        { name: 'participantCount', type: 'uint256' },
      ],
    }],
    stateMutability: 'view',
  },
] as const

export const AUTOMATION_ABI = [
  {
    name: 'storeToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'token', type: 'string' }],
    outputs: [],
  },
  {
    name: 'hasToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
] as const

// Types
export interface Participant {
  user: string
  stake: bigint
  actualMiles: bigint
  verified: boolean
  succeeded: boolean
  claimed: boolean
}

export interface Goal {
  id: string
  onChainId?: number
  title: string
  description: string
  emoji: string
  targetMiles: number
  targetUnit?: string  // 'miles' | 'posts' | 'lessons' etc
  durationDays: number
  minStake: number
  maxStake: number
  participants: number
  totalStaked: number
  category: string  // 'Daily' | 'Weekly' | 'Monthly'
  domain: string    // 'Fitness' | 'Creative' | 'Educational'
  subdomain: string // 'Running' | 'Substack' | 'Duolingo'
  live?: boolean    // true = show in main list, false/undefined = Coming Soon
}

// Domain definitions for filtering
export const DOMAINS = {
  Fitness: { emoji: '🏃', subdomains: ['Running', 'Steps'] },
  // Health: { emoji: '💪', subdomains: ['Weight', 'Screen Time'] }, // Hidden - no free APIs
  // Educational: { emoji: '📚', subdomains: ['Duolingo', 'LeetCode', 'Reading'] }, // Coming soon
} as const

export type DomainKey = keyof typeof DOMAINS

// Goal phases
export enum GoalPhase {
  Entry = 0,
  Competition = 1,
  AwaitingSettlement = 2,
  Settled = 3,
}

export const PHASE_LABELS: Record<GoalPhase, { label: string; emoji: string; color: string }> = {
  [GoalPhase.Entry]: { label: 'OPEN', emoji: '', color: 'bg-[#2EE59D]/10 text-[#2EE59D]' },
  [GoalPhase.Competition]: { label: 'IN PROGRESS', emoji: '', color: 'bg-amber-500/10 text-amber-500' },
  [GoalPhase.AwaitingSettlement]: { label: 'VERIFYING', emoji: '', color: 'bg-orange-500/10 text-orange-500' },
  [GoalPhase.Settled]: { label: 'SETTLED', emoji: '', color: 'bg-[var(--border)]/50 text-[var(--text-secondary)]' },
}

export const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  Test: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  Daily: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  Weekly: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  Monthly: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
}

// Domain badge styles
export const DOMAIN_STYLES: Record<string, { bg: string; text: string }> = {
  Fitness: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  Health: { bg: 'bg-pink-50 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400' },
  Creative: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  Educational: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  Startup: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
}

// ═══════════════════════════════════════════════════════════════════
// NEW USER CHALLENGE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export const NEW_USER_CHALLENGE_ABI = [
  {
    name: 'join',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'hasJoinedChallenge',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    name: 'getChallenge',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'settled', type: 'bool' },
      { name: 'won', type: 'bool' },
      { name: 'canSettle', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'getStats',
    type: 'function',
    inputs: [],
    outputs: [
      { name: '_totalChallenges', type: 'uint256' },
      { name: '_totalWon', type: 'uint256' },
      { name: '_totalForfeited', type: 'uint256' },
      { name: '_pendingAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'stakeAmount',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'challengeDuration',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

// ═══════════════════════════════════════════════════════════════════
// VAADA RECEIPTS (SOULBOUND)
// ═══════════════════════════════════════════════════════════════════

export const VAADA_RECEIPTS_ABI = [
  {
    name: 'getReputation',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      { name: 'attempted', type: 'uint256' },
      { name: 'completed', type: 'uint256' },
      { name: 'winRate', type: 'uint256' },
      { name: 'totalStaked', type: 'uint256' },
      { name: 'totalEarned', type: 'uint256' },
      { name: 'streak', type: 'uint256' },
      { name: 'bestStreak', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'tokensOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    name: 'getWalletReceipts',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'goalId', type: 'uint256' },
        { name: 'participant', type: 'address' },
        { name: 'goalType', type: 'uint8' },
        { name: 'target', type: 'uint256' },
        { name: 'actual', type: 'uint256' },
        { name: 'stakeAmount', type: 'uint256' },
        { name: 'payout', type: 'uint256' },
        { name: 'succeeded', type: 'bool' },
        { name: 'startTime', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
        { name: 'mintedAt', type: 'uint256' },
        { name: 'goalName', type: 'string' },
      ],
    }],
    stateMutability: 'view',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'totalSupply',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

export interface Receipt {
  goalId: bigint
  participant: string
  goalType: number
  target: bigint
  actual: bigint
  stakeAmount: bigint
  payout: bigint
  succeeded: boolean
  startTime: bigint
  endTime: bigint
  mintedAt: bigint
  goalName: string
}
