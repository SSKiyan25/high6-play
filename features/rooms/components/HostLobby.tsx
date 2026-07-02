'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, DoorClosed, Play, Copy, Check, Loader2, ChevronDown, ChevronUp, BookOpen, UserMinus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRoomPlayers } from '../hooks/useRoomPlayers'
import { getRoomConfig } from '@/features/mole-hunt/actions'
import type { Player, RoomWithPlayers, GameType } from '../types'
import type { MoleRoomConfig } from '@/features/mole-hunt/types'

interface HostLobbyProps {
  room: RoomWithPlayers
}

const GAME_LABELS: Record<GameType, string> = {
  'this-or-that': 'This or That',
  'word-chain': 'Word Chain',
  'mole-hunt': 'Mole Hunt',
}

export function HostLobby({ room }: HostLobbyProps) {
  const router = useRouter()
  const [closing, setClosing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [wcRulesOpen, setWcRulesOpen] = useState(false)

  // Mole Hunt config + validation state
  const [mhConfig, setMhConfig] = useState<MoleRoomConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)

  const { players } = useRoomPlayers({
    roomCode: room.code,
    initialPlayers: room.players,
  })

  const nonHostPlayers = players.filter((p) => !p.is_host)
  const isMoleHunt = room.game_type === 'mole-hunt'
  const isWordChain = room.game_type === 'word-chain'

  // ── Fetch Mole Hunt config ─────────────────────────────────────────
  useEffect(() => {
    if (!isMoleHunt) return

    let cancelled = false
    async function fetchConfig() {
      setConfigLoading(true)
      try {
        const config = await getRoomConfig(room.id)
        if (!cancelled) setMhConfig(config)
      } catch {
        // Config fetch failure is non-blocking — validation will fail gracefully
      } finally {
        if (!cancelled) setConfigLoading(false)
      }
    }
    fetchConfig()
    return () => { cancelled = true }
  }, [isMoleHunt, room.id])

  // ── Validation (Mole Hunt only) ────────────────────────────────────
  function getValidationErrors(): string[] {
    if (!isMoleHunt || !mhConfig) return []

    const errors: string[] = []
    const playerCount = nonHostPlayers.length
    const totalRoles = mhConfig.mole_count + mhConfig.canary_count

    if (mhConfig.mole_count < 1) {
      errors.push('Must have at least 1 Mole.')
    }
    if (mhConfig.total_rounds < 1) {
      errors.push('Must have at least 1 round.')
    }
    if (!mhConfig.selected_topic_ids || mhConfig.selected_topic_ids.length === 0) {
      errors.push('Select at least one topic before starting.')
    }
    if (mhConfig.selected_topic_ids && mhConfig.selected_topic_ids.length !== mhConfig.total_rounds) {
      errors.push(
        `Select exactly ${mhConfig.total_rounds} topics to match your round count (selected ${mhConfig.selected_topic_ids.length}).`,
      )
    }
    if (totalRoles >= playerCount) {
      errors.push(
        `Not enough players. Need at least ${totalRoles + 1} players to assign ${mhConfig.mole_count} Mole(s) + ${mhConfig.canary_count} Canar${mhConfig.canary_count !== 1 ? 'ies' : 'y'}, but only ${playerCount} have joined.`,
      )
    }

    return errors
  }

  const validationErrors = isMoleHunt && !configLoading ? getValidationErrors() : []
  const canStart = isMoleHunt
    ? validationErrors.length === 0 && nonHostPlayers.length >= 1 && !configLoading
    : nonHostPlayers.length >= 2

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
    setStartError(null)

    try {
      const isMH = room.game_type === 'mole-hunt'
      const isWC = room.game_type === 'word-chain'
      const startUrl = isMH
        ? '/api/games/mole-hunt/start'
        : isWC
          ? '/api/games/word-chain/start'
          : '/api/rooms/start'
      const body = isMH || isWC
        ? { room_code: room.code }
        : { code: room.code }

      const res = await fetch(startUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start game')
      }

      // A2: Mole Hunt navigates to Presentation (mh-game), not Control Room
      const gamePath =
        room.game_type === 'word-chain' ? 'wc-game'
        : room.game_type === 'mole-hunt' ? 'mh-game'
        : 'game'
      router.push(`/host/${room.code}/${gamePath}`)
    } catch (err) {
      setStarting(false)
      setStartError(
        err instanceof Error ? err.message : 'Failed to start game',
      )
    }
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRemovePlayer(playerId: string) {
    try {
      await fetch('/api/rooms/remove-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: room.code, player_id: playerId }),
      })
    } catch {
      // Pusher handles UI update via player-removed
    }
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

      {/* ── A1: Mole Hunt Rules Panel ───────────────────────────────── */}
      {isMoleHunt && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <button
            type="button"
            className="flex w-full items-center justify-between px-6 py-3 text-left cursor-pointer"
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
            <CardContent className="space-y-4 px-6 pb-5 pt-0 text-sm leading-relaxed">
              {/* What the game is */}
              <div>
                <p className="font-semibold text-foreground">What is Mole Hunt?</p>
                <p className="mt-1 text-muted-foreground">
                  Mole Hunt is a social deduction trivia game. Each round, the host
                  presents a topic with two options — one correct, one wrong. Hidden
                  among the players are <strong>Moles</strong> who know the correct
                  answer and try to steer the group toward the wrong one. The{' '}
                  <strong>Crew</strong> must discuss and vote for the correct answer
                  while figuring out who they can trust. Some crew members are{' '}
                  <strong>Canaries</strong> — their job is to speak up and share their
                  gut instinct, but they don&apos;t know the answer either.
                </p>
              </div>

              {/* Roles */}
              <div>
                <p className="font-semibold text-foreground">The Three Roles</p>
                <ul className="mt-1 space-y-1.5 text-muted-foreground">
                  <li>
                    <strong className="text-amber-400">Mole</strong> — Knows the
                    correct answer. Receives a secret persuasion argument. Goal: deceive
                    the crew into voting wrong without getting caught.
                  </li>
                  <li>
                    <strong className="text-teal-400">Canary</strong> — Does NOT know
                    the answer. Must speak up during discussion. Earns a blind bonus
                    just for participating.
                  </li>
                  <li>
                    <strong className="text-muted-foreground">Crew</strong> — Regular
                    player. Listens, discusses, and votes. Earns points for voting
                    correctly.
                  </li>
                </ul>
              </div>

              {/* Round Flow */}
              <div>
                <p className="font-semibold text-foreground">Round Flow</p>
                <ol className="mt-1 list-inside list-decimal space-y-1 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Topic Reveal</strong> — The
                    host shows a topic card with a blurb and two options.
                  </li>
                  <li>
                    <strong className="text-foreground">Discussion Phase</strong> —{' '}
                    Players discuss the topic. Moles try to mislead. Canaries must
                    speak up. The host controls when discussion ends.
                  </li>
                  <li>
                    <strong className="text-foreground">Vote Phase</strong> — Each
                    player secretly votes for Option A or B. Votes are tallied live.
                  </li>
                  <li>
                    <strong className="text-foreground">Reveal</strong> — The correct
                    answer is shown, votes are revealed, and Mole/Canary identities are
                    exposed. The host manually advances to the next round.
                  </li>
                </ol>
              </div>

              {/* Scoring */}
              <div>
                <p className="font-semibold text-foreground">Scoring</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li><strong>Crew</strong> +100 pts for voting correctly</li>
                  <li><strong>Mole</strong> +150 pts per deceived player +50 pts if majority is wrong</li>
                  <li><strong>Canary</strong> +20 pts blind bonus (every round)</li>
                </ul>
              </div>

              {/* Config Summary (live from Supabase) */}
              <div>
                <p className="font-semibold text-foreground">Session Config</p>
                {configLoading ? (
                  <p className="mt-1 text-xs text-muted-foreground">Loading config…</p>
                ) : mhConfig ? (
                  <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Rounds: <strong className="text-foreground">{mhConfig.total_rounds}</strong></span>
                    <span>Moles: <strong className="text-foreground">{mhConfig.mole_count}</strong></span>
                    <span>Canaries: <strong className="text-foreground">{mhConfig.canary_count}</strong></span>
                    <span>Discuss: <strong className="text-foreground">{mhConfig.discuss_timer_seconds}s</strong></span>
                    <span>Vote: <strong className="text-foreground">{mhConfig.vote_timer_seconds}s</strong></span>
                    <span>Topics: <strong className="text-foreground">{mhConfig.selected_topic_ids?.length ?? 0} selected</strong></span>
                  </div>
                ) : null}
              </div>

              {/* Worked example */}
              <div>
                <p className="font-semibold text-foreground">Example</p>
                <p className="mt-1 text-muted-foreground">
                  The host shows: <em>&ldquo;The Atacama Desert is the driest
                  non-polar desert on Earth. It&apos;s located primarily in which
                  country?&rdquo;</em> — Option A: Chile, Option B: Peru. The blurb
                  contains clues about the correct answer. No outside knowledge is
                  needed — everything you need is in the text on screen.
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
            className="flex w-full items-center justify-between px-6 py-3 text-left cursor-pointer"
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
            <CardContent className="space-y-4 px-6 pb-5 pt-0 text-sm leading-relaxed">
              {/* What the game is */}
              <div>
                <p className="font-semibold text-foreground">What is Word Chain?</p>
                <p className="mt-1 text-muted-foreground">
                  A category-based elimination game. Players take turns naming
                  something in a category. Run out of time and they&apos;re
                  eliminated. Last players standing win points. Survive through
                  all rounds to top the leaderboard!
                </p>
              </div>

              {/* How to Play (host perspective) */}
              <div>
                <p className="font-semibold text-foreground">How to Play</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li>You pick categories — each category is one round</li>
                  <li>Turn order is randomized at the start of each round</li>
                  <li>Players take turns naming something in the category</li>
                  <li>As host, you control the timer from the presentation screen</li>
                  <li>Tap <strong className="text-foreground">Confirm &amp; Next</strong> when a player answers correctly</li>
                  <li>Tap <strong className="text-red-400">Eliminate &amp; Next</strong> if the timer runs out</li>
                </ul>
              </div>

              {/* Round Flow */}
              <div>
                <p className="font-semibold text-foreground">Round Flow</p>
                <ol className="mt-1 list-inside list-decimal space-y-1 text-muted-foreground">
                  <li>Category is revealed with a 5-second buffer for everyone to read</li>
                  <li>Players take turns in randomized order</li>
                  <li>Timer counts down per player (visible on screen)</li>
                  <li>Player eliminated if time runs out</li>
                  <li>Round ends when only the required number of survivors remain</li>
                  <li>Survivors earn points equal to the category&apos;s difficulty</li>
                </ol>
              </div>

              {/* Scoring */}
              <div>
                <p className="font-semibold text-foreground">Scoring</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li><strong className="text-emerald-400">Easy</strong> categories — 1 point per survivor</li>
                  <li><strong className="text-amber-400">Moderate</strong> categories — 2 points per survivor</li>
                  <li><strong className="text-red-400">Difficult</strong> categories — 3 points per survivor</li>
                  <li>Points accumulate across rounds — highest total wins!</li>
                </ul>
              </div>

              {/* Host controls */}
              <div>
                <p className="font-semibold text-foreground">Host Controls</p>
                <p className="mt-1 text-muted-foreground">
                  You have two buttons during each turn: <strong className="text-emerald-400">Confirm &amp; Next</strong> (player answered — advance to next) and <strong className="text-red-400">Eliminate &amp; Next</strong> (timeout — eliminate and advance). Between rounds, use <strong className="text-foreground">Next Round</strong> to start the next round with a fresh turn order. After the final round, <strong className="text-foreground">End Game</strong> to see results.
                </p>
              </div>

              {/* Example */}
              <div>
                <p className="text-xs text-muted-foreground italic">
                  Example: Category is <strong>&ldquo;Countries&rdquo;</strong>.
                  Player 1 says &ldquo;France&rdquo; → you tap Confirm &amp; Next.
                  Player 2 says &ldquo;Japan&rdquo; → Confirm &amp; Next. Player 3
                  runs out of time → you tap Eliminate &amp; Next. Round continues
                  until survivor threshold is reached.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

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
                  onRemove={handleRemovePlayer}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── B2: Validation Errors ───────────────────────────────────── */}
      {validationErrors.length > 0 && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 space-y-1"
          role="alert"
        >
          <p className="text-sm font-semibold text-destructive">
            Cannot start game:
          </p>
          <ul className="list-inside list-disc space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i} className="text-sm text-destructive/90">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Start error (from server) */}
      {startError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive" role="alert">
          {startError}
        </p>
      )}

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
              {isMoleHunt
                ? validationErrors.length > 0
                  ? `Fix ${validationErrors.length} issue${validationErrors.length !== 1 ? 's' : ''} to start`
                  : 'Start Game'
                : canStart
                  ? 'Start Game'
                  : `Start Game (need ${Math.max(0, 2 - nonHostPlayers.length)} more)`
              }
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
  onRemove,
}: {
  player: Player
  index: number
  isNew: boolean
  onRemove: (playerId: string) => void
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
      {!player.is_host && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(player.id)
          }}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
          title={`Remove ${player.nickname}`}
        >
          <UserMinus className="size-3.5" />
        </button>
      )}
    </li>
  )
}
