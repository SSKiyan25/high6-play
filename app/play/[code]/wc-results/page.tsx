'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WordChainResultsView } from '@/features/word-chain/components/WordChainResultsView'
import type { WordChainLeaderboardRow, WordChainRoundBreakdown } from '@/features/word-chain/types'
import { Loader2 } from 'lucide-react'

/**
 * Player Word Chain results page.
 * Public — no auth required (players are anonymous).
 * Fetches results client-side.
 */
export default function WordChainPlayerResultsPage() {
  const params = useParams()
  const router = useRouter()
  const code = params?.code as string

  const [leaderboard, setLeaderboard] = useState<WordChainLeaderboardRow[]>([])
  const [roundBreakdowns, setRoundBreakdowns] = useState<WordChainRoundBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('h6p_player')
    if (!stored) {
      router.push(`/play/${code}`)
      return
    }

    let parsed
    try {
      parsed = JSON.parse(stored)
    } catch {
      router.push(`/play/${code}`)
      return
    }

    if (!parsed.playerId || parsed.roomCode !== code) {
      router.push(`/play/${code}`)
      return
    }

    async function fetchResults() {
      try {
        const supabase = createClient()

        // Look up room
        const { data: room } = await supabase
          .from('rooms')
          .select('id')
          .eq('code', code)
          .single()

        if (!room) {
          setError('Room not found')
          setLoading(false)
          return
        }

        // Fetch scores with player nicknames
        const { data: players } = await supabase
          .from('players')
          .select('id, nickname')
          .eq('room_id', room.id)
          .neq('is_host', true)

        const nicknameMap = new Map((players ?? []).map((p) => [p.id, p.nickname]))

        // Aggregate scores
        const { data: scores } = await supabase
          .from('wc_scores')
          .select('player_id, points, wc_rounds!inner(room_id)')
          .eq('wc_rounds.room_id', room.id)

        const playerTotals = new Map<string, number>()
        const playerRounds = new Map<string, number>()

        for (const s of scores ?? []) {
          playerTotals.set(s.player_id, (playerTotals.get(s.player_id) ?? 0) + (s.points ?? 0))
          playerRounds.set(s.player_id, (playerRounds.get(s.player_id) ?? 0) + 1)
        }

        for (const p of players ?? []) {
          if (!playerTotals.has(p.id)) {
            playerTotals.set(p.id, 0)
            playerRounds.set(p.id, 0)
          }
        }

        const lb: WordChainLeaderboardRow[] = Array.from(playerTotals.entries())
          .map(([player_id, total_points]) => ({
            player_id,
            nickname: nicknameMap.get(player_id) ?? 'Unknown',
            total_points,
            rounds_survived: playerRounds.get(player_id) ?? 0,
          }))
          .sort((a, b) => b.total_points - a.total_points)

        setLeaderboard(lb)

        // Fetch round breakdowns
        const { data: rounds } = await supabase
          .from('wc_rounds')
          .select(
            `
            id,
            round_number,
            category_id,
            wc_categories!inner(name, difficulty, points)
          `,
          )
          .eq('room_id', room.id)
          .order('round_number', { ascending: true })

        const breakdowns: WordChainRoundBreakdown[] = []

        for (const r of rounds ?? []) {
          const category = (r as any).wc_categories
          const { data: rps } = await supabase
            .from('wc_round_players')
            .select('player_id, status')
            .eq('round_id', r.id)

          const survivors: { nickname: string }[] = []
          const eliminated: { nickname: string; reason: string }[] = []

          for (const rp of rps ?? []) {
            const nick = nicknameMap.get(rp.player_id) ?? 'Unknown'
            if (rp.status === 'survivor') {
              survivors.push({ nickname: nick })
            } else if (rp.status === 'eliminated') {
              eliminated.push({ nickname: nick, reason: 'timeout' })
            }
          }

          breakdowns.push({
            round_number: r.round_number,
            category_name: category?.name ?? 'Unknown',
            difficulty: category?.difficulty ?? 'easy',
            points: category?.points ?? 1,
            survivors,
            eliminated,
          })
        }

        setRoundBreakdowns(breakdowns)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [code, router])

  if (loading) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading results…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <p className="text-destructive">{error}</p>
      </main>
    )
  }

  return (
    <WordChainResultsView
      roomCode={code}
      leaderboard={leaderboard}
      roundBreakdowns={roundBreakdowns}
    />
  )
}
