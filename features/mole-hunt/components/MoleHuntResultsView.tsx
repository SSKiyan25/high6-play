'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Trophy,
  Medal,
  Eye,
  EyeOff,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────

interface ScoreRow {
  player_id: string
  nickname: string
  total_points: number
  times_mole: number
  times_canary: number
  crew_deceived: number
}

interface RoundBreakdown {
  round_number: number
  topic_title: string
  correct_choice: 'a' | 'b'
  option_a: string
  option_b: string
  mole_nicknames: string[]
  canary_nicknames: string[]
  votes_a: { nickname: string }[]
  votes_b: { nickname: string }[]
}

interface MoleHuntResultsViewProps {
  roomCode: string
  leaderboard: ScoreRow[]
  roundBreakdowns: RoundBreakdown[]
}

/**
 * Host results page for Mole Hunt.
 * Displays the full leaderboard with gold/silver/bronze highlights,
 * a "Most Deceptive Mole" callout, and a collapsible round-by-round
 * breakdown.
 */
export function MoleHuntResultsView({
  roomCode,
  leaderboard,
  roundBreakdowns,
}: MoleHuntResultsViewProps) {
  const router = useRouter()
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set())

  const toggleRound = (roundNumber: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev)
      if (next.has(roundNumber)) {
        next.delete(roundNumber)
      } else {
        next.add(roundNumber)
      }
      return next
    })
  }

  // Top 3 medals
  const medals = ['🥇', '🥈', '🥉']
  const medalBorders = [
    'border-yellow-500/60 bg-yellow-500/10',
    'border-slate-400/60 bg-slate-400/10',
    'border-amber-700/60 bg-amber-700/10',
  ]

  // Most deceptive mole
  const topDeceiver = [...leaderboard]
    .filter((p) => p.crew_deceived > 0)
    .sort((a, b) => b.crew_deceived - a.crew_deceived)[0]

  const handlePlayAgain = async () => {
    await fetch('/api/rooms/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode }),
    })
    router.push('/dashboard')
  }

  return (
    <main className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="border-b border-border/20 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <Trophy className="size-7 text-primary" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Mole Hunt Results
          </h1>
          <p className="mt-2 text-muted-foreground">Room {roomCode}</p>
        </div>
      </div>

      {/* ── Leaderboard ────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-6 py-8">
        {/* Most Deceptive Mole callout */}
        {topDeceiver && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-5">
            <div className="flex items-center gap-3">
              <EyeOff className="size-6 text-amber-400" />
              <div>
                <p className="text-xs font-medium tracking-widest text-amber-400/70 uppercase">
                  Most Deceptive Mole
                </p>
                <p className="mt-1 text-xl font-bold text-amber-300">
                  {topDeceiver.nickname}
                </p>
                <p className="mt-0.5 text-sm text-amber-400/70">
                  Deceived {topDeceiver.crew_deceived} crew member
                  {topDeceiver.crew_deceived !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard table */}
        <div className="rounded-2xl border border-border/20 bg-card/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/20">
            <h2 className="text-lg font-semibold">Leaderboard</h2>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-6 py-3 text-xs font-medium tracking-wider text-muted-foreground uppercase border-b border-border/10">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4 sm:col-span-3">Player</div>
            <div className="col-span-2 text-right">Points</div>
            <div className="col-span-2 text-center">Mole</div>
            <div className="col-span-2 text-center">Canary</div>
            <div className="col-span-1 text-center hidden sm:block">
              Deceived
            </div>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-border/10">
            {leaderboard.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                No scores available.
              </div>
            ) : (
              leaderboard.map((player, index) => {
                const isTop3 = index < 3
                return (
                  <div
                    key={player.player_id}
                    className={cn(
                      'grid grid-cols-12 gap-2 px-6 py-3 items-center transition-colors duration-150',
                      isTop3 && medalBorders[index],
                    )}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center gap-1.5">
                      {isTop3 ? (
                        <span className="text-lg" role="img" aria-label={`Rank ${index + 1}`}>
                          {medals[index]}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Player name */}
                    <div className="col-span-4 sm:col-span-3">
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          isTop3 ? 'text-foreground' : 'text-foreground/80',
                        )}
                      >
                        {player.nickname}
                      </span>
                    </div>

                    {/* Points */}
                    <div className="col-span-2 text-right">
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums',
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

                    {/* Times as Mole */}
                    <div className="col-span-2 text-center">
                      <span className="text-xs text-amber-400/80 tabular-nums">
                        {player.times_mole}
                      </span>
                    </div>

                    {/* Times as Canary */}
                    <div className="col-span-2 text-center">
                      <span className="text-xs text-teal-400/80 tabular-nums">
                        {player.times_canary}
                      </span>
                    </div>

                    {/* Crew deceived */}
                    <div className="col-span-1 text-center hidden sm:block">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {player.crew_deceived}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Round-by-Round Breakdown ────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Round Breakdown</h2>

          {roundBreakdowns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No round data available.
            </p>
          ) : (
            roundBreakdowns.map((rb) => {
              const isExpanded = expandedRounds.has(rb.round_number)
              const totalVotes =
                rb.votes_a.length + rb.votes_b.length
              const aPercent =
                totalVotes > 0
                  ? Math.round((rb.votes_a.length / totalVotes) * 100)
                  : 0
              const bPercent =
                totalVotes > 0
                  ? Math.round((rb.votes_b.length / totalVotes) * 100)
                  : 0

              return (
                <div
                  key={rb.round_number}
                  className="rounded-xl border border-border/20 bg-card/40 overflow-hidden"
                >
                  {/* Round header — clickable */}
                  <button
                    type="button"
                    onClick={() => toggleRound(rb.round_number)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left cursor-pointer transition-colors duration-150 hover:bg-card/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {rb.round_number}
                      </span>
                      <span className="text-sm font-semibold">
                        {rb.topic_title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          rb.correct_choice === 'a'
                            ? 'border-blue-500/30 bg-blue-500/15 text-blue-300'
                            : 'border-violet-500/30 bg-violet-500/15 text-violet-300',
                        )}
                      >
                        {rb.correct_choice === 'a'
                          ? rb.option_a
                          : rb.option_b}{' '}
                        was correct
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border/20 px-5 py-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Roles */}
                      <div className="flex flex-wrap gap-4">
                        {rb.mole_nicknames.length > 0 && (
                          <div>
                            <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">
                              Mole{rb.mole_nicknames.length !== 1 ? 's' : ''}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {rb.mole_nicknames.map((n) => (
                                <Badge
                                  key={n}
                                  className="border-amber-500/30 bg-amber-500/15 text-amber-300 text-xs"
                                >
                                  <EyeOff className="mr-1 size-3" />
                                  {n}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {rb.canary_nicknames.length > 0 && (
                          <div>
                            <p className="text-xs font-medium tracking-wider text-teal-400 uppercase">
                              Canar
                              {rb.canary_nicknames.length !== 1 ? 'ies' : 'y'}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {rb.canary_nicknames.map((n) => (
                                <Badge
                                  key={n}
                                  className="border-teal-500/30 bg-teal-500/15 text-teal-300 text-xs"
                                >
                                  <ShieldAlert className="mr-1 size-3" />
                                  {n}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Vote split */}
                      <div>
                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-2">
                          Vote Split
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Option A */}
                          <div
                            className={cn(
                              'rounded-xl border px-4 py-3',
                              rb.correct_choice === 'a'
                                ? 'border-accent/40 bg-accent/10'
                                : 'border-blue-500/20 bg-blue-500/5',
                            )}
                          >
                            <span className="text-xs font-medium text-blue-400/70">
                              {rb.option_a}
                            </span>
                            <div className="mt-2 flex items-end justify-between">
                              <span className="text-lg font-bold text-blue-300 tabular-nums">
                                {rb.votes_a.length}
                              </span>
                              <span className="text-sm text-blue-400/50 tabular-nums">
                                {aPercent}%
                              </span>
                            </div>
                            {/* Voter names */}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {rb.votes_a.length === 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  No votes
                                </span>
                              ) : (
                                rb.votes_a.map((v, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300"
                                  >
                                    {v.nickname}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Option B */}
                          <div
                            className={cn(
                              'rounded-xl border px-4 py-3',
                              rb.correct_choice === 'b'
                                ? 'border-accent/40 bg-accent/10'
                                : 'border-violet-500/20 bg-violet-500/5',
                            )}
                          >
                            <span className="text-xs font-medium text-violet-400/70">
                              {rb.option_b}
                            </span>
                            <div className="mt-2 flex items-end justify-between">
                              <span className="text-lg font-bold text-violet-300 tabular-nums">
                                {rb.votes_b.length}
                              </span>
                              <span className="text-sm text-violet-400/50 tabular-nums">
                                {bPercent}%
                              </span>
                            </div>
                            {/* Voter names */}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {rb.votes_b.length === 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  No votes
                                </span>
                              ) : (
                                rb.votes_b.map((v, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300"
                                  >
                                    {v.nickname}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Bottom Actions ──────────────────────────────────────────── */}
      <div className="border-t border-border/20 px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="gap-2 w-full sm:w-auto"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Button>
          <Button
            onClick={handlePlayAgain}
            className="gap-2 w-full sm:w-auto"
          >
            <RefreshCw className="size-4" />
            Play Again
          </Button>
        </div>
      </div>
    </main>
  )
}
