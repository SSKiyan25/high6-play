import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { triggerRoomEvent } from '@/lib/pusher/trigger'

/**
 * POST — start a game (host only).
 * Body: { code: string }
 *
 * Updates room status to 'active' and triggers game-started on room-{code}.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body as { code: string }

    if (!code) {
      return NextResponse.json(
        { error: 'Room code is required.' },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // Verify the user is the host
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 },
      )
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select()
      .eq('code', code)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 },
      )
    }

    if (room.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can start the game' },
        { status: 403 },
      )
    }

    if (room.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Room is not in waiting status' },
        { status: 400 },
      )
    }

    const { error: updateError } = await supabase
      .from('rooms')
      .update({ status: 'active' })
      .eq('code', code)

    if (updateError) throw updateError

    await triggerRoomEvent(code, 'game-started', {
      game_type: room.game_type,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to start game'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
