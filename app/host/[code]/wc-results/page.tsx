import { getRoom } from '@/features/rooms/actions'
import { createClient } from '@/lib/supabase/server'
import { getResults } from '@/features/word-chain/actions'
import { WordChainResultsView } from '@/features/word-chain/components/WordChainResultsView'
import { notFound, redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'

interface WordChainResultsPageProps {
  params: Promise<{ code: string }>
}

/**
 * Host Word Chain results page.
 * Auth-gated: only the host who created this room can access it.
 * Fetches full leaderboard and round breakdown server-side at render time.
 */
export default async function WordChainResultsPage({ params }: WordChainResultsPageProps) {
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

  // 4. Fetch results
  const results = await getResults(room.id, supabase as unknown as SupabaseClient)

  return (
    <WordChainResultsView
      roomCode={code}
      leaderboard={results.leaderboard}
      roundBreakdowns={results.roundBreakdowns}
      isHost
    />
  )
}
