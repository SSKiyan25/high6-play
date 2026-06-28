export type MoleMode = 'easy' | 'moderate' | 'hard'

export type MoleTopic = {
  id: string
  created_by: string
  title: string
  blurb: string
  image_url: string | null
  option_a: string
  option_b: string
  correct_choice: 'a' | 'b'
  mole_argument_1: string | null
  mole_argument_2: string | null
  mole_argument_3: string | null
  correct_answer_why: string | null
  created_at: string
}

export type MoleTopicInput = {
  title: string
  blurb: string
  image_url?: string
  option_a: string
  option_b: string
  correct_choice: 'a' | 'b'
  mole_argument_1?: string
  mole_argument_2?: string
  mole_argument_3?: string
  correct_answer_why?: string
}

export type MoleRoomConfig = {
  room_id: string
  mode: MoleMode
  mole_count: number
  canary_count: number
  discuss_timer_seconds: number
  vote_timer_seconds: number
  total_rounds: number
  selected_topic_ids: string[]
}

export type MoleRoomConfigInput = {
  mode: MoleMode
  mole_count: number
  canary_count: number
  discuss_timer_seconds: number
  vote_timer_seconds: number
  total_rounds: number
  selected_topic_ids?: string[]
}

// ── Round Flow ──────────────────────────────────────────────────────────

export type MolePhase = 'assigning' | 'discuss' | 'vote' | 'reveal'

export type MoleRole = 'mole' | 'canary' | 'crew'

export interface MoleRound {
  id: string
  room_id: string
  round_number: number
  topic_id: string
  mole_player_ids: string[]
  canary_player_ids: string[]
  phase: MolePhase
  correct_choice: 'a' | 'b'
  created_at: string
}

export interface MoleVote {
  id: string
  round_id: string
  player_id: string
  choice: 'a' | 'b'
}

export interface MyRoleResponse {
  role: MoleRole
  topic: MoleTopic
  correct_choice?: 'a' | 'b'      // only if role === 'mole'
  mole_argument?: string           // only if role === 'mole' — the single persuasion argument assigned to this mole, if any
}

export interface RoundScoreSummary {
  player_id: string
  nickname: string
  role: MoleRole
  voted_correctly: boolean
  points_this_round: number
}
