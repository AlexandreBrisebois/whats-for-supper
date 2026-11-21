# Design

## Context and Existing Ownership

`planner/page.tsx` reads `readPlanningResult()`, rereads `getSchedule(..., true)`, applies a snapshot, scrolls the card and places both success and error strings in `planningConfirmation`. The render always adds `planner-confirmation-refresh`. `planningResult.ts` owns session return context; `replacementCopy.ts` describes actual original disposition. `meal-assignment` owns this return flow; routine week reading stays with `meal-planning`.

## Decisions and Tradeoffs

Represent routine success, replacement outcome, changed plan and refresh failure distinctly instead of hiding the shared container. Reuse the existing accessible transient notification for routine recipe/date confirmation and retain the card scroll/highlight. A highlight alone cannot establish persistence. Show replacement/spillover as dismissible contextual status because it describes two actual outcomes that may need reading time; give Refresh only to failed reconciliation.

Consume or retire the matching in-session return identity and success URL context after handled completion/dismissal without adding a persisted receipt ledger. Preserve explicit destination date/week/reference. Retry owns reads only; a failed read is not grounds to repeat a successful mutation. Check active context before applying snapshots as well as feedback, including during retries.

## First Observable Slice

Confirmed Search assignment → captured Planner return → real schedule wrapper/read → current store snapshot → day navigation plus one accessible transient recipe/date confirmation, with no persistent success banner. Regression acceptance exercises the existing mocked `GET /api/schedule` state and `POST /api/schedule/assign` counts; no endpoint behavior changes.

## State, Concurrency and Recovery

Keep the captured return identity while an initial read or recovery read is pending. On matching success, retire routine feedback after delivery; for replacement retain meaningful outcome until dismissal/context departure. On read failure keep retryable return context. On mismatch show fresh state and review guidance, not stale original success. Late requests must not apply into a different week/reference or a newer return. Navigation remains available throughout. Old query parameters without matching live context never manufacture a receipt.

## User Experience

Reuse Solar Earth status/toast patterns, localized English/French text, visible keyboard focus and reduced-motion scrolling. A successful replacement needs dismissal only if desired, never another acceptance or rating. Error recovery stays reachable above app navigation at narrow width and large text.

## Risks and Deferrable Questions

Removing the whole current banner would erase recovery; separating outcome kinds prevents that. Removing return storage too early would make retry impossible; retire only handled matching identities. Exact transient duration follows the established notification component; no new timer system is proposed. Coordinate edits to Planner and Recipes with the active quiet-portions owner before implementation; this planning change owns no implementation or DV.

## Approved apply follow-up

During final verification, the user explicitly expanded scope to resolve six portions QA failures in `supper-servings-context.spec.ts` and `supper-servings.spec.ts`. This is acceptance maintenance against existing recipe-library requirements, not a portions behavior change: migrate superseded inline/old quantity controls to Recipe actions original inspection and Reset view; isolate the Next.js development overlay from actual product click/geometry checks; retain contrast thresholds and add measured-color diagnostics. Preserve quantity, no-write, saved-state, stale-occurrence and ordinary click assertions. The full repository gate remains required after the focused cases pass.

The final integration also retains Search-list continuation coverage in the already affected unified recipes suite. Its fixture must distinguish applied Search results from an identically sized library page, settle the existing viewport before scrolling, and bound the exact held continuation request. This changes test readiness only; Search application behavior and its assertions stay intact.

The HTTP grocery-retry acceptance case explicitly selects the supported polling path with an HTTP 204 mock stream, avoiding incidental reconnect/replay from a finite SSE fixture. Other fixture callers retain streaming, and dedicated live-update coverage stays separate. This is test-transport isolation; it does not change GroceryList, backend retry policy or the shared mock implementation.
