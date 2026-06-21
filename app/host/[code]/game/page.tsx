import { getRoom } from '@/features/rooms/actions'
import { getRoomQuestions, getQuestionResults } from '@/features/this-or-that/actions'
import { HostView } from '@/features/this-or-that/components/HostView'
import { notFound } from 'next/navigation'

interface HostGamePageProps {
  params: Promise<{ code: string }>
}

export default async function HostGamePage({ params }: HostGamePageProps) {
  const { code } = await params

  let room
  try {
    room = await getRoom(code)
  } catch {
    notFound()
  }

  if (room.status === 'ended') {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#0a0a0a] p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Game Over</h1>
          <p className="mt-2 text-muted-foreground">This game has ended.</p>
        </div>
      </main>
    )
  }

  // Fetch questions and initial results
  const questions = await getRoomQuestions(room.id)
  const currentIndex = room.current_question_index ?? 0
  const currentQuestion = questions[currentIndex] ?? null

  let initialResults = null
  if (currentQuestion) {
    try {
      initialResults = await getQuestionResults(currentQuestion.id)
    } catch {
      // No results yet — that's fine, the game just started
    }
  }

  return (
    <HostView
      roomCode={code}
      questions={questions}
      initialIndex={currentIndex}
      initialResults={initialResults}
    />
  )
}
