# PLAN: This or That Rebuild (Turn-Based Elimination)

> Created: 2026-07-02
> Status: **IMPLEMENTED** — 2026-07-02. See Report Summary at bottom.

---

## Overview

Rebuild "This or That" from a binary simultaneous-vote game into a category-based, turn-based elimination game (mechanically closer to Mole Hunt's round/phase structure than the old ToT).

Old ToT (`tot_question_bank`, `tot_questions`, `tot_votes`) is being replaced — do not extend it, do not delete it yet.

**Architecture model:** Mirror Mole Hunt patterns (types → actions → API routes → hooks → components → Pusher events).

**Game type value:** Remains `'this-or-that'` in the `rooms` table. Only the implementation changes.

---

## Database Tables (already created, no RLS)

| Table | Purpose |
|---|---|
| `tot_room_config` | `id, room_id, time_per_player_seconds, survivors_to_win, difficulty, total_rounds, created_at` |
| `tot_categories` | `id, name, difficulty, points (1\|2\|3), created_at` |
| `tot_rounds` | `id, room_id, round_number, category_id, status, turn_order (jsonb), current_turn_player_id, created_at` |
| `tot_round_players` | `id, round_id, player_id, status (active\|skipped_this_cycle\|eliminated\|survivor), skip_used, turn_index, created_at` |
| `tot_scores` | `id, round_id, player_id, points, created_at` |

---

## Game Mechanic (for reference while planning)

1. Host sets: time per player, survivors_to_win threshold, difficulty, and round count — round count == number of categories selected
2. Turn order randomized fresh at start of each round
3. Players take turns in order; must respond within time limit or eliminated
4. One skip per player per round — skip pushes to end of turn cycle; cannot be used twice
5. Round ends when active players remaining == survivors_to_win; survivors get points = category difficulty (1/2/3)
6. Next round: new category, turn order re-randomized, all players active again
7. After final round, game ends → results/leaderboard

---

## File Structure

### Types — `features/tot/types.ts`

| Type | Purpose |
|---|---|
| `TotDifficulty` | `'easy' \| 'moderate' \| 'difficult'` |
| `TotCategory` | DB row from `tot_categories` |
| `TotCategoryInput` | `{ name, difficulty }` |
| `TotRoomConfig` | DB row from `tot_room_config` |
| `TotRoomConfigInput` | `{ time_per_player_seconds, survivors_to_win, difficulty, total_rounds, selected_category_ids }` |
| `TotRoundStatus` | `'active' \| 'ended'` |
| `TotRoundPlayerStatus` | `'active' \| 'skipped_this_cycle' \| 'eliminated' \| 'survivor'` |
| `TotRound` | DB row from `tot_rounds` (turn_order: string[], current_turn_player_id) |
| `TotRoundPlayer` | DB row from `tot_round_players` |
| `TotScore` | DB row from `tot_scores` |
| `TotGameState` | Composite: current round + round_players + category info + active/survivor counts |
| `TotTurnResult` | `{ nextPlayerId, nextPlayerNickname, eliminatedPlayerId?, roundEnded?, survivors?, pointsAwarded? }` |
| `TotFullResults` | `{ leaderboard: TotLeaderboardRow[], roundBreakdowns: TotRoundBreakdown[] }` |
| `TotLeaderboardRow` | `{ player_id, nickname, total_points, rounds_survived }` |
| `TotRoundBreakdown` | `{ round_number, category_name, difficulty, points, survivors, eliminated }` |

### Actions — `features/tot/actions.ts`

Follows `getClient(client?)` pattern from Mole Hunt.

| Function | Description |
|---|---|
| `getCategories(hostId, client?)` | Fetch all categories |
| `createCategory(hostId, input)` | Create a category |
| `updateCategory(id, hostId, input)` | Update a category |
| `deleteCategory(id, hostId)` | Delete a category |
| `getRoomConfig(roomId, client?)` | Fetch room config |
| `saveRoomConfig(roomId, input)` | Upsert room config |
| `startGame(roomId, hostId, client?)` | Validate, create round 1, randomize order, insert round_players. Returns `{ round, roomCode, totalRounds }` |
| `submitResponse(roundId, playerId, responseText)` | Validate it's player's turn, mark responded, advance turn |
| `skipTurn(roundId, playerId)` | Validate skip not used, reorder turn_order, mark skip_used, advance |
| `advanceTurn(roundId, hostId, action)` | `'timeout'` — eliminate current player, check round end, advance. Returns `TotTurnResult` |
| `endRound(roundId, hostId)` | Award points to survivors, mark round ended |
| `startNextRound(roomId, hostId)` | Create new round, re-randomize order, all players active again |
| `endGame(roomId, hostId)` | Mark room ended, return final results |
| `getResults(roomId)` | Aggregate leaderboard + per-round breakdown |
| `getCurrentRound(roomId)` | Fetch latest round for this room |
| `getRoundState(roundId)` | Fetch full round + round_players + category |

### API Routes — `app/api/games/this-or-that/`

All server Supabase client, error handling, Pusher trigger after DB write.

| Route | Method | Auth | Body | Pusher Events |
|---|---|---|---|---|
| `start/` | POST | Host | `{ room_code }` | `game-started` (room-{code}), `round-started` (room-{code}-game) |
| `respond/` | POST | None | `{ round_id, player_id, room_code, response_text }` | `turn-advanced` |
| `skip/` | POST | None | `{ round_id, player_id, room_code }` | `player-skipped` + `turn-advanced` |
| `advance-turn/` | POST | Host | `{ round_id, room_code, action: 'timeout' }` | `player-eliminated` + (`turn-advanced` \| `round-ended`) |
| `next-round/` | POST | Host | `{ room_code }` | `round-started` |
| `end-game/` | POST | Host | `{ room_code }` | `game-ended` |
| `categories/` | GET | Host | — | — |
| `categories/` | POST | Host | `{ name, difficulty }` | — |
| `categories/[id]/` | PUT | Host | `{ name, difficulty }` | — |
| `categories/[id]/` | DELETE | Host | — | — |

### Hooks — `features/tot/hooks/`

| Hook | Purpose |
|---|---|
| `useThisOrThat(roomCode, playerId)` | Shared real-time hook. Subscribes to `room-{code}-game`. State: currentRound, roundPlayers, category, isMyTurn, myStatus, timeLeft, scores, isGameOver. Initial state from Supabase (page reload resilience), then Pusher updates. |
| `useTurnTimer({ isActive, duration, onTimeout })` | **Reuse** Word Chain's existing hook at `features/word-chain/hooks/useTurnTimer.ts`. API-compatible as-is. |

### Components — `features/tot/components/`

| Component | Purpose |
|---|---|
| `TotSetup.tsx` | Multi-step host setup: (1) difficulty + time + survivors, (2) category selection (round count auto-locks), (3) category bank. Mirrors `MoleHuntSetup`. |
| `TotCategoryManager.tsx` | CRUD for categories. Mirrors `TopicBankManager`. |
| `TotPresentation.tsx` | **Host presenter** (Zoom sharing). Category name + badge, full turn order with live status (color-coded), current player highlight + timer, standings panel, round progress bar. Mirrors `MoleHuntPresentation`. |
| `TotPlayerView.tsx` | **Player screen**. States: waiting, your-turn (input + timer + skip), eliminated, survivor-waiting. Shows category, own score, round number. |
| `TotResultsView.tsx` | **Results page**. Leaderboard with medals, per-round collapsible breakdown (mirrors `MoleHuntResultsView`). |

### Pages — `app/`

| Page | Purpose |
|---|---|
| `app/host/[code]/tot-game/page.tsx` | Server component: auth check → fetch room + config + round + players + category → render `TotPresentation` |
| `app/host/[code]/tot-results/page.tsx` | Server component: auth check → fetch leaderboard + breakdowns → render `TotResultsView` |
| `app/play/[code]/tot-game/page.tsx` | Client component: reads `h6p_player` from localStorage → renders `TotPlayerView` |

### Modified Files

| File | Change |
|---|---|
| `features/rooms/components/HostLobby.tsx` | Route `'this-or-that'` → `'tot-game'`; use `/api/games/this-or-that/start` |
| `features/rooms/components/CreateRoom.tsx` | Replace `QuestionSetup` with `TotSetup` for ToT; pass category config |

---

## Pusher Events

All fired from API routes only. Game events on `room-{code}-game` unless noted.

| Event | Channel | Payload | Fired By |
|---|---|---|---|
| `game-started` | `room-{code}` | `{ game_type: 'this-or-that' }` | `start/` |
| `round-started` | `room-{code}-game` | `{ roundNumber, roundId, categoryId, categoryName, difficulty, points, turnOrder, currentPlayerId, timePerPlayerSeconds }` | `start/`, `next-round/` |
| `turn-advanced` | `room-{code}-game` | `{ roundId, previousPlayerId, currentPlayerId, currentPlayerNickname, activePlayerCount }` | `respond/`, `skip/`, `advance-turn/` |
| `player-skipped` | `room-{code}-game` | `{ roundId, playerId, playerNickname, newTurnOrder }` | `skip/` |
| `player-eliminated` | `room-{code}-game` | `{ roundId, playerId, playerNickname, reason, activePlayerCount, survivorsToWin }` | `advance-turn/` |
| `round-ended` | `room-{code}-game` | `{ roundId, roundNumber, survivorIds, survivorNicknames, pointsAwarded, scoreSummary }` | `advance-turn/` (auto when threshold reached) |
| `game-ended` | `room-{code}-game` | `{ winnerIds? }` | `end-game/` |

---

## Turn State Machine

```
                    ┌─────────────────────────┐
                    │   Round Starts           │
                    │   All players active     │
                    │   Order randomized       │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   Player N's Turn        │◄──────────────────────┐
                    │   Timer starts           │                       │
                    └───────────┬─────────────┘                       │
                                │                                      │
              ┌─────────────────┼──────────────────┐                  │
              ▼                 ▼                   ▼                  │
    ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐         │
    │ RESPOND     │   │ SKIP         │   │ TIMEOUT          │         │
    │ (player)    │   │ (player)     │   │ (host auto)      │         │
    └──────┬──────┘   └──────┬───────┘   └────────┬─────────┘         │
           │                 │                     │                   │
           ▼                 ▼                     ▼                   │
    ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐         │
    │ Stay active │   │ Skip used=1  │   │ ELIMINATED       │         │
    │ Advance to  │   │ Push to end  │   │ for this round   │         │
    │ next player │   │ of order     │   │                  │         │
    └──────┬──────┘   └──────┬───────┘   └────────┬─────────┘         │
           │                 │                     │                   │
           └─────────────────┼─────────────────────┘                   │
                             │                                         │
                             ▼                                         │
                    ┌─────────────────────────┐                        │
                    │ Check: active players    │                        │
                    │ == survivors_to_win?     │                        │
                    └───────────┬─────────────┘                        │
                                │                                      │
                  ┌─────────────┴─────────────┐                        │
                  │ No                        │ Yes                    │
                  ▼                           ▼                        │
          ┌──────────────┐          ┌──────────────────┐              │
          │ Next active   │          │ ROUND ENDED      │              │
          │ player's turn │          │ Award points to  │              │
          │ (loop back)   │          │ survivors        │              │
          └──────────────┘          └────────┬─────────┘              │
                                             │                        │
                                   ┌─────────┴─────────┐              │
                                   │ Last round?       │              │
                                   ├───────────────────┤              │
                                   │ No → Next Round   │              │
                                   │ Yes → GAME ENDED  │              │
                                   └───────────────────┘              │
```

---

## Scoring Flow

1. Each category has `points`: easy=1, moderate=2, difficult=3
2. Round ends when active players == survivors_to_win
3. Every surviving player receives `points` equal to category's difficulty value
4. Scores stored in `tot_scores` with `(round_id, player_id, points)`
5. Final leaderboard = SUM(points) across all rounds, grouped by player_id
6. Per-round breakdown: category name, difficulty, point value, survivors list, eliminated with reasons

---

## HostLobby Routing Change

In `features/rooms/components/HostLobby.tsx`, the game path ternary changes from:

```ts
const gamePath =
  room.game_type === 'word-chain' ? 'wc-game'
  : room.game_type === 'mole-hunt' ? 'mh-game'
  : 'game'
```

To:

```ts
const gamePath =
  room.game_type === 'word-chain' ? 'wc-game'
  : room.game_type === 'mole-hunt' ? 'mh-game'
  : 'tot-game'
```

And the start URL for `'this-or-that'` changes from `/api/rooms/start` to `/api/games/this-or-that/start`.

---

## Implementation Order

1. **Types** — Define all TypeScript types
2. **Actions** — Game lifecycle + category CRUD + config
3. **API Routes** — 6 game routes + 4 category CRUD routes
4. **Hooks** — `useThisOrThat` shared hook
5. **Setup Components** — `TotSetup` + `TotCategoryManager`
6. **HostLobby + CreateRoom** — Wire up routing and setup flow
7. **Host Presentation** — `TotPresentation` (mirrors MoleHuntPresentation)
8. **Player View** — `TotPlayerView`
9. **Results** — `TotResultsView` + results page
10. **Integration test** — End-to-end flow validation
11. **`graphify update .`** — Keep knowledge graph current

---

## Assumptions & Design Decisions

1. **Response format**: Players type a short text response (word/phrase) related to the category. No server-side correctness validation — only timeout-based elimination. Response stored for display. *If responses should be tap-to-confirm only, `response_text` can be made optional or dropped.*

2. **Timer authority**: Host client runs the timer. On expiry, host calls `advance-turn` with `action: 'timeout'`. Mirrors Mole Hunt's host-controlled phase transitions.

3. **Skip mechanics**: Player's `skip_used` set to `true`, pushed to end of `turn_order`. When turn cycles back, skip button is disabled. Second skip attempt returns 409.

4. **Round auto-ending**: When `advanceTurn` detects `activePlayers <= survivors_to_win`, it auto-transitions to round-ended (awarding points). Host does NOT manually end rounds.

5. **Between rounds**: Host manually triggers "Next Round" via `next-round/` API. Mirrors Mole Hunt. New round re-randomizes all players (everyone active again).

6. **Timer hook reuse**: Word Chain's `useTurnTimer` at `features/word-chain/hooks/useTurnTimer.ts` has the exact API needed (`isActive`, `duration`, `onTimeout`). Import directly, no duplication.

7. **Feature folder naming**: `features/tot/` — consistent with DB table prefix and existing convention.

8. **No `my-role` endpoint**: Unlike Mole Hunt, this game has no hidden information. All state is public in Pusher payloads + Supabase.

---

## Open Questions (for review)

- **Response format**: Text response or tap-to-confirm?
- **Round transitions**: Host manually clicks "Next Round" (like Mole Hunt) or auto-advance after a delay?
- **File naming**: `tot-game`, `tot-results`, `features/tot/` — any concerns?
- **Category creation**: Who can create categories? Host-only (like Mole Hunt topics) or pre-seeded global bank?

---

# Report Summary (2026-07-02)

## Files Created (20)

### Types (1)
- `features/tot/types.ts` — TotDifficulty, TotCategory, TotRoomConfig, TotRound, TotRoundPlayer, TotScore, composite types, SEED_CATEGORIES, DIFFICULTY_POINTS/LABELS

### Actions (1)
- `features/tot/actions.ts` — getClient helper, category CRUD + seed, room config CRUD with validation, game lifecycle (startGame, confirmTurn, skipTurn, advanceTurn, endRound, startNextRound, endGame), getResults, getCurrentRound, getRoundState, shuffle, findNextActivePlayer

### API Routes (8)
- `app/api/games/this-or-that/start/route.ts` — POST, auth-gated, seeds categories if empty, creates round 1
- `app/api/games/this-or-that/confirm-turn/route.ts` — POST, no auth, player taps "I Answered"
- `app/api/games/this-or-that/skip/route.ts` — POST, no auth, once-per-round skip
- `app/api/games/this-or-that/advance-turn/route.ts` — POST, auth-gated, timeout elimination
- `app/api/games/this-or-that/next-round/route.ts` — POST, auth-gated, next round with re-randomized order
- `app/api/games/this-or-that/end-game/route.ts` — POST, auth-gated, marks room ended
- `app/api/games/this-or-that/categories/route.ts` — GET/POST, auth-gated, list + create
- `app/api/games/this-or-that/categories/[id]/route.ts` — PUT/DELETE, auth-gated

### Hooks (1)
- `features/tot/hooks/useThisOrThat.ts` — Shared real-time hook, subscribes to room-{code}-game, manages round/turn/score state, exposes confirmTurn + skipTurn actions

### Components (5)
- `features/tot/components/TotSetup.tsx` — Multi-step setup: difficulty select → config → category selection → create room
- `features/tot/components/TotCategoryManager.tsx` — Full CRUD UI for categories (create, edit, delete dialogs)
- `features/tot/components/TotPresentation.tsx` — Host presenter: turn order with live status, timer, auto-timeout, round-end state, game-over leaderboard
- `features/tot/components/TotPlayerView.tsx` — Player screen: waiting/your-turn/eliminated/survivor states, confirm + skip buttons, timer
- `features/tot/components/TotResultsView.tsx` — Leaderboard with medals, collapsible per-round breakdown

### Pages (4)
- `app/host/[code]/tot-game/page.tsx` — Host presentation (server component, fetches initial data)
- `app/host/[code]/tot-results/page.tsx` — Host results (server component, fetches leaderboard + breakdown)
- `app/play/[code]/tot-game/page.tsx` — Player game (client, reads h6p_player from localStorage)
- `app/play/[code]/tot-results/page.tsx` — Player results (client, fetches data from Supabase)

## Files Modified (2)
- `features/rooms/components/HostLobby.tsx` — Routes `'this-or-that'` → `'tot-game'`; uses `/api/games/this-or-that/start` with `{ room_code }` body
- `features/rooms/components/CreateRoom.tsx` — Replaces old `QuestionSetup` import/step with `TotSetup` + `TotCategoryManager`; passes `TotRoomConfigInput` to `createRoom`

## Pusher Events

| Event | Channel | Fired By |
|---|---|---|
| `game-started` | `room-{code}` | `start/` |
| `round-started` | `room-{code}-game` | `start/`, `next-round/` |
| `turn-advanced` | `room-{code}-game` | `confirm-turn/`, `skip/`, `advance-turn/` |
| `player-skipped` | `room-{code}-game` | `skip/` |
| `player-eliminated` | `room-{code}-game` | `advance-turn/` |
| `round-ended` | `room-{code}-game` | `advance-turn/` (auto when threshold reached) |
| `game-ended` | `room-{code}-game` | `end-game/` |

## Deviations from Approved Plan

1. **`respond/` → `confirm-turn/`**: Per user feedback, dropped `response_text` entirely. Player taps "I Answered" — no text stored, no validation beyond turn check.
2. **`survivors_to_win < playerCount` validation**: Added to both `saveRoomConfig` (skipped when 0 players) and `startGame` (hard rejection).
3. **Category seeding**: `seedCategoriesIfEmpty()` auto-populates 15 starter categories (5 per difficulty) on first game start or category fetch. Categories are global (any host can use/edit).
4. **Player results page**: Added `app/play/[code]/tot-results/` as client component (players have no auth), fetches results from Supabase directly.
5. **Timer hook**: Did NOT reuse Word Chain's `useTurnTimer` — the presentation screen needed a different timer pattern (host-triggered timeout API call), and the player view's timer is embedded in the hook/component directly.

## Assumptions Made

1. Response is tap-to-confirm — no text input. Player verbally responds over Zoom; the phone is the timer mechanism.
2. Timer runs client-side on the host presentation screen. On expiry, the host client calls `POST advance-turn`. If the host's connection is slow, there could be a slight delay between visual timer end and actual elimination.
3. Categories are global (not host-owned). Any authenticated host can create, edit, or delete any category. This matches the "starter bank" approach but means hosts share a category namespace.
4. Foreign key `tot_scores.round_id → tot_rounds.id` exists. If not, the `getResults` queries using round IDs will still work with the `in` filter pattern used.
5. `tot_rounds.turn_order` is a `jsonb` column storing `string[]` (player IDs). The `tot_room_config.selected_category_ids` is also `text[]`.

## Remaining TODOs / Gaps

- **End-to-end testing**: Full flow not tested — need to run app, create room, join as players, play through rounds.
- **`handleTimeout` in TotPresentation** has an eslint-disable comment for the `useEffect` dependency — the timer effect intentionally excludes `handleTimeout` from deps to avoid resetting the interval on every render.
- **`confirmTurn` in actions.ts** has unused variable warnings — `players` and `playersError` destructured but `players` unused. Cleanup needed.
- **Old ToT files** (`features/this-or-that/`, `app/host/[code]/game/`, `app/play/[code]/game/`, old API routes) are still in place but no longer used — can be removed in a cleanup pass.
- **`graphify update .`** has been run (881 nodes, 1769 edges, 47 communities).
