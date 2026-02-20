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
    const accentColor = kept ? '#2EE59D' : '#EF4444'
    const statusText = kept ? 'KEPT' : 'BROKEN'
    const barPct = `${pct}%`
    const emoji = r.goalType === 0 ? '🏃' : '👟'
    const goalType = r.goalType === 0 ? 'Running' : 'Fitbit (Steps)'

    // White theme colors
    const bg = '#FFFFFF'
    const cardBg = '#F9FAFB'
    const textPrimary = '#111827'
    const textSecondary = '#6B7280'
    const borderColor = '#E5E7EB'
    const pillBg = '#F3F4F6'

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '800px',
            height: '420px',
            backgroundColor: bg,
            fontFamily: 'Inter',
            color: textPrimary,
            padding: '24px',
          }}
        >
          {/* Card */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            borderRadius: '20px',
            border: `1px solid ${borderColor}`,
            overflow: 'hidden',
            backgroundColor: bg,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 28px 20px',
              borderBottom: `1px solid ${borderColor}`,
            }}>
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#2EE59D' }}>vaada</span>
                  <span style={{ fontSize: 12, color: textSecondary }}>Proof #{id}</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 14px',
                  borderRadius: 20,
                  border: `1px solid ${kept ? 'rgba(46,229,157,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  backgroundColor: kept ? 'rgba(46,229,157,0.08)' : 'rgba(239,68,68,0.08)',
                  color: accentColor,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}>
                  {kept ? '✓' : '✗'} {statusText}
                </div>
              </div>

              {/* Goal name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: 16 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: kept ? 'rgba(46,229,157,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${kept ? 'rgba(46,229,157,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  fontSize: 22,
                }}>
                  {emoji}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: textPrimary, lineHeight: 1.2 }}>{r.goalName}</span>
                  <span style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{goalType} · {date}</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '20px 28px',
              flex: 1,
              justifyContent: 'space-between',
            }}>
              {/* Stat pills */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { label: 'Target', value: target.toLocaleString(), sub: unit },
                  { label: 'Actual', value: actual.toLocaleString(), sub: unit, highlight: kept },
                  { label: 'Staked', value: `$${stakeUSD}`, sub: 'USDC' },
                  { label: 'Payout', value: `$${payoutUSD}`, sub: 'USDC', highlight: true },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    backgroundColor: pillBg,
                    borderRadius: 12,
                    padding: '10px 12px',
                    border: `1px solid ${s.highlight ? (kept ? 'rgba(46,229,157,0.3)' : 'rgba(239,68,68,0.3)') : borderColor}`,
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 10, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                    <span style={{ fontSize: 17, fontWeight: 700, color: s.highlight ? accentColor : textPrimary, marginTop: 2 }}>{s.value}</span>
                    <span style={{ fontSize: 10, color: textSecondary }}>{s.sub}</span>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: textSecondary }}>Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>{pct}%</span>
                </div>
                <div style={{
                  display: 'flex',
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#E5E7EB',
                }}>
                  <div style={{
                    width: barPct,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: accentColor,
                  }} />
                </div>
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 12,
                borderTop: `1px solid ${borderColor}`,
                marginTop: 12,
              }}>
                <span style={{ fontSize: 11, color: textSecondary }}>{shortAddr}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: textSecondary }}>Goal #{Number(r.goalId)}</span>
                  <span style={{ fontSize: 11, color: '#2EE59D', fontWeight: 600 }}>⬡ Base</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 800,
        height: 420,
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
