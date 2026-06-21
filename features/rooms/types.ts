export type GameType = 'this-or-that' | 'word-chain'
export type RoomStatus = 'waiting' | 'active' | 'ended'

export type Room = {
  id: string
  code: string
  game_type: GameType
  status: RoomStatus
  host_id: string | null
  current_question_index: number
  created_at: string
}

export type Player = {
  id: string
  room_id: string
  nickname: string
  is_host: boolean
  score: number
  created_at: string
}

export type RoomWithPlayers = Room & {
  players: Player[]
}
