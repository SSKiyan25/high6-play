import { getRoom } from '@/features/rooms/actions'
import { getFullResults } from '@/features/this-or-that/actions'
import { TotResultsView } from '@/features/this-or-that/components/TotResultsView'
import { notFound } from 'next/navigation'

interface ResultsPageProps {
  params: Promise<{ code: string }>
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { code } = await params

  let room
  try {
    room = await getRoom(code)
  } catch {
    notFound()
  }

  if (room.game_type !== 'this-or-that') {
    notFound()
  }

  const results = await getFullResults(room.id)

  return <TotResultsView roomCode={code} results={results} />
}
