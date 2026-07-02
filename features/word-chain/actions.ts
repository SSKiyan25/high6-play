import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  WordChainCategory,
  WordChainCategoryInput,
  WordChainRoomConfig,
  WordChainRoomConfigInput,
  WordChainRound,
  WordChainRoundPlayer,
  WordChainRoundPlayerStatus,
  WordChainTurnResult,
  WordChainRoundState,
  WordChainFullResults,
  WordChainLeaderboardRow,
  WordChainRoundBreakdown,
} from './types'
import { DIFFICULTY_POINTS, SEED_CATEGORIES } from './types'

// ── Client helper ───────────────────────────────────────────────────────

/** Returns the provided client if given, otherwise creates a browser client. */
function getClient(client?: SupabaseClient): SupabaseClient {
  return client ?? createBrowserClient()
}

// ── Category CRUD ──────────────────────────────────────────────────────

export async function getCategories(
  client?: SupabaseClient,
): Promise<WordChainCategory[]> {
  const supabase = getClient(client)

  const { data, error } = await supabase
    .from('wc_categories')
    .select()
    .order('difficulty', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createCategory(
  _hostId: string,
  input: WordChainCategoryInput,
  client?: SupabaseClient,
): Promise<WordChainCategory> {
  validateCategoryInput(input)
  console.log('[createCategory] input validated:', JSON.stringify(input))

  const supabase = client ?? createBrowserClient()
  console.log('[createCategory] using', client ? 'server client' : 'browser client')

  const points = DIFFICULTY_POINTS[input.difficulty]
  const row = {
    name: input.name.trim(),
    difficulty: input.difficulty,
    points,
  }
  console.log('[createCategory] inserting:', JSON.stringify(row))

  const { data, error } = await supabase
    .from('wc_categories')
    .insert(row)
    .select()
    .single()

  if (error) {
    console.error('[createCategory] supabase error:', JSON.stringify(error))
    throw error
  }
  console.log('[createCategory] success, data:', JSON.stringify(data))
  return data
}

export async function updateCategory(
  id: string,
  input: WordChainCategoryInput,
): Promise<WordChainCategory> {
  validateCategoryInput(input)

  const supabase = createBrowserClient()

  const points = DIFFICULTY_POINTS[input.difficulty]

  const { data, error } = await supabase
    .from('wc_categories')
    .update({
      name: input.name.trim(),
      difficulty: input.difficulty,
      points,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('Category not found.')
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createBrowserClient()

  const { error, count } = await supabase
    .from('wc_categories')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) throw error
  if (count === 0) throw new Error('Category not found.')
}

function validateCategoryInput(input: WordChainCategoryInput): void {
  if (!input.name?.trim()) throw new Error('Category name is required.')
  if (!['easy', 'moderate', 'difficult'].includes(input.difficulty)) {
    throw new Error('Difficulty must be easy, moderate, or difficult.')
  }
}

// ── Seed Starter Categories ────────────────────────────────────────────

/**
 * Inserts seed categories if the bank is empty.
 * Safe to call multiple times — skips if categories already exist.
 */
export async function seedCategoriesIfEmpty(
  client?: SupabaseClient,
): Promise<number> {
  const supabase = getClient(client)

  const { count, error: countError } = await supabase
    .from('wc_categories')
    .select('*', { count: 'exact', head: true })

  if (countError) throw countError
  if (count && count > 0) return 0

  const rows = SEED_CATEGORIES.map((c) => ({
    name: c.name,
    difficulty: c.difficulty,
    points: DIFFICULTY_POINTS[c.difficulty],
  }))

  const { error } = await supabase.from('wc_categories').insert(rows)

  if (error) throw error
  return rows.length
}

// ── Room Config ────────────────────────────────────────────────────────

export async function getRoomConfig(
  roomId: string,
  client?: SupabaseClient,
): Promise<WordChainRoomConfig | null> {
  const supabase = getClient(client)

  const { data, error } = await supabase
    .from('wc_room_config')
    .select()
    .eq('room_id', roomId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function saveRoomConfig(
  roomId: string,
  input: WordChainRoomConfigInput,
  client?: SupabaseClient,
): Promise<void> {
  // Validate numeric fields
  if (input.time_per_player_seconds < 5) {
    throw new Error('Time per player must be at least 5 seconds.')
  }
  if (input.survivors_to_win < 1) {
    throw new Error('Survivors to win must be at least 1.')
  }
  if (input.total_rounds < 1) {
    throw new Error('Total rounds must be at least 1.')
  }
  if (
    !input.selected_category_ids ||
    input.selected_category_ids.length === 0
  ) {
    throw new Error('At least one category must be selected.')
  }
  if (input.selected_category_ids.length !== input.total_rounds) {
    throw new Error(
      `Number of selected categories (${input.selected_category_ids.length}) must equal total rounds (${input.total_rounds}).`,
    )
  }

  // Validate survivors_to_win against current player count
  const supabase = getClient(client)

  const { count: playerCount, error: countError } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .neq('is_host', true)

  if (countError) {
    console.error('[saveRoomConfig] Player count query failed:', countError)
    throw countError
  }

  if (playerCount !== null && playerCount > 0 && input.survivors_to_win >= playerCount) {
    throw new Error(
      `Survivors to win (${input.survivors_to_win}) must be less than the number of players (${playerCount}).`,
    )
  }

  console.log('[saveRoomConfig] Upserting wc_room_config:', {
    room_id: roomId,
    time_per_player_seconds: input.time_per_player_seconds,
    survivors_to_win: input.survivors_to_win,
    difficulty: 'moderate',
    total_rounds: input.total_rounds,
    selected_category_ids: input.selected_category_ids,
    selected_count: input.selected_category_ids.length,
  })

  const { error } = await supabase.from('wc_room_config').upsert(
    {
      room_id: roomId,
      time_per_player_seconds: input.time_per_player_seconds,
      survivors_to_win: input.survivors_to_win,
      difficulty: 'moderate',
      total_rounds: input.total_rounds,
      selected_category_ids: input.selected_category_ids,
    },
    { onConflict: 'room_id' },
  )

  if (error) {
    console.error('[saveRoomConfig] Upsert failed:', error)
    throw error
  }
}

// ── Game Lifecycle ──────────────────────────────────────────────────────

export async function startGame(
  roomId: string,
  hostId: string,
  client?: SupabaseClient,
) {
  const supabase = getClient(client)

  // 1. Fetch room config
  const config = await getRoomConfig(roomId, supabase)
  if (!config) throw new Error('Game config not found for this room.')

  // 2. Fetch room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('host_id, game_type, code')
    .eq('id', roomId)
    .single()

  if (roomError || !room) throw new Error('Room not found.')
  if (room.host_id !== hostId) throw new Error('Only the host can start the game.')

  // 3. Count players (exclude host)
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, nickname')
    .eq('room_id', roomId)
    .neq('is_host', true)

  if (playersError) throw playersError
  const playerIds = (players ?? []).map((p) => p.id)
  const playerCount = playerIds.length

  // 4. Server-side validation
  if (playerCount < 2) {
    throw new Error('Need at least 2 players to start.')
  }
  if (config.survivors_to_win >= playerCount) {
    throw new Error(
      `Survivors to win (${config.survivors_to_win}) must be less than the number of players (${playerCount}).`,
    )
  }
  if (config.total_rounds < 1) {
    throw new Error('Must have at least 1 round.')
  }
  if (!config.selected_category_ids || config.selected_category_ids.length === 0) {
    throw new Error('Select at least one category before starting.')
  }
  if (config.selected_category_ids.length !== config.total_rounds) {
    throw new Error(
      `Select exactly ${config.total_rounds} categories to match your round count.`,
    )
  }

  // 5. Fetch the selected categories in order
  const allCategories = await getCategories(supabase)
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]))
  const selectedCategories = config.selected_category_ids
    .map((id) => categoryMap.get(id))
    .filter(Boolean) as WordChainCategory[]

  if (selectedCategories.length !== config.total_rounds) {
    throw new Error('Some selected categories no longer exist. Please re-select.')
  }

  // 6. Randomize turn order for round 1
  const turnOrder = shuffle(playerIds)

  // 7. First category
  const firstCategory = selectedCategories[0]

  // 8. Insert first round
  const { data: round, error: roundError } = await supabase
    .from('wc_rounds')
    .insert({
      room_id: roomId,
      round_number: 1,
      category_id: firstCategory.id,
      status: 'active',
      turn_order: turnOrder,
      current_turn_player_id: turnOrder[0],
    })
    .select()
    .single()

  if (roundError) throw roundError

  // 9. Insert round_players
  const roundPlayerRows = turnOrder.map((pid, index) => ({
    round_id: round.id,
    player_id: pid,
    status: 'active' as WordChainRoundPlayerStatus,
    skip_used: false,
    turn_index: index,
  }))

  const { error: rpError } = await supabase
    .from('wc_round_players')
    .insert(roundPlayerRows)

  if (rpError) throw rpError

  // 10. Build nickname map for the response
  const nicknameMap = new Map((players ?? []).map((p) => [p.id, p.nickname]))

  return {
    round,
    roomCode: room.code,
    totalRounds: config.total_rounds,
    timePerPlayerSeconds: config.time_per_player_seconds,
    turnOrder,
    currentPlayerNickname: nicknameMap.get(turnOrder[0]) ?? 'Unknown',
    category: firstCategory,
    config,
  }
}

// ── Turn Actions ───────────────────────────────────────────────────────

/**
 * Player taps "I answered" — ends their turn and advances to the next player.
 * No text stored, no validation beyond "is it your turn?"
 */
export async function confirmTurn(
  roundId: string,
  playerId: string,
): Promise<WordChainTurnResult> {
  const supabase = createBrowserClient()

  // 1. Fetch current round
  const { data: round, error: roundError } = await supabase
    .from('wc_rounds')
    .select()
    .eq('id', roundId)
    .single()

  if (roundError || !round) throw new Error('Round not found.')
  if (round.status !== 'active') throw new Error('Round is not active.')

  // 2. Verify it's this player's turn
  if (round.current_turn_player_id !== playerId) {
    throw new Error("It's not your turn.")
  }

  // 3. Fetch round players for nickname lookup
  const { data: roundPlayers, error: rpError } = await supabase
    .from('wc_round_players')
    .select('player_id, status, skip_used')
    .eq('round_id', roundId)

  if (rpError) throw rpError

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, nickname')
    .in('player_id', (roundPlayers ?? []).map((rp) => rp.player_id))

  // Fix: use the actual players table join
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, nickname')
    .eq('room_id', round.room_id)

  const nicknameMap = new Map((allPlayers ?? []).map((p) => [p.id, p.nickname]))

  // 4. Get the turn order and find next active player
  const turnOrder: string[] = round.turn_order ?? []
  const currentIndex = turnOrder.indexOf(playerId)
  const result = findNextActivePlayer(
    turnOrder,
    currentIndex,
    roundPlayers ?? [],
    playerId,
    nicknameMap,
  )

  // 5. Update round: set new current_turn_player_id (or null if round ended)
  const { error: updateError } = await supabase
    .from('wc_rounds')
    .update({ current_turn_player_id: result.nextPlayerId })
    .eq('id', roundId)

  if (updateError) throw updateError

  return {
    previousPlayerId: playerId,
    previousPlayerNickname: nicknameMap.get(playerId) ?? 'Unknown',
    currentPlayerId: result.nextPlayerId,
    currentPlayerNickname: result.nextPlayerNickname,
    eliminatedPlayerId: null,
    activePlayerCount: result.activeCount,
    roundEnded: false,
    survivors: null,
    pointsAwarded: null,
  }
}

/**
 * Player skips their turn. Validates skip not already used.
 * Moves player to end of turn order with status 'skipped_this_cycle'.
 */
export async function skipTurn(
  roundId: string,
  playerId: string,
): Promise<WordChainTurnResult> {
  const supabase = createBrowserClient()

  // 1. Fetch current round
  const { data: round, error: roundError } = await supabase
    .from('wc_rounds')
    .select()
    .eq('id', roundId)
    .single()

  if (roundError || !round) throw new Error('Round not found.')
  if (round.status !== 'active') throw new Error('Round is not active.')

  // 2. Verify it's this player's turn
  if (round.current_turn_player_id !== playerId) {
    throw new Error("It's not your turn.")
  }

  // 3. Check skip not used
  const { data: rp, error: rpFetchError } = await supabase
    .from('wc_round_players')
    .select('id, skip_used')
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .single()

  if (rpFetchError || !rp) throw new Error('Player not found in this round.')
  if (rp.skip_used) {
    const err = new Error('You have already used your skip this round.')
    ;(err as any).status = 409
    throw err
  }

  // 4. Mark skip_used and status
  const { error: skipUpdateError } = await supabase
    .from('wc_round_players')
    .update({ skip_used: true, status: 'skipped_this_cycle' })
    .eq('id', rp.id)

  if (skipUpdateError) throw skipUpdateError

  // 5. Reorder turn_order: move player to end
  const turnOrder: string[] = round.turn_order ?? []
  const currentIndex = turnOrder.indexOf(playerId)
  const newOrder = [
    ...turnOrder.slice(0, currentIndex),
    ...turnOrder.slice(currentIndex + 1),
    playerId,
  ]

  // 6. Find next active player
  const { data: roundPlayers } = await supabase
    .from('wc_round_players')
    .select('player_id, status, skip_used')
    .eq('round_id', roundId)

  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, nickname')
    .eq('room_id', round.room_id)

  const nicknameMap = new Map((allPlayers ?? []).map((p) => [p.id, p.nickname]))

  // After reorder, the next player is at the same index (since current was removed)
  const nextIndex = currentIndex < newOrder.length - 1 ? currentIndex : 0
  const result = findNextActivePlayer(
    newOrder,
    currentIndex - 1, // look from the position before where current was (since it moved to end)
    roundPlayers ?? [],
    playerId,
    nicknameMap,
  )

  // 7. Save new turn order + current player
  const { error: orderUpdateError } = await supabase
    .from('wc_rounds')
    .update({
      turn_order: newOrder,
      current_turn_player_id: result.nextPlayerId,
    })
    .eq('id', roundId)

  if (orderUpdateError) throw orderUpdateError

  return {
    previousPlayerId: playerId,
    previousPlayerNickname: nicknameMap.get(playerId) ?? 'Unknown',
    currentPlayerId: result.nextPlayerId,
    currentPlayerNickname: result.nextPlayerNickname,
    eliminatedPlayerId: null,
    activePlayerCount: result.activeCount,
    roundEnded: false,
    survivors: null,
    pointsAwarded: null,
  }
}

/**
 * Host-only: eliminates the current player due to timeout.
 * Checks if round should end (active players == survivors_to_win).
 */
export async function advanceTurn(
  roundId: string,
  hostId: string,
  client?: SupabaseClient,
): Promise<WordChainTurnResult> {
  const supabase = getClient(client)

  // 1. Fetch current round + room
  const { data: round, error: roundError } = await supabase
    .from('wc_rounds')
    .select('*, rooms!inner(host_id, code)')
    .eq('id', roundId)
    .single()

  if (roundError || !round) throw new Error('Round not found.')

  const room = (round as any).rooms
  if (!room || room.host_id !== hostId) {
    throw new Error('Only the host can advance the turn.')
  }
  if (round.status !== 'active') throw new Error('Round is not active.')

  const eliminatedPlayerId = round.current_turn_player_id
  if (!eliminatedPlayerId) throw new Error('No current player to eliminate.')

  // 2. Mark player as eliminated
  const { error: elimError } = await supabase
    .from('wc_round_players')
    .update({ status: 'eliminated' })
    .eq('round_id', roundId)
    .eq('player_id', eliminatedPlayerId)

  if (elimError) throw elimError

  // 3. Fetch all round players + nicknames
  const { data: roundPlayers } = await supabase
    .from('wc_round_players')
    .select('player_id, status, skip_used')
    .eq('round_id', roundId)

  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, nickname')
    .eq('room_id', round.room_id)

  const nicknameMap = new Map((allPlayers ?? []).map((p) => [p.id, p.nickname]))

  // 4. Count active players (after elimination)
  const activeCount =
    (roundPlayers ?? []).filter(
      (rp) =>
        rp.status === 'active' || rp.status === 'skipped_this_cycle',
    ).length

  // 5. Fetch config for survivors_to_win
  const config = await getRoomConfig(round.room_id)
  const survivorsToWin = config?.survivors_to_win ?? 1

  // 6. Check if round should end
  if (activeCount <= survivorsToWin) {
    // End the round — award points to survivors
    const result = await endRoundInternal(
      roundId,
      round.room_id,
      round.category_id,
      roundPlayers ?? [],
      allPlayers ?? [],
      nicknameMap,
      supabase,
    )

    return {
      previousPlayerId: eliminatedPlayerId,
      previousPlayerNickname: nicknameMap.get(eliminatedPlayerId) ?? 'Unknown',
      currentPlayerId: null,
      currentPlayerNickname: null,
      eliminatedPlayerId,
      activePlayerCount: activeCount,
      roundEnded: true,
      survivors: result.survivors,
      pointsAwarded: result.pointsAwarded,
    }
  }

  // 7. Not ending — find next active player
  const turnOrder: string[] = round.turn_order ?? []
  const currentIndex = turnOrder.indexOf(eliminatedPlayerId)
  const nextResult = findNextActivePlayer(
    turnOrder,
    currentIndex,
    roundPlayers ?? [],
    eliminatedPlayerId,
    nicknameMap,
  )

  // 8. Update round
  const { error: updateError } = await supabase
    .from('wc_rounds')
    .update({ current_turn_player_id: nextResult.nextPlayerId })
    .eq('id', roundId)

  if (updateError) throw updateError

  return {
    previousPlayerId: eliminatedPlayerId,
    previousPlayerNickname: nicknameMap.get(eliminatedPlayerId) ?? 'Unknown',
    currentPlayerId: nextResult.nextPlayerId,
    currentPlayerNickname: nextResult.nextPlayerNickname,
    eliminatedPlayerId,
    activePlayerCount: activeCount,
    roundEnded: false,
    survivors: null,
    pointsAwarded: null,
  }
}

// ── Round Management ───────────────────────────────────────────────────

async function endRoundInternal(
  roundId: string,
  roomId: string,
  categoryId: string,
  roundPlayers: { player_id: string; status: string; skip_used: boolean }[],
  allPlayers: { id: string; nickname: string }[],
  nicknameMap: Map<string, string>,
  client?: SupabaseClient,
) {
  const supabase = getClient(client)

  // 1. Get category for points value
  const { data: category } = await supabase
    .from('wc_categories')
    .select('points, name')
    .eq('id', categoryId)
    .single()

  const pointsAwarded = category?.points ?? 1

  // 2. Find survivors (active or skipped_this_cycle)
  const survivorIds = roundPlayers
    .filter(
      (rp) =>
        rp.status === 'active' || rp.status === 'skipped_this_cycle',
    )
    .map((rp) => rp.player_id)

  // 3. Mark survivors in wc_round_players
  if (survivorIds.length > 0) {
    await supabase
      .from('wc_round_players')
      .update({ status: 'survivor' })
      .eq('round_id', roundId)
      .in('player_id', survivorIds)
  }

  // 4. Insert scores for survivors
  const scoreRows = survivorIds.map((pid) => ({
    round_id: roundId,
    player_id: pid,
    points: pointsAwarded,
  }))

  if (scoreRows.length > 0) {
    const { error: scoreError } = await supabase
      .from('wc_scores')
      .insert(scoreRows)

    if (scoreError) throw scoreError
  }

  // 5. Mark round as ended
  const { error: endError } = await supabase
    .from('wc_rounds')
    .update({ status: 'ended', current_turn_player_id: null })
    .eq('id', roundId)

  if (endError) {
    console.error('[endRoundInternal] Failed to end round:', endError)
    throw endError
  }

  const survivors = survivorIds.map((pid) => ({
    player_id: pid,
    nickname: nicknameMap.get(pid) ?? 'Unknown',
  }))

  return { survivors, pointsAwarded }
}

export async function endRound(roundId: string, hostId: string, client?: SupabaseClient) {
  const supabase = getClient(client)

  const { data: round, error: roundError } = await supabase
    .from('wc_rounds')
    .select('*, rooms!inner(host_id, code)')
    .eq('id', roundId)
    .single()

  if (roundError || !round) throw new Error('Round not found.')

  const room = (round as any).rooms
  if (!room || room.host_id !== hostId) {
    throw new Error('Only the host can end the round.')
  }

  // Fetch round players + all players
  const { data: roundPlayers } = await supabase
    .from('wc_round_players')
    .select('player_id, status, skip_used')
    .eq('round_id', roundId)

  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, nickname')
    .eq('room_id', round.room_id)

  const nicknameMap = new Map((allPlayers ?? []).map((p) => [p.id, p.nickname]))

  return endRoundInternal(
    roundId,
    round.room_id,
    round.category_id,
    roundPlayers ?? [],
    allPlayers ?? [],
    nicknameMap,
    supabase,
  )
}

export async function startNextRound(roomId: string, hostId: string) {
  const supabase = createBrowserClient()

  // 1. Fetch current (latest) round
  const { data: currentRound, error: roundError } = await supabase
    .from('wc_rounds')
    .select('*, rooms!inner(host_id, code)')
    .eq('room_id', roomId)
    .order('round_number', { ascending: false })
    .limit(1)
    .single()

  if (roundError || !currentRound) throw new Error('No active round found.')

  const room = (currentRound as any).rooms
  if (!room || room.host_id !== hostId) {
    throw new Error('Only the host can advance to the next round.')
  }

  if (currentRound.status !== 'ended') {
    throw new Error('Current round must be ended before starting the next.')
  }

  // 2. Check we haven't exceeded total rounds
  const config = await getRoomConfig(roomId)
  if (!config) throw new Error('Game config not found.')

  if (currentRound.round_number >= config.total_rounds) {
    throw new Error('This was the final round. End the game instead.')
  }

  // 3. Fetch all players (exclude host)
  const { data: players } = await supabase
    .from('players')
    .select('id, nickname')
    .eq('room_id', roomId)
    .neq('is_host', true)

  const playerIds = (players ?? []).map((p) => p.id)

  // 4. Get next category
  const nextRoundNumber = currentRound.round_number + 1
  const categoryIndex = nextRoundNumber - 1
  const nextCategoryId = config.selected_category_ids[categoryIndex]

  if (!nextCategoryId) {
    throw new Error('Not enough categories for the next round.')
  }

  const allCategories = await getCategories()
  const nextCategory = allCategories.find((c) => c.id === nextCategoryId)
  if (!nextCategory) throw new Error('Selected category no longer exists.')

  // 5. Randomize fresh turn order
  const turnOrder = shuffle(playerIds)

  // 6. Create new round
  const { data: round, error: insertError } = await supabase
    .from('wc_rounds')
    .insert({
      room_id: roomId,
      round_number: nextRoundNumber,
      category_id: nextCategory.id,
      status: 'active',
      turn_order: turnOrder,
      current_turn_player_id: turnOrder[0],
    })
    .select()
    .single()

  if (insertError) throw insertError

  // 7. Insert round_players (all active again)
  const roundPlayerRows = turnOrder.map((pid, index) => ({
    round_id: round.id,
    player_id: pid,
    status: 'active' as WordChainRoundPlayerStatus,
    skip_used: false,
    turn_index: index,
  }))

  const { error: rpError } = await supabase
    .from('wc_round_players')
    .insert(roundPlayerRows)

  if (rpError) throw rpError

  const nicknameMap = new Map((players ?? []).map((p) => [p.id, p.nickname]))

  return {
    round,
    roomCode: room.code,
    timePerPlayerSeconds: config.time_per_player_seconds,
    turnOrder,
    currentPlayerNickname: nicknameMap.get(turnOrder[0]) ?? 'Unknown',
    category: nextCategory,
    config,
  }
}

export async function endGame(roomId: string, hostId: string) {
  const supabase = createBrowserClient()

  // Verify host
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('host_id, code')
    .eq('id', roomId)
    .single()

  if (roomError || !room) throw new Error('Room not found.')
  if (room.host_id !== hostId) throw new Error('Only the host can end the game.')

  // Mark room ended
  const { error: updateError } = await supabase
    .from('rooms')
    .update({ status: 'ended' })
    .eq('id', roomId)

  if (updateError) throw updateError

  return { roomCode: room.code }
}

// ── Results ─────────────────────────────────────────────────────────────

export async function getResults(
  roomId: string,
  client?: SupabaseClient,
): Promise<WordChainFullResults> {
  const supabase = getClient(client)

  // 1. Fetch all players
  const { data: players } = await supabase
    .from('players')
    .select('id, nickname')
    .eq('room_id', roomId)
    .neq('is_host', true)

  const nicknameMap = new Map((players ?? []).map((p) => [p.id, p.nickname]))

  // 2. Fetch all rounds for this room
  const { data: roomRounds } = await supabase
    .from('wc_rounds')
    .select('id')
    .eq('room_id', roomId)

  const roundIds = (roomRounds ?? []).map((r) => r.id)

  // 3. Aggregate scores across all rounds
  let allScores: { player_id: string; points: number; round_id: string }[] = []

  if (roundIds.length > 0) {
    const { data: scores } = await supabase
      .from('wc_scores')
      .select('player_id, points, round_id')
      .in('round_id', roundIds)

    allScores = scores ?? []
  }

  // Group by player_id
  const playerTotals = new Map<string, number>()
  const playerRounds = new Map<string, number>()

  for (const s of allScores) {
    playerTotals.set(s.player_id, (playerTotals.get(s.player_id) ?? 0) + s.points)
    playerRounds.set(s.player_id, (playerRounds.get(s.player_id) ?? 0) + 1)
  }

  // Include players with 0 points
  for (const p of players ?? []) {
    if (!playerTotals.has(p.id)) {
      playerTotals.set(p.id, 0)
      playerRounds.set(p.id, 0)
    }
  }

  const leaderboard: WordChainLeaderboardRow[] = Array.from(playerTotals.entries())
    .map(([player_id, total_points]) => ({
      player_id,
      nickname: nicknameMap.get(player_id) ?? 'Unknown',
      total_points,
      rounds_survived: playerRounds.get(player_id) ?? 0,
    }))
    .sort((a, b) => b.total_points - a.total_points)

  // 3. Round breakdowns
  const { data: rounds } = await supabase
    .from('wc_rounds')
    .select(
      `
      id,
      round_number,
      category_id,
      wc_categories!inner(name, difficulty, points)
    `,
    )
    .eq('room_id', roomId)
    .order('round_number', { ascending: true })

  const roundBreakdowns: WordChainRoundBreakdown[] = []

  for (const r of rounds ?? []) {
    const category = (r as any).wc_categories
    const { data: rps } = await supabase
      .from('wc_round_players')
      .select('player_id, status')
      .eq('round_id', r.id)

    const survivors: { nickname: string }[] = []
    const eliminated: { nickname: string; reason: string }[] = []

    for (const rp of rps ?? []) {
      const nick = nicknameMap.get(rp.player_id) ?? 'Unknown'
      if (rp.status === 'survivor') {
        survivors.push({ nickname: nick })
      } else if (rp.status === 'eliminated') {
        eliminated.push({ nickname: nick, reason: 'timeout' })
      }
    }

    roundBreakdowns.push({
      round_number: r.round_number,
      category_name: category?.name ?? 'Unknown',
      difficulty: (category?.difficulty ?? 'easy') as WordChainRoundBreakdown['difficulty'],
      points: category?.points ?? 1,
      survivors,
      eliminated,
    })
  }

  return { leaderboard, roundBreakdowns }
}

// ── Queries ─────────────────────────────────────────────────────────────

export async function getCurrentRound(
  roomId: string,
  client?: SupabaseClient,
) {
  const supabase = getClient(client)

  const { data, error } = await supabase
    .from('wc_rounds')
    .select()
    .eq('room_id', roomId)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function getRoundState(
  roundId: string,
  client?: SupabaseClient,
): Promise<WordChainRoundState | null> {
  const supabase = getClient(client)

  const { data: round, error: roundError } = await supabase
    .from('wc_rounds')
    .select()
    .eq('id', roundId)
    .single()

  if (roundError || !round) return null

  // Fetch round players with nicknames
  const { data: roundPlayers } = await supabase
    .from('wc_round_players')
    .select('*, players!inner(nickname)')
    .eq('round_id', roundId)
    .order('turn_index', { ascending: true })

  // Fetch category
  const { data: category } = await supabase
    .from('wc_categories')
    .select()
    .eq('id', round.category_id)
    .single()

  const config = await getRoomConfig(round.room_id)

  const mappedPlayers: (WordChainRoundPlayer & { nickname: string })[] = (
    roundPlayers ?? []
  ).map((rp: any) => ({
    id: rp.id,
    round_id: rp.round_id,
    player_id: rp.player_id,
    status: rp.status as WordChainRoundPlayerStatus,
    skip_used: rp.skip_used ?? false,
    turn_index: rp.turn_index,
    created_at: rp.created_at,
    nickname: (rp as any).players?.nickname ?? 'Unknown',
  }))

  const activeCount = mappedPlayers.filter(
    (rp) =>
      rp.status === 'active' || rp.status === 'skipped_this_cycle',
  ).length

  return {
    round: round as WordChainRound,
    roundPlayers: mappedPlayers,
    category: category as WordChainCategory,
    activePlayerCount: activeCount,
    survivorsToWin: config?.survivors_to_win ?? 1,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Finds the next active (non-eliminated) player in the turn order,
 * starting from the position after `currentIndex`.
 */
function findNextActivePlayer(
  turnOrder: string[],
  currentIndex: number,
  roundPlayers: { player_id: string; status: string; skip_used: boolean }[],
  currentPlayerId: string,
  nicknameMap: Map<string, string>,
): {
  nextPlayerId: string | null
  nextPlayerNickname: string | null
  activeCount: number
} {
  const eliminatedIds = new Set(
    roundPlayers
      .filter((rp) => rp.status === 'eliminated')
      .map((rp) => rp.player_id),
  )

  const activePlayers = roundPlayers.filter(
    (rp) => rp.status !== 'eliminated',
  )
  const activeCount = activePlayers.length

  // Search forward from currentIndex + 1, wrapping around
  const len = turnOrder.length
  for (let i = 1; i <= len; i++) {
    const idx = (currentIndex + i) % len
    const pid = turnOrder[idx]
    if (!eliminatedIds.has(pid)) {
      return {
        nextPlayerId: pid,
        nextPlayerNickname: nicknameMap.get(pid) ?? 'Unknown',
        activeCount,
      }
    }
  }

  // No active player found
  return { nextPlayerId: null, nextPlayerNickname: null, activeCount }
}
