'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThisOrThat } from '../hooks/useThisOrThat'
import type { TotQuestion, Choice } from '../types'

interface PlayerViewProps {
  roomCode: string
  playerId: string
  questions: TotQuestion[]
  initialIndex: number
}

export function PlayerView({
  roomCode,
  playerId,
  questions,
  initialIndex,
}: PlayerViewProps) {
  const { currentQuestion, currentIndex, totalQuestions, isGameOver } =
    useThisOrThat({ roomCode, initialQuestions: questions, initialIndex })

  const [voted, setVoted] = useState(false)
  const [votingChoice, setVotingChoice] = useState<Choice | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleVote = useCallback(
    async (choice: Choice) => {
      if (voted || submitting) return
      setSubmitting(true)
      setVotingChoice(choice)

      try {
        const res = await fetch('/api/games/this-or-that/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_id: currentQuestion?.id,
            player_id: playerId,
            choice,
            room_code: roomCode,
          }),
        })

        if (!res.ok) throw new Error('Failed to submit vote')

        setVoted(true)
      } catch {
        setVotingChoice(null)
      } finally {
        setSubmitting(false)
      }
    },
    [voted, submitting, currentQuestion, playerId, roomCode],
  )

  // Reset vote state when question advances
  const prevIndexRef = useRef(currentIndex)
  useEffect(() => {
    if (currentIndex !== prevIndexRef.current) {
      prevIndexRef.current = currentIndex
      setVoted(false)
      setVotingChoice(null)
    }
  }, [currentIndex])

  // ── Game Over Screen ──────────────────────────────────────────────
  if (isGameOver) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-6">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <Check className="size-10 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Game Over!</h1>
          <p className="mt-2 text-muted-foreground">Thanks for playing.</p>
        </div>
      </main>
    )
  }

  // ── No Question ───────────────────────────────────────────────────
  if (!currentQuestion) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Waiting for the host…</p>
      </main>
    )
  }

  // ── Voting Screen ─────────────────────────────────────────────────
  return (
    <main className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* Question header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-3 text-center">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Question {currentIndex + 1} of {totalQuestions}
        </p>
      </div>

      {/* Option A — Blue */}
      <button
        type="button"
        onClick={() => handleVote('a')}
        disabled={voted || submitting}
        className={cn(
          'relative flex flex-1 items-center justify-center border-2 transition-all duration-300',
          'border-blue-500/30 bg-blue-500/5',
          !voted && 'active:bg-blue-500/20 cursor-pointer hover:bg-blue-500/10',
          voted && votingChoice === 'a' && 'border-blue-500 bg-blue-500/20 ring-4 ring-blue-500/20',
          voted && votingChoice !== 'a' && 'opacity-50',
        )}
        style={{ minHeight: '40vh' }}
      >
        <div className="flex flex-col items-center gap-3 p-6">
          <span className="text-xs font-medium tracking-widest text-blue-400/60 uppercase">
            Option A
          </span>
          <span className="text-2xl font-bold text-blue-400 sm:text-3xl">
            {currentQuestion.option_a}
          </span>
          {voted && votingChoice === 'a' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-300 animate-in fade-in zoom-in-50 duration-200">
              <Check className="size-3.5" />
              Your pick
            </span>
          )}
        </div>
      </button>

      {/* OR divider */}
      <div className="relative flex items-center justify-center py-1">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border/20" />
        <span className="relative z-10 bg-[#0a0a0a] px-4 text-xs font-bold tracking-widest text-muted-foreground uppercase">
          OR
        </span>
      </div>

      {/* Option B — Violet */}
      <button
        type="button"
        onClick={() => handleVote('b')}
        disabled={voted || submitting}
        className={cn(
          'relative flex flex-1 items-center justify-center border-2 transition-all duration-300',
          'border-violet-500/30 bg-violet-500/5',
          !voted && 'active:bg-violet-500/20 cursor-pointer hover:bg-violet-500/10',
          voted && votingChoice === 'b' && 'border-violet-500 bg-violet-500/20 ring-4 ring-violet-500/20',
          voted && votingChoice !== 'b' && 'opacity-50',
        )}
        style={{ minHeight: '40vh' }}
      >
        <div className="flex flex-col items-center gap-3 p-6">
          <span className="text-xs font-medium tracking-widest text-violet-400/60 uppercase">
            Option B
          </span>
          <span className="text-2xl font-bold text-violet-400 sm:text-3xl">
            {currentQuestion.option_b}
          </span>
          {voted && votingChoice === 'b' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-sm font-medium text-violet-300 animate-in fade-in zoom-in-50 duration-200">
              <Check className="size-3.5" />
              Your pick
            </span>
          )}
        </div>
      </button>

      {/* Waiting state */}
      {voted && (
        <div className="flex-shrink-0 px-6 py-4 text-center">
          <p className="text-sm text-muted-foreground animate-in fade-in duration-300">
            Waiting for host to advance…
          </p>
        </div>
      )}

      {/* Submit loading */}
      {submitting && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Submitting vote…</span>
        </div>
      )}
    </main>
  )
}
