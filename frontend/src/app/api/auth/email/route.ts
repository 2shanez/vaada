import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, createUser, getEmbeddedWallet } from '@/lib/privy-server'

// Email auth endpoint
// For MVP: find or create Privy user by email, return wallet
// TODO: Add proper email OTP verification before public launch
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    // Find or create Privy user
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
  } catch (error) {
    console.error('Email auth error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    )
  }
}
