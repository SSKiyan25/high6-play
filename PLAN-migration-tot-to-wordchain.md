# Migration Plan: "This or That" code → Word Chain (post-DB rename)

## Summary

Rename/relocate the category-based elimination game (currently named "This or That" / `tot`) to be the real "Word Chain" game, since the DB migration already renamed the underlying tables. The old letter-chain Word Chain code becomes legacy. The old binary-vote This or That code stays as-is but hidden from dashboard.

---

## Rename Map (Types)

| Old (tot) | New (word-chain) |
|---|---|
| `TotDifficulty` | `WordChainDifficulty` |
| `TotCategory` | `WordChainCategory` |
| `TotCategoryInput` | `WordChainCategoryInput` |
| `TotRoomConfig` | `WordChainRoomConfig` |
| `TotRoomConfigInput` | `WordChainRoomConfigInput` |
| `TotRoundStatus` | `WordChainRoundStatus` |
| `TotRoundPlayerStatus` | `WordChainRoundPlayerStatus` |
| `TotRound` | `WordChainRound` |
| `TotRoundPlayer` | `WordChainRoundPlayer` |
| `TotScore` | `WordChainScore` |
| `TotGameState` | `WordChainGameState` |
| `TotTurnResult` | `WordChainTurnResult` |
| `TotRoundState` | `WordChainRoundState` |
| `TotLeaderboardRow` | `WordChainLeaderboardRow` |
| `TotRoundBreakdown` | `WordChainRoundBreakdown` |
| `TotFullResults` | `WordChainFullResults` |
| `SEED_CATEGORIES` | `SEED_CATEGORIES` (unchanged) |
| `DIFFICULTY_POINTS` | `DIFFICULTY_POINTS` (unchanged) |
| `DIFFICULTY_LABELS` | `DIFFICULTY_LABELS` (unchanged) |
| `useThisOrThat` hook | `useWordChain` hook |
| `UseThisOrThatOptions` | `UseWordChainOptions` |
| `UseThisOrThatState` | `UseWordChainState` |
| `TotSetup` component | `WordChainSetup` component |
| `TotCategoryManager` | `WordChainCategoryManager` |
| `TotPresentation` | `WordChainPresentation` |
| `TotPlayerView` | `WordChainPlayerView` |
| `TotResultsView` | `WordChainResultsView` |

## Table Reference Map

| Old (tot_*) | New (wc_*) |
|---|---|
| `tot_categories` | `wc_categories` |
| `tot_room_config` | `wc_room_config` |
| `tot_rounds` | `wc_rounds` |
| `tot_round_players` | `wc_round_players` |
| `tot_scores` | `wc_scores` |

Note: `tot_question_bank`, `tot_questions`, `tot_votes` (old binary-vote ToT) are NOT touched — they belong to `features/this-or-that/` which stays as-is.

---

## Order of Operations

### Step 1: Move OLD letter-chain code to legacy

1. `features/word-chain/` → `features/word-chain-legacy-letterchain/`
   - `git mv features/word-chain features/word-chain-legacy-letterchain`
   - Update internal imports within the moved files (they reference `../types`, `./hooks/...` etc. — should still work since relative paths stay the same)
   - No logic changes

### Step 2: Rename tot code → word-chain

1. `features/tot/` → `features/word-chain/`
   - `git mv features/tot features/word-chain`
   
2. Inside `features/word-chain/types.ts`:
   - Rename all `Tot*` types to `WordChain*` (see rename map above)
   - Keep `SEED_CATEGORIES`, `DIFFICULTY_POINTS`, `DIFFICULTY_LABELS` as-is

3. Inside `features/word-chain/actions.ts`:
   - Swap all `'tot_*'` table strings → `'wc_*'` (see table map)
   - Rename imported/used types: `Tot*` → `WordChain*`
   - Rename function signatures to match
   - `tot_categories!inner(...)` → `wc_categories!inner(...)` (Supabase join notation)

4. Inside `features/word-chain/hooks/useThisOrThat.ts`:
   - Rename file → `useWordChain.ts`
   - Rename hook: `useThisOrThat` → `useWordChain`
   - Rename interfaces: `UseThisOrThatOptions` → `UseWordChainOptions`, `UseThisOrThatState` → `UseWordChainState`
   - Swap all `'tot_*'` table references → `'wc_*'`
   - Update internal Supabase query strings
   - Update fetch URLs from `/api/games/this-or-that/*` → `/api/games/word-chain/*`

5. Inside `features/word-chain/components/`:
   - `TotSetup.tsx` → `WordChainSetup.tsx`: rename component + props interface, update internal imports, update fetch URLs
   - `TotCategoryManager.tsx` → `WordChainCategoryManager.tsx`: rename, update imports, update fetch URLs
   - `TotPresentation.tsx` → `WordChainPresentation.tsx`: rename, update imports, update fetch URLs, update Supabase table refs
   - `TotPlayerView.tsx` → `WordChainPlayerView.tsx`: rename, update imports
   - `TotResultsView.tsx` → `WordChainResultsView.tsx`: rename, update imports

### Step 3: Move OLD letter-chain API routes to legacy

1. `app/api/games/word-chain/{submit,eliminate,end}` → `app/api/games/word-chain-legacy-letterchain/`
   - `mkdir -p app/api/games/word-chain-legacy-letterchain`
   - Move each route directory
   - Update internal imports — they import from `@/features/word-chain/...` which needs to change to `@/features/word-chain-legacy-letterchain/...`
   - No other logic changes

### Step 4: Move new ToT API routes → word-chain

1. `app/api/games/this-or-that/` → `app/api/games/word-chain/`
   - The existing `app/api/games/word-chain/` was moved in Step 3, so it's now free
   - Move all routes from `this-or-that/`: start, confirm-turn, skip, advance-turn, next-round, end-game, categories, categories/[id]
   - The OLD binary-vote routes (advance, bank, end, vote) stay in `this-or-that/` — they belong to `features/this-or-that/` (legacy, untouched)
   - Update all imports from `@/features/tot/...` → `@/features/word-chain/...`
   - Update internal Supabase table refs if any (some routes delegate to actions.ts, but some have inline queries)
   - Update Pusher event payloads: `game_type: 'this-or-that'` → `game_type: 'word-chain'`

### Step 5: UI — hide This or That in CreateRoom.tsx

1. Run `skill: "ui-ux-pro-max"` before modifying
2. In `features/rooms/components/CreateRoom.tsx`:
   - Comment out/remove the `'this-or-that'` entry from `GAMES` array (lines 27-34)
   - Update the `'word-chain'` entry (lines 36-42) with:
     - Icon: `Swords` or `Gamepad2` (from the old this-or-that entry)
     - Description: "Category-based elimination. Take turns, survive the timer. Last players standing win points." (from old this-or-that)
     - Accent: `'from-blue-500/20 to-violet-500/10'` (from old this-or-that)
   - Update `handleGameSelect`:
     - `gameType === 'word-chain'` now goes to setup (`setStep('word-chain-setup')`) instead of instant create
   - Update `Step` type: `'game-select' | 'word-chain-setup' | 'mole-hunt-setup'`
   - Rename `tot-setup` step → `'word-chain-setup'`
   - Rename `handleTotCreate` → `handleWordChainCreate`
   - Create room with `game_type: 'word-chain'` instead of `'this-or-that'`
   - Import `WordChainSetup` instead of `TotSetup`
   - Import `WordChainRoomConfigInput` instead of `TotRoomConfigInput`
   - Update the setup step JSX: `step === 'word-chain-setup'` renders `<WordChainSetup>`

### Step 6: Rename app pages

1. Save old wc pages before overwriting:
   - `app/host/[code]/wc-game/` → `app/host/[code]/wc-game-legacy-letterchain/` (preserve)
   - `app/host/[code]/wc-results/` → `app/host/[code]/wc-results-legacy-letterchain/` (preserve)
   - `app/play/[code]/wc-game/` → `app/play/[code]/wc-game-legacy-letterchain/` (preserve)

2. Rename tot pages → wc pages:
   - `app/host/[code]/tot-game/` → `app/host/[code]/wc-game/`
   - `app/host/[code]/tot-results/` → `app/host/[code]/wc-results/`
   - `app/play/[code]/tot-game/` → `app/play/[code]/wc-game/`
   - `app/play/[code]/tot-results/` → `app/play/[code]/wc-results/`

3. Inside the new wc pages, update imports:
   - `@/features/tot/...` → `@/features/word-chain/...`
   - Type imports: `Tot*` → `WordChain*`
   - Component imports: `Tot*` → `WordChain*`
   - Inline Supabase table refs: `tot_categories` → `wc_categories`, `tot_room_config` → `wc_room_config`, `tot_rounds` → `wc_rounds`, `tot_round_players` → `wc_round_players`, `tot_scores` → `wc_scores`
   - Update `game_type` checks from `'this-or-that'` to `'word-chain'` where appropriate

### Step 7: Update routing references

1. `features/rooms/components/HostLobby.tsx`:
   - Line 124: `isTot = room.game_type === 'this-or-that'` → `isWordChain = room.game_type === 'word-chain'`
   - Line 128: URL → `'/api/games/word-chain/start'`
   - Line 147: game path mapping — `'word-chain'` already maps to `'wc-game'` ✓
   - Update the body: `{ room_code: room.code }` (word-chain start uses room_code, same as tot used)
   - Update `isMH || isTot` → `isMH || isWordChain`

2. `features/rooms/components/PlayerLobby.tsx`:
   - Line 43: `gameType === 'word-chain'` → `'wc-game'` — already correct ✓

3. `features/rooms/actions.ts`:
   - Remove import of `TotQuestionInput` from `@/features/this-or-that/types`
   - Remove import of `saveToQuestionBank, seedRoomQuestions` from `@/features/this-or-that/actions`
   - Add import of `saveRoomConfig` from `@/features/word-chain/actions`
   - Add import of `WordChainRoomConfigInput` from `@/features/word-chain/types`
   - Update `createRoom` signature: `config?: WordChainRoomConfigInput`
   - Replace lines 65-68 (old this-or-that question seeding) with:
     ```
     if (gameType === 'word-chain' && config) {
       await saveRoomConfig(room.id, config)
     }
     ```
   - This FIXES the pre-existing bug where tot config was never saved

4. `app/api/rooms/route.ts`:
   - Import `WordChainRoomConfigInput` instead of `TotQuestionInput`
   - Update validation: replace question-validation for 'this-or-that' with config validation for 'word-chain'
   - Or keep 'this-or-that' validation (for legacy) and add 'word-chain' validation:
     ```
     if (game_type === 'word-chain') {
       if (!config) {
         return error('Config is required for Word Chain.')
       }
     }
     ```

5. `app/host/[code]/results/page.tsx` (line 20):
   - Keep `room.game_type !== 'this-or-that'` as-is (this serves the old binary-vote results, untouched)

6. `app/play/[code]/game/page.tsx` (line 5):
   - Keep as-is (this serves the old binary-vote game, untouched)

### Step 7.5: Hardcoded 'this-or-that' string sweep (Amendment #2)

Grep confirmed only 4 occurrences across all 7 moved routes:
1. `start/route.ts:80`: `game_type: 'this-or-that'` in Pusher payload → `'word-chain'`
2. `start/route.ts:104`: `console.error('this-or-that start error:', error)` → `'word-chain start error:'`
3. `next-round/route.ts:76`: `console.error('this-or-that next-round error:', error)` → `'word-chain next-round error:'`
4. `end-game/route.ts:59`: `console.error('this-or-that end-game error:', error)` → `'word-chain end-game error:'`

Confirm-turn, skip, advance-turn, categories, categories/[id] — ZERO hardcoded strings. Clean.

### Step 8: Pusher event references

1. Already covered by Step 7.5 above
2. `lib/pusher/trigger.ts` — no changes needed (uses dynamic channel names)
3. `end-game/route.ts` Pusher payload is `{}` — correct shape for category-based game (results fetched from Supabase, not event payload)

### Step 9: graphify update

```bash
graphify update .
```

### Step 10: engram memory

Save migration record with: what moved where, why, date.

---

## Files NOT Modified

- `features/this-or-that/` — OLD binary-vote ToT, stays as-is (legacy, hidden from UI)
- `app/api/games/this-or-that/{advance,bank,end,vote}` — Old ToT routes, stay as-is
- `app/host/[code]/game/`, `app/host/[code]/results/` — Old ToT pages, stay as-is
- `app/play/[code]/game/` — Old ToT player, stays as-is
- `components/ui/` — No changes
- `lib/pusher/*` — No changes (dynamic channel names)
- `features/mole-hunt/` — No changes
- `.env*` — No changes
- Mole Hunt code — No changes
- `features/rooms/types.ts` GameType — stays as `'this-or-that' | 'word-chain' | 'mole-hunt'`

---

## Acceptance Criteria

- [ ] Zero remaining references to `tot_` (table names, types, file names, hook names) in active code — verified via grep
- [ ] `features/word-chain/` contains the turn-based/category mechanic
- [ ] `features/word-chain-legacy-letterchain/` contains the old letter-chain code
- [ ] `app/api/games/word-chain/` serves the turn-based/category endpoints
- [ ] `app/api/games/word-chain-legacy-letterchain/` serves the old letter-chain endpoints
- [ ] "This or That" is not selectable from `CreateRoom.tsx` but its code is untouched and still compiles
- [ ] App builds with no TypeScript errors and no broken imports
- [ ] Full Word Chain room played through host + player, start to results, verified manually (smoke test)
- [ ] `graphify update .` succeeds
