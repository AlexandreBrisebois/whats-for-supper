# COOK-01 — Step-by-step Cook's Mode requirements

## Status

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.

## Outcome

A cook can open a full-screen recipe view, check preparation ingredients, read parsed cooking steps, move through them, and return to the invoking surface.

## Implemented behavior

- **COOK-01-R1 — Entry.** Recipe detail exposes a Steps action; Home opens Cook's Mode for today's scheduled recipe. The overlay fetches `GET /api/recipes/{id}` for complete ingredients, instructions, and import-issue state. It locks document scrolling while open and can open the recipe-detail sheet from its hero.
- **COOK-01-R2 — Preparation and steps.** The first screen is Check & Prep, with local ingredient checks. `stepParser` turns string arrays, flat `HowToStep` arrays, and `HowToSection` arrays into ordered display steps while retaining source paths for editing. Missing, unsupported, or failed detail data falls back to four generic instructions rather than a blank view.
- **COOK-01-R3 — Progress and navigation.** Next moves from preparation to step 1 and thereafter advances one step; Back stops at preparation. Progress is `plannerStore.cookProgress[recipeId]`, so close/reopen in the same browser store resumes the selected step. The preparation checklist, fetched detail, and fallback steps are component-local and reset on a remount.
- **COOK-01-R4 — Completion boundary.** At the final step, Cook's Mode displays a local celebration for 600 ms, invokes its optional `onCooked` callback, then closes. Home supplies that callback and optimistically validates today's schedule day as cooked; the recipe-detail entry supplies no callback, so completing steps there does not change schedule status.
- **COOK-01-R5 — Step editing.** When the `single-page-recipe-steps` flag is off, the active step can be edited; when it is on, all parsed steps are displayed with per-row edit controls. Save sends the complete modified `recipeInstructions` through the recipe PATCH path, updates local parsing on success, and keeps the editor/error/retry affordance on failure.
- **COOK-01-R6 — In-cook reporting.** When the loaded recipe has `canReimport`, the prep or step view exposes its matching issue action. That flow is owned by COOK-02 and does not reset Cook's Mode progress.

## Scope and boundaries

COOK-01 owns the instructional overlay, local cooking progress, parsing, and instruction edit interaction. `lib-02-recipe-detail-metadata` owns recipe detail/PATCH behavior and `lib-03-recipe-actions` owns detail action availability. Home/today and planner schedule packets own durable cooked-day state. COOK-02 owns import-issue reporting; `plat-01` only supplies schedule/recipe events to its respective stores, not cooking-progress synchronization.

## Current limitations

- The detail-fetch effect has no active-request or recipe-ID guard after `getRecipe` resolves; a late old request can update a newly changed overlay instance.
- Progress and ingredient checks are neither persisted nor synchronized across devices. No completion state is stored by Cook's Mode itself.
- The fallback instructions may not reflect a recipe whose detail request failed or whose instruction format is unsupported.
- The celebration and several Cook's Mode/error strings are hard-coded English rather than routed through localization.
- Home's `markCooked` is optimistic and logs a failed validate request without rollback; recipe-detail completion does not mark a meal cooked at all.

## Preserved behavior

Cook's Mode does not create a cooking-specific API, workflow, or background identifier. Parsed instruction display preserves the source recipe until an explicit instruction edit succeeds; it does not rewrite legacy instructions merely by viewing them.
