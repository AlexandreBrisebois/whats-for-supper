# Proposal

## Why

Five specifications combine responsibilities that now obscure bounded review: recipe-library (96 requirements), recipe-search (47), recipe-quality (44), household-identity (42), and data-backup-and-recovery (31). The established meal-planning split provides a preservation-first model for keeping these behavior owners smaller and easier to navigate.

## Outcome and Scope

Split all five into 13 cohesive capability specs: retain five existing paths and introduce eight sibling owners. Preserve all **260 requirements / 609 scenarios** exactly once, without changing normative text, titles, ordering within scenarios, qualifications or application behavior.

This is one coordinated documentation reorganization, so search-indexing can receive both Search producer rules and backup/recovery repair rules without a competing owner. This turn creates planning artifacts only. Applying the split and archival remain later workflow steps. Application code, OpenAPI, generated clients, tests, SQL, deployment/configuration, runtime qualification and changes to the completed meal-planning split are excluded.

## What Changes

- Library retains catalog browsing, detail reading, stored facts, readiness and vegetarian classification; move editing/shared update consequences, recipe media and Recycle Bin lifecycle to dedicated owners.
- Search retains query/filter/retrieval/ranking/continuation behavior; move indexing/materialization and recovery-triggered repair to one search-indexing owner.
- Quality retains saved-recipe reporting, review, contextual processing, failure-reference controls and attributed attempt reads; move failed-capture management plus bulk import/summary operations to capture-recovery.
- Identity retains shared access and invitations; move member record creation/rename/removal and active-member selection/transport to distinct owners. Preserve access-before-context ordering and endpoint-specific validation.
- Backup/recovery retains export and reconstruction, including report/search sidecars; move recurring maintenance orchestration and commands to scheduled-maintenance.
- Update purposes, exact-title dependency links and current baseline navigation while preserving historical evidence, digests and known limitations. Every transferred rule has one authoritative destination.

## Capabilities

### New Capabilities

These introduce specification ownership for existing behavior, not new product features.

- `recipe-editing`: Let household members edit existing recipe content, ratings, notes and discoverability, preserving the supported partial-update, persistence, search-invalidation and file-projection boundaries.
- `recipe-media`: Let household members view original recipe sources and photos, obtain recipe image assets, append original photos and request hero regeneration while distinguishing dispatch from completed asset delivery.
- `recipe-recycle-bin`: Let household members move eligible recipes to the Recycle Bin, inspect and restore deleted recipes, and request PIN-protected permanent purge with existing eligibility and failure boundaries.
- `search-indexing`: Produce and repair published recipe search documents and materialized filter and affinity state, preserving lexical availability, embedding compatibility and superseding-content guards independently of search requests.
- `capture-recovery`: Let household members inspect, retry and clear failed capture workflows and request bulk imports for unnamed stored recipes, distinguishing workflow acknowledgements and summary counts from repaired recipes and completed cleanup.
- `household-members`: Let household members create, rename and remove household member records, with the existing validation, response, pending-feedback and identity-handoff boundaries.
- `member-context`: Select and recover the active household member and carry that context through browser and server requests, preserving the distinction between context binding, member existence and shared household access.
- `scheduled-maintenance`: Schedule and compose recurring application maintenance, process due maintenance commands and write local reports, distinguishing launch acceptance from child workflow completion and cleanup outcomes.

### Modified Capabilities

- `recipe-library`: transfer mapped requirements to the owners above; retain the rest unchanged and update its Purpose/navigation during application.
- `recipe-search`: transfer mapped requirements to the owners above; retain the rest unchanged and update its Purpose/navigation during application.
- `recipe-quality`: transfer mapped requirements to the owners above; retain the rest unchanged and update its Purpose/navigation during application.
- `household-identity`: transfer mapped requirements to the owners above; retain the rest unchanged and update its Purpose/navigation during application.
- `data-backup-and-recovery`: transfer mapped requirements to the owners above; retain the rest unchanged and update its Purpose/navigation during application.

REMOVED/ADDED deltas express cross-capability relocation only. No feature is retired, no requirement body is rewritten, and `skip_specs` would omit the ownership-transfer artifacts needed here.

## Impact

Future apply touches the 13 selected main specs, their current dependency navigation in consuming main specs, and current ownership sections of `docs/openspec-baseline-plan.md` and `docs/openspec-baseline/*.md`. Exact source identities, dispositions and every source-to-destination block are recorded in design.md. Historical archived deltas, evidence claims, BSL/U/A identifiers, source digest tables, backlog investigations and runtime inputs are preserved. Existing dirty work from the completed meal-planning split is outside the new change; overlapping future navigation edits must retain it.
