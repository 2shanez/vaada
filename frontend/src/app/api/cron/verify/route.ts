import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

// Contract addresses (mainnet)
const GOALSTAKE_ADDRESS = '0xAc67E863221B703CEE9B440a7beFe71EA8725434'
const AUTOMATION_ADDRESS = '0xA6BcEcA41fCF743324a864F47dd03F0D3806341D'
const RECEIPTS_ADDRESS = '0x2743327fa1EeDF92793608d659b7eEC428252dA2'

// Use custom RPC if available, fallback to public
const RPC_URL = process.env.BASE_RPC_URL || 'https://base.publicnode.com'

const GOALSTAKE_ABI = parseAbi([
  'function goalCount() view returns (uint256)',
  'function getGoal(uint256 goalId) view returns ((uint256 id, string name, uint256 targetMiles, uint256 minStake, uint256 maxStake, uint256 startTime, uint256 entryDeadline, uint256 deadline, bool active, bool settled, uint256 totalStaked, uint256 participantCount))',
  'function getGoalParticipants(uint256 goalId) view returns (address[])',
  'function getParticipant(uint256 goalId, address user) view returns ((address user, uint256 stake, uint256 actualValue, bool verified, bool succeeded, bool claimed))',
  'function goalTypes(uint256 goalId) view returns (uint8)',
])

const AUTOMATION_ABI = parseAbi([
  'function manualVerify(uint256 goalId, address user, uint256 actualValue)',
  'function manualSettle(uint256 goalId)',
])

const RECEIPTS_ABI = parseAbi([
  'function batchMintReceipts((uint256 goalId, address participant, uint8 goalType, uint256 target, uint256 actual, uint256 stakeAmount, uint256 payout, bool succeeded, uint256 startTime, uint256 endTime, string goalName)[] inputs)',
])

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel cron or manual trigger with secret)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // Allow if: no secret configured, OR secret matches, OR it's from Vercel Cron
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}` || isVercelCron
  
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    // Get goal count
    const goalCount = await publicClient.readContract({
      address: GOALSTAKE_ADDRESS,
      abi: GOALSTAKE_ABI,
      functionName: 'goalCount',
    })

    const results: any[] = []
    const now = BigInt(Math.floor(Date.now() / 1000))

    // Check each goal
    for (let goalId = 0; goalId < Number(goalCount); goalId++) {
      const goal = await publicClient.readContract({
        address: GOALSTAKE_ADDRESS,
        abi: GOALSTAKE_ABI,
        functionName: 'getGoal',
        args: [BigInt(goalId)],
      })

      // Skip if already settled
      if (goal.settled) continue

      // Skip if deadline hasn't passed
      if (now < goal.deadline) continue

      // Get goal type (0 = STRAVA_MILES, 1 = FITBIT_STEPS)
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

      let allVerified = true
      const goalResults: any = { goalId, participants: [] }

      // Verify each participant
      for (const userAddress of participants) {
        const participant = await publicClient.readContract({
          address: GOALSTAKE_ADDRESS,
          abi: GOALSTAKE_ABI,
          functionName: 'getParticipant',
          args: [BigInt(goalId), userAddress],
        })

        if (participant.verified) {
          goalResults.participants.push({ user: userAddress, alreadyVerified: true })
          continue
        }

        allVerified = false

        // Call verify API
        const verifyUrl = new URL('/api/verify', process.env.NEXT_PUBLIC_APP_URL || 'https://vaada.io')
        verifyUrl.searchParams.set('user', userAddress.toLowerCase())
        verifyUrl.searchParams.set('start', goal.startTime.toString())
        verifyUrl.searchParams.set('end', goal.deadline.toString())
        verifyUrl.searchParams.set('type', typeStr)

        try {
          const verifyRes = await fetch(verifyUrl.toString())
          const verifyData = await verifyRes.json()

          if (!verifyData.success) {
            goalResults.participants.push({ user: userAddress, error: verifyData.error || 'Verification failed' })
            continue
          }

          // Get the value (steps or miles in wei format)
          // Use raw value (steps/miles), not wei-scaled — contract compares against targetMiles directly
          const rawValue = verifyData.steps || verifyData.value || verifyData.miles || 0
          const actualValue = BigInt(rawValue)

          // Call manualVerify on automation contract
          const txHash = await walletClient.writeContract({
            address: AUTOMATION_ADDRESS,
            abi: AUTOMATION_ABI,
            functionName: 'manualVerify',
            args: [BigInt(goalId), userAddress, actualValue],
          })

          goalResults.participants.push({
            user: userAddress,
            value: verifyData.steps || verifyData.value || verifyData.miles || 0,
            txHash,
            verified: true,
          })

          // Wait for tx confirmation
          await publicClient.waitForTransactionReceipt({ hash: txHash })
          
        } catch (err: any) {
          goalResults.participants.push({ user: userAddress, error: err.message })
        }
      }

      // If all participants are now verified, settle the goal
      if (allVerified || goalResults.participants.every((p: any) => p.verified || p.alreadyVerified)) {
        try {
          const settleTxHash = await walletClient.writeContract({
            address: AUTOMATION_ADDRESS,
            abi: AUTOMATION_ABI,
            functionName: 'manualSettle',
            args: [BigInt(goalId)],
          })

          goalResults.settled = true
          goalResults.settleTxHash = settleTxHash

          await publicClient.waitForTransactionReceipt({ hash: settleTxHash })

          // Mint receipts for all participants after settlement
          try {
            const mintInputs = []
            for (const userAddress of participants) {
              const p = await publicClient.readContract({
                address: GOALSTAKE_ADDRESS,
                abi: GOALSTAKE_ABI,
                functionName: 'getParticipant',
                args: [BigInt(goalId), userAddress],
              })

              mintInputs.push({
                goalId: BigInt(goalId),
                participant: userAddress,
                goalType: goalType,
                target: goal.targetMiles,
                actual: p.actualValue,
                stakeAmount: p.stake,
                payout: p.succeeded ? p.stake : BigInt(0), // Simplified — winners get at least stake back
                succeeded: p.succeeded,
                startTime: goal.startTime,
                endTime: goal.deadline,
                goalName: goal.name,
              })
            }

            if (mintInputs.length > 0) {
              const mintTxHash = await walletClient.writeContract({
                address: RECEIPTS_ADDRESS,
                abi: RECEIPTS_ABI,
                functionName: 'batchMintReceipts',
                args: [mintInputs],
              })
              goalResults.receiptsTxHash = mintTxHash
              await publicClient.waitForTransactionReceipt({ hash: mintTxHash })
              goalResults.receiptsMinted = mintInputs.length
            }
          } catch (err: any) {
            goalResults.receiptsError = err.message
          }
        } catch (err: any) {
          goalResults.settleError = err.message
        }
      }

      results.push(goalResults)
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      goalsProcessed: results.length,
      results,
    })

  } catch (error: any) {
    console.error('Cron verify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
