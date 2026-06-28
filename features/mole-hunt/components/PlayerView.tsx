'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Eye, EyeOff, MessageCircle, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTopicImageUrl } from '@/lib/supabase/storage'
import { useMoleHunt } from '../hooks/useMoleHunt'
import type { MolePhase } from '../types'

interface PlayerViewProps {
  roomCode: string
  playerId: string
}

export function PlayerView({ roomCode, playerId }: PlayerViewProps) {
  const router = useRouter()

  const {
    currentRoundId,
    currentRoundNumber,
    currentPhase,
    myRole,
    topic,
    correctChoice,
    moleArgument,
    voteProgress,
    isGameOver,
    submitVote,
    loading,
    error,
  } = useMoleHunt({ roomCode, playerId })

  // ── Redirect to results on game-ended ────────────────────────────
  useEffect(() => {
    if (isGameOver && roomCode) {
      router.push(`/play/${roomCode}/mh-results`)
    }
  }, [isGameOver, roomCode, router])

  const [voted, setVoted] = useState(false)
  const [myVote, setMyVote] = useState<'a' | 'b' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)

  // Reset vote state when round changes
  const prevRoundRef = useRef(currentRoundId)
  useEffect(() => {
    if (currentRoundId !== prevRoundRef.current) {
      prevRoundRef.current = currentRoundId
      setVoted(false)
      setMyVote(null)
      setVoteError(null)
    }
  }, [currentRoundId])

  const handleVote = useCallback(
    async (choice: 'a' | 'b') => {
      if (voted || submitting || currentPhase !== 'vote') return
      setSubmitting(true)
      setVoteError(null)
      setMyVote(choice)

      try {
        await submitVote(choice)
        setVoted(true)
      } catch (err) {
        setMyVote(null)
        setVoteError(
          err instanceof Error ? err.message : 'Failed to submit vote',
        )
      } finally {
        setSubmitting(false)
      }
    },
    [voted, submitting, currentPhase, submitVote],
  )

  // ── Game Over Screen ──────────────────────────────────────────────
  if (isGameOver) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-6">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <Check className="size-10 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Game Over!</h1>
          <p className="mt-2 text-muted-foreground">
            Check the host screen for final scores.
          </p>
        </div>
      </main>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (loading && !topic) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading round…</p>
      </main>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <p className="text-muted-foreground">{error}</p>
      </main>
    )
  }

  // ── No topic yet ──────────────────────────────────────────────────
  if (!topic) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Waiting for the host…</p>
      </main>
    )
  }

  // ── Assigning Phase ───────────────────────────────────────────────
  if (currentPhase === 'assigning') {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-6">
        <Loader2 className="size-10 animate-spin text-primary" />
        <div className="text-center">
          <h1 className="text-xl font-bold">Preparing next round…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Roles are being assigned
          </p>
        </div>
      </main>
    )
  }

  const isCorrect =
    myVote !== null && topic ? myVote === topic.correct_choice : null

  return (
    <main className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* ── Mole Role Banner (discuss phase, persistent) ─────────── */}
      {currentPhase === 'discuss' && myRole === 'mole' && (
        <div className="flex-shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-6 py-4">
          <div className="mx-auto flex max-w-2xl items-start gap-3">
            <EyeOff className="mt-0.5 size-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-400">
                You are the <span className="uppercase">Mole</span>
              </p>
              <p className="mt-1 text-sm text-amber-300/80">
                The correct answer is:{' '}
                <span className="font-bold">
                  {correctChoice === 'a' ? topic.option_a : topic.option_b}
                </span>
              </p>
              {moleArgument && (
                <p className="mt-1 text-sm text-amber-300/60">
                  Your argument: {moleArgument}
                </p>
              )}
              <p className="mt-2 text-xs text-amber-400/50">
                Your goal: steer the group away from the correct answer without
                getting caught.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Canary Role Banner (discuss phase, persistent) ────────── */}
      {currentPhase === 'discuss' && myRole === 'canary' && (
        <div className="flex-shrink-0 border-b border-teal-500/30 bg-teal-500/10 px-6 py-4">
          <div className="mx-auto flex max-w-2xl items-start gap-3">
            <MessageCircle className="mt-0.5 size-5 shrink-0 text-teal-400" />
            <div>
              <p className="font-semibold text-teal-400">
                You are the <span className="uppercase">Canary</span>
              </p>
              <p className="mt-1 text-sm text-teal-300/80">
                You must speak up — share your instinct with the group! The Mole
                wants them to pick wrong. Your voice could be the difference.
              </p>
              <p className="mt-2 text-xs text-teal-400/50">
                You do not know the correct answer. Trust your gut.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Crew Status (discuss phase) ────────────────────────────── */}
      {currentPhase === 'discuss' && myRole === 'crew' && (
        <div className="flex-shrink-0 border-b border-border/20 bg-card/30 px-6 py-3">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <Eye className="size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Listen and discuss with the group. Someone might be trying to
              mislead you.
            </p>
          </div>
        </div>
      )}

      {/* ── Round indicator ────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-2 text-center">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Round {currentRoundNumber}
        </p>
      </div>

      {/* ── Topic Card ─────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {/* Topic info */}
          <div className="rounded-2xl border border-border/20 bg-card/60 px-6 py-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold sm:text-2xl">{topic.title}</h2>
            {topic.blurb && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {topic.blurb}
              </p>
            )}
            {(() => {
              const imageSrc = getTopicImageUrl(topic.image_url)
              return imageSrc ? (
                <div className="mt-4 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt={topic.title}
                    className="w-full object-cover"
                  />
                </div>
              ) : null
            })()}
          </div>

          {/* ── Options Display ─────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {/* Option A */}
            <OptionCard
              label="Option A"
              text={topic.option_a}
              color="blue"
              isCorrect={currentPhase === 'reveal' ? topic.correct_choice === 'a' : null}
              isMyVote={myVote === 'a'}
              onClick={() => handleVote('a')}
              disabled={voted || submitting || currentPhase !== 'vote'}
              showVoteButton={currentPhase === 'vote'}
              voted={voted}
              submitting={submitting}
            />

            {/* VS divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="absolute inset-x-0 top-1/2 h-px bg-border/20" />
              <span className="relative z-10 bg-[#0a0a0a] px-4 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                OR
              </span>
            </div>

            {/* Option B */}
            <OptionCard
              label="Option B"
              text={topic.option_b}
              color="violet"
              isCorrect={currentPhase === 'reveal' ? topic.correct_choice === 'b' : null}
              isMyVote={myVote === 'b'}
              onClick={() => handleVote('b')}
              disabled={voted || submitting || currentPhase !== 'vote'}
              showVoteButton={currentPhase === 'vote'}
              voted={voted}
              submitting={submitting}
            />
          </div>
        </div>
      </div>

      {/* ── Vote Progress / Status Footer ─────────────────────────── */}
      {currentPhase === 'vote' && (
        <div className="flex-shrink-0 border-t border-border/20 px-6 py-4">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3">
            {/* Vote error */}
            {voteError && (
              <p className="text-sm text-destructive">{voteError}</p>
            )}

            {/* Submit loading */}
            {submitting && (
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Submitting vote…
                </span>
              </div>
            )}

            {/* Voted confirmation */}
            {voted && !submitting && (
              <div className="flex flex-col items-center gap-1 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5">
                  <Check className="size-4 text-accent" />
                  <span className="text-sm font-medium text-accent">
                    Vote submitted
                  </span>
                </div>
                {voteProgress && (
                  <p className="text-xs text-muted-foreground">
                    {voteProgress.votedCount} of {voteProgress.totalPlayers}{' '}
                    voted
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reveal Phase: Personal Result ──────────────────────────── */}
      {currentPhase === 'reveal' && (
        <div className="flex-shrink-0 border-t border-border/20 px-6 py-4">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3">
            {/* Correct/Wrong badge */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border px-5 py-2 animate-in fade-in zoom-in-50 duration-300',
                isCorrect === true &&
                  'border-accent/40 bg-accent/10 text-accent',
                isCorrect === false &&
                  'border-destructive/40 bg-destructive/10 text-destructive',
                isCorrect === null &&
                  'border-border/30 bg-card/40 text-muted-foreground',
              )}
            >
              {isCorrect === true && <Check className="size-4" />}
              {isCorrect === true && (
                <span className="font-semibold">Correct!</span>
              )}
              {isCorrect === false && <span className="font-semibold">Wrong</span>}
              {isCorrect === null && (
                <span>You did not vote this round</span>
              )}
            </div>

            {/* Role reveal */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldAlert className="size-4" />
              <span>
                Your role this round:{' '}
                <span className="font-semibold capitalize text-foreground">
                  {myRole}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ── Option Card Sub-component ─────────────────────────────────────────

interface OptionCardProps {
  label: string
  text: string
  color: 'blue' | 'violet'
  isCorrect: boolean | null
  isMyVote: boolean
  onClick: () => void
  disabled: boolean
  showVoteButton: boolean
  voted: boolean
  submitting: boolean
}

function OptionCard({
  label,
  text,
  color,
  isCorrect,
  isMyVote,
  onClick,
  disabled,
  showVoteButton,
  voted,
  submitting,
}: OptionCardProps) {
  const colorClasses = {
    blue: {
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/5',
      hover: 'hover:bg-blue-500/10',
      active: 'active:bg-blue-500/20',
      selected: 'border-blue-500 bg-blue-500/20 ring-4 ring-blue-500/20',
      label: 'text-blue-400/60',
      text: 'text-blue-400',
      badge: 'bg-blue-500/20 text-blue-300',
    },
    violet: {
      border: 'border-violet-500/30',
      bg: 'bg-violet-500/5',
      hover: 'hover:bg-violet-500/10',
      active: 'active:bg-violet-500/20',
      selected: 'border-violet-500 bg-violet-500/20 ring-4 ring-violet-500/20',
      label: 'text-violet-400/60',
      text: 'text-violet-400',
      badge: 'bg-violet-500/20 text-violet-300',
    },
  }

  const c = colorClasses[color]

  // Correct answer highlight (reveal phase)
  const correctHighlight =
    isCorrect === true
      ? 'border-accent/60 bg-accent/10 ring-2 ring-accent/20'
      : ''

  // Dim wrong answer in reveal
  const dimmed =
    isCorrect === false ? 'opacity-50' : ''

  const isClickable = showVoteButton && !disabled

  const content = (
    <div
      className={cn(
        'relative flex flex-col items-center gap-3 rounded-2xl border-2 px-6 py-6 transition-all duration-300 sm:px-8 sm:py-8',
        c.border,
        c.bg,
        isClickable && cn(c.hover, c.active, 'cursor-pointer'),
        voted && isMyVote && c.selected,
        voted && !isMyVote && 'opacity-50',
        correctHighlight,
        dimmed,
      )}
      style={{ minHeight: '20vh' }}
    >
      <span
        className={cn(
          'text-xs font-medium tracking-widest uppercase',
          c.label,
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-center text-xl font-bold sm:text-2xl md:text-3xl',
          c.text,
        )}
      >
        {text}
      </span>

      {/* Correct answer badge (reveal) */}
      {isCorrect === true && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-accent animate-in fade-in zoom-in-50 duration-200">
          <Check className="size-3.5" />
          Correct Answer
        </span>
      )}

      {/* My vote badge */}
      {voted && isMyVote && (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium animate-in fade-in zoom-in-50 duration-200', c.badge)}>
          <Check className="size-3.5" />
          Your pick
        </span>
      )}

      {/* Hidden vote button (accessibility + tap target) */}
      {isClickable && (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Vote for ${label}: ${text}`}
        />
      )}
    </div>
  )

  return content
}
