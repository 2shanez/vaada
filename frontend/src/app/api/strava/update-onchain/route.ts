import { NextRequest, NextResponse } from 'next/server'

async function refreshToken(refreshToken: string) {
  const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh token')
  }

  return await tokenResponse.json()
}

// Returns a fresh Strava access token for updating on-chain storage
// This endpoint handles auto-refresh if needed
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('strava_access_token')?.value
  const expiresAt = request.cookies.get('strava_expires_at')?.value
  const refreshTokenValue = request.cookies.get('strava_refresh_token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'No Strava token found' }, { status: 401 })
  }

  // Check if token is expired or will expire in the next hour
  // Use a longer buffer for on-chain updates to ensure token is fresh
  const expiryTime = expiresAt ? parseInt(expiresAt) : 0
  const now = Math.floor(Date.now() / 1000)
  const bufferSeconds = 60 * 60 // 1 hour buffer for on-chain updates

  // Token is still fresh
  if (expiryTime > 0 && expiryTime >= now + bufferSeconds) {
    return NextResponse.json({
      token: accessToken,
      expiresAt: expiryTime,
      needsRefresh: false,
    })
  }

  // Token expired or expiring soon - refresh it
  if (!refreshTokenValue) {
    return NextResponse.json({ error: 'Token expired and no refresh token available' }, { status: 401 })
  }

  try {
    const tokenData = await refreshToken(refreshTokenValue)

    // Update cookies with new tokens
    const response = NextResponse.json({
      token: tokenData.access_token,
      expiresAt: tokenData.expires_at,
      needsRefresh: false,
      refreshed: true
    })

    response.cookies.set('strava_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 21600,
    })

    response.cookies.set('strava_refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })

    response.cookies.set('strava_expires_at', tokenData.expires_at.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 21600,
    })

    return response
  } catch (error) {
    console.error('Failed to refresh Strava token:', error)
    return NextResponse.json({ error: 'Failed to refresh expired token' }, { status: 401 })
  }
}
