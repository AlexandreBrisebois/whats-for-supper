# Design

## Context and Existing Ownership

`TonightMenuCard` calls `HomeCommandCenter.startAction('step1')` for Change plan. `SkipRecoveryDialog` renders Take Out and Pick Something Else; the latter invokes `handleRecoveryAction('pick_else')`, opens `QuickFindModal`, then retains a chosen recipe for the existing disposition step. Planner already labels this deck Suggestions and offers Search library. `HomeCommandCenter.openTodaySearch()` builds the authoritative today URL for the ordinary pivot. `RecipesExperience` accepts `addToDay`, `weekOffset` and `referenceWeekStartDate`, reads the target slot on selection and invokes occupied-slot recovery when needed; successful targeted assignment currently returns to Planner.

`HomeCommandCenter` currently renders `QuickCaptureTrigger` after Tonight states and the voting nudge. The trigger is one link to Capture with established style and localization. The supplied screenshot matches the current two-choice Plan B sheet. These are source and screenshot observations, not a claim that every phone has been measured.

## Decisions and Tradeoffs

1. Add Search as a third choice in the planned-meal backup step, with a distinct action callback. Reuse the pivot Search URL shape and calendar retry behavior, but use the planned meal's captured `actionContext` after confirming it still identifies the displayed recipe/date. If Today has rolled over or that source changed, refresh and ask the person to begin from the current card instead of silently targeting another slot. Close the backup sheet only on successful navigation. This retains the meal being replaced across the handoff.
2. Keep Suggestions attached to `pick_else` and the existing `QuickFindModal`/Home disposition flow. Search follows the established Recipes targeted selection path, including its own occupied-slot recovery and Planner success destination. The two flows resolve a prior meal through different existing UI owners; combining them would duplicate recovery state and partial-success logic.
3. Move the single `QuickCaptureTrigger` before the conditional Tonight states in the normal Home content flow. Keep notices ahead of it and retain the existing Capture link/styles. Use DOM order, not CSS visual ordering, so reading and keyboard order match the screen.

## First Observable Slice

Planned Tonight → Change plan → Search → validated captured calendar/recipe context → `/recipes?focus=search&addToDay=<captured day>&weekOffset=0&referenceWeekStartDate=<captured monday>` → choose recipe → existing occupied-slot recovery and Planner result. The browser seam is Home navigation into unified Recipes and its mocked schedule/assignment boundary; no new endpoint or client generation is needed.

## State, Concurrency and Recovery

Opening Change plan, Suggestions or Search causes no meal mutation. Search navigation is gated by the captured authoritative calendar and displayed source meal; an unavailable calendar retains retry, while a changed source requires a fresh Change plan action. Once Recipes is entered, target occupancy is reread at selection time, so a newly occupied slot enters recovery. Closing either path before choosing leaves the plan unchanged. Suggestions retains Home's pending/disposition memory and duplicate-submission guards. Search inherits Recipes' separate target recovery and read-after-unknown-outcome behavior; it does not carry Home's `replacementSession` across navigation.

## User Experience

The planned-meal sheet presents Take Out, Suggestions and Search as distinct, localized, keyboard-operable choices. Suggestions describes its limited deck; Search describes library search, without implying instant replacement. The Capture tile appears before Tonight's planned card, empty pivot, saved-plan card and Cooked state, with one focus stop. On an ordinary supported phone at initial top position, its complete label and actionable tile should be visible. At 200% text or on a short screen the tile and meal actions may require scrolling; content must not clip, overlap the dock, hide status feedback or reduce touch targets to force simultaneous fit. Verify EN/FR wrapping and modal focus return.
