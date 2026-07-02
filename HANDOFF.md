# high6-play — Session Handoff
> Last updated: July 2, 2026
> Continue this in Claude.ai (claude.ai) — paste this file at the start of the next session.

---

## What this project is

**high6-play** is an internal web app game hub for High6 Corporation's weekly virtual meetings (<20 members). The host runs a game on a shared screen (Zoom/Meet) while players interact on their own phones via a 4-digit room code. Sessions are 30–40 minutes.

**Three games:**
- **This or That** — category-based turn-based elimination. Players take turns responding to a category under time pressure. Skip once per round. Round ends when survivors threshold is met. Survivors earn points based on category difficulty.
- **Word Chain** — players take turns submitting a word that connects to the previous one, eliminated if they time out or repeat
- **Mole Hunt** — trivia meets social deduction; hidden Moles try to deceive the Crew, Canaries are forced to speak up

**Deadline: July 3, 2026**

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js App Router (latest) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix Nova style) |
| Database | Supabase (dashboard-managed, no CLI, RLS disabled) |
| Realtime | Pusher Channels (cloud, free tier) |
| Auth | Supabase Auth — email/password, host/admin only |
| Deployment | Vercel (not yet deployed) |
| Font | Geist (via next/font/google) |
| Theme | next-themes, dark mode default, OKLCH color space |

**Scaffold:** Created with `create-next-app --with-supabase`
- Supabase clients at `lib/supabase/client.ts` (browser, via `@supabase/ssr`) and `lib/supabase/server.ts` (server, cookie-based)
- Env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not ANON_KEY)

---

## Current status — everything built except auth stubs + deployment

### Done ✅
- [x] Next.js + Supabase scaffold, connected, boilerplate removed
- [x] Pusher cloud app created, keys in `.env.local`
- [x] shadcn/ui initialized with MCP (10 primitives: badge, button, card, checkbox, dialog, drawer, dropdown-menu, input, label, progress)
- [x] Claude Code plugins: engram, ui-ux-pro-max, graphify
- [x] All Supabase tables created (17 tables — rooms, players, plus 5 old ToT, 2 WC, 5 MH, 5 new ToT)
- [x] `rooms.game_type` CHECK constraint widened to include 'mole-hunt'
- [x] Pusher lib: `lib/pusher/client.ts`, `lib/pusher/server.ts`, `lib/pusher/trigger.ts`
- [x] Room Flow — types, actions, API routes, hooks, components (HostLobby, JoinForm, PlayerLobby, PlayerLobbyGate, CreateRoom)
- [x] This or That (rebuilt) — categories + turn-based elimination + skip mechanic + survivors-to-win scoring
- [x] Word Chain — types, actions, API routes, hooks, components (HostWcView, PlayerWcView, WcResultsView)
- [x] Host Login — LoginForm component, login page, email confirmation handler
- [x] Landing page — "I'm the Host" → login, "Join a Room" → JoinForm
- [x] Dashboard — game selection with per-game setup flows
- [x] Results pages for all games
- [x] Word Chain game-over auto-detection
- [x] Dark theme throughout (OKLCH-based, cyan-blue primary + teal accent)
- [x] Auth proxy middleware at `proxy.ts`
- [x] Admin auth account created in Supabase dashboard
- [x] Mole Hunt — fully built (data layer, setup screens, round flow, Player View, Presentation, Control Room, Results)
- [x] Mole Hunt — critical bugs fixed (Pusher SSR, wrong start API, schema gaps, host-as-player, scoring, role-aware UI)
- [x] This or That rebuild — types, actions (20 functions), 8 API routes, useThisOrThat hook, 5 components, 4 pages
- [x] This or That timer — visual/advisory only; host manually clicks "Confirm & Next" or "Eliminate & Next"

### Partial / stubs ⚠️
- [ ] `features/auth/actions.ts` — placeholder, no login/logout/signUp actions implemented (LoginForm calls Supabase directly)
- [ ] `app/auth/forgot-password/page.tsx` — stub ("coming soon")
- [ ] `app/auth/sign-up/page.tsx` — stub ("coming soon")
- [ ] `app/auth/sign-up-success/page.tsx` — stub
- [ ] `app/auth/update-password/page.tsx` — stub

### Not done 🔜
- [ ] Vercel deployment
- [ ] No dedicated `middleware.ts` — auth is handled via `proxy.ts` using Supabase `getClaims()`. Verify this is properly wired in production.
- [ ] Old ToT files (`features/this-or-that/`, `app/host/[code]/game/`, `app/play/[code]/game/`, old API routes under `app/api/games/this-or-that/vote|advance|end|bank/`) still in place but unused — can be removed in a cleanup pass
- [ ] End-to-end testing of all three games

---

## Full project structure

```
app/
  page.tsx                              # Landing — "I'm the Host" + "Join a Room"
  layout.tsx                            # Root layout — Geist font, ThemeProvider (dark default)
  globals.css                           # OKLCH CSS variables, dark theme, shadcn imports
  dashboard/
    page.tsx                            # CreateRoom (game selection + per-game setup flow)
  host/
    [code]/
      page.tsx                          # HostLobby — room code, player list, start/close
      game/page.tsx                     # OLD ToT host game (unused — replaced by tot-game)
      tot-game/page.tsx                 # NEW ToT host presentation (server component)
      tot-results/page.tsx              # NEW ToT host results (server component)
      wc-game/page.tsx                  # Word Chain host game screen (server component)
      wc-results/page.tsx               # Word Chain results (server component)
      mh-game/page.tsx                  # Mole Hunt host presentation screen (server component)
      mole-control/page.tsx             # Mole Hunt host Control Room (server component)
      mh-results/page.tsx               # Mole Hunt host results (server component)
  play/
    [code]/
      page.tsx                          # PlayerLobbyGate → PlayerLobby (server component)
      game/page.tsx                     # OLD ToT player game (unused — replaced by tot-game)
      tot-game/page.tsx                 # NEW ToT player game (client component)
      tot-results/page.tsx              # NEW ToT player results (client component)
      wc-game/page.tsx                  # Word Chain player game screen (client component)
      mh-game/page.tsx                  # Mole Hunt player game screen (client component)
      mh-results/page.tsx               # Mole Hunt player results (client component)
  auth/
    login/page.tsx                      # LoginForm
    confirm/route.ts                    # Supabase email OTP confirmation handler
    error/page.tsx                      # Generic auth error page
    forgot-password/page.tsx            # STUB
    sign-up/page.tsx                    # STUB
    sign-up-success/page.tsx            # STUB
    update-password/page.tsx            # STUB
    loading.tsx                         # Auth loading state
  api/
    rooms/
      route.ts                          # POST create room, GET fetch room by code
      join/route.ts                     # POST join room + Pusher player-joined
      close/route.ts                    # POST close room + Pusher room-closed (+ game-ended for MH)
      start/route.ts                    # POST start game (generic — WC only now; ToT + MH have their own)
    games/
      this-or-that/
        vote/route.ts                   # OLD — unused
        advance/route.ts                # OLD — unused
        end/route.ts                    # OLD — unused
        bank/route.ts                   # OLD — unused
        start/route.ts                  # NEW — POST start game (host auth, validates config, creates round 1)
        confirm-turn/route.ts           # NEW — POST player confirms answer + advances turn
        skip/route.ts                   # NEW — POST player skips turn (once per round, 409 on repeat)
        advance-turn/route.ts           # NEW — POST host eliminates current player (timeout)
        next-round/route.ts             # NEW — POST host starts next round (re-randomizes order)
        end-game/route.ts               # NEW — POST host ends game
        categories/
          route.ts                      # NEW — GET list categories, POST create (auto-seeds on first access)
          [id]/
            route.ts                    # NEW — PUT update, DELETE delete
      word-chain/
        submit/route.ts                 # POST submit word + Pusher word-submitted
        eliminate/route.ts              # POST eliminate player + Pusher player-eliminated (auto-ends if 1 left)
        end/route.ts                    # POST end game + Pusher game-ended
      mole-hunt/
        topics/
          route.ts                      # GET fetch topic bank, POST create topic
          [id]/
            route.ts                    # PUT update topic, DELETE delete topic
        start/route.ts                  # POST start game (host auth)
        advance-phase/route.ts          # POST advance phase (host auth)
        vote/route.ts                   # POST submit player vote
        my-role/route.ts                # GET return player role + topic (never exposes role arrays)
        score/route.ts                  # POST calculate + upsert scores after reveal
        canary-deduct/route.ts          # POST deduct 50 pts from silent Canary
        control-data/route.ts           # GET host-only control data — exposes mole/canary IDs
        player-results/route.ts         # GET player personal score summary
        next-round/route.ts             # POST advance to next round (host auth)

features/
  rooms/
    types.ts                            # Room, Player, RoomWithPlayers, GameType, RoomStatus
    actions.ts                          # createRoom, joinRoom, getRoom, closeRoom (+ generateRoomCode)
    hooks/
      useRoom.ts                        # Fetches room from GET /api/rooms?code=
      useRoomPlayers.ts                 # Pusher subscription for player-joined, room-closed, game-started
    components/
      HostLobby.tsx                     # Room code (copyable), player list (live), Start Game, Close Room
      JoinForm.tsx                      # 4-char code + nickname inputs, localStorage h6p_player
      PlayerLobby.tsx                   # Confirmation, player list, waiting for host
      PlayerLobbyGate.tsx               # Reads h6p_player from localStorage, gates access
      CreateRoom.tsx                    # Game selection → per-game setup (TotSetup / MH / WC)

  this-or-that/                         # OLD — binary vote game (keep around, not used by new ToT)
    types.ts, actions.ts
    hooks/ (useThisOrThat.ts, useVotes.ts)
    components/ (HostView.tsx, PlayerView.tsx, QuestionSetup.tsx, TotResultsView.tsx)

  tot/                                  # NEW — rebuilt turn-based elimination This or That
    types.ts                            # TotDifficulty, TotCategory, TotCategoryInput,
                                        #   TotRoomConfig, TotRoomConfigInput, TotRound, TotRoundPlayer,
                                        #   TotScore, TotGameState, TotTurnResult, TotRoundState,
                                        #   TotLeaderboardRow, TotRoundBreakdown, TotFullResults,
                                        #   SEED_CATEGORIES (15), DIFFICULTY_POINTS, DIFFICULTY_LABELS
    actions.ts                          # Category CRUD + seed, room config with validation,
                                        #   startGame, confirmTurn, skipTurn, advanceTurn,
                                        #   endRound, startNextRound, endGame,
                                        #   getResults, getCurrentRound, getRoundState
    hooks/
      useThisOrThat.ts                  # Pusher sub for round-started/turn-advanced/player-skipped/
                                        #   player-eliminated/round-ended/game-ended,
                                        #   exposes confirmTurn + skipTurn actions
    components/
      TotSetup.tsx                      # Multi-step: difficulty → config → category selection
      TotCategoryManager.tsx            # CRUD for categories (create, edit, delete dialogs)
      TotPresentation.tsx               # Host presenter: turn order with live status, manual timer,
                                        #   "Confirm & Next" / "Eliminate & Next" host buttons,
                                        #   round-end state, game-over leaderboard
      TotPlayerView.tsx                 # Player screen: waiting / your-turn / eliminated / survivor states,
                                        #   confirm + skip buttons, timer display
      TotResultsView.tsx                # Leaderboard with medals, collapsible per-round breakdown

  word-chain/
    types.ts, actions.ts
    hooks/ (useWordChain.ts, useTurnTimer.ts)
    components/ (HostWcView.tsx, PlayerWcView.tsx, WcResultsView.tsx)

  mole-hunt/
    types.ts                            # MoleMode, MoleTopic, MoleTopicInput, MoleRoomConfig,
                                        #   MoleRoomConfigInput, MolePhase, MoleRole, MoleRound,
                                        #   MoleVote, MyRoleResponse, RoundScoreSummary
    actions.ts                          # Topic CRUD + room config, startGame, advancePhase,
                                        #   submitVote, getMyRole, calculateAndSaveScores,
                                        #   deductCanaryPoints, getCurrentRound, nextRound
    hooks/
      useMoleHunt.ts                    # Shared Pusher hook (player + presentation)
      useMoleHuntControl.ts             # Host-only hook (Control Room)
    components/
      MoleHuntSetup.tsx                 # Mode select → config → topic selection
      TopicBankManager.tsx              # Create/edit/delete topics
      ModeDefaults.ts                   # Easy/Moderate/Hard preset constants
      PlayerView.tsx                    # Phase-aware player UI + role-specific banners + timers
      MoleHuntPresentation.tsx          # Host Zoom screen — read-only, no hidden data pre-reveal
      MoleHuntControlRoom.tsx           # Host Control Room — role panel, phase controls, end-game
      MoleHuntResultsView.tsx           # Leaderboard + collapsible round breakdown
      PlayerMoleResults.tsx             # Player personal score summary

  auth/
    actions.ts                          # PLACEHOLDER — TODO
    components/
      LoginForm.tsx                     # Email + password, Supabase signInWithPassword

components/
  ui/                                   # 10 shadcn primitives (Radix Nova style)
    badge.tsx, button.tsx, card.tsx, checkbox.tsx, dialog.tsx, drawer.tsx,
    dropdown-menu.tsx, input.tsx, label.tsx, progress.tsx

lib/
  pusher/
    client.ts                           # PusherJs browser client (lazy Proxy init)
    server.ts                           # Pusher server client (TLS)
    trigger.ts                          # triggerRoomEvent() + triggerGameEvent()
  supabase/
    client.ts                           # Browser Supabase client
    server.ts                           # Server Supabase client (cookie-based)
    proxy.ts                            # updateSession() — auth middleware
  utils.ts                              # cn() — clsx + tailwind-merge

proxy.ts                                # Next.js middleware entry point
```

---

## Database schema

All tables have RLS disabled. Managed via Supabase dashboard only — no CLI.

### Core
```sql
rooms (
  id UUID PK,
  code TEXT UNIQUE NOT NULL,
  game_type TEXT CHECK IN ('this-or-that','word-chain','mole-hunt'),
  status TEXT DEFAULT 'waiting' CHECK IN ('waiting','active','ended'),
  host_id UUID,
  current_question_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
)

players (
  id UUID PK,
  room_id UUID FK → rooms.id ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### This or That (NEW — rebuilt)
```sql
tot_room_config (
  id UUID PK,
  room_id UUID FK → rooms.id ON DELETE CASCADE,
  time_per_player_seconds INT NOT NULL,
  survivors_to_win INT NOT NULL,
  difficulty TEXT CHECK IN ('easy','moderate','difficult'),
  total_rounds INT NOT NULL,
  selected_category_ids TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)

tot_categories (
  id UUID PK,
  name TEXT NOT NULL,
  difficulty TEXT CHECK IN ('easy','moderate','difficult'),
  points INT CHECK (points IN (1,2,3)),
  created_at TIMESTAMPTZ DEFAULT now()
)

tot_rounds (
  id UUID PK,
  room_id UUID FK → rooms.id ON DELETE CASCADE,
  round_number INT NOT NULL,
  category_id UUID FK → tot_categories.id,
  status TEXT CHECK IN ('active','ended'),
  turn_order JSONB NOT NULL,            -- string[] of player IDs
  current_turn_player_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
)

tot_round_players (
  id UUID PK,
  round_id UUID FK → tot_rounds.id ON DELETE CASCADE,
  player_id UUID FK → players.id ON DELETE CASCADE,
  status TEXT CHECK IN ('active','skipped_this_cycle','eliminated','survivor'),
  skip_used BOOLEAN DEFAULT false,
  turn_index INT,
  created_at TIMESTAMPTZ DEFAULT now()
)

tot_scores (
  id UUID PK,
  round_id UUID FK → tot_rounds.id ON DELETE CASCADE,
  player_id UUID FK → players.id ON DELETE CASCADE,
  points INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### This or That (OLD — deprecated, kept for reference)
```sql
tot_question_bank (id, option_a, option_b, created_at)
tot_questions (id, room_id, option_a, option_b, "order")
tot_votes (id, question_id, player_id, choice) -- UNIQUE (question_id, player_id)
```

### Word Chain
```sql
wc_words (id, room_id, player_id, word, turn_order, created_at)
wc_players (id, room_id, player_id, is_eliminated) -- UNIQUE (room_id, player_id)
```

### Mole Hunt
```sql
mole_topics (id, created_by, title, blurb, image_url, option_a, option_b,
             correct_choice, mole_argument_1, mole_argument_2, mole_argument_3,
             correct_answer_why, created_at)
mole_room_config (room_id PK, mode, mole_count, canary_count,
                  discuss_timer_seconds, vote_timer_seconds, total_rounds,
                  selected_topic_ids TEXT[])
mole_rounds (id, room_id, topic_id, round_number, phase, mole_player_ids,
             canary_player_ids, canary_flagged_ids, correct_choice,
             discuss_timer_seconds, vote_timer_seconds, created_at)
mole_votes (id, round_id, player_id, choice) -- UNIQUE (round_id, player_id)
mole_scores (id, room_id, player_id, total_points, times_mole,
             times_canary, crew_deceived) -- UNIQUE (room_id, player_id)
```

---

## Pusher conventions

> ⚠️ Hyphens only — Pusher free tier does not support colons in channel names

```
room-{code}           # player-joined, room-closed, game-started
room-{code}-host      # host-only events (reserved, not currently used)
room-{code}-game      # all live game state events
```

**Event payloads (common):**
```
player-joined       → { player: Player }
room-closed         → {}
game-started        → { game_type: GameType }
game-ended          → {} for ToT/MH, or { winnerId: string | null } for WC
```

**Event payloads (ToT — new):**
```
round-started       → { roundNumber, roundId, categoryId, categoryName, difficulty,
                        points, turnOrder, currentPlayerId, currentPlayerNickname,
                        timePerPlayerSeconds, totalRounds }
turn-advanced       → { roundId, previousPlayerId, previousPlayerNickname,
                        currentPlayerId, currentPlayerNickname, activePlayerCount }
player-skipped      → { roundId, playerId, playerNickname }
player-eliminated   → { roundId, playerId, playerNickname, reason, activePlayerCount }
round-ended         → { roundId, survivors: [{player_id, nickname}], pointsAwarded }
```

**Event payloads (Mole Hunt):**
```
round-started       → { roundNumber, roundId, phase, topicId, discussTimerSeconds, voteTimerSeconds }
phase-advanced      → { roundId, phase }
vote-submitted      → { roundId, votedCount, totalPlayers }
scores-updated      → { roundId }
```

**Event payloads (Word Chain — unchanged):**
```
word-submitted      → { word, playerId, nextPlayerIndex }
player-eliminated   → { playerId, reason, remainingCount }
```

**Rule:** Always trigger via `triggerRoomEvent()` or `triggerGameEvent()` from `lib/pusher/trigger.ts` — only in API routes, never in actions.ts or client components.

---

## Key conventions

- Browser Supabase client (`lib/supabase/client.ts`) → client components + actions
- Server Supabase client (`lib/supabase/server.ts`) → server components + API routes
- Actions accept optional `SupabaseClient` param — API routes pass server client; client code uses browser client fallback
- `app/` pages are thin wrappers — all logic lives in `features/`
- `components/ui/` is shadcn primitives only — no custom components
- Player identity stored in localStorage as `h6p_player` (set on join, read by PlayerLobbyGate)
- Room codes are 4-char uppercase alphanumeric (e.g. `H6A3`)
- Supabase is source of truth — Pusher only broadcasts change notifications
- Build host view first, then player view for each feature
- SRP — one responsibility per file
- All players excluded from host-count queries via `.neq('is_host', true)`

---

## Notable implementation details

### New This or That (rebuilt July 2, 2026)

**Game mechanic:**
1. Host sets difficulty, time-per-player, survivors_to_win. Selects categories (one per round). Round count = category count.
2. Turn order randomized fresh each round. All players active.
3. Players take turns responding to the category. Must tap "I Answered" on their phone within the time limit, or the host can eliminate them (timeout) or confirm them (they answered verbally).
4. One skip per player per round — pushes them to end of the turn cycle. Second skip returns 409.
5. Round auto-ends when active players remaining ≤ survivors_to_win. Survivors get points = category difficulty (easy=1, moderate=2, difficult=3).
6. Next round: new category, turn order re-randomized, everyone active again.
7. After final round → game ends → results with leaderboard + per-round breakdown.

**Timer is visual/advisory only** — the host manually clicks:
- **"Confirm & Next"** (green) → player answered, advance turn without elimination
- **"Eliminate & Next"** (red) → player timed out, eliminate and advance (or end round if survivors threshold met)

Both buttons work before or after timer expiry. Timer runs to 0 with a red pulsing "Time's up!" state — no API call fires automatically. This prevents silent game stalls from throttled background tabs, WiFi hiccups, or page refreshes.

**Category bank:** 15 starter categories (5 per difficulty) auto-seeded on first game start or category fetch. Hosts can add, edit, or delete categories via TotCategoryManager. Categories are global (all hosts share the same bank).

**Setup flow:** Difficulty select → time-per-player + survivors_to_win → category selection (any number, min 2) → Create Room. Round count auto-equals category count.

**Scoring:** Points awarded per round to each survivor, equal to the category's difficulty value. No points for eliminated players. Final leaderboard = SUM(points) across all rounds.

**Architecture:** Mirrors Mole Hunt patterns exactly — types → actions → API routes → hooks → components → Pusher events. 20 new files, 2 modified. See `PLAN-tot-rebuild.md` for full implementation plan and report.

### Word Chain (unchanged)
- First word: anything goes. Subsequent words must start with last letter of previous word.
- Duplicate words rejected (case-insensitive). Invalid submissions auto-eliminate.
- Elimination API auto-detects game-over when 1 player remains.

### Mole Hunt (unchanged — fully built, critical bugs fixed)
- **Secret protection:** Role assignments NEVER broadcast via Pusher. Only `/api/games/mole-hunt/control-data` (auth-gated, host-only) exposes mole/canary IDs. Players fetch their own role via `/api/games/mole-hunt/my-role` (scoped to their player ID).
- **Two host pages:** Presentation (Zoom share, no role data pre-reveal) + Control Room (private, host actions).
- **Host-start flow:** HostLobby routes Mole Hunt to `/api/games/mole-hunt/start` (not generic `/api/rooms/start`).
- **Recent fixes:** Pusher SSR crash (lazy Proxy init), wrong start API, schema gaps, host-as-player exclusion, scoring fixes, role-aware reveal badges, per-round leaderboard, player timers, outcome toasts.

### Auth middleware
Via `proxy.ts` (not traditional `middleware.ts`). Uses Supabase `getClaims()`. Allows `/play/*`, `/api/*`, `/auth/*`, `/login`, `/` without auth. Everything else → `/auth/login`.

---

## Claude Code plugins & MCPs

| Tool | Rule |
|---|---|
| **ui-ux-pro-max** | Invoke `skill: "ui-ux-pro-max"` before ANY UI task |
| **graphify** | Run `graphify query "<question>"` for codebase questions. Run `graphify update .` after modifying code |
| **engram** | Persistent memory for decisions, bugs, conventions across sessions |
| **shadcn MCP** | Query before using any shadcn component — verify imports, props, composition |

---

## What NOT to do

- No Supabase CLI — all schema changes via dashboard
- No RLS on any table
- No auth on player join — players are anonymous
- No Pusher self-hosting (Soketi)
- No game state in Pusher — Supabase is source of truth
- No Pages Router — App Router only
- No custom components in `components/ui/`
- No business logic in `app/` pages
- No colons in Pusher channel names
- No Pusher triggers from actions.ts or client components
- Do not extend old ToT tables (`tot_question_bank`, `tot_questions`, `tot_votes`) — they're deprecated

---

## What to do next

### Priority 1 — End-to-end testing (next task)
- Test new This or That: Create Room → Lobby → Start → Round 1 (confirm/eliminate/skip) → Round End → Next Round → Game End → Results
- Test Mole Hunt full flow
- Test Word Chain full flow
- Verify Pusher events fire correctly across all games
- Test page refresh / tab background resilience

### Priority 2 — Cleanup
- Remove old ToT files: `features/this-or-that/`, `app/host/[code]/game/`, `app/play/[code]/game/`, old API routes under `app/api/games/this-or-that/vote|advance|end|bank/`
- Remove old ToT results pages: `app/host/[code]/results/`, `app/play/[code]/results/`
- Verify no stale imports reference deleted files

### Priority 3 — Auth stubs + deployment
- Implement `features/auth/actions.ts`
- Build Forgot Password / Sign Up pages (or remove if not needed)
- Vercel deployment with env vars (Supabase URL + key, Pusher keys)

### Priority 4 — Polish (nice-to-have)
- Sound effects for timer countdown / elimination
- Entrance animations on turn changes
- Host-controlled timer duration override mid-game
- "Play Again" flow for players

---

## How to continue in next session

Paste this file and say:

> "Continue high6-play. Here's the handoff."

All three games are feature-complete. This or That was rebuilt (July 2) as a turn-based elimination game with manual host-controlled turn advancement. Next priority: end-to-end testing of all three games.
