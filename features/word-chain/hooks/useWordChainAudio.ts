'use client'

import { useEffect, useRef, useCallback } from 'react'
import { pusherClient } from '@/lib/pusher/client'
import type { AudioEngine } from '@/features/shared/audio/AudioEngine'

// ── Types ──────────────────────────────────────────────────────────────────

interface UseWordChainAudioOptions {
  roomCode: string
  engine: AudioEngine | null
  isHost: boolean
  /** Player screens default to muted; host defaults to enabled. */
  enabled?: boolean
  /** Host passes this from its timer state — triggers timer tension music at t≤5s. */
  timerUrgent?: boolean
  /** Host passes this — triggers times-up SFX when timer hits 0. */
  timerExpired?: boolean
  /** Player's own ID (from props, not localStorage) — used to match "my turn passed." */
  playerId?: string
}

interface RoundStartedPayload {
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
}

interface TurnAdvancedPayload {
  roundId: string
  previousPlayerId: string
  previousPlayerNickname: string
  currentPlayerId: string | null
  currentPlayerNickname: string | null
  activePlayerCount: number
  reason?: 'confirmed' | 'timeout' | 'skipped'
}

interface PlayerSkippedPayload {
  roundId: string
  playerId: string
  playerNickname: string
}

interface PlayerEliminatedPayload {
  roundId: string
  playerId: string
  playerNickname: string
  reason: string
  activePlayerCount: number
}

interface RoundEndedPayload {
  roundId: string
  survivors: { player_id: string; nickname: string }[]
  pointsAwarded: number
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Wires Word Chain Pusher events to the AudioEngine.
 *
 * Host: full music (BGM loop + timer tension) + all one-shot SFX.
 * Player: one-shot SFX only (skipped, eliminated, passed), only when
 *         `enabled` is true (default false — muted by default).
 *
 * Includes a simple de-dupe guard keyed by roundId|eventName|playerId
 * to prevent double-fires from Pusher reconnects.
 *
 * The caller is responsible for preloading assets via engine.preload()
 * and calling engine.unlock() on a user gesture before audio is needed.
 */
export function useWordChainAudio({
  roomCode,
  engine,
  isHost,
  enabled = isHost,
  timerUrgent = false,
  timerExpired = false,
  playerId,
}: UseWordChainAudioOptions) {
  // No-op when engine isn't ready (SSR or provider not yet mounted)
  const e = engine

  // ── De-dupe guard ────────────────────────────────────────────────────
  const lastKey = useRef<string | null>(null)

  const allow = useCallback((key: string): boolean => {
    if (lastKey.current === key) return false
    lastKey.current = key
    return true
  }, [])

  // ── Timer music tracking ─────────────────────────────────────────────
  const timerLoopActive = useRef(false)
  const prevTimerUrgent = useRef(timerUrgent)
  const prevTimerExpired = useRef(timerExpired)

  // ── Pusher subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return

    const channelName = `room-${roomCode}-game`
    const channel = pusherClient.subscribe(channelName)

    // ── round-started ──────────────────────────────────────────────────
    const onRoundStarted = (data: RoundStartedPayload) => {
      if (!enabled) return

      if (isHost) {
        // Stop BGM during gameplay — timer + SFX take focus
        e?.stop('bgm', 300)
        e?.stop('timer', 150)
        timerLoopActive.current = false
      }
    }

    // ── turn-advanced ──────────────────────────────────────────────────
    const onTurnAdvanced = (data: TurnAdvancedPayload) => {
      if (!enabled) return

      // Stop timer tension music (any reason — turn resolved)
      if (isHost && timerLoopActive.current) {
        e?.stop('timer', 150)
        timerLoopActive.current = false
      }

      if (data.reason === 'confirmed') {
        // Host: played "passed" SFX
        if (isHost) {
          if (allow(`${data.roundId}|passed|${data.previousPlayerId}`)) {
            e?.playOneShot('passed')
          }
        }
        // Player: only play if it was MY turn that was confirmed
        if (!isHost && playerId && data.previousPlayerId === playerId) {
          if (allow(`${data.roundId}|player-passed|${playerId}`)) {
            e?.playOneShot('passed')
          }
        }
      }
      // reason 'timeout' and 'skipped' — their SFX are handled by
      // player-eliminated and player-skipped events respectively
    }

    // ── player-skipped ─────────────────────────────────────────────────
    const onPlayerSkipped = (data: PlayerSkippedPayload) => {
      if (!enabled) return
      if (allow(`${data.roundId}|skipped|${data.playerId}`)) {
        e?.playOneShot('skipped')
      }
    }

    // ── player-eliminated ──────────────────────────────────────────────
    const onPlayerEliminated = (data: PlayerEliminatedPayload) => {
      if (!enabled) return
      if (allow(`${data.roundId}|eliminated|${data.playerId}`)) {
        e?.playOneShot('eliminated')
      }
      // Duck BGM briefly on host
      if (isHost) {
        e?.duck('bgm', 0.3, 1500)
      }
    }

    // ── round-ended ────────────────────────────────────────────────────
    const onRoundEnded = (_data: RoundEndedPayload) => {
      if (!enabled || !isHost) return
      // Stop timer music, but let BGM keep playing through inter-round
      if (timerLoopActive.current) {
        e?.stop('timer', 150)
        timerLoopActive.current = false
      }
    }

    // ── game-ended ─────────────────────────────────────────────────────
    const onGameEnded = () => {
      if (!enabled) return
      // Stop timer tension but leave one-shots (they end naturally)
      e?.stop('timer', 150)
      timerLoopActive.current = false
      // Restart BGM for results screen
      if (isHost) {
        e?.playLoop('bgm', 500)
      }
    }

    // Bind all events
    channel.bind('round-started', onRoundStarted)
    channel.bind('turn-advanced', onTurnAdvanced)
    channel.bind('player-skipped', onPlayerSkipped)
    channel.bind('player-eliminated', onPlayerEliminated)
    channel.bind('round-ended', onRoundEnded)
    channel.bind('game-ended', onGameEnded)

    return () => {
      channel.unbind('round-started', onRoundStarted)
      channel.unbind('turn-advanced', onTurnAdvanced)
      channel.unbind('player-skipped', onPlayerSkipped)
      channel.unbind('player-eliminated', onPlayerEliminated)
      channel.unbind('round-ended', onRoundEnded)
      channel.unbind('game-ended', onGameEnded)
      pusherClient.unsubscribe(channelName)
    }
  }, [roomCode, e, isHost, enabled, playerId, allow])

  // ── Client-side timer effects (host only) ────────────────────────────
  // timerUrgent → start timer loop (tension music at last 5s)
  useEffect(() => {
    if (!isHost || !enabled) return

    // Detect transition: false → true
    if (timerUrgent && !prevTimerUrgent.current) {
      e?.playLoop('timer', 200)
      timerLoopActive.current = true
    }

    // Detect transition: true → false (turn resolved before expiry)
    if (!timerUrgent && prevTimerUrgent.current && timerLoopActive.current) {
      e?.stop('timer', 150)
      timerLoopActive.current = false
    }

    prevTimerUrgent.current = timerUrgent
  }, [timerUrgent, isHost, enabled, e])

  // timerExpired → times-up SFX + stop timer music
  useEffect(() => {
    if (!isHost || !enabled) return

    // Detect transition: false → true
    if (timerExpired && !prevTimerExpired.current) {
      e?.playOneShot('times-up')
      if (timerLoopActive.current) {
        e?.stop('timer', 150)
        timerLoopActive.current = false
      }
    }

    prevTimerExpired.current = timerExpired
  }, [timerExpired, isHost, enabled, e])
}
