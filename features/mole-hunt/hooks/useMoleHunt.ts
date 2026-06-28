'use client'

import { useState, useEffect, useCallback } from 'react'
import { pusherClient } from '@/lib/pusher/client'
import type { MolePhase, MoleRole, MoleTopic, MyRoleResponse } from '../types'

interface UseMoleHuntOptions {
  roomCode: string
  playerId: string
}

export interface UseMoleHuntState {
  currentRoundId: string | null
  currentRoundNumber: number
  currentPhase: MolePhase
  myRole: MoleRole | null
  topic: MoleTopic | null
  /** Only exposed to the mole — the correct answer for this round. */
  correctChoice: 'a' | 'b' | null
  /** Only exposed to the mole — the single persuasion argument assigned to this mole, if any. */
  moleArgument: string | null
  /** Real-time vote progress: { votedCount, totalPlayers }. */
  voteProgress: { votedCount: number; totalPlayers: number } | null
  /** True after scores-updated Pusher event fires. */
  scoresUpdated: boolean
  /** True when the game has ended (no more rounds). */
  isGameOver: boolean
  submitVote: (choice: 'a' | 'b') => Promise<void>
  loading: boolean
  error: string | null
}

/**
 * Subscribes to room-{code}-game Pusher channel.
 *
 * On round-started: stores roundId, fetches `GET /api/games/mole-hunt/my-role`
 * independently per client — never reads role from the Pusher payload.
 *
 * On phase-advanced: updates currentPhase.
 * On vote-submitted: updates vote progress { votedCount, totalPlayers }.
 * On scores-updated: sets scoresUpdated flag for leaderboard refresh.
 * On game-ended: sets isGameOver.
 */
export function useMoleHunt({
  roomCode,
  playerId,
}: UseMoleHuntOptions): UseMoleHuntState {
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null)
  const [currentRoundNumber, setCurrentRoundNumber] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<MolePhase>('discuss')
  const [myRole, setMyRole] = useState<MoleRole | null>(null)
  const [topic, setTopic] = useState<MoleTopic | null>(null)
  const [correctChoice, setCorrectChoice] = useState<'a' | 'b' | null>(null)
  const [moleArgument, setMoleArgument] = useState<string | null>(null)
  const [voteProgress, setVoteProgress] = useState<{
    votedCount: number
    totalPlayers: number
  } | null>(null)
  const [scoresUpdated, setScoresUpdated] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch my role from API ──────────────────────────────────────────
  const fetchMyRole = useCallback(
    async (roundId: string) => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(
          `/api/games/mole-hunt/my-role?round_id=${encodeURIComponent(roundId)}&player_id=${encodeURIComponent(playerId)}`,
        )
        const data: MyRoleResponse & { error?: string } = await res.json()

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to fetch role')
        }

        setMyRole(data.role)
        setTopic(data.topic)
        setCorrectChoice(data.correct_choice ?? null)
        setMoleArgument(data.mole_argument ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch role')
      } finally {
        setLoading(false)
      }
    },
    [playerId],
  )

  // ── Pusher subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return

    const channel = pusherClient.subscribe(`room-${roomCode}-game`)

    channel.bind(
      'round-started',
      (data: {
        roundNumber: number
        roundId: string
        phase: MolePhase
        topicId: string
      }) => {
        setCurrentRoundId(data.roundId)
        setCurrentRoundNumber(data.roundNumber)
        setCurrentPhase(data.phase)
        setVoteProgress(null)
        setScoresUpdated(false)
        // Fetch own role independently — never from Pusher
        fetchMyRole(data.roundId)
      },
    )

    channel.bind(
      'phase-advanced',
      (data: { roundId: string; phase: MolePhase }) => {
        setCurrentPhase(data.phase)
      },
    )

    channel.bind(
      'vote-submitted',
      (data: { roundId: string; votedCount: number; totalPlayers: number }) => {
        setVoteProgress({
          votedCount: data.votedCount,
          totalPlayers: data.totalPlayers,
        })
      },
    )

    channel.bind('scores-updated', (data: { roundId: string }) => {
      setScoresUpdated(true)
    })

    channel.bind('game-ended', () => {
      setIsGameOver(true)
    })

    return () => {
      channel.unbind('round-started')
      channel.unbind('phase-advanced')
      channel.unbind('vote-submitted')
      channel.unbind('scores-updated')
      channel.unbind('game-ended')
      pusherClient.unsubscribe(`room-${roomCode}-game`)
    }
  }, [roomCode, fetchMyRole])

  // ── Submit vote ─────────────────────────────────────────────────────
  const submitVote = useCallback(
    async (choice: 'a' | 'b') => {
      if (!currentRoundId || !playerId || !roomCode) {
        throw new Error('Missing round, player, or room context.')
      }

      const res = await fetch('/api/games/mole-hunt/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: currentRoundId,
          player_id: playerId,
          choice,
          room_code: roomCode,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit vote')
      }
    },
    [currentRoundId, playerId, roomCode],
  )

  return {
    currentRoundId,
    currentRoundNumber,
    currentPhase,
    myRole,
    topic,
    correctChoice,
    moleArgument,
    voteProgress,
    scoresUpdated,
    isGameOver,
    submitVote,
    loading,
    error,
  }
}
