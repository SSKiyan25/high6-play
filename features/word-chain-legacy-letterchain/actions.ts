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

/**
 * Returns full game results including winner, elimination order with reasons,
 * and the complete word chain. Uses turn_order on words as a proxy for
 * elimination order (players with no words are placed first).
 */
export async function getWcFullResults(
  roomId: string,
): Promise<{
  winner: WcPlayerWithNickname | null
  eliminationOrder: {
    player: WcPlayerWithNickname
    reason: string
  }[]
  words: WcWord[]
  totalWords: number
}> {
  const [players, words] = await Promise.all([
    getWcPlayers(roomId),
    getWcWords(roomId),
  ])

  const activePlayer = players.find((p) => !p.is_eliminated) ?? null
  const eliminatedPlayers = players.filter((p) => p.is_eliminated)

  // Build a map of player_id → their words (sorted by turn_order)
  const playerWords = new Map<string, WcWord[]>()
  for (const w of words) {
    const existing = playerWords.get(w.player_id) || []
    existing.push(w)
    playerWords.set(w.player_id, existing)
  }

  // Determine the last turn_order for each eliminated player
  const eliminationData = eliminatedPlayers.map((player) => {
    const pWords = playerWords.get(player.player_id) || []
    if (pWords.length === 0) {
      return {
        player,
        lastTurnOrder: -1, // No words — place first
        reason: 'Timed out',
      }
    }

    // Last word this player submitted
    const lastWord = pWords[pWords.length - 1]
    // Find the word that preceded this player's last word in the full chain
    const lastWordIndex = words.findIndex((w) => w.id === lastWord.id)
    const prevWord = lastWordIndex > 0 ? words[lastWordIndex - 1] : null

    // Infer reason
    let reason = 'Timed out'
    if (prevWord) {
      const expectedLetter =
        prevWord.word[prevWord.word.length - 1].toLowerCase()
      if (lastWord.word.toLowerCase()[0] !== expectedLetter) {
        reason = 'Wrong letter'
      }
    }
    // Check for duplicate (this word appears earlier in the chain)
    const wordLower = lastWord.word.toLowerCase()
    const earlierMatch = words
      .slice(0, lastWordIndex)
      .find((w) => w.word.toLowerCase() === wordLower)
    if (earlierMatch) {
      reason = 'Duplicate word'
    }

    return {
      player,
      lastTurnOrder: lastWord.turn_order,
      reason,
    }
  })

  // Sort by lastTurnOrder ascending (no-words first, then earliest elimination)
  eliminationData.sort((a, b) => a.lastTurnOrder - b.lastTurnOrder)

  return {
    winner: activePlayer,
    eliminationOrder: eliminationData.map((d) => ({
      player: d.player,
      reason: d.reason,
    })),
    words,
    totalWords: words.length,
  }
}
