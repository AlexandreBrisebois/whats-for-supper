# Proposal

## Why

A recipe's saved servings describe its original ingredient basis. Families need one clear amount to prepare each night, including leftovers, and consistent quantities when planning, shopping and cooking. Preparing a future supper also needs to leave that plan visibly ready rather than apparently waiting to be cooked again.

## Outcome and Scope

Set usual portions once, switch Planner to **At the table**, adjust one portions number per date, and finish with Done. Four people wanting two lunches choose six portions; the app does not separate people, guests or extra portions. Ingredients and groceries use that dated number without modifying the original recipe.

This updates planning artifacts only. Apply `redesign-recipe-detail-planning` first, groups 1–6, then this change's groups 1–7 in order. The first change establishes dated detail and guarded planning/recovery; this change extends those owners with portions and dated preparation. No application code, migration, deployment, sync/archive or commit is performed. The existing change identifier is retained for continuity; “attendance” in its name is not the product model.

Include an explicit household portions default, date overrides including empty dates, inline editing, server-owned quantities, grocery updates, and cooking ahead for a captured planned occurrence. Exclude a separate attendance/leftovers model, independent serving-preview calculator, automatic leftover-meal scheduling, pantry subtraction, package purchase rounding, instruction rewriting and new AI processing.

## What Changes

- Use one positive whole portions number per date, including anything intended for later. Counts stay with dates through movement. Nights away use existing non-cooking plans; they retain dormant counts without an active stepper.
- Keep the Recipes / At the table strip below week dates and above visible voting controls. Editing rows show date at the side, existing hero photo and minus/count/plus, without recipe names. Empty/missing-photo/non-cooking states use honest visual fallbacks.
- Preserve Ask the Family, Nudge family and Close voting under their current rules. Preserve the Ask the Family toggles and wording in the stack browser and recipe detail.
- Done saves the batch and returns to Recipes when portions persistence is confirmed. Grocery updating can finish in the background. Entering an unfinished grocery view shows Updating your shopping list…; failure offers Retry without losing saved portions.
- Use the selected or proposed planning date's portions in detail, Cook's Mode and groceries. Show date and portions together before assignment; Change day changes the projection without a write. No independent temporary quantity control or calculator. Without a date, show the original recipe basis.
- Scale reliable numeric amounts from the original basis. Keep to taste and similar intentionally unquantified directions as ordinary text. Missing yield or unreliable quantities get concise actionable feedback without inventing totals.
- Preserve instruction numbers and offer easy access to adjusted ingredients. When scaling, show one concise note that ingredient amounts are adjusted while amounts written in steps remain original; no repeated warnings or confirmation prompts.
- When supported portion, assignment, replacement, movement or recipe changes increase a checked grocery requirement, uncheck only the affected item and display its updated total. Explain once: Shopping list updated. Items needing more are unchecked. No extra per-row delta or more-needed label.
- Cooking a future planned meal marks that occurrence Already prepared with its actual preparation date. Keep its supper date, freeze its prepared portion context and do not ask for cooking completion again. Eating it on another night requires an explicit plan move before cooking. Standalone cooking retains its current-day behavior.
- Include conflict-checked saves, authoritative reconciliation, household live updates, legacy compatibility and backup/demo lifecycle support for portions and preparation metadata.

## Capabilities

### New Capabilities

- `supper-servings`: usual and dated portions, deterministic projections and save/recovery boundaries.

### Modified Capabilities

- `meal-planning`: photo-based inline portions editing, voting prominence, saved/background-refresh states and Already prepared cards.
- `grocery-shopping`: dated scaled contributions, quiet increased-needs handling and honest unresolved quantities.
- `recipe-library`: one dated portion context, original-basis reference and no independent preview calculator.
- `cooking`: dated ingredient reading, one instruction limitation note and completion of the intended planned occurrence.
- `planning-lifecycle`: guarded preparation, actual cooking dates, legacy completion compatibility and overdue/history preservation.
- `meal-rescheduling`: removal/history consequences for explicitly prepared occurrences, preserving the companion's conditional-removal contract.
- `data-backup-and-recovery`: portions, prepared occurrence metadata and frozen portion context across ordinary/exact restore and demo reset.

## Impact

Affected owners include Planner/day cards, RecipeDetailSheet, CooksMode, Home, week/Today/family stores, schedule DTO/controller/service, calendar storage, recipe LastCookedDate derivation, GroceryRecomputeService, GroceryCheckCoordinator, existing WorkflowOrchestrator/WorkflowWorker refresh execution and lifecycle/export/demo inventories. Reuse existing calendar, movement, unit and ingredient-identity policy.

Future contracts affect `specs/openapi.yaml`, generated Kiota clients, schedule/SSE data and stateful browser mocks. Dated portions require storage; preparation needs persistent actual-date metadata and guarded occurrence completion. Current source has no dated portions or actual-preparation field and records recipe-specific cooking through today's context. These are source findings, not implemented or runtime-qualified behavior. See [design](design.md) and [tasks](tasks.md) for the combined boundaries and application order.
