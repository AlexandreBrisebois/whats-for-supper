# Design

## Context

See proposal.md. This is documentation extraction. BSL-recipe-quality-017 in `docs/openspec-baseline/recipe-quality.md` owns evidence/mappings. First slice: CooksMode sets reportContext → RecipeImportIssueSheet receives contextualReason and saved issue → mergeReasons copies saved reasons/adds missing context → local pressed controls/note → subsequent Save uses recipes.ts/generated POST → RecipeController → RecipeImportReportService → existing report persistence/manual-only or conditional contextual workflow → returned recipe. Existing main requirements own those downstream outcomes.

## Goals / Non-Goals

**Goals:** Complete quality-owned contextual initialization without losing saved feedback or duplicating cooking requirements.

**Non-Goals:** Specify cooking entry, position, return or acknowledgement; implement normalization, polling or new policy.

## Decisions

1. Retain all saved reasons and add only absent context. mergeReasons does not normalize Duplicate away; note initializes from issue.note. Later toggling can clear incompatible reasons and the server keeps all Duplicate-containing submissions manual-only. Alternative: normalize context into content-only feedback; rejected as unsupported policy and contrary to U75.
2. Reconcile concurrent ownership before completion. `baseline-cooking-edit-report-handoffs` appeared during this audit and owns `Hand cooking content issues to the quality form`, `Return from quality reporting to the mounted cooking context` and `Acknowledge cooking report background launch locally`. Preserve it and narrow this delta to the shared form's initialization. No change to cooking artifacts or promoted quality requirements.
3. Keep caller-specific observation as qualification. CooksMode ignores importId and has no poller; parsedSteps are not refreshed by report callbacks; pending dismissal is not cancellation and callbacks have no dedicated stale-target guard. These remain U77/U83/RQ-Q04 limits, not duplicate caller requirements.

## Risks / Trade-offs

- [Mixed Duplicate/content initialization] → Describe initialization faithfully; reuse existing manual-only server policy, no invented eligibility equivalence.
- [Mocks conceal integration] → CooksMode tests assert initial Ingredients, merged Ingredients/Steps/note and saved payload under substituted APIs. Mixed Duplicate initialization is source-only. No executed API, workflow or model result is inferred.
- [Concurrent documentation changes] → Preserve foreign bytes and record the ownership reconciliation; generation remains distinct from review/promotion.

## Migration Plan

None. Stop at validated human-review draft; no application implementation, promotion or archive.

## Open Questions

None blocking extraction. Runtime/access/callback qualification remains deferred under A34.
