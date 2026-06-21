import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { eliminatePlayer } from '@/features/word-chain/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — eliminate a player from a Word Chain game.
 * Body: { roomId, playerId, reason }
 *
 * Pusher: triggers player-eliminated on room-{code}-game with { playerId, reason, remainingCount }
 * If only 1 player remains after elimination, also triggers game-ended with { winnerId }.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, playerId, reason } = body as {
      roomId: string
      playerId: string
      reason: 'timeout' | 'wrong-letter' | 'already-used'
    }

    if (!roomId || !playerId || !reason) {
      return NextResponse.json(
        { error: 'roomId, playerId, and reason are all required.' },
        { status: 400 },
      )
    }

    if (!['timeout', 'wrong-letter', 'already-used'].includes(reason)) {
      return NextResponse.json(
        { error: 'reason must be "timeout", "wrong-letter", or "already-used".' },
        { status: 400 },
      )
    }

    await eliminatePlayer(roomId, playerId)

    // Fetch room code and remaining active player count
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

    const { data: activePlayers, error: countError } = await supabase
      .from('wc_players')
      .select('player_id')
      .eq('room_id', roomId)
      .eq('is_eliminated', false)

    if (countError) throw countError

    const remainingCount = (activePlayers || []).length

    await triggerGameEvent(room.code, 'player-eliminated', {
      playerId,
      reason,
      remainingCount,
    })

    // If only 1 player remains, the game is over — that player wins
    if (remainingCount <= 1) {
      const winnerId =
        remainingCount === 1 ? activePlayers![0].player_id : null

      // Mark room as ended
      await supabase
        .from('rooms')
        .update({ status: 'ended' })
        .eq('id', roomId)

      await triggerGameEvent(room.code, 'game-ended', { winnerId })
    }

    return NextResponse.json({ success: true, remainingCount })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to eliminate player'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
