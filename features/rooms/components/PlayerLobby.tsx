'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Gamepad2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRoomPlayers } from '../hooks/useRoomPlayers'
import type { Player, RoomWithPlayers, GameType } from '../types'
import type { MoleRoomConfig } from '@/features/mole-hunt/types'
import { createClient } from '@/lib/supabase/client'

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
  const [rulesOpen, setRulesOpen] = useState(false)

  // Mole Hunt config (live from Supabase)
  const [mhConfig, setMhConfig] = useState<MoleRoomConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const isMoleHunt = room.game_type === 'mole-hunt'

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

  // ── Fetch Mole Hunt config for live values in rules ──────────────
  useEffect(() => {
    if (!isMoleHunt) return

    let cancelled = false
    async function fetchConfig() {
      setConfigLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('mole_room_config')
          .select('*')
          .eq('room_id', room.id)
          .maybeSingle()

        if (!cancelled && !error && data) {
          setMhConfig(data as MoleRoomConfig)
        }
      } catch {
        // Non-blocking
      } finally {
        if (!cancelled) setConfigLoading(false)
      }
    }
    fetchConfig()
    return () => { cancelled = true }
  }, [isMoleHunt, room.id])

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

      {/* ── A1: Mole Hunt Rules Panel ───────────────────────────────── */}
      {isMoleHunt && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-2.5 text-left cursor-pointer"
            onClick={() => setRulesOpen(!rulesOpen)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-400">
              <BookOpen className="size-4" />
              How to Play Mole Hunt
            </span>
            {rulesOpen ? (
              <ChevronUp className="size-4 text-amber-400" />
            ) : (
              <ChevronDown className="size-4 text-amber-400" />
            )}
          </button>
          {rulesOpen && (
            <CardContent className="space-y-3 px-4 pb-4 pt-0 text-xs leading-relaxed sm:text-sm">
              {/* What the game is */}
              <div>
                <p className="font-semibold text-foreground">What is Mole Hunt?</p>
                <p className="mt-1 text-muted-foreground">
                  A social deduction trivia game. Each round, the host presents a
                  topic with two options — one correct, one wrong. Hidden among you
                  are <strong>Moles</strong> who know the answer and try to steer the
                  group wrong. <strong>Crew</strong> discuss and vote. Some crew are{' '}
                  <strong>Canaries</strong> — they must speak up but don&apos;t know
                  the answer either. No outside knowledge needed — everything is in
                  the topic blurb.
                </p>
              </div>

              {/* Roles */}
              <div>
                <p className="font-semibold text-foreground">The Three Roles</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li>
                    <strong className="text-amber-400">Mole</strong> — You know the
                    answer. Steer the group wrong without getting caught!
                  </li>
                  <li>
                    <strong className="text-teal-400">Canary</strong> — You must
                    speak up! Trust your gut — you don&apos;t know the answer.
                  </li>
                  <li>
                    <strong className="text-muted-foreground">Crew</strong> — Listen,
                    discuss, vote. Someone might be lying.
                  </li>
                </ul>
              </div>

              {/* Round Flow */}
              <div>
                <p className="font-semibold text-foreground">Round Flow</p>
                <ol className="mt-1 list-inside list-decimal space-y-0.5 text-muted-foreground">
                  <li>Topic card is shown</li>
                  <li>Discussion phase — talk it out</li>
                  <li>Vote phase — pick A or B</li>
                  <li>Reveal — see who was right (and who was a Mole!)</li>
                </ol>
              </div>

              {/* Scoring */}
              <div>
                <p className="font-semibold text-foreground">Scoring</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  <li>Crew +100 pts for voting correctly</li>
                  <li>Mole +150 pts per deceived player</li>
                  <li>Canary +20 pts blind bonus</li>
                </ul>
              </div>

              {/* Config Summary */}
              {mhConfig && (
                <div>
                  <p className="font-semibold text-foreground">Session Info</p>
                  <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Rounds: <strong className="text-foreground">{mhConfig.total_rounds}</strong></span>
                    <span>Discuss: <strong className="text-foreground">{mhConfig.discuss_timer_seconds}s</strong></span>
                    <span>Vote: <strong className="text-foreground">{mhConfig.vote_timer_seconds}s</strong></span>
                  </div>
                </div>
              )}

              {/* Example */}
              <div>
                <p className="text-xs text-muted-foreground italic">
                  Example: &ldquo;The Atacama Desert is located primarily in which
                  country?&rdquo; — Option A: Chile, Option B: Peru. Read the blurb
                  carefully — the answer is always there.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

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
