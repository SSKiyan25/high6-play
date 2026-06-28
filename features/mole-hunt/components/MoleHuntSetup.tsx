'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ArrowLeft, Loader2, Library } from 'lucide-react'
import { TopicBankManager } from './TopicBankManager'
import { MODE_DEFAULTS, MODE_LABELS } from './ModeDefaults'
import type { MoleMode, MoleRoomConfigInput } from '../types'

interface MoleHuntSetupProps {
  onBack: () => void
  onCreateRoom: (config: MoleRoomConfigInput) => Promise<void>
  loading: boolean
}

const MODES: { mode: MoleMode; description: string }[] = [
  {
    mode: 'easy',
    description: '2 Moles, 1 Canary, 60s discuss, 20s vote, 5 rounds. Mole private chat enabled.',
  },
  {
    mode: 'moderate',
    description: '3 Moles, 2 Canaries, 45s discuss, 15s vote, 7 rounds. Mole private chat enabled.',
  },
  {
    mode: 'hard',
    description: '4 Moles, 2 Canaries, 30s discuss, 15s vote, 10 rounds. No private chat.',
  },
]

export function MoleHuntSetup({ onBack, onCreateRoom, loading }: MoleHuntSetupProps) {
  const [step, setStep] = useState<'config' | 'topics'>('config')
  const [mode, setMode] = useState<MoleMode | null>(null)
  const [moleCount, setMoleCount] = useState<number>(2)
  const [canaryCount, setCanaryCount] = useState<number>(1)
  const [discussTimer, setDiscussTimer] = useState<number>(60)
  const [voteTimer, setVoteTimer] = useState<number>(20)
  const [totalRounds, setTotalRounds] = useState<number>(5)
  const [error, setError] = useState<string | null>(null)

  function handleModeSelect(selected: MoleMode) {
    setMode(selected)
    const defaults = MODE_DEFAULTS[selected]
    setMoleCount(defaults.mole_count)
    setCanaryCount(defaults.canary_count)
    setDiscussTimer(defaults.discuss_timer_seconds)
    setVoteTimer(defaults.vote_timer_seconds)
    setTotalRounds(defaults.total_rounds)
    setError(null)
  }

  async function handleCreate() {
    if (!mode) {
      setError('Please select a mode.')
      return
    }

    setError(null)

    const config: MoleRoomConfigInput = {
      mode,
      mole_count: moleCount,
      canary_count: canaryCount,
      discuss_timer_seconds: discussTimer,
      vote_timer_seconds: voteTimer,
      total_rounds: totalRounds,
    }

    try {
      await onCreateRoom(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    }
  }

  // ── Step: Topic Bank ──────────────────────────────────────────────
  if (step === 'topics') {
    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto flex w-full max-w-lg flex-col px-4 py-12">
          <TopicBankManager onBack={() => setStep('config')} />
        </div>
      </main>
    )
  }

  // ── Step: Room Config ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
          <span className="text-2xl font-bold text-amber-400">🕳️</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Mole Hunt Setup</h1>
        <p className="text-sm text-muted-foreground">
          Configure the game rules for your session. You can override values
          after selecting a mode.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Mode Selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Game Mode</p>
        <div className="grid gap-2">
          {MODES.map((m) => {
            const isSelected = mode === m.mode
            return (
              <Card
                key={m.mode}
                className={`cursor-pointer border-border/30 bg-card/80 transition-colors hover:border-primary/30 ${
                  isSelected
                    ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
                    : ''
                }`}
                onClick={() => handleModeSelect(m.mode)}
              >
                <CardHeader className="pb-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {MODE_LABELS[m.mode]}
                    {isSelected && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">
                        Selected
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{m.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Config Fields */}
      {mode && (
        <div className="space-y-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-400">
            Room Configuration
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mole-count" className="text-xs">
                Mole Count
              </Label>
              <Input
                id="mole-count"
                type="number"
                min={1}
                value={moleCount}
                onChange={(e) => setMoleCount(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={loading}
                className="border-amber-500/30 bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="canary-count" className="text-xs">
                Canary Count
              </Label>
              <Input
                id="canary-count"
                type="number"
                min={0}
                value={canaryCount}
                onChange={(e) => setCanaryCount(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={loading}
                className="border-amber-500/30 bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discuss-timer" className="text-xs">
                Discuss Timer (s)
              </Label>
              <Input
                id="discuss-timer"
                type="number"
                min={1}
                value={discussTimer}
                onChange={(e) => setDiscussTimer(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={loading}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vote-timer" className="text-xs">
                Vote Timer (s)
              </Label>
              <Input
                id="vote-timer"
                type="number"
                min={1}
                value={voteTimer}
                onChange={(e) => setVoteTimer(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={loading}
                className="bg-background"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="total-rounds" className="text-xs">
              Total Rounds
            </Label>
            <Input
              id="total-rounds"
              type="number"
              min={1}
              value={totalRounds}
              onChange={(e) => setTotalRounds(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={loading}
              className="bg-background"
            />
          </div>
        </div>
      )}

      {/* Manage Topics */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setStep('topics')}
        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
      >
        <Library className="size-3.5" />
        Manage Topic Bank
      </Button>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={onBack}
          disabled={loading}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          size="lg"
          className="flex-1"
          onClick={handleCreate}
          disabled={loading || !mode}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating room…
            </>
          ) : (
            <>
              Create Room
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
