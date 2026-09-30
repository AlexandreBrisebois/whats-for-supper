# PLAN-05 — Automatic schedule maintenance: requirements

## Status and derivation

- **Status:** Baseline proposed/current-behavior specification.
- **Kind:** Feature specification; behavior-first; accelerated cadence.
- **Source artifact:** [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), PLAN-05.
- **Authority:** This specification documents observed behavior for review. **Implementation is not authorized.**

## Outcome

Scheduled automation keeps overdue meal state and future suggestions useful without changing exempt days.

## Terms and state ownership

- **Household** is the shared authenticated group; **member** is the selected perspective within it.
- Canonical state for this feature is server schedule persistence and workflow scheduler state. Client stores own display and in-flight state only; accepted server responses/events remain authoritative.

## Scope

### In scope

- The maintenance workflow marks eligible overdue planned meals cooked.
- Ordered In, already-cooked, and future meals remain unchanged.
- Scheduled suggestion workflows seed or curate future proposals without replacing confirmed plans.
- Loading, empty, success, rejection, retry, late-result, navigation, localization, accessibility, and concurrent-device behavior directly attached to the outcomes above.

### Out of scope

- Redesigning adjacent discovery, capture, recipe, or administration features.
- Changing the approved OpenAPI contract, persistence schema, authentication model, or workflow schedule.
- Treating this baseline as authorization to implement, migrate, or deploy anything.

## Verified current ownership

- `api/src/RecipeApi/Services/Processors/FinalizeOverdueMealsProcessor.cs`
- `api/src/RecipeApi/Services/ScheduleService.cs`
- `api/src/RecipeApi/Services/DreamingWorkflowSeeder.cs`
- `api/src/RecipeApi/Workflows/dreaming.yaml`
- `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs`
- `api/src/RecipeApi.Tests/Services/DreamingWorkflowSeederTests.cs`

These paths verify current integration ownership, not that every proposed acceptance statement is already completely implemented.

## Acceptance requirements

- **PLAN-05-AC-01 — Primary outcome.** The maintenance workflow marks eligible overdue planned meals cooked.
- **PLAN-05-AC-02 — Complete path.** Ordered In, already-cooked, and future meals remain unchanged.
- **PLAN-05-AC-03 — Boundary behavior.** Scheduled suggestion workflows seed or curate future proposals without replacing confirmed plans.
- **PLAN-05-AC-04 — Failure and recovery.** While work is loading or pending, duplicate submission is prevented and progress is perceivable. A rejected or unreachable request shows an actionable localized error, preserves the last confirmed state and user context, and permits retry without duplicating an accepted mutation.
- **PLAN-05-AC-05 — Concurrency and late results.** Shared server updates are applied only to matching identities/week/date/context. Echoes and stale asynchronous results must not overwrite a newer local or server-confirmed state; reconnect obtains or preserves an authoritative snapshot.
- **PLAN-05-AC-06 — Accessibility and localization.** Every action is keyboard operable, has a programmatic name and visible focus, communicates state without color alone, and announces consequential progress/errors. User-facing copy uses repository localization facilities; date, time, and count meaning remains locale-safe.
- **PLAN-05-AC-07 — Compatibility and preservation.** Existing household authentication and member scoping remain enforced. Navigation retains relevant context, secrets never enter logs or persistent public UI, and unrelated weeks, days, recipes, votes, and member preferences remain unchanged.

## Preserved behavior

- Existing API authentication, success-envelope, member identity, and SSE-origin rules remain unchanged unless a separately approved contract specification says otherwise.
- Existing confirmed server state is never discarded merely because a client request, animation, clipboard operation, native share call, or stream connection fails.
- Unsupported browser conveniences degrade to another explicit action rather than blocking the core outcome.

## Decisions

- Stable acceptance identifiers use the `PLAN-05-AC-nn` namespace.
- The server is authoritative for durable shared state; optimistic UI is provisional and reversible.
- Accelerated cadence omits intermediate approval pauses but does not approve implementation.

## Open questions

- Which acceptance statements should become normative product commitments rather than preservation of observed behavior?
- What user-facing retention, audit, conflict-resolution, and telemetry policy is required for this feature?
- Which current edge cases need dedicated product copy, analytics, or explicit service-level targets?
