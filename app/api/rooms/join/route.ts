import { NextRequest, NextResponse } from 'next/server'
import { joinRoom } from '@/features/rooms/actions'
import { triggerRoomEvent } from '@/lib/pusher/trigger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, nickname } = body

    if (!code || !nickname) {
      return NextResponse.json(
        { error: 'Both "code" and "nickname" are required.' },
        { status: 400 },
      )
    }

    if (typeof code !== 'string' || code.length !== 4) {
      return NextResponse.json(
        { error: '"code" must be a 4-character string.' },
        { status: 400 },
      )
    }

    if (typeof nickname !== 'string' || nickname.trim().length === 0) {
      return NextResponse.json(
        { error: '"nickname" must be a non-empty string.' },
        { status: 400 },
      )
    }

    const result = await joinRoom(code, nickname.trim())

    await triggerRoomEvent(code, 'player-joined', {
      player: result.player,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to join room'
    const status =
      message === 'Room not found'
        ? 404
        : message === 'Room is not accepting players'
          ? 409
          : 400

    return NextResponse.json({ error: message }, { status })
  }
}
