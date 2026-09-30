# GROC-02 — Collaborative shopping state: requirements

## Status and derivation

- **Status:** Baseline proposed/current-behavior specification.
- **Kind:** Feature specification; behavior-first; accelerated cadence.
- **Source artifact:** [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), GROC-02.
- **Authority:** This specification documents observed behavior for review. **Implementation is not authorized.**

## Outcome

Household shoppers can coordinate checked state for individual or all weekly grocery lines across devices.

## Terms and state ownership

- **Household** is the shared authenticated group; **member** is the selected perspective within it.
- Canonical state for this feature is server weekly grocery-state map and local displayed optimistic/check state. Client stores own display and in-flight state only; accepted server responses/events remain authoritative.

## Scope

### In scope

- A shopper can check or uncheck an individual grocery line for the selected week.
- Bulk changes update the week grocery-state map and the response becomes the displayed state.
- Shared schedule events synchronize accepted shopping changes; failures do not leave a false durable-success indication.
- Loading, empty, success, rejection, retry, late-result, navigation, localization, accessibility, and concurrent-device behavior directly attached to the outcomes above.

### Out of scope

- Redesigning adjacent discovery, capture, recipe, or administration features.
- Changing the approved OpenAPI contract, persistence schema, authentication model, or workflow schedule.
- Treating this baseline as authorization to implement, migrate, or deploy anything.

## Verified current ownership

- `pwa/src/components/planner/GroceryList.tsx`
- `pwa/src/lib/api/schedule.ts`
- `pwa/src/store/plannerStore.ts`
- `pwa/src/store/weekStore.ts`
- `pwa/src/hooks/useScheduleStream.ts`
- `api/src/RecipeApi/Controllers/ScheduleController.cs`
- `api/src/RecipeApi/Services/ScheduleService.cs`

These paths verify current integration ownership, not that every proposed acceptance statement is already completely implemented.

## Acceptance requirements

- **GROC-02-AC-01 — Primary outcome.** A shopper can check or uncheck an individual grocery line for the selected week.
- **GROC-02-AC-02 — Complete path.** Bulk changes update the week grocery-state map and the response becomes the displayed state.
- **GROC-02-AC-03 — Boundary behavior.** Shared schedule events synchronize accepted shopping changes; failures do not leave a false durable-success indication.
- **GROC-02-AC-04 — Failure and recovery.** While work is loading or pending, duplicate submission is prevented and progress is perceivable. A rejected or unreachable request shows an actionable localized error, preserves the last confirmed state and user context, and permits retry without duplicating an accepted mutation.
- **GROC-02-AC-05 — Concurrency and late results.** Shared server updates are applied only to matching identities/week/date/context. Echoes and stale asynchronous results must not overwrite a newer local or server-confirmed state; reconnect obtains or preserves an authoritative snapshot.
- **GROC-02-AC-06 — Accessibility and localization.** Every action is keyboard operable, has a programmatic name and visible focus, communicates state without color alone, and announces consequential progress/errors. User-facing copy uses repository localization facilities; date, time, and count meaning remains locale-safe.
- **GROC-02-AC-07 — Compatibility and preservation.** Existing household authentication and member scoping remain enforced. Navigation retains relevant context, secrets never enter logs or persistent public UI, and unrelated weeks, days, recipes, votes, and member preferences remain unchanged.

## Preserved behavior

- Existing API authentication, success-envelope, member identity, and SSE-origin rules remain unchanged unless a separately approved contract specification says otherwise.
- Existing confirmed server state is never discarded merely because a client request, animation, clipboard operation, native share call, or stream connection fails.
- Unsupported browser conveniences degrade to another explicit action rather than blocking the core outcome.

## Decisions

- Stable acceptance identifiers use the `GROC-02-AC-nn` namespace.
- The server is authoritative for durable shared state; optimistic UI is provisional and reversible.
- Accelerated cadence omits intermediate approval pauses but does not approve implementation.

## Open questions

- Which acceptance statements should become normative product commitments rather than preservation of observed behavior?
- What user-facing retention, audit, conflict-resolution, and telemetry policy is required for this feature?
- Which current edge cases need dedicated product copy, analytics, or explicit service-level targets?
