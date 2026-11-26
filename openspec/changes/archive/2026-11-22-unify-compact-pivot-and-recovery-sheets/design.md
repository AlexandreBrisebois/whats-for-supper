# Design

## Context and Existing Ownership

Visual authority for this change lives in the two Era 3 design boards created during exploration:

- `docs/visual-language/designs/pivot-recovery-sheet-suite.svg`
- `docs/visual-language/designs/pivot-recovery-journeys.svg`

Current implementation owners and verified root causes:

- `pwa/src/components/home/SkipRecoveryDialog.tsx`: Uses `px-6 pb-6`, `max-w-sm`, `rounded-[2.5rem]`, `p-8`, `mb-8`, `gap-6`, a `text-3xl` heading carrying the full recipe name + full date (wrapping to 5–6 lines), `p-5` option cards with redundant trailing icons (`Calendar` on card 1, duplicate `RefreshCw` on card 2) that narrow the text column to `~156px`, and a bottom `Go back` button. Total Step 2 height reaches `~808–860px`, clipping `Go back` below the fold on a Pixel 10 (`412 × 915 CSS px`). Step 1 also offers only `Take Out`, `Suggestions`, and `Search`, leaving a dead end for `Eating out` and `Made plans`.
- `pwa/src/components/home/HomeCommandCenter.tsx`: Manages `RecoveryFlowState` (`closed`, `step1`, `quick_find`, `step2`). Currently `step2` only models `intent: 'order_in' | 'pick_else'`, calls `moveTomorrow(slot, 'order_in')` for Tomorrow, and calls status-only `POST /api/schedule/day/{date}/validate` (`{ status: 3 }`) for `next_week`/`drop`.
- `pwa/src/components/planner/PlanningPivotSheet.tsx`: Shares the same oversized `p-8`, `mb-8`, `text-3xl`, `p-5` chrome across up to 5 options (`~840px` tall) and omits the planned recipe title in its header.
- `pwa/src/components/planner/NonCookingDaySheet.tsx`: Still uses Era 2 frosted `bg-cream/90 backdrop-blur-xl`, `rounded-[3rem]`, `text-3xl`, and a `44 × 44px` (`h-11 w-11`) close button.
- `specs/openapi.yaml` (`MoveScheduleDto`), `api/src/RecipeApi/Controllers/ScheduleController.cs`, `api/src/RecipeApi/Services/ScheduleService.cs`, and `pwa/src/lib/planner/slotAssignment.ts`: `MoveScheduleDto.sourceDisposition` currently only accepts `order_in | null`. `POST /api/schedule/day/{date}/validate` already accepts `{ status: 3, nonCooking: NonCookingPlanDto }`.

## Decisions and Tradeoffs

1. **Shared compact Era 3 sheet primitive (`PivotSheetShell`):**
   - Extract a lightweight shared UI shell (e.g., `pwa/src/components/ui/PivotSheetShell.tsx`) owning the scrim (`bg-charcoal/45 backdrop-blur-sm`), opaque `bg-cream border border-chrome-line rounded-[2rem] p-5` container, locked top-left title stack (`eyebrow` + `subtitle`), top-right `[← Back] [×]` `48px` action cluster, optional `4px` 2-step progress strip, and consistent `min-h` across Step 1 ↔ Step 2 (`min-h-[496px]` on `>= 375px` viewports, relaxing naturally below `360px` / `200%` text scale).
   - _Tradeoff:_ Using a floating `mx-4 mb-4` (`380px` on Pixel 10) rounded sheet instead of a full-width edge-to-edge drawer preserves WFS's warm cookbook card silhouette while reclaiming `+40px` of inner width (`340px` vs. `300px`) over the current `px-6 p-8` shell.

2. **Non-clickable terracotta editorial bar directly on cream (no meal card box):**
   - Render read-only recipe context (`Original meal · Saturday, November 21` + bold recipe title) directly on warm cream `#FDFCF0` beside a `3.5px` `bg-hearth-fill` bar above a `1px border-chrome-line` divider.
   - _Alternative rejected:_ Boxing the meal in a white bordered card (`bg-white border-chrome-line`) created a false click affordance directly above the three real action cards.

3. **Concise localized dates inside action buttons, full date in header context:**
   - Add `formatShortSupperPlanDate(date: string)` in `pwa/src/lib/planner/nonCooking.ts` using `Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })` (`Sun, Nov 22` / `dim. 22 nov.`). Keep `formatSupperPlanDate(date)` (`Saturday, November 21`) in the non-clickable header so the full date remains visible while action cards never crowd or wrap awkwardly on English long dates (`Wed, Sep 23`).

4. **Zero-extra-menu Step 1 non-cooking lane + inline `Made plans` validation:**
   - Place `Take Out`, `Eating out`, and `Made plans` in a 3-up `grid-cols-3` quick-tap row (`flex-wrap` / `grid-cols-1` fallback below `340px`) above `Suggestions` and `Search`.
   - `Take Out` and `Eating out` immediately invoke Step 2 in 1 tap (retaining `{ kind: 'order_in', customLabel: null }` or `{ kind: 'eating_out', customLabel: null }`).
   - `Made plans` toggles an inline `Tell the family the plan` input + `Next →` Hearth CTA directly inside Step 1 using the exact same `1–80` trimmed Unicode scalar-value validation rule as `NonCookingDaySheet`. Going back from Step 2 restores the typed draft in Step 1 so the user never loses what they typed.
   - _Tradeoff:_ Optional notes for `Take Out` / `Eating out` are intentionally omitted from Plan B Step 1 to keep the common path strictly 1-tap; users can add an optional note anytime via Tonight's `Edit supper plan` handoff.

5. **Atomic `sourceNonCooking` extension on `POST /api/schedule/move`:**
   - Add optional `sourceNonCooking: NonCookingPlanDto | null` to `MoveScheduleDto` in `specs/openapi.yaml` while preserving `sourceDisposition: 'order_in' | null` for backwards compatibility.
   - Server validation rules for `sourceNonCooking`: only valid when `intent === 'tomorrow'`; `kind` must be `order_in`, `eating_out`, or `custom` (`mystery` is rejected with `400`); `customLabel` is trimmed, required non-blank for `custom`, and capped at 80 Unicode scalar values (reusing the exact non-cooking normalization helper used by day validation). If both `sourceNonCooking` and `sourceDisposition` are sent, `sourceNonCooking` takes precedence (or rejected if conflicting; simplest invariant: `sourceNonCooking` is preferred and client sends only `sourceNonCooking` for new flows, keeping legacy `sourceDisposition: 'order_in'` working).
   - _Alternative rejected:_ Running `moveTomorrow` followed by a separate `saveNonCookingDay` HTTP call would introduce a two-request partial-failure window where the recipe moved to tomorrow while today became blank instead of `Eating out` / `Supper at Grandma's`.

6. **Direct-to-Step-2 callers (`canGoBack` prop):**
   - Pass `canGoBack` (`true` on Home multi-step Plan B; `false` on Planner and Recipes direct-to-Step-2 confirmation where `×` already dismisses the dialog).
   - On `PlanningPivotSheet` → `NonCookingDaySheet`, pass an optional `onBack` handler so `NonCookingDaySheet` shows `[← Back] [×]` when opened from `PlanningPivotSheet` (returning to Planner options) and only `[×]` when opened directly from Tonight's `Edit supper plan` handoff.

## First Observable Slice

The smallest end-to-end slice exercising every seam:

1. Update `MoveScheduleDto` in `specs/openapi.yaml` with `sourceNonCooking`, regenerate Kiota client (`pwa/src/lib/api/generated/`), update MSW move handler (`pwa/src/mocks/`), and implement atomic `sourceNonCooking` persistence + validation in `ScheduleService.cs` with xUnit coverage.
2. Build `PivotSheetShell` and migrate `SkipRecoveryDialog` (Steps 1 & 2, inline `Made plans`, terracotta-bar meal context, concise action dates, Hearth-highlighted `Move to <date>`, top-right `[← Back] [×]`) wired into `HomeCommandCenter` for `order_in`, `eating_out`, and `custom` plans.
3. Migrate sibling sheets `PlanningPivotSheet` (with planned recipe headline and 5 compact actions) and `NonCookingDaySheet` (Era 3 opaque shell, `48px` controls, optional top-right `← Back`), then verify all three sheets in Vitest and Playwright (`412 × 915` Pixel 10 zero-scroll, `320px`/`200%` reflow, and `assertCookbookVisualA11y` in Standard AA and High Contrast AAA).

## State, Concurrency and Recovery

- **Home `RecoveryFlowState`:** Generalize `step2` non-cooking intent to `{ kind: 'step2'; intent: 'non_cooking'; nonCooking: NonCookingPlanDto; pendingRecipe: ScheduleRecipeDto } | { kind: 'step2'; intent: 'pick_else'; pendingRecipe: ScheduleRecipeDto }`.
- **Draft preservation:** Keep `customPlanDraft` in `SkipRecoveryDialog` (or lifted in `HomeCommandCenter` while open) so tapping `← Back` from Step 2 returns to Step 1 with `Made plans` selected and the draft intact; closing the dialog resets the draft.
- **Pending guards:** While `pending` is true, disable `Back`, `Close`, backdrop dismissal, Escape, all disposition buttons, and the inline `Made plans` controls; keep `aria-busy="true"`.
- **Single-attempt Tomorrow & Defer safety:** Retain `tomorrowAttempts` and `deferAttempts` WeakMap guards in `pwa/src/lib/planner/slotAssignment.ts` so lost replies never blindly replay a Tomorrow shift or deferral.
- **Save for Next Week / Remove with non-cooking backup:** For `Save for Next Week`, send `sourceNonCooking` inside `POST /api/schedule/defer` (`deferToFollowingWeek(slot, nonCooking)`) so the recipe defers to the following week and Tonight becomes recipe-free `Skipped` with the normalized non-cooking plan in one atomic commit. For `Remove` (`drop`), call `saveNonCookingDay(todayStr, nonCooking, { replaceRecipe: true })` (`POST /api/schedule/day/{date}/validate` with `{ status: 3, nonCooking, replaceRecipe: true }`) to atomically clear the planned recipe and persist the recipe-free non-cooking plan without a separate `DELETE` (preserving the 409 recipe-protection guard whenever `replaceRecipe` is omitted). Apply the confirmed `nonCooking` object to `useTodayStore` and `useWeekStore` so Tonight renders the matching Cookbook Bookmark card (`Eating out`, `Take Out`, or custom title) immediately.

## Persistence and Side Effects

- **Tomorrow + `sourceNonCooking`:** Persisted inside the existing single database transaction in `ScheduleService.MoveTomorrowAsync` (shifting the supper chain and setting today's source entry to `Skipped` with normalized `NonCookingKind` / `NonCookingLabel`). If any displaced slot is `Cooked` or preconditions fail, the transaction rolls back with `409` and today's planned recipe remains untouched.
- **Follow-up refreshes:** Retain existing post-commit grocery recomputation, week snapshot publication, and `refreshComplete` reporting for every affected week.

## Compatibility, Rollout and Reversal

- **Backwards-compatible OpenAPI addition:** `sourceNonCooking` is strictly optional on `MoveScheduleDto`; existing clients sending `sourceDisposition: 'order_in'` continue to work identically.
- **Test ID preservation:** Keep `recovery-dialog-title`, `recovery-close`, `recovery-go-back`, `recovery-action-order-in`, `recovery-action-pick-else`, `recovery-action-search`, `recovery-action-tomorrow`, `recovery-action-next-week`, `recovery-action-drop`, `pivot-sheet`, `pivot-*`, and `non-cooking-*`; add explicit `data-testid`s for `recovery-action-eating-out`, `recovery-action-made-plans`, `recovery-custom-plan-input`, and `recovery-custom-plan-next`.
- **Reversal:** No schema migrations are needed (non-cooking columns already exist on calendar entries); reverting the API property and UI components cleanly restores prior behavior.

## User Experience

- **Visual consistency:** All three sheets obey Era 3 Family Cookbook dual-mode tokens (`ink-body`, `ink-muted`, `hearth-*`, `garden-*`, `sunlight-*`, `chrome-line`, `icon-affordance`), `>= 12 CSS px` type floor, `>= 48 × 48 CSS px` touch targets, and `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body`.
- **Localization:** Add EN/FR keys for `Step {{current}} of {{total}}` / `Étape {{current}} sur {{total}}`, `Not cooking tonight` / `Pas de cuisine ce soir`, `Cook something else` / `Cuisiner autre chose`, `Made plans` / `On a des plans`, `Original meal` / `Repas initial`, `Next` / `Suivant`, and contextual Step 2 prompt variants (`before saving {{plan}}` / `avant d’enregistrer {{plan}}`).
- **Keyboard & focus:** Maintain logical tab order across header (`Back`, `Close`), Step 1 lanes, inline `Made plans` input (auto-focused on expansion), and Step 2 actions; preserve Escape dismissal when not busy and focus return on close.

## Risks and Deferrable Questions

- **Risk — Existing tests asserting full dates inside Step 2 buttons:** Unit or E2E tests in `pwa/src/components/home/SkipRecoveryDialog.test.tsx`, `pwa/e2e/tomorrow-push.spec.ts`, or `pwa/e2e/tonight-replacement-recovery.spec.ts` may match full date text (`Sunday, November 22`) on action buttons or assert `Go back` below the options. Mitigation: update affected assertions cleanly alongside the spec-aligned implementation while preserving full-date assertions on the Step 2 header context.
- **Risk — `320px` narrow viewport width with 3-up `Not cooking tonight` tiles:** Long French labels (`À emporter`, `Au resto`, `On a des plans`) in 3 equal columns on `320px` could wrap tightly. Mitigation: use `grid-cols-3` at `>= 360px` (`min-[360px]:grid-cols-3`) and graceful wrapping / `grid-cols-1` below `360px` or at `200%` text scaling, verified via Playwright `320px` / `200%` reflow checks.
