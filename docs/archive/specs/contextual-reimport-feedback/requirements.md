# Requirements: Contextual Recipe Re-import Feedback

> **Archived — historical reference only.** This requirements record is not an active work queue or current authority. See [archive guidance](../../../docs/archive/specs/README.md).

> **Retired 2026-09-13 at owner request.** This package was archived without revalidation; its recorded partial implementation and remaining acceptance work are preserved as historical evidence.

## Vision

Make **Report issue** the only repair entry point in recipe detail. A parent states what is wrong once; the system saves the report and deterministically decides whether it must be reviewed manually or may start a focused re-import.

## Product decisions

1. `Reimport Recipe` is removed from the recipe-detail gear menu. `Report issue` / `Review issue` remains.
2. The report sheet retains one visible completion action: `Save`. It does not ask the parent to choose whether to re-import.
3. A report starts a contextual re-import only when all of these are true:
   - the recipe is re-importable;
   - its normalized reasons contain `ingredients` and/or `steps`;
   - its normalized reasons do **not** contain `duplicate`; and
   - its trimmed optional note is non-empty.
4. `duplicate` is a mutually exclusive report reason in the PWA: selecting it clears `ingredients` and `steps`; selecting either content reason clears `duplicate`. The resulting selection state SHALL be immediately visible, and assistive technology SHALL be told when an opposing selection was cleared without moving focus. A duplicate report is always saved for manual review and never starts a re-import. The server SHALL defensively treat a malformed or stale-client mixed `duplicate` + content-reason submission as manual review only.
5. A content-only report with no note is saved for review and never starts a re-import.
6. When an eligible report starts a re-import, the exact normalized content reasons and trimmed note are snapshotted on that workflow instance. Later edits to the report cannot alter an in-flight agent's instructions.
7. After reviewing a completed re-import, a parent may add or change feedback and press the same `Save` action. A further contextual re-import starts only when the normalized content reasons and/or trimmed note differ from the snapshot of the most recent contextual attempt.
8. Reopening a report or saving feedback identical to the latest contextual-attempt snapshot SHALL save/review only and SHALL NOT start another workflow.
9. The extraction agent uses the snapshot to focus its review. The original photos/HTML and output schema remain authoritative; user feedback cannot instruct the agent to invent facts or change its operating rules.
10. Existing report statuses and duplicate lifecycle semantics remain unchanged. A re-import started under this feature follows the existing matching-workflow completion path.
11. A completed contextual re-import SHALL retain the existing durable `readyToReview` status and render it to parents as `Reimported — check recipe` on recipe detail and recipe cards. The review filter remains the compact category label `Ready to review`. No database, OpenAPI enum, or lifecycle-status rename is required.
12. When the PWA polls a contextual re-import, it SHALL use its returned workflow `importId`, never the latest workflow for a recipe. Recipe detail owns that polling and durable outcome presentation; Cook Mode does not start a second polling loop. After it accepts active work, Cook Mode SHALL retain a compact non-interactive `Reimporting recipe…` acknowledgement from the returned recipe until its normal recipe-data refresh or navigation; it SHALL not claim completion from that local state.
13. In the single-active-API-process deployment, snapshot comparison, report persistence, workflow creation, and attempt marking SHALL execute under the existing server-side exclusive per-recipe operation. This feature does not add cross-replica locking, an outbox, or durable idempotency.
14. A repeated submission of the same normalized feedback while its matching contextual workflow is pending or processing SHALL return that existing workflow ID and SHALL NOT create another workflow.
15. While a contextual re-import is active, the report sheet SHALL be read-only: it disables the reason controls, note disclosure, note field, Save, and Mark as resolved while retaining the saved reasons and note for review. It SHALL show `Reimporting recipe… You can update this after it finishes.` Editing, resolving, and a subsequent attempt resume only after the workflow reaches a terminal state. For this parent flow, `completed`, `failed`, and `paused` are terminal; a failed or paused workflow clears `isReimporting` rather than leaving the sheet locked. A failed or paused attempt SHALL instead show `We couldn’t re-import this recipe. Your report is saved. Add or change a detail, then Save to try again.` until the report is changed or resolved.
16. When a re-importable recipe has `ingredients` and/or `steps` selected, the sheet SHALL reveal its note field without moving focus. The field label SHALL be `What should we check?` and its compact helper text SHALL be `Add a note to re-import this recipe.` A blank note remains valid for a manual-review save; entering a non-empty trimmed note makes that same `Save` submission eligible for the server-owned contextual re-import predicate. When `duplicate` is selected as its own report reason, the sheet SHALL instead show `This will be saved for review.` The disclosure, helper, and duplicate cue update with the draft; they do not add a decision or make the PWA authoritative for eligibility.
17. After an accepted submission with `reimportStarted=true`, the sheet SHALL close as it does after a manual-review save, announce `Reimporting in background`, and leave the active state visibly available from recipe detail. Reopening the sheet during that active state SHALL show the existing disabled controls and in-progress status.
18. After a contextual re-import completes, the report sheet SHALL show `Reimport complete. Check the recipe, then mark this resolved when it looks right.` The parent may add or change reasons or note and press the same `Save` action when the recipe still needs repair; changed eligible feedback follows the existing further-attempt policy.
19. If report persistence succeeds but contextual workflow creation or attempt marking cannot start, the command SHALL return `reimportLaunchFailed=true`, `reimportStarted=false`, and the updated recipe detail. It SHALL not leave a newly created active workflow without its matching attempt snapshot; it must compensate that creation or return the normal active-workflow response instead. The sheet SHALL stay open and show `We saved your report, but couldn’t start re-import. Try again later.` without exposing an internal error. No contextual-attempt snapshot is marked in this case, so a later identical eligible Save MAY start a new attempt. This transient launch result is distinct from `reimportFailureMessage`, which is reserved for a started workflow that later reaches `failed` or `paused`.

## Acceptance criteria

### CRF-1 — One intentional entry point

1. The gear menu SHALL never render `Reimport Recipe`.
2. The gear menu SHALL continue to render `Report issue` or `Review issue` under the existing eligibility rules.
3. Existing Edit and Move to Bin behavior SHALL remain unchanged.

### CRF-2 — Save derives the next action

1. Saving a duplicate-only report SHALL persist the report and SHALL NOT create a re-import workflow.
2. The PWA SHALL never submit `duplicate` with a content reason: selecting one report mode clears the other, visibly reflects that clearing, and announces it to assistive technology without moving focus. A malformed or stale-client submission containing `duplicate` with another reason or note SHALL persist for manual review and SHALL NOT create a re-import workflow.
3. Saving `ingredients` and/or `steps` with a blank/whitespace-only note SHALL persist the report and SHALL NOT create a re-import workflow.
4. Saving `ingredients` and/or `steps` with a non-empty trimmed note for a re-importable recipe SHALL persist the report and start exactly one contextual re-import.
5. A non-reimportable recipe SHALL never start a contextual re-import.
6. A first eligible content-only report SHALL start a contextual re-import because no previous contextual-attempt snapshot exists.
7. After a contextual attempt, changing the normalized content reasons and/or trimmed note SHALL start exactly one further contextual re-import.
8. Saving the same normalized content reasons and trimmed note as the latest contextual-attempt snapshot SHALL save/review only and SHALL NOT start another workflow.
9. If workflow launch fails after report persistence, the saved report, reasons, and note SHALL remain available in the open sheet; the command SHALL return the launch-failure outcome in product decision 19 and SHALL NOT claim that re-import started. When a started contextual workflow reaches `failed` or `paused`, its report SHALL no longer be re-importing, the UI SHALL refresh and unlock, and recipe detail and the report sheet SHALL show `We couldn’t re-import this recipe. Your report is saved. Add or change a detail, then Save to try again.` until the report is changed or resolved. A subsequent Save with identical feedback remains review-only and SHALL confirm `Saved for review. Add new detail if you want us to try re-importing again.`; it never retries automatically.
10. The command response SHALL expose `reimportStarted` to mean that a contextual re-import is active for this submission, whether it was newly created or safely reused. It SHALL include `importId` exactly when `reimportStarted=true`.
11. A duplicate concurrent submission of an active feedback snapshot SHALL return `reimportStarted=true` and the already-created `importId`; it SHALL NOT create a second workflow.
12. The PWA SHALL make the outcome recognizable before and after Save: for an eligible content reason it reveals the contextual note field and helper defined in product decision 16, preserves the single `Save` completion action in both new and existing reports, closes the sheet after an active re-import is accepted, and announces `Reimporting in background` without requiring the parent to wait in the sheet.
13. When a contextual re-import has completed, reopening its report SHALL show the completion message defined in product decision 18, render `Reimported — check recipe` until manual resolution, permit changed feedback through the existing `Save` action, and retain Mark as resolved as the finishing action.

### CRF-3 — Immutable agent feedback

1. The contextual workflow snapshot SHALL include only normalized `ingredients`/`steps` reasons and the trimmed note; `duplicate` is never sent to the extraction agent as repair work.
2. Both image and URL re-import workflows SHALL pass the same snapshot to `ExtractRecipe`.
3. For `ingredients`, the agent SHALL re-check source artifacts for omissions, quantities, units, and ingredient fidelity.
4. For `steps`, the agent SHALL re-check source artifacts for completeness, ordering, times, temperatures, and instruction fidelity.
5. The note SHALL be supplied as clearly delimited, untrusted parent feedback that narrows attention but cannot override source artifacts, JSON/schema requirements, or safety instructions.
6. A normal import and every manual-review-only report SHALL run without contextual feedback.

### CRF-4 — Workflow identity and active interaction safety

1. The API SHALL expose `GET /api/recipe-imports/{importId}` for a contextual workflow's status. It SHALL validate that the workflow belongs to a recipe accessible to the current family context.
2. `GET /api/recipes/{id}/import` SHALL be retired with the user-facing POST import trigger; when the PWA polls, it SHALL use the ID-addressable status route exclusively.
3. The public active-report representation SHALL expose an `isReimporting` boolean and an optional parent-safe `reimportFailureMessage`. The server SHALL compute that failure message from the latest contextual workflow's terminal `failed` or `paused` state, using the fixed parent-facing copy in CRF-2.9; it SHALL never retain or expose raw workflow, model, or infrastructure error details. A newly loaded recipe detail uses the active boolean to lock report controls without changing existing report-filter status values; it uses the terminal failure message to explain a failed or paused contextual attempt until the report changes or resolves. The message SHALL be cleared when feedback changes, the report resolves, or a later attempt becomes active or completes.
4. While `isReimporting=true`, the PWA SHALL render the report draft read-only: reasons, note disclosure, note field, Save, and resolve are unavailable; the saved reasons and note remain visible; and `Reimporting recipe… You can update this after it finishes.` explains the lock. The server SHALL reject a Save or resolve attempt without mutating the report, except that an in-flight duplicate submission of the same feedback snapshot SHALL follow CRF-2.11 and return the existing workflow ID. On a failed or paused workflow, the server-side lifecycle transition SHALL make `isReimporting=false` before the refreshed detail is returned to the parent.
5. The in-progress status and accepted-submission acknowledgement SHALL be exposed as a live status to assistive technology, and disabled report controls SHALL retain an accessible explanation that re-import is in progress.

## Contracts & routes

- Replace `PUT /api/recipes/{id}/import-report` with `POST /api/recipes/{id}/import-report` as the sole report-submission command. It requires the existing `RecipeImportIssueRequest` body and family-member header.
- The command applies CRF-2 server-side and returns `RecipeImportReportSubmissionResponseDto`: updated recipe detail, including the active/failure report representation, `reimportStarted` when a newly created or reused contextual re-import is active, its `importId` only in that case, and `reimportLaunchFailed` only when the persisted report could not start or mark a workflow as defined in product decision 19.
- Retire user-facing `POST /api/recipes/{id}/import`; there is no compatibility path or unfocused manual re-import.
- Add `GET /api/recipe-imports/{importId}` for workflow-specific polling; retire `GET /api/recipes/{id}/import` with the old trigger.
- Existing report DELETE and generated-client parity remain in scope for regression only.

## Out of scope

- A confirmation dialog, undo, retry queue, new report statuses, or a new table.
- Re-importing any duplicate-containing report.
- Feeding free-text feedback into hero generation, categorization, or unrelated agents.
- Changing the note limit, draft retention, focus trap, or manual resolution flow.

## Notes / decisions

- 2026-08-30: Remove direct gear-menu re-import; Report issue is the contextual entry point.
- 2026-08-30: Save auto-reimports only content-only reports with a non-blank note.
- 2026-08-30: Duplicate is always manual review, including mixed reports.
- Verification allocation: API/service tests cover the complete eligibility, snapshot, reuse, and failure matrix; E2E covers the representative parent-visible journeys only.
