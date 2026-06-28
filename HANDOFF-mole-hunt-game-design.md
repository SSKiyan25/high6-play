# high6-play — Mole Hunt Handoff (Updated)
> Last updated: June 27, 2026
> Continue this in Claude.ai — paste this file at the start of the next session.
> **ALL PHASES COMPLETE** — Mole Hunt is fully built through Phase 3 (Control Room + Results/Leaderboard).

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
1. **Widen the `rooms.game_type` CHECK constraint** (currently rejects `'mole-hunt'` at the DB level regardless of app code):
   ```sql
   ALTER TABLE rooms DROP CONSTRAINT rooms_game_type_check;
   ALTER TABLE rooms ADD CONSTRAINT rooms_game_type_check
     CHECK (game_type IN ('this-or-that', 'word-chain', 'mole-hunt'));
   ```
2. **Disable RLS** on all 5 Mole Hunt tables: `mole_topics`, `mole_room_config`, `mole_rounds`, `mole_votes`, `mole_scores` (these were created with RLS on by accident — every other table in the project has it off).
3. Timer columns (`discuss_timer_seconds`, `vote_timer_seconds`) are confirmed already present on `mole_room_config` — no action needed there.

**Until #1 is applied, Create Room cannot be tested end-to-end for Mole Hunt** — the insert will fail at the database constraint regardless of what the app sends.

### 🔜 Not built yet (next session's scope)
None — all three phases are now complete:
- Phase 1 — Round flow backend + role assignment ✅
- Phase 2 — Player View + Presentation Screen ✅
- Phase 3 — Control Room + Results & Leaderboard ✅

---

## Key design decisions locked in this round of sessions

These were debated and decided — don't re-open them without a specific reason:

1. **No Mole private signal chat.** Originally planned for Easy/Moderate modes, cut entirely. Reasons: it required a securable Pusher private/presence channel (new infra), and removing it makes all three difficulty modes differ only by headcount/timers (already Host-overridable), simplifying the build. Moles coordinate purely verbally over the Zoom call now, same as everyone else.
2. **Two host pages, not one.** **Presentation** = shared Zoom screen, no role data, ever, pre-reveal. **Control Room** = host-only authenticated page, sees Mole/Canary identities live, has the manual "flag silent Canary" button. This resolves an earlier contradiction in the original design (one section said the Host can't see roles before reveal, another gave the Host a power that required seeing them) — Control Room is now explicitly the answer to that.
3. **Counter-argument hint is shared per topic, not unique per Mole.** Originally designed as a unique angle per Mole (to prevent robotic repeated arguments). Cut for authoring-cost reasons — writing up to 4 distinct angles per topic was too much content burden for the timeline. All Moles on a topic now get the same hint text; persuasion variety is expected to happen verbally, not from the phone screen.
4. **Mole's role/answer banner is persistent on their phone through the discuss phase**, not a one-time popup — confirmed explicitly, avoids "wait what was my angle again" friction.
5. **Role-count validation is split across two points in time:** `saveRoomConfig` only validates the numbers are individually sane (count > 0, etc.). The real check — `mole_count + canary_count < actual joined player count` — is deferred to game-start time, which is a separate, not-yet-built task. Don't try to enforce this in `saveRoomConfig`; it can't work there because no players exist yet at config-save time.

---

## Open risk to resolve before building round flow / Pusher events

**Pusher client keys are public — secret data must never go through a broadcast payload that all clients receive.** This applies directly to:
- Role assignments (`mole_player_ids`, `canary_player_ids`) — must be fetched by each player via an authenticated, player-scoped API call, never broadcast in a Pusher event payload that the whole room channel receives.
- Control Room's live data — needs either (a) a private Pusher channel with a `/api/pusher/auth` endpoint gated by the host's Supabase session (the project already reserved a `room-{code}-host` channel slot for this, just unused so far), or (b) Control Room polls an authenticated API route instead of subscribing to a broadcast with secret data in it.

This wasn't an issue for This or That / Word Chain because neither has hidden information. It is the single most important thing to get right before any round-flow Pusher events are wired up — get this wrong and the entire deception mechanic breaks (any player can open devtools and read the Mole list).

## Other open risk, lower priority

**Mole scoring math, as originally sketched, stacks bonuses (deception + majority + solidarity) in a way that could let Moles dominate the leaderboard regardless of how the round actually goes.** Worth a deliberate balance pass when the scoring engine is actually built — not blocking the current data-layer work, but flagged so it isn't forgotten by the time scoring code gets written.

---

## How to continue next session

Paste this file and say:

> "Continue high6-play Mole Hunt. Data layer and host setup screens are built — here's the handoff. Next up: round flow + role assignment, or Presentation/Control Room pages."

Before writing any code, apply the two pending Supabase dashboard prerequisites above (constraint widen, RLS disable) if not already done, and confirm with the AI agent that they were applied — don't assume.