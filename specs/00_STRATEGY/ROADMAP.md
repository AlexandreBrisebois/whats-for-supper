# What's For Supper — Master Implementation Roadmap

This is the **Single Source of Truth** for project phases, status, and strategic goals.

## Core Feature Phases (Vertical Slices)

| Phase | Goal | Key Additions | Status |
|-------|------|-----------------|--------|
| **0 — MVP** | Recipe capture end-to-end | Next.js + C# + PostgreSQL (no Redis, no AI) | ✅ Done |
| **1 — Import** | AI processing pipeline | DB Polling + Gemma + Gemini + Branding | 🏃 Active |
| **2 — Family** | Identity & Pulse | FamilyMembers, Activity Feed, Approvals | 📝 Planned |
| **3 — Discovery** | Express Planning | Smart Pivot, Swipe Voting, Vector Search | ✅ Done |
| **4 — Planner** | Kitchen & Cook's Mode | Weekly list, Cook's Mode, Calendar Sync | ✅ Done |
| **5 — Agents** | Suggestion Engine | Diet Agent, Shopping Lists | 🏃 Active |
| **6 — Polish** | Resilience | Offline-first, Performance, Final Aesthetics | 📝 Planned |
| **7 — Ops** | Production Ready | Cloudflare Tunnel, Monitoring, Cleanup | 📝 Planned |

---

## Phase 0 — MVP: Recipe Capture End-to-End [COMPLETE]

**Goal**: A family can add recipes and view them. No AI, no Redis.

- **Status**: Backend ready. PWA Phase 0 (Identity, Capture, Rating) **COMPLETED ✅**.

---

## Phase 1 — Import & Branding Alignment [ACTIVE]

**Goal**: Evolve the brand identity and establish the AI processing pipeline.

### Additions
- **Designer Agent Identity**: Established (Mère-Designer persona).
- **Solar Earth Branding**: Implementation of warm, family-centric UI tokens and layout.
- **The Smart Pivot (Planning)**: Design of the express discovery hub on the Home screen.
- **Identity Architecture Pivot**: Implementation of cookie-based `IdentityValidator` for reliable cross-service auth.
- **Modular Worker (DB Polling)**: Optimized processing pipeline (Hybrid Gemma4/Gemini).
- **Recipe Scrapers**: Support for scraping recipes from various websites.

---

## Phase 2 — Family: The Family Pulse

**Goal**: Every action is attributed to a family member. Family engagement becomes a "team sport."

### Additions
- **The Family Pulse**: Collaborative activity feed on the Home screen.
- **Recipe Approvals**: Ability to quickly approve/veto new captures from other members.
- **PWA Settings**: Add/remove family members.
- [x] `X-Family-Member-Id` enforcement.

### Definition of Done
- New captures by "Dad" appear in "Mom's" Pulse feed.
- "Mom" can approve a capture for the weekly plan with 1 tap.

---

## Phase 3 — Discovery: The Smart Pivot [ACTIVE]

**Goal**: Family discovers and votes on recipes via the "Express" high-utility hub.

### Additions
- [x] **Solar Earth UX Refinement**: Editorial header, refined navigation, and 85% glassmorphism.
- [x] **The Smart Pivot (Visuals)**: High-contrast pivot card on Home for unplanned meals.
- [x] **Swipe Discovery (Full)**: Full-screen card-based collaborative voting.
- [ ] **SearchRecipesAgent**: Natural language search via Ollama + pgvector.
- [x] **One-Tap Pivot Execution**: Connect "Quick Fix" chips to the Schedule API.

### PWA Integrations (API-Sync)
- [ ] **Recipe Details**: Implement detailed recipe view with inline `PATCH` editing.
- [x] **AI Hero Visualization**: Use the AI-generated hero images (`/api/recipes/{id}/hero`).
- [ ] **Processing Feedback**: Add visual indicators for recipes in the AI pipeline.

### Implementation Checklist
- [x] **Smart Pivot Card**: Compact `ExpressCard.tsx` (implemented as `SmartPivotCard`).
- [x] **Home Integration**: Conditional display on `home/page.tsx`.
- [ ] **Vector Search API**: Backend support for agentic natural language queries.
- [x] **Swipe Logic**: Right-swipe triggers immediate planning (`TODAY`).

---

## Phase 4 — Planner: The Kitchen & Cook's Mode

**Goal**: Family has a shared meal plan synced with real calendars. Focused on **Supper** (Family Dinner) as the primary coordination event, with support for other slots as future extensions.

### Additions
- [x] **Weekly Planner Screen**: 7-day vertical list with "Solar Earth" aesthetics.
- [x] **The Planning Pivot**: Bottom sheet with Quick Find (5-stack), Search, and Ask paths.
- [x] **Drag-to-Swap**: Reorderable meal cards with API synchronization.
- [x] **Lockdown Workflow**: Decisive "Finalize" action with vote purging and date updates.
- [x] **Schedule API Endpoints**: 5 core endpoints for planner backend (GET, POST lock/move/assign, GET fill-the-gap).
- [x] **Smart Voting Defaults**: Consensus-based pre-selection (51%+ threshold) with visual vote badges and dynamic ordering.
- [x] **Quick Find Modal**: Recipe carousel with hero images, skip/select actions, and fallback placeholders.
- [x] **Cook's Mode**: High-visibility, hands-free UI for step-by-step cooking.
- [ ] **Calendar Sync Worker**: 5-minute polling.

---

## Phase 5 — Agents: Intelligent Meal Planning [ACTIVE]

**Goal**: AI suggests meals, infers dietary metadata, and generates section-categorized shopping lists.

### Additions
- [ ] **DietAgent**: Specialized agent to infer `isVegetarian` and `isHealthyChoice` from recipe data.
- [ ] **Shopping Lists**: Automatic generation of grocery lists from the weekly plan.

---

## Phase 6 — Polish & Resilience

**Goal**: Offline-first visuals and final aesthetics.

---

## Phase 7 — Operations & Infrastructure

**Goal**: Production-ready stability and secure access.

### Additions
- **Secure External Access (Cloudflare Tunnel)**.
- **Dashboard & Monitoring**: Traefik Dashboard.
- **Orphaned File Cleanup**: Active scan for recipe directories with no DB record.

---

| [backend-api.spec.md](../02_BACKEND/backend-api.spec.md) | 0+ | ✅ |
| [TESTING_AND_E2E.md](../04_OPS_TESTING/TESTING_AND_E2E.md) | 0+ | ✅ |
| [ai-worker.spec.md](../03_AI_WORKER/ai-worker.spec.md) | 1 | ✅ |
| [infrastructure.spec.md](../04_OPS_TESTING/infrastructure.spec.md) | 7 | 📝 |

