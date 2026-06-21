# Graph Report - high6-play  (2026-06-21)

## Corpus Check
- 99 files · ~37,765 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 588 nodes · 968 edges · 39 communities (30 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e92f52ec`
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
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Supabase Template|Supabase Template]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 41 edges
2. `/graphify` - 27 edges
3. `compilerOptions` - 17 edges
4. `getRoom()` - 15 edges
5. `Button()` - 14 edges
6. `high6-play` - 14 edges
7. `triggerGameEvent()` - 13 edges
8. `UI/UX Pro Max - Design Intelligence` - 13 edges
9. `createClient()` - 12 edges
10. `high6-play — Session Handoff` - 12 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getRoom()`  [EXTRACTED]
  app/api/rooms/route.ts → features/rooms/actions.ts
- `HostGamePage()` --calls--> `getRoom()`  [INFERRED]
  app/host/[code]/game/page.tsx → features/rooms/actions.ts
- `HostPage()` --calls--> `getRoom()`  [INFERRED]
  app/host/[code]/page.tsx → features/rooms/actions.ts
- `PlayPage()` --calls--> `getRoom()`  [INFERRED]
  app/play/[code]/page.tsx → features/rooms/actions.ts
- `QuestionResultCard()` --calls--> `cn()`  [EXTRACTED]
  features/this-or-that/components/TotResultsView.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Communities (39 total, 9 thin omitted)

### Community 0 - "App Pages & UI Components"
Cohesion: 0.08
Nodes (24): PlayerRow(), cn(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogTitle() (+16 more)

### Community 1 - "Room Creation & Host Lobby"
Cohesion: 0.07
Nodes (43): CreateRoom(), CreateRoomResult, GAMES, Step, GAME_LABELS, HostLobby(), HostLobbyProps, JoinForm() (+35 more)

### Community 2 - "API Route Handlers"
Cohesion: 0.07
Nodes (42): POST(), POST(), POST(), GET(), POST(), QuestionSetupProps, TotResultsView(), GET() (+34 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.05
Nodes (39): dependencies, class-variance-authority, clsx, lucide-react, next, next-themes, pusher, pusher-js (+31 more)

### Community 4 - "Game Views & Player UI"
Cohesion: 0.05
Nodes (43): 1. Accessibility (CRITICAL), 2. Touch & Interaction (CRITICAL), 3. Performance (HIGH), 4. Layout & Responsive (HIGH), 5. Typography & Color (MEDIUM), 6. Animation (MEDIUM), 7. Style Selection (MEDIUM), 8. Charts & Data (LOW) (+35 more)

### Community 5 - "Design System Generator"
Cohesion: 0.09
Nodes (25): DesignSystemGenerator, _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+17 more)

### Community 6 - "Room Code Pages"
Cohesion: 0.11
Nodes (31): HostPage(), HostPageProps, PlayPage(), PlayPageProps, HostWcView(), HostWcViewProps, useHostTimer(), PlayerLobbyGate() (+23 more)

### Community 7 - "shadcn/ui Configuration"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 8 - "Graphify Knowledge Graph"
Cohesion: 0.05
Nodes (40): AST Extraction, Community Detection, EXTRACTED/INFERRED/AMBIGUOUS Confidence Levels, For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, God Nodes (+32 more)

### Community 9 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+12 more)

### Community 10 - "Search & BM25 Engine"
Cohesion: 0.15
Nodes (15): BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts, Core search function using BM25 (+7 more)

### Community 11 - "Project Documentation"
Cohesion: 0.08
Nodes (26): Feature-based Architecture Separation, High6 Play, Pusher Channel Conventions (Hyphens Only), Single Responsibility Principle (SRP), High6 Tech Stack, This or That Game, Word Chain Game, Claude Code plugins & MCPs (+18 more)

### Community 12 - "ESLint Configuration"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 13 - "Supabase Auth Proxy"
Cohesion: 0.60
Nodes (3): config, proxy(), updateSession()

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (20): Auth, Claude Code plugins, Current status, Database schema, engram, Environment variables, Game rules, graphify (+12 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (20): CountdownStatus, HostView(), HostViewProps, PlayerView(), PlayerViewProps, QuestionResultCard(), TotResultsViewProps, PlayerIdentity (+12 more)

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (6): Clone and run locally, Demo, Deploy to Vercel, Features, Feedback and issues, More Supabase examples

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 33 - "Community 33"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 34 - "Community 34"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 35 - "Community 35"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **240 isolated node(s):** `npx`, `HostGamePageProps`, `HostPageProps`, `ResultsPageProps`, `HostWcGamePageProps` (+235 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `App Pages & UI Components` to `Room Creation & Host Lobby`, `Community 29`, `Room Code Pages`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `/graphify` connect `Graphify Knowledge Graph` to `Game Views & Player UI`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `getRoom()` (e.g. with `HostPage()` and `PlayPage()`) actually correct?**
  _`getRoom()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BM25 ranking algorithm for text search`, `Lowercase, split, remove punctuation, filter short words`, `Build BM25 index from documents` to the rest of the system?**
  _270 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Pages & UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.07777777777777778 - nodes in this community are weakly interconnected._
- **Should `Room Creation & Host Lobby` be split into smaller, more focused modules?**
  _Cohesion score 0.07243460764587525 - nodes in this community are weakly interconnected._
- **Should `API Route Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.07244843997884717 - nodes in this community are weakly interconnected._