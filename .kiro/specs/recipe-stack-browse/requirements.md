# Requirements: Recipe Stack Browse

## Introduction

Mom loves to flip through a physical stack of recipe cards at the dinner table — picking up one,
glancing at it, setting it aside, reaching for the next. This feature brings that tactile ritual
into the app in two ways:

1. **Stack view in search results** — an alternative display mode on the `/recipes` search page
   that replaces the gallery layout with a swipeable card stack.
2. **Browse All stack** — a standalone mode that lets mom swipe through her entire recipe library
   as a card stack, ordered the same way the discovery feed is ordered (never-cooked first, then
   oldest-cooked first), with a "you've seen it all" end card that wraps back to the first recipe
   on the next swipe.

Both modes reuse the existing `DiscoveryCard` component and its swipe mechanics. Neither mode
includes the like/dislike voting buttons or the refresh button from the discovery page. From any
card in the stack, mom can tap an icon to toggle the recipe's `isDiscoverable` status without
opening the full detail sheet.

---

## Glossary

- **Stack_Browse_Mode**: The card-stack display mode, as opposed to the gallery/list layout.
- **Browse_All_Stack**: The standalone mode that pages through the entire recipe library using
  the discovery ordering rule.
- **Discovery_Order**: Never-cooked recipes first (where `lastCookedDate IS NULL`), then
  descending by `lastCookedDate` (oldest-cooked first). This is the same ordering already
  implemented in `DiscoveryService.GetRecipesForDiscoveryAsync`.
- **End_Card**: The terminal card shown after the last recipe in Browse All Stack, signalling
  that the user has seen every recipe. Swiping the End_Card wraps back to the first recipe.
- **Discoverable_Toggle**: The icon on a stack card that toggles `isDiscoverable` via
  `PATCH /api/recipes/{id}` without opening the recipe detail sheet.
- **Stack_Search_Results**: The search results page rendered in Stack_Browse_Mode instead of
  the default gallery layout.
- **Recipe_Detail_Sheet**: The existing full-screen overlay for a recipe, reused unchanged.

---

## Requirements

### Requirement 1: Stack View Toggle in Search Results

**User Story:** As a user browsing search results, I want to switch between the gallery layout
and a card-stack layout, so I can flip through results the way mom flips through recipe cards.

#### Acceptance Criteria

1. THE Search_Page SHALL render a view-mode toggle control with
   `data-testid="stack-view-toggle"` that switches between gallery mode and
   Stack_Browse_Mode.
2. WHEN the user activates Stack_Browse_Mode, THE Search_Page SHALL replace the gallery
   result list with a `DiscoveryCard` stack containing the same search results.
3. WHILE Stack_Browse_Mode is active, THE Search_Page SHALL preserve the current query,
   active filters, and result set — switching view modes SHALL NOT trigger a new search
   API call.
4. WHILE Stack_Browse_Mode is active, THE Search_Page SHALL render the card stack with
   `data-testid="stack-browse-container"`.
5. WHEN the user swipes a card in Stack_Browse_Mode, THE Stack_Browse_Container SHALL
   advance to the next result card without submitting a vote or calling any vote endpoint.
6. WHEN the last result card is swiped in Stack_Browse_Mode, THE Stack_Browse_Container
   SHALL display a `data-testid="stack-end-card"` end card indicating no more results.
7. THE Stack_Browse_Mode SHALL NOT render like/dislike voting buttons
   (`data-testid="like-button"` and `data-testid="dislike-button"` SHALL be absent).
8. THE Stack_Browse_Mode SHALL NOT render a refresh button
   (`data-testid="refresh-button"` SHALL be absent).
9. WHEN the user taps a card in Stack_Browse_Mode (without swiping), THE Search_Page
   SHALL open the existing Recipe_Detail_Sheet for that recipe.
10. WHEN the Recipe_Detail_Sheet is closed from Stack_Browse_Mode, THE Search_Page SHALL
    return to the same card position in the stack without re-fetching search results.
11. THE view-mode toggle SHALL persist its state for the duration of the session
    (switching to a different search query SHALL retain the last selected view mode).

---

### Requirement 2: Browse All Stack Entry Point

**User Story:** As a user, I want a dedicated "Browse All" entry point that lets me flip
through my entire recipe library as a card stack, so I can get ideas without searching.

#### Acceptance Criteria

1. THE Recipes_Page SHALL render a "Browse All" entry point with
   `data-testid="browse-all-stack-trigger"` that launches Browse_All_Stack mode.
2. WHEN the user activates Browse_All_Stack, THE Recipes_Page SHALL render the card stack
   with `data-testid="browse-all-stack-container"`.
3. THE Browse_All_Stack SHALL load recipes from `GET /api/recipes` using the existing
   paging parameters (`page`, `limit`), applying Discovery_Order.
4. THE Browse_All_Stack SHALL request recipes in Discovery_Order: never-cooked recipes
   first (where `lastCookedDate IS NULL`), then ordered by `lastCookedDate` ascending
   (oldest-cooked first).
5. THE Browse_All_Stack SHALL support an `order=discovery` query parameter on
   `GET /api/recipes` to request Discovery_Order from the server.
6. THE Browse_All_Stack SHALL pre-fetch the next page of recipes before the user reaches
   the last card of the current page, so swiping feels continuous.
7. WHEN the user has swiped through all available recipes, THE Browse_All_Stack SHALL
   display the End_Card with `data-testid="browse-all-end-card"`.
8. THE End_Card SHALL display a message indicating the user has seen all recipes
   (for example: "You've seen them all!" or equivalent).
9. WHEN the user swipes the End_Card, THE Browse_All_Stack SHALL wrap back to the first
   recipe in the stack (recipe 1 in Discovery_Order) and resume from the beginning.
10. THE Browse_All_Stack SHALL NOT render like/dislike voting buttons.
11. THE Browse_All_Stack SHALL NOT render a refresh button.
12. WHEN the user taps a card in Browse_All_Stack (without swiping), THE Recipes_Page
    SHALL open the existing Recipe_Detail_Sheet for that recipe.
13. WHEN the Recipe_Detail_Sheet is closed from Browse_All_Stack, THE Recipes_Page SHALL
    return to the same card position in the stack without reloading from page 1.

---

### Requirement 3: Discoverable Toggle on Stack Cards

**User Story:** As a user browsing the stack, I want to toggle a recipe's discoverable
status directly from the card, so I can curate the discovery feed without opening each recipe.

#### Acceptance Criteria

1. THE Stack_Card SHALL render a discoverable-toggle icon with
   `data-testid="card-toggle-discovery-<recipeId>"` that is visible without opening the
   Recipe_Detail_Sheet.
2. WHEN the user taps the discoverable-toggle icon, THE Stack_Card SHALL call
   `PATCH /api/recipes/{id}` with `{ "isDiscoverable": <toggled value> }` and update
   the icon state optimistically.
3. IF the `PATCH /api/recipes/{id}` call fails, THEN THE Stack_Card SHALL revert the
   icon to its previous state and display a brief error indicator.
4. THE discoverable-toggle icon SHALL reflect the current `isDiscoverable` value of the
   recipe: a distinct visual state for `true` versus `false`.
5. THE discoverable-toggle icon SHALL be reachable in the natural thumb arc on a 6.7"
   screen (positioned in the lower portion of the card, not behind the swipe gesture area).
6. WHILE a `PATCH /api/recipes/{id}` call is in flight for the toggle, THE Stack_Card
   SHALL render the toggle in a loading/disabled state with
   `data-testid="card-toggle-discovery-<recipeId>-loading"`.
7. THE discoverable-toggle on a stack card SHALL produce the same persistent result as
   the `action-toggle-discovery` control in the Recipe_Detail_Sheet — both call the same
   `PATCH /api/recipes/{id}` endpoint.

---

### Requirement 4: Discovery Order on GET /api/recipes

**User Story:** As a developer, I want the existing `GET /api/recipes` endpoint to support
a discovery ordering mode, so the Browse All Stack can page through recipes in the correct
order without a separate endpoint.

#### Acceptance Criteria

1. THE Recipes_API SHALL accept an `order` query parameter on `GET /api/recipes` with
   the value `"discovery"`.
2. WHEN `order=discovery` is provided, THE Recipes_API SHALL return recipes ordered by
   Discovery_Order: `lastCookedDate IS NULL` first, then `lastCookedDate ASC`
   (oldest-cooked first), excluding soft-deleted recipes.
3. WHEN `order` is absent or has any value other than `"discovery"`, THE Recipes_API
   SHALL apply the existing default ordering (newest-created first) unchanged.
4. THE `order=discovery` parameter SHALL be combinable with the existing `page` and
   `limit` parameters so the Browse_All_Stack can page through the full library.
5. THE Recipes_API SHALL include `lastCookedDate` in the `RecipeDto` response when
   `order=discovery` is requested, so the client can determine the End_Card boundary.
6. IF `order` is provided with an unrecognised value, THEN THE Recipes_API SHALL return
   HTTP 400 with a descriptive error message.

---

### Requirement 5: Reuse of Discovery Card UI

**User Story:** As a developer, I want the stack browse feature to reuse the existing
`DiscoveryCard` component and swipe mechanics, so we ship faster and the UX is consistent.

#### Acceptance Criteria

1. THE Stack_Browse_Mode and Browse_All_Stack SHALL reuse the existing `DiscoveryCard`
   component from `pwa/src/components/discovery/DiscoveryCard.tsx` without forking it.
2. THE `DiscoveryCard` component SHALL be extended to accept an optional
   `onToggleDiscovery` prop and an `isDiscoverable` prop to support the
   Discoverable_Toggle without breaking existing discovery page usage.
3. WHEN `onToggleDiscovery` is not provided (as in the existing discovery page),
   THE `DiscoveryCard` SHALL NOT render the discoverable-toggle icon, preserving
   backward compatibility.
4. THE swipe gesture mechanics (drag threshold, velocity threshold, spring animation,
   haptic feedback) SHALL remain unchanged from the existing `DiscoveryCard`
   implementation.
5. THE stack depth visual effects (scale, y-offset, opacity per `stackIndex`) SHALL
   remain unchanged from the existing `DiscoveryCard` implementation.
6. THE `DiscoveryCard` component SHALL continue to pass all existing unit tests after
   the extension in AC2.

---

### Requirement 6: No Voting Side Effects

**User Story:** As a product owner, I want stack browsing to be a read-only browsing
experience with no voting side effects, so mom's discovery feed is not polluted by
casual browsing.

#### Acceptance Criteria

1. THE Stack_Browse_Mode SHALL NOT call `POST /api/discovery/{id}/vote` for any swipe
   action.
2. THE Browse_All_Stack SHALL NOT call `POST /api/discovery/{id}/vote` for any swipe
   action.
3. THE Stack_Browse_Mode and Browse_All_Stack SHALL NOT render the like/dislike vote
   buttons (`data-testid="like-button"` and `data-testid="dislike-button"`).
4. THE Stack_Browse_Mode and Browse_All_Stack SHALL NOT render the refresh button
   (`data-testid="refresh-button"`).
5. WHEN a card is swiped in either stack mode, THE system SHALL advance to the next card
   only — no vote, no confetti, no eureka animation.
6. THE `hasFamilyInterest` ring animation on `DiscoveryCard` SHALL be suppressed in
   both stack modes (pass `hasFamilyInterest={false}` or equivalent).

---

### Requirement 7: Accessibility and Test Coverage

**User Story:** As a developer, I want every interactive element in the stack browse
feature to have a `data-testid` and be keyboard/screen-reader accessible, so the feature
can be tested and used by all household members.

#### Acceptance Criteria

1. THE Stack_Browse_Mode SHALL expose all interactive elements with `data-testid`
   attributes as defined in the data-testid index below.
2. THE Browse_All_Stack SHALL expose all interactive elements with `data-testid`
   attributes as defined in the data-testid index below.
3. THE stack-view toggle SHALL be operable by keyboard (focusable, activatable with
   Enter/Space).
4. THE browse-all-stack trigger SHALL be operable by keyboard.
5. THE discoverable-toggle icon on each card SHALL have an accessible `aria-label`
   that reflects the current state (for example: "Mark as discoverable" or
   "Remove from discovery").
6. THE End_Card SHALL render with `data-testid="stack-end-card"` (search results) or
   `data-testid="browse-all-end-card"` (Browse All) and include descriptive text.
7. ALL new `data-testid` values SHALL be listed in the data-testid index in the
   design document before any E2E test may reference them.
8. ALL E2E test interactions and assertions for this feature SHALL use
   `page.getByTestId(...)`. `getByText`, `getByRole`, `getByLabel`, CSS selectors,
   and XPath are FORBIDDEN for this feature's E2E tests.

---

## data-testid Index

This is the authoritative list of all `data-testid` values introduced by this feature.
Builders MUST use these exact strings.

### Search results page — stack mode

| Element | `data-testid` |
|---|---|
| View-mode toggle (gallery ↔ stack) | `stack-view-toggle` |
| Stack browse container | `stack-browse-container` |
| End card (search results exhausted) | `stack-end-card` |

### Browse All Stack

| Element | `data-testid` |
|---|---|
| Browse All entry trigger | `browse-all-stack-trigger` |
| Browse All stack container | `browse-all-stack-container` |
| End card (all recipes seen) | `browse-all-end-card` |
| Loading indicator | `browse-all-loader` |

### Per-card controls (both modes)

| Element | `data-testid` |
|---|---|
| Discoverable toggle (per card) | `card-toggle-discovery-<recipeId>` |
| Discoverable toggle loading state | `card-toggle-discovery-<recipeId>-loading` |
