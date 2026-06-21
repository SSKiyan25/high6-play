import { getRoom } from '@/features/rooms/actions'
import {
  getWcPlayers,
  getWcGameState,
  initWcPlayers,
} from '@/features/word-chain/actions'
import { HostWcView } from '@/features/word-chain/components/HostWcView'
import { notFound } from 'next/navigation'

interface HostWcGamePageProps {
  params: Promise<{ code: string }>
}

export default async function HostWcGamePage({ params }: HostWcGamePageProps) {
  const { code } = await params

  let room
  try {
    room = await getRoom(code)
  } catch {
    notFound()
  }

  if (room.status === 'ended') {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#0a0a0a] p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Game Over</h1>
          <p className="mt-2 text-muted-foreground">This game has ended.</p>
        </div>
      </main>
    )
  }

  // Initialize wc_players on first load
  const wcPlayers = await getWcPlayers(room.id)

  if (wcPlayers.length === 0) {
    const nonHostPlayers = room.players
      .filter((p) => !p.is_host)
      .map((p) => p.id)

    if (nonHostPlayers.length > 0) {
      await initWcPlayers(room.id, nonHostPlayers)
    }
  }

  // Fetch game state
  const gameState = await getWcGameState(room.id)

  return (
    <HostWcView
      roomCode={code}
      roomId={room.id}
      initialGameState={gameState}
    />
  )
}
