import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, createUser, getEmbeddedWallet } from '@/lib/privy-server'
import * as jose from 'jose'

// Apple's public keys for JWT verification
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys'
const APPLE_ISSUER = 'https://appleid.apple.com'
const APPLE_BUNDLE_ID = 'app.rork.rorkvaada-github-build'

// Verify Apple identity token and return Privy user + wallet
export async function POST(request: NextRequest) {
  try {
    const { identityToken } = await request.json()

    if (!identityToken) {
      return NextResponse.json({ error: 'Missing identityToken' }, { status: 400 })
    }

    // 1. Verify Apple identity token
    const JWKS = jose.createRemoteJWKSet(new URL(APPLE_KEYS_URL))
    const { payload } = await jose.jwtVerify(identityToken, JWKS, {
      issuer: APPLE_ISSUER,
      audience: APPLE_BUNDLE_ID,
    })

    const email = payload.email as string
    if (!email) {
      return NextResponse.json({ error: 'No email in Apple token' }, { status: 400 })
    }

    // 2. Find or create Privy user
    let user = await findUserByEmail(email)
    if (!user) {
      user = await createUser(email)
    }

    // 3. Get embedded wallet address
    const walletAddress = getEmbeddedWallet(user)

    return NextResponse.json({
      success: true,
      userId: user.id,
      email,
      walletAddress,
    })
  } catch (error) {
    console.error('Apple auth error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    )
  }
}
