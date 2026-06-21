export type WcWord = {
  id: string
  room_id: string
  player_id: string
  word: string
  turn_order: number
  created_at: string
}

export type WcPlayer = {
  id: string
  room_id: string
  player_id: string
  is_eliminated: boolean
}

export type WcPlayerWithNickname = WcPlayer & {
  nickname: string
}

export type WcGameState = {
  currentPlayerIndex: number
  usedWords: string[]
  activePlayers: WcPlayerWithNickname[]
  eliminatedPlayers: WcPlayerWithNickname[]
  lastWord: string | null
  isGameOver: boolean
  winnerId: string | null
}

export type WcTurnResult = {
  valid: boolean
  reason?: 'already-used' | 'wrong-letter' | 'timeout'
}
