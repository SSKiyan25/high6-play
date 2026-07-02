import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startGame, seedCategoriesIfEmpty } from '@/features/word-chain/actions'
import { triggerGameEvent, triggerRoomEvent } from '@/lib/pusher/trigger'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * POST — start a This or That game (host only).
 * Body: { room_code: string }
 *
 * Validates config, creates first round with randomized turn order.
 * Pusher: triggers game-started on room-{code} and round-started on room-{code}-game.
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
    const { room_code } = body as { room_code: string }

    if (!room_code) {
      return NextResponse.json(
        { error: 'room_code is required.' },
        { status: 400 },
      )
    }

    // Look up the room by code to get roomId + verify host
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, host_id, status')
      .eq('code', room_code)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can start the game' },
        { status: 403 },
      )
    }

    if (room.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Room is not in waiting status' },
        { status: 400 },
      )
    }

    // Seed categories if bank is empty
    await seedCategoriesIfEmpty(supabase as unknown as SupabaseClient)

    // Start the game
    const result = await startGame(
      room.id,
      user.id,
      supabase as unknown as SupabaseClient,
    )

    // Update room status to active
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ status: 'active' })
      .eq('id', room.id)

    if (updateError) throw updateError

    // Pusher: game-started
    await triggerRoomEvent(room_code, 'game-started', {
      game_type: 'word-chain',
    })

    // Pusher: round-started
    await triggerGameEvent(room_code, 'round-started', {
      roundNumber: 1,
      roundId: result.round.id,
      categoryId: result.category.id,
      categoryName: result.category.name,
      difficulty: result.category.difficulty,
      points: result.category.points,
      turnOrder: result.turnOrder,
      currentPlayerId: result.turnOrder[0],
      currentPlayerNickname: result.currentPlayerNickname,
      timePerPlayerSeconds: result.timePerPlayerSeconds,
      totalRounds: result.totalRounds,
      bufferSeconds: 5,
    })

    return NextResponse.json({
      success: true,
      round: result.round,
      totalRounds: result.totalRounds,
    })
  } catch (error) {
    console.error('word-chain start error:', error)
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error — check server logs'
    const status = 400
    return NextResponse.json({ error: message }, { status })
  }
}
