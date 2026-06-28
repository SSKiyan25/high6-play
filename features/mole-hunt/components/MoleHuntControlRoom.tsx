'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Loader2,
  ArrowRight,
  UserX,
  ShieldAlert,
  Eye,
  EyeOff,
  Flag,
  ChevronDown,
  AlertTriangle,
  Monitor,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMoleHuntControl } from '../hooks/useMoleHuntControl'
import type { MolePhase } from '../types'

interface MoleHuntControlRoomProps {
  roomCode: string
  roomId: string
  totalRounds: number
}

/**
 * Host-only Control Room for Mole Hunt.
 *
 * Shows Mole/Canary identities fetched via authenticated API call
 * (never from Pusher). Provides phase advance, Canary deduction,
 * and end-game controls.
 */
export function MoleHuntControlRoom({
  roomCode,
  roomId,
  totalRounds,
}: MoleHuntControlRoomProps) {
  const router = useRouter()

  const {
    currentRound,
    currentPhase,
    topic,
    moles,
    canaries,
    crew,
    players,
    voteProgress,
    advancePhase,
    deductCanaryPoints,
    endGame,
    loading,
    error,
  } = useMoleHuntControl({ roomCode, roomId })

  // ── Local UI state ────────────────────────────────────────────────
  const [advancing, setAdvancing] = useState(false)
  const [deductTarget, setDeductTarget] = useState<{
    id: string
    nickname: string
  } | null>(null)
  const [deducting, setDeducting] = useState(false)
  const [deductedIds, setDeductedIds] = useState<Set<string>>(new Set())
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [ending, setEnding] = useState(false)

  // ── Phase helpers ─────────────────────────────────────────────────
  const phaseLabel = getPhaseLabel(currentPhase)
  const phaseColor = getPhaseColor(currentPhase)
  const roundNumber = currentRound?.round_number ?? 0

  // ── Advance Phase ─────────────────────────────────────────────────
  const handleAdvancePhase = useCallback(async () => {
    if (advancing) return
    setAdvancing(true)
    try {
      await advancePhase()
    } catch {
      // Phase changes come via Pusher
    } finally {
      setAdvancing(false)
    }
  }, [advancing, advancePhase])

  // ── Deduct Canary ─────────────────────────────────────────────────
  const handleDeductConfirm = useCallback(async () => {
    if (!deductTarget || deducting) return
    setDeducting(true)
    try {
      await deductCanaryPoints(deductTarget.id)
      setDeductedIds((prev) => new Set(prev).add(deductTarget.id))
    } catch {
      // Error handled silently
    } finally {
      setDeducting(false)
      setDeductTarget(null)
    }
  }, [deductTarget, deducting, deductCanaryPoints])

  // ── End Game ──────────────────────────────────────────────────────
  const handleEndGame = useCallback(async () => {
    if (ending) return
    setEnding(true)
    try {
      await endGame()
      router.push(`/host/${roomCode}/mh-results`)
    } catch {
      // Error handled silently
    } finally {
      setEnding(false)
      setShowEndConfirm(false)
    }
  }, [ending, endGame, roomCode, router])

  // ── Loading ───────────────────────────────────────────────────────
  if (loading && !currentRound) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading control room…</p>
      </main>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-6">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </main>
    )
  }

  // ── Advance button label ──────────────────────────────────────────
  const advanceLabel = getAdvanceLabel(currentPhase, roundNumber, totalRounds)

  return (
    <div className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-border/20 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Room {roomCode}
            </span>
            <span className="text-muted-foreground/30">|</span>
            <span className="text-sm text-muted-foreground">
              Round {roundNumber} of {totalRounds}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              className={cn('capitalize', phaseColor)}
              variant="secondary"
            >
              {phaseLabel}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                window.open(`/host/${roomCode}/mh-game`, '_blank')
              }
            >
              <Monitor className="size-4" />
              <span className="hidden sm:inline">Presentation</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowEndConfirm(true)}
            >
              End Game
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-6 px-6 py-6 lg:flex-row">
        {/* ── Left Column: Role Panel ──────────────────────────────── */}
        <div className="w-full space-y-4 lg:w-72 lg:flex-shrink-0">
          {/* Topic info (compact) */}
          {topic && (
            <div className="rounded-xl border border-border/20 bg-card/40 px-4 py-3">
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Topic
              </p>
              <p className="mt-1 text-sm font-semibold">{topic.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {topic.blurb}
              </p>
            </div>
          )}

          {/* Role Panel — hidden during reveal (identities are public) */}
          {currentPhase !== 'reveal' && (
            <div className="rounded-xl border border-border/20 bg-card/40 p-4">
              <h3 className="mb-3 text-sm font-semibold">Roles</h3>

              {/* Moles */}
              {moles.length > 0 && (
                <div className="mb-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-amber-400 uppercase">
                    <EyeOff className="size-3" />
                    Mole{moles.length !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {moles.map((m) => (
                      <Badge
                        key={m.id}
                        className="border-amber-500/30 bg-amber-500/15 text-amber-300"
                      >
                        {m.nickname}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Canaries */}
              {canaries.length > 0 && (
                <div className="mb-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-teal-400 uppercase">
                    <ShieldAlert className="size-3" />
                    Canar{canaries.length !== 1 ? 'ies' : 'y'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {canaries.map((c) => (
                      <Badge
                        key={c.id}
                        className="border-teal-500/30 bg-teal-500/15 text-teal-300"
                      >
                        {c.nickname}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Crew */}
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  <Eye className="size-3" />
                  Crew
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {crew.map((c) => (
                    <Badge key={c.id} variant="secondary" className="text-xs">
                      {c.nickname}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reveal Phase — identities are public */}
          {currentPhase === 'reveal' && (
            <div className="rounded-xl border border-border/20 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground">
                All roles are now visible on the presentation screen.
              </p>
            </div>
          )}

          {/* Flag Silent Canary — discuss phase only */}
          {currentPhase === 'discuss' && canaries.length > 0 && (
            <div className="rounded-xl border border-border/20 bg-card/40 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Flag className="size-4 text-destructive" />
                Flag Silent Canary
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Deduct −50 pts from a Canary who is not speaking up.
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                  >
                    <span>Select Canary</span>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {canaries.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() =>
                        setDeductTarget({ id: c.id, nickname: c.nickname })
                      }
                      className="cursor-pointer"
                    >
                      <UserX className="mr-2 size-4" />
                      {c.nickname}
                      {deductedIds.has(c.id) && (
                        <span className="ml-auto text-xs text-destructive">
                          Deducted
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* ── Center / Right: Vote Progress + Controls ─────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          {/* Vote progress — vote phase only */}
          {currentPhase === 'vote' && (
            <div className="w-full max-w-md space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Votes cast</span>
                <span className="font-semibold tabular-nums">
                  {voteProgress.votedCount} of {voteProgress.totalPlayers}
                </span>
              </div>
              <Progress
                value={
                  voteProgress.totalPlayers > 0
                    ? (voteProgress.votedCount / voteProgress.totalPlayers) *
                      100
                    : 0
                }
                className="h-2"
              />
            </div>
          )}

          {/* Discuss phase — waiting instruction */}
          {currentPhase === 'discuss' && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <div className="flex size-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-sm">Discussion in progress</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Players are discussing the topic. Moles are trying to mislead.
              </p>
            </div>
          )}

          {/* Reveal phase — waiting */}
          {currentPhase === 'reveal' && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <div className="flex size-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm">Results revealed</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Players can see the correct answer and who the Moles were.
              </p>
            </div>
          )}

          {/* ── Advance Phase Button ────────────────────────────────── */}
          <div className="flex flex-col items-center gap-3">
            {advanceLabel && (
              <Button
                size="lg"
                onClick={handleAdvancePhase}
                disabled={advancing}
                className="gap-2"
              >
                {advancing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Advancing…
                  </>
                ) : (
                  <>
                    <ArrowRight className="size-4" />
                    {advanceLabel}
                  </>
                )}
              </Button>
            )}

            {/* No advance when game is over */}
            {!advanceLabel && (
              <p className="text-sm text-muted-foreground">
                End the game to view results.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile: Full player list (all screens) ──────────────────── */}
      <div className="border-t border-border/20 px-6 py-4 lg:hidden">
        <h3 className="mb-3 text-sm font-semibold">
          All Players ({players.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <span
              key={p.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                p.role === 'mole' &&
                  'border-amber-500/30 bg-amber-500/15 text-amber-300',
                p.role === 'canary' &&
                  'border-teal-500/30 bg-teal-500/15 text-teal-300',
                p.role === 'crew' &&
                  'border-border/30 bg-card/40 text-muted-foreground',
              )}
            >
              {p.role === 'mole' && <EyeOff className="size-3" />}
              {p.role === 'canary' && <ShieldAlert className="size-3" />}
              <span>{p.nickname}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Deduct Confirmation Dialog ──────────────────────────────── */}
      <Dialog
        open={deductTarget !== null}
        onOpenChange={(open) => !open && setDeductTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="size-5 text-destructive" />
              Flag Silent Canary
            </DialogTitle>
            <DialogDescription>
              Deduct <strong>−50 points</strong> from{' '}
              <strong>{deductTarget?.nickname}</strong> for not speaking up
              during the discussion phase. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeductTarget(null)}
              disabled={deducting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeductConfirm}
              disabled={deducting}
            >
              {deducting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deducting…
                </>
              ) : (
                'Deduct −50 pts'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── End Game Confirmation Dialog ────────────────────────────── */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              End Game Early?
            </DialogTitle>
            <DialogDescription>
              This will close the room and redirect all players to the results
              page. Scores will be final. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEndConfirm(false)}
              disabled={ending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndGame}
              disabled={ending}
            >
              {ending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Ending…
                </>
              ) : (
                'End Game'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────

function getPhaseLabel(phase: MolePhase): string {
  switch (phase) {
    case 'assigning':
      return 'Assigning'
    case 'discuss':
      return 'Discussion'
    case 'vote':
      return 'Voting'
    case 'reveal':
      return 'Reveal'
    default:
      return phase
  }
}

function getPhaseColor(phase: MolePhase): string {
  switch (phase) {
    case 'assigning':
      return 'bg-muted text-muted-foreground'
    case 'discuss':
      return 'border-blue-500/30 bg-blue-500/15 text-blue-300'
    case 'vote':
      return 'border-amber-500/30 bg-amber-500/15 text-amber-300'
    case 'reveal':
      return 'border-accent/30 bg-accent/15 text-accent'
    default:
      return ''
  }
}

/** Returns the label for the advance button, or null if no advance possible. */
function getAdvanceLabel(
  phase: MolePhase,
  roundNumber: number,
  totalRounds: number,
): string | null {
  switch (phase) {
    case 'assigning':
      return null // Auto-transitions
    case 'discuss':
      return 'Start Voting'
    case 'vote':
      return 'Reveal Results'
    case 'reveal':
      if (roundNumber >= totalRounds) {
        return null // Last round — host should end game
      }
      return 'Next Round'
    default:
      return null
  }
}
