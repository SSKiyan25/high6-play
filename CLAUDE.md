# high6-play

A weekly meeting game hub for High6 Corporation (remote team, <20 members). Built for the host to run on a shared screen while players interact on their own phones via room code. Sessions typically run 30–40 minutes.

## What this app is

- Internal tool, not public-facing
- Host (admin) creates and controls game rooms
- Players join anonymously via a 4-digit room code + nickname
- Two games: **This or That** and **Word Chain**
- Deployed on Vercel (not yet)

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js (App Router, latest) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Database | Supabase (dashboard-managed, no CLI) |
| Realtime | Pusher Channels (cloud, free tier) |
| Auth | Supabase Auth — email/password, host/admin only |
| Deployment | Vercel |

**Scaffold note:** Project was created with `create-next-app --with-supabase`. Supabase client utilities live at:
- `lib/supabase/client.ts` — browser client (use in client components)
- `lib/supabase/server.ts` — server client (use in server components and API routes)

---

## Project structure

```
app/
  page.tsx                      # Landing — "I'm the Host" + "Join a Room"
  layout.tsx                    # Root layout — Geist font, ThemeProvider (dark default)
  globals.css                   # OKLCH CSS variables, dark theme, shadcn imports
  dashboard/
    page.tsx                    # CreateRoom (game selection + question setup flow)
  host/
    [code]/
      page.tsx                  # HostLobby — room code, live player list, start/close
      game/page.tsx             # This or That host game screen (server component)
      wc-game/page.tsx          # Word Chain host game screen (server component)
      results/page.tsx          # This or That results (server component)
      wc-results/page.tsx       # Word Chain results (server component)
  play/
    [code]/
      page.tsx                  # PlayerLobbyGate → PlayerLobby (server component)
      game/page.tsx             # This or That player game screen (client component)
      wc-game/page.tsx          # Word Chain player game screen (client component)
  auth/
    login/page.tsx              # LoginForm
    confirm/route.ts            # Supabase email OTP confirmation handler
    error/page.tsx              # Generic auth error page
    forgot-password/page.tsx    # STUB — TODO
    sign-up/page.tsx            # STUB — TODO
    sign-up-success/page.tsx    # STUB — TODO
    update-password/page.tsx    # STUB — TODO
    loading.tsx                 # Auth loading state
  api/
    rooms/
      route.ts                  # POST create room, GET room by code
      join/route.ts             # POST join room + Pusher player-joined
      close/route.ts            # POST close room + Pusher room-closed
      start/route.ts            # POST start game (host auth check) + Pusher game-started
    games/
      this-or-that/
        vote/route.ts           # POST submit vote + Pusher vote-submitted
        advance/route.ts        # POST advance question + Pusher question-advanced
        end/route.ts            # POST end game + Pusher game-ended
        bank/route.ts           # GET fetch question bank
      word-chain/
        submit/route.ts         # POST submit word + Pusher word-submitted
        eliminate/route.ts      # POST eliminate player + Pusher player-eliminated (+ auto-end)
        end/route.ts            # POST end game + Pusher game-ended

features/
  rooms/
    types.ts                    # Room, Player, RoomWithPlayers, GameType, RoomStatus
    actions.ts                  # createRoom, joinRoom, getRoom, closeRoom (+ generateRoomCode)
    hooks/
      useRoom.ts                # Fetches room from GET /api/rooms?code=
      useRoomPlayers.ts         # Pusher subscription for player-joined, room-closed, game-started
    components/
      CreateRoom.tsx            # Game selection → question setup (ToT) or instant create (WC)
      HostLobby.tsx             # Room code (copyable), player list (live), Start Game, Close Room
      JoinForm.tsx              # 4-char code + nickname inputs, localStorage h6p_player
      PlayerLobby.tsx           # Confirmation, player list, waiting for host
      PlayerLobbyGate.tsx       # Reads h6p_player from localStorage, gates access

  this-or-that/
    types.ts                    # Choice, TotQuestion, TotVote, TotQuestionBank, TotQuestionInput,
                                #   TotResults, TotGameState, TotVoteWithNickname, TotQuestionResult
    actions.ts                  # getQuestionBank, saveToQuestionBank, seedRoomQuestions,
                                #   getRoomQuestions, submitVote (upsert), getQuestionResults,
                                #   advanceQuestion, getFullResults, endGame
    hooks/
      useThisOrThat.ts          # Pusher sub for question-advanced + game-ended, returns current question
      useVotes.ts               # Pusher sub for vote-submitted, fires onAllVoted when all votes in
    components/
      HostView.tsx              # 30s timer (auto-advance), vote chips per option, progress bar, end game
      PlayerView.tsx            # Two massive tap targets (A/B), vote locking, "Your pick" badge
      QuestionSetup.tsx         # Bank browser + custom question creator, minimum 2 required
      TotResultsView.tsx        # Per-question results with winner/tie badges, player chips, percentages

  word-chain/
    types.ts                    # WcWord, WcPlayer, WcPlayerWithNickname, WcGameState,
                                #   WcTurnResult, WcFullResults
    actions.ts                  # initWcPlayers, submitWord (validates letter + duplicates),
                                #   eliminatePlayer, getWcPlayers, getWcWords,
                                #   getWcGameState, endWcGame, getWcFullResults
    hooks/
      useWordChain.ts           # Pusher sub for word-submitted, player-eliminated, game-ended
      useTurnTimer.ts           # 30s countdown, resets on turn change, fires onTimeout
    components/
      HostWcView.tsx            # Word chain display, active/eliminated player lists, timer,
                                #   manual elimination, end game, game-over winner screen
      PlayerWcView.tsx          # Word input with required letter hint, chain mini-view, timer,
                                #   elimination state with reason, game-over winner/loser screen
      WcResultsView.tsx         # Winner section, full word chain, elimination order with reason badges

  auth/
    actions.ts                  # PLACEHOLDER — TODO (LoginForm calls Supabase directly)
    components/
      LoginForm.tsx             # Email + password, Supabase signInWithPassword, redirects to /dashboard

components/
  ui/                           # 10 shadcn primitives (Radix Nova style):
                                #   badge, button, card, checkbox, dialog, drawer,
                                #   dropdown-menu, input, label, progress

lib/
  pusher/
    client.ts                   # PusherJs browser client
    server.ts                   # Pusher server client (TLS)
    trigger.ts                  # triggerRoomEvent() + triggerGameEvent() — server-side only
  supabase/
    client.ts                   # Browser Supabase client (createBrowserClient from @supabase/ssr)
    server.ts                   # Server Supabase client (createServerClient, cookie-based)
    proxy.ts                    # updateSession() — auth middleware, checks getClaims()
  utils.ts                      # cn() — clsx + tailwind-merge

proxy.ts                        # Next.js middleware entry point — delegates to updateSession()
```

**Structure rules:**
- `features/` owns all domain logic — components, hooks, actions, types per feature
- `app/` handles routing only — pages are thin, they import from `features/`
- `components/ui/` is shadcn primitives only — no custom components here
- Cross-feature shared UI (Timer, Scoreboard) goes in `features/shared/`
- One responsibility per file — no god components

---

## Environment variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Pusher
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
PUSHER_APP_ID=
PUSHER_SECRET=
```

---

## Database schema

All tables are managed via the Supabase dashboard. **RLS is disabled** on all tables (internal app, no sensitive data).

```sql
-- Core
rooms         id, code (4-char unique), game_type, status, host_id, created_at
players       id, room_id, nickname, is_host, score, created_at

-- This or That
tot_question_bank id, option_a, option_b, created_at
tot_questions id, room_id, option_a, option_b, order
tot_votes     id, question_id, player_id, choice (a | b)

-- Word Chain
wc_words      id, room_id, player_id, word, turn_order, created_at
wc_players    id, room_id, player_id, is_eliminated
```

---

## Realtime — Pusher channel conventions

```
room-{code}           # Global room events (player-joined, game-started, game-ended)
room-{code}-host      # Host-only events (reserved, not currently used)
room-{code}-game      # Live game state (votes, words submitted, timer ticks, eliminations)
```

> ⚠️ Use hyphens only — Pusher free tier does not support colons in channel names.

**Event payloads:**
```
player-joined       → { player: Player }
room-closed         → {}
game-started        → { game_type: GameType }
vote-submitted      → { results: TotResults }
question-advanced   → { nextIndex: number }
game-ended          → {} (ToT) or { winnerId: string | null } (WC)
word-submitted      → { word: string, playerId: string, nextPlayerIndex: number }
player-eliminated   → { playerId: string, reason: string, remainingCount: number }
```

Events are triggered server-side via `lib/pusher/trigger.ts` using `triggerRoomEvent()` or `triggerGameEvent()`. Never trigger Pusher events directly from client components or actions.ts.

---

## Auth

- Supabase Auth, email/password only
- One admin account (the host) — already created in Supabase dashboard
- Players do NOT authenticate — they join via room code + nickname
- Auth protection via `proxy.ts` middleware (delegates to `lib/supabase/proxy.ts` `updateSession()`)
- Protected routes: `/dashboard`, `/host/*`, `/auth/*` — require user session
- Public routes: `/` (landing), `/play/*` (player views), `/api/*` (API routes)
- Get current user via `supabase.auth.getClaims()` in middleware, `supabase.auth.getUser()` at runtime — no hardcoded IDs

---

## Game rules

### This or That
- Host presents a choice (e.g. "Coffee or Energy Drink?")
- All players vote simultaneously on their phone
- Results reveal as live vote chips showing who voted for what (names visible)
- Auto-advances when all players vote OR after 30-second timer expires
- Host has an "End Game" button on the last question
- Questions are pre-loaded per room session (minimum 2 required)
- Host selects questions from a reusable bank + can add custom questions

### Word Chain
- Players take turns submitting one word that connects to the previous word
- Each turn has a countdown timer
- A player is eliminated if they: run out of time, repeat a word, or submit an invalid connection
- Last player standing wins
- Host can see the full chain on the host screen

---

## Key conventions

- Use **browser Supabase client** (`lib/supabase/client.ts`) in all client components and actions
- Use **server Supabase client** (`lib/supabase/server.ts`) in server components and API routes
- Pusher events are always **triggered from API routes** via `triggerRoomEvent()`, never from actions.ts or client components
- Room codes are **4 characters**, uppercase alphanumeric (e.g. `H6A3`)
- All game state lives in **Supabase** — Pusher is only for broadcasting change notifications
- Build **host view first**, then player view for each feature
- Follow SRP — one responsibility per file, one concern per feature folder

---

## Claude Code plugins

### engram
Knowledge graph for cross-file relationships. Installed at user scope.

### graphify
AST-based codebase graph stored at `graphify-out/`.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists
- Use `graphify path "<A>" "<B>"` for relationships between two files/concepts
- Use `graphify explain "<concept>"` for focused deep dives
- After modifying code, always run `graphify update .` to keep the graph current
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review

### ui-ux-pro-max
UI/UX design intelligence — 67 styles, 96 palettes, 57 font pairings, shadcn/ui integration.

Rules:
- **Always** invoke `skill: "ui-ux-pro-max"` before any UI task
- Trigger on: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check — when applied to UI/UX work
- Covers: components, layouts, dashboards, mobile views, forms, cards, modals

---

## MCP servers

### shadcn/ui MCP
Configured via `.mcp.json`. Use for component search and usage examples before building any shadcn component.

Rules:
- Query the shadcn MCP before implementing any new UI component
- Use it to verify correct import paths, prop APIs, and composition patterns
- Do not hand-roll components that shadcn already provides

---

## What NOT to do

- Do not use Supabase CLI or migration files — all schema changes via dashboard
- Do not enable RLS on any table
- Do not add auth to player join flow — players are anonymous
- Do not self-host Pusher (Soketi) — use Pusher cloud
- Do not store game state in Pusher — Supabase is the source of truth
- Do not use the Pages Router — this is App Router only
- Do not put custom components in `components/ui/` — shadcn primitives only
- Do not put business logic in `app/` pages — delegate to `features/`
- Do not use colons in Pusher channel names — use hyphens only
- Do not trigger Pusher events from actions.ts or client components — API routes only

---

## Current status

- [x] Next.js + Supabase scaffold set up (`--with-supabase`)
- [x] Supabase project connected
- [x] Pusher app created (keys in `.env.local`)
- [x] shadcn/ui initialized (with MCP, 10 primitives, Radix Nova style)
- [x] Claude Code plugins: engram, ui-ux-pro-max, graphify
- [x] Supabase tables created (rooms, players, tot_question_bank, tot_questions, tot_votes, wc_words, wc_players, mole_topics, mole_room_config, mole_rounds, mole_votes, mole_scores)
- [x] Pusher lib set up (`lib/pusher/client.ts`, `lib/pusher/server.ts`, `lib/pusher/trigger.ts`)
- [x] `features/` folder structure scaffolded
- [x] Room data layer (types, actions, API routes)
- [x] Room frontend (landing, login, dashboard, host lobby, join form, player lobby)
- [x] This or That — full game (types, actions, 4 API routes, 2 hooks, 4 components, results page)
- [x] Word Chain — full game (types, actions, 3 API routes, 2 hooks, 3 components, results page)
- [x] Host dashboard (game selection + question setup flow)
- [x] Auth middleware via proxy.ts
- [x] Mole Hunt — full game (types, actions, 10 API routes, 2 hooks, 7 components, results, control room)
- [x] Mole Hunt — schema fixed: added correct_choice column; INSERTs populate all NOT NULL columns
- [x] Pusher client lazy Proxy init (prevents SSR/Turbopack crash)
- [x] HostLobby routes Mole Hunt to game-specific /api/games/mole-hunt/start
- [ ] Auth actions (placeholder) + forgot-password/sign-up stub pages
- [ ] Vercel deployment