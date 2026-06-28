'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Eye, EyeOff, MessageCircle, ShieldAlert, Clock, Trophy, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTopicImageUrl } from '@/lib/supabase/storage'
import { createClient } from '@/lib/supabase/client'
import { useMoleHunt } from '../hooks/useMoleHunt'
import type { MolePhase } from '../types'

interface PlayerViewProps {
  roomCode: string
  playerId: string
  playerNickname: string
}

export function PlayerView({ roomCode, playerId, playerNickname }: PlayerViewProps) {
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
    scoresUpdated,
    isGameOver,
    timeLeft,
    timerTotal,
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

  // ── Round leaderboard (shows after scores update in reveal) ──────────
  interface LeaderboardRow {
    player_id: string
    nickname: string
    total_points: number
  }
  const [roundScores, setRoundScores] = useState<LeaderboardRow[] | null>(null)
  const [scoresLoading, setScoresLoading] = useState(false)

  // ── Outcome toast (contextual phrase after reveal) ──────────────────
  const [outcomeToast, setOutcomeToast] = useState<{
    phrase: string
    color: 'green' | 'amber' | 'violet' | 'red' | 'teal'
  } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset vote state when round changes
  const prevRoundRef = useRef(currentRoundId)
  useEffect(() => {
    if (currentRoundId !== prevRoundRef.current) {
      prevRoundRef.current = currentRoundId
      setVoted(false)
      setMyVote(null)
      setVoteError(null)
      setRoundScores(null)
      setOutcomeToast(null)
    }
  }, [currentRoundId])

  // ── Fetch round leaderboard on scores-updated during reveal ─────────
  useEffect(() => {
    if (!scoresUpdated || currentPhase !== 'reveal' || !roomCode) return

    const fetchScores = async () => {
      setScoresLoading(true)
      try {
        const supabase = createClient()
        const { data: room } = await supabase
          .from('rooms')
          .select('id')
          .eq('code', roomCode)
          .single()

        if (!room) return

        const { data: scores } = await supabase
          .from('mole_scores')
          .select('player_id, total_points, players!inner(nickname)')
          .eq('room_id', room.id)
          .order('total_points', { ascending: false })

        if (scores) {
          setRoundScores(
            scores.map((s: any) => ({
              player_id: s.player_id,
              nickname: s.players?.nickname ?? 'Unknown',
              total_points: s.total_points ?? 0,
            })),
          )
        }
      } catch {
        // Non-critical — leaderboard fetch is best-effort
      } finally {
        setScoresLoading(false)
      }
    }

    fetchScores()
  }, [scoresUpdated, currentPhase, roomCode])

  // ── Show outcome toast after reveal + scores ───────────────────────
  useEffect(() => {
    if (currentPhase !== 'reveal' || !scoresUpdated) return

    const choice = correctChoice ?? topic?.correct_choice ?? null
    const phrase = getOutcomePhrase(myRole, myVote, choice, voted)
    if (!phrase) return

    setOutcomeToast(phrase)

    // Auto-dismiss after 3.5s
    toastTimerRef.current = setTimeout(() => {
      setOutcomeToast(null)
    }, 3500)

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
        toastTimerRef.current = null
      }
    }
  }, [currentPhase, scoresUpdated, currentRoundId])

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

  // ── Role-aware reveal outcome ──────────────────────────────────────
  // Use hook's correctChoice (from round.correct_choice, authoritative) when available.
  const authoritativeCorrect = correctChoice ?? topic?.correct_choice ?? null
  // For Moles, voting "wrong" is success (stayed in character).
  // For Crew/Canary, voting correctly is success.
  const revealOutcome = getRevealOutcome(myRole, myVote, authoritativeCorrect, voted)

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

      {/* ── Round indicator + Timer ────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-2">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Round {currentRoundNumber}
            </p>
            <span className="text-xs text-muted-foreground/50">·</span>
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
              {playerNickname}
            </span>
          </div>

          {/* Timer (discuss + vote phases) */}
          {(currentPhase === 'discuss' || currentPhase === 'vote') && timerTotal > 0 && (
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors duration-300',
                timeLeft <= 10
                  ? 'border-red-500/60 bg-red-500/10'
                  : 'border-border/30 bg-card/40',
              )}
              role="timer"
              aria-live="polite"
              aria-label={`${timeLeft} seconds remaining`}
            >
              <Clock
                className={cn(
                  'size-3.5 transition-colors duration-300',
                  timeLeft <= 10 ? 'text-red-400' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'font-mono text-sm font-bold tabular-nums transition-colors duration-300',
                  timeLeft <= 10 ? 'text-red-400' : 'text-foreground',
                )}
              >
                {timeLeft}s
              </span>
            </div>
          )}
        </div>
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
            {/* Role-aware outcome badge */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border px-5 py-2 animate-in fade-in zoom-in-50 duration-300',
                revealOutcome.style,
              )}
            >
              {revealOutcome.icon && (
                <revealOutcome.icon className="size-4" />
              )}
              <span className="font-semibold">{revealOutcome.label}</span>
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

            {/* Why this is correct */}
            {topic?.correct_answer_why && (
              <div className="mt-2 rounded-lg border border-accent/20 bg-accent/5 p-3 max-w-md text-center">
                <p className="text-xs font-medium text-accent/70 uppercase tracking-wider mb-1">
                  Why this is correct
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {topic.correct_answer_why}
                </p>
              </div>
            )}

            {/* ── Round Leaderboard ────────────────────────────────── */}
            {scoresLoading && (
              <div className="flex items-center gap-2 mt-3">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Loading standings…
                </span>
              </div>
            )}

            {!scoresLoading && roundScores && roundScores.length > 0 && (
              <div className="mt-4 w-full max-w-xs space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  <Trophy className="size-3" />
                  Current Standings
                </div>
                {roundScores.map((s, i) => (
                  <div
                    key={s.player_id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm',
                      i === 0 && 'border-yellow-500/30 bg-yellow-500/10',
                      i === 1 && 'border-slate-400/30 bg-slate-400/10',
                      i === 2 && 'border-amber-700/30 bg-amber-700/10',
                      i >= 3 && 'border-border/20 bg-card/30',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-bold tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="truncate max-w-[120px]">
                        {s.nickname}
                        {s.player_id === playerId && (
                          <span className="ml-1 text-[10px] font-medium text-accent">
                            (You)
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums">{s.total_points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Outcome Toast Overlay ─────────────────────────────────────── */}
      {outcomeToast && (
        <div
          className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-4 fade-in duration-300"
          onClick={() => setOutcomeToast(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setOutcomeToast(null)
          }}
        >
          {(() => {
            const colorStyles = {
              green:
                'border-accent/40 bg-accent/10 text-accent',
              amber:
                'border-amber-500/40 bg-amber-500/10 text-amber-300',
              violet:
                'border-violet-500/40 bg-violet-500/10 text-violet-300',
              red: 'border-destructive/40 bg-destructive/10 text-destructive',
              teal: 'border-teal-500/40 bg-teal-500/10 text-teal-300',
            }
            return (
              <div
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-lg backdrop-blur-md cursor-pointer max-w-sm',
                  colorStyles[outcomeToast.color],
                )}
              >
                <span className="text-sm font-medium leading-snug">
                  {outcomeToast.phrase}
                </span>
                <X className="size-4 shrink-0 opacity-60" />
              </div>
            )
          })()}
        </div>
      )}
    </main>
  )
}

// ── Reveal Outcome (role-aware badge) ──────────────────────────────────

interface RevealOutcome {
  label: string
  style: string
  icon: React.ComponentType<{ className?: string }> | null
}

function getRevealOutcome(
  role: string | null,
  myVote: 'a' | 'b' | null,
  correctChoice: 'a' | 'b' | null,
  voted: boolean,
): RevealOutcome {
  if (!voted || myVote === null) {
    return {
      label: 'You did not vote this round',
      style: 'border-border/30 bg-card/40 text-muted-foreground',
      icon: null,
    }
  }

  const votedCorrectly = myVote === correctChoice

  if (role === 'mole') {
    // Mole voting "wrong" = staying in character = SUCCESS
    return votedCorrectly
      ? {
          label: 'Broke Character',
          style: 'border-destructive/40 bg-destructive/10 text-destructive',
          icon: null,
        }
      : {
          label: 'In Character',
          style: 'border-accent/40 bg-accent/10 text-accent',
          icon: Check,
        }
  }

  // Crew / Canary
  return votedCorrectly
    ? {
        label: 'Correct!',
        style: 'border-accent/40 bg-accent/10 text-accent',
        icon: Check,
      }
    : {
        label: 'Wrong',
        style: 'border-destructive/40 bg-destructive/10 text-destructive',
        icon: null,
      }
}

// ── Outcome Phrase Helper ──────────────────────────────────────────────

interface OutcomeToast {
  phrase: string
  color: 'green' | 'amber' | 'violet' | 'red' | 'teal'
}

function getOutcomePhrase(
  role: string | null,
  myVote: 'a' | 'b' | null,
  correctChoice: 'a' | 'b' | null,
  voted: boolean,
): OutcomeToast | null {
  if (!role) return null

  const votedCorrectly = myVote !== null && myVote === correctChoice

  // Color mapping mirrors the reveal badge: green = success for your role,
  // red = failure (mole broke character, crew got tricked).
  switch (role) {
    case 'crew':
      if (!voted) return { phrase: 'You stayed quiet. Jump in next round!', color: 'amber' }
      return votedCorrectly
        ? { phrase: 'Nice read! You saw through the deception.', color: 'green' }
        : { phrase: 'They got you this round. Trust your instincts next time.', color: 'red' }
    case 'mole':
      if (!voted) return { phrase: 'Silent mole… interesting strategy.', color: 'amber' }
      return votedCorrectly
        ? { phrase: "You broke character. That'll cost you.", color: 'red' }
        : { phrase: 'Smooth. They never saw it coming.', color: 'green' }
    case 'canary':
      return { phrase: "You spoke up blind — that takes guts.", color: 'teal' }
    default:
      return null
  }
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
