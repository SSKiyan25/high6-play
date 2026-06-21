import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { Choice, TotQuestion, TotQuestionBank, TotQuestionInput, TotResults } from './types'

export async function getQuestionBank(): Promise<TotQuestionBank[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('tot_question_bank')
    .select()
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function saveToQuestionBank(
  questions: TotQuestionInput[],
): Promise<void> {
  const supabase = createBrowserClient()

  // Fetch existing questions to avoid duplicates
  const { data: existing } = await supabase
    .from('tot_question_bank')
    .select('option_a, option_b')

  const existingSet = new Set(
    (existing || []).map(
      (q) => `${q.option_a.toLowerCase().trim()}||${q.option_b.toLowerCase().trim()}`,
    ),
  )

  const newQuestions = questions.filter(
    (q) =>
      !existingSet.has(
        `${q.option_a.toLowerCase().trim()}||${q.option_b.toLowerCase().trim()}`,
      ),
  )

  if (newQuestions.length === 0) return

  const { error } = await supabase
    .from('tot_question_bank')
    .insert(newQuestions)

  if (error) throw error
}

export async function seedRoomQuestions(
  roomId: string,
  questions: TotQuestionInput[],
): Promise<TotQuestion[]> {
  const supabase = createBrowserClient()

  const rows = questions.map((q, i) => ({
    room_id: roomId,
    option_a: q.option_a,
    option_b: q.option_b,
    order: i,
  }))

  const { data, error } = await supabase
    .from('tot_questions')
    .insert(rows)
    .select()

  if (error) throw error
  return data || []
}

export async function getRoomQuestions(
  roomId: string,
): Promise<TotQuestion[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('tot_questions')
    .select()
    .eq('room_id', roomId)
    .order('order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function submitVote(
  questionId: string,
  playerId: string,
  choice: Choice,
): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase.from('tot_votes').upsert(
    {
      question_id: questionId,
      player_id: playerId,
      choice,
    },
    {
      onConflict: 'question_id,player_id',
      ignoreDuplicates: true,
    },
  )

  if (error) throw error
}

export async function getQuestionResults(
  questionId: string,
): Promise<TotResults> {
  const supabase = createBrowserClient()

  const { data: question, error: questionError } = await supabase
    .from('tot_questions')
    .select()
    .eq('id', questionId)
    .single()

  if (questionError) throw questionError
  if (!question) throw new Error('Question not found')

  const { data: votes, error: votesError } = await supabase
    .from('tot_votes')
    .select(
      `
      id,
      question_id,
      player_id,
      choice,
      players!inner (
        nickname
      )
    `,
    )
    .eq('question_id', questionId)

  if (votesError) throw votesError

  const votesWithNicknames = (votes || []).map((v: Record<string, unknown>) => ({
    id: v.id as string,
    question_id: v.question_id as string,
    player_id: v.player_id as string,
    choice: v.choice as Choice,
    nickname: (v.players as { nickname: string })?.nickname ?? 'Unknown',
  }))

  const a_voters = votesWithNicknames
    .filter((v) => v.choice === 'a')
    .map((v) => v.nickname)

  const b_voters = votesWithNicknames
    .filter((v) => v.choice === 'b')
    .map((v) => v.nickname)

  return {
    question,
    votes: votesWithNicknames,
    a_voters,
    b_voters,
    a_count: a_voters.length,
    b_count: b_voters.length,
  }
}

export async function advanceQuestion(
  roomCode: string,
  nextIndex: number,
): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase
    .from('rooms')
    .update({ current_question_index: nextIndex })
    .eq('code', roomCode)

  if (error) throw error
}

export async function getFullResults(
  roomId: string,
): Promise<
  {
    question: TotQuestion
    votes: {
      a: { playerId: string; nickname: string }[]
      b: { playerId: string; nickname: string }[]
    }
    totalVotes: number
  }[]
> {
  const supabase = createBrowserClient()

  // Fetch all questions for the room
  const { data: questions, error: questionsError } = await supabase
    .from('tot_questions')
    .select()
    .eq('room_id', roomId)
    .order('order', { ascending: true })

  if (questionsError) throw questionsError
  if (!questions || questions.length === 0) return []

  // Fetch all votes for these questions with player nicknames
  const questionIds = questions.map((q) => q.id)
  const { data: votes, error: votesError } = await supabase
    .from('tot_votes')
    .select(
      `
      id,
      question_id,
      player_id,
      choice,
      players!inner (
        nickname
      )
    `,
    )
    .in('question_id', questionIds)

  if (votesError) throw votesError

  const votesWithNicknames = (votes || []).map((v: Record<string, unknown>) => ({
    id: v.id as string,
    question_id: v.question_id as string,
    player_id: v.player_id as string,
    choice: v.choice as Choice,
    nickname: (v.players as { nickname: string })?.nickname ?? 'Unknown',
  }))

  // Group votes by question
  const votesByQuestion = new Map<string, typeof votesWithNicknames>()
  for (const v of votesWithNicknames) {
    const existing = votesByQuestion.get(v.question_id) || []
    existing.push(v)
    votesByQuestion.set(v.question_id, existing)
  }

  // Build result per question
  return questions.map((q) => {
    const qVotes = votesByQuestion.get(q.id) || []
    const aVotes = qVotes.filter((v) => v.choice === 'a')
    const bVotes = qVotes.filter((v) => v.choice === 'b')

    return {
      question: q,
      votes: {
        a: aVotes.map((v) => ({ playerId: v.player_id, nickname: v.nickname })),
        b: bVotes.map((v) => ({ playerId: v.player_id, nickname: v.nickname })),
      },
      totalVotes: qVotes.length,
    }
  })
}

export async function endGame(roomCode: string): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase
    .from('rooms')
    .update({ status: 'ended' })
    .eq('code', roomCode)

  if (error) throw error
}
