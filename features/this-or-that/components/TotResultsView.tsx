import type { TotQuestionResult } from '../types'
import { cn } from '@/lib/utils'

interface TotResultsViewProps {
  roomCode: string
  results: TotQuestionResult[]
}

export function TotResultsView({ roomCode, results }: TotResultsViewProps) {
  const totalQuestions = results.length

  return (
    <main className="flex min-h-svh flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-border/20 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            Room {roomCode}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Game Over
          </h1>
          <p className="mt-2 text-muted-foreground">
            {totalQuestions} question{totalQuestions !== 1 ? 's' : ''} played
          </p>
        </div>
      </div>

      {/* Results list */}
      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 py-8">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-lg text-muted-foreground">
              No results to display.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {results.map((result, index) => (
              <QuestionResultCard
                key={result.question.id}
                result={result}
                questionNumber={index + 1}
                isLast={index === results.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="border-t border-border/20 px-6 py-6">
        <div className="mx-auto max-w-4xl text-center">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-border/30 bg-card/40 px-6 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:border-border/50 hover:bg-card/60 cursor-pointer"
          >
            Play Again
          </a>
        </div>
      </div>
    </main>
  )
}

function QuestionResultCard({
  result,
  questionNumber,
  isLast,
}: {
  result: TotQuestionResult
  questionNumber: number
  isLast: boolean
}) {
  const { question, votes } = result
  const totalVotes = votes.a.length + votes.b.length
  const aPercent =
    totalVotes > 0 ? Math.round((votes.a.length / totalVotes) * 100) : 0
  const bPercent =
    totalVotes > 0 ? Math.round((votes.b.length / totalVotes) * 100) : 0
  const aWinner = votes.a.length > votes.b.length
  const bWinner = votes.b.length > votes.a.length
  const tie = votes.a.length === votes.b.length && totalVotes > 0

  return (
    <div className="space-y-4">
      {/* Question number */}
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
          {questionNumber}
        </span>
        <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
          Question {questionNumber}
        </span>
      </div>

      {/* Side-by-side columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Option A */}
        <div
          className={cn(
            'flex flex-col items-center rounded-2xl border px-4 py-6 transition-all duration-300',
            aWinner
              ? 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20'
              : 'border-blue-500/20 bg-blue-500/5',
          )}
        >
          {aWinner && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-blue-400 uppercase">
              Winner
            </span>
          )}
          {tie && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-blue-400 uppercase">
              Tie
            </span>
          )}
          <h3 className="text-center text-lg font-bold text-blue-400 sm:text-xl">
            {question.option_a}
          </h3>

          {/* Player chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {votes.a.length === 0 ? (
              <span className="text-xs text-muted-foreground">No votes</span>
            ) : (
              votes.a.map((v) => (
                <span
                  key={v.playerId}
                  className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300"
                >
                  {v.nickname}
                </span>
              ))
            )}
          </div>

          {/* Vote count + percentage */}
          <div className="mt-4 text-center">
            <span className="text-sm font-semibold text-blue-300">
              {votes.a.length} vote{votes.a.length !== 1 ? 's' : ''}
            </span>
            <span className="mx-1 text-blue-400/40">—</span>
            <span className="text-sm font-bold text-blue-400">{aPercent}%</span>
          </div>
        </div>

        {/* Option B */}
        <div
          className={cn(
            'flex flex-col items-center rounded-2xl border px-4 py-6 transition-all duration-300',
            bWinner
              ? 'border-violet-500/40 bg-violet-500/10 ring-1 ring-violet-500/20'
              : 'border-violet-500/20 bg-violet-500/5',
          )}
        >
          {bWinner && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-violet-400 uppercase">
              Winner
            </span>
          )}
          {tie && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-violet-400 uppercase">
              Tie
            </span>
          )}
          <h3 className="text-center text-lg font-bold text-violet-400 sm:text-xl">
            {question.option_b}
          </h3>

          {/* Player chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {votes.b.length === 0 ? (
              <span className="text-xs text-muted-foreground">No votes</span>
            ) : (
              votes.b.map((v) => (
                <span
                  key={v.playerId}
                  className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300"
                >
                  {v.nickname}
                </span>
              ))
            )}
          </div>

          {/* Vote count + percentage */}
          <div className="mt-4 text-center">
            <span className="text-sm font-semibold text-violet-300">
              {votes.b.length} vote{votes.b.length !== 1 ? 's' : ''}
            </span>
            <span className="mx-1 text-violet-400/40">—</span>
            <span className="text-sm font-bold text-violet-400">
              {bPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Divider between questions */}
      {!isLast && <div className="h-px bg-border/20" />}
    </div>
  )
}
