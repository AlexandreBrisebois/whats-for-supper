# Tasks: Stack Browse Clarity and Backward Wrap Fix

## Wave A — Tests First (Red)
- [x] 1. Frontend Unit - Stack card metadata removal assertions
  - Update `RecipeStackCard.test.tsx` to assert cuisine/meal badges are absent in stack cards.
  - Keep existing swipe and tap behavior assertions.
  - _Requirements: AC1, AC4_

- [x] 2. Frontend Unit - Backward wrap uses active-mode total
  - Add test in `browse-all-stack/page.test.tsx` for active-mode page math.
  - Assert wrap fetch uses `page=ceil(activeTotal/STACK_PAGE_SIZE)` and current `discoverableOnly`.
  - Assert front card lands on last recipe within active mode.
  - _Requirements: AC2, AC4_

- [x] 3. Frontend E2E - Correct wrap gesture and determinism
  - Fix backward-wrap test to use swipe-right from first card.
  - Ensure fixed timestamp payloads in mocked routes.
  - Add scenario validating Discovery-mode wrap stays within Discovery cards.
  - _Requirements: AC2, AC4_

## Wave B — Implementation (Green)
- [x] 4. Frontend UI - Simplify stack card content
  - Remove cuisine/meal badge render cluster from `RecipeStackCard.tsx`.
  - Keep primary content and card tap behavior unchanged.
  - _Requirements: AC1_

- [x] 5. Frontend Logic - Active-mode backward wrap
  - Use active `totalCount` in `browse-all-stack/page.tsx` to compute wrap page.
  - Update backward wrap fetch to keep current `discoverableOnly` mode.
  - Add wrap stale-response guard and bounded empty-page fallback.
  - _Requirements: AC2_

- [x] 6. Frontend Motion - Targeted swipe tuning
  - Adjust drag threshold, velocity threshold, elastic and settle timings in `RecipeStackCard.tsx`.
  - Validate no regression in swipe/tap distinction.
  - _Requirements: AC3_

## Wave C — Verification
- [x] 7. Run impacted tests
  - `npm run test:unit -- pwa/src/components/recipes/RecipeStackCard.test.tsx pwa/src/app/(app)/browse-all-stack/page.test.tsx`
  - `npx playwright test e2e/browse-all-stack.spec.ts`
  - _Requirements: AC4_

## Dependency Graph
```json
{
  "waves": [
    { "name": "Wave A", "dependsOn": [] },
    { "name": "Wave B", "dependsOn": ["Wave A"] },
    { "name": "Wave C", "dependsOn": ["Wave B"] }
  ]
}
```
