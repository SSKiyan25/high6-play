import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { endWcGame } from '@/features/word-chain/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — end a Word Chain game.
 * Body: { roomId }
 *
 * Sets room status to ended and triggers game-ended on room-{code}-game
 * with { winnerId }, where winnerId is the last non-eliminated player (or null).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId } = body as { roomId: string }

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId is required.' },
        { status: 400 },
      )
    }

    // Fetch room code before ending (need it for Pusher)
    const supabase = await createClient()
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('code')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found.' },
        { status: 404 },
      )
    }

    // Mark room as ended in Supabase
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ status: 'ended' })
      .eq('id', roomId)

    if (updateError) throw updateError

    // Determine winner (last non-eliminated player)
    const winnerId = await endWcGame(roomId)

    await triggerGameEvent(room.code, 'game-ended', { winnerId })

    return NextResponse.json({ success: true, winnerId })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to end game'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
