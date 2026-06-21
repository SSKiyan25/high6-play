// Server-side only — use this in API routes to trigger Pusher events
import { pusherServer } from './server'

/**
 * Trigger an event on the global room channel (room-{code}).
 * Use for global events: player-joined, room-closed, game-started.
 */
export async function triggerRoomEvent(
  code: string,
  event: string,
  data: object,
) {
  await pusherServer.trigger(`room-${code}`, event, data)
}

/**
 * Trigger an event on the game channel (room-{code}-game).
 * Use for live game state events: vote-submitted, question-advanced, game-ended.
 */
export async function triggerGameEvent(
  code: string,
  event: string,
  data: object,
) {
  await pusherServer.trigger(`room-${code}-game`, event, data)
}
