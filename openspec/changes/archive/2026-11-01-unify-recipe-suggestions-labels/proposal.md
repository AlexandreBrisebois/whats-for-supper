# Proposal

## Why

People encounter “Quick Find” and “Quick replace” for the same recipe-suggestion flow. Source inspection also shows “Quick replace” on empty planner days, where nothing is being replaced, and a hard-coded English “Quick find” modal heading. One familiar name makes the entry and destination easier to recognise.

## Outcome and Scope

Use **Suggestions** in English and French for the existing in-app suggestion entry points and shared modal heading. Localize the planner supporting text and describe its variable result count truthfully. Preserve the existing planning context, selection, dismissal and replacement recovery.

Also align the installed-app shortcut’s hard-coded copy with its existing Search implementation: name and short name “Search”, description “Search your recipe library”, destination `/recipes` unchanged.

This is a copy-only increment. It excludes ranking, API contracts, navigation, recovery logic, styling, component/test-ID renames and broader modal localization. Home’s ordinary unplanned Search action remains unchanged. Existing specification references to Quick Find/Quick Replace remain valid internal suggestion-flow names. The user subsequently approved one minimal styling exception: emergency wrapping for the longer Home Suggestions label after required enlarged-text checks exposed overflow.

## What Changes

- Planner suggestion entry: “Quick replace” / “Remplacement rapide” becomes “Suggestions”.
- Retained Home suggestion entry: “Quick Find” / “Recherche” becomes “Suggestions”.
- Shared suggestion modal heading: “Quick find” becomes localized “Suggestions”.
- Planner supporting text becomes exactly “Browse up to 5 recipe suggestions” / “Parcourez jusqu’à 5 suggestions de recettes”.
- Keep Search library distinct and retain existing contextual headings, target dates and replacement consequences.
- Rename the installed-app Quick Find / Find shortcut to Search / Search and describe its existing recipe-library search destination accurately. Preserve Capture and all shortcut destinations, icons and access gates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-assignment`: Own the shared public suggestion terminology and localized planner supporting text across existing in-app callers, without changing assignment or recovery semantics.
- `app-installation`: Align the installed recipe-search shortcut’s name, short name and description with its existing `/recipes` implementation.

## Impact

Expected implementation owners are `pwa/src/components/planner/PlanningPivotSheet.tsx`, `pwa/src/components/planner/QuickFindModal.tsx`, `pwa/src/components/home/TonightPivotCard.tsx`, `pwa/src/locales/{en,fr}/common.json` and `pwa/src/lib/baseManifest.json`; focused component/manifest tests and existing Home/Planner E2E copy expectations are affected. Update the current terminology explanation in `docs/user-guide.md`. No backend, OpenAPI, generated client, persistence or dependency changes are needed.
