# Design

## Context and Existing Ownership

See [proposal](proposal.md) for the experiment boundary and [delta](specs/meal-planning/spec.md) for the candidate's behavior. A short design records the visual candidate, calendar consumption and evaluation method before implementation.

`pwa/src/app/(app)/planner/page.tsx` renders `PlannerDayCard` without date-relative props. It already has an action-driven sage `successDay` ring and separate drag feedback. Those signals must retain their meanings. `weekStore.calendar` carries schedule context; `todayStore` owns a validated calendar, monotonic freshness anchor, invalidation and `ensureCalendar`. `deployment-calendar.ts` owns civil-date validation and anchor freshness. `useScheduleStream` invalidates and refreshes on pageshow/visibility resume. These owners establish the available mechanisms, not runtime proof for this experiment.

The separate fixed-date drag plan moves date labels outside draggable recipe surfaces. This experiment needs no drag rewrite: style the current date slot wrapper initially, then retain that ownership if the fixed-row plan lands first or later. Never key temporal appearance by recipe ID, moved `_uiId`, status or selected week offset.

## Decisions and Tradeoffs

- **One candidate, proportionate experiment.** Baseline versus candidate comparisons use identical content, viewport, locale and captured date. No feature-flag platform, analytics events, new settings or randomized allocation. Keep changes local/reversible during review; publication is separate work.
- **Today:** start with a 2 CSS px terracotta-600 border and a visible `Today` / `Aujourd’hui` label near the date, using existing readable text tokens. Expose the date as current with `aria-current="date"` on its date element. Reserve equivalent border space to avoid changing row geometry. No larger card, pulse, checkmark or sage success field. Measure actual-background border/text contrast before adopting this candidate.
- **Past:** reduce decorative shadow/glow and use a flatter existing cream surface. Keep date, recipe and action text readable; do not reduce parent opacity, shrink text, desaturate the whole row or strike through its contents. Future dates keep their existing normal surface. A quieter surface is a visual hypothesis, not an assertion that people will perceive the difference.
- **State precedence:** temporal treatment is a base date/slot treatment. Focus, drag targeting, pending/error feedback and the existing action-success ring remain independently visible. Today never replaces a focus indicator. Past styling never changes whether a control is enabled. Both cooked and uncooked dates can be past; no new cooked presentation is introduced.
- **Use shared calendar state.** Subscribe reactively to `todayStore` calendar/anchor/version. Validate displayed date values with existing civil-date helpers, then compare ISO civil dates to fresh `calendar.today`. Use `calendarIsFresh`/the existing monotonic anchor, not browser midnight. Neutral treatment is the fallback; do not substitute a stale `weekStore.calendar` when the shared context has been invalidated.

## First Observable Slice

Load a Wednesday schedule containing an uncooked Monday meal, an empty Tuesday, a Wednesday recipe and later future dates. With reliable server calendar context, Wednesday has Today plus border, Monday/Tuesday have flatter surfaces, and future rows retain their normal appearance. Render through the actual Planner and locale modules; API mocks supply the unchanged calendar/schedule envelope. Verify that this render submits no mutation and that the uncooked meal's state and actions remain intact.

## State, Concurrency and Recovery

Temporal appearance is derived display state, not persisted schedule state. On entry, consume shared fresh context or call the existing deduplicated `ensureCalendar`; do not add one fetch per row. Reuse the shared resume invalidation path. A single Planner-local expiry effect may observe the anchor's remaining monotonic lifetime to clear emphasis and request shared refresh at the boundary. Clean it up on unmount/context replacement; do not introduce polling or a second calendar store. Expiry or refresh failure neutralizes only the temporal cues and leaves day content intact.

On refreshed context, recompute from actual displayed civil dates. This handles old content retained during week loading and Sunday-to-Monday transitions without relabeling an arbitrary row. No optimistic mutation, cooking completion, automatic navigation or schedule rewrite is triggered by temporal classification. Any existing side effects of shared refresh retain their existing owners; do not broaden this experiment into calendar-lifecycle repairs.

## User Experience and Experiment Review

Capture matched baseline/candidate views for Monday, Wednesday and Sunday; include a past uncooked recipe, a cooked date, a non-cooking plan and an empty date. Include previous/next week, long names, EN/FR, phone and iPad layouts. This tests the reported weekend concern instead of relying only on a Monday view with no past days in the current week.

During a short qualitative review, ask the reviewer to identify today, explain what a quieter past row means, identify whether a specific past meal was cooked, and open/change that meal through its existing action. Record what they actually do/say, with attribution; distinguish designer judgment from user research. The experiment supports adoption only if today is easier to locate, past content remains readable/actionable and the treatment is not mistaken for completion or disabled state. Reject or revise the treatment if it causes those misunderstandings or fails affected contrast checks. With no reviewer evidence, report the hypothesis as unvalidated rather than claiming success.

Check label wrapping, 320 CSS px reflow, larger text and actual composited contrast. Normal text requires 4.5:1; the meaningful Today border requires 3:1 against adjacent surfaces. These are focused checks, not whole-app accessibility certification. Today is communicated by text as well as color, and `aria-current` does not imply a completed meal.

Deliver the comparison views and focused validation results with an observed/reported/hypothesized conclusion and a retain/revise/reject recommendation. Unavailable human review remains explicitly pending; implementation evidence alone does not establish a successful experiment. Any later accepted visual-language update should describe the reviewed result rather than promote this proposed candidate as shipped guidance.
