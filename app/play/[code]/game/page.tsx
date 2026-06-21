'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PlayerView } from '@/features/this-or-that/components/PlayerView'
import { Loader2 } from 'lucide-react'
import type { Room } from '@/features/rooms/types'
import type { TotQuestion } from '@/features/this-or-that/types'

interface PlayerIdentity {
  nickname: string
  playerId: string
}

export default function PlayGamePage() {
  const params = useParams<{ code: string }>()
  const code = params?.code ?? ''

  const [identity, setIdentity] = useState<PlayerIdentity | null>(null)
  const [questions, setQuestions] = useState<TotQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
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

    // Fetch room + questions
    let cancelled = false

    async function init() {
      try {
        // Fetch room to get room.id and current_question_index
        const roomRes = await fetch(`/api/rooms?code=${encodeURIComponent(code)}`)
        const roomData = await roomRes.json()

        if (!roomRes.ok) throw new Error(roomData.error || 'Room not found')

        const room: Room = roomData.room

        if (!cancelled) {
          setCurrentIndex(room.current_question_index ?? 0)
        }

        // Fetch questions via the Supabase browser client
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data: qs, error: qsError } = await supabase
          .from('tot_questions')
          .select()
          .eq('room_id', room.id)
          .order('order', { ascending: true })

        if (qsError) throw qsError

        if (!cancelled) {
          setQuestions((qs as TotQuestion[]) || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
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
  if (!identity) return null

  return (
    <PlayerView
      roomCode={code}
      playerId={identity.playerId}
      questions={questions}
      initialIndex={currentIndex}
    />
  )
}
