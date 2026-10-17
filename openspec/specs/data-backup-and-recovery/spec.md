# Data backup and recovery Specification

## Purpose

Export and reconstruct retained application data, including report and compatible search sidecars, while preserving current merge, legacy-data and partial-failure boundaries independently of scheduled maintenance.

## Evidence and qualifications (non-normative)

Promoted under DBR-P01 (2026-10-16) from the six reviewed backup/recovery deltas.
The [capability evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/data-backup-and-recovery.md)
maps every requirement/scenario to BSL-data-backup-and-recovery-001–020. DBR-U01–U08,
U12 and A34 remain intact: source-supported extraction is not runtime qualification,
a complete infrastructure backup or an atomic file/database recovery guarantee.
The changes remain active and unarchived.

## Relocation provenance (non-normative)

The original preamble and qualification records above describe earlier combined-capability checkpoints. Their historical counts, exclusions and lifecycle status remain evidence, not current ownership. All applicable limitations continue to apply after relocation.

- [data-backup-and-recovery evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/data-backup-and-recovery.md) and [preserved qualification text](../data-backup-and-recovery/spec.md#evidence-and-qualifications-non-normative)

## Capability dependencies (non-normative)

Preserved references to the former combined owners resolve through these current capability links. Each requirement retains its original normative text.

| Capability | Requirements / scenarios |
|---|---:|
| [recipe-search](../recipe-search/spec.md) | 39 / 90 |
| [search-indexing](../search-indexing/spec.md) | 10 / 19 |
| [data-backup-and-recovery](../data-backup-and-recovery/spec.md) | 24 / 58 |
| [scheduled-maintenance](../scheduled-maintenance/spec.md) | 5 / 14 |

- [Repair derived search state in bounded batches](../search-indexing/spec.md#requirement-repair-derived-search-state-in-bounded-batches)
- [Acknowledge background backfill dispatch separately](../search-indexing/spec.md#requirement-acknowledge-background-backfill-dispatch-separately)
- [Compose maintenance without waiting for launched child completion](../scheduled-maintenance/spec.md#requirement-compose-maintenance-without-waiting-for-launched-child-completion)
- [Represent persisted recipe attribution and readiness](../recipe-library/spec.md#requirement-represent-persisted-recipe-attribution-and-readiness)
- [Authenticate protected API requests independently](../household-identity/spec.md#requirement-authenticate-protected-api-requests-independently)

## Requirements

### Requirement: Accept ordinary management requests through household access

Management operations SHALL apply the household-identity requirement “Authenticate protected API requests independently”. Successful ordinary workflow acceptance SHALL return HTTP 202 with a flat message and taskId identifying the accepted workflow instance.

#### Scenario: Backup acceptance
- **WHEN** an authenticated POST /api/management/backup successfully accepts db-backup
- **THEN** the response contains message “Backup task enqueued.” and the accepted instance identity as taskId

#### Scenario: Restore acceptance
- **WHEN** an authenticated POST /api/management/seed successfully accepts db-restore
- **THEN** the response contains message “Restore task enqueued.” and the accepted instance identity as taskId

#### Scenario: Recovery acceptance
- **WHEN** an authenticated POST /api/management/disaster-recovery successfully accepts db-disaster-recovery
- **THEN** the response contains message “Disaster recovery task enqueued.” and the accepted instance identity as taskId

### Requirement: Keep management acceptance separate from recovery completion

Management acceptance SHALL use the background-processing persisted lifecycle and automatic retry rules. A successful HTTP acceptance SHALL identify accepted work without asserting that export or recovery side effects have completed.

#### Scenario: Accepted work
- **WHEN** a management request returns its accepted instance identity
- **THEN** later workflow/task state remains independently observable through the shared background-processing lifecycle

### Requirement: Project the latest selected management result

When the latest selected management instance is an ordinary management workflow, GET /api/management/status SHALL return its instance identity as workflowId, workflowType, status, createdAt and updatedAt, with the most recently updated completed task result that is non-null, or a null result.

#### Scenario: Completed result
- **WHEN** the selected ordinary instance has multiple completed tasks with non-null results
- **THEN** the response result comes from the most recently updated such task

#### Scenario: No completed result
- **WHEN** the selected ordinary instance has no completed task with a non-null result
- **THEN** the response result is null

### Requirement: Append missing member identities to the member export

Application export SHALL merge current members into family-members.json by member ID, append IDs absent from the file, and write the merged JSON only when members were added.

#### Scenario: New member identity
- **WHEN** the database contains a member ID absent from the readable member file
- **THEN** export appends that member and retains existing file entries

#### Scenario: Repeated identity
- **WHEN** a current member ID already exists in the member file
- **THEN** export leaves that file entry unchanged

### Requirement: Select recipes with persisted export payload

For non-deleted recipes, export SHALL write metadata when a retained source PDF exists, or a nonempty name has images or synthesis, or raw metadata, notes or a known rating provides payload. Otherwise it SHALL skip the recipe.

#### Scenario: Ready-shaped recipe
- **WHEN** a non-deleted recipe has a name and positive image count but no metadata, notes or known rating
- **THEN** export writes recipe.info

#### Scenario: Empty placeholder
- **WHEN** a recipe has no source PDF, name, images, synthesis, raw metadata, notes or known rating
- **THEN** export skips its metadata file

#### Scenario: Retained PDF
- **WHEN** a non-deleted unfinished recipe retains source.pdf
- **THEN** export includes its metadata regardless of the ordinary payload test

### Requirement: Refresh metadata while retaining existing recipe content

For an included recipe, export SHALL create recipe.info if absent or refresh its supported mutable fields if present. It SHALL create recipe.json only when missing and raw metadata or ingredients are nonempty, omitting retired health, dietary and balance fields from newly serialized recipe content.

#### Scenario: Existing recipe content
- **WHEN** an included recipe already has recipe.json
- **THEN** export retains those file bytes

#### Scenario: New recipe content
- **WHEN** recipe.json is absent and ingredients are present
- **THEN** export creates serialized recipe content

#### Scenario: Metadata refresh
- **WHEN** an included recipe has changed notes or rating
- **THEN** export updates those fields in recipe.info

### Requirement: Write nonempty plan and calendar exports

Export SHALL serialize nonempty weekly plans and calendar events to weekly-plans.json and calendar-events.json under the data root, preserving represented grocery state and recipe-free calendar fields.

#### Scenario: Nonempty planning state
- **WHEN** weekly plans and recipe-free calendar events exist
- **THEN** export writes their JSON projections including grocery and non-cooking fields

### Requirement: Replace the ingredient category export

Export SHALL overwrite ingredient-categories.csv with the header normalized_key,grocery_section,confidence,source,created_at and one row per category. Fields containing commas, quotes or line breaks SHALL be quoted with doubled internal quotes.

#### Scenario: Empty categories
- **WHEN** there are no ingredient categories
- **THEN** export replaces the artifact with a header-only file

#### Scenario: Comma in category key
- **WHEN** a category key contains a comma
- **THEN** its CSV field is quoted

#### Scenario: Repeated export
- **WHEN** a previous category export exists
- **THEN** the next export replaces its rows rather than appending

### Requirement: Merge members by exported identity

Restore SHALL add member IDs absent from the database and update existing members’ name, browse view mode and preferred language from family-members.json. It SHALL create placeholder members for missing AddedBy identities referenced by successfully loaded recipes.

#### Scenario: Existing member
- **WHEN** a readable member file contains an existing database member ID
- **THEN** restore updates its represented preferences and name

#### Scenario: Missing attribution member
- **WHEN** a successfully loaded recipe refers to an absent member ID
- **THEN** restore creates that ID with a Recovered Member name prefix

### Requirement: Reconstruct recipes from retained metadata and content

Restore SHALL scan retained recipe IDs and skip IDs with neither recipe.info nor recipe.json. Valid recipe.info SHALL provide the primary recipe metadata; recipe.json SHALL provide raw metadata and supported content fallback fields.

#### Scenario: Metadata and content
- **WHEN** valid recipe.info and recipe.json exist for a recipe ID
- **THEN** restore uses info metadata and reads supported ingredient content from recipe.json

#### Scenario: No metadata files
- **WHEN** a recipe directory has neither metadata file
- **THEN** restore skips that recipe ID

### Requirement: Merge recipes without replacing unrelated stored state

Restore SHALL add absent recipe IDs or update the supported metadata/content fields of existing IDs, including IDs hidden by soft deletion. Existing deletion markers, attribution and creation time SHALL remain unchanged during that update.

#### Scenario: Existing recipe
- **WHEN** a loaded recipe ID already exists with different notes and name
- **THEN** restore updates notes and name without adding another recipe

#### Scenario: Soft-deleted existing recipe
- **WHEN** a loaded recipe ID is soft-deleted in the database
- **THEN** restore updates its supported fields while retaining its deletion marker

#### Scenario: Database-only recipe
- **WHEN** a database recipe has no loaded disk record
- **THEN** restore leaves that row in place

### Requirement: Read supported legacy recipe content

Restore SHALL accept ingredient arrays from recipeIngredient or ingredients, and JSON-array strings from ingredients. It SHALL remove the named retired health, dietary and balance fields from loaded recipe JSON and normalize undefined recipe.info ratings to Unknown.

#### Scenario: Legacy ingredient array
- **WHEN** recipe.json contains an ingredients array without recipeIngredient
- **THEN** restore stores the array as ingredient JSON

#### Scenario: Serialized ingredient array
- **WHEN** recipe.json contains ingredients as a string holding a JSON array
- **THEN** restore stores that array string

#### Scenario: Retired content
- **WHEN** recipe JSON includes a named retired dietaryProfile or balanceSummary field
- **THEN** restore excludes that field from loaded raw metadata

### Requirement: Retain unfinished PDF readiness on reconstruction

When source.pdf is retained and recipe.info is read, restore SHALL treat the recipe as pending unless its info explicitly records isReady true. Retained source and page files SHALL remain in the recipe store during metadata reconstruction.

#### Scenario: Named unfinished PDF
- **WHEN** retained source.pdf accompanies valid named info with isReady false
- **THEN** restore keeps database readiness false

#### Scenario: Unnamed pending PDF
- **WHEN** retained source.pdf accompanies matching info without a name and without isReady true
- **THEN** restore permits pending metadata reconstruction

#### Scenario: Ready PDF
- **WHEN** retained source.pdf accompanies valid info with isReady true
- **THEN** restore reconstructs ready metadata without replacing the retained PDF bytes

### Requirement: Count malformed recipe loads without stopping later loads

A recipe-load exception SHALL increment the restore Errors count and skip that record while scanning can continue. A recipe.info ID mismatch or missing name without pending PDF eligibility SHALL be treated as a recipe-load error.

#### Scenario: Invalid current metadata
- **WHEN** recipe.info has no required name and no pending source PDF
- **THEN** restore records a load error and does not queue that record

#### Scenario: Later valid recipe
- **WHEN** an invalid recipe is followed by a valid readable recipe
- **THEN** the later recipe remains eligible for reconstruction

### Requirement: Merge planning files and initialize missing event weeks

Restore SHALL upsert readable weekly plans and calendar events by ID, retain recipe-free events, and skip recipe-linked events whose recipe is unavailable. For calendar weeks lacking a weekly plan, it SHALL create a Locked plan for that week’s Monday.

#### Scenario: Grocery plan state
- **WHEN** a readable weekly plan contains groceryState and groceryItems
- **THEN** restore preserves those represented values

#### Scenario: Recipe-free legacy event
- **WHEN** a readable calendar event has no recipeId and lacks non-cooking kind/label
- **THEN** restore retains its status and null legacy fields

#### Scenario: Missing linked recipe
- **WHEN** a calendar event refers to an unavailable recipe
- **THEN** restore skips the event

#### Scenario: Missing event week
- **WHEN** a restored event belongs to a week with no plan
- **THEN** restore initializes a Locked weekly plan for that Monday

### Requirement: Merge category rows and skip invalid rows

Restore SHALL skip an absent category CSV. For present files it SHALL upsert rows by normalized key when at least five fields, nonblank key/section, parseable confidence and timestamp are present; malformed rows SHALL be logged and skipped.

#### Scenario: Valid category update
- **WHEN** a valid CSV row names an existing key
- **THEN** restore updates section, confidence and source without duplicating the key

#### Scenario: Malformed row among valid rows
- **WHEN** a CSV contains a row with missing fields and a valid category row
- **THEN** restore skips the malformed row and upserts the valid row

#### Scenario: Absent CSV
- **WHEN** ingredient-categories.csv is absent
- **THEN** restore continues without category import

### Requirement: Backfill retained finished-dish references

After category recovery, restore SHALL update finished-dish indices from readable recipe.info entries with a nonnegative finishedDishImageIndex and return a backfill count. A backfill exception SHALL be logged and return zero for that phase.

#### Scenario: Nonnegative index
- **WHEN** readable info contains a nonnegative finished-dish index
- **THEN** restore applies that index to the matching stored recipe

#### Scenario: Backfill read failure
- **WHEN** a metadata read throws during finished-dish backfill
- **THEN** the phase returns zero after logging the failure

### Requirement: Replace the active report export even when empty

Export SHALL replace recipe-import-reports.json with current report projections, including reasons, note, status, attribution, timestamps and attempt diagnostics, and SHALL write an empty array when no reports remain.

#### Scenario: Reported content
- **WHEN** active reports include duplicate and content reasons
- **THEN** export retains their reasons and note in the report artifact

#### Scenario: Resolved reports
- **WHEN** reports were removed before a later export
- **THEN** the later report artifact contains an empty array

### Requirement: Restore report dependencies and normalize interrupted work

Restore SHALL skip reports for missing recipes and upsert other reports by recipe ID. Missing member attribution SHALL become null. Reimporting reports SHALL return to Reported with workflow identity, last attempt, reimported time and error cleared.

#### Scenario: Interrupted re-import
- **WHEN** a saved report is Reimporting and its recipe exists
- **THEN** restore yields Reported with prior attempt linkage and diagnostics cleared

#### Scenario: Missing reporter
- **WHEN** a saved report refers to an unavailable reporting member
- **THEN** restore keeps the report with null reportedBy

#### Scenario: Missing recipe
- **WHEN** a report references a recipe absent even when deleted recipes are considered
- **THEN** restore skips that report

### Requirement: Tolerate absent or unreadable report artifacts

Restore SHALL skip a missing report artifact for legacy compatibility and SHALL log and skip report artifact JSON or I/O read failures.

#### Scenario: Legacy export
- **WHEN** recipe-import-reports.json does not exist
- **THEN** restore continues without report import

#### Scenario: Invalid report JSON
- **WHEN** the report file cannot be parsed as the report list
- **THEN** restore logs the failure and continues without importing that list

### Requirement: Export ready search documents as sidecars

Export SHALL write search.index.json for ready search documents joined to non-deleted recipes, rebuilding lexical content and source fingerprint from current recipe facts. Reusable embedding status SHALL require ready embedding status and matching stored source and embedding fingerprints.

#### Scenario: Ready search document
- **WHEN** a visible recipe has an index-ready search document
- **THEN** export writes schema, identity, rebuilt text/metadata, model, fingerprints and export time in its sidecar

#### Scenario: Non-ready document
- **WHEN** a recipe has only a pending or failed search document and no prior sidecar
- **THEN** export does not create a sidecar for it

#### Scenario: Changed source
- **WHEN** the stored embedding fingerprint differs from current recipe facts
- **THEN** the exported embedding is marked pending

### Requirement: Rebuild lexical search content during compatible restore

For a sidecar with the current schema version, restore SHALL rebuild lexical text, metadata and source fingerprint from restored recipe facts and upsert the search document with ready lexical index status. It SHALL not rehydrate the sidecar’s lexical text or metadata.

#### Scenario: Compatible sidecar
- **WHEN** a readable sidecar has the current schema
- **THEN** restore writes ready lexical content built from the restored recipe

#### Scenario: Legacy terms
- **WHEN** a current-schema sidecar contains obsolete dietary text or metadata
- **THEN** restore replaces that content with the current recipe-derived projection

### Requirement: Qualify embedding reuse separately from lexical readiness

Restore SHALL mark a compatible sidecar’s embedding ready only when its model equals the configured EMBEDDING_MODEL_ID, its embedding fingerprint matches restored source facts and its embedding status is ready. The default model SHALL be gemini-embedding-2 when the environment variable is absent.

#### Scenario: Incompatible model
- **WHEN** a current-schema sidecar names another embedding model
- **THEN** restore retains ready lexical content while marking embedding pending

#### Scenario: Matching embedding
- **WHEN** a current-schema sidecar has the configured model, matching fingerprint and ready embedding status
- **THEN** restore marks the embedding ready under those compatibility checks

### Requirement: Mark missing or obsolete sidecars pending

When a restored recipe has no search sidecar or its sidecar schema differs from the current schema, restore SHALL upsert pending lexical and embedding status for that recipe.

#### Scenario: Missing sidecar
- **WHEN** a recipe was reconstructed without search.index.json
- **THEN** restore marks its search document pending

#### Scenario: Obsolete schema
- **WHEN** a readable sidecar has an incompatible schema version
- **THEN** restore marks its search document pending

### Requirement: Export complete aggregate history without voter data

The existing backup workflow SHALL write a versioned, complete aggregate-history artifact, including an explicit empty dataset. Export SHALL use a consistent history generation and preserve recipe/week keys, counts and selection snapshots without historical voter fields.

#### Scenario: Export after touched zero
- **WHEN** a row was removed by a zero-like revote before export
- **THEN** the complete artifact omits it and cannot leave an older nonempty artifact masquerading as current

#### Scenario: Concurrent export and close
- **WHEN** history changes while export runs
- **THEN** the artifact represents one committed generation, never a partially applied close

### Requirement: Restore authoritative history snapshots idempotently

A valid complete history artifact SHALL replace history within its declared household scope after dependencies are resolved. Repeating restore SHALL not accumulate counts. An absent legacy artifact SHALL preserve existing destination history or leave an empty destination empty; an explicit empty artifact SHALL clear the declared scope.

#### Scenario: Repeat restore
- **WHEN** the same snapshot is restored twice
- **THEN** the resulting aggregates and snapshot fields are identical, not doubled

#### Scenario: Absent versus empty
- **WHEN** one restore omits history and another supplies an explicitly empty versioned history artifact
- **THEN** absence preserves destination history; explicit empty replaces it with empty

#### Scenario: Bad artifact
- **WHEN** history version, week key or positive-count validation fails
- **THEN** history replacement is not committed; the management result reports failure rather than treating it as empty

#### Scenario: Missing dependency
- **WHEN** a history artifact references a recipe unavailable after dependency restore
- **THEN** history restore does not create a phantom recipe or partially replace its scope; the failure is reported

#### Scenario: Removed row
- **WHEN** the destination has a stale positive row absent from a valid complete snapshot
- **THEN** successful scoped replacement removes it instead of resurrecting it through merge

#### Scenario: Restore invalidates stale requests
- **WHEN** a complete history snapshot is successfully restored
- **THEN** operational close receipts from the prior restored world cannot mutate a new round, and affected historical continuation generations are invalidated for restart
