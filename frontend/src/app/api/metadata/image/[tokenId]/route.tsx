import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
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

let fontData: ArrayBuffer | null = null
function getFont(): ArrayBuffer {
  if (!fontData) {
    const fontPath = join(process.cwd(), 'public', 'fonts', 'Inter.ttf')
    const buf = readFileSync(fontPath)
    fontData = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }
  return fontData
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params
  const id = parseInt(tokenId)
  if (isNaN(id) || id < 1) {
    return new Response('Invalid token ID', { status: 400 })
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
    const statusText = kept ? '✓ KEPT' : '✗ BROKEN'
    const barPct = `${pct}%`

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '800px',
            height: '450px',
            backgroundColor: '#0B0B14',
            borderRadius: '16px',
            padding: '48px',
            fontFamily: 'Inter',
            color: 'white',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#2EE59D' }}>vaada</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 20px',
                borderRadius: 18,
                backgroundColor: kept ? 'rgba(46,229,157,0.15)' : 'rgba(239,68,68,0.15)',
                color: statusColor,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {statusText}
            </div>
          </div>

          {/* Goal name */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 60 }}>
            <span style={{ fontSize: 48, fontWeight: 700 }}>{r.goalName}</span>
            <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
              {actual.toLocaleString()} / {target.toLocaleString()} {unit} — {pct}%
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              display: 'flex',
              marginTop: 20,
              width: '100%',
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <div
              style={{
                width: barPct,
                height: 8,
                borderRadius: 4,
                backgroundColor: statusColor,
              }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>Staked</span>
              <span style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>${stakeUSD} USDC</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{shortAddr} — {date}</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Proof #{id} on Base</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 800,
        height: 450,
        fonts: [
          {
            name: 'Inter',
            data: getFont(),
            style: 'normal',
            weight: 400,
          },
          {
            name: 'Inter',
            data: getFont(),
            style: 'normal',
            weight: 700,
          },
        ],
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      }
    )
  } catch (error: any) {
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
