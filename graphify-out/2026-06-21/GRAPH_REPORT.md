# Graph Report - .  (2026-06-21)

## Corpus Check
- 90 files · ~31,848 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 404 nodes · 697 edges · 28 communities (22 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

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
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Supabase Template|Supabase Template]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 34 edges
2. `compilerOptions` - 17 edges
3. `Graphify` - 17 edges
4. `DesignSystemGenerator` - 11 edges
5. `Button()` - 11 edges
6. `getRoom()` - 11 edges
7. `TotQuestion` - 11 edges
8. `createClient()` - 10 edges
9. `triggerGameEvent()` - 9 edges
10. `_search_csv()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `HostGamePage()` --calls--> `getRoom()`  [INFERRED]
  app/host/[code]/game/page.tsx → features/rooms/actions.ts
- `HostPage()` --calls--> `getRoom()`  [INFERRED]
  app/host/[code]/page.tsx → features/rooms/actions.ts
- `PlayPage()` --calls--> `getRoom()`  [INFERRED]
  app/play/[code]/page.tsx → features/rooms/actions.ts
- `POST()` --calls--> `triggerGameEvent()`  [EXTRACTED]
  app/api/games/this-or-that/vote/route.ts → lib/pusher/trigger.ts
- `POST()` --calls--> `createClient()`  [EXTRACTED]
  app/api/rooms/route.ts → lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (28 total, 6 thin omitted)

### Community 0 - "App Pages & UI Components"
Cohesion: 0.07
Nodes (30): PlayerRow(), HostView(), JoinForm(), useVotes(), cn(), Button(), buttonVariants, Checkbox (+22 more)

### Community 1 - "Room Creation & Host Lobby"
Cohesion: 0.11
Nodes (28): CreateRoom(), CreateRoomResult, GAMES, Step, GAME_LABELS, HostLobby(), JoinResult, LoginForm() (+20 more)

### Community 2 - "API Route Handlers"
Cohesion: 0.10
Nodes (27): POST(), POST(), GET(), POST(), POST(), POST(), pusherServer, triggerGameEvent() (+19 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.05
Nodes (39): dependencies, class-variance-authority, clsx, lucide-react, next, next-themes, pusher, pusher-js (+31 more)

### Community 4 - "Game Views & Player UI"
Cohesion: 0.11
Nodes (26): GET(), HostViewProps, PlayerView(), PlayerViewProps, BankItem, QuestionSetupProps, HostGamePage(), HostGamePageProps (+18 more)

### Community 5 - "Design System Generator"
Cohesion: 0.09
Nodes (25): DesignSystemGenerator, _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+17 more)

### Community 6 - "Room Code Pages"
Cohesion: 0.13
Nodes (19): HostPage(), HostPageProps, PlayPage(), PlayPageProps, HostLobbyProps, PlayerLobbyProps, PlayerLobbyGate(), ResultsPage() (+11 more)

### Community 7 - "shadcn/ui Configuration"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 8 - "Graphify Knowledge Graph"
Cohesion: 0.10
Nodes (21): AST Extraction, Community Detection, EXTRACTED/INFERRED/AMBIGUOUS Confidence Levels, God Nodes, Graphify, Knowledge Graph, Semantic Extraction, URL Ingest (/graphify add) (+13 more)

### Community 9 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+12 more)

### Community 10 - "Search & BM25 Engine"
Cohesion: 0.15
Nodes (15): BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts, Core search function using BM25 (+7 more)

### Community 11 - "Project Documentation"
Cohesion: 0.28
Nodes (9): Feature-based Architecture Separation, High6 Play, Pusher Channel Conventions (Hyphens Only), Single Responsibility Principle (SRP), High6 Tech Stack, This or That Game, Word Chain Game, High6 Database Schema (+1 more)

### Community 12 - "ESLint Configuration"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 13 - "Supabase Auth Proxy"
Cohesion: 0.60
Nodes (3): config, proxy(), updateSession()

## Knowledge Gaps
- **124 isolated node(s):** `npx`, `HostGamePageProps`, `HostPageProps`, `ResultsPageProps`, `geistSans` (+119 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `App Pages & UI Components` to `Room Creation & Host Lobby`, `Game Views & Player UI`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Game Views & Player UI` to `Room Creation & Host Lobby`, `API Route Handlers`, `Room Code Pages`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `createClient()` connect `API Route Handlers` to `Room Code Pages`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `BM25 ranking algorithm for text search`, `Lowercase, split, remove punctuation, filter short words`, `Build BM25 index from documents` to the rest of the system?**
  _154 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Pages & UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.0700354609929078 - nodes in this community are weakly interconnected._
- **Should `Room Creation & Host Lobby` be split into smaller, more focused modules?**
  _Cohesion score 0.10993657505285412 - nodes in this community are weakly interconnected._
- **Should `API Route Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.0951219512195122 - nodes in this community are weakly interconnected._