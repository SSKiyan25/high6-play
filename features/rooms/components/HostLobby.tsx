'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, DoorClosed, Play, Copy, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRoomPlayers } from '../hooks/useRoomPlayers'
import type { Player, RoomWithPlayers, GameType } from '../types'

interface HostLobbyProps {
  room: RoomWithPlayers
}

const GAME_LABELS: Record<GameType, string> = {
  'this-or-that': 'This or That',
  'word-chain': 'Word Chain',
}

export function HostLobby({ room }: HostLobbyProps) {
  const router = useRouter()
  const [closing, setClosing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)

  const { players } = useRoomPlayers({
    roomCode: room.code,
    initialPlayers: room.players,
  })

  const nonHostPlayers = players.filter((p) => !p.is_host)
  const canStart = nonHostPlayers.length >= 2

  async function handleCloseRoom() {
    if (closing) return
    setClosing(true)

    try {
      await fetch('/api/rooms/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: room.code }),
      })
      router.push('/dashboard')
    } catch {
      setClosing(false)
    }
  }

  async function handleStartGame() {
    if (starting) return
    setStarting(true)

    try {
      const res = await fetch('/api/rooms/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: room.code }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start game')
      }

      const gamePath =
        room.game_type === 'word-chain' ? 'wc-game' : 'game'
      router.push(`/host/${room.code}/${gamePath}`)
    } catch (err) {
      setStarting(false)
      // Error handling is lightweight — the host can retry
      console.error(err)
    }
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      {/* Room Code Display */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Room Code
        </p>
        <button
          type="button"
          onClick={handleCopyCode}
          className="group relative flex items-center gap-3 rounded-2xl border-2 border-primary/40 bg-primary/5 px-8 py-4 transition-colors hover:border-primary/60 hover:bg-primary/10 cursor-pointer"
        >
          <span className="font-mono text-5xl font-bold tracking-[0.4em] text-primary sm:text-6xl">
            {room.code}
          </span>
          {copied ? (
            <Check className="size-5 text-accent" />
          ) : (
            <Copy className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </button>
        <p className="text-xs text-muted-foreground">
          Click to copy · Share this on screen
        </p>
      </div>

      {/* Game Info */}
      <div className="flex items-center justify-center gap-3">
        <Badge variant="secondary" className="text-sm">
          {GAME_LABELS[room.game_type]}
        </Badge>
      </div>

      {/* Player List */}
      <Card className="border-border/30 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5" />
            Players
            <Badge variant="secondary" className="ml-auto">
              {nonHostPlayers.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Waiting for players to join…
            </p>
          ) : (
            <ul className="space-y-1">
              {players.map((player, i) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  index={i}
                  isNew={i >= room.players.length}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="flex-1"
          disabled={!canStart || starting || closing}
          onClick={handleStartGame}
        >
          {starting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Starting…
            </>
          ) : (
            <>
              <Play className="size-4" />
              Start Game{canStart ? '' : ` (need ${Math.max(0, 2 - nonHostPlayers.length)} more)`}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleCloseRoom}
          disabled={closing}
        >
          <DoorClosed className="size-4" />
          {closing ? 'Closing…' : 'Close Room'}
        </Button>
      </div>
    </div>
  )
}

function PlayerRow({
  player,
  index,
  isNew,
}: {
  player: Player
  index: number
  isNew: boolean
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
        isNew && 'animate-in fade-in slide-in-from-right-2 duration-300 ease-out',
      )}
      style={{ animationDelay: isNew ? '0ms' : undefined }}
    >
      <span
        className={cn(
          'flex size-7 items-center justify-center rounded-full text-xs font-bold text-primary-foreground',
          player.is_host ? 'bg-accent' : 'bg-primary',
        )}
      >
        {player.nickname.charAt(0).toUpperCase()}
      </span>
      <span className="flex-1 text-sm font-medium">{player.nickname}</span>
      {player.is_host && (
        <Badge variant="secondary" className="text-[10px]">
          Host
        </Badge>
      )}
      {isNew && (
        <span className="flex size-2">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-accent" />
        </span>
      )}
    </li>
  )
}
