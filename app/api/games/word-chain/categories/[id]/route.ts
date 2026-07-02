import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateCategory, deleteCategory } from '@/features/word-chain/actions'
import type { WordChainCategoryInput } from '@/features/word-chain/types'

/**
 * PUT — update a category (host only).
 * Body: WordChainCategoryInput
 * Returns { category: WordChainCategory }
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
    const body = (await request.json()) as WordChainCategoryInput
    const category = await updateCategory(id, body)
    return NextResponse.json({ category })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update category'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

/**
 * DELETE — delete a category (host only).
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
    await deleteCategory(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete category'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
