# Graph Report - high6-play  (2026-06-27)

## Corpus Check
- 128 files · ~59,534 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 717 nodes · 1356 edges · 46 communities (36 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0550ed17`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_App Pages & UI Components|App Pages & UI Components]]
- [[_COMMUNITY_Room Creation & Host Lobby|Room Creation & Host Lobby]]
- [[_COMMUNITY_API Route Handlers|API Route Handlers]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Game Views & Player UI|Game Views & Player UI]]
- [[_COMMUNITY_Design System Generator|Design System Generator]]
- [[_COMMUNITY_Room Code Pages|Room Code Pages]]
- [[_COMMUNITY_shadcnui Configuration|shadcn/ui Configuration]]
- [[_COMMUNITY_Graphify Knowledge Graph|Graphify Knowledge Graph]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Search & BM25 Engine|Search & BM25 Engine]]
- [[_COMMUNITY_Project Documentation|Project Documentation]]
- [[_COMMUNITY_ESLint Configuration|ESLint Configuration]]
- [[_COMMUNITY_Supabase Auth Proxy|Supabase Auth Proxy]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_MCP Server Config|MCP Server Config]]
- [[_COMMUNITY_CLI Search Script|CLI Search Script]]
- [[_COMMUNITY_Auth Loading Page|Auth Loading Page]]
- [[_COMMUNITY_Auth Error Page|Auth Error Page]]
- [[_COMMUNITY_Forgot Password Page|Forgot Password Page]]
- [[_COMMUNITY_Sign Up Success Page|Sign Up Success Page]]
- [[_COMMUNITY_Update Password Page|Update Password Page]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 50 edges
2. `createClient()` - 34 edges
3. `/graphify` - 27 edges
4. `triggerGameEvent()` - 23 edges
5. `getRoom()` - 21 edges
6. `Button()` - 20 edges
7. `compilerOptions` - 17 edges
8. `Badge()` - 14 edges
9. `high6-play` - 14 edges
10. `UI/UX Pro Max - Design Intelligence` - 13 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `triggerGameEvent()`  [INFERRED]
  app/api/games/this-or-that/vote/route.ts → lib/pusher/trigger.ts
- `POST()` --calls--> `triggerRoomEvent()`  [INFERRED]
  app/api/rooms/start/route.ts → lib/pusher/trigger.ts
- `HostGamePage()` --calls--> `getRoom()`  [INFERRED]
  app/host/[code]/game/page.tsx → features/rooms/actions.ts
- `HostMoleHuntGamePage()` --calls--> `getRoom()`  [INFERRED]
  app/host/[code]/mh-game/page.tsx → features/rooms/actions.ts
- `MHResultsPage()` --calls--> `getRoom()`  [INFERRED]
  app/host/[code]/mh-results/page.tsx → features/rooms/actions.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — graphify_skill_ast_extraction, graphify_skill_semantic_extraction, graphify_skill_confidence_rubric [EXTRACTED 1.00]
- **Graphify Reference Documents** — references_extraction_spec_subagent, references_query_queryexpansion, references_update_incremental, references_exports_neo4j, references_exports_mcp, references_hooks_commithook, references_add_watch_ingest, references_add_watch_watchfolder, references_transcribe_whisper, references_github_merge_crossrepo [EXTRACTED 1.00]

## Communities (46 total, 10 thin omitted)

### Community 0 - "App Pages & UI Components"
Cohesion: 0.08
Nodes (41): CreateRoom(), CreateRoomResult, GAMES, Step, GAME_LABELS, HostLobby(), HostLobbyProps, PlayerRow() (+33 more)

### Community 1 - "Room Creation & Host Lobby"
Cohesion: 0.09
Nodes (38): MoleHuntPresentationProps, UseMoleHuntOptions, UseMoleHuntState, ControlData, ControlPlayer, UseMoleHuntControlOptions, UseMoleHuntControlState, DELETE() (+30 more)

### Community 2 - "API Route Handlers"
Cohesion: 0.05
Nodes (39): dependencies, class-variance-authority, clsx, lucide-react, next, next-themes, pusher, pusher-js (+31 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.13
Nodes (18): MoleHuntPresentation(), PresentationOption(), PresentationOptionProps, RevealData, OptionCard(), OptionCardProps, PlayerView(), PlayerViewProps (+10 more)

### Community 4 - "Game Views & Player UI"
Cohesion: 0.06
Nodes (40): BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts, Core search function using BM25 (+32 more)

### Community 5 - "Design System Generator"
Cohesion: 0.10
Nodes (28): HostPage(), HostPageProps, PlayPage(), PlayPageProps, MoleHuntResultsView(), PlayerLobbyGate(), REASON_ICONS, WcResultsView() (+20 more)

### Community 6 - "Room Code Pages"
Cohesion: 0.08
Nodes (37): POST(), GET(), BankItem, QuestionSetupProps, QuestionResultCard(), TotResultsView(), TotResultsViewProps, PlayerView() (+29 more)

### Community 7 - "shadcn/ui Configuration"
Cohesion: 0.08
Nodes (25): Auth middleware, Claude Code plugins & MCPs, Current status — everything built except auth stubs + deployment, Database schema, Done ✅, Full project structure, high6-play — Session Handoff, How to continue in next session (+17 more)

### Community 9 - "TypeScript Configuration"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 10 - "Search & BM25 Engine"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+12 more)

### Community 11 - "Project Documentation"
Cohesion: 0.10
Nodes (20): Auth, Claude Code plugins, Current status, Database schema, engram, Environment variables, Game rules, graphify (+12 more)

### Community 12 - "ESLint Configuration"
Cohesion: 0.05
Nodes (41): AST Extraction, Community Detection, EXTRACTED/INFERRED/AMBIGUOUS Confidence Levels, For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, God Nodes (+33 more)

### Community 13 - "Supabase Auth Proxy"
Cohesion: 0.18
Nodes (10): ⚠️ Blocking — must be done in Supabase dashboard before testing, Current build status, ✅ Done — Data Layer & Host Setup Screens, high6-play — Mole Hunt Handoff (Updated), How to continue next session, Key design decisions locked in this round of sessions, 🔜 Not built yet (next session's scope), Open risk to resolve before building round flow / Pusher events (+2 more)

### Community 14 - "Root Layout"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 15 - "MCP Server Config"
Cohesion: 0.60
Nodes (3): config, proxy(), updateSession()

### Community 19 - "Forgot Password Page"
Cohesion: 0.05
Nodes (43): 1. Accessibility (CRITICAL), 2. Touch & Interaction (CRITICAL), 3. Performance (HIGH), 4. Layout & Responsive (HIGH), 5. Typography & Color (MEDIUM), 6. Animation (MEDIUM), 7. Style Selection (MEDIUM), 8. Charts & Data (LOW) (+35 more)

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (7): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (6): Clone and run locally, Demo, Deploy to Vercel, Features, Feedback and issues, More Supabase examples

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 34 - "Community 34"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 35 - "Community 35"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 36 - "Community 36"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (33): POST(), POST(), POST(), POST(), POST(), POST(), POST(), POST() (+25 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (12): MoleHuntResultsViewProps, RoundBreakdown, ScoreRow, PlayerMoleResults(), PlayerMoleResultsProps, PlayerScoreData, PlayerIdentity, Badge() (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.18
Nodes (13): getAdvanceLabel(), getPhaseColor(), getPhaseLabel(), MoleHuntControlRoom(), MoleHuntControlRoomProps, useMoleHuntControl(), Dialog(), DialogContent() (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.43
Nodes (6): CountdownStatus, HostView(), HostViewProps, useVotes(), UseVotesOptions, TotResults

### Community 48 - "Community 48"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.19
Nodes (13): HostWcView(), HostWcViewProps, useHostTimer(), PlayerWcView(), PlayerWcViewProps, useTurnTimer(), UseTurnTimerOptions, UseTurnTimerReturn (+5 more)

## Knowledge Gaps
- **274 isolated node(s):** `npx`, `VALID_GAME_TYPES`, `HostGamePageProps`, `HostMoleHuntGamePageProps`, `MHResultsPageProps` (+269 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Package Dependencies` to `App Pages & UI Components`, `Design System Generator`, `Room Code Pages`, `Community 42`, `Community 43`, `Community 44`, `Community 48`, `Community 50`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 41` to `Room Creation & Host Lobby`, `Design System Generator`, `Room Code Pages`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `Button()` connect `Community 42` to `App Pages & UI Components`, `Package Dependencies`, `Community 43`, `Community 44`, `Community 50`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `cn()` (e.g. with `OptionCard()` and `PlayerView()`) actually correct?**
  _`cn()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `triggerGameEvent()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`triggerGameEvent()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `getRoom()` (e.g. with `HostPage()` and `PlayPage()`) actually correct?**
  _`getRoom()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BM25 ranking algorithm for text search`, `Lowercase, split, remove punctuation, filter short words`, `Build BM25 index from documents` to the rest of the system?**
  _301 weakly-connected nodes found - possible documentation gaps or missing edges._