'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { JoinForm } from '@/features/rooms/components/JoinForm'
import { ArrowRight, Gamepad2, Monitor } from 'lucide-react'

export default function Home() {
  const [showJoin, setShowJoin] = useState(false)
  const router = useRouter()

  if (showJoin) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center p-4">
        <div className="flex w-full max-w-sm flex-col gap-4">
          <JoinForm />
          <button
            type="button"
            onClick={() => setShowJoin(false)}
            className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            ← Back
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-4">
      {/* Logo / Title */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Gamepad2 className="size-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">high6-play</h1>
        <p className="text-sm text-muted-foreground">
          Weekly meeting game hub
        </p>
      </div>

      {/* Options */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button
          variant="default"
          size="lg"
          className="h-auto w-full py-5"
          onClick={() => router.push('/auth/login')}
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="size-5" />
              <div className="text-left">
                <div className="font-semibold">I&apos;m the Host</div>
                <div className="text-xs text-primary-foreground/70">
                  Create and manage game rooms
                </div>
              </div>
            </div>
            <ArrowRight className="size-4" />
          </div>
        </Button>

        <Button
          variant="secondary"
          size="lg"
          className="h-auto py-5"
          onClick={() => setShowJoin(true)}
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <Gamepad2 className="size-5" />
              <div className="text-left">
                <div className="font-semibold">Join a Room</div>
                <div className="text-xs text-secondary-foreground/70">
                  Enter a room code to play
                </div>
              </div>
            </div>
            <ArrowRight className="size-4" />
          </div>
        </Button>
      </div>
    </main>
  )
}
