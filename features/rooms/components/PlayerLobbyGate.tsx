'use client'

import { useEffect, useState } from 'react'
import { PlayerLobby } from './PlayerLobby'
import type { RoomWithPlayers } from '../types'

export function PlayerLobbyGate({ room }: { room: RoomWithPlayers }) {
  const [playerData, setPlayerData] = useState<{ nickname: string; playerId: string } | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('h6p_player')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.nickname) {
          setPlayerData({ nickname: parsed.nickname, playerId: parsed.playerId || '' })
        }
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

  if (!playerData) {
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

  return <PlayerLobby room={room} playerNickname={playerData.nickname} playerId={playerData.playerId} />
}
