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
    const statusColor = kept ? '#2EE59D' : '#EF4444'
    const statusText = kept ? '✓ PROMISE KEPT' : '✗ BROKEN'
    const barPct = `${pct}%`
    const emoji = r.goalType === 0 ? '🏃' : '👟'

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '600px',
            height: '600px',
            backgroundColor: '#0B0B14',
            fontFamily: 'Inter',
            color: '#F9FAFB',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle gradient glow top-right */}
          <div style={{
            display: 'flex',
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: kept ? 'radial-gradient(circle, rgba(46,229,157,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)',
          }} />

          {/* Inner card */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            margin: '24px',
            padding: '40px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: '#13131D',
            flex: 1,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#2EE59D', letterSpacing: '-0.02em' }}>vaada</span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 16px',
                borderRadius: 20,
                border: `1px solid ${kept ? 'rgba(46,229,157,0.3)' : 'rgba(239,68,68,0.3)'}`,
                backgroundColor: kept ? 'rgba(46,229,157,0.1)' : 'rgba(239,68,68,0.1)',
                color: statusColor,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}>
                {statusText}
              </div>
            </div>

            {/* Goal name + emoji */}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36 }}>
              <span style={{ fontSize: 18, color: '#6B7280' }}>{emoji} PROMISE</span>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#F9FAFB', marginTop: 6, lineHeight: 1.2 }}>{r.goalName}</span>
            </div>

            {/* Progress section */}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#9CA3AF' }}>{actual.toLocaleString()} / {target.toLocaleString()} {unit}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: statusColor }}>{pct}%</span>
              </div>
              <div style={{
                display: 'flex',
                width: '100%',
                height: 6,
                borderRadius: 3,
                backgroundColor: '#1F2937',
              }}>
                <div style={{
                  width: barPct,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: statusColor,
                }} />
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 40, marginTop: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Staked</span>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#F9FAFB', marginTop: 2 }}>${stakeUSD}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</span>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#F9FAFB', marginTop: 2 }}>{date}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: '#4B5563' }}>{shortAddr}</span>
              <span style={{ fontSize: 13, color: '#4B5563' }}>Proof #{id} · Base</span>
            </div>
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
