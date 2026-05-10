# Requirements Document

## Vision

Planner week voting is a week-level coordination action. The planner action row must be the single place where Mom opens, reopens, closes, and nudges family voting. The meal-slot pivot must stay focused on the selected slot so the user never has to wonder whether "Ask the family" applies to one dinner or the whole week.

## Product Decisions

- Voting actions are scoped to the entire week, never to an individual planner day slot.
- The planner action row owns `Ask the Family`, `Voting live`, `Close Voting`, and `Nudge family`.
- `Nudge family` replaces `Ask the Family` in the first action position when voting is live.
- `PlanningPivotSheet` owns only slot actions: Quick find, Search library, and Remove recipe when a recipe exists.
- Reopening voting for a locked week is allowed when `status === 2` and the week is not in the past.
- Existing nudge behavior must be preserved: generated voting link, copy-to-clipboard, native share when available, and copied feedback.
- No OpenAPI, database, or generated client change is required. Existing schedule status and voting endpoints remain authoritative.

## Pre-Mortem

- **Ambiguous scope:** If Ask/Nudge stay inside the pivot, users can interpret family voting as meal-slot voting. The spec removes these controls from the pivot entirely.
- **State drift:** If planner actions read a separate local voting flag, locked and voting-open states can desync from the backend. The planner must derive action visibility from `weekStore.status`.
- **Past-week reopening:** If `status === 2` always shows Ask, historical weeks can be reopened accidentally. The CTA must also require `!weekIsPast`.
- **Nudge regression:** Moving Nudge can drop generated links, copy/share support, or copied feedback. The planner-level nudge component must preserve these states and test IDs.
- **Test fragility:** Text locators would break localization and copy edits. E2E coverage must use `page.getByTestId(...)` only.
- **Dead end:** When voting is live, the user needs both a status indicator and a clear next action. The action row must show `Voting live`, `Close Voting`, and `Nudge family` together.
- **Race condition:** The nudge dialog link is generated asynchronously. Tests must wait for the dialog/link state rather than assuming the link is available immediately.

## AC Index

### AC1: Meal-Slot Pivot Contains Only Slot Actions

1. WHEN `PlanningPivotSheet` is open for any day, THEN it SHALL render `pivot-quick-find` and `pivot-search-library`.
2. WHEN the selected day has a recipe, THEN it SHALL render `pivot-remove-recipe`.
3. WHEN the selected day has no recipe, THEN it SHALL NOT render `pivot-remove-recipe`.
4. THE pivot SHALL NOT render `pivot-ask-family`, `pivot-nudge-family`, or `pivot-nudge-dialog` in any voting state.
5. THE pivot props SHALL NOT include `onAskFamily` or `isVotingOpen`.

### AC2: Planner Action Row Opens Or Reopens Week Voting

1. WHEN `weekStore.status === 0` and the week is not past, THEN the planner action row SHALL render `ask-family-cta`.
2. WHEN `weekStore.status === 2` and the week is not past, THEN the planner action row SHALL render `ask-family-cta`.
3. WHEN `weekStore.status === 1`, THEN the planner action row SHALL NOT render `ask-family-cta`.
4. WHEN the week is past, THEN the planner action row SHALL NOT render `ask-family-cta` for any status.
5. WHEN the user activates `ask-family-cta`, THEN the planner SHALL call the existing `useWeekStore.getState().openVoting()` flow for the current week offset.

### AC3: Planner Action Row Owns Live Voting Actions

1. WHEN `weekStore.status === 1`, THEN the planner action row SHALL render `voting-status-badge`.
2. WHEN `weekStore.status === 1`, THEN the planner action row SHALL render `close-voting-btn`.
3. WHEN `weekStore.status === 1`, THEN the planner action row SHALL render `nudge-family-cta`.
4. WHEN `weekStore.status === 1`, THEN `nudge-family-cta` SHALL be the first interactive control in `planner-action-row`, occupying the same position used by `ask-family-cta` when voting can be opened.
5. WHEN `weekStore.status !== 1`, THEN the planner action row SHALL NOT render `voting-status-badge`, `close-voting-btn`, or `nudge-family-cta`.
6. WHEN the user activates `close-voting-btn`, THEN the planner SHALL call the existing `useWeekStore.getState().lockWeek()` flow.

### AC4: Planner-Level Nudge Preserves Existing Behavior

1. WHEN the user activates `nudge-family-cta`, THEN the planner SHALL open `planner-nudge-dialog`.
2. WHEN `planner-nudge-dialog` opens, THEN the planner SHALL call `getVotingLink(window.location.origin)`.
3. WHEN `getVotingLink` returns a non-empty URL, THEN the dialog SHALL display that URL.
4. WHEN `getVotingLink` returns an empty value, THEN the dialog SHALL fall back to `${window.location.origin}/discovery`.
5. WHEN the user activates `planner-nudge-copy`, THEN the planner SHALL write the displayed URL to `navigator.clipboard.writeText`.
6. WHEN clipboard write succeeds, THEN the dialog SHALL render `planner-nudge-copied-feedback`.
7. WHEN `navigator.share` exists, THEN the dialog SHALL render `planner-nudge-share`.
8. WHEN `navigator.share` does not exist, THEN the dialog SHALL NOT render `planner-nudge-share`.
9. WHEN the user activates `planner-nudge-share`, THEN the planner SHALL call `navigator.share` with the generated URL.
10. WHEN the user closes the dialog, THEN `planner-nudge-dialog` SHALL be removed without changing voting status.

### AC5: Testability And Determinism

1. ALL new planner E2E interactions SHALL use `page.getByTestId(...)`.
2. ALL new interactive or state-bearing planner voting elements SHALL have stable `data-testid` values listed in `design.md`.
3. Playwright coverage SHALL use static schedule fixture data with deterministic ISO dates.
4. Unit/component tests SHALL mock `getVotingLink`, `navigator.clipboard.writeText`, and `navigator.share`.
5. No test SHALL rely on dynamic current dates without an explicit fixed clock or static fixture date.

## Glossary

- **Planner action row:** The `planner-action-row` area near the top of the planner week view.
- **PlanningPivotSheet:** The meal-slot bottom sheet opened from a day card.
- **Week status:** `0 = Draft`, `1 = VotingOpen`, `2 = Locked`.
- **Past week:** A planner week whose Sunday date is earlier than `getTodayString()`.
- **Ask the Family:** CTA that opens or reopens voting for the current planner week.
- **Nudge family:** CTA that opens sharing controls for the current week voting link.
- **Voting link:** URL returned by `getVotingLink(baseUrl)`, falling back to `/discovery` when no invite token is available.
