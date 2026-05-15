# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **Recipe Management — Reimport Logic (Ready to Start)**
   - The UI for reimporting a recipe is implemented in `ActionGearMenu.tsx` but the backend logic and `reimportRecipe` API function need full verification.
   - **Action Item**: Verify the `POST /api/recipes/{id}/import` endpoint logic and ensure it correctly handles URL-based vs. Photo-based re-acquisition.

2. **SSE Workflow — URL Capture & Social Coordination (Ready to Start)**
   - Three E2E tests are skipped with `// TODO: revisit when SSE ...` comments that mark the integration points:
     - `capture-flow.spec.ts` → "failed URL capture shows error message".
     - `home-goto.spec.ts` → "Page reload after Make This Tonight".
     - `planner-social.spec.ts` → "Verify Nudge Family button triggers Web Share".
   - ADR 035 defines the canonical E2E route-handler pattern to follow when writing SSE mock handlers.

## Recently Completed
 
- **iPad "Super Power" Planner Dashboard (2026-05-15):** Transformed the Planner into a high-utility dashboard for iPad/Desktop.
  - **Responsive Grid**: Implemented 2-column layout for screens >= 1024px (60/40 split).
  - **Embedded Grocery List**: Refactored `GroceryList.tsx` for in-place rendering with internal scrolling and height constraints.
  - **Aggressive Compaction**: Optimized `PlannerDayCard` and header margins on wide screens to minimize vertical scrolling and fit the week "above the fold".
  - **Real-time Reactivity**: Confirmed and verified that planning actions instantly update the embedded grocery list via the existing `weekStore` logic.
  - **Test Parity**: Fixed unit test regressions in `page.test.tsx` by mocking `matchMedia`.

- **CNF/Health Spec Alignment: Explainability Contract Decision (2026-05-12):** Resolved R10 in `.kiro/specs/cnf-cross-spec-review`. `reason` / `source` / `confidence` remain the shared internal explainability model by default. We are not widening generic search or schedule DTOs just to carry those fields everywhere. Default search/planner surfaces keep short deterministic summary copy, and any structured over-the-wire explainability must arrive through a surface-specific DTO or nested detail object in the feature slice that introduces the actual `i` affordance.
- **CNF/Health Spec Alignment: Approximation Confidence Decision (2026-05-11):** Resolved R9 in `.kiro/specs/cnf-cross-spec-review`. Unit/yield approximations now flow through one shared internal `NutritionEstimateMetadata` seam owned by `cnf-data-ingestion`, derived from provider coverage plus approximation/default usage (`100g` fallback, approximate unit conversion, default yield). Search health nudges and dietitian HEFI/week-balance must consume that shared metadata for conservative source/confidence mapping instead of inventing separate heuristics. No new OpenAPI DTO fields were added in this branch; public explainability shape remains deferred to the separate R10 decision.
- **CNF/Health Spec Alignment: CNF False-Positive Correction Decision (2026-05-11):** Resolved R8 in `.kiro/specs/cnf-cross-spec-review`. Sticky CNF trigram mismatches now require a supported operator-facing correction path in `cnf-data-ingestion`: inspect one `normalized_key`, clear its cached `cnf_food_id`, or override it with a confirmed CNF `food_id`, with audit logging. We are not replacing `normalized_key` with CNF identity and we are not adding a user-facing admin surface in this slice.
- **CNF/Health Spec Alignment: Provider Strategy Boundary Decision (2026-05-11):** Resolved R7 in `.kiro/specs/cnf-cross-spec-review`. The provider strategy stays at the runtime consumer-capability layer: search, categorization, and dietitian flows depend on provider-facing lookup/alias/group seams, while first-slice storage and operator surfaces remain explicitly CNF-shaped. We are not genericizing `cnf_foods`, `ingredient_categories.cnf_food_id`, `task data:cnf:seed`, or CNF backup/audit docs before a second provider creates real duplication.
- **CNF/Health Spec Alignment: Meal Attendance Decision (2026-05-11):** Resolved R6 in `.kiro/specs/cnf-cross-spec-review`. Planner warnings stay member-specific and non-blocking, but the app will not record meal attendance or add per-slot participant scoping. Schedule warnings remain household planning awareness for all family members with health profiles; households decide whether a warning matters for that meal.
- **CNF/Health Spec Alignment: Grocery Locale Decision (2026-05-11):** Resolved R5 in `.kiro/specs/cnf-cross-spec-review`. Server-side grocery recompute now follows the configured system default UI locale only, not browser `localStorage` overrides or selected-member `preferredLanguage`. Recipe content stays in its original language, and checked-state preservation remains a display-name remap inside the existing `grocery_state` shape rather than a new state-key contract.
- **CNF/Health Spec Alignment: Search Contract Drift Decision (2026-05-11):** Resolved R4 in `.kiro/specs/cnf-cross-spec-review`. Search drift must be cleaned up before CNF-powered search changes land: pantry-photo search reasons are already aligned on `inventory-fit`, while `healthyOnly` remains a separate contract/implementation cleanup that must be handled in a bounded slice satisfying implementation-backed validation before later alias/nutrition search work.
- **CNF/Health Spec Alignment: Alias Expansion Seam Decision (2026-05-11):** Resolved R3 in `.kiro/specs/cnf-cross-spec-review`. Bilingual query expansion and broader ingredient alias expansion now collapse into one public `ICnfIngredientAliasExpander` seam. `cnf-data-ingestion` Task 8 creates the initial bilingual-only implementation; `cnf-search-augmentation` Task 2 extends the same seam with static synonyms and richer match metadata. `RecipeSearchService` must not grow a separate `ICnfBilingualQueryExpander` dependency.
- **CNF/Health Spec Alignment: FOP Nutrition Source Decision (2026-05-11):** Resolved R2 in `.kiro/specs/cnf-cross-spec-review`. Family-health nutrition warnings now standardize on existing `FopThresholds` (`SodiumMg = 345 mg`) instead of a separate 600 mg hypertension threshold. Requirements now describe warning nutrition as CNF-derived per-portion estimates when available, falling back to `raw_metadata.nutrition`, with user-facing copy treated as cautionary rather than clinically precise.
- **CNF/Health Spec Alignment: Health Guidance Setting Decision (2026-05-11):** Resolved R1 in `.kiro/specs/cnf-cross-spec-review`. `health_guidance_enabled` stays a family-wide setting in the existing generic settings store. It gates derived wellness steering only: nutrition-aware ranking/filters, planner nudges, HEFI/week-balance display, and dietitian workflow/LLM behavior. It does not suppress explicit household-entered allergy/intolerance "check ingredients" reminders; a future reminder opt-out would need its own setting.
- **CNF/Health Spec Alignment: Allergy Reminder Decision (2026-05-11):** Resolved cross-spec allergy semantics for the coordinated CNF, family-health, search, and dietitian specs. Ingredient-level allergy/intolerance matching is pulled forward into `family-health-profiles` before visible allergy badges. Allergy output is a non-blocking, member-specific reminder using "check ingredients" / "possible match" copy; it must never assert that a recipe is unsafe, allergy-safe, or blocked from planning. Dietitian Phase 2 now reuses the family-health matching seam instead of owning the first allergy reminder surface.
- **CNF Cross-Spec Review Backlog (2026-05-11):** Added `.kiro/specs/cnf-cross-spec-review/` with review requirements, design protocol, and independent kickoff prompts for branches R1-R14. Use one prompt per fresh conversation to continue shared-understanding review without carrying this large context.
- **Recipe Purge 500 Hardening (2026-05-11):** Added realistic API integration coverage for purge with recipe directory, search document, vote, and historical calendar event. Updated `RecipePurgeService` to explicitly remove dependent search docs, votes, and calendar events inside the purge transaction while preserving filesystem-first safety. Verified with `task test:api -- --filter RecipePurgeIntegrationTests`, `task agent:test:impact`, and `task gate`.
- **Recipe Hero Actions (2026-05-10):** Integrated Camera and Regenerate actions into `RecipeDetailSheet` hero. Implemented global `ToastContainer` (ADR 042) for UI feedback. Verified with `e2e/recipe-hero-actions.spec.ts`.
- **Recipe Gear Menu (2026-05-10):** Refactored recipe detail to include a gear menu for secondary actions (Move to Bin, Reimport). Updated `Recipe` model to include `sourceType`, `canReimport`, and `imageCount`.

## Standing Notes

- **Global Toast Pattern (ADR 042).** Use `addToast` from `useUiStore` for user action feedback.
- **Playwright Mock Layering (ADR 040).** Use `route.fallback()` instead of `route.continue()` for test-specific overrides.
- **E2E Route Handler Pattern (ADR 035).** Use `new URL(route.request().url())` inside handler bodies.
- **Zero Drift Doctrine.** `task gate` must pass before ending any session.
