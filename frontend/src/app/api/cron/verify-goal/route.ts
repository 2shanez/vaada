import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

const GOALSTAKE_ADDRESS = '0xAc67E863221B703CEE9B440a7beFe71EA8725434'
const AUTOMATION_ADDRESS = '0xA6BcEcA41fCF743324a864F47dd03F0D3806341D'
const RPC_URL = process.env.BASE_RPC_URL || 'https://base.llamarpc.com'

const GOALSTAKE_ABI = parseAbi([
  'function getGoal(uint256 goalId) view returns ((uint256 id, string name, uint256 targetMiles, uint256 minStake, uint256 maxStake, uint256 startTime, uint256 entryDeadline, uint256 deadline, bool active, bool settled, uint256 totalStaked, uint256 participantCount))',
  'function getGoalParticipants(uint256 goalId) view returns (address[])',
  'function getParticipant(uint256 goalId, address user) view returns ((address user, uint256 stake, uint256 actualValue, bool verified, bool succeeded, bool claimed))',
  'function goalTypes(uint256 goalId) view returns (uint8)',
])

const AUTOMATION_ABI = parseAbi([
  'function manualVerify(uint256 goalId, address user, uint256 actualValue)',
  'function manualSettle(uint256 goalId)',
])

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Manual trigger for a specific goal: /api/cron/verify-goal?goalId=3
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const goalIdParam = searchParams.get('goalId')
  
  if (!goalIdParam) {
    return NextResponse.json({ error: 'Missing goalId parameter' }, { status: 400 })
  }

  const goalId = parseInt(goalIdParam)
  const privateKey = process.env.VERIFIER_PRIVATE_KEY

  if (!privateKey) {
    return NextResponse.json({ error: 'Verifier private key not configured' }, { status: 500 })
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

    // Get goal info
    const goal = await publicClient.readContract({
      address: GOALSTAKE_ADDRESS,
      abi: GOALSTAKE_ABI,
      functionName: 'getGoal',
      args: [BigInt(goalId)],
    })

    if (goal.settled) {
      return NextResponse.json({ error: 'Goal already settled', goal })
    }

    // Get goal type
    const goalType = await publicClient.readContract({
      address: GOALSTAKE_ADDRESS,
      abi: GOALSTAKE_ABI,
      functionName: 'goalTypes',
      args: [BigInt(goalId)],
    })
    const typeStr = goalType === 1 ? 'steps' : 'miles'

    // Get participants
    const participants = await publicClient.readContract({
      address: GOALSTAKE_ADDRESS,
      abi: GOALSTAKE_ABI,
      functionName: 'getGoalParticipants',
      args: [BigInt(goalId)],
    })

    const results: any[] = []

    for (const userAddress of participants) {
      const participant = await publicClient.readContract({
        address: GOALSTAKE_ADDRESS,
        abi: GOALSTAKE_ABI,
        functionName: 'getParticipant',
        args: [BigInt(goalId), userAddress],
      })

      if (participant.verified) {
        results.push({ user: userAddress, alreadyVerified: true })
        continue
      }

      // Call verify API
      const verifyUrl = new URL('/api/verify', process.env.NEXT_PUBLIC_APP_URL || 'https://vaada.io')
      verifyUrl.searchParams.set('user', userAddress.toLowerCase())
      verifyUrl.searchParams.set('start', goal.startTime.toString())
      verifyUrl.searchParams.set('end', goal.deadline.toString())
      verifyUrl.searchParams.set('type', typeStr)

      const verifyRes = await fetch(verifyUrl.toString())
      const verifyData = await verifyRes.json()

      if (!verifyData.success) {
        results.push({ user: userAddress, error: verifyData.error || 'Verification failed' })
        continue
      }

      const actualValue = BigInt(verifyData.stepsWei || verifyData.milesWei || '0')

      // Call manualVerify
      const txHash = await walletClient.writeContract({
        address: AUTOMATION_ADDRESS,
        abi: AUTOMATION_ABI,
        functionName: 'manualVerify',
        args: [BigInt(goalId), userAddress, actualValue],
      })

      results.push({
        user: userAddress,
        value: typeStr === 'steps' ? verifyData.steps : verifyData.miles,
        txHash,
        verified: true,
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })
    }

    // Settle the goal
    let settleTxHash
    try {
      settleTxHash = await walletClient.writeContract({
        address: AUTOMATION_ADDRESS,
        abi: AUTOMATION_ABI,
        functionName: 'manualSettle',
        args: [BigInt(goalId)],
      })
      await publicClient.waitForTransactionReceipt({ hash: settleTxHash })
    } catch (err: any) {
      return NextResponse.json({
        success: true,
        goalId,
        participants: results,
        settleError: err.message,
      })
    }

    return NextResponse.json({
      success: true,
      goalId,
      participants: results,
      settled: true,
      settleTxHash,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
