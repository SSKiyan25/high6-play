import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { advancePhase, calculateAndSaveScores } from '@/features/mole-hunt/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — advance the phase of a Mole Hunt round (host only).
 * Body: { round_id: string, room_code: string }
 *
 * Transitions: assigning → discuss → vote → reveal
 * After reveal: auto-creates next round (or ends game if final round).
 *
 * Pusher: triggers phase-advanced on room-{code}-game.
 *         On reveal: triggers scores-updated and (if end) game-ended.
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

    const result = await advancePhase(round_id, user.id)

    // Pusher: phase-advanced
    await triggerGameEvent(room_code, 'phase-advanced', {
      roundId: round_id,
      phase: result.phase,
    })

    // On reveal: calculate scores + fire scores-updated
    if (result.phase === 'reveal') {
      await calculateAndSaveScores(round_id)

      await triggerGameEvent(room_code, 'scores-updated', {
        roundId: round_id,
      })

      // If this was the final round, trigger game-ended
      if (!result.nextRound) {
        await triggerGameEvent(room_code, 'game-ended', {
          winnerId: null, // Mole Hunt has no single winner — leaderboard
        })
      }
    }

    // If there's a next round, fire round-started
    if (result.nextRound) {
      await triggerGameEvent(room_code, 'round-started', {
        roundNumber: result.nextRound.roundNumber,
        roundId: result.nextRound.id,
        phase: 'discuss',
        topicId: result.nextRound.topicId,
      })
    }

    return NextResponse.json({
      success: true,
      phase: result.phase,
      roundNumber: result.roundNumber,
      nextRound: result.nextRound,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to advance phase'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
