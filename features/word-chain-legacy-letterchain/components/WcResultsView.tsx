import type { WcWord, WcPlayerWithNickname } from '../types'
import { cn } from '@/lib/utils'
import { Trophy, Medal, Clock, AlertTriangle, Repeat } from 'lucide-react'

interface WcResultsViewProps {
  roomCode: string
  winner: WcPlayerWithNickname | null
  eliminationOrder: { player: WcPlayerWithNickname; reason: string }[]
  words: WcWord[]
  totalWords: number
}

const REASON_ICONS: Record<string, React.ReactNode> = {
  'Timed out': <Clock className="size-3.5" />,
  'Wrong letter': <AlertTriangle className="size-3.5" />,
  'Duplicate word': <Repeat className="size-3.5" />,
}

export function WcResultsView({
  roomCode,
  winner,
  eliminationOrder,
  words,
  totalWords,
}: WcResultsViewProps) {
  // Reversed: runner-up first, first-eliminated last
  const eliminationReversed = [...eliminationOrder].reverse()

  return (
    <main className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-border/20 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            Room {roomCode}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Game Over
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 py-8">
        <div className="space-y-10">
          {/* Winner section */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-24 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
              <Trophy className="size-12 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium tracking-widest text-amber-400/60 uppercase">
                Winner
              </p>
              <h2 className="mt-1 text-3xl font-bold text-amber-400">
                {winner ? winner.nickname : 'Nobody'}
              </h2>
            </div>
          </div>

          {/* Word chain pills */}
          <div>
            <h3 className="mb-4 text-center text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Word Chain
              <span className="ml-2 font-normal text-muted-foreground/60">
                — {totalWords} word{totalWords !== 1 ? 's' : ''} played
              </span>
            </h3>
            {words.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground italic">
                No words were played.
              </p>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {words.map((word, i) => (
                  <span
                    key={word.id}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-all duration-300',
                      i === words.length - 1
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                        : 'border-border/30 bg-card/60 text-foreground/80',
                    )}
                  >
                    <span className="mr-1.5 text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    {word.word}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Elimination order */}
          {eliminationReversed.length > 0 && (
            <div>
              <h3 className="mb-4 text-center text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                Elimination Order
              </h3>
              <ol className="space-y-2">
                {eliminationReversed.map((entry, i) => {
                  const position = eliminationReversed.length - i
                  const isRunnerUp = i === 0 && eliminationReversed.length > 1

                  return (
                    <li
                      key={entry.player.player_id}
                      className="flex items-center gap-4 rounded-xl border border-border/20 bg-card/40 px-5 py-3 transition-colors duration-200 hover:border-border/30"
                    >
                      {/* Position badge */}
                      <span
                        className={cn(
                          'flex size-8 items-center justify-center rounded-full text-sm font-bold',
                          isRunnerUp
                            ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {isRunnerUp ? (
                          <Medal className="size-4" />
                        ) : (
                          position
                        )}
                      </span>

                      {/* Player name */}
                      <span
                        className={cn(
                          'flex-1 text-sm font-medium',
                          isRunnerUp
                            ? 'text-amber-200'
                            : 'text-muted-foreground line-through',
                        )}
                      >
                        {entry.player.nickname}
                      </span>

                      {/* Elimination reason */}
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300">
                        {REASON_ICONS[entry.reason] ?? (
                          <Clock className="size-3.5" />
                        )}
                        {entry.reason}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-border/20 px-6 py-6">
        <div className="mx-auto max-w-4xl text-center">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-border/30 bg-card/40 px-6 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:border-border/50 hover:bg-card/60 cursor-pointer"
          >
            Play Again
          </a>
        </div>
      </div>
    </main>
  )
}
