import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MoleRound, MoleTopic, MoleRole } from '@/features/mole-hunt/types'

/**
 * GET — returns the full role breakdown for the current round.
 * THE ONLY endpoint that exposes mole_player_ids and canary_player_ids.
 * Auth-gated: host session required. Returns 403 for players or unauthenticated.
 *
 * Query: ?roundId=<uuid>
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roundId = searchParams.get('roundId')

    if (!roundId) {
      return NextResponse.json(
        { error: 'roundId query parameter is required.' },
        { status: 400 },
      )
    }

    // Fetch the round
    const { data: round, error: roundError } = await supabase
      .from('mole_rounds')
      .select()
      .eq('id', roundId)
      .single()

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Verify host owns this room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', round.room_id)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can access control data' },
        { status: 403 },
      )
    }

    // Fetch the topic
    const { data: topic, error: topicError } = await supabase
      .from('mole_topics')
      .select()
      .eq('id', round.topic_id)
      .single()

    if (topicError) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    // Fetch all players in the room (exclude host)
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, nickname')
      .eq('room_id', round.room_id)
      .neq('is_host', true)

    if (playersError) {
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 },
      )
    }

    // Determine role for each player
    const moleIds: string[] = round.mole_player_ids ?? []
    const canaryIds: string[] = round.canary_player_ids ?? []

    const playersWithRoles = (players ?? []).map((p) => {
      let role: MoleRole = 'crew'
      if (moleIds.includes(p.id)) role = 'mole'
      else if (canaryIds.includes(p.id)) role = 'canary'
      return { id: p.id, nickname: p.nickname, role }
    })

    // Fetch vote progress
    const { count: votedCount, error: voteCountError } = await supabase
      .from('mole_votes')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', roundId)

    if (voteCountError) {
      // Non-critical — continue with 0
    }

    const totalPlayers = (players ?? []).length

    return NextResponse.json({
      round: round as MoleRound,
      topic: topic as MoleTopic,
      players: playersWithRoles,
      voteProgress: {
        votedCount: votedCount ?? 0,
        totalPlayers,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch control data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
