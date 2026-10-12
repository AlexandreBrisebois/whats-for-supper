# Planner non-cooking days — design

## Authority and approach

Derived from [requirements](requirements.md); accepted with Q1 resolved to all Draft/VotingOpen/Locked states. The accepted design is implemented in the current feature delta; required API, browser, database and shared-client acceptance remains outstanding as recorded in [implementation evidence](evidence.md). Reuse `CalendarEventStatus.Skipped = 3` and the existing validate/remove/assign routes. A new event status or separate tag service would duplicate the existing recipe-free calendar lifecycle; a client-only label would fail reload and shared-state acceptance.

## Source-grounded integration map

| Owner/path | Integration seam | Feature change |
|---|---|---|
| `pwa/src/app/(app)/planner/page.tsx` and `components/planner/PlanningPivotSheet.tsx` | Empty and occupied day actions; status-3 day display | Add empty-slot tile; open a date-bound detail sheet; show label and edit/clear actions |
| `pwa/src/store/weekStore.ts`, `lib/api/planner.ts`, `lib/planner/slotAssignment.ts` | Generated API calls, smart-default merge, explicit assignment and first-open search | Store contract metadata; protect skipped days from automatic candidates; refetch after writes; use status-aware availability |
| `specs/openapi.yaml`, `api/src/RecipeApi/Controllers/ScheduleController.cs`, `api/src/RecipeApi/Dto/ValidationDto.cs`, `api/src/RecipeApi/Dto/ScheduleDays.cs` | Validate request, schedule response and errors | Add label metadata with precise conditional validation and a recipe conflict response |
| `api/src/RecipeApi/Models/CalendarEvent.cs`, `Data/RecipeDbContext.cs`, `api/database/schema.sql` | Durable event and unique date/meal-slot identity | Add nullable kind/text columns with matching model mapping; retain unique date/meal-slot and status domain |
| `api/src/RecipeApi/Services/ScheduleService.cs` | Validate/read/lock/assign/move/defer and smart-default occupancy | Persist/project metadata, preserve skipped entries on lock, clear metadata on explicit recipe assignment, retain voting/first-open occupancy and carry label metadata through existing movement |
| `api/src/RecipeApi/Infrastructure/IScheduleEventPublisher.cs`, `SseEventPublisher.cs`, `pwa/src/hooks/useScheduleStream.ts` | Slot and whole-week events to planner/today stores | Carry identical metadata through slot/connected/week updates; preserve date/current-week guards |
| `pwa/src/store/todayStore.ts`, `components/home/HomeCommandCenter.tsx`, `TonightPivotCard.tsx`, `pwa/src/app/(app)/home/page.tsx` | SSR and status-3 Home state, legacy order-in and recipe rescue | Display stored preset/custom label; legacy absent metadata falls back to the shared localized Ordering In label |
| `api/src/RecipeApi/Services/ManagementService.cs` | Calendar-event entity export/import, including recipe-free entries | Preserve new fields; accept missing fields in old backups; verify round-trip |
| `pwa/e2e/mock-api.ts` and schedule unit/API tests | Builders and stateful mocked API boundary | Extend shared builders and mutations in the same slice as the contract consumers |

Paths in this table are relative to repository root. Review found that server smart defaults already reserve all existing events, while client recipe-only vacancy checks and unconditional server locking need targeted changes. New schema/client fields must travel beyond the visible planner card into SSE and today state.

## Contract and implementation

Add nullable `nonCooking` to `ScheduleDayDto` and `SlotUpdatedEvent`. Define `NonCookingPlanDto` as `{ kind: 'order_in' | 'eating_out' | 'mystery' | 'custom', customLabel: string | null }`: required kind; customLabel required and nonblank only for custom, null/omitted for presets. Store preset codes, not translated display names. Non-skipped entries expose null/absent metadata. Legacy recipe-free status-3 entries without stored metadata project an effective `order_in` plan.

Extend `ValidationDto` with optional `nonCooking`. New empty-slot/detail writes send `{ status: 3, nonCooking: { kind, customLabel } }` to `POST /api/schedule/day/{date}/validate`. Metadata with any other status is HTTP 400. Invalid kind/text is HTTP 400 with `{ status: 400, message }`, following `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs`; trim and count Unicode scalars on the server. Successful writes use the merged route's 200 `{ data: { message, mealMarkedCooked } }` envelope, owned by `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs`; saving a non-cooking plan returns `mealMarkedCooked: false`; the caller refetches the schedule because the sender may be excluded from SSE. Document examples and 400/409 responses in OpenAPI before deriving tests or implementation. Do not change other validation-status semantics.

With metadata present, create only if no recipe exists, or update an already recipe-free skipped entry. Encountering a recipe or another non-skipped calendar entry is HTTP 409 `{ status: 409, message }` without mutation; add this response to the contract and controller rather than assuming the current generic exception middleware maps conflicts. An existing unique date/slot insertion race must reconcile/reject, never become a generic server error or duplicate event. Mutation and label validation must be atomic. Label-only edits use last-commit-wins. All Draft/VotingOpen/Locked states allow label management; retain existing past-week restrictions without adding new lifecycle guards.

The merged cooking-completion fix retains optional `ValidationDto.recipeId`: status 2 with a recipe ID records that recipe's cooking history and marks the scheduled meal cooked only if the scheduled recipe matches. Home uses `mealMarkedCooked` and the matching recipe identity before clearing current-day metadata, so cooking an unscheduled recipe preserves a saved non-cooking plan. This is compatibility with the integrated fix, not a new non-cooking placement rule.

The response filter must select `ObjectResult.StatusCode` before falling back to `HttpResponse.StatusCode`; MVC has not yet applied the result status when the filter executes. Wrap only successful 2xx results so the approved 400/409 errors retain top-level `status` and `message`. The one-line correction and focused filter/HTTP regressions are recorded in implementation evidence; all existing skip-wrapping rules remain.

Legacy `{ status: 3 }` continues to support the Home recovery flow including retained source recipes. It must not reset a custom label on an already labeled day. Do not globally prohibit recipe-backed skipped entries: movement/defer currently relies on them. The new detail route payload is the stricter, recipe-free branch.

Reads remain `GET /api/schedule?weekOffset=<n>` with `{ data: ScheduleDays }`. Removal remains `DELETE /api/schedule/day/{date}/remove` with 204. Explicit replacement remains `POST /api/schedule/assign` and its existing `{ data: { message, displacedRecipe } }` success envelope. No new endpoints, family-vote request fields, or tag-history resources.

## Persistence and lifecycle invariants

Implemented columns: nullable `non_cooking_kind` and `non_cooking_label` on `calendar_events`, mirrored by `CalendarEvent.NonCookingKind`/`NonCookingLabel` and EF mapping. Null kind/text is valid for legacy rows. New populated metadata requires status 3, no recipe, valid kind, and custom text only for custom; use matching database constraints without rejecting legacy recipe-backed skipped rows. Apply schema through repository database procedures in the implementation slice; this specification does not apply migrations.

| Transition | Result |
|---|---|
| Empty → save non-cooking | Recipe-free status 3, validated metadata on selected date |
| Non-cooking → edit | Same date/status, updated metadata |
| Non-cooking → open/reopen voting | Preserved; smart defaults exclude date |
| Non-cooking → lock week | Preserve status 3 and metadata; recipe events follow existing locking |
| Non-cooking → clear | Remove event; publish/refetch; date becomes eligible under current rules |
| Non-cooking → explicit recipe assignment | Clear metadata, set Planned recipe, preserve existing grocery recomputation |
| Automatic candidate/first-open placement | Treat non-cooking dates as occupied |
| Invalid/conflicting save | No database/state change; retain client input for recovery |

Creation/edit/clear/replacement is allowed in all Draft/VotingOpen/Locked states, preserving existing past-week restrictions. The invariant that an already saved plan survives voting and locking is settled by the feature outcome and does not depend on Q1.

Reuse existing order-in movement semantics for every non-cooking kind. `ScheduleService.SwapInternalAsync` currently swaps recipe ID, vote count, and status between two events. Extend that same swap to `NonCookingKind` and `NonCookingLabel`; do not pin labels to dates or reject a labeled target. The recipe moves to the target and the skipped plan, including its message, moves to the source. `weekStore.reorderLocally` already swaps whole day objects while restoring fixed day/date identity; retain that algorithm and ensure generated metadata survives normalization, rollback, and server reconciliation.

Push already shifts event dates and cross-week/defer searches already use event occupancy. Preserve these algorithms, full-week fallbacks, and current route responses; carry metadata with the skipped event where existing order-in behavior moves it. Existing Sunday displacement/explicit assignment may replace a skipped destination; clear new metadata on any recipe-backed destination, including next Monday, without adding a new rejection or placement rule. For a legacy skipped recipe-rescue source, preserve its existing placeholder behavior. No new 409 responses on move/assign are required by non-cooking movement. The validate branch’s conflict response still prevents a stale label save from overwriting a concurrently assigned recipe.

`FinalizeOverdueMealsAsync` only selects recipe-backed Planned/Locked entries; recipe-free skipped plans remain outside cooked history. Grocery computation remains server-owned; creating/editing a recipe-free plan adds no ingredients. Assignment/removal retain existing recomputation and invalidation. No voting threshold/global purge redesign.

## UI and async behavior

Use existing `t('home.orderingIn', 'Ordering In')` as the single order-in label source across the new pill, planner saved-day and legacy fallback, Home action/state, SkipRecoveryDialog, and any order-in confirmation/accessibility text. EN currently defines “Ordering In” and FR “Commander”; reuse those translations. Replace affected hardcoded “Order In”/“Ordered In” display strings during implementation, without renaming `order_in`, callback names, or stable test IDs. Label consistency is a targeted copy/localization change, not a change to recovery or completed-state behavior.

Add localized “No cooking” tile only for truly empty days. A pending smart-default recipe can be replaced by a non-cooking plan if no persisted recipe exists: successful reconciliation discards that suggestion. For a marked day, the same detail sheet preselects its effective kind/text; edit/clear/explicit recipe actions obey Q1. Use `NonCookingDaySheet.tsx`, existing Solar Earth tokens, and localized EN/FR preset/action/error text. Show four mutually exclusive choices: “Ordering In,” “Eating out,” “Mystery night,” and “We made plans”; keep the existing `order_in`/`eating_out`/`custom` API codes and add `mystery`. We made plans reveals “Tell the family the plan” with examples “Supper at Grandma’s” and “Emma’s birthday supper.” Switching pills preserves the sheet-local custom draft; only the selected kind and applicable message are submitted. Cancel discards this draft. Preset selection does not open the keyboard. For custom plans, the message is the primary planner/Home text, with up to two visible lines and the full message available on opening.

Home renders the saved recipe-free skipped plan using `TonightCardBase` in its own skipped-state branch. The existing recovery pivot is excluded when skipped/completed, so passing a label only to that pivot cannot show the plan. Reuse the label helper and native details for two-line primary text/full-message disclosure; keep existing recovery and meal controls under their current conditions.

Stable test IDs: `pivot-no-cooking`, `non-cooking-sheet`, `non-cooking-order-in`, `non-cooking-eating-out`, `non-cooking-other-plans`, `non-cooking-custom-label`, `non-cooking-save`, `non-cooking-clear`, and `non-cooking-indicator`. Use day-card date/test ID to disambiguate repeated controls. Retain legacy ordered-in selector coverage where existing tests depend on it, or update those affected tests deliberately.

Capture date and week when opening. Save disables repeated submissions; close after confirmed write/refetch only when the same date/sheet remains active. Navigating away invalidates local response application, not the server write. On errors retain input with an accessible error; on 409 refresh authoritative day state and explain that its plan changed. Focus returns to the originating day action. SSE updates and reconnect snapshots include metadata for planner and todayStore; do not drop fields through current destructuring or overwrite a different loaded week. Avoid an independent label cache.

## Minimum change boundary and regression strategy

This feature extends the existing event, DTOs, stream, stores, and day display. It does not add a new status, endpoint, scheduling service, client label cache, shared tag system, or dependency. Keep metadata optional and nullable; reuse validate/remove/assign and the existing data-wrapping/error conventions. Q1 applies to the new label-management branch and its UI, not a general rewrite of legacy validate/remove/assign permissions.

Necessary behavior changes are limited to persisting/displaying the label, preserving status 3 when locking recipe-free skipped entries, treating those dates as occupied in client candidate/first-open checks, carrying metadata through existing order-in movement, and clearing it wherever an existing assignment replaces a skipped plan. No movement guard or algorithm rewrite is introduced. Verify backups through existing entity serialization before considering ManagementService changes. Touch existing components locally; extract no unrelated framework or refactor.

Before implementation, characterize the directly affected existing behaviors with their current tests and add focused failing cases for the new feature. Keep old expectations for legacy `{ status: 3 }`, Home recipe rescue (Tomorrow/Next Week/Drop), ordinary same/cross-week swaps and push/full-week fallbacks, Sunday displacement, vote thresholds/purge, and normal recipe locking. New-feature cases run alongside these regressions; do not weaken them to obtain green results. Pair drag cases for legacy order-in, Eating out, and a custom message; assert identical recipe/status/date outcomes, message movement, immediate UI state, server reconciliation, reload, and rollback on an existing request failure. Record failures and attribution before editing existing logic.

## Verification and dependencies

Requirement → design → task mapping is in [tasks](tasks.md). Real PostgreSQL persistence, schema compatibility, lock lifecycle, backup round-trip, and live API parity must be separately recorded during implementation; mocked browser coverage cannot certify those boundaries. Existing capability baselines change only after accepted implementation evidence. No scheduler, deployment, flag, or reusable tag infrastructure is required for this feature.

## October 12 UX refinement — authorized follow-up

Add Mystery night (`mystery`) as a localized, recipe-free preset between Eating out and We made plans. Selecting it shows “We’ll figure out supper that day.”, does not open the keyboard, and can be saved without text. It reserves the date under existing non-cooking occupancy rules and shows Mystery night on the planner after reload and shared-state reconciliation. On Home, Mystery night shows the same Tonight pivot card and recipe-choice actions as an empty night, including available GOTO, Quick Find, and Ordering In; merely viewing Home does not clear the saved preset. Persist no custom label for this preset.

Rename the custom choice to We made plans; its required input is labeled “Tell the family the plan.” Keep trimmed 1–80-character validation, examples, primary custom-label display, and unsaved draft preservation. Use the shared localized Save button. Preserve existing default selection, lifecycle, movement, failure, and concurrency behavior; no optional note field is added to Mystery night.
