# Tasks — planner-voting-ux (Requirements 1–6)

## Overview

Six groups of tasks covering Requirements 1–6.

- **Group A** — PlannerDayCard fixed height (PWA only, no contract changes)
- **Group B** — fill-the-gap deduplication (API + OpenAPI + PWA)
- **Group C** — Rotation sort fix (API only, same method as Group B)
- **Group D** — Post-change tooling and validation
- **Group E** — VotingNudgeCard on Home (PWA only, no contract changes)
- **Group F** — weekStore digital twin (new store + planner page refactor)
- **Group G** — "Ask the Family" CTA availability fix

Tasks are ordered so Group C is implemented alongside Group B (same file, same method). Run tooling in Group D after Groups A–C. Execute Group E independently (PWA-only, no contract changes). Groups F–G depend on each other and should be executed together.

---

## Group A — PlannerDayCard Fixed Height

- [x] A1. Lock PlannerDayCard inner wrapper to h-[72px]
  - File: `pwa/src/app/(app)/planner/page.tsx`
  - Add `h-[72px]` to the `<motion.div whileTap ...>` inner wrapper className inside `PlannerDayCard`
  - The outer `Reorder.Item` already has `overflow-hidden`; no change needed there

- [x] A2. Replace conditional vote badge render with always-present visibility-toggled element
  - File: `pwa/src/app/(app)/planner/page.tsx`
  - Remove the `{(day._voteCount != null || day.recipe?.voteCount != null) && ...}` conditional
  - Replace with an always-rendered `<span>` that uses `style={{ visibility: count != null ? 'visible' : 'hidden' }}`
  - Keep `data-testid="vote-count"` on the span
  - When hidden, render `0 voted` as placeholder text (invisible, preserves slot height)

- [x] A3. Change recipe name from line-clamp-2 to line-clamp-1
  - File: `pwa/src/app/(app)/planner/page.tsx`
  - Change `line-clamp-2` → `line-clamp-1` on the `<h4 data-testid="recipe-name">` element inside `PlannerDayCard`

---

## Group B — fill-the-gap Deduplication

- [x] B1. Add `weekOffset` parameter to `FillTheGapAsync` and compute assigned recipe exclusion set
  - File: `api/src/RecipeApi/Services/ScheduleService.cs`
  - Change signature: `public async Task<List<ScheduleRecipeDto>> FillTheGapAsync(int weekOffset = 0)`
  - Before querying `RecipeMatches`, call `GetWeekBounds(weekOffset)` to get `(monday, sunday)`
  - Query `CalendarEvents` where `Date >= monday && Date <= sunday && RecipeId != null` → build `assignedIds` HashSet
  - Add `.Where(x => !assignedIds.Contains(x.Recipe.Id))` to the `RecipeMatches` LINQ query
  - Add `&& !assignedIds.Contains(r.Id)` to the `DiscoveryRecipes` fallback `.Where()` clause

- [x] B2. Expose `weekOffset` query param on `GET /api/schedule/fill-the-gap` controller action
  - File: `api/src/RecipeApi/Controllers/ScheduleController.cs`
  - Change `FillTheGap()` to `FillTheGap([FromQuery] int weekOffset = 0)`
  - Pass `weekOffset` to `_scheduleService.FillTheGapAsync(weekOffset)`

- [x] B3. Update OpenAPI spec to add `weekOffset` query parameter to `GET /api/schedule/fill-the-gap`
  - File: `specs/openapi.yaml`
  - Add `parameters:` block under the `get:` operation for `/api/schedule/fill-the-gap`
  - Parameter: `name: weekOffset`, `in: query`, `required: false`, `schema: { type: integer, default: 0 }`
  - Add description documenting deduplication behaviour and rotation sort order

- [x] B4. Update `getFillTheGap` in PWA API lib to accept and forward `weekOffset`
  - File: `pwa/src/lib/api/planner.ts`
  - Change signature: `export const getFillTheGap = async (weekOffset = 0)`
  - Pass `queryParameters: { weekOffset }` to `apiClient.api.schedule.fillTheGap.get(...)`

- [x] B5. Add `weekOffset` prop to `QuickFindModal` and forward it to `getFillTheGap`
  - File: `pwa/src/components/planner/QuickFindModal.tsx`
  - Add `weekOffset?: number` to `QuickFindModalProps` (default 0)
  - Pass `weekOffset` to `getFillTheGap(weekOffset)` in the `useEffect` fetch

- [x] B6. Pass `currentWeekOffset` to `<QuickFindModal>` in the planner page
  - File: `pwa/src/app/(app)/planner/page.tsx`
  - Find the `<QuickFindModal>` usage (around line 801)
  - Add `weekOffset={currentWeekOffset}` prop

---

## Group C — Rotation Sort Fix

- [x] C1. Fix sort order on `RecipeMatches` pool — add `VoteCount DESC` tiebreaker
  - File: `api/src/RecipeApi/Services/ScheduleService.cs`
  - In `FillTheGapAsync`, after `.ThenBy(x => x.Recipe.LastCookedDate)`, add `.ThenByDescending(x => x.Match.LikeCount)`

- [x] C2. Fix sort order on `DiscoveryRecipes` fallback pool — apply rotation sort
  - File: `api/src/RecipeApi/Services/ScheduleService.cs`
  - Replace the current fallback sort (`.OrderByDescending(r => r.VoteCount).ThenBy(r => r.LastCookedDate == null ? 0 : 1).ThenBy(r => r.LastCookedDate)`)
  - With: `.OrderBy(r => r.LastCookedDate == null ? 0 : 1).ThenBy(r => r.LastCookedDate).ThenByDescending(r => r.VoteCount)`

---

## Group D — Post-Change Tooling

- [x] D1. Run `task agent:reconcile` to regenerate Kiota PWA client from updated OpenAPI spec
  - Required after B3 (OpenAPI change)
  - Verify generated client includes `weekOffset` query parameter on `fillTheGap.get()`

- [x] D2. Run `task agent:drift` to validate no schema drift
  - Verify no drift errors between contract, DTOs, and generated models

- [x] D3. Run `task review` as final gate
  - Address any issues surfaced before marking session complete

---

## Group E — VotingNudgeCard on Home

- [ ] E1. Add `VotingNudgeCard` component to `HomeSections.tsx`
  - File: `pwa/src/components/home/HomeSections.tsx`
  - Import `X` from `lucide-react` (add to existing import); import `Vote` from `lucide-react` (use `Sparkles` as fallback if `Vote` is unavailable)
  - Add `VotingNudgeCard` component with props: `plannedCount: number`, `onVote: () => void`, `onDismiss: () => void`
  - Ochre accent: outer wrapper `bg-ochre/10 border border-ochre/20 rounded-[2.5rem]`
  - Icon container: `bg-ochre/20 text-ochre rounded-2xl`
  - Dismiss button: absolute top-right, `bg-ochre/10 text-ochre/60`, `aria-label="Dismiss"`, `data-testid="voting-nudge-dismiss"`
  - Body text: "The family is voting on next week" (font-black) + `{plannedCount} recipe(s) to vote on` (ochre/70, uppercase tracking)
  - CTA button: full-width, `bg-ochre text-white`, label "Vote Now →", `data-testid="voting-nudge-vote-now"`
  - Root element: `data-testid="voting-nudge-card"`

- [ ] E2. Add voting nudge state and fetch to `HomeCommandCenter.tsx`
  - File: `pwa/src/components/home/HomeCommandCenter.tsx`
  - Import `VotingNudgeCard` from `./HomeSections`
  - Add state: `const [votingNudge, setVotingNudge] = useState<{ plannedCount: number } | null>(null)`
  - Add state: `const [votingNudgeDismissed, setVotingNudgeDismissed] = useState(false)`
  - Add `useEffect` (runs once after mount, separate from the existing mount effect):
    - Fetch `apiClient.api.schedule.get({ queryParameters: { weekOffset: 1 } })`
    - If `data?.status === 1` and `data.days` exists: compute `plannedCount = data.days.filter(d => d.recipe != null).length`, call `setVotingNudge({ plannedCount })`
    - Catch block: swallow error silently (no error surfaced per AC8)
    - Use `isMounted` guard to prevent state update after unmount

- [ ] E3. Render `VotingNudgeCard` in `HomeCommandCenter` between tonight card and `QuickCaptureTrigger`
  - File: `pwa/src/components/home/HomeCommandCenter.tsx`
  - Inside the `!isLoading` block, after the tonight card section (TonightPivotCard / CookedSuccessCard / TonightMenuCard) and before `<QuickCaptureTrigger />`
  - Condition: `{votingNudge && !votingNudgeDismissed && ( <VotingNudgeCard ... /> )}`
  - `onVote`: `() => router.push('/discover')`
  - `onDismiss`: `() => setVotingNudgeDismissed(true)`
  - `plannedCount`: from `votingNudge.plannedCount`

- [ ] E4. Run `task review` as final gate for Group E

---

## Group F — weekStore Digital Twin

- [ ] F1. Create `pwa/src/store/weekStore.ts`
  - New file following the `todayStore` digital-twin pattern
  - State shape: `{ weekOffset, schedule: UILocalScheduleDay[], status: 0|1|2, isLoading, lastSyncedAt, optimisticWriteAt }`
  - Import `UILocalScheduleDay` type from planner page (or extract to a shared types file)
  - Import `getSchedule`, `assignRecipeToDay`, `removeRecipeFromDay`, `moveRecipe` (as `moveRecipeApi`), `openVoting` (as `openVotingApi`), `lockSchedule`, `isScheduleRecipe` from `@/lib/api/planner`
  - Import `getSmartDefaults` from `@/lib/api/planner`
  - Implement `buildScheduleDays(data, defaultsData?)` helper that merges smart defaults into schedule days (extract from planner page `loadData`)
  - Implement `init(weekOffset)`: set `isLoading=true`, fetch `getSchedule(weekOffset)` + `getSmartDefaults(weekOffset)` (smart defaults only for weekOffset=0), call `buildScheduleDays`, set `schedule`, `status`, `lastSyncedAt`, `isLoading=false`; on failure set `isLoading=false` and retain cached state
  - Implement `assignRecipe(dayIndex, recipe)`: optimistic update + background `assignRecipeToDay` + revert on failure; set `optimisticWriteAt`
  - Implement `removeRecipe(dayIndex, date)`: optimistic update + background `removeRecipeFromDay` + revert on failure; set `optimisticWriteAt`
  - Implement `moveRecipe(from, to)`: swap recipes in schedule (keep day/date fixed at indices) + background `moveRecipeApi` + revert on failure; set `optimisticWriteAt`
  - Implement `openVoting()`: set `status=1` optimistically + `POST /api/schedule/voting/open` + revert to prev status on failure
  - Implement `closeVoting()` / `lockWeek()`: set `status=2` optimistically + `lockSchedule(weekOffset)` + revert to prev status on failure
  - Implement `sync()`: fetch `getSchedule(weekOffset)`, apply 10-second optimistic write guard (same as `todayStore`), update `status` always, update `schedule` only if guard allows
  - Export `useWeekStore` (Zustand store)

- [ ] F2. Refactor `pwa/src/app/(app)/planner/page.tsx` to consume `weekStore`
  - Import `useWeekStore` from `@/store/weekStore`
  - Replace `const [schedule, setSchedule] = useState<UILocalScheduleDay[]>([])` with `const schedule = useWeekStore(s => s.schedule)`
  - Replace `const [isLoading, setIsLoading] = useState(true)` with `const isLoading = useWeekStore(s => s.isLoading)`
  - Replace `isVotingOpen` and `isLocked` reads from `usePlannerStore()` with derived values: `const status = useWeekStore(s => s.status)`, `const isVotingOpen = status === 1`, `const isLocked = status === 2`
  - Remove `setVotingOpen`, `setIsLocked` destructures from `usePlannerStore()` (keep `currentWeekOffset`, `activeTab`, `setWeekOffset`, `setActiveTab`, `setGroceryState`)
  - Replace the `loadData` + `updateVoteCounts` `useEffect` with a single `useEffect` that calls `useWeekStore.getState().init(currentWeekOffset)` when `currentWeekOffset` changes
  - Replace the 30-second poll interval with `useWeekStore.getState().sync()` on the same interval
  - Replace `handleAskFamily` body: call `useWeekStore.getState().openVoting()` instead of `openVoting(offset)` + `setVotingOpen(true)`
  - Replace `handleCloseVoting` body: call `useWeekStore.getState().lockWeek()` instead of `lockSchedule(offset)` + `setVotingOpen(false); setIsLocked(true)`
  - Replace `handleQuickFindSelect` body: call `useWeekStore.getState().assignRecipe(dayIndex, recipe)` instead of `setSchedule(...)` + `assignRecipeToDay(...)`
  - Replace `handleRemoveRecipe` body: call `useWeekStore.getState().removeRecipe(dayIndex, date)` instead of `removeRecipeFromDay(date)` + `setSchedule(...)`
  - Replace `handleReorder` body: call `useWeekStore.getState().moveRecipe(from, to)` instead of `setSchedule(updatedSchedule)` + `moveRecipe(...)`
  - Remove `isLockedRef` and its `useEffect` (no longer needed — `isLocked` is derived from `status` in the store)
  - Remove `const [isLoading, setIsLoading] = useState(true)` and the `if (currentWeekOffset !== prevOffset)` block that called `setIsLoading(true)` (weekStore.init handles this)
  - Keep `handleFinalize` as-is for now (it calls `lockSchedule` and `openVoting` directly; it can be migrated in a follow-up)
  - Keep `useTodayStore` integration in `handleQuickFindSelect` for today's slot propagation

---

## Group G — "Ask the Family" CTA Availability

- [ ] G1. Update "Ask the Family" CTA condition in `pwa/src/app/(app)/planner/page.tsx`
  - Remove the `plannedCount > 0` guard from the CTA condition
  - Add a `weekIsPast` derived value using `useMemo`: compare `schedule[6].date` (Sunday) to `getTodayString()`; if Sunday < today, `weekIsPast = true`
  - New condition: `{status === 0 && !weekIsPast && ( <Button data-testid="ask-family-cta" ...> )}`
  - The `isVotingOpen` and `isLocked` checks are implicit in `status === 0` (status 1 and 2 are excluded)

---

## Group H — Post-Change Validation (Requirements 5–6)

- [ ] H1. Run `task agent:drift` to validate no schema drift after weekStore changes
- [ ] H2. Run `task agent:test:impact` to identify and run tests affected by the weekStore refactor
- [ ] H3. Run `task review` as final gate
