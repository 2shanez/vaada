// Strava OAuth utilities

const STRAVA_CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID

export function getStravaAuthUrl(redirectUri: string = 'http://localhost:3000/api/strava/callback') {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  })

  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}

export function getStravaAthleteId(): string | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const athleteCookie = cookies.find(c => c.trim().startsWith('strava_athlete_id='))
  if (!athleteCookie) return null
  
  return athleteCookie.split('=')[1]
}

export function isStravaConnected(): boolean {
  return getStravaAthleteId() !== null
}

export async function getStravaActivities(after?: number, before?: number) {
  const params = new URLSearchParams()
  if (after) params.set('after', after.toString())
  if (before) params.set('before', before.toString())

  const response = await fetch(`/api/strava/activities?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch activities')
  }

  return response.json()
}
