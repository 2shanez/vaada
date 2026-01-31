import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/?strava=error', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?strava=missing_code', request.url))
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()
    
    // tokenData contains:
    // - access_token: string
    // - refresh_token: string
    // - expires_at: number
    // - athlete: { id, firstname, lastname, ... }

    // For MVP, we'll pass the token back to the frontend via URL params
    // In production, you'd want to encrypt this and store it more securely
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('strava', 'success')
    redirectUrl.searchParams.set('athlete_id', tokenData.athlete.id.toString())
    redirectUrl.searchParams.set('athlete_name', `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`)
    
    // Store token in a cookie (httpOnly for security)
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set('strava_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 21600, // 6 hours default
    })
    response.cookies.set('strava_refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    response.cookies.set('strava_athlete_id', tokenData.athlete.id.toString(), {
      httpOnly: false, // Allow JS to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })

    return response
  } catch (error) {
    console.error('Strava OAuth error:', error)
    return NextResponse.redirect(new URL('/?strava=error', request.url))
  }
}
