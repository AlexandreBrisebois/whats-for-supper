# Spec Delta

## Purpose

Find existing household recipes through Search, with evidenced retrieval, selection and recovery boundaries.

## ADDED Requirements

### Requirement: Choose browse only without usable search content

With no similar target, no nonblank text and no usable preference concepts, Search SHALL return browse results without generating a query embedding. Candidates SHALL use recipe-library readiness/deletion facts; recipes need not be discoverable unless a supported filter restricts them. Browse SHALL remain available without a published lexical or semantic document.

#### Scenario: Blank content

- **WHEN** a request has whitespace text and only blank concepts without a similar target
- **THEN** the service follows browse without query embedding generation

#### Scenario: Recipe not indexed

- **WHEN** an otherwise browse-eligible recipe has no search document
- **THEN** the missing document alone does not exclude it from browse

### Requirement: Retrieve typed lexical candidates from published documents

Typed ranked search SHALL retrieve a bounded set of ready, undeleted recipes whose published nonempty canonical search documents match the query phrase or a query term. Retrieval SHALL rank lexical candidates using the document match score before later modifiers. A rating or vote boost SHALL NOT independently retrieve an otherwise absent candidate.

#### Scenario: Published text matches

- **WHEN** an eligible published document matches a query term
- **THEN** it can enter the bounded lexical candidate pool

#### Scenario: No matching document

- **WHEN** a loved recipe has no matching published lexical document and is not retrieved semantically
- **THEN** its rating alone does not add it to results

### Requirement: Attempt compatible semantic retrieval when enabled

For ranked text or concept search with semantic retrieval enabled and available dependencies, Search SHALL attempt query embedding and bounded vector retrieval. Semantic candidates SHALL require a ready document and ready embedding matching its source fingerprint, configured model, version and dimensions, in addition to hard filters and recipe eligibility.

#### Scenario: Stale or incompatible vector

- **WHEN** a candidate embedding has a different fingerprint, model, version or dimension
- **THEN** that vector is excluded from semantic candidate retrieval

#### Scenario: Compatible pool

- **WHEN** eligible vectors satisfy configured compatibility and hard filters
- **THEN** the nearest bounded candidates can participate in ranked results

### Requirement: Use Focus concepts as semantic search content

Search SHALL trim and deduplicate nonblank preference concepts, joining them with nonblank query text for semantic retrieval. With only usable concepts it SHALL use a ranked semantic attempt rather than browse. A successful concept-only semantic attempt returning no candidates SHALL remain empty instead of substituting lexical matches.

#### Scenario: Concept-only request

- **WHEN** text is blank and a nonblank fish concept is supplied
- **THEN** ranked semantic retrieval is attempted when enabled and available

#### Scenario: Semantic zero match

- **WHEN** that concept-only semantic attempt succeeds with no compatible candidates while a lexical match exists
- **THEN** the response remains empty rather than treating zero candidates as a provider failure

### Requirement: Fall back from unavailable semantic work without promising relevance

Disabled or unavailable semantic retrieval SHALL allow typed lexical serving. A semantic timeout or provider/vector exception SHALL fall back to lexical candidates; concept-only fallback SHALL search using the usable concepts. Caller cancellation observed during semantic work SHALL propagate rather than be converted to semantic-failure fallback.

#### Scenario: Typed provider failure

- **WHEN** an attempted semantic provider throws while the caller remains active
- **THEN** the already retrieved typed lexical candidates are served

#### Scenario: Concept fallback

- **WHEN** semantic work is disabled, unavailable, times out or errors for a concept-only request
- **THEN** lexical retrieval uses the nonblank concepts with the active hard filters

#### Scenario: Caller cancels

- **WHEN** the caller cancellation token is canceled during semantic work
- **THEN** cancellation propagates instead of being handled as a fallback-only timeout

### Requirement: Enter Similar from loaded detail

Activating Find similar in Search detail SHALL dismiss detail, clear the visible query and submit the loaded recipe identity as the similar target while retaining active filters, preferences and planning context. Similar SHALL exclude the source recipe and return no candidates when that source is missing, deleted or not ready.

#### Scenario: Find similar action

- **WHEN** the person activates Find similar on a loaded recipe
- **THEN** detail closes and an empty-query request identifies that recipe as similar target

#### Scenario: Source unavailable

- **WHEN** the source is missing, deleted or not ready when Similar is evaluated
- **THEN** no similar candidates are returned

### Requirement: Rank Similar using source recipe facts with lexical recovery

Similar SHALL use a compatible ready source embedding for candidate retrieval when enabled and available, falling back to a bounded lexical query from source facts if unavailable or failed. Candidate filters and source exclusion SHALL apply before retrieval limits. Ranking SHALL combine source/candidate ingredient, cuisine, category, meal-type, known vegetarian and time similarity with the semantic term; family rating and vote boosts SHALL not apply.

#### Scenario: Source embedding unavailable

- **WHEN** the source has no compatible ready embedding
- **THEN** source facts produce a bounded lexical candidate query with the same hard filters and source exclusion

#### Scenario: Strongly aligned recipe

- **WHEN** a candidate aligns on structured source facts while another only has a closer vector
- **THEN** the structured score participates in the final order rather than vector distance alone

#### Scenario: Family favorite unrelated

- **WHEN** a similar candidate has high family rating or votes
- **THEN** those facts do not add family-fit boosts in Similar

### Requirement: Keep semantic availability a serving option

Search SHALL honor the server semantic-enabled option and configured candidate/model/version/dimension settings. Turning semantic retrieval off SHALL retain lexical and browse paths and make Similar use its lexical recovery path. This SHALL NOT establish model relevance, successful external service access or a total-request deadline.

#### Scenario: Semantic disabled

- **WHEN** semantic retrieval is configured off
- **THEN** browse and lexical search remain available and Similar uses lexical source-fact retrieval

#### Scenario: External embedding endpoint unavailable

- **WHEN** query embedding fails for an enabled typed request
- **THEN** the lexical fallback behavior applies instead of requiring semantic success

### Requirement: Combine ranked retrieval candidates by recipe identity

For a successful semantic attempt alongside typed lexical retrieval, Search SHALL combine the bounded candidate pools by recipe identity. A candidate found in both SHALL receive their normalized, weighted retrieval contributions without becoming two cards. Later applicable modifiers SHALL participate in final ordering.

#### Scenario: Both paths retrieve the recipe

- **WHEN** lexical and semantic retrieval return the same recipe identity
- **THEN** it enters final ranking once with both retrieval contributions

#### Scenario: Semantic-only candidate in a typed search

- **WHEN** an eligible candidate is returned only by successful semantic retrieval
- **THEN** it can enter the combined ranked pool without an exact lexical match
