import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
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

let fontCache: ArrayBuffer | null = null
async function getFont(): Promise<ArrayBuffer> {
  if (!fontCache) {
    const res = await fetch('https://fonts.cdnfonts.com/s/19795/Inter-Regular.woff')
    fontCache = await res.arrayBuffer()
  }
  return fontCache
}

let fontBoldCache: ArrayBuffer | null = null
async function getFontBold(): Promise<ArrayBuffer> {
  if (!fontBoldCache) {
    const res = await fetch('https://fonts.cdnfonts.com/s/19795/Inter-Bold.woff')
    fontBoldCache = await res.arrayBuffer()
  }
  return fontBoldCache
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
    const [fontData, fontBoldData, receipt] = await Promise.all([
      getFont(),
      getFontBold(),
      createPublicClient({ chain: base, transport: http(RPC_URL) }).readContract({
        address: RECEIPTS_ADDRESS,
        abi: RECEIPTS_ABI,
        functionName: 'getReceipt',
        args: [BigInt(id)],
      }),
    ])

    const r = receipt as any
    const kept = r.succeeded
    const stakeUSD = (Number(r.stakeAmount) / 1e6).toFixed(2)
    const actual = Number(r.actual)
    const target = Number(r.target)
    const unit = r.goalType === 0 ? 'miles' : 'steps'
    const pct = Math.min(Math.round((actual / target) * 100), 100)
    const date = new Date(Number(r.endTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const shortAddr = `${r.participant.slice(0, 6)}...${r.participant.slice(-4)}`
    const statusColor = kept ? '#16A34A' : '#DC2626'
    const statusBg = kept ? '#F0FDF4' : '#FEF2F2'
    const statusText = kept ? '\u2713 KEPT' : '\u2717 BROKEN'
    const barBg = kept ? '#DCFCE7' : '#FEE2E2'
    const barPct = `${pct}%`

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '600px',
            height: '600px',
            backgroundColor: '#0B0B14',
            padding: '48px',
            fontFamily: 'Inter',
            color: '#F9FAFB',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#2EE59D' }}>vaada</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 20px',
                borderRadius: 18,
                backgroundColor: kept ? 'rgba(46,229,157,0.15)' : 'rgba(220,38,38,0.15)',
                color: statusColor,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {statusText}
            </div>
          </div>

          {/* Goal name */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48 }}>
            <span style={{ fontSize: 40, fontWeight: 700, color: '#F9FAFB' }}>{r.goalName}</span>
            <span style={{ fontSize: 20, color: '#9CA3AF', marginTop: 8 }}>
              {actual.toLocaleString()} / {target.toLocaleString()} {unit} — {pct}%
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              display: 'flex',
              marginTop: 24,
              width: '100%',
              height: 8,
              borderRadius: 4,
              backgroundColor: '#1F2937',
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

          {/* Stake amount */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
            <span style={{ fontSize: 14, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staked</span>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#F9FAFB', marginTop: 4 }}>${stakeUSD}</span>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
            <span style={{ fontSize: 14, color: '#6B7280' }}>{shortAddr}</span>
            <span style={{ fontSize: 14, color: '#6B7280' }}>{date}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#4B5563' }}>Proof #{id} · Base · vaada.io</span>
          </div>
        </div>
      ),
      {
        width: 600,
        height: 600,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            style: 'normal' as const,
            weight: 400 as const,
          },
          {
            name: 'Inter',
            data: fontBoldData,
            style: 'normal' as const,
            weight: 700 as const,
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
