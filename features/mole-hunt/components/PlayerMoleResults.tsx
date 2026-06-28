'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trophy, EyeOff, ShieldAlert, Home } from 'lucide-react'

interface PlayerMoleResultsProps {
  roomCode: string
  playerId: string
}

interface PlayerScoreData {
  total_points: number
  times_mole: number
  times_canary: number
  crew_deceived: number
  rank: number
  total_players: number
}

/**
 * Player-facing personal results for Mole Hunt.
 * Shows only the requesting player's own data — no other players' scores or roles.
 */
export function PlayerMoleResults({
  roomCode,
  playerId,
}: PlayerMoleResultsProps) {
  const router = useRouter()
  const [data, setData] = useState<PlayerScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchResults() {
      try {
        setLoading(true)
        const res = await fetch(
          `/api/games/mole-hunt/player-results?player_id=${encodeURIComponent(playerId)}&room_code=${encodeURIComponent(roomCode)}`,
        )

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to fetch results')
        }

        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch results',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [playerId, roomCode])

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Loading your results…
        </p>
      </main>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-6">
        <p className="text-sm text-destructive">{error || 'No results found.'}</p>
        <Button variant="outline" onClick={() => router.push('/')}>
          <Home className="mr-2 size-4" />
          Back to Home
        </Button>
      </main>
    )
  }

  // ── Personal summary line ─────────────────────────────────────────
  const roleParts: string[] = []
  if (data.times_mole > 0)
    roleParts.push(`${data.times_mole} round${data.times_mole !== 1 ? 's' : ''} as Mole`)
  if (data.times_canary > 0)
    roleParts.push(
      `${data.times_canary} round${data.times_canary !== 1 ? 's' : ''} as Canary`,
    )
  const crewRounds = Math.max(
    0,
    data.total_players > 0
      ? Math.max(1, data.total_players) -
          (data.times_mole + data.times_canary)
      : 0,
  )
  if (crewRounds > 0)
    roleParts.push(`${crewRounds} round${crewRounds !== 1 ? 's' : ''} as Crew`)

  const summaryLine =
    roleParts.length > 0
      ? `You played ${roleParts.join(', ')}.`
      : 'You participated in the game.'

  const deceivedPart =
    data.crew_deceived > 0
      ? ` As the Mole, you deceived ${data.crew_deceived} crew member${data.crew_deceived !== 1 ? 's' : ''}!`
      : ''

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-md space-y-6">
        {/* ── Trophy / Rank ──────────────────────────────────────── */}
        <div className="text-center">
          <div className="inline-flex size-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Trophy className="size-10 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Game Over!</h1>
          <p className="mt-1 text-muted-foreground">Here&apos;s how you did</p>
        </div>

        {/* ── Rank card ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/20 bg-card/60 px-6 py-6 backdrop-blur-sm text-center">
          <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            Your Rank
          </p>
          <p className="mt-2 text-5xl font-bold tracking-tight">
            {data.rank}
            <span className="text-lg text-muted-foreground">
              {' '}
              / {data.total_players}
            </span>
          </p>
          <p className="mt-2 text-lg font-semibold">
            {data.total_points} points
          </p>
        </div>

        {/* ── Role stats ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Times as Mole */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-center">
            <EyeOff className="mx-auto size-5 text-amber-400" />
            <p className="mt-1 text-xs font-medium tracking-wider text-amber-400/70 uppercase">
              As Mole
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-300 tabular-nums">
              {data.times_mole}
            </p>
          </div>

          {/* Times as Canary */}
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-4 text-center">
            <ShieldAlert className="mx-auto size-5 text-teal-400" />
            <p className="mt-1 text-xs font-medium tracking-wider text-teal-400/70 uppercase">
              As Canary
            </p>
            <p className="mt-1 text-2xl font-bold text-teal-300 tabular-nums">
              {data.times_canary}
            </p>
          </div>

          {/* Crew deceived — only shown if > 0 */}
          {data.crew_deceived > 0 && (
            <div className="col-span-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-4 text-center">
              <p className="text-xs font-medium tracking-wider text-accent/70 uppercase">
                Crew Members Deceived
              </p>
              <p className="mt-1 text-2xl font-bold text-accent tabular-nums">
                {data.crew_deceived}
              </p>
            </div>
          )}
        </div>

        {/* ── Summary text ────────────────────────────────────────── */}
        <div className="rounded-xl border border-border/20 bg-card/40 px-5 py-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {summaryLine}
            {deceivedPart}
          </p>
        </div>

        {/* ── Action ──────────────────────────────────────────────── */}
        <Button
          onClick={() => router.push('/')}
          className="w-full gap-2"
          size="lg"
        >
          <Home className="size-4" />
          Back to Home
        </Button>
      </div>
    </main>
  )
}
