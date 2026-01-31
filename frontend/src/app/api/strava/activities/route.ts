import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('strava_access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Strava' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const after = searchParams.get('after') // Unix timestamp
  const before = searchParams.get('before') // Unix timestamp

  try {
    const url = new URL('https://www.strava.com/api/v3/athlete/activities')
    if (after) url.searchParams.set('after', after)
    if (before) url.searchParams.set('before', before)
    url.searchParams.set('per_page', '200')

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired - would need to refresh
        return NextResponse.json({ error: 'Token expired' }, { status: 401 })
      }
      throw new Error('Failed to fetch activities')
    }

    const activities = await response.json()

    // Filter for runs and calculate total miles
    const runs = activities.filter((a: any) => a.type === 'Run')
    const totalMeters = runs.reduce((sum: number, a: any) => sum + a.distance, 0)
    const totalMiles = totalMeters / 1609.34

    return NextResponse.json({
      activities: runs.map((a: any) => ({
        id: a.id,
        name: a.name,
        distance: a.distance,
        distanceMiles: a.distance / 1609.34,
        startDate: a.start_date,
        movingTime: a.moving_time,
      })),
      totalMiles: Math.round(totalMiles * 100) / 100,
      runCount: runs.length,
    })
  } catch (error) {
    console.error('Strava activities error:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}
