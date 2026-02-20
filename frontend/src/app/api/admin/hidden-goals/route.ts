import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

// We'll use the strava_tokens table pattern — but need our own table.
// Fallback: store in a simple key-value approach using an existing table or edge config.
// For now, use a Supabase table `hidden_goals` — create it via Supabase dashboard SQL:
// CREATE TABLE hidden_goals (goal_id INTEGER PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW());

// GET: return list of hidden goal IDs
export async function GET() {
  try {
    const supabase = createServerSupabase()
    const { data, error } = await supabase
      .from('hidden_goals')
      .select('goal_id')

    if (error) {
      // Table might not exist yet — return empty
      console.error('hidden_goals fetch error:', error)
      return NextResponse.json({ hiddenIds: [] })
    }

    return NextResponse.json({ hiddenIds: (data || []).map((r: any) => r.goal_id) })
  } catch (err: any) {
    console.error('hidden_goals error:', err)
    return NextResponse.json({ hiddenIds: [] })
  }
}

// POST: hide a goal
export async function POST(req: NextRequest) {
  try {
    const { goalId } = await req.json()
    if (goalId === undefined) return NextResponse.json({ error: 'goalId required' }, { status: 400 })

    const supabase = createServerSupabase()
    const { error } = await supabase
      .from('hidden_goals')
      .upsert({ goal_id: goalId }, { onConflict: 'goal_id' })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: unhide a goal
export async function DELETE(req: NextRequest) {
  try {
    const { goalId } = await req.json()
    if (goalId === undefined) return NextResponse.json({ error: 'goalId required' }, { status: 400 })

    const supabase = createServerSupabase()
    const { error } = await supabase
      .from('hidden_goals')
      .delete()
      .eq('goal_id', goalId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
