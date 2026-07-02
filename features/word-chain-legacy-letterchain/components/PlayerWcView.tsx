'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Clock,
  Loader2,
  Send,
  Trophy,
  AlertTriangle,
  XCircle,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWordChain } from '../hooks/useWordChain'
import { useTurnTimer } from '../hooks/useTurnTimer'
import type { WcGameState } from '../types'

interface PlayerWcViewProps {
  roomCode: string
  roomId: string
  playerId: string
  initialGameState: WcGameState
}

export function PlayerWcView({
  roomCode,
  roomId,
  playerId,
  initialGameState,
}: PlayerWcViewProps) {
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eliminationReason, setEliminationReason] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { gameState, currentPlayer, isGameOver, winnerId } = useWordChain({
    roomCode,
    initialGameState,
  })

  // Check if this player is eliminated
  const myEliminatedPlayer = gameState.eliminatedPlayers.find(
    (p) => p.player_id === playerId,
  )
  const isEliminated = !!myEliminatedPlayer

  // Check if it's this player's turn
  const isMyTurn =
    !isEliminated &&
    !isGameOver &&
    currentPlayer?.player_id === playerId

  // Auto-focus input when it becomes your turn
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isMyTurn])

  // Clear input and error when turn changes
  const prevTurnKeyRef = useRef(
    `${gameState.currentPlayerIndex}-${gameState.usedWords.length}`,
  )
  useEffect(() => {
    const newKey = `${gameState.currentPlayerIndex}-${gameState.usedWords.length}`
    if (newKey !== prevTurnKeyRef.current) {
      prevTurnKeyRef.current = newKey
      setInput('')
      setError(null)
    }
  }, [gameState.currentPlayerIndex, gameState.usedWords.length])

  const lastWord = gameState.lastWord
  const requiredLetter = lastWord
    ? lastWord[lastWord.length - 1].toUpperCase()
    : null

  // ── Eliminate self (called on timeout or invalid submission) ───────
  const eliminateSelf = useCallback(
    async (reason: 'timeout' | 'wrong-letter' | 'already-used') => {
      try {
        await fetch('/api/games/word-chain/eliminate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, playerId, reason }),
        })
      } catch {
        // If the call fails we still show the elimination state locally
      }
    },
    [roomId, playerId],
  )

  // ── Timeout handler ────────────────────────────────────────────────
  const handleTimeout = useCallback(() => {
    setEliminationReason('timeout')
    eliminateSelf('timeout')
  }, [eliminateSelf])

  const { timeLeft, resetTimer } = useTurnTimer({
    isActive: isMyTurn,
    onTimeout: handleTimeout,
  })

  // ── Submit word ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!isMyTurn || submitting || isEliminated) return

    const word = input.trim().toLowerCase()
    if (!word) return

    setSubmitting(true)
    setError(null)

    try {
      const turnOrder = gameState.usedWords.length
      const res = await fetch('/api/games/word-chain/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerId,
          word,
          turnOrder,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setSubmitting(false)
        return
      }

      if (!data.valid) {
        // Show error briefly then eliminate self
        const reasonMap: Record<string, string> = {
          'already-used': 'Already used!',
          'wrong-letter': 'Wrong letter!',
        }
        setError(reasonMap[data.reason] || 'Invalid word!')
        setEliminationReason(data.reason)

        // Eliminate after a brief moment so the error is visible
        setTimeout(() => {
          eliminateSelf(data.reason as 'wrong-letter' | 'already-used')
        }, 1500)

        setSubmitting(false)
        return
      }

      // Valid submission — clear input, stay disabled until next turn
      setInput('')
      setSubmitting(false)
    } catch {
      setError('Failed to submit. Try again.')
      setSubmitting(false)
    }
  }, [
    isMyTurn,
    submitting,
    isEliminated,
    input,
    gameState.usedWords.length,
    roomId,
    playerId,
    eliminateSelf,
  ])

  // Submit on Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  // ── Game Over: Winner ──────────────────────────────────────────────
  if (isGameOver) {
    const isWinner = winnerId === playerId
    const winnerPlayer = gameState.activePlayers
      .concat(gameState.eliminatedPlayers)
      .find((p) => p.player_id === winnerId)

    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-6">
        {isWinner ? (
          <>
            <div className="flex size-24 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
              <Trophy className="size-12 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-amber-400">
              You win! 🎉
            </h1>
            <p className="text-muted-foreground">
              Last player standing — nice work!
            </p>
          </>
        ) : (
          <>
            <div className="flex size-20 items-center justify-center rounded-full bg-muted/20 ring-1 ring-border/30">
              <XCircle className="size-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold">Game Over!</h1>
              <p className="mt-2 text-muted-foreground">
                {winnerPlayer?.nickname ?? 'Nobody'} wins!
              </p>
            </div>
          </>
        )}
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem('h6p_player')
            window.location.href = '/'
          }}
        >
          ← Back to Join
        </Button>
      </main>
    )
  }

  // ── Eliminated State ───────────────────────────────────────────────
  if (isEliminated || eliminationReason) {
    const reasonLabels: Record<string, string> = {
      timeout: 'You ran out of time!',
      'wrong-letter': 'Wrong starting letter!',
      'already-used': 'That word was already used!',
    }
    const reasonText =
      eliminationReason && reasonLabels[eliminationReason]
        ? reasonLabels[eliminationReason]
        : 'You were eliminated!'

    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-6">
        <div className="flex size-20 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
          <AlertTriangle className="size-10 text-red-400" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400">
            Eliminated
          </h1>
          <p className="mt-2 text-muted-foreground">{reasonText}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Waiting for the game to end…
          </p>
        </div>
      </main>
    )
  }

  const timerUrgent = timeLeft <= 10

  return (
    <main className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* ── Top Bar: Other Players ─────────────────────────────────── */}
      <div className="border-b border-border/20 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-2 overflow-x-auto">
          <Users className="size-4 flex-shrink-0 text-muted-foreground" />
          {gameState.activePlayers.map((player, i) => {
            const isMe = player.player_id === playerId
            const isCurrent = i === gameState.currentPlayerIndex
            return (
              <span
                key={player.player_id}
                className={cn(
                  'flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-300',
                  isMe && 'border-amber-500/40 bg-amber-500/10 text-amber-300',
                  !isMe && isCurrent && 'border-amber-500/20 bg-amber-500/5 text-amber-400/80',
                  !isMe && !isCurrent && 'border-border/30 bg-card/60 text-muted-foreground',
                )}
              >
                {player.nickname}
                {isMe && ' (you)'}
              </span>
            )
          })}
        </div>
      </div>

      {/* ── Last Word Display ──────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-8 pb-4 text-center">
        {lastWord ? (
          <>
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Last Word
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-foreground sm:text-4xl">
              {lastWord}
            </p>
          </>
        ) : (
          <p className="text-lg text-muted-foreground">
            You&rsquo;re up first — submit any word!
          </p>
        )}
      </div>

      {/* ── Required Letter ────────────────────────────────────────── */}
      {requiredLetter && (
        <div className="flex-shrink-0 px-6 pb-4 text-center">
          <p className="text-sm text-muted-foreground">
            Must start with{' '}
            <span className="inline-flex items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 font-mono text-xl font-bold text-amber-400">
              &ldquo;{requiredLetter}&rdquo;
            </span>
          </p>
        </div>
      )}

      {/* ── Word Chain Mini-View ───────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pb-6">
        <div className="mx-auto flex max-w-lg items-center gap-1.5 overflow-x-auto">
          {gameState.usedWords.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 italic">
              Chain will appear here…
            </p>
          ) : (
            gameState.usedWords.map((word, i) => {
              const isLast = i === gameState.usedWords.length - 1
              return (
                <div key={i} className="flex flex-shrink-0 items-center gap-1.5">
                  {i > 0 && (
                    <ArrowRight className="size-3 flex-shrink-0 text-border/40" />
                  )}
                  <span
                    className={cn(
                      'flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      isLast
                        ? 'border-amber-500/20 bg-amber-500/5 text-amber-300'
                        : 'border-border/20 bg-card/40 text-muted-foreground',
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

      {/* ── Timer ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2 pb-4">
        <div
          className={cn(
            'flex size-20 items-center justify-center rounded-full border-4 transition-all duration-500',
            !isMyTurn && 'opacity-30',
            isMyTurn && timerUrgent
              ? 'border-red-500/60 bg-red-500/10 animate-pulse'
              : isMyTurn
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-border/20 bg-transparent',
          )}
          role="timer"
          aria-live="polite"
        >
          <span
            className={cn(
              'font-mono text-3xl font-bold tabular-nums transition-colors duration-300',
              isMyTurn && timerUrgent ? 'text-red-400' : 'text-amber-300',
              !isMyTurn && 'text-muted-foreground/40',
            )}
          >
            {timeLeft}
          </span>
        </div>
        {isMyTurn ? (
          <p className="text-xs text-muted-foreground">Your turn — type fast!</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Waiting for {currentPlayer?.nickname ?? '…'}…
          </p>
        )}
      </div>

      {/* ── Word Input ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pb-8">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isMyTurn
                  ? requiredLetter
                    ? `Start with "${requiredLetter}"…`
                    : 'Enter a word to start…'
                  : 'Wait for your turn…'
              }
              disabled={!isMyTurn || submitting}
              className={cn(
                'h-14 text-lg font-medium tracking-wide bg-card/60 border-border/30',
                'placeholder:text-muted-foreground/50',
                'focus-visible:ring-amber-500/30',
                !isMyTurn && 'opacity-50',
              )}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={30}
            />
            <Button
              size="lg"
              className="h-14 px-5"
              onClick={handleSubmit}
              disabled={!isMyTurn || submitting || !input.trim()}
            >
              {submitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Send className="size-5" />
              )}
            </Button>
          </div>

          {/* Error */}
          {error && (
            <p
              className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-center text-sm font-medium text-red-400 animate-in fade-in slide-in-from-top-2 duration-200"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </div>

      {/* ── Words count ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pb-6 text-center">
        <Badge variant="secondary" className="text-xs">
          {gameState.usedWords.length} word{gameState.usedWords.length !== 1 ? 's' : ''} in chain
        </Badge>
      </div>
    </main>
  )
}
