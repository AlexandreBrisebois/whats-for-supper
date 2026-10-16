# Data backup/recovery baseline plan

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **31 requirements / 76 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

**DBR-P01 (2026-10-16):** The user's “promote” accepts the six reviewed
backup/recovery drafts and authorizes their documentation-only promotion into
[the main specification](../../openspec/specs/data-backup-and-recovery/spec.md).
All 31 requirements / 76 scenarios are promoted unchanged. The six changes remain
active and unarchived. Generation and selected documentation acceptance/promotion
are complete; DBR-U01–U08, U12 and A34 remain unchanged. Runtime qualification is
not-run/deferred. Earlier pending-review and absent-main records below are historical;
DBR-P01 supersedes their lifecycle status without accepting excluded guarantees.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

**Historical phase-12 reconciliation R12 (2026-10-16):** Six existing validated drafts (31 requirements / 76 scenarios) remain pending human review; main spec remains absent. No additional supported extraction gap was found.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Existing draft identities and BSL-001–020 are retained unchanged.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Data backup/recovery: preserve and reconstruct household state | Actual export inclusion/exclusion, restore/merge, asset recovery, search sidecars/reconciliation, reports, cleanup and scheduled maintenance; distinguish app export from infrastructure backup | [ManagementService](../../api/src/RecipeApi/Services/ManagementService.cs), [management API](../../api/src/RecipeApi/Controllers/ManagementController.cs), [dreaming YAML](../../api/src/RecipeApi/Workflows/dreaming.yaml) | [backup integration](../../api/src/RecipeApi.Tests/Integration/ManagementBackupIntegrationTests.cs), [search recovery tests](../../api/src/RecipeApi.Tests/Integration/SearchIndexBackupRestoreTests.cs), [PDF PostgreSQL recovery](../../api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs) | All persisted domains, assets, workflows/deployment / medium |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

**DBR-G01 (2026-10-16):** The user authorizes discovery, evidence reconciliation
and documentation-only generation for this entire capability, processing bounded
slices sequentially until every area is drafted or explicitly excluded/qualified.
This supersedes the default one-slice stopping point for this session. Reuse settled
A09/A10/A12/A34 decisions. Human acceptance, main-spec promotion, archival,
application/test/contract/configuration changes, runtime qualification, staging and
committing remain unauthorized. No consequential scope question is unresolved.

Selected sequence: management-entry-observation → application-export →
restore-merge-assets → import-report-recovery → search-recovery →
scheduled-maintenance. Every delta uses the existing approved capability path
`data-backup-and-recovery`; no main spec exists and none will be created here.

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U12 | Filesystem, DB, enqueue and broadcasts are separate failure boundaries | [RecipeService](../../api/src/RecipeApi/Services/RecipeService.cs), [PdfCaptureService](../../api/src/RecipeApi/Services/PdfCaptureService.cs), [ManagementService](../../api/src/RecipeApi/Services/ManagementService.cs), [SSE manager](../../api/src/RecipeApi/Infrastructure/SseConnectionManager.cs). No inferred transactional file/DB consistency, durable replay, exactly-once execution or cross-replica delivery. | Open |

## Slice evidence and lifecycle records

### Extraction identity and shared assumptions

Session date: 2026-10-16 (America/Toronto). Branch `moving-to-openspec`,
commit `04a1c4570f9bbb01b47436790d4248635ac3179a`. The capability plan was clean
at entry; the small index had staged and unstaged edits. The entry status included
unrelated harness/CI/Taskfile changes, many staged capability/delta/main-spec files,
unstaged capability documents, and untracked draft changes (including demo) and
harness tests. No relevant application source/test/contract inputs were dirty;
no task-selected deletion exists. Preserve all pre-existing work and any unrelated
deleted navigation artifacts; no staging/committing or restore/reset commands used.
Private status, staged/unstaged binary diffs, index/plan before-images and existing
file SHA-256 inventory are retained at
`/var/folders/7x/450tvgfj1lg2gx9p89txzx0w0000gn/T/wfs-backup-baseline-3gkbaa7u`.
The baseline snapshot is evidence for preservation, not permission to revert
concurrent work. At final scope review, 17 unrelated pre-existing paths had changed
concurrently (demo/tonight drafts and plans), and their index-summary rows had
advanced. Those edits were retained. The task-owned index change is only the Data
backup/recovery row; the staged binary diff remained identical to the private
snapshot. No unrelated file is included in the task's claimed edit ownership.

All evidence below is **implementation-supported**, never runtime verified here.
Tests were read for assertions, not executed. Default TestWebApplicationFactory
uses EF InMemory (transaction warning ignored), InMemoryRecipeStore, no auth by
default, and a Moq orchestrator that creates persisted Processing instances/tasks
without running real processors. File JSON/CSV/sidecars/reports still use a private
real temporary data root. PostgreSQL PDF tests opt into local disk/schema but require
an environment connection, use synthetic PDF/page fixtures and preview intake;
only their ordinary backup/restore assertions inform this draft. No PDF-preview
feature activation or rendering guarantee is included.

Configuration assumptions: DataRootResolver uses DATA_ROOT → DataRoot → /data;
RecipesRootResolver uses RECIPES_ROOT → RecipesRoot → DataRoot/recipes. Restore
requires retained accessible files; export needs writable configured roots. Search
uses EMBEDDING_MODEL_ID, absent default gemini-embedding-2. IClock supplies scheduled
maintenance/report time; many export/restore timestamps use DateTimeOffset.UtcNow.
No consistent snapshot time or root-wide transactional boundary is implied.

Source abbreviations in evidence entries resolve under `api/src/RecipeApi/` unless
a full repository path is given. Shared owners are the actual accepted requirements
in [household identity](../../openspec/specs/household-identity/spec.md),
“Authenticate protected API requests independently”; [background processing](../../openspec/specs/background-processing/spec.md),
“Start child workflows through shared acceptance”, “Resolve child cron schedules
against future UTC minutes”, “Prune only old terminal workflow history”; and
[recipe library](../../openspec/specs/recipe-library/spec.md), “Represent persisted
recipe attribution and readiness”. Shared workflow states/retry, SSE delivery,
recipe deletion/provenance, recipe-quality retry eligibility, calendar policy and
search ranking are referenced owners, not independently redefined here.

### Evidence ledger

Each numbered entry is `BSL-data-backup-and-recovery-NNN`. Entry trigger and
observable behavior are named in its title and trace; failures/configuration and
exceptions supplement the shared assumptions above. Disposition: **accepted/promoted under DBR-P01** except
the disputed/incomplete parts explicitly withheld in DBR-U01–U08. Confidence is not
a check result. For every entry, current runtime check outcome: **not-run (A34)**.

#### BSL-data-backup-and-recovery-001 — Ordinary management API acceptance

**Trace/source anchors:** api/src/RecipeApi/Controllers/ManagementController.cs `Backup`, `Restore`, `DisasterRecovery`; `specs/openapi.yaml` POST `/api/management/{backup,seed,disaster-recovery}`; `Services/Processors/ManagementProcessor.cs`; the three db workflow YAML files.

**Assertions, substitutions and limits:** No ordinary acceptance assertion in ManagementControllerTests; demo enqueue cases are outside scope. Source matches flat message/taskId contracts. Generated `pwa/src/lib/api/generated/api/management/{backup,seed,disasterRecovery}/index.ts` provides POST builders; targeted consumer search found no ordinary PWA control.

**Confidence:** medium; no end-to-end ordinary controller execution observed.

#### BSL-data-backup-and-recovery-002 — Access and asynchronous boundaries

**Trace/source anchors:** api/src/RecipeApi/Program.cs global AuthorizeFilter and ManagementProcessor registrations; Infrastructure/HearthAuthenticationHandler.cs; ManagementController has no member binder, elevated PIN or admin-role check. Background-processing and household-identity main specs own shared rules.

**Assertions, substitutions and limits:** Default TestWebApplicationFactory omits authentication and substitutes a recording/persisting Moq orchestrator. Therefore management tests do not establish production authentication, dispatch or background execution. OpenAPI global HearthSecret/HearthToken agrees; cookie handling is inherited owner behavior.

**Confidence:** medium; source-only management access/dispatch seam.

#### BSL-data-backup-and-recovery-003 — Latest management status and limited disaster helper

**Trace/source anchors:** api/src/RecipeApi/Controllers/ManagementController.cs `GetStatus`; api/src/RecipeApi/Services/ManagementService.cs `DisasterRecoveryAsync`, `MergeFamilyMembersAsync`; Models/ManagementStatus.cs, Models/SeedResult.cs.

**Assertions, substitutions and limits:** ManagementControllerTests.GetStatus_Returns_NotFound_When_No_Workflows_Run asserts 404, which OpenAPI documents only as 200. Other status assertions use demo instances; no ordinary result-order assertion. Status selects latest CreatedAt among five ordinary/demo IDs, takes latest UpdatedAt completed non-null result, returns flat JSON. Generic result carries no operation-specific complete-recovery guarantee. Disaster helper only appends missing attribution placeholders to family-members.json and directly deserializes Recipe JSON, unlike RestoreAsync.

**Confidence:** medium; 404 and incomplete disaster claims withheld.

#### BSL-data-backup-and-recovery-004 — Recipe export selection and store boundary

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `BackupAsync` recipe loop; Data/RecipeDbContext.cs recipe DeletedAt query filter; Infrastructure/LocalRecipeStore.cs metadata, source and enumeration methods.

**Assertions, substitutions and limits:** ManagementBackupIntegrationTests.BackupAsync_IncludesReadyRecipe_EvenWithNoMetadataOrRating asserts info exists; BackupAsync_SkipsUnreadyRecipe_WithNoPayload asserts absent info. Default store is InMemoryRecipeStore; PDF tests opt into local disk. Selection is not Recipe.IsReady: name/images/synthesis or raw metadata/notes/rating/PDF govern inclusion. Soft-deleted DB recipes are filtered; existing disk directories are not purged.

**Confidence:** high for narrow selection; medium for filesystem/inclusion boundaries.

#### BSL-data-backup-and-recovery-005 — Incremental member/recipe files

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `BackupAsync`, `MergeFamilyMembersAsync`, `SerializeRecipeBackup`, `RetiredRecipeBackupFields`; Models/RecipeInfo.cs; Infrastructure/LocalRecipeStore.cs.

**Assertions, substitutions and limits:** ManagementServiceTests.BackupAsync_WritesCuisineTypeAndMealTypes_ToRecipeInfo asserts cuisine/meal types; BackupAsync_DoesNotEmitRetiredHealthDietaryOrBalanceFields asserts no retired fields in new serialized output (its demo portion excluded). Existing info refresh covers notes/rating/description/name/category/discoverability/vegetarian/time/lastCooked/synthesis/sourceUrl/cuisine/mealTypes; PDF presence additionally refreshes IsReady. Creation adds ID/AddedBy/image count/created time; existing info does not refresh every field. Existing recipe.json is never overwritten. Member file merges absent IDs only; no assertion establishes renamed-member refresh.

**Confidence:** medium; partial projections and append-only file behavior.

#### BSL-data-backup-and-recovery-006 — Plan/calendar export inclusion

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `BackupAsync` weekly plans/calendar writes; Models/WeeklyPlan.cs and CalendarEvent.cs.

**Assertions, substitutions and limits:** ManagementBackupIntegrationTests.NonCookingCalendarBackup_RestoresCustomAndLegacyPlans asserts persisted Skipped status, null recipe and kind/label for custom/order_in/eating_out and legacy null fields. ManagementServiceTests.BackupRestoreRoundTrip_PreservesCurrentRecipeAndWeeklyPlanFacts asserts cuisine/mealTypes/vegetarian/ingredients/source URL and groceryState/groceryItems after deleting just selected rows. These tests do not reconstruct all household state. Empty tables do not overwrite previous plan/event files.

**Confidence:** high for asserted fields; medium for full merge boundary.

#### BSL-data-backup-and-recovery-007 — Ingredient CSV serialization

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `BackupAsync`, `EscapeCsvField`; api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs.

**Assertions, substitutions and limits:** BackupAsync_WithNoIngredientCategories_WritesCsvWithHeaderOnly asserts exact header/single row; WithIngredientCategories_ExportsAllRows and CsvColumns_MatchExpectedFormat assert column order/content/time format; FieldWithComma_IsQuotedCorrectly asserts quoted prefix; OverwritesPreviousCsv_OnSecondCall asserts new row count. They do not assert embedded-newline import or a non-dot culture. Confidence serialization uses interpolation/current culture; import uses invariant culture.

**Confidence:** high for asserted output; multiline/culture round-trip excluded.

#### BSL-data-backup-and-recovery-008 — Member reconstruction and missing attribution

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `RestoreAsync` member phase and missingMemberIds placeholders; Models/FamilyMember.cs.

**Assertions, substitutions and limits:** No direct current assertion for missing-member placeholder or existing member preference merge was found in the selected suites. Source adds/updates by ID and stamps update time; placeholder name is Recovered Member plus first four ID characters. Member JSON parse/save failure can abort before recipe work. Membership policy remains with household identity.

**Confidence:** medium; source-supported only.

#### BSL-data-backup-and-recovery-009 — Recipe reconstruction and merge

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `RestoreAsync` scan/save phases; Infrastructure/LocalRecipeStore.cs ListRecipeIdsAsync; api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs.

**Assertions, substitutions and limits:** BackupRestoreRoundTrip_PreservesCurrentRecipeAndWeeklyPlanFacts asserts current recipe facts; RestoreAsync_MalformedCurrentRecipeInfo_RecordsClearError asserts Errors=1 and absent row. Info ID must match directory ID; name required except pending PDF. Existing updates include rating/notes/description/name/time/ingredients/raw metadata/images/synthesis/category/discoverable/vegetarian/lastCooked/sourceUrl/cuisine/mealTypes/readiness/update time. AddedBy/CreatedAt/DeletedAt are retained on existing rows. No repeated restore/concurrent merge test establishes universal idempotence; JSON-only load is a narrower projection. Save-loop catches do not encompass final SaveChanges failures.

**Confidence:** medium; source-supported merge and partial error semantics.

#### BSL-data-backup-and-recovery-010 — Supported legacy content

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `RemoveRetiredRecipeFields`, `IsJsonArray`, `RestoreAsync`; api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs RestoreAsync_ToleratesRetiredFieldsAndRestoresCurrentRecipeFields.

**Assertions, substitutions and limits:** The test writes deserialized legacy info and recipeIngredient array/source URL, then asserts current cuisine/meal types/category/ingredients/vegetarian/source URL. It does not assert all string/legacy-array branches. Seven case-insensitive retired top-level names are isHealthyChoice, dietaryProfile, fopFlags, fopClassification, healthProfile, healthEvent, balanceSummary. recipeIngredient array wins over ingredients array/string; category/name/time/sourceUrl fallback fills empty values; image_count fills zero. Unknown info rating becomes Unknown. No arbitrary schema migration promise.

**Confidence:** high for asserted fields; medium for source-only alternatives.

#### BSL-data-backup-and-recovery-011 — Retained assets and PDF readiness

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `BackupAsync`, `RestoreAsync`; Infrastructure/LocalRecipeStore.cs ReadSourcePdfAsync; Models/RecipeInfo.cs IsReady.

**Assertions, substitutions and limits:** ManagementServiceTests.Retained_pending_pdf_restores_metadata_without_becoming_ready asserts pending unnamed PDF metadata/notes/rating/source byte using default in-memory store. PdfCapturePostgresTests.Backup_restore_soft_delete_and_purge_preserve_then_remove_PDF_aggregate asserts ready reconstruction, notes/rating/index/source bytes and retained image; Named_but_unfinished_PDF_stays_pending_after_backup_and_restore asserts readiness false and source present. Tests require WFS_TEST_POSTGRES_CONNECTION, create isolated database/schema and use local disk, but enable PDF preview intake and use synthetic bytes/pages; renderer ControlledRenderer elsewhere is substituted. Intake/preview, soft-delete/purge and native rendering are not normative in this recovery slice. No files are copied by backup/restore; physical asset retention is a prerequisite.

**Confidence:** medium; opt-in test assertions inspected, not executed.

#### BSL-data-backup-and-recovery-012 — Planning, categories and finished index recovery

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `RestoreAsync`, `ParseCsvLine`, `GetMonday`, `BackfillFinishedDishIndicesAsync`; api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs.

**Assertions, substitutions and limits:** RestoreAsync_ToleratesLegacyWeeklyPlanBalanceSummaryAndPreservesGroceryState asserts plan/status/grocery fields. WithValidCsv_UpsertsRows, WithAbsentCsv_DoesNotFail, WithMalformedRow_SkipsMalformedAndUpsertsValid, WithExistingRow_UpdatesExistingRow assert category recovery/skipping/key merge. NonCookingCalendarBackup assertion is in 006. Source skips linked events missing visible recipe, creates Locked missing Monday plans, preserves existing category CreatedAt, and backfills nonnegative finished indices across query filters. Backfill catches/logs returns zero; no source assertion proves all fields recover. Calendar interpretation remains with meal planning.

**Confidence:** high for asserted subsets; medium for source-only compatibility branches.

#### BSL-data-backup-and-recovery-013 — Report export projection

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `RecipeImportReportBackup`, `BackupAsync`; api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs.

**Assertions, substitutions and limits:** BackupRestoreRoundTrip_PreservesDuplicateOnlyAndMixedRecipeImportReports asserts reasons/note/status/attribution/timestamps and reimported time for retained reports. BackupAsync_AfterReportsAreResolved_OverwritesArtifactWithEmptyArray asserts literal empty array. The latter does not prove restore deletes preexisting DB reports; it does not. Projections preserve current rows, not all historical reports.

**Confidence:** high for asserted projection/empty overwrite.

#### BSL-data-backup-and-recovery-014 — Report dependency recovery and interruption

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `RestoreRecipeImportReportsAsync`; api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs RestoreAsync_NormalizesInterruptedRecipeImportReportToReported.

**Assertions, substitutions and limits:** Asserts Reimporting becomes Reported and lastWorkflowInstanceId/lastAttemptAt/reimportedAt/lastError null. Source skips missing recipes (including deleted-ID lookup), nulls missing member references and upserts by recipe ID; missing or JSON/I/O-unreadable file logs/skips. No automatic workflow resume is invoked. Existing non-interrupted workflow IDs may be dangling because workflow history is not exported. Domain report eligibility/retry remains recipe-quality ownership.

**Confidence:** high for normalization; medium for source-only missing dependencies.

#### BSL-data-backup-and-recovery-015 — Ready sidecar export

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `BackupAsync` readyDocs; Services/RecipeSearchDocumentBuilder.cs; SearchFingerprintService.cs; api/src/RecipeApi.Tests/Integration/SearchIndexBackupRestoreTests.cs.

**Assertions, substitutions and limits:** Writes_SearchIndexJson_For_ReadyRecipe and DoesNot_Write...PendingRecipe/FailedRecipe assert existence/nonexistence in fresh state; Sidecar_HasCorrect_Schema asserts schema, identity, nonempty text/model/source fingerprint/export time, not embedding vector validity. Source rebuilds lexical projection, conditionally marks reusable embedding, writes raw float array and catches per-sidecar exceptions. Existing stale files are not removed when rows become non-ready.

**Confidence:** high for asserted fresh artifact behavior; medium for compatibility.

#### BSL-data-backup-and-recovery-016 — Sidecar restore compatibility

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `RestoreAsync`, `UpsertSearchDocumentPendingAsync`; api/src/RecipeApi.Tests/Integration/SearchIndexBackupRestoreTests.cs.

**Assertions, substitutions and limits:** WithCompatibleSidecar_Upserts_SearchDocumentAsReady asserts row non-null/index ready. LegacySidecarHealthTermsAreNotRehydrated asserts current ingredient/cuisine/meal/vegetarian text, absence of retired terms/metadata. MissingSidecar_SetsPending and IncompatibleSchemaVersion_SetsPending only assert IF row exists; incompatible model test also guards assertions on non-null and only checks lexical ready/embedding pending. Fixtures seed text-embedding-3-small, not the absent-env default gemini-embedding-2, and use a three-element vector. Source compatibility checks schema/model/fingerprint/status, not length/nonemptiness. Malformed sidecar catch only logs; no guaranteed pending fallback.

**Confidence:** medium; conditional assertions and model substitution.

#### BSL-data-backup-and-recovery-017 — Derived-state repair and stale work

**Trace/source anchors:** Services/SearchReconciliationWorkflow.cs ExecuteAsync/HasActiveIndexAsync; Services/SearchIndexWorkflow.cs IndexRecipeInternalAsync; api/src/RecipeApi/Controllers/ManagementController.cs BackfillSearch; Workflows/search-reconciliation.yaml.

**Assertions, substitutions and limits:** SearchReconciliationWorkflowTests.ExecuteAsync_CreatesMissingSidecarAndQueuesOneCurrentFingerprint asserts pending doc plus recorded index request; DoesNotQueueWhenAnEquivalentIndexWorkflowIsActive asserts no recorded calls. Uses TestDbContextFactory InMemory and RecordingOrchestrator; relational active-work query uses JSONB containment, in-memory uses string containment. SearchIndexBackupRestoreTests.CompatibleSidecar_DoesNotGetOverwrittenByStaleJob asserts existing index ready after stale job, not complete row-byte equality. Source rejects nonempty stale fingerprint before writes. Missing/obsolete schema, source mismatch or embedding failed/pending lead to indexing; batching/continuation 50 is source-only. Backfill Task.Run logs trigger failures after response.

**Confidence:** medium; no relational race/convergence/delivery qualification.

#### BSL-data-backup-and-recovery-018 — Scheduled maintenance composition

**Trace/source anchors:** Services/DreamingWorkflowSeeder.cs; Services/Processors/WorkflowProcessor.cs; Workflows/dreaming.yaml; Program.cs registrations; Services/Processors/ManagementProcessor.cs.

**Assertions, substitutions and limits:** DreamingWorkflowSeederTests use FixedClock, in-memory DB/storage and real WorkflowOrchestrator with a simplified one-task dreaming YAML. No-active test asserts next overridden 03:00 root task schedule; default test asserts same-day 06:00; Pending case asserts no duplicate. It does not execute production dreaming. DreamingFilterMaterializationWorkflowTests inspect production YAML dependency on finalization/report and assert failed finalization leaves materializer Waiting/previous state retained. Other pruning/launch/cron rules already belong to background-processing. Hosted startup catches/logs errors; launch completion does not await child.

**Confidence:** high for narrow schedule assertions; medium for composed recurrence.

#### BSL-data-backup-and-recovery-019 — Maintenance commands and residue cleanup

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `ProcessMaintenanceCommandsAsync`, `ProcessDeleteFailedCaptureResidueAsync`, `SkipUnsupportedCommandAsync`, `RecipeIsReadyOrDiscoverable`; api/src/RecipeApi.Tests/Integration/CaptureFailureIntegrationTests.cs.

**Assertions, substitutions and limits:** DreamingMaintenance_DeletesSafeResidue_AndRecordsResult asserts database recipe absent, completed command/result marker and physical directory absent. DreamingMaintenance_SkipsReadyRecipe asserts retained recipe and skipped command. Factory substitutes DB/store; deletion test separately creates a real temp directory. PdfCapturePostgresTests failure-retry-delete case inspects local PDF/page removal using controlled renderer, not native conversion. Source takes 50 due pending commands, records processing/attempt/start then handler outcome, catches per-handler exceptions and counts. Workflow removal precedes recipe guard; files precede DB save; failed/processing commands are not automatically retried here.

**Confidence:** high for narrow cleanup assertions; medium for failure/repeat semantics.

#### BSL-data-backup-and-recovery-020 — Local reports and history cleanup

**Trace/source anchors:** api/src/RecipeApi/Services/ManagementService.cs `GenerateDreamingReportAsync`, `BuildDreamingReport`, `PruneWorkflowsAsync`; Services/Processors/ManagementProcessor.cs report-result lookup; api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs.

**Assertions, substitutions and limits:** GenerateDreamingReportAsync_ReportsDreamingAsStuckOnlyAfterTwentyFourHours asserts file path, one failure/two stuck, prune counts, backup/import text/error, one dreaming stuck item; real clock, factory DB, real temp Markdown. Source includes up to 20 pending/failed maintenance commands, latest backup by UpdatedAt, recent Failed >=24h cutoff, Pending/Processing strict older-than cutoffs. Same-date writes overwrite; no email/SSE delivery. PruneWorkflowsAsync_RemovesOnlyOldTerminalWorkflowHistory asserts 2 parent/task counts and retained IDs under InMemory, not PostgreSQL cascades. Refer to shared pruning owner rather than add duplicate requirement.

**Confidence:** high for report assertion subset; medium for operational reliability.

### Discrepancy disposition (non-normative)

| ID | Evidence | Disposition / withheld assertion |
| --- | --- | --- |
| DBR-U01 | 003, OpenAPI status GET | Implemented no-history 404 lacks contract response documentation. Record only; no contract repair or normative 404 requirement. Status also selects demo instances and emits demo diagnostics; demo semantics excluded. |
| DBR-U02 | 003 | DisasterRecoveryAsync only repairs the member export file, not the database; direct Recipe parsing is incompatible with some array ingredient files accepted by RestoreAsync. Keep helper details non-normative. Endpoint acceptance is drafted; complete disaster recovery excluded. |
| DBR-U03 | 004–007 | In-place export retains old member values, existing recipe.json, empty-table plan/event files, and stale non-ready search sidecars; no complete/current snapshot guarantee. No export archive/download or offsite copy. |
| DBR-U04 | 008–012 | Multiple database saves and filesystem reads/writes; malformed outer JSON/save failure can stop later phases after prior changes. Missing assets are not recovered/generated; IDs/info counts do not prove files exist/are valid. No full object graph or arbitrary-schema compatibility. Existing deleted rows stay deleted, but retained disk metadata for absent rows has no guaranteed tombstone recovery. |
| DBR-U05 | 007,012 | CSV writer quotes line breaks but reader splits physical lines; numeric export is culture dependent and import invariant. Supported narrow row parsing is drafted; universal RFC4180/multiculture round-trip is withheld. |
| DBR-U06 | 013–014 | Empty report export prevents stale artifact replay but empty restore does not clear existing reports; workflow rows are absent and some linkage can dangle. No restored queue execution, report-error completeness or automatic re-import retry. |
| DBR-U07 | 015–017 | Conditional null-guarded test assertions; miniature embedding fixture/different model; schema/model/fingerprint status checks do not validate vector dimensions/content. Malformed sidecar catch does not ensure pending fallback; no guaranteed search convergence, orphan cleanup, exactly-once indexing or atomic deduplication. |
| DBR-U08 | 018–020 | Child acceptance is independent from completion; recurrence is a chained request, not guaranteed uptime. Cleanup deletes workflow before recipe safety guard and files before save; no safe preservation of every aggregate on failure or retry of processing/failed commands. Report is local and may precede backup completion. |
| U12 / A34 | All | No inferred atomic filesystem/DB/enqueue/broadcast, durable delivery/replay, exactly-once execution, cross-replica consistency or complete disaster recovery. Runtime qualification deferred, not silently passed. |

### Area coverage and explicit exclusions

| Capability area | Disposition |
| --- | --- |
| Export entry/access/results | Draft management-entry-observation; shared household authentication; no extra elevated gate inferred. |
| Formats and included/excluded data | Draft application-export plus report/search slices. No database/filesystem infrastructure backup is implemented by these paths; infrastructure backup/restore, snapshots, retention rotation and offsite recovery excluded. |
| Import/merge/identities/conflicts/repeated execution | Draft restore-merge-assets. Existing IDs update selected fields; absent IDs add; missing file entries do not delete rows. No universal idempotence, reset or conflict-resolution protocol beyond evidenced merges. Limited disaster helper qualified by DBR-U02. |
| Assets/PDF/missing or invalid content/partial failure | Draft retained-asset/PDF readiness and malformed recipe behavior; absent/corrupt physical media regeneration, native rendering and complete media recovery excluded. Existing PDF assertions inform storage only; preview intake qualification excluded. |
| Search sidecars/index/derived recovery | Draft search-recovery; index repair is bounded and asynchronous. Search ranking/eligibility/filter materialization policy remains with recipe search. |
| Active issue recovery | Draft import-report-recovery; quality policy referenced, history/execution recovery excluded. |
| Reports/cleanup/maintenance | Draft scheduled-maintenance; reuse shared pruning owner. Meal finalization policy stays with meal planning; no report delivery/complete backup-success assertion. |
| Configuration/async/failure boundaries | Root/model/cron assumptions recorded above; dispatch and partial saves qualify all relevant drafts. |
| Demo/preview/Synology variants | Excluded from generation; no demo snapshot/restore or seeder-health requirements, no preview availability requirements, no Synology deployment behavior. |
| Shared ownership | Identity/access, recipe lifecycle, background states/retries/cron/pruning and live-update delivery remain their accepted owners. No new broadcast/replay policy. |

### Draft inventory and requirement/scenario mapping

All six deltas are **accepted/promoted under DBR-P01**, active and unarchived. Each slice contains CLI metadata `.openspec.yaml`, `proposal.md`, `design.md`,
`tasks.md` and `specs/data-backup-and-recovery/spec.md`. Documentation acceptance does not mean application acceptance. The six distinct
ADDED sets now populate the main capability without changing their requirement
or scenario wording.

#### [management-entry-observation](../../openspec/changes/archive/2026-10-16-baseline-data-backup-and-recovery-management-entry-observation/proposal.md)

| Requirement | All mapped scenarios | Evidence suffixes |
| --- | --- | --- |
| Accept ordinary management requests through household access | Backup acceptance; Restore acceptance; Recovery acceptance | 001,002 |
| Keep management acceptance separate from recovery completion | Accepted work | 001,002 |
| Project the latest selected management result | Completed result; No completed result | 003 |

#### [application-export](../../openspec/changes/archive/2026-10-16-baseline-data-backup-and-recovery-application-export/proposal.md)

| Requirement | All mapped scenarios | Evidence suffixes |
| --- | --- | --- |
| Append missing member identities to the member export | New member identity; Repeated identity | 005 |
| Select recipes with persisted export payload | Ready-shaped recipe; Empty placeholder; Retained PDF | 004,011 |
| Refresh metadata while retaining existing recipe content | Existing recipe content; New recipe content; Metadata refresh | 005 |
| Write nonempty plan and calendar exports | Nonempty planning state | 006 |
| Replace the ingredient category export | Empty categories; Comma in category key; Repeated export | 007 |

#### [restore-merge-assets](../../openspec/changes/archive/2026-10-16-baseline-data-backup-and-recovery-restore-merge-assets/proposal.md)

| Requirement | All mapped scenarios | Evidence suffixes |
| --- | --- | --- |
| Merge members by exported identity | Existing member; Missing attribution member | 008 |
| Reconstruct recipes from retained metadata and content | Metadata and content; No metadata files | 009,010 |
| Merge recipes without replacing unrelated stored state | Existing recipe; Soft-deleted existing recipe; Database-only recipe | 009 |
| Read supported legacy recipe content | Legacy ingredient array; Serialized ingredient array; Retired content | 010 |
| Retain unfinished PDF readiness on reconstruction | Named unfinished PDF; Unnamed pending PDF; Ready PDF | 011 |
| Count malformed recipe loads without stopping later loads | Invalid current metadata; Later valid recipe | 009 |
| Merge planning files and initialize missing event weeks | Grocery plan state; Recipe-free legacy event; Missing linked recipe; Missing event week | 006,012 |
| Merge category rows and skip invalid rows | Valid category update; Malformed row among valid rows; Absent CSV | 007,012 |
| Backfill retained finished-dish references | Nonnegative index; Backfill read failure | 012 |

#### [import-report-recovery](../../openspec/changes/archive/2026-10-16-baseline-data-backup-and-recovery-import-report-recovery/proposal.md)

| Requirement | All mapped scenarios | Evidence suffixes |
| --- | --- | --- |
| Replace the active report export even when empty | Reported content; Resolved reports | 013 |
| Restore report dependencies and normalize interrupted work | Interrupted re-import; Missing reporter; Missing recipe | 014 |
| Tolerate absent or unreadable report artifacts | Legacy export; Invalid report JSON | 014 |

#### [search-recovery](../../openspec/changes/archive/2026-10-16-baseline-data-backup-and-recovery-search-recovery/proposal.md)

| Requirement | All mapped scenarios | Evidence suffixes |
| --- | --- | --- |
| Export ready search documents as sidecars | Ready search document; Non-ready document; Changed source | 015 |
| Rebuild lexical search content during compatible restore | Compatible sidecar; Legacy terms | 016 |
| Qualify embedding reuse separately from lexical readiness | Incompatible model; Matching embedding | 016 |
| Mark missing or obsolete sidecars pending | Missing sidecar; Obsolete schema | 016 |
| Repair derived search state in bounded batches | Missing search state; Equivalent work active; Full batch | 017 |
| Acknowledge background backfill dispatch separately | Background launch failure | 017 |

#### [scheduled-maintenance](../../openspec/changes/archive/2026-10-16-baseline-data-backup-and-recovery-scheduled-maintenance/proposal.md)

| Requirement | All mapped scenarios | Evidence suffixes |
| --- | --- | --- |
| Seed the maintenance schedule when no active instance exists | No active maintenance; Active maintenance; Seed failure | 018 |
| Compose maintenance without waiting for launched child completion | Report after launch; Next maintenance request | 018 |
| Process due pending maintenance commands with recorded outcomes | Unsupported command; Handler failure; Future or nonpending command | 019 |
| Clean failed-capture residue subject to the current recipe guard | Safe residue; Recipe became ready-shaped; Missing recipe | 019 |
| Write a dated local maintenance report | Stuck thresholds; Old dreaming; Daily replacement | 020 |

### Source content identity

SHA-256 of immediate source/test/contract/consumer/owner inputs at extraction.
These are evidence anchors, not runtime acceptance. All application source and test
inputs below matched the private pre-write inventory; no application changes made.

| Repository path | SHA-256 |
| --- | --- |
| `api/src/RecipeApi/Services/ManagementService.cs` | `c24464baa8f853c7195e30de61b168ef2b8eda059545a5449580807448811c4f` |
| `api/src/RecipeApi/Controllers/ManagementController.cs` | `6f9a8569553c9b242779f059af1d0d3990aa5c102258eac9bb0bfcbca00b31ea` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs` | `a1a038a13567186c47eb26e7dde7db4942dcbd8c128511c95e121bd70f59cfca` |
| `api/src/RecipeApi.Tests/Integration/ManagementBackupIntegrationTests.cs` | `8239f2c3a8d520fe5819e980b5b0dc2b3a14434e3ebb8561696a448dedd12704` |
| `api/src/RecipeApi.Tests/Integration/SearchIndexBackupRestoreTests.cs` | `0dbc17e94da0a6a419c4f3379c7a0dedcaa84e5b1feeb709a9fb6988343b4e99` |
| `api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs` | `54680e482267de1d1086781df5f587df640a85111d4beb8d03d0ce65a3b142c7` |
| `api/src/RecipeApi.Tests/Integration/CaptureFailureIntegrationTests.cs` | `a16687f8b455625fb73002cc1e6327972014018b4d788ee645b3079bd84a00ae` |
| `api/src/RecipeApi.Tests/Services/SearchReconciliationWorkflowTests.cs` | `856312f20eb3edeb7dae469a10cf9811c2b798b3bdcb474a8fa79681f7ce9461` |
| `api/src/RecipeApi.Tests/Services/DreamingWorkflowSeederTests.cs` | `3d1cedbceb65a8ab3ccba9d8a57d997bbac59a8ee6c8e0a80cc5c76348000c94` |
| `api/src/RecipeApi.Tests/Services/DreamingFilterMaterializationWorkflowTests.cs` | `02bdea5196fa246317d354f31043e7aa246fcd1f50480cdf32ce9eaed80c1e6e` |
| `api/src/RecipeApi.Tests/Controllers/ManagementControllerTests.cs` | `755e9127dac0119adab11185000f72154f2cc0f9525c276a2d3a818fdcb207cd` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `docs/user-guide.md` | `0e37a5178897e2e82699c3e5b9585bc774be81c5c74644c77249169e3f95cd2d` |
| `docs/architecture.md` | `3773e1bc528dc0c60d5ac20ed3d8b1947a22176b6f2ecccc0ac061fb30729705` |
| `README.md` | `0f5a8d36bd6ef690afb1a9bb07800fea0db334d14130b3783061d5bc8260f18a` |
| `api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs` | `6f3f2893b4ae03ef3328efad306de1e8fc33ab470c4c430bfbe5d3ed1ae17efc` |
| `api/src/RecipeApi/Infrastructure/DataRootResolver.cs` | `e9fbf25da9b1ecd698375da0b623801afd0dba456852987f20537466831eb15a` |
| `api/src/RecipeApi/Infrastructure/RecipesRootResolver.cs` | `79b44a0105d75a9c651e2f7f378d0144a481ae380d7a378b9cc88f4bfc8025aa` |
| `api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs` | `51ecd8a5be459e1ffaae7e3a33646de57aa13bf0fec088a7e388083da08ee817` |
| `api/src/RecipeApi/Services/Processors/ManagementProcessor.cs` | `484abcf7eb3d3e5c2882c785edea3a4a3083f7f7c2efc3c5e479aad7e561096f` |
| `api/src/RecipeApi/Services/Processors/WorkflowProcessor.cs` | `661a85f17a1ddcc00ec96e51af5b13fc7e7f2b5b8236ca1639d2a5a292772a40` |
| `api/src/RecipeApi/Services/DreamingWorkflowSeeder.cs` | `ff3616b071ba5cc7a10ba4b311fa8a24fa18edcc69bafe7549692a6285e55a1f` |
| `api/src/RecipeApi/Services/SearchReconciliationWorkflow.cs` | `9de4fa4d1d29d88468de2796ca5d941b0165c06cce0e2ed470cfba148638d806` |
| `api/src/RecipeApi/Services/SearchIndexWorkflow.cs` | `a1f11d78e11734cd8bbead72d85448549691e6bee4a4ef69c691da337395bf7b` |
| `api/src/RecipeApi/Services/RecipeSearchDocumentBuilder.cs` | `588b608ad1cb1b27315d2282326703bb84cf9acc2d5bc66c45246ab5c4df2767` |
| `api/src/RecipeApi/Services/SearchFingerprintService.cs` | `dba0e4dabe9c514079e1c2b19d3fe65a7a85a0efd6180acfe2bb9f7f8e95a7ad` |
| `api/src/RecipeApi/Models/Recipe.cs` | `810b9ddb9bdcacdb894d713680952f5a32c89256070366dff99b3c16f82bbe82` |
| `api/src/RecipeApi/Models/RecipeInfo.cs` | `7a154a58b5f360279cd1891f9a9e33c4ad3097f382f088dccc855ec27c957452` |
| `api/src/RecipeApi/Models/FamilyMember.cs` | `cf05c05553a0b57941661629dedfe4e28c713415bccd85ccd4eca613254fed5f` |
| `api/src/RecipeApi/Models/WeeklyPlan.cs` | `cb342c8c26394264a00401c7eb8ef16693af7315e845e88ac5d5307535aec4b5` |
| `api/src/RecipeApi/Models/CalendarEvent.cs` | `cac6be71f2d3fa947a903390d9d6a69da7df9ebbf7aed38a76a80c45ef856806` |
| `api/src/RecipeApi/Models/ManagementStatus.cs` | `4d0665650a9d286743bc05bd83dad111b13c3bfa91dcf4a355a76a8c3fd8f5e2` |
| `api/src/RecipeApi/Models/SeedResult.cs` | `3d584313cd9b2913d9a89941993ddaff5af18d21af582067f0f960f62693e23d` |
| `api/src/RecipeApi/Workflows/db-backup.yaml` | `9a2cd1f319a8af485b58d3678291f1192585f42879d830125e0e11f1d9980898` |
| `api/src/RecipeApi/Workflows/db-restore.yaml` | `66c95dbfd84c79e8695a0c9be7b6753b80110846504eecd4530ab9945cfd8a15` |
| `api/src/RecipeApi/Workflows/db-disaster-recovery.yaml` | `fdd420e5dbbcde6319e297101882dd89229ab77b4f332aad10f007f5598b4b49` |
| `api/src/RecipeApi/Workflows/dreaming.yaml` | `862cf700ca717dd5b09b5f6dfb84b6f8810448c6080b805e2b3ff62289f9853d` |
| `api/src/RecipeApi/Workflows/search-reconciliation.yaml` | `cfe61cd86a217f5ce1e86a9c2fe1c872eb1b782f4588132bff94120b3e36bae5` |
| `pwa/src/lib/api/generated/api/management/backup/index.ts` | `6836176da68e9e1a272e06c34b09bc3c5e495bbe9594f37a9ed849d0d08cbf82` |
| `pwa/src/lib/api/generated/api/management/seed/index.ts` | `f6f2b8cea1db279ae2f553dc5bad6678c8319b355b0a0119763ad0b0cd3df1ae` |
| `pwa/src/lib/api/generated/api/management/disasterRecovery/index.ts` | `2f7983d2878c2e1855e3134596bce341e17305e37c431b9b459d1b34213fd90f` |
| `pwa/src/lib/api/generated/api/management/status/index.ts` | `fe1a3a8781a7d064884e5da4b6342a8d7cc4732350d45da0ac1007e39505411d` |
| `pwa/src/lib/api/generated/api/management/backfillSearch/index.ts` | `7233302b78d534a067af70aa7608eb4c8af689cbf6ccd47dfa7f467a97572ff5` |
| `openspec/specs/household-identity/spec.md` | `4c7f5a1faafd5439ab6f261b1efb140a4b0c10643cf16d087874c3c52ee9b749` |
| `openspec/specs/background-processing/spec.md` | `7023ac794f9119ec995215a431f9667934c69434a22815c2a9e40dbddc796e76` |
| `openspec/specs/recipe-library/spec.md` | `7fd80218a8551dba51d70f057f82d40cce9cd3fe5356c6d3d82d6a07a4f857d2` |

### Session record / checks / next action

DBR-G01 completed discovery/evidence reconciliation for BSL-data-backup-and-recovery-001–020.
The nearest OpenSpec root is `/Users/alex/Code/whats-for-supper`, source `nearest`,
repo-local, configured schema `spec-driven`; no external store selected. Existing
main inventory contains no data-backup-and-recovery owner. Six changes scaffolded
with `openspec new change`, each schema artifact instruction/dependency read before
writing and status rechecked after each artifact. Proposal/spec/design/tasks are all
present; no conditional artifact skipped. Designs retain cross-storage/async and
compatibility complexity; no implementation or new-test task added.

**Passed:** six selected `openspec validate <change> --type change --strict`
commands after drafting; normative assertion review against the per-requirement
mapping above, overlap/ownership review and source identity comparison.
**Failed/blocked:** no selected OpenSpec validation failures or blockers at this
checkpoint. **Not-run:** application/API/browser/PostgreSQL/services/models/native
PDF checks (explicit user boundary/A34). **Not-applicable:** behavior red/green,
contract/client generation, deployment, acceptance/promotion/archive checks.
Final `task verify -- <every task-owned changed/new path>` outcome and its durable
run-record path are reported in the final response, so that recording the outcome
does not mutate the already-verified document identity. Unrelated validation
failures, if any, are reported separately without repair.

Human review remains pending for every slice. No unresolved consequential intent
question blocks this generation: unsupported/disputed paths have explicit excluded
or qualified dispositions. Next action is human review of all six drafts and
DBR-U01–U08; promotion, acceptance, archive and runtime qualification each need
separate authorization. Do not continue into application work.

## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the data-backup-and-recovery OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/data-backup-and-recovery.md.
Use these as the execution context; do not read the full history or other
capability plans unless an immediate dependency requires a specific section.
Resolve installed OpenSpec workflow/root before artifact writes. Preserve staged,
unstaged and untracked work. Recheck source identity and affected evidence.

Current user messages define scope. Reuse recorded decisions without asking for
approval again within already authorized work. Do not infer new drafting,
promotion, archive, implementation or runtime qualification authority from history.
Trace one selected observable journey through source, contracts and actual test
assertions/substitutions. Keep disputed claims non-normative. No application,
test, contract, client, SQL, configuration or dependency edits.

Update this capability plan's evidence/mappings, decisions, uncertainty, artifact
status, session log and next action. Update the small index only if its routing or
summary changes. Validate selected artifacts and run task verify with every changed
path. Distinguish passed, failed, blocked, not-run and not-applicable; source
support is not runtime verification. Stop at the authorized session boundary.
```

## Next-session record

Use this section for new capability sessions after the split. The earlier evidence
and lifecycle records above retain their original chronology.

```text
Session/date:
Branch, commit, relevant dirty inputs:
Current user authorization and selected capability/slice:
Completed discovery/evidence IDs:
Artifact paths and status (draft/validated/accepted/promoted separately):
Human decisions and unresolved questions:
Checks: passed / failed / blocked / not-run / not-applicable, with reasons:
Limitations and excluded assertions:
Exact next bounded action:
```

## DBR-P01 — Acceptance and promotion, 2026-10-16

User authority: “promote”, following the R12 handoff identifying these six reviewed
backup/recovery drafts as the remaining review/promotion queue. This accepts only
the documented supported 31/76 and authorizes their main-spec synchronization.
DBR-U01–U08, U12 and A34 retain their non-normative/deferred dispositions.

Used the installed openspec-sync-specs workflow. CLI list/context resolved the
nearest repository root; each selected status supplied its exact delta path and
planning root, and current specs instructions were resolved before writes. The
previously absent main spec was created with the common Purpose and all six
ADDED sets, in the existing management/export/restore/report/search/maintenance
order. Every requirement/scenario block is unchanged; no placeholder Purpose or
delta operation header is introduced. All six source changes remain active.

Source identity: HEAD 04a1c4570f9bbb01b47436790d4248635ac3179a. All 49 recorded
evidence path/hash pairs still match (49 distinct inputs). Existing staged,
unstaged and untracked work was snapshotted under
`/tmp/wfs-backup-promotion-20261016/` and preserved; no navigation spec is restored.
Only main, this plan, index, workflow, reconciliation checkpoint and six task
follow-up records are task-owned. No application, contract, test, client, SQL,
configuration, dependency or existing delta/design/proposal/metadata edit.

Validation: run selected/main/spec inventory and all-item strict validation, then
`task verify -- <all 11 task-owned paths>`. Final actual outcomes and the unique
run-record path are reported in the response rather than modifying tested content
to claim future success. Application/runtime/API/browser/database/device/model
checks remain not-run under A34; application TDD/client generation/deployment and
preparation are not-applicable to this documentation promotion.

Next action: no supported generation or review/promotion queue remains in the
reconciled baseline inventory. Retain all qualifications; future runtime work,
excluded policy decisions or archival require separately selected scope. No
archival, staging, commit, publication or implementation is performed here.
