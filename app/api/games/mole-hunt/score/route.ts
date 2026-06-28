import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAndSaveScores } from '@/features/mole-hunt/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — calculate + upsert scores after reveal (host only).
 * Body: { round_id, room_code }
 *
 * Returns per-player score summaries. No score data goes via Pusher.
 * Pusher: triggers scores-updated on room-{code}-game with { roundId }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { round_id, room_code } = body as {
      round_id: string
      room_code: string
    }

    if (!round_id || !room_code) {
      return NextResponse.json(
        { error: 'round_id and room_code are required.' },
        { status: 400 },
      )
    }

    // Verify the user is the host of the room this round belongs to
    const { data: round, error: roundError } = await supabase
      .from('mole_rounds')
      .select('room_id')
      .eq('id', round_id)
      .single()

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', round.room_id)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can calculate scores' },
        { status: 403 },
      )
    }

    const summaries = await calculateAndSaveScores(round_id)

    await triggerGameEvent(room_code, 'scores-updated', {
      roundId: round_id,
    })

    return NextResponse.json({ success: true, summaries })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to calculate scores'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
