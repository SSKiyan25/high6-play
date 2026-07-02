# high6-play — Session Handoff
> Last updated: July 3, 2026
> Continue this in Claude.ai — paste this file at the start of the next session.

---

## What this project is

**high6-play** is an internal web app game hub for High6 Corporation's weekly virtual meetings (<20 members). The host runs a game on a shared screen (Zoom/Meet) while players interact on their own phones via a 4-digit room code. Sessions are 30–40 minutes.

**Three games:**

| Game | Mechanic | Status |
|------|----------|--------|
| **Word Chain** | Category-based turn elimination. Players take turns in a category under time pressure. One skip per round. Survivors earn points. | ✅ Built |
| **Mole Hunt** | Trivia + social deduction. Hidden Moles deceive the Crew. Canaries must speak up. | ✅ Built |
| **This or That** (legacy) | Binary simultaneous vote. Hidden from UI. | Deprecated |

**Deadline: July 3, 2026** — Word Chain is the active focus. Mole Hunt is stable.

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 App Router (Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix Nova) |
| Database | Supabase (dashboard-managed, RLS disabled) |
| Realtime | Pusher Channels (cloud, free tier, hyphens-only channel names) |
| Auth | Supabase Auth — email/password, host/admin only |
| Deployment | Vercel (not yet) |
| Font | Geist (next/font/google), dark mode default |

---

## Current status

### Word Chain (category-based elimination) ✅
- **Setup**: Config (time + survivors) → Category selection (with Select All) → Create room
- **Categories**: Global bank with difficulty (easy=1pt, moderate=2pt, difficult=3pt), auto-seeded 15 starters
- **Rounds**: One per category, random turn order, 5-second buffer before first turn
- **Player**: Skip button only (one per round), category display, score, timer with red warning
- **Host**: Turn order with live status, Confirm & Next + Eliminate & Next buttons, Force End Game with confirmation
- **Results**: Leaderboard + collapsible per-round breakdown, host → /dashboard, player → /
- **Lobby**: Collapsible rules panel in both PlayerLobby and HostLobby

### Mole Hunt ✅
- Role assignment with avoidance, 3-phase rounds (discuss → vote → reveal), scoring, control room, results
- Standalone creation at `/dashboard/mole-hunt`

### Auth ✅
- Login working, proxy.ts middleware, protected routes

### Remaining
- [ ] Vercel deployment
- [ ] Auth stubs (forgot-password, sign-up pages)
- [ ] Old ToT file cleanup (features/this-or-that/, old API routes)
- [ ] End-to-end testing

---

## Project structure (current)

```
app/
  page.tsx                              # Landing — "I'm the Host" + "Join a Room"
  dashboard/
    page.tsx                            # WordChainSetup directly (no game selection)
    mole-hunt/page.tsx                  # Standalone Mole Hunt creation
  host/[code]/
    page.tsx                            # HostLobby
    wc-game/page.tsx                    # WordChainPresentation (host)
    wc-results/page.tsx                 # WordChainResultsView (host, isHost=true)
    mh-game/page.tsx                    # MoleHuntPresentation
    mh-results/page.tsx                 # MoleHuntResultsView
    mole-control/page.tsx               # MoleHuntControlRoom
    wc-game-legacy-letterchain/         # Old letter-chain WC (preserved)
    wc-results-legacy-letterchain/      # Old letter-chain WC results
    game/page.tsx, results/page.tsx     # Old binary ToT (unused)
  play/[code]/
    page.tsx                            # PlayerLobbyGate → PlayerLobby
    wc-game/page.tsx                    # WordChainPlayerView (client)
    wc-results/page.tsx                 # WordChainResultsView (player)
    mh-game/page.tsx                    # MoleHunt PlayerView
    mh-results/page.tsx                 # MoleHunt player results
    wc-game-legacy-letterchain/         # Old letter-chain WC player (preserved)
    game/page.tsx                       # Old binary ToT (unused)
  auth/                                 # Login + stubs
  api/
    rooms/                              # CRUD + join + close + start (generic)
    games/
      word-chain/                       # Category-based elimination (was tot)
        start/                          # POST — starts game, fires round-started
        confirm-turn/                   # POST — player confirms, advances turn
        skip/                           # POST — player skips (once per round)
        advance-turn/                   # POST — host eliminates player
        next-round/                     # POST — host starts next round
        end-game/                       # POST — host ends game
        categories/ + categories/[id]/  # CRUD for category bank
      word-chain-legacy-letterchain/    # Old letter-chain (submit/eliminate/end)
      mole-hunt/                        # 11 routes (topics, start, vote, etc.)
      this-or-that/                     # 4 old routes (unused)

features/
  word-chain/                           # Category-based elimination (was features/tot/)
    types.ts                            # WordChainDifficulty, WordChainCategory, WordChainRoomConfig,
                                        #   WordChainRound, WordChainRoundPlayer, WordChainScore,
                                        #   WordChainGameState, WordChainTurnResult, SEED_CATEGORIES
    actions.ts                          # Category CRUD, seedCategories, saveRoomConfig,
                                        #   startGame, confirmTurn, skipTurn, advanceTurn,
                                        #   endRound, endRoundInternal, startNextRound, endGame,
                                        #   getResults, getCurrentRound, getRoundState
    hooks/useWordChain.ts               # Pusher sub + Supabase fetch, buffering phase
    components/
      WordChainSetup.tsx                # Config → category selection → create
      WordChainCategoryManager.tsx      # CRUD for categories
      WordChainPresentation.tsx         # Host presenter with buffer, timer, host controls
      WordChainPlayerView.tsx           # Player: skip button, timer, category, score
      WordChainResultsView.tsx          # Shared results + leaderboard (isHost prop)
  word-chain-legacy-letterchain/        # Old letter-chain (preserved, not active)
  mole-hunt/                            # Full Mole Hunt (types, actions, hooks, 8 components)
  rooms/                                # Room CRUD, lobby components, join form
  this-or-that/                         # Old binary ToT (deprecated)
  auth/                                 # LoginForm

components/ui/                          # 10 shadcn primitives (badge, button, card, checkbox,
                                        #   dialog, drawer, dropdown-menu, input, label, progress)
lib/
  pusher/ (client, server, trigger)
  supabase/ (client, server, proxy)
  utils.ts
proxy.ts                                # Auth middleware
```

---

## Database schema (active tables)

### Category-based Word Chain (was tot_* — migrated to wc_*)
```sql
wc_categories (id, name, difficulty, points, created_at)
wc_room_config (id, room_id UNIQUE, time_per_player_seconds, survivors_to_win,
                difficulty, total_rounds, selected_category_ids TEXT[], created_at)
wc_rounds (id, room_id FK, round_number, category_id FK, status CHECK('active','ended'),
           turn_order JSONB, current_turn_player_id, created_at)
wc_round_players (id, round_id FK, player_id FK, status CHECK('active','skipped_this_cycle',
                  'eliminated','survivor'), skip_used, turn_index, created_at)
wc_scores (id, round_id FK, player_id FK, points, created_at)
```

### Mole Hunt
```sql
mole_topics, mole_room_config, mole_rounds, mole_votes, mole_scores
```

### Core
```sql
rooms (id, code UNIQUE, game_type CHECK('this-or-that','word-chain','mole-hunt'),
       status CHECK('waiting','active','ended'), host_id, created_at)
players (id, room_id FK, nickname, is_host, score, created_at)
```

### Legacy
```sql
tot_question_bank, tot_questions, tot_votes     # Old binary ToT
wc_words, wc_players                            # Old letter-chain WC
```

---

## DB constraints fixed this session

Run these if setting up a fresh database:
```sql
-- wc_room_config: selected_category_ids column
ALTER TABLE public.wc_room_config ADD COLUMN IF NOT EXISTS selected_category_ids text[] NOT NULL DEFAULT '{}';
-- wc_room_config: unique constraint for upsert
ALTER TABLE public.wc_room_config ADD CONSTRAINT wc_room_config_room_id_key UNIQUE (room_id);
-- wc_rounds: status check constraint allows 'ended'
ALTER TABLE public.wc_rounds DROP CONSTRAINT IF EXISTS tot_rounds_status_check;
ALTER TABLE public.wc_rounds ADD CONSTRAINT wc_rounds_status_check CHECK (status IN ('active', 'ended'));
```

---

## Pusher conventions

```
room-{code}           # player-joined, room-closed, game-started
room-{code}-game      # All game events
```

**Word Chain events:** `round-started` (with bufferSeconds), `turn-advanced`, `player-skipped`, `player-eliminated`, `round-ended`, `game-ended`

Rule: trigger via `triggerRoomEvent()` / `triggerGameEvent()` from API routes only.

---

## Key conventions

- Browser Supabase client → client components + actions (fallback)
- Server Supabase client → server components + API routes
- **Actions accept optional `SupabaseClient`** — API routes pass server client; use `getClient(client?)` pattern
- `app/` pages are thin wrappers — all logic in `features/`
- `components/ui/` is shadcn primitives only
- Player identity: `localStorage.h6p_player` = `{ nickname, playerId, roomCode }`
- Room codes: 4-char uppercase alphanumeric
- Supabase = source of truth, Pusher = change notifications
- Host excluded from player counts: `.neq('is_host', true)`

---

## Recent bug fixes (July 3)

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Players stuck in lobby | JoinForm didn't save roomCode to localStorage | Added roomCode to h6p_player |
| Room creation 400 | Missing selected_category_ids column | Added column + unique constraint |
| Next round "must be ended" | endRoundInternal didn't error-check update + used anon client | Error-check + client passthrough |
| Round end constraint violation | tot_rounds_status_check didn't allow 'ended' | Replaced constraint |
| Eliminated player shown as current | turn-advanced overwrote eliminated status to 'active' | Removed status overwrite from handler |
| No buffer on round 1 | Initial load bypassed buffer | Added buffer to initial useEffect |
| Results → host dashboard for players | WordChainResultsView hardcoded /dashboard | Added isHost prop |
| tot-results 404 | Stale route name from migration | Fixed to wc-results |

---

## What to do next

1. **End-to-end testing** — Full Word Chain flow: create → join → play rounds → results
2. **Vercel deployment** — env vars (Supabase URL+key, Pusher keys)
3. **Cleanup** — Remove old this-or-that files, old WC legacy routes if not needed
4. **Auth stubs** — Implement or remove forgot-password/sign-up pages
