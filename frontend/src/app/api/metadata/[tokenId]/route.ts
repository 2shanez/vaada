import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const RECEIPTS_ADDRESS = '0x2743327fa1EeDF92793608d659b7eEC428252dA2'
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

const RECEIPTS_ABI = [
  {
    name: 'getReceipt',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
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
] as const

const GOAL_TYPES = ['Strava (Miles)', 'Fitbit (Steps)']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params
  const id = parseInt(tokenId)
  if (isNaN(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid token ID' }, { status: 400 })
  }

  try {
    const client = createPublicClient({ chain: base, transport: http(RPC_URL) })
    const receipt = await client.readContract({
      address: RECEIPTS_ADDRESS,
      abi: RECEIPTS_ABI,
      functionName: 'getReceipt',
      args: [BigInt(id)],
    })

    const r = receipt as any
    const stakeUSD = Number(r.stakeAmount) / 1e6
    const payoutUSD = Number(r.payout) / 1e6
    const goalType = GOAL_TYPES[r.goalType] || 'Unknown'
    const status = r.succeeded ? 'Kept' : 'Broken'
    const date = new Date(Number(r.endTime) * 1000).toISOString().split('T')[0]

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vaada.io'

    const metadata = {
      name: `Vaada Proof #${id} — ${r.goalName}`,
      description: `${r.succeeded ? '✅ Promise Kept' : '❌ Promise Broken'}: ${r.goalName}. ${Number(r.actual)} / ${Number(r.target)} ${r.goalType === 0 ? 'miles' : 'steps'}. Staked $${stakeUSD.toFixed(2)} USDC on Base.`,
      image: `${baseUrl}/api/metadata/image/${id}`,
      external_url: `${baseUrl}`,
      attributes: [
        { trait_type: 'Status', value: status },
        { trait_type: 'Promise', value: r.goalName },
        { trait_type: 'Goal Type', value: goalType },
        { trait_type: 'Target', value: Number(r.target).toString() },
        { trait_type: 'Actual', value: Number(r.actual).toString() },
        { trait_type: 'Stake', value: `$${stakeUSD.toFixed(2)}` },
        { trait_type: 'Payout', value: `$${payoutUSD.toFixed(2)}` },
        { trait_type: 'Date', value: date },
        { display_type: 'number', trait_type: 'Goal ID', value: Number(r.goalId) },
      ],
    }

    return NextResponse.json(metadata, {
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
