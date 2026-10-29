# Flow: GOTO Recipe Lifecycle

GOTOs are the household's configured fallback recipes. Membership is distinct from rating, Discovery eligibility and recipe readiness. `GoToService` owns the persisted list and ready active choice; filtering does not assign a meal.

## Choose and manage

Home's ordinary empty supper-choice pivot shows a brief star explanation and **Choose GOTO recipes** after its initial active-GOTO read settles. The link opens unfiltered `/browse-all-stack`, where recipe detail offers a labelled GOTO star. It does not assert that the configured list is empty or that a recipe is ready.

Browse and Search expose GOTO inside **Filters**, with **Manage GOTOs** initially collapsed. Management shows the full saved collection, including pending entries, independently of the result filters. Profile Settings no longer hosts this collection.

- Filter changes are drafts until Apply. Close, Escape or backdrop dismissal discards an unapplied draft.
- Confirmed list changes save immediately through `PUT /api/goto`; dismissing Filters does not undo them.
- A failed list read shows Retry without claiming an empty collection. A failed removal keeps the confirmed item and permits another removal attempt.
- Confirmed local membership changes refresh an applied-GOTO collection from its first page, retaining the current Browse mode or Search context. If that read fails, Retry reads again without repeating the save.

## Add a recipe

**Add a GOTO** closes Filters and opens acquisition choices in a separate sheet. Dismissing it creates no recipe and restores focus to Filters.

| Choice | Destination |
|---|---|
| Search the Library | `/recipes`; inspect a recipe and use its GOTO star |
| Describe a Dish | `/capture?intent=goto&mode=describe` |
| Take a Photo | `/capture?intent=goto&mode=photo` |

Recipe detail displays a star and GOTO label in both states, with pressed state when configured. Saving disables the control until the request settles and reports success or failure. Removing membership retains the recipe.

## Capture and readiness

GOTO capture creates/registers a pending entry through the existing capture and list-save operations. Its success screen remains available until explicit **Back to GOTOs**, which opens `/browse-all-stack?gotoOnly=true&manageGoto=true`: GOTO filtering is applied, Filters opens and management expands. Registration does not establish synthesis completion or readiness.

Pending entries remain manageable even when the ready-only filtered result is empty. Existing recipe-ready notifications prompt management to reread the collection; this navigation change adds no readiness or cross-device invalidation guarantee.

## Tonight and filtering

Home retains its ready active-GOTO policy. Make this tonight performs the existing Tonight assignment; Quick Find and Order In remain immediate alternatives. Planned, ready, represented checking/pending and saved Mystery presentations retain their existing content without the introductory helper.

GET `/api/recipes?gotoOnly=true` intersects configured membership with existing library eligibility before counting and paging. Search's `filters.gotoOnly` applies before lexical/vector candidate limits and intersects text, Focus, Similar and other filters. Empty membership yields no ordinary fallback. Ranked continuation retains its frozen sequence while rechecking current membership; new members require a fresh search.

The authoritative acceptance scenarios are in the OpenSpec `recipe-library`, `recipe-search` and `tonight-meal-decisions` capabilities and the active `move-goto-management-to-recipe-filters` change until synchronization.
