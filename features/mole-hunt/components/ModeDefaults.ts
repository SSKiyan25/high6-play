import type { MoleMode, MoleRoomConfigInput } from '../types'

export const MODE_DEFAULTS: Record<MoleMode, Omit<MoleRoomConfigInput, 'mode'>> = {
  easy: {
    mole_count: 2,
    canary_count: 1,
    discuss_timer_seconds: 60,
    vote_timer_seconds: 20,
    total_rounds: 5,
  },
  moderate: {
    mole_count: 3,
    canary_count: 2,
    discuss_timer_seconds: 45,
    vote_timer_seconds: 15,
    total_rounds: 7,
  },
  hard: {
    mole_count: 4,
    canary_count: 2,
    discuss_timer_seconds: 30,
    vote_timer_seconds: 15,
    total_rounds: 10,
  },
}

export const MODE_LABELS: Record<MoleMode, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
}
