# Design

## Context

See [proposal](proposal.md) and [delta](specs/grocery-shopping/spec.md). Evidence: [BSL-grocery-shopping-002](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/grocery-shopping.md#bsl-grocery-shopping-002). Source identity is commit 04a1c4570f9bbb01b47436790d4248635ac3179a plus recorded dirty documentation inputs; the executable grocery sources were clean at inspection. This is an implementation-supported draft, not a current runtime observation.

## Goals / Non-Goals

**Goals:** extract the observable normalization, aggregation and amount display slice and account for its meaningful recovery and compatibility boundaries.

**Non-Goals:** implementation, defect repair, new tests, owner policy changes, runtime/database/device qualification, acceptance, promotion or archival.

## Decisions

- Extract existing evidence with ADDED requirements at the established flat grocery-shopping path. A single broad delta would obscure distinct check, quantity and reconciliation limits. Review after scheduled-needs. These are draft evidence dependencies, not accepted main requirements.
- Trace the first observable path through its actual representations: Scheduled-needs extraction → IngredientNormalizer.Normalize → UnitNormalizer.Normalize → GroceryRecomputeService grouped projection → GroceryLineItemDto → WeeklyPlan jsonb → ScheduleDays generated DTO → GroceryList.formatQuantityHint. Contract: specs/openapi.yaml GroceryLineItemDto and ScheduleDays.
- Reuse accepted owner requirements: [identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [meal planning](../../../specs/meal-planning/spec.md), “Return seven dates from the server UTC week” and “Read week status and stored adjuncts without creating a plan”; [recipe library](../../../specs/recipe-library/spec.md), “Display returned ingredient strings in detail” and “Represent persisted recipe attribution and readiness”; [live updates](../../../specs/household-live-updates/spec.md), “Apply available snapshot adjuncts conditionally”, “Attempt grocery check-map publication at supported saves” and “Replace received grocery checks only for the loaded week”. Grocery consumes persisted recipe facts; it does not define translation, readiness or source-acquisition policy.
- Inspection of actual assertions and substitutions: GroceryRecomputeServiceTests.RecomputeForWeekAsync_CrossUnitSameFamily_ConvertsAndSums asserts 500 g plus 1 kg becomes 1500 g; ApprovedMechanicalPair_WithCompatibleUnits_Aggregates_AndIncompatibleUnitsRemainSeparate asserts 720 ml and separate 3 g; ProtectedDescriptors_RemainSeparateGroceryLines asserts five keys; ReorderedSources_ProduceIdenticalDisplaySectionUnitRecipeOrderAndPersistedLineOrder compares persistence. IngredientNormalizerTests.Normalize_AccentedFrench_ProducesExpectedKey asserts bœuf hache (ligature retained). GroceryList tests amount hints with mocked stores/API, motion, locale and two-aisle order; no browser/backend claim.
- Keep findings outside normative requirements rather than copying contract promises unsupported by the executable path. Static validation proves artifact structure and links, not behavior.

## Risks / Trade-offs

No canonical ingredient registry or multilingual UUID identity is connected here. Names such as ground beef and bœuf hache remain distinct; œ does not become oe. Unknown units are bucketed by their original raw spelling; no density conversion, serving rescaling or general plural stemming. Null quantities are not a completeness assertion. U06 remains qualified.

These limitations are non-normative. No repair or desired replacement behavior is prescribed. Shared U06/U100 remain visible in the capability evidence ledger.

## Migration Plan

Documentation review only. No deployment or data migration. The seven deltas require joint human review before any separately authorized promotion; overlapping capability paths do not authorize seven independent overwrites of a main spec.
