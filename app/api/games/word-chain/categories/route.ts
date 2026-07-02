import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getCategories,
  createCategory,
} from '@/features/word-chain/actions'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WordChainCategoryInput } from '@/features/word-chain/types'

/**
 * GET — list all categories.
 * POST — create a new category (host only).
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

    const categories = await getCategories(supabase as unknown as SupabaseClient)

    return NextResponse.json({ categories })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch categories'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await request.json()) as WordChainCategoryInput
    console.log('[word-chain POST] received body:', JSON.stringify(body))
    console.log('[word-chain POST] user.id:', user.id)

    const category = await createCategory(user.id, body, supabase as unknown as SupabaseClient)

    console.log('[word-chain POST] success, category:', JSON.stringify(category))
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('[word-chain POST] error:', error instanceof Error ? error.message : error)
    const message =
      error instanceof Error ? error.message : 'Failed to create category'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
