import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { endGame } from '@/features/word-chain/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — end the game (host only).
 * Body: { room_code: string }
 *
 * Marks the room as ended.
 * Pusher: triggers game-ended on room-{code}-game.
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
        { error: 'Only the host can end the game' },
        { status: 403 },
      )
    }

    await endGame(room.id, user.id)

    // Pusher: game-ended
    await triggerGameEvent(room_code, 'game-ended', {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('word-chain end-game error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to end game'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
