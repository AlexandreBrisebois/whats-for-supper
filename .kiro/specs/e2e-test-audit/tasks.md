# Tasks: E2E Test Audit & Migration (Vertical Slices)

## Wave 0: Infrastructure & Tracer (Pattern Setter)
_Goal: Establish the shared fixture architecture and complete the first migration._

- [x] 0. **Infrastructure - Extract Shared Builders**
    - Create `pwa/src/testing/builders.ts`.
    - Move `builders` logic from `pwa/e2e/mock-api.ts` to this shared file.
    - Update `pwa/e2e/mock-api.ts` to import from the new shared file.
- [x] 1. **Tracer - Step Parser Scaffolding**
    - Create `pwa/src/lib/cooking/stepParser.test.ts`.
- [x] 2. **Tracer - Port Logic**
    - Port unit and property tests from `pwa/e2e/step-parser.spec.ts`.
    - **Use `builders.ts`** for any mock data needed.
- [x] 3. **Tracer - Prune & Verify**
    - Delete `pwa/e2e/step-parser.spec.ts`.
    - **Retain Happy Path**: Ensure `pwa/e2e/recipes.spec.ts` still covers "I can see steps" without the complex logic assertions.
    - Run `task agent:test:impact`.

## Wave 1: Grocery Slice
- [x] 4. **Grocery - Audit & Harden**
    - Run `task agent:audit AREA=grocery`.
    - Replace **❌ brittle span selector** in `pwa/e2e/grocery.spec.ts` with `data-testid`.
- [x] 5. **Grocery - Migrate Sorting Logic**
    - Move aisle sorting assertions to `pwa/src/lib/grocery/aisleMapper.test.ts`.
    - **Use `builders.ts`** for mock grocery lists.
- [x] 6. **Grocery - Prune E2E**
    - Remove logic-heavy assertions.
    - **Verify Seam**: Run E2E to ensure the grocery list still loads from the API.

## Wave 2: Recipe Sharing Slice
- [x] 7. **Sharing - Audit & Harden**
    - Run `task agent:audit AREA=share`.
- [x] 8. **Sharing - Migrate Privacy Logic**
    - Add unit tests to `pwa/src/lib/api/recipes.test.ts` for DTO privacy scrubbing.
    - **Use `builders.ts`** to generate recipes with notes/ratings.
- [x] 9. **Sharing - Prune E2E**
    - Remove DTO assertions.
    - **Verify Seam**: Run E2E to ensure the share button still copies to clipboard.

## Wave 3: Cook Mode Slice
- [ ] 10. **Cook Mode - Audit & Harden**
    - Run `task agent:audit AREA=cook`.
- [ ] 11. **Cook Mode - Migrate Component State**
    - Port checklist interactivity and badge visibility tests to `CookModeOverlay.test.tsx`.
    - Verify "bg-sage" and "CheckCircle2" toggles.
- [ ] 12. **Cook Mode - Prune E2E**
    - **Verify Seam**: Run E2E to ensure the overlay still opens from the Home card.

## Wave 4: Library & Browse Slice
- [ ] 13. **Browse - Audit & Harden**
- [ ] 14. **Browse - Migrate Stack Logic**
- [ ] 15. **Browse - Prune E2E**
    - **Verify Seam**: Run E2E to ensure clicking a card still navigates to details.

## Wave 5: Home, Identity & Settings Slice
- [ ] 16. **Home & Settings - Audit & Harden**
- [ ] 17. **Home & Settings - Migrate Logic**
    - Port state transition logic and **"Demo Mode" / "Hostage Mock"** assertions.
- [ ] 18. **Home & Settings - Prune E2E**
    - **Verify Seam**: Run E2E to ensure the app still hydrates and redirects correctly.

## Wave 6: Discovery & Search Slice
- [ ] 19. **Search - Audit & Harden**
- [ ] 20. **Search - Migrate Filtering Logic**
- [ ] 21. **Search - Prune E2E**
    - **Verify Seam**: Run E2E to ensure search results update on input.

## Wave 7: Planner & Capture Hardening
- [ ] 22. **Planner - Audit & Harden**
- [ ] 23. **Planner - Migrate Complex State**
- [ ] 24. **Planner - Prune E2E**
    - **Verify Seam**: Run E2E to ensure the "Let's Cook" button is still reachable.

## Wave 8: Global Integrity & Cleanup
- [ ] 25. **Integrity - Final E2E Suite Run**
- [ ] 26. **Cleanup - Death Audit**
- [ ] 27. **Session Review**

## Task Dependencies
```json
{
  "waves": [
    { "name": "Wave 0: Infrastructure", "tasks": [0, 1, 2, 3] },
    { "name": "Wave 1: Grocery", "tasks": [4, 5, 6], "requires": [3] },
    { "name": "Wave 2: Sharing", "tasks": [7, 8, 9], "requires": [3] },
    { "name": "Wave 3: Cook Mode", "tasks": [10, 11, 12], "requires": [3] },
    { "name": "Wave 4: Library", "tasks": [13, 14, 15], "requires": [3] },
    { "name": "Wave 5: Home", "tasks": [16, 17, 18], "requires": [3] },
    { "name": "Wave 6: Search", "tasks": [19, 20, 21], "requires": [3] },
    { "name": "Wave 7: Planner", "tasks": [22, 23, 24], "requires": [3] },
    { "name": "Wave 8: Final", "tasks": [25, 26, 27], "requires": [6, 9, 12, 15, 18, 21, 24] }
  ]
}
```
