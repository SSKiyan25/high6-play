import { NextRequest, NextResponse } from 'next/server'
import { advanceQuestion } from '@/features/this-or-that/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — advance to the next question in a This or That game.
 * Body: { room_code, next_index }
 *
 * Pusher: triggers question-advanced on room-{code}-game with { nextIndex }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_code, next_index } = body as {
      room_code: string
      next_index: number
    }

    if (!room_code || next_index === undefined || next_index === null) {
      return NextResponse.json(
        { error: 'room_code and next_index are required.' },
        { status: 400 },
      )
    }

    if (typeof next_index !== 'number' || next_index < 0) {
      return NextResponse.json(
        { error: 'next_index must be a non-negative number.' },
        { status: 400 },
      )
    }

    await advanceQuestion(room_code, next_index)

    await triggerGameEvent(room_code, 'question-advanced', { nextIndex: next_index })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to advance question'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
