'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, SkipForward, Loader2, Trophy, Users, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWordChain } from '../hooks/useWordChain'
import { useSharedAudio } from '@/features/shared/audio/AudioProvider'
import { useWordChainAudio } from '../hooks/useWordChainAudio'
import { DIFFICULTY_LABELS } from '../types'

interface WordChainPlayerViewProps {
  roomCode: string
  playerId: string
  nickname: string
}

export function WordChainPlayerView({ roomCode, playerId, nickname }: WordChainPlayerViewProps) {
  const router = useRouter()
  const {
    currentRoundNumber,
    roundStatus,
    category,
    roundPlayers,
    currentTurnPlayerId,
    currentTurnNickname,
    isMyTurn,
    myStatus,
    mySkipUsed,
    myScore,
    timePerPlayerSeconds,
    totalRounds,
    isGameOver,
    roundEnded,
    survivors,
    pointsAwarded,
    skipTurn,
    loading,
    error,
    bufferTimeLeft,
  } = useWordChain({ roomCode, playerId })

  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // ── Audio ────────────────────────────────────────────────────────────
  const [audioEnabled, setAudioEnabled] = useState(false)
  const engine = useSharedAudio()

  // Preload player-relevant assets (SFX only — no bgm/timer loops)
  useEffect(() => {
    if (!engine) return
    const base = '/audio/word-chain'
    Promise.all([
      engine.preload('skipped', `${base}/skipped.mp3`),
      engine.preload('eliminated', `${base}/eliminated.mp3`),
      engine.preload('passed', `${base}/passed.mp3`),
    ])
  }, [engine])

  useWordChainAudio({
    roomCode,
    engine,
    isHost: false,
    enabled: audioEnabled && !!engine,
    playerId,
  })

  // ── Timer state (client-side, syncs with host) ───────────────────────
  const [timeLeft, setTimeLeft] = useState(timePerPlayerSeconds)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset timer when turn changes
  useEffect(() => {
    if (isMyTurn && roundStatus === 'active') {
      setTimeLeft(timePerPlayerSeconds)
    }
  }, [isMyTurn, currentTurnPlayerId, timePerPlayerSeconds, roundStatus])

  // Countdown
  useEffect(() => {
    const shouldRun = isMyTurn && roundStatus === 'active'

    if (!shouldRun) {
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
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current)
            timerIntervalRef.current = null
          }
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
  }, [isMyTurn, roundStatus])

  // ── Actions ──────────────────────────────────────────────────────────
  const handleSkip = async () => {
    if (submitting || mySkipUsed) return
    setSubmitting(true)
    setActionError(null)
    try {
      await skipTurn()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to skip')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Navigate on game over ────────────────────────────────────────────
  useEffect(() => {
    if (isGameOver) {
      router.push(`/play/${roomCode}/wc-results`)
    }
  }, [isGameOver, roomCode, router])

  const timerUrgent = timeLeft <= 5 && isMyTurn && roundStatus === 'active'

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading game…</p>
      </main>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <p className="text-destructive text-center">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Round {currentRoundNumber}/{totalRounds}
            </span>
            {category && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  category.difficulty === 'easy' && 'border-emerald-500/30 text-emerald-400',
                  category.difficulty === 'moderate' && 'border-amber-500/30 text-amber-400',
                  category.difficulty === 'difficult' && 'border-red-500/30 text-red-400',
                )}
              >
                {DIFFICULTY_LABELS[category.difficulty]}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Mute toggle — one-shot SFX only, default off */}
            <button
              onClick={() => {
                if (!audioEnabled) {
                  engine?.unlock() // gesture-gated AudioContext resume
                }
                setAudioEnabled((prev) => !prev)
              }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                audioEnabled
                  ? 'text-foreground hover:bg-accent/20'
                  : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/10',
              )}
              aria-label={audioEnabled ? 'Mute sounds' : 'Unmute sounds'}
              title={audioEnabled ? 'Mute sounds' : 'Unmute sounds'}
            >
              {audioEnabled ? (
                <Volume2 className="size-4" />
              ) : (
                <VolumeX className="size-4" />
              )}
            </button>
            <span className="text-xs text-muted-foreground">{nickname}</span>
            <Badge variant="secondary" className="text-xs">
              {myScore} pts
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Main Area ────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6">
        {/* Category */}
        {category && (
          <div className="text-center">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Category
            </p>
            <h1 className="mt-1 text-3xl font-bold">{category.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {category.points} pt{category.points !== 1 ? 's' : ''} for surviving this round
            </p>
          </div>
        )}

        {/* ── Buffer Countdown ──────────────────────────────────────── */}
        {bufferTimeLeft > 0 && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-6 py-5 text-center">
              <p className="text-sm font-medium tracking-widest text-violet-400 uppercase">
                Get Ready!
              </p>
              <span className="mt-2 block font-mono text-5xl font-bold text-violet-400 tabular-nums">
                {bufferTimeLeft}
              </span>
              <p className="mt-2 text-sm text-muted-foreground">
                Round starting in {bufferTimeLeft}s
              </p>
            </div>

            {/* Show who goes first */}
            {currentTurnNickname && (
              <p className="text-sm text-muted-foreground text-center">
                <span className="font-semibold text-foreground">
                  {currentTurnPlayerId === playerId ? 'You' : currentTurnNickname}
                </span>
                {' '}go{currentTurnPlayerId === playerId ? '' : 'es'} first
              </p>
            )}
          </div>
        )}

        {/* ── Round Ended State ─────────────────────────────────────── */}
        {roundEnded && (
          <div className="w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div
              className={cn(
                'rounded-2xl border p-6 text-center',
                myStatus === 'survivor'
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-red-500/20 bg-red-500/5',
              )}
            >
              {myStatus === 'survivor' ? (
                <>
                  <Trophy className="size-10 text-emerald-400 mx-auto mb-2" />
                  <h2 className="text-xl font-bold text-emerald-300">You Survived!</h2>
                  <p className="mt-1 text-emerald-400/70">
                    +{pointsAwarded} point{pointsAwarded !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-red-300">Eliminated</h2>
                  <p className="mt-1 text-muted-foreground">Better luck next round</p>
                </>
              )}
            </div>

            {survivors && (
              <div className="rounded-xl border border-border/20 bg-card/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="size-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Survivors</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {survivors.map((s) => (
                    <Badge
                      key={s.player_id}
                      className={cn(
                        'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
                        s.player_id === playerId && 'border-emerald-400/60 bg-emerald-500/30',
                      )}
                    >
                      {s.nickname}
                      {s.player_id === playerId ? ' (You)' : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Waiting for host to start the next round…
            </p>
          </div>
        )}

        {/* ── Active Round — Not My Turn ────────────────────────────── */}
        {!roundEnded && !isMyTurn && roundStatus === 'active' && (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            {/* Current turn indicator */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {currentTurnNickname ? (
                  <>
                    <span className="font-semibold text-foreground">
                      {currentTurnNickname}
                    </span>
                    {currentTurnPlayerId === playerId ? ' (You)' : ''}
                    &apos;s turn
                  </>
                ) : (
                  'Waiting…'
                )}
              </p>
            </div>

            {/* Timer pill (watching) */}
            <div className="flex items-center gap-2 rounded-full border border-border/30 bg-card/40 px-4 py-2">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {myStatus === 'skipped_this_cycle'
                  ? 'You skipped — waiting for next cycle'
                  : myStatus === 'eliminated'
                    ? 'You were eliminated this round'
                    : 'Wait for your turn'}
              </span>
            </div>

            {/* Turn order mini-view */}
            <div className="w-full space-y-1">
              <p className="text-xs font-medium text-muted-foreground text-center">
                Turn Order
              </p>
              {roundPlayers.map((rp) => {
                const isCurrent = rp.player_id === currentTurnPlayerId
                const isMe = rp.player_id === playerId
                return (
                  <div
                    key={rp.player_id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                      isCurrent && 'border-accent/40 bg-accent/10',
                      rp.status === 'eliminated' && 'opacity-40',
                      isMe && 'border-primary/30 bg-primary/5',
                    )}
                  >
                    <div
                      className={cn(
                        'size-2 rounded-full',
                        rp.status === 'active' && 'bg-emerald-500',
                        rp.status === 'skipped_this_cycle' && 'bg-amber-500',
                        rp.status === 'eliminated' && 'bg-red-500/50',
                        rp.status === 'survivor' && 'bg-emerald-400',
                      )}
                    />
                    <span className="flex-1 truncate">
                      {rp.nickname}
                      {isMe ? ' (You)' : ''}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-medium text-accent animate-pulse">
                        Now
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Active Round — My Turn ────────────────────────────────── */}
        {!roundEnded && isMyTurn && roundStatus === 'active' && myStatus !== 'eliminated' && (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            {/* Your turn banner */}
            <div className="rounded-xl border border-accent/40 bg-accent/10 px-6 py-4 text-center w-full">
              <h2 className="text-xl font-bold text-accent">Your Turn!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Think of something related to &ldquo;{category?.name}&rdquo;
              </p>
            </div>

            {/* Timer */}
            <div
              className={cn(
                'flex flex-col items-center gap-2 rounded-2xl border px-8 py-5 transition-all duration-500 w-full',
                timerUrgent
                  ? 'border-red-500/60 bg-red-500/10'
                  : 'border-border/30 bg-card/40',
              )}
            >
              <div className="flex items-center gap-3">
                <Clock
                  className={cn(
                    'size-6 transition-colors duration-300',
                    timerUrgent ? 'text-red-400' : 'text-muted-foreground',
                  )}
                />
                <span
                  className={cn(
                    'font-mono text-4xl font-bold tabular-nums transition-colors duration-300',
                    timerUrgent ? 'text-red-400' : 'text-foreground',
                  )}
                >
                  {timeLeft}s
                </span>
              </div>
              <Progress
                value={(timeLeft / timePerPlayerSeconds) * 100}
                className={cn(
                  'w-full h-1.5 transition-colors duration-500',
                  timerUrgent ? '[&>div]:bg-red-500' : '',
                )}
              />
            </div>

            {/* Action button */}
            <div className="flex w-full">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-16"
                onClick={handleSkip}
                disabled={submitting || mySkipUsed}
                title={mySkipUsed ? 'Skip already used this round' : 'Skip your turn'}
              >
                {submitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : mySkipUsed ? (
                  <span className="text-sm text-muted-foreground">Skip Used</span>
                ) : (
                  <>
                    <SkipForward className="size-5" />
                    Skip Turn
                  </>
                )}
              </Button>
            </div>

            {mySkipUsed && (
              <p className="text-xs text-muted-foreground">
                You&apos;ve used your skip this round
              </p>
            )}

            {actionError && (
              <p className="text-sm text-destructive text-center" role="alert">
                {actionError}
              </p>
            )}
          </div>
        )}

        {/* ── Eliminated (active round, watching) ───────────────────── */}
        {!roundEnded && myStatus === 'eliminated' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-4">
              <h2 className="text-lg font-bold text-red-300">Eliminated</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You ran out of time. Waiting for the round to end…
              </p>
            </div>

            {/* Mini turn order */}
            <div className="w-full max-w-sm space-y-1">
              {roundPlayers.map((rp) => {
                const isCurrent = rp.player_id === currentTurnPlayerId
                const isMe = rp.player_id === playerId
                return (
                  <div
                    key={rp.player_id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
                      isCurrent && 'border-accent/40 bg-accent/10',
                      rp.status === 'eliminated' && 'opacity-40',
                      isMe && 'border-red-500/30 bg-red-500/5',
                    )}
                  >
                    <div
                      className={cn(
                        'size-2 rounded-full',
                        rp.status === 'active' && 'bg-emerald-500',
                        rp.status === 'eliminated' && 'bg-red-500/50',
                      )}
                    />
                    <span className="flex-1 truncate">
                      {rp.nickname}
                      {isMe ? ' (You)' : ''}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-medium text-accent">Now</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
