import { getRoom } from '@/features/rooms/actions'
import { createClient } from '@/lib/supabase/server'
import { getCurrentRound } from '@/features/word-chain/actions'
import { WordChainPresentation } from '@/features/word-chain/components/WordChainPresentation'
import { notFound, redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WordChainCategory } from '@/features/word-chain/types'

interface WordChainGamePageProps {
  params: Promise<{ code: string }>
}

/**
 * Host Word Chain game page (presenter screen for Zoom sharing).
 * Auth-gated: only the host who created this room can access it.
 * Fetches initial round + category + config server-side, then
 * Pusher handles live updates.
 */
export default async function WordChainGamePage({ params }: WordChainGamePageProps) {
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

  // 4. Fetch players (exclude host) for nickname map
  const { data: players } = await supabase
    .from('players')
    .select('id, nickname')
    .eq('room_id', room.id)
    .neq('is_host', true)

  // 5. Fetch current round
  const round = await getCurrentRound(room.id, supabase as unknown as SupabaseClient)

  // 6. Fetch category if round exists
  let category: WordChainCategory | null = null
  if (round) {
    const { data: cat } = await supabase
      .from('wc_categories')
      .select()
      .eq('id', round.category_id)
      .single()

    if (cat) category = cat as WordChainCategory
  }

  // 7. Fetch config for timer settings
  const { data: config } = await supabase
    .from('wc_room_config')
    .select('time_per_player_seconds, total_rounds')
    .eq('room_id', room.id)
    .maybeSingle()

  const timePerPlayerSeconds = config?.time_per_player_seconds ?? 30
  const totalRounds = config?.total_rounds ?? 0

  return (
    <WordChainPresentation
      roomCode={code}
      roomId={room.id}
      initialRound={round ? {
        id: round.id,
        round_number: round.round_number,
        category_id: round.category_id,
        turn_order: round.turn_order ?? [],
        current_turn_player_id: round.current_turn_player_id,
        status: round.status,
      } : null}
      initialCategory={category}
      timePerPlayerSeconds={timePerPlayerSeconds}
      totalRounds={totalRounds}
      players={(players ?? []).map((p) => ({ id: p.id, nickname: p.nickname }))}
    />
  )
}
