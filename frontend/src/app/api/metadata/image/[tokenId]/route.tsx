import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

export const runtime = 'edge'

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

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px',
            background: '#0B0B14',
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#2EE59D' }}>vaada</div>
            </div>
            <div style={{
              display: 'flex',
              padding: '6px 16px',
              borderRadius: '999px',
              fontSize: '16px',
              fontWeight: 600,
              background: kept ? 'rgba(46,229,157,0.15)' : 'rgba(239,68,68,0.15)',
              color: kept ? '#2EE59D' : '#EF4444',
            }}>
              {kept ? '\u2705 KEPT' : '\u274c BROKEN'}
            </div>
          </div>

          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1.1 }}>
              {r.goalName}
            </div>
            <div style={{ fontSize: '22px', color: 'rgba(255,255,255,0.6)' }}>
              {actual.toLocaleString()} / {target.toLocaleString()} {unit} \u2022 {pct}%
            </div>
            {/* Progress bar */}
            <div style={{ display: 'flex', width: '100%', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: '4px',
                background: kept ? '#2EE59D' : '#EF4444',
              }} />
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)' }}>Staked</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>${stakeUSD} USDC</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>{shortAddr} \u2022 {date}</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Proof #{id} \u2022 Base</div>
            </div>
          </div>
        </div>
      ),
      {
        width: 800,
        height: 450,
      },
    )
  } catch (error: any) {
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
