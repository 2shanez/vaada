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

export default async function Image({ params }: { params: { id: string } }) {
  const goal = GOALS[params.id] || GOALS['1']
  
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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px 80px',
            borderRadius: '32px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Emoji */}
          <div
            style={{
              fontSize: 100,
              marginBottom: 24,
            }}
          >
            {goal.emoji}
          </div>
          
          {/* Title */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: 'white',
              marginBottom: 16,
            }}
          >
            {goal.title}
          </div>
          
          {/* Description */}
          <div
            style={{
              fontSize: 28,
              color: 'rgba(255,255,255,0.7)',
              marginBottom: 32,
            }}
          >
            {goal.description}
          </div>
          
          {/* Stats */}
          <div
            style={{
              display: 'flex',
              gap: 48,
              marginBottom: 32,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#2EE59D' }}>
                {goal.targetMiles} mi
              </div>
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>Target</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#2EE59D' }}>
                ${goal.minStake}-${goal.maxStake}
              </div>
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>Stake</div>
            </div>
          </div>
          
          {/* CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 32px',
              background: '#2EE59D',
              borderRadius: 16,
              color: 'white',
              fontSize: 24,
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
            gap: 12,
            position: 'absolute',
            bottom: 40,
            left: 60,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#2EE59D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: 20,
            }}
          >
            v
          </div>
          <div style={{ color: '#2EE59D', fontSize: 28, fontWeight: 700 }}>vaada</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
