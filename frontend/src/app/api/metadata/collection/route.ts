import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'Vaada Receipts',
    description: 'Onchain proof of promises kept and broken. Stake your word on vaada.io.',
    image: 'https://vaada.io/icon-512.png',
    external_link: 'https://vaada.io',
  })
}
