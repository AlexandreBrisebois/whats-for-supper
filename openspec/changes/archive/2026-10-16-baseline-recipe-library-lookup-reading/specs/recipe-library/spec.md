# Spec Delta

## ADDED Requirements

### Requirement: Return newest-created library pages by default

Authorized GET `/api/recipes` without order SHALL sort eligible records by creation time descending. Existing list eligibility, filter count, normalized pagination and unwrapped response ownership SHALL apply; equal creation times SHALL NOT imply a stable tie order.

#### Scenario: Read without an order parameter
- **WHEN** an authorized list request omits order and succeeds with distinct creation timestamps
- **THEN** newer-created eligible records precede older-created records on the requested offset page

### Requirement: Constrain library lookups by supplied predicates

List lookup SHALL apply each supplied ID, nonblank name and nonblank URL conjunctively to the already eligible collection. ID SHALL match exactly. Name and URL SHALL compare exact lowercased values after trimming the requested filter. Null/whitespace name or URL SHALL add no predicate. This SHALL NOT canonicalize URLs or perform substring matching.

#### Scenario: Lookup an exact recipe ID
- **WHEN** an authorized list request supplies an eligible recipe ID and succeeds
- **THEN** only that ID can match before pagination

#### Scenario: Lookup a trimmed case-insensitive exact name
- **WHEN** an authorized list request supplies a nonblank name with different case and surrounding whitespace
- **THEN** only eligible records with an equal lowercased stored name match

#### Scenario: Lookup a trimmed case-insensitive exact URL
- **WHEN** an authorized list request supplies a nonblank URL with different case and surrounding whitespace
- **THEN** only eligible records with an equal lowercased stored source URL match

#### Scenario: Combine lookup predicates
- **WHEN** ID, name and URL are supplied together and the successful list query evaluates them
- **THEN** a record must satisfy all supplied predicates and existing ready/nondeleted/discoverable eligibility

#### Scenario: Ignore blank text filters
- **WHEN** a successful authorized list request supplies null or whitespace-only name or URL
- **THEN** that text filter does not narrow the eligible collection

### Requirement: Reject unsupported library order parameters

GET `/api/recipes` with a non-null order other than a case-insensitive spelling of explore SHALL return HTTP 400 with an error identifying explore as allowed. This rejection rule SHALL NOT guarantee that mixed-case accepted spellings receive explore sorting.

#### Scenario: Reject an unsupported order
- **WHEN** an authorized request sends order invalid
- **THEN** the API returns HTTP 400 with an error mentioning explore rather than a recipe page
