'use client'

import { useState, useEffect, useCallback } from 'react'
import { pusherClient } from '@/lib/pusher/client'
import type { Player } from '../types'

interface UseRoomPlayersOptions {
  roomCode: string
  initialPlayers: Player[]
  onRoomClosed?: () => void
  onGameStarted?: (gameType: string) => void
  onPlayerRemoved?: (playerId: string) => void
}

export function useRoomPlayers({
  roomCode,
  initialPlayers,
  onRoomClosed,
  onGameStarted,
  onPlayerRemoved,
}: UseRoomPlayersOptions) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)

  // Sync when initialPlayers changes (e.g. server re-fetch)
  useEffect(() => {
    setPlayers(initialPlayers)
  }, [initialPlayers])

  useEffect(() => {
    if (!roomCode) return

    const channel = pusherClient.subscribe(`room-${roomCode}`)

    channel.bind('player-joined', (data: { player: Player }) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.id === data.player.id)) return prev
        return [...prev, data.player]
      })
    })

    channel.bind('player-removed', (data: { playerId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== data.playerId))
      onPlayerRemoved?.(data.playerId)
    })

    channel.bind('room-closed', () => {
      onRoomClosed?.()
    })

    channel.bind('game-started', (data: { game_type: string }) => {
      onGameStarted?.(data.game_type)
    })

    return () => {
      channel.unbind_all()
      pusherClient.unsubscribe(`room-${roomCode}`)
    }
  }, [roomCode, onRoomClosed, onGameStarted])

  return { players }
}
