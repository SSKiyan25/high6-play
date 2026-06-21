import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitWord } from '@/features/word-chain/actions'
import { triggerGameEvent } from '@/lib/pusher/trigger'

/**
 * POST — submit a word in a Word Chain game.
 * Body: { roomId, playerId, word, turnOrder }
 *
 * Pusher: triggers word-submitted on room-{code}-game with { word, playerId, nextPlayerIndex }
 * If invalid, returns { valid: false, reason } without triggering Pusher.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, playerId, word, turnOrder } = body as {
      roomId: string
      playerId: string
      word: string
      turnOrder: number
    }

    if (!roomId || !playerId || !word || turnOrder === undefined) {
      return NextResponse.json(
        { error: 'roomId, playerId, word, and turnOrder are all required.' },
        { status: 400 },
      )
    }

    if (typeof word !== 'string' || word.trim().length === 0) {
      return NextResponse.json(
        { error: 'word must be a non-empty string.' },
        { status: 400 },
      )
    }

    const result = await submitWord(roomId, playerId, word.trim(), turnOrder)

    if (!result.valid) {
      return NextResponse.json(result)
    }

    // Fetch room code to build Pusher channel name
    const supabase = await createClient()
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('code')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found.' },
        { status: 404 },
      )
    }

    // Count existing words to determine next player index
    const { count, error: countError } = await supabase
      .from('wc_words')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)

    if (countError) throw countError

    // Count active (non-eliminated) players
    const { count: activeCount, error: activeError } = await supabase
      .from('wc_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('is_eliminated', false)

    if (activeError) throw activeError

    const nextPlayerIndex =
      activeCount && activeCount > 0 ? (count ?? 0) % activeCount : 0

    await triggerGameEvent(room.code, 'word-submitted', {
      word: word.trim(),
      playerId,
      nextPlayerIndex,
    })

    return NextResponse.json({ valid: true, nextPlayerIndex })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to submit word'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
