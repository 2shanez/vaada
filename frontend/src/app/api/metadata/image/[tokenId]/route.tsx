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
    const payoutUSD = (Number(r.payout) / 1e6).toFixed(2)
    const actual = Number(r.actual)
    const target = Number(r.target)
    const unit = r.goalType === 0 ? 'miles' : 'steps'
    const pct = Math.min(Math.round((actual / target) * 100), 100)
    const date = new Date(Number(r.endTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const shortAddr = `${r.participant.slice(0, 6)}...${r.participant.slice(-4)}`
    const statusColor = kept ? '#2EE59D' : '#EF4444'
    const statusText = kept ? 'KEPT' : 'BROKEN'
    const barPct = `${pct}%`
    const emoji = r.goalType === 0 ? '🏃' : '👟'
    const goalType = r.goalType === 0 ? 'Running' : 'Fitbit (Steps)'

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '600px',
            height: '600px',
            backgroundColor: '#0A0A12',
            fontFamily: 'Inter',
            color: '#F9FAFB',
            padding: '20px',
          }}
        >
          {/* Card container */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            borderRadius: '20px',
            border: `1px solid ${kept ? 'rgba(46,229,157,0.25)' : 'rgba(239,68,68,0.25)'}`,
            overflow: 'hidden',
            backgroundColor: '#12121C',
          }}>
            {/* Header section — gradient like GoalCard */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '28px 32px 24px',
              background: 'linear-gradient(135deg, #0A0A12, #12121C)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              position: 'relative',
            }}>
              {/* Top row: logo + status badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#2EE59D', letterSpacing: '-0.02em' }}>vaada</span>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Proof #{id}</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: `1px solid ${kept ? 'rgba(46,229,157,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  backgroundColor: kept ? 'rgba(46,229,157,0.1)' : 'rgba(239,68,68,0.1)',
                  color: statusColor,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}>
                  {kept ? '✓' : '✗'} {statusText}
                </div>
              </div>

              {/* Goal icon + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: 24 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(46,229,157,0.2), rgba(46,229,157,0.05))',
                  border: '1px solid rgba(46,229,157,0.15)',
                  fontSize: 26,
                }}>
                  {emoji}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB', lineHeight: 1.2 }}>{r.goalName}</span>
                  <span style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{goalType} · {date}</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 32px',
              flex: 1,
            }}>
              {/* Stat pills row — matching GoalCard stat boxes */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  backgroundColor: '#0A0A12',
                  borderRadius: 12,
                  padding: '12px 14px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#F9FAFB', marginTop: 2 }}>{target.toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{unit}</span>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  backgroundColor: '#0A0A12',
                  borderRadius: 12,
                  padding: '12px 14px',
                  border: `1px solid ${kept ? 'rgba(46,229,157,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actual</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: kept ? '#2EE59D' : '#F9FAFB', marginTop: 2 }}>{actual.toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{unit}</span>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  backgroundColor: '#0A0A12',
                  borderRadius: 12,
                  padding: '12px 14px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Staked</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#F9FAFB', marginTop: 2 }}>${stakeUSD}</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>USDC</span>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  backgroundColor: '#0A0A12',
                  borderRadius: 12,
                  padding: '12px 14px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payout</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: kept ? '#2EE59D' : '#EF4444', marginTop: 2 }}>${payoutUSD}</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>USDC</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#9CA3AF' }}>Progress</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>{pct}%</span>
                </div>
                <div style={{
                  display: 'flex',
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}>
                  <div style={{
                    width: barPct,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: statusColor,
                  }} />
                </div>
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'auto',
                paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: 12, color: '#4B5563' }}>{shortAddr}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#4B5563' }}>Goal #{Number(r.goalId)}</span>
                  <span style={{ fontSize: 12, color: '#2EE59D' }}>⬡ Base</span>
                </div>
              </div>
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
