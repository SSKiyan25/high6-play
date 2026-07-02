'use client'

import { useState, useEffect, useCallback } from 'react'
import { pusherClient } from '@/lib/pusher/client'
import type { WcGameState, WcPlayerWithNickname } from '../types'

interface UseWordChainOptions {
  roomCode: string
  initialGameState: WcGameState
}

interface UseWordChainReturn {
  gameState: WcGameState
  currentPlayer: WcPlayerWithNickname | null
  isGameOver: boolean
  winnerId: string | null
}

/**
 * Subscribes to room-{code}-game Pusher channel.
 * Listens for word-submitted (append word, advance turn),
 * player-eliminated (move player to eliminated, adjust turn),
 * and game-ended (set isGameOver, winnerId).
 *
 * Returns derived game state including the current player whose turn it is.
 */
export function useWordChain({
  roomCode,
  initialGameState,
}: UseWordChainOptions): UseWordChainReturn {
  const [gameState, setGameState] = useState<WcGameState>(initialGameState)

  // Sync when initialGameState changes
  useEffect(() => {
    setGameState(initialGameState)
  }, [initialGameState])

  useEffect(() => {
    if (!roomCode) return

    const channel = pusherClient.subscribe(`room-${roomCode}-game`)

    channel.bind(
      'word-submitted',
      (data: { word: string; playerId: string; nextPlayerIndex: number }) => {
        setGameState((prev) => ({
          ...prev,
          usedWords: [...prev.usedWords, data.word],
          lastWord: data.word,
          currentPlayerIndex: data.nextPlayerIndex,
        }))
      },
    )

    channel.bind(
      'player-eliminated',
      (data: { playerId: string; reason: string; remainingCount: number }) => {
        setGameState((prev) => {
          const eliminatedPlayer = prev.activePlayers.find(
            (p) => p.player_id === data.playerId,
          )
          if (!eliminatedPlayer) return prev

          const oldIndex = prev.activePlayers.indexOf(eliminatedPlayer)
          const newActive = prev.activePlayers.filter(
            (p) => p.player_id !== data.playerId,
          )
          const newEliminated = [
            ...prev.eliminatedPlayers,
            { ...eliminatedPlayer, is_eliminated: true },
          ]

          // Adjust currentPlayerIndex when a player before/at current is removed
          let newIndex = prev.currentPlayerIndex
          if (oldIndex < prev.currentPlayerIndex) {
            newIndex--
          }
          // Modulo with new active count (guard against 0)
          if (newActive.length > 0) {
            newIndex = newIndex % newActive.length
          } else {
            newIndex = 0
          }

          const isGameOver = newActive.length <= 1
          const winnerId =
            isGameOver && newActive.length === 1
              ? newActive[0].player_id
              : null

          return {
            ...prev,
            activePlayers: newActive,
            eliminatedPlayers: newEliminated,
            currentPlayerIndex: newIndex,
            isGameOver,
            winnerId,
          }
        })
      },
    )

    channel.bind(
      'game-ended',
      (data: { winnerId: string | null }) => {
        setGameState((prev) => ({
          ...prev,
          isGameOver: true,
          winnerId: data.winnerId,
        }))
      },
    )

    return () => {
      channel.unbind('word-submitted')
      channel.unbind('player-eliminated')
      channel.unbind('game-ended')
      pusherClient.unsubscribe(`room-${roomCode}-game`)
    }
  }, [roomCode])

  const currentPlayer =
    gameState.activePlayers.length > 0
      ? gameState.activePlayers[gameState.currentPlayerIndex] ?? null
      : null

  return {
    gameState,
    currentPlayer,
    isGameOver: gameState.isGameOver,
    winnerId: gameState.winnerId,
  }
}
