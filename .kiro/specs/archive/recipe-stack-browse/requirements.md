# Requirements: Recipe Stack Browse

## Pre-Mortem Notes

This document incorporates all decisions from the pre-mortem review conducted before
implementation. Every blind spot identified has been resolved here. Builders MUST read
the "Implementation Contract for Agents" section before writing any code.

---

## Introduction

Mom loves to flip through her physical recipe library at the dinner table — picking up
one card, glancing at it, setting it aside, reaching for the next. This feature brings
that tactile ritual into the app as a single immersive experience called **Browse All Stack**.

Browse All Stack is a full-screen overlay that lets mom swipe through her entire recipe
library one card at a time, ordered so the recipes she hasn't cooked in the longest time
appear first. It is an **exploration experience**, not a search experience. When mom knows
what she's looking for, she uses search. When she wants to be surprised or reminded of
forgotten favourites, she browses the stack.

The feature introduces:
1. A new `RecipeStackCard` component — a purpose-built browse card, visually similar to
   `DiscoveryCard` but with no voting logic whatsoever.
2. A full-screen immersive overlay (`BrowseAllStack`) that pages through the recipe library.
3. Two entry points: the Home page (below Quick Capture) and the Recipes page.
4. A new `GET /api/recipes/library-summary` endpoint returning library health counts.
5. A new `order=explore` parameter on `GET /api/recipes` for explore-ordered paging.

---

## Terminology

### User-facing copy
All UI labels, empty states, End Card copy, and CTAs SHALL use **"library"** — consistent
with existing app copy ("Search Library", etc.).

Examples: *"Browse your library"*, *"Your library is empty"*, *"You've browsed your whole library"*.

### Internal spec and component names
Spec requirements, glossary terms, and component names use **"stack"** — precise for
developers and maps to the component name `RecipeStackCard`.

These two vocabularies never need to match. Do not use "recipe box" or "collection".

---

## Glossary

- **Browse_All_Stack**: The full-screen immersive overlay that lets mom swipe through her
  entire recipe library as a card stack.
- **Explore_Order**: The sort applied when `order=explore` is requested on `GET /api/recipes`.
  Sort key: `lastCookedDate ASC NULLS FIRST` — never-cooked recipes first, then
  oldest-cooked first. No VoteCount involvement. This is intentionally different from the
  Discovery feed ordering (which is VoteCount-first).
- **End_Card**: The terminal card shown after the last recipe in Browse_All_Stack, signalling
  that mom has browsed her whole library. Swiping right wraps to recipe 1; swiping left
  returns to the last recipe.
- **RecipeStackCard**: The new purpose-built card component at
  `pwa/src/components/recipes/RecipeStackCard.tsx`. Visually mirrors `DiscoveryCard` but
  has no voting logic, no `hasFamilyInterest` prop, and no LOVE/PASS indicators.
- **Stack_Action_Bar**: The fixed UI bar rendered below the card arena, outside the
  Framer Motion drag surface. Contains the discoverable toggle and depth indicator.
  This is the architectural solution to gesture conflicts.
- **Depth_Indicator**: The `{position} / {total}` counter rendered in the Stack_Action_Bar.
  `total` is sourced from `GET /api/recipes/library-summary` on mount, then confirmed
  by `pagination.total` from the first page load.
- **Recipe_Detail_Sheet**: The existing full-screen overlay for a recipe, reused unchanged.
- **RecipeLibrarySummaryDto**: The new DTO returned by `GET /api/recipes/library-summary`.

---

## Implementation Contract for Agents

This section prevents junior developers and small models from making the most common
mistakes. Read it before touching any file.

### 1. Do NOT modify DiscoveryCard or the Discovery page

`DiscoveryCard.tsx` and `discovery/page.tsx` are **off-limits**. Do not add props, do not
change behaviour, do not import from them. Browse All Stack is built on `RecipeStackCard`,
a new component. Any change to the Discovery feature is out of scope and will break
existing tests.

### 2. RecipeStackCard has no voting logic

`RecipeStackCard` SHALL NOT import or call:
- `submitVote` or any function from `@/lib/api/discovery`
- `getDiscoveryStack` or `getCategories`
- `useDiscoveryStore` or any discovery store

Swipe right = next card. Swipe left = previous card. That is all.

### 3. Gesture surface separation is mandatory

The card drag surface and the action controls are on separate DOM layers:

```
┌─────────────────────────────┐
│                             │  ← Framer Motion drag surface
│      food photography       │     swipe left/right = navigate
│                             │     tap = open Recipe_Detail_Sheet
│      recipe name            │
│      time / difficulty      │
└─────────────────────────────┘
[ ♥ discoverable ]  [ 3 / 24 ]   ← Stack_Action_Bar (outside drag surface)
                                     normal button, no gesture conflict
```

The discoverable toggle MUST be in the Stack_Action_Bar, NOT inside the draggable card.
This is the same pattern used by `discovery/page.tsx` where the like/dislike buttons are
outside the `DiscoveryCard` element. Do not move the toggle inside the card.

### 4. Contract gate before implementation

`specs/openapi.yaml` MUST be updated and `task api:generate` MUST pass before any
UI or backend implementation code is written. See Requirement 5 for the exact contract
changes required.

### 5. Explore_Order is not Discovery ordering

`order=explore` on `GET /api/recipes` sorts by `lastCookedDate ASC NULLS FIRST` only.
It does NOT use VoteCount. It is a different sort from `DiscoveryService.GetRecipesForDiscoveryAsync`
which sorts VoteCount-first. Do not copy the DiscoveryService query.

### 6. hasFamilyInterest does not exist in RecipeStackCard

`RecipeStackCard` has no `hasFamilyInterest` prop. Do not add one. Do not derive it from
`rating` or `isDiscoverable`. The pulsing sage ring and "MATCH!" label from `DiscoveryCard`
do not exist in this component.

---

## Requirements

### Requirement 1: Browse All Stack — Immersive Overlay

**User Story:** As a user, I want to flip through my entire recipe library as a card stack
so I can browse for inspiration the way mom flips through physical recipe cards.

#### Acceptance Criteria

1. THE Home_Page SHALL render a "Browse your library" entry point with
   `data-testid="home-browse-all-trigger"` positioned below the `QuickCaptureTrigger`
   component.
2. THE Recipes_Page SHALL render a "Browse your library" entry point with
   `data-testid="browse-all-stack-trigger"`.
3. WHEN either entry point is tapped, THE app SHALL render the Browse_All_Stack as a
   full-screen immersive overlay on top of the current page.
4. WHILE Browse_All_Stack is active, THE bottom navigation bar, search bar, and filter
   pills SHALL be hidden. The only visible UI SHALL be the card arena, the
   Stack_Action_Bar, the exit button, and the search escape button.
5. THE Browse_All_Stack overlay SHALL render with `data-testid="browse-all-stack-container"`.
6. THE Browse_All_Stack SHALL render an exit button with `data-testid="browse-all-exit"`
   in the top-left corner using an X icon. Tapping it SHALL dismiss the overlay and
   return the user to the page underneath with its state intact.
7. THE Browse_All_Stack SHALL render a search escape button with
   `data-testid="browse-all-search-trigger"` in the top-right corner using a search/
   magnifying glass icon. Tapping it SHALL dismiss the overlay and navigate to `/recipes`
   with the search bar focused, so mom can transition from exploring to searching.
8. THE exit button and search escape button SHALL be visible at all times, including
   when the End_Card is displayed.

---

### Requirement 2: Card Navigation — Swipe Forward and Back

**User Story:** As a user browsing the stack, I want to swipe right to go to the next
recipe and swipe left to go back to the previous one, so I can move freely through my library.

#### Acceptance Criteria

1. WHEN the user swipes right on a `RecipeStackCard`, THE Browse_All_Stack SHALL advance
   to the next recipe in Explore_Order.
2. WHEN the user swipes left on a `RecipeStackCard`, THE Browse_All_Stack SHALL return
   to the previous recipe in Explore_Order.
3. WHEN the user is on the first recipe (position 1) and swipes left, THE Browse_All_Stack
   SHALL remain on the first recipe. No wrap-around on the first card.
4. WHEN the user swipes right on the last recipe, THE Browse_All_Stack SHALL display the
   End_Card.
5. WHEN the user swipes right on the End_Card, THE Browse_All_Stack SHALL wrap to recipe 1
   (page 1, index 0 of Explore_Order) and resume from the beginning. The Depth_Indicator
   SHALL reset to `1 / {total}`.
6. WHEN the user swipes left on the End_Card, THE Browse_All_Stack SHALL return to the
   last recipe in the stack.
7. WHEN the user taps a `RecipeStackCard` without completing a swipe gesture, THE
   Browse_All_Stack SHALL open the existing Recipe_Detail_Sheet for that recipe.
8. WHEN the Recipe_Detail_Sheet is closed, THE Browse_All_Stack SHALL return to the exact
   same card that was tapped, at the same stack position. The Depth_Indicator SHALL show
   the same `{position} / {total}` as before the sheet was opened. No API call SHALL be
   made on sheet close.
9. Tapping a card SHALL NOT advance the stack index or remove the card from the loaded set.
   The stack is frozen while the Recipe_Detail_Sheet is open.

---

### Requirement 3: Swipe Direction Indicators

**User Story:** As a user, I want a visual cue when I drag a card so I know which direction
I'm navigating.

#### Acceptance Criteria

1. WHEN the front card is dragged right beyond the drag threshold, THE `RecipeStackCard`
   SHALL display a "Next →" indicator with `data-testid="stack-swipe-next-indicator"`.
2. WHEN the front card is dragged left beyond the drag threshold, THE `RecipeStackCard`
   SHALL display a "← Back" indicator with `data-testid="stack-swipe-back-indicator"`.
3. Both indicators SHALL use the ghost overlay style (backdrop blur, centered) with
   ochre color — visually distinct from the Discovery feed's sage/terracotta vote indicators.
4. THE `RecipeStackCard` SHALL NOT render "LOVE", "PASS", "MATCH!", or any voting-related
   label at any time.
5. THE `RecipeStackCard` SHALL NOT render the `hasFamilyInterest` pulsing ring animation.

---

### Requirement 4: Stack Action Bar and Depth Indicator

**User Story:** As a user, I want to know how deep I am in my library and be able to toggle
a recipe's discoverable status without opening it.

#### Acceptance Criteria

1. THE Browse_All_Stack SHALL render a `Stack_Action_Bar` with
   `data-testid="stack-action-bar"` positioned below the card arena, outside the
   Framer Motion drag surface.
2. THE Stack_Action_Bar SHALL display a Depth_Indicator showing `{position} / {total}`
   with `data-testid="stack-depth-indicator"`.
3. THE `total` value in the Depth_Indicator SHALL be populated from
   `GET /api/recipes/library-summary` on mount, so mom sees the total immediately
   (e.g. `? / 42`) before the first page of cards finishes loading.
4. THE `position` value SHALL reflect the current 1-based index of the front card across
   all pages (not just the current page).
5. THE Stack_Action_Bar SHALL render a discoverable toggle icon for the current front card
   with `data-testid="card-toggle-discovery-{recipeId}"`.
6. WHEN the user taps the discoverable toggle, THE Stack_Action_Bar SHALL call
   `PATCH /api/recipes/{id}` with `{ "isDiscoverable": <toggled value> }` and update
   the icon state optimistically.
7. IF the `PATCH /api/recipes/{id}` call fails, THE Stack_Action_Bar SHALL revert the
   icon to its previous state and display a brief error indicator.
8. WHILE a `PATCH /api/recipes/{id}` call is in flight, THE Stack_Action_Bar SHALL render
   the toggle in a loading/disabled state with
   `data-testid="card-toggle-discovery-{recipeId}-loading"`.
9. THE discoverable toggle icon SHALL reflect the current `isDiscoverable` value of the
   front card with a distinct visual state for `true` versus `false`.
10. THE discoverable toggle SHALL have an accessible `aria-label` that reflects the current
    state: `"Add to discovery"` when `isDiscoverable` is false, `"Remove from discovery"`
    when `isDiscoverable` is true.
11. THE Stack_Action_Bar SHALL update its toggle state and `data-testid` when the front
    card changes (swipe or wrap).

---

### Requirement 5: Paged Loading and Pre-fetch

**User Story:** As a developer, I want the stack to load recipes in pages so we never
load the entire library into memory at once.

#### Acceptance Criteria

1. THE Browse_All_Stack SHALL load recipes from `GET /api/recipes?order=explore&page=N&limit=20`.
2. THE Browse_All_Stack SHALL load page 1 on mount. Subsequent pages are loaded on demand.
3. THE Browse_All_Stack SHALL pre-fetch the next page when the user reaches the **5th card
   from the end** of the currently loaded set (i.e. when `remainingCards <= 5`). This
   threshold accounts for fast swiping.
4. Pre-fetch SHALL be a background operation. It SHALL NOT show a loading state or
   interrupt the swipe experience.
5. IF the pre-fetch has not completed by the time the user reaches the last loaded card,
   THE Browse_All_Stack SHALL display a `data-testid="browse-all-loader"` spinner on the
   next card position until the fetch resolves.
6. THE `stackTotal` used in the Depth_Indicator SHALL be set from `pagination.total`
   returned on the first page load, confirming the value from `library-summary`.
7. THE Browse_All_Stack SHALL NOT load all recipes at once regardless of library size.

---

### Requirement 6: Explore Order on GET /api/recipes

**User Story:** As a developer, I want the existing `GET /api/recipes` endpoint to support
an explore ordering mode so Browse All Stack can page through recipes in the correct order.

#### Acceptance Criteria

1. THE Recipes_API SHALL accept an `order` query parameter on `GET /api/recipes` with
   the value `"explore"` (enum of one value).
2. WHEN `order=explore` is provided, THE Recipes_API SHALL return recipes ordered by
   Explore_Order: `lastCookedDate ASC NULLS FIRST` — never-cooked recipes first
   (where `lastCookedDate IS NULL`), then ordered by `lastCookedDate ASC`
   (oldest-cooked first).
3. THE Explore_Order sort uses `lastCookedDate` only. It does NOT use VoteCount.
   It is intentionally different from `DiscoveryService.GetRecipesForDiscoveryAsync`.
4. WHEN `order=explore` is applied, THE Recipes_API SHALL exclude soft-deleted recipes
   (`deleted_at IS NULL`). This MUST NOT be omitted when implementing the explore ordering.
5. WHEN `order` is absent or has any value other than `"explore"`, THE Recipes_API SHALL
   apply the existing default ordering (newest-created first) unchanged.
6. THE `order=explore` parameter SHALL be combinable with the existing `page` and `limit`
   parameters so Browse_All_Stack can page through the full library.
7. IF `order` is provided with an unrecognised value, THE Recipes_API SHALL return
   HTTP 400 with a descriptive error message.

---

### Requirement 7: Library Summary Endpoint

**User Story:** As a developer, I want a lightweight endpoint that returns recipe library
counts so the depth indicator can show the total immediately on mount.

#### Acceptance Criteria

1. THE Recipes_API SHALL expose `GET /api/recipes/library-summary` returning a
   `RecipeLibrarySummaryDto`.
2. THE `RecipeLibrarySummaryDto` SHALL contain:
   ```json
   {
     "total": 42,
     "neverCooked": 12,
     "ratings": {
       "love": 8,
       "like": 15,
       "dislike": 3,
       "unrated": 16
     }
   }
   ```
3. `total` SHALL be the count of all non-soft-deleted recipes.
4. `neverCooked` SHALL be the count of recipes where `lastCookedDate IS NULL` and
   `deletedAt IS NULL`.
5. `ratings.love` SHALL be the count of recipes with `rating == 3`.
6. `ratings.like` SHALL be the count of recipes with `rating == 2`.
7. `ratings.dislike` SHALL be the count of recipes with `rating == 1`.
8. `ratings.unrated` SHALL be the count of recipes with `rating == 0`.
9. All counts SHALL exclude soft-deleted recipes.
10. THE endpoint SHALL be read-only and require no request body.
11. THE endpoint SHALL return HTTP 200 with the `RecipeLibrarySummaryDto` wrapped in the
    standard `data` envelope.

---

### Requirement 8: End Card

**User Story:** As a user, I want a warm, supportive end card when I've browsed my whole
library, with a clear path forward.

#### Acceptance Criteria

1. WHEN the user has swiped through all available recipes, THE Browse_All_Stack SHALL
   display the End_Card with `data-testid="browse-all-end-card"`.
2. THE End_Card SHALL be visually distinct from recipe cards: warm cream background,
   ochre accent color, no food photography, the app's supper/compass icon centered.
3. THE End_Card SHALL display a warm heading (e.g. *"What's for Supper?"*).
4. THE End_Card SHALL display a supporting message (e.g. *"You've browsed your whole
   library. Did you find what you were looking for?"*).
5. THE End_Card SHALL display a secondary message inviting capture (e.g. *"Have a recipe
   nearby you'd like to add?"*).
6. THE End_Card SHALL render a CTA button with `data-testid="end-card-capture-cta"` that
   navigates to `/capture`.
7. WHEN the user swipes right on the End_Card, THE Browse_All_Stack SHALL wrap to recipe 1.
8. WHEN the user swipes left on the End_Card, THE Browse_All_Stack SHALL return to the
   last recipe.
9. THE End_Card SHALL NOT be shown as the empty state when the library has zero recipes.
   The End_Card only appears after the user has swiped through at least one recipe.

---

### Requirement 9: Empty State

**User Story:** As a user with an empty library, I want a clear message and a path to
add my first recipe.

#### Acceptance Criteria

1. WHEN `GET /api/recipes?order=explore` returns `pagination.total === 0`, THE
   Browse_All_Stack SHALL display an empty state with `data-testid="browse-all-empty-state"`
   instead of the card arena.
2. THE empty state SHALL display a warm message (e.g. *"Your library is empty"*).
3. THE empty state SHALL display a supporting line (e.g. *"Add your first recipe and
   start building your library"*).
4. THE empty state SHALL render a CTA button with
   `data-testid="browse-all-empty-capture-cta"` that navigates to `/capture`.
5. THE empty state is visually distinct from the End_Card. It appears before any browsing
   begins, not after.

---

### Requirement 10: RecipeStackCard Component Contract

**User Story:** As a developer, I want a clear component contract for RecipeStackCard so
it cannot accidentally introduce voting side effects.

#### Acceptance Criteria

1. A new `RecipeStackCard` component SHALL be created at
   `pwa/src/components/recipes/RecipeStackCard.tsx`.
2. `RecipeStackCard` SHALL NOT import or call any function from `@/lib/api/discovery`,
   `useDiscoveryStore`, or any discovery-related module.
3. `RecipeStackCard` SHALL expose the following props:
   - `id: string`
   - `name: string`
   - `description: string`
   - `imageUrl: string`
   - `totalTime: string`
   - `difficulty: string`
   - `category: string`
   - `isFront: boolean`
   - `stackIndex: number`
   - `onSwipeRight: () => void` — advances to next card
   - `onSwipeLeft: () => void` — returns to previous card
   - `onTap: () => void` — opens Recipe_Detail_Sheet
4. `RecipeStackCard` SHALL NOT expose `onSwipeRight`/`onSwipeLeft` as vote callbacks.
   The parent component is responsible for advancing or retreating the stack index.
   No vote endpoint SHALL ever be called from these callbacks.
5. `RecipeStackCard` SHALL NOT have a `hasFamilyInterest` prop.
6. `RecipeStackCard` SHALL render its root element with
   `data-testid="stack-card-{recipeId}"`.
7. WHEN `isFront` is true, `RecipeStackCard` SHALL additionally render with
   `data-testid="stack-card-front"` so tests can assert on the currently visible card
   without knowing its ID.
8. THE existing `DiscoveryCard` component SHALL NOT be modified by this feature.
9. `RecipeStackCard` SHALL continue to pass all its unit tests after any future extension.

---

### Requirement 11: No Voting Side Effects

**User Story:** As a product owner, I want Browse All Stack to be a read-only browsing
experience with zero voting side effects.

#### Acceptance Criteria

1. THE Browse_All_Stack SHALL NOT call `POST /api/discovery/{id}/vote` for any swipe action.
2. THE Browse_All_Stack SHALL NOT render like/dislike vote buttons.
3. THE Browse_All_Stack SHALL NOT render a refresh button.
4. WHEN a card is swiped in Browse_All_Stack, THE system SHALL advance or retreat the
   stack index only — no vote, no confetti, no eureka animation.
5. THE `RecipeStackCard` SHALL NOT render "LOVE", "PASS", "MATCH!", or any voting label.

---

### Requirement 12: Contract Gate

**User Story:** As a developer, I want a clear contract gate so no implementation code
is written before the API contract is updated.

#### Acceptance Criteria

1. Before any Browse_All_Stack UI or backend implementation code is written, the following
   contract gate MUST be completed as its own task:
   - Add `order` query parameter (enum: `["explore"]`) to `GET /api/recipes` in
     `specs/openapi.yaml`
   - Add `GET /api/recipes/library-summary` endpoint and `RecipeLibrarySummaryDto` schema
     to `specs/openapi.yaml`
   - Run `task api:generate` to regenerate TypeScript client and C# DTOs
   - Run `task agent:drift` to confirm zero drift
2. No implementation task SHALL begin until `task agent:drift` passes cleanly.

---

### Requirement 13: Mock Contract

**User Story:** As a developer, I want Playwright mocks defined upfront so E2E tests
never hit the real backend.

#### Acceptance Criteria

1. The following mocks SHALL be added to `mock-api.ts` as part of the contract gate task,
   before any E2E test is written:

   ```ts
   // GET /api/recipes?order=explore (Browse All Stack paged loading)
   await page.route('**/api/recipes?**order=explore**', async (route) => {
     await route.fulfill({
       status: 200,
       contentType: 'application/json',
       body: JSON.stringify({
         updatedAt: new Date().toISOString(),
         recipes: [builders.recipe(), builders.recipe(), builders.recipe()],
         pagination: { page: 1, limit: 20, total: 3 },
       }),
     });
   });

   // GET /api/recipes/library-summary
   await page.route('**/api/recipes/library-summary', async (route) => {
     await route.fulfill({
       status: 200,
       contentType: 'application/json',
       body: JSON.stringify({
         data: {
           total: 3,
           neverCooked: 1,
           ratings: { love: 1, like: 1, dislike: 0, unrated: 1 },
         },
       }),
     });
   });
   ```

2. **Never use `route.continue()` in mocks.**
3. Mock data MUST match the `RecipeLibrarySummaryDto` and `RecipeListResponse` schemas
   defined in `specs/openapi.yaml`.

---

### Requirement 14: Accessibility and Test Coverage

**User Story:** As a developer, I want every interactive element to have a `data-testid`
and be keyboard/screen-reader accessible.

#### Acceptance Criteria

1. ALL interactive elements in Browse_All_Stack SHALL have `data-testid` attributes as
   defined in the data-testid index below.
2. THE exit button SHALL be operable by keyboard (focusable, activatable with Enter/Space).
3. THE search escape button SHALL be operable by keyboard.
4. THE discoverable toggle SHALL have an accessible `aria-label` reflecting current state.
5. THE End_Card CTA SHALL be operable by keyboard.
6. ALL E2E test interactions and assertions for this feature SHALL use
   `page.getByTestId(...)`. `getByText`, `getByRole`, `getByLabel`, CSS selectors,
   and XPath are FORBIDDEN for this feature's E2E tests.
7. ALL `data-testid` values SHALL be listed in the data-testid index in the design
   document before any E2E test may reference them.

---

## data-testid Index

This is the authoritative list of all `data-testid` values introduced by this feature.
Builders MUST use these exact strings.

### Entry points

| Element | `data-testid` |
|---|---|
| Home page trigger | `home-browse-all-trigger` |
| Recipes page trigger | `browse-all-stack-trigger` |

### Browse All Stack overlay

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
