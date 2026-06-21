'use client'

import { useEffect, useState } from 'react'
import { PlayerLobby } from './PlayerLobby'
import type { RoomWithPlayers } from '../types'

export function PlayerLobbyGate({ room }: { room: RoomWithPlayers }) {
  const [nickname, setNickname] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('h6p_player')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setNickname(parsed.nickname || null)
      } catch {
        // Invalid stored data
      }
    }
    setChecked(true)
  }, [])

  if (!checked) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!nickname) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">No player session found.</p>
        <a
          href="/"
          className="text-sm text-primary transition-colors hover:underline"
        >
          ← Go back to join
        </a>
      </div>
    )
  }

  return <PlayerLobby room={room} playerNickname={nickname} />
}
