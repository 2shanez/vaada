import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

// GET - Fetch profile(s) by wallet address(es)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')?.toLowerCase()
    const wallets = searchParams.get('wallets') // comma-separated for bulk lookup
    
    const supabase = createServerSupabase()
    
    if (wallets) {
      // Bulk lookup
      const addresses = wallets.split(',').map(w => w.toLowerCase())
      const { data, error } = await supabase
        .from('user_profiles')
        .select('wallet_address, display_name')
        .in('wallet_address', addresses)
      
      if (error) throw error
      
      // Return as a map for easy lookup
      const profileMap: Record<string, string> = {}
      data?.forEach(p => {
        profileMap[p.wallet_address] = p.display_name
      })
      
      return NextResponse.json({ success: true, profiles: profileMap })
    }
    
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('wallet_address', wallet)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
    
    return NextResponse.json({ 
      success: true, 
      displayName: data?.display_name || null 
    })
    
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

// POST - Set profile name
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const wallet = body.wallet?.toLowerCase()
    const displayName = body.displayName?.trim()
    
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })
    }
    
    if (!displayName || displayName.length < 2 || displayName.length > 20) {
      return NextResponse.json({ error: 'Name must be 2-20 characters' }, { status: 400 })
    }
    
    // Basic sanitization - alphanumeric, spaces, underscores, hyphens only
    if (!/^[a-zA-Z0-9_\- ]+$/.test(displayName)) {
      return NextResponse.json({ error: 'Name can only contain letters, numbers, spaces, underscores, hyphens' }, { status: 400 })
    }
    
    const supabase = createServerSupabase()
    
    // Upsert profile
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        wallet_address: wallet,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'wallet_address',
      })
    
    if (error) throw error
    
    return NextResponse.json({ success: true, displayName })
    
  } catch (error) {
    console.error('Profile save error:', error)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
