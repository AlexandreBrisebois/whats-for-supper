# Design

## Context and Existing Ownership

See [proposal](proposal.md) for the bounded copy change. Source-observed entry owners are `PlanningPivotSheet.tsx` (`planner.quickFindAction`) and `TonightPivotCard.tsx` (`home.quickFind`, only on saved Mystery nights in its current Home caller). `QuickFindModal.tsx` contains the hard-coded destination heading. `HomeCommandCenter.tsx` already routes ordinary unplanned Home Search through `openTodaySearch`; Mystery uses `startAction('quick_find')`. The installed-app shortcut in `baseManifest.json` also says Quick Find, but opens `/recipes`, a distinct Search destination.

`meal-assignment` owns the shared deck terminology. Its added copy requirements qualify existing Quick Find/Quick Replace references without renaming their behavioral contracts. Home Mystery state remains owned by `tonight-meal-decisions`. No ranking or recovery rule moves into the UI.

## Decisions and Tradeoffs

- Reuse the existing `planner.quickFindAction` and `home.quickFind` locale keys; change their English/French values and source fallbacks to Suggestions. Retain internal component names, callbacks, analytics identities and test IDs to avoid unrelated churn.
- Reuse an existing suggestion label key for the shared modal heading rather than introducing a duplicate label. Add a planner-specific localized supporting-text key because the present sentence is hard-coded and has a distinct meaning.
- Preserve the ordinary Home Search label and destination. Update only the installed shortcut’s name and short name to “Search” and description to “Search your recipe library” in `baseManifest.json`, retaining `/recipes`. The manifest endpoint composes shortcuts from this base, including identity-specific icon prefixes; verify the composed response as well as the base. A global replacement with Suggestions would mislabel Search as a suggestion deck.
- Preserve contextual titles and dates. The same entry label serves both planning and replacement; the surrounding context and existing recovery explain the consequence.
- Update only the current Quick Find/Quick Replace explanations in `docs/user-guide.md`. Historical evidence, archived specs and implementation names do not need renaming. Broader localization of modal controls is excluded.

## First Observable Slice

Open the planner options for an empty day, read the localized label and supporting text, open the existing deck and observe its matching heading, then dismiss without assignment. The affected seam is locale lookup → planner entry → existing modal. It requires no API/client/database modification. Extend the same copy across the occupied-day entry and Home Mystery entry while preserving their existing callbacks and recovery paths.

## User Experience

Use the exact strings in the [delta spec](specs/meal-assignment/spec.md). Keep Search library distinguishable from Suggestions. Inspect English/French at a narrow mobile viewport, including the longer French supporting text and small uppercase modal heading, for clipping and readable wrapping. Preserve controls, focus handling, touch targets and test IDs. Existing loading, empty, failed-read and exhausted-deck behavior stays in place; no new state or recovery UI is introduced.

Focused acceptance uses existing component tests with real locale resources where possible, plus affected existing Planner/Home E2E scenarios to verify entry, dismissal and unchanged target/recovery behavior. These checks establish the selected copy and preservation scenarios, not whole-app accessibility conformance or new backend qualification.

The manifest currently serves static English shortcut strings; this increment aligns that existing copy without introducing locale negotiation. Verify the served manifest advertises Search, and follow `/recipes` into the existing search surface. Source/manifest evidence cannot establish when an OS refreshes a previously installed shortcut; do not promise immediate launcher updates.

## Approved implementation adjustment

The required Home reflow checks exposed overflow of “Suggestions” at enlarged text sizes. On 2026-11-01 the user approved a minimal wrapping fix: allow emergency word wrapping in the existing Home suggestion/Search label span. Preserve all other styling, layout, controls and behavior.
