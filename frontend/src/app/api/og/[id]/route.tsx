import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

// export const runtime = 'edge' // switched to nodejs

const GOALS: Record<string, { emoji: string; title: string; desc: string; miles: number; min: number; max: number }> = {
  '10': { emoji: '🌅', title: 'Daily Mile', desc: 'Run 1 mile today', miles: 1, min: 5, max: 50 },
  '1': { emoji: '🌅', title: 'Daily Mile', desc: 'Run 1 mile today', miles: 1, min: 5, max: 50 },
  '2': { emoji: '☀️', title: 'Daily 3', desc: 'Run 3 miles today', miles: 3, min: 5, max: 50 },
  '3': { emoji: '💪', title: 'Weekend Warrior', desc: 'Run 10 miles', miles: 10, min: 10, max: 100 },
  '4': { emoji: '⚡', title: 'Weekly 15', desc: 'Run 15 miles this week', miles: 15, min: 10, max: 100 },
  '5': { emoji: '🏃', title: 'February 50', desc: 'Run 50 miles this month', miles: 50, min: 20, max: 200 },
  '6': { emoji: '🏅', title: 'Marathon Prep', desc: 'Hit 100 miles in 30 days', miles: 100, min: 20, max: 200 },
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const g = GOALS[id] || GOALS['1']

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
          padding: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 60px',
            borderRadius: 24,
            backgroundColor: '#161616',
            border: '1px solid #2a2a2a',
          }}
        >
          <span style={{ fontSize: 72 }}>{g.emoji}</span>
          <span style={{ fontSize: 42, fontWeight: 700, color: 'white', marginTop: 12 }}>
            {g.title}
          </span>
          <span style={{ fontSize: 22, color: '#888', marginTop: 8 }}>
            {g.desc}
          </span>
          <div style={{ display: 'flex', gap: 40, marginTop: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#2EE59D' }}>{g.miles} mi</span>
              <span style={{ fontSize: 12, color: '#666', marginTop: 4 }}>TARGET</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#2EE59D' }}>${g.min}-${g.max}</span>
              <span style={{ fontSize: 12, color: '#666', marginTop: 4 }}>STAKE</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 28,
              padding: '10px 24px',
              backgroundColor: '#2EE59D',
              borderRadius: 10,
              color: 'white',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Join on vaada.io
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            position: 'absolute',
            bottom: 28,
            left: 40,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: '#2EE59D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            v
          </div>
          <span style={{ color: '#2EE59D', fontSize: 20, fontWeight: 700 }}>vaada</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
