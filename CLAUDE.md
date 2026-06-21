# high6-play

A weekly meeting game hub for High6 Corporation (remote team, <20 members). Built for the host to run on a shared screen while players interact on their own phones via room code. Sessions typically run 30–40 minutes.

## What this app is

- Internal tool, not public-facing
- Host (admin) creates and controls game rooms
- Players join anonymously via a 4-digit room code + nickname
- Two games: **This or That** and **Word Chain**
- Deployed on Vercel

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
  page.tsx                      # Landing — host login or join room (nickname + code)
  dashboard/
    page.tsx                    # Host dashboard — create room, pick game
  host/
    [code]/
      page.tsx                  # Host screen (shared on Zoom/Meet)
  play/
    [code]/
      page.tsx                  # Player phone view
  api/
    rooms/
      route.ts                  # POST create room, GET room by code
      join/route.ts             # POST join room
      close/route.ts            # POST close room
    games/
      this-or-that/
        route.ts
      word-chain/
        route.ts

features/
  rooms/
    components/                 # CreateRoom, JoinRoom, Lobby
    hooks/                      # useRoom, useRoomPlayers
    actions.ts                  # createRoom, joinRoom, closeRoom
    types.ts                    # Room, Player, RoomWithPlayers, GameType, RoomStatus

  this-or-that/
    components/                 # HostView, PlayerView, VoteButton, ResultsReveal
    hooks/                      # useThisOrThat, useVotes
    actions.ts                  # submitVote, nextQuestion, loadQuestions
    types.ts

  word-chain/
    components/                 # HostView, PlayerView, WordInput, Timer, EliminationBanner
    hooks/                      # useWordChain, useTurnTimer
    actions.ts                  # submitWord, eliminatePlayer, advanceTurn
    types.ts

  auth/
    components/                 # LoginForm
    hooks/                      # useHost
    actions.ts

components/
  ui/                           # shadcn primitives only (Button, Card, Input...)

lib/
  pusher/
    client.ts                   # Pusher browser client
    server.ts                   # Pusher server client (for triggering events)
    trigger.ts                  # triggerRoomEvent() helper — server-side only
  supabase/
    client.ts                   # Browser Supabase client
    server.ts                   # Server Supabase client
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
room-{code}-host      # Host-only events (player list updates)
room-{code}-game      # Live game state (votes, words submitted, timer ticks, eliminations)
```

> ⚠️ Use hyphens only — Pusher free tier does not support colons in channel names.

Events are triggered server-side via `lib/pusher/trigger.ts` using `triggerRoomEvent()`. Never trigger Pusher events directly from client components or actions.ts.

---

## Auth

- Supabase Auth, email/password only
- One admin account (the host) — already created in Supabase dashboard
- Players do NOT authenticate — they join via room code + nickname
- Protect `/dashboard` and `/host/[code]` routes via middleware
- `/play/[code]` is public — no auth required
- Get current user via `supabase.auth.getUser()` at runtime — no hardcoded IDs

---

## Game rules

### This or That
- Host presents a choice (e.g. "Coffee or Energy Drink?")
- All players vote simultaneously on their phone
- Results reveal as a split showing who voted for what (names visible)
- Host controls pacing — manually advances to next question
- Questions are pre-loaded per room session

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
- [x] shadcn/ui initialized (with MCP)
- [x] Claude Code plugins: engram, ui-ux-pro-max, graphify
- [x] Supabase tables created (rooms, players, tot_questions, tot_votes, wc_words, wc_players)
- [x] Pusher lib set up (`lib/pusher/client.ts`, `lib/pusher/server.ts`, `lib/pusher/trigger.ts`)
- [x] `features/` folder structure scaffolded
- [x] Room data layer (types, actions, API routes)
- [ ] Room frontend (host lobby, player join view)
- [ ] This or That game
- [ ] Word Chain game
- [ ] Host dashboard
- [ ] Vercel deployment