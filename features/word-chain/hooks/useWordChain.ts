'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { pusherClient } from '@/lib/pusher/client'
import { createClient } from '@/lib/supabase/client'
import type { WordChainRound, WordChainRoundPlayer, WordChainRoundPlayerStatus, WordChainCategory } from '../types'

interface UseWordChainOptions {
  roomCode: string
  playerId: string
}

export interface RoundPlayer {
  id: string
  round_id: string
  player_id: string
  status: WordChainRoundPlayerStatus
  skip_used: boolean
  turn_index: number
  created_at: string
  nickname: string
}

export interface UseWordChainState {
  currentRoundId: string | null
  currentRoundNumber: number
  roundStatus: string
  category: WordChainCategory | null
  roundPlayers: RoundPlayer[]
  turnOrder: string[]
  currentTurnPlayerId: string | null
  currentTurnNickname: string | null
  isMyTurn: boolean
  myStatus: WordChainRoundPlayerStatus | null
  mySkipUsed: boolean
  myScore: number
  timePerPlayerSeconds: number
  totalRounds: number
  isGameOver: boolean
  /** True when round has ended, with survivor data */
  roundEnded: boolean
  survivors: { player_id: string; nickname: string }[] | null
  pointsAwarded: number | null
  /** Seconds remaining in the pre-round buffer (0 when not buffering) */
  bufferTimeLeft: number
  confirmTurn: () => Promise<void>
  skipTurn: () => Promise<void>
  loading: boolean
  error: string | null
}

/**
 * Subscribes to room-{code}-game Pusher channel.
 *
 * On round-started: sets round state, category, turn order.
 * On turn-advanced: updates current player.
 * On player-skipped: updates the skipping player's status.
 * On player-eliminated: removes player from active list.
 * On round-ended: sets roundEnded + survivors.
 * On game-ended: sets isGameOver.
 */
export function useWordChain({
  roomCode,
  playerId,
}: UseWordChainOptions): UseWordChainState {
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null)
  const [currentRoundNumber, setCurrentRoundNumber] = useState(0)
  const [roundStatus, setRoundStatus] = useState<string>('active')
  const [category, setCategory] = useState<WordChainCategory | null>(null)
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([])
  const [turnOrder, setTurnOrder] = useState<string[]>([])
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null)
  const [currentTurnNickname, setCurrentTurnNickname] = useState<string | null>(null)
  const [timePerPlayerSeconds, setTimePerPlayerSeconds] = useState(30)
  const [totalRounds, setTotalRounds] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [roundEnded, setRoundEnded] = useState(false)
  const [survivors, setSurvivors] = useState<{ player_id: string; nickname: string }[] | null>(null)
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bufferTimeLeft, setBufferTimeLeft] = useState(0)
  const bufferIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Derived ──────────────────────────────────────────────────────────
  const myPlayer = roundPlayers.find((rp) => rp.player_id === playerId)
  const isMyTurn = currentTurnPlayerId === playerId && roundStatus === 'active'
  const myStatus = myPlayer?.status ?? null
  const mySkipUsed = myPlayer?.skip_used ?? false

  // ── Fetch current scores ─────────────────────────────────────────────
  const [myScore, setMyScore] = useState(0)

  const fetchMyScore = useCallback(
    async (roomId: string) => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('wc_scores')
          .select('points, wc_rounds!inner(room_id)')
          .eq('wc_rounds.room_id', roomId)
          .eq('player_id', playerId)

        const total = (data ?? []).reduce((sum, s) => sum + (s.points ?? 0), 0)
        setMyScore(total)
      } catch {
        // Non-critical
      }
    },
    [playerId],
  )

  // ── Fetch round state from Supabase ──────────────────────────────────
  const fetchRoundState = useCallback(
    async (roundId: string, roomId?: string) => {
      try {
        const supabase = createClient()

        // Fetch round
        const { data: round } = await supabase
          .from('wc_rounds')
          .select()
          .eq('id', roundId)
          .single()

        if (!round) return

        setCurrentRoundNumber(round.round_number)
        setRoundStatus(round.status)
        setTurnOrder(round.turn_order ?? [])
        setCurrentTurnPlayerId(round.current_turn_player_id)

        // Fetch round players with nicknames
        const { data: rps } = await supabase
          .from('wc_round_players')
          .select('*, players!inner(nickname)')
          .eq('round_id', roundId)
          .order('turn_index', { ascending: true })

        const mapped: RoundPlayer[] = (rps ?? []).map((rp: any) => ({
          id: rp.id,
          round_id: rp.round_id,
          player_id: rp.player_id,
          status: rp.status as WordChainRoundPlayerStatus,
          skip_used: rp.skip_used ?? false,
          turn_index: rp.turn_index,
          created_at: rp.created_at,
          nickname: (rp as any).players?.nickname ?? 'Unknown',
        }))

        setRoundPlayers(mapped)

        // Find current turn nickname
        const currentP = mapped.find((p) => p.player_id === round.current_turn_player_id)
        setCurrentTurnNickname(currentP?.nickname ?? null)

        // Fetch category
        const { data: cat } = await supabase
          .from('wc_categories')
          .select()
          .eq('id', round.category_id)
          .single()

        if (cat) setCategory(cat as WordChainCategory)

        // Check if round ended
        if (round.status === 'ended') {
          setRoundEnded(true)
        }

        // Fetch scores
        if (roomId || round.room_id) {
          fetchMyScore(roomId ?? round.room_id)
        }
      } catch {
        // Silently handle
      }
    },
    [playerId, fetchMyScore],
  )

  // ── Initial state fetch (page reload resilience) ────────────────────
  useEffect(() => {
    if (!roomCode || !playerId) return

    const init = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        // Look up room
        const { data: room } = await supabase
          .from('rooms')
          .select('id, status')
          .eq('code', roomCode)
          .single()

        if (!room) return

        if (room.status === 'ended') {
          setIsGameOver(true)
          setLoading(false)
          return
        }

        // Look up current round
        const { data: round } = await supabase
          .from('wc_rounds')
          .select('id, room_id')
          .eq('room_id', room.id)
          .order('round_number', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (round) {
          setCurrentRoundId(round.id)
          await fetchRoundState(round.id, room.id)
        }

        // Fetch config for timer duration
        const { data: config } = await supabase
          .from('wc_room_config')
          .select('time_per_player_seconds, total_rounds')
          .eq('room_id', room.id)
          .maybeSingle()

        if (config) {
          setTimePerPlayerSeconds(config.time_per_player_seconds ?? 30)
          setTotalRounds(config.total_rounds ?? 0)
        }
      } catch {
        // Pusher will handle when game starts
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [roomCode, playerId, fetchRoundState])

  // ── Pusher subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return

    const channel = pusherClient.subscribe(`room-${roomCode}-game`)

    channel.bind(
      'round-started',
      (data: {
        roundNumber: number
        roundId: string
        categoryId: string
        categoryName: string
        difficulty: string
        points: number
        turnOrder: string[]
        currentPlayerId: string
        currentPlayerNickname: string
        timePerPlayerSeconds: number
        totalRounds: number
        bufferSeconds?: number
      }) => {
        // Clear any existing buffer interval
        if (bufferIntervalRef.current) {
          clearInterval(bufferIntervalRef.current)
          bufferIntervalRef.current = null
        }

        setCurrentRoundId(data.roundId)
        setCurrentRoundNumber(data.roundNumber)
        setTurnOrder(data.turnOrder)
        setCurrentTurnPlayerId(data.currentPlayerId)
        setCurrentTurnNickname(data.currentPlayerNickname)
        setTimePerPlayerSeconds(data.timePerPlayerSeconds)
        setTotalRounds(data.totalRounds)
        setRoundEnded(false)
        setSurvivors(null)
        setPointsAwarded(null)

        // Set category from event payload (avoids extra fetch)
        setCategory({
          id: data.categoryId,
          name: data.categoryName,
          difficulty: data.difficulty as WordChainCategory['difficulty'],
          points: data.points as 1 | 2 | 3,
          created_at: '',
        })

        // Fetch full round state from Supabase
        fetchRoundState(data.roundId)

        // Start buffer countdown if bufferSeconds provided
        const buffer = data.bufferSeconds ?? 0
        if (buffer > 0) {
          setRoundStatus('buffering')
          setBufferTimeLeft(buffer)

          bufferIntervalRef.current = setInterval(() => {
            setBufferTimeLeft((prev) => {
              const next = prev - 1
              if (next <= 0) {
                if (bufferIntervalRef.current) {
                  clearInterval(bufferIntervalRef.current)
                  bufferIntervalRef.current = null
                }
                setRoundStatus('active')
                return 0
              }
              return next
            })
          }, 1000)
        } else {
          setRoundStatus('active')
          setBufferTimeLeft(0)
        }
      },
    )

    channel.bind(
      'turn-advanced',
      (data: {
        roundId: string
        previousPlayerId: string
        previousPlayerNickname: string
        currentPlayerId: string | null
        currentPlayerNickname: string | null
        activePlayerCount: number
      }) => {
        setCurrentTurnPlayerId(data.currentPlayerId)
        setCurrentTurnNickname(data.currentPlayerNickname)
        // Statuses are managed by player-skipped, player-eliminated, and
        // round-ended — turn-advanced only advances the turn pointer.
      },
    )

    channel.bind(
      'player-skipped',
      (data: {
        roundId: string
        playerId: string
        playerNickname: string
      }) => {
        setRoundPlayers((prev) =>
          prev.map((rp) =>
            rp.player_id === data.playerId
              ? { ...rp, skip_used: true, status: 'skipped_this_cycle' }
              : rp,
          ),
        )
      },
    )

    channel.bind(
      'player-eliminated',
      (data: {
        roundId: string
        playerId: string
        playerNickname: string
        reason: string
        activePlayerCount: number
      }) => {
        setRoundPlayers((prev) =>
          prev.map((rp) =>
            rp.player_id === data.playerId
              ? { ...rp, status: 'eliminated' }
              : rp,
          ),
        )
      },
    )

    channel.bind(
      'round-ended',
      (data: {
        roundId: string
        survivors: { player_id: string; nickname: string }[]
        pointsAwarded: number
      }) => {
        setRoundEnded(true)
        setRoundStatus('ended')
        setSurvivors(data.survivors)
        setPointsAwarded(data.pointsAwarded)
        setCurrentTurnPlayerId(null)
        setCurrentTurnNickname(null)

        // Mark survivors
        const survivorIds = new Set(data.survivors.map((s) => s.player_id))
        setRoundPlayers((prev) =>
          prev.map((rp) =>
            survivorIds.has(rp.player_id)
              ? { ...rp, status: 'survivor' }
              : rp,
          ),
        )

        // Refresh scores
        fetchMyScore('')
      },
    )

    channel.bind('game-ended', () => {
      setIsGameOver(true)
    })

    return () => {
      if (bufferIntervalRef.current) {
        clearInterval(bufferIntervalRef.current)
        bufferIntervalRef.current = null
      }
      channel.unbind('round-started')
      channel.unbind('turn-advanced')
      channel.unbind('player-skipped')
      channel.unbind('player-eliminated')
      channel.unbind('round-ended')
      channel.unbind('game-ended')
      pusherClient.unsubscribe(`room-${roomCode}-game`)
    }
  }, [roomCode, fetchRoundState, fetchMyScore])

  // ── Actions ──────────────────────────────────────────────────────────
  const confirmTurn = useCallback(async () => {
    if (!currentRoundId || !playerId || !roomCode) {
      throw new Error('Missing round, player, or room context.')
    }

    const res = await fetch('/api/games/word-chain/confirm-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        round_id: currentRoundId,
        player_id: playerId,
        room_code: roomCode,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to confirm turn')
    }
  }, [currentRoundId, playerId, roomCode])

  const skipTurnAction = useCallback(async () => {
    if (!currentRoundId || !playerId || !roomCode) {
      throw new Error('Missing round, player, or room context.')
    }

    const res = await fetch('/api/games/word-chain/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        round_id: currentRoundId,
        player_id: playerId,
        room_code: roomCode,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to skip turn')
    }
  }, [currentRoundId, playerId, roomCode])

  return {
    currentRoundId,
    currentRoundNumber,
    roundStatus,
    category,
    roundPlayers,
    turnOrder,
    currentTurnPlayerId,
    currentTurnNickname,
    isMyTurn,
    myStatus,
    mySkipUsed,
    myScore,
    timePerPlayerSeconds,
    totalRounds,
    isGameOver,
    roundEnded,
    survivors,
    pointsAwarded,
    confirmTurn,
    skipTurn: skipTurnAction,
    loading,
    error,
    bufferTimeLeft,
  }
}
