'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseTurnTimerOptions {
  isActive: boolean
  onTimeout: () => void
  duration?: number
}

interface UseTurnTimerReturn {
  timeLeft: number
  resetTimer: () => void
}

/**
 * Counts down from `duration` (default 30) seconds.
 * Resets when `resetTimer()` is called.
 * Fires `onTimeout()` when it hits 0 (only once per cycle).
 * Pauses automatically when `isActive` is false or when game is over.
 */
export function useTurnTimer({
  isActive,
  onTimeout,
  duration = 30,
}: UseTurnTimerOptions): UseTurnTimerReturn {
  const [timeLeft, setTimeLeft] = useState(duration)
  const onTimeoutRef = useRef(onTimeout)
  const hasFiredRef = useRef(false)

  // Keep callback ref current without re-triggering the interval
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  const resetTimer = useCallback(() => {
    setTimeLeft(duration)
    hasFiredRef.current = false
  }, [duration])

  // Countdown interval
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1
        if (next <= 0 && !hasFiredRef.current) {
          hasFiredRef.current = true
          // Fire onTimeout on next tick so state updates settle
          setTimeout(() => onTimeoutRef.current(), 0)
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive])

  // Reset when isActive transitions to false (turn ended)
  // but only if the timer didn't just fire
  const prevActiveRef = useRef(isActive)
  useEffect(() => {
    const wasActive = prevActiveRef.current
    prevActiveRef.current = isActive

    // Reset timer when player's turn ends (isActive false) and timeout didn't fire
    if (wasActive && !isActive && !hasFiredRef.current) {
      resetTimer()
    }
  }, [isActive, resetTimer])

  return { timeLeft, resetTimer }
}
