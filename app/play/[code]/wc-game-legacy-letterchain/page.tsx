'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PlayerWcView } from '@/features/word-chain-legacy-letterchain/components/PlayerWcView'
import { Loader2 } from 'lucide-react'
import type { Room } from '@/features/rooms/types'
import type { WcGameState } from '@/features/word-chain-legacy-letterchain/types'

interface PlayerIdentity {
  nickname: string
  playerId: string
}

export default function PlayWcGamePage() {
  const params = useParams<{ code: string }>()
  const code = params?.code ?? ''

  const [identity, setIdentity] = useState<PlayerIdentity | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<WcGameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return

    // Load player identity from localStorage
    const stored = localStorage.getItem('h6p_player')
    if (!stored) {
      setError('No player session found.')
      setLoading(false)
      return
    }

    let parsed: PlayerIdentity
    try {
      parsed = JSON.parse(stored)
    } catch {
      setError('Invalid player session.')
      setLoading(false)
      return
    }

    setIdentity(parsed)

    let cancelled = false

    async function init() {
      try {
        // Fetch room to get room.id
        const roomRes = await fetch(
          `/api/rooms?code=${encodeURIComponent(code)}`,
        )
        const roomData = await roomRes.json()

        if (!roomRes.ok) throw new Error(roomData.error || 'Room not found')

        const room: Room = roomData.room

        if (cancelled) return
        setRoomId(room.id)

        // Fetch game state via Supabase browser client
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        // Fetch wc_players with nicknames
        const { data: wcPlayersData, error: playersError } = await supabase
          .from('wc_players')
          .select(
            `
            id,
            room_id,
            player_id,
            is_eliminated,
            players!inner (
              nickname,
              created_at
            )
          `,
          )
          .eq('room_id', room.id)
          .order('created_at', {
            referencedTable: 'players',
            ascending: true,
          })

        if (playersError) throw playersError

        // Fetch words
        const { data: wordsData, error: wordsError } = await supabase
          .from('wc_words')
          .select()
          .eq('room_id', room.id)
          .order('turn_order', { ascending: true })

        if (wordsError) throw wordsError

        // Compute game state locally
        const players = ((wcPlayersData || []) as Record<string, unknown>[]).map(
          (row) => ({
            id: row.id as string,
            room_id: row.room_id as string,
            player_id: row.player_id as string,
            is_eliminated: row.is_eliminated as boolean,
            nickname:
              (row.players as { nickname: string })?.nickname ?? 'Unknown',
          }),
        )

        const words = (wordsData || []) as { word: string }[]
        const activePlayers = players.filter((p) => !p.is_eliminated)
        const eliminatedPlayers = players.filter((p) => p.is_eliminated)
        const usedWords = words.map((w) => w.word)
        const lastWord =
          usedWords.length > 0 ? usedWords[usedWords.length - 1] : null
        const isGameOver = activePlayers.length <= 1
        const winnerId =
          isGameOver && activePlayers.length === 1
            ? activePlayers[0].player_id
            : null

        if (!cancelled) {
          setGameState({
            currentPlayerIndex:
              activePlayers.length > 0
                ? usedWords.length % activePlayers.length
                : 0,
            usedWords,
            activePlayers,
            eliminatedPlayers,
            lastWord,
            isGameOver,
            winnerId,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Something went wrong',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [code])

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Joining game…</p>
      </main>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <p className="text-muted-foreground">{error}</p>
        <a
          href="/"
          className="text-sm text-primary transition-colors hover:underline"
        >
          ← Go back to join
        </a>
      </main>
    )
  }

  // ── Game ──────────────────────────────────────────────────────────
  if (!identity || !roomId || !gameState) return null

  return (
    <PlayerWcView
      roomCode={code}
      roomId={roomId}
      playerId={identity.playerId}
      initialGameState={gameState}
    />
  )
}
