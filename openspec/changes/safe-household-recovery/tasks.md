# Tasks

The owner selected online execution. Independent storage is operator-configured outside live roots; no account or infrastructure provisioning is included.

## 1. Fresh current exports

**Outcome:** current member values/membership, current recipe content, empty plan/calendar arrays and multiline/invariant category round trips described by the delta.
**Owners:** ManagementService and isolated real-file service/integration fixtures; retain ordinary merge, history/demo and attribution-repair behavior.
**Prerequisites:** .NET and repository Task runner; no household data or running production application.

- [x] 1.1 Add freshness and category round-trip regressions; run `task test:api -- --filter FullyQualifiedName~RecoveryExportFreshnessTests` and record intended behavioral failures.
- [x] 1.2 Implement those corrections and rerun that filter to green; inspect actual output bytes and preserve media.
- [x] 1.3 Document automatic export refresh and existing controls; run `task test:api -- --filter 'FullyQualifiedName~RecoveryExportFreshnessTests|FullyQualifiedName~ManagementServiceTests|FullyQualifiedName~ManagementBackupIntegrationTests|FullyQualifiedName~SyncRecipeProcessorTests'` to preserve merge/history/demo behavior.

## 2. Remaining recovery scope

- [x] 2.1 Resolve offline/online execution and independent-destination decision, then expand spec/design/tasks for full snapshot validation, staging, interruption/retry and fresh/nonempty PostgreSQL/media acceptance before dependent implementation.
- [ ] 2.2 Complete all expanded acceptance, strict OpenSpec, scope review, required preparation and `task verify -- <all-reviewed-paths>`; publish a draft PR against verified main after #281 merged and verify final-head CI. Record blocked and not-run checks honestly.

## Workflow follow-up

- Synchronize/archive only once all #244 requirements and verification pass; verify resulting planning content. No merge or deployment.

## 3. Online exact recovery (owner selected online operation)

- [x] 3.1 Extend OpenAPI and first PostgreSQL HTTP acceptance for independent snapshot capture; observe red before implementation.
- [x] 3.2 Implement versioned rows/media inventory, independent staged publication and complete preflight; prove fresh/empty/deleted/media round trips.
- [x] 3.3 Coordinate HTTP and worker writers; prove concurrent capture cannot mix database/media generations and busy behavior is bounded and documented.
- [x] 3.4 Implement online staged restore with durable journal/commit marker, restart reconciliation and stale-work invalidation; test every interruption boundary and retry.
- [x] 3.5 Preserve history compatibility, invalidate rounds/continuations, rebuild affinity/search; qualify fresh/nonempty PostgreSQL and original-root-unavailable restores.
- [ ] 3.6 Update generated client and method-sensitive mocks; run live endpoint, schema/database and full harness checks, scope review, then synchronize/archive and verify final-head CI. Keep draft until qualified.
