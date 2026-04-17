# Session 10: Docker Integration, E2E Testing & Documentation

**Artifact:** Docker Compose setup, E2E tests, final documentation, deployment-ready Phase 0

**Context needed:** Sessions 1-9 artifacts + LOCAL_DEV_LOOP.md

**What to build:**
- `docker-compose.yml` — Orchestrate API, PWA, PostgreSQL
- `pwa/playwright.config.ts` — E2E test configuration
- `pwa/e2e/` — End-to-end test scenarios
- `docs/PHASE0_WALKTHROUGH.md` — Step-by-step user guide
- `docs/DEVELOPER_GUIDE.md` — How to set up and run Phase 0 locally
- Update `.github/workflows/` — CI/CD pipeline for Phase 0

**Success:**
- `docker-compose up` starts all services
- API and PWA services are healthy
- E2E tests run with `npm run test:e2e`
- User can complete full onboarding → capture → home flow
- All tests pass (unit + integration + E2E)
- Documentation is complete and accurate

---

## Prompt

```
Task: Integrate Phase 0 into production-ready system

You are finalizing Phase 0 by integrating all services, testing end-to-end, and documenting.

Context:
- All previous sessions complete (API, PWA, database)
- Services ready: PostgreSQL (port 5432), API (port 5000), PWA (port 3000)
- Monorepo structure: api/, pwa/, database/, docker-compose.yml

Create:

1. docker-compose.yml (root level)
   - Services:
     * postgres:
       - Image: postgres:17-alpine
       - Env: POSTGRES_PASSWORD, POSTGRES_USER, POSTGRES_DB
       - Ports: 5432:5432
       - Volumes: postgres_data (persist)
       - Health check: pg_isready
     * api:
       - Build: ./api
       - Ports: 5000:5000
       - Env: DB_CONN_STRING, ASPNETCORE_ENVIRONMENT
       - Depends on: postgres
       - Health check: curl /health
     * pwa:
       - Build: ./pwa
       - Ports: 3000:3000
       - Env: NEXT_PUBLIC_API_URL
       - Depends on: api
       - Health check: curl http://localhost:3000/health
   - Networks: shared bridge network
   - Volumes: postgres_data (named volume)

2. .env (root level, for docker-compose)
   - POSTGRES_USER=recipe_app
   - POSTGRES_PASSWORD=secure_dev_password
   - POSTGRES_DB=recipe_app_db
   - API_DB_CONN_STRING=postgres://... (derived)
   - NEXT_PUBLIC_API_URL=http://localhost:5000
   - ASPNETCORE_ENVIRONMENT=Development

3. pwa/playwright.config.ts
   - Test runner: Playwright with Chromium
   - Base URL: http://localhost:3000
   - Timeout: 30s per test
   - Retries: 1 for failed tests
   - Report: HTML + JSON
   - Headless: true (CI), false (local)

4. pwa/e2e/onboarding.spec.ts
   - Scenario 1: Fresh user → Onboarding page
     * Load /
     * Verify redirected to /onboarding
     * Verify family member list displays
   - Scenario 2: Select existing family member
     * Click first family member
     * Verify redirected to /home
     * Verify welcome message shows member name
   - Scenario 3: Add new family member
     * Click "Don't see your name?"
     * Enter name in form
     * Submit
     * Verify new member added to list
     * Verify redirected to /home

5. pwa/e2e/capture-flow.spec.ts
   - Scenario 1: Navigate to capture
     * Login/select family member
     * Click "Add Recipe" button
     * Verify /capture page loads
   - Scenario 2: Take and submit recipe
     * Use mock camera (Playwright can inject image)
     * Select/upload image file
     * Scroll gallery
     * Select meal image
     * Select rating (emoji)
     * Click Submit
     * Verify success message
     * Verify redirected to /home

6. pwa/e2e/integration.spec.ts
   - Full end-to-end workflow:
     * Fresh user lands on app
     * Complete onboarding (select family member)
     * Navigate to capture
     * Submit recipe
     * Return to home
     * Verify recipe appears in count/list

7. pwa/package.json updates
   - Add devDependencies:
     * @playwright/test
     * @testing-library/react
     * @testing-library/jest-dom
   - Add scripts:
     * test:e2e: playwright test
     * test:e2e:debug: playwright test --debug
     * test:e2e:ui: playwright test --ui

8. docs/PHASE0_WALKTHROUGH.md
   - Step-by-step user guide:
     1. Start app → see onboarding
     2. Select family member (or create new)
     3. See home page welcome
     4. Click "Add Recipe"
     5. Take or select photos
     6. Select meal hero image
     7. Rate with emoji
     8. Submit
     9. See success
     10. Return to home
   - Screenshots for each step (or placeholders)
   - Time estimate: 2-3 minutes
   - FAQ: What if camera doesn't work? How to add another member?

9. docs/DEVELOPER_GUIDE.md
   - Prerequisites: Docker, Docker Compose, Node 22
   - Setup:
     * Clone repo
     * Copy .env from .env.example
     * Run: docker-compose up
     * Wait for health checks to pass
     * Open http://localhost:3000
   - Development workflow:
     * Start services: docker-compose up
     * Watch logs: docker-compose logs -f api
     * Run tests: docker-compose exec api dotnet test
     * Update database schema: Submit migration files
   - Troubleshooting:
     * Ports already in use: Change in docker-compose.yml
     * Database won't connect: Check postgres health: docker-compose ps
     * API not responding: Check logs: docker-compose logs api
   - Local dev without Docker (optional):
     * API: dotnet run from api/
     * PWA: npm run dev from pwa/
     * Database: postgres running on localhost:5432

10. .github/workflows/phase0-ci.yml (optional)
    - Trigger: on push/PR to main
    - Jobs:
      * build:
        - Checkout code
        - Set up .NET 8
        - dotnet build api/
        - dotnet test api/
      * test-pwa:
        - Set up Node 22
        - npm ci
        - npm run typecheck
        - npm run lint
        - npm run test:e2e (if services running)
    - Status badge in README.md

11. .dockerignore updates
    - Ensure clean builds (exclude node_modules, .git, etc.)

12. README.md (root level)
    - Title: What's For Supper: Phase 0
    - Brief description: Recipe capture app
    - Quick Start: docker-compose up
    - Architecture: Diagram showing services
    - Development: Link to DEVELOPER_GUIDE.md
    - Testing: How to run tests
    - Status: Phase 0 complete, Phase 1 planned
    - Contributing: Link to DEVELOPMENT.md (if exists)

Final Integration Checklist:
- [ ] All services start with docker-compose up
- [ ] Health checks pass for all services
- [ ] API migrations run automatically
- [ ] PWA loads at localhost:3000
- [ ] Fresh user sees onboarding
- [ ] Can select family member
- [ ] Can submit recipe via capture flow
- [ ] Recipe data appears in database
- [ ] E2E tests pass (at least main happy path)
- [ ] No console errors or warnings
- [ ] Documentation is complete

Guidelines:
- Docker builds must be lean (use .dockerignore)
- E2E tests focus on happy path (full workflow)
- Tests should be idempotent (can run multiple times)
- Documentation should assume minimal setup experience
- All services should be health-checkable (health endpoints)
- CI/CD pipeline should prevent broken code on main

Target:
- docker-compose up succeeds on clean machine
- All services healthy within 30s
- E2E tests run and pass in ~2 minutes
- User guide walkthrough accurate and complete
- Developer guide sufficient for new contributors
- Phase 0 ready for demo/user testing
```

---

## What to Expect

After this session:
- ✅ All Phase 0 services orchestrated and running
- ✅ End-to-end testing covering complete user flow
- ✅ Complete documentation for users and developers
- ✅ CI/CD pipeline for automated testing
- ✅ Production-ready Phase 0 ready for demo
- ✅ Clear path to Phase 1 features

## Next Steps

1. Start all services: `docker-compose up`
2. Verify health checks pass
3. Run E2E tests: `npm run test:e2e` (from pwa/)
4. Manual user testing: Complete onboarding → capture flow
5. Verify database has recipes after submission
6. Commit final changes: `git commit -m "session 10: docker integration, E2E testing, and documentation"`
7. Create GitHub release tag: `git tag phase0-complete`
8. Review Phase 1 planning

---

## Phase 0 Complete!

You've built:
- ✅ PostgreSQL schema + migrations
- ✅ C# .NET 8 API with endpoints + services
- ✅ API test suite (unit + integration)
- ✅ Next.js 15 PWA with state management
- ✅ Onboarding flow + identity selection
- ✅ Multi-language support (English/French)
- ✅ Visual hint system with spotlight overlays
- ✅ Recipe capture flow (camera, rating, submit)
- ✅ Docker orchestration + E2E tests
- ✅ Complete documentation

Next: Plan Phase 1 (recipe discovery, search, sharing, advanced planning)
