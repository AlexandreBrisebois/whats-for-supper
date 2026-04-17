# Phase 2 Start: Connect Discovery to Live API

**Context:** The API currently processes recipes (Phase 1), but the PWA's Discovery Page (`pwa/src/app/(app)/discovery/page.tsx`) uses a hardcoded mock. Your goal is to connect the Discovery Page to the real API.

**Constraints:**
- Do not modify backend models.
- Maintain the "Solar Earth" aesthetic.
- Handle loading and empty states gracefully.

**Instructions:**
1. Update `pwa/src/app/(app)/discovery/page.tsx` to fetch available recipes using `apiClient.get('/recipes')` from `pwa/src/lib/api/client.ts`. 
2. Map the API response `RecipeDto` to the `DiscoveryCard` props. Use `/api/recipe/{id}/original/0` for the image URL.
3. Ensure the swipe mechanics (triggerEureka, handleSwipeRight/Left) still function properly using the real dynamic data.
4. Verify by running `task test:pwa:live` or manually inspecting the UI against the local `.NET` backend.
