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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params
  const id = parseInt(tokenId)
  if (isNaN(id) || id < 1) {
    return new NextResponse('Invalid token ID', { status: 400 })
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
    const kept = r.succeeded
    const stakeUSD = (Number(r.stakeAmount) / 1e6).toFixed(2)
    const actual = Number(r.actual)
    const target = Number(r.target)
    const unit = r.goalType === 0 ? 'miles' : 'steps'
    const pct = Math.min(Math.round((actual / target) * 100), 100)
    const date = new Date(Number(r.endTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const shortAddr = `${r.participant.slice(0, 6)}...${r.participant.slice(-4)}`
    const statusColor = kept ? '#2EE59D' : '#EF4444'
    const statusBg = kept ? 'rgba(46,229,157,0.15)' : 'rgba(239,68,68,0.15)'
    const statusText = kept ? '✅ KEPT' : '❌ BROKEN'
    const barWidth = (pct / 100) * 704

    const svg = `<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="450" fill="#0B0B14" rx="16"/>
  
  <!-- Header -->
  <text x="48" y="72" font-family="system-ui, sans-serif" font-size="32" font-weight="700" fill="#2EE59D">vaada</text>
  <rect x="580" y="42" width="172" height="36" rx="18" fill="${statusBg}"/>
  <text x="666" y="66" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="${statusColor}" text-anchor="middle">${statusText}</text>
  
  <!-- Goal Name -->
  <text x="48" y="190" font-family="system-ui, sans-serif" font-size="48" font-weight="700" fill="white">${r.goalName}</text>
  
  <!-- Progress text -->
  <text x="48" y="230" font-family="system-ui, sans-serif" font-size="22" fill="rgba(255,255,255,0.6)">${actual.toLocaleString()} / ${target.toLocaleString()} ${unit} • ${pct}%</text>
  
  <!-- Progress bar bg -->
  <rect x="48" y="250" width="704" height="8" rx="4" fill="rgba(255,255,255,0.1)"/>
  <!-- Progress bar fill -->
  <rect x="48" y="250" width="${barWidth}" height="8" rx="4" fill="${statusColor}"/>
  
  <!-- Footer left -->
  <text x="48" y="370" font-family="system-ui, sans-serif" font-size="16" fill="rgba(255,255,255,0.4)">Staked</text>
  <text x="48" y="402" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="white">$${stakeUSD} USDC</text>
  
  <!-- Footer right -->
  <text x="752" y="380" font-family="system-ui, sans-serif" font-size="14" fill="rgba(255,255,255,0.4)" text-anchor="end">${shortAddr} • ${date}</text>
  <text x="752" y="402" font-family="system-ui, sans-serif" font-size="14" fill="rgba(255,255,255,0.3)" text-anchor="end">Proof #${id} • Base</text>
</svg>`

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch (error: any) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 })
  }
}
