import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

const GOALSTAKE_ADDRESS = '0xAc67E863221B703CEE9B440a7beFe71EA8725434'
const RECEIPTS_ADDRESS = '0x2743327fa1EeDF92793608d659b7eEC428252dA2'
const RPC_URL = process.env.BASE_RPC_URL || 'https://base.publicnode.com'

const GOALSTAKE_ABI = parseAbi([
  'function goalCount() view returns (uint256)',
  'function getGoal(uint256 goalId) view returns ((uint256 id, string name, uint256 targetMiles, uint256 minStake, uint256 maxStake, uint256 startTime, uint256 entryDeadline, uint256 deadline, bool active, bool settled, uint256 totalStaked, uint256 participantCount))',
  'function getGoalParticipants(uint256 goalId) view returns (address[])',
  'function getParticipant(uint256 goalId, address user) view returns ((address user, uint256 stake, uint256 actualValue, bool verified, bool succeeded, bool claimed))',
  'function goalTypes(uint256 goalId) view returns (uint8)',
])

const RECEIPTS_ABI = parseAbi([
  'function batchMintReceipts((uint256 goalId, address participant, uint8 goalType, uint256 target, uint256 actual, uint256 stakeAmount, uint256 payout, bool succeeded, uint256 startTime, uint256 endTime, string goalName)[] inputs)',
  'function receiptForGoal(uint256, address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
])

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  // Admin auth
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const privateKey = process.env.VERIFIER_PRIVATE_KEY
  if (!privateKey) {
    return NextResponse.json({ error: 'No private key' }, { status: 500 })
  }

  const dryRun = request.nextUrl.searchParams.get('dry') === '1'

  try {
    const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) })
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    const walletClient = createWalletClient({ account, chain: base, transport: http(RPC_URL) })

    const goalCount = await publicClient.readContract({
      address: GOALSTAKE_ADDRESS, abi: GOALSTAKE_ABI, functionName: 'goalCount',
    })

    const allMintInputs: any[] = []
    const skipped: any[] = []

    for (let goalId = 0; goalId < Number(goalCount); goalId++) {
      const goal = await publicClient.readContract({
        address: GOALSTAKE_ADDRESS, abi: GOALSTAKE_ABI, functionName: 'getGoal', args: [BigInt(goalId)],
      })

      if (!goal.settled) continue
      if (Number(goal.participantCount) === 0) continue

      const goalType = await publicClient.readContract({
        address: GOALSTAKE_ADDRESS, abi: GOALSTAKE_ABI, functionName: 'goalTypes', args: [BigInt(goalId)],
      })

      const participants = await publicClient.readContract({
        address: GOALSTAKE_ADDRESS, abi: GOALSTAKE_ABI, functionName: 'getGoalParticipants', args: [BigInt(goalId)],
      })

      for (const userAddress of participants) {
        // Check if already minted
        const existing = await publicClient.readContract({
          address: RECEIPTS_ADDRESS, abi: RECEIPTS_ABI, functionName: 'receiptForGoal',
          args: [BigInt(goalId), userAddress],
        })
        if (Number(existing) !== 0) {
          skipped.push({ goalId, user: userAddress, reason: 'already minted' })
          continue
        }

        const p = await publicClient.readContract({
          address: GOALSTAKE_ADDRESS, abi: GOALSTAKE_ABI, functionName: 'getParticipant',
          args: [BigInt(goalId), userAddress],
        })

        allMintInputs.push({
          goalId: BigInt(goalId),
          participant: userAddress,
          goalType: goalType,
          target: goal.targetMiles,
          actual: p.actualValue,
          stakeAmount: p.stake,
          payout: p.succeeded ? p.stake : BigInt(0),
          succeeded: p.succeeded,
          startTime: goal.startTime,
          endTime: goal.deadline,
          goalName: goal.name,
        })
      }
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        toMint: allMintInputs.map(m => ({
          goalId: Number(m.goalId),
          participant: m.participant,
          succeeded: m.succeeded,
          goalName: m.goalName,
          stake: Number(m.stakeAmount) / 1e6,
        })),
        skipped,
      })
    }

    if (allMintInputs.length === 0) {
      return NextResponse.json({ message: 'Nothing to mint', skipped })
    }

    const txHash = await walletClient.writeContract({
      address: RECEIPTS_ADDRESS,
      abi: RECEIPTS_ABI,
      functionName: 'batchMintReceipts',
      args: [allMintInputs],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    const newSupply = await publicClient.readContract({
      address: RECEIPTS_ADDRESS, abi: RECEIPTS_ABI, functionName: 'totalSupply',
    })

    return NextResponse.json({
      success: true,
      minted: allMintInputs.length,
      txHash,
      gasUsed: receipt.gasUsed.toString(),
      totalSupply: Number(newSupply),
      skipped,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
