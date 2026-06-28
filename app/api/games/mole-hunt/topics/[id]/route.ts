import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateTopic, deleteTopic } from '@/features/mole-hunt/actions'
import type { MoleTopicInput } from '@/features/mole-hunt/types'

/**
 * PUT — update a topic owned by the authenticated host.
 * Body: MoleTopicInput
 * Returns { topic: MoleTopic }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const body = (await request.json()) as MoleTopicInput
    const topic = await updateTopic(id, user.id, body)
    return NextResponse.json({ topic })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update topic'
    const status = message === 'Topic not found or you do not own it' ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * DELETE — delete a topic owned by the authenticated host.
 * Returns { success: true }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    await deleteTopic(id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete topic'
    const status = message === 'Topic not found or you do not own it' ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
