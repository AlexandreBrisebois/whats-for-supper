# Proposal

## Why

The planned meal's Change plan sheet says “Find Something Quick” while Planner already calls that five-card flow Suggestions and offers Search separately. Home's Capture a Recipe tile also sits after the tall Tonight card, so its entry can be missed on initial phone view. The supplied Library screenshot (`libfile_008410d2210881919cd93a54a1d5c343`, `2434.png`) shows the current Plan B tile and “Swap tonight's meal” subtitle.

## Outcome and Scope

On a planned Tonight card, Change plan SHALL offer Take Out, Suggestions and Search as clear alternatives. Suggestions keeps the existing Quick Find replacement choice. Search opens the unified Recipes planning flow for the captured planned meal date/slot; choosing a recipe uses the existing occupied-slot recovery. Capture a Recipe SHALL precede the Tonight meal or pivot in visual and document order, with the existing tile and action.

No plan changes on opening the sheet, Suggestions or Search. Existing disposition, assignment, cancellation, failure and partial-completion rules continue to own mutations. The ordinary pivot's Search, Mystery Quick Find, Planner actions and voting behavior are preserved. This change does not alter APIs, storage or recipe retrieval.

## What Changes

- Rename the planned-meal backup tile to localized Suggestions and align its supporting copy with the five-card flow.
- Add a localized Search choice that enters `/recipes` with today's day index, week offset zero and authoritative reference Monday, while preserving the existing Recipes planning and recovery behavior.
- Place the existing Capture a Recipe tile before the Tonight card or pivot in visual and DOM order, without duplicating it. Let the page scroll naturally on short screens or enlarged text.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tonight-meal-decisions`: planned-meal backup choice, contextual Search entry and Capture position/visibility.

## Impact

`HomeCommandCenter`, `SkipRecoveryDialog`, existing EN/FR locale strings, their focused tests, and Home browser acceptance are affected. `QuickFindModal` and unified Recipes planning entry remain reusable. The existing `openspec/changes/unify-recipe-browse-search` and `stabilize-recipes-search-layout` changes supply the Recipes contract and viewport constraints; this proposal does not edit their artifacts.
