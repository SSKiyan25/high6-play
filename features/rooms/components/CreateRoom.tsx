'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QuestionSetup } from '@/features/this-or-that/components/QuestionSetup'
import { Gamepad2, PenTool, ArrowRight, Loader2 } from 'lucide-react'
import type { GameType, Room } from '../types'
import type { TotQuestionInput } from '@/features/this-or-that/types'

type Step = 'game-select' | 'question-setup'

interface CreateRoomResult {
  room: Room
}

const GAMES: {
  type: GameType
  title: string
  icon: typeof Gamepad2
  description: string
  accent: string
}[] = [
  {
    type: 'this-or-that',
    title: 'This or That',
    icon: Gamepad2,
    description:
      'Host presents a choice. Everyone votes. Results reveal who picked what — names visible.',
    accent: 'from-blue-500/20 to-violet-500/10',
  },
  {
    type: 'word-chain',
    title: 'Word Chain',
    icon: PenTool,
    description:
      'Players take turns building a chain of connected words. Last player standing wins.',
    accent: 'from-emerald-500/20 to-teal-500/10',
  },
]

export function CreateRoom() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('game-select')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createRoom(gameType: GameType, questions?: TotQuestionInput[]) {
    if (creating) return
    setCreating(true)
    setError(null)

    try {
      const body: Record<string, unknown> = { game_type: gameType }
      if (questions && questions.length > 0) {
        body.questions = questions
      }

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data: CreateRoomResult & { error?: string } = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room')
      }

      router.push(`/host/${data.room.code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setCreating(false)
    }
  }

  // Word Chain skips question setup — create room immediately
  function handleGameSelect(gameType: GameType) {
    if (gameType === 'word-chain') {
      createRoom(gameType)
    } else {
      setStep('question-setup')
    }
  }

  function handleQuestionsConfirmed(questions: TotQuestionInput[]) {
    createRoom('this-or-that', questions)
  }

  // ── Step: Question Setup ──────────────────────────────────────────
  if (step === 'question-setup') {
    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto flex w-full max-w-lg flex-col px-4 py-12">
          <QuestionSetup
            onConfirm={handleQuestionsConfirmed}
            onBack={() => setStep('game-select')}
            loading={creating}
          />
        </div>
      </main>
    )
  }

  // ── Step: Game Select ─────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Gamepad2 className="size-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Create a Game Room</h1>
        <p className="text-sm text-muted-foreground">
          Pick a game and share the room code with your team
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Game Cards */}
      <div className="flex flex-col gap-4">
        {GAMES.map((game) => {
          const Icon = game.icon

          return (
            <Card
              key={game.type}
              className="group relative overflow-hidden border-border/30 bg-card/80 backdrop-blur-sm transition-colors hover:border-primary/30 cursor-pointer"
            >
              {/* Accent gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${game.accent} opacity-0 transition-opacity group-hover:opacity-100`}
                aria-hidden="true"
              />

              <CardHeader className="relative pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{game.title}</CardTitle>
                    </div>
                  </div>
                </div>
                <CardDescription className="pt-1">{game.description}</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleGameSelect(game.type)}
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating room…
                    </>
                  ) : (
                    <>
                      {game.type === 'this-or-that' ? 'Select Questions' : 'Create Room'}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
