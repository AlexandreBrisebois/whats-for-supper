# Design: Recipe Stack Browse

## Overview

The Recipe Stack Browse feature introduces an immersive, full-screen card-browsing experience that lets users flip through their entire recipe library one card at a time. This feature is inspired by the tactile ritual of browsing physical recipe cards and provides a discovery-oriented alternative to search.

The feature consists of:

1. **RecipeStackCard** — A new purpose-built card component for browsing (no voting logic)
2. **BrowseAllStack** — A full-screen overlay that pages through the recipe library
3. **Stack Action Bar** — A fixed UI bar with discoverable toggle and depth indicator
4. **Explore Order API** — A new `order=explore` parameter on `GET /api/recipes`
5. **Library Summary API** — A new `GET /api/recipes/library-summary` endpoint

The design intentionally separates this browsing experience from the Discovery feed, which is vote-driven and uses different ordering logic.

---

## Architecture

### Component Hierarchy

```
BrowseAllStack (Full-screen overlay)
├── Exit Button (top-left)
├── Search Escape Button (top-right)
├── Card Arena
│   ├── RecipeStackCard (front card)
│   ├── RecipeStackCard (card 2)
│   ├── RecipeStackCard (card 3)
│   └── RecipeStackCard (card 4)
├── Stack Action Bar (outside drag surface)
│   ├── Discoverable Toggle
│   └── Depth Indicator
└── End Card (terminal state)
```

### State Management

**New Zustand Store: `browseStackStore`**

```typescript
interface BrowseStackStore {
  // Stack state
  recipes: RecipeDto[];
  currentIndex: number;
  totalCount: number;
  
  // Pagination state
  currentPage: number;
  isLoading: boolean;
  hasMorePages: boolean;
  
  // Actions
  setRecipes: (recipes: RecipeDto[]) => void;
  appendRecipes: (recipes: RecipeDto[]) => void;
  setCurrentIndex: (index: number) => void;
  setTotalCount: (count: number) => void;
  nextCard: () => void;
  previousCard: () => void;
  reset: () => void;
}
```

**Why a new store?**
- Browse All Stack has different lifecycle and state from Discovery
- Discovery uses vote-driven ordering; Browse uses explore ordering
- Separation prevents coupling and makes testing easier

### Gesture Surface Separation

The card drag surface and action controls are on separate DOM layers to prevent gesture conflicts:

```
┌─────────────────────────────┐
│                             │  ← Framer Motion drag surface
│      food photography       │     (swipe left/right = navigate)
│                             │     (tap = open Recipe Detail Sheet)
│      recipe name            │
│      time / difficulty      │
└─────────────────────────────┘
[ ♥ discoverable ]  [ 3 / 24 ]   ← Stack Action Bar (outside drag surface)
                                     (normal button, no gesture conflict)
```

This follows the same pattern as `discovery/page.tsx` where like/dislike buttons are outside the `DiscoveryCard` element.

---

## Components and Interfaces

### 1. RecipeStackCard

**Location:** `pwa/src/components/recipes/RecipeStackCard.tsx`

**Purpose:** A purpose-built card component for browsing with no voting logic.

**Props:**

```typescript
interface RecipeStackCardProps {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  totalTime: string;
  difficulty: string;
  category: string;
  isFront: boolean;
  stackIndex: number;
  onSwipeRight: () => void;  // Navigate to next card
  onSwipeLeft: () => void;   // Navigate to previous card
  onTap: () => void;         // Open Recipe Detail Sheet
}
```

**Key Differences from DiscoveryCard:**
- No `hasFamilyInterest` prop
- No voting indicators ("LOVE", "PASS", "MATCH!")
- No pulsing sage ring animation
- Swipe callbacks are navigation-only (no vote submission)
- Uses ochre color for swipe indicators (vs. sage/terracotta for votes)

**Visual Design:**
- Mirrors DiscoveryCard layout: food photography (62% height), recipe info (38% height)
- Swipe indicators: "Next →" (ochre) and "← Back" (ochre) with ghost overlay style
- Stack depth effects: scale, y-offset, and opacity based on `stackIndex`
- Rounded corners: `rounded-[2.5rem]` (consistent with DiscoveryCard)

**Framer Motion Configuration:**
- Drag enabled only when `isFront === true`
- Drag threshold: 80px
- Velocity threshold: 500px/s
- Haptic feedback at 60px drag distance
- Spring animation for card return: `stiffness: 100, damping: 15`

### 2. BrowseAllStack

**Location:** `pwa/src/app/(app)/browse-all-stack/page.tsx` (or as a modal component)

**Purpose:** Full-screen immersive overlay for browsing the recipe library.

**State:**

```typescript
const {
  recipes,
  currentIndex,
  totalCount,
  isLoading,
  nextCard,
  previousCard,
  reset,
} = useBrowseStackStore();

const [isEndCard, setIsEndCard] = useState(false);
const [isPrefetching, setIsPrefetching] = useState(false);
```

**Lifecycle:**

1. **Mount:**
   - Fetch `GET /api/recipes/library-summary` to get `totalCount`
   - Fetch `GET /api/recipes?order=explore&page=1&limit=20`
   - Set `totalCount` and `recipes` in store
   - Display first card

2. **Navigation:**
   - Swipe right: `nextCard()` → advance `currentIndex`
   - Swipe left: `previousCard()` → decrement `currentIndex`
   - Pre-fetch next page when `remainingCards <= 5`

3. **End State:**
   - When `currentIndex === totalCount - 1` and user swipes right → show End Card
   - End Card swipe right → wrap to index 0
   - End Card swipe left → return to last recipe

4. **Unmount:**
   - Call `reset()` to clear store state

**UI Elements:**

- **Exit Button:** Top-left, X icon, dismisses overlay
- **Search Escape Button:** Top-right, magnifying glass icon, navigates to `/recipes` with search focused
- **Card Arena:** Centered, renders top 4 cards from current index
- **Stack Action Bar:** Below card arena, contains discoverable toggle and depth indicator
- **Loading Spinner:** Shown when pre-fetch hasn't completed and user reaches last loaded card

### 3. Stack Action Bar

**Location:** `pwa/src/components/recipes/StackActionBar.tsx`

**Purpose:** Fixed UI bar with discoverable toggle and depth indicator.

**Props:**

```typescript
interface StackActionBarProps {
  currentRecipe: RecipeDto;
  position: number;
  total: number;
  onToggleDiscoverable: (recipeId: string, newValue: boolean) => Promise<void>;
}
```

**UI Elements:**

1. **Discoverable Toggle:**
   - Icon button with distinct visual states for `isDiscoverable: true` vs `false`
   - `aria-label`: "Add to discovery" (when false) or "Remove from discovery" (when true)
   - Optimistic update on tap
   - Loading state while `PATCH /api/recipes/{id}` is in flight
   - Revert on error with brief error indicator

2. **Depth Indicator:**
   - Format: `{position} / {total}`
   - `position` is 1-based index of current card
   - `total` is from `library-summary` endpoint (confirmed by first page load)

**Layout:**
```
[ ♥ discoverable ]          [ 3 / 24 ]
```

### 4. End Card

**Location:** `pwa/src/components/recipes/EndCard.tsx`

**Purpose:** Terminal card shown after browsing all recipes.

**Visual Design:**
- Warm cream background (`bg-cream`)
- Ochre accent color
- Centered supper/compass icon
- No food photography

**Content:**
- Heading: "What's for Supper?"
- Supporting message: "You've browsed your whole library. Did you find what you were looking for?"
- Secondary message: "Have a recipe nearby you'd like to add?"
- CTA button: "Capture a Recipe" → navigates to `/capture`

**Behavior:**
- Swipe right → wrap to recipe 1 (reset `currentIndex` to 0)
- Swipe left → return to last recipe (`currentIndex = totalCount - 1`)
- Not shown when library is empty (empty state is shown instead)

### 5. Empty State

**Location:** Inline in `BrowseAllStack`

**Purpose:** Shown when library has zero recipes.

**Visual Design:**
- Warm cream background
- Centered layout
- Supper/compass icon

**Content:**
- Heading: "Your library is empty"
- Supporting message: "Add your first recipe and start building your library"
- CTA button: "Capture a Recipe" → navigates to `/capture`

**Distinction from End Card:**
- Empty state appears before any browsing begins
- End Card appears after browsing at least one recipe

---

## Data Models

### RecipeLibrarySummaryDto

**Purpose:** Lightweight summary of recipe library health.

**Schema:**

```typescript
interface RecipeLibrarySummaryDto {
  total: number;           // Count of all non-soft-deleted recipes
  neverCooked: number;     // Count where lastCookedDate IS NULL
  ratings: {
    love: number;          // rating === 3
    like: number;          // rating === 2
    dislike: number;       // rating === 1
    unrated: number;       // rating === 0
  };
}
```

**Usage:**
- Fetched on `BrowseAllStack` mount to populate depth indicator immediately
- Confirmed by `pagination.total` from first page load

### Explore Order

**Sort Key:** `lastCookedDate ASC NULLS FIRST`

**Logic:**
1. Never-cooked recipes first (`lastCookedDate IS NULL`)
2. Then oldest-cooked first (`lastCookedDate ASC`)

**Exclusions:**
- Soft-deleted recipes (`deletedAt IS NULL`)

**Distinction from Discovery Order:**
- Discovery uses `VoteCount DESC, lastCookedDate ASC NULLS FIRST`
- Explore uses `lastCookedDate ASC NULLS FIRST` only (no VoteCount)

---

## API Contract Changes

### 1. GET /api/recipes (Enhanced)

**New Query Parameter:**

```yaml
- name: order
  in: query
  schema:
    type: string
    enum: [explore]
  description: |
    Sort order for recipes. When "explore" is specified, recipes are ordered by
    lastCookedDate ASC NULLS FIRST (never-cooked first, then oldest-cooked first).
    When absent, default ordering (newest-created first) is applied.
```

**Behavior:**
- `order=explore` → `lastCookedDate ASC NULLS FIRST`, exclude soft-deleted
- `order` absent or unrecognized → default ordering (newest-created first)
- Invalid `order` value → HTTP 400 with descriptive error

**Response:** Unchanged (`RecipeListResponse`)

### 2. GET /api/recipes/library-summary (New)

**Purpose:** Return recipe library health counts.

**Request:** None (read-only, no body)

**Response:**

```yaml
200:
  description: OK
  content:
    application/json:
      schema:
        type: object
        properties:
          data:
            $ref: '#/components/schemas/RecipeLibrarySummaryDto'
```

**Example:**

```json
{
  "data": {
    "total": 42,
    "neverCooked": 12,
    "ratings": {
      "love": 8,
      "like": 15,
      "dislike": 3,
      "unrated": 16
    }
  }
}
```

**Implementation Notes:**
- All counts exclude soft-deleted recipes (`deletedAt IS NULL`)
- Efficient query: single pass with conditional aggregation

---

## Error Handling

### API Errors

**GET /api/recipes?order=explore**
- **400 Bad Request:** Invalid `order` value
  - Response: `{ "error": "Invalid order parameter. Allowed values: explore" }`
- **500 Internal Server Error:** Database query failure
  - Response: `{ "error": "Failed to fetch recipes" }`

**GET /api/recipes/library-summary**
- **500 Internal Server Error:** Database query failure
  - Response: `{ "error": "Failed to fetch library summary" }`

**PATCH /api/recipes/{id}**
- **404 Not Found:** Recipe does not exist
  - Response: `{ "error": "Recipe not found" }`
- **400 Bad Request:** Invalid `isDiscoverable` value
  - Response: `{ "error": "Invalid isDiscoverable value" }`

### UI Error Handling

**Pre-fetch Failure:**
- If pre-fetch fails, show loading spinner when user reaches last loaded card
- Retry pre-fetch on next navigation attempt
- If retry fails, show error toast: "Failed to load more recipes. Please try again."

**Discoverable Toggle Failure:**
- Revert toggle to previous state
- Show brief error indicator (red pulse on toggle icon)
- No blocking modal or toast (non-critical action)

**Initial Load Failure:**
- Show error state in card arena: "Failed to load recipes. Please try again."
- Provide "Retry" button that re-fetches page 1

**Empty Library:**
- Show empty state (not an error)
- Provide clear path to capture first recipe

---

## Testing Strategy

### Unit Tests

**RecipeStackCard.test.tsx**
- Renders with correct props
- Displays swipe indicators at correct thresholds
- Calls `onSwipeRight` when swiped right beyond threshold
- Calls `onSwipeLeft` when swiped left beyond threshold
- Calls `onTap` when tapped without completing swipe
- Does not render voting indicators
- Does not render `hasFamilyInterest` ring

**StackActionBar.test.tsx**
- Renders depth indicator with correct format
- Renders discoverable toggle with correct icon state
- Calls `onToggleDiscoverable` when toggle is tapped
- Shows loading state while toggle is in flight
- Reverts toggle state on error

**browseStackStore.test.ts**
- `nextCard()` increments `currentIndex`
- `previousCard()` decrements `currentIndex`
- `previousCard()` does not go below 0
- `setRecipes()` replaces recipes array
- `appendRecipes()` appends to recipes array
- `reset()` clears all state

**EndCard.test.tsx**
- Renders with correct content
- Navigates to `/capture` when CTA is tapped

### Integration Tests

**BrowseAllStack Integration**
- Fetches library summary on mount
- Fetches first page of recipes on mount
- Displays first card after load
- Advances to next card on swipe right
- Returns to previous card on swipe left
- Pre-fetches next page when 5 cards remain
- Shows End Card after last recipe
- Wraps to first card when End Card is swiped right
- Opens Recipe Detail Sheet when card is tapped
- Returns to same card after Recipe Detail Sheet is closed

### E2E Tests (Playwright)

**browse-all-stack.spec.ts**

Test scenarios:
1. **Entry Points:**
   - Home page trigger opens Browse All Stack
   - Recipes page trigger opens Browse All Stack

2. **Navigation:**
   - Swipe right advances to next card
   - Swipe left returns to previous card
   - First card does not wrap on swipe left
   - Last card shows End Card on swipe right
   - End Card wraps to first card on swipe right
   - End Card returns to last card on swipe left

3. **Depth Indicator:**
   - Shows correct position and total
   - Updates when card changes

4. **Discoverable Toggle:**
   - Toggles `isDiscoverable` state
   - Shows loading state while in flight
   - Reverts on error

5. **Recipe Detail Sheet:**
   - Opens when card is tapped
   - Returns to same card when closed
   - Depth indicator unchanged after close

6. **Empty State:**
   - Shows empty state when library is empty
   - Navigates to `/capture` when CTA is tapped

7. **End Card:**
   - Shows End Card after last recipe
   - Navigates to `/capture` when CTA is tapped

8. **Exit and Search Escape:**
   - Exit button dismisses overlay
   - Search escape button navigates to `/recipes` with search focused

**Mock Requirements:**
- `GET /api/recipes?order=explore` → returns 3 recipes
- `GET /api/recipes/library-summary` → returns `{ total: 3, neverCooked: 1, ratings: {...} }`
- `PATCH /api/recipes/{id}` → returns updated recipe

All E2E tests MUST use `page.getByTestId(...)` for interactions and assertions.

---

## Implementation Plan

### Phase 1: Contract Gate (Task 1)

**Objective:** Update OpenAPI spec and regenerate clients.

**Steps:**
1. Add `order` query parameter to `GET /api/recipes` in `specs/openapi.yaml`
2. Add `GET /api/recipes/library-summary` endpoint and `RecipeLibrarySummaryDto` schema
3. Run `task api:generate` to regenerate TypeScript client and C# DTOs
4. Run `task agent:drift` to confirm zero drift

**Acceptance Criteria:**
- `task api:generate` passes cleanly
- `task agent:drift` passes cleanly
- No implementation code written yet

### Phase 2: Backend Implementation (Tasks 2-3)

**Task 2: Explore Order on GET /api/recipes**

**Steps:**
1. Update `RecipesController.GetRecipes` to accept `order` query parameter
2. Add `order=explore` branch that applies `lastCookedDate ASC NULLS FIRST` sort
3. Ensure soft-deleted recipes are excluded
4. Return HTTP 400 for invalid `order` values
5. Write unit tests for explore ordering logic

**Task 3: Library Summary Endpoint**

**Steps:**
1. Create `GET /api/recipes/library-summary` endpoint in `RecipesController`
2. Implement efficient query with conditional aggregation
3. Return `RecipeLibrarySummaryDto` wrapped in `data` envelope
4. Write unit tests for summary calculation

### Phase 3: Frontend Components (Tasks 4-7)

**Task 4: RecipeStackCard Component**

**Steps:**
1. Create `pwa/src/components/recipes/RecipeStackCard.tsx`
2. Implement Framer Motion drag logic (mirror DiscoveryCard pattern)
3. Add swipe indicators ("Next →", "← Back") with ochre color
4. Add stack depth effects (scale, y-offset, opacity)
5. Write unit tests

**Task 5: Stack Action Bar Component**

**Steps:**
1. Create `pwa/src/components/recipes/StackActionBar.tsx`
2. Implement discoverable toggle with optimistic update
3. Implement depth indicator
4. Add loading and error states
5. Write unit tests

**Task 6: End Card and Empty State**

**Steps:**
1. Create `pwa/src/components/recipes/EndCard.tsx`
2. Create empty state inline in `BrowseAllStack`
3. Write unit tests

**Task 7: Browse Stack Store**

**Steps:**
1. Create `pwa/src/store/browseStackStore.ts`
2. Implement state and actions
3. Write unit tests

### Phase 4: BrowseAllStack Overlay (Tasks 8-9)

**Task 8: BrowseAllStack Component**

**Steps:**
1. Create `pwa/src/app/(app)/browse-all-stack/page.tsx` (or modal component)
2. Implement full-screen overlay layout
3. Integrate RecipeStackCard, StackActionBar, EndCard, and empty state
4. Implement navigation logic (swipe, wrap, pre-fetch)
5. Implement exit and search escape buttons
6. Write integration tests

**Task 9: Entry Points**

**Steps:**
1. Add "Browse your library" trigger to Home page (below Quick Capture)
2. Add "Browse your library" trigger to Recipes page
3. Wire triggers to open BrowseAllStack overlay

### Phase 5: E2E Tests and Mocks (Task 10)

**Steps:**
1. Add mocks to `pwa/src/test/mock-api.ts`
2. Write E2E tests in `pwa/e2e/browse-all-stack.spec.ts`
3. Verify all `data-testid` values are correct

### Phase 6: Integration and Polish (Task 11)

**Steps:**
1. Test full flow end-to-end
2. Verify accessibility (keyboard navigation, screen reader labels)
3. Verify performance (smooth animations, no jank)
4. Run `task agent:drift` to confirm zero drift
5. Update documentation

---

## Accessibility

### Keyboard Navigation

- **Exit Button:** Focusable, activatable with Enter/Space
- **Search Escape Button:** Focusable, activatable with Enter/Space
- **Discoverable Toggle:** Focusable, activatable with Enter/Space
- **End Card CTA:** Focusable, activatable with Enter/Space
- **Empty State CTA:** Focusable, activatable with Enter/Space

### Screen Reader Support

- **Exit Button:** `aria-label="Close browse overlay"`
- **Search Escape Button:** `aria-label="Search recipes"`
- **Discoverable Toggle:** `aria-label="Add to discovery"` or `"Remove from discovery"`
- **Depth Indicator:** `aria-live="polite"` to announce position changes
- **End Card:** Semantic heading structure (`<h2>`, `<p>`)
- **Empty State:** Semantic heading structure (`<h2>`, `<p>`)

### Focus Management

- When overlay opens, focus moves to exit button
- When overlay closes, focus returns to trigger element
- When Recipe Detail Sheet opens, focus moves to sheet
- When Recipe Detail Sheet closes, focus returns to card arena

---

## Performance Considerations

### Paged Loading

- Load 20 recipes per page (balance between network overhead and memory usage)
- Pre-fetch next page when 5 cards remain (accounts for fast swiping)
- Never load entire library into memory at once

### Rendering Optimization

- Render only top 4 cards in stack (performance and visual clarity)
- Use `AnimatePresence` for smooth card transitions
- Use `useMemo` for visible recipes calculation

### Image Loading

- Use Next.js Image component for optimized loading
- Lazy load images for cards not yet visible
- Use placeholder blur for better perceived performance

### Animation Performance

- Use GPU-accelerated transforms (`translateX`, `scale`, `rotate`)
- Avoid layout-triggering properties during drag
- Use `will-change` hint for drag surface

---

## Security Considerations

### Authentication

- All API endpoints require authentication (HearthSecret or HearthToken)
- `PATCH /api/recipes/{id}` requires FamilyMemberId header

### Authorization

- Users can only browse recipes in their own family
- Users can only toggle `isDiscoverable` for recipes in their own family

### Input Validation

- `order` parameter validated against enum
- `recipeId` validated as UUID
- `isDiscoverable` validated as boolean

---

## Future Enhancements

### Phase 2 Features (Out of Scope for MVP)

1. **Filter by Category:** Add category filter pills to Stack Action Bar
2. **Filter by Rating:** Add rating filter to Stack Action Bar
3. **Search within Stack:** Add inline search bar to filter stack
4. **Keyboard Shortcuts:** Arrow keys for navigation, Space for tap
5. **Swipe Gestures on Desktop:** Mouse drag for swipe on desktop
6. **Stack History:** Back button to return to previous card
7. **Share Card:** Share button to send recipe to family member
8. **Add to Planner:** Quick-add button to add recipe to planner

---

## Open Questions

1. **Should BrowseAllStack be a page or a modal component?**
   - **Recommendation:** Modal component (overlay) for better state preservation of underlying page
   - **Rationale:** User can return to exact same scroll position on Home or Recipes page

2. **Should pre-fetch be configurable?**
   - **Recommendation:** No, use fixed threshold (5 cards remaining)
   - **Rationale:** Simpler implementation, good default for most users

3. **Should depth indicator show "?" while library summary is loading?**
   - **Recommendation:** Yes, show `? / ?` until both summary and first page load
   - **Rationale:** Provides immediate feedback that data is loading

4. **Should End Card be skippable?**
   - **Recommendation:** No, End Card is always shown after last recipe
   - **Rationale:** Provides clear terminal state and path forward

---

## Dependencies

### External Libraries

- **Framer Motion:** Already in use for DiscoveryCard, reuse for RecipeStackCard
- **Zustand:** Already in use for state management, add new `browseStackStore`
- **Lucide React:** Already in use for icons, reuse for exit and search buttons

### Internal Dependencies

- **Recipe Detail Sheet:** Reuse existing component (no changes needed)
- **RecipeDto:** Reuse existing type from OpenAPI spec
- **API Client:** Regenerated from OpenAPI spec (includes new endpoints)

---

## Risks and Mitigations

### Risk 1: Gesture Conflicts

**Risk:** Discoverable toggle inside card causes gesture conflicts.

**Mitigation:** Place toggle in Stack Action Bar outside drag surface (architectural requirement).

### Risk 2: Performance with Large Libraries

**Risk:** Loading entire library into memory causes performance issues.

**Mitigation:** Paged loading with pre-fetch (max 40-60 recipes in memory at once).

### Risk 3: Confusion with Discovery Feed

**Risk:** Users confuse Browse All Stack with Discovery feed.

**Mitigation:** 
- Different visual design (ochre vs. sage/terracotta)
- Different entry points (Home/Recipes vs. Discovery tab)
- Different terminology ("Browse your library" vs. "Discover recipes")

### Risk 4: Accidental Voting

**Risk:** Users expect swipe to vote (like Discovery).

**Mitigation:**
- No voting indicators on RecipeStackCard
- Clear swipe direction indicators ("Next →", "← Back")
- Different color scheme (ochre vs. sage/terracotta)

---

## Success Metrics

### Engagement Metrics

- **Browse Sessions per User:** Target 2+ per week
- **Cards Viewed per Session:** Target 10+ cards
- **Completion Rate:** % of users who reach End Card (target 30%)

### Conversion Metrics

- **Capture Rate:** % of users who tap "Capture a Recipe" from End Card or empty state
- **Planner Add Rate:** % of users who add recipe to planner after browsing (future feature)

### Performance Metrics

- **Time to First Card:** Target < 500ms
- **Swipe Response Time:** Target < 16ms (60fps)
- **Pre-fetch Success Rate:** Target > 95%

---

## Appendix: data-testid Index

### Entry Points

| Element | `data-testid` |
|---|---|
| Home page trigger | `home-browse-all-trigger` |
| Recipes page trigger | `browse-all-stack-trigger` |

### Browse All Stack Overlay

| Element | `data-testid` |
|---|---|
| Overlay container | `browse-all-stack-container` |
| Exit button (top-left) | `browse-all-exit` |
| Search escape button (top-right) | `browse-all-search-trigger` |
| Loading indicator (pre-fetch gap) | `browse-all-loader` |
| Empty state (zero recipes) | `browse-all-empty-state` |
| Empty state capture CTA | `browse-all-empty-capture-cta` |
| End Card | `browse-all-end-card` |
| End Card capture CTA | `end-card-capture-cta` |

### Stack Action Bar

| Element | `data-testid` |
|---|---|
| Action bar container | `stack-action-bar` |
| Depth indicator | `stack-depth-indicator` |
| Discoverable toggle (per card) | `card-toggle-discovery-{recipeId}` |
| Discoverable toggle loading state | `card-toggle-discovery-{recipeId}-loading` |

### RecipeStackCard

| Element | `data-testid` |
|---|---|
| Card root (per card) | `stack-card-{recipeId}` |
| Front card (currently visible) | `stack-card-front` |
| Next swipe indicator | `stack-swipe-next-indicator` |
| Back swipe indicator | `stack-swipe-back-indicator` |
