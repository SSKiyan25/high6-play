'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PlayerView } from '@/features/mole-hunt/components/PlayerView'
import { Loader2 } from 'lucide-react'

interface PlayerIdentity {
  nickname: string
  playerId: string
}

export default function MoleHuntPlayPage() {
  const params = useParams<{ code: string }>()
  const code = params?.code ?? ''

  const [identity, setIdentity] = useState<PlayerIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return

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
    setLoading(false)
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

  return <PlayerView roomCode={code} playerId={identity.playerId} />
}
