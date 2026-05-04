# Bugfix Requirements Document

## Introduction

Two independent bugs prevent recipe hero images from loading correctly and efficiently in the PWA.

**Bug 1 — Absolute URL construction:** `discovery/page.tsx` constructs hero image URLs by prepending `API_BASE_URL` (e.g. `http://pwa.wfs.localhost`) to the path, producing absolute URLs like `http://pwa.wfs.localhost/api/recipes/{id}/hero`. Hero images are same-origin — Traefik routes `/api/*` on the same hostname to the API container — so no absolute URL is needed. Next.js `<Image>` accepts relative paths natively as same-origin requests, requiring no `remotePatterns` entry and working identically across all environments. The fix is to remove the `API_BASE_URL` prefix and use the relative path `/api/recipes/{id}/hero` directly, matching the pattern already used correctly in `TonightPivotCard.tsx` and in the OpenAPI spec examples.

**Bug 2 — Missing cache headers:** The API's `GET /api/recipes/{id}/hero` endpoint returns the image binary with no `Cache-Control` header. Hero images are AI-generated and immutable once created, so the response should carry `Cache-Control: public, max-age=31536000, immutable` to allow browsers and CDNs to cache them indefinitely.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `discovery/page.tsx` maps a discovery stack item to a `DiscoveryCard` THEN the system constructs the hero image URL as `` `${API_BASE_URL}/api/recipes/${r.id}/hero` ``, producing an absolute URL such as `http://pwa.wfs.localhost/api/recipes/{id}/hero`

1.2 WHEN Next.js `<Image>` receives an absolute external URL THEN the system requires the URL's hostname to be listed in `remotePatterns` in `next.config.js`, which `pwa.wfs.localhost` is not, causing the image request to be rejected and the discovery card to render without a hero photo

1.3 WHEN the API handles `GET /api/recipes/{id}/hero` THEN the system returns the JPEG binary with no `Cache-Control` header in the response

1.4 WHEN the hero image response carries no `Cache-Control` header THEN the system re-fetches the full image binary from the API on every page load, even though the image has not changed

### Expected Behavior (Correct)

2.1 WHEN `discovery/page.tsx` maps a discovery stack item to a `DiscoveryCard` THEN the system SHALL construct the hero image URL as the relative path `/api/recipes/${r.id}/hero`, without any `API_BASE_URL` prefix

2.2 WHEN Next.js `<Image>` receives a relative path as `src` THEN the system SHALL treat it as a same-origin request, serve the image correctly, and require no `remotePatterns` entry for any hostname

2.3 WHEN the API handles `GET /api/recipes/{id}/hero` THEN the system SHALL include `Cache-Control: public, max-age=31536000, immutable` in the response headers

2.4 WHEN the hero image response carries a `Cache-Control: immutable` header THEN the system SHALL allow the browser and any CDN to cache the image indefinitely and avoid redundant re-fetches on subsequent page loads

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the PWA requests an image from `https://images.unsplash.com` THEN the system SHALL CONTINUE TO accept and optimise that image without modification

3.2 WHEN the PWA requests an image from `http://127.0.0.1:5001` or `http://localhost:5001` THEN the system SHALL CONTINUE TO accept and optimise that image without modification

3.3 WHEN `next.config.js` is evaluated THEN the system SHALL CONTINUE TO contain only the existing `remotePatterns` entries (Unsplash and direct-IP patterns); no new hostname entries are added as part of this fix

3.4 WHEN the PWA is deployed to any environment (local dev, production, or any future hostname) THEN the system SHALL CONTINUE TO load hero images correctly via the relative path, with no environment-specific configuration required

3.5 WHEN a client requests any other API endpoint (recipes list, recipe detail, votes, etc.) THEN the system SHALL CONTINUE TO respond correctly and without caching side-effects

3.6 WHEN a hero image does not exist for a recipe THEN the system SHALL CONTINUE TO return a `404 Not Found` response

3.7 WHEN the API serves an original uploaded photo via `GET /api/recipes/{id}/original/{photoIndex}` THEN the system SHALL CONTINUE TO return that image correctly (caching behaviour on this endpoint is out of scope for this fix)

3.8 WHEN `TonightPivotCard.tsx` constructs a hero image URL using `` `/api/recipes/${gotoRecipeId}/hero` `` THEN the system SHALL CONTINUE TO load that image correctly (this component already uses the correct relative path pattern and requires no change)

---

## Bug Condition

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ImageRequest
  OUTPUT: boolean

  // Bug 1: hero URL was constructed with an absolute API_BASE_URL prefix
  // Bug 2: request is to the hero endpoint (no Cache-Control header returned)
  RETURN (X.imageUrlIsAbsolute = true AND X.imagePath STARTS WITH "/api/recipes/" AND X.imagePath ENDS WITH "/hero")
      OR (X.endpoint = "GET /api/recipes/{id}/hero")
END FUNCTION
```

### Property: Fix Checking

```pascal
// Property: Fix Checking — relative URL construction (Bug 1)
FOR ALL X WHERE X.component = "discovery/page.tsx" AND X.action = "mapDiscoveryStack" DO
  result ← mapStack'(X)
  ASSERT result.imageUrl STARTS WITH "/api/recipes/"
  ASSERT result.imageUrl DOES NOT START WITH "http"
END FOR

// Property: Fix Checking — Cache-Control header (Bug 2)
FOR ALL X WHERE X.endpoint = "GET /api/recipes/{id}/hero" AND heroExists(X.id) DO
  result ← getHero'(X)
  ASSERT result.headers["Cache-Control"] = "public, max-age=31536000, immutable"
END FOR
```

### Property: Preservation Checking

```pascal
// Property: Preservation Checking
// For all requests that do not match the bug condition, fixed behaviour is identical to original
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR

// Specifically: remotePatterns in next.config.js are unchanged
ASSERT next.config.js.remotePatterns = [unsplash, "127.0.0.1:5001", "localhost:5001"]
```
