# Phase 0 Implementation - Sequential Sessions

Break Phase 0 into 10 focused, self-contained sessions. Each session:
- Delivers 1 concrete artifact
- Can be done in its own Claude session
- Keeps context under 100k tokens
- Builds on previous artifacts
- Takes ~30-60 minutes

---

## Session 1: Database Schema & Migrations

**Artifact:** `database/migrations/` folder with SQL files

**Context needed:** Just the Phase 0 spec

**What to build:**
- `database/migrations/001_initial_schema.sql` — Create tables (family_members, recipes)
- `database/migrations/002_add_indexes.sql` — Add required indexes
- `database/README.md` — How to run migrations

**Success:** 
- Tables created correctly
- Indexes optimize query performance
- Migration files are idempotent

**Prompt:**

```
Task: Create Phase 0 database schema and migrations

You are building the database foundation for Phase 0 MVP of "What's For Supper".

Read these requirements:
- Phase 0 spec: src/specs/phase0-mvp.spec.md (section 1.3: PostgreSQL Schema)
- Use PostgreSQL 17 with pgvector extension
- Create two tables: family_members and recipes
- Add required indexes for performance

Deliverables:
1. database/migrations/001_initial_schema.sql
   - family_members table (id, name, created_at, updated_at, completed_tours JSONB)
   - recipes table (id, rating, added_by, notes, raw_metadata, ingredients, embedding, created_at, updated_at)
   - Foreign key: recipes.added_by → family_members.id
   - Constraints: rating check (0-3)
   - Extensions: uuid-ossp, pgvector

2. database/migrations/002_add_indexes.sql
   - Index on recipes.created_at DESC (for list queries)
   - Any other performance indexes

3. database/README.md
   - How to run migrations manually
   - How migrations are auto-run on API startup
   - How to rollback if needed
   - Schema diagram (ASCII art)

Requirements:
- Use standard PostgreSQL syntax (compatible with Flyway/Entity Framework migrations)
- Make migrations idempotent (safe to run multiple times)
- Include comments explaining complex parts
- Timestamp fields use TIMESTAMPTZ NOT NULL DEFAULT NOW()
- All IDs use UUID with DEFAULT gen_random_uuid()

Start by creating the migration files. Verify they are syntactically correct.
```

---

## Session 2: API Foundation & Project Structure

**Artifact:** `api/` folder with .NET 8 project structure, configs, Dockerfile

**Context needed:** Phase 0 spec + Project structure doc

**What to build:**
- `api/RecipeApi.csproj` — C# project file
- `api/src/RecipeApi/Program.cs` — App startup, DI config
- `api/src/RecipeApi/appsettings.json` — Config template
- `api/Dockerfile` — Container configuration
- Folder structure per spec

**Success:**
- `dotnet build` compiles successfully
- `dotnet run` starts without errors
- Health check endpoint returns OK

**Prompt:**

```
Task: Set up Phase 0 API project structure and configuration

You are creating the ASP.NET Core 8 foundation for Phase 0 API.

Requirements:
- Target: .NET 8.0
- Language: C#
- Database: Entity Framework Core with PostgreSQL
- Features: CORS, error handling middleware, structured logging

Deliverables:
1. api/RecipeApi.csproj
   - Dependencies: EF Core, Npgsql, pgvector, Newtonsoft.Json, Serilog
   - Target framework: net8.0
   - ImplicitUsings, Nullable enabled

2. api/src/RecipeApi/Program.cs
   - Configure services: DbContext, CORS, controllers, logging
   - Middleware: error handling, request logging
   - Migrations auto-run on startup
   - Configure PostgreSQL connection string from env

3. api/src/RecipeApi/appsettings.json
   - Logging configuration (Serilog)
   - CORS allowed origins
   - Connection strings template

4. api/Dockerfile
   - Multi-stage build (build → runtime)
   - Expose port 5000
   - Health check command: curl /health

5. api/.dockerignore
   - Exclude build artifacts, test results, .git

6. Folder structure:
   - api/src/RecipeApi/Controllers/
   - api/src/RecipeApi/Services/
   - api/src/RecipeApi/Models/
   - api/src/RecipeApi/Data/
   - api/src/RecipeApi/Dto/
   - api/src/RecipeApi/Middleware/
   - api/src/RecipeApi.Tests/

Target output:
- `dotnet build` succeeds
- Project structure matches spec
- Dockerfile builds successfully
- All dependencies resolve
```

---

## Session 3: API Endpoints & Database Context

**Artifact:** Controllers, Services, DTOs, and DbContext with migrations working

**Context needed:** Sessions 1-2 artifacts + Phase 0 spec

**What to build:**
- `api/src/RecipeApi/Data/RecipeDbContext.cs` — EF Core DbContext
- `api/src/RecipeApi/Models/` — Domain models
- `api/src/RecipeApi/Dto/` — Request/Response DTOs
- `api/src/RecipeApi/Controllers/HealthController.cs`
- `api/src/RecipeApi/Controllers/FamilyController.cs`
- `api/src/RecipeApi/Controllers/RecipeController.cs`
- `api/src/RecipeApi/Services/` — Business logic services

**Success:**
- All endpoints respond with correct status codes
- Database schema creates automatically
- POST /api/family creates family member
- GET /api/recipes returns empty list (no 500 errors)

**Prompt:**

```
Task: Implement Phase 0 API endpoints and database integration

You are implementing the core API endpoints for Phase 0.

Context:
- Database migrations from Session 1 are in database/migrations/
- API project structure from Session 2 is set up
- Reference: src/specs/phase0-mvp.spec.md sections 1.3-2.5

Implement:

1. api/src/RecipeApi/Data/RecipeDbContext.cs
   - Map Models to tables
   - Configure relationships
   - Configure indexes (fluent API)
   - Auto-run migrations on startup (via Program.cs)

2. api/src/RecipeApi/Models/
   - FamilyMember.cs (id, name, completedTours, createdAt, updatedAt)
   - Recipe.cs (id, rating, addedBy, notes, rawMetadata, ingredients, embedding, createdAt, updatedAt)
   - TourCompletion.cs (internal model for completedTours)

3. api/src/RecipeApi/Dto/
   - FamilyMemberDto.cs
   - CreateFamilyMemberDto.cs (just name)
   - RecipeDto.cs
   - CreateRecipeDto.cs
   - RecipeListResponseDto.cs
   - PaginationDto.cs
   - HealthCheckResponseDto.cs

4. api/src/RecipeApi/Services/
   - FamilyService.cs
     * GetAllFamilyMembers()
     * CreateFamilyMember(name)
     * DeleteFamilyMember(id)
   - RecipeService.cs
     * CreateRecipe(request) — validate images, save to disk, create DB record
     * GetRecipesList(page, limit) — paginated, newest first
     * GetRecipeDetail(id)
     * CompleteTour(familyMemberId, tourId)
   - ValidationService.cs
     * ValidateImage(file) — check size (20MB max), MIME type
     * ValidateImageCount(count) — max 20 images
     * ValidateRating(rating) — 0-3
     * ValidateCookedMealIndex(index, imageCount) — -1 to imageCount-1
   - ImageService.cs
     * SaveImages(recipeId, files) → /data/recipes/{uuid}/original/0.jpg
     * GetImage(recipeId, photoIndex) → binary stream
     * CreateRecipeInfo(metadata) → recipe.info JSON file

5. api/src/RecipeApi/Controllers/
   - HealthController.cs
     * GET /health → checks API, DB, schema, returns { status, checks }
   - FamilyController.cs
     * GET /api/family → list all members
     * POST /api/family → create new member (name in body)
     * DELETE /api/family/{id} → delete member
   - RecipeController.cs
     * POST /api/recipes → create recipe (multipart form data)
       - Files (images)
       - rating (0-3)
       - cookedMealImageIndex (-1 or 0-based index)
       - X-Family-Member-Id header (required)
       - Returns: { recipeId, message }
     * GET /api/recipes → list paginated (page, limit query params)
       - Returns: { updatedAt, recipes[], pagination }
     * GET /api/recipes/{id} → detail with all metadata
       - Returns: { updatedAt, recipe { id, rating, addedBy, images[], createdAt } }
     * GET /recipe/{recipeId}/original/{photoIndex} → image binary
     * GET /recipe/{recipeId}/hero → hero image (Phase 1, return 404 in Phase 0)

6. api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs
   - Catch exceptions, return proper HTTP responses
   - Log errors with context

Validation Rules (from Phase 0 spec section 2.1):
- Image size: max 20MB per image
- Image count: min 1, max 20 per recipe
- MIME types: image/jpeg, image/png, image/webp
- Rating: must be 0, 1, 2, or 3
- cookedMealImageIndex: -1 or 0 to imageCount-1
- X-Family-Member-Id header: required, returns 400 if missing

Testing:
- Test endpoints via curl/Postman before moving to next session
- Verify database creates tables automatically on first run
- Verify migrations are idempotent (can run multiple times safely)
```

---

## Session 4: API Testing & Validation

**Artifact:** `api/src/RecipeApi.Tests/` with comprehensive test suite

**Context needed:** Sessions 1-3 artifacts + Phase 0 spec

**What to build:**
- Unit tests for Services (family, recipe, validation, image)
- Integration tests for Controllers
- Test data/fixtures

**Success:**
- `dotnet test` runs all tests and passes
- Coverage of critical paths: create family, create recipe, list recipes
- Image validation tests cover all error cases

**Prompt:**

```
Task: Create Phase 0 API test suite

You are writing tests for the Phase 0 API endpoints and services.

Context:
- API endpoints from Session 3
- Test project: api/src/RecipeApi.Tests/
- Test framework: xUnit
- Use in-memory SQLite for integration tests (easier than postgres)

Create:

1. api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs
   - Test: CreateFamilyMember creates with unique ID
   - Test: GetAllFamilyMembers returns all members
   - Test: DeleteFamilyMember removes member
   - Test: Empty name is rejected

2. api/src/RecipeApi.Tests/Services/ValidationServiceTests.cs
   - Test: ValidateImageCount rejects >20 images
   - Test: ValidateRating rejects invalid ratings
   - Test: ValidateCookedMealIndex rejects out-of-range
   - Test: ValidateImage rejects files >20MB
   - Test: ValidateImage rejects invalid MIME types

3. api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs
   - Test: GET /api/family returns list
   - Test: POST /api/family creates member
   - Test: DELETE /api/family/{id} removes member
   - Test: DELETE non-existent returns 404

4. api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs
   - Test: POST /api/recipes without images returns 400
   - Test: POST /api/recipes with invalid rating returns 400
   - Test: POST /api/recipes without X-Family-Member-Id returns 400
   - Test: POST /api/recipes succeeds with valid data
   - Test: GET /api/recipes returns paginated list
   - Test: GET /api/recipes/{id} returns recipe detail
   - Test: GET /recipe/{id}/original/{index} returns image binary

5. api/src/RecipeApi.Tests/Controllers/HealthControllerTests.cs
   - Test: GET /health returns healthy status
   - Test: Response includes api, database, schema checks

6. api/RecipeApi.Tests.csproj
   - Dependencies: xUnit, Moq, EF Core in-memory (for tests)

Guidelines:
- Use xUnit for test framework
- Create fixtures/builders for test data
- Test both happy path and error cases
- Keep tests focused and readable
- Group tests by feature (Arrange-Act-Assert)

Target:
- All tests pass
- At least 60% code coverage
- No flaky tests
```

---

## Session 5: PWA Project Setup & Configuration

**Artifact:** `pwa/` folder with Next.js, TypeScript, Tailwind, configs

**Context needed:** Project structure doc + Phase 0 spec

**What to build:**
- `pwa/package.json` — dependencies
- `pwa/tsconfig.json` — TypeScript config
- `pwa/next.config.js` — Next.js config
- `pwa/tailwind.config.ts` — Tailwind + design tokens
- `pwa/.eslintrc.json` — Linting
- Folder structure per PWA spec
- Design token CSS

**Success:**
- `npm install` works
- `npm run build` compiles successfully
- `npm run dev` starts dev server
- TypeScript strict mode enabled

**Prompt:**

```
Task: Set up Phase 0 PWA project structure and configuration

You are creating the Next.js foundation for Phase 0 PWA.

Context:
- Reference: pwa/SRC_STRUCTURE.md
- Design tokens: src/specs/recipe-pwa.spec.md § 1.1 (earth tones)
- Earth tone palette:
  * Primary: #4B5D4D (Dark Sage Green)
  * Secondary: #B25E4C (Deep Terracotta)
  * Background: #FDF8ED (Warm Cream)
  * Text: #2D312E (Deep Charcoal Green)

Create:

1. pwa/package.json
   - Framework: Next.js 14+
   - Language: TypeScript
   - Styling: Tailwind CSS 3+
   - State: Zustand
   - Animation: Framer Motion
   - UI utilities: Lucide React, classnames
   - Dev: ESLint, Prettier, TypeScript
   Dependencies:
     * next, react, react-dom
     * typescript, @types/react, @types/node
     * tailwindcss, autoprefixer, postcss
     * zustand
     * framer-motion
     * lucide-react
     * next-pwa (optional, for PWA features in Phase 2+)

2. pwa/tsconfig.json
   - Strict mode: true
   - JSX: react-jsx
   - Module resolution: node
   - Path aliases: @/* → ./src/*
   - Target: ES2020

3. pwa/next.config.js
   - React strict mode: true
   - SWC minify: true
   - TypeScript strict: true
   - Environment variables: NEXT_PUBLIC_API_BASE_URL

4. pwa/tailwind.config.ts
   - Extend theme with earth tone colors
   - Custom spacing, typography
   - Enable dark mode (for future)
   - Add glassmorphism plugin (backdrop-blur)
   - Design token CSS variables

5. pwa/src/app/globals.css
   - CSS custom properties (design tokens)
   - Colors: --primary, --secondary, --background, --text
   - Typography: --font-sans, --font-heading
   - Spacing scale
   - Utilities for glassmorphism, shadows
   - Tailwind directives (@tailwind, @layer)

6. pwa/.eslintrc.json
   - Extends: next/core-web-vitals
   - Strict TypeScript rules
   - No console.log in production

7. pwa/.prettierrc.json
   - Semi: true
   - Trailing comma: es5
   - Tab width: 2
   - Quotes: single

8. pwa/public/
   - manifest.json (PWA manifest for Phase 2+)
   - favicon.ico
   - icons/ folder structure

9. Folder structure (create empty dirs):
   - pwa/src/app/
   - pwa/src/components/
   - pwa/src/hooks/
   - pwa/src/store/
   - pwa/src/lib/
   - pwa/src/locales/
   - pwa/src/types/
   - pwa/src/context/
   - pwa/src/middleware.ts

10. pwa/.env.example
    - Template for local env vars (copy from root)

Target output:
- `npm install` completes successfully
- `npm run build` compiles with no errors
- Folder structure matches PWA spec
- TypeScript strict mode active
- Design tokens in CSS variables
```

---

## Session 6: PWA Core Components & Utilities

**Artifact:** `pwa/src/components/ui/`, hooks, types, lib/api foundation

**Context needed:** Sessions 1-5 + Phase 0 spec

**What to build:**
- UI primitives: Button, Input, Card, Overlay, Spinner, GlassPanel
- Custom hooks: useIdentity, useAsync, useMediaQuery
- Types/constants: API types, routes, constants
- API client base

**Success:**
- Components render without errors
- TypeScript strict mode passes
- API client can be instantiated

**Prompt:**

```
Task: Build Phase 0 PWA core components and utilities

You are creating the foundational UI components and utilities.

Create:

1. pwa/src/components/ui/Button.tsx
   - Variants: primary, secondary, ghost
   - Sizes: sm, md, lg
   - Loading state with spinner
   - Uses earth tone colors

2. pwa/src/components/ui/Input.tsx
   - Text input with label
   - Error state display
   - Accessibility attributes
   - Tailwind styled

3. pwa/src/components/ui/Card.tsx
   - Container with border/shadow
   - Uses Tailwind, earth tones
   - Flexible children

4. pwa/src/components/ui/GlassPanel.tsx
   - Glassmorphic overlay
   - backdrop-blur, semi-transparent
   - Z-index handling
   - Responsive padding

5. pwa/src/components/ui/Spinner.tsx
   - Loading indicator
   - Animated (CSS or Framer Motion)
   - Accessible

6. pwa/src/hooks/useIdentity.ts
   - Read familyMemberId from cookie
   - Set familyMemberId to cookie (30-day expiry)
   - Clear identity (logout)
   - Use js-cookie or native API

7. pwa/src/hooks/useAsync.ts
   - Generic hook for data fetching
   - Loading, error, data states
   - Refetch function

8. pwa/src/hooks/useMediaQuery.ts
   - Detect breakpoints (mobile, tablet, desktop)
   - Returns current breakpoint

9. pwa/src/lib/constants/
   - routes.ts: Route paths
   - api.ts: API endpoints
   - theme.ts: Color, spacing values
   - validation.ts: Validation rules

10. pwa/src/lib/api/client.ts
    - Typed fetch wrapper (generic)
    - Injects X-Family-Member-Id header from identity hook
    - Error handling
    - JSON parsing

11. pwa/src/types/
    - api.ts: API response/request types
    - domain.ts: FamilyMember, Recipe, etc.
    - ui.ts: Component prop types
    - routes.ts: Route types

12. pwa/src/lib/i18n/index.ts (skeleton)
    - getLocale() function
    - t() translation function (stub)
    - Locale type definitions

Target:
- All components compile without errors
- TypeScript strict mode passes
- Hooks are reusable and typed
- API client ready for use
- Constants are single source of truth
```

---

## Session 7: PWA Identity & Onboarding Components

**Artifact:** Onboarding flow with components, pages, and hint scaffolding

**Context needed:** Sessions 1-6 + Phase 0 spec + Hint plan

**What to build:**
- Identity components: ProfileCard, ProfileList, CreateProfileForm, WhoAreYouOverlay
- Onboarding page with routing
- Hint overlay component (basic structure)
- Tour store (Zustand) with state management

**Success:**
- Onboarding page loads
- Can create family member
- Can select family member
- Cookie is set and persists
- Hints trigger on first visit

**Prompt:**

```
Task: Implement Phase 0 PWA onboarding flow with hint system scaffold

You are building the onboarding UI and first-time user hint system.

Context:
- Hint system plan: /Users/alex/.claude/plans/hidden-purling-gosling.md
- Phase 0 spec: src/specs/phase0-mvp.spec.md § 3.2 (onboarding flow)
- Components from Session 6

Create:

1. pwa/src/components/hints/HintOverlay.tsx
   - Props: currentStep, totalSteps, targetSelector, description, actionLabel
   - Spotlight overlay with popover
   - Progress indicator: "Step X of Y"
   - CTA button (Next, Got it!, etc.)
   - Uses earth tone colors
   - Framer Motion for animations

2. pwa/src/components/hints/Spotlight.tsx
   - SVG-based spotlight effect
   - Highlight target element with padding
   - Glow effect (terracotta color)
   - Responsive to window resize

3. pwa/src/store/tourStore.ts (Zustand)
   - State: activeTourdId, currentStep, isComplete
   - Actions: nextStep(), completeTour(), getTourState()
   - Persist to localStorage

4. pwa/src/hooks/useHintTour.ts
   - Takes tourId and locale
   - Fetches tour config from hints
   - Manages progression with useRef (tour elements)
   - Returns: isActive, currentStep, nextStep, completeTour

5. pwa/src/components/identity/ProfileCard.tsx
   - Displays one family member name + avatar
   - Tappable/clickable
   - Uses earth tone styling

6. pwa/src/components/identity/ProfileList.tsx
   - List of ProfileCards
   - Mapped from familyMembers array
   - OnSelect callback

7. pwa/src/components/identity/CreateProfileForm.tsx
   - Input field for new family member name
   - Submit button
   - Error handling
   - Loading state

8. pwa/src/components/identity/WhoAreYouOverlay.tsx
   - Main onboarding container
   - Shows ProfileList OR CreateProfileForm (toggle state)
   - "Don't see your name? Add it" button
   - Title: "Who are you?"
   - Hint system integration

9. pwa/src/app/(auth)/onboarding/page.tsx
   - Checks if familyMemberId cookie exists
   - If exists: redirect to home
   - If not: render WhoAreYouOverlay
   - On profile select: set cookie, redirect to home
   - Trigger hint tour for first-time users

10. pwa/src/app/(auth)/layout.tsx
    - Layout for auth-related routes
    - Centers overlays, full-screen

11. pwa/src/lib/i18n/hints-config.ts
    - Hardcoded hint configurations (English)
    - tourId: "phase0-onboarding"
    - Steps array with targetSelector, descriptionKey, position
    - (Localized text loaded separately in Session 8)

12. pwa/src/middleware.ts (skeleton)
    - Check for familyMemberId cookie
    - Redirect to /onboarding if missing
    - Redirect to /capture if exists
    - Path-based routing logic

Target:
- Onboarding page accessible at /onboarding
- Can create family member
- Can select from list
- Cookie persists
- Hints ready to display (visual only, no text yet)
- TypeScript strict passes
```

---

## Session 8: PWA Localization & Hint Content

**Artifact:** `pwa/src/locales/` with English and French translations

**Context needed:** Sessions 1-7 + Hint plan

**What to build:**
- English hint content (hints.json, common.json)
- French translations
- i18n initialization and helpers

**Success:**
- Hints display in English on first visit
- Can switch to French
- All hint text is translated
- No hardcoded strings in components

**Prompt:**

```
Task: Implement Phase 0 PWA localization (i18n) with English & French

You are adding multilingual support and hint content.

Context:
- Hint system: /Users/alex/.claude/plans/hidden-purling-gosling.md § 4
- Journey steps documented in plan
- Phase 0 spec § 3.2-3.3 (flows)
- Design: Visual-first, minimal text, preference for icons

Create:

1. pwa/src/locales/en/common.json
   - Shared labels, buttons, UI text
   - Structure:
     {
       "buttons": { "next": "Next", "skip": "Skip", "done": "Got it!", ... },
       "labels": { "familyMember": "Family Member", "addRecipe": "Add Recipe", ... },
       "errors": { "required": "This field is required", ... },
       "messages": { "success": "Saved successfully", ... }
     }

2. pwa/src/locales/en/hints.json
   - Hint content for all tours in Phase 0
   - Structure:
     {
       "phase0-onboarding": {
         "title": "Who are you?",
         "steps": [
           {
             "id": "list-intro",
             "descriptionKey": "onboarding.step1.desc",
             "position": "bottom"
           },
           ...
         ]
       },
       "phase0-capture": {
         "title": "Add your first recipe",
         "steps": [ ... ]
       }
     }

3. pwa/src/locales/fr/common.json
   - French translations of common.json (exact structure, translated)
   - Example: "Next" → "Suivant", "Add Recipe" → "Ajouter une recette"

4. pwa/src/locales/fr/hints.json
   - French translations of hints.json (exact structure, translated)
   - Maintain hint progression and step order

5. pwa/src/lib/i18n/index.ts (full implementation)
   - getLocale() — read from cookie, default to 'en'
   - setLocale(locale) — write to cookie
   - t(key, params?) — translate with optional interpolation
   - Supports dot notation: t('buttons.next') → "Next"
   - Supports {{param}} interpolation: t('progress.step', { current: 2, total: 7 })

6. pwa/src/lib/i18n/types.ts
   - Type definitions for locale, translation keys
   - Ensure type-safe key access

7. pwa/src/lib/i18n/loader.ts
   - Load JSON files based on locale
   - Cache translations in memory
   - Lazy-load on demand

8. pwa/src/locales/README.md
   - How to add new languages:
     * Create {lang}/ folder
     * Copy en/ structure
     * Translate all JSON files
     * Update getLocale() to support new language
     * No code changes needed
   - Key naming conventions
   - Translation guidelines

Hint Content Guidelines:
- Onboarding journey: 6 steps (list → select → create → input → confirm)
- Capture journey: 9 steps (button → camera → gallery → cooked meal → rating → submit → confirm)
- Prefer visual cues: icons (📷, 👈, ❓), animations, arrows
- Keep text minimal and friendly
- Use imperative form: "Tap here", "Take a photo", "Select your meal"
- Progress indicator on every step (except first/last)

Example hint text (English):
- "Here's your family. Select your name or create a new profile."
- "📷 Take a photo of your meal"
- "👈 Swipe to see all your photos"
- "❓ Which photo shows the finished dish?"
- "How did you like it? (0=Unknown, 1=Dislike, 2=Like, 3=Love)"

Target:
- All hints present in English
- All hints translated to French
- i18n functions work correctly
- Type-safe translation keys
- Locale can be switched
- Hints display appropriate content for current locale
```

---

## Session 9: PWA Capture Flow Components & Pages

**Artifact:** Capture flow with camera, photo gallery, rating, submission

**Context needed:** Sessions 1-8 + Phase 0 spec

**What to build:**
- Capture components: CameraCapture, PhotoGallery, CookedMealSelector, RatingSelector, SubmitButton, RecipeForm
- Capture page with state management
- Confirmation page
- API integration for recipe upload

**Success:**
- Can take photos with camera
- Can select cooked meal image
- Can rate recipe
- Can submit to API
- Receives recipeId back
- Confirmation screen shows

**Prompt:**

```
Task: Implement Phase 0 PWA capture flow (camera → rating → submit)

You are building the recipe acquisition UI and submission logic.

Context:
- Phase 0 spec § 3.3 (capture flow)
- Components from previous sessions
- API endpoints from Session 3
- Localization from Session 8

Create:

1. pwa/src/components/capture/CameraCapture.tsx
   - Uses react-webcam or native getUserMedia
   - Display camera preview
   - Capture button with visual feedback
   - Add captured photo to gallery
   - Error handling (camera permissions)
   - Fallback message if browser doesn't support

2. pwa/src/components/capture/PhotoGallery.tsx
   - Horizontal scrollable gallery of captured photos
   - Show photo index
   - Remove button per photo (X button)
   - Highlight cooked meal selection (if selected)
   - Responsive to device width

3. pwa/src/components/capture/CookedMealSelector.tsx
   - "Which photo shows the finished dish?" prompt
   - Option: None of these (cookedMealImageIndex = -1)
   - Tap photo to select as cooked meal
   - Show visual indication of selection
   - Required: must select one or "none"

4. pwa/src/components/capture/RatingSelector.tsx
   - 4-point emoji rating: ❓ (0), 👎 (1), 👍 (2), ❤️ (3)
   - Large, tappable emoji buttons
   - Show selected rating visually
   - Label below each emoji
   - Accessibility: alt text for each option

5. pwa/src/components/capture/RecipeForm.tsx
   - Optional: Label field (short text, e.g., "Grandma's Pie")
   - Optional: Notes field (longer text, e.g., "Added olive oil for richness")
   - Both fields not required to submit
   - Clear placeholders

6. pwa/src/components/capture/SubmitButton.tsx
   - "Save Recipe" button
   - Loading state during upload (show spinner, disable button)
   - Success state (after upload)
   - Error state with message
   - Disabled until: ≥1 photo, cooked meal selected, rating selected

7. pwa/src/app/(app)/capture/page.tsx
   - State management (useReducer or Zustand):
     * photos: File[]
     * cookedMealImageIndex: number
     * rating: 0-3
     * label?: string
     * notes?: string
     * isLoading: boolean
     * error?: string
   - Layout: Camera → Gallery → Cooked Meal → Rating → Form → Submit
   - Responsive: stack on mobile, side-by-side on tablet
   - Handle file uploads: convert to FormData
   - Call API: POST /api/recipes
   - On success: redirect to /capture/confirm?recipeId=<id>
   - On error: show error message, allow retry
   - Hint system: trigger "phase0-capture" tour on first visit

8. pwa/src/app/(app)/capture/confirm/page.tsx
   - Display confirmation message: "✓ Recipe saved!"
   - Show recipeId (for user info)
   - Buttons: [Add Another] → /capture, OR auto-redirect to home after 3 seconds
   - First submitted image as preview (optional)
   - Completion of "phase0-capture" tour

9. pwa/src/app/(app)/layout.tsx
   - Layout for authenticated flows (capture, planner, etc.)
   - Check for familyMemberId cookie
   - Redirect to /onboarding if missing
   - Navigation/header (optional in Phase 0)

10. pwa/src/lib/api/recipes.ts
    - createRecipe(photos, rating, cookedMealImageIndex, label?, notes?) → Promise<RecipeResponse>
    - getRecipesList(page, limit) → Promise<RecipeListResponse>
    - getRecipeDetail(id) → Promise<RecipeDetailResponse>
    - File handling: convert File[] to FormData
    - Add X-Family-Member-Id header automatically

11. pwa/src/types/api.ts
    - CreateRecipeRequest
    - RecipeResponse (with recipeId)
    - RecipeListResponse
    - RecipeDetailResponse
    - PaginationInfo

Validation (Client-side):
- Require ≥1 photo before submit
- Warn if >20 images
- Require rating selection
- Require cooked meal selection
- Images pre-validate size (show warning if >20MB)

Accessibility:
- Emoji buttons have alt text
- Form fields have labels
- Loading spinner has aria-live
- Error messages role="alert"

Target:
- Camera works (test on device)
- Photos captured and displayed
- Can select cooked meal and rating
- Can submit to API
- Receives recipeId and success message
- Confirmation page shows
- Can add another recipe
- Hints display on first visit
```

---

## Session 10: Integration, Docker & Final Polish

**Artifact:** docker-compose.yml, working end-to-end, testing docs

**Context needed:** All previous sessions (1-9 artifacts)

**What to build:**
- `docker-compose.yml` for Phase 0
- End-to-end testing checklist
- Documentation & troubleshooting

**Success:**
- `task init` starts all services
- Browser flow works: onboarding → capture → confirm → list
- Images saved to disk
- All tests pass
- Ready for production (Phase 0)

**Prompt:**

```
Task: Integrate Phase 0 (Docker Compose, E2E, polish)

You are assembling Phase 0 into a working, tested, deployable system.

Context:
- All previous artifacts (API, PWA, migrations)
- Task reference: TASK_REFERENCE.md
- Phase 0 spec definition of done § 5

Create:

1. docker-compose.yml (Phase 0)
   - postgres (pgvector:pg17, port 5432)
   - api (./api Dockerfile, port 5000, depends_on postgres)
   - pwa (./pwa Dockerfile, port 3000, depends_on api)
   - Environment variables from .env.local
   - Health checks for all services
   - Volume: /data/recipes (for image storage)

2. .env.local (from .env.example)
   - POSTGRES_PASSWORD=password
   - POSTGRES_DB=recipes
   - POSTGRES_CONNECTION_STRING=postgres://postgres:password@postgres:5432/recipes
   - API_BASE_URL=http://api:5000
   - NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
   - RECIPES_ROOT=/data/recipes

3. src/specs/user-journeys.md
   - Document onboarding journey: 6 steps with hints
   - Document capture journey: 9 steps with hints
   - Decision points (create member, select cooked meal)
   - Expected user behavior at each step

4. src/specs/hint-system.spec.md
   - Technical architecture (components, hooks, store)
   - Localization structure and how to add languages
   - Tour completion tracking in backend
   - Multi-device hint state sync

5. src/specs/journey-flowcharts.md
   - ASCII flowchart: Onboarding flow
   - ASCII flowchart: Capture flow
   - Show branching logic and hint triggers

6. Manual Testing Checklist (add to src/specs/testing.spec.md)
   - Fresh user: browser open → /onboarding shown
   - Create family member: works, cookie set
   - Home screen: shows "Add Recipe" button
   - Capture flow: camera → photos → cooked meal → rating → submit
   - Confirmation: recipe saved, can add another
   - Hints: appear on first visit, don't replay
   - English/French: switch language, hints translate
   - API: all endpoints respond correctly
   - Database: data persists, images saved to disk

7. README.md (update with Phase 0 specific section)
   - Quick start: `task init`
   - Development: `task dev:api` + `task dev:pwa` + `task logs`
   - Testing: `task test` + `task test:watch`
   - Troubleshooting: most common issues
   - Feature overview (what Phase 0 does)

8. TROUBLESHOOTING.md (new file)
   - Port conflicts → solutions
   - Database connection issues
   - Camera permissions
   - Image upload failures
   - Hint system not showing
   - Locale not switching
   - Service health checks

9. Migrations auto-run verification
   - Ensure Program.cs runs migrations on startup
   - Verify schema creates automatically
   - Test on fresh database (docker-compose down -v)

10. Cross-browser testing (document requirements)
    - Chrome/Safari/Firefox support for PWA
    - Mobile viewport (375x812) tested
    - Tablet viewport (768x1024) tested
    - Camera permissions requested and handled

Success Criteria (From Phase 0 spec § 5):

Automated:
- [ ] docker-compose up starts all 3 services
- [ ] docker-compose ps shows healthy status
- [ ] Migrations run on API startup
- [ ] POST /api/family creates family member via API
- [ ] GET /api/family returns the created member
- [ ] POST /api/recipes with images creates recipe
- [ ] Recipe files appear at /data/recipes/{uuid}/original/0.jpg
- [ ] recipe.info file written to disk
- [ ] GET /api/recipes/{id} returns metadata
- [ ] GET /api/recipes returns paginated list
- [ ] GET /recipe/{uuid}/original/0 returns image binary

Manual:
- [ ] Open http://localhost:3000 → redirects to /onboarding
- [ ] Onboarding shows family list (empty for fresh DB)
- [ ] Create family member, see in list
- [ ] Select family member → cookie set, redirected to home
- [ ] Home shows "Add Recipe" button
- [ ] Tap "Add Recipe" → /capture loads
- [ ] Take 2 photos in camera
- [ ] Select cooked meal image
- [ ] Select rating (3 stars)
- [ ] Submit → navigate to /capture/confirm
- [ ] Confirmation shows "✓ Recipe saved!" + recipeId
- [ ] Tap [Add Another] → /capture again
- [ ] Navigate to home → "Add Recipe" ready
- [ ] Hints appeared on onboarding (first visit only)
- [ ] Switch language to French → hints translate

Target:
- Phase 0 is feature-complete
- All endpoints tested and working
- E2E flow works end-to-end
- Hints display and persist correctly
- Bilingual support functional
- All tests pass
- Documentation complete
- Ready to deploy
```

---

## Session Sequence Summary

Run these sessions in order:

| # | Session | Artifact | Time |
|---|---------|----------|------|
| 1 | Database Schema | `database/migrations/` | 30m |
| 2 | API Foundation | `api/` project structure | 30m |
| 3 | API Endpoints | Controllers, Services, DTOs | 60m |
| 4 | API Testing | Unit + integration tests | 45m |
| 5 | PWA Setup | Next.js config + design tokens | 30m |
| 6 | PWA Core | UI components, hooks, types | 60m |
| 7 | Onboarding | Identity components + hints scaffold | 60m |
| 8 | Localization | i18n + English/French translations | 45m |
| 9 | Capture Flow | Camera, rating, submit, confirm | 90m |
| 10 | Integration | Docker, E2E, docs, polish | 60m |

**Total: ~550 minutes (~9 hours distributed across 10 sessions)**

---

## Context Management

**Each session:**
- ✅ Self-contained (includes needed files/specs)
- ✅ Builds on previous artifacts
- ✅ Delivers 1 concrete piece
- ✅ ~100k context max (lean)
- ✅ Runnable tests (verify quality)
- ✅ Can be done in one focused effort

**Between sessions:**
- Commit completed work: `git commit -m "session N: [artifact]"`
- Keep `.env.local` and other local files (gitignored)
- Start fresh session with clean context

---

## Using These Prompts

1. **Session N:** Copy the Session N prompt into Claude Code
2. **Specify:** Use Claude 3.5 Sonnet
3. **Work:** Follow the prompt step-by-step
4. **Commit:** `git add . && git commit -m "session N: [artifact]"`
5. **Verify:** Run `task dev` and test manually
6. **Next:** Move to Session N+1

---

## Quick Start

```bash
# Session 1: Database
# [Run Session 1 prompt in new Claude Code session]
# Then: git commit

# Session 2: API Foundation
# [Run Session 2 prompt]
# Then: git commit

# ... continue through Session 10 ...

# After Session 10:
task init          # One command to run everything
task dev           # Start all services
task health        # Verify all services running
task review        # Final checks before shipping
```

