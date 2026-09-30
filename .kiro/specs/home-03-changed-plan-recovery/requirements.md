# HOME-03 — Changed-plan recovery: requirements

## Status and derivation

- **Status:** Baseline proposed/current-behavior specification.
- **Kind:** Feature specification; behavior-first; accelerated cadence.
- **Source artifact:** [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), HOME-03.
- **Authority:** This specification documents observed behavior for review. **Implementation is not authorized.**

## Outcome

A household can explicitly recover when tonight’s intended meal is no longer appropriate without losing displaced-plan information.

## Terms and state ownership

- **Household** is the shared authenticated group; **member** is the selected perspective within it.
- Canonical state for this feature is authoritative schedule plus transient recovery dialog selection. Client stores own display and in-flight state only; accepted server responses/events remain authoritative.

## Scope

### In scope

- An empty tonight can be marked Ordered In.
- An existing plan can be replaced, moved to tomorrow, deferred to the server-selected available day beginning next week, or removed.
- A displaced recipe or server-selected defer destination is surfaced; conflict and network failure preserve recoverable context and do not claim success.
- Loading, empty, success, rejection, retry, late-result, navigation, localization, accessibility, and concurrent-device behavior directly attached to the outcomes above.

### Out of scope

- Redesigning adjacent discovery, capture, recipe, or administration features.
- Changing the approved OpenAPI contract, persistence schema, authentication model, or workflow schedule.
- Treating this baseline as authorization to implement, migrate, or deploy anything.

## Verified current ownership

- `pwa/src/components/home/SkipRecoveryDialog.tsx`
- `pwa/src/components/home/HomeCommandCenter.tsx`
- `pwa/src/store/todayStore.ts`
- `pwa/src/lib/api/planner.ts`
- `api/src/RecipeApi/Controllers/ScheduleController.cs`
- `api/src/RecipeApi/Services/ScheduleService.cs`

These paths verify current integration ownership, not that every proposed acceptance statement is already completely implemented.

## Acceptance requirements

- **HOME-03-AC-01 — Primary outcome.** An empty tonight can be marked Ordered In.
- **HOME-03-AC-02 — Complete path.** An existing plan can be replaced, moved to tomorrow, deferred to the server-selected available day beginning next week, or removed.
- **HOME-03-AC-03 — Boundary behavior.** A displaced recipe or server-selected defer destination is surfaced; conflict and network failure preserve recoverable context and do not claim success.
- **HOME-03-AC-04 — Failure and recovery.** While work is loading or pending, duplicate submission is prevented and progress is perceivable. A rejected or unreachable request shows an actionable localized error, preserves the last confirmed state and user context, and permits retry without duplicating an accepted mutation.
- **HOME-03-AC-05 — Concurrency and late results.** Shared server updates are applied only to matching identities/week/date/context. Echoes and stale asynchronous results must not overwrite a newer local or server-confirmed state; reconnect obtains or preserves an authoritative snapshot.
- **HOME-03-AC-06 — Accessibility and localization.** Every action is keyboard operable, has a programmatic name and visible focus, communicates state without color alone, and announces consequential progress/errors. User-facing copy uses repository localization facilities; date, time, and count meaning remains locale-safe.
- **HOME-03-AC-07 — Compatibility and preservation.** Existing household authentication and member scoping remain enforced. Navigation retains relevant context, secrets never enter logs or persistent public UI, and unrelated weeks, days, recipes, votes, and member preferences remain unchanged.

## Preserved behavior

- Existing API authentication, success-envelope, member identity, and SSE-origin rules remain unchanged unless a separately approved contract specification says otherwise.
- Existing confirmed server state is never discarded merely because a client request, animation, clipboard operation, native share call, or stream connection fails.
- Unsupported browser conveniences degrade to another explicit action rather than blocking the core outcome.

## Decisions

- Stable acceptance identifiers use the `HOME-03-AC-nn` namespace.
- The server is authoritative for durable shared state; optimistic UI is provisional and reversible.
- Accelerated cadence omits intermediate approval pauses but does not approve implementation.

## Open questions

- Which acceptance statements should become normative product commitments rather than preservation of observed behavior?
- What user-facing retention, audit, conflict-resolution, and telemetry policy is required for this feature?
- Which current edge cases need dedicated product copy, analytics, or explicit service-level targets?
