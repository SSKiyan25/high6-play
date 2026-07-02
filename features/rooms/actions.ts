import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { TotQuestionInput } from '@/features/this-or-that/types'
import type { MoleRoomConfigInput } from '@/features/mole-hunt/types'
import type { WordChainRoomConfigInput } from '@/features/word-chain/types'
import { saveToQuestionBank, seedRoomQuestions } from '@/features/this-or-that/actions'
import { saveRoomConfig } from '@/features/mole-hunt/actions'
import { saveRoomConfig as saveWordChainRoomConfig } from '@/features/word-chain/actions'
import type { GameType, Player, Room, RoomWithPlayers } from './types'

async function generateRoomCode(supabase: SupabaseClient): Promise<string> {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  while (true) {
    let code = ''
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }

    const { data } = await supabase
      .from('rooms')
      .select('code')
      .eq('code', code)
      .maybeSingle()

    if (!data) return code
  }
}

export async function createRoom(
  gameType: GameType,
  client?: SupabaseClient,
  questions?: TotQuestionInput[],
  config?: MoleRoomConfigInput | WordChainRoomConfigInput,
): Promise<Room> {
  const supabase = client ?? createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const code = await generateRoomCode(supabase)

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      code,
      game_type: gameType,
      status: 'waiting',
      host_id: user.id,
    })
    .select()
    .single()

  if (error) throw error

  await supabase.from('players').insert({
    room_id: room.id,
    nickname: 'Host',
    is_host: true,
    score: 0,
  })

  // Seed questions for This or That rooms (legacy binary-vote — hidden from UI)
  if (gameType === 'this-or-that' && questions && questions.length > 0) {
    await seedRoomQuestions(room.id, questions)
    await saveToQuestionBank(questions)
  }

  // Save room config for Word Chain rooms (category-based elimination)
  if (gameType === 'word-chain' && config) {
    await saveWordChainRoomConfig(room.id, config as WordChainRoomConfigInput, supabase)
  }

  // Save room config for Mole Hunt rooms
  if (gameType === 'mole-hunt' && config) {
    await saveRoomConfig(room.id, config as MoleRoomConfigInput)
  }

  return room
}

export async function joinRoom(
  code: string,
  nickname: string,
): Promise<{ room: Room; player: Player }> {
  const supabase = createBrowserClient()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select()
    .eq('code', code)
    .single()

  if (roomError || !room) throw new Error('Room not found')
  if (room.status !== 'waiting') throw new Error('Room is not accepting players')

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      nickname,
      is_host: false,
      score: 0,
    })
    .select()
    .single()

  if (playerError) throw playerError

  return { room, player }
}

export async function getRoom(code: string): Promise<RoomWithPlayers> {
  const supabase = createBrowserClient()

  const { data: room, error } = await supabase
    .from('rooms')
    .select()
    .eq('code', code)
    .single()

  if (error || !room) throw new Error('Room not found')

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('room_id', room.id)

  return { ...room, players: players || [] }
}

export async function closeRoom(code: string): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase
    .from('rooms')
    .update({ status: 'ended' })
    .eq('code', code)

  if (error) throw error
}
