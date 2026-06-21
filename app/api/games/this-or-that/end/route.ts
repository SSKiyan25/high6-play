import { NextRequest, NextResponse } from 'next/server'
import { endGame } from '@/features/this-or-that/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — end a This or That game.
 * Body: { room_code }
 *
 * Pusher: triggers game-ended on room-{code}-game with {}
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_code } = body as { room_code: string }

    if (!room_code) {
      return NextResponse.json(
        { error: 'room_code is required.' },
        { status: 400 },
      )
    }

    await endGame(room_code)

    await triggerGameEvent(room_code, 'game-ended', {})

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to end game'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
