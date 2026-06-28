import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deductCanaryPoints } from '@/features/mole-hunt/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — host deducts −50 pts from a silent Canary (host only).
 * Body: { room_id, player_id, room_code }
 *
 * Pusher: triggers scores-updated on room-{code}-game with { roundId: null }
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
    const { room_id, player_id, room_code } = body as {
      room_id: string
      player_id: string
      room_code: string
    }

    if (!room_id || !player_id || !room_code) {
      return NextResponse.json(
        { error: 'room_id, player_id, and room_code are required.' },
        { status: 400 },
      )
    }

    // Verify host
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', room_id)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can deduct canary points' },
        { status: 403 },
      )
    }

    const result = await deductCanaryPoints(room_id, player_id)

    await triggerGameEvent(room_code, 'scores-updated', {
      roundId: null, // manual deduction, not tied to a specific round
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to deduct points'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
