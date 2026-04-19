# What's for Supper - Complete Specifications Build

## Context
The user has a specs framework on the main branch (`src/specs/`) with:
- `recipe-api.spec.md` - API endpoints
- `recipe-data.spec.md` - PostgreSQL architecture with pgvector, family management, preferences
- `recipe-import.spec.md` - AI extraction pipeline (Gemma local + Gemini API)
- `backlog/`, `decisions/`, `mockups/` directories

The experiment branch has a simpler implementation (file-based, N8N webhooks) that will eventually align with the main branch.

## Status

### ✅ Done
- Recipe API contract (upload, image retrieval, family management)
- Data architecture (PostgreSQL, pgvector, data models)
- Import worker pipeline (2-pass: Gemma + Gemini)

### 📝 Needed
- Complete feature specifications (discovery, search, meal planning, sharing)
- PWA/Frontend specification (Next.js)
- **AI Agent Architecture** (C# backend agents using Microsoft.Agents.AI)
- API specifications (Next.js frontend ↔ C# backend communication)
- Integration specifications (calendar sync, external services, agent APIs)
- Architecture decision records
- Implementation roadmap with migration strategy
- Security & privacy specifications
- Testing & QA strategy
- Deployment & operations guide

## Feature Phases (Vertical Slices)

| Phase | Goal | Key Additions |
|-------|------|-----------------|
| **0 — MVP** | Recipe capture end-to-end | Next.js + C# + PostgreSQL (no Redis, no AI) |
| **1 — Import** | Auto-process captured photos | Redis + Import Worker + Gemma + Gemini + embeddings |
| **2 — Family** | Passwordless identity, attribution | FamilyMembers, Preferences, onboarding |
| **3 — Discovery** | Browse, search, swipe to vote | Gallery, pgvector search, inspiration pool |
| **4 — Planner** | Weekly meals + calendar sync | CalendarEvents, drag-drop planner, Google/Outlook |
| **5 — Agents** | Meal suggestions + coordination | MealPlanningExecutor, FamilyCoordinationExecutor |
| **6 — CNF** | Nutritional data (optional) | Background worker, ingredient → kcal mapping |

Each phase ships a working, useful product without depending on later phases.

## Key Design Decisions

### Frontend: Next.js (not Client-Side React)
**Why:** Better for meal planning workflows, SSR capabilities, aligns with API-first approach.

### AI Agent Architecture (Core Agents)
Three stateless query services implemented in .NET 10 (same ecosystem as Recipe API):
1. **SuggestMealsAgent** — Weekly meal planning with family preferences + constraints (<5s)
2. **SearchRecipesAgent** — Natural language search with pgvector + re-ranking (<3s)
3. **CoordinateFamilyAgent** — Shopping list generation and task coordination (<2s)

**Deployment:** Agents deployed as service classes in Recipe API; exposed via REST endpoints (`/api/agents/suggest`, `/api/agents/search`, `/api/agents/shopping-list`). Can be extracted to standalone service if needed.
**Model:** Mistral via Ollama (`http://ollama:11434`)
**Vector store:** PostgreSQL + pgvector
**Abstraction:** Built on standard HTTP + SQL libraries (not LangChain); allows swapping to Semantic Kernel or cloud embeddings later

See [ADR-009](src/specs/decisions/009-agent-framework-and-implementation.md) for implementation strategy and Phase 5 readiness.

### Data Architecture
- **Database:** PostgreSQL with pgvector
  - Core tables: `recipes`, `ingredients`, `FamilyMembers`, `Preferences`, `Allergies`, `CalendarEvents`, `inspirationPool`, `DietaryGoals`
  - Embeddings in `recipes.embedding` (Vector 1536) for semantic search
  - pgvector IVFFlat index for approximate nearest neighbor queries
- **Family Isolation:** Passwordless cookie-based identity (X-Family-Member-Id header)
- **Real-time Sync:** Polling at 30-second intervals (PWA → API); future WebSocket upgrade planned
- **State Sync:** Zustand store, Service Worker caching, offline-first PWA

### Service Infrastructure
1. **Recipe API** (.NET 10) — REST endpoints for recipes, family, schedule
2. **Import Worker** (.NET 10) — Redis consumer, 2-pass AI extraction (Gemma + Gemini)
3. **Calendar Sync Worker** (.NET 10) — 5-minute polling of Google Calendar & Microsoft Graph APIs
4. **Next.js PWA** — Frontend, identity management, UI
5. **PostgreSQL** — Persistent data store
6. **Redis** — `recipe:import:queue` stream for async job processing
7. **Ollama** — Local embeddings, re-ranking, and agent inference

## Deliverables Checklist

### Spec Files ✅ Complete
- [x] `ai-agents.spec.md` — .NET 10 agents (SuggestMeals, SearchRecipes, CoordinateFamily)
- [x] `frontend-pwa.spec.md` — Next.js (App Router), Zustand, Tailwind, Workbox
- [x] `discovery-search.spec.md` — Swipe physics (Framer Motion), pgvector search, inspiration pool
- [x] `meal-planning.spec.md` — Weekly list, day scrubber, drag-drop, calendar constraint awareness
- [x] `sharing-collaboration.spec.md` — Passwordless identity, polling sync (30s), real-time vote propagation
- [x] `integration.spec.md` — Component map, Ollama/Gemini/Calendar APIs, Redis streams, env vars
- [x] `migration-strategy.spec.md` — Experiment → main alignment, forward-only migrations, phase checklist
- [x] `security.spec.md` — Passwordless auth, input validation, container hardening, data privacy
- [x] `performance.spec.md` — Target latencies, Native AOT, pgvector indexing, NAS resource budget
- [x] `operations.spec.md` — Docker Compose, startup order, backup strategy, NAS architecture (Synology DS723+)
- [x] `testing.spec.md` — xUnit (API/Worker), Vitest (PWA), Playwright (E2E), Testcontainers
- [x] `ROADMAP.md` — Phase 0–6 breakdown with spec coverage mapping
- [x] `phase0-mvp.spec.md` — Phase 0 services, endpoints, routes, DoD checklist (Redis null-check, no AI)

### Architecture Decision Records (ADRs) ✅ Complete
- [x] ADR-001: Database choice (PostgreSQL + pgvector)
- [x] ADR-002: Local vs cloud extraction (Gemma local + Gemini API)
- [x] ADR-003: Messaging queue (Redis Streams)
- [x] ADR-004: Family isolation (Device-level passwordless)
- [x] ADR-005: Frontend framework (Next.js)
- [x] ADR-006: Containerization (Chiseled .NET 10, Node.js Alpine)
- [x] ADR-007: Recipe import worker architecture (2-pass pipeline, Redis consumer)
- [x] ADR-008: API identity and reliability (X-Family-Member-Id header, connection pooling)
- [x] ADR-009: Agent framework & implementation (.NET 10 services in Recipe API, Ollama + pgvector, no LangChain)
- [x] ADR-010: **Calendar Sync Worker** (User OAuth for Google, Azure AD for Outlook, exponential backoff, soft failures)
- [x] ADR-011: **Real-time sync strategy** (Polling 30s/15s, `updatedAt` timestamps, stale-data banner, WebSocket in Phase 5+)

## Next Steps (Implementation)
1. [ ] **Phase 0 (MVP)**: Implement Recipe API + PWA + PostgreSQL (no Redis, no AI)
   - Deliverables: Recipe capture end-to-end, family member CRUD, cookie-based identity
2. [ ] **Phase 1 (Import)**: Add Redis + Import Worker + Ollama + pgvector embeddings
   - Deliverables: Auto-structured recipe metadata, hero image generation
3. [ ] **Phase 2 (Family)**: Implement identity model, preferences, allergies
   - Deliverables: Family Settings UI, per-member preference tracking
4. [ ] **Phase 3 (Discovery)**: Swipe discovery + pgvector search
   - Deliverables: Card stack with physics, natural language search, inspiration pool consensus
5. [ ] **Phase 4 (Planner)**: Weekly meal scheduler + calendar sync worker
   - Deliverables: Planner UI, drag-drop, Google/Outlook sync, constraint awareness
6. [ ] **Phase 5 (Agents)**: Deploy agent services, meal suggestions, shopping lists
   - Deliverables: Agent API endpoints, weekly suggestions, aggregated shopping list
7. [ ] **Phase 6 (CNF)**: Optional nutritional data pipeline
   - Deliverables: Ingredient → nutrient mapping, dietary goal tracking

### Per-Phase Implementation Order
See [ROADMAP.md](src/specs/ROADMAP.md) for detailed phase breakdown and spec coverage.
Each phase is independently deployable and adds value without blocking later phases.
