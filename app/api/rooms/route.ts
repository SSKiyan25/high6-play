import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRoom, getRoom } from '@/features/rooms/actions'
import type { GameType } from '@/features/rooms/types'
import type { TotQuestionInput } from '@/features/this-or-that/types'
import type { MoleRoomConfigInput } from '@/features/mole-hunt/types'

const VALID_GAME_TYPES = ['this-or-that', 'word-chain', 'mole-hunt']

export async function POST(request: NextRequest) {
  try {
    // Body: { game_type: GameType, questions?: TotQuestionInput[], config?: MoleRoomConfigInput }
    const body = await request.json()
    const game_type = body.game_type as string
    const questions = body.questions as TotQuestionInput[] | undefined
    const config = body.config as MoleRoomConfigInput | undefined

    if (!game_type || !VALID_GAME_TYPES.includes(game_type)) {
      return NextResponse.json(
        { error: `Invalid game_type. Must be one of: ${VALID_GAME_TYPES.join(', ')}.` },
        { status: 400 },
      )
    }

    // Validate that this-or-that games provide at least 2 questions
    if (game_type === 'this-or-that') {
      if (!questions || !Array.isArray(questions) || questions.length < 2) {
        return NextResponse.json(
          { error: 'At least 2 questions are required for This or That.' },
          { status: 400 },
        )
      }
    }

    const supabase = await createClient()
    const room = await createRoom(game_type as GameType, supabase, questions, config)
    return NextResponse.json({ room }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create room'
    const status = message === 'Not authenticated' ? 401 : 400

    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Query parameter "code" is required.' },
        { status: 400 },
      )
    }

    const room = await getRoom(code)
    return NextResponse.json({ room })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch room'
    const status = message === 'Room not found' ? 404 : 400

    return NextResponse.json({ error: message }, { status })
  }
}
