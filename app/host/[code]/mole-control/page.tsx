import { getRoom } from '@/features/rooms/actions'
import { getRoomConfig } from '@/features/mole-hunt/actions'
import { createClient } from '@/lib/supabase/server'
import { MoleHuntControlRoom } from '@/features/mole-hunt/components/MoleHuntControlRoom'
import { notFound, redirect } from 'next/navigation'

interface MoleControlPageProps {
  params: Promise<{ code: string }>
}

/**
 * Host Control Room for Mole Hunt.
 * Auth-gated: only the host who created this room can access it.
 */
export default async function MoleControlPage({
  params,
}: MoleControlPageProps) {
  const { code } = await params

  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 2. Fetch room
  let room
  try {
    room = await getRoom(code)
  } catch {
    notFound()
  }

  // 3. Verify host ownership
  if (room.host_id !== user.id) {
    redirect('/auth/login')
  }

  if (room.status === 'ended') {
    redirect(`/host/${code}/mh-results`)
  }

  // 4. Fetch room config for total_rounds
  const config = await getRoomConfig(room.id)
  const totalRounds = config?.total_rounds ?? 3

  return (
    <MoleHuntControlRoom
      roomCode={code}
      roomId={room.id}
      totalRounds={totalRounds}
    />
  )
}
