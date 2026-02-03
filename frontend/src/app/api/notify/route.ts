import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'notify-subscribers.json')

interface Subscriber {
  email: string
  feature: string
  subscribedAt: string
}

async function getSubscribers(): Promise<Subscriber[]> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveSubscribers(subscribers: Subscriber[]) {
  const dir = path.dirname(DATA_FILE)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(subscribers, null, 2))
}

export async function POST(req: NextRequest) {
  try {
    const { email, feature } = await req.json()

    if (!email || !feature) {
      return NextResponse.json({ error: 'Email and feature required' }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const subscribers = await getSubscribers()
    
    // Check if already subscribed to this feature
    const existing = subscribers.find(s => s.email === email && s.feature === feature)
    if (existing) {
      return NextResponse.json({ message: 'Already subscribed' })
    }

    subscribers.push({
      email,
      feature,
      subscribedAt: new Date().toISOString(),
    })

    await saveSubscribers(subscribers)

    return NextResponse.json({ message: 'Subscribed successfully' })
  } catch (error) {
    console.error('Notify API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  // Protected endpoint - could add auth later
  const subscribers = await getSubscribers()
  return NextResponse.json({ count: subscribers.length, subscribers })
}
