import { NextRequest, NextResponse } from 'next/server'
import { skipTurn } from '@/features/word-chain/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — player skips their turn (once per round).
 * Body: { round_id, player_id, room_code }
 *
 * Validates skip not used, marks player skipped_this_cycle, pushes to end of order.
 * Pusher: triggers player-skipped + turn-advanced on room-{code}-game.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { round_id, player_id, room_code } = body as {
      round_id: string
      player_id: string
      room_code: string
    }

    if (!round_id || !player_id || !room_code) {
      return NextResponse.json(
        { error: 'round_id, player_id, and room_code are all required.' },
        { status: 400 },
      )
    }

    const result = await skipTurn(round_id, player_id)

    // Pusher: player-skipped
    await triggerGameEvent(room_code, 'player-skipped', {
      roundId: round_id,
      playerId: result.previousPlayerId,
      playerNickname: result.previousPlayerNickname,
    })

    // Pusher: turn-advanced
    await triggerGameEvent(room_code, 'turn-advanced', {
      roundId: round_id,
      previousPlayerId: result.previousPlayerId,
      previousPlayerNickname: result.previousPlayerNickname,
      currentPlayerId: result.currentPlayerId,
      currentPlayerNickname: result.currentPlayerNickname,
      activePlayerCount: result.activePlayerCount,
      reason: 'skipped',
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof Error && (error as any).status === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    const message =
      error instanceof Error ? error.message : 'Failed to skip turn'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
