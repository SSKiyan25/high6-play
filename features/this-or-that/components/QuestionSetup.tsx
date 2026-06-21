'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import type { TotQuestionBank, TotQuestionInput } from '../types'

interface QuestionSetupProps {
  onConfirm: (questions: TotQuestionInput[]) => void
  onBack: () => void
  loading: boolean
}

interface BankItem extends TotQuestionBank {
  selected: boolean
}

export function QuestionSetup({ onConfirm, onBack, loading }: QuestionSetupProps) {
  const [bank, setBank] = useState<BankItem[]>([])
  const [fetching, setFetching] = useState(true)
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchBank() {
      try {
        const res = await fetch('/api/games/this-or-that/bank')
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Failed to load questions')

        if (!cancelled) {
          setBank(
            (data.questions || []).map((q: TotQuestionBank) => ({
              ...q,
              selected: false,
            })),
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load questions')
        }
      } finally {
        if (!cancelled) setFetching(false)
      }
    }

    fetchBank()
    return () => { cancelled = true }
  }, [])

  function toggleQuestion(id: string) {
    setBank((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q)),
    )
  }

  function addCustomQuestion() {
    const a = optionA.trim()
    const b = optionB.trim()

    if (!a || !b) {
      setError('Both options are required.')
      return
    }

    if (a.length > 80 || b.length > 80) {
      setError('Options must be 80 characters or fewer.')
      return
    }

    setError(null)

    // Add as a temporary item (no server ID, flagged for insertion)
    const tempId = `custom-${Date.now()}`
    setBank((prev) => [
      ...prev,
      {
        id: tempId,
        option_a: a,
        option_b: b,
        created_at: new Date().toISOString(),
        selected: true,
      },
    ])
    setOptionA('')
    setOptionB('')
  }

  function removeCustomQuestion(id: string) {
    setBank((prev) => prev.filter((q) => q.id !== id))
  }

  const selectedQuestions: TotQuestionInput[] = bank
    .filter((q) => q.selected)
    .map((q) => ({ option_a: q.option_a, option_b: q.option_b }))

  const canProceed = selectedQuestions.length >= 2

  if (fetching) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading question bank…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
          <span className="text-2xl font-bold text-blue-400">?</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Select Questions</h1>
        <p className="text-sm text-muted-foreground">
          Choose at least 2 questions for the game. You can also add your own.
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

      {/* Add Custom Question */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4 text-blue-400" />
            Add a Custom Question
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="option-a" className="text-xs text-blue-400">
                Option A
              </Label>
              <Input
                id="option-a"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="e.g. Coffee"
                maxLength={80}
                disabled={loading}
                className="border-blue-500/30 bg-background focus-visible:ring-blue-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="option-b" className="text-xs text-violet-400">
                Option B
              </Label>
              <Input
                id="option-b"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="e.g. Energy Drink"
                maxLength={80}
                disabled={loading}
                className="border-violet-500/30 bg-background focus-visible:ring-violet-500/50"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addCustomQuestion}
            disabled={loading || !optionA.trim() || !optionB.trim()}
            className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
          >
            <Plus className="size-3.5" />
            Add Question
          </Button>
        </CardContent>
      </Card>

      {/* Question Bank */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Question Bank
          </p>
          <Badge
            variant={canProceed ? 'default' : 'secondary'}
            className={canProceed ? 'bg-blue-500/20 text-blue-400' : ''}
          >
            {selectedQuestions.length} selected
          </Badge>
        </div>

        {bank.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No questions in the bank yet. Add your first custom question above!
          </p>
        ) : (
          <div className="max-h-[40vh] space-y-1 overflow-y-auto rounded-lg border border-border/30 bg-card/50 p-1">
            {bank.map((q) => {
              const isCustom = q.id.startsWith('custom-')
              return (
                <label
                  key={q.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50 ${
                    q.selected ? 'bg-blue-500/10 ring-1 ring-blue-500/20' : ''
                  }`}
                >
                  <Checkbox
                    checked={q.selected}
                    onCheckedChange={() => toggleQuestion(q.id)}
                    disabled={loading}
                    className="data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500"
                  />
                  <span className="flex-1 text-sm">
                    <span className="font-medium text-blue-400">
                      {q.option_a}
                    </span>
                    <span className="mx-2 text-muted-foreground">vs</span>
                    <span className="font-medium text-violet-400">
                      {q.option_b}
                    </span>
                  </span>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        removeCustomQuestion(q.id)
                      }}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Remove custom question"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>

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
          onClick={() => onConfirm(selectedQuestions)}
          disabled={loading || !canProceed}
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

      {!canProceed && (
        <p className="text-center text-xs text-muted-foreground">
          Select at least 2 questions to continue ({selectedQuestions.length} of 2 minimum)
        </p>
      )}
    </div>
  )
}
