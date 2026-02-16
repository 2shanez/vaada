import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Vaada - The Promise Market'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
          backgroundColor: '#09090b',
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(46, 229, 157, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(46, 229, 157, 0.1) 0%, transparent 50%)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              backgroundColor: '#2EE59D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '48px', fontWeight: 900, color: 'white' }}>v</span>
          </div>
          <span style={{ fontSize: '72px', fontWeight: 700, color: '#2EE59D' }}>vaada</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '36px',
            color: '#fafafa',
            fontWeight: 600,
            marginBottom: '20px',
          }}
        >
          The Promise Market
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: '24px',
            color: '#a1a1aa',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Keep your promise. Keep your stake. Earn from those who don't.
        </div>

        {/* Built on badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '50px',
            padding: '12px 24px',
            borderRadius: '100px',
            backgroundColor: 'rgba(46, 229, 157, 0.1)',
            border: '1px solid rgba(46, 229, 157, 0.3)',
          }}
        >
          <span style={{ fontSize: '18px', color: '#a1a1aa' }}>Built on</span>
          <span style={{ fontSize: '18px', color: '#2EE59D', fontWeight: 600 }}>Base × Privy</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
