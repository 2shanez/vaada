import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

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

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Load font once at module level
let fontBase64: string | null = null
function getFont(): string {
  if (!fontBase64) {
    try {
      const fontPath = join(process.cwd(), 'public', 'fonts', 'Inter.ttf')
      const fontBuffer = readFileSync(fontPath)
      fontBase64 = fontBuffer.toString('base64')
    } catch {
      fontBase64 = ''
    }
  }
  return fontBase64
}

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
    const statusBgR = kept ? '46' : '239'
    const statusBgG = kept ? '229' : '68'
    const statusBgB = kept ? '157' : '68'
    const statusText = kept ? 'KEPT' : 'BROKEN'
    const statusIcon = kept ? '\u2713' : '\u2717'
    const barWidth = Math.max(4, (pct / 100) * 704)
    const goalName = escapeXml(r.goalName)
    const font = getFont()

    const svg = `<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Inter';
        src: url('data:font/ttf;base64,${font}') format('truetype');
        font-weight: 100 900;
        font-style: normal;
      }
    </style>
  </defs>
  <rect width="800" height="450" fill="#0B0B14" rx="16"/>
  
  <text x="48" y="72" font-family="Inter" font-size="32" font-weight="700" fill="#2EE59D">vaada</text>
  <rect x="580" y="42" width="172" height="36" rx="18" fill="rgb(${statusBgR},${statusBgG},${statusBgB})" fill-opacity="0.15"/>
  <text x="666" y="66" font-family="Inter" font-size="16" font-weight="600" fill="${statusColor}" text-anchor="middle">${statusIcon} ${statusText}</text>
  
  <text x="48" y="190" font-family="Inter" font-size="48" font-weight="700" fill="white">${goalName}</text>
  <text x="48" y="230" font-family="Inter" font-size="22" fill="white" fill-opacity="0.6">${actual.toLocaleString()} / ${target.toLocaleString()} ${unit} - ${pct}%</text>
  
  <rect x="48" y="250" width="704" height="8" rx="4" fill="white" fill-opacity="0.1"/>
  <rect x="48" y="250" width="${barWidth}" height="8" rx="4" fill="${statusColor}"/>
  
  <text x="48" y="370" font-family="Inter" font-size="16" fill="white" fill-opacity="0.4">Staked</text>
  <text x="48" y="402" font-family="Inter" font-size="28" font-weight="700" fill="white">$${stakeUSD} USDC</text>
  
  <text x="752" y="380" font-family="Inter" font-size="14" fill="white" fill-opacity="0.4" text-anchor="end">${shortAddr} - ${date}</text>
  <text x="752" y="402" font-family="Inter" font-size="14" fill="white" fill-opacity="0.3" text-anchor="end">Proof #${id} on Base</text>
</svg>`

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()

    return new NextResponse(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch (error: any) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 })
  }
}
