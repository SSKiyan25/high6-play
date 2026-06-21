'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pusherClient } from '@/lib/pusher/client'
import { useVotes } from '../hooks/useVotes'
import type { TotQuestion, TotResults } from '../types'

interface HostViewProps {
  roomCode: string
  questions: TotQuestion[]
  initialIndex: number
  initialResults: TotResults | null
}

export function HostView({
  roomCode,
  questions,
  initialIndex,
  initialResults,
}: HostViewProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [advancing, setAdvancing] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const { results } = useVotes({
    roomCode,
    initialResults,
  })

  const currentQuestion = questions[currentIndex] ?? null
  const totalQuestions = questions.length
  const isLastQuestion = currentIndex >= totalQuestions - 1
  const progressPercent = totalQuestions > 0
    ? ((currentIndex + 1) / totalQuestions) * 100
    : 0

  const advance = useCallback(async () => {
    if (advancing) return
    const nextIndex = currentIndex + 1

    if (nextIndex >= totalQuestions) {
      // End game
      setAdvancing(true)
      try {
        await fetch('/api/games/this-or-that/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_code: roomCode }),
        })
      } catch {
        setAdvancing(false)
      }
      return
    }

    setAdvancing(true)
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
        setAdvancing(false)
      }, 300)
    } catch {
      setTransitioning(false)
      setAdvancing(false)
    }
  }, [advancing, currentIndex, totalQuestions, roomCode])

  const handleEndGame = useCallback(async () => {
    if (advancing) return
    setAdvancing(true)

    try {
      await fetch('/api/games/this-or-that/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode }),
      })
      // Redirect will happen via Pusher game-ended event
    } catch {
      setAdvancing(false)
    }
  }, [advancing, roomCode])

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
      {/* Progress bar */}
      <div className="px-6 pt-6">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <Progress value={progressPercent} className="h-1.5 flex-1" />
        </div>
      </div>

      {/* Question display */}
      <div
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8 transition-opacity duration-300',
          transitioning && 'opacity-30',
        )}
      >
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
            {results?.a_count ?? 0} vote{(results?.a_count ?? 0) !== 1 ? 's' : ''}
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
            {results?.b_count ?? 0} vote{(results?.b_count ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-border/20 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex size-2 rounded-full bg-accent animate-pulse" />
            Live
          </div>

          <div className="flex gap-3">
            {isLastQuestion ? (
              <Button
                size="lg"
                variant="destructive"
                onClick={handleEndGame}
                disabled={advancing}
              >
                {advancing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Ending…
                  </>
                ) : (
                  <>
                    End Game
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={advance}
                disabled={advancing}
              >
                {advancing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Advancing…
                  </>
                ) : (
                  <>
                    Next Question
                    <ArrowRight className="size-4" />
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
