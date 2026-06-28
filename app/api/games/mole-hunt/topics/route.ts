import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTopicBank, createTopic } from '@/features/mole-hunt/actions'
import type { MoleTopicInput } from '@/features/mole-hunt/types'

/**
 * GET — fetch the authenticated host's topic bank.
 * Returns { topics: MoleTopic[] }
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const topics = await getTopicBank(user.id)
    return NextResponse.json({ topics })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch topics'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

/**
 * POST — create a new topic in the host's bank.
 * Body: MoleTopicInput
 * Returns { topic: MoleTopic }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await request.json()) as MoleTopicInput
    const topic = await createTopic(user.id, body)
    return NextResponse.json({ topic }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create topic'
    const status = message.startsWith('Missing') ? 400 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
