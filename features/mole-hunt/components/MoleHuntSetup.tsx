'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowRight, ArrowLeft, Loader2, Library, Search } from 'lucide-react'
import { TopicBankManager } from './TopicBankManager'
import { MODE_DEFAULTS, MODE_LABELS } from './ModeDefaults'
import type { MoleMode, MoleRoomConfigInput, MoleTopic } from '../types'

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

type SetupStep = 'config' | 'select-topics' | 'topics'

export function MoleHuntSetup({ onBack, onCreateRoom, loading }: MoleHuntSetupProps) {
  const [step, setStep] = useState<SetupStep>('config')
  const [mode, setMode] = useState<MoleMode | null>(null)
  const [moleCount, setMoleCount] = useState<number>(2)
  const [canaryCount, setCanaryCount] = useState<number>(1)
  const [discussTimer, setDiscussTimer] = useState<number>(60)
  const [voteTimer, setVoteTimer] = useState<number>(20)
  const [totalRounds, setTotalRounds] = useState<number>(5)
  const [error, setError] = useState<string | null>(null)

  // ── Topic Selection State ──────────────────────────────────────────
  const [topics, setTopics] = useState<MoleTopic[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [topicError, setTopicError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Filtered topics based on search
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics
    const q = searchQuery.toLowerCase()
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.blurb.toLowerCase().includes(q) ||
        t.option_a.toLowerCase().includes(q) ||
        t.option_b.toLowerCase().includes(q),
    )
  }, [topics, searchQuery])

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

  // ── Fetch topics when entering select-topics step ──────────────────
  useEffect(() => {
    if (step !== 'select-topics') return

    let cancelled = false
    async function fetchTopics() {
      setTopicsLoading(true)
      setTopicError(null)
      try {
        const res = await fetch('/api/games/mole-hunt/topics')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load topics')
        if (!cancelled) setTopics(data.topics || [])
      } catch (err) {
        if (!cancelled) {
          setTopicError(
            err instanceof Error ? err.message : 'Failed to load topics',
          )
        }
      } finally {
        if (!cancelled) setTopicsLoading(false)
      }
    }
    fetchTopics()
    return () => { cancelled = true }
  }, [step])

  function toggleTopic(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= totalRounds) {
        // Replace the last selection if at capacity
        return [...prev.slice(0, -1), id]
      }
      return [...prev, id]
    })
  }

  const selectionValid = selectedIds.length === totalRounds

  async function handleCreate() {
    if (!mode) {
      setError('Please select a mode.')
      return
    }

    if (!selectionValid) {
      setError(`Select exactly ${totalRounds} topics (selected ${selectedIds.length}).`)
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
      selected_topic_ids: selectedIds,
    }

    try {
      await onCreateRoom(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    }
  }

  // ── Step: Topic Bank Manager ────────────────────────────────────────
  if (step === 'topics') {
    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto flex w-full max-w-lg flex-col px-4 py-12">
          <TopicBankManager onBack={() => setStep('select-topics')} />
        </div>
      </main>
    )
  }

  // ── Step: Select Topics ────────────────────────────────────────────
  if (step === 'select-topics') {
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <span className="text-2xl font-bold text-amber-400">🕳️</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Select Topics</h1>
          <p className="text-sm text-muted-foreground">
            Pick exactly{' '}
            <span className="font-bold text-foreground">{totalRounds}</span>{' '}
            topic{totalRounds !== 1 ? 's' : ''} for this session. They will be
            shown in the order you select them.
          </p>
        </div>

        {/* Topic count indicator */}
        <div className="flex items-center justify-center gap-2">
          <Badge
            variant={selectionValid ? 'secondary' : 'outline'}
            className={
              selectionValid
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-amber-500/30 text-amber-400'
            }
          >
            {selectedIds.length} of {totalRounds} selected
          </Badge>
        </div>

        {/* Topic Error */}
        {topicError && (
          <p
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
            role="alert"
          >
            {topicError}
          </p>
        )}

        {/* Search */}
        {topics.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics…"
              className="pl-9 border-amber-500/30 bg-background"
            />
          </div>
        )}

        {/* Topics loading */}
        {topicsLoading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading topics…</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Your topic bank is empty. Add some topics first.
            </p>
            <Button
              variant="outline"
              onClick={() => setStep('topics')}
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              <Library className="size-3.5" />
              Manage Topic Bank
            </Button>
          </div>
        ) : (
          <>
            {/* Topic checklist — title only, scrollable */}
            <div className="max-h-[40vh] space-y-1 overflow-y-auto rounded-lg border border-border/30 bg-card/50 p-1">
              {filteredTopics.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No topics match your search.
                </p>
              ) : (
                filteredTopics.map((topic) => {
                  const isSelected = selectedIds.includes(topic.id)
                  return (
                    <div
                      key={topic.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleTopic(topic.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="mt-0 pointer-events-none"
                      />
                      <span className="flex-1 truncate text-sm font-medium">
                        {topic.title}
                      </span>
                      {/* Selection order badge */}
                      {isSelected && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-amber-500/30 text-amber-400 text-[10px]"
                        >
                          #{selectedIds.indexOf(topic.id) + 1}
                        </Badge>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {searchQuery && filteredTopics.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''} matching &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </>
        )}

        {/* Manage Topics button */}
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
            onClick={() => setStep('config')}
            disabled={loading}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={handleCreate}
            disabled={loading || !selectionValid}
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

      {/* Next: Select Topics */}
      {mode && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep('select-topics')}
          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
        >
          <Library className="size-3.5" />
          Next: Select Topics
        </Button>
      )}

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
        {!mode && (
          <Button size="lg" className="flex-1" disabled>
            Select a mode to continue
          </Button>
        )}
      </div>
    </div>
  )
}
