import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nextRound } from '@/features/mole-hunt/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — advance to the next round (host only).
 * Body: { room_code: string }
 *
 * Creates the next round with new role assignments and the next topic.
 * Only callable from the reveal phase.
 *
 * Pusher: triggers round-started on room-{code}-game.
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
    const { room_code } = body as { room_code: string }

    if (!room_code) {
      return NextResponse.json(
        { error: 'room_code is required.' },
        { status: 400 },
      )
    }

    // Look up the room by code to get roomId + verify host
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, host_id')
      .eq('code', room_code)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can advance to the next round' },
        { status: 403 },
      )
    }

    const result = await nextRound(room.id, user.id)

    // Pusher: round-started (next round, phase: discuss)
    await triggerGameEvent(room_code, 'round-started', {
      roundNumber: result.round.round_number,
      roundId: result.round.id,
      phase: 'discuss',
      topicId: result.round.topic_id,
      discussTimerSeconds: result.round.discuss_timer_seconds,
      voteTimerSeconds: result.round.vote_timer_seconds,
    })

    return NextResponse.json({
      success: true,
      round: result.round,
    })
  } catch (error) {
    console.error('mole-hunt next-round error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to advance to next round'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
