# Spec Delta

## MODIFIED Requirements

### Requirement: Select recipes with persisted export payload

For non-deleted recipes, export SHALL write metadata when a retained source PDF exists, or a nonempty name has images or synthesis, or canonical ingredient content, raw metadata, notes or a known rating provides payload. Otherwise it SHALL skip the recipe.

#### Scenario: Ready-shaped recipe
- **WHEN** a non-deleted recipe has a name and positive image count but no metadata, notes or known rating
- **THEN** export writes recipe.info

#### Scenario: Empty placeholder
- **WHEN** a recipe has no source PDF, name, images, synthesis, raw metadata, notes or known rating
- **THEN** export skips its metadata file

#### Scenario: Retained PDF
- **WHEN** a non-deleted unfinished recipe retains source.pdf
- **THEN** export includes its metadata regardless of the ordinary payload test

#### Scenario: Canonical content is the retained payload
- **WHEN** a non-deleted recipe has canonical ingredient facts but no other ordinary export payload
- **THEN** export includes that recipe rather than skipping its canonical content

### Requirement: Refresh metadata while retaining existing recipe content

For an included recipe, export SHALL refresh recipe.info and replace recipe.json with current version-2 supported database content, including cleared values, exact canonical quantities/notation, ingredient/step identities, bindings, units/packages, shopping identities, content revisions/evidence/protection, separate serving basis and retained normalized metadata. Retired health, dietary and balance fields SHALL remain omitted. Original, PDF/page and hero media SHALL remain untouched; recipe.info SHALL NOT become another current ingredient owner.

#### Scenario: Existing recipe content
- **WHEN** an included recipe already has recipe.json
- **THEN** export replaces stale content with current database content

#### Scenario: New recipe content
- **WHEN** recipe.json is absent and ingredients are present
- **THEN** export creates serialized recipe content

#### Scenario: Metadata refresh
- **WHEN** an included recipe has changed notes or rating
- **THEN** export updates those fields in recipe.info

#### Scenario: Cleared content
- **WHEN** an included recipe has cleared ingredients or raw metadata since its previous export
- **THEN** the new file represents the cleared values and cannot replay the old values

#### Scenario: Repeated current-content round trip
- **WHEN** a current recipe export is restored and exported repeatedly
- **THEN** supported raw recipe content remains unchanged instead of nesting the export envelope into raw metadata

#### Scenario: Full canonical content round trip
- **WHEN** an exported canonical recipe is restored through the supported version-2 format
- **THEN** line identity/order, current descriptions, independently optional quantities/units, provenance, retained evidence and human protection remain equivalent
- **AND** explicit unknown basis or cleared current lines do not replay old values from metadata

### Requirement: Reconstruct recipes from retained metadata and content

Restore SHALL scan retained recipe IDs and skip IDs with neither recipe.info nor recipe.json. Valid recipe.info SHALL provide primary supported metadata; decoded recipe.json SHALL provide canonical ingredients, separate serving basis, retained normalized metadata and supported content fallbacks. Existing management seed SHALL preflight declared current-format input and its internal integrity inventory before any mutation; legacy input is permitted only in the separate one-time forward importer.

#### Scenario: Metadata and content
- **WHEN** valid recipe.info and recipe.json exist for a recipe ID
- **THEN** restore uses info metadata and reads supported ingredient content from recipe.json

#### Scenario: No metadata files
- **WHEN** a recipe directory has neither metadata file
- **THEN** restore skips that recipe ID

### Requirement: Merge recipes without replacing unrelated stored state

Restore SHALL add absent recipe IDs or update supported metadata/content of existing IDs, including soft-deleted IDs. Ingredient replacement SHALL require the supported format and revision/provenance reconciliation; a stale or unprovably divergent current-format record SHALL NOT overwrite newer/protected facts; identical revision with different content SHALL be rejected. Existing deletion markers, attribution and creation time SHALL remain unchanged during that update.

#### Scenario: Existing recipe
- **WHEN** a loaded recipe ID already exists with different notes and name
- **THEN** restore updates notes and name without adding another recipe

#### Scenario: Soft-deleted existing recipe
- **WHEN** a loaded recipe ID is soft-deleted in the database
- **THEN** restore updates its supported fields while retaining its deletion marker

#### Scenario: Database-only recipe
- **WHEN** a database recipe has no loaded disk record
- **THEN** restore leaves that row in place

#### Scenario: Older content targets a richer current recipe
- **WHEN** a supported current-format export has stale or divergent facts/protection relative to the destination
- **THEN** merge preserves those current facts and reports the ingredient conflict or review outcome instead of silently replacing newer or divergent live edits

#### Scenario: Recipe changes during merge reconciliation
- **WHEN** a destination content revision changes after restore inspected it but before ingredient publication
- **THEN** that stale ingredient replacement is deferred or reported without overwriting the newer revision

### Requirement: Online independent exact recovery
The system SHALL provide explicit exact snapshot and restore operations distinct from merge/import, with operator-configured independent storage outside live roots. Current snapshot version 2 SHALL contain authoritative supported row membership, explicit empty collections, complete version-1 history and verified media bytes. Soft-deleted recipes SHALL retain history dependencies; permanently purged recipes and history SHALL be absent.

#### Scenario: Concurrent online snapshot
- **WHEN** an authenticated operator captures a snapshot while requests and workers operate
- **THEN** cooperating writes drain and coordinate for a bounded interval, reads remain available, and the published independent set contains mutually consistent database facts and media
- **AND** timeout or missing media fails capture without replacing a prior complete snapshot

#### Scenario: Online exact restore with preflight
- **WHEN** an operator selects a complete snapshot
- **THEN** all format, schema, membership, relationships and media integrity are validated in staging before any live change
- **AND** exact publication replaces supported destination facts, invalidates stale rounds/continuations/work and rebuilds derived state
- **AND** health and recovery status remain available while final publication briefly coordinates household requests

#### Scenario: Interrupted cross-store publication
- **WHEN** interruption occurs around file-generation activation or database commit
- **THEN** recovery selects the complete committed state or restores the complete prior state before household operations resume
- **AND** retry neither duplicates facts/history nor reports an incomplete restore as successful

#### Scenario: Legacy omission is not exact emptiness
- **WHEN** exact restore receives an unsupported version or missing required artifact including required current canonical/household/history artifacts
- **THEN** preflight rejects it without changing live state
- **AND** current-format ordinary merge retains its distinct replacement/preservation boundaries after successful complete preflight; demo baseline compatibility and missing-history behavior follow the demo-household capability

#### Scenario: Exact snapshot includes canonical ownership
- **WHEN** a compatible exact snapshot is captured after canonical write cutover
- **THEN** it includes authoritative exact canonical facts, ingredient/step/binding identities, every persisted food association/label/override and its required references, content/check revisions, source evidence/protection, serving/preparation state and required durable conversion/refresh work with matching media
- **AND** restore preserves human facts and does not silently substitute legacy-only rows

#### Scenario: Historical pre-adoption inspection
- **WHEN** read-only inspection examines a historical pre-adoption source with absent optional vocabulary and null mappings
- **THEN** it reports those original facts without inventing food identities or translations
- **AND** that inspection does not authorize the final new app to perform a full restore from an incomplete old backup; the final declared format requires the durable vocabulary and all saved references

#### Scenario: Final full snapshot with unmapped recipes
- **WHEN** the adopted bilingual release captures a full snapshot whose recipe mappings include null or ambiguous entries
- **THEN** it includes the durable versioned vocabulary JSON and preserves those source labels/null mappings honestly, without AI regeneration or forced mapping

#### Scenario: Old snapshot has an incompatible canonical schema
- **WHEN** an exact snapshot predates required canonical storage and fails schema or membership preflight
- **THEN** exact restore rejects it before live publication rather than treating missing facts as empty or running implicit conversion

#### Scenario: Preserve checked-demand comparison baseline
- **WHEN** ordinary current-format recovery, outside the separately selected migration rebuild, restores a checked row acknowledged at 2–3 whose current demand is 3–4
- **THEN** recovery retains checked state and original baseline 2–3 together; subsequent 4–5 demand unchecks rather than using restored current 3–4 as a new baseline
- **AND** unchecked rows have no active baseline and unknown/incomplete acknowledged baselines do not become known from restored current totals

### Requirement: Distinguish current recipe envelopes from legacy content

Routine export, restore and disk sync SHALL support only the declared current recipe/backup formats, decode canonical content separately from evidence and reject old or malformed input before mutation. Explicit null/empty fields SHALL remain authoritative. One-time forward conversion SHALL be a distinct operation.

#### Scenario: Current recipe envelope
- **WHEN** a version-2 wfs-recipe envelope with complete canonical content is read
- **THEN** original facts, bindings, revisions, evidence and explicit nulls remain separate and faithful

#### Scenario: Disk sync after export
- **WHEN** supported current-format disk sync replays identical content
- **THEN** it is idempotent; stale/divergent content cannot silently overwrite live human facts

#### Scenario: Unsupported content version
- **WHEN** ordinary restore or sync receives version 1, unversioned content or an unsupported snapshot
- **THEN** preflight rejects it clearly before any database/file/household mutation

#### Scenario: Malformed canonical envelope
- **WHEN** identities, exact quantities, references or revision/content consistency are invalid
- **THEN** validation fails before publication without partial canonical facts

### Requirement: Preserve recipe servings without extending recipe info

Current recipe exports SHALL preserve the authoritative nullable original serving basis and raw yield independently. Restore/sync SHALL honor explicit basis and null without reparsing yield; recipe.info SHALL gain no duplicate basis field. Legacy source-yield inference SHALL be limited to the one-time forward importer.

#### Scenario: Current export and restore
- **WHEN** original basis 4 and raw yield “4 portions” round trip
- **THEN** both survive independently and recipe.info gains neither field

#### Scenario: Manually corrected count
- **WHEN** basis 3 differs from raw yield “4 portions”
- **THEN** current-format recovery retains basis 3 without rewriting original ingredient amounts

#### Scenario: Explicit unknown count
- **WHEN** basis is explicitly null
- **THEN** it stays null regardless of retained yield

#### Scenario: Legacy exported envelope
- **WHEN** ordinary restore receives an older envelope lacking canonical serving content
- **THEN** it fails current-format preflight before mutation; explicit forward conversion is separate

#### Scenario: Legacy direct recipe content
- **WHEN** selected one-time forward input contains unambiguous recipeYield “4 portions” and no protected live basis
- **THEN** its staged proposal may infer 4 with provenance, never from ingredient quantities

#### Scenario: Invalid exported count
- **WHEN** current exported basis is zero, negative, fractional or wrong type
- **THEN** preflight rejects without fallback parsing

### Requirement: Tolerate absent or unreadable report artifacts

Current-format recovery SHALL require a valid report artifact, including explicit empty content, and preserve report dependencies and supported normalized interrupted-work states. Missing/unreadable required artifacts SHALL fail preflight; no restore SHALL automatically invoke providers.

#### Scenario: Legacy export
- **WHEN** a selected backup lacks the required report artifact
- **THEN** preflight rejects without live mutation

#### Scenario: Invalid report JSON
- **WHEN** the report artifact is unreadable
- **THEN** preflight fails rather than treating it as empty

### Requirement: Tolerate absent legacy grocery-extra artifacts

Current-format recovery SHALL require valid complete extra-history artifacts including explicit empty collections. Missing, unreadable or unsupported artifacts SHALL fail preflight. After validation, ordinary merge SHALL not infer deletion of destination-only extra history; exact restore SHALL reproduce declared membership.

#### Scenario: Legacy export omits extras
- **WHEN** a backup lacks required extras
- **THEN** preflight rejects without touching destination history

#### Scenario: Explicit empty artifact
- **WHEN** a current-format ordinary merge includes a valid empty extra collection
- **THEN** no occurrence is added or inferred deleted

#### Scenario: Unreadable artifact
- **WHEN** a required extra artifact is unreadable
- **THEN** current-format preflight fails without replacing destination extras

### Requirement: Merge serving exports without inventing portions

After current-format preflight, ordinary merge SHALL validate and upsert represented dated serving state while preserving frozen preparation and date associations. Required serving artifacts SHALL include explicit null/default and empty states; missing or invalid content SHALL fail before mutation. Repeated valid input SHALL not duplicate dates.

#### Scenario: Legacy or invalid artifact
- **WHEN** serving data is missing, malformed or unsupported
- **THEN** preflight fails without replacing destination defaults, dates or counts

#### Scenario: Repeated valid merge
- **WHEN** one valid current-format serving artifact is merged twice
- **THEN** one record per date retains represented overrides and protected snapshots

### Requirement: Restore authoritative history snapshots idempotently

After current-format preflight, a complete aggregate-history artifact SHALL replace history within its declared household scope, preserving privacy and dependencies. Repeating it SHALL not accumulate counts. Missing required history SHALL reject; explicit empty history SHALL clear only the declared scope.

#### Scenario: Repeat restore
- **WHEN** the same valid current-format history is restored twice
- **THEN** aggregate counts and snapshot facts do not double

#### Scenario: Absent versus empty
- **WHEN** history is absent versus an explicitly empty complete artifact
- **THEN** absence fails preflight and explicit empty replaces the declared scope with empty

#### Scenario: Bad artifact
- **WHEN** version, week or count validation fails
- **THEN** replacement is not committed

#### Scenario: Missing dependency
- **WHEN** a required recipe dependency is unavailable
- **THEN** no phantom recipe or partial scope is created

#### Scenario: Removed row
- **WHEN** a complete supported snapshot omits a stale positive destination row in scope
- **THEN** replacement removes it without resurrecting it by merge

#### Scenario: Restore invalidates stale requests
- **WHEN** supported replacement succeeds
- **THEN** prior-world close receipts and continuation generations cannot mutate restored state

### Requirement: Preserve actual preparation and frozen portions through recovery

Current-format exports and restore SHALL preserve occurrence identity, actual preparation date and recorded portion context independently of current recipe content. Exact restore SHALL reproduce them and ordinary merge SHALL retain their association. Unsupported legacy absence SHALL fail ordinary preflight, without fabricated preparation.

#### Scenario: Restore Friday prepared Tuesday
- **WHEN** Friday lasagna prepared Tuesday for six round trips
- **THEN** occurrence, actual Tuesday date and six portions remain, with no duplicate event/history

#### Scenario: Legacy Cooked entry
- **WHEN** in-place migration encounters live legacy Cooked state without actual preparation evidence
- **THEN** it preserves status without fabricating a date; recipe-only fallback never rewrites household preparation

#### Scenario: Read after recovery
- **WHEN** a restored prepared meal is read after the recipe later changes
- **THEN** current content projects to its recorded count without a historical snapshot claim

### Requirement: Count malformed recipe loads without stopping later loads

Current-format restore SHALL validate all declared recipe records in staging before mutation, count malformed records and continue inspection of later records for diagnostics. Required-record failure SHALL reject publication of that input set; it SHALL NOT partially publish a supposedly complete backup.

#### Scenario: Invalid current metadata
- **WHEN** a declared recipe has an ID mismatch, invalid canonical content or no required metadata
- **THEN** preflight records the failure and leaves destination files/database untouched

#### Scenario: Later valid recipe
- **WHEN** an invalid record precedes a valid record
- **THEN** the later record is still inspected and reported valid, without implying it was restored despite failed complete-set preflight

## ADDED Requirements

### Requirement: Evolve existing backup, seed and sync operations

Canonical backup and seed SHALL use the existing Dreaming/management backup and management seed flows and existing disk layout. They SHALL NOT require a new public recovery API or user-facing package workflow. Recipe-only sync and forward reprocessing SHALL NOT invoke household restore. Whole-installation database-and-asset recovery SHALL remain separate disk-loss/rollback protection.

#### Scenario: Existing operation round trip
- **WHEN** a canonical recipe is edited, Dreaming or management backs it up, and management seed loads that disk state into an isolated destination
- **THEN** stable recipe/line/step IDs, exact amounts, bindings, nulls/clears, source/media and supported household/history/extra state survive
- **AND** repeating the same flow neither duplicates identities nor replays cleared values

#### Scenario: Stale recipe sync retry
- **WHEN** an older sync or publication retry encounters newer human content
- **THEN** it preserves the newer content and files or reports the captured revision conflict, without reseeding household state


### Requirement: Persist and recover the versioned bilingual vocabulary

The model-authored bilingual vocabulary SHALL persist as versioned UTF-8 JSON on disk and be included in full backup/restore with all saved references. Stable IDs, EN/FR labels/aliases, qualifiers, revisions and provenance SHALL survive offline recovery. Existing storage/archive/publication owners SHALL be reused. AI regeneration, external dataset downloads and silent reseeding SHALL NOT substitute for retained identity facts.

#### Scenario: Restart with persisted vocabulary
- **WHEN** the application restarts with an existing valid versioned vocabulary file
- **THEN** it loads the saved identity facts without AI/network generation or overwriting them with another revision

#### Scenario: Complete independent round trip
- **WHEN** a full current-format backup is restored into an independently selected isolated destination and re-exported
- **THEN** the vocabulary JSON's stable IDs, labels/aliases, qualifiers, revisions and provenance, all saved recipe mappings and protected household overrides remain equivalent and reference-complete
- **AND** the restored captured vocabulary bytes are retained rather than regenerated from model knowledge

#### Scenario: Missing or corrupt required identity artifact
- **WHEN** the selected full backup omits the required vocabulary JSON or contains invalid format, checksum, revision, collision or reference membership
- **THEN** complete preflight fails before dependent database, file or household writes
- **AND** absence is not treated as an empty vocabulary or repaired by AI or a default seed

#### Scenario: Existing vocabulary differs from staged input
- **WHEN** an ordinary dictionary publication or merge encounters a different existing revision/hash than its captured destination
- **THEN** it preserves the existing file and reports the conflict without blind overwrite or timestamp-based precedence
- **AND** explicitly selected exact restore retains its complete preflight and replacement authority

#### Scenario: Initial vocabulary creation
- **WHEN** a reviewed initial vocabulary is installed into captured absent membership
- **THEN** creation is guarded against a concurrently appearing file or existing dependent references that require another retained revision

#### Scenario: Snapshot races with identity publication
- **WHEN** a vocabulary or saved mapping changes during snapshot capture
- **THEN** the capture boundary produces one consistent file/reference revision or rejects the snapshot without replacing a prior complete backup

#### Scenario: Interrupted vocabulary and mapping publication
- **WHEN** interruption occurs between staged vocabulary activation and dependent database publication
- **THEN** existing durable recovery reconciles the complete committed or complete prior state before dependent household writes resume
- **AND** retry preserves stable IDs and human corrections without reseeding, dropping referenced definitions or replaying stale mappings

### Requirement: Migrate in place before considering a recipe-only disk fallback

Default upgrade SHALL convert live recipes in place with stable IDs and protected household relationships. Per-recipe publication SHALL be revision-guarded, atomic, resumable and idempotent; unrepresentable trusted facts SHALL defer with usable content. Every plan/event SHALL remain preserved while all grocery lists rebuild. Check/baseline resets SHALL be confined to the fenced migration epoch.

#### Scenario: Preserve complete calendar during conversion
- **WHEN** in-place migration converts recipe content and rebuilds every persisted or assignment-implied grocery week
- **THEN** every planned meal/event retains IDs, dates, status, recipe links, servings and prepared/cooked facts
- **AND** manual extra occurrences, corrections and recurrence/removal/history links and all other protected facts remain intact

#### Scenario: Interrupted batch
- **WHEN** upgrade stops after some recipes commit
- **THEN** retry retains completed IDs and exact facts and resumes only remaining approved inputs

#### Scenario: Human edit during conversion
- **WHEN** live content changes after dry-run capture
- **THEN** that recipe conflicts without overwriting the change

#### Scenario: Unknown measurement
- **WHEN** a legacy row has no proven numeric association
- **THEN** current text, evidence and valid unknown fields survive without positional guessing

### Requirement: Bound one-time forward conversion independently of routine restore

A one-time importer SHALL declare accepted legacy source formats, selected IDs, input hashes and intended fields in a no-write manifest. It SHALL NOT act as a permanent old-backup restore adapter or automatically invoke extraction. Ordinary current-format restore SHALL not dispatch it.

#### Scenario: Legacy source file
- **WHEN** approved forward input contains supported arrays or serialized arrays
- **THEN** staged conversion retains exact wording and only proven original facts

#### Scenario: Wrong operation
- **WHEN** the same old file is sent to routine restore
- **THEN** unsupported format fails before mutation

### Requirement: Restrict conditional reseed to reviewed recipe fields

Recipe-only fallback SHALL require a documented in-place blocker and stable-ID disk/database comparison. Unexpected content or membership differences SHALL stop fallback before writes. It SHALL preserve IDs, plans/events, household and history membership, database-only recipes and media/source links without delete-all or resurrection. Grocery-derived changes SHALL remain confined to the declared migration rebuild.

#### Scenario: Divergent disk and live
- **WHEN** fallback assessment finds unexpected differences in supported recipe facts after allowing documented representation-only conversion
- **THEN** it stops fallback before mutation and reports stable IDs and differing fields; neither timestamps nor assumed Dreaming synchronization choose a winner

#### Scenario: Missing disk ID
- **WHEN** a live recipe has no file or a file names an absent ID
- **THEN** assessment stops and reports the missing stable ID before fallback mutation; live records remain and no recipe is auto-created, purged or resurrected

#### Scenario: Protected fields
- **WHEN** approved fallback publishes selected recipe content
- **THEN** before/after protected household hashes and relationships remain equivalent

#### Scenario: Expected synchronized recipe content
- **WHEN** a necessary fallback finds matching disk/database recipe IDs and supported content under its documented comparison
- **THEN** it may stage the reviewed recipe conversion while preserving household data, without requiring an elaborate UI-edit conflict-resolution workflow

### Requirement: Gate cutover on compatible clients and verified recovery

Write activation SHALL require old-writer fencing, supported draft recovery, isolated rehearsal, verified all-list rebuild and an independent rollback pair. Every plan/event SHALL remain preserved; no idle-list or clearing prerequisite applies. A fresh complete backup with the durable vocabulary and saved references SHALL be read back after conversion. Dispatch alone SHALL NOT establish completed migration or recovery.

#### Scenario: Old tab submits full editor payload
- **WHEN** an old tab sends a legacy ingredient/instruction payload to a canonical record, including a payload carrying a current content revision
- **THEN** it conflicts atomically without partial mutation and the supported refresh route retains recoverable draft fields for reconciliation

#### Scenario: Old backup rejection
- **WHEN** an old backup is selected on the new app
- **THEN** it is clearly unsupported without mutation or implicit upgrade

#### Scenario: Migration interval
- **WHEN** conversion fails before the new backup exists
- **THEN** the operator has a verified pre-cutover snapshot with its exact compatible executable/schema and a rehearsed recovery route

### Requirement: Reuse recovery coordination for planned deployment maintenance

Frontend, backend and schema SHALL deploy together during planned maintenance.
The write/worker hold SHALL reuse existing demo/online-recovery coordination and
snapshot owners, preserve household state and recoverable drafts, and remain
effective across process restart until validation permits reopening. No new recovery
subsystem, independent rolling-version support or legacy canonical-write translation
is required.

#### Scenario: Coordinated deployment restarts application processes
- **WHEN** the operator rehearses the frontend/backend/schema deployment during planned downtime
- **THEN** writes and workers remain held across shutdown and restart, while the supported maintenance/recovery status remains truthful
- **AND** the application reopens only after the selected schema, converted facts, required recovery read-back and derived-state checks pass, without invoking demo reset, clearing household/history/extra state or discarding recoverable drafts
- **AND** a lease acquired before shutdown alone does not establish protection after restart

#### Scenario: Deployment or validation fails before reopening
- **WHEN** interruption or failed validation prevents the coordinated release from completing
- **THEN** the household remains unavailable for mutation until the rehearsed compatible recovery or forward completion establishes a usable state
- **AND** no process restart or queued recovery action alone is reported as successful cutover

#### Scenario: Maintenance lease holder is lost
- **WHEN** the operator's publication lease ends after durable maintenance intent was installed
- **THEN** subsequent writes, workflow work and recovery publication remain blocked across application restart until explicit verified reopening
- **AND** malformed or unreadable maintenance intent cannot silently reopen the household

## REMOVED Requirements

### Requirement: Read supported legacy recipe content

**Reason**: Routine recovery supports only the declared current format after cutover.

**Migration**: Use explicit bounded one-time forward conversion of approved recipe source files before cutover; unsupported old backups fail routine preflight without mutation.
