# PLAN-01 — Week navigation and status: requirements

## Status and derivation

- **Status:** Baseline proposed/current-behavior specification.
- **Kind:** Feature specification; behavior-first; accelerated cadence.
- **Source artifact:** [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), PLAN-01.
- **Authority:** This specification documents observed behavior for review. **Implementation is not authorized.**

## Outcome

A member can inspect a shareable past, current, or future week and understand its planning state and completeness.

## Terms and state ownership

- **Household** is the shared authenticated group; **member** is the selected perspective within it.
- Canonical state for this feature is URL weekOffset, plannerStore tab/offset, and weekStore server snapshot. Client stores own display and in-flight state only; accepted server responses/events remain authoritative.

## Scope

### In scope

- Week navigation reads and writes a finite integer weekOffset in the planner URL.
- The planner distinguishes Draft, VotingOpen, and Locked status returned for the selected week.
- The surface reports filled versus available days and maintains the selected week across planner/grocery tabs.
- Loading, empty, success, rejection, retry, late-result, navigation, localization, accessibility, and concurrent-device behavior directly attached to the outcomes above.

### Out of scope

- Redesigning adjacent discovery, capture, recipe, or administration features.
- Changing the approved OpenAPI contract, persistence schema, authentication model, or workflow schedule.
- Treating this baseline as authorization to implement, migrate, or deploy anything.

## Verified current ownership

- `pwa/src/app/(app)/planner/page.tsx`
- `pwa/src/store/plannerStore.ts`
- `pwa/src/store/weekStore.ts`
- `pwa/src/lib/api/planner.ts`
- `api/src/RecipeApi/Controllers/ScheduleController.cs`
- `api/src/RecipeApi/Dto/ScheduleDays.cs`

These paths verify current integration ownership, not that every proposed acceptance statement is already completely implemented.

## Acceptance requirements

- **PLAN-01-AC-01 — Primary outcome.** Week navigation reads and writes a finite integer weekOffset in the planner URL.
- **PLAN-01-AC-02 — Complete path.** The planner distinguishes Draft, VotingOpen, and Locked status returned for the selected week.
- **PLAN-01-AC-03 — Boundary behavior.** The surface reports filled versus available days and maintains the selected week across planner/grocery tabs.
- **PLAN-01-AC-04 — Failure and recovery.** While work is loading or pending, duplicate submission is prevented and progress is perceivable. A rejected or unreachable request shows an actionable localized error, preserves the last confirmed state and user context, and permits retry without duplicating an accepted mutation.
- **PLAN-01-AC-05 — Concurrency and late results.** Shared server updates are applied only to matching identities/week/date/context. Echoes and stale asynchronous results must not overwrite a newer local or server-confirmed state; reconnect obtains or preserves an authoritative snapshot.
- **PLAN-01-AC-06 — Accessibility and localization.** Every action is keyboard operable, has a programmatic name and visible focus, communicates state without color alone, and announces consequential progress/errors. User-facing copy uses repository localization facilities; date, time, and count meaning remains locale-safe.
- **PLAN-01-AC-07 — Compatibility and preservation.** Existing household authentication and member scoping remain enforced. Navigation retains relevant context, secrets never enter logs or persistent public UI, and unrelated weeks, days, recipes, votes, and member preferences remain unchanged.

## Preserved behavior

- Existing API authentication, success-envelope, member identity, and SSE-origin rules remain unchanged unless a separately approved contract specification says otherwise.
- Existing confirmed server state is never discarded merely because a client request, animation, clipboard operation, native share call, or stream connection fails.
- Unsupported browser conveniences degrade to another explicit action rather than blocking the core outcome.

## Decisions

- Stable acceptance identifiers use the `PLAN-01-AC-nn` namespace.
- The server is authoritative for durable shared state; optimistic UI is provisional and reversible.
- Accelerated cadence omits intermediate approval pauses but does not approve implementation.

## Open questions

- Which acceptance statements should become normative product commitments rather than preservation of observed behavior?
- What user-facing retention, audit, conflict-resolution, and telemetry policy is required for this feature?
- Which current edge cases need dedicated product copy, analytics, or explicit service-level targets?
