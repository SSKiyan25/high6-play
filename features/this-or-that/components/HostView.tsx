'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, Clock, Loader2, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pusherClient } from '@/lib/pusher/client'
import { useVotes } from '../hooks/useVotes'
import type { TotQuestion, TotResults } from '../types'

/** Timer duration per question in seconds. */
const QUESTION_TIME = 30
/** Delay before advancing to show the status message. */
const ADVANCE_DELAY_MS = 1500

type CountdownStatus = 'counting' | 'all-voted' | 'times-up' | 'advancing'

interface HostViewProps {
  roomCode: string
  questions: TotQuestion[]
  initialIndex: number
  initialResults: TotResults | null
  /** Number of non-host players who can vote. */
  totalPlayers: number
}

export function HostView({
  roomCode,
  questions,
  initialIndex,
  initialResults,
  totalPlayers,
}: HostViewProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [countdownStatus, setCountdownStatus] =
    useState<CountdownStatus>('counting')
  const [transitioning, setTransitioning] = useState(false)

  // Refs for cleanup
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Stable callback ref so useVotes doesn't get stale closures
  const onAllVotedRef = useRef<() => void>(() => {})
  onAllVotedRef.current = () => {
    setCountdownStatus((prev) => {
      // Only transition if still counting (guard against double-fire)
      if (prev === 'counting') return 'all-voted'
      return prev
    })
  }

  const { results } = useVotes({
    roomCode,
    initialResults,
    totalPlayers,
    onAllVoted: useCallback(() => {
      onAllVotedRef.current()
    }, []),
  })

  const currentQuestion = questions[currentIndex] ?? null
  const totalQuestions = questions.length
  const isLastQuestion = currentIndex >= totalQuestions - 1
  const progressPercent =
    totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0

  // ── Timer: resets when currentIndex or countdownStatus changes ──────
  useEffect(() => {
    // Reset timer when question changes
    setTimeLeft(QUESTION_TIME)
    setCountdownStatus('counting')

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [currentIndex])

  // Tick the timer while counting
  useEffect(() => {
    if (countdownStatus !== 'counting') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      return
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1
        if (next <= 0) {
          // Time's up — trigger force advance
          setCountdownStatus('times-up')
          return 0
        }
        return next
      })
    }, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [countdownStatus, currentIndex])

  // ── Advance logic ──────────────────────────────────────────────────
  const advance = useCallback(async () => {
    if (countdownStatus === 'advancing') return

    const nextIndex = currentIndex + 1

    if (nextIndex >= totalQuestions) {
      // End game
      setCountdownStatus('advancing')
      try {
        await fetch('/api/games/this-or-that/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_code: roomCode }),
        })
      } catch {
        setCountdownStatus('counting')
      }
      return
    }

    setCountdownStatus('advancing')
    setTransitioning(true)

    try {
      const res = await fetch('/api/games/this-or-that/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, next_index: nextIndex }),
      })

      if (!res.ok) throw new Error('Failed to advance')

      // Brief delay for exit animation, then update
      setTimeout(() => {
        setCurrentIndex(nextIndex)
        setTransitioning(false)
      }, 300)
    } catch {
      setTransitioning(false)
      setCountdownStatus('counting')
    }
  }, [countdownStatus, currentIndex, totalQuestions, roomCode])

  // When status changes to all-voted or times-up, delay then advance
  useEffect(() => {
    if (countdownStatus === 'all-voted' || countdownStatus === 'times-up') {
      advanceTimeoutRef.current = setTimeout(() => {
        advance()
      }, ADVANCE_DELAY_MS)
    }

    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current)
        advanceTimeoutRef.current = null
      }
    }
  }, [countdownStatus, advance])

  // ── End game manually (last question only) ─────────────────────────
  const handleEndGame = useCallback(async () => {
    if (countdownStatus === 'advancing') return
    setCountdownStatus('advancing')

    try {
      await fetch('/api/games/this-or-that/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode }),
      })
      // Redirect will happen via Pusher game-ended event
    } catch {
      setCountdownStatus('counting')
    }
  }, [countdownStatus, roomCode])

  // Listen for game-ended to redirect host to results
  useEffect(() => {
    if (!roomCode) return

    const channel = pusherClient.subscribe(`room-${roomCode}-game`)

    channel.bind('game-ended', () => {
      router.push(`/host/${roomCode}/results`)
    })

    return () => {
      channel.unbind('game-ended')
      pusherClient.unsubscribe(`room-${roomCode}-game`)
    }
  }, [roomCode, router])

  // ── Cleanup all timers on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    }
  }, [])

  // ── Derived display values ─────────────────────────────────────────
  const timerUrgent = timeLeft <= 10
  const timerPercent = (timeLeft / QUESTION_TIME) * 100

  const statusMessage =
    countdownStatus === 'all-voted'
      ? 'All votes in! Advancing…'
      : countdownStatus === 'times-up'
        ? "Time's up! Advancing…"
        : null

  if (!currentQuestion) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8">
        <p className="text-xl text-muted-foreground">No questions found.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* Progress bar + timer */}
      <div className="px-6 pt-6">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <Progress value={progressPercent} className="h-1.5 flex-1" />

          {/* Countdown timer (Word Chain style) */}
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-500',
              timerUrgent
                ? 'border-red-500/60 bg-red-500/10'
                : 'border-border/30 bg-card/40',
            )}
            role="timer"
            aria-live="polite"
            aria-label={`${timeLeft} seconds remaining`}
          >
            <Clock
              className={cn(
                'size-4 transition-colors duration-300',
                timerUrgent ? 'text-red-400' : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'font-mono text-sm font-bold tabular-nums transition-colors duration-300',
                timerUrgent ? 'text-red-400' : 'text-foreground',
              )}
            >
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Question display */}
      <div
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8 transition-opacity duration-300',
          transitioning && 'opacity-30',
        )}
      >
        {/* Status message overlay */}
        {statusMessage && (
          <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-primary/20 bg-primary/10 px-6 py-3">
            <p className="text-lg font-semibold text-primary">
              {statusMessage}
            </p>
          </div>
        )}

        {/* Option A */}
        <div className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/5 px-6 py-8">
          <span className="mb-2 text-xs font-medium tracking-widest text-blue-400/60 uppercase">
            Option A
          </span>
          <h2 className="text-center text-3xl font-bold text-blue-400 sm:text-4xl md:text-5xl">
            {currentQuestion.option_a}
          </h2>

          {/* Vote chips for Option A */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {results?.a_voters.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="inline-flex animate-in fade-in slide-in-from-bottom-2 items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {name}
              </span>
            ))}
          </div>
          <span className="mt-3 text-sm text-blue-400/60">
            {results?.a_count ?? 0} vote
            {(results?.a_count ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>

        {/* VS divider */}
        <div className="flex items-center gap-3">
          <div className="h-px w-12 bg-border/30" />
          <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
            VS
          </span>
          <div className="h-px w-12 bg-border/30" />
        </div>

        {/* Option B */}
        <div className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/5 px-6 py-8">
          <span className="mb-2 text-xs font-medium tracking-widest text-violet-400/60 uppercase">
            Option B
          </span>
          <h2 className="text-center text-3xl font-bold text-violet-400 sm:text-4xl md:text-5xl">
            {currentQuestion.option_b}
          </h2>

          {/* Vote chips for Option B */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {results?.b_voters.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="inline-flex animate-in fade-in slide-in-from-bottom-2 items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-300"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {name}
              </span>
            ))}
          </div>
          <span className="mt-3 text-sm text-violet-400/60">
            {results?.b_count ?? 0} vote
            {(results?.b_count ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-border/20 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex size-2 rounded-full bg-accent animate-pulse" />
            Live
            {countdownStatus === 'advancing' && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Advancing…
              </span>
            )}
          </div>

          <div className="flex gap-3">
            {isLastQuestion && (
              <Button
                size="lg"
                variant="destructive"
                onClick={handleEndGame}
                disabled={countdownStatus === 'advancing'}
              >
                {countdownStatus === 'advancing' ? (
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
