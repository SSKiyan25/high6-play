'use client'

import { useState, useEffect } from 'react'
import type { RoomWithPlayers } from '../types'

export function useRoom(code: string) {
  const [room, setRoom] = useState<RoomWithPlayers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return

    let cancelled = false

    async function fetchRoom() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/rooms?code=${encodeURIComponent(code)}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch room')
        }

        if (!cancelled) {
          setRoom(data.room)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch room')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchRoom()

    return () => {
      cancelled = true
    }
  }, [code])

  return { room, loading, error }
}
