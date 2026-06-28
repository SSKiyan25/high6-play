import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MoleTopic,
  MoleTopicInput,
  MoleRoomConfig,
  MoleRoomConfigInput,
  MolePhase,
  MoleRole,
  MyRoleResponse,
  RoundScoreSummary,
} from './types'

// ── Client helper ───────────────────────────────────────────────────────

/** Returns the provided client if given, otherwise creates a browser client. */
function getClient(client?: SupabaseClient): SupabaseClient {
  return client ?? createBrowserClient()
}

// ── Topic Bank ────────────────────────────────────────────────────────

export async function getTopicBank(
  hostId: string,
  client?: SupabaseClient,
): Promise<MoleTopic[]> {
  const supabase = getClient(client)

  const { data, error } = await supabase
    .from('mole_topics')
    .select()
    .eq('created_by', hostId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createTopic(
  hostId: string,
  input: MoleTopicInput,
): Promise<MoleTopic> {
  validateTopicInput(input)

  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('mole_topics')
    .insert({
      created_by: hostId,
      title: input.title,
      blurb: input.blurb,
      image_url: input.image_url ?? null,
      option_a: input.option_a,
      option_b: input.option_b,
      correct_choice: input.correct_choice,
      correct_answer_why: input.correct_answer_why ?? null,
      mole_argument_1: input.mole_argument_1 ?? null,
      mole_argument_2: input.mole_argument_2 ?? null,
      mole_argument_3: input.mole_argument_3 ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTopic(
  id: string,
  hostId: string,
  input: MoleTopicInput,
): Promise<MoleTopic> {
  validateTopicInput(input)

  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('mole_topics')
    .update({
      title: input.title,
      blurb: input.blurb,
      image_url: input.image_url ?? null,
      option_a: input.option_a,
      option_b: input.option_b,
      correct_choice: input.correct_choice,
      correct_answer_why: input.correct_answer_why ?? null,
      mole_argument_1: input.mole_argument_1 ?? null,
      mole_argument_2: input.mole_argument_2 ?? null,
      mole_argument_3: input.mole_argument_3 ?? null,
    })
    .eq('id', id)
    .eq('created_by', hostId)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('Topic not found or you do not own it')
  return data
}

export async function deleteTopic(id: string, hostId: string): Promise<void> {
  const supabase = createBrowserClient()

  const { error, count } = await supabase
    .from('mole_topics')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('created_by', hostId)

  if (error) throw error
  if (count === 0) throw new Error('Topic not found or you do not own it')
}

function validateTopicInput(input: MoleTopicInput): void {
  const missing: string[] = []
  if (!input.title?.trim()) missing.push('title')
  if (!input.blurb?.trim()) missing.push('blurb')
  if (!input.option_a?.trim()) missing.push('option_a')
  if (!input.option_b?.trim()) missing.push('option_b')
  if (!input.correct_choice || !['a', 'b'].includes(input.correct_choice)) {
    missing.push('correct_choice')
  }
  if (missing.length > 0) {
    throw new Error(`Missing or invalid required fields: ${missing.join(', ')}`)
  }
}

// ── Room Config ───────────────────────────────────────────────────────

export async function getRoomConfig(
  roomId: string,
  client?: SupabaseClient,
): Promise<MoleRoomConfig | null> {
  const supabase = getClient(client)

  const { data, error } = await supabase
    .from('mole_room_config')
    .select()
    .eq('room_id', roomId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function saveRoomConfig(
  roomId: string,
  input: MoleRoomConfigInput,
): Promise<void> {
  // Validate counts
  if (input.mole_count < 1) {
    throw new Error('Mole count must be at least 1.')
  }
  if (input.canary_count < 0) {
    throw new Error('Canary count cannot be negative.')
  }
  if (input.total_rounds < 1) {
    throw new Error('Total rounds must be at least 1.')
  }
  if (input.discuss_timer_seconds < 1) {
    throw new Error('Discuss timer must be at least 1 second.')
  }
  if (input.vote_timer_seconds < 1) {
    throw new Error('Vote timer must be at least 1 second.')
  }

  const supabase = createBrowserClient()

  const { error } = await supabase.from('mole_room_config').upsert(
    {
      room_id: roomId,
      mode: input.mode,
      mole_count: input.mole_count,
      canary_count: input.canary_count,
      discuss_timer_seconds: input.discuss_timer_seconds,
      vote_timer_seconds: input.vote_timer_seconds,
      total_rounds: input.total_rounds,
      selected_topic_ids: input.selected_topic_ids ?? [],
    },
    { onConflict: 'room_id' },
  )

  if (error) throw error
}

// ── Round Flow ──────────────────────────────────────────────────────────

export async function startGame(
  roomId: string,
  hostId: string,
  client?: SupabaseClient,
) {
  const supabase = getClient(client)

  // 1. Fetch room config
  const config = await getRoomConfig(roomId, supabase)
  if (!config) throw new Error('Game config not found for this room.')

  // 2. Fetch room to get host + game_type + code
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('host_id, game_type, code')
    .eq('id', roomId)
    .single()

  if (roomError || !room) throw new Error('Room not found.')
  if (room.host_id !== hostId) throw new Error('Only the host can start the game.')

  // 3. Count joined players (exclude host)
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id')
    .eq('room_id', roomId)
    .neq('is_host', true)

  if (playersError) throw playersError
  const playerCount = (players?.length ?? 0)

  // 4. ── Server-side validation (mirrors client-side checks) ────────
  if (config.mole_count < 1) {
    throw new Error('Must have at least 1 Mole.')
  }
  if (config.total_rounds < 1) {
    throw new Error('Must have at least 1 round.')
  }
  if (!config.selected_topic_ids || config.selected_topic_ids.length === 0) {
    throw new Error('Select at least one topic before starting.')
  }
  if (config.selected_topic_ids.length !== config.total_rounds) {
    throw new Error(
      `Select exactly ${config.total_rounds} topics to match your round count (selected ${config.selected_topic_ids.length}).`,
    )
  }
  const totalRoles = config.mole_count + config.canary_count
  if (totalRoles >= playerCount) {
    throw new Error(
      `Not enough players. Need at least ${totalRoles + 1} players to assign ${config.mole_count} Mole(s) + ${config.canary_count} Canar${config.canary_count !== 1 ? 'ies' : 'y'}, but only ${playerCount} have joined.`,
    )
  }

  // 5. Fetch the selected topics in the host's chosen order
  const allTopics = await getTopicBank(hostId, supabase)
  const topicMap = new Map(allTopics.map((t) => [t.id, t]))
  const selectedTopics = config.selected_topic_ids
    .map((id) => topicMap.get(id))
    .filter(Boolean) as MoleTopic[]

  if (selectedTopics.length !== config.total_rounds) {
    throw new Error(
      `Some selected topics no longer exist. Please re-select topics.`,
    )
  }

  // 6. Assign roles for round 1
  const playerIds = (players ?? []).map((p) => p.id)
  const { moles, canaries } = assignRoles(
    playerIds,
    config.mole_count,
    config.canary_count,
    [], // no previous moles
    [], // no previous canaries
  )

  // 7. First topic is the first in the selected order
  const firstTopic = selectedTopics[0]

  // 8. Insert first mole_round (phase: 'discuss' — skip 'assigning')
  const { data: round, error: roundError } = await supabase
    .from('mole_rounds')
    .insert({
      room_id: roomId,
      round_number: 1,
      topic_id: firstTopic.id,
      mole_player_ids: moles,
      canary_player_ids: canaries,
      phase: 'discuss',
      correct_choice: firstTopic.correct_choice,
      discuss_timer_seconds: config.discuss_timer_seconds,
      vote_timer_seconds: config.vote_timer_seconds,
      canary_flagged_ids: [],
    })
    .select()
    .single()

  if (roundError) throw roundError

  // 9. Initialize mole_scores for all players (0 points)
  const scoreRows = (players ?? []).map((p) => ({
    room_id: roomId,
    player_id: p.id,
    total_points: 0,
    times_mole: moles.includes(p.id) ? 1 : 0,
    times_canary: canaries.includes(p.id) ? 1 : 0,
    crew_deceived: 0,
  }))

  const { error: scoreError } = await supabase
    .from('mole_scores')
    .upsert(scoreRows, { onConflict: 'room_id,player_id' })

  if (scoreError) throw scoreError

  return {
    round,
    roomCode: room.code,
    moleCount: config.mole_count,
    canaryCount: config.canary_count,
    totalRounds: config.total_rounds,
  }
}

export async function advancePhase(roundId: string, hostId: string) {
  const supabase = createBrowserClient()

  // 1. Fetch current round + room
  const { data: round, error: roundError } = await supabase
    .from('mole_rounds')
    .select('*, rooms!inner(host_id, code, game_type)')
    .eq('id', roundId)
    .single()

  if (roundError || !round) throw new Error('Round not found.')

  const room = (round as any).rooms
  if (!room || room.host_id !== hostId) {
    throw new Error('Only the host can advance the phase.')
  }

  // 2. Determine next phase
  const phaseOrder: MolePhase[] = ['assigning', 'discuss', 'vote', 'reveal']
  const currentIndex = phaseOrder.indexOf(round.phase as MolePhase)
  if (currentIndex === -1) throw new Error(`Unknown phase: ${round.phase}`)

  let nextPhase: MolePhase
  if (currentIndex < phaseOrder.length - 1) {
    nextPhase = phaseOrder[currentIndex + 1]
  } else {
    throw new Error('Already at final phase (reveal). Use Next Round or End Game.')
  }

  // 3. Update the round phase
  const { error: updateError } = await supabase
    .from('mole_rounds')
    .update({ phase: nextPhase })
    .eq('id', roundId)

  if (updateError) throw updateError

  return {
    roundId,
    phase: nextPhase,
    roundNumber: round.round_number,
    roomCode: room.code,
    roomId: round.room_id,
  }
}

export async function nextRound(roomId: string, hostId: string) {
  const supabase = createBrowserClient()

  // 1. Fetch the current (latest) round to get previous moles/canaries
  const { data: currentRound, error: roundError } = await supabase
    .from('mole_rounds')
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

  // 2. Check we're in reveal phase
  if (currentRound.phase !== 'reveal') {
    throw new Error('Can only advance to next round from the reveal phase.')
  }

  // 3. Fetch config to check total_rounds
  const config = await getRoomConfig(roomId)
  if (!config) throw new Error('Game config not found.')

  if (currentRound.round_number >= config.total_rounds) {
    throw new Error('This was the final round. End the game instead.')
  }

  // 4. Create the next round
  const round = await createNextRound(
    roomId,
    currentRound.round_number + 1,
    hostId,
    currentRound.mole_player_ids,
    currentRound.canary_player_ids,
  )

  return {
    round,
    roomCode: room.code,
  }
}

export async function submitVote(
  roundId: string,
  playerId: string,
  choice: 'a' | 'b',
) {
  const supabase = createBrowserClient()

  // Check for existing vote
  const { data: existing, error: existingError } = await supabase
    .from('mole_votes')
    .select('id')
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) {
    const err = new Error('Already voted this round.')
    ;(err as any).status = 409
    throw err
  }

  const { data, error } = await supabase
    .from('mole_votes')
    .insert({
      round_id: roundId,
      player_id: playerId,
      choice,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMyRole(roundId: string, playerId: string) {
  const supabase = createBrowserClient()

  // Fetch the round to get role arrays + topic
  const { data: round, error: roundError } = await supabase
    .from('mole_rounds')
    .select(
      `
      mole_player_ids,
      canary_player_ids,
      correct_choice,
      topic_id,
      mole_topics!inner(
        id,
        created_by,
        title,
        blurb,
        image_url,
        option_a,
        option_b,
        correct_choice,
        correct_answer_why,
        mole_argument_1,
        mole_argument_2,
        mole_argument_3,
        created_at
      )
    `,
    )
    .eq('id', roundId)
    .single()

  if (roundError || !round) throw new Error('Round not found.')

  const moleIds: string[] = round.mole_player_ids ?? []
  const canaryIds: string[] = round.canary_player_ids ?? []

  let role: MoleRole = 'crew'
  if (moleIds.includes(playerId)) role = 'mole'
  else if (canaryIds.includes(playerId)) role = 'canary'

  const topic = (round as any).mole_topics as MoleTopic

  const response: MyRoleResponse = { role, topic }

  // Only expose correct_choice + mole_argument to the mole
  if (role === 'mole') {
    response.correct_choice = round.correct_choice as 'a' | 'b'
    // Assign the single persuasion argument for this mole by index in mole_player_ids
    const moleIndex = (round.mole_player_ids as string[]).indexOf(playerId)
    const argumentKey =
      `mole_argument_${moleIndex + 1}` as keyof MoleTopic
    const topicData = (round as any).mole_topics as MoleTopic
    response.mole_argument = topicData?.[argumentKey] ?? undefined
  }

  return response
}

export async function calculateAndSaveScores(roundId: string) {
  const supabase = createBrowserClient()

  // 1. Fetch the round — only mole_rounds columns, no join
  // (avoid column-name collision: both mole_rounds and mole_topics have correct_choice)
  const { data: round, error: roundError } = await supabase
    .from('mole_rounds')
    .select('id, room_id, round_number, phase, correct_choice, mole_player_ids, canary_player_ids')
    .eq('id', roundId)
    .single()

  if (roundError || !round) throw new Error('Round not found.')

  const correctChoice = round.correct_choice as 'a' | 'b'
  const moleIds: string[] = round.mole_player_ids ?? []
  const canaryIds: string[] = round.canary_player_ids ?? []

  // 2. Fetch all players in the room (exclude host)
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, nickname')
    .eq('room_id', round.room_id)
    .neq('is_host', true)

  if (playersError) throw playersError

  // 3. Fetch all votes for this round
  const { data: votes, error: votesError } = await supabase
    .from('mole_votes')
    .select('player_id, choice')
    .eq('round_id', roundId)

  if (votesError) throw votesError

  const voteMap = new Map<string, 'a' | 'b'>()
  for (const v of votes ?? []) {
    voteMap.set(v.player_id, v.choice as 'a' | 'b')
  }

  // 4. Determine majority (wrong) vote
  let aCount = 0
  let bCount = 0
  for (const v of votes ?? []) {
    if (v.choice === 'a') aCount++
    else bCount++
  }
  const majorityWrong = aCount > bCount ? 'a' : 'b'
  const isMajorityWrong = majorityWrong !== correctChoice

  // 5. Calculate per-player points
  const summaries: RoundScoreSummary[] = []

  for (const player of players ?? []) {
    const pid = player.id
    const playerVote = voteMap.get(pid)
    const votedCorrectly = playerVote === correctChoice

    let role: MoleRole = 'crew'
    if (moleIds.includes(pid)) role = 'mole'
    else if (canaryIds.includes(pid)) role = 'canary'

    let points = 0

    if (role === 'crew' && votedCorrectly) {
      points += 100
    }

    if (role === 'mole') {
      // If mole voted correctly, they broke character → deduction
      // Deduction and deception bonus are mutually exclusive per round
      if (votedCorrectly) {
        points -= 100
      } else {
        // +150 per deceived player (crew/canary who voted wrong)
        let deceivedCount = 0
        for (const p of players ?? []) {
          if (p.id === pid) continue
          const v = voteMap.get(p.id)
          if (v && v !== correctChoice && !moleIds.includes(p.id)) {
            deceivedCount++
          }
        }
        points += deceivedCount * 150

        // +50 if majority was wrong
        if (isMajorityWrong) {
          points += 50
        }
      }
    }

    if (role === 'canary') {
      points += 20 // blind bonus
    }

    // 6. Upsert cumulative scores
    const { data: existingScore, error: scoreFetchError } = await supabase
      .from('mole_scores')
      .select('total_points, times_mole, times_canary, crew_deceived')
      .eq('room_id', round.room_id)
      .eq('player_id', pid)
      .maybeSingle()

    if (scoreFetchError) throw scoreFetchError

    const newTotal = (existingScore?.total_points ?? 0) + points
    const newTimesMole = (existingScore?.times_mole ?? 0) + (role === 'mole' ? 1 : 0)
    const newTimesCanary =
      (existingScore?.times_canary ?? 0) + (role === 'canary' ? 1 : 0)
    const newCrewDeceived =
      (existingScore?.crew_deceived ?? 0) +
      (role === 'mole'
        ? (players ?? []).filter(
            (p) =>
              p.id !== pid &&
              !moleIds.includes(p.id) &&
              voteMap.get(p.id) &&
              voteMap.get(p.id) !== correctChoice,
          ).length
        : 0)

    await supabase.from('mole_scores').upsert(
      {
        room_id: round.room_id,
        player_id: pid,
        total_points: newTotal,
        times_mole: newTimesMole,
        times_canary: newTimesCanary,
        crew_deceived: newCrewDeceived,
      },
      { onConflict: 'room_id,player_id' },
    )

    summaries.push({
      player_id: pid,
      nickname: player.nickname,
      role,
      voted_correctly: votedCorrectly,
      points_this_round: points,
    })
  }

  return summaries
}

export async function deductCanaryPoints(roomId: string, playerId: string) {
  const supabase = createBrowserClient()

  const { data: score, error: fetchError } = await supabase
    .from('mole_scores')
    .select('total_points')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!score) throw new Error('Score record not found for this player.')

  const newTotal = Math.max(0, (score.total_points ?? 0) - 50)

  const { error: updateError } = await supabase
    .from('mole_scores')
    .update({ total_points: newTotal })
    .eq('room_id', roomId)
    .eq('player_id', playerId)

  if (updateError) throw updateError

  return { player_id: playerId, total_points: newTotal }
}

export async function getCurrentRound(roomId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('mole_rounds')
    .select()
    .eq('room_id', roomId)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

// ── Role Assignment Helpers ─────────────────────────────────────────────

function assignRoles(
  playerIds: string[],
  moleCount: number,
  canaryCount: number,
  previousMoleIds: string[],
  previousCanaryIds: string[],
) {
  const available = [...playerIds]

  // Pick moles, avoiding previous moles if possible
  const moles = pickWithAvoidance(available, moleCount, previousMoleIds)
  // Remove moles from available for canary selection
  for (const m of moles) {
    const idx = available.indexOf(m)
    if (idx !== -1) available.splice(idx, 1)
  }

  // Pick canaries, avoiding previous canaries
  const canaries = pickWithAvoidance(available, canaryCount, previousCanaryIds)
  for (const c of canaries) {
    const idx = available.indexOf(c)
    if (idx !== -1) available.splice(idx, 1)
  }

  const crew = [...available]

  return { moles, canaries, crew }
}

function pickWithAvoidance(
  pool: string[],
  count: number,
  avoid: string[],
): string[] {
  // Prefer players not in the avoid list
  const preferred = pool.filter((id) => !avoid.includes(id))
  const fallback = pool.filter((id) => avoid.includes(id))

  const shuffled = [...shuffle(preferred), ...shuffle(fallback)]
  const picked = shuffled.slice(0, Math.min(count, shuffled.length))

  if (picked.length < count) {
    console.warn(
      `pickWithAvoidance: pool exhausted. Requested ${count}, got ${picked.length}. Pool size: ${pool.length}, avoid: ${avoid.length}.`,
    )
  }

  return picked
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function createNextRound(
  roomId: string,
  roundNumber: number,
  hostId: string,
  previousMoleIds: string[],
  previousCanaryIds: string[],
) {
  const supabase = createBrowserClient()

  // Fetch players (exclude host)
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id')
    .eq('room_id', roomId)
    .neq('is_host', true)

  if (playersError) throw playersError
  const playerIds = players?.map((p) => p.id) ?? []

  // Fetch config
  const config = await getRoomConfig(roomId)
  if (!config) throw new Error('Game config not found.')

  // Assign roles with avoidance
  const { moles, canaries } = assignRoles(
    playerIds,
    config.mole_count,
    config.canary_count,
    previousMoleIds,
    previousCanaryIds,
  )

  // Use selected topics from config, in order
  const topicIndex = roundNumber - 1
  const selectedIds = config.selected_topic_ids ?? []

  if (topicIndex >= selectedIds.length) {
    throw new Error('Not enough selected topics for this round.')
  }

  const nextTopicId = selectedIds[topicIndex]
  const allTopics = await getTopicBank(hostId)
  const nextTopic = allTopics.find((t) => t.id === nextTopicId)

  if (!nextTopic) {
    throw new Error(
      `Selected topic no longer exists. Please re-select topics.`,
    )
  }

  // Update mole_scores times_mole/times_canary for newly assigned players
  for (const mid of moles) {
    await supabase.from('mole_scores').upsert(
      {
        room_id: roomId,
        player_id: mid,
        total_points: 0,
        times_mole: 1,
        times_canary: 0,
        crew_deceived: 0,
      },
      { onConflict: 'room_id,player_id' },
    )
  }
  for (const cid of canaries) {
    await supabase.from('mole_scores').upsert(
      {
        room_id: roomId,
        player_id: cid,
        total_points: 0,
        times_mole: 0,
        times_canary: 1,
        crew_deceived: 0,
      },
      { onConflict: 'room_id,player_id' },
    )
  }

  // Insert round in 'discuss' phase
  const { data: round, error: roundError } = await supabase
    .from('mole_rounds')
    .insert({
      room_id: roomId,
      round_number: roundNumber,
      topic_id: nextTopic.id,
      mole_player_ids: moles,
      canary_player_ids: canaries,
      phase: 'discuss',
      correct_choice: nextTopic.correct_choice,
      discuss_timer_seconds: config.discuss_timer_seconds,
      vote_timer_seconds: config.vote_timer_seconds,
      canary_flagged_ids: [],
    })
    .select()
    .single()

  if (roundError) throw roundError

  return round
}
