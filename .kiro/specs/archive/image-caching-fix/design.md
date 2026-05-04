# Image Caching Fix — Bugfix Design

## Overview

Two independent, targeted fixes address broken hero image loading and missing cache headers.

**Fix 1 (PWA):** `discovery/page.tsx` constructs hero image URLs by prepending `API_BASE_URL`
(e.g. `http://pwa.wfs.localhost`), producing absolute URLs that Next.js `<Image>` rejects because
the hostname is not in `remotePatterns`. The fix removes the prefix so the URL becomes the
relative path `/api/recipes/{id}/hero`, matching the pattern already used correctly in
`TonightPivotCard.tsx`.

**Fix 2 (API):** `GET /api/recipes/{id}/hero` returns the JPEG binary with no `Cache-Control`
header. Hero images are AI-generated and immutable once created. The fix adds
`Cache-Control: public, max-age=31536000, immutable` to every successful response from that
endpoint.

Both fixes are minimal and surgical. No changes to `next.config.js`, no new dependencies, no
schema changes.

---

## Glossary

- **Bug_Condition (C):** The condition that triggers either bug — an absolute URL being
  constructed for a hero image, or a hero image response lacking a `Cache-Control` header.
- **Property (P):** The desired correct behavior — hero image URLs are relative paths; hero image
  responses carry `Cache-Control: public, max-age=31536000, immutable`.
- **Preservation:** Existing behaviors that must remain unchanged — `remotePatterns` in
  `next.config.js`, all other API endpoints, `TonightPivotCard.tsx` (already correct), 404
  behavior for missing hero images.
- **`API_BASE_URL`:** The constant exported from `pwa/src/lib/constants/config.ts`, resolved from
  `NEXT_PUBLIC_API_BASE_URL` at build time (defaults to `'/api'`). In production it is set to the
  full origin (e.g. `http://pwa.wfs.localhost`), making the constructed URL absolute.
- **`mapDiscoveryStack`:** The inline `.map()` call inside `performFetch` and `loadNextCategory`
  in `discovery/page.tsx` that sets `imageUrl` on each `DiscoveryRecipe`.
- **`GetHero`:** The action method in `RecipeController` that handles
  `GET /api/recipes/{id}/hero`.
- **`IRecipeStore`:** The storage abstraction injected into `ImageService`; used directly in
  tests to seed hero image data without going through the full import workflow.

---

## Bug Details

### Bug Condition

The bug manifests in two distinct places. In the PWA, `discovery/page.tsx` prepends
`API_BASE_URL` to the hero path, producing an absolute URL. In the API, `GetHero` returns the
image stream without setting any `Cache-Control` header.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type ImageRequest
  OUTPUT: boolean

  // Bug 1: hero URL constructed with absolute API_BASE_URL prefix
  IF X.component = "discovery/page.tsx"
     AND X.action = "mapDiscoveryStack"
     AND X.imageUrl STARTS WITH "http"
  THEN RETURN true

  // Bug 2: hero endpoint response missing Cache-Control header
  IF X.endpoint = "GET /api/recipes/{id}/hero"
     AND heroExists(X.id)
     AND X.response.headers["Cache-Control"] IS NULL
  THEN RETURN true

  RETURN false
END FUNCTION
```

### Examples

- **Bug 1 — production environment:** `API_BASE_URL = "http://pwa.wfs.localhost"` →
  `imageUrl = "http://pwa.wfs.localhost/api/recipes/abc123/hero"` → Next.js `<Image>` rejects
  the URL; discovery card renders without a photo.
- **Bug 1 — local dev (default fallback):** `API_BASE_URL` defaults to `"/api"` →
  `imageUrl = "/api/api/recipes/abc123/hero"` → double `/api` prefix; request 404s.
- **Bug 2 — any environment:** `GET /api/recipes/{id}/hero` returns 200 with JPEG body but no
  `Cache-Control` header → browser re-fetches the full image on every page load.
- **Non-bug (already correct):** `TonightPivotCard.tsx` constructs
  `` `/api/recipes/${gotoRecipeId}/hero` `` directly — no `API_BASE_URL` prefix, no change
  needed.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- `next.config.js` `remotePatterns` entries (Unsplash, `127.0.0.1:5001`, `localhost:5001`) must
  remain exactly as-is; no new hostname entries are added.
- `TonightPivotCard.tsx` already uses the correct relative path and must not be touched.
- `GET /api/recipes/{id}/hero` must continue to return `404 Not Found` when no hero image exists
  for the given recipe ID.
- All other API endpoints (`GET /api/recipes`, `GET /api/recipes/{id}`,
  `GET /api/recipes/{id}/original/{index}`, etc.) must be unaffected by the `Cache-Control`
  change.
- Mouse clicks, swipe gestures, and all other PWA interactions on the discovery page must
  continue to work exactly as before.

**Scope:**

All requests that do not match the bug condition are completely unaffected. This includes:
- Any image URL that is already a relative path (not prefixed with `http`)
- Any API endpoint other than `GET /api/recipes/{id}/hero`
- Any hero image request that returns a non-200 status (e.g. 404)

---

## Hypothesized Root Cause

### Bug 1 — Absolute URL in `discovery/page.tsx`

The `API_BASE_URL` constant was designed for constructing API fetch URLs in server actions and
client-side `fetch()` calls, where an absolute URL is sometimes needed (e.g. server-to-server
calls). It was incorrectly reused for constructing `<Image src>` values. In production,
`NEXT_PUBLIC_API_BASE_URL` is set to the full origin, so the resulting URL is absolute. Next.js
`<Image>` only accepts absolute URLs for hosts listed in `remotePatterns`; since
`pwa.wfs.localhost` is not listed, the image is rejected.

The correct pattern — already used in `TonightPivotCard.tsx` — is to use the relative path
directly: `/api/recipes/${id}/hero`. Traefik routes `/api/*` to the API container on the same
hostname, so no absolute URL is needed.

A secondary consequence: `API_BASE_URL` defaults to `"/api"` when
`NEXT_PUBLIC_API_BASE_URL` is unset, so in environments where the env var is absent the
constructed URL becomes `/api/api/recipes/{id}/hero` (double prefix), which also 404s.

### Bug 2 — Missing `Cache-Control` on hero endpoint

The `GetHero` action method calls `imageService.GetHeroImage(id)` and returns the stream via
`File(stream, contentType)` without setting any response headers. ASP.NET Core's `File()` result
does not add `Cache-Control` by default. Since hero images are immutable once generated (the
import workflow writes them once and never overwrites), they are safe to cache indefinitely, but
the header was simply never added.

---

## Correctness Properties

Property 1: Bug Condition — Hero Image URL Is a Relative Path

_For any_ discovery stack item mapped in `discovery/page.tsx` (in either `performFetch` or
`loadNextCategory`), the fixed mapping SHALL produce an `imageUrl` that starts with
`/api/recipes/` and does NOT start with `http`, making it a same-origin relative path that
Next.js `<Image>` accepts without a `remotePatterns` entry.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Hero Endpoint Returns Cache-Control Header

_For any_ request to `GET /api/recipes/{id}/hero` where a hero image exists for the given `id`,
the fixed `GetHero` action SHALL include `Cache-Control: public, max-age=31536000, immutable` in
the response headers.

**Validates: Requirements 2.3, 2.4**

Property 3: Preservation — Non-Hero Endpoints Are Unaffected

_For any_ request to an API endpoint other than `GET /api/recipes/{id}/hero`, the fixed code
SHALL produce exactly the same response as the original code, with no change to status codes,
response bodies, or headers.

**Validates: Requirements 3.5, 3.6, 3.7**

Property 4: Preservation — `next.config.js` remotePatterns Are Unchanged

_For any_ evaluation of `next.config.js`, the fixed configuration SHALL contain exactly the same
`remotePatterns` entries as before (Unsplash and direct-IP patterns), with no new hostname
entries added.

**Validates: Requirements 3.1, 3.2, 3.3**

---

## Fix Implementation

### Fix 1 — PWA: Remove `API_BASE_URL` prefix

**File:** `pwa/src/app/(app)/discovery/page.tsx`

**Change 1a — `performFetch` (line ~33):**

```typescript
// Before
imageUrl: `${API_BASE_URL}/api/recipes/${r.id}/hero`,

// After
imageUrl: `/api/recipes/${r.id}/hero`,
```

**Change 1b — `loadNextCategory` (line ~79):**

```typescript
// Before
imageUrl: `${API_BASE_URL}/api/recipes/${r.id}/hero`,

// After
imageUrl: `/api/recipes/${r.id}/hero`,
```

**Change 1c — Remove unused import (if `API_BASE_URL` is no longer referenced anywhere in the
file after the above changes):**

```typescript
// Remove this line:
import { API_BASE_URL } from '@/lib/constants/config';
```

Verify with a search that `API_BASE_URL` has no other usages in the file before removing the
import.

---

### Fix 2 — API: Add `Cache-Control` header to hero endpoint

**File:** `api/src/RecipeApi/Controllers/RecipeController.cs`

**Function:** `GetHero`

```csharp
// Before
[HttpGet("{id:guid}/hero")]
public async Task<IActionResult> GetHero(Guid id)
{
    var (stream, contentType) = await imageService.GetHeroImage(id);
    return File(stream, contentType);
}

// After
[HttpGet("{id:guid}/hero")]
public async Task<IActionResult> GetHero(Guid id)
{
    var (stream, contentType) = await imageService.GetHeroImage(id);
    Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
    return File(stream, contentType);
}
```

No other files in the API require changes. `ImageService`, `IRecipeStore`, and all other
controllers are untouched.

---

## Testing Strategy

### Validation Approach

The testing strategy follows the bug condition methodology: first confirm the bug is observable
on unfixed code (exploratory), then verify the fix satisfies the correctness properties (fix
checking), then verify no regressions (preservation checking).

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples that demonstrate each bug on unfixed code, confirming the root
cause analysis before implementing the fix.

**Bug 1 — URL construction (static analysis / code inspection):**

The bug is deterministic and statically verifiable — the source code contains the literal
`${API_BASE_URL}/api/recipes/${r.id}/hero` in two places. No runtime test is needed to confirm
the bug exists; a code review or a simple string search suffices. The fix is a one-line change
per call site.

**Bug 2 — Missing `Cache-Control` (unit test on unfixed code):**

Write a test that calls `GET /api/recipes/{id}/hero` on the unfixed controller and asserts the
`Cache-Control` header is present. This test will fail on unfixed code, confirming the bug.

**Expected counterexample on unfixed code:**

```
GET /api/recipes/{known-id}/hero → 200 OK
Response.Headers["Cache-Control"] → null  (expected: "public, max-age=31536000, immutable")
```

### Fix Checking

**Goal:** Verify that for all inputs where the bug condition holds, the fixed code produces the
expected behavior.

**Pseudocode:**

```
// Fix 1
FOR ALL r IN discoveryStack DO
  result := mapStack'(r)
  ASSERT result.imageUrl STARTS WITH "/api/recipes/"
  ASSERT result.imageUrl DOES NOT START WITH "http"
END FOR

// Fix 2
FOR ALL id WHERE heroExists(id) DO
  response := GetHero'(id)
  ASSERT response.StatusCode = 200
  ASSERT response.Headers["Cache-Control"] = "public, max-age=31536000, immutable"
END FOR
```

**Fix 1 test:** Static — verified by code inspection that both call sites use the relative path.
No new unit test required; the correctness property is structural (no `http` prefix in a string
literal).

**Fix 2 test:** Add a new `[Fact]` to `RecipeControllerTests` that seeds a hero image via
`IRecipeStore`, calls `GET /api/recipes/{id}/hero`, and asserts the `Cache-Control` header value.
This test will pass only after the fix is applied.

### Preservation Checking

**Goal:** Verify that for all inputs where the bug condition does NOT hold, the fixed code
produces the same result as the original.

**Pseudocode:**

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

**Preservation is verified by the existing test suite:**

- `GetHero_Returns_NotFound_Before_Import_Completes` — confirms 404 behavior is unchanged.
- `GetImage_Returns_Image_Binary` — confirms the original-photo endpoint is unaffected.
- `GetRecipes_Returns_Paginated_List`, `GetRecipeDetail_Returns_Recipe` — confirm other recipe
  endpoints are unaffected.
- `next.config.js` is not modified, so `remotePatterns` preservation requires no new test.

No new preservation tests are needed beyond the new Cache-Control assertion test.

### Unit Tests

- **`GetHero_Returns_CacheControl_Header`** *(new)*: Seeds a hero image via `IRecipeStore`,
  calls `GET /api/recipes/{id}/hero`, asserts `Cache-Control: public, max-age=31536000, immutable`
  is present in the response headers. Follows the exact pattern of the existing
  `GetHero_Returns_Hero_Image_When_Present` test.
- Existing `GetHero_Returns_Hero_Image_When_Present` and
  `GetHero_Returns_NotFound_Before_Import_Completes` tests must continue to pass after the fix.

### Property-Based Tests

Property-based testing is not warranted for these fixes. Both changes are deterministic and
have a single, fixed output for all matching inputs:

- The URL transformation is a pure string operation with no branching.
- The `Cache-Control` header value is a constant string applied unconditionally to all 200
  responses from the hero endpoint.

The existing `RecipeControllerTests` integration tests provide sufficient coverage.

### Integration Tests

- The full `task test` suite (which runs `RecipeControllerTests` via `dotnet test`) serves as
  the integration gate.
- After both fixes are applied, `task review` must pass (lint, type-check, tests) with no new
  failures.
- Manual smoke test in a local Docker environment: open the discovery page, confirm hero images
  load, and inspect the network tab to verify the `Cache-Control` header is present on the hero
  image response.
