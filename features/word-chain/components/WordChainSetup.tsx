'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowRight, ArrowLeft, Loader2, Library, Search } from 'lucide-react'
import { WordChainCategoryManager } from './WordChainCategoryManager'
import type { WordChainDifficulty, WordChainRoomConfigInput, WordChainCategory } from '../types'
import { DIFFICULTY_LABELS } from '../types'

interface WordChainSetupProps {
  onBack: () => void
  onCreateRoom: (config: WordChainRoomConfigInput) => Promise<void>
  loading: boolean
}

const DIFFICULTY_COLORS: Record<WordChainDifficulty, string> = {
  easy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  moderate: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  difficult: 'border-red-500/30 bg-red-500/10 text-red-400',
}

type SetupStep = 'config' | 'select-categories' | 'categories'

export function WordChainSetup({ onBack, onCreateRoom, loading }: WordChainSetupProps) {
  const [step, setStep] = useState<SetupStep>('config')
  const [timePerPlayer, setTimePerPlayer] = useState(20)
  const [survivorsToWin, setSurvivorsToWin] = useState(2)
  const [error, setError] = useState<string | null>(null)

  // ── Category Selection State ──────────────────────────────────────────
  const [categories, setCategories] = useState<WordChainCategory[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, searchQuery])

  // ── Fetch categories when entering select step ────────────────────────
  useEffect(() => {
    if (step !== 'select-categories') return

    let cancelled = false
    async function fetchCategories() {
      setCategoriesLoading(true)
      setCategoryError(null)
      try {
        const res = await fetch('/api/games/word-chain/categories')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load categories')
        if (!cancelled) setCategories(data.categories || [])
      } catch (err) {
        if (!cancelled) {
          setCategoryError(
            err instanceof Error ? err.message : 'Failed to load categories',
          )
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false)
      }
    }
    fetchCategories()
    return () => {
      cancelled = true
    }
  }, [step])

  const totalRounds = selectedIds.length

  function toggleCategory(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
    setError(null)
  }

  const allFilteredSelected = useMemo(() => {
    if (filteredCategories.length === 0) return false
    return filteredCategories.every((c) => selectedIds.includes(c.id))
  }, [filteredCategories, selectedIds])

  function toggleSelectAll() {
    const filteredIds = new Set(filteredCategories.map((c) => c.id))
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)))
    } else {
      setSelectedIds((prev) => {
        const existing = new Set(prev)
        const toAdd = filteredCategories
          .map((c) => c.id)
          .filter((id) => !existing.has(id))
        return [...prev, ...toAdd]
      })
    }
    setError(null)
  }

  async function handleCreate() {
    if (selectedIds.length < 2) {
      setError('Select at least 2 categories.')
      return
    }

    setError(null)

    const config: WordChainRoomConfigInput = {
      time_per_player_seconds: timePerPlayer,
      survivors_to_win: survivorsToWin,
      total_rounds: selectedIds.length,
      selected_category_ids: selectedIds,
    }

    try {
      await onCreateRoom(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    }
  }

  // ── Step: Category Bank Manager ────────────────────────────────────────
  if (step === 'categories') {
    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto flex w-full max-w-lg flex-col px-4 py-12">
          <WordChainCategoryManager onBack={() => setStep('select-categories')} />
        </div>
      </main>
    )
  }

  // ── Step: Select Categories ───────────────────────────────────────────
  if (step === 'select-categories') {
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
            <Library className="size-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Select Categories</h1>
          <p className="text-sm text-muted-foreground">
            Pick the categories for this session. Each category will be one round.
            You can select as many as you want.
          </p>
        </div>

        {/* Selection count */}
        <div className="flex items-center justify-center gap-2">
          <Badge
            variant={selectedIds.length >= 2 ? 'secondary' : 'outline'}
            className={
              selectedIds.length >= 2
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-violet-500/30 text-violet-400'
            }
          >
            {selectedIds.length} categor{selectedIds.length !== 1 ? 'ies' : 'y'} selected
            ({selectedIds.length} round{selectedIds.length !== 1 ? 's' : ''})
          </Badge>
          {selectedIds.length < 2 && (
            <span className="text-xs text-muted-foreground">min 2 required</span>
          )}
        </div>

        {/* Category Error */}
        {categoryError && (
          <p
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
            role="alert"
          >
            {categoryError}
          </p>
        )}

        {/* Search */}
        {categories.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories…"
              className="pl-9 border-violet-500/30 bg-background"
            />
          </div>
        )}

        {/* Select All / Deselect All */}
        {categories.length > 0 && filteredCategories.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {searchQuery
                ? `${filteredCategories.length} of ${categories.length} matching`
                : `${categories.length} categories`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
            >
              {allFilteredSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        )}

        {/* Categories loading */}
        {categoriesLoading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading categories…</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No categories in the bank. Add some first.
            </p>
            <Button
              variant="outline"
              onClick={() => setStep('categories')}
              className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
            >
              <Library className="size-3.5" />
              Manage Category Bank
            </Button>
          </div>
        ) : (
          <>
            {/* Category checklist */}
            <div className="max-h-[40vh] space-y-1 overflow-y-auto rounded-lg border border-border/30 bg-card/50 p-1">
              {filteredCategories.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No categories match your search.
                </p>
              ) : (
                filteredCategories.map((cat) => {
                  const isSelected = selectedIds.includes(cat.id)
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="mt-0 pointer-events-none"
                      />
                      <span className="flex-1 truncate text-sm font-medium">
                        {cat.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${DIFFICULTY_COLORS[cat.difficulty]}`}
                      >
                        {DIFFICULTY_LABELS[cat.difficulty]}
                      </Badge>
                      {/* Selection order badge */}
                      {isSelected && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-violet-500/30 text-violet-400 text-[10px]"
                        >
                          Round #{selectedIds.indexOf(cat.id) + 1}
                        </Badge>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {searchQuery && filteredCategories.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {filteredCategories.length} categor
                {filteredCategories.length !== 1 ? 'ies' : 'y'} matching &ldquo;
                {searchQuery}&rdquo;
              </p>
            )}
          </>
        )}

        {/* Manage Categories button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep('categories')}
          className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
        >
          <Library className="size-3.5" />
          Manage Category Bank
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
            disabled={loading || selectedIds.length < 2}
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

  // ── Step: Room Config ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
          <span className="text-2xl font-bold text-violet-400">🎯</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Word Chain Setup</h1>
        <p className="text-sm text-muted-foreground">
          Configure the game settings, then pick your categories.
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

      {/* Config Fields */}
      <div className="space-y-4 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
        <p className="text-sm font-medium text-violet-400">Room Configuration</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="time-per-player" className="text-xs">
              Time Per Player (seconds)
            </Label>
            <Input
              id="time-per-player"
              type="number"
              min={5}
              max={120}
              value={timePerPlayer}
              onChange={(e) =>
                setTimePerPlayer(Math.max(5, parseInt(e.target.value) || 5))
              }
              disabled={loading}
              className="border-violet-500/30 bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="survivors-to-win" className="text-xs">
              Survivors to Win
            </Label>
            <Input
              id="survivors-to-win"
              type="number"
              min={1}
              max={10}
              value={survivorsToWin}
              onChange={(e) =>
                setSurvivorsToWin(Math.max(1, parseInt(e.target.value) || 1))
              }
              disabled={loading}
              className="border-violet-500/30 bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Round ends when this many active players remain
            </p>
          </div>
        </div>
      </div>

      {/* Next: Select Categories */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setStep('select-categories')}
        className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
      >
        <Library className="size-3.5" />
        Next: Select Categories
      </Button>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack} disabled={loading}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>
    </div>
  )
}
