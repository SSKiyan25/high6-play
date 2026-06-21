import { getRoom } from '@/features/rooms/actions'
import { HostLobby } from '@/features/rooms/components/HostLobby'
import { notFound } from 'next/navigation'

interface HostPageProps {
  params: Promise<{ code: string }>
}

export default async function HostPage({ params }: HostPageProps) {
  const { code } = await params

  let room
  try {
    room = await getRoom(code)
  } catch {
    notFound()
  }

  return (
    <main className="min-h-svh bg-background">
      <HostLobby room={room} />
    </main>
  )
}
