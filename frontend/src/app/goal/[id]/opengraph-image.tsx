import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Vaada Goal'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Goal data (same as BrowseGoals)
const GOALS: Record<string, { emoji: string; title: string; description: string; targetMiles: number; minStake: number; maxStake: number }> = {
  '10': { emoji: '🌅', title: 'Daily Mile', description: 'Run 1 mile today', targetMiles: 1, minStake: 5, maxStake: 50 },
  '1': { emoji: '🌅', title: 'Daily Mile', description: 'Run 1 mile today', targetMiles: 1, minStake: 5, maxStake: 50 },
  '2': { emoji: '☀️', title: 'Daily 3', description: 'Run 3 miles today', targetMiles: 3, minStake: 5, maxStake: 50 },
  '3': { emoji: '💪', title: 'Weekend Warrior', description: 'Run 10 miles this weekend', targetMiles: 10, minStake: 10, maxStake: 100 },
  '4': { emoji: '⚡', title: 'Weekly 15', description: 'Run 15 miles this week', targetMiles: 15, minStake: 10, maxStake: 100 },
  '5': { emoji: '🏃', title: 'February 50', description: 'Run 50 miles this month', targetMiles: 50, minStake: 20, maxStake: 200 },
  '6': { emoji: '🏅', title: 'Marathon Prep', description: 'Hit 100 miles in 30 days', targetMiles: 100, minStake: 20, maxStake: 200 },
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const goal = GOALS[id] || GOALS['1']
  
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
        }}
      >
        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 64px',
            borderRadius: '24px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
          }}
        >
          {/* Emoji */}
          <div style={{ fontSize: 80, marginBottom: 16 }}>
            {goal.emoji}
          </div>
          
          {/* Title */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: 'white',
              marginBottom: 8,
            }}
          >
            {goal.title}
          </div>
          
          {/* Description */}
          <div
            style={{
              fontSize: 24,
              color: '#888',
              marginBottom: 24,
            }}
          >
            {goal.description}
          </div>
          
          {/* Stats */}
          <div
            style={{
              display: 'flex',
              gap: 32,
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#2EE59D' }}>
                {goal.targetMiles} mi
              </div>
              <div style={{ fontSize: 14, color: '#666' }}>Target</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#2EE59D' }}>
                ${goal.minStake}-${goal.maxStake}
              </div>
              <div style={{ fontSize: 14, color: '#666' }}>Stake</div>
            </div>
          </div>
          
          {/* CTA */}
          <div
            style={{
              display: 'flex',
              padding: '12px 24px',
              backgroundColor: '#2EE59D',
              borderRadius: 12,
              color: 'white',
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            Join on vaada.io
          </div>
        </div>
        
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            position: 'absolute',
            bottom: 32,
            left: 48,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#2EE59D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            v
          </div>
          <div style={{ color: '#2EE59D', fontSize: 24, fontWeight: 700 }}>vaada</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
