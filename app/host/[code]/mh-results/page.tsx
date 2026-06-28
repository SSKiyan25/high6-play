import { getRoom } from '@/features/rooms/actions'
import { createClient } from '@/lib/supabase/server'
import { MoleHuntResultsView } from '@/features/mole-hunt/components/MoleHuntResultsView'
import { notFound, redirect } from 'next/navigation'

interface MHResultsPageProps {
  params: Promise<{ code: string }>
}

/**
 * Host Mole Hunt results page.
 * Auth-gated: only the host who created this room can access it.
 * Fetches full leaderboard and round breakdown server-side at render time.
 */
export default async function MHResultsPage({ params }: MHResultsPageProps) {
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

  // 4. Fetch leaderboard — mole_scores joined with players
  const { data: scores } = await supabase
    .from('mole_scores')
    .select(
      `
      player_id,
      total_points,
      times_mole,
      times_canary,
      crew_deceived,
      players!inner(nickname)
    `,
    )
    .eq('room_id', room.id)
    .order('total_points', { ascending: false })

  const leaderboard = (scores ?? []).map((s: any) => ({
    player_id: s.player_id,
    nickname: (s as any).players?.nickname ?? 'Unknown',
    total_points: s.total_points ?? 0,
    times_mole: s.times_mole ?? 0,
    times_canary: s.times_canary ?? 0,
    crew_deceived: s.crew_deceived ?? 0,
  }))

  // 5. Fetch round breakdown — mole_rounds with topics and votes
  const { data: rounds } = await supabase
    .from('mole_rounds')
    .select(
      `
      id,
      round_number,
      correct_choice,
      mole_player_ids,
      canary_player_ids,
      mole_topics!inner(
        title,
        option_a,
        option_b
      )
    `,
    )
    .eq('room_id', room.id)
    .order('round_number', { ascending: true })

  // Resolve nicknames for mole/canary player IDs
  const allPlayerIds = new Set<string>()
  for (const r of rounds ?? []) {
    for (const id of (r.mole_player_ids ?? []) as string[]) {
      allPlayerIds.add(id)
    }
    for (const id of (r.canary_player_ids ?? []) as string[]) {
      allPlayerIds.add(id)
    }
  }

  const { data: roundPlayers } =
    allPlayerIds.size > 0
      ? await supabase
          .from('players')
          .select('id, nickname')
          .in('id', Array.from(allPlayerIds))
      : { data: [] }

  const nicknameMap = new Map<string, string>()
  for (const p of roundPlayers ?? []) {
    nicknameMap.set(p.id, p.nickname)
  }

  // Fetch votes per round
  const roundBreakdowns = await Promise.all(
    (rounds ?? []).map(async (r: any) => {
      const topic = (r as any).mole_topics
      const moleIds: string[] = r.mole_player_ids ?? []
      const canaryIds: string[] = r.canary_player_ids ?? []

      // Fetch votes with player nicknames
      const { data: votes } = await supabase
        .from('mole_votes')
        .select(
          `
          choice,
          players!inner(nickname)
        `,
        )
        .eq('round_id', r.id)

      const votesA: { nickname: string }[] = []
      const votesB: { nickname: string }[] = []

      for (const v of votes ?? []) {
        const nick = (v as any).players?.nickname ?? 'Unknown'
        if (v.choice === 'a') votesA.push({ nickname: nick })
        else if (v.choice === 'b') votesB.push({ nickname: nick })
      }

      return {
        round_number: r.round_number,
        topic_title: topic?.title ?? 'Unknown Topic',
        correct_choice: r.correct_choice as 'a' | 'b',
        option_a: topic?.option_a ?? '',
        option_b: topic?.option_b ?? '',
        mole_nicknames: moleIds
          .map((id: string) => nicknameMap.get(id))
          .filter(Boolean) as string[],
        canary_nicknames: canaryIds
          .map((id: string) => nicknameMap.get(id))
          .filter(Boolean) as string[],
        votes_a: votesA,
        votes_b: votesB,
      }
    }),
  )

  return (
    <MoleHuntResultsView
      roomCode={code}
      leaderboard={leaderboard}
      roundBreakdowns={roundBreakdowns}
    />
  )
}
