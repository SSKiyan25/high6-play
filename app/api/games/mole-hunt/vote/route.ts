import { NextRequest, NextResponse } from 'next/server'
import { submitVote } from '@/features/mole-hunt/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'
import { createClient } from '@/lib/supabase/server'

/**
 * POST — submit a player's vote for the current round.
 * Body: { round_id, player_id, choice, room_code }
 *
 * Pusher: triggers vote-submitted on room-{code}-game with { roundId, votedCount, totalPlayers }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { round_id, player_id, choice, room_code } = body as {
      round_id: string
      player_id: string
      choice: 'a' | 'b'
      room_code: string
    }

    if (!round_id || !player_id || !choice || !room_code) {
      return NextResponse.json(
        { error: 'round_id, player_id, choice, and room_code are all required.' },
        { status: 400 },
      )
    }

    if (choice !== 'a' && choice !== 'b') {
      return NextResponse.json(
        { error: 'choice must be "a" or "b".' },
        { status: 400 },
      )
    }

    await submitVote(round_id, player_id, choice)

    // Count votes so far vs total players for Pusher
    const supabase = await createClient()

    const { count: votedCount, error: countError } = await supabase
      .from('mole_votes')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', round_id)

    if (countError) throw countError

    const { count: totalPlayers, error: playersError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', await getRoomIdFromRound(round_id))

    if (playersError) throw playersError

    await triggerGameEvent(room_code, 'vote-submitted', {
      roundId: round_id,
      votedCount: votedCount ?? 0,
      totalPlayers: totalPlayers ?? 0,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && (error as any).status === 409) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      )
    }
    const message =
      error instanceof Error ? error.message : 'Failed to submit vote'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

async function getRoomIdFromRound(roundId: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mole_rounds')
    .select('room_id')
    .eq('id', roundId)
    .single()

  if (error || !data) throw new Error('Round not found')
  return data.room_id
}
