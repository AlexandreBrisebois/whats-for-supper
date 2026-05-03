# Requirements Document

## Introduction

`HomeCommandCenter` and `TonightPivotCard` have accumulated three visual bugs, five state-sync regressions, and a structural root cause — the home page owns "today's state" as scattered local `useState`, with no shared layer between the home page and the planner. This spec consolidates all three bodies of work: the visual fixes from `home-empty-state-ux`, the state-sync fixes from `home-today-sync`, and the new `todayStore` Zustand domain store that eliminates the race conditions at their root. The outcome is a snappy, correct home page that never waits on a network round-trip for a user-visible state change, and a single source of truth for "today's schedule day" that both the home page and the planner can read from.

## Glossary

- **HomeCommandCenter**: The client component at `pwa/src/components/home/HomeCommandCenter.tsx` that orchestrates the home page's "tonight" state.
- **TonightPivotCard**: The card shown when no meal is planned for tonight (`pwa/src/components/home/TonightPivotCard.tsx`).
- **TonightMenuCard**: The card shown when a meal is planned and not yet cooked or skipped.
- **todayStore**: The new Zustand store (`pwa/src/store/todayStore.ts`) that owns today's schedule day as a domain object.
- **GOTO**: The family's configured fallback recipe, stored in the `family_goto` setting.
- **Optimistic write**: A state mutation applied immediately in the client before the backend confirms it.
- **Background sync**: A reconciliation fetch that runs silently without blocking any user-visible state transition.
- **todayStatus**: An integer prop (0 = Draft/no action, 2 = Cooked, 3 = Skipped/Ordered-in) passed from SSR to `HomeCommandCenter`.
- **Digital twin**: The client-side in-memory domain model that mirrors the server's "today" state, accepts optimistic writes immediately, and reconciles with the server in the background.

---

## Design Note: Digital Twin Architecture

The root cause of the state-sync regressions is that `HomeCommandCenter` derives "today's state" from two unsynchronised sources — SSR props and client-side `useState` — with `router.refresh()` as the only bridge. This creates race conditions whenever a background write races against the SSR re-render cycle.

The architectural fix is a **digital twin**: a Zustand store (`todayStore`) that owns today's schedule day as a domain object. It accepts optimistic writes immediately (zero UI lag), syncs back to the server in the background, and is the single source of truth for both the home page and the planner. `HomeCommandCenter` becomes a pure consumer of `todayStore`; `router.refresh()` is removed from all action handlers.

This is not a service worker, not an offline cache, and not related to `pwa-caching`. It is a Zustand store with optimistic-first mutations and background reconciliation.

See `docs/flows/client-domain-model.md` (Group D) for the architecture diagram.

---

## Requirements

### Group A — Visual Fixes

*Detail: `.kiro/specs/home-empty-state-ux/bugfix.md`*

#### Requirement A1: Empty-state header and badge

**User Story:** As a user with no meal planned and no GOTO configured, I want the card to reflect my actual state, so that I am not misled by a header and badge that imply a meal exists.

##### Acceptance Criteria

1. WHEN no meal is planned for today AND no GOTO recipe is configured, THE TonightPivotCard SHALL render the card header as "What's for Supper?" instead of "Tonight's Menu".
2. WHEN no meal is planned for today AND no GOTO recipe is configured, THE TonightPivotCard SHALL hide the prep-time badge entirely.
3. WHEN a GOTO recipe is configured (any status), THE TonightPivotCard SHALL render the card header as "Tonight's Menu" and show the prep-time badge.

#### Requirement A2: Empty-state call-to-action

**User Story:** As a user with no GOTO configured, I want a clearly tappable button to set one up, so that I can act on the empty state without hunting for a buried link.

##### Acceptance Criteria

1. WHEN no meal is planned for today AND no GOTO recipe is configured, THE TonightPivotCard SHALL render the "Add your family's GOTO recipe" action as a full-width ochre pill button (`h-12 rounded-[1.5rem]`, white text, ochre background) in the footer actions section, outside the image area.
2. WHEN no meal is planned for today AND no GOTO recipe is configured, THE TonightPivotCard SHALL render the image area with only the fork/knife icon centered and no gradient overlay obscuring it.
3. WHEN a GOTO recipe is configured, THE TonightPivotCard SHALL continue to render the image area with the gradient overlay and the GOTO image or placeholder.

#### Requirement A3: Button rename

**User Story:** As a user, I want the primary action button to use language that describes what it does, so that the intent is immediately clear.

##### Acceptance Criteria

1. THE TonightPivotCard SHALL render the primary GOTO action button with the label "Make This Tonight" in all states where it was previously labelled "Confirm GOTO".
2. WHEN a GOTO recipe is ready, THE TonightPivotCard SHALL render "Make This Tonight" as the dominant ochre button in the footer.
3. WHEN a GOTO recipe is ready, THE TonightPivotCard SHALL render "Quick Find" and "Order In" as ghost/outline-style buttons, visually subordinate to "Make This Tonight".

---

### Group B — State-Sync Fixes

*Detail: `.kiro/specs/home-today-sync/bugfix.md`*

#### Requirement B1: isScheduleRecipe null-id guard

**User Story:** As a developer, I want `isScheduleRecipe()` to reject objects with a null or empty `id`, so that structurally invalid recipes never reach the render path.

##### Acceptance Criteria

1. WHEN `isScheduleRecipe()` evaluates a recipe object where `recipe.id` is `null`, `undefined`, or an empty string, THE Planner_API SHALL return `false`.
2. WHEN `isScheduleRecipe()` evaluates a recipe object where `recipe.id` is a non-empty string, THE Planner_API SHALL return `true`.
3. WHEN `isScheduleRecipe()` evaluates `null` or `undefined`, THE Planner_API SHALL return `false`.

#### Requirement B2: Optimistic recipe survives sync cycle

**User Story:** As a user who taps "Make This Tonight", I want the menu card to stay visible even if the background sync runs before the backend confirms the assignment, so that the UI does not flash back to the pivot card.

##### Acceptance Criteria

1. WHEN the user taps "Make This Tonight" AND `todayStore.assignRecipe(recipe)` sets `currentRecipe` optimistically, THE HomeCommandCenter SHALL keep `currentRecipe` set for the remainder of the session even if `sync()` runs and the schedule response does not yet contain today's recipe.
2. WHEN `sync()` runs after an optimistic write AND the schedule response returns no recipe for today, THE todayStore SHALL NOT clear `currentRecipe` unless the backend explicitly returns `status: 2` or `status: 3` for today.
3. WHEN `sync()` runs AND `optimisticWriteAt` is non-null AND fewer than 10 seconds have elapsed since the optimistic write, THE todayStore SHALL skip the `currentRecipe` null-clear.

#### Requirement B3: Order In without a recipe writes to backend

**User Story:** As a user who taps "Order In" from the pivot card with no meal planned, I want the "ordered in" state to persist across page reloads, so that the pivot card does not reappear.

##### Acceptance Criteria

1. WHEN the user taps "Order In" from TonightPivotCard AND `currentRecipe` is `null`, THE HomeCommandCenter SHALL call `POST /api/schedule/day/{date}/validate` with `status: 3` unconditionally.
2. WHEN the backend write for "Order In" succeeds, THE HomeCommandCenter SHALL set `isSkipped: true` and `sessionDone: true` so the pivot card does not reappear for the rest of the session.

#### Requirement B4: Order In with a recipe opens SkipRecoveryDialog

**User Story:** As a user who taps "Order In" from the pivot card when a meal is planned, I want to see the recovery dialog first, so that I can decide what to do with the planned meal.

##### Acceptance Criteria

1. WHEN the user taps "Order In" from TonightPivotCard AND `currentRecipe` is not `null`, THE HomeCommandCenter SHALL open `SkipRecoveryDialog` before committing any state change.
2. WHEN the user taps "Order In" from TonightPivotCard AND `currentRecipe` is `null`, THE HomeCommandCenter SHALL proceed directly to the backend write with a visible success state — the action SHALL NOT be silent.

#### Requirement B5: todayStatus prop initialises session state from SSR

**User Story:** As a user who reloads the page after ordering in or finishing cooking, I want the correct completion state to be shown immediately, so that the pivot card does not reappear.

##### Acceptance Criteria

1. THE home/page.tsx SHALL pass a `todayStatus` prop (integer: 0, 2, or 3) to `HomeCommandCenter` derived from the SSR schedule fetch.
2. WHEN `HomeCommandCenter` receives `todayStatus === 2` on mount, THE HomeCommandCenter SHALL initialise `isCooked: true` and `sessionDone: true`, showing `CookedSuccessCard`.
3. WHEN `HomeCommandCenter` receives `todayStatus === 3` on mount, THE HomeCommandCenter SHALL initialise `isSkipped: true` and `sessionDone: true`, showing the "Ordered In" completion state instead of the pivot card.
4. WHEN `HomeCommandCenter` receives `todayStatus === 0` or no `todayStatus` on mount, THE HomeCommandCenter SHALL initialise `isCooked: false` and `isSkipped: false` and show the normal pivot or menu card.

#### Requirement B6: router.refresh() removed from action handlers

**User Story:** As a user on a mobile connection, I want every tap to respond instantly, so that I never wait 300–800 ms for a network round-trip before the UI updates.

##### Acceptance Criteria

1. THE HomeCommandCenter SHALL NOT call `router.refresh()` in any action handler (confirm GOTO, order in, mark cooked, skip, quick find select).
2. WHEN any action handler mutates today's state, THE HomeCommandCenter SHALL update the UI via `todayStore` mutations before any network call completes.
3. WHERE background cache consistency is needed, THE HomeCommandCenter MAY call `router.refresh()` after a backend write resolves, but SHALL NOT await it or place it in the critical render path.

---

### Group C — Today Domain Store

#### Requirement C1: todayStore module

**User Story:** As a developer, I want a single Zustand store that owns today's schedule day state, so that all components read from and write to one source of truth.

##### Acceptance Criteria

1. THE System SHALL provide a Zustand store at `pwa/src/store/todayStore.ts` that owns today's schedule day as a domain object.
2. THE todayStore SHALL be importable by both `HomeCommandCenter` and the planner page without circular dependencies.

#### Requirement C2: Store shape

**User Story:** As a developer, I want the store to expose a well-typed state shape and a complete set of actions, so that consumers have everything they need without reaching outside the store.

##### Acceptance Criteria

1. THE todayStore SHALL expose state fields: `currentRecipe: ScheduleRecipeDto | null`, `status: 0 | 2 | 3`, `isLoading: boolean`, `lastSyncedAt: number`, `optimisticWriteAt: number | null`.
2. THE todayStore SHALL expose actions: `init`, `assignRecipe`, `markCooked`, `markOrderedIn`, `sync`.

#### Requirement C3: assignRecipe action

**User Story:** As a user who selects a recipe for tonight, I want the menu card to appear immediately, so that the UI feels instant regardless of network speed.

##### Acceptance Criteria

1. WHEN `assignRecipe(recipe)` is called, THE todayStore SHALL set `currentRecipe` to the provided recipe and set `optimisticWriteAt` to the current timestamp immediately, before any network call.
2. WHEN `assignRecipe(recipe)` is called, THE todayStore SHALL call `POST /api/schedule/assign` in the background without blocking the UI update.
3. THE todayStore SHALL NOT call `router.refresh()` inside `assignRecipe`.

#### Requirement C4: markCooked action

**User Story:** As a user who finishes cooking, I want the cooked success state to appear immediately, so that the UI confirms my action without waiting for the server.

##### Acceptance Criteria

1. WHEN `markCooked()` is called, THE todayStore SHALL set `status` to `2` immediately, before any network call.
2. WHEN `markCooked()` is called, THE todayStore SHALL call `POST /api/schedule/day/{date}/validate` with `status: 2` in the background.

#### Requirement C5: markOrderedIn action

**User Story:** As a user who orders in, I want the ordered-in state to appear immediately and persist across reloads, so that the pivot card does not reappear.

##### Acceptance Criteria

1. WHEN `markOrderedIn()` is called, THE todayStore SHALL set `status` to `3` immediately, before any network call.
2. WHEN `markOrderedIn()` is called, THE todayStore SHALL call `POST /api/schedule/day/{date}/validate` with `status: 3` in the background.

#### Requirement C6: sync action with optimistic write protection

**User Story:** As a developer, I want background sync to reconcile stale data without overriding in-flight optimistic writes, so that the UI never flashes back to a stale state.

##### Acceptance Criteria

1. WHEN `sync()` is called, THE todayStore SHALL call `GET /api/schedule?weekOffset=0`, find today's entry, and reconcile `currentRecipe` and `status`.
2. WHEN `sync()` runs AND `optimisticWriteAt` is `null`, THE todayStore SHALL update `currentRecipe` from the server response unconditionally.
3. WHEN `sync()` runs AND `optimisticWriteAt` is non-null AND the server response timestamp is more than 10 seconds newer than `optimisticWriteAt`, THE todayStore SHALL update `currentRecipe` from the server response.
4. WHEN `sync()` runs AND `optimisticWriteAt` is non-null AND fewer than 10 seconds have elapsed, THE todayStore SHALL skip the `currentRecipe` update to protect the optimistic write.

#### Requirement C7: HomeCommandCenter refactored to consume todayStore

**User Story:** As a developer, I want `HomeCommandCenter` to be a pure consumer of `todayStore` for today's recipe and status, so that there is no duplicated state management.

##### Acceptance Criteria

1. THE HomeCommandCenter SHALL read `currentRecipe`, `status`, and `isLoading` from `todayStore` instead of local `useState`.
2. THE HomeCommandCenter SHALL call `todayStore.init(todaysRecipe, todayStatus)` on mount to seed the store from SSR props.
3. THE HomeCommandCenter SHALL retain local `useState` only for UI-only state: `showCooksMode`, `showRecovery`, `showQuickFind`.
4. THE HomeCommandCenter SHALL call `todayStore.sync()` on mount in the background, replacing the current `syncRecipe()` `useEffect`.

#### Requirement C8: Planner writes to todayStore

**User Story:** As a user who assigns a recipe in the planner for tonight, I want the home page to reflect the change immediately without navigating away, so that the two pages feel like one coherent app.

##### Acceptance Criteria

1. WHEN the planner page assigns a recipe to today's slot, THE Planner_Page SHALL call `todayStore.assignRecipe(recipe)`.
2. WHEN `todayStore.assignRecipe(recipe)` is called from the planner, THE HomeCommandCenter SHALL reflect the updated `currentRecipe` immediately via Zustand subscription, without requiring navigation or `router.refresh()`.

---

### Group D — Architecture Documentation

#### Requirement D1: Client domain model diagram

**User Story:** As a developer onboarding to this codebase, I want a diagram showing the digital twin architecture, so that I can understand how the client store and server API relate.

##### Acceptance Criteria

1. THE System SHALL provide a Markdown file at `docs/flows/client-domain-model.md` containing a Mermaid diagram showing the digital twin architecture.
2. THE diagram SHALL show: `todayStore` (client domain) ↔ schedule API (server domain), the optimistic write flow, and the background sync flow.

#### Requirement D2: Post-fix flow doc updates

**User Story:** As a developer reading the flow docs, I want them to reflect the corrected implementation, so that I am not misled by stale descriptions of broken behaviour.

##### Acceptance Criteria

1. AFTER all Group A, B, and C fixes are implemented, THE System SHALL update `docs/flows/user-flows/no-menu-goto-home-state.md` to remove or archive stale sections (Phase 13 "Current Model", incorrect E2E table references, incorrect "Confirm GOTO always rendered" claim) and reflect the corrected implementation.
2. AFTER all Group A, B, and C fixes are implemented, THE System SHALL update `docs/flows/user-flows/recipe-selection-to-home.md` to remove or archive stale sections ("Race path" as current risk, `router.refresh()` as the re-hydration mechanism) and reflect the corrected implementation.

---

## PWA Snappiness Constraint

`router.refresh()` SHALL NOT block any user-visible state transition. All state changes that affect what the user sees (recipe card appearing, pivot card disappearing, success states) MUST happen via `todayStore` mutations before any network call completes. Background sync runs silently. The UI never waits for a network round-trip.

This constraint applies to every action handler in `HomeCommandCenter` and every mutation in `todayStore`. It is not negotiable on mobile.

---

## Files in Scope

| File | Change type |
|------|-------------|
| `pwa/src/store/todayStore.ts` | New |
| `pwa/src/components/home/HomeCommandCenter.tsx` | Refactor |
| `pwa/src/components/home/TonightPivotCard.tsx` | Visual fixes + button rename |
| `pwa/src/app/(app)/home/page.tsx` | Pass `todayStatus` prop |
| `pwa/src/lib/api/planner.ts` | Fix `isScheduleRecipe()` |
| `pwa/src/app/(app)/planner/page.tsx` | Call `todayStore.assignRecipe` for today's slot |
| `docs/flows/client-domain-model.md` | New |
| `docs/flows/user-flows/no-menu-goto-home-state.md` | Post-fix update |
| `docs/flows/user-flows/recipe-selection-to-home.md` | Post-fix update |
| `pwa/e2e/home-goto.spec.ts` | Regression tests |
| `pwa/e2e/home-recipe.spec.ts` | Regression tests |

## References

- `.kiro/specs/home-empty-state-ux/bugfix.md` — Group A detail (bug conditions, expected/unchanged behaviour, regression prevention)
- `.kiro/specs/home-today-sync/bugfix.md` — Group B detail (bug conditions, fix-checking properties, preservation properties, PWA snappiness constraint)
