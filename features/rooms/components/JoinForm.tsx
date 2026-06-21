'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn } from 'lucide-react'
import type { Player, Room } from '../types'

interface JoinResult {
  room: Room
  player: Player
}

export function JoinForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(e.target.value.toUpperCase().slice(0, 4))
    if (error) setError(null)
  }

  function handleNicknameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNickname(e.target.value.slice(0, 20))
    if (error) setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const trimmedCode = code.trim().toUpperCase()
    const trimmedNickname = nickname.trim()

    if (trimmedCode.length !== 4) {
      setError('Please enter a 4-character room code.')
      return
    }
    if (!trimmedNickname) {
      setError('Please enter a nickname.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmedCode, nickname: trimmedNickname }),
      })

      const data: JoinResult & { error?: string } = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join room')
      }

      // Store player identity in localStorage
      localStorage.setItem(
        'h6p_player',
        JSON.stringify({ nickname: trimmedNickname, playerId: data.player.id }),
      )

      router.push(`/play/${trimmedCode}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm border-border/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Join a Room</CardTitle>
        <CardDescription>
          Enter the room code from the shared screen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-code">Room Code</Label>
            <Input
              id="room-code"
              value={code}
              onChange={handleCodeChange}
              placeholder="H6A3"
              maxLength={4}
              className="font-mono text-lg tracking-[0.3em] text-center uppercase"
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={handleNicknameChange}
              placeholder="Your display name"
              maxLength={20}
              autoComplete="off"
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            <LogIn className="size-4" />
            {submitting ? 'Joining…' : 'Join Room'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
