import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

const GOALSTAKE_ADDRESS = '0xAc67E863221B703CEE9B440a7beFe71EA8725434'
const RPC_URL = process.env.BASE_RPC_URL || 'https://base.publicnode.com'

const ABI = parseAbi([
  'function updateGoal(uint256 goalId, string name, uint256 target, uint256 minStake, uint256 maxStake, uint256 startTime, uint256 entryDeadline, uint256 deadline)',
])

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const privateKey = process.env.VERIFIER_PRIVATE_KEY
  if (!privateKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { goalId, name, target, minStake, maxStake, startTime, entryDeadline, deadline } = body

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

    const txHash = await walletClient.writeContract({
      address: GOALSTAKE_ADDRESS,
      abi: ABI,
      functionName: 'updateGoal',
      args: [
        BigInt(goalId),
        name,
        BigInt(target),
        BigInt(minStake),
        BigInt(maxStake),
        BigInt(startTime),
        BigInt(entryDeadline),
        BigInt(deadline),
      ],
    })

    await publicClient.waitForTransactionReceipt({ hash: txHash })

    return NextResponse.json({
      success: true,
      goalId,
      txHash,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
