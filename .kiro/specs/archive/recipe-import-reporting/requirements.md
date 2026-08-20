# Recipe Import Issue Reporting — Requirements

## Purpose

Give Mom a lightweight way to mark a poorly imported recipe, update what needs attention, and confirm that a re-import is now acceptable. The feature must preserve normal recipe use while preventing recipes with an active import issue from being promoted as recommendations.

## Product language

- **Reported**: an import issue exists and is waiting for a successful re-import.
- **Ready to review**: a re-import completed successfully and Mom should check the recipe.
- **Mark as resolved**: Mom confirms the recipe is acceptable and removes it from the active review queue.
- User-facing copy SHALL use these terms. It SHALL NOT use `failed`, `queue`, `delete report`, or workflow diagnostics.

## R0 — Existing search contract preservation

1. `RecipeSearchFiltersDto.healthyOnly` SHALL be restored to `specs/openapi.yaml` as a nullable boolean before the first generated-client reconciliation.
2. The generated PWA client SHALL continue to serialize and deserialize `healthyOnly`.
3. Existing Healthy filter behavior SHALL remain unchanged.
4. Contract and drift tests SHALL cover `healthyOnly` so future generation cannot silently remove it.

## R1 — Eligibility and entry points

1. Import issue reporting SHALL be available only when `canReimport` is true.
2. Synthesized or otherwise edit-only recipes SHALL not show reporting actions.
3. Recipe detail SHALL expose the action in the existing overflow/edit menu to avoid adding permanent card controls.
4. An unreported recipe SHALL use the action label `Report import issue`.
5. A recipe with an active report SHALL use the action label `Review import issue`.
6. Cook Mode SHALL expose contextual reporting beside the relevant content heading or edit affordance, outside the Back/Next thumb zone.
7. The Check & Prep context SHALL start with Ingredients selected.
8. A cooking-step context SHALL start with Steps selected.
9. Opening from Cook Mode SHALL preserve the current step, checked ingredients, and other cook state.

## R2 — Reasons and note

1. An active report SHALL contain one or both structured reasons: `ingredients` and `steps`.
2. The reasons SHALL be unique and at least one SHALL be selected before saving.
3. The report sheet SHALL allow Mom to select or clear either reason.
4. The report sheet SHALL offer an optional note under a collapsed `Add a note` disclosure.
5. The note SHALL be trimmed, limited to 500 characters, and stored as null when blank.
6. Free text SHALL remain optional because the structured reasons are sufficient for the common path.
7. When Cook Mode opens an existing report, its contextual reason SHALL be added only if absent; all existing reasons and the note SHALL be preserved.

## R3 — Create and update behavior

1. Each recipe SHALL have at most one active import report.
2. Saving a new report SHALL create the active report and show `Marked for review`.
3. Saving an existing report SHALL update that same row rather than append another report.
4. The existing reasons and note SHALL prepopulate when `Review import issue` opens.
5. The primary action SHALL be `Save` for a new report and `Save changes` for an existing report.
6. The server response SHALL be authoritative; the UI SHALL not invent a successful local status before the response.
7. Concurrent saves SHALL not create duplicate active reports.
8. Reporting SHALL require the current family-member identity using existing recipe authorization rules.
9. Materially changing reasons or note SHALL return an existing report to `Reported` and invalidate any linked in-flight or completed attempt; saving identical content SHALL preserve its status.

## R4 — Mom-facing status

1. The UI SHALL expose only `Reported` and `Ready to review` for an active report.
2. `Ready to review` SHALL mean the latest matching re-import completed successfully after the issue was reported.
3. All other active internal conditions, including queued, running, or failed re-imports, SHALL appear simply as `Reported`.
4. A recipe without an active report SHALL show no import-review badge.
5. `Reported` SHALL use an accessible ochre treatment.
6. `Ready to review` SHALL use an accessible sage treatment with a check/flag cue.
7. Color SHALL never be the only status indicator; visible text and accessible names SHALL distinguish the states.
8. Internal workflow IDs, timestamps, failure details, and error messages SHALL never appear in the Mom-facing UI or public recipe DTO.

## R5 — Mark as resolved

1. An existing report sheet SHALL provide a lower-emphasis `Mark as resolved` action below the save action.
2. When status is `Ready to review`, `Mark as resolved` SHALL use stronger sage emphasis while remaining visually distinct from save.
3. Supporting copy SHALL say `Removes this recipe from Needs review.`
4. The action SHALL not use trash, destructive red, delete, or punitive flag language.
5. Confirming the action SHALL delete the active report row and close the sheet.
6. The UI SHALL show `Marked as resolved` after success.
7. Resolving an already absent report SHALL be idempotent and leave the recipe unreported.
8. Undo is out of scope for v1; Mom can report the recipe again if resolution was accidental.

## R6 — Re-import lifecycle

1. Starting a manual re-import for a recipe with an active report SHALL associate the active report with that workflow attempt and mark it internally as processing.
2. A successful matching photo or URL re-import SHALL change the active report to `Ready to review`.
3. A failed matching re-import SHALL retain the active report and return its Mom-facing status to `Reported`.
4. Failure SHALL write bounded internal diagnostic details and the attempt metadata back to the active report row.
5. Starting a newer attempt SHALL prevent an older workflow completion from overwriting the newer attempt's state.
6. Manual re-import SHALL never silently resolve or delete an active report.
7. The detail UI SHALL refresh the recipe after a watched manual re-import reaches a terminal state so `Ready to review` can appear without reopening the page.
8. Navigating away SHALL not require background UI tracking; the next recipe/search fetch SHALL return authoritative status.
9. Re-importing a recipe without an active report SHALL preserve existing behavior and SHALL not create a report.
10. Non-import workflows, including synthesis and recategorization, SHALL not change import-report status.

## R7 — Future Dreaming workflow seam

1. The active report table SHALL be usable as the future Dreaming re-import queue without another reporting data model.
2. It SHALL retain the latest workflow instance ID, attempt time, successful re-import time, and internal error details needed for retry/diagnosis.
3. The future Dreaming workflow SHALL use the same lifecycle rules as manual re-import.
4. Successful automated re-import SHALL set `Ready to review`; it SHALL not delete the active report.
5. Only Mom's `Mark as resolved` action SHALL remove the row in this feature.
6. Durable processing history belongs in Dreaming logs; the active report table SHALL remain a clean current-work queue.
7. Building or scheduling the future Dreaming workflow is out of scope for this feature.

## R8 — Search, Browse, and recommendation safety

1. `/recipes` results SHALL show `Reported` or `Ready to review` on cards with an active report.
2. Browse All cards SHALL show the same badge but SHALL not gain review filters in v1.
3. On mobile `/recipes`, existing persistent filter pills SHALL be consolidated behind a `Filters` button and bottom sheet.
4. The mobile filter sheet SHALL include `Reported` and `Ready to review` alongside existing filters.
5. `Reported` filtering SHALL return every recipe with an active report, including recipes ready to review.
6. `Ready to review` filtering SHALL return only the ready subset.
7. If both are selected, the effective result SHALL be the ready subset.
8. On desktop, existing inline filters SHALL remain and gain the two review options.
9. When either review filter is active, all matches SHALL render as regular results and no Top Pick SHALL be returned or displayed.
10. Any recipe with an active report SHALL remain searchable, editable, cookable, and assigned in existing meal plans.
11. Any recipe with an active report SHALL be excluded from Top Pick, agent-selected recommendations, and Feeling Lucky replacement selection.
12. Report status filtering SHALL compose with text and all existing recipe filters.

## R9 — Persistence and privacy

1. Import reports SHALL live in a dedicated active-report table, not as columns on the recipe record.
2. `recipe_id` SHALL uniquely identify the active row and SHALL cascade-delete with the recipe.
3. The row SHALL store reasons, optional note, internal status, original reporter, latest updater, created/updated timestamps, latest workflow instance ID, latest attempt timestamp, successful re-import timestamp, and bounded last-error details.
4. Reporter/updater references SHALL tolerate family-member removal without losing the active report.
5. The public API SHALL expose only reasons, note, and mapped Mom-facing status.
6. The database and API SHALL enforce allowed reasons, nonempty reason selection, note bounds, and allowed internal states.
7. Resolution SHALL physically remove the row; this feature SHALL not create an append-only report history table.

## R10 — Accessibility and interaction quality

1. All report actions SHALL be keyboard and screen-reader operable.
2. The sheet SHALL have a visible title, reason labels, validation message, close affordance, and managed focus.
3. Touch targets SHALL meet the app's existing minimum target size.
4. Status colors SHALL use verified WCAG AA foreground/background pairs, such as ochre-50/ochre-700 and an equivalent tested sage pair.
5. Saving, resolving, or re-importing SHALL not cause layout jumps that lose Mom's context.
6. The flow SHALL require no technical knowledge of imports, workflows, or diagnostics.

## Acceptance scenarios

1. Mom reports Ingredients from recipe detail, sees `Reported`, reopens `Review import issue`, adds Steps and a note, and saves one updated active report.
2. Mom reports Steps in Cook Mode without losing the current cooking step; an existing Ingredients reason and note remain intact.
3. A successful manual URL re-import changes the badge from `Reported` to `Ready to review`; Mom checks the recipe and chooses `Mark as resolved`, removing the badge and active row.
4. A failed re-import keeps the Mom-facing badge at `Reported`; diagnostic details are stored internally and never displayed.
5. A reported recipe remains in ordinary search and plans but is never selected as Top Pick, Feeling Lucky, or an agent recommendation.
6. Mobile `/recipes` filters to Reported or Ready to review through the filter sheet; Browse All only displays status badges.
7. A synthesized recipe shows no report action.
8. Generated-client reconciliation preserves the existing Healthy filter.
