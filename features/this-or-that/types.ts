export type Choice = 'a' | 'b'

export type TotQuestion = {
  id: string
  room_id: string
  option_a: string
  option_b: string
  order: number
}

export type TotVote = {
  id: string
  question_id: string
  player_id: string
  choice: Choice
}

export type TotQuestionBank = {
  id: string
  option_a: string
  option_b: string
  created_at: string
}

export type TotQuestionInput = {
  option_a: string
  option_b: string
}

export type TotResults = {
  question: TotQuestion
  votes: (TotVote & { nickname: string })[]
  a_voters: string[]
  b_voters: string[]
  a_count: number
  b_count: number
}

export type TotGameState = {
  questions: TotQuestion[]
  currentIndex: number
  currentQuestion: TotQuestion | null
  isLastQuestion: boolean
  status: 'waiting' | 'active' | 'results' | 'ended'
}

export type TotVoteWithNickname = TotVote & { nickname: string }

export type TotQuestionResult = {
  question: TotQuestion
  votes: {
    a: { playerId: string; nickname: string }[]
    b: { playerId: string; nickname: string }[]
  }
  totalVotes: number
}
