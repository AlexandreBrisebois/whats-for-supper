# Search indexing Specification

## Purpose

Produce and repair published recipe search documents and materialized filter and affinity state, preserving lexical availability, embedding compatibility and superseding-content guards independently of search requests.

## Relocation provenance (non-normative)

These requirements were relocated unchanged from their original capability owners. All applicable BSL/U/A qualifications, partial-success boundaries and deferred runtime/API/browser/database/model evidence transfer with them. Relocation establishes no new behavioral guarantee.

- [recipe-search evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-search.md)
- [data-backup-and-recovery evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/data-backup-and-recovery.md) and [preserved qualification text](../data-backup-and-recovery/spec.md#evidence-and-qualifications-non-normative)

## Capability dependencies (non-normative)

Preserved references to the former combined owners resolve through these current capability links. Each requirement retains its original normative text.

- [Choose browse only without usable search content](../recipe-search/spec.md#requirement-choose-browse-only-without-usable-search-content)
- [Mark search-derived recipe state pending with supported updates](../recipe-editing/spec.md#requirement-mark-search-derived-recipe-state-pending-with-supported-updates)
- [Export ready search documents as sidecars](../data-backup-and-recovery/spec.md#requirement-export-ready-search-documents-as-sidecars)
- [Rebuild lexical search content during compatible restore](../data-backup-and-recovery/spec.md#requirement-rebuild-lexical-search-content-during-compatible-restore)
- [Compose maintenance without waiting for launched child completion](../scheduled-maintenance/spec.md#requirement-compose-maintenance-without-waiting-for-launched-child-completion)
- [Finalize only overdue planned or locked recipe assignments](../planning-lifecycle/spec.md#requirement-finalize-only-overdue-planned-or-locked-recipe-assignments)

## Requirements

### Requirement: Materialize affinity from eligible stored recipes

Filter materialization SHALL use ready, undeleted recipes with nonblank Cuisine. Each selected recipe's affinity SHALL be likes minus dislikes plus its Cooked calendar-event count; last-cooked date SHALL be the latest such event date, or null.

#### Scenario: Ineligible recipe facts
- **WHEN** materialization encounters unready, deleted or absent-cuisine recipes
- **THEN** those recipes do not contribute materialized facts or cuisine vocabulary

#### Scenario: Stored cooking evidence
- **WHEN** a selected recipe has two likes, one dislike and two Cooked events
- **THEN** its affinity is three and its last-cooked date is the later Cooked event date

### Requirement: Materialize deterministic cuisine choices

Materialization SHALL produce ordinal-distinct, ordinal-sorted full cuisines and at most six promoted cuisines. For equal promotion scores and summed affinity, cuisine ordinal order SHALL determine promotion order. The calendar reference and recency-window policy are withheld pending WFS-BL-005; current source behavior is recorded non-normatively in design.md.

#### Scenario: Stable materialization inputs
- **WHEN** materialization is repeated with identical stored evidence and injected clock value
- **THEN** it produces equivalent cuisine choices

#### Scenario: Equal cuisine scores
- **WHEN** cuisine scores and summed affinity tie
- **THEN** ordinal cuisine order determines promotion order

### Requirement: Persist filter snapshot and facts as one materialization

When database saves and commit succeed, materialization SHALL replace prior affinity facts and persist the singleton full/promoted cuisine snapshot with its generation time through one transaction. Search requests SHALL consume stored state rather than invoking this producer. This documents the persistence boundary, not runtime-qualified rollback or crash recovery.

#### Scenario: Repeated successful generation
- **WHEN** materialization succeeds again with unchanged inputs and clock
- **THEN** the stored facts and cuisine choices remain equivalent and there is one current snapshot

#### Scenario: Cancellation before generation completes
- **WHEN** cancellation stops materialization before its writes
- **THEN** it does not replace the previously stored snapshot

### Requirement: Initialize filters after overdue finalization

Startup initialization SHALL invoke overdue-meal finalization before materialization. Its hosted boundary SHALL log an initialization exception. A later startup SHALL be able to invoke initialization again; no current-process retry loop or freshness deadline is established. Scheduled Dreaming dependencies remain owned by data-backup-and-recovery.

#### Scenario: Startup initializes cooking facts
- **WHEN** startup initialization successfully finalizes an overdue planned recipe and materializes filters
- **THEN** the resulting facts include the newly Cooked event

#### Scenario: Initialization fails
- **WHEN** startup initialization throws
- **THEN** the hosted boundary logs the failure without establishing successful new materialization

### Requirement: Skip obsolete or contentless search index work

Index work SHALL return without publishing when the recipe is absent/deleted, a supplied nonempty fingerprint differs from current content, canonical text is empty, or the search document is absent at publication. Such returns SHALL NOT establish that an index was created.

#### Scenario: Stale fingerprint
- **WHEN** the requested fingerprint differs from current recipe content
- **THEN** the work leaves the search document unchanged

#### Scenario: Pending PDF has no text
- **WHEN** a retained PDF recipe has no extracted canonical text
- **THEN** indexing leaves its pending search document unpublished

### Requirement: Publish lexical content before optional embedding work

Indexing eligible content SHALL persist canonical text, metadata, schema version, source fingerprint, lexical ready status and indexing time before generating an embedding. With no embedding provider it SHALL leave embedding status pending while preserving published lexical content.

#### Scenario: Provider unavailable
- **WHEN** lexical publication succeeds and no embedding provider is supplied
- **THEN** the document remains lexical-ready with embedding pending

#### Scenario: Embedding succeeds
- **WHEN** the provider returns a nonempty vector and the stored source fingerprint still matches
- **THEN** indexing persists the vector with its model, matching embedding fingerprint and ready embedding status

### Requirement: Protect superseding search content during embedding publication

Before persisting an embedding result, indexing SHALL reload the search document and compare its source fingerprint to the indexed content. A different fingerprint SHALL prevent the older embedding from being published.

#### Scenario: Newer content arrives during provider work
- **WHEN** the reloaded document has a different source fingerprint
- **THEN** the old embedding result is not saved over that document

### Requirement: Retain lexical content when embedding work fails

An embedding exception or empty vector SHALL enter the indexing failure path. When the stored fingerprint still matches and failure persistence succeeds, embedding status SHALL become failed while lexical content remains ready. The exception SHALL propagate to shared workflow handling; successful retry is not guaranteed.

#### Scenario: Provider exception
- **WHEN** embedding generation throws after lexical publication
- **THEN** matching content remains lexical-ready, embedding status is marked failed and the exception propagates

#### Scenario: Empty provider result
- **WHEN** the provider returns an empty vector for nonempty content
- **THEN** indexing rejects that result through the failure path without publishing an empty embedding

### Requirement: Repair derived search state in bounded batches

Search reconciliation SHALL scan ready non-deleted recipes in increasing ID order after an optional cursor, at most 50 per invocation. It SHALL attempt current-fingerprint index dispatch for missing/stale/pending/failed derived state when no equivalent Pending or Processing index workflow is found, and request continuation when a batch contains 50 recipes.

#### Scenario: Missing search state
- **WHEN** a ready active recipe has no search document and no equivalent active workflow
- **THEN** reconciliation creates pending state and requests current-fingerprint indexing

#### Scenario: Equivalent work active
- **WHEN** a Pending or Processing index workflow already represents the same recipe and fingerprint
- **THEN** reconciliation does not request another equivalent job in that invocation

#### Scenario: Full batch
- **WHEN** the scan returns 50 recipes
- **THEN** reconciliation requests another batch after the last scanned ID

### Requirement: Acknowledge background backfill dispatch separately

An authenticated POST /api/management/backfill-search SHALL return HTTP 202 with message “Search index backfill triggered in the background.” while a background attempt requests search reconciliation. The response SHALL contain no taskId.

#### Scenario: Background launch failure
- **WHEN** reconciliation acceptance throws inside the background attempt
- **THEN** the failure is logged independently of the already returned HTTP acceptance
