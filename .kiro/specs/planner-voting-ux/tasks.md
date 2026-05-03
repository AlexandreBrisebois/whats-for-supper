# Tasks — planner-voting-ux (Requirements 1–4)

## Overview

Four groups of tasks covering Requirements 1–4. Requirements 5–6 are out of scope for this session.

- **Group A** — PlannerDayCard fixed height (PWA only, no contract changes)
- **Group B** — fill-the-gap deduplication (API + OpenAPI + PWA)
- **Group C** — Rotation sort fix (API only, same method as Group B)
- **Group D** — Post-change tooling and validation
- **Group E** — VotingNudgeCard on Home (PWA only, no contract changes)

Tasks are ordered so Group C is implemented alongside Group B (same file, same method). Run tooling in Group D after Groups A–C. Execute Group E independently (PWA-only, no contract changes).

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
