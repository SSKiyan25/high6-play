'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Clock,
  Loader2,
  StopCircle,
  Trophy,
  UserMinus,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWordChain } from '../hooks/useWordChain'
import { pusherClient } from '@/lib/pusher/client'
import type { WcGameState } from '../types'

interface HostWcViewProps {
  roomCode: string
  roomId: string
  initialGameState: WcGameState
}

/** Simple read‑only timer that resets on turn changes. */
function useHostTimer(resetKey: number) {
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    setTimeLeft(30)
  }, [resetKey])

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [resetKey])

  return timeLeft
}

export function HostWcView({
  roomCode,
  roomId,
  initialGameState,
}: HostWcViewProps) {
  const router = useRouter()
  const [eliminating, setEliminating] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)

  const { gameState, currentPlayer, isGameOver, winnerId } = useWordChain({
    roomCode,
    initialGameState,
  })

  // Timer key: resets when turn changes (new word submitted or player eliminated)
  const timerKey =
    gameState.usedWords.length * 1000 + gameState.currentPlayerIndex
  const timeLeft = useHostTimer(timerKey)

  // Derive current required letter from last word
  const lastWord = gameState.lastWord
  const requiredLetter = lastWord
    ? lastWord[lastWord.length - 1].toUpperCase()
    : 'A'

  // Listen for game-ended to redirect to results
  useEffect(() => {
    const channel = pusherClient.subscribe(`room-${roomCode}-game`)

    channel.bind('game-ended', () => {
      router.push(`/host/${roomCode}/wc-results`)
    })

    return () => {
      channel.unbind('game-ended')
      pusherClient.unsubscribe(`room-${roomCode}-game`)
    }
  }, [roomCode, router])

  const handleEliminate = useCallback(
    async (playerId: string) => {
      if (eliminating) return
      setEliminating(playerId)

      try {
        await fetch('/api/games/word-chain/eliminate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, playerId, reason: 'timeout' }),
        })
      } catch {
        // Allow retry
      } finally {
        setEliminating(null)
      }
    },
    [eliminating, roomId],
  )

  const handleEndGame = useCallback(async () => {
    if (ending) return
    setEnding(true)

    try {
      await fetch('/api/games/word-chain/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      })
      // Redirect handled via Pusher game-ended event
    } catch {
      setEnding(false)
    }
  }, [ending, roomId])

  // ── Winner ──────────────────────────────────────────────────────────
  const winner = gameState.activePlayers
    .concat(gameState.eliminatedPlayers)
    .find((p) => p.player_id === winnerId)

  // ── Game Over Screen ────────────────────────────────────────────────
  if (isGameOver) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-8">
        <div className="flex size-24 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
          <Trophy className="size-12 text-amber-400" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-amber-400">
            {winner ? winner.nickname : 'Nobody'} wins!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Last player standing after{' '}
            {gameState.usedWords.length} words.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </main>
    )
  }

  const timerUrgent = timeLeft <= 10
  const timerPercent = (timeLeft / 30) * 100

  return (
    <div className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* ── Word Chain Display ──────────────────────────────────────── */}
      <div className="border-b border-border/20">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-6 py-4">
          {gameState.usedWords.length === 0 ? (
            <p className="flex-shrink-0 text-sm text-muted-foreground italic">
              Waiting for the first word…
            </p>
          ) : (
            gameState.usedWords.map((word, i) => {
              const isLast = i === gameState.usedWords.length - 1
              return (
                <div key={i} className="flex flex-shrink-0 items-center gap-2">
                  {i > 0 && (
                    <ArrowRight className="size-4 flex-shrink-0 text-border/50" />
                  )}
                  <span
                    className={cn(
                      'flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300',
                      isLast
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 text-base px-5 py-2 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                        : 'border-border/30 bg-card/60 text-foreground/80',
                    )}
                  >
                    {word}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 px-6 py-6 lg:flex-row lg:gap-8">
        {/* ── Left Column: Players ──────────────────────────────────── */}
        <div className="flex w-full flex-col gap-6 lg:w-80 lg:flex-shrink-0">
          {/* Active Players */}
          <div className="rounded-xl border border-border/20 bg-card/40 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Active Players
              <Badge variant="secondary" className="ml-auto text-xs">
                {gameState.activePlayers.length}
              </Badge>
            </h2>
            <ul className="space-y-1.5">
              {gameState.activePlayers.map((player, i) => {
                const isCurrent = i === gameState.currentPlayerIndex
                return (
                  <li
                    key={player.player_id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300',
                      isCurrent &&
                        'bg-amber-500/10 ring-1 ring-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.1)]',
                    )}
                  >
                    {/* Turn order number */}
                    <span
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full text-xs font-bold',
                        isCurrent
                          ? 'bg-amber-500 text-amber-950'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>

                    <span
                      className={cn(
                        'flex-1 text-sm font-medium',
                        isCurrent && 'text-amber-300',
                      )}
                    >
                      {player.nickname}
                    </span>

                    {isCurrent && (
                      <span className="flex size-2">
                        <span className="absolute inline-flex size-2 animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
                      </span>
                    )}

                    {/* Eliminate button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground/60 transition-colors hover:text-destructive"
                      onClick={() => handleEliminate(player.player_id)}
                      disabled={eliminating === player.player_id}
                      aria-label={`Eliminate ${player.nickname}`}
                    >
                      {eliminating === player.player_id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <UserMinus className="size-3.5" />
                      )}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Eliminated Players */}
          {gameState.eliminatedPlayers.length > 0 && (
            <div className="rounded-xl border border-border/20 bg-card/40 p-4 opacity-60">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                Eliminated
                <Badge variant="secondary" className="ml-auto text-xs">
                  {gameState.eliminatedPlayers.length}
                </Badge>
              </h2>
              <ul className="space-y-1">
                {gameState.eliminatedPlayers.map((player) => (
                  <li
                    key={player.player_id}
                    className="flex items-center gap-3 rounded-lg px-3 py-1.5"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted/50 text-[10px] font-bold text-muted-foreground">
                      ✕
                    </span>
                    <span className="flex-1 text-sm text-muted-foreground line-through">
                      {player.nickname}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Right Column: Game Info & Controls ────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          {/* Current turn prompt */}
          <div className="text-center">
            <p className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
              Current Turn
            </p>
            {currentPlayer ? (
              <p className="mt-2 text-2xl font-bold">
                It&rsquo;s{' '}
                <span className="text-amber-400">{currentPlayer.nickname}</span>
                &rsquo;s turn
              </p>
            ) : (
              <p className="mt-2 text-xl text-muted-foreground">
                Waiting for turn…
              </p>
            )}
            {lastWord && (
              <p className="mt-3 text-lg text-muted-foreground">
                Must start with{' '}
                <span className="inline-flex items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 font-mono text-2xl font-bold text-amber-400">
                  &ldquo;{requiredLetter}&rdquo;
                </span>
              </p>
            )}
            {!lastWord && (
              <p className="mt-3 text-sm text-muted-foreground">
                First word — anything goes!
              </p>
            )}
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                'flex size-28 items-center justify-center rounded-full border-4 transition-all duration-500',
                timerUrgent
                  ? 'border-red-500/60 bg-red-500/10'
                  : 'border-amber-500/30 bg-amber-500/5',
              )}
              role="timer"
              aria-live="polite"
              aria-label={`${timeLeft} seconds remaining`}
            >
              <span
                className={cn(
                  'font-mono text-4xl font-bold tabular-nums transition-colors duration-300',
                  timerUrgent ? 'text-red-400' : 'text-amber-300',
                )}
              >
                {timeLeft}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              <span>30-second turn timer</span>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">{gameState.usedWords.length} words</Badge>
            <span>in the chain</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Controls ─────────────────────────────────────────── */}
      <div className="border-t border-border/20 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex size-2 rounded-full bg-amber-400 animate-pulse" />
            Live
          </div>

          <Button
            size="lg"
            variant="destructive"
            onClick={handleEndGame}
            disabled={ending}
          >
            {ending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Ending…
              </>
            ) : (
              <>
                <StopCircle className="size-4" />
                End Game
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
