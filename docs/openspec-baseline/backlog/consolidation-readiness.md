# Baseline consolidation and archival readiness

**Completed after explicit user approval.** This document retains the pre-action assessment and98-change manifest. Current result: [consolidation-completion.md](consolidation-completion.md). All approval/promotion/archive instructions below are historical preparation, not a pending gate.

Prepared2026-10-16. Target: trustworthy main-spec baseline and no completed baseline changes left active. This is a read-only lifecycle reconciliation plus this report, not acceptance, promotion or archival.

## Concrete proposed operation

1. Accept and promote the two reviewed-generation drafts below:15 requirements/34 scenarios across meal-planning, recipe-search and recipe-library. Preserve existing main content and Purpose.
2. Archive all98 baseline changes under dated archive paths, with **no replay of the96 already-promoted deltas**. Preserve later corrections in main. Archive missing optional designs with the explicit warning below, not invented placeholder artifacts.
3. Repair repository documentation links targeting relocated changes, retain historical evidence/backlog and run strict OpenSpec plus complete changed-path verification. Do not stage/commit or fix application code.
4. Verify active changes are empty (archive remains), main specs are17 capabilities /648 requirements /1559 scenarios, assuming no concurrent changes. Those totals are reconciliation checks, not evidence of feature or runtime completeness.

## Current verified inventory

-98 active changes, all440/440 tracked tasks checked.
-96 older deltas already represented in main:92 have byte-equivalent requirement blocks; four have15 older blocks superseded by reviewed corrections.
-Two new changes are absent from main: baseline-meal-planning-drag-activation (3 requirements/8 scenarios), baseline-recipe-search-operator-maintenance (12/26). Their generation/tasks are complete; acceptance/promotion remain pending.
-Ten older changes omit an optional design artifact: CLI reports design ready, not done. This is an archive warning; do not misrepresent all artifacts as complete.

## Superseded wording that must never be replayed

| Earlier change | Different requirement blocks | Treatment |
| --- | --- | --- |
| baseline-recipe-library-view-original | Present original photos in the photo viewer overlay; Navigate between original photos with wrapping | Keep current main. Library claim-corrections and capture intake/finalization qualification supersede earlier broad claims. Archive without syncing this older delta. |
| baseline-recipe-library-deletion-restore-purge | Synchronize library view and dismiss detail after deletion; Restore soft-deleted recipe to active library; Permanently purge soft-deleted recipe with valid elevated PIN | Keep current main. Library claim-corrections and capture intake/finalization qualification supersede earlier broad claims. Archive without syncing this older delta. |
| baseline-recipe-capture-photo-entry | Select recipe photos from camera or device gallery; Stage and validate uploaded recipe photos; Designate finished dish photo with automatic index management; Validate and submit multipart photo capture; Initial recipe persistence and photo workflow dispatch; Finalize photo recipe readiness and broadcast completion | Keep current main. Library claim-corrections and capture intake/finalization qualification supersede earlier broad claims. Archive without syncing this older delta. |
| baseline-recipe-capture-url-entry | Validate and submit recipe link for acquisition; Initial recipe creation and workflow dispatch; Background web acquisition and recipe extraction; Finalize recipe readiness and broadcast completion | Keep current main. Library claim-corrections and capture intake/finalization qualification supersede earlier broad claims. Archive without syncing this older delta. |

Independent comparison examined every differing block: viewer eligibility and pager zoom scope; deletion caller refresh, restore eligibility/dispatch and purge cancellation; photo input request versus actual OS delivery,20MiB bound/dish deselection; capture member binding, persistence versus dispatch, acquisition validation and readiness/event boundaries. Current main carries the narrower source-backed corrections. Replaying old ADDED blocks would regress them.

## Complete archive manifest

| Change | Tasks | Artifact warning | Main relationship |
| --- | --- | --- | --- |
| `baseline-app-installation-metadata-launch` | 4/4 | None | All requirement blocks identical |
| `baseline-app-installation-share-transport` | 4/4 | None | All requirement blocks identical |
| `baseline-app-installation-staging-recovery` | 4/4 | None | All requirement blocks identical |
| `baseline-background-processing-remaining-shared-behavior` | 8/8 | None | All requirement blocks identical |
| `baseline-background-processing-workflow-lifecycle` | 6/6 | None | All requirement blocks identical |
| `baseline-cooking-completion-recovery` | 5/5 | design: ready | All requirement blocks identical |
| `baseline-cooking-edit-report-handoffs` | 5/5 | design: ready | All requirement blocks identical |
| `baseline-cooking-entry-preparation` | 5/5 | design: ready | All requirement blocks identical |
| `baseline-cooking-instruction-reading` | 5/5 | design: ready | All requirement blocks identical |
| `baseline-data-backup-and-recovery-application-export` | 4/4 | None | All requirement blocks identical |
| `baseline-data-backup-and-recovery-import-report-recovery` | 4/4 | None | All requirement blocks identical |
| `baseline-data-backup-and-recovery-management-entry-observation` | 4/4 | None | All requirement blocks identical |
| `baseline-data-backup-and-recovery-restore-merge-assets` | 4/4 | None | All requirement blocks identical |
| `baseline-data-backup-and-recovery-scheduled-maintenance` | 4/4 | None | All requirement blocks identical |
| `baseline-data-backup-and-recovery-search-recovery` | 4/4 | None | All requirement blocks identical |
| `baseline-demo-household-activation-access` | 4/4 | design: ready | All requirement blocks identical |
| `baseline-demo-household-ai-boundaries` | 4/4 | design: ready | All requirement blocks identical |
| `baseline-demo-household-automatic-restore` | 4/4 | design: ready | All requirement blocks identical |
| `baseline-demo-household-snapshot-capture` | 4/4 | design: ready | All requirement blocks identical |
| `baseline-demo-household-snapshot-restore-activity` | 4/4 | design: ready | All requirement blocks identical |
| `baseline-demo-household-workflow-observation` | 4/4 | design: ready | All requirement blocks identical |
| `baseline-grocery-shopping-aggregation-quantities` | 5/5 | None | All requirement blocks identical |
| `baseline-grocery-shopping-bulk-check-map-api` | 5/5 | None | All requirement blocks identical |
| `baseline-grocery-shopping-category-default-processing` | 5/5 | None | All requirement blocks identical |
| `baseline-grocery-shopping-individual-checks` | 5/5 | None | All requirement blocks identical |
| `baseline-grocery-shopping-scheduled-needs` | 5/5 | None | All requirement blocks identical |
| `baseline-grocery-shopping-sections-corrections` | 5/5 | None | All requirement blocks identical |
| `baseline-grocery-shopping-week-refresh-boundaries` | 5/5 | None | All requirement blocks identical |
| `baseline-household-identity-capture-attribution` | 4/4 | None | All requirement blocks identical |
| `baseline-household-identity-member-context-lifecycle` | 4/4 | None | All requirement blocks identical |
| `baseline-household-identity-member-context-transport` | 4/4 | None | All requirement blocks identical |
| `baseline-household-identity-member-removal` | 4/4 | None | All requirement blocks identical |
| `baseline-household-identity-member-renaming` | 4/4 | None | All requirement blocks identical |
| `baseline-household-identity-profile-switching` | 4/4 | None | All requirement blocks identical |
| `baseline-household-live-updates-connection-reconciliation` | 6/6 | None | All requirement blocks identical |
| `baseline-household-live-updates-discovery-events` | 5/5 | None | All requirement blocks identical |
| `baseline-household-live-updates-grocery-lifecycle-dispatch` | 5/5 | None | All requirement blocks identical |
| `baseline-household-live-updates-schedule-events` | 6/6 | None | All requirement blocks identical |
| `baseline-meal-planning-deferral-removal` | 5/5 | None | All requirement blocks identical |
| `baseline-meal-planning-drag-activation` | 5/5 | None | PROMOTION REQUIRED: 3 new requirements |
| `baseline-meal-planning-empty-day-recipe-assignment` | 5/5 | None | All requirement blocks identical |
| `baseline-meal-planning-non-cooking-day-plans` | 4/4 | None | All requirement blocks identical |
| `baseline-meal-planning-occupied-recipe-replacement` | 5/5 | None | All requirement blocks identical |
| `baseline-meal-planning-overdue-api-boundaries` | 5/5 | None | All requirement blocks identical |
| `baseline-meal-planning-recipe-movement` | 5/5 | None | All requirement blocks identical |
| `baseline-meal-planning-week-day-transitions` | 5/5 | None | All requirement blocks identical |
| `baseline-meal-planning-week-reading-navigation` | 6/6 | None | All requirement blocks identical |
| `baseline-member-preferences-api-persistence` | 3/3 | None | All requirement blocks identical |
| `baseline-member-preferences-browse-selection` | 3/3 | None | All requirement blocks identical |
| `baseline-member-preferences-language-selection` | 3/3 | None | All requirement blocks identical |
| `baseline-member-preferences-preview-choices` | 3/3 | None | All requirement blocks identical |
| `baseline-member-preferences-preview-resolution` | 3/3 | None | All requirement blocks identical |
| `baseline-recipe-capture-completion-advice` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-capture-description-entry` | 6/6 | None | All requirement blocks identical |
| `baseline-recipe-capture-intake-boundaries` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-capture-pdf-entry` | 6/6 | None | All requirement blocks identical |
| `baseline-recipe-capture-photo-entry` | 8/8 | None | Superseded older blocks; preserve main |
| `baseline-recipe-capture-processing-language` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-capture-url-entry` | 8/8 | None | Superseded older blocks; preserve main |
| `baseline-recipe-discovery-consensus-suggestions` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-discovery-household-queue` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-discovery-votes-api` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-claim-corrections` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-deletion-restore-purge` | 4/4 | None | Superseded older blocks; preserve main |
| `baseline-recipe-library-detail-discoverability` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-detail-editing` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-detail-reading` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-hero-regeneration-acceptance` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-hero-retrieval` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-instruction-provider` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-list-visibility` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-lookup-reading` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-original-photo-append` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-persisted-facts` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-ratings-notes` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-stack-browsing` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-status-provider` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-summary-reading` | 6/6 | None | All requirement blocks identical |
| `baseline-recipe-library-trash-pending-controls` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-update-persistence-boundaries` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-library-view-original` | 4/4 | None | Superseded older blocks; preserve main |
| `baseline-recipe-quality-bulk-import-observation` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-quality-cooking-feedback` | 3/3 | None | All requirement blocks identical |
| `baseline-recipe-quality-failed-capture-recovery` | 6/6 | None | All requirement blocks identical |
| `baseline-recipe-quality-failure-references` | 3/3 | None | All requirement blocks identical |
| `baseline-recipe-quality-issue-reporting` | 6/6 | None | All requirement blocks identical |
| `baseline-recipe-quality-review-resolution` | 6/6 | None | All requirement blocks identical |
| `baseline-recipe-search-continuation-freshness` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-search-entry-results` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-search-filters-state` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-search-operator-maintenance` | 6/6 | None | PROMOTION REQUIRED: 12 new requirements |
| `baseline-recipe-search-ranking-promotion` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-search-retrieval-modes` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-sharing-bundle-export-import` | 4/4 | None | All requirement blocks identical |
| `baseline-recipe-sharing-pending-actions` | 5/5 | None | All requirement blocks identical |
| `baseline-tonight-meal-decisions-changed-plan-recovery` | 4/4 | None | All requirement blocks identical |
| `baseline-tonight-meal-decisions-goto-choices` | 4/4 | None | All requirement blocks identical |
| `baseline-tonight-meal-decisions-home-states` | 4/4 | None | All requirement blocks identical |

## Preserved confidence limits

The baseline describes supported current implementation with explicit exclusions and evidence. It does not certify that known defects are desirable. [Accepted Tomorrow and clock policies](decisions.md) and [34-item backlog](README.md) remain visible after archive. Runtime qualification, individual corrective specs and implementation are future selected work. Do not mark backlog issues resolved because their extraction changes were archived.

## Authorization gate

The initial user request explicitly prohibited accepting/promoting drafts and archiving. The later clean-folder goal establishes the destination; this prepared manifest makes the final action reviewable. Obtain one explicit approval for acceptance/promotion of the15 new requirements and archival of all98, preserving corrections and acknowledging the ten missing optional designs. No per-change repeat prompts are needed after that bounded authorization. The installed archive skill requires incomplete-artifact warnings and a combined sync assessment before proceeding.

## Resume procedure

Refresh openspec list/status and content identity before writes. Use installed sync workflow for only the two new changes, then compare all intended new blocks; archive only after that sync succeeds. Use installed archive workflow with main-sync skipped for previously represented changes; preserve metadata and never overwrite an existing archive target. Rewrite live Markdown links to actual dated archive paths and verify all changed documentation. Stop on concurrent input changes or unresolved semantic mismatch rather than replaying old deltas.
