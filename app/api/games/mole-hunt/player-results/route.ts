import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET — returns a player's personal results for Mole Hunt.
 * Query: ?player_id=<uuid>&room_code=<string>
 *
 * Returns only that player's own score data — never exposes other players' scores or roles.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('player_id')
    const roomCode = searchParams.get('room_code')

    if (!playerId || !roomCode) {
      return NextResponse.json(
        { error: 'player_id and room_code are required.' },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // Fetch room to get room_id
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', roomCode.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Fetch this player's score
    const { data: score, error: scoreError } = await supabase
      .from('mole_scores')
      .select('total_points, times_mole, times_canary, crew_deceived')
      .eq('room_id', room.id)
      .eq('player_id', playerId)
      .maybeSingle()

    if (scoreError) {
      return NextResponse.json(
        { error: 'Failed to fetch score' },
        { status: 500 },
      )
    }

    if (!score) {
      return NextResponse.json({
        total_points: 0,
        times_mole: 0,
        times_canary: 0,
        crew_deceived: 0,
        rank: 0,
        total_players: 0,
      })
    }

    // Determine rank — count how many players have higher total_points
    const { count: higherCount, error: rankError } = await supabase
      .from('mole_scores')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)
      .gt('total_points', score.total_points)

    if (rankError) {
      // Non-critical — continue without rank
    }

    // Total players with scores
    const { count: totalPlayers } = await supabase
      .from('mole_scores')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)

    return NextResponse.json({
      total_points: score.total_points ?? 0,
      times_mole: score.times_mole ?? 0,
      times_canary: score.times_canary ?? 0,
      crew_deceived: score.crew_deceived ?? 0,
      rank: (higherCount ?? 0) + 1,
      total_players: totalPlayers ?? 0,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch results'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
