// Server-side Privy API helper
// Used by iOS auth + transaction endpoints

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cml5laaq800q3lk0cokl3jrm3'
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || ''

function getAuthHeader() {
  const credentials = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64')
  return `Basic ${credentials}`
}

function headers() {
  return {
    'Authorization': getAuthHeader(),
    'privy-app-id': PRIVY_APP_ID,
    'Content-Type': 'application/json',
  }
}

// Find a user by email address
export async function findUserByEmail(email: string) {
  const res = await fetch(`https://auth.privy.io/api/v1/users/email/${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: headers(),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Privy findUserByEmail failed: ${res.status}`)
  return res.json()
}

// Create a new user with an email + pre-generate an embedded wallet
export async function createUser(email: string) {
  const res = await fetch('https://auth.privy.io/api/v1/users', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      linked_accounts: [{ type: 'email', address: email }],
      create_ethereum_wallet: true,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Privy createUser failed: ${res.status} ${body}`)
  }
  return res.json()
}

// Get user by Privy user ID
export async function getUser(userId: string) {
  const res = await fetch(`https://auth.privy.io/api/v1/users/${userId}`, {
    method: 'GET',
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Privy getUser failed: ${res.status}`)
  return res.json()
}

// Extract embedded wallet address from a Privy user object
export function getEmbeddedWallet(user: any): string | null {
  const wallets = user.linked_accounts?.filter(
    (a: any) => a.type === 'wallet' && a.wallet_client_type === 'privy'
  ) || []
  return wallets[0]?.address || null
}

// Send a transaction from a user's embedded wallet
export async function sendTransaction(walletId: string, params: {
  to: string
  data?: string
  value?: string
  chainId?: number
}) {
  const caip2 = `eip155:${params.chainId || 8453}` // Default to Base
  
  const res = await fetch(`https://api.privy.io/v1/wallets/${walletId}/rpc`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      method: 'eth_sendTransaction',
      caip2,
      params: {
        transaction: {
          to: params.to,
          data: params.data,
          value: params.value || '0x0',
        },
      },
    }),
  })
  
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Privy sendTransaction failed: ${res.status} ${body}`)
  }
  return res.json()
}

// Get all wallets for a user (to find wallet_id for RPC calls)
export async function getUserWallets(userId: string) {
  const user = await getUser(userId)
  const wallets = user.linked_accounts?.filter(
    (a: any) => a.type === 'wallet' && a.wallet_client_type === 'privy'
  ) || []
  return wallets
}
