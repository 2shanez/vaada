// Shared ABIs for Vaada contracts

export const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
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
}

// Domain definitions for filtering
export const DOMAINS = {
  Fitness: { emoji: '🏃', subdomains: ['Running', 'Steps'] },
  Health: { emoji: '💪', subdomains: ['Weight', 'Nutrition', 'Wellness', 'Sleep'] },
  Creative: { emoji: '🎬', subdomains: ['YouTube'] },
  Educational: { emoji: '📚', subdomains: ['Duolingo'] },
  Startup: { emoji: '🚀', subdomains: ['Launch', 'Shipping'] },
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
  [GoalPhase.Entry]: { label: 'ENTRY OPEN', emoji: '🟢', color: 'bg-green-50 text-green-600' },
  [GoalPhase.Competition]: { label: 'IN PROGRESS', emoji: '🏃', color: 'bg-yellow-50 text-yellow-600' },
  [GoalPhase.AwaitingSettlement]: { label: 'VERIFYING', emoji: '⏳', color: 'bg-orange-50 text-orange-600' },
  [GoalPhase.Settled]: { label: 'SETTLED', emoji: '✓', color: 'bg-gray-50 text-gray-600' },
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
