import { NextRequest, NextResponse } from 'next/server'

// Fitbit OAuth 2.0 authorization
// Docs: https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/

export async function GET(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID
  
  if (!clientId) {
    return NextResponse.json({ error: 'Fitbit client ID not configured' }, { status: 500 })
  }

  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const baseUrl = `${protocol}://${host}`
  
  const redirectUri = `${baseUrl}/api/fitbit/callback`
  
  // Scopes needed for activity data
  // activity: access to activity data (steps, distance, calories)
  // profile: basic profile info
  const scope = 'activity profile'
  
  // Get wallet address from query params (passed from frontend)
  const walletAddress = request.nextUrl.searchParams.get('wallet')
  
  // Generate state with CSRF token + wallet address
  const csrfToken = Math.random().toString(36).substring(2, 15)
  const stateData = {
    csrf: csrfToken,
    wallet: walletAddress || null,
  }
  const state = encodeURIComponent(JSON.stringify(stateData))
  
  const authUrl = new URL('https://www.fitbit.com/oauth2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', state)
  
  // Store CSRF token in cookie for verification
  const response = NextResponse.redirect(authUrl.toString())
  response.cookies.set('fitbit_oauth_state', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  })
  
  return response
}
