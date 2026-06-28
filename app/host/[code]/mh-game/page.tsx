import { getRoom } from '@/features/rooms/actions'
import { getRoomConfig, getCurrentRound } from '@/features/mole-hunt/actions'
import { createClient } from '@/lib/supabase/server'
import { MoleHuntPresentation } from '@/features/mole-hunt/components/MoleHuntPresentation'
import { notFound } from 'next/navigation'
import type { MoleRound, MoleTopic } from '@/features/mole-hunt/types'

interface HostMoleHuntGamePageProps {
  params: Promise<{ code: string }>
}

export default async function HostMoleHuntGamePage({
  params,
}: HostMoleHuntGamePageProps) {
  const { code } = await params

  // 1. Fetch room
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

  // 2. Fetch room config (timer values, total rounds)
  const config = await getRoomConfig(room.id)

  // 3. Fetch current round
  const currentRound = (await getCurrentRound(room.id)) as MoleRound | null

  // 4. Fetch topic for current round
  let topic: MoleTopic | null = null
  if (currentRound) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('mole_topics')
      .select()
      .eq('id', currentRound.topic_id)
      .single()

    topic = data as MoleTopic | null
  }

  // 5. Fetch players (for nickname mapping in reveal phase)
  const supabase = await createClient()
  const { data: players } = await supabase
    .from('players')
    .select('id, nickname')
    .eq('room_id', room.id)

  return (
    <MoleHuntPresentation
      roomCode={code}
      initialRound={currentRound}
      initialTopic={topic}
      discussTimerSeconds={config?.discuss_timer_seconds ?? 60}
      voteTimerSeconds={config?.vote_timer_seconds ?? 30}
      totalRounds={config?.total_rounds ?? 3}
      players={players ?? []}
    />
  )
}
