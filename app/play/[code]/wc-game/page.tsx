'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { WordChainPlayerView } from '@/features/word-chain/components/WordChainPlayerView'

/**
 * Player Word Chain game screen.
 * Reads h6p_player from localStorage for player identity.
 * Redirects to player lobby if no saved player found.
 */
export default function WordChainGamePage() {
  const params = useParams()
  const router = useRouter()
  const code = params?.code as string

  const [playerData, setPlayerData] = useState<{
    playerId: string
    nickname: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('h6p_player')
    if (!stored) {
      router.push(`/play/${code}`)
      return
    }

    try {
      const parsed = JSON.parse(stored)
      if (!parsed.playerId || !parsed.nickname || parsed.roomCode !== code) {
        router.push(`/play/${code}`)
        return
      }
      setPlayerData({ playerId: parsed.playerId, nickname: parsed.nickname })
    } catch {
      router.push(`/play/${code}`)
    } finally {
      setLoading(false)
    }
  }, [code, router])

  if (loading || !playerData) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    )
  }

  return (
    <WordChainPlayerView
      roomCode={code}
      playerId={playerData.playerId}
      nickname={playerData.nickname}
    />
  )
}
