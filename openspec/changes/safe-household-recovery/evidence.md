# Recovery checkpoint evidence

## Identity and boundary

Initial base: unmerged PR #281 head `9ea1246d35619598e1e1c3bdb80b18cde2b8e96c`; remote main verified as `f5eab946c1007c1ea48815ca76b98ca76f210a56`. Branch: `feat/safe-household-recovery`, stacked on `feat/weekly-family-interest-rotation`. Remote reads and writes use the GitHub connector exclusively. The user merged #281 at 00:20:10 UTC; updated main `85e899c2185f912f05cb21d3803d5d95ab3797cf` has exactly the same tree `877c7dc57cfeedfd6b36ae7dc33e234354d8720e`. Recovery was rebased onto that verified main. Initial stacked PR creation returned 422 invalid base and created no PR. The preexisting local checkout was clean; target blobs/tree/commit were verified by Git object hashes before switching.

This checkpoint implements only the independent export freshness/category/content round-trip slice. #244 remains incomplete. The offline operator command versus online execution decision is pending; exact snapshot, independent media copy, whole-set preflight, recoverable cross-store publication and PostgreSQL interruption tests are not implemented or qualified. No production data, restore, merge, release or deployment was used.

## Observed test-first cycles

- `task test:api -- --filter FullyQualifiedName~RecoveryExportFreshnessTests`: five intended failures before production edits (member/content staleness, empty planning exports, multiline CSV in en-US and fr-FR); after fixes, five passed. Initial fixture used in-memory recipes and real metadata/CSV files; this was not real recipe-media evidence.
- `task test:api -- --filter FullyQualifiedName~CurrentContentRoundTrip`: one intended failure showing raw metadata replaced by its export envelope. Version-1 envelope handling fixed repeated restore nesting.
- Disk-sync preservation first failed because the fixture used in-memory recipes. This setup failure was not behavioral red. The fixture was switched to `Tests:LocalRecipeStore=true`; nine new tests then ran against real disposable recipe files: eight passed and disk sync failed because it treated the envelope as raw metadata. A shared decoder now serves restore and sync.
- `task test:api -- --filter 'FullyQualifiedName~RecoveryExportFreshnessTests|FullyQualifiedName~ManagementServiceTests|FullyQualifiedName~ManagementBackupIntegrationTests|FullyQualifiedName~SyncRecipeProcessorTests'`: **46 passed, zero failed, zero skipped**. Nine new cases use real disposable recipe files; database remains EF InMemory. Existing history/demo, legacy import and sync tests are included. An intermediate attempt failed on an unnecessary raw-schema deserialization change; preserving the existing top-level projection fixed it without weakening assertions.

## Environment and retries

The environment originally had .NET 11 preview 6 rather than pinned `11.0.100-rc.2.26504.105`. Installed the pinned SDK under `/workspace/recovery-dotnet`. Tests initially could not create `/home/agent/.dotnet`; targeted filesystem permission did not resolve the mount, and the subsequent escalation was approved. Test execution then succeeded. These startup failures are not behavioral test evidence.

Installed the pinned OpenSpec 1.14.3 in `/workspace/recovery-tooling`; strict validation of the active change passed. The repository Python environment was missing and was initialized with `task init:python`. PWA dependencies were restored from the lockfile; Node 26.12.0 was installed locally to match the repository pin. No package or runtime pins were changed.

## Scope review

ManagementService owns current member/content/planning exports and logical-record CSV parsing. The attribution-repair append helper, history partial and demo code remain unchanged. RecipeExportContent owns version validation shared by merge restore and disk sync; the processor change is necessary because refreshed files are read by that existing consumer. Tests exercise observed before/after behavior and invalid-envelope preservation. Documentation explains automatic refresh, triggers, controls and remaining recovery limitations. OpenSpec retains the unresolved scope rather than presenting freshness as full recovery.

The diff delivers the settled corrections with focused evidence; it does not deliver full #244. No media bytes are deleted or rewritten by the freshness logic. Full harness, final-head CI, real PostgreSQL, independent copy and interruption qualification must be recorded separately; focused tests do not satisfy those gates. Do not archive this active change while those tasks remain incomplete.

## Online continuation (owner decision received)

The owner selected online operation. PostgreSQL container `wfs-recovery-test` is disposable and uses only generated test databases and temporary roots. Observed red/green: independent snapshot HTTP 404 -> one passed; corrupt-media preflight/restore/retry HTTP 404 -> two passed; concurrent member write incorrectly 201 while snapshot lease held -> three passed after HTTP/worker integration (read stays 200, blocked write 503 without mutation). Four deterministic interruption points initially lacked callbacks; after wiring staged/journal/pointer/committed notifications, seven tests passed with rollback/commit outcome assertions and retries. This is not yet complete interruption/concurrency qualification. Later bounded-duration/stream-copy edits require rerun. No archive or readiness claim.
