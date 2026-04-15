# Discovery & Search Specification

This document defines the recipe discovery and search experiences for "What's For Supper". Discovery is Phase 3 of the roadmap; it transforms meal planning into an engaging shared activity.

## 1. Overview

Two complementary discovery modes:
1. **Swipe Discovery ("The Light Bulb")** — Card-based collaborative voting (see also [recipe-pwa.spec.md §5](recipe-pwa.spec.md))
2. **Natural Language Search** — pgvector semantic search powered by `SearchRecipesAgent`

## 2. Swipe Discovery

### 2.1 Card Stack Architecture
- Top card: `z-index: 100`, full size.
- Second card: `z-index: 90`, scaled to 0.95, blurred 2px.
- Stack is continuously replenished from the recipe library (no daily limit).

### 2.2 Swipe Physics
- **Rotation**: Proportional to horizontal drag. Max ±15° at 50% container width.
- **Commit Threshold**: Displacement > 25% container width OR flick velocity > 0.5 px/ms.
- **Snap Back**: Spring animation on release below threshold (300ms, `cubic-bezier(0.18, 0.89, 0.32, 1.28)`).
- **Implementation**: Framer Motion `useDragControls` + `useAnimation`.

### 2.3 Swipe Outcomes

| Direction | Action |
|---|---|
| Right (Like) | Add to family Inspiration Pool (`inspirationPool`) |
| Left (Dislike/Veto) | Remove from active session and pool for all family members |
| Undo | Restore previously swiped card to top of stack |

### 2.4 Inspiration Pool & Consensus
- `inspirationPool` records: `recipeId`, `voterIds[]`, `consensusReached` (bool).
- `consensusReached = true` when `voterIds.length >= 2` (configurable threshold).
- Consensus recipes are visually flagged as "Family Favorite" on planner tiles.
- Veto (left swipe by any member) immediately removes from pool for all devices.

### 2.5 Real-Time Sync
- The discovery session state (`inspirationPool`, veto events) is shared across all household devices.
- Sync mechanism: polling or WebSocket (TBD in `integration.spec.md`).

## 3. Natural Language Search

### 3.1 Entry Points
- Search bar on the Discovery screen.
- Search bar on the Planner screen (to find a recipe to schedule).

### 3.2 Query Flow
1. User enters a natural language query (e.g., "quick pasta under 30 minutes").
2. Frontend calls `POST /api/agents/search` with the query string.
3. `SearchRecipesAgent` embeds the query, runs hybrid pgvector + SQL query.
4. Results returned as ordered recipe cards.

### 3.3 Filter Capabilities
- Automatically filters out recipes matching any family member's `Allergies`.
- Optionally filter by `rating` (Love only, Like+Love, etc.).

### 3.4 Performance Target
- < 3 seconds from query submission to results rendered.

## 4. Recipe Card Design

Each card displays (per [recipe-pwa.spec.md §5.3](recipe-pwa.spec.md)):
- **Hero image**: top 75%, `object-fit: cover`.
- **Glassmorphic panel** (bottom 25%): label, family rating emoji, metadata chips.
- **Stamps**: "LIKE" (sage green) and "NOPE" (terracotta), opacity proportional to drag distance.

## 5. Data Requirements

- `recipes.embedding` (Vector 1536) must be populated by the Import Worker before a recipe appears in discovery.
- `inspirationPool` state stored in PostgreSQL `discovery_state` table (see [recipe-data.spec.md §6.2](recipe-data.spec.md)).
