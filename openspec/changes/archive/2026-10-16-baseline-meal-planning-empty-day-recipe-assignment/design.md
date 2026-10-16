# Design

## Context

See proposal.md for motivation. This is a documentation design for one existing observable journey, not a new implementation design. The cross-layer trace warrants a design artifact. The source-supported delta adds 15 requirements/30 scenarios to the existing meal-planning capability; it does not edit the promoted Purpose or 15/40 baseline.

The smallest observable slice is a selected recipe placed on an ordinary empty dated day, observed through Planner Quick Find or targeted Search/detail. Source identities and assertion limits live in BSL-meal-planning-007–012 in the capability plan. Tests were inspected, not executed.

## Goals / Non-Goals

**Goals:** Record the two paths separately, distinguish stored calendar entry from browser suggestion/display, and describe the boundaries between durable assignment, grocery recomputation, publication, response and browser feedback.

**Non-Goals:** No new code, contract, client, SQL, configuration, dependencies, runtime checks or policy repair. No extraction of occupied recovery/displacement, non-cooking conversion or first-open scanning policies. No accepted-baseline or lifecycle transition is implied by artifact readiness.

## Decisions

### Extend the existing owner with ADDED requirements

The main meal-planning spec already owns UTC week interpretation, URL selection, schedule reading and suggestion composition. Reference those rules rather than copying or changing them. Assignment adds its mutation-specific consequence: server Monday plus posted index. A new capability or MODIFIED rewrite would fragment calendar ownership or alter reviewed behavior without authorization.

Shared owners remain:

- household-identity: Gate protected page entry with household access, Apply member context after household access, Authenticate protected API requests independently. Assignment adds no endpoint-specific member binder or existence check.
- recipe-library: Retrieve the selected library recipe for detail reading and Return persisted recipe detail for an available record. Being visible in a library read does not establish assignment-time eligibility enforcement.
- household-live-updates: Reconcile only the displayed snapshot week, Preserve existing day content under snapshot merge guards, Apply available snapshot adjuncts conditionally, Select Today independently from the received snapshot, Preserve Today's recent optimistic recipe guard, Use connection identity only for immediate echo exclusion and Bound delivery to current process registrations. U95–U109 remain applicable.

### Keep each caller's representation and completion boundary visible

Planner card → planning pivot → selected array index → QuickFindModal returned recipe → handleQuickFindSelect → weekStore.assignRecipe. The store captures the entire schedule, spreads the selected entry, sets status=0/nonCooking=null/recipe display fields, stamps optimisticWriteAt and posts using the loaded store offset. It does not explicitly clear pending/vote markers inherited by spreading. On POST resolution it reads getSchedule using the then-current store offset, applying groceryItems/status/time only. No usable data is a resolved completion. Either POST or follow-up failure restores the captured whole schedule and throws a generic error. The page then awaits init for its captured offset, adds an error toast and retains modal/selection unless independently dismissed.

Targeted Search → loaded RecipeDetailSheet → handleUseRecipe pending boolean → handleAssignRecipe → getPlannerSlot GET. That helper returns null for missing date/day/data, otherwise exposes normalized recipe, date, offset and index; it omits status/nonCooking. A recipe diverts to recovery. An ordinary empty result calls assignRecipeToEmptySlot, which is just a forwarding wrapper without another guard. It posts, ignores the envelope and pushes /planner?success=1&dayIndex=D&weekOffset=W. Search does not call weekStore.assignRecipe or Today directly on this path. On rejection it logs, clears isAssigning and keeps detail; the sheet's finally releases isSavingAction. There is no dedicated assignment-error message in this path. Search list containers use isAssigning pointer-events/opacity styling; this is not an application-wide concurrency lock. Detail close and other navigation remain possible.

### Trace the approved and generated wire without repairing mismatches

planner.assignRecipeToDay → generated schedule.assign.post → AssignScheduleDto serializer writes weekOffset/dayIndex/recipeId JSON → POST /api/schedule/assign → Program's shared authorization filter → ScheduleController.AssignRecipe → ScheduleService.AssignRecipeAsync. The API client also attaches member and available SSE connection identity headers. Controller passes the connection identity, not a member binding, into publication exclusion.

OpenAPI requires a body with all three fields, integer offsets/index and UUID recipeId, without defaults, range, empty-slot token or idempotency key. Generated TS makes fields optional/null; the wrapper supplies all three. The C# positional record uses int/int/Guid with no Range/Required/JsonRequired semantic annotations and no explicit constructor defaults. Absent-value/default-binding behavior is not qualified as a supported alternate contract. Framework malformed-body/type handling is distinct from semantic validation; no missing-field, invalid-GUID, out-of-range, extreme-offset, nonexistent/deleted/unready recipe or authentication assertion was found for this selected operation. Keep those disputed acceptance/error claims outside the delta.

### Preserve persistence and follow-up ordering without inferring a transaction

GetWeekBounds uses injected clock UTC date → relative Monday → AddDays(dayIndex). EnsureWeekPlanExistsAsync performs AnyAsync and, if absent, saves a new Draft plan separately. AssignRecipeAsync queries the first event by date, including Recipe, without meal-slot predicate/order. For no entry it adds a new GUID event, chosen RecipeId, date, Planned=0; model default MealSlot=0. It saves, awaits grocery recomputation with CancellationToken.None, reads schedule, publishes week_updated, then fill_the_gap_invalidated, finally returns null displacement for the empty-date case.

RecomputeForWeekAsync independently saves weekly grocery output and can await grocery_updated if check-state transitions change. Its aggregation/check policy remains grocery-shopping's concern. SseEventPublisher delegates publication to SseConnectionManager. Broadcast catches per-response write/flush failures, but serialization and semaphore wait lie outside that catch. Publication is an attempt, not receipt or application acknowledgement. SuccessWrappingFilter wraps controller Ok({message="Recipe assigned", displacedRecipe=null}) as data. No selected caller inspects either field; HTTP resolution drives feedback.

EF/SQL enforce recipe FK, date+mealSlot uniqueness and week-start uniqueness, plus status/non-cooking checks. Default InMemory tests do not qualify these constraints or concurrent transactions. The endpoint can mutate an occupied target; Sunday displacement is inspected only as compatibility boundary, with its separate follow-ups excluded from this delta.

### Keep Today handoff as a qualified side effect

After Planner store completion, the page checks captured currentWeekOffset===0 and captured selected date===getTodayString(). It invokes todayStore.assignRecipe before closing Quick Find. This immediately updates Today, posts another assignment for browser-local today without awaiting it, and fetches recipe detail, applying fields only if recipe identity still matches. Background errors log. This is a second write, not hydration alone or a single request transaction. Record it non-normatively under U114 rather than establishing duplicate writes as desired policy. Search relies on subsequent Planner initialization/live reconciliation and has no equivalent direct call.

## Risks / Trade-offs

- [Empty classification can change] → Limit normative empty-date persistence to no stored event at lookup; document read/post race, occupied overwrite and absent atomic precondition under U110.
- [Incomplete request semantics] → U111 withholds day bounds, omitted-value defaults, eligibility checks and precise error matrix. Relational constraints are source evidence, not observed runtime guarantees.
- [Partial persistence] → U112 records separately saved weekly plan, calendar entry and grocery output. Later failure may show failure while data persists; no rollback/transaction guarantee or safe retry assertion.
- [Overlapping browser work] → U113 records no Quick Find submission latch, request cancellation or assignment generation guard; store reread can use a later offset, whole-schedule rollback can overwrite intervening content, stale closure can close a later modal. Pending booleans only describe local controls.
- [Today duplicates assignment] → U114 preserves extra POST, browser-local/server-UTC mismatch and independent failure boundary without prescribing a fix.
- [Substituted success feedback] → U115 separates actual assertions from mocks/static source; ring/URL/successful promise is not persistence, receipt or convergence evidence. Missing-target and recipe-free non-cooking guard gaps stay outside normative empty-day scope.

## Migration Plan

No deployment, data migration or application rollback applies. Complete documentation-only checks, stop for human review, and preserve the active change. Promotion, archival, implementation or any qualification run requires a separate user instruction. No OpenSpec initialization or configuration change is required.
