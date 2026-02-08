import { NextRequest, NextResponse } from 'next/server'

// RescueTime Verification for Chainlink Functions
// Checks if user stayed under target screen time for all days

const RESCUETIME_API = 'https://www.rescuetime.com/anapi/daily_summary_feed'

export async function GET(request: NextRequest) {
  const apiKey = request.nextUrl.searchParams.get('key')
  const startDate = request.nextUrl.searchParams.get('start')
  const endDate = request.nextUrl.searchParams.get('end')
  const targetHours = parseFloat(request.nextUrl.searchParams.get('target') || '4')
  
  if (!apiKey || !startDate || !endDate) {
    return NextResponse.json({ 
      error: 'Missing parameters: key, start, end required' 
    }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${RESCUETIME_API}?key=${apiKey}&format=json&restrict_begin=${startDate}&restrict_end=${endDate}`,
      { headers: { 'User-Agent': 'Vaada/1.0' } }
    )

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'API error' 
      }, { status: response.status })
    }

    const data = await response.json()
    
    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No data for period',
        daysTracked: 0 
      })
    }

    // Check each day
    let allDaysUnderTarget = true
    let totalDays = 0
    let successDays = 0
    const dailyResults: { date: string; hours: number; passed: boolean }[] = []

    for (const day of data) {
      const hours = day.total_hours || 0
      const passed = hours <= targetHours
      
      dailyResults.push({
        date: day.date,
        hours: Math.round(hours * 100) / 100,
        passed
      })

      totalDays++
      if (passed) successDays++
      if (!passed) allDaysUnderTarget = false
    }

    return NextResponse.json({
      success: allDaysUnderTarget,
      targetHours,
      totalDays,
      successDays,
      dailyResults,
      // For Chainlink: 1 = success, 0 = fail
      result: allDaysUnderTarget ? 1 : 0
    })
  } catch (error) {
    console.error('RescueTime verify error:', error)
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    )
  }
}
