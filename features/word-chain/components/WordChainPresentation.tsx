'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Clock, Loader2, Trophy, CheckCircle2, XCircle, ArrowRight, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pusherClient } from '@/lib/pusher/client'
import { createClient } from '@/lib/supabase/client'
import type { WordChainCategory, WordChainDifficulty } from '../types'
import { DIFFICULTY_LABELS } from '../types'

interface WordChainPresentationProps {
  roomCode: string
  roomId: string
  initialRound: {
    id: string
    round_number: number
    category_id: string
    turn_order: string[]
    current_turn_player_id: string | null
    status: string
  } | null
  initialCategory: WordChainCategory | null
  timePerPlayerSeconds: number
  totalRounds: number
  players: { id: string; nickname: string }[]
}

interface TurnPlayer {
  player_id: string
  nickname: string
  status: 'active' | 'skipped_this_cycle' | 'eliminated' | 'survivor'
  skip_used: boolean
}

const STATUS_COLORS: Record<string, string> = {
  active: 'border-border/20 bg-card/40 text-foreground',
  skipped_this_cycle: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  eliminated: 'border-red-500/20 bg-red-500/5 text-muted-foreground line-through',
  survivor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
}

const STATUS_LABELS: Record<string, string> = {
  active: '',
  skipped_this_cycle: 'Skipped',
  eliminated: 'Eliminated',
  survivor: 'Survivor',
}

export function WordChainPresentation({
  roomCode,
  roomId,
  initialRound,
  initialCategory,
  timePerPlayerSeconds,
  totalRounds,
  players,
}: WordChainPresentationProps) {
  const router = useRouter()
  const supabase = createClient()

  // ── State ──────────────────────────────────────────────────────────
  const [roundId, setRoundId] = useState<string | null>(initialRound?.id ?? null)
  const [roundNumber, setRoundNumber] = useState(initialRound?.round_number ?? 1)
  const [roundStatus, setRoundStatus] = useState(initialRound?.status ?? 'active')
  const [category, setCategory] = useState<WordChainCategory | null>(initialCategory)
  const [turnPlayers, setTurnPlayers] = useState<TurnPlayer[]>([])
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(
    initialRound?.current_turn_player_id ?? null,
  )
  const [timerSeconds, setTimerSeconds] = useState(timePerPlayerSeconds)
  const [timeLeft, setTimeLeft] = useState(timePerPlayerSeconds)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerExpired, setTimerExpired] = useState(false)

  // Round ended state
  const [roundEnded, setRoundEnded] = useState(false)
  const [survivors, setSurvivors] = useState<{ player_id: string; nickname: string }[] | null>(null)
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null)

  // Game over
  const [isGameOver, setIsGameOver] = useState(false)
  const [leaderboard, setLeaderboard] = useState<{ player_id: string; nickname: string; total_points: number }[] | null>(null)
  const [advancingRound, setAdvancingRound] = useState(false)
  const [endingGame, setEndingGame] = useState(false)
  const [forceEndOpen, setForceEndOpen] = useState(false)
  const [advanceError, setAdvanceError] = useState<string | null>(null)
  const [hostSubmitting, setHostSubmitting] = useState(false)

  // Buffer state
  const [bufferTimeLeft, setBufferTimeLeft] = useState(0)
  const bufferIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Refs
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playerMap = useRef(new Map(players.map((p) => [p.id, p.nickname])))

  // ── Build turn player list from turn_order + round_players ────────
  const buildTurnPlayers = useCallback(
    async (rid: string, order: string[]) => {
      const { data: rps } = await supabase
        .from('wc_round_players')
        .select('player_id, status, skip_used')
        .eq('round_id', rid)

      const statusMap = new Map(
        (rps ?? []).map((rp) => [rp.player_id, { status: rp.status, skip_used: rp.skip_used }]),
      )

      const result: TurnPlayer[] = order.map((pid) => ({
        player_id: pid,
        nickname: playerMap.current.get(pid) ?? 'Unknown',
        status: (statusMap.get(pid)?.status ?? 'active') as TurnPlayer['status'],
        skip_used: statusMap.get(pid)?.skip_used ?? false,
      }))

      setTurnPlayers(result)
    },
    [supabase],
  )

  // ── Fetch leaderboard on game over ──────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data: scores } = await supabase
        .from('wc_scores')
        .select('player_id, points, wc_rounds!inner(room_id)')
        .eq('wc_rounds.room_id', roomId)

      const totals = new Map<string, number>()
      for (const s of scores ?? []) {
        totals.set(s.player_id, (totals.get(s.player_id) ?? 0) + (s.points ?? 0))
      }

      // Include all players
      for (const p of players) {
        if (!totals.has(p.id)) totals.set(p.id, 0)
      }

      const lb = Array.from(totals.entries())
        .map(([player_id, total_points]) => ({
          player_id,
          nickname: playerMap.current.get(player_id) ?? 'Unknown',
          total_points,
        }))
        .sort((a, b) => b.total_points - a.total_points)

      setLeaderboard(lb)
    } catch {
      // Non-critical
    }
  }, [supabase, roomId, players])

  // ── Initial setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (initialRound) {
      buildTurnPlayers(initialRound.id, initialRound.turn_order)
      if (initialRound.current_turn_player_id) {
        // 5-second buffer before first turn on initial load (matches Pusher round-started)
        setTimerRunning(false)
        setBufferTimeLeft(5)
        bufferIntervalRef.current = setInterval(() => {
          setBufferTimeLeft((prev) => {
            const next = prev - 1
            if (next <= 0) {
              if (bufferIntervalRef.current) {
                clearInterval(bufferIntervalRef.current)
                bufferIntervalRef.current = null
              }
              setTimerRunning(true)
              return 0
            }
            return next
          })
        }, 1000)
        setTimeLeft(timePerPlayerSeconds)
      }
    }
  }, [initialRound, timePerPlayerSeconds, buildTurnPlayers])

  // ── Pusher subscription ────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return

    const channel = pusherClient.subscribe(`room-${roomCode}-game`)

    channel.bind(
      'round-started',
      (data: {
        roundNumber: number
        roundId: string
        categoryId: string
        categoryName: string
        difficulty: string
        points: number
        turnOrder: string[]
        currentPlayerId: string
        currentPlayerNickname: string
        timePerPlayerSeconds: number
        totalRounds: number
        bufferSeconds?: number
      }) => {
        // Clear any existing buffer interval
        if (bufferIntervalRef.current) {
          clearInterval(bufferIntervalRef.current)
          bufferIntervalRef.current = null
        }

        setRoundId(data.roundId)
        setRoundNumber(data.roundNumber)
        setRoundStatus('active')
        setRoundEnded(false)
        setSurvivors(null)
        setPointsAwarded(null)
        setCurrentTurnPlayerId(data.currentPlayerId)
        setTimerSeconds(data.timePerPlayerSeconds)
        setTimeLeft(data.timePerPlayerSeconds)
        setTimerExpired(false)

        setCategory({
          id: data.categoryId,
          name: data.categoryName,
          difficulty: data.difficulty as WordChainCategory['difficulty'],
          points: data.points as 1 | 2 | 3,
          created_at: '',
        })

        buildTurnPlayers(data.roundId, data.turnOrder)

        // Start buffer countdown if bufferSeconds provided
        const buffer = data.bufferSeconds ?? 0
        if (buffer > 0) {
          setTimerRunning(false)
          setBufferTimeLeft(buffer)

          bufferIntervalRef.current = setInterval(() => {
            setBufferTimeLeft((prev) => {
              const next = prev - 1
              if (next <= 0) {
                if (bufferIntervalRef.current) {
                  clearInterval(bufferIntervalRef.current)
                  bufferIntervalRef.current = null
                }
                setTimerRunning(true)
                return 0
              }
              return next
            })
          }, 1000)
        } else {
          setTimerRunning(true)
          setBufferTimeLeft(0)
        }
      },
    )

    channel.bind(
      'turn-advanced',
      (data: {
        roundId: string
        previousPlayerId: string
        previousPlayerNickname: string
        currentPlayerId: string | null
        currentPlayerNickname: string | null
        activePlayerCount: number
      }) => {
        setCurrentTurnPlayerId(data.currentPlayerId)
        if (data.currentPlayerId) {
          setTimeLeft(timerSeconds)
          setTimerRunning(true)
          setTimerExpired(false)
        }

        // Update previous player status
        setTurnPlayers((prev) =>
          prev.map((tp) =>
            tp.player_id === data.previousPlayerId && tp.status === 'active'
              ? { ...tp, status: 'active' }
              : tp,
          ),
        )
      },
    )

    channel.bind(
      'player-skipped',
      (data: { roundId: string; playerId: string; playerNickname: string }) => {
        setTurnPlayers((prev) =>
          prev.map((tp) =>
            tp.player_id === data.playerId
              ? { ...tp, status: 'skipped_this_cycle', skip_used: true }
              : tp,
          ),
        )
      },
    )

    channel.bind(
      'player-eliminated',
      (data: {
        roundId: string
        playerId: string
        playerNickname: string
        reason: string
        activePlayerCount: number
      }) => {
        setTurnPlayers((prev) =>
          prev.map((tp) =>
            tp.player_id === data.playerId ? { ...tp, status: 'eliminated' } : tp,
          ),
        )
      },
    )

    channel.bind(
      'round-ended',
      (data: {
        roundId: string
        survivors: { player_id: string; nickname: string }[]
        pointsAwarded: number
      }) => {
        setRoundEnded(true)
        setRoundStatus('ended')
        setSurvivors(data.survivors)
        setPointsAwarded(data.pointsAwarded)
        setCurrentTurnPlayerId(null)
        setTimerRunning(false)

        // Mark survivors
        const survivorIds = new Set(data.survivors.map((s) => s.player_id))
        setTurnPlayers((prev) =>
          prev.map((tp) =>
            survivorIds.has(tp.player_id) ? { ...tp, status: 'survivor' } : tp,
          ),
        )
      },
    )

    channel.bind('game-ended', () => {
      setIsGameOver(true)
      setTimerRunning(false)
    })

    return () => {
      if (bufferIntervalRef.current) {
        clearInterval(bufferIntervalRef.current)
        bufferIntervalRef.current = null
      }
      channel.unbind('round-started')
      channel.unbind('turn-advanced')
      channel.unbind('player-skipped')
      channel.unbind('player-eliminated')
      channel.unbind('round-ended')
      channel.unbind('game-ended')
      pusherClient.unsubscribe(`room-${roomCode}-game`)
    }
  }, [roomCode, timerSeconds, buildTurnPlayers])

  // ── Timer (visual/advisory only — no auto-advance on expiry) ──────
  useEffect(() => {
    if (!timerRunning) {
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
          // Timer expired — visual cue only, host must click a button
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current)
            timerIntervalRef.current = null
          }
          setTimerRunning(false)
          setTimerExpired(true)
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
  }, [timerRunning, roundId])

  // ── Host Actions ────────────────────────────────────────────────────

  /** Host confirms the player answered — advances turn without elimination. */
  const handleConfirmAndNext = useCallback(async () => {
    if (!roundId || !roomCode || !currentTurnPlayerId || hostSubmitting) return
    setHostSubmitting(true)
    setAdvanceError(null)

    try {
      const res = await fetch('/api/games/word-chain/confirm-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: roundId,
          player_id: currentTurnPlayerId,
          room_code: roomCode,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to confirm turn')
      }
      // Pusher handles state updates
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : 'Failed to confirm turn')
    } finally {
      setHostSubmitting(false)
    }
  }, [roundId, roomCode, currentTurnPlayerId, hostSubmitting])

  /** Host eliminates the current player (timeout) and advances the turn. */
  const handleEliminateAndNext = useCallback(async () => {
    if (!roundId || !roomCode || hostSubmitting) return
    setHostSubmitting(true)
    setAdvanceError(null)

    try {
      const res = await fetch('/api/games/word-chain/advance-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round_id: roundId, room_code: roomCode }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to eliminate player')
      }
      // Pusher handles state updates
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : 'Failed to eliminate')
    } finally {
      setHostSubmitting(false)
    }
  }, [roundId, roomCode, hostSubmitting])

  // ── Next Round ──────────────────────────────────────────────────────
  const handleNextRound = async () => {
    if (advancingRound) return
    setAdvancingRound(true)
    setAdvanceError(null)

    try {
      const res = await fetch('/api/games/word-chain/next-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start next round')
      }
      // Pusher handles state updates
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : 'Failed to start next round')
    } finally {
      setAdvancingRound(false)
    }
  }

  // ── End Game ────────────────────────────────────────────────────────
  const handleEndGame = async () => {
    if (endingGame) return
    setEndingGame(true)

    try {
      await fetch('/api/games/word-chain/end-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode }),
      })
      setIsGameOver(true)
      await fetchLeaderboard()
    } catch {
      // Pusher handles game-ended event
    } finally {
      setEndingGame(false)
    }
  }

  // ── Timer display ───────────────────────────────────────────────────
  const timerUrgent = timeLeft <= 5 && timerRunning
  const timerPercent = timerSeconds > 0 ? (timeLeft / timerSeconds) * 100 : 0
  const roundProgressPercent = totalRounds > 0 ? (roundNumber / totalRounds) * 100 : 0

  // Active count
  const activeCount = turnPlayers.filter(
    (tp) => tp.status === 'active' || tp.status === 'skipped_this_cycle',
  ).length

  // Current player nickname
  const currentPlayer = turnPlayers.find((tp) => tp.player_id === currentTurnPlayerId)

  // ── Game Over Screen ─────────────────────────────────────────────────
  if (isGameOver) {
    return (
      <main className="flex min-h-svh flex-col bg-[#0a0a0a]">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Trophy className="size-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Game Over!</h1>

          {leaderboard && leaderboard.length > 0 && (
            <div className="w-full max-w-lg space-y-2">
              {leaderboard.map((player, index) => (
                <div
                  key={player.player_id}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-5 py-3',
                    index === 0 && 'border-yellow-500/60 bg-yellow-500/10',
                    index === 1 && 'border-slate-400/60 bg-slate-400/10',
                    index === 2 && 'border-amber-700/60 bg-amber-700/10',
                    index >= 3 && 'border-border/20 bg-card/40',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center text-lg font-bold tabular-nums">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <span className="font-semibold">{player.nickname}</span>
                  </div>
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      index === 0
                        ? 'text-yellow-400'
                        : index === 1
                          ? 'text-slate-300'
                          : index === 2
                            ? 'text-amber-600'
                            : 'text-foreground',
                    )}
                  >
                    {player.total_points}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/host/${roomCode}/wc-results`)}
            >
              View Full Results
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // ── No round ─────────────────────────────────────────────────────────
  if (!roundId || !category) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Waiting for the game to start…</p>
      </main>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border/20 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Round {roundNumber} of {totalRounds}
          </span>
          <Progress value={roundProgressPercent} className="h-1.5 flex-1" />

          {/* Category badge */}
          <Badge variant="secondary" className="whitespace-nowrap">
            {category.name}
          </Badge>

          {/* Difficulty */}
          <Badge
            variant="outline"
            className={cn(
              'whitespace-nowrap text-[10px]',
              category.difficulty === 'easy' && 'border-emerald-500/30 text-emerald-400',
              category.difficulty === 'moderate' && 'border-amber-500/30 text-amber-400',
              category.difficulty === 'difficult' && 'border-red-500/30 text-red-400',
            )}
          >
            {DIFFICULTY_LABELS[category.difficulty]}
          </Badge>

          {/* Active count */}
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {activeCount} active
          </span>
        </div>
      </div>

      {/* ── Main Area ────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8">
        {/* Category display */}
        <div className="text-center">
          <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            Category
          </p>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{category.name}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {category.points} point{category.points !== 1 ? 's' : ''} per survivor
          </p>
        </div>

        {/* ── Buffer Countdown ──────────────────────────────────────── */}
        {bufferTimeLeft > 0 && (
          <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
            <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
              Get Ready!
            </p>
            <span className="font-mono text-6xl font-bold text-violet-400 tabular-nums">
              {bufferTimeLeft}
            </span>
            <p className="text-sm text-muted-foreground">
              First turn starts in {bufferTimeLeft}s
            </p>
          </div>
        )}

        {/* ── Turn Order ────────────────────────────────────────────── */}
        <div className="w-full max-w-2xl space-y-2">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase text-center">
            Turn Order
          </p>

          {turnPlayers.map((tp) => {
            const isCurrent = tp.player_id === currentTurnPlayerId
            return (
              <div
                key={tp.player_id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300',
                  STATUS_COLORS[tp.status],
                  isCurrent && !roundEnded && 'ring-2 ring-accent/50 border-accent/40 bg-accent/10',
                )}
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    'size-3 rounded-full',
                    tp.status === 'active' && 'bg-emerald-500',
                    tp.status === 'skipped_this_cycle' && 'bg-amber-500',
                    tp.status === 'eliminated' && 'bg-red-500/50',
                    tp.status === 'survivor' && 'bg-emerald-400',
                  )}
                />

                {/* Nickname */}
                <span
                  className={cn(
                    'flex-1 text-sm font-semibold',
                    tp.status === 'eliminated' && 'text-muted-foreground line-through',
                  )}
                >
                  {tp.nickname}
                </span>

                {/* Status badge */}
                {STATUS_LABELS[tp.status] && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      tp.status === 'skipped_this_cycle' &&
                        'border-amber-500/30 text-amber-400',
                      tp.status === 'eliminated' &&
                        'border-red-500/20 text-red-400',
                      tp.status === 'survivor' &&
                        'border-emerald-500/40 text-emerald-400',
                    )}
                  >
                    {STATUS_LABELS[tp.status]}
                  </Badge>
                )}

                {/* Current turn indicator */}
                {isCurrent && !roundEnded && (
                  <Badge className="bg-accent/20 text-accent text-[10px] animate-pulse">
                    Now
                  </Badge>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Timer (advisory only — host must act) ──────────────────── */}
        {!roundEnded && currentTurnPlayerId && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {currentPlayer?.nickname ?? 'Unknown'}
              </span>
              &apos;s turn
            </p>
            <div
              className={cn(
                'flex items-center gap-3 rounded-full border px-5 py-3 transition-all duration-500',
                timerExpired
                  ? 'border-red-500/60 bg-red-500/10 animate-pulse'
                  : timerUrgent
                    ? 'border-red-500/60 bg-red-500/10'
                    : 'border-border/30 bg-card/40',
              )}
              role="timer"
              aria-live="polite"
              aria-label={
                timerExpired
                  ? "Time's up"
                  : `${timeLeft} seconds remaining`
              }
            >
              <Clock
                className={cn(
                  'size-5 transition-colors duration-300',
                  timerExpired || timerUrgent ? 'text-red-400' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'font-mono text-3xl font-bold tabular-nums transition-colors duration-300',
                  timerExpired
                    ? 'text-red-400'
                    : timerUrgent
                      ? 'text-red-400'
                      : 'text-foreground',
                )}
              >
                {timerExpired ? "Time's up!" : `${timeLeft}s`}
              </span>
            </div>
            <Progress
              value={timerExpired ? 0 : timerPercent}
              className={cn(
                'w-48 h-1.5 transition-colors duration-500',
                (timerExpired || timerUrgent) ? '[&>div]:bg-red-500' : '',
              )}
            />
          </div>
        )}

        {/* ── Round Ended State ──────────────────────────────────────── */}
        {roundEnded && survivors && (
          <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <Trophy className="size-8 text-emerald-400 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-emerald-300">Round Complete!</h2>
              <p className="mt-1 text-sm text-emerald-400/70">
                {pointsAwarded} point{pointsAwarded !== 1 ? 's' : ''} awarded to each survivor
              </p>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {survivors.map((s) => (
                  <Badge
                    key={s.player_id}
                    className="border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                  >
                    {s.nickname}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Next round / End game */}
            <div className="flex gap-3">
              {roundNumber < totalRounds ? (
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleNextRound}
                  disabled={advancingRound}
                >
                  {advancingRound ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      Next Round
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleEndGame}
                  disabled={endingGame}
                  variant="default"
                >
                  {endingGame ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Ending…
                    </>
                  ) : (
                    <>
                      End Game
                      <Trophy className="size-4" />
                    </>
                  )}
                </Button>
              )}
            </div>

            {advanceError && (
              <p className="text-sm text-destructive text-center" role="alert">
                {advanceError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Bar: Host Controls ────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border/20 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex size-2 rounded-full bg-accent animate-pulse" />
              Live
            </div>

            {/* Force End Game */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setForceEndOpen(true)}
              disabled={endingGame}
              className="gap-1 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            >
              <StopCircle className="size-3" />
              End Game
            </Button>
          </div>

          {/* Host action buttons — visible during active turn (hidden during buffer) */}
          {!roundEnded && currentTurnPlayerId && bufferTimeLeft === 0 && (
            <div className="flex items-center gap-3">
              {advanceError && (
                <p className="text-xs text-destructive" role="alert">
                  {advanceError}
                </p>
              )}
              <Button
                size="sm"
                onClick={handleConfirmAndNext}
                disabled={hostSubmitting}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {hostSubmitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                Confirm &amp; Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEliminateAndNext}
                disabled={hostSubmitting}
                className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                {hostSubmitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                Eliminate &amp; Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Force End Game Confirmation Dialog ────────────────────────── */}
      <Dialog open={forceEndOpen} onOpenChange={setForceEndOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>End Game Early?</DialogTitle>
            <DialogDescription>
              This will immediately end the game for all players and show the
              final results. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForceEndOpen(false)}
              disabled={endingGame}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setForceEndOpen(false)
                handleEndGame()
              }}
              disabled={endingGame}
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            >
              {endingGame ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <StopCircle className="size-3.5" />
              )}
              End Game Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
