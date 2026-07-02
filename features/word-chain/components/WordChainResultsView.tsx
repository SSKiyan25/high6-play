'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Trophy,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'
import type { WordChainLeaderboardRow, WordChainRoundBreakdown } from '../types'
import { DIFFICULTY_LABELS } from '../types'

interface WordChainResultsViewProps {
  roomCode: string
  leaderboard: WordChainLeaderboardRow[]
  roundBreakdowns: WordChainRoundBreakdown[]
  isHost?: boolean
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  moderate: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  difficult: 'border-red-500/30 text-red-400 bg-red-500/10',
}

export function WordChainResultsView({
  roomCode,
  leaderboard,
  roundBreakdowns,
  isHost = false,
}: WordChainResultsViewProps) {
  const router = useRouter()
  const homePath = isHost ? '/dashboard' : '/'
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

  const medals = ['🥇', '🥈', '🥉']
  const medalBorders = [
    'border-yellow-500/60 bg-yellow-500/10',
    'border-slate-400/60 bg-slate-400/10',
    'border-amber-700/60 bg-amber-700/10',
  ]

  const handlePlayAgain = async () => {
    if (isHost) {
      await fetch('/api/rooms/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode }),
      })
    }
    // Clear player session on play again
    localStorage.removeItem('h6p_player')
    router.push(homePath)
  }

  return (
    <main className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="border-b border-border/20 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <Trophy className="size-7 text-primary" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            This or That Results
          </h1>
          <p className="mt-2 text-muted-foreground">Room {roomCode}</p>
        </div>
      </div>

      {/* ── Leaderboard ──────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-6 py-8">
        {/* Leaderboard table */}
        <div className="rounded-2xl border border-border/20 bg-card/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/20">
            <h2 className="text-lg font-semibold">Leaderboard</h2>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-6 py-3 text-xs font-medium tracking-wider text-muted-foreground uppercase border-b border-border/10">
            <div className="col-span-2">Rank</div>
            <div className="col-span-5 sm:col-span-5">Player</div>
            <div className="col-span-3 text-right">Points</div>
            <div className="col-span-2 text-right">Survived</div>
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
                    <div className="col-span-2 flex items-center gap-1.5">
                      {isTop3 ? (
                        <span className="text-lg" role="img" aria-label={`Rank ${index + 1}`}>
                          {medals[index]}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                      )}
                    </div>

                    {/* Player name */}
                    <div className="col-span-5 sm:col-span-5">
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
                    <div className="col-span-3 text-right">
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

                    {/* Rounds survived */}
                    <div className="col-span-2 text-right">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {player.rounds_survived}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Round-by-Round Breakdown ──────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Round Breakdown</h2>

          {roundBreakdowns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No round data available.
            </p>
          ) : (
            roundBreakdowns.map((rb) => {
              const isExpanded = expandedRounds.has(rb.round_number)

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
                        {rb.category_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          DIFFICULTY_COLORS[rb.difficulty] || '',
                        )}
                      >
                        {DIFFICULTY_LABELS[rb.difficulty] || rb.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {rb.points} pt{rb.points !== 1 ? 's' : ''}
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
                      {/* Survivors */}
                      {rb.survivors.length > 0 && (
                        <div>
                          <p className="text-xs font-medium tracking-wider text-emerald-400 uppercase mb-2">
                            Survivors (+{rb.points} pt{rb.points !== 1 ? 's' : ''})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {rb.survivors.map((s, i) => (
                              <Badge
                                key={i}
                                className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300 text-xs"
                              >
                                <Trophy className="mr-1 size-3" />
                                {s.nickname}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Eliminated */}
                      {rb.eliminated.length > 0 && (
                        <div>
                          <p className="text-xs font-medium tracking-wider text-red-400 uppercase mb-2">
                            Eliminated
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {rb.eliminated.map((e, i) => (
                              <Badge
                                key={i}
                                className="border-red-500/15 bg-red-500/5 text-muted-foreground text-xs"
                              >
                                {e.nickname}
                                <span className="ml-1 text-red-400/60">
                                  ({e.reason})
                                </span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Bottom Actions ────────────────────────────────────────────── */}
      <div className="border-t border-border/20 px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => {
              if (!isHost) localStorage.removeItem('h6p_player')
              router.push(homePath)
            }}
            className="gap-2 w-full sm:w-auto"
          >
            <ArrowLeft className="size-4" />
            {isHost ? 'Back to Dashboard' : 'Leave Game'}
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
