import { getRoom } from '@/features/rooms/actions'
import { getWcFullResults } from '@/features/word-chain/actions'
import { WcResultsView } from '@/features/word-chain/components/WcResultsView'
import { notFound } from 'next/navigation'

interface WcResultsPageProps {
  params: Promise<{ code: string }>
}

export default async function WcResultsPage({ params }: WcResultsPageProps) {
  const { code } = await params

  let room
  try {
    room = await getRoom(code)
  } catch {
    notFound()
  }

  if (room.game_type !== 'word-chain') {
    notFound()
  }

  const results = await getWcFullResults(room.id)

  return (
    <WcResultsView
      roomCode={code}
      winner={results.winner}
      eliminationOrder={results.eliminationOrder}
      words={results.words}
      totalWords={results.totalWords}
    />
  )
}
