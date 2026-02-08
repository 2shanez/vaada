import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('fitbit_access_token')?.value
  const refreshToken = request.cookies.get('fitbit_refresh_token')?.value
  const expiresAt = request.cookies.get('fitbit_expires_at')?.value

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Not authenticated with Fitbit' }, { status: 401 })
  }

  const now = Math.floor(Date.now() / 1000)
  const expiresAtNum = parseInt(expiresAt || '0', 10)
  
  // Check if token needs refresh (expires in less than 1 hour)
  const needsRefresh = expiresAtNum - now < 3600

  if (needsRefresh) {
    // Refresh the token
    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID
    const clientSecret = process.env.FITBIT_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Fitbit not configured' }, { status: 500 })
    }

    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

      const refreshResponse = await fetch('https://api.fitbit.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      })

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text()
        console.error('Fitbit token refresh failed:', errorText)
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 })
      }

      const tokenData = await refreshResponse.json()
      const newExpiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in

      // Return new token and update cookies
      const response = NextResponse.json({
        token: tokenData.access_token,
        needsRefresh: false,
        expiresAt: newExpiresAt,
        source: 'fitbit',
      })

      response.cookies.set('fitbit_access_token', tokenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokenData.expires_in || 28800,
      })
      response.cookies.set('fitbit_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
      response.cookies.set('fitbit_expires_at', newExpiresAt.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokenData.expires_in || 28800,
      })

      return response
    } catch (error) {
      console.error('Fitbit refresh error:', error)
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 })
    }
  }

  // Token is still valid
  return NextResponse.json({
    token: accessToken,
    needsRefresh: false,
    expiresAt: expiresAtNum,
    source: 'fitbit',
  })
}
