import { getRoom } from '@/features/rooms/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface ResultsPageProps {
  params: Promise<{ code: string }>
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { code } = await params

  let room
  try {
    room = await getRoom(code)
  } catch {
    notFound()
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-6">
      <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
        <span className="text-2xl font-bold text-primary">🏆</span>
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Game Over</h1>
        <p className="mt-2 text-muted-foreground">
          Room {code} has ended.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Full results coming soon — stay tuned!
        </p>
      </div>
      <Link
        href="/dashboard"
        className="text-sm text-primary transition-colors hover:underline"
      >
        ← Back to Dashboard
      </Link>
    </main>
  )
}
