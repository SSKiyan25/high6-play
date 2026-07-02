import { NextRequest, NextResponse } from 'next/server'
import { confirmTurn } from '@/features/word-chain/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — player confirms they answered and ends their own turn.
 * Body: { round_id, player_id, room_code }
 *
 * Validates it's the player's turn, advances to next active player.
 * Pusher: triggers turn-advanced on room-{code}-game.
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

    const result = await confirmTurn(round_id, player_id)

    await triggerGameEvent(room_code, 'turn-advanced', {
      roundId: round_id,
      previousPlayerId: result.previousPlayerId,
      previousPlayerNickname: result.previousPlayerNickname,
      currentPlayerId: result.currentPlayerId,
      currentPlayerNickname: result.currentPlayerNickname,
      activePlayerCount: result.activePlayerCount,
      reason: 'confirmed',
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to confirm turn'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
