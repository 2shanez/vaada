import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client (uses service role key)
export function createServerSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Types for our database
export interface StravaToken {
  wallet_address: string
  athlete_id: number
  refresh_token: string
  created_at: string
  updated_at: string
}

export interface FitbitToken {
  wallet_address: string
  user_id: string
  refresh_token: string
  created_at: string
  updated_at: string
}
