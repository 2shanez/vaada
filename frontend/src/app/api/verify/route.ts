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

// Fetch activities from Fitbit (for miles-based goals)
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

// Fetch daily activity summary from Fitbit (for steps-based goals)
async function fetchFitbitDailySummary(accessToken: string, date: string) {
  // date format: YYYY-MM-DD
  const url = `https://api.fitbit.com/1/user/-/activities/date/${date}.json`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Fitbit daily summary API error: ${response.status}`)
  }

  return await response.json()
}

// Fetch steps for a date range from Fitbit using daily summaries
async function fetchFitbitStepsRange(accessToken: string, startDate: string, endDate: string) {
  // Generate array of dates between start and end (inclusive)
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0])
  }
  
  // Fetch daily summary for each date
  const summaries = await Promise.all(
    dates.map(async (date) => {
      try {
        const url = `https://api.fitbit.com/1/user/-/activities/date/${date}.json`
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!response.ok) {
          console.warn(`Fitbit daily summary failed for ${date}: ${response.status}`)
          return { date, steps: 0 }
        }
        const data = await response.json()
        return { date, steps: data.summary?.steps || 0 }
      } catch (error) {
        console.warn(`Fitbit fetch error for ${date}:`, error)
        return { date, steps: 0 }
      }
    })
  )
  
  return { summaries }
}

// Calculate total steps from Fitbit daily summaries
function calculateFitbitSteps(stepsData: any): number {
  const summaries = stepsData.summaries || []
  let totalSteps = 0

  for (const day of summaries) {
    totalSteps += day.steps || 0
  }

  return totalSteps
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
// Auto-detects goal type based on connected tracker:
// - Strava connected → miles (running distance)
// - Fitbit only → steps (daily step count)
// Optional: pass type=miles or type=steps to override
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('user')?.toLowerCase()
    const startTimestamp = searchParams.get('start')
    const endTimestamp = searchParams.get('end')
    const explicitType = searchParams.get('type') // optional override

    // Validate parameters
    if (!walletAddress || !startTimestamp || !endTimestamp) {
      return NextResponse.json(
        { error: 'Missing required parameters: user, start, end' },
        { status: 400 }
      )
    }

    // If goal hasn't started yet, return 0 progress
    const nowSeconds = Math.floor(Date.now() / 1000)
    const startSeconds = parseInt(startTimestamp)
    if (startSeconds > nowSeconds) {
      return NextResponse.json({
        success: true,
        steps: 0,
        stepsWei: '0',
        miles: 0,
        milesWei: '0',
        message: 'Goal has not started yet',
        startsIn: startSeconds - nowSeconds,
      })
    }

    const supabase = createServerSupabase()

    // Convert timestamps to date strings for Fitbit API (YYYY-MM-DD)
    // Fitbit uses user's local timezone for dates, but contract stores UTC timestamps.
    // We only expand the end date slightly to handle timezone differences.
    // Start date uses exact UTC date to avoid counting previous day's steps.
    const startMs = parseInt(startTimestamp) * 1000
    const endMs = parseInt(endTimestamp) * 1000
    const startDate = new Date(startMs).toISOString().split('T')[0]
    const endDate = new Date(endMs).toISOString().split('T')[0]

    // Check which trackers are connected
    const { data: stravaToken } = await supabase
      .from('strava_tokens')
      .select('refresh_token, athlete_id')
      .eq('wallet_address', walletAddress)
      .single()

    const { data: fitbitToken } = await supabase
      .from('fitbit_tokens')
      .select('refresh_token, user_id')
      .eq('wallet_address', walletAddress)
      .single()

    // Determine goal type:
    // 1. Explicit type parameter takes priority
    // 2. If only Fitbit connected → steps
    // 3. If Strava connected (even with Fitbit) → miles
    let goalType: 'miles' | 'steps'
    if (explicitType === 'steps' || explicitType === 'miles') {
      goalType = explicitType
    } else if (fitbitToken && !stravaToken) {
      goalType = 'steps' // Fitbit-only users get steps
    } else {
      goalType = 'miles' // Strava users (or both) get miles
    }

    // ============== STEPS-BASED GOALS (Fitbit) ==============
    if (goalType === 'steps') {
      if (!fitbitToken) {
        return NextResponse.json(
          { error: 'No Fitbit connected for steps goal. Please connect Fitbit.' },
          { status: 404 }
        )
      }

      // Refresh Fitbit token
      const fitbitTokens = await refreshFitbitToken(fitbitToken.refresh_token)

      // Update refresh token in database
      await supabase
        .from('fitbit_tokens')
        .update({
          refresh_token: fitbitTokens.refresh_token,
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_address', walletAddress)

      // Fetch steps from Fitbit time series
      const stepsData = await fetchFitbitStepsRange(
        fitbitTokens.access_token,
        startDate,
        endDate
      )

      // Calculate total steps
      const steps = calculateFitbitSteps(stepsData)
      // WARNING: stepsWei is scaled by 1e18 for legacy Chainlink compat.
      // When calling verifyParticipant(), pass raw `steps` count, NOT stepsWei.
      const stepsWei = (BigInt(steps) * BigInt(1e18)).toString()

      return NextResponse.json({
        success: true,
        steps: steps,
        stepsWei: stepsWei,
        // value/valueWei for generic contract compatibility
        value: steps,
        valueWei: stepsWei,
        daysCount: stepsData.summaries?.length || 0,
        userId: fitbitToken.user_id,
        source: 'fitbit',
        type: 'steps',
      })
    }

    // ============== MILES-BASED GOALS (Strava preferred) ==============
    
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
        type: 'miles',
      })
    }

    // Fallback to Fitbit for miles if no Strava
    if (fitbitToken) {
      // Use Fitbit for miles verification
      const fitbitTokens = await refreshFitbitToken(fitbitToken.refresh_token)

      // Update refresh token in database
      await supabase
        .from('fitbit_tokens')
        .update({
          refresh_token: fitbitTokens.refresh_token,
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_address', walletAddress)

      // Fetch activities from Fitbit
      const activitiesData = await fetchFitbitActivities(
        fitbitTokens.access_token,
        startDate,
        endDate
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
        type: 'miles',
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
