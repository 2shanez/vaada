import { NextRequest, NextResponse } from 'next/server'
import { getUser, getUserWallets, sendTransaction } from '@/lib/privy-server'
import { encodeFunctionData } from 'viem'

// Contract addresses (Base mainnet)
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const VAADA_V4 = '0xd672c046f497bdDd27B01C42588f31db8758b6c7'
const NUC_V4 = '0xE5e9eDE79B3c250B9922AA2CDfA02860e65cb14A'

// Minimal ABIs for encoding
const USDC_APPROVE_ABI = [{
  name: 'approve',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ type: 'bool' }],
}] as const

const JOIN_GOAL_ABI = [{
  name: 'joinGoal',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'goalId', type: 'uint256' },
    { name: 'stake', type: 'uint256' },
  ],
  outputs: [],
}] as const

const NUC_JOIN_ABI = [{
  name: 'join',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [],
  outputs: [],
}] as const

export async function POST(request: NextRequest) {
  try {
    const { userId, action, goalId, amount } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Get user's embedded wallet
    const wallets = await getUserWallets(userId)
    if (!wallets.length) {
      return NextResponse.json({ error: 'No embedded wallet found' }, { status: 400 })
    }
    const wallet = wallets[0]
    const walletId = wallet.id || wallet.wallet_id

    // ===== JOIN NEW USER CHALLENGE ($5) =====
    if (action === 'join_challenge') {
      const stakeAmount = BigInt(5 * 1e6) // $5 USDC (6 decimals)

      // 1. Approve USDC spend
      const approveData = encodeFunctionData({
        abi: USDC_APPROVE_ABI,
        functionName: 'approve',
        args: [NUC_V4 as `0x${string}`, stakeAmount],
      })
      const approveTx = await sendTransaction(walletId, {
        to: USDC,
        data: approveData,
      })

      // 2. Join challenge
      const joinData = encodeFunctionData({
        abi: NUC_JOIN_ABI,
        functionName: 'join',
        args: [],
      })
      const joinTx = await sendTransaction(walletId, {
        to: NUC_V4,
        data: joinData,
      })

      return NextResponse.json({
        success: true,
        approveTxHash: approveTx.data?.hash,
        joinTxHash: joinTx.data?.hash,
      })
    }

    // ===== JOIN REGULAR GOAL =====
    if (action === 'join_goal') {
      if (!goalId || !amount) {
        return NextResponse.json({ error: 'Missing goalId or amount' }, { status: 400 })
      }

      const stakeAmount = BigInt(Math.floor(amount * 1e6)) // USDC 6 decimals

      // 1. Approve USDC spend
      const approveData = encodeFunctionData({
        abi: USDC_APPROVE_ABI,
        functionName: 'approve',
        args: [VAADA_V4 as `0x${string}`, stakeAmount],
      })
      const approveTx = await sendTransaction(walletId, {
        to: USDC,
        data: approveData,
      })

      // 2. Join goal
      const joinData = encodeFunctionData({
        abi: JOIN_GOAL_ABI,
        functionName: 'joinGoal',
        args: [BigInt(goalId), stakeAmount],
      })
      const joinTx = await sendTransaction(walletId, {
        to: VAADA_V4,
        data: joinData,
      })

      return NextResponse.json({
        success: true,
        approveTxHash: approveTx.data?.hash,
        joinTxHash: joinTx.data?.hash,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "join_challenge" or "join_goal"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Stake error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transaction failed' },
      { status: 500 }
    )
  }
}
