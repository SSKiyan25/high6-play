import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { advanceTurn } from '@/features/word-chain/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * POST — host advances the turn (timeout elimination).
 * Body: { round_id, room_code }
 *
 * Eliminates the current player, checks if round should end.
 * Pusher: triggers player-eliminated + (turn-advanced | round-ended) on room-{code}-game.
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

    const result = await advanceTurn(round_id, user.id, supabase as unknown as SupabaseClient)

    // Pusher: player-eliminated
    if (result.eliminatedPlayerId) {
      await triggerGameEvent(room_code, 'player-eliminated', {
        roundId: round_id,
        playerId: result.eliminatedPlayerId,
        playerNickname: result.previousPlayerNickname,
        reason: 'timeout',
        activePlayerCount: result.activePlayerCount,
      })
    }

    // Pusher: round-ended or turn-advanced
    if (result.roundEnded) {
      await triggerGameEvent(room_code, 'round-ended', {
        roundId: round_id,
        survivors: result.survivors,
        pointsAwarded: result.pointsAwarded,
      })
    } else {
      await triggerGameEvent(room_code, 'turn-advanced', {
        roundId: round_id,
        previousPlayerId: result.previousPlayerId,
        previousPlayerNickname: result.previousPlayerNickname,
        currentPlayerId: result.currentPlayerId,
        currentPlayerNickname: result.currentPlayerNickname,
        activePlayerCount: result.activePlayerCount,
      })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to advance turn'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
