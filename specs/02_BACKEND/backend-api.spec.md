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
- **calendar_events**: `id`, `recipe_id`, `slot` (B/L/S), `date`, `status` (Planned, Cooked, Skipped).
- **sync_state**: Tracks last successful sync with Google/Outlook.

---

## 3. API Endpoints (Scheduler & Planning)

### 3.1 Weekly Schedule
- **GET** `/api/schedule?weekOffset=X`: Returns 7-day list for the specified week.
- **POST** `/api/schedule/lock?weekOffset=X`: Finalizes the plan, purges votes, and updates `lastCookedDate`.
- **POST** `/api/schedule/move`: Swaps two recipes within a week. Payload: `{ weekOffset, fromIndex, toIndex }`.
- **GET** `/api/schedule/fill-the-gap`: Returns a curated "Quick Find" stack of 5 recipes.

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
