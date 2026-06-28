'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRoomPlayers } from '../hooks/useRoomPlayers'
import type { Player, RoomWithPlayers, GameType } from '../types'

interface PlayerLobbyProps {
  room: RoomWithPlayers
  playerNickname: string
}

const GAME_LABELS: Record<GameType, string> = {
  'this-or-that': 'This or That',
  'word-chain': 'Word Chain',
  'mole-hunt': 'Mole Hunt',
}

export function PlayerLobby({ room, playerNickname }: PlayerLobbyProps) {
  const router = useRouter()

  const { players } = useRoomPlayers({
    roomCode: room.code,
    initialPlayers: room.players,
    onRoomClosed: () => {
      localStorage.removeItem('h6p_player')
      router.push('/')
    },
    onGameStarted: (gameType: string) => {
      const gamePath =
        gameType === 'word-chain' ? 'wc-game'
        : gameType === 'mole-hunt' ? 'mh-game'
        : 'game'
      router.push(`/play/${room.code}/${gamePath}`)
    },
  })

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-5 px-4 py-6">
      {/* Confirmation */}
      <Card className="border-border/30 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">You&apos;re in!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Joined as{' '}
            <span className="font-semibold text-foreground">
              {playerNickname}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Game:</span>
            <Badge variant="secondary">{GAME_LABELS[room.game_type]}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Player List */}
      <Card className="border-border/30 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Players in Room
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {players.map((player, i) => (
              <li
                key={player.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2',
                  i >= room.players.length &&
                    'animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out',
                  player.nickname === playerNickname && 'bg-primary/10',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-xs font-bold text-primary-foreground',
                    player.is_host ? 'bg-accent' : 'bg-primary',
                  )}
                >
                  {player.nickname.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 text-sm font-medium">
                  {player.nickname}
                  {player.nickname === playerNickname && ' (you)'}
                </span>
                {player.is_host && (
                  <Badge variant="secondary" className="text-[10px]">
                    Host
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Waiting State */}
      <div className="flex flex-col items-center gap-3 py-4">
        <Gamepad2 className="size-8 animate-pulse text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Waiting for the host to start the game…
        </p>
      </div>
    </div>
  )
}
