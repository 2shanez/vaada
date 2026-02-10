import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

// ============== STRAVA ==============

// Refresh Strava access token using stored refresh token
async function refreshStravaToken(refreshToken: string) {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error(`Strava token refresh failed: ${response.status}`)
  }

  return await response.json()
}

// Fetch activities from Strava
async function fetchStravaActivities(accessToken: string, after: number, before: number) {
  const url = new URL('https://www.strava.com/api/v3/athlete/activities')
  url.searchParams.set('after', after.toString())
  url.searchParams.set('before', before.toString())
  url.searchParams.set('per_page', '200')

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status}`)
  }

  return await response.json()
}

// Calculate total miles from Strava running activities (device-recorded only)
function calculateStravaMiles(activities: any[]): number {
  let totalMeters = 0

  for (const activity of activities) {
    // Only count runs that are device-recorded (not manual)
    if (activity.type === 'Run' && activity.manual === false) {
      totalMeters += activity.distance || 0
    }
  }

  // Convert meters to miles (1 mile = 1609.34 meters)
  return totalMeters / 1609.34
}

// ============== FITBIT ==============

// Refresh Fitbit access token using stored refresh token
async function refreshFitbitToken(refreshToken: string) {
  const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID
  const clientSecret = process.env.FITBIT_CLIENT_SECRET
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error(`Fitbit token refresh failed: ${response.status}`)
  }

  return await response.json()
}

// Fetch activities from Fitbit
async function fetchFitbitActivities(accessToken: string, afterDate: string, beforeDate: string) {
  const url = new URL('https://api.fitbit.com/1/user/-/activities/list.json')
  url.searchParams.set('afterDate', afterDate)
  url.searchParams.set('beforeDate', beforeDate)
  url.searchParams.set('sort', 'desc')
  url.searchParams.set('limit', '100')
  url.searchParams.set('offset', '0')

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Fitbit API error: ${response.status}`)
  }

  return await response.json()
}

// Calculate total miles from Fitbit running activities (device-recorded only)
function calculateFitbitMiles(activitiesData: any): number {
  const activities = activitiesData.activities || []
  let totalKm = 0

  for (const activity of activities) {
    // Skip manual entries (anti-cheat)
    if (activity.logType === 'manual') continue

    const name = activity.activityName?.toLowerCase() || ''
    const isRunOrWalk = name.includes('run') || name.includes('walk') || name.includes('jog') ||
                        activity.activityTypeId === 90009 || // Run
                        activity.activityTypeId === 90013    // Walk

    if (isRunOrWalk) {
      let distance = activity.distance || 0
      // Convert to km if in miles
      if (activity.distanceUnit === 'Mile') {
        distance = distance * 1.60934
      }
      totalKm += distance
    }
  }

  // Convert km to miles
  return totalKm / 1.60934
}

// Main verification endpoint - called by Chainlink Functions
// Supports both Strava and Fitbit - uses whichever the user has connected
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('user')?.toLowerCase()
    const startTimestamp = searchParams.get('start')
    const endTimestamp = searchParams.get('end')

    // Validate parameters
    if (!walletAddress || !startTimestamp || !endTimestamp) {
      return NextResponse.json(
        { error: 'Missing required parameters: user, start, end' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabase()

    // Try Strava first
    const { data: stravaToken } = await supabase
      .from('strava_tokens')
      .select('refresh_token, athlete_id')
      .eq('wallet_address', walletAddress)
      .single()

    if (stravaToken) {
      // Use Strava for verification
      const stravaTokens = await refreshStravaToken(stravaToken.refresh_token)

      // Update refresh token in database (Strava rotates them)
      await supabase
        .from('strava_tokens')
        .update({
          refresh_token: stravaTokens.refresh_token,
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_address', walletAddress)

      // Fetch activities from Strava
      const activities = await fetchStravaActivities(
        stravaTokens.access_token,
        parseInt(startTimestamp),
        parseInt(endTimestamp)
      )

      // Calculate total miles
      const miles = calculateStravaMiles(activities)
      const milesWei = Math.floor(miles * 1e18).toString()

      return NextResponse.json({
        success: true,
        miles: miles,
        milesWei: milesWei,
        activitiesCount: activities.length,
        athleteId: stravaToken.athlete_id,
        source: 'strava',
      })
    }

    // Try Fitbit if no Strava token
    const { data: fitbitToken } = await supabase
      .from('fitbit_tokens')
      .select('refresh_token, user_id')
      .eq('wallet_address', walletAddress)
      .single()

    if (fitbitToken) {
      // Use Fitbit for verification
      const fitbitTokens = await refreshFitbitToken(fitbitToken.refresh_token)

      // Update refresh token in database
      await supabase
        .from('fitbit_tokens')
        .update({
          refresh_token: fitbitTokens.refresh_token,
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_address', walletAddress)

      // Convert timestamps to date strings for Fitbit API (YYYY-MM-DD)
      const afterDate = new Date(parseInt(startTimestamp) * 1000).toISOString().split('T')[0]
      const beforeDate = new Date(parseInt(endTimestamp) * 1000).toISOString().split('T')[0]

      // Fetch activities from Fitbit
      const activitiesData = await fetchFitbitActivities(
        fitbitTokens.access_token,
        afterDate,
        beforeDate
      )

      // Calculate total miles
      const miles = calculateFitbitMiles(activitiesData)
      const milesWei = Math.floor(miles * 1e18).toString()

      return NextResponse.json({
        success: true,
        miles: miles,
        milesWei: milesWei,
        activitiesCount: activitiesData.activities?.length || 0,
        userId: fitbitToken.user_id,
        source: 'fitbit',
      })
    }

    // No token found for either service
    return NextResponse.json(
      { error: 'No fitness tracker connected for this wallet' },
      { status: 404 }
    )

  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    )
  }
}
