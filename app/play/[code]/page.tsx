import { getRoom } from '@/features/rooms/actions'
import { notFound } from 'next/navigation'
import { PlayerLobbyGate } from '@/features/rooms/components/PlayerLobbyGate'

interface PlayPageProps {
  params: Promise<{ code: string }>
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { code } = await params

  let room
  try {
    room = await getRoom(code)
  } catch {
    notFound()
  }

  return (
    <main className="min-h-svh bg-background">
      <PlayerLobbyGate room={room} />
    </main>
  )
}
