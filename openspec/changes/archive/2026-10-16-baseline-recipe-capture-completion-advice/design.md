# Design

## Context

See proposal.md. This extraction spans finalization, event handoff, client notification state, library lookup and deletion. BSL-recipe-capture-022 maps source and assertions. The first observable slice begins when an ordinary URL, photo or description capture reaches inline ready state; PDF acceptance instead navigates directly Home.

## Goals / Non-Goals

**Goals:** Describe local advice and request feedback; reconcile the earlier ordinary file-readiness overclaim.

**Non-Goals:** Universal duplicate detection, deletion policy changes, planner assignment, event replay or cross-session recovery.

## Decisions

- Trace: `RecipeReadyProcessor.ExecuteAsync` saves database readiness, records retained-PDF readiness only when applicable, then calls `PublishRecipeReadyAsync`. `useScheduleStream` and the library/capture stores carry a received session notification; `MinimalCapture` sets `readyRecipeName` and queries the library by name, excludes the pending identity and renders advice. Classify this as implementation-supported; do not equate a database save or publication attempt with delivery.
- `household-live-updates` owns `Bound delivery to current process registrations` and `Preserve available lifecycle context at the capture handoff`. `recipe-library` owns `Represent persisted recipe attribution and readiness`, `Read the persisted recipe readiness status` and `Constrain library lookups by supplied predicates`. Reference these rather than redefining readiness or matching rules.
- `handleDiscardDuplicate` calls the generated DELETE `/api/recipes/{id}` builder. `RecipeController.Delete` delegates to `RecipeService.SoftDeleteRecipe`; the existing planner-assignment guard can reject deletion. Keep that policy in recipe-library. This is a soft-delete request, not physical purge.
- The ready-name effect is shared by ordinary URL/photo/description completions despite its photo-oriented variable name. Describe the trigger rather than inventing a photo-only restriction. PDF direct-Home flow is not promised this inline screen.
- Use complete MODIFIED readiness blocks and independent ADDED advice/discard blocks. Replacing the notification architecture or adding duplicate enforcement would exceed extraction scope.

## Risks / Trade-offs

- Name lookup uses a returned page and has no response freshness guard -> withhold exhaustive/current duplicate-detection guarantees.
- Delete rejection is only logged -> specify release of pending control, not inline error recovery copy.
- Unit test manually invokes notification subscribers, mocks API/delete/router/detail sheet -> meaningful UI assertions do not establish real SSE, persistence or navigation success.
- Already-ready processor returns without republication -> no event replay guarantee; retained PDF metadata repair remains conditional.

## Migration Plan

No application migration or deployment. Human review of the delta and evidence comes next; no promotion or archive in this sequence.
