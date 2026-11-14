# Proposal

## Why

A household member who finds the right recipe must currently scroll through secondary controls, interpret “Cook This,” and make another choice to plan it. Recipe reading and replacement also vary by entry point, making it harder to finish confidently and return to family life.

## Outcome and Scope

Open a search result, recognise the recipe and its proposed destination, add it without reading the whole page, and arrive at the chosen Planner day with explicit confirmation. Ingredients and instructions remain available together for anyone who wants to inspect the recipe first.

This is a planning-only change. Implementation is divided into independently selectable, dependency-ordered task groups. No application code, deployment, feature enablement, archive or commit is included in this request.

Include recipe detail from Recipes/Search and Planner; direct assignment; choosing another date; replacement of a recipe or explicitly selected non-cooking plan; consistent Next Week behavior in Home, Planner and Search; and truthful save/recovery feedback. Preserve the existing Tomorrow chain algorithm and current Cook’s Mode behavior in this first change; the portions companion subsequently adds dated preparation completion. Exclude Search ranking/results redesign, Planner layout/drag redesign, cooking completion changes, ingredient scaling, extraction changes, new rating semantics, notifications and telemetry work.

## What Changes

- Replace the hidden Cook This pivot with a persistent, dated planning action. Preserve a day selected before Search. Without one, suggest Tonight when genuinely empty, otherwise the next open day, and show the date before any write.
- Skip non-cooking plans in automatic suggestions. Explicitly choosing one requires confirmation before changing it. Never treat an unavailable schedule as an empty day.
- Return confirmed additions to their Planner day with recipe/date confirmation. Replacement confirmation also names what happened to the original meal.
- Choose the replacement first, retain it, then offer the original’s following day, Next Week, or removal from that day. Next Week consistently searches from the source’s following week into later weeks without shifting other plans.
- Retain acknowledged disposition and selected replacement across failures; reconcile uncertain outcomes instead of replaying movement or deletion. Use guarded assignment so a competing plan is never overwritten by the new flow.
- Propose a bounded conditional-removal contract for the shared recovery path, so a concurrent changed plan is not deleted through a stale date-only action. Legacy callers remain compatible.
- Show ingredients and numbered instructions in one reading flow. Keep rating near the title, servings beside Ingredients, saved notes after instructions with a Family notes shortcut near recipe information when notes exist. Keep GOTO near the title and the existing Ask the Family toggle directly visible in detail; preserve its stack-browser counterpart and wording. Keep source access, sharing, editing and issue reporting discoverable.
- Use Solar Earth’s refined family cookbook direction: existing Outfit/Inter, cream/warm white, terracotta primary action, established sage/ochre roles, generous photography, soft depth and readable labels. Proposed presentation: full-screen phone detail and a bounded spacious tablet/desktop dialog.

## Capabilities

### New Capabilities

None; retain the existing behavior owners.

### Modified Capabilities

- `recipe-library`: complete recipe reading, responsive presentation, action reachability and contextual return.
- `meal-assignment`: visible destination, suggested-day selection, guarded submission, staged replacement and explicit Planner confirmation.
- `meal-rescheduling`: consistent Next Week callers, dated disposition wording and conditional removal for recovery.

## Impact

Primary owners: `RecipeDetailSheet`, `RecipesExperience`, Planner, `SkipRecoveryDialog`, `slotAssignment`, Home’s staged recovery, `todayStore` and `weekStore`. Reuse `parseRecipeSteps`, existing calendar context, schedule/assignment/defer APIs and current recipe-media/editing/sharing owners.

The proposed conditional-removal addition affects `specs/openapi.yaml`, schedule DTO/controller/service, generated Kiota models/routes, schedule reads and DELETE consumers, plus stateful E2E mocks. No database schema migration or new dependency is proposed. Shared component consumers require regression coverage even when their visual layout is outside scope.

Current evidence is source/test inspection, not runtime reproduction. The attempted local walkthrough redirected to onboarding with a profile-loading 404. Search’s full-next-week continuation, unguarded helper and missing general recovery-stage retention are source-confirmed gaps; exact runtime failure outcomes require focused reproduction. The existing detail spacing requirement explicitly prohibits a docked action area and must be modified rather than silently contradicted. See [design](design.md) for the decision recap, preservation boundaries and acceptance matrix. Apply this change first, groups 1–6 in order, then `scale-supper-ingredients-by-attendance`. Its dated portions and Already prepared behavior extend the context established here. No sync/archive or implementation is authorised by this planning update.
