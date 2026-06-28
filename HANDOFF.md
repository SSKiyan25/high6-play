# high6-play — Session Handoff
> Last updated: June 27, 2026
> Continue this in Claude.ai (claude.ai) — paste this file at the start of the next session.

---

## What this project is

**high6-play** is an internal web app game hub for High6 Corporation's weekly virtual meetings (<20 members). The host runs a game on a shared screen (Zoom/Meet) while players interact on their own phones via a 4-digit room code. Sessions are 30–40 minutes.

**Three games:**
- **This or That** — host presents two options, players vote simultaneously, results reveal who voted for what
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
- [x] Supabase tables created (all 12 — rooms, players, tot_question_bank, tot_questions, tot_votes, wc_words, wc_players, mole_topics, mole_room_config, mole_rounds, mole_votes, mole_scores)
- [x] `rooms.game_type` CHECK constraint widened to include 'mole-hunt'
- [x] Pusher lib: `lib/pusher/client.ts`, `lib/pusher/server.ts`, `lib/pusher/trigger.ts`
- [x] Room Flow — types, actions (createRoom, joinRoom, getRoom, closeRoom), API routes (CRUD + join + close + start), hooks (useRoom, useRoomPlayers), components (HostLobby, JoinForm, PlayerLobby, PlayerLobbyGate, CreateRoom)
- [x] This or That — types, actions (full CRUD + question bank + seed + results), 4 API routes (vote, advance, end, bank), hooks (useThisOrThat, useVotes), components (HostView, PlayerView, QuestionSetup, TotResultsView)
- [x] Word Chain — types, actions (initWcPlayers, submitWord, eliminatePlayer, game state, full results), 3 API routes (submit, eliminate, end), hooks (useWordChain, useTurnTimer), components (HostWcView, PlayerWcView, WcResultsView)
- [x] Host Login — LoginForm component, login page, email confirmation handler
- [x] Landing page — "I'm the Host" → login, "Join a Room" → JoinForm
- [x] Dashboard — game selection (This or That → question setup, Word Chain → instant create)
- [x] Question setup flow — browse bank + add custom questions, minimum 2 required
- [x] Auto-advance with 30s fallback timer on This or That host view
- [x] Results pages for both games (per-question breakdown for ToT, elimination order for WC)
- [x] Word Chain game-over auto-detection in eliminate API route (last player standing wins)
- [x] Dark theme throughout (OKLCH-based, custom cyan-blue primary + teal accent)
- [x] Auth proxy middleware at `proxy.ts` (protects non-public routes, allows `/play/*` and `/api/*`)
- [x] Admin auth account created in Supabase dashboard
- [x] Mole Hunt — data layer: types (MoleTopic, MoleTopicInput, MoleRoomConfig, MoleRoomConfigInput, MoleMode), actions (topic CRUD + room config upsert with validation), API routes (topics GET/POST/PUT/DELETE)
- [x] Mole Hunt — host setup screens: MoleHuntSetup (mode select + room config form + Manage Topics), TopicBankManager (create/edit/delete topics with dialog), Mole Hunt card in CreateRoom dashboard
- [x] Mole Hunt — round flow backend: types (MolePhase, MoleRole, MoleRound, MoleVote, MyRoleResponse, RoundScoreSummary), actions (startGame, advancePhase, submitVote, getMyRole, calculateAndSaveScores, deductCanaryPoints, getCurrentRound), 6 API routes (start, advance-phase, vote, my-role, score, canary-deduct), Pusher events (round-started, phase-advanced, vote-submitted, scores-updated)
- [x] Mole Hunt — Phase 2 Player View + Presentation: useMoleHunt hook (Pusher sub for round-started/phase-advanced/vote-submitted/scores-updated, fetches my-role independently), PlayerView (phase-aware: discuss/vote/reveal/assigning, role-specific banners, vote locking), MoleHuntPresentation (Zoom share screen, secret-safe — Mole/Canary only in reveal, vote progress, timers), page wrappers (app/play/[code]/mh-game/, app/host/[code]/mh-game/), PlayerLobby routing fix for mole-hunt game type
- [x] Mole Hunt — Phase 3 Final (Control Room + Results & Leaderboard): useMoleHuntControl hook (host-only Pusher sub, fetches secret role data via control-data API), MoleHuntControlRoom (host control UI with role panel, phase controls, Canary deduct, end-game), MoleHuntResultsView (host leaderboard with gold/silver/bronze, Most Deceptive Mole callout, collapsible round breakdown), PlayerMoleResults (player personal score summary), control-data API route (auth-gated GET, only endpoint exposing mole/canary IDs), player-results API route, page wrappers (mole-control, mh-results host, mh-results player), game-ended redirects in PlayerView and MoleHuntPresentation

### Partial / stubs ⚠️
- [ ] `features/auth/actions.ts` — placeholder, no login/logout/signUp actions implemented (LoginForm calls Supabase directly)
- [ ] `app/auth/forgot-password/page.tsx` — stub ("coming soon")
- [ ] `app/auth/sign-up/page.tsx` — stub ("coming soon")
- [ ] `app/auth/sign-up-success/page.tsx` — stub
- [ ] `app/auth/update-password/page.tsx` — stub

### Not done 🔜
- [ ] Vercel deployment
- [ ] No dedicated `middleware.ts` — auth is handled via `proxy.ts` using Supabase `getClaims()`. Verify this is properly wired in production.

---

## Full project structure

```
app/
  page.tsx                              # Landing — "I'm the Host" + "Join a Room"
  layout.tsx                            # Root layout — Geist font, ThemeProvider (dark default)
  globals.css                           # OKLCH CSS variables, dark theme, shadcn imports
  dashboard/
    page.tsx                            # CreateRoom (game selection + question setup)
  host/
    [code]/
      page.tsx                          # HostLobby — room code, player list, start/close
      game/page.tsx                     # This or That host game screen (server component)
      wc-game/page.tsx                  # Word Chain host game screen (server component)
      mh-game/page.tsx                  # Mole Hunt host presentation screen (server component)
      mole-control/page.tsx            # Mole Hunt host Control Room (server component)
      mh-results/page.tsx              # Mole Hunt host results (server component)
      results/page.tsx                  # This or That results (server component)
      wc-results/page.tsx               # Word Chain results (server component)
  play/
    [code]/
      page.tsx                          # PlayerLobbyGate → PlayerLobby (server component)
      game/page.tsx                     # This or That player game screen (client component)
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
      close/route.ts                    # POST close room + Pusher room-closed
      start/route.ts                    # POST start game (host auth check) + Pusher game-started
    games/
      this-or-that/
        vote/route.ts                   # POST submit vote + Pusher vote-submitted
        advance/route.ts                # POST advance question + Pusher question-advanced
        end/route.ts                    # POST end game + Pusher game-ended
        bank/route.ts                   # GET fetch question bank
      word-chain/
        submit/route.ts                 # POST submit word + Pusher word-submitted
        eliminate/route.ts              # POST eliminate player + Pusher player-eliminated (auto-ends if 1 left)
        end/route.ts                    # POST end game + Pusher game-ended
      mole-hunt/
        topics/
          route.ts                      # GET fetch host's topic bank, POST create topic
          [id]/
            route.ts                    # PUT update topic, DELETE delete topic (both auth-gated)
        start/route.ts                  # POST start game (host auth, validates counts/topics, assigns roles)
        advance-phase/route.ts          # POST advance phase (host auth, creates next round after reveal)
        vote/route.ts                   # POST submit player vote (player identity from body)
        my-role/route.ts                # GET return player role + topic (never exposes role arrays)
        score/route.ts                  # POST calculate + upsert scores after reveal (host auth)
        canary-deduct/route.ts          # POST deduct 50 pts from silent Canary (host auth)
        control-data/route.ts           # GET host-only control data — exposes mole/canary IDs
        player-results/route.ts         # GET player personal score summary

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
      CreateRoom.tsx                    # Game selection → question setup (ToT) or instant create (WC)

  this-or-that/
    types.ts                            # Choice, TotQuestion, TotVote, TotQuestionBank, TotQuestionInput,
                                        #   TotResults, TotGameState, TotVoteWithNickname, TotQuestionResult
    actions.ts                          # getQuestionBank, saveToQuestionBank, seedRoomQuestions,
                                        #   getRoomQuestions, submitVote (upsert), getQuestionResults,
                                        #   advanceQuestion, getFullResults, endGame
    hooks/
      useThisOrThat.ts                  # Pusher sub for question-advanced + game-ended, returns current question
      useVotes.ts                       # Pusher sub for vote-submitted, fires onAllVoted when all votes in
    components/
      HostView.tsx                      # 30s timer (auto-advance), vote chips per option, progress bar, end game
      PlayerView.tsx                    # Two massive tap targets (A/B), vote locking, "Your pick" badge
      QuestionSetup.tsx                 # Bank browser + custom question creator, minimum 2 required
      TotResultsView.tsx                # Per-question results with winner/tie badges, player chips, percentages

  word-chain/
    types.ts                            # WcWord, WcPlayer, WcPlayerWithNickname, WcGameState,
                                        #   WcTurnResult, WcFullResults
    actions.ts                          # initWcPlayers, submitWord (validates letter + duplicates),
                                        #   eliminatePlayer, getWcPlayers, getWcWords,
                                        #   getWcGameState, endWcGame, getWcFullResults
    hooks/
      useWordChain.ts                   # Pusher sub for word-submitted, player-eliminated, game-ended
      useTurnTimer.ts                   # 30s countdown, resets on turn change, fires onTimeout
    components/
      HostWcView.tsx                    # Word chain display, active/eliminated player lists, timer, manual
                                        #   elimination, end game button, game-over winner screen
      PlayerWcView.tsx                  # Word input with required letter hint, chain mini-view, timer,
                                        #   elimination state with reason, game-over winner/loser screen
      WcResultsView.tsx                 # Winner section, full word chain with turn numbers,
                                        #   elimination order (reversed) with reason badges

  mole-hunt/
    types.ts                            # MoleMode, MoleTopic, MoleTopicInput, MoleRoomConfig,
                                        #   MoleRoomConfigInput, MolePhase, MoleRole, MoleRound,
                                        #   MoleVote, MyRoleResponse, RoundScoreSummary
    actions.ts                          # getTopicBank, createTopic, updateTopic, deleteTopic,
                                        #   getRoomConfig, saveRoomConfig (upsert + validation),
                                        #   startGame, advancePhase, submitVote, getMyRole,
                                        #   calculateAndSaveScores, deductCanaryPoints, getCurrentRound
    hooks/
      useMoleHunt.ts                    # Pusher sub for round-started/phase-advanced/vote-submitted/
                                        #   scores-updated/game-ended, fetches my-role via API independently
      useMoleHuntControl.ts             # Host-only hook — Pusher sub + control-data API fetches
    components/
      MoleHuntSetup.tsx                 # Mode select + room config form + Manage Topics link
      TopicBankManager.tsx              # Create/edit/delete topics, inline form + dialog edit
      ModeDefaults.ts                   # Easy/Moderate/Hard constants with default counts/timers/rounds
      PlayerView.tsx                    # Phase-aware player UI (discuss/vote/reveal/assigning),
                                        #   role-specific banners (Mole persuasion argument, Canary prompt),
                                        #   game-ended redirect to mh-results
      MoleHuntPresentation.tsx          # Host Zoom screen — topic cards, timers, vote progress,
                                        #   Mole/Canary reveal (only in reveal phase), game-ended state
      MoleHuntControlRoom.tsx           # Host Control Room — role panel, phase controls,
                                        #   Canary deduct, end-game, confirmation dialogs
      MoleHuntResultsView.tsx           # Host leaderboard (gold/silver/bronze), Most Deceptive Mole,
                                        #   collapsible round-by-round breakdown
      PlayerMoleResults.tsx             # Player personal score summary card

  auth/
    actions.ts                          # PLACEHOLDER — TODO
    components/
      LoginForm.tsx                     # Email + password, Supabase signInWithPassword, redirects to /dashboard

components/
  ui/                                   # 10 shadcn primitives (Radix Nova style)
    badge.tsx, button.tsx, card.tsx, checkbox.tsx, dialog.tsx, drawer.tsx,
    dropdown-menu.tsx, input.tsx, label.tsx, progress.tsx

lib/
  pusher/
    client.ts                           # PusherJs browser client (NEXT_PUBLIC_PUSHER_KEY + CLUSTER)
    server.ts                           # Pusher server client (PUSHER_APP_ID + SECRET, TLS)
    trigger.ts                          # triggerRoomEvent(code, event, data) + triggerGameEvent(code, event, data)
  supabase/
    client.ts                           # Browser Supabase client (createBrowserClient from @supabase/ssr)
    server.ts                           # Server Supabase client (createServerClient, cookie-based)
    proxy.ts                            # updateSession() — auth middleware, checks getClaims(), redirects to /auth/login
  utils.ts                              # cn() — clsx + tailwind-merge

proxy.ts                                # Next.js middleware entry point — delegates to updateSession()
```

---

## Database schema

All tables have RLS disabled. Managed via Supabase dashboard only — no CLI.

```sql
-- Core
rooms (
  id UUID PK,
  code TEXT UNIQUE NOT NULL,           -- 4-char uppercase e.g. H6A3
  game_type TEXT CHECK IN ('this-or-that','word-chain','mole-hunt'),
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

-- Mole Hunt
mole_topics (
  id UUID PK,
  created_by UUID FK → auth.users,    -- host who created this topic
  title TEXT NOT NULL,
  blurb TEXT NOT NULL,
  image_url TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  correct_choice TEXT CHECK IN ('a','b') NOT NULL,
  mole_argument_1 TEXT,                -- persuasion argument for Mole 1 (optional)
  mole_argument_2 TEXT,                -- persuasion argument for Mole 2 (optional)
  mole_argument_3 TEXT,                -- persuasion argument for Mole 3 (optional)
  created_at TIMESTAMPTZ DEFAULT now()
)

mole_room_config (
  room_id UUID PK FK → rooms.id ON DELETE CASCADE,
  mode TEXT CHECK IN ('easy','moderate','hard'),
  mole_count INT NOT NULL,
  canary_count INT NOT NULL,
  discuss_timer_seconds INT NOT NULL,
  vote_timer_seconds INT NOT NULL,
  total_rounds INT NOT NULL
)

mole_rounds (
  id UUID PK,
  room_id UUID FK → rooms.id ON DELETE CASCADE,
  topic_id UUID FK → mole_topics.id,
  round_number INT NOT NULL,
  phase TEXT CHECK IN ('discuss','vote','reveal') DEFAULT 'discuss',
  mole_player_ids UUID[] NOT NULL,
  canary_player_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)

mole_votes (
  id UUID PK,
  round_id UUID FK → mole_rounds.id ON DELETE CASCADE,
  player_id UUID FK → players.id ON DELETE CASCADE,
  choice TEXT CHECK IN ('a','b') NOT NULL,
  UNIQUE (round_id, player_id)
)

mole_scores (
  id UUID PK,
  room_id UUID FK → rooms.id ON DELETE CASCADE,
  player_id UUID FK → players.id ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  times_mole INT DEFAULT 0,
  times_canary INT DEFAULT 0,
  crew_deceived INT DEFAULT 0,
  UNIQUE (room_id, player_id)
)
```

---

## Pusher conventions

> ⚠️ Hyphens only — Pusher free tier does not support colons in channel names

```
room-{code}           # player-joined, room-closed, game-started
room-{code}-host      # host-only events (reserved, not currently used)
room-{code}-game      # vote-submitted, question-advanced, game-ended,
                      #   word-submitted, player-eliminated
```

**Event payloads:**
```
player-joined       → { player: Player }
room-closed         → {}
game-started        → { game_type: GameType }
vote-submitted      → { results: TotResults }
question-advanced   → { nextIndex: number }
game-ended          → {} (ToT) or { winnerId: string | null } (WC/MH)
word-submitted      → { word: string, playerId: string, nextPlayerIndex: number }
player-eliminated   → { playerId: string, reason: string, remainingCount: number }
round-started       → { roundNumber: number, roundId: string, phase: 'discuss', topicId: string }
phase-advanced      → { roundId: string, phase: MolePhase }
vote-submitted      → { roundId: string, votedCount: number, totalPlayers: number }
scores-updated      → { roundId: string | null }
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

## Notable implementation details

### This or That auto-advance
The host view has a 30-second countdown timer. When all non-host players vote (`onAllVoted` callback from `useVotes`), or when the timer expires, the question auto-advances after a 1.5s delay (showing a status message). The host does NOT need to click "Next Question" — only "End Game" on the last question.

### Question setup flow
- Host picks "This or That" → goes to `QuestionSetup` component
- Browses reusable `tot_question_bank` (checkbox selection)
- Can add custom questions inline (saved to bank automatically on room creation)
- Minimum 2 questions required
- Word Chain skips this step entirely — creates room immediately

### Word Chain game-over detection
The elimination API route (`/api/games/word-chain/eliminate`) checks if only 1 player remains after elimination. If so, it automatically marks the room as ended and triggers `game-ended` with the winner's ID. The host can also manually end the game.

### Word Chain validation
Done server-side in `submitWord()` action:
- First word: anything goes
- Subsequent words: must start with the last letter of the previous word
- Duplicate words rejected (case-insensitive)
- Invalid submissions auto-eliminate the player after a 1.5s delay

### Auth middleware
Auth protection is via `proxy.ts` (not a traditional `middleware.ts`). It uses Supabase `getClaims()` to check for a user session. The matcher allows `/play/*` (public), `/api/*`, `/auth/*`, `/login`, and `/` without authentication. Everything else redirects to `/auth/login`.

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

## What to do next

### Priority 1 — End-to-end testing + polish (next task)
- Test the full Mole Hunt flow: Create Room → Lobby → Start → Control Room + Presentation → Round Flow → Game End → Results
- End-to-end testing of all three games (This or That, Word Chain, Mole Hunt)
- Polish: role-reveal animations, timer transitions, mobile responsiveness pass across all games
- Verify auth middleware works correctly in production

### Priority 2 — Finish auth stubs
- Implement `features/auth/actions.ts` (login, logout, signUp wrappers)
- Build Forgot Password page (password reset flow)
- Build Sign Up page (host registration — may not be needed if admin creates accounts manually)
- Either wire up `proxy.ts` as proper middleware or verify the current pattern works in production

### Priority 3 — Vercel deployment
- Run `vercel` CLI or use the `vercel:deploy` skill
- Ensure all env vars are set in Vercel dashboard (Supabase URL + key, Pusher keys)
- Test the full flow end-to-end after deployment

### Priority 4 — Polish (nice-to-have)
- Add a "Play Again" button that redirects players back to the landing page after game-over
- Entrance animations on vote chips (already partially done with `animate-in` classes)
- Sound effects for timer countdown / elimination
- Host-controlled timer duration setting
- Custom question editing/deletion from the bank

---

## How to continue in next session

Paste this file and say:

> "Continue high6-play. Here's the handoff."

The project has three games built at different levels: This or That and Word Chain are feature-complete (host/player views, realtime, results). Mole Hunt has its data layer and host setup screens done — gameplay (Presentation/Control Room screens, role assignment, round flow, scoring, player views) is the clear next priority.
