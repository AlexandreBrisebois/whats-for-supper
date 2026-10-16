# Spec Delta

## Purpose

Find existing household recipes through Search, with evidenced retrieval, selection and recovery boundaries.

## ADDED Requirements

### Requirement: Bound alternatives and reject unsupported requests

POST search SHALL default to 12 alternatives and reject supplied limits outside 1 through 50 with 400. A Top Pick SHALL be separate from that alternatives count. A nonempty excludedIngredients list SHALL return 400 rather than promise exclusions. The browser adapter SHALL accept raw or data-enveloped successful responses and retain HTTP failure status for continuation recovery.

#### Scenario: Out-of-range limit

- **WHEN** a household search supplies limit 99
- **THEN** the server returns 400

#### Scenario: Unsupported exclusion

- **WHEN** a household search supplies a nonempty excludedIngredients list
- **THEN** the server returns 400

#### Scenario: Top Pick plus alternatives

- **WHEN** a successful response has enough candidates for the requested alternatives and a Top Pick
- **THEN** Top Pick does not consume an alternative slot

### Requirement: Load continuation through the result sentinel

When a current response has nextCursor and an observer reports the result sentinel intersecting, Search SHALL request continuation with current query, filters, preferences, similar and planning context. Browse SHALL request 24 alternatives and ranked paths 12. Only one continuation SHALL be in flight for that search generation.

#### Scenario: Repeated observer notifications

- **WHEN** the sentinel is reported intersecting repeatedly while its generation continuation is pending
- **THEN** only one continuation request starts

#### Scenario: No cursor

- **WHEN** the response supplies no nextCursor
- **THEN** Search presents no continuation sentinel or request through that cursor

### Requirement: Append current continuation without repeating loaded alternatives

A continuation success belonging to the current search and promotion generation SHALL append alternatives whose identities are absent from already loaded alternatives, retain the existing Top Pick and adopt the next cursor. A ranked continuation SHALL not return another Top Pick. Exhaustion SHALL be represented by no next cursor.

#### Scenario: Page arrives

- **WHEN** a current continuation contains both an already loaded alternate identity and a new one
- **THEN** the existing alternate is not appended again and the new one is appended

#### Scenario: Ranked pool exhausted

- **WHEN** the final ranked snapshot page is returned
- **THEN** it has no Top Pick or next cursor

### Requirement: Keep ranked continuation eligibility narrower than a fresh search

Ranked continuation SHALL retain its initial candidate order while rechecking current recipe readiness, deletion and the supported current recipe-field predicates, including Cuisine and Meal. It SHALL NOT promise reranking or replacement of stored display fields, report status or promotion flags from a fresh search.

#### Scenario: Cuisine changes

- **WHEN** an unserved ranked candidate no longer satisfies selected Cuisine or Meal at continuation time
- **THEN** it is excluded by the eligibility recheck

#### Scenario: Ranked state changes

- **WHEN** ranking or display facts change after the initial ranked search
- **THEN** continuation does not establish fresh ordering or fresh display fields

### Requirement: Reject unavailable or incompatible continuation state

A continuation token SHALL be rejected with 409 and restart guidance when missing from the current process store, expired, evicted or incompatible with the request fingerprint. Fingerprinting SHALL include query, similar target, planner target, filters and preferences while allowing continuation page size to differ. Cursor availability SHALL be bounded to process-local retained state with a ten-minute entry lifetime and capacity limit.

#### Scenario: Unknown token

- **WHEN** a search supplies a token absent from the current process
- **THEN** the response is 409 with restart guidance

#### Scenario: Changed preferences

- **WHEN** a retained token is reused with changed preferences
- **THEN** the token is rejected with restart guidance

#### Scenario: Changed batch size

- **WHEN** a retained compatible token is reused with only a valid limit change
- **THEN** that limit difference alone does not invalidate the fingerprint

### Requirement: Retain cards and expose continuation retry or restart

A continuation request failure for the current search generation SHALL retain loaded cards. A 409 SHALL expose Restart search, submitting a fresh initial request with current search context; other failures SHALL expose Load more retry using the cursor. These actions SHALL offer another attempt without promising successful recovery.

#### Scenario: Continuation expired

- **WHEN** a current continuation request returns 409
- **THEN** loaded cards remain and Restart search is offered

#### Scenario: Continuation fails otherwise

- **WHEN** a current continuation request fails with another status
- **THEN** loaded cards remain and Load more retry is offered

### Requirement: Suppress obsolete search success without claiming network cancellation

Initial, replacement and continuation successes SHALL be ignored when their captured search generation or promotion version no longer matches current state. The initial effect SHALL also ignore completion after its cleanup. These guards SHALL NOT establish cancellation of browser network requests or suppression of every obsolete failure presentation.

#### Scenario: Older initial browse finishes

- **WHEN** a newer text search has already advanced the search generation
- **THEN** the old initial success cannot replace the newer results

#### Scenario: Old continuation finishes

- **WHEN** a replacement search or promotion invalidation occurred before continuation success
- **THEN** that success is not appended to current data

### Requirement: Restart mounted browse after received promotion invalidation

When Search observes a changed promotion generation, cards from the previous generation SHALL not be displayed or used for Surprise Me. For loaded browse data, Search SHALL attempt a fresh initial request retaining query, filters, preferences, similar and planner context. Invalidation delivery SHALL remain with household-live-updates Signal candidate freshness separately from fetching results.

#### Scenario: Browse invalidated

- **WHEN** a mounted browse observes a newer promotion generation
- **THEN** old cards are withheld and a replacement initial request is scheduled with active context

#### Scenario: Ranked data invalidated

- **WHEN** a mounted non-browse response becomes obsolete
- **THEN** old cards are withheld but this browse-only effect does not establish an automatic ranked refresh
