import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { removePlayer } from '@/features/rooms/actions'
import { triggerRoomEvent } from '@/lib/pusher/trigger'

/**
 * POST — host removes a player from the room.
 * Body: { room_code: string, player_id: string }
 *
 * Pusher: triggers player-removed on room-{code}.
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
    const { room_code, player_id } = body as {
      room_code: string
      player_id: string
    }

    if (!room_code || !player_id) {
      return NextResponse.json(
        { error: 'room_code and player_id are required.' },
        { status: 400 },
      )
    }

    await removePlayer(room_code, player_id, user.id)

    await triggerRoomEvent(room_code, 'player-removed', { playerId: player_id })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to remove player'
    const status = message === 'Not authenticated' ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
