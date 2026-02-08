import { NextRequest, NextResponse } from 'next/server'

// RescueTime Daily Summary API
// Returns total screen time per day for a date range

const RESCUETIME_API = 'https://www.rescuetime.com/anapi/daily_summary_feed'

interface DailySummary {
  date: string
  totalHours: number
  productivityPulse: number
  veryProductiveHours: number
  productiveHours: number
  neutralHours: number
  distractingHours: number
  veryDistractingHours: number
}

export async function GET(request: NextRequest) {
  const apiKey = request.nextUrl.searchParams.get('key')
  const startDate = request.nextUrl.searchParams.get('start')
  const endDate = request.nextUrl.searchParams.get('end')
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key required' }, { status: 400 })
  }

  try {
    // Build URL with optional date range
    let url = `${RESCUETIME_API}?key=${apiKey}&format=json`
    if (startDate) url += `&restrict_begin=${startDate}`
    if (endDate) url += `&restrict_end=${endDate}`

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Vaada/1.0' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      }
      throw new Error(`RescueTime API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Transform to our format
    const summaries: DailySummary[] = data.map((day: any) => ({
      date: day.date,
      totalHours: day.total_hours || 0,
      productivityPulse: day.productivity_pulse || 0,
      veryProductiveHours: day.very_productive_hours || 0,
      productiveHours: day.productive_hours || 0,
      neutralHours: day.neutral_hours || 0,
      distractingHours: day.distracting_hours || 0,
      veryDistractingHours: day.very_distracting_hours || 0,
    }))

    return NextResponse.json({ summaries })
  } catch (error) {
    console.error('RescueTime summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch RescueTime data' },
      { status: 500 }
    )
  }
}
