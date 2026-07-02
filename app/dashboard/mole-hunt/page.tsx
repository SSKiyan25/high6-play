'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoleHuntSetup } from '@/features/mole-hunt/components/MoleHuntSetup'
import type { MoleRoomConfigInput } from '@/features/mole-hunt/types'

interface CreateRoomResult {
  room: { code: string }
}

export default function MoleHuntPage() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(config: MoleRoomConfigInput) {
    if (creating) return
    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_type: 'mole-hunt', config }),
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

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-lg flex-col px-4 py-12">
        <MoleHuntSetup
          onBack={() => router.push('/dashboard')}
          onCreateRoom={handleCreate}
          loading={creating}
        />
      </div>
    </main>
  )
}
