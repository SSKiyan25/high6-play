// ── Difficulty ────────────────────────────────────────────────────────────

export type WordChainDifficulty = 'easy' | 'moderate' | 'difficult'

// ── Categories ────────────────────────────────────────────────────────────

export type WordChainCategory = {
  id: string
  name: string
  difficulty: WordChainDifficulty
  points: 1 | 2 | 3
  created_at: string
}

export type WordChainCategoryInput = {
  name: string
  difficulty: WordChainDifficulty
}

// ── Room Config ───────────────────────────────────────────────────────────

export type WordChainRoomConfig = {
  id: string
  room_id: string
  time_per_player_seconds: number
  survivors_to_win: number
  difficulty: WordChainDifficulty
  total_rounds: number
  selected_category_ids: string[]
  created_at: string
}

export type WordChainRoomConfigInput = {
  time_per_player_seconds: number
  survivors_to_win: number
  total_rounds: number
  selected_category_ids: string[]
}

// ── Round Flow ────────────────────────────────────────────────────────────

export type WordChainRoundStatus = 'active' | 'ended'

export type WordChainRoundPlayerStatus =
  | 'active'
  | 'skipped_this_cycle'
  | 'eliminated'
  | 'survivor'

export interface WordChainRound {
  id: string
  room_id: string
  round_number: number
  category_id: string
  status: WordChainRoundStatus
  turn_order: string[] // player IDs in current turn order
  current_turn_player_id: string | null
  created_at: string
}

export interface WordChainRoundPlayer {
  id: string
  round_id: string
  player_id: string
  status: WordChainRoundPlayerStatus
  skip_used: boolean
  turn_index: number
  created_at: string
}

// ── Scores ────────────────────────────────────────────────────────────────

export interface WordChainScore {
  id: string
  round_id: string
  player_id: string
  points: number
  created_at: string
}

// ── Composite / Derived Types ─────────────────────────────────────────────

export interface WordChainGameState {
  roomId: string
  roomCode: string
  currentRound: WordChainRound | null
  roundPlayers: (WordChainRoundPlayer & { nickname: string })[]
  category: WordChainCategory | null
  config: WordChainRoomConfig | null
  isGameOver: boolean
  totalRounds: number
}

export interface WordChainTurnResult {
  previousPlayerId: string
  previousPlayerNickname: string
  currentPlayerId: string | null // null if round ended
  currentPlayerNickname: string | null
  eliminatedPlayerId: string | null
  activePlayerCount: number
  roundEnded: boolean
  survivors: { player_id: string; nickname: string }[] | null
  pointsAwarded: number | null
}

export interface WordChainRoundState {
  round: WordChainRound
  roundPlayers: (WordChainRoundPlayer & { nickname: string })[]
  category: WordChainCategory
  activePlayerCount: number
  survivorsToWin: number
}

// ── Results ───────────────────────────────────────────────────────────────

export interface WordChainLeaderboardRow {
  player_id: string
  nickname: string
  total_points: number
  rounds_survived: number
}

export interface WordChainRoundBreakdown {
  round_number: number
  category_name: string
  difficulty: WordChainDifficulty
  points: number
  survivors: { nickname: string }[]
  eliminated: { nickname: string; reason: string }[]
}

export interface WordChainFullResults {
  leaderboard: WordChainLeaderboardRow[]
  roundBreakdowns: WordChainRoundBreakdown[]
}

// ── Seed Data ─────────────────────────────────────────────────────────────

export const SEED_CATEGORIES: WordChainCategoryInput[] = [
  // Easy
  { name: 'Countries', difficulty: 'easy' },
  { name: 'Fruits & Vegetables', difficulty: 'easy' },
  { name: 'Colors', difficulty: 'easy' },
  { name: 'Animals', difficulty: 'easy' },
  { name: 'Sports', difficulty: 'easy' },
  // Moderate
  { name: 'Movie Titles', difficulty: 'moderate' },
  { name: 'Famous People', difficulty: 'moderate' },
  { name: 'Cities', difficulty: 'moderate' },
  { name: 'Brands', difficulty: 'moderate' },
  { name: 'Instruments', difficulty: 'moderate' },
  // Difficult
  { name: 'Historical Events', difficulty: 'difficult' },
  { name: 'Scientific Terms', difficulty: 'difficult' },
  { name: 'Philosophy Concepts', difficulty: 'difficult' },
  { name: 'World Capitals', difficulty: 'difficult' },
  { name: 'Mythological Figures', difficulty: 'difficult' },
]

// ── Difficulty Helpers ────────────────────────────────────────────────────

export const DIFFICULTY_POINTS: Record<WordChainDifficulty, 1 | 2 | 3> = {
  easy: 1,
  moderate: 2,
  difficult: 3,
}

export const DIFFICULTY_LABELS: Record<WordChainDifficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  difficult: 'Difficult',
}
