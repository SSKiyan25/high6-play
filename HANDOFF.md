# high6-play — Session Handoff
> Last updated: June 20, 2026
> Continue this in Claude.ai (claude.ai) — paste this file at the start of the next session.

---

## What this project is

**high6-play** is an internal web app game hub for High6 Corporation's weekly virtual meetings (<20 members). The host runs a game on a shared screen (Zoom/Meet) while players interact on their own phones via a 4-digit room code. Sessions are 30–40 minutes.

**Two games:**
- **This or That** — host presents two options, players vote simultaneously, results reveal who voted for what
- **Word Chain** — players take turns submitting a word that connects to the previous one, eliminated if they time out or repeat

**Deadline: July 3, 2026**

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js App Router (latest) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Database | Supabase (dashboard-managed, no CLI, RLS disabled) |
| Realtime | Pusher Channels (cloud, free tier) |
| Auth | Supabase Auth — email/password, host/admin only |
| Deployment | Vercel (not yet deployed) |

**Scaffold:** Created with `create-next-app --with-supabase`
- Supabase clients at `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server)
- Env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not ANON_KEY)

---

## Current status

### Done ✅
- [x] Next.js + Supabase scaffold, connected, cleaned up
- [x] Pusher cloud app created, keys in `.env.local`
- [x] shadcn/ui initialized with MCP
- [x] Claude Code plugins: engram, ui-ux-pro-max, graphify
- [x] Supabase tables created (all 7 — see schema below)
- [x] Pusher lib: `lib/pusher/client.ts`, `lib/pusher/server.ts`, `lib/pusher/trigger.ts`
- [x] `features/` folder structure scaffolded
- [x] Room data layer (types, actions, API routes)
- [x] Room frontend (landing, login, dashboard, host lobby, join form, player lobby)
- [x] This or That data layer (types, actions, API routes, question bank)
- [x] Admin auth account created in Supabase dashboard

### Next up 🔜
- [ ] **This or That frontend** ← START HERE
- [ ] Word Chain data layer
- [ ] Word Chain frontend
- [ ] Vercel deployment

---

## Project structure

```
app/
  page.tsx                        # Landing — "I'm the Host" + "Join a Room"
  dashboard/page.tsx              # Host dashboard — create room, pick game
  host/[code]/page.tsx            # Host screen (shared on Zoom)
  play/[code]/page.tsx            # Player phone view
  auth/
    login/page.tsx                # Host login (LoginForm)
    confirm/route.ts              # Supabase email confirmation handler
  api/
    rooms/
      route.ts                    # POST create room, GET fetch room
      join/route.ts               # POST join room
      close/route.ts              # POST close room
    games/
      this-or-that/
        vote/route.ts             # POST submit vote + Pusher trigger
        advance/route.ts          # POST advance question + Pusher trigger
        end/route.ts              # POST end game + Pusher trigger
        bank/route.ts             # GET fetch question bank

features/
  rooms/
    components/
      HostLobby.tsx               # Room code display, live player list, Start Game button
      JoinForm.tsx                # Room code + nickname inputs
      PlayerLobby.tsx             # Confirmation, player list, waiting indicator
      PlayerLobbyGate.tsx         # Reads h6p_player from localStorage, gates access
    hooks/
      useRoom.ts                  # Fetches room from GET /api/rooms?code={code}
      useRoomPlayers.ts           # Pusher subscription for player-joined, room-closed, game-started
    actions.ts                    # createRoom, joinRoom, getRoom, closeRoom
    types.ts                      # Room, Player, RoomWithPlayers, GameType, RoomStatus

  this-or-that/
    components/                   # EMPTY — to be built next
    hooks/
      useThisOrThat.ts            # Placeholder
      useVotes.ts                 # Placeholder
    actions.ts                    # getQuestionBank, saveToQuestionBank, seedRoomQuestions,
                                  # getRoomQuestions, submitVote, getQuestionResults,
                                  # advanceQuestion, endGame
    types.ts                      # Choice, TotQuestion, TotVote, TotQuestionBank,
                                  # TotQuestionInput, TotResults, TotGameState

  word-chain/
    components/                   # EMPTY
    hooks/                        # Placeholders
    actions.ts                    # TODO
    types.ts                      # TODO

  auth/
    components/
      LoginForm.tsx               # Email + password, Supabase auth, redirects to /dashboard
    hooks/                        # Placeholder

components/
  ui/                             # 10 shadcn primitives: badge, button, card, checkbox,
                                  # dialog, drawer, dropdown-menu, input, label, progress

lib/
  pusher/
    client.ts                     # Pusher browser client
    server.ts                     # Pusher server client
    trigger.ts                    # triggerRoomEvent() + triggerGameEvent() helpers
  supabase/
    client.ts                     # Browser Supabase client
    server.ts                     # Server Supabase client
```

---

## Database schema

All tables have RLS disabled. Managed via Supabase dashboard only — no CLI.

```sql
-- Core
rooms (
  id UUID PK,
  code TEXT UNIQUE NOT NULL,           -- 4-char uppercase e.g. H6A3
  game_type TEXT CHECK IN ('this-or-that','word-chain'),
  status TEXT DEFAULT 'waiting'        -- waiting | active | ended
    CHECK IN ('waiting','active','ended'),
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

-- This or That
tot_question_bank (
  id UUID PK,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)

tot_questions (
  id UUID PK,
  room_id UUID FK → rooms.id ON DELETE CASCADE,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 0
)

tot_votes (
  id UUID PK,
  question_id UUID FK → tot_questions.id ON DELETE CASCADE,
  player_id UUID FK → players.id ON DELETE CASCADE,
  choice TEXT CHECK IN ('a','b'),
  UNIQUE (question_id, player_id)      -- prevents double voting
)

-- Word Chain
wc_words (
  id UUID PK,
  room_id UUID FK → rooms.id ON DELETE CASCADE,
  player_id UUID FK → players.id ON DELETE CASCADE,
  word TEXT NOT NULL,
  turn_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)

wc_players (
  id UUID PK,
  room_id UUID FK → rooms.id ON DELETE CASCADE,
  player_id UUID FK → players.id ON DELETE CASCADE,
  is_eliminated BOOLEAN DEFAULT false,
  UNIQUE (room_id, player_id)
)
```

---

## Pusher conventions

> ⚠️ Hyphens only — Pusher free tier does not support colons in channel names

```
room-{code}           # player-joined, room-closed, game-started
room-{code}-host      # host-only events
room-{code}-game      # vote-submitted, question-advanced, game-ended
```

**Pusher event payloads:**
```
player-joined       → { player: Player }
room-closed         → {}
game-started        → { game_type: GameType }
vote-submitted      → { results: TotResults }
question-advanced   → { nextIndex: number }
game-ended          → {}
```

**Rule:** Always trigger via `triggerRoomEvent()` or `triggerGameEvent()` from `lib/pusher/trigger.ts` — only in API routes, never in actions.ts or client components.

---

## Key conventions

- Browser Supabase client (`lib/supabase/client.ts`) → client components + actions
- Server Supabase client (`lib/supabase/server.ts`) → server components + API routes
- `app/` pages are thin wrappers — all logic lives in `features/`
- `components/ui/` is shadcn primitives only — no custom components
- Player identity stored in localStorage as `h6p_player` (set on join, read by PlayerLobbyGate)
- Room codes are 4-char uppercase alphanumeric (e.g. `H6A3`)
- Supabase is source of truth — Pusher only broadcasts change notifications
- Build host view first, then player view for each feature
- SRP — one responsibility per file

---

## Claude Code plugins & MCPs

| Tool | Rule |
|---|---|
| **ui-ux-pro-max** | Invoke `skill: "ui-ux-pro-max"` before ANY UI task |
| **graphify** | Run `graphify query "<question>"` for codebase questions. Run `graphify update .` after modifying code |
| **engram** | Knowledge graph for cross-file relationships |
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

---

## What to build next — This or That frontend

Pick up from here in the next session. The data layer is complete. The frontend needs:

### Dashboard update
- Add a question setup step before creating the room
- Host can browse the `tot_question_bank` and select questions
- Host can add custom questions (saved to bank automatically)
- Minimum 2 questions required to create a room

### Game screens

**Host game screen** (`app/host/[code]/game/page.tsx`)
- Shows current question (option_a vs option_b)
- Shows live vote results as players vote (who voted for what, names visible)
- Has "Next Question" button to advance
- Shows question progress (e.g. Question 2 of 6)
- "End Game" button on last question

**Player game screen** (`app/play/[code]/game/page.tsx`)
- Shows current question
- Two big tap targets — option A and option B
- Locks after voting (shows which they picked)
- Updates when host advances to next question via Pusher

### Hooks to implement
- `features/this-or-that/hooks/useThisOrThat.ts` — manages game state, subscribes to Pusher question-advanced + game-ended
- `features/this-or-that/hooks/useVotes.ts` — subscribes to Pusher vote-submitted, tracks live results

### Design notes
- Dark theme throughout
- Player vote screen: two massive tap targets, mobile-first
- Host screen: results displayed as name chips grouped by choice, not just a percentage bar
- Entrance animations when votes come in live

---

## How to continue in next session

Paste this file and say:

> "Continue high6-play. We're building the This or That frontend next. Here's the handoff."

Then ask for the frontend prompt to send to Claude Code.
