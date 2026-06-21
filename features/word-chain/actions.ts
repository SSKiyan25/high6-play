import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type {
  WcPlayer,
  WcPlayerWithNickname,
  WcWord,
  WcGameState,
  WcTurnResult,
} from './types'

export async function initWcPlayers(
  roomId: string,
  playerIds: string[],
): Promise<void> {
  const supabase = createBrowserClient()

  const rows = playerIds.map((playerId) => ({
    room_id: roomId,
    player_id: playerId,
    is_eliminated: false,
  }))

  const { error } = await supabase.from('wc_players').insert(rows)

  if (error) throw error
}

export async function submitWord(
  roomId: string,
  playerId: string,
  word: string,
  turnOrder: number,
): Promise<WcTurnResult> {
  const supabase = createBrowserClient()

  // Fetch all existing words for the room, ordered by turn_order
  const { data: existingWords, error: fetchError } = await supabase
    .from('wc_words')
    .select('word')
    .eq('room_id', roomId)
    .order('turn_order', { ascending: true })

  if (fetchError) throw fetchError

  const usedWords = (existingWords || []).map((w) => w.word.toLowerCase())

  // If no words yet, any word is valid (first word)
  if (usedWords.length > 0) {
    const lastWord = usedWords[usedWords.length - 1]
    const lastLetter = lastWord[lastWord.length - 1]

    // Check if the word starts with the correct letter
    if (word.toLowerCase()[0] !== lastLetter) {
      return { valid: false, reason: 'wrong-letter' }
    }

    // Check if the word has already been used
    if (usedWords.includes(word.toLowerCase())) {
      return { valid: false, reason: 'already-used' }
    }
  }

  // Insert the valid word
  const { error: insertError } = await supabase.from('wc_words').insert({
    room_id: roomId,
    player_id: playerId,
    word,
    turn_order: turnOrder,
  })

  if (insertError) throw insertError

  return { valid: true }
}

export async function eliminatePlayer(
  roomId: string,
  playerId: string,
): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase
    .from('wc_players')
    .update({ is_eliminated: true })
    .eq('room_id', roomId)
    .eq('player_id', playerId)

  if (error) throw error
}

export async function getWcPlayers(
  roomId: string,
): Promise<WcPlayerWithNickname[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('wc_players')
    .select(
      `
      id,
      room_id,
      player_id,
      is_eliminated,
      players!inner (
        nickname,
        created_at
      )
    `,
    )
    .eq('room_id', roomId)
    .order('created_at', { referencedTable: 'players', ascending: true })

  if (error) throw error

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    room_id: row.room_id as string,
    player_id: row.player_id as string,
    is_eliminated: row.is_eliminated as boolean,
    nickname: (row.players as { nickname: string })?.nickname ?? 'Unknown',
  }))
}

export async function getWcWords(roomId: string): Promise<WcWord[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('wc_words')
    .select()
    .eq('room_id', roomId)
    .order('turn_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getWcGameState(roomId: string): Promise<WcGameState> {
  const [players, words] = await Promise.all([
    getWcPlayers(roomId),
    getWcWords(roomId),
  ])

  const activePlayers = players.filter((p) => !p.is_eliminated)
  const eliminatedPlayers = players.filter((p) => p.is_eliminated)
  const usedWords = words.map((w) => w.word)
  const lastWord = usedWords.length > 0 ? usedWords[usedWords.length - 1] : null
  const isGameOver = activePlayers.length <= 1
  const winnerId = isGameOver && activePlayers.length === 1 ? activePlayers[0].player_id : null

  return {
    currentPlayerIndex:
      activePlayers.length > 0 ? words.length % activePlayers.length : 0,
    usedWords,
    activePlayers,
    eliminatedPlayers,
    lastWord,
    isGameOver,
    winnerId,
  }
}

export async function endWcGame(roomId: string): Promise<string | null> {
  const state = await getWcGameState(roomId)
  return state.winnerId
}
