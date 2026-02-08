import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('fitbit_access_token')?.value

  // Revoke the token with Fitbit if we have one
  if (accessToken) {
    try {
      const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID
      const clientSecret = process.env.FITBIT_CLIENT_SECRET

      if (clientId && clientSecret) {
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        
        await fetch('https://api.fitbit.com/oauth2/revoke', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: accessToken,
          }),
        })
      }
    } catch (error) {
      console.error('Error revoking Fitbit token:', error)
      // Continue anyway - we'll still clear cookies
    }
  }

  const response = NextResponse.json({ success: true })
  
  // Clear all Fitbit cookies
  response.cookies.delete('fitbit_access_token')
  response.cookies.delete('fitbit_refresh_token')
  response.cookies.delete('fitbit_expires_at')
  response.cookies.delete('fitbit_user_id')
  response.cookies.delete('fitbit_oauth_state')

  return response
}
