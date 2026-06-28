'use client'

import { useState, useEffect, useCallback } from 'react'
import { pusherClient } from '@/lib/pusher/client'
import { getCurrentRound } from '../actions'
import type {
  MolePhase,
  MoleRole,
  MoleRound,
  MoleTopic,
} from '../types'

interface ControlPlayer {
  id: string
  nickname: string
  role: MoleRole
}

interface ControlData {
  round: MoleRound
  topic: MoleTopic
  players: ControlPlayer[]
  voteProgress: {
    votedCount: number
    totalPlayers: number
  }
}

interface UseMoleHuntControlOptions {
  roomCode: string
  roomId: string
}

export interface UseMoleHuntControlState {
  currentRound: MoleRound | null
  currentPhase: MolePhase
  topic: MoleTopic | null
  moles: ControlPlayer[]
  canaries: ControlPlayer[]
  crew: ControlPlayer[]
  players: ControlPlayer[]
  voteProgress: { votedCount: number; totalPlayers: number }
  advancePhase: () => Promise<void>
  nextRound: () => Promise<void>
  deductCanaryPoints: (playerId: string) => Promise<void>
  endGame: () => Promise<void>
  loading: boolean
  error: string | null
}

/**
 * Host-only hook for the Mole Hunt Control Room.
 *
 * Subscribes to room-{code}-game for round-started, phase-advanced,
 * vote-submitted, and scores-updated Pusher events.
 *
 * On round-started: fetches GET /api/games/mole-hunt/control-data?roundId=
 * to get the full Mole/Canary identity breakdown — NEVER from Pusher.
 */
export function useMoleHuntControl({
  roomCode,
  roomId,
}: UseMoleHuntControlOptions): UseMoleHuntControlState {
  const [currentRound, setCurrentRound] = useState<MoleRound | null>(null)
  const [currentPhase, setCurrentPhase] = useState<MolePhase>('discuss')
  const [topic, setTopic] = useState<MoleTopic | null>(null)
  const [moles, setMoles] = useState<ControlPlayer[]>([])
  const [canaries, setCanaries] = useState<ControlPlayer[]>([])
  const [crew, setCrew] = useState<ControlPlayer[]>([])
  const [players, setPlayers] = useState<ControlPlayer[]>([])
  const [voteProgress, setVoteProgress] = useState({
    votedCount: 0,
    totalPlayers: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch control data from API ───────────────────────────────────
  const fetchControlData = useCallback(async (roundId: string) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(
        `/api/games/mole-hunt/control-data?roundId=${encodeURIComponent(roundId)}`,
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch control data')
      }

      const data: ControlData = await res.json()

      setCurrentRound(data.round)
      setTopic(data.topic)
      setPlayers(data.players)
      setMoles(data.players.filter((p) => p.role === 'mole'))
      setCanaries(data.players.filter((p) => p.role === 'canary'))
      setCrew(data.players.filter((p) => p.role === 'crew'))
      setVoteProgress(data.voteProgress)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch control data',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Initial state fetch (handles page reloads) ────────────────────
  useEffect(() => {
    if (!roomId) return

    const init = async () => {
      try {
        const round = await getCurrentRound(roomId)
        if (round?.id) {
          setCurrentPhase((round.phase as MolePhase) ?? 'discuss')
          fetchControlData(round.id)
        }
      } catch {
        // If no round exists yet, Pusher will handle it when the game starts
      }
    }
    init()
  }, [roomId, fetchControlData])

  // ── Pusher subscription ───────────────────────────────────────────
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
        setCurrentPhase(data.phase)
        setVoteProgress({ votedCount: 0, totalPlayers: 0 })
        // Fetch Mole/Canary identities from API — never from Pusher
        fetchControlData(data.roundId)
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

    channel.bind('scores-updated', () => {
      // Scores updated — no local state change needed
    })

    channel.bind('game-ended', () => {
      // Game over — handled by the Control Room component
    })

    return () => {
      channel.unbind('round-started')
      channel.unbind('phase-advanced')
      channel.unbind('vote-submitted')
      channel.unbind('scores-updated')
      channel.unbind('game-ended')
      pusherClient.unsubscribe(`room-${roomCode}-game`)
    }
  }, [roomCode, fetchControlData])

  // ── Advance Phase ─────────────────────────────────────────────────
  const advancePhase = useCallback(async () => {
    if (!currentRound?.id) return

    await fetch('/api/games/mole-hunt/advance-phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        round_id: currentRound.id,
        room_code: roomCode,
      }),
    })
  }, [currentRound?.id, roomCode])

  // ── Next Round ────────────────────────────────────────────────────
  const nextRoundFn = useCallback(async () => {
    await fetch('/api/games/mole-hunt/next-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_code: roomCode }),
    })
  }, [roomCode])

  // ── Deduct Canary Points ──────────────────────────────────────────
  const deductCanaryPointsFn = useCallback(
    async (playerId: string) => {
      await fetch('/api/games/mole-hunt/canary-deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          player_id: playerId,
          room_code: roomCode,
        }),
      })
    },
    [roomId, roomCode],
  )

  // ── End Game ──────────────────────────────────────────────────────
  const endGame = useCallback(async () => {
    await fetch('/api/rooms/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode }),
    })
  }, [roomCode])

  return {
    currentRound,
    currentPhase,
    topic,
    moles,
    canaries,
    crew,
    players,
    voteProgress,
    advancePhase,
    nextRound: nextRoundFn,
    deductCanaryPoints: deductCanaryPointsFn,
    endGame,
    loading,
    error,
  }
}
