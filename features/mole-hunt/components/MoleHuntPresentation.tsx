'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Loader2,
  Trophy,
  Eye,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { pusherClient } from '@/lib/pusher/client'
import { createClient } from '@/lib/supabase/client'
import { getTopicImageUrl } from '@/lib/supabase/storage'
import type { MolePhase, MoleTopic, MoleRound } from '../types'

interface MoleHuntPresentationProps {
  roomCode: string
  roomId: string
  initialRound: MoleRound | null
  initialTopic: MoleTopic | null
  discussTimerSeconds: number
  voteTimerSeconds: number
  totalRounds: number
  players: { id: string; nickname: string }[]
}

interface RevealData {
  correctChoice: 'a' | 'b'
  voteCountA: number
  voteCountB: number
  moleNicknames: string[]
  canaryNicknames: string[]
}

/**
 * Host presentation screen for Mole Hunt — designed for Zoom screen sharing.
 *
 * SECURITY: Mole/Canary identities are NEVER rendered before the `reveal` phase.
 * All role data is fetched only at reveal time and never stored in state before then.
 *
 * This screen is READ-ONLY. All host actions happen in the Control Room.
 */
export function MoleHuntPresentation({
  roomCode,
  roomId,
  initialRound,
  initialTopic,
  discussTimerSeconds,
  voteTimerSeconds,
  totalRounds,
  players,
}: MoleHuntPresentationProps) {
  const router = useRouter()
  const supabase = createClient()

  // ── State ──────────────────────────────────────────────────────────
  const [roundId, setRoundId] = useState<string | null>(
    initialRound?.id ?? null,
  )
  const [roundNumber, setRoundNumber] = useState(
    initialRound?.round_number ?? 1,
  )
  const [phase, setPhase] = useState<MolePhase>(
    (initialRound?.phase as MolePhase) ?? 'discuss',
  )
  const [topic, setTopic] = useState<MoleTopic | null>(initialTopic)
  const [timerSeconds, setTimerSeconds] = useState(discussTimerSeconds)
  const [timeLeft, setTimeLeft] = useState(discussTimerSeconds)
  const [timerStatus, setTimerStatus] = useState<'running' | 'paused' | 'done'>(
    'running',
  )

  // Vote progress (real-time via Pusher)
  const [votedCount, setVotedCount] = useState(0)
  const [totalPlayerCount, setTotalPlayerCount] = useState(0)

  // Reveal data — ONLY populated during reveal phase
  const [revealData, setRevealData] = useState<RevealData | null>(null)
  const [revealLoading, setRevealLoading] = useState(false)

  // Scores confirmation + game over
  const [scoresConfirmed, setScoresConfirmed] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  // Round scores (displayed after reveal)
  interface RoundScoreRow {
    player_id: string
    nickname: string
    total_points: number
  }
  const [roundScores, setRoundScores] = useState<RoundScoreRow[] | null>(null)
  const [roundScoresLoading, setRoundScoresLoading] = useState(false)

  // Leaderboard data for inline display on game over
  interface LeaderboardRow {
    player_id: string
    nickname: string
    total_points: number
    times_mole: number
    times_canary: number
    crew_deceived: number
  }
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  // Refs
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playerMap = useRef(new Map(players.map((p) => [p.id, p.nickname])))

  // ── Fetch topic by ID ──────────────────────────────────────────────
  const fetchTopic = useCallback(
    async (topicId: string) => {
      const { data } = await supabase
        .from('mole_topics')
        .select()
        .eq('id', topicId)
        .single()

      if (data) setTopic(data as MoleTopic)
    },
    [supabase],
  )

  // ── Fetch reveal data (only called during reveal phase) ────────────
  const fetchRevealData = useCallback(
    async (rid: string) => {
      setRevealLoading(true)
      try {
        // Fetch round with mole/canary IDs
        const { data: round } = await supabase
          .from('mole_rounds')
          .select('correct_choice, mole_player_ids, canary_player_ids')
          .eq('id', rid)
          .single()

        // Fetch votes
        const { data: votes } = await supabase
          .from('mole_votes')
          .select('choice')
          .eq('round_id', rid)

        const correct = round?.correct_choice as 'a' | 'b'
        let aCount = 0
        let bCount = 0
        for (const v of votes ?? []) {
          if (v.choice === 'a') aCount++
          else bCount++
        }

        const moleIds: string[] = round?.mole_player_ids ?? []
        const canaryIds: string[] = round?.canary_player_ids ?? []

        setRevealData({
          correctChoice: correct,
          voteCountA: aCount,
          voteCountB: bCount,
          moleNicknames: moleIds
            .map((id) => playerMap.current.get(id))
            .filter(Boolean) as string[],
          canaryNicknames: canaryIds
            .map((id) => playerMap.current.get(id))
            .filter(Boolean) as string[],
        })
      } catch {
        // Silently handle — reveal data is non-critical
      } finally {
        setRevealLoading(false)
      }
    },
    [supabase],
  )

  // ── Fetch round scores for inline leaderboard ───────────────────────
  const fetchRoundScores = useCallback(
    async (rid: string) => {
      setRoundScoresLoading(true)
      try {
        const { data: scores } = await supabase
          .from('mole_scores')
          .select('player_id, total_points, players!inner(nickname)')
          .eq('room_id', rid)
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
        // Non-critical
      } finally {
        setRoundScoresLoading(false)
      }
    },
    [supabase],
  )

  // ── Pusher subscription ────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return

    const channel = pusherClient.subscribe(`room-${roomCode}-game`)

    channel.bind(
      'round-started',
      (data: {
        roundNumber: number
        roundId: string
        phase: MolePhase
        topicId: string
      }) => {
        setRoundId(data.roundId)
        setRoundNumber(data.roundNumber)
        setPhase(data.phase)
        setVotedCount(0)
        setRevealData(null)
        setScoresConfirmed(false)
        setRoundScores(null)
        // Reset timer for discuss
        setTimeLeft(discussTimerSeconds)
        setTimerStatus('running')
        fetchTopic(data.topicId)
      },
    )

    channel.bind(
      'phase-advanced',
      (data: { roundId: string; phase: MolePhase }) => {
        setPhase(data.phase)
        if (data.phase === 'vote') {
          setTimeLeft(voteTimerSeconds)
          setTimerStatus('running')
        } else if (data.phase === 'reveal') {
          setTimerStatus('done')
          fetchRevealData(data.roundId)
        } else if (data.phase === 'assigning') {
          setTimerStatus('done')
          setRevealData(null)
          setScoresConfirmed(false)
        }
      },
    )

    channel.bind(
      'vote-submitted',
      (data: { roundId: string; votedCount: number; totalPlayers: number }) => {
        setVotedCount(data.votedCount)
        setTotalPlayerCount(data.totalPlayers)
      },
    )

    channel.bind('scores-updated', () => {
      setScoresConfirmed(true)
      // Fetch round leaderboard for inline display during reveal
      if (roomId) fetchRoundScores(roomId)
    })

    channel.bind('game-ended', () => {
      setIsGameOver(true)
    })

    return () => {
      channel.unbind('round-started')
      channel.unbind('phase-advanced')
      channel.unbind('vote-submitted')
      channel.unbind('scores-updated')
      channel.unbind('game-ended')
      pusherClient.unsubscribe(`room-${roomCode}-game`)
    }
  }, [
    roomCode,
    discussTimerSeconds,
    voteTimerSeconds,
    fetchTopic,
    fetchRevealData,
  ])

  // ── Timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerStatus !== 'running') {
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
          setTimerStatus('done')
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
  }, [timerStatus])

  // ── Fetch leaderboard on game over ──────────────────────────────────
  useEffect(() => {
    if (!isGameOver || !roomId) return

    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true)
      try {
        const { data: scores } = await supabase
          .from('mole_scores')
          .select(
            `
            player_id,
            total_points,
            times_mole,
            times_canary,
            crew_deceived,
            players!inner(nickname)
          `,
          )
          .eq('room_id', roomId)
          .order('total_points', { ascending: false })

        if (scores) {
          setLeaderboard(
            scores.map((s: any) => ({
              player_id: s.player_id,
              nickname: s.players?.nickname ?? 'Unknown',
              total_points: s.total_points ?? 0,
              times_mole: s.times_mole ?? 0,
              times_canary: s.times_canary ?? 0,
              crew_deceived: s.crew_deceived ?? 0,
            })),
          )
        }
      } catch {
        // Silently handle — leaderboard is non-critical
      } finally {
        setLeaderboardLoading(false)
      }
    }

    fetchLeaderboard()
  }, [isGameOver, roomId, supabase])

  // ── Reset timer when round changes ─────────────────────────────────
  useEffect(() => {
    if (phase === 'discuss') {
      setTimeLeft(discussTimerSeconds)
      setTimerStatus('running')
    }
  }, [roundId, discussTimerSeconds, phase])

  // ── Derived display values ─────────────────────────────────────────
  const timerUrgent = timeLeft <= 10 && timerStatus === 'running'
  const timerPercent =
    phase === 'discuss'
      ? (timeLeft / discussTimerSeconds) * 100
      : (timeLeft / voteTimerSeconds) * 100
  const votePercent =
    totalPlayerCount > 0 ? (votedCount / totalPlayerCount) * 100 : 0
  const roundProgressPercent =
    totalRounds > 0 ? (roundNumber / totalRounds) * 100 : 0

  // ── Game Over Screen with Inline Leaderboard ────────────────────────
  if (isGameOver) {
    const topDeceiver = leaderboard
      ? [...leaderboard]
          .filter((p) => p.crew_deceived > 0)
          .sort((a, b) => b.crew_deceived - a.crew_deceived)[0]
      : null

    return (
      <main className="flex min-h-svh flex-col bg-[#0a0a0a]">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Trophy className="size-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Game Over!</h1>

          {leaderboardLoading && (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Loading leaderboard…
              </span>
            </div>
          )}

          {/* Most Deceptive Mole callout */}
          {!leaderboardLoading && topDeceiver && (
            <div className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <Eye className="size-5 text-amber-400" />
                <div>
                  <p className="text-xs font-medium tracking-widest text-amber-400/70 uppercase">
                    Most Deceptive Mole
                  </p>
                  <p className="text-lg font-bold text-amber-300">
                    {topDeceiver.nickname}
                  </p>
                  <p className="text-xs text-amber-400/70">
                    Deceived {topDeceiver.crew_deceived} crew member
                    {topDeceiver.crew_deceived !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard list */}
          {!leaderboardLoading && leaderboard && leaderboard.length > 0 && (
            <div className="w-full max-w-lg space-y-2">
              {leaderboard.map((player, index) => (
                <div
                  key={player.player_id}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-5 py-3',
                    index === 0 &&
                      'border-yellow-500/60 bg-yellow-500/10',
                    index === 1 &&
                      'border-slate-400/60 bg-slate-400/10',
                    index === 2 &&
                      'border-amber-700/60 bg-amber-700/10',
                    index >= 3 && 'border-border/20 bg-card/40',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center text-lg font-bold tabular-nums">
                      {index === 0
                        ? '🥇'
                        : index === 1
                          ? '🥈'
                          : index === 2
                            ? '🥉'
                            : `#${index + 1}`}
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
              onClick={() =>
                router.push(`/host/${roomCode}/mh-results`)
              }
            >
              View Full Results
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // ── No topic ───────────────────────────────────────────────────────
  if (!topic) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Waiting for the game to start…</p>
      </main>
    )
  }

  // ── Assigning Phase ────────────────────────────────────────────────
  if (phase === 'assigning') {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-6">
        <Loader2 className="size-10 animate-spin text-primary" />
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Preparing Round {roundNumber}…
          </h1>
          <p className="mt-2 text-muted-foreground">
            Roles are being assigned
          </p>
        </div>
        {/* Round progress */}
        <div className="w-64">
          <Progress value={roundProgressPercent} className="h-1.5" />
        </div>
      </main>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* ── Top Bar: Round progress + Timer ────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border/20 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          {/* Round indicator */}
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Round {roundNumber} of {totalRounds}
          </span>
          <Progress value={roundProgressPercent} className="h-1.5 flex-1" />

          {/* Phase badge */}
          <Badge
            variant="secondary"
            className="capitalize whitespace-nowrap"
          >
            {phase}
          </Badge>

          {/* Timer */}
          {(phase === 'discuss' || phase === 'vote') && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-500 whitespace-nowrap',
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
                {timeLeft}s
              </span>
            </div>
          )}
        </div>
        {/* Timer progress bar */}
        {(phase === 'discuss' || phase === 'vote') && (
          <div className="mx-auto mt-3 max-w-5xl">
            <Progress
              value={timerPercent}
              className={cn(
                'h-1 transition-colors duration-500',
                timerUrgent ? '[&>div]:bg-red-500' : '',
              )}
            />
          </div>
        )}
      </div>

      {/* ── Main Content Area ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
        {/* Phase Label */}
        {(phase === 'discuss' || phase === 'vote') && (
          <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            {phase === 'discuss' ? 'Discussion Phase' : 'Voting Phase'}
          </p>
        )}

        {/* ── Topic Card ──────────────────────────────────────────── */}
        <div className="w-full max-w-3xl rounded-2xl border border-border/20 bg-card/60 px-8 py-8 backdrop-blur-sm">
          <h1 className="text-center text-2xl font-bold sm:text-3xl md:text-4xl">
            {topic.title}
          </h1>
          {topic.blurb && (
            <p className="mt-4 text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
              {topic.blurb}
            </p>
          )}
          {(() => {
            const imageSrc = getTopicImageUrl(topic.image_url)
            return imageSrc ? (
              <div className="mt-6 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={topic.title}
                  className="w-full object-cover"
                />
              </div>
            ) : (
              <div className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-border/30 bg-card/30 py-12">
                <p className="text-sm text-muted-foreground">Topic image</p>
              </div>
            )
          })()}
        </div>

        {/* ── Options Display ──────────────────────────────────────── */}
        <div className="flex w-full max-w-3xl flex-col gap-4 sm:flex-row">
          {/* Option A */}
          <PresentationOption
            label="Option A"
            text={topic.option_a}
            color="blue"
            voteCount={revealData?.voteCountA ?? null}
            totalVotes={
              revealData
                ? revealData.voteCountA + revealData.voteCountB
                : null
            }
            isCorrect={
              revealData ? revealData.correctChoice === 'a' : null
            }
            phase={phase}
          />

          {/* VS divider */}
          <div className="flex items-center justify-center sm:flex-col">
            <div className="h-px w-12 bg-border/30 sm:h-12 sm:w-px" />
            <span className="mx-3 my-1 text-xs font-bold tracking-widest text-muted-foreground uppercase sm:mx-0">
              VS
            </span>
            <div className="h-px w-12 bg-border/30 sm:h-12 sm:w-px" />
          </div>

          {/* Option B */}
          <PresentationOption
            label="Option B"
            text={topic.option_b}
            color="violet"
            voteCount={revealData?.voteCountB ?? null}
            totalVotes={
              revealData
                ? revealData.voteCountA + revealData.voteCountB
                : null
            }
            isCorrect={
              revealData ? revealData.correctChoice === 'b' : null
            }
            phase={phase}
          />
        </div>

        {/* ── Vote Progress (vote phase) ──────────────────────────── */}
        {phase === 'vote' && (
          <div className="w-full max-w-md space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Votes</span>
              <span className="font-medium">
                {votedCount} of {totalPlayerCount}
              </span>
            </div>
            <Progress value={votePercent} className="h-2" />
          </div>
        )}

        {/* ── Reveal: Mole & Canary Identity Cards ────────────────── */}
        {phase === 'reveal' && (
          <div className="w-full max-w-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {revealLoading ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Revealing roles…
                </span>
              </div>
            ) : (
              revealData && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {/* Moles */}
                  <div className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-center gap-2">
                      <Eye className="size-4 text-amber-400" />
                      <h3 className="font-semibold text-amber-400">
                        The Mole{revealData.moleNicknames.length !== 1 ? 's' : ''}
                      </h3>
                    </div>
                    {revealData.moleNicknames.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {revealData.moleNicknames.map((name) => (
                          <Badge
                            key={name}
                            className="border-amber-500/30 bg-amber-500/20 text-amber-300"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-amber-400/50">
                        No moles this round
                      </p>
                    )}
                  </div>

                  {/* Canaries */}
                  <div className="flex-1 rounded-xl border border-teal-500/30 bg-teal-500/10 p-4">
                    <div className="flex items-center gap-2">
                      <Eye className="size-4 text-teal-400" />
                      <h3 className="font-semibold text-teal-400">
                        The Canar{revealData.canaryNicknames.length !== 1 ? 'ies' : 'y'}
                      </h3>
                    </div>
                    {revealData.canaryNicknames.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {revealData.canaryNicknames.map((name) => (
                          <Badge
                            key={name}
                            className="border-teal-500/30 bg-teal-500/20 text-teal-300"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-teal-400/50">
                        No canaries this round
                      </p>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Why this is correct */}
            {topic?.correct_answer_why && (
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-center">
                <p className="text-xs font-medium text-accent/70 uppercase tracking-wider mb-1">
                  Why this is correct
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {topic.correct_answer_why}
                </p>
              </div>
            )}

            {/* Scores confirmation */}
            {scoresConfirmed && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2 animate-in fade-in duration-300">
                <Trophy className="size-4 text-accent" />
                <span className="text-sm font-medium text-accent">
                  Scores updated — waiting for host to continue
                </span>
              </div>
            )}

            {/* ── Round Leaderboard ─────────────────────────────────── */}
            {scoresConfirmed && (
              <div className="w-full max-w-lg space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {roundScoresLoading && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Loading standings…
                    </span>
                  </div>
                )}

                {!roundScoresLoading &&
                  roundScores &&
                  roundScores.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-center">
                        Current Standings
                      </h3>
                      {roundScores.map((player, index) => (
                        <div
                          key={player.player_id}
                          className={cn(
                            'flex items-center justify-between rounded-xl border px-4 py-2',
                            index === 0 &&
                              'border-yellow-500/60 bg-yellow-500/10',
                            index === 1 &&
                              'border-slate-400/60 bg-slate-400/10',
                            index === 2 &&
                              'border-amber-700/60 bg-amber-700/10',
                            index >= 3 && 'border-border/20 bg-card/30',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-center text-sm font-bold tabular-nums text-muted-foreground">
                              {index + 1}
                            </span>
                            <span className="text-sm font-semibold">
                              {player.nickname}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'text-sm font-bold tabular-nums',
                              index === 0
                                ? 'text-yellow-400'
                                : index === 1
                                  ? 'text-slate-300'
                                  : 'text-foreground',
                            )}
                          >
                            {player.total_points}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Bar: Live indicator + Control Room link ────────── */}
      <div className="flex-shrink-0 border-t border-border/20 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex size-2 rounded-full bg-accent animate-pulse" />
            Live
          </div>

          {/* A2: Open Control Room affordance (new tab) */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() =>
              window.open(`/host/${roomCode}/mole-control`, '_blank')
            }
          >
            <ExternalLink className="size-3.5" />
            <span className="hidden sm:inline">Open Control Room</span>
            <span className="sm:hidden">Control</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Presentation Option Card ────────────────────────────────────────

interface PresentationOptionProps {
  label: string
  text: string
  color: 'blue' | 'violet'
  voteCount: number | null
  totalVotes: number | null
  isCorrect: boolean | null
  phase: MolePhase
}

function PresentationOption({
  label,
  text,
  color,
  voteCount,
  totalVotes,
  isCorrect,
  phase,
}: PresentationOptionProps) {
  const colorClasses = {
    blue: {
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/5',
      label: 'text-blue-400/60',
      text: 'text-blue-400',
      bar: 'bg-blue-500',
    },
    violet: {
      border: 'border-violet-500/30',
      bg: 'bg-violet-500/5',
      label: 'text-violet-400/60',
      text: 'text-violet-400',
      bar: 'bg-violet-500',
    },
  }

  const c = colorClasses[color]
  const showVote = phase === 'reveal' && voteCount !== null && totalVotes !== null
  const votePercent = showVote && totalVotes! > 0 ? (voteCount! / totalVotes!) * 100 : 0

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center gap-3 rounded-2xl border px-6 py-8 transition-all duration-500 sm:py-10',
        c.border,
        c.bg,
        isCorrect === true &&
          'border-accent/60 bg-accent/10 ring-2 ring-accent/20',
        isCorrect === false && phase === 'reveal' && 'opacity-50',
      )}
    >
      <span className={cn('text-xs font-medium tracking-widest uppercase', c.label)}>
        {label}
      </span>
      <span className={cn('text-center text-2xl font-bold sm:text-3xl md:text-4xl', c.text)}>
        {text}
      </span>

      {/* Vote count (reveal) */}
      {showVote && (
        <div className="mt-3 w-full space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className={c.text}>{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
            <span className="text-muted-foreground">
              {Math.round(votePercent)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/20">
            <div
              className={cn('h-full rounded-full transition-all duration-700 ease-out', c.bar)}
              style={{ width: `${votePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Correct answer badge */}
      {isCorrect === true && (
        <Badge className="mt-1 border-accent/40 bg-accent/20 text-accent animate-in fade-in zoom-in-50 duration-300">
          Correct Answer
        </Badge>
      )}
    </div>
  )
}
