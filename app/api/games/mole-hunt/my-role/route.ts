import { NextRequest, NextResponse } from 'next/server'
import { getMyRole } from '@/features/mole-hunt/actions'

/**
 * GET — return the calling player's role + topic for the current round.
 * Query params: round_id, player_id
 *
 * Never exposes mole_player_ids or canary_player_ids arrays.
 * Only the Mole gets correct_choice in the response.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roundId = searchParams.get('round_id')
    const playerId = searchParams.get('player_id')

    if (!roundId || !playerId) {
      return NextResponse.json(
        { error: 'round_id and player_id query params are required.' },
        { status: 400 },
      )
    }

    const roleData = await getMyRole(roundId, playerId)

    return NextResponse.json(roleData)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to get role'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
