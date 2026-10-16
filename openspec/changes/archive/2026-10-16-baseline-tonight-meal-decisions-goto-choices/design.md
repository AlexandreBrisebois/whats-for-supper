# Design

## Context

See proposal.md — Why. These are additional requirements for the pending new capability, not a second owner or a main-spec edit. Cross-module pending-state contradictions require an extraction design.

## Goals / Non-Goals

**Goals:** Preserve usable GOTO selection and setup while distinguishing persisted list labels from recipe readiness.

**Non-Goals:** No status migration, readiness repair, transactional list append, application changes or operator tooling extraction.

## Decisions

- First trace: Home → familyStore.loadActiveGoTo → generated GET /api/goto/active → GoToController.GetActive → GoToService.GetActiveGoToAsync → family_goto JSON and Recipes → ready card → todayStore assignment. Random choice is source-supported; test FiltersReadyRecipes uses only one ready candidate and proves neither statistical distribution nor multiple-choice rotation.
- Configuration trace: FamilyGOTOSettings / RecipeDetailSheet → familyStore.saveGoTo → generated PUT /api/goto with items → GoToController.UpdateList → SaveGoToListAsync → FamilySettings JSON save → local settings/toast. Retain whole-list replacement; do not invent per-item conflict control or safe concurrent append.
- Pending acquisition trace: settings capture links → MinimalCapture → description/photo/URL acquisition → recipe identity → separate saveGoTo append → preparation screen. Reuse accepted capture intake/processing and background lifecycle requirements; no duplication of those policies. URL GOTO is supported by the capture handler even though settings advertises description/photo paths.
- Withhold the alternative claim of automatic pending-list readiness: RecipeReadyProcessor saves recipe readiness and broadcasts but does not mutate family_goto; GetGoToListAsync returns stored JSON. Refetching that list after a ready hint does not change its pending labels. Home’s active endpoint only returns ready entries, making its pending-active branch unreachable through that endpoint. TM-U03/TM-U04 retain both facts.
- List GET OpenAPI permits a no-list 404, while the service supplies an empty list; do not make that disputed missing-list response normative. Normal stored-list read and PUT are aligned.

## Risks / Trade-offs

- [Capture succeeds but list PUT fails] → TM-U05 records orphaned/unregistered recipe possibility and lack of compensation; no automatic safe-retry claim.
- [Stored pending label and recipe readiness diverge] → Exclude automatic ready-list transition; active selection uses persisted recipe readiness independently.
- [Tests mock list saving and workflow acceptance] → BSL-tonight-meal-decisions-005–008 record medium confidence for setup/toggle branches; no live processing guarantee.
- [Two clients replace a list] → TM-U06 withholds merge, deduplication and idempotency guarantees.

## Migration Plan

No application migration. Validate the draft and review alongside home-states and changed-plan-recovery. Acceptance/promotion and any defect treatment are later human decisions.
