# Tasks

Only the independent freshness slice has a settled implementation breakdown. The offline/online decision blocks the remaining #244 design and tasks; completing this list does not complete #244.

## 1. Fresh current exports

**Outcome:** current member values/membership, current recipe content, empty plan/calendar arrays and multiline/invariant category round trips described by the delta.
**Owners:** ManagementService and isolated real-file service/integration fixtures; retain ordinary merge, history/demo and attribution-repair behavior.
**Prerequisites:** .NET and repository Task runner; no household data or running production application.

- [x] 1.1 Add freshness and category round-trip regressions; run `task test:api -- --filter FullyQualifiedName~RecoveryExportFreshnessTests` and record intended behavioral failures.
- [x] 1.2 Implement those corrections and rerun that filter to green; inspect actual output bytes and preserve media.
- [x] 1.3 Document automatic export refresh and existing controls; run `task test:api -- --filter 'FullyQualifiedName~RecoveryExportFreshnessTests|FullyQualifiedName~ManagementServiceTests|FullyQualifiedName~ManagementBackupIntegrationTests|FullyQualifiedName~SyncRecipeProcessorTests'` to preserve merge/history/demo behavior.

## 2. Remaining recovery scope

- [ ] 2.1 Resolve offline/online execution and independent-destination decision, then expand spec/design/tasks for full snapshot validation, staging, interruption/retry and fresh/nonempty PostgreSQL/media acceptance before dependent implementation.
- [ ] 2.2 Complete all expanded acceptance, strict OpenSpec, scope review, required preparation and `task verify -- <all-reviewed-paths>`; publish a stacked draft PR and verify final-head CI. Record blocked and not-run checks honestly.

## Workflow follow-up

- Synchronize/archive only once all #244 requirements and verification pass; verify resulting planning content. No merge or deployment.
