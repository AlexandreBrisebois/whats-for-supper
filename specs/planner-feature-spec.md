# Planner Feature — Reverse-Engineered Specification
**What's for Supper · Phase 4 (Kitchen & Cook's Mode)**

> **Purpose**: This document is a complete, ground-truth specification assembled by reverse-engineering the live vertical slice — PWA → API → Database. It serves as the authoritative foundation for targeted improvements to this critical feature.
>
> **Team**: Four expert personas collaborated on this document:
> - 🎨 **Mère-Designer (UX Lead)** — "Sanity-First UX, The Toddler Rule"
> - 🏗️ **API Architect** — Contract clarity, consistency, performance
> - 🗄️ **Database Engineer** — Schema integrity, query correctness, edge cases
> - 🔬 **QA Lead** — Test coverage, user journeys, failure modes

---

## 1. Feature Overview

The **Planner** is the "Peace of Mind" center of the app. It transforms the weekly meal planning process from a chore into a calm, collaborative ritual. It is the logical endpoint of the Discovery voting flow and the entry point to Cook's Mode.

### 1.1 Core User Goal
> "What are we having this week, and who decided?" — answered in **2 seconds**.

### 1.2 Primary Actors
| Actor | Role |
|---|---|
| **Mom/Dad (Planner)** | Owns the week; assigns meals, finalizes the plan |
| **All Family Members** | Vote during Discovery; their consensus drives Smart Defaults |
| **The App** | Auto-populates consensus picks; polls for vote updates |

---

## 2. The UX Slice (Mère-Designer 🎨)

### 2.1 Entry Point
- Route: `/planner` (Next.js App Router, `(app)` layout group)
- Authenticated via `x-family-member-id` cookie (set during onboarding)
- Bottom navigation icon triggers navigation

### 2.2 Screen Architecture

```
PlannerPage (page.tsx)
├── Sticky Header (glass-nav, z-30)
│   ├── Segmented Control: [Planner] [Grocery list]
│   └── Week Navigator: ‹ Apr 28 — May 4 · 3/7 Planned ›
│
├── Main Content (AnimatePresence, mode="wait")
│   ├── SolarLoader (loading state)
│   ├── Grocery Tab Placeholder (coming soon)
│   └── Planner Tab
│       └── Reorder.Group (Framer Motion drag-to-reorder)
│           └── 7× Reorder.Item (day cards)
│               ├── Planned: [Thumbnail] [Recipe Name] [Vote Badge] [👨‍🍳] [⠿]
│               └── Unplanned: [+] "Plan a meal" (animated pulse border)
│
├── Finalize Section
│   ├── [Menu's In!] button (unlocked state)
│   └── [✅ Week finalized / Plan next week] (locked state)
│
├── Planning Pivot Sheet (AnimatePresence bottom sheet, z-50)
│   ├── "Quick find" → opens QuickFindModal
│   ├── "Search library" → navigates to /recipes?addToDay=N&weekOffset=N
│   └── "Ask the family" → unlocks week for voting
│
├── QuickFindModal (z-60, AnimatePresence)
│   └── Flip-card carousel (5 curated picks from /fill-the-gap)
│
└── CooksMode (z-100, AnimatePresence full-screen overlay)
    ├── Step-by-step instructions (mock steps, real ingredients from API)
    └── Progress bar + Prev/Next navigation
```

### 2.3 State Inventory (Zustand + Local React State)

| State | Location | Description |
|---|---|---|
| `currentWeekOffset` | `plannerStore` (Zustand) | 0 = this week, +1 = next week, -1 = last week |
| `activeTab` | `plannerStore` (Zustand) | `'planner'` or `'grocery'` |
| `schedule` | `useState<UILocalScheduleDay[]>` | 7-day array, merged from API + smart defaults |
| `isLocked` | `useState<boolean>` | Mirrors API `locked` field |
| `isLoading` | `useState<boolean>` | Controls SolarLoader visibility |
| `showPivot` | `useState<{dayIndex:number} \| null>` | Controls Planning Pivot Sheet |
| `showQuickFind` | `useState<boolean>` | Controls QuickFindModal |
| `successDay` | `useState<number \| null>` | Triggers success ring animation (3s) |
| `activeCookMode` | `useState<UILocalScheduleDay \| null>` | Active Cook's Mode recipe |
| `draggedId` | `useState<string \| null>` | Tracks dragged card's `_uiId` |
| `prevOffset` | `useState<number>` | Used to determine slide direction |

### 2.4 Local UI Type Extension

```typescript
type UILocalScheduleDay = ScheduleDay & {
  _uiId: string;        // Stable key for Framer Motion Reorder
  _isPending?: boolean; // Smart default not yet persisted to DB
  _voteCount?: number | null;
  _unanimousVote?: boolean | null;
};
```

> 🎨 **Mère-Designer Note**: The `_isPending` flag is a critical UX contract — pending smart defaults appear in the grid immediately (optimistic UI) but are only written to DB on "Menu's In!" finalize. This creates a perceived responsiveness that users love.

### 2.5 Data Hydration Strategy

On `currentWeekOffset` change, the page fires **two parallel API calls**:
1. `GET /api/schedule?weekOffset=X` — committed calendar events
2. `GET /api/schedule/X/smart-defaults` — consensus vote pre-selections (current week only)

The results are **merged** in the frontend:
- If a day has a committed `recipe` → use it, mark `_isPending=false`
- If a day is empty AND a smart default exists for that `dayIndex` → inject it, mark `_isPending=true`
- If neither → empty slot (shows "Plan a meal")

**Polling**: Every 30 seconds (when not locked), `updateVoteCounts()` refreshes vote data and dynamically updates `_voteCount` badges and fills newly-reached consensus slots.

### 2.6 Key Interactions

#### Drag-to-Reorder
- Framer Motion `Reorder.Group` / `Reorder.Item`
- Day names/dates are **fixed** to their index — only `recipe` data moves
- `handleReorder` identifies `fromIndex`/`toIndex` using `_uiId` tracking
- API call `POST /api/schedule/move` fired **asynchronously** (non-blocking)

#### Planning Pivot Sheet
Triggered by tapping any day card (planned or unplanned).

| Path | Action |
|---|---|
| **Quick Find** | Opens `QuickFindModal` → calls `getFillTheGap()` → flip-card carousel |
| **Search Library** | Navigates to `/recipes?addToDay={N}&weekOffset={N}` |
| **Ask the Family** | Sets `isLocked=false` locally (opens voting) |

#### Quick Find Modal
- Loads 5 recipes from `GET /api/schedule/fill-the-gap`
- Flip-card UI: front = hero image + name; back = description + ingredients
- "Select" → `assignRecipeToDay()` + updates local state
- "Skip" → cycles to next card (wraps around)

#### Cook's Mode
- Available only for `currentWeekOffset === 0` (current week)
- Triggered by 👨‍🍳 emoji button on recipe cards
- Fetches full recipe details via `getRecipe(id)` for ingredients list
- Steps are **currently mocked** (fixed 5-step template for all recipes)
- Shows dietary badges (isVegetarian, isHealthyChoice) on Prep step

#### Finalize ("Menu's In!")
1. For each `_isPending` day with a recipe → `POST /api/schedule/assign` (persists to DB)
2. Then → `POST /api/schedule/lock?weekOffset=X` (locks all events)
3. Sets `isLocked=true` locally
4. UI transitions to "Week finalized" state with "Plan next week" CTA

### 2.7 Mock Fallback
If API calls fail, the page renders **hardcoded mock data** (Mon: Homemade Lasagna, Wed: Zesty Lemon Chicken) so the UI experience is always demonstrable. This is a development/resilience pattern.

---

## 3. The API Slice (API Architect 🏗️)

### 3.1 Controller: `ScheduleController`
**Route prefix**: `api/schedule`
**File**: `api/src/RecipeApi/Controllers/ScheduleController.cs`

All responses are auto-wrapped in `{ data: ... }` by `SuccessWrappingFilter`.

### 3.2 Endpoint Contracts

#### `GET /api/schedule?weekOffset={int}`
**Service call**: `ScheduleService.GetScheduleAsync(weekOffset)`

**Response shape:**
```json
{
  "data": {
    "weekOffset": 0,
    "locked": false,
    "days": [
      {
        "day": "Mon",
        "date": "2026-04-28",
        "recipe": {
          "id": "uuid",
          "name": "Pasta Carbonara",
          "image": "/api/recipes/{id}/hero",
          "voteCount": null,
          "ingredients": null,
          "description": null
        }
      }
    ]
  }
}
```

**Locked logic**: `locked = true` if ANY calendar event in the week has `status = Locked (1)`.

---

#### `POST /api/schedule/lock?weekOffset={int}`
**Service call**: `ScheduleService.LockScheduleAsync(weekOffset)`

**Side effects (in order)**:
1. Fetches `Planned` events for the week
2. Fetches all `Like` vote counts grouped by `recipe_id`
3. Sets each event's `Status = Locked`, persists vote count snapshot to `VoteCount`
4. Sets `Recipe.LastCookedDate = UtcNow` for each locked recipe
5. **Deletes ALL `recipe_votes`** (global purge, not week-scoped)
6. `SaveChangesAsync()`

> 🏗️ **Architect Note**: Vote purge is **global** (all votes, not just this week's). This is by design — one planning cycle per family at a time. The spec also snapshots vote counts onto the event before purging, preserving history.

---

#### `POST /api/schedule/move` (body: `MoveScheduleDto`)
```json
{ "weekOffset": 0, "fromIndex": 0, "toIndex": 2 }
```
**Service call**: `ScheduleService.MoveScheduleEventAsync(dto)`

**Logic**:
- Both occupied: swap `RecipeId` values
- One occupied: move recipe to the empty slot (via date change)
- Both empty: no-op

---

#### `POST /api/schedule/assign` (body: `AssignScheduleDto`)
```json
{ "weekOffset": 0, "dayIndex": 3, "recipeId": "uuid" }
```
**Service call**: `ScheduleService.AssignRecipeAsync(dto)`

**Logic**: Upsert — if event exists for that date, update `RecipeId`; else create new `CalendarEvent` with `status = Planned`.

---

#### `GET /api/schedule/fill-the-gap`
**Service call**: `ScheduleService.FillTheGapAsync()`

**Priority algorithm**:
1. **Tier 1**: `vw_recipe_matches` (voted recipes) joined to `Recipes`, ordered by `LastCookedDate ASC NULLS FIRST`, take 5
2. **Tier 2**: If fewer than 5, supplement from `vw_discovery_recipes` ordered by `VoteCount DESC`, then `LastCookedDate ASC`

**Returns**: `List<ScheduleRecipeDto>` with `Ingredients` and `Description` populated.

---

#### `GET /api/schedule/{weekOffset}/smart-defaults`
**Service call**: `ScheduleService.GetSmartDefaultsAsync(weekOffset)`

**Consensus algorithm**:
```
threshold = Math.Ceiling((familySize + 1.0) / 2)
```

| Family Size | Threshold | % |
|---|---|---|
| 2 | 2 | 100% |
| 3 | 2 | 67% |
| 4 | 3 | 75% |
| 5 | 3 | 60% |

**Ordering**: Unanimous recipes (all members voted Like) first, then by `LastCookedDate DESC NULLS LAST` (freshest = least recently cooked, `null` = never cooked = first).

**Slot assignment**: Iterates through day indices 0–6, skipping days already occupied by `CalendarEvents`. Assigns one recipe per available slot.

**Returns**: `SmartDefaultsDto` with `PreSelectedRecipes` and `OpenSlots` arrays.

### 3.3 DTO Inventory

| DTO | Fields |
|---|---|
| `ScheduleDays` | `weekOffset`, `locked`, `days[]` |
| `ScheduleDayDto` | `day`, `date`, `recipe?` |
| `ScheduleRecipeDto` | `id`, `name`, `image`, `voteCount?`, `ingredients?`, `description?` |
| `MoveScheduleDto` | `weekOffset`, `fromIndex`, `toIndex` |
| `AssignScheduleDto` | `weekOffset`, `dayIndex`, `recipeId` |
| `SmartDefaultsDto` | `weekOffset`, `familySize`, `consensusThreshold`, `preSelectedRecipes[]`, `openSlots[]`, `consensusRecipesCount` |
| `PreSelectedRecipeDto` | `recipeId`, `name`, `heroImageUrl`, `voteCount`, `familySize`, `unanimousVote`, `dayIndex`, `isLocked` |
| `OpenSlotDto` | `dayIndex` |

### 3.4 PWA API Client (`pwa/src/lib/api/planner.ts`)

Auto-generated client via `apiClient` (Kiota-style). Key gap identified:

```typescript
// assignRecipeToDay passes recipe.image but it's NOT in AssignScheduleDto
// The extra fields (name, image) are silently dropped by the API
export const assignRecipeToDay = async (weekOffset, dayIndex, recipe) => {
  return await apiClient.api.schedule.assign.post({
    weekOffset,
    dayIndex,
    recipeId: recipe.id,  // ✅ used
    // recipe.name and recipe.image are NOT sent — they're used only for local state
  });
};
```

---

## 4. The Database Slice (Database Engineer 🗄️)

### 4.1 Core Tables Involved

#### `calendar_events`
```sql
CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  date date NOT NULL,
  status smallint NOT NULL,           -- 0=Planned, 1=Locked, 2=Cooked, 3=Skipped
  vote_count integer,                 -- snapshot at lock time
  CONSTRAINT calendar_events_status_check CHECK (status >= 0 AND status <= 3)
);
CREATE INDEX idx_calendar_events_recipe_id ON calendar_events (recipe_id);
CREATE INDEX idx_calendar_events_date ON calendar_events (date);
```

> 🗄️ **DB Engineer Note**: There is **no UNIQUE constraint on `date`**. The schema permits multiple `calendar_events` for the same date (e.g., two recipes on Monday). The service uses `FirstOrDefaultAsync` which takes the first match. This is a latent bug — a unique constraint on `date` should be added.

#### `recipe_votes`
```sql
CREATE TABLE recipe_votes (
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  vote smallint NOT NULL,             -- 1=Like, 2=Dislike
  voted_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (recipe_id, family_member_id),
  CONSTRAINT recipe_votes_vote_check CHECK (vote >= 1 AND vote <= 2)
);
```

#### `recipes` (planner-relevant columns)
```sql
last_cooked_date timestamptz  -- Set to UtcNow on LockSchedule
is_discoverable boolean       -- Controls vw_discovery_recipes fallback
```

### 4.2 Database Views

#### `vw_recipe_matches`
```sql
SELECT recipe_id, count(recipe_id) AS vote_count
FROM recipe_votes
WHERE vote = 1  -- Like only
GROUP BY recipe_id;
```
Mapped as EF Core entity `RecipeMatch` (keyed on `recipe_id`).

#### `vw_discovery_recipes`
```sql
SELECT r.id, r.name, r.category, r.description, r.ingredients,
       r.image_count, r.difficulty, r.total_time, r.is_vegetarian,
       r.is_healthy_choice, r.last_cooked_date, r.created_at,
       COALESCE(v.vote_count, 0) AS vote_count
FROM recipes r
LEFT JOIN (SELECT recipe_id, count(*) AS vote_count FROM recipe_votes WHERE vote=1 GROUP BY recipe_id) v
  ON r.id = v.recipe_id
WHERE r.is_discoverable = true;
```

### 4.3 Key Queries (Annotated)

**GetScheduleAsync** — week fetch:
```sql
-- EF: CalendarEvents.Include(Recipe).Where(date IN week)
SELECT ce.*, r.*
FROM calendar_events ce
JOIN recipes r ON ce.recipe_id = r.id
WHERE ce.date >= '2026-04-28' AND ce.date <= '2026-05-04'
```

**GetSmartDefaultsAsync** — consensus computation:
```sql
-- Step 1: Count Like votes
SELECT recipe_id, COUNT(*) AS vote_count
FROM recipe_votes WHERE vote = 1
GROUP BY recipe_id
-- Filter: vote_count >= ceil((family_size + 1) / 2)

-- Step 2: Load recipe metadata
SELECT * FROM recipes WHERE id IN (...)

-- Step 3: Get occupied days
SELECT date FROM calendar_events WHERE date IN week
```

**LockScheduleAsync** — vote snapshot + purge:
```sql
-- Snapshot vote counts
UPDATE calendar_events SET status=1, vote_count=... WHERE week AND status=0;
UPDATE recipes SET last_cooked_date=NOW() WHERE id IN (...);
-- Purge all votes (global)
DELETE FROM recipe_votes;
```

---

## 5. The QA Slice (QA Lead 🔬)

### 5.1 Existing E2E Test Coverage (`pwa/e2e/planner.spec.ts`)

| Test | Status | Notes |
|---|---|---|
| Display segmented control (Planner/Grocery tabs) | ✅ | |
| Display 7 daily cards | ✅ | |
| Week navigation via chevrons | ✅ | Checks date range change |
| Open Planning Pivot Sheet (3 paths visible) | ✅ | |
| Search-to-Planner round-trip with success ring | ✅ | Uses `?success=1&dayIndex=N` URL pattern |
| Cook's Mode: open, navigate steps, close | ✅ | |
| Smart defaults merged into grid | ✅ | Minimal (count check only) |
| Drag-to-reorder (reorder group visible) | ✅ | Minimal (existence check only) |
| Finalize ("Menu's In!") → locks week | ✅ | |

### 5.2 Identified Gaps & Friction Points

#### 🎨 UX Gaps
1. **Cook's Mode steps are mocked** — all 5 steps are hardcoded Bolognese instructions regardless of the actual recipe. The `recipeDetails` fetch is used only for the ingredients list on Step 1.
2. **"Ask the Family" does nothing persistent** — it sets `isLocked=false` locally but does NOT call any API. Votes don't open server-side.
3. **Grocery Tab** — placeholder only; shows "Coming soon" state.
4. **"Search Library" flow** — navigates to `/recipes?addToDay=N`, but the recipes page must handle the `addToDay` param and return the user to `/planner?success=1&dayIndex=N`. This return flow exists but is fragile (depends on query params).
5. **Vote badge** — shows `N voted` for pending defaults but has no tooltip explaining the family consensus threshold.
6. **Finalize sequence** — fires `assign` for ALL pending slots before `lock`. If any assign fails, lock still fires (no rollback / transactional boundary).

#### 🏗️ API Gaps
1. **No `PATCH /api/schedule/{date}/remove`** — there is no way to un-assign a recipe from a day without replacing it with another.
2. **`POST /api/schedule/lock` purges ALL votes globally** — there is no scoping by week. If a user is planning next week simultaneously, those votes are wiped.
3. **Smart defaults only fetched for `weekOffset=0`** — the frontend explicitly skips smart defaults for future weeks.
4. **`FillTheGapAsync` has no filters** — it does not exclude recipes already assigned to the current week, which could result in duplicates.
5. **No pagination on `fill-the-gap`** — hardcoded to 5.
6. **`MoveScheduleEventAsync` uses `FirstOrDefaultAsync` without ordering** — if multiple events exist for a date (possible with missing UNIQUE constraint), behavior is non-deterministic.

#### 🗄️ Database Gaps
1. **Missing UNIQUE constraint on `calendar_events.date`** — the current schema permits multiple events per day. The service's `FirstOrDefaultAsync` pattern is a workaround, not a safeguard.
2. **`VoteCount` on `calendar_events` is nullable** — at lock time, recipes with zero votes would have `null` vote count, not `0`.
3. **No `meal_slot` column on `calendar_events`** — currently supports only one meal per day (Supper). Phase 5+ will need a `slot` column (breakfast/lunch/supper).
4. **`last_cooked_date` set to `UtcNow` at lock time** — the "cooked date" records when the week was finalized, not when the meal was actually cooked that evening. This affects freshness ordering.
5. **Vote purge is undifferentiated** — `DELETE FROM recipe_votes` removes all votes including any cast for future weeks. If the family has started voting on next week's plan before finalizing this week, those votes are lost.

#### 🔬 Test Gaps
1. **Drag-to-reorder test is shallow** — only checks the group exists; does not verify the API call fires or the order updates.
2. **No test for polling behavior** — vote count updates at 30s interval are untested.
3. **"Ask the Family" path is untested** — no E2E coverage.
4. **Cook's Mode step content is untested** — tests only verify the step indicator label, not instruction text.
5. **No test for the mock fallback path** — when API is down, the mock data should render; currently untested.
6. **No API-level tests for ScheduleService** — edge cases (empty week, all slots occupied, no family members) need unit test coverage.

---

## 6. Data Flow Diagram

```
Family Discovery Voting
        │
        ▼
   recipe_votes (DB)
        │
        ├──► vw_recipe_matches (view)
        │         │
        │         ▼
        │   GET /api/schedule/{n}/smart-defaults
        │         │
        │         ▼
        │   SmartDefaultsDto (_isPending UI state)
        │
        └──► vw_discovery_recipes (view)
                  │
                  ▼
            GET /api/schedule/fill-the-gap
                  │
                  ▼
            QuickFindModal (carousel)
                  │
                  ▼
          POST /api/schedule/assign
                  │
                  ▼
         calendar_events (DB, status=Planned)
                  │
                  ▼
          GET /api/schedule?weekOffset=X
                  │
                  ▼
        PlannerPage 7-day grid
                  │
           "Menu's In!" ▼
                  │
        POST /api/schedule/lock
                  │
          ┌───────┴────────┐
          ▼                ▼
  calendar_events      recipes
  status=Locked    last_cooked_date=now()
          │
          ▼
  DELETE FROM recipe_votes (global)
```

---

## 7. Open Questions for the UX/Product Discussion

> These are the decisions that need answering before we can nail the experience.

1. **Cook's Mode steps** — Should steps be sourced from the recipe's `raw_metadata` (instructions scraped from the original page)? Or do we need a new `steps` field extracted during the AI import?

2. **"Ask the Family" API contract** — What does "open for voting" mean server-side? Does it flip a `calendar_events.status` flag? Or is it purely that votes exist in `recipe_votes`?

3. **Vote scope at Lock** — Should `DELETE FROM recipe_votes` be week-scoped (only delete votes for recipes in THIS week's plan) or remain global? Global is simpler but destructive if future-week voting has started.

4. **UNIQUE constraint on `date`** — Is the intent always one recipe per day (Supper only)? If yes, the constraint should be added now. If multi-slot is a near-term feature, add a `(date, meal_slot)` composite unique constraint.

5. **Grocery list** — What data powers it? Aggregated `ingredients` from all `calendar_events` for the week? Is there a Phase 5 agent that categorizes by aisle?

6. **Remove/un-assign** — Should users be able to remove a recipe from a day, leaving it empty? Currently not possible without replacing it.

7. **Past weeks** — The planner shows `currentWeekOffset >= 0` only for the Finalize button. Should past weeks be read-only? Should Cook's Mode be available for past-week meals?

8. **`lastCookedDate` accuracy** — Should the cook date be updated at lock time (planning decision) or when Cook's Mode is completed (actual cooking event)?

---

## 8. Implementation Files Reference

| Layer | File | Purpose |
|---|---|---|
| **PWA Page** | `pwa/src/app/(app)/planner/page.tsx` | Main planner page (869 lines) |
| **PWA Store** | `pwa/src/store/plannerStore.ts` | Zustand: weekOffset, activeTab |
| **PWA API Client** | `pwa/src/lib/api/planner.ts` | 6 API call wrappers |
| **PWA Component** | `pwa/src/components/planner/QuickFindModal.tsx` | Flip-card carousel |
| **PWA Component** | `pwa/src/components/planner/CooksMode.tsx` | Step-by-step cook overlay |
| **API Controller** | `api/src/RecipeApi/Controllers/ScheduleController.cs` | 6 endpoints |
| **API Service** | `api/src/RecipeApi/Services/ScheduleService.cs` | 5 public methods, 296 lines |
| **API DTOs** | `api/src/RecipeApi/Dto/ScheduleDays.cs` | Schedule response shapes |
| **API DTOs** | `api/src/RecipeApi/Dto/SmartDefaultsDto.cs` | Consensus response shapes |
| **API DTOs** | `api/src/RecipeApi/Dto/MoveScheduleDto.cs` | Move request |
| **API DTOs** | `api/src/RecipeApi/Dto/AssignScheduleDto.cs` | Assign request |
| **DB Model** | `api/src/RecipeApi/Models/CalendarEvent.cs` | EF entity + status enum |
| **DB Model** | `api/src/RecipeApi/Models/RecipeMatch.cs` | EF entity for `vw_recipe_matches` |
| **DB Schema** | `api/database/schema.sql` | Source of truth for all tables/views |
| **OpenAPI** | `specs/openapi.yaml` | (Lines 687–835 cover schedule endpoints) |
| **E2E Tests** | `pwa/e2e/planner.spec.ts` | 8 Playwright tests |

---

*Generated: 2026-04-28 · Assembled from live code reverse-engineering*
