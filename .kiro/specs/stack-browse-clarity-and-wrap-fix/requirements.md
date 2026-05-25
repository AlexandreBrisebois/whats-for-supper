# Feature: Stack Browse Clarity and Backward Wrap Fix

## Vision
Make Browse All Stack feel calm and dependable for one-thumb use: less visual crowding on cards, smoother swipes, and deterministic backward wrap to the true end of the recipe library.

## Product Decisions
1. Stack cards hide cuisine and meal-type metadata to reduce cognitive load on small cards.
2. Recipe metadata remains available in `RecipeDetailSheet` to avoid context loss.
3. Backward wrap from the first card targets the last recipe within the active mode.
4. Active filter (`discoverableOnly`) controls all browsing fetches, including backward wrap.
5. Gesture feel is tuned surgically (threshold/velocity/spring/elasticity), not redesigned.

## Acceptance Criteria

### AC1 — Stack Card Clarity
1. Stack-view `RecipeStackCard` SHALL NOT render cuisine or meal-type badges.
2. `RecipeStackCard` SHALL continue to show name, image, description, and ready-in time.
3. No new dead-end is introduced; tapping a card still opens `RecipeDetailSheet`.

### AC2 — Backward Wrap Correctness
1. WHEN user swipes right from first stack card, system SHALL resolve wrap target from the active mode total.
2. Backward wrap fetch SHALL use the current `discoverableOnly` mode value.
3. System SHALL land on the last recipe of the resolved active-mode last page.
4. IF the computed last page returns zero recipes, system SHALL retry previous pages in the same mode (bounded) before falling back to local last loaded card.
5. IF mode changes during an in-flight wrap request, stale wrap response SHALL be ignored.

### AC3 — Swipe Smoothness
1. Swipe-trigger threshold and velocity SHALL be tuned to reduce sticky/jittery feel while preserving intent.
2. Card spring-back and exit transitions SHALL remain stable (single front card post-transition).
3. Drag elasticity SHALL be reduced to lower overshoot and improve control.

### AC4 — Deterministic Validation
1. Unit tests SHALL cover no-badge stack card behavior.
2. Unit tests SHALL cover backward wrap using active-mode totals with multi-page/partial last-page shape.
3. Unit tests SHALL cover empty-wrap-page fallback behavior.
3. E2E tests SHALL use fixed time values and validate corrected backward gesture semantics.

## Glossary
- `Backward wrap`: swipe-right navigation from first card to last recipe in the current mode.
- `Active-mode total`: `pagination.total` returned by paged recipes list under current filter mode.
