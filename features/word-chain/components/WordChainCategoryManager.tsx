'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Library } from 'lucide-react'
import type { WordChainCategory, WordChainDifficulty } from '../types'
import { DIFFICULTY_LABELS } from '../types'

interface WordChainCategoryManagerProps {
  onBack: () => void
}

const DIFFICULTY_COLORS: Record<WordChainDifficulty, string> = {
  easy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  moderate: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  difficult: 'border-red-500/30 bg-red-500/10 text-red-400',
}

export function WordChainCategoryManager({ onBack }: WordChainCategoryManagerProps) {
  const [categories, setCategories] = useState<WordChainCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<WordChainCategory | null>(null)
  const [formName, setFormName] = useState('')
  const [formDifficulty, setFormDifficulty] = useState<WordChainDifficulty>('easy')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/games/word-chain/categories')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load categories')
      setCategories(data.categories || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function openCreateDialog() {
    setEditingCategory(null)
    setFormName('')
    setFormDifficulty('easy')
    setFormError(null)
    setDialogOpen(true)
  }

  function openEditDialog(cat: WordChainCategory) {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormDifficulty(cat.difficulty)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    setFormError(null)
    if (!formName.trim()) {
      setFormError('Category name is required.')
      return
    }
    if (!['easy', 'moderate', 'difficult'].includes(formDifficulty)) {
      setFormError('Select a valid difficulty.')
      return
    }

    setSaving(true)
    try {
      const url = editingCategory
        ? `/api/games/word-chain/categories/${editingCategory.id}`
        : '/api/games/word-chain/categories'
      const method = editingCategory ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), difficulty: formDifficulty }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save category')

      setDialogOpen(false)
      await fetchCategories()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/games/word-chain/categories/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      await fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={openCreateDialog}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          New Category
        </Button>
      </div>

      {/* Title */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
          <Library className="size-7 text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Category Bank</h1>
        <p className="text-sm text-muted-foreground">
          Manage the categories players will respond to during rounds.
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

      {/* Category list */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading categories…</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No categories yet. Create your first one.
          </p>
          <Button
            variant="outline"
            onClick={openCreateDialog}
            className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
          >
            <Plus className="size-3.5" />
            New Category
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-lg border border-border/20 bg-card/40 px-4 py-3 transition-colors hover:bg-card/60"
            >
              <span className="flex-1 truncate text-sm font-medium">
                {cat.name}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] ${DIFFICULTY_COLORS[cat.difficulty]}`}
              >
                {DIFFICULTY_LABELS[cat.difficulty]}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {cat.points} pt{cat.points !== 1 ? 's' : ''}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <Pencil className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => openEditDialog(cat)}
                    className="cursor-pointer"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    {deletingId === cat.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category name and difficulty.'
                : 'Add a new category to the bank.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="cat-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="cat-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Countries, Movie Titles…"
                disabled={saving}
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Difficulty</p>
              <div className="flex gap-2">
                {(['easy', 'moderate', 'difficult'] as WordChainDifficulty[]).map(
                  (d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormDifficulty(d)}
                      disabled={saving}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        formDifficulty === d
                          ? `${DIFFICULTY_COLORS[d]} border-current ring-1 ring-current/20`
                          : 'border-border/20 bg-card/40 text-muted-foreground hover:border-border/40'
                      }`}
                    >
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Form error */}
            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : editingCategory ? (
                  'Save Changes'
                ) : (
                  'Create Category'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
