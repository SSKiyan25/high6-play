import { NextRequest, NextResponse } from 'next/server'
import { closeRoom } from '@/features/rooms/actions'
import { triggerRoomEvent, triggerGameEvent } from '@/lib/pusher/trigger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: '"code" is required.' },
        { status: 400 },
      )
    }

    await closeRoom(code)

    await triggerRoomEvent(code, 'room-closed', {})

    // Also notify game channel so in-game clients (Mole Hunt, etc.) can transition to results
    await triggerGameEvent(code, 'game-ended', {})

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to close room'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
