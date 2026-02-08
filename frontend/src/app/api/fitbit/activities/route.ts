import { NextRequest, NextResponse } from 'next/server'

// Helper to refresh token if expired
async function refreshTokenIfNeeded(request: NextRequest): Promise<{ accessToken: string; needsRefresh: boolean } | null> {
  const accessToken = request.cookies.get('fitbit_access_token')?.value
  const refreshToken = request.cookies.get('fitbit_refresh_token')?.value
  const expiresAt = request.cookies.get('fitbit_expires_at')?.value

  if (!accessToken || !refreshToken) {
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  const expiresAtNum = parseInt(expiresAt || '0', 10)

  // If token expires in less than 5 minutes, refresh it
  if (expiresAtNum - now < 300) {
    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID
    const clientSecret = process.env.FITBIT_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return null
    }

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
      console.error('Failed to refresh Fitbit token')
      return null
    }

    const tokenData = await refreshResponse.json()
    return { accessToken: tokenData.access_token, needsRefresh: true }
  }

  return { accessToken, needsRefresh: false }
}

export async function GET(request: NextRequest) {
  const tokenResult = await refreshTokenIfNeeded(request)

  if (!tokenResult) {
    return NextResponse.json({ error: 'Not authenticated with Fitbit' }, { status: 401 })
  }

  const { accessToken } = tokenResult
  const searchParams = request.nextUrl.searchParams
  
  // Get date range (default: last 7 days)
  const afterDate = searchParams.get('after') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const beforeDate = searchParams.get('before') || new Date().toISOString().split('T')[0]

  try {
    // Fetch activity logs for the date range
    // Fitbit API: GET /1/user/-/activities/list.json
    const activitiesUrl = new URL('https://api.fitbit.com/1/user/-/activities/list.json')
    activitiesUrl.searchParams.set('afterDate', afterDate)
    activitiesUrl.searchParams.set('beforeDate', beforeDate)
    activitiesUrl.searchParams.set('sort', 'desc')
    activitiesUrl.searchParams.set('limit', '100')
    activitiesUrl.searchParams.set('offset', '0')

    const activitiesResponse = await fetch(activitiesUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text()
      console.error('Fitbit activities fetch failed:', errorText)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    const activitiesData = await activitiesResponse.json()

    // Filter for running/walking activities and calculate total distance
    // Activity type IDs: 90009 = Run, 90013 = Walk, 90019 = Outdoor Bike
    const runningActivities = (activitiesData.activities || []).filter((activity: {
      activityName?: string
      activityTypeId?: number
    }) => {
      const name = activity.activityName?.toLowerCase() || ''
      return name.includes('run') || name.includes('walk') || name.includes('jog') ||
             activity.activityTypeId === 90009 || // Run
             activity.activityTypeId === 90013    // Walk
    })

    // Sum up distance (Fitbit returns distance in km or miles based on user settings)
    const totalDistanceKm = runningActivities.reduce((sum: number, activity: { distance?: number; distanceUnit?: string }) => {
      let distance = activity.distance || 0
      // Convert to km if in miles
      if (activity.distanceUnit === 'Mile') {
        distance = distance * 1.60934
      }
      return sum + distance
    }, 0)

    const totalDistanceMiles = totalDistanceKm / 1.60934

    return NextResponse.json({
      activities: runningActivities.map((a: {
        logId: number
        activityName: string
        distance?: number
        duration?: number
        startTime?: string
        calories?: number
      }) => ({
        id: a.logId,
        name: a.activityName,
        distance: a.distance,
        duration: a.duration,
        startTime: a.startTime,
        calories: a.calories,
      })),
      summary: {
        totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
        totalDistanceMiles: Math.round(totalDistanceMiles * 100) / 100,
        activityCount: runningActivities.length,
        dateRange: { after: afterDate, before: beforeDate },
      },
    })
  } catch (error) {
    console.error('Fitbit API error:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}
