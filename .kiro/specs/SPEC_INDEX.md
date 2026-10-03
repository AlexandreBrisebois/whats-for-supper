# Specification index

This is the readable view of `spec-registry.yaml`, the canonical registry for active
and legacy WFS specification packages. Search it before creating or revising a spec.

New package folders use descriptive lowercase kebab-case names. Legacy prefixes remain
stable paths and are not a numbering scheme for new work.

## Current

| Name | Kind | Canonical package | Dependencies | Next action |
|---|---|---|---|---|
| Automatic schedule maintenance | capability-baseline | [Automatic schedule maintenance](plan-05-automatic-schedule-maintenance/) | — | — |
| Background workflow engine | capability-baseline | [Background workflow engine](plat-02-background-workflow-engine/) | — | — |
| Browse and incremental results | capability-baseline | [Browse and incremental results](search-02-browse-incremental-results/) | — | — |
| Changed-plan recovery | capability-baseline | [Changed-plan recovery](home-03-changed-plan-recovery/) | — | — |
| Collaborative shopping state | capability-baseline | [Collaborative shopping state](groc-02-collaborative-shopping-state/) | shared-real-time-state | — |
| Context-aware search | capability-baseline | [Context-aware search](search-04-context-aware-search/) | — | — |
| Contextual re-import | capability-baseline | [Contextual re-import](qual-02-contextual-reimport/) | — | — |
| Conversational hybrid search | capability-baseline | [Conversational hybrid search](search-01-conversational-hybrid-search/) | — | — |
| Derived weekly grocery list | capability-baseline | [Derived weekly grocery list](groc-01-derived-weekly-grocery-list/) | — | — |
| Description-based recipe creation | capability-baseline | [Description-based recipe creation](cap-03-description-creation/) | — | — |
| Discoverability controls | capability-baseline | [Discoverability controls](disc-03-discoverability-controls/) | — | — |
| Duplicate prevention | capability-baseline | [Duplicate prevention](cap-05-duplicate-prevention/) | — | — |
| Empty-night fallback | capability-baseline | [Empty-night fallback](home-02-empty-night-fallback/) | — | — |
| Faceted filters | capability-baseline | [Faceted filters](search-03-faceted-filters/) | — | — |
| Family voting cycle | capability-baseline | [Family voting cycle](plan-04-family-voting-cycle/) | — | — |
| GOTO fallback rotation | capability-baseline | [GOTO fallback rotation](home-04-goto-fallback-rotation/) | — | — |
| Health, authentication, and response conventions | capability-baseline | [Health, authentication, and response conventions](plat-07-health-auth-response-conventions/) | — | — |
| Household matching feedback | capability-baseline | [Household matching feedback](disc-02-household-matching-feedback/) | — | — |
| Household member administration and invitations | capability-baseline | [Household member administration and invitations](id-03-member-administration-invitations/) | — | — |
| Immersive library browsing | capability-baseline | [Immersive library browsing](lib-01-immersive-library-browsing/) | — | — |
| Import failure recovery | capability-baseline | [Import failure recovery](cap-07-import-failure-recovery/) | — | — |
| Import issue reporting | capability-baseline | [Import issue reporting](qual-01-import-issue-reporting/) | — | — |
| Import progress and completion | capability-baseline | [Import progress and completion](cap-06-import-progress-completion/) | — | — |
| In-cook recipe feedback | capability-baseline | [In-cook recipe feedback](cook-02-in-cook-feedback/) | — | — |
| Ingredient aisle correction | capability-baseline | [Ingredient aisle correction](groc-03-ingredient-aisle-correction/) | — | — |
| Ingredient categorization | capability-baseline | [Ingredient categorization](plat-04-ingredient-categorization/) | — | — |
| Installable PWA and device integration | capability-baseline | [Installable PWA and device integration](pref-02-installable-pwa-device-integration/) | — | — |
| Interface localization | capability-baseline | [Interface localization](pref-01-interface-localization/) | — | — |
| Managed demo mode | capability-baseline | [Managed demo mode](plat-06-managed-demo-mode/) | — | — |
| Meal assignment and replacement | capability-baseline | [Meal assignment and replacement](plan-02-meal-assignment-replacement/) | — | — |
| Member onboarding and switching | capability-baseline | [Member onboarding and switching](id-02-member-onboarding-switching/) | — | — |
| Photo capture | capability-baseline | [Photo capture](cap-01-photo-capture/) | — | — |
| Portable recipe sharing | capability-baseline | [Portable recipe sharing](lib-06-portable-recipe-sharing/) | — | — |
| Processing-language configuration | capability-baseline | [Processing-language configuration](qual-03-processing-language/) | — | — |
| Recipe actions | capability-baseline | [Recipe actions](lib-03-recipe-actions/) | — | — |
| Recipe bundle import | capability-baseline | [Recipe bundle import](cap-04-recipe-bundle-import/) | — | — |
| Recipe detail and metadata | capability-baseline | [Recipe detail and metadata](lib-02-recipe-detail-metadata/) | — | — |
| Recipe imagery and provenance | capability-baseline | [Recipe imagery and provenance](lib-04-recipe-imagery-provenance/) | — | — |
| Recipe search indexing | capability-baseline | [Recipe search indexing](plat-03-recipe-search-indexing/) | — | — |
| Recipe URL capture and PWA share target | capability-baseline | [Recipe URL capture and PWA share target](cap-02-url-capture-share-target/) | — | — |
| Responsive and accessible interaction | capability-baseline | [Responsive and accessible interaction](pref-03-responsive-accessible-interaction/) | — | — |
| Schedule movement and exceptions | capability-baseline | [Schedule movement and exceptions](plan-03-schedule-movement-exceptions/) | — | — |
| Shared household authentication | capability-baseline | [Shared household authentication](id-01-shared-household-authentication/) | — | — |
| Shared real-time state | capability-baseline | [Shared real-time state](plat-01-shared-real-time-state/) | — | — |
| Soft deletion and recycle bin | capability-baseline | [Soft deletion and recycle bin](lib-05-soft-deletion-recycle-bin/) | — | — |
| Step-by-step Cook's Mode | capability-baseline | [Step-by-step Cook's Mode](cook-01-step-by-step-cooks-mode/) | — | — |
| Storage backup and recovery | capability-baseline | [Storage backup and recovery](plat-05-storage-backup-recovery/) | — | — |
| Swipe discovery queue | capability-baseline | [Swipe discovery queue](disc-01-swipe-discovery-queue/) | — | — |
| Tonight's meal status | capability-baseline | [Tonight's meal status](home-01-tonights-meal-status/) | — | — |
| Week navigation and status | capability-baseline | [Week navigation and status](plan-01-week-navigation-status/) | — | — |

## Planned

| Name | Kind | Canonical package | Dependencies | Next action |
|---|---|---|---|---|
| Dietary preferences and planning exploration | exploration | [Dietary preferences and planning exploration](diet-agent/) | — | Reconcile legacy prompts into one approved outcome before implementation. |
| Feature flags | planned-feature | [Feature flags](feature-flags/) | — | Select the first bounded implementation task. |
| Model routing | platform-initiative | [Model routing](model-routing/) | — | Select increment 1 only. |
| PWA cache coherence | platform-initiative | [PWA cache coherence](pwa-caching/) | — | Normalize legacy session prompts before selecting work. |
| Recipe on one page | planned-feature | [Recipe on one page](single-page-recipe-view/) | feature-flags | Implement after the feature-flag decision boundary exists. |

## In progress

| Name | Kind | Canonical package | Dependencies | Next action |
|---|---|---|---|---|
| PDF recipe import preview | planned-feature | [PDF recipe import preview](pdf-recipe-import/) | feature-flags, photo-capture, recipe-url-capture, import-progress-and-completion, import-failure-recovery, storage-backup-and-recovery | Complete T02/T08 renderer and device qualification; implementation and automated evidence are tracked in implementation-evidence.md. |

## Registry rules

- Search the registry before creating a feature spec; revise or depend on existing work
  when scope overlaps.
- Active current, planned, and in-progress packages contain `requirements.md`,
  `design.md`, and `tasks.md`.
- Explorations and legacy sources are not implementation authorization. Promote an
  exploration to an active package before selecting implementation work.
- `task spec:check` verifies the registry and generated index; it does not certify
  runtime behavior or replace selected-task validation.
