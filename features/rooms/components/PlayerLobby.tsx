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
  playerId: string
}

const GAME_LABELS: Record<GameType, string> = {
  'this-or-that': 'This or That',
  'word-chain': 'Word Chain',
  'mole-hunt': 'Mole Hunt',
}

export function PlayerLobby({ room, playerNickname, playerId }: PlayerLobbyProps) {
  const router = useRouter()
  const [rulesOpen, setRulesOpen] = useState(false)
  const [wcRulesOpen, setWcRulesOpen] = useState(false)

  // Mole Hunt config (live from Supabase)
  const [mhConfig, setMhConfig] = useState<MoleRoomConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const isMoleHunt = room.game_type === 'mole-hunt'
  const isWordChain = room.game_type === 'word-chain'

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
    onPlayerRemoved: (removedPlayerId: string) => {
      if (removedPlayerId === playerId) {
        localStorage.removeItem('h6p_player')
        router.push('/')
      }
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

      {/* ── Word Chain Rules Panel ────────────────────────────────── */}
      {isWordChain && (
        <Card className="border-violet-500/20 bg-violet-500/5">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-2.5 text-left cursor-pointer"
            onClick={() => setWcRulesOpen(!wcRulesOpen)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-violet-400">
              <BookOpen className="size-4" />
              How to Play Word Chain
            </span>
            {wcRulesOpen ? (
              <ChevronUp className="size-4 text-violet-400" />
            ) : (
              <ChevronDown className="size-4 text-violet-400" />
            )}
          </button>
          {wcRulesOpen && (
            <CardContent className="space-y-3 px-4 pb-4 pt-0 text-xs leading-relaxed sm:text-sm">
              {/* What the game is */}
              <div>
                <p className="font-semibold text-foreground">What is Word Chain?</p>
                <p className="mt-1 text-muted-foreground">
                  A category-based elimination game. Players take turns naming
                  something in a category. Run out of time and you&apos;re
                  eliminated. Last players standing win points. Survive through
                  all rounds to top the leaderboard!
                </p>
              </div>

              {/* How to Play */}
              <div>
                <p className="font-semibold text-foreground">How to Play</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li>The host picks categories — each category is one round</li>
                  <li>Turn order is randomized at the start of each round</li>
                  <li>When it&apos;s your turn, say something related to the category</li>
                  <li>Tap <strong className="text-foreground">I Answered</strong> to confirm and pass the turn</li>
                  <li>If the timer runs out, you&apos;re eliminated for that round</li>
                </ul>
              </div>

              {/* Round Flow */}
              <div>
                <p className="font-semibold text-foreground">Round Flow</p>
                <ol className="mt-1 list-inside list-decimal space-y-0.5 text-muted-foreground">
                  <li>Category is revealed with a 5-second buffer</li>
                  <li>Players take turns in randomized order</li>
                  <li>Timer counts down per player</li>
                  <li>Eliminated if time runs out</li>
                  <li>Round ends when enough survivors remain</li>
                  <li>Survivors earn points</li>
                </ol>
              </div>

              {/* Scoring */}
              <div>
                <p className="font-semibold text-foreground">Scoring</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  <li><strong className="text-emerald-400">Easy</strong> categories — 1 point per survivor</li>
                  <li><strong className="text-amber-400">Moderate</strong> categories — 2 points per survivor</li>
                  <li><strong className="text-red-400">Difficult</strong> categories — 3 points per survivor</li>
                  <li>Points accumulate across rounds — highest total wins!</li>
                </ul>
              </div>

              {/* Skip */}
              <div>
                <p className="font-semibold text-foreground">One Skip Per Round</p>
                <p className="mt-1 text-muted-foreground">
                  Each player gets <strong className="text-foreground">1 skip</strong> per
                  round. Use it to push yourself to the end of the turn cycle. You
                  can&apos;t skip twice in the same round.
                </p>
              </div>

              {/* Example */}
              <div>
                <p className="text-xs text-muted-foreground italic">
                  Example: Category is <strong>&ldquo;Countries&rdquo;</strong>.
                  Player 1 says &ldquo;France&rdquo; → taps I Answered. Player 2
                  says &ldquo;Japan&rdquo; → taps I Answered. Player 3 runs out of
                  time → eliminated. Round continues until only the required number
                  of survivors remain.
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
