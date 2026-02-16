import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

const GOALSTAKE_ADDRESS = '0xAc67E863221B703CEE9B440a7beFe71EA8725434'
const RPC_URL = process.env.BASE_RPC_URL || 'https://base.publicnode.com'

const ABI = parseAbi([
  'function cancelGoalWithRefund(uint256 goalId)',
  'function getGoal(uint256 goalId) view returns ((uint256 id, string name, uint256 targetMiles, uint256 minStake, uint256 maxStake, uint256 startTime, uint256 entryDeadline, uint256 deadline, bool active, bool settled, uint256 totalStaked, uint256 participantCount))',
])

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const privateKey = process.env.VERIFIER_PRIVATE_KEY
  if (!privateKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const goalId = request.nextUrl.searchParams.get('goalId')
  if (!goalId) {
    return NextResponse.json({ error: 'goalId required' }, { status: 400 })
  }

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    })

    const account = privateKeyToAccount(privateKey as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(RPC_URL),
    })

    // Check goal status first
    const goal = await publicClient.readContract({
      address: GOALSTAKE_ADDRESS,
      abi: ABI,
      functionName: 'getGoal',
      args: [BigInt(goalId)],
    })

    if (goal.settled) {
      return NextResponse.json({ error: 'Goal already settled', goalId })
    }

    // Cancel and refund
    const txHash = await walletClient.writeContract({
      address: GOALSTAKE_ADDRESS,
      abi: ABI,
      functionName: 'cancelGoalWithRefund',
      args: [BigInt(goalId)],
    })

    await publicClient.waitForTransactionReceipt({ hash: txHash })

    return NextResponse.json({
      success: true,
      goalId,
      txHash,
      message: 'Goal cancelled and refunds issued',
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
