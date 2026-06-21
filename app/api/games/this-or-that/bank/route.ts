import { NextResponse } from 'next/server'
import { getQuestionBank } from '@/features/this-or-that/actions'

/**
 * GET — fetch the reusable This or That question bank.
 * Returns { questions: TotQuestionBank[] }
 */
export async function GET() {
  try {
    const questions = await getQuestionBank()
    return NextResponse.json({ questions })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch question bank'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
