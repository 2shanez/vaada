import { NextRequest, NextResponse } from 'next/server'

// RescueTime OAuth - they use API key based auth, not OAuth
// Users generate an API key from their RescueTime dashboard
// This endpoint validates the API key works

const RESCUETIME_API = 'https://www.rescuetime.com/anapi/data'

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    // Test the API key by fetching today's data
    const response = await fetch(
      `${RESCUETIME_API}?key=${apiKey}&format=json&perspective=interval&restrict_kind=productivity&interval=day&restrict_begin=${getToday()}&restrict_end=${getToday()}`,
      { headers: { 'User-Agent': 'Vaada/1.0' } }
    )

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      }
      throw new Error(`RescueTime API error: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({ 
      valid: true,
      message: 'API key validated successfully'
    })
  } catch (error) {
    console.error('RescueTime auth error:', error)
    return NextResponse.json(
      { error: 'Failed to validate API key' },
      { status: 500 }
    )
  }
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}
