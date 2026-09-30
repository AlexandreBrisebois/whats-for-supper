# Current feature specification catalog

This index expands every stable ID in [`docs/feature-inventory.md`](../../docs/feature-inventory.md) into the three active specification artifacts required by the repository workflow. These are **baseline proposals for future change control**: they document current capability boundaries and do not authorize implementation.

Each packet uses behavior-first derivation with accelerated cadence:

- `requirements.md` defines observable outcomes, scope, preserved behavior, and open questions;
- `design.md` maps current ownership, interfaces, state flow, failure recovery, and verification; and
- `tasks.md` provides a gated, dependency-ordered workflow for a later approved change rather than claiming shipped behavior is unfinished.

Before selecting any task, re-verify its current-source paths and approve the requested behavioral delta. OpenAPI remains authoritative for API contracts.

## Coverage

| ID | Feature | Requirements | Design | Tasks |
|---|---|---|---|---|
| ID-01 | Shared household authentication | [requirements](id-01-shared-household-authentication/requirements.md) | [design](id-01-shared-household-authentication/design.md) | [tasks](id-01-shared-household-authentication/tasks.md) |
| ID-02 | Member onboarding and switching | [requirements](id-02-member-onboarding-switching/requirements.md) | [design](id-02-member-onboarding-switching/design.md) | [tasks](id-02-member-onboarding-switching/tasks.md) |
| ID-03 | Household member administration and invitations | [requirements](id-03-member-administration-invitations/requirements.md) | [design](id-03-member-administration-invitations/design.md) | [tasks](id-03-member-administration-invitations/tasks.md) |
| HOME-01 | Tonight's meal status | [requirements](home-01-tonights-meal-status/requirements.md) | [design](home-01-tonights-meal-status/design.md) | [tasks](home-01-tonights-meal-status/tasks.md) |
| HOME-02 | Empty-night fallback | [requirements](home-02-empty-night-fallback/requirements.md) | [design](home-02-empty-night-fallback/design.md) | [tasks](home-02-empty-night-fallback/tasks.md) |
| HOME-03 | Changed-plan recovery | [requirements](home-03-changed-plan-recovery/requirements.md) | [design](home-03-changed-plan-recovery/design.md) | [tasks](home-03-changed-plan-recovery/tasks.md) |
| HOME-04 | GOTO fallback rotation | [requirements](home-04-goto-fallback-rotation/requirements.md) | [design](home-04-goto-fallback-rotation/design.md) | [tasks](home-04-goto-fallback-rotation/tasks.md) |
| PLAN-01 | Week navigation and status | [requirements](plan-01-week-navigation-status/requirements.md) | [design](plan-01-week-navigation-status/design.md) | [tasks](plan-01-week-navigation-status/tasks.md) |
| PLAN-02 | Meal assignment and replacement | [requirements](plan-02-meal-assignment-replacement/requirements.md) | [design](plan-02-meal-assignment-replacement/design.md) | [tasks](plan-02-meal-assignment-replacement/tasks.md) |
| PLAN-03 | Schedule movement and exceptions | [requirements](plan-03-schedule-movement-exceptions/requirements.md) | [design](plan-03-schedule-movement-exceptions/design.md) | [tasks](plan-03-schedule-movement-exceptions/tasks.md) |
| PLAN-04 | Family voting cycle | [requirements](plan-04-family-voting-cycle/requirements.md) | [design](plan-04-family-voting-cycle/design.md) | [tasks](plan-04-family-voting-cycle/tasks.md) |
| PLAN-05 | Automatic schedule maintenance | [requirements](plan-05-automatic-schedule-maintenance/requirements.md) | [design](plan-05-automatic-schedule-maintenance/design.md) | [tasks](plan-05-automatic-schedule-maintenance/tasks.md) |
| GROC-01 | Derived weekly grocery list | [requirements](groc-01-derived-weekly-grocery-list/requirements.md) | [design](groc-01-derived-weekly-grocery-list/design.md) | [tasks](groc-01-derived-weekly-grocery-list/tasks.md) |
| GROC-02 | Collaborative shopping state | [requirements](groc-02-collaborative-shopping-state/requirements.md) | [design](groc-02-collaborative-shopping-state/design.md) | [tasks](groc-02-collaborative-shopping-state/tasks.md) |
| GROC-03 | Ingredient aisle correction | [requirements](groc-03-ingredient-aisle-correction/requirements.md) | [design](groc-03-ingredient-aisle-correction/design.md) | [tasks](groc-03-ingredient-aisle-correction/tasks.md) |
| DISC-01 | Swipe discovery queue | [requirements](disc-01-swipe-discovery-queue/requirements.md) | [design](disc-01-swipe-discovery-queue/design.md) | [tasks](disc-01-swipe-discovery-queue/tasks.md) |
| DISC-02 | Household matching feedback | [requirements](disc-02-household-matching-feedback/requirements.md) | [design](disc-02-household-matching-feedback/design.md) | [tasks](disc-02-household-matching-feedback/tasks.md) |
| DISC-03 | Discoverability controls | [requirements](disc-03-discoverability-controls/requirements.md) | [design](disc-03-discoverability-controls/design.md) | [tasks](disc-03-discoverability-controls/tasks.md) |
| SEARCH-01 | Conversational hybrid search | [requirements](search-01-conversational-hybrid-search/requirements.md) | [design](search-01-conversational-hybrid-search/design.md) | [tasks](search-01-conversational-hybrid-search/tasks.md) |
| SEARCH-02 | Browse and incremental results | [requirements](search-02-browse-incremental-results/requirements.md) | [design](search-02-browse-incremental-results/design.md) | [tasks](search-02-browse-incremental-results/tasks.md) |
| SEARCH-03 | Faceted filters | [requirements](search-03-faceted-filters/requirements.md) | [design](search-03-faceted-filters/design.md) | [tasks](search-03-faceted-filters/tasks.md) |
| SEARCH-04 | Context-aware search | [requirements](search-04-context-aware-search/requirements.md) | [design](search-04-context-aware-search/design.md) | [tasks](search-04-context-aware-search/tasks.md) |
| LIB-01 | Immersive library browsing | [requirements](lib-01-immersive-library-browsing/requirements.md) | [design](lib-01-immersive-library-browsing/design.md) | [tasks](lib-01-immersive-library-browsing/tasks.md) |
| LIB-02 | Recipe detail and metadata | [requirements](lib-02-recipe-detail-metadata/requirements.md) | [design](lib-02-recipe-detail-metadata/design.md) | [tasks](lib-02-recipe-detail-metadata/tasks.md) |
| LIB-03 | Recipe actions | [requirements](lib-03-recipe-actions/requirements.md) | [design](lib-03-recipe-actions/design.md) | [tasks](lib-03-recipe-actions/tasks.md) |
| LIB-04 | Recipe imagery and provenance | [requirements](lib-04-recipe-imagery-provenance/requirements.md) | [design](lib-04-recipe-imagery-provenance/design.md) | [tasks](lib-04-recipe-imagery-provenance/tasks.md) |
| LIB-05 | Soft deletion and recycle bin | [requirements](lib-05-soft-deletion-recycle-bin/requirements.md) | [design](lib-05-soft-deletion-recycle-bin/design.md) | [tasks](lib-05-soft-deletion-recycle-bin/tasks.md) |
| LIB-06 | Portable recipe sharing | [requirements](lib-06-portable-recipe-sharing/requirements.md) | [design](lib-06-portable-recipe-sharing/design.md) | [tasks](lib-06-portable-recipe-sharing/tasks.md) |
| CAP-01 | Photo capture | [requirements](cap-01-photo-capture/requirements.md) | [design](cap-01-photo-capture/design.md) | [tasks](cap-01-photo-capture/tasks.md) |
| CAP-02 | URL capture and PWA share target | [requirements](cap-02-url-capture-share-target/requirements.md) | [design](cap-02-url-capture-share-target/design.md) | [tasks](cap-02-url-capture-share-target/tasks.md) |
| CAP-03 | Description-based creation | [requirements](cap-03-description-creation/requirements.md) | [design](cap-03-description-creation/design.md) | [tasks](cap-03-description-creation/tasks.md) |
| CAP-04 | Recipe bundle import | [requirements](cap-04-recipe-bundle-import/requirements.md) | [design](cap-04-recipe-bundle-import/design.md) | [tasks](cap-04-recipe-bundle-import/tasks.md) |
| CAP-05 | Duplicate prevention | [requirements](cap-05-duplicate-prevention/requirements.md) | [design](cap-05-duplicate-prevention/design.md) | [tasks](cap-05-duplicate-prevention/tasks.md) |
| CAP-06 | Import progress and completion | [requirements](cap-06-import-progress-completion/requirements.md) | [design](cap-06-import-progress-completion/design.md) | [tasks](cap-06-import-progress-completion/tasks.md) |
| CAP-07 | Import failure recovery | [requirements](cap-07-import-failure-recovery/requirements.md) | [design](cap-07-import-failure-recovery/design.md) | [tasks](cap-07-import-failure-recovery/tasks.md) |
| COOK-01 | Step-by-step Cook's Mode | [requirements](cook-01-step-by-step-cooks-mode/requirements.md) | [design](cook-01-step-by-step-cooks-mode/design.md) | [tasks](cook-01-step-by-step-cooks-mode/tasks.md) |
| COOK-02 | In-cook recipe feedback | [requirements](cook-02-in-cook-feedback/requirements.md) | [design](cook-02-in-cook-feedback/design.md) | [tasks](cook-02-in-cook-feedback/tasks.md) |
| QUAL-01 | Import issue reporting | [requirements](qual-01-import-issue-reporting/requirements.md) | [design](qual-01-import-issue-reporting/design.md) | [tasks](qual-01-import-issue-reporting/tasks.md) |
| QUAL-02 | Contextual re-import | [requirements](qual-02-contextual-reimport/requirements.md) | [design](qual-02-contextual-reimport/design.md) | [tasks](qual-02-contextual-reimport/tasks.md) |
| QUAL-03 | Processing-language configuration | [requirements](qual-03-processing-language/requirements.md) | [design](qual-03-processing-language/design.md) | [tasks](qual-03-processing-language/tasks.md) |
| PREF-01 | Interface localization | [requirements](pref-01-interface-localization/requirements.md) | [design](pref-01-interface-localization/design.md) | [tasks](pref-01-interface-localization/tasks.md) |
| PREF-02 | Installable PWA and device integration | [requirements](pref-02-installable-pwa-device-integration/requirements.md) | [design](pref-02-installable-pwa-device-integration/design.md) | [tasks](pref-02-installable-pwa-device-integration/tasks.md) |
| PREF-03 | Responsive and accessible interaction | [requirements](pref-03-responsive-accessible-interaction/requirements.md) | [design](pref-03-responsive-accessible-interaction/design.md) | [tasks](pref-03-responsive-accessible-interaction/tasks.md) |
| PLAT-01 | Shared real-time state | [requirements](plat-01-shared-real-time-state/requirements.md) | [design](plat-01-shared-real-time-state/design.md) | [tasks](plat-01-shared-real-time-state/tasks.md) |
| PLAT-02 | Background workflow engine | [requirements](plat-02-background-workflow-engine/requirements.md) | [design](plat-02-background-workflow-engine/design.md) | [tasks](plat-02-background-workflow-engine/tasks.md) |
| PLAT-03 | Recipe search indexing | [requirements](plat-03-recipe-search-indexing/requirements.md) | [design](plat-03-recipe-search-indexing/design.md) | [tasks](plat-03-recipe-search-indexing/tasks.md) |
| PLAT-04 | Ingredient categorization | [requirements](plat-04-ingredient-categorization/requirements.md) | [design](plat-04-ingredient-categorization/design.md) | [tasks](plat-04-ingredient-categorization/tasks.md) |
| PLAT-05 | Storage, backup, and recovery | [requirements](plat-05-storage-backup-recovery/requirements.md) | [design](plat-05-storage-backup-recovery/design.md) | [tasks](plat-05-storage-backup-recovery/tasks.md) |
| PLAT-06 | Managed demo mode | [requirements](plat-06-managed-demo-mode/requirements.md) | [design](plat-06-managed-demo-mode/design.md) | [tasks](plat-06-managed-demo-mode/tasks.md) |
| PLAT-07 | Health, authentication, and response conventions | [requirements](plat-07-health-auth-response-conventions/requirements.md) | [design](plat-07-health-auth-response-conventions/design.md) | [tasks](plat-07-health-auth-response-conventions/tasks.md) |

## Catalog-wide change rules

1. Update the affected requirements before changing derived design or tasks.
2. Preserve stable IDs when meaning is unchanged; add a new ID rather than silently reusing one for a different outcome.
3. Review cross-feature handshakes explicitly when a change affects shared identity, SSE, workflow, search, grocery, import, localization, persistence, or deployment behavior.
4. Do not treat current code, tests, archived specifications, or this baseline as independent authorization to implement a change.
5. Record actual verification and environment limitations in the selected feature task; a catalog link or static check is not runtime evidence.
