import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const baseUrl = `${protocol}://${host}`

  // Verify state to prevent CSRF
  const storedState = request.cookies.get('fitbit_oauth_state')?.value
  if (state !== storedState) {
    console.error('Fitbit OAuth state mismatch')
    return NextResponse.redirect(new URL('/?fitbit=error&reason=state_mismatch', baseUrl))
  }

  if (error) {
    console.error('Fitbit OAuth error:', error)
    return NextResponse.redirect(new URL('/?fitbit=error', baseUrl))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?fitbit=missing_code', baseUrl))
  }

  const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID
  const clientSecret = process.env.FITBIT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Fitbit credentials not configured')
    return NextResponse.redirect(new URL('/?fitbit=error&reason=config', baseUrl))
  }

  try {
    const redirectUri = `${baseUrl}/api/fitbit/callback`
    
    // Fitbit uses Basic Auth for token exchange
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    const tokenResponse = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Fitbit token exchange failed:', errorData)
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()

    // tokenData contains:
    // - access_token: string
    // - refresh_token: string
    // - expires_in: number (seconds, typically 28800 = 8 hours)
    // - scope: string
    // - token_type: "Bearer"
    // - user_id: string

    const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in

    // Fetch user profile to get display name
    const profileResponse = await fetch('https://api.fitbit.com/1/user/-/profile.json', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    let userName = 'Fitbit User'
    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      userName = profileData.user?.displayName || profileData.user?.fullName || 'Fitbit User'
    }

    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('fitbit', 'success')
    redirectUrl.searchParams.set('fitbit_user', userName)

    const response = NextResponse.redirect(redirectUrl)
    
    // Store tokens in httpOnly cookies
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
      maxAge: 60 * 60 * 24 * 365, // 1 year (Fitbit refresh tokens are long-lived)
    })
    response.cookies.set('fitbit_expires_at', expiresAt.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 28800,
    })
    response.cookies.set('fitbit_user_id', tokenData.user_id, {
      httpOnly: false, // Allow JS to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
    
    // Clear the OAuth state cookie
    response.cookies.delete('fitbit_oauth_state')

    return response
  } catch (error) {
    console.error('Fitbit OAuth error:', error)
    return NextResponse.redirect(new URL('/?fitbit=error', baseUrl))
  }
}
