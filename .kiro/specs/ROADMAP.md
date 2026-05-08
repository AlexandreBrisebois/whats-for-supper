# What's for Supper — Implementation Roadmap

Eight work sessions in dependency order. Each session has a ready-to-use kick-off prompt.
Sessions 1–4 are independently shippable. Sessions 3 and 6 are the large architectural pieces.

---

## Session 1 — Home Command Center: Visual + State-Sync Fixes

**Spec:** `.kiro/specs/home-command-center-hardening/tasks.md` — Groups A and B
**Effort:** Medium
**Status:** [x] Not started

**What it fixes:**
- Empty pivot card shows wrong header ("TONIGHT'S MENU") and a nonsensical prep-time badge
- "Add your family's GOTO recipe" CTA is buried and not tappable
- "Confirm GOTO" renamed to "Make This Tonight" with correct button hierarchy
- `isScheduleRecipe()` passes `{ id: null }` objects → blank home card after planner assignment
- "Make This Tonight" optimistic state cleared by post-refresh `syncRecipe()` race
- "Order In" from pivot with no recipe: no backend write, state lost on reload
- "Order In" from pivot with recipe: bypasses `SkipRecoveryDialog`
- `todayStatus` prop added to `HomeCommandCenter` so cooked/skipped state survives reload

**Kick-off prompt:**
```
Execute the home-command-center-hardening spec, Groups A and B only.

Spec: .kiro/specs/home-command-center-hardening/tasks.md
Start with task A1 and work through A1 → A2 → A3 → A5, then B1 → B3 → B4 → B5 → B6 → B7 → B8.
Skip optional tasks (marked with *) for now.

Key constraints:
- PWA only — no API contract changes in this session
- router.refresh() stays for now (removed in Session 3)
- Run task review and task agent:test:impact at each group checkpoint
```

---

## Session 2 — Home Command Center: Cooked State + Cook Mode Scope

**Spec:** `.kiro/specs/home-command-center-hardening/tasks.md` — Group E
**Effort:** Small
**Status:** [X] Not started
**Depends on:** Session 1 complete

**What it fixes:**
- Dismissing `CookedSuccessCard` drops back to pivot card — should collapse to a compact cooked badge that still allows re-entering Cook's Mode
- Cook Mode button (👨‍🍳) shows on every day in the current week — should only show on today's slot

**Kick-off prompt:**
```
Execute the home-command-center-hardening spec, Group E only.

Spec: .kiro/specs/home-command-center-hardening/tasks.md
Tasks: E1 and E2.

E1: Fix CookedSuccessCard dismiss — collapse to compact cooked badge, keep Cook's Mode accessible.
E2: Restrict Cook Mode button in PlannerDayCard to today's slot only (day.date === getTodayString()).

Run task review when done.
```

---

## Session 3 — Home Command Center: todayStore Digital Twin

**Spec:** `.kiro/specs/home-command-center-hardening/tasks.md` — Group C
**Effort:** Large
**Status:** [x] Not started
**Depends on:** Session 1 complete (B3 todayStatus prop must be in place)

**What it fixes:**
- Root cause of all home page race conditions: scattered `useState` + `router.refresh()` in the critical path
- Creates `todayStore` (Zustand) as the single source of truth for today's schedule day
- All user-visible state transitions happen via store mutations before any network call (zero UI lag)
- `router.refresh()` removed from all action handlers
- Planner assignments to today's slot propagate to home page via Zustand subscription — no navigation required

**Architecture reference:** `docs/flows/client-domain-model.md`

**Kick-off prompt:**
```
Execute the home-command-center-hardening spec, Group C only.

Spec: .kiro/specs/home-command-center-hardening/tasks.md
Start with C1 (create todayStore.ts), then C3 (refactor HomeCommandCenter), then C5 (planner integration), then C7 (typecheck + E2E).
Skip optional PBT tasks (C2, C4, C6) unless time permits.

Key constraints:
- router.refresh() must be removed from ALL action handlers in HomeCommandCenter after C3
- todayStore.sync() must protect optimistic writes younger than 10 seconds
- No router.refresh() in todayStore actions
- Architecture reference: docs/flows/client-domain-model.md

Run task agent:drift, task agent:test:impact, and task review at C7.
```

---

## Session 4 — Planner: Layout Stability + Quick Find Rotation

**Spec:** `.kiro/specs/planner-voting-ux/requirements.md` — Requirements 1, 2, 3
**Effort:** Small–Medium
**Status:** [x] Not started — design + tasks not yet written

**What it fixes:**
- `PlannerDayCard` height jumps when vote badge appears/disappears or a long recipe name is added
- Quick Find (`fill-the-gap`) suggests recipes already in the current week
- Quick Find sort order doesn't match Discovery — should force rotation (never/rarely cooked first)

**Contract changes required:**
- `GET /api/schedule/fill-the-gap` — add optional `weekOffset` query param to OpenAPI spec
- `ScheduleDays` schema — add `status: integer (0|1|2)` field (already in implementation, missing from contract)

**Kick-off prompt:**
```
Work on the planner-voting-ux spec, Requirements 1, 2, and 3 only.

Spec: .kiro/specs/planner-voting-ux/requirements.md
Flow reference: docs/flows/user-flows/planner-week-lifecycle.md

The design and tasks docs don't exist yet — create them first, then execute.

Req 1 — PlannerDayCard fixed height:
  - Lock card to h-[72px], use visibility:hidden for vote badge slot, line-clamp-1 on recipe name
  - File: pwa/src/app/(app)/planner/page.tsx (PlannerDayCard component)

Req 2 — fill-the-gap deduplication:
  - FillTheGapAsync() must accept weekOffset param and exclude recipes already in that week
  - Files: api/src/RecipeApi/Services/ScheduleService.cs, api/src/RecipeApi/Controllers/ScheduleController.cs
  - Update specs/openapi.yaml to add weekOffset query param

Req 3 — rotation sort:
  - Sort: LastCookedDate ASC NULLS FIRST, then VoteCount DESC (same as Discovery)
  - Apply to both RecipeMatches pool and DiscoveryRecipes fallback pool
  - File: api/src/RecipeApi/Services/ScheduleService.cs

Run task agent:reconcile after OpenAPI changes, then task agent:drift, task review.
```

---

## Session 5 — Planner: Voting Nudge Card on Home

**Spec:** `.kiro/specs/planner-voting-ux/requirements.md` — Requirement 4
**Effort:** Medium
**Status:** [x] Not started — design + tasks not yet written
**Depends on:** Session 1 complete (home page must be stable)

**What it adds:**
- New `VotingNudgeCard` component on the home Command Center
- Appears when next week's voting is open (`GET /api/schedule?weekOffset=1` returns `status: 1`)
- Ochre accent, shows recipe count, single tap → `/discover`
- Session-dismissible, failure-safe, non-blocking (client-side `useEffect` after mount)
- Closes the social voting loop without requiring planner navigation

**Kick-off prompt:**
```
Work on the planner-voting-ux spec, Requirement 4 only.

Spec: .kiro/specs/planner-voting-ux/requirements.md
Flow reference: docs/flows/user-flows/planner-week-lifecycle.md (VotingNudgeCard decision tree)

The design and tasks docs don't exist yet — create them first, then execute.

New component: pwa/src/components/home/HomeSections.tsx — add VotingNudgeCard
Integration: pwa/src/components/home/HomeCommandCenter.tsx — add useEffect to fetch weekOffset=1 schedule after mount, show VotingNudgeCard below tonight card and above QuickCaptureTrigger

Design spec (confirmed):
- Ochre accent (voting = discovery = ochre)
- Shows only when status === 1 for weekOffset=1
- Content: "The family is voting on next week" + planned recipe count + "Vote Now →" button
- Tap → navigate('/discover')
- Dismiss → hide for session only (no localStorage write)
- Fetch failure → no card shown, no error surfaced

Run task review when done.
```

---

## Session 6 — Planner: weekStore Digital Twin + Ask the Family Fix

**Spec:** `.kiro/specs/planner-voting-ux/requirements.md` — Requirements 5 and 6
**Effort:** Large
**Status:** [x] Not started — design + tasks not yet written
**Depends on:** Session 3 complete (todayStore pattern established)

**What it fixes:**
- `isVotingOpen` and `isLocked` are week-agnostic booleans — stale state bleeds between weeks
- Opening voting optimistically says "open" even if the API call fails
- "Ask the Family" CTA only shows when `plannedCount > 0` — blocked on empty weeks
- Week navigation carries stale state until `loadData` completes

**What it adds:**
- `weekStore` (Zustand) — digital twin for the week schedule, same pattern as `todayStore`
- `status` seeded from API (`WeeklyPlan.Status`), `isVotingOpen`/`isLocked` derived from it
- Optimistic `openVoting()`, `lockWeek()`, `assignRecipe()`, `removeRecipe()`, `moveRecipe()` with revert on failure
- "Ask the Family" CTA available whenever `status === 0` and week is not in the past

**Architecture reference:** `docs/flows/client-domain-model.md`, `docs/flows/user-flows/planner-week-lifecycle.md`

**Kick-off prompt:**
```
Work on the planner-voting-ux spec, Requirements 5 and 6 only.

Spec: .kiro/specs/planner-voting-ux/requirements.md
Flow reference: docs/flows/user-flows/planner-week-lifecycle.md (weekStore state transitions diagram)
Architecture reference: docs/flows/client-domain-model.md (digital twin pattern)

The design and tasks docs don't exist yet — create them first, then execute.

New file: pwa/src/store/weekStore.ts
Refactor: pwa/src/app/(app)/planner/page.tsx — consume weekStore instead of local useState + plannerStore booleans

weekStore shape:
  { weekOffset, schedule, status: 0|1|2, isLoading, lastSyncedAt, optimisticWriteAt }
  Actions: init, assignRecipe, removeRecipe, moveRecipe, openVoting, closeVoting, lockWeek, sync

---

## Future Session — Semantic Search Ranking Quality Governance

**Spec:** `.kiro/specs/semantic-recipe-search/`
**Effort:** Medium
**Status:** [ ] Deferred until enough real search seed data exists
**Depends on:** Semantic search shipped with telemetry in place

**Why deferred:**
- There is not yet enough real household query data to build a coherent golden evaluation dataset.
- Shipping formal ranking-regression gates now would create synthetic confidence rather than useful signal.

**What this future session should add:**
- a golden query set from real household usage,
- expected top-pick / top-3 result bands,
- ranking regression checks for major reranking changes,
- human review workflow for validating Top Pick quality.

**Interim rule:**
- Until this session exists, semantic search quality should be monitored through correctness tests, instrumentation, and manual review of obvious ranking failures.

Key constraints:
- status is always seeded from API response (WeeklyPlan.Status) — never from local boolean flags
- isVotingOpen = status === 1, isLocked = status === 2 (derived, not stored)
- openVoting() sets status=1 optimistically, reverts on API failure
- lockWeek() sets status=2 optimistically, reverts on API failure
- sync() protects optimistic writes younger than 10 seconds (same guard as todayStore)
- "Ask the Family" CTA: show when status === 0 AND week is not in the past (remove plannedCount > 0 requirement)

Run task agent:drift, task agent:test:impact, task review when done.
```

---

## Session 7 — Flow Doc Updates

**Spec:** `.kiro/specs/home-command-center-hardening/tasks.md` — Group D
**Effort:** Small
**Status:** [x] Not started
**Depends on:** Sessions 1, 2, 3 complete

**What it updates:**
- `docs/flows/user-flows/no-menu-goto-home-state.md` — remove stale Phase 13 "Current Model", fix E2E table references, update for `todayStore` and "Make This Tonight"
- `docs/flows/user-flows/recipe-selection-to-home.md` — remove "Race path" as current risk, replace `router.refresh()` as re-hydration mechanism with `todayStore` optimistic write pattern

**Kick-off prompt:**
```
Execute the home-command-center-hardening spec, Group D only.

Spec: .kiro/specs/home-command-center-hardening/tasks.md
Tasks: D1, D2, D3.

Both flow docs are marked STALE at the top with specific drift items listed.
Rewrite them to reflect the corrected implementation after Sessions 1–3.

Reference the corrected implementation in:
- pwa/src/store/todayStore.ts (new)
- pwa/src/components/home/HomeCommandCenter.tsx (refactored)
- pwa/src/components/home/TonightPivotCard.tsx (visual fixes)

Run task review when done.
```

---

## Session 8 — Capture Describe Entry: Remaining Optional Tests

**Spec:** `.kiro/specs/capture-describe-entry/tasks.md`
**Effort:** Small
**Status:** [ ] Tasks 1–4 and 5.1 complete. Optional E2E tests 5.2–5.4 remain.

**Kick-off prompt:**
```
Complete the capture-describe-entry spec, remaining optional E2E tests only.

Spec: .kiro/specs/capture-describe-entry/tasks.md
Tasks: 5.2, 5.3, 5.4 (all marked optional with *)

File: pwa/e2e/capture-flow.spec.ts

5.2 — Initial state rendering: tab switcher absent, camera/gallery/describe-link visible, form not present
5.3 — Describe link interaction: clicking "Or Describe It Instead" reveals form, hides link, keeps camera visible
5.4 — Form validation: submit with empty name shows error, API not called

Run task review when done.
```

---

## Status Overview

| # | Session | Spec | Groups/Reqs | Effort | Status |
|---|---------|------|-------------|--------|--------|
| 1 | Home visual + state-sync fixes | `home-command-center-hardening` | A, B | Medium | [ ] |
| 2 | Cooked state + Cook Mode scope | `home-command-center-hardening` | E | Small | [ ] |
| 3 | todayStore digital twin | `home-command-center-hardening` | C | Large | [ ] |
| 4 | Planner layout + Quick Find | `planner-voting-ux` | Req 1–3 | Small–Med | [ ] |
| 5 | Voting nudge card on home | `planner-voting-ux` | Req 4 | Medium | [ ] |
| 6 | weekStore digital twin | `planner-voting-ux` | Req 5–6 | Large | [ ] |
| 7 | Flow doc updates | `home-command-center-hardening` | D | Small | [ ] |
| 8 | Capture optional E2E tests | `capture-describe-entry` | 5.2–5.4 | Small | [ ] |

Mark sessions complete by changing `[ ]` to `[x]` as you ship them.
