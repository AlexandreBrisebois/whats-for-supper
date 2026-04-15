# What's For Supper — Implementation Roadmap

Each phase ships a working, useful product. Later phases build on earlier ones without breaking them.

## Phase 0 — MVP: Recipe Capture End-to-End

**Goal**: A family can add recipes and view them. No AI, no Redis.

### Services
- **Next.js PWA**: Profile selection (cookie persistence), camera capture, 4-point rating, recipe submit.
- **Recipe API (.NET 10)**: `POST /api/recipes`, `GET /recipe/{id}/original/{n}`, `GET|POST|DELETE /api/family`. File storage only (no Redis).
- **PostgreSQL**: `recipes`, `family_members` tables. Migrations run on API startup.
- **Docker Compose**: `api` + `postgres` + `pwa`.

### Definition of Done
- `docker compose up` → all services healthy.
- Family member created via API.
- Recipe uploaded with 2 images → files appear on NAS, record in PostgreSQL.
- PWA shows "Who are you?" on first launch, persists selection in cookie.
- PWA camera flow completes, recipe submitted, confirmation shown.

---

## Phase 1 — Import: AI Processing Pipeline

**Goal**: Uploaded recipes are automatically structured and get a hero image.

### Additions
- **Redis**: `recipe:import:queue` stream.
- **Import Worker (.NET 10)**: Redis consumer, Pass 1 (Gemma OCR), Pass 2 (Gemini hero image).
- **Ollama**: Local model service (Gemma).
- API updated to publish to Redis stream after upload.

### Definition of Done
- Upload triggers Redis message.
- Import Worker processes message: `recipe.json` written, `hero.jpg` written.
- PostgreSQL `raw_metadata` and `ingredients` columns populated.
- Failed jobs appear in `recipe:import:error` dead-letter stream.

---

## Phase 2 — Family: Passwordless Identity & Attribution

**Goal**: Every action is attributed to a family member. Family management is self-service.

### Additions
- **PWA Settings screen**: Add/remove family members.
- **FamilyMembers, Preferences, Allergies** tables in PostgreSQL.
- `X-Family-Member-Id` header enforced on all mutation endpoints.
- `addedBy` attribution stored on all recipes.

### Definition of Done
- New family member added via Settings.
- Recipe upload attributed to the correct family member.
- Preferences (Love/Like/Dislike) stored per member.

---

## Phase 3 — Discovery: Browse, Search & Swipe

**Goal**: Family discovers and votes on recipes together.

### Additions
- **PWA Discovery screen**: Swipe card stack, stamps, undo, inspiration pool.
- **pgvector embeddings**: Populated by Import Worker after Pass 1.
- **SearchRecipesAgent**: Natural language search via Ollama + pgvector.
- `inspirationPool` table in PostgreSQL.
- Consensus threshold: 2+ family member votes → "Family Favorite".

### Definition of Done
- Card stack loads and swiping works with physics (rotation, snap-back, stamps).
- Right swipe adds to inspiration pool; left swipe vetoes for all devices.
- Natural language search returns relevant results in < 3s.

---

## Phase 4 — Planner: Weekly Dashboard & Calendar Sync

**Goal**: Family has a shared meal plan synced with real calendars.

### Additions
- **PWA Planner screen**: Vertical week list, day scrubber, sparse Breakfast/Lunch slots.
- **CalendarEvents** table in PostgreSQL.
- **Calendar Sync Worker**: 5-minute polling for Google/Outlook.
- Drag-drop meal slot movement.
- "Mark as Cooked" status.

### Definition of Done
- Recipe scheduled to a slot appears in weekly list.
- Drag-drop moves recipe between slots.
- "Busy" blocks from Google Calendar flag constrained days.
- Planned meals pushed to Google Calendar as events.

---

## Phase 5 — Agents: Intelligent Meal Planning

**Goal**: AI suggests meals and generates shopping lists.

### Additions
- **SuggestMealsAgent**: Weekly meal suggestions based on preferences + constraints.
- **CoordinateFamilyAgent**: Shopping list generation from weekly plan.
- Agent API endpoints (`/api/agents/suggest`, `/api/agents/shopping-list`).
- PWA surfaces suggestions and shopping list.

### Definition of Done
- "Suggest meals" action returns ranked recipe suggestions in < 5s.
- Shopping list aggregates ingredients from the week's planned meals.

---

## Phase 6 — CNF: Nutritional Data (Optional)

**Goal**: Best-effort nutritional information for planned meals.

### Additions
- **CNF background worker**: Maps recipe ingredients to Canadian Nutrient File IDs.
- `DietaryGoals` table in PostgreSQL.
- PWA surfaces kcal estimates on meal tiles (with "Best Effort" badge).

---

## Spec Coverage

| Spec | Phase |
|---|---|
| [recipe-api.spec.md](recipe-api.spec.md) | 0 |
| [recipe-data.spec.md](recipe-data.spec.md) | 0+ |
| [frontend-pwa.spec.md](frontend-pwa.spec.md) | 0+ |
| [recipe-import.spec.md](recipe-import.spec.md) | 1 |
| [sharing-collaboration.spec.md](sharing-collaboration.spec.md) | 2 |
| [discovery-search.spec.md](discovery-search.spec.md) | 3 |
| [meal-planning.spec.md](meal-planning.spec.md) | 4 |
| [integration.spec.md](integration.spec.md) | 1+ |
| [ai-agents.spec.md](ai-agents.spec.md) | 5 |
| [security.spec.md](security.spec.md) | 0+ |
| [operations.spec.md](operations.spec.md) | 0+ |
| [testing.spec.md](testing.spec.md) | 0+ |
| [performance.spec.md](performance.spec.md) | 0+ |
| [migration-strategy.spec.md](migration-strategy.spec.md) | 0+ |
