import { NextRequest, NextResponse } from 'next/server'

// Verification endpoint for Chainlink Functions
// Returns running distance for a given date range
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const accessToken = searchParams.get('token')
  const afterDate = searchParams.get('after')
  const beforeDate = searchParams.get('before')
  const targetMiles = searchParams.get('target') // Target distance in miles

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  if (!afterDate || !beforeDate) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 })
  }

  try {
    // Fetch activities from Fitbit
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
      console.error('Fitbit API error:', errorText)
      return NextResponse.json({ error: 'Fitbit API error' }, { status: 500 })
    }

    const activitiesData = await activitiesResponse.json()

    // Filter for running/walking activities
    // Only count activities that are device-recorded (not manual entries)
    const runningActivities = (activitiesData.activities || []).filter((activity: {
      activityName?: string
      activityTypeId?: number
      logType?: string
    }) => {
      // Skip manual entries (anti-cheat)
      if (activity.logType === 'manual') {
        return false
      }

      const name = activity.activityName?.toLowerCase() || ''
      return name.includes('run') || name.includes('walk') || name.includes('jog') ||
             activity.activityTypeId === 90009 || // Run
             activity.activityTypeId === 90013    // Walk
    })

    // Calculate total distance in miles
    const totalDistanceKm = runningActivities.reduce((sum: number, activity: { 
      distance?: number
      distanceUnit?: string 
    }) => {
      let distance = activity.distance || 0
      // Convert to km if in miles (Fitbit can return either based on user settings)
      if (activity.distanceUnit === 'Mile') {
        distance = distance * 1.60934
      }
      return sum + distance
    }, 0)

    const totalDistanceMiles = totalDistanceKm / 1.60934
    
    // Convert to micromiles (6 decimal places) for on-chain precision
    const distanceMicromiles = Math.floor(totalDistanceMiles * 1_000_000)

    // Determine if goal is met
    const targetMilesNum = parseFloat(targetMiles || '0')
    const success = totalDistanceMiles >= targetMilesNum

    return NextResponse.json({
      success,
      distanceMiles: Math.round(totalDistanceMiles * 100) / 100,
      distanceMicromiles,
      targetMiles: targetMilesNum,
      activityCount: runningActivities.length,
      activities: runningActivities.map((a: {
        logId: number
        activityName: string
        distance?: number
        startTime?: string
        logType?: string
      }) => ({
        id: a.logId,
        name: a.activityName,
        distance: a.distance,
        startTime: a.startTime,
        manual: a.logType === 'manual',
      })),
      dateRange: { after: afterDate, before: beforeDate },
      source: 'fitbit',
    })
  } catch (error) {
    console.error('Fitbit verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
