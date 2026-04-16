# Phase 0 MVP Specification

## Overview

Phase 0 is the minimal end-to-end implementation of "What's For Supper". A family can:
1. Select their identity (profile) on first launch
2. Capture a recipe using the device camera
3. Rate the recipe (4-point scale)
4. Submit the recipe and get confirmation

**Key constraint:** Phase 0 has no AI processing, no calendar integration, no multi-device sync, and no Redis. It is intentionally minimal to validate the core workflow quickly.

---

## 1. Services & Infrastructure

### 1.1 Docker Compose Services

Phase 0 runs only three services:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
    # ...

  api:
    build: ./api
    image: whats-for-supper/api:latest
    depends_on:
      postgres:
        condition: service_healthy
    # ...

  pwa:
    build: ./pwa
    image: whats-for-supper/pwa:latest
    depends_on:
      api:
        condition: service_healthy
    # ...
```

**No Redis, no import-worker, no calendar-sync-worker, no ollama.**

### 1.2 Environment Variables

**Required for API:**
- `POSTGRES_CONNECTION_STRING` — PostgreSQL connection (e.g., `postgres://postgres:password@postgres:5432/recipes`)
- `RECIPES_ROOT` — Filesystem path for recipe images (e.g., `/data/recipes`). Must be writable by API process.
- `API_BASE_URL` — Self-reference for image URLs (e.g., `http://api:5000`)

**Required for PWA:**
- `NEXT_PUBLIC_API_BASE_URL` — Recipe API endpoint (e.g., `http://api:5000`)

**Schema Initialization:**
PostgreSQL schema is created via SQL init script in docker-compose. No migrations needed for Phase 0.

### 1.3 PostgreSQL Schema

**Extensions required:**
- `uuid-ossp` — for `gen_random_uuid()`
- `vector` (pgvector) — not used in Phase 0, but included for forward compatibility

**Tables (in scope for Phase 0):**

```sql
-- Family members
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating SMALLINT NOT NULL CHECK (rating >= 0 AND rating <= 3),
  added_by UUID REFERENCES family_members(id) ON DELETE SET NULL,
  notes TEXT,
  raw_metadata JSONB,
  ingredients JSONB,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Tables (out of scope for Phase 0, created in later phases):**
- `preferences`, `allergies`, `calendar_events`, `sync_state`, `inspiration_pool`, `dietary_goals` — created in migrations but empty until their respective phases.

**Indexes (Phase 0):**
- `recipes.created_at DESC` — for efficient list queries (newest first).

### 1.4 Redis Behavior in Phase 0

**Issue:** [recipe-api.spec.md](./recipe-api.spec.md) describes a Redis notification on recipe upload. However, Phase 0 has no Redis to receive it.

**Resolution:** The Recipe API checks whether `REDIS_CONNECTION_STRING` is configured. If absent, the upload succeeds and saves files to disk, but skips the Redis publish.

**Implementation:**
```csharp
// In API controller
if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING"))) {
    // Publish to Redis stream
    await redisClient.PublishAsync("recipe:import:queue", message);
} 
// Otherwise, skip silently. No error, no blocking.
```

**No feature flags, no conditional compilation.** Just a runtime check on the env var.

---

## 2. API Endpoints

### 2.0 Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "api": "ok",
    "database": "ok",
    "schema": "ok"
  }
}
```

**Behavior:**
- Returns `200 OK` if API process is running, database is connectable, and core tables exist (`family_members`, `recipes`).
- Returns `503 Service Unavailable` if any check fails.

**Used by:** Docker Compose health checks and container orchestration.

---

### 2.1 Recipe Creation

**Endpoint:** `POST /api/recipes`

**Request:**
- Multipart form data
- `rating` (required) — integer 0–3
- `cookedMealImageIndex` (optional) — integer, index of the image showing the cooked recipe, or `-1` if no image shows the cooked meal (for genAI to generate later)
- `files` (required) — one or more images (MIME types: `image/jpeg`, `image/png`, `image/webp`)

**Response:**
```json
{
  "recipeId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Recipe saved successfully"
}
```

**Validation:**
- **Image count:** Min 1, max 20 images per recipe
- **Image size:** Max 20MB per image
- **MIME types:** Only `image/jpeg`, `image/png`, `image/webp` allowed
- **Rating:** Must be 0, 1, 2, or 3
- **cookedMealImageIndex:** Must be in range [−1, imageCount−1]
- **X-Family-Member-Id header:** Required (any valid UUID accepted in Phase 0)

**Behavior:**
- Save images raw (no compression) to `{RECIPES_ROOT}/{recipeId}/original/0.jpg`, `original/1.jpg`, etc.
- Create `{RECIPES_ROOT}/{recipeId}/recipe.info` with metadata:
  ```json
  {
    "rating": 3,
    "cookedMealImageIndex": 0,
    "imageCount": 2,
    "capturedAt": "2026-04-14T15:30:45.123Z"
  }
  ```
- Write `recipes` table row with `added_by = <X-Family-Member-Id header value>`.
- Return `recipeId` immediately.
- If `REDIS_CONNECTION_STRING` is set, publish to `recipe:import:queue` (Phase 1+).

**Error cases:**
- No images: `400 Bad Request` — "At least one image is required"
- More than 20 images: `400 Bad Request` — "Max 20 images per recipe"
- Image exceeds 20MB: `400 Bad Request` — "Image too large (max 20MB)"
- Invalid MIME type: `400 Bad Request` — "Only JPEG, PNG, and WebP images are supported"
- Invalid rating (not 0–3): `400 Bad Request` — "Rating must be 0, 1, 2, or 3"
- `cookedMealImageIndex` out of range: `400 Bad Request` — "Invalid cooked meal image index"
- Missing `X-Family-Member-Id` header: `400 Bad Request` — "X-Family-Member-Id header required"
- Disk write fails: `500 Internal Server Error`
- `RECIPES_ROOT` missing or not writable: `500 Internal Server Error` — "Storage unavailable"

### 2.2 Recipe List

**Endpoint:** `GET /api/recipes`

**Query Parameters:**
- `page` (optional, default 1) — integer ≥ 1
- `limit` (optional, default 20) — integer, max 50

**Response:**
```json
{
  "updatedAt": "2026-04-14T15:30:45.123Z",
  "recipes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "rating": 3,
      "addedBy": {
        "id": "...",
        "name": "Alice"
      },
      "imageCount": 2,
      "heroAvailable": false,
      "createdAt": "2026-04-14T15:30:45.123Z"
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "hasMore": true
  }
}
```

**Behavior:**
- Return newest recipes first (order by `created_at DESC`).
- `addedBy` is nested: `{ id, name }`. If `recipes.added_by` is NULL, `addedBy = null`.
- `heroAvailable` is `true` if `hero.jpg` exists at `{RECIPES_ROOT}/{recipeId}/hero.jpg` (Phase 1+).

**Error cases:**
- Invalid `page` or `limit`: `400 Bad Request`

### 2.3 Recipe Detail

**Endpoint:** `GET /api/recipes/{id}`

**Response:**
```json
{
  "updatedAt": "2026-04-14T15:30:45.123Z",
  "recipe": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "rating": 3,
    "notes": "Added olive oil to make it richer",
    "addedBy": {
      "id": "...",
      "name": "Alice"
    },
    "images": [
      { "index": 0, "url": "/api/recipe/550e8400-e29b-41d4-a716-446655440000/original/0" },
      { "index": 1, "url": "/api/recipe/550e8400-e29b-41d4-a716-446655440000/original/1" }
    ],
    "heroImage": {
      "url": "/api/recipe/550e8400-e29b-41d4-a716-446655440000/hero"
    },
    "createdAt": "2026-04-14T15:30:45.123Z"
  }
}
```

**Behavior:**
- Return all recipe metadata + image URLs.
- `heroImage` is null in Phase 0 (populated in Phase 1 after import worker runs).
- Image URLs are relative paths (backend handles the full URL construction).

**Error cases:**
- Recipe not found: `404 Not Found`

### 2.4 Image Retrieval

**Endpoint:** `GET /recipe/{recipeId}/original/{photoIndex}`

**Response:**
- Binary image stream (Content-Type: `image/jpeg` or `image/png`).
- File is served directly from NAS filesystem.

**Error cases:**
- Recipe not found: `404 Not Found`
- Photo index out of range: `404 Not Found`

**Endpoint:** `GET /recipe/{recipeId}/hero`

**Response:**
- Binary image stream (Content-Type: `image/jpeg`).
- Only available after Phase 1 (import worker creates `hero.jpg`).

**Error cases:**
- Recipe not found or hero not available: `404 Not Found`

### 2.5 Family Management

**Endpoint:** `GET /api/family`

**Response:**
```json
{
  "updatedAt": "2026-04-14T15:30:45.123Z",
  "members": [
    { "id": "...", "name": "Alice" },
    { "id": "...", "name": "Bob" }
  ]
}
```

**Endpoint:** `POST /api/family`

**Request:**
```json
{ "name": "Charlie" }
```

**Response:**
```json
{ "id": "...", "name": "Charlie" }
```

**Endpoint:** `DELETE /api/family/{id}`

**Response:**
- `204 No Content` on success.
- `404 Not Found` if member does not exist.

---

## 3. PWA Routes & Flows

### 3.1 Route Map

```
/                    → Home screen (with "Add Recipe" button)
/onboarding          → Family member selection + "Don't see your name? Add it" option
/capture             → Camera, rating, submit
/capture/confirm     → Confirmation ("Recipe saved!")
```

**Note:** REST API endpoints for recipe retrieval (`/api/recipes`, `/api/recipes/{id}`) exist for testing via curl/Postman; no browser UI for recipe viewing in Phase 0.

### 3.2 First Launch Flow
1. **User opens app in browser.**
2. Check for `member_id` cookie (30-day expiry).
3. If no cookie → redirect to `/onboarding`.
4. `/onboarding` renders family member selection:
   - Fetches `GET /api/family` → list of family members.
   - Shows list + "Don't see your name? Add it" button.
   - User taps their name → `member_id` cookie set → redirect to `/home`.
5. Home screen (`/home`) shows welcome message and navigation to Capture.

### 3.3 Capture Flow
1. User navigates to `/capture`.
2. Camera component (using native `getUserMedia`):
   - User can take multiple photos.
   - Photos are displayed in an `ImageReview` gallery strip.
3. Cooked meal image selection:
   - User can select which image shows the finished dish (sets `finishedDishImageIndex`).
4. Rating selector:
   - 4-point scale (0 = Unknown, 1 = Dislike, 2 = Like, 3 = Love).
   - Large touchable icons.
5. Submit button → `POST /api/recipes` with multipart data and `X-Family-Member-Id` header.
6. On success → show `SubmitConfirmation` modal/view.

### 3.4 Recipe API (Testing Only)

**REST Endpoints (for curl/Postman testing):**
- `GET /api/recipes` — Returns paginated recipe list
- `GET /api/recipes/{id}` — Returns recipe metadata and image URLs
- `GET /recipe/{recipeId}/original/{photoIndex}` — Returns image binary
- `GET /recipe/{recipeId}/hero` — Returns hero image binary (Phase 1+)

**Browser Routes:**
- `/recipes` and `/recipes/[id]` browser routes do not exist in Phase 0 (added in Phase 1)

---

## 4. Data Model Details

### 4.1 Recipe.Info File Format

**Location:** `{RECIPES_ROOT}/{recipeId}/recipe.info`

**Content (JSON):**
```json
{
  "rating": 3,
  "cookedMealImageIndex": 0,
  "imageCount": 2,
  "capturedAt": "2026-04-14T15:30:45.123Z"
}
```

**Fields:**
- `cookedMealImageIndex` — integer index of the cooked meal image (0–based), or `-1` if no image shows the cooked meal.

**Used by:** Import Worker (Phase 1+) reads this on each job to determine whether to extract recipe metadata from the cooked meal image or generate a hero image from recipe description. The import worker can compute `hasCookedMealImage` from the condition `cookedMealImageIndex >= 0` if needed.

### 4.2 X-Family-Member-Id Header

**Phase 0 behavior:** Header is required on all recipe submissions. PWA ensures header is always present (via `familyMemberId` cookie from onboarding). API does not validate the header value; any UUID is accepted.

**Phase 2+ behavior:** Header is required and validated against existing family members. Invalid or missing header returns `400 Bad Request`.

---

## 5. Definition of Done

### Automated Checklist
- [ ] `docker compose up` starts all three services successfully.
- [ ] `docker compose ps` shows healthy status for `api`, `postgres`, `pwa`.
- [ ] PostgreSQL migrations run on API startup (no manual schema creation needed).
- [ ] `POST /api/family` creates a family member via API directly (curl or Postman).
- [ ] `GET /api/family` returns the created member.
- [ ] `POST /api/recipes` with 2+ images and a rating creates a recipe record and files on disk.
- [ ] Recipe files appear at `{RECIPES_ROOT}/{recipeId}/original/0.jpg`, `original/1.jpg`.
- [ ] `recipe.info` file is written to disk.
- [ ] `GET /api/recipes/{id}` returns the recipe metadata.
- [ ] `GET /api/recipes` returns a paginated list including the just-created recipe.
- [ ] `GET /recipe/{recipeId}/original/0` returns the image binary (correct Content-Type).

### Manual Checklist (Browser)
- [ ] Open PWA in browser at `http://localhost:3000`.
- [ ] On first load, redirects to `/onboarding`.
- [ ] `/onboarding` shows family member list + "Don't see your name? Add it" option (empty list for fresh DB).
- [ ] Tap "Don't see your name? Add it" → input name → creates family member via `POST /api/family`.
- [ ] New member appears in list.
- [ ] Tap the family member name → `familyMemberId` cookie set, redirect to home (`/`).
- [ ] Home screen (`/`) shows "Add Recipe" button.
- [ ] Tap "Add Recipe" → navigate to `/capture`.
- [ ] Camera interface loads (or fallback message if browser doesn't support).
- [ ] Select 2 photos (or mock 2 photos in test mode).
- [ ] Mark one photo as the "cooked recipe" image (or select "none show the cooked meal").
- [ ] Select rating (e.g., 3 stars).
- [ ] Tap Submit → request sent to `POST /api/recipes` with `X-Family-Member-Id` header and `cookedMealImageIndex`.
- [ ] On success, navigate to `/capture/confirm` and show confirmation message with `recipeId`.
- [ ] Tap [Add Another] → `/capture` again (reset form).
- [ ] Wait or dismiss → auto-redirect to home (`/`).
- [ ] Home screen shows again; cycle can repeat with "Add Recipe" button.

### Integration Checklist
- [ ] `GET /health` returns `200 OK` with all checks passing.
- [ ] No Redis required; `POST /api/recipes` succeeds without `REDIS_CONNECTION_STRING`.
- [ ] `POST /api/recipes` rejects requests without `X-Family-Member-Id` header (returns `400 Bad Request`).
- [ ] Image validation enforces 20MB max size and max 20 images per recipe.

---

## 6. Non-Goals for Phase 0

- **No AI processing** (images are stored raw; no Gemma/Gemini extraction).
- **No pgvector embeddings** (embedding column exists in schema for forward compatibility but is unused).
- **No Redis** (no import worker, no async jobs).
- **No multi-device sync** (no polling logic, no WebSocket).
- **No meal planning UI** (planner is a placeholder showing empty state).
- **No authentication** (no passwords, no tokens; `X-Family-Member-Id` header is optional and not validated).
- **No preferences, allergies, or dietary goals** (tables exist but are empty).
- **No calendar integration** (no sync state, no external calendar reads/writes).

---

## 7. Future Enhancements (Phases 1+)

| Phase | What Changes |
|-------|--------------|
| **1** | Add Redis, Import Worker, Ollama; `raw_metadata` and `embedding` columns populated; `hero.jpg` created. |
| **2** | Add `preferences`, `allergies` tables and UI; `X-Family-Member-Id` header validation; `addedBy` attribution. |
| **3** | Add `inspiration_pool` table and Discovery swipe UI; pgvector search. |
| **4** | Add `calendar_events`, `sync_state` tables; Planner UI; Calendar Sync Worker; polling logic. |
| **5** | Add agents, WebSocket, notifications. |
| **6** | Add `dietary_goals`, CNF worker. |

