# Backend API & Data Specification

**Status**: AUTHORITATIVE  
**Lane**: 02_BACKEND  
**Source of Truth for**: API Contracts, Database Schema, and Data Synchronization.

---

## 1. Primary Data Store: PostgreSQL

The system uses a single **PostgreSQL** instance (pgvector/pgvector:pg17) as a converged data platform. 

### 1.1 Core Extensions
- **pgvector**: Enables vector embeddings for Natural Language search and AI agent recommendations.
- **uuid-ossp**: For generating unique recipe and family identifiers.

---

## 2. Database Schema (Key Models)

### 2.1 Recipe Table (Document-Relational Hybrid)
Recipes balance structure with the flexibility required for AI-extracted data.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key (gen_random_uuid). |
| `name` | String | Human-readable title (from AI or manual). |
| `total_time` | String | ISO 8601 duration (e.g., PT30M). |
| `rating` | SMALLINT | 0-3 scale. |
| `is_discoverable`| Boolean | Whether it appears in the Discovery feed. |
| `raw_metadata` | JSONB | Original extraction output. |
| `ingredients` | JSONB | Normalized Schema.org array. |
| `embedding` | Vector(1536) | Semantic representation. |
| `added_by` | UUID | FK to `family_members`. |

### 2.2 Family & Identity
- **family_members**: `id` (UUID), `name` (String), `created_at`.
- **recipe_votes**: `recipe_id`, `family_member_id`, `vote` (Love, Like, Dislike, Veto), `voted_at`.
- **allergies**: `member_id`, `ingredient_tag`.

### 2.3 Scheduler
- **calendar_events**: 
  | Column | Type | Description |
  | :--- | :--- | :--- |
  | `id` | UUID | Primary Key (gen_random_uuid). |
  | `recipe_id` | UUID | FK to recipes. |
  | `date` | DateOnly | ISO 8601 date (YYYY-MM-DD). |
  | `status` | SMALLINT | 0=Planned, 1=Locked, 2=Cooked, 3=Skipped. |
  
  **Phase 4 Scope**: Supper (family dinner) only. Breakfast/Lunch reserved for Phase 5+.
  
- **sync_state**: Tracks last successful sync with Google/Outlook.

---

## 3. API Endpoints (Scheduler & Planning)

### 3.1 Weekly Schedule Endpoints

#### 3.1.1 GET `/api/schedule?weekOffset=X`
Returns the meal plan for a given week (Mon–Sun).

**Request:**
```
GET /api/schedule?weekOffset=0
```

**Response** (auto-wrapped):
```json
{
  "data": {
    "weekOffset": 0,
    "locked": false,
    "days": [
      {
        "day": "Mon",
        "date": "2026-04-21",
        "recipe": {
          "id": "uuid",
          "name": "Pasta Carbonara",
          "image": "/api/recipes/{id}/hero"
        }
      },
      ...
    ]
  }
}
```

**Behavior:**
- `weekOffset=0`: Current week (Mon of week containing today)
- `weekOffset=1`: Next week
- `weekOffset=-1`: Previous week
- `locked=true` if any event in the week has `status=Locked`
- `recipe=null` if no meal planned for that day

---

#### 3.1.2 POST `/api/schedule/lock?weekOffset=X`
Finalizes the plan: sets all Planned events to Locked, updates `recipes.last_cooked_date`, and purges all `recipe_votes`.

**Request:**
```
POST /api/schedule/lock?weekOffset=0
Header: X-Family-Member-Id: {memberId}
```

**Response**:
```json
{
  "data": {
    "message": "Schedule locked"
  }
}
```

**Side Effects:**
- `UPDATE calendar_events SET status=1 WHERE date IN week AND status=0`
- `UPDATE recipes SET last_cooked_date=NOW() WHERE id IN (locked recipes)`
- `DELETE FROM recipe_votes` (clears voting slate for next planning cycle)

---

#### 3.1.3 GET `/api/schedule/{weekOffset}/smart-defaults`
Returns pre-selected meals based on 51%+ family consensus (by voting), ordered by freshness (least recently cooked). Enables intelligent week planning without requiring manual recipe selection.

**Request:**
```
GET /api/schedule/0/smart-defaults
```

**Response** (auto-wrapped):
```json
{
  "data": {
    "weekOffset": 0,
    "familySize": 4,
    "consensusThreshold": 3,
    "preSelectedRecipes": [
      {
        "recipeId": "uuid",
        "name": "Pasta Carbonara",
        "heroImageUrl": "/api/recipes/{id}/hero",
        "voteCount": 4,
        "unanimousVote": true,
        "dayIndex": 0,
        "isLocked": true
      },
      {
        "recipeId": "uuid",
        "name": "Fish Tacos",
        "heroImageUrl": "/api/recipes/{id}/hero",
        "voteCount": 3,
        "unanimousVote": false,
        "dayIndex": 1,
        "isLocked": false
      }
    ],
    "openSlots": [
      { "dayIndex": 5 },
      { "dayIndex": 6 }
    ],
    "consensusRecipesCount": 2
  }
}
```

**Consensus Logic:**
- **Threshold**: `Math.Ceiling((familySize + 1) / 2)` (51% rule)
  - Family of 2: 2 votes (both)
  - Family of 3: 2 votes (67%)
  - Family of 4: 3 votes (75%)
  - Family of 5: 3 votes (60%)
- **Vote Filter**: Only counts `recipe_votes` where `vote = Like` (dislike/veto votes excluded)
- **Ordering**: Unanimous recipes (100% consensus) first, then by `last_cooked_date DESC` (freshest)
- **Slot Assignment**: Recipes assigned to day indices 0-6 (Mon–Sun), skipping days with existing CalendarEvents
- **Unanimous Flag**: `isLocked=true` if `voteCount == familySize`

**Behavior:**
- Returns all recipes at or above consensus threshold, ordered by freshness
- Open slots represent days without a consensus recipe (available for manual selection or future voting)
- Provides real-time vote state on every refresh; recipes dynamically move in/out as votes change
- Respects existing calendar events (does not overwrite pre-planned days)

---

#### 3.1.5 POST `/api/schedule/move`
Swaps recipes between two days in a week. Handles null slots gracefully.

**Request:**
```json
POST /api/schedule/move
{
  "weekOffset": 0,
  "fromIndex": 0,
  "toIndex": 2
}
```

**Behavior:**
- Indices are 0-6 (Mon–Sun)
- If both slots have recipes: swap `recipe_id` values
- If one slot is empty: move the recipe to the empty slot and delete the event from the source
- If both are empty: no-op

**Response**:
```json
{
  "data": {
    "message": "Recipe moved"
  }
}
```

---

#### 3.1.6 POST `/api/schedule/assign`
Upserts a recipe assignment for a specific day (idempotent).

**Request:**
```json
POST /api/schedule/assign
{
  "weekOffset": 0,
  "dayIndex": 3,
  "recipeId": "uuid"
}
```

**Behavior:**
- If event exists for that day: update `recipe_id`
- If no event: create new `CalendarEvent` with `status=Planned`
- **Idempotent**: Multiple calls with same params produce same result

**Response**:
```json
{
  "data": {
    "message": "Recipe assigned"
  }
}
```

---

#### 3.1.7 GET `/api/schedule/fill-the-gap`
Returns 5 curated recipe suggestions for the "Quick Find" stack.

**Priority Order:**
1. **Matched Recipes** (from voting): Top 5 ordered by `last_cooked_date ASC NULLS FIRST` (least recently cooked first → promotes variety)
2. **Fallback**: If fewer than 5 matches, supplement from `discovery_recipes` ordered by `vote_count DESC`, then `last_cooked_date ASC`

**Request:**
```
GET /api/schedule/fill-the-gap
```

**Response** (auto-wrapped list):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Recipe Name",
      "rating": 2,
      ...
    },
    ...
  ]
}
```

**Database Views:**
- `vw_recipe_matches`: Results of voting round, joined to `Recipes`
- `vw_discovery_recipes`: High-engagement recipes for fallback

---

## 3.2 Management & Maintenance

### 3.2.1 POST `/api/management/backup`
Triggers an asynchronous backup of the recipe database and images.

### 3.2.2 POST `/api/management/seed`
Triggers an asynchronous restore/seed from the backup data.

### 3.2.3 GET `/api/management/status`
Returns the status of the current or most recent management task.

---

## 3.3 Recipe Import Pipeline

### 3.3.1 POST `/api/recipes/{id}/import`
Triggers an asynchronous import/analysis task for a raw recipe.

### 3.3.2 GET `/api/recipes/{id}/import`
Returns the status of a specific recipe's import task.

### 3.3.3 GET `/api/recipes/import-status`
Returns a summary of the import pipeline's overall health and counts.

---

## 3.4 Implementation Details

### File References
- **Model**: [api/src/RecipeApi/Models/CalendarEvent.cs](../../api/src/RecipeApi/Models/CalendarEvent.cs)
- **Service**: [api/src/RecipeApi/Services/ScheduleService.cs](../../api/src/RecipeApi/Services/ScheduleService.cs) (156 lines, 5 public methods)
- **Controller**: [api/src/RecipeApi/Controllers/ScheduleController.cs](../../api/src/RecipeApi/Controllers/ScheduleController.cs)
- **DTOs**: 
  - [ScheduleDays.cs](../../api/src/RecipeApi/Dto/ScheduleDays.cs) (response envelope)
  - [SmartDefaultsDto.cs](../../api/src/RecipeApi/Dto/SmartDefaultsDto.cs) (consensus pre-selection)
  - [MoveScheduleDto.cs](../../api/src/RecipeApi/Dto/MoveScheduleDto.cs)
  - [AssignScheduleDto.cs](../../api/src/RecipeApi/Dto/AssignScheduleDto.cs)
- **Migration**: [20260423151137_AddCalendarEvents.cs](../../api/Migrations/20260423151137_AddCalendarEvents.cs)
- **Tests**: [api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs](../../api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs) (5 tests, all passing)

### Key Decisions
1. **Column Naming**: `status` column uses lowercase to match PostgreSQL check constraint convention. Entity config specifies `.HasColumnName("status")`.
2. **Week Calculation**: Monday-based (Mon = day 0, Sun = day 6). Formula: `daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7`.
3. **Image URL**: Relative path `/api/recipes/{id}/hero` allows frontend to use same base URL resolution.
4. **Fill-the-Gap Priority**: Matched recipes first (promotes user voting), fallback to discovery (ensures full stack).
5. **Vote Purging**: `LockScheduleAsync` deletes all `recipe_votes` (one-time per planning cycle, not per-week).
6. **Consensus Threshold (51% Rule)**:
   - Formula: `Math.Ceiling((familySize + 1.0) / 2)` yields clear majority
   - Family of 2: 2 votes (100%), Family of 3: 2 votes (67%), Family of 4: 3 votes (75%), Family of 5: 3 votes (60%)
   - Only counts `VoteType.Like` votes; Dislike/Veto votes excluded
   - Provides universal threshold independent of family size
7. **Fresh Recipe Ordering**: Within consensus recipes, order by `LastCookedDate DESC NULLS LAST`
   - Recipes never cooked (`null`) appear first
   - Recently cooked recipes appear last
   - Prevents fatigue from eating the same meals
8. **Unanimous Lock**: Recipes with `voteCount == familySize` are marked `isLocked=true`
   - Signals to frontend: "Everyone agreed — this is locked in"
   - Used for visual highlighting (Ochre or Sage Green)
   - Does NOT prevent UI reassignment; only visual signal
9. **Existing Calendar Events**: Smart defaults respects pre-planned days
   - If a day already has a `CalendarEvent`, it's skipped during slot assignment
   - Allows manual planning to take precedence over consensus
10. **Edge Cases**:
    - **No consensus recipes**: Returns empty `preSelectedRecipes`, all 7 slots open
    - **Fewer than 7 consensus**: Returns all consensus recipes + open slots for remainder
    - **More than 7 consensus**: Returns top 7 by freshness (remainder are available via search)
    - **No family members**: Defaults to `familySize=0`, threshold=0 (no consensus possible)

---

## 4. API Response Standards

### 4.1 The Rule: ✅ WRAP ALL SUCCESSFUL RESPONSES
All successful (2xx) API responses **MUST be automatically wrapped** in a `{ data: ... }` object by the `SuccessWrappingFilter`.

**Example:**
```json
{
  "data": [
    { "id": "...", "name": "Alice" }
  ]
}
```

### 4.2 Implementation Logic
- **Controllers**: Return DTOs directly. Do NOT manually wrap.
- **Filter**: `SuccessWrappingFilter` ([api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs](../../api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs)) intercepts `ObjectResult` and wraps it once.
- **Mock API**: Must match production wrapping to ensure PWA consistency.

---

## 5. Identity & Authentication

### 5.1 X-Family-Member-Id Header
- **Authoritative**: Required on all mutation requests.
- **Validation**: (Phase 2+) Validated against the `family_members` table.
- **Persistence**: Managed via browser cookies (30-day expiry).

---

## 6. Synchronization Logic

### 6.1 Calendar Sync (5-Minute Polling)
A dedicated **Calendar Sync Worker** runs every 5 minutes:
1. **Pull**: Fetches "Busy/Free" status from external calendars.
2. **Resolve**: Updates `calendar_events` with constraints.
3. **Push**: Updates external calendars with planned meal titles and prep times.

---

## 7. Security & Sovereignty
- **Passwordless**: Identity is device-bound (PWA) and matched to `family_members`.
- **Local Sovereignty**: All DB data and images are stored in a dedicated `/data` volume on the NAS.
- **Network Isolation**: DB is not exposed to the public internet; external traffic flows through the API.
