# Phase 0 Implementation Prompt

Use this prompt in a new Claude Code session to implement Phase 0 MVP.

---

## Context

You are implementing Phase 0 of "What's For Supper" — a family recipe acquisition app. The project has been thoroughly planned with specifications, architecture, and development workflow. Your task is to build the backend API, frontend PWA, database schema, and hint system for Phase 0.

**Key resources:**
- **Phase 0 Spec**: `src/specs/phase0-mvp.spec.md` (requirements, endpoints, flows)
- **Project Structure**: `PROJECT_STRUCTURE.md` (folder organization)
- **PWA Structure**: `pwa/SRC_STRUCTURE.md` (component organization)
- **Local Dev**: `LOCAL_DEV_LOOP.md` (workflow and testing)
- **Hints Plan**: `/Users/alex/.claude/plans/hidden-purring-gosling.md` (approved hint system architecture)
- **Task Reference**: `TASK_REFERENCE.md` (development commands)

**Key principles:**
1. **Earth tone aesthetic** — Use palette from `src/specs/recipe-pwa.spec.md` § 1.1 (Sage Green #4B5D4D, Terracotta #B25E4C)
2. **Visual-first hints** — Minimal text, maximum visual cues (icons, animations)
3. **Bilingual** — English + French, extensible for more languages
4. **Fast local loop** — Use `task dev:api` / `task dev:pwa` for instant feedback
5. **Monorepo structure** — API in `/api`, PWA in `/pwa`, shared in `/shared`

---

## Phase 0 Scope (MVP Only)

### User Flow
1. **Onboarding** → Select family member or "Don't see your name? Add it"
2. **Home Screen** → "Add Recipe" button
3. **Capture** → Camera → Photos → Cooked meal selection → Rating → Submit
4. **Confirmation** → "Recipe saved!" + "Add Another?" → Back to Home

### No-Gos for Phase 0
- ❌ No AI/ML (images stored raw)
- ❌ No Redis (no async jobs)
- ❌ No multi-device sync
- ❌ No planner UI
- ❌ No offline mode
- ❌ No preferences/allergies
- ❌ No authentication (optional `X-Family-Member-Id` header)

---

## Implementation Tasks

### Phase 0A: Foundation (Backend + Database)

**1. Database Schema & Migrations**
- Create `database/migrations/001_initial_schema.sql`
  - `family_members` table (id, name, completed_tours JSONB)
  - `recipes` table (id, rating, added_by, notes, raw_metadata, ingredients, embedding, created_at, updated_at)
  - Add indexes on `recipes.created_at DESC`
  - Create required extensions: `uuid-ossp`, `pgvector`

**2. API (.NET Backend)**
- Create `api/src/RecipeApi/RecipeApi.csproj` (C# .NET 8 project)
- Controllers:
  - `FamilyController.cs`: GET /api/family, POST /api/family, DELETE /api/family/{id}
  - `RecipeController.cs`: POST /api/recipes, GET /api/recipes, GET /api/recipes/{id}
  - `HealthController.cs`: GET /health
  - Image endpoint: GET /recipe/{recipeId}/original/{photoIndex}, GET /recipe/{recipeId}/hero
- Services:
  - `FamilyService.cs` — Family member CRUD
  - `RecipeService.cs` — Recipe creation, listing, retrieval
  - `ImageService.cs` — Image storage, validation, retrieval
  - `TourService.cs` — Track hint tour completion
  - `ValidationService.cs` — Image validation (20MB max, 20 images max)
- DTOs for all request/response objects
- Middleware for error handling, CORS
- Database migrations auto-run on startup
- `/health` endpoint returns: `{ "status": "healthy", "checks": { "api": "ok", "database": "ok", "schema": "ok" } }`

**File structure:**
```
api/
├── src/RecipeApi/
│   ├── Program.cs
│   ├── Controllers/
│   ├── Services/
│   ├── Models/
│   ├── Data/
│   ├── Dto/
│   └── Middleware/
├── Dockerfile
└── RecipeApi.csproj
```

### Phase 0B: Frontend & Hints (PWA)

**3. PWA Project Setup**
- Create `pwa/package.json` with Next.js, TypeScript, Tailwind, Zustand, Framer Motion
- Create `pwa/next.config.js`, `tailwind.config.ts`, `tsconfig.json`
- Create `pwa/.env.local` from `.env.example`
- Folder structure per `pwa/SRC_STRUCTURE.md`

**4. Design Tokens & Styling**
- Create `pwa/src/app/globals.css` with earth tone design tokens
  - Colors: Sage Green (#4B5D4D), Terracotta (#B25E4C), Cream (#FDF8ED), Dark Charcoal (#2D312E)
  - Typography: Outfit (sans-serif), Playfair Display (headings)
  - Spacing, shadows, border radius
- Configure Tailwind to use tokens

**5. Localization (i18n)**
- Create `pwa/src/lib/i18n/index.ts` — i18n initialization + helpers
- Create `pwa/src/locales/en/common.json` — Shared labels, buttons
- Create `pwa/src/locales/en/hints.json` — Hint content for all tours
- Create `pwa/src/locales/fr/common.json` — French translations
- Create `pwa/src/locales/fr/hints.json` — French hints
- Locale stored in cookie + localStorage

**6. Hint System Components**
- `pwa/src/components/hints/HintOverlay.tsx` — Spotlight + popover (Intro.js-style)
- `pwa/src/components/hints/Spotlight.tsx` — Canvas-based spotlight effect
- `pwa/src/components/hints/HintPopover.tsx` — Text popover with CTA button
- `pwa/src/hooks/useHintTour.ts` — Tour state management
- `pwa/src/store/tourStore.ts` — Zustand store for tour state
- `pwa/src/lib/hintService.ts` — API calls + localization

**7. Identity & Authentication**
- `pwa/src/hooks/useIdentity.ts` — Read/write familyMemberId from cookie
- `pwa/src/lib/identity/cookie.ts` — Cookie helpers
- `pwa/src/lib/api/client.ts` — Fetch wrapper that injects X-Family-Member-Id header

**8. Core UI Components**
- `pwa/src/components/ui/Button.tsx`
- `pwa/src/components/ui/Input.tsx`
- `pwa/src/components/ui/Card.tsx`
- `pwa/src/components/ui/GlassPanel.tsx` (glassmorphic overlay)
- `pwa/src/components/ui/Spinner.tsx`

**9. Identity/Onboarding Components**
- `pwa/src/components/identity/ProfileCard.tsx` — Single profile card
- `pwa/src/components/identity/ProfileList.tsx` — List of profiles
- `pwa/src/components/identity/CreateProfileForm.tsx` — Input for new profile
- `pwa/src/components/identity/WhoAreYouOverlay.tsx` — Main onboarding overlay

**10. Capture/Recipe Components**
- `pwa/src/components/capture/CameraCapture.tsx` — Camera access + photo taking
- `pwa/src/components/capture/PhotoGallery.tsx` — Horizontal scrollable gallery
- `pwa/src/components/capture/CookedMealSelector.tsx` — Select which photo is the cooked meal
- `pwa/src/components/capture/RatingSelector.tsx` — 4-point emoji rating (❓👎👍❤️)
- `pwa/src/components/capture/RecipeForm.tsx` — Optional label + notes
- `pwa/src/components/capture/SubmitButton.tsx` — Upload with loading state

**11. Pages**
- `pwa/src/app/page.tsx` — Home (redirect to onboarding or show "Add Recipe" button)
- `pwa/src/app/(auth)/onboarding/page.tsx` — Onboarding flow + hints
- `pwa/src/app/(app)/capture/page.tsx` — Capture flow + hints
- `pwa/src/app/(app)/capture/confirm/page.tsx` — Confirmation screen

**12. API Client**
- `pwa/src/lib/api/client.ts` — Typed fetch wrapper
- `pwa/src/lib/api/family.ts` — Family endpoints
- `pwa/src/lib/api/recipes.ts` — Recipe endpoints
- `pwa/src/lib/api/tours.ts` — Tour completion endpoints

**File structure (PWA):**
```
pwa/
├── src/
│   ├── app/
│   │   ├── (auth)/onboarding/
│   │   ├── (app)/capture/
│   │   ├── (app)/capture/confirm/
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── hints/
│   │   ├── identity/
│   │   ├── capture/
│   │   └── ui/
│   ├── hooks/
│   │   ├── useIdentity.ts
│   │   ├── useHintTour.ts
│   │   └── useCamera.ts
│   ├── store/
│   │   └── tourStore.ts
│   ├── lib/
│   │   ├── api/
│   │   ├── i18n/
│   │   ├── identity/
│   │   └── constants/
│   ├── locales/
│   │   ├── en/
│   │   └── fr/
│   └── types/
├── public/
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Development Workflow

### Local Development Loop

```bash
# Terminal 1: Start services
task dev              # or: docker-compose up -d

# Terminal 2: API with hot reload
cd api && dotnet watch run

# Terminal 3: PWA with hot reload
cd pwa && npm run dev

# Terminal 4: Watch logs
task logs

# Browser: http://localhost:3000
```

### Testing Before Commit
```bash
task review          # Format + Lint + Test
```

### Local Database
```bash
task migrate         # Run migrations
task seed            # Populate test data
task shell:db        # Access database
```

---

## Success Criteria

### Backend (API)
- [ ] All 3 services start: `task dev` starts postgres, api, pwa
- [ ] Health check: `GET /health` returns healthy status
- [ ] Family endpoints work: POST/GET `/api/family`
- [ ] Recipe endpoints work: POST/GET `/api/recipes`
- [ ] Image retrieval: `GET /recipe/{id}/original/0` returns image binary
- [ ] Image validation: Rejects images >20MB, rejects >20 images per recipe
- [ ] Migrations auto-run on startup
- [ ] `X-Family-Member-Id` header is required (returns 400 if missing)

### Frontend (PWA)
- [ ] Home page redirects to `/onboarding` if no family member selected
- [ ] Onboarding shows family list + "Don't see your name? Add it" button
- [ ] Creating family member works, cookie is set
- [ ] Home shows "Add Recipe" button
- [ ] Capture flow: Camera → Photo gallery → Cooked meal selection → Rating → Submit
- [ ] Confirmation shows success message + "Add Another?" button
- [ ] Redirect back to home after confirmation
- [ ] Both English and French translations work
- [ ] Hints appear on first visit (spotlight + guide text)
- [ ] Hints don't replay on second visit (state saved)
- [ ] Earth tone aesthetic applied (sage green, terracotta, cream)

### Integration
- [ ] PWA can upload recipes to API
- [ ] Images saved to disk at `/data/recipes/{uuid}/original/0.jpg`
- [ ] Recipe appears in list: `GET /api/recipes`
- [ ] Recipe detail includes images: `GET /api/recipes/{id}`
- [ ] All tests pass: `task test`

---

## Notes & Tips

### Earth Tone Palette
```
Primary: #4B5D4D (Dark Sage Green)
Secondary: #B25E4C (Deep Terracotta)
Background: #FDF8ED (Warm Cream)
Text: #2D312E (Deep Charcoal Green)
```

### Hint System
- Spotlight overlay with minimal text
- Progress indicator: "Step 2 of 7"
- Visual cues > words (icons, arrows, animations)
- Auto-play on first visit, skip on subsequent visits
- State persisted to family member profile

### Common Commands
```bash
task dev              # Start all services
task dev:api          # API only (hot reload)
task dev:pwa          # PWA only (hot reload)
task test             # Run all tests
task logs             # View logs
task health           # Check services
task review           # Pre-commit checks (format + lint + test)
```

### Debugging
- API errors: `task logs:api`
- PWA errors: `task logs:pwa`
- Database issues: `task shell:db`
- Check services: `task health`

---

## Start Here

1. Read `src/specs/phase0-mvp.spec.md` — understand requirements
2. Read `/Users/alex/.claude/plans/hidden-purling-gosling.md` — understand hint system
3. Read `pwa/SRC_STRUCTURE.md` — understand folder organization
4. Run `task init` — install dependencies, start services, seed data
5. Implement in this order:
   a. Database migrations
   b. API endpoints (Family, Recipe, Health)
   c. PWA pages (Home, Onboarding, Capture, Confirm)
   d. Hint system components + integration
   e. Testing & polish

---

**Good luck! You're building something great. 🚀**
