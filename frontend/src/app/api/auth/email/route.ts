import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, createUser, getEmbeddedWallet } from '@/lib/privy-server'

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cml5laaq800q3lk0cokl3jrm3'
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || ''

function privyHeaders() {
  const credentials = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64')
  return {
    'Authorization': `Basic ${credentials}`,
    'privy-app-id': PRIVY_APP_ID,
    'Content-Type': 'application/json',
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, email, code } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    // ===== SEND OTP =====
    if (action === 'send') {
      // Use Privy's OTP endpoint to send a login code
      const res = await fetch('https://auth.privy.io/api/v1/otp/send', {
        method: 'POST',
        headers: privyHeaders(),
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const body = await res.text()
        return NextResponse.json(
          { error: `Failed to send code: ${body}` },
          { status: res.status }
        )
      }

      return NextResponse.json({ success: true, message: 'Code sent' })
    }

    // ===== VERIFY OTP =====
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ error: 'Missing code' }, { status: 400 })
      }

      // Verify the OTP with Privy
      const res = await fetch('https://auth.privy.io/api/v1/otp/verify', {
        method: 'POST',
        headers: privyHeaders(),
        body: JSON.stringify({ email, code }),
      })

      if (!res.ok) {
        const body = await res.text()
        return NextResponse.json(
          { error: `Invalid code: ${body}` },
          { status: res.status }
        )
      }

      // OTP verified — find or create user
      let user = await findUserByEmail(email)
      if (!user) {
        user = await createUser(email)
      }

      const walletAddress = getEmbeddedWallet(user)

      return NextResponse.json({
        success: true,
        userId: user.id,
        email,
        walletAddress,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use "send" or "verify"' }, { status: 400 })
  } catch (error) {
    console.error('Email auth error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    )
  }
}
