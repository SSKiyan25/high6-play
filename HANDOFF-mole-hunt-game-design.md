# high6-play — Mole Hunt Handoff (Updated)
> Last updated: June 28, 2026
> Continue this in Claude.ai — paste this file at the start of the next session.
> **ALL PHASES COMPLETE + UX/Flow Fix + Bug Fix + UX Polish applied** — Mole Hunt is fully built. 5 UX/flow fixes + 4 bug fixes + UX polish + scoring fix applied (June 28).

---

## Latest sessions: UX Polish + Scoring Fix (June 28, 2026)

### UX Improvements (3 items):

#### 1 — Per-round leaderboard (Presentation + Player)
- Presentation fetches `mole_scores` on `scores-updated` during reveal, renders "Current Standings" panel
- PlayerView fetches the same leaderboard independently, shows compact ranked list with "(You)" marker
- Top 3 rows get medal highlights (gold/silver/bronze)

#### 2 — Player-facing timers
- Added `discussTimerSeconds` and `voteTimerSeconds` to `round-started` Pusher payload (in `start/route.ts` and `next-round/route.ts`)
- `useMoleHunt` hook: added `timeLeft`/`timerTotal` state + client-side countdown interval
- PlayerView shows countdown pill during discuss/vote phases (red styling when ≤ 10s)

#### 3 — Outcome toasts after reveal
- `PlayerView`: dismissible popup with contextual phrase based on role + vote outcome
- 5 phrase variants: crew-correct (green), crew-wrong (red), mole-in-character (green), mole-broke-character (red), canary (teal)
- Auto-dismisses after 3.5s or on tap/Enter/Space

### Scoring Bug Fix:
- **Root cause**: Supabase query in `calculateAndSaveScores()` used `.select('*, mole_topics!inner(correct_choice)')` — both tables have `correct_choice` column, creating ambiguity. PlayerView used `topic.correct_choice` while scoring used `round.correct_choice`.
- **Fix**: Removed join; explicitly select only `mole_rounds` columns. PlayerView now uses hook's `correctChoice` (from `round.correct_choice`) authoritatively.

### Role-Aware Reveal Badge:
- Added `getRevealOutcome()` helper — badge is now role-contextual
- Mole voted wrong → green "In Character" badge (success for their role)
- Mole voted correctly → red "Broke Character" badge
- Crew/Canary voted correctly → green "Correct!"
- Crew/Canary voted wrong → red "Wrong"

### Username Display:
- Player nickname shown in PlayerView top bar next to round indicator
- "(You)" label next to player's own name in round leaderboard

### Files modified this session (6):

| File | Changes |
|------|---------|
| `app/api/games/mole-hunt/start/route.ts` | Added timer values to Pusher payload |
| `app/api/games/mole-hunt/next-round/route.ts` | Added timer values to Pusher payload |
| `features/mole-hunt/hooks/useMoleHunt.ts` | Timer state, countdown interval, `timeLeft`/`timerTotal` exposure |
| `features/mole-hunt/components/PlayerView.tsx` | Timer display, round leaderboard, outcome toast, role-aware badge, nickname display |
| `features/mole-hunt/components/MoleHuntPresentation.tsx` | Round scores panel during reveal |
| `features/mole-hunt/actions.ts` | Fixed scoring query (removed ambiguous join) |
| `app/play/[code]/mh-game/page.tsx` | Pass nickname to PlayerView |

---

## Previous session: Bug Fix Session (June 28, 2026)

### 4 bugs fixed:

#### Bug 1 — Host excluded from player participation ✅
- Added `.neq('is_host', true)` to all Mole Hunt `players` queries: `startGame()`, `calculateAndSaveScores()`, `createNextRound()` in `actions.ts`, vote route totalPlayers count, control-data route, and mh-game page player fetch
- Host no longer counted in player counts, role assignment pools, or vote totals
- SQL to clean existing host rows in players/mole_scores/mole_votes:
  ```sql
  DELETE FROM mole_scores WHERE player_id IN (SELECT id FROM players WHERE is_host = true);
  DELETE FROM mole_votes WHERE player_id IN (SELECT id FROM players WHERE is_host = true);
  DELETE FROM players WHERE is_host = true;
  ```

#### Bug 2 — Results in Presentation screen ✅
- `MoleHuntPresentation` now fetches and renders leaderboard inline on game over (fetches `mole_scores` via Supabase browser client, shows top 3 medals + Most Deceptive Mole callout + View Full Results link)
- `MoleHuntControlRoom` shows "Game Ended" state instead of navigating to mh-results; has View Full Results + Back to Dashboard buttons
- `app/host/[code]/mole-control/page.tsx` redirects to `/dashboard` instead of `/host/{code}/mh-results` when room is ended
- `app/host/[code]/mh-game/page.tsx` passes `roomId` prop to Presentation
- The standalone `/host/[code]/mh-results` page still exists for deep linking and "View Full Results" button

#### Bug 3 — Mole correct-vote deduction ✅
- `calculateAndSaveScores()`: Moles who vote correctly receive -100 deduction AND skip deception bonus
- Moles who vote wrong receive existing deception scoring (+150 per deceived +50 majority)
- Deduction and deception bonus are mutually exclusive per round
- Before: Moles always got deception points regardless of own vote
- After: Mole voted correctly → -100 (broke character); Mole voted wrong → deception bonus as before

#### Bug 4 — Player navigates to results on game end ✅
- Added `triggerGameEvent(code, 'game-ended', {})` to `POST /api/rooms/close` (the generic close route Mole Hunt uses)
- `app/play/[code]/mh-game/page.tsx` now checks `room.status === 'ended'` on mount and redirects to `/play/{code}/mh-results`
- PlayerView already had an `isGameOver` → results redirect via `useMoleHunt` hook; now the Pusher event actually fires

### Files modified this session (11):

| File | Bugs | Change |
|------|------|--------|
| `features/mole-hunt/actions.ts` | 1, 3 | `.neq('is_host', true)` on 3 player queries + Mole scoring deduction logic |
| `app/api/games/mole-hunt/vote/route.ts` | 1 | `.neq('is_host', true)` on totalPlayers count |
| `app/api/games/mole-hunt/control-data/route.ts` | 1 | `.neq('is_host', true)` on players fetch |
| `app/host/[code]/mh-game/page.tsx` | 1, 2 | `.neq('is_host', true)` on players fetch + pass `roomId` prop |
| `app/api/rooms/close/route.ts` | 4 | Added `triggerGameEvent(code, 'game-ended', {})` after close |
| `app/play/[code]/mh-game/page.tsx` | 4 | Added room status check on mount → redirect to results if ended |
| `features/mole-hunt/components/MoleHuntPresentation.tsx` | 2 | Added `roomId` prop, leaderboard fetch/state, inline game-over leaderboard |
| `features/mole-hunt/components/MoleHuntControlRoom.tsx` | 2 | Added `gameEnded` state, ended screen, removed results nav |
| `app/host/[code]/mole-control/page.tsx` | 2 | Changed ended redirect to `/dashboard` |

### Updated flow:

**Game end:**
1. Host clicks "End Game" in Control Room → calls `/api/rooms/close` → fires `room-closed` + `game-ended`
2. Presentation receives `game-ended` → fetches leaderboard from `mole_scores` → renders inline
3. Player receives `game-ended` → `useMoleHunt` sets `isGameOver = true` → PlayerView navigates to `/play/{code}/mh-results`
4. Control Room shows "Game Ended" state with View Full Results + Back to Dashboard

### SQL required (run in Supabase dashboard):

No schema changes needed. Only cleanup for existing data:
```sql
DELETE FROM mole_scores WHERE player_id IN (SELECT id FROM players WHERE is_host = true);
DELETE FROM mole_votes WHERE player_id IN (SELECT id FROM players WHERE is_host = true);
DELETE FROM players WHERE is_host = true;
```

---

## Previous session: UX/Flow Fix Session (June 28, 2026)

### 5 issues fixed across two categories:

#### Category A — UX/Flow Fixes

**A1 — "How to Play" rules screen in lobby ✅**
- Added collapsible rules panel to both `HostLobby` and `PlayerLobby` for Mole Hunt rooms
- Covers: what the game is, 3 roles, round flow, scoring summary, worked example
- Config values (rounds, moles, canaries, timers) fetched live from Supabase (`getRoomConfig`)
- Collapsed by default (accordion-style), uses `useState` toggle — no shadcn component needed
- Host and Player see the same rules content — no role-sensitive info

**A2 — Post-start flow: Presentation first, Control Room as separate link ✅**
- After Start, host lands on **Presentation** (`/host/[code]/mh-game`), NOT Control Room
- Presentation has **"Open Control Room"** button in bottom bar (opens in new tab via `window.open`)
- Control Room identity panel is **collapsed by default** with "⚠ Do not share this screen" warning
- Host must click "Reveal Identities" to see Mole/Canary names
- **All host action buttons** (Advance Phase, Next Round, End Game) are in Control Room only
- Presentation screen is read-only — zero action buttons

**A3 — Post-vote reveal: host must manually advance ✅**
- After vote → reveal, game **stays in reveal phase** indefinitely
- No auto-advance or timer on reveal
- Host explicitly clicks **"Next Round"** (or **"End Game"** if final round) from Control Room
- New `nextRound()` action + `POST /api/games/mole-hunt/next-round` API route
- `advancePhase` no longer auto-creates next round — decoupled
- Phase progression: `discuss → vote → reveal` (host click) → `next-round` or `end-game`

#### Category B — Host Room Config Fixes

**B1 — Topic picker: host selects topics before starting ✅**
- Added `selected_topic_ids: string[]` field to `MoleRoomConfig` and `MoleRoomConfigInput`
- New `'select-topics'` step in `MoleHuntSetup`:
  - Fetches full topic bank via `GET /api/games/mole-hunt/topics`
  - Shows checkboxes for each topic with order badges (#1, #2, etc.)
  - Displays counter: "X of N selected"
  - "Create Room" disabled until selection count matches `total_rounds`
  - Topics shown in selected order during gameplay
- `startGame` uses `selected_topic_ids` from config (in order), not random picks
- `createNextRound` uses selected topic at index `roundNumber - 1`

**B2 — Pre-start validation ✅**
- **Client-side** (HostLobby): 5 checks before Start button enables:
  1. `mole_count >= 1`
  2. `total_rounds >= 1`
  3. `selected_topic_ids.length > 0`
  4. `selected_topic_ids.length === total_rounds`
  5. `player_count > mole_count + canary_count`
- All errors shown as a red list above the Start button
- **Server-side** (startGame action): same 5 checks in `startGame()` — returns structured errors if bypassed
- Start button disabled with specific error count shown in button text

### SQL required (run in Supabase dashboard):

```sql
ALTER TABLE mole_room_config ADD COLUMN IF NOT EXISTS selected_topic_ids text[] DEFAULT '{}';
```

### Files modified this session (11 modified + 1 new):

| File | Change |
|------|--------|
| `features/mole-hunt/types.ts` | Added `selected_topic_ids` to `MoleRoomConfig` and `MoleRoomConfigInput` |
| `features/mole-hunt/actions.ts` | Updated `saveRoomConfig`, `startGame` (selected topics + validation), `advancePhase` (decoupled from next round), added `nextRound()`, updated `createNextRound` (uses selected topics) |
| `app/api/games/mole-hunt/start/route.ts` | Simplified error status mapping |
| `app/api/games/mole-hunt/advance-phase/route.ts` | Removed auto-round-creation on reveal — only fires `phase-advanced` + `scores-updated` |
| `app/api/games/mole-hunt/next-round/route.ts` | **NEW** — host-explicit next round, auth-gated, fires `round-started` Pusher event |
| `features/mole-hunt/hooks/useMoleHuntControl.ts` | Added `nextRound()` callback, updated return type |
| `features/mole-hunt/components/MoleHuntSetup.tsx` | Added `'select-topics'` step with checkbox list, order badges, count validation, search filter |
| `features/rooms/components/HostLobby.tsx` | Rules panel (A1), validation error list (B2), nav to `mh-game` (A2), fetches config live |
| `features/rooms/components/PlayerLobby.tsx` | Rules panel (A1) with config values from Supabase |
| `features/mole-hunt/components/MoleHuntPresentation.tsx` | Removed ALL action buttons, added "Open Control Room" button in bottom bar (A2), read-only |
| `features/mole-hunt/components/MoleHuntControlRoom.tsx` | Collapsible identity panel with warning (A2), "Next Round" + "End Game" buttons in reveal (A3) |

### Bug fix (post-session, June 28):

- **Topic selection double-toggle**: Checkbox `onCheckedChange` and parent `div` `onClick` both fired `toggleTopic`, cancelling each other out (no checkmarks appeared). Fixed by removing `onCheckedChange`, adding `pointer-events-none` to the Checkbox so parent `onClick` handles all clicks. Also collapsed display to title-only and added search/filter input.

### Updated flow:

**Pre-start:**
1. Host creates room → MoleHuntSetup: config mode → select topics → create room → HostLobby
2. HostLobby shows rules panel (collapsible) + validation errors (if any)
3. Players join → See rules panel in PlayerLobby

**Post-start:**
1. Host clicks Start → lands on **Presentation** (`/host/[code]/mh-game`) — share this on Zoom
2. Host clicks "Open Control Room" → new tab with **Control Room** (`/host/[code]/mole-control`) — keep private
3. Control Room: Click "Reveal Identities" to see Moles/Canaries (collapsed by default)
4. All host actions (Start Voting, Reveal Results, Next Round, End Game) happen in Control Room
5. Presentation auto-updates via Pusher — no host interaction needed on shared screen

**Round flow:**
1. `discuss` → Host clicks "Start Voting" in Control Room
2. `vote` → Auto-advances when all voted, or host clicks "Reveal Results" 
3. `reveal` → Stays indefinitely. Host clicks "Next Round" or "End Game"
4. Next round: roles re-assigned with avoidance, next selected topic shown

---

## What Mole Hunt is

A trivia-meets-social-deduction game played during High6's weekly virtual meetings (~15 players). The host runs the game on a shared screen (Zoom/Meet). Players interact on their own phones.

Each round, the host presents a **topic card** (title + blurb + image + two options). One option is objectively correct. Most players try to find the right answer — but hidden **Moles** secretly know the answer and try to deceive the group into choosing the wrong one. **Canaries** are forced to speak up without knowing the answer, creating organic chaos.

**Design rule that hasn't changed:** the correct answer must be determinable from the blurb alone, never from outside knowledge — this keeps Googling useless and keeps the game focused on reading comprehension + persuasion.

---

## Current build status

### ✅ Done — Data Layer & Host Setup Screens
- `features/mole-hunt/types.ts` — `MoleMode`, `MoleTopic`, `MoleTopicInput`, `MoleRoomConfig`, `MoleRoomConfigInput`
- `features/mole-hunt/actions.ts` — `getTopicBank`, `createTopic`, `updateTopic`, `deleteTopic`, `getRoomConfig`, `saveRoomConfig`
- `features/mole-hunt/components/ModeDefaults.ts` — Easy/Moderate/Hard preset constants
- `features/mole-hunt/components/TopicBankManager.tsx` — full topic CRUD UI (create, inline/dialog edit, delete with confirmation)
- `features/mole-hunt/components/MoleHuntSetup.tsx` — mode select → editable config fields → Create Room
- `app/api/games/mole-hunt/topics/route.ts` — GET/POST, auth-gated via server client
- `app/api/games/mole-hunt/topics/[id]/route.ts` — PUT/DELETE, ownership enforced
- `features/rooms/types.ts` — `GameType` includes `'mole-hunt'`
- `features/rooms/actions.ts` — `createRoom()` accepts optional `config`, calls `saveRoomConfig`
- `app/api/rooms/route.ts` — accepts `mole-hunt` + `config` in body
- `CreateRoom.tsx` — Mole Hunt card + setup step
- `HostLobby.tsx` / `PlayerLobby.tsx` — `GAME_LABELS` entries, routes `'mole-hunt' → 'mh-game'`
- `HANDOFF.md` (main project doc) — updated with Mole Hunt status, schema, structure

**Validation implemented in `saveRoomConfig`:** `mole_count > 0`, `canary_count >= 0`, `total_rounds > 0`, `discuss_timer_seconds > 0`, `vote_timer_seconds > 0`. Deliberately **does not** check role counts against actual player count — that has to happen at game-start time (see Open Items below), not at config-save time, because no players have joined yet when config is first saved.

**Auth pattern used (confirmed against the actual ToT code, not assumed):** API routes use the server Supabase client + `auth.getUser()` to identify the caller, then pass `hostId` into `actions.ts` functions as a plain parameter. Actions themselves use the browser client purely for DB queries and never call `auth.getUser()` internally. Topic ownership (`created_by = hostId`) is enforced in `updateTopic`/`deleteTopic` by checking affected row count — this is the only ownership safeguard, since RLS is disabled project-wide.

### ⚠️ Blocking — must be done in Supabase dashboard before testing
1. **Widen the `rooms.game_type` CHECK constraint** (DONE June 28):
   ```sql
   ALTER TABLE rooms DROP CONSTRAINT rooms_game_type_check;
   ALTER TABLE rooms ADD CONSTRAINT rooms_game_type_check
     CHECK (game_type IN ('this-or-that', 'word-chain', 'mole-hunt'));
   ```
2. **Disable RLS** on all 5 Mole Hunt tables: `mole_topics`, `mole_room_config`, `mole_rounds`, `mole_votes`, `mole_scores` (these were created with RLS on by accident — every other table in the project has it off).
3. **Add `correct_choice` to `mole_rounds`** (DONE June 28):
   ```sql
   ALTER TABLE mole_rounds ADD COLUMN correct_choice text NOT NULL DEFAULT 'a';
   ```
4. **Verify schema parity** for `mole_rounds` — the table now requires 12 columns: `id`, `room_id`, `topic_id`, `round_number`, `phase`, `mole_player_ids`, `canary_player_ids`, `canary_flagged_ids`, `correct_choice`, `discuss_timer_seconds`, `vote_timer_seconds`, `created_at`. All are NOT NULL. Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'mole_rounds' ORDER BY ordinal_position;` to verify.
5. Timer columns on `mole_room_config` are confirmed present — no action needed.

**Items 1 and 3 are done.** Items 2 and 4 remain.

### 🔜 Not built yet / Open items
- End-to-end testing of the full round flow (Discuss → Vote → Reveal → Next Round → Game End)
- Vercel deployment
- Auth actions (placeholder) + forgot-password/sign-up stub pages
- Disable RLS on Mole Hunt tables (items 2 and 4 from schema blockers above)
- Scoreboard rendering and leaderboard UI testing (built but untested)

### Schema blockers remaining (for Supabase dashboard)
1. ✅ Widen `rooms.game_type` CHECK constraint — DONE
2. **Disable RLS** on `mole_topics`, `mole_room_config`, `mole_rounds`, `mole_votes`, `mole_scores`
3. ✅ Add `correct_choice` to `mole_rounds` — DONE
4. Verify schema parity for `mole_rounds` (12 NOT NULL columns)
5. **NEW:** Add `selected_topic_ids` to `mole_room_config`:
   ```sql
   ALTER TABLE mole_room_config ADD COLUMN IF NOT EXISTS selected_topic_ids text[] DEFAULT '{}';
   ```

---

## Key design decisions locked in this round of sessions

These were debated and decided — don't re-open them without a specific reason:

1. **No Mole private signal chat.** Originally planned for Easy/Moderate modes, cut entirely. Reasons: it required a securable Pusher private/presence channel (new infra), and removing it makes all three difficulty modes differ only by headcount/timers (already Host-overridable), simplifying the build. Moles coordinate purely verbally over the Zoom call now, same as everyone else.
2. **Two host pages, not one.** **Presentation** = shared Zoom screen, no role data, ever, pre-reveal. **Control Room** = host-only authenticated page, sees Mole/Canary identities live (collapsed by default with warning), has all action buttons. Post-start navigation goes to Presentation first — host opens Control Room in a separate tab.
3. **Reveal phase is host-driven.** After vote → reveal, game stays in reveal indefinitely. No auto-advance. Host manually clicks "Next Round" or "End Game" from Control Room. The reveal is the social deduction payoff — it must not auto-dismiss.
4. **Topic selection is explicit.** Host selects exactly `total_rounds` topics from their bank before creating the room. Topics run in selected order. `startGame` and `createNextRound` use `selected_topic_ids` from config — no random picks.
5. **Pre-start validation is dual-layer.** Client-side (HostLobby) shows all 5 validation errors inline before the Start button activates. Server-side (`startGame` action) repeats all checks as a safety net.
6. **Counter-argument hint is shared per topic, not unique per Mole.** Originally designed as a unique angle per Mole (to prevent robotic repeated arguments). Cut for authoring-cost reasons — writing up to 4 distinct angles per topic was too much content burden for the timeline. All Moles on a topic now get the same hint text; persuasion variety is expected to happen verbally, not from the phone screen.
7. **Mole's role/answer banner is persistent on their phone through the discuss phase**, not a one-time popup — confirmed explicitly, avoids "wait what was my angle again" friction.
8. **Role-count validation is split across two points in time:** `saveRoomConfig` only validates the numbers are individually sane (count > 0, etc.). The real check — `mole_count + canary_count < actual joined player count` — now happens in both HostLobby (client-side) and `startGame` (server-side).

---

## Open risk — RESOLVED ✅

**Pusher client keys are public — secret data must never go through a broadcast payload that all clients receive.** This is now implemented correctly:

- Role assignments (`mole_player_ids`, `canary_player_ids`) are fetched by each player via `GET /api/games/mole-hunt/my-role?round_id=&player_id=` — scoped to their player ID, returns only their role (never the full arrays).
- Control Room fetches the full role breakdown via `GET /api/games/mole-hunt/control-data?roundId=` — auth-gated, requires host Supabase session.
- No secret data ever goes through a Pusher broadcast payload. Pusher events carry only non-sensitive metadata (roundNumber, roundId, phase, topicId, votedCount, totalPlayers).

This wasn't an issue for This or That / Word Chain because neither has hidden information.

## Other open risk, lower priority

**Mole scoring math** — the scoring engine is built (see `calculateAndSaveScores` in actions.ts). Scoring rules:

| Role | Action | Points |
|------|--------|--------|
| Crew | Voted correctly | +100 |
| Mole | Voted for wrong answer (stayed in character) | +150 per deceived player, +50 if majority wrong |
| Mole | Voted for **correct** answer (broke character) | **−100 deduction**, no deception bonus |
| Canary | Participated (blind bonus) | +20 |

Mole deduction and deception bonus are mutually exclusive per round. Balance can be tuned by adjusting these constants.

---

## Recent bug fixes (June 28, 2026)

- **Pusher SSR crash**: `lib/pusher/client.ts` now uses lazy Proxy initialization — `new PusherJs(...)` deferred to first property access (client-only), avoiding Turbopack resolving to the Node.js build
- **Infinite loading on start**: HostLobby was calling generic `/api/rooms/start` (status-only) instead of Mole Hunt's `/api/games/mole-hunt/start` (round creation + role assignment). Fixed in `features/rooms/components/HostLobby.tsx`.
- **Infinite loading on reload**: Added on-mount Supabase round fetch in `useMoleHuntControl` and `useMoleHunt` hooks — no longer dependent solely on Pusher `round-started` event
- **Schema mismatches**: Added `correct_choice` to `mole_rounds`; INSERTs now populate `discuss_timer_seconds`, `vote_timer_seconds`, `canary_flagged_ids`
- **Browser client in API routes**: `startGame`, `getRoomConfig`, `getTopicBank` now accept optional `SupabaseClient` — API routes pass the server client

---

## How to continue next session

Paste this file and say:

> "Continue high6-play Mole Hunt. All phases complete, critical bugs fixed. Here's the handoff."

All three phases are built. Remaining blockers: disable RLS on Mole Hunt tables, verify `mole_rounds` schema parity. Next: end-to-end testing of the full round flow (Discuss → Vote → Reveal → Next Round → Game End).