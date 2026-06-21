import { NextRequest, NextResponse } from 'next/server'
import { submitVote, getQuestionResults } from '@/features/this-or-that/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'
import type { Choice } from '@/features/this-or-that/types'

/**
 * POST — submit a vote for a This or That question.
 * Body: { question_id, player_id, choice, room_code }
 *
 * Pusher: triggers vote-submitted on room-{code}-game with { results }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question_id, player_id, choice, room_code } = body as {
      question_id: string
      player_id: string
      choice: Choice
      room_code: string
    }

    if (!question_id || !player_id || !choice || !room_code) {
      return NextResponse.json(
        { error: 'question_id, player_id, choice, and room_code are all required.' },
        { status: 400 },
      )
    }

    if (choice !== 'a' && choice !== 'b') {
      return NextResponse.json(
        { error: 'choice must be "a" or "b".' },
        { status: 400 },
      )
    }

    await submitVote(question_id, player_id, choice)

    const results = await getQuestionResults(question_id)

    await triggerGameEvent(room_code, 'vote-submitted', { results })

    return NextResponse.json({ success: true, results })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to submit vote'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
