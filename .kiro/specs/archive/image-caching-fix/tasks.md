# Implementation Plan

- [x] 1. Write bug condition exploration test (API — Bug 2)
  - **Property 1: Bug Condition** - Hero Endpoint Missing Cache-Control Header
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms Bug 2 exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface a counterexample demonstrating that `GET /api/recipes/{id}/hero` returns no `Cache-Control` header
  - **Scoped PBT Approach**: Bug is deterministic — scope to a single concrete case: seed one hero image, call the endpoint, assert the header
  - Add `GetHero_Returns_CacheControl_Header` to `RecipeControllerTests` following the exact pattern of `GetHero_Returns_Hero_Image_When_Present`
  - Seed a hero image via `IRecipeStore.SaveHeroImageAsync` (same `MinimalJpeg` bytes used in existing tests)
  - Call `GET /api/recipes/{recipeId}/hero` and assert `response.Headers` contains `Cache-Control: public, max-age=31536000, immutable`
  - Run test on UNFIXED code: `task test` (or `dotnet test` in `api/`)
  - **EXPECTED OUTCOME**: Test FAILS — `Cache-Control` header is absent, confirming Bug 2 exists
  - Document the counterexample: `GET /api/recipes/{known-id}/hero → 200 OK, Cache-Control header → null`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Hero Endpoints and 404 Behavior Are Unaffected
  - **IMPORTANT**: Follow observation-first methodology — observe behavior on UNFIXED code for non-buggy inputs
  - Observe: `GET /api/recipes/{id}/hero` with no seeded hero returns `404 Not Found` on unfixed code (`GetHero_Returns_NotFound_Before_Import_Completes` already covers this)
  - Observe: `GET /api/recipes/{id}/original/{index}` returns `200 OK` with correct JPEG body on unfixed code (`GetImage_Returns_Image_Binary` already covers this)
  - Observe: `GET /api/recipes` returns paginated list on unfixed code (`GetRecipes_Returns_Paginated_List` already covers this)
  - Verify all three existing tests pass on UNFIXED code: `task test`
  - **EXPECTED OUTCOME**: All existing tests PASS — this confirms the baseline behavior to preserve
  - No new preservation tests need to be written; the existing suite is the preservation baseline
  - Mark task complete when existing tests are confirmed passing on unfixed code
  - _Requirements: 3.5, 3.6, 3.7_

- [x] 3. Fix image caching bugs

  - [x] 3.1 Fix Bug 2 — Add Cache-Control header to `GetHero` in `RecipeController`
    - File: `api/src/RecipeApi/Controllers/RecipeController.cs`
    - In the `GetHero` action method, add `Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";` immediately before `return File(stream, contentType);`
    - No other files in the API require changes — `ImageService`, `IRecipeStore`, and all other controllers are untouched
    - _Bug_Condition: `isBugCondition(X)` where `X.endpoint = "GET /api/recipes/{id}/hero"` AND `heroExists(X.id)` AND `X.response.headers["Cache-Control"] IS NULL`_
    - _Expected_Behavior: `response.Headers["Cache-Control"] = "public, max-age=31536000, immutable"` for all 200 responses from `GetHero`_
    - _Preservation: All other endpoints (`GET /api/recipes`, `GET /api/recipes/{id}`, `GET /api/recipes/{id}/original/{index}`, etc.) must be unaffected; 404 behavior for missing hero images must be unchanged_
    - _Requirements: 2.3, 2.4, 3.5, 3.6, 3.7_

  - [x] 3.2 Fix Bug 1 — Use relative path for hero image URLs in `discovery/page.tsx`
    - File: `pwa/src/app/(app)/discovery/page.tsx`
    - In `performFetch`: change `` imageUrl: `${API_BASE_URL}/api/recipes/${r.id}/hero` `` to `` imageUrl: `/api/recipes/${r.id}/hero` ``
    - In `loadNextCategory`: change `` imageUrl: `${API_BASE_URL}/api/recipes/${r.id}/hero` `` to `` imageUrl: `/api/recipes/${r.id}/hero` ``
    - Search the file for any remaining usages of `API_BASE_URL`; if none remain, remove the import line `import { API_BASE_URL } from '@/lib/constants/config';`
    - Do NOT modify `next.config.js` — `remotePatterns` must remain exactly as-is (Unsplash and direct-IP entries only)
    - Do NOT touch `TonightPivotCard.tsx` — it already uses the correct relative path
    - _Bug_Condition: `isBugCondition(X)` where `X.component = "discovery/page.tsx"` AND `X.action = "mapDiscoveryStack"` AND `X.imageUrl STARTS WITH "http"`_
    - _Expected_Behavior: `result.imageUrl STARTS WITH "/api/recipes/"` AND `result.imageUrl DOES NOT START WITH "http"`_
    - _Preservation: `next.config.js` remotePatterns unchanged; `TonightPivotCard.tsx` untouched; all PWA interactions on discovery page continue to work_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.8_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Hero Endpoint Returns Cache-Control Header
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The `GetHero_Returns_CacheControl_Header` test from task 1 encodes the expected behavior
    - Run: `task test` (or `dotnet test` in `api/`)
    - **EXPECTED OUTCOME**: `GetHero_Returns_CacheControl_Header` PASSES — confirms Bug 2 is fixed
    - _Requirements: 2.3, 2.4_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Hero Endpoints and 404 Behavior Are Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run: `task test` (or `dotnet test` in `api/`)
    - **EXPECTED OUTCOME**: `GetHero_Returns_NotFound_Before_Import_Completes`, `GetImage_Returns_Image_Binary`, `GetRecipes_Returns_Paginated_List`, and all other existing tests PASS — confirms no regressions
    - Confirm `next.config.js` is unmodified (no new `remotePatterns` entries)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run `task review` (lint, type-check, and full test suite for both API and PWA)
  - Confirm `GetHero_Returns_CacheControl_Header` passes
  - Confirm all pre-existing tests pass with no new failures
  - Confirm `next.config.js` contains only the original `remotePatterns` entries (Unsplash, `127.0.0.1:5001`, `localhost:5001`)
  - Confirm `discovery/page.tsx` no longer imports or references `API_BASE_URL`
  - Ask the user if any questions arise before closing the spec
