# Design Document: CNF Cross-Spec Review

## Overview

This is a review-orchestration spec. It does not define runtime architecture. It defines how to continue the cross-spec review without relying on a single swollen conversation context.

The review process is intentionally sequential:

1. Open one branch in a fresh conversation.
2. Read only the branch's required context.
3. Verify claims against specs and code where possible.
4. Surface one blind spot or dead end.
5. Offer 2-3 concrete paths.
6. Recommend the best path and explain why.
7. Wait for the human decision.
8. Patch specs only after the human chooses.

## Review Protocol

Use these skills and prompts when applicable:

- `shared-understanding`: required for every branch.
- `.agents/prompts/mere-designer.md`: required for every branch involving UI, user-facing copy, warnings, settings, health nudges, or cognitive load.
- `prompt-planner`: useful when branch resolution changes task ordering or ownership.
- `create-prompt`: useful when a branch needs to produce launch-ready implementation prompts after decisions are made.

## Branch Manifest

| ID | Branch | Status | Primary Risk |
|---|---|---|---|
| R0 | Allergy reminders and ingredient-level matching ownership | Resolved | False safety or accidental planning blocks |
| R1 | Health guidance setting ownership and semantics | Resolved | One setting may hide too much or too little |
| R2 | FOP thresholds, raw nutrition, and CNF estimates | Resolved | Conflicting nutrition thresholds and trust issues |
| R3 | Alias expansion seam duplication | Resolved | Two expanders doing the same job differently |
| R4 | Search contract drift before new search behavior | Resolved | OpenAPI/DTO drift deepens |
| R5 | Grocery locale source and checked-state preservation | Resolved | Server cannot see client locale; checked state may reset |
| R6 | Meal attendance / family-member presence | Resolved | Planner warnings could imply a missing attendance model |
| R7 | Provider strategy scope and abstraction weight | Resolved | Overbuilding generic provider seams too early |
| R8 | CNF false-positive cache and operator correction | Resolved | Wrong trigram match becomes sticky |
| R9 | Unit/yield approximations and confidence propagation | Resolved | Estimated nutrition looks more precise than it is |
| R10 | Health nudge explainability contract | Resolved | Explanation metadata may clutter UI or drift from API |
| R11 | HEFI exactness, naming, and user trust | Resolved | Approximate score may be read as official precision |
| R12 | Cross-spec wave ordering after pulled-forward allergy matching | Resolved | Tasks may now be sequenced incorrectly |
| R13 | DTO shape risks: warnings, schedule records, search filters | Resolved | Positional records and nullable arrays may break clients |
| R14 | LLM recommendation safety, privacy, and opt-out | Resolved | Health agent may leak sensitive context or run when disabled |

## Resolved Branch R0 Summary

Decision:

- Pull ingredient-level allergy/intolerance matching forward into `family-health-profiles` before visible allergy badges.
- Keep allergy output as a non-blocking, member-specific reminder.
- Use copy like: `Check ingredients for Shellfish: possible match in shrimp`.
- Never claim a recipe is unsafe, safe, allergen-free, or allergy-safe.
- Never block planning, voting, grocery generation, or cooking flow because a warning exists.
- Dietitian Phase 2 reuses the family-health matching seam instead of owning the first allergy reminder surface.

Files already updated:

- `.kiro/specs/family-health-profiles/requirements.md`
- `.kiro/specs/family-health-profiles/design.md`
- `.kiro/specs/family-health-profiles/tasks.md`
- `.kiro/specs/cnf-health-orchestration/requirements.md`
- `.kiro/specs/cnf-health-orchestration/design.md`
- `.kiro/specs/cnf-health-orchestration/tasks.md`
- `.kiro/specs/cnf-health-orchestration/user-guide.md`
- `.kiro/specs/cnf-health-orchestration/user-flows.md`
- `.kiro/specs/cnf-health-orchestration/data-flows.md`
- `.kiro/specs/cnf-search-augmentation/requirements.md`
- `.kiro/specs/cnf-search-augmentation/design.md`
- `.kiro/specs/dietitian-agent-phase2/requirements.md`
- `.kiro/specs/dietitian-agent-phase2/design.md`
- `.kiro/specs/dietitian-agent-phase2/tasks.md`
- `HANDOVER.md`

## Resolved Branch R1 Summary

Decision:

- Keep `health_guidance_enabled` as a family-wide setting in the existing generic settings store.
- Narrow its semantics to derived wellness steering: ranking, filters, nudges, HEFI/week-balance display, and dietitian workflow/LLM behavior.
- Do not let this setting suppress explicit household-entered allergy/intolerance "check ingredients" reminders.
- If a future product decision wants reminder suppression too, add a separate reminder-specific setting rather than broadening `health_guidance_enabled`.

Files updated:

- `.kiro/specs/cnf-data-ingestion/requirements.md`
- `.kiro/specs/family-health-profiles/requirements.md`
- `.kiro/specs/cnf-cross-spec-review/tasks.md`
- `HANDOVER.md`

## Resolved Branch R3 Summary

Decision:

- Collapse bilingual query expansion and broader ingredient alias expansion into one public `ICnfIngredientAliasExpander` seam.
- `RecipeSearchService` depends only on `ICnfIngredientAliasExpander`.
- `cnf-data-ingestion` Task 8 creates the initial implementation with CNF bilingual aliases only.
- `cnf-search-augmentation` Task 2 extends the same seam with static synonyms and richer alias matches.
- Do not introduce `ICnfBilingualQueryExpander` as a separate public service.

Files updated:

- `.kiro/specs/cnf-data-ingestion/design.md`
- `.kiro/specs/cnf-data-ingestion/tasks.md`
- `.kiro/specs/cnf-search-augmentation/requirements.md`
- `.kiro/specs/cnf-search-augmentation/design.md`
- `.kiro/specs/cnf-search-augmentation/tasks.md`
- `.kiro/specs/cnf-cross-spec-review/tasks.md`
- `HANDOVER.md`

## Resolved Branch R4 Summary

Decision:

- Reconcile existing search drift before adding new CNF-powered search behavior.
- Record that pantry-photo boost reasons already use the contract value `inventory-fit`; do not keep stale `pantry-match` drift language in the review docs.
- Keep `healthyOnly` drift visible as unresolved contract/implementation cleanup, but do not require a spec-only `specs/openapi.yaml` patch when build validation depends on real implementation parity.
- Treat the remaining cleanup as a prerequisite for later `ingredient-alias-match` and nutrition-aware filter work so new search behavior lands on a clean contract.

Files updated:

- `.kiro/specs/cnf-cross-spec-review/tasks.md`
- `HANDOVER.md`

## Resolved Branch R5 Summary

Decision:

- Grocery locale follows the configured system default UI language only.
- Do not read per-browser `localStorage` locale overrides during server-side recompute.
- Do not derive grocery locale from the selected family member's `preferredLanguage`.
- Keep recipe content in its original language.
- Preserve checked state by remapping prior display-name keys during recompute within the existing `grocery_state` shape.
- Do not add a grocery-specific locale env var or a new stable grocery-state key contract in this slice.

Files updated:

- `.kiro/specs/cnf-search-augmentation/requirements.md`
- `.kiro/specs/cnf-search-augmentation/design.md`
- `.kiro/specs/cnf-search-augmentation/tasks.md`
- `.kiro/specs/cnf-cross-spec-review/tasks.md`
- `HANDOVER.md`

## Resolved Branch R6 Summary

Decision:

- Keep planner warnings member-specific and non-blocking.
- Do not add meal-attendance tracking or per-slot participant scoping in this slice.
- `GET /api/schedule` warnings remain computed for all family members with health profiles because the planner contract has no attendance model.
- Treat warnings as household planning awareness, not as auto-suppressed signals based on who is eating.

Files updated:

- `.kiro/specs/family-health-profiles/requirements.md`
- `.kiro/specs/family-health-profiles/design.md`
- `.kiro/specs/cnf-health-orchestration/user-flows.md`
- `.kiro/specs/cnf-health-orchestration/user-guide.md`
- `.kiro/specs/cnf-health-orchestration/tasks.md`
- `.kiro/specs/cnf-cross-spec-review/tasks.md`
- `HANDOVER.md`

## Resolved Branch R7 Summary

Decision:

- Keep the provider abstraction right-sized: runtime application consumers depend on provider-facing capabilities, while first-slice storage and operator seams stay explicitly CNF-shaped.
- Do not genericize `cnf_foods`, `ingredient_categories.cnf_food_id`, `task data:cnf:seed`, or CNF backup/audit docs into provider-neutral infrastructure before a second provider exists.
- `CanadaCnfFoodDataProvider` owns CNF CSV parsing, nutrient IDs, CFG mapping, and CNF-specific persistence assumptions for this first slice.
- Search, categorization, and dietitian flows consume provider lookup/alias/group capabilities so future providers can swap in without rewriting those consumers.
- If a second provider lands later, extract shared persistence patterns from real duplication rather than inventing them now.

Files updated:

- `.kiro/specs/cnf-data-ingestion/requirements.md`
- `.kiro/specs/cnf-data-ingestion/design.md`
- `.kiro/specs/cnf-cross-spec-review/tasks.md`
- `HANDOVER.md`

## Resolved Branch R9 Summary

Decision:

- Keep unit/yield approximation handling in one shared internal seam rather than letting search, planner, and dietitian features infer confidence independently.
- `cnf-data-ingestion` defines shared internal `NutritionEstimateMetadata` from provider coverage, approximate unit conversion usage, 100g fallback usage, and default recipe-yield usage.
- Search health nudges and dietitian/HEFI scoring consume that shared metadata for source/confidence mapping.
- Do not add new OpenAPI DTO fields in this branch; public contract exposure remains a separate decision.
- Use conservative confidence rules: complete provider coverage with no default guesses can be `high`; approximate conversions can be `medium`; any 100g fallback, default yield, or sparse coverage is `low`.

Files updated:

- `.kiro/specs/cnf-data-ingestion/design.md`
- `.kiro/specs/cnf-data-ingestion/tasks.md`
- `.kiro/specs/cnf-search-augmentation/design.md`
- `.kiro/specs/cnf-search-augmentation/tasks.md`
- `.kiro/specs/dietitian-agent-phase2/design.md`
- `.kiro/specs/dietitian-agent-phase2/tasks.md`
- `.kiro/specs/cnf-cross-spec-review/tasks.md`
- `HANDOVER.md`

## Resolved Branch R10 Summary

Decision:

- Keep `reason` / `source` / `confidence` as the shared internal explainability model by default.
- Do not add broad generic explainability fields to existing dense response shapes such as `RecipeSearchResultDto`, `RecipeSearchReasonDto`, or generic schedule DTOs just to satisfy every future health surface.
- Use short deterministic summary text on default search/planner surfaces.
- When a surface genuinely needs an `i` affordance with structured detail, add a dedicated surface-specific DTO or nested detail object for that surface contract-first.
- In this review branch, do not patch `specs/openapi.yaml`; formalize surface-specific DTOs in the feature slice that actually introduces the user-facing detail surface.

Files updated:

- `.kiro/specs/cnf-search-augmentation/requirements.md`
- `.kiro/specs/cnf-search-augmentation/design.md`
- `.kiro/specs/dietitian-agent-phase2/requirements.md`
- `.kiro/specs/dietitian-agent-phase2/design.md`
- `.kiro/specs/cnf-cross-spec-review/tasks.md`
- `HANDOVER.md`

## Resolved Branch R11 Summary

Decision:

- Keep `HEFIScore` / `hefiScore` as the technical implementation and contract term for this slice to avoid unnecessary churn.
- Until exact HEFI-2019 parity is validated against a published reference dataset, do not use bare `HEFI` as the primary user-facing label.
- Present the planner surface with calmer copy such as `Week balance`, `Canada's Food Guide alignment`, or `Estimated week balance`.
- Documentation and UI copy must state when the implementation is approximate rather than exact.

Files updated:

- `.kiro/specs/dietitian-agent-phase2/requirements.md`
- `.kiro/specs/dietitian-agent-phase2/design.md`
- `.kiro/specs/dietitian-agent-phase2/tasks.md`
- `.kiro/specs/cnf-health-orchestration/user-guide.md`
- `.kiro/specs/cnf-health-orchestration/tasks.md`
- `.kiro/specs/cnf-cross-spec-review/tasks.md`

## Resolved Branch R13 Summary

Decision:

- Keep `warnings` as a non-null array on actual `RecipeDto` and `ScheduleRecipeDto` objects.
- Use `[]` to mean the recipe was evaluated and no warnings fired.
- Keep the null boundary at `ScheduleDayDto.recipe` only; an empty planner slot continues to use `recipe = null`.
- Do not use `warnings = null` on a non-null `ScheduleRecipeDto` to mean "no recipe" or "not evaluated".
- Treat `healthyOnly` as separate pre-existing search contract drift still owned by `cnf-search-augmentation` Task 1.

Files updated:

- `.kiro/specs/family-health-profiles/requirements.md`
- `.kiro/specs/family-health-profiles/design.md`
- `.kiro/specs/family-health-profiles/tasks.md`
- `.kiro/specs/cnf-cross-spec-review/tasks.md`
- `.kiro/specs/cnf-cross-spec-review/design.md`

## Resolved Branch R14 Summary

Decision:

- `health_guidance_enabled` must gate dietitian recommendation work at enqueue/orchestration time, not only inside `GenerateWeeklyRecommendationsProcessor`.
- Keep the processor-level early return as defense in depth so no LLM payload is built if an enqueue path regresses or stale work reaches the processor.
- Candidate selection remains library-bounded and returned recipe IDs remain validated against the candidate set.
- Allergy/intolerance handling stays deterministic before the LLM boundary; full allergy lists are still excluded from payloads unless a future explicit safety-reviewed design requires them.

Files updated:

- `.kiro/specs/dietitian-agent-phase2/requirements.md`
- `.kiro/specs/dietitian-agent-phase2/design.md`
- `.kiro/specs/cnf-health-orchestration/requirements.md`
- `.kiro/specs/cnf-cross-spec-review/tasks.md`
- `.kiro/specs/cnf-cross-spec-review/design.md`

## Review Output Shape

Every branch review should produce:

1. **Blind spot:** one concise statement.
2. **Why it matters:** product, UX, contract, or implementation risk.
3. **Options:** 2-3 concrete paths.
4. **Recommendation:** one path with rationale.
5. **Decision needed:** one yes/no or A/B/C question.
6. **After decision:** list affected specs to patch.

Do not move to the next branch until the current branch is decided or explicitly parked.
