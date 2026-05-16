# Phase 0: Recipe Acquisition MVP

Build the minimal feature set: family member onboarding + recipe capture.

## Overview

Phase 0 is the smallest viable product (MVP). Users can:
1. Select their family member identity (or create new)
2. Take photos of a recipe
3. Rate the recipe (4-point scale)
4. Submit the recipe and get confirmation

**No AI, no redis, no multi-device sync, no planner.** Just core acquisition flow with hint system to guide first-time users.

## Sessions at a Glance

| # | Title | Artifact | Time |
|---|-------|----------|------|
| 1 | Database Schema | SQL migrations | 30m |
| 2 | API Foundation | .NET project structure | 30m |
| 3 | API Endpoints | Controllers, services, DTOs | 60m |
| 4 | API Testing | Unit + integration tests | 45m |
| 5 | PWA Setup | Next.js + Tailwind | 30m |
| 6 | PWA Core | Components + hooks | 60m |
| 7 | Onboarding | Identity + hints scaffold | 60m |
| 8 | Localization | i18n (English/French) | 45m |
| 9 | Capture Flow | Camera + rating + submit | 90m |
| 10 | Integration | Docker, E2E, docs | 60m |

## Key Resources

**Requirements:**
- `src/specs/phase0-mvp.spec.md` — Full specification

**Architecture:**
- `PROJECT_STRUCTURE.md` — Monorepo organization
- `pwa/SRC_STRUCTURE.md` — PWA folder structure

**Design:**
- Earth tone palette: Sage Green (#4B5D4D), Terracotta (#B25E4C)
- Visual-first hints with minimal text
- Bilingual: English + French

**Development:**
- `Taskfile.yml` — All dev commands
- `LOCAL_DEV_LOOP.md` — Local workflow
- `TASK_REFERENCE.md` — Task command reference

**Hints:**
- `/Users/alex/.claude/plans/hidden-purling-gosling.md` — Approved hint system architecture

## Getting Started

**Start with Session 1:**
```bash
# Read the prompt
cat session-01-database.md

# Start new Claude Code session
# - Model: Claude 3.5 Sonnet
# - Copy the entire prompt from session-01-database.md
# - Follow step-by-step
```

**After each session:**
```bash
git commit -m "session N: description"
git push
```

## What You're Building

### Backend (C# .NET)
- PostgreSQL schema (family_members, recipes tables)
- API endpoints: Family CRUD, Recipe CRUD, Image retrieval, Health check
- Image validation & storage to disk
- Tour completion tracking
- All tests passing

### Frontend (Next.js/TypeScript/Tailwind)
- Onboarding: family member selection + creation
- Home: "Add Recipe" button
- Capture: camera → photos → cooked meal selection → rating → submit
- Confirmation: success message + "Add Another?"
- Hint system: spotlight overlays + progress indicators
- Localization: English + French with easy extension

### Infrastructure
- Docker Compose (postgres, api, pwa)
- Automatic migrations on startup
- Health checks for all services
- Image storage at `/data/recipes/{uuid}/`

## Success Criteria

By end of Phase 0:
- [ ] `task init` starts all services cleanly
- [ ] User can select family member or create new
- [ ] User can take photos, select cooked meal, rate recipe, submit
- [ ] Images save to disk with metadata
- [ ] Recipe appears in database
- [ ] All tests pass
- [ ] Hints guide first-time users (English + French)
- [ ] Complete E2E flow works

## Notes

- **One session at a time:** Each builds on previous
- **Lean context:** Each prompt is self-contained (~100k tokens)
- **Commit between sessions:** Keeps git history clean
- **Test frequently:** Run `task dev` after each session
- **Ask questions:** If stuck, document blocker and move to next session

---

## Phase 0 Sessions

1. **[Session 1: Database Schema](session-01-database.md)**
   - Create SQL migrations for family_members, recipes tables
   - Add indexes for performance
   - Artifact: `database/migrations/`

2. **[Session 2: API Foundation](session-02-api-foundation.md)**
   - Set up .NET 8 project structure
   - Configure EF Core, CORS, logging
   - Artifact: `api/` project with boilerplate

3. **[Session 3: API Endpoints](session-03-api-endpoints.md)**
   - Implement Family, Recipe, Health controllers
   - Build Services for business logic
   - Create DTOs for request/response
   - Artifact: Working endpoints, ready for testing

4. **[Session 4: API Testing](session-04-api-testing.md)**
   - Write unit tests for Services
   - Write integration tests for Controllers
   - Verify all endpoints work
   - Artifact: `api/src/RecipeApi.Tests/` with passing tests

5. **[Session 5: PWA Setup](session-05-pwa-setup.md)**
   - Initialize Next.js + TypeScript
   - Configure Tailwind + design tokens
   - Set up ESLint, Prettier
   - Artifact: `pwa/` project structure ready

6. **[Session 6: PWA Core](session-06-pwa-core.md)**
   - Build UI primitives (Button, Input, Card, etc.)
   - Create custom hooks (useIdentity, useAsync, etc.)
   - Set up API client
   - Artifact: Reusable components + utilities

7. **[Session 7: Onboarding](session-07-onboarding.md)**
   - Build identity components (ProfileCard, ProfileList, CreateForm)
   - Implement onboarding page with routing
   - Scaffold hint system components
   - Artifact: Working onboarding flow

8. **[Session 8: Localization](session-08-localization.md)**
   - Create i18n system (English + French)
   - Write hint content for both tours
   - Implement locale switching
   - Artifact: `pwa/src/locales/` with full translations

9. **[Session 9: Capture Flow](session-09-capture-flow.md)**
   - Build camera component
   - Photo gallery, cooked meal selector, rating selector
   - Submit button + recipe upload
   - Confirmation page
   - Artifact: Complete capture flow working end-to-end

10. **[Session 10: Integration](session-10-integration.md)**
    - Create docker-compose.yml
    - Verify all services work together
    - Write E2E testing checklist
    - Complete documentation
    - Artifact: Deployable Phase 0 MVP

---

**Total time: ~9 hours across 10 sessions**

Start with Session 1 whenever you're ready!
