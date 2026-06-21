import { getRoom } from '@/features/rooms/actions'
import { getWcGameState } from '@/features/word-chain/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, ArrowLeft } from 'lucide-react'

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

  const gameState = await getWcGameState(room.id)

  const allPlayers = [...gameState.activePlayers, ...gameState.eliminatedPlayers]

  const winner = allPlayers.find(
    (p) => p.player_id === gameState.winnerId,
  )

  return (
    <main className="flex min-h-svh flex-col items-center gap-8 bg-[#0a0a0a] px-6 py-12">
      {/* Winner */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
          <Trophy className="size-12 text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-amber-400">
          {winner ? winner.nickname : 'Nobody'} wins!
        </h1>
        <p className="text-muted-foreground">
          {gameState.usedWords.length} word
          {gameState.usedWords.length !== 1 ? 's' : ''} in the final chain
        </p>
      </div>

      {/* Elimination order */}
      <div className="w-full max-w-md">
        <h2 className="mb-4 text-center text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Elimination Order
        </h2>

        {gameState.eliminatedPlayers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No players were eliminated.
          </p>
        ) : (
          <ol className="space-y-2">
            {gameState.eliminatedPlayers.map((player, i) => (
              <li
                key={player.player_id}
                className="flex items-center gap-4 rounded-xl border border-border/20 bg-card/40 px-5 py-3"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-muted-foreground line-through">
                  {player.nickname}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  Eliminated
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Winner (if still active — should be only one) */}
      {winner && gameState.activePlayers.includes(winner) && (
        <div className="w-full max-w-md">
          <div className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-amber-950">
              ★
            </span>
            <span className="flex-1 text-sm font-semibold text-amber-300">
              {winner.nickname}
            </span>
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px]">
              Winner
            </Badge>
          </div>
        </div>
      )}

      {/* Back */}
      <Link href="/dashboard">
        <Button variant="outline" size="lg">
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Button>
      </Link>
    </main>
  )
}
