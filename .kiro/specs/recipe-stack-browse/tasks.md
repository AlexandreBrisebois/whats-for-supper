# Implementation Plan: Recipe Stack Browse

## Overview

This plan implements the Recipe Stack Browse feature, which provides an immersive full-screen card-browsing experience for users to flip through their entire recipe library. The implementation follows a contract-first approach, building from API contracts through backend implementation to frontend components.

The feature introduces:
- A new `RecipeStackCard` component for browsing (no voting logic)
- A full-screen `BrowseAllStack` overlay with paged loading
- A `Stack Action Bar` with discoverable toggle and depth indicator
- New API endpoints: `GET /api/recipes/library-summary` and enhanced `GET /api/recipes` with `order=explore`

## Tasks

- [x] 1. Contract Gate - Update OpenAPI spec and regenerate clients
  - Add `order` query parameter (enum: `["explore"]`) to `GET /api/recipes` in `specs/openapi.yaml`
  - Add `GET /api/recipes/library-summary` endpoint definition
  - Add `RecipeLibrarySummaryDto` schema with `total`, `neverCooked`, and `ratings` properties
  - Run `task api:generate` to regenerate TypeScript client and C# DTOs
  - Run `task agent:drift` to confirm zero drift
  - Add mocks to `pwa/src/test/mock-api.ts` for `GET /api/recipes?order=explore` and `GET /api/recipes/library-summary`
  - _Requirements: 5, 6, 7, 12, 13_

- [x] 2. Backend - Implement Explore Order on GET /api/recipes
  - [x] 2.1 Add explore ordering logic to RecipesController
    - Update `RecipesController.GetRecipes` to accept `order` query parameter
    - Implement `order=explore` branch with `lastCookedDate ASC NULLS FIRST` sort
    - Ensure soft-deleted recipes are excluded (`deletedAt IS NULL`)
    - Return HTTP 400 for invalid `order` values with descriptive error message
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_
  
  - [x] 2.2 Write unit tests for explore ordering
    - Test that `order=explore` returns never-cooked recipes first
    - Test that never-cooked recipes are followed by oldest-cooked first
    - Test that soft-deleted recipes are excluded
    - Test that invalid `order` values return HTTP 400
    - Test that absent `order` parameter uses default ordering
    - _Requirements: 6.2, 6.4, 6.5, 6.7_

- [x] 3. Backend - Implement Library Summary Endpoint
  - [x] 3.1 Create GET /api/recipes/library-summary endpoint
    - Create new endpoint in `RecipesController`
    - Implement efficient query with conditional aggregation for counts
    - Calculate `total`, `neverCooked`, and `ratings` (love/like/dislike/unrated)
    - Exclude soft-deleted recipes from all counts
    - Return `RecipeLibrarySummaryDto` wrapped in standard `data` envelope
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_
  
  - [x] 3.2 Write unit tests for library summary
    - Test that `total` count excludes soft-deleted recipes
    - Test that `neverCooked` count is accurate
    - Test that rating counts (love/like/dislike/unrated) are accurate
    - Test that all counts exclude soft-deleted recipes
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

- [ ] 4. Checkpoint - Verify backend implementation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Frontend - Create Browse Stack Store
  - [ ] 5.1 Implement browseStackStore with Zustand
    - Create `pwa/src/store/browseStackStore.ts`
    - Define `BrowseStackStore` interface with recipes, currentIndex, totalCount, pagination state
    - Implement actions: `setRecipes`, `appendRecipes`, `setCurrentIndex`, `setTotalCount`, `nextCard`, `previousCard`, `reset`
    - _Requirements: 1, 2_
  
  - [ ] 5.2 Write unit tests for browseStackStore
    - Test that `nextCard()` increments `currentIndex`
    - Test that `previousCard()` decrements `currentIndex` but not below 0
    - Test that `setRecipes()` replaces recipes array
    - Test that `appendRecipes()` appends to recipes array
    - Test that `reset()` clears all state
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 6. Frontend - Create RecipeStackCard Component
  - [ ] 6.1 Implement RecipeStackCard component
    - Create `pwa/src/components/recipes/RecipeStackCard.tsx`
    - Define props: `id`, `name`, `description`, `imageUrl`, `totalTime`, `difficulty`, `category`, `isFront`, `stackIndex`, `onSwipeRight`, `onSwipeLeft`, `onTap`
    - Implement Framer Motion drag logic (threshold: 80px, velocity: 500px/s)
    - Add swipe indicators ("Next →", "← Back") with ochre color and `data-testid` attributes
    - Add stack depth effects (scale, y-offset, opacity based on `stackIndex`)
    - Render card root with `data-testid="stack-card-{recipeId}"` and `data-testid="stack-card-front"` when `isFront` is true
    - NO voting logic, NO `hasFamilyInterest` prop, NO vote indicators
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_
  
  - [ ] 6.2 Write unit tests for RecipeStackCard
    - Test that component renders with correct props
    - Test that swipe indicators appear at correct thresholds
    - Test that `onSwipeRight` is called when swiped right beyond threshold
    - Test that `onSwipeLeft` is called when swiped left beyond threshold
    - Test that `onTap` is called when tapped without completing swipe
    - Test that NO voting indicators are rendered
    - Test that NO `hasFamilyInterest` ring is rendered
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 10.3, 10.5_

- [ ] 7. Frontend - Create Stack Action Bar Component
  - [ ] 7.1 Implement StackActionBar component
    - Create `pwa/src/components/recipes/StackActionBar.tsx`
    - Define props: `currentRecipe`, `position`, `total`, `onToggleDiscoverable`
    - Implement discoverable toggle with distinct visual states and `data-testid="card-toggle-discovery-{recipeId}"`
    - Implement depth indicator with format `{position} / {total}` and `data-testid="stack-depth-indicator"`
    - Add optimistic update for toggle with loading state (`data-testid="card-toggle-discovery-{recipeId}-loading"`)
    - Add error handling with revert on failure
    - Add accessible `aria-label` for toggle: "Add to discovery" or "Remove from discovery"
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_
  
  - [ ] 7.2 Write unit tests for StackActionBar
    - Test that depth indicator renders with correct format
    - Test that discoverable toggle renders with correct icon state
    - Test that `onToggleDiscoverable` is called when toggle is tapped
    - Test that loading state is shown while toggle is in flight
    - Test that toggle state reverts on error
    - _Requirements: 4.2, 4.5, 4.6, 4.7, 4.8_

- [ ] 8. Frontend - Create End Card and Empty State Components
  - [ ] 8.1 Implement EndCard component
    - Create `pwa/src/components/recipes/EndCard.tsx`
    - Render with warm cream background, ochre accent, supper/compass icon
    - Display heading: "What's for Supper?"
    - Display supporting messages about browsing completion and capture invitation
    - Add CTA button with `data-testid="end-card-capture-cta"` that navigates to `/capture`
    - Support swipe gestures (right = wrap to recipe 1, left = return to last recipe)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_
  
  - [ ] 8.2 Create empty state inline in BrowseAllStack
    - Render with `data-testid="browse-all-empty-state"` when `pagination.total === 0`
    - Display heading: "Your library is empty"
    - Display supporting message about adding first recipe
    - Add CTA button with `data-testid="browse-all-empty-capture-cta"` that navigates to `/capture`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 8.3 Write unit tests for EndCard
    - Test that EndCard renders with correct content
    - Test that CTA navigates to `/capture` when tapped
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 9. Checkpoint - Verify component implementations
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Frontend - Implement BrowseAllStack Overlay
  - [ ] 10.1 Create BrowseAllStack page/component
    - Create `pwa/src/app/(app)/browse-all-stack/page.tsx` (or modal component)
    - Implement full-screen overlay layout with `data-testid="browse-all-stack-container"`
    - Add exit button (top-left, X icon) with `data-testid="browse-all-exit"`
    - Add search escape button (top-right, search icon) with `data-testid="browse-all-search-trigger"`
    - Integrate RecipeStackCard, StackActionBar, EndCard, and empty state
    - Hide bottom navigation bar, search bar, and filter pills while active
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [ ] 10.2 Implement navigation and lifecycle logic
    - Fetch `GET /api/recipes/library-summary` on mount to get `totalCount`
    - Fetch `GET /api/recipes?order=explore&page=1&limit=20` on mount
    - Implement swipe right to advance, swipe left to go back
    - Implement first card no-wrap on swipe left
    - Implement End Card display after last recipe
    - Implement End Card wrap to recipe 1 on swipe right
    - Implement End Card return to last recipe on swipe left
    - Call `reset()` on unmount to clear store state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.1, 5.2_
  
  - [ ] 10.3 Implement paged loading and pre-fetch
    - Load recipes in pages of 20 from `GET /api/recipes?order=explore&page=N&limit=20`
    - Pre-fetch next page when `remainingCards <= 5`
    - Show loading spinner with `data-testid="browse-all-loader"` if pre-fetch incomplete
    - Set `totalCount` from `pagination.total` on first page load
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ] 10.4 Implement Recipe Detail Sheet integration
    - Open Recipe Detail Sheet when card is tapped
    - Return to same card and stack position when sheet is closed
    - Freeze stack while sheet is open (no index change, no API call on close)
    - _Requirements: 2.7, 2.8, 2.9_
  
  - [ ]* 10.5 Write integration tests for BrowseAllStack
    - Test that library summary is fetched on mount
    - Test that first page of recipes is fetched on mount
    - Test that first card is displayed after load
    - Test that swipe right advances to next card
    - Test that swipe left returns to previous card
    - Test that pre-fetch occurs when 5 cards remain
    - Test that End Card is shown after last recipe
    - Test that End Card wraps to first card on swipe right
    - Test that Recipe Detail Sheet opens when card is tapped
    - Test that same card is shown after Recipe Detail Sheet closes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 5.3, 5.4_

- [ ] 11. Frontend - Add Entry Points
  - [ ] 11.1 Add Home page trigger
    - Add "Browse your library" trigger to Home page below Quick Capture
    - Render with `data-testid="home-browse-all-trigger"`
    - Wire trigger to open BrowseAllStack overlay
    - _Requirements: 1.1, 1.3_
  
  - [ ] 11.2 Add Recipes page trigger
    - Add "Browse your library" trigger to Recipes page
    - Render with `data-testid="browse-all-stack-trigger"`
    - Wire trigger to open BrowseAllStack overlay
    - _Requirements: 1.2, 1.3_

- [ ] 12. E2E Tests - Write Playwright tests
  - [ ]* 12.1 Write browse-all-stack.spec.ts
    - Create `pwa/e2e/browse-all-stack.spec.ts`
    - Test entry points: Home page trigger and Recipes page trigger open overlay
    - Test navigation: swipe right advances, swipe left returns, first card no-wrap, End Card behavior
    - Test depth indicator: shows correct position and total, updates on card change
    - Test discoverable toggle: toggles state, shows loading, reverts on error
    - Test Recipe Detail Sheet: opens on tap, returns to same card on close
    - Test empty state: shows when library empty, navigates to `/capture` on CTA
    - Test End Card: shows after last recipe, navigates to `/capture` on CTA
    - Test exit and search escape: exit dismisses overlay, search escape navigates to `/recipes`
    - Use ONLY `page.getByTestId(...)` for all interactions and assertions
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.2, 4.5, 4.6, 4.7, 8.6, 8.7, 8.8, 9.4, 14.6_

- [ ] 13. Accessibility and Polish
  - [ ] 13.1 Verify accessibility compliance
    - Verify exit button is keyboard operable (focusable, Enter/Space activatable)
    - Verify search escape button is keyboard operable
    - Verify discoverable toggle has correct `aria-label` reflecting state
    - Verify End Card CTA is keyboard operable
    - Verify empty state CTA is keyboard operable
    - Verify focus management: focus moves to exit button on open, returns to trigger on close
    - _Requirements: 14.2, 14.3, 14.4, 14.5_
  
  - [ ] 13.2 Verify performance and animations
    - Verify smooth animations with no jank (60fps target)
    - Verify swipe response time < 16ms
    - Verify time to first card < 500ms
    - Verify image loading optimization with Next.js Image component
    - Verify GPU-accelerated transforms for drag surface
    - _Requirements: Design - Performance Considerations_
  
  - [ ] 13.3 Final integration verification
    - Run full E2E test suite
    - Run `task agent:drift` to confirm zero drift
    - Verify all `data-testid` values match the index in requirements
    - Test full flow end-to-end manually
    - _Requirements: 12.2, 14.1, 14.7_

- [ ] 14. Final checkpoint - Complete feature verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Contract gate (Task 1) MUST be completed before any implementation begins
- Backend tasks (2-3) should be completed before frontend tasks (5-11)
- Component tasks (6-8) can be developed in parallel after store is ready
- E2E tests (12) should be written after all components are integrated
- All E2E tests MUST use `page.getByTestId(...)` exclusively
- RecipeStackCard has NO voting logic and does NOT modify DiscoveryCard
- Explore ordering uses `lastCookedDate ASC NULLS FIRST` only (no VoteCount)
- Stack Action Bar is outside the drag surface to prevent gesture conflicts

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1", "7.1", "8.1", "8.2"] },
    { "id": 5, "tasks": ["6.2", "7.2", "8.3"] },
    { "id": 6, "tasks": ["10.1", "10.2", "10.3", "10.4"] },
    { "id": 7, "tasks": ["10.5", "11.1", "11.2"] },
    { "id": 8, "tasks": ["12.1"] },
    { "id": 9, "tasks": ["13.1", "13.2", "13.3"] }
  ]
}
```
