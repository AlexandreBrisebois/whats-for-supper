# Proposal

## Why

The added Browse Filters row consumes scarce phone height, while its 740/860 px minimum stack height can push useful recipe content below short screens. Separate Go-To management also duplicates the recipe stars that users have chosen as the membership control. Home should help choose tonight’s meal through the established planner Search flow.

## Outcome and Scope

Revision of this active, implemented but unsynced change following the user’s October 29 decisions. Amend it in place to avoid two active changes prescribing opposite controls for the same surfaces; the directory name is historical. This proposal, design, deltas and new unchecked tasks replace the previous management-in-filters plan. Earlier implementation evidence is historical, not acceptance for this revision.

Deliver a one-toolbar Browse entry and a calm, cozy Home meal pivot. Users manage household Go-To membership by adding/removing recipe stars. Preserve existing saved memberships, backend filtering, ordinary capture, planner assignment/recovery and ready Go-To suggestions. The user approved implementation and sync/archive once required tests pass on October 29. No stage/unstage, commit, push, deployment or production testing is authorized.

## What Changes

- Replace Browse’s extra Filters row/flyout with an immediate Go-To Star toggle immediately right of the existing single All/Discovery mode toggle. Go-To membership intersects Discovery; it is neither ranking nor a third mode. Preserve cards/list, counts, pagination, refresh, retries and navigation.
- Remove the extra Filters row to recover space first, preserving the current preferred stack/card size on the normal phone viewport. Adapt size only when genuinely less viewport space is available; do not globally reduce preferred height or shrink all phones. Keep text/actions usable and verify normal-phone baseline dimensions separately from smaller-screen visibility, not just scrollIntoView success.
- Remove Go-To management disclosures from both filter surfaces, their pending-management list and dedicated Add a Go-To acquisition flow. Retain Search’s Go-To filter, recipe star controls, ordinary recipe capture and saved/pending data. Keep Settings management absent.
- Handle legacy management/capture destinations safely without reopening retired UI, repeating captures or losing pending processing/ready notifications.
- On Home’s unplanned pivot, replace Quick Find with Search using the existing meal-plan day-specific Search selection flow with today selected. Preserve its normal planner navigation. Search is not a new Home/Today mode.
- In the settled ordinary empty pivot, replace helper word GOTO with the same recipe Star icon and remove Choose GOTO recipes. Propose Search as primary and Order In as secondary under a larger fork-and-knife illustration local to that empty state. Order In records a non-cooking plan; it places no food order.
- Preserve actual ready-Go-To recipe photography and Make this tonight, truthful checking/pending/error feedback, and planned/non-cooking presentations. Cover EN/FR, short iPhone/Android viewports, iPad, enlarged text, focus/pressed state, touch targets, reduced motion and safe areas.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: immediate toolbar membership filter and useful short-screen Browse composition; preserve server filtering and collection navigation.
- `recipe-search`: retain Go-To filter without management and reuse existing planner context from Home.
- `tonight-meal-decisions`: star-owned membership, retired management compatibility and state-specific Home invitation/CTA hierarchy.

`meal-assignment` remains the existing assignment/recovery owner; no new assignment semantics or API changes are proposed.

## Impact

Frontend owners: Browse page and BrowseFiltersSheet; RecipeFiltersSheet and Search page; FamilyGOTOSettings/GotoAcquisitionSheet consumers; TonightPivotCard/HomeCommandCenter; MinimalCapture and shared route constants; EN/FR catalogs and focused tests. Remove retired components only after confirming no remaining consumers. Do not globally alter TonightRecipeImage fallbacks or shared image geometry, tokens or planned-card actions.

The already implemented GET `/api/recipes` `gotoOnly` and POST `/api/recipes/search` membership filtering remain unchanged, including generated client, persisted household list and continuation semantics. No backend endpoint, migration, data deletion or new dependency is needed. Preserve unrelated concurrent work on the current branch. See tasks.md for implementation acceptance and the distinction between historical planning checks and current implementation evidence.
