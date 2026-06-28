# Graph Report - high6-play  (2026-06-28)

## Corpus Check
- 130 files · ~67,084 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 751 nodes · 1428 edges · 41 communities (32 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b76eedae`
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
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 51 edges
2. `createClient()` - 36 edges
3. `triggerGameEvent()` - 27 edges
4. `/graphify` - 27 edges
5. `getRoom()` - 21 edges
6. `Button()` - 20 edges
7. `compilerOptions` - 17 edges
8. `createClient()` - 15 edges
9. `Badge()` - 14 edges
10. `high6-play` - 14 edges

## Surprising Connections (you probably didn't know these)
- `OptionCard()` --calls--> `cn()`  [INFERRED]
  features/mole-hunt/components/PlayerView.tsx → lib/utils.ts
- `GET()` --calls--> `createClient()`  [EXTRACTED]
  app/api/games/mole-hunt/control-data/route.ts → lib/supabase/server.ts
- `POST()` --calls--> `triggerGameEvent()`  [INFERRED]
  app/api/games/this-or-that/end/route.ts → lib/pusher/trigger.ts
- `POST()` --calls--> `triggerGameEvent()`  [INFERRED]
  app/api/games/this-or-that/vote/route.ts → lib/pusher/trigger.ts
- `POST()` --calls--> `triggerRoomEvent()`  [INFERRED]
  app/api/rooms/start/route.ts → lib/pusher/trigger.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — graphify_skill_ast_extraction, graphify_skill_semantic_extraction, graphify_skill_confidence_rubric [EXTRACTED 1.00]
- **Graphify Reference Documents** — references_extraction_spec_subagent, references_query_queryexpansion, references_update_incremental, references_exports_neo4j, references_exports_mcp, references_hooks_commithook, references_add_watch_ingest, references_add_watch_watchfolder, references_transcribe_whisper, references_github_merge_crossrepo [EXTRACTED 1.00]

## Communities (41 total, 9 thin omitted)

### Community 0 - "App Pages & UI Components"
Cohesion: 0.09
Nodes (33): CreateRoom(), CreateRoomResult, GAMES, Step, JoinForm(), JoinResult, LoginForm(), MODE_DEFAULTS (+25 more)

### Community 1 - "Room Creation & Host Lobby"
Cohesion: 0.09
Nodes (35): POST(), POST(), POST(), POST(), POST(), POST(), POST(), POST() (+27 more)

### Community 2 - "API Route Handlers"
Cohesion: 0.05
Nodes (39): dependencies, class-variance-authority, clsx, lucide-react, next, next-themes, pusher, pusher-js (+31 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.08
Nodes (44): MoleHuntPresentationProps, OptionCard(), OptionCardProps, OutcomeToast, GET(), PlayerView(), PlayerViewProps, useMoleHunt() (+36 more)

### Community 4 - "Game Views & Player UI"
Cohesion: 0.06
Nodes (40): BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts, Core search function using BM25 (+32 more)

### Community 5 - "Design System Generator"
Cohesion: 0.09
Nodes (30): HostPage(), HostPageProps, PlayPage(), PlayPageProps, HostLobby(), HostLobbyProps, MoleHuntResultsView(), GAME_LABELS (+22 more)

### Community 6 - "Room Code Pages"
Cohesion: 0.08
Nodes (35): POST(), POST(), GET(), CountdownStatus, HostView(), HostViewProps, QuestionResultCard(), TotResultsView() (+27 more)

### Community 7 - "shadcn/ui Configuration"
Cohesion: 0.06
Nodes (30): Auth middleware, Claude Code plugins & MCPs, Current status — everything built except auth stubs + deployment, Database schema, Done ✅, Full project structure, high6-play — Session Handoff, How to continue in next session (+22 more)

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
Cohesion: 0.07
Nodes (29): 4 bugs fixed:, 5 issues fixed across two categories:, ⚠️ Blocking — must be done in Supabase dashboard before testing, Bug 1 — Host excluded from player participation ✅, Bug 2 — Results in Presentation screen ✅, Bug 3 — Mole correct-vote deduction ✅, Bug 4 — Player navigates to results on game end ✅, Bug fix (post-session, June 28): (+21 more)

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

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (23): HostWcViewProps, PlayerWcViewProps, REASON_ICONS, WcResultsView(), WcResultsViewProps, UseWordChainOptions, UseWordChainReturn, HostWcGamePage() (+15 more)

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (55): GAME_LABELS, PlayerRow(), HostWcView(), useHostTimer(), getAdvanceLabel(), getPhaseColor(), getPhaseLabel(), MoleHuntControlRoom() (+47 more)

## Knowledge Gaps
- **296 isolated node(s):** `npx`, `VALID_GAME_TYPES`, `HostGamePageProps`, `HostMoleHuntGamePageProps`, `MHResultsPageProps` (+291 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 44` to `App Pages & UI Components`, `Package Dependencies`, `Design System Generator`, `Room Code Pages`, `Community 40`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Room Creation & Host Lobby` to `Package Dependencies`, `Design System Generator`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Package Dependencies` to `App Pages & UI Components`, `Design System Generator`, `Room Code Pages`, `Community 40`, `Community 44`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `cn()` (e.g. with `OptionCard()` and `PlayerView()`) actually correct?**
  _`cn()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `triggerGameEvent()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`triggerGameEvent()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `getRoom()` (e.g. with `HostPage()` and `PlayPage()`) actually correct?**
  _`getRoom()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BM25 ranking algorithm for text search`, `Lowercase, split, remove punctuation, filter short words`, `Build BM25 index from documents` to the rest of the system?**
  _323 weakly-connected nodes found - possible documentation gaps or missing edges._