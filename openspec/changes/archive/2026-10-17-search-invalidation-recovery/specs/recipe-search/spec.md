# Spec Delta

## MODIFIED Requirements

### Requirement: Restart mounted browse after received promotion invalidation

When mounted Search observes a newer promotion generation, it SHALL withhold obsolete cards and refresh browse, typed and Similar results using current query, filters, preferences, similar target and planner context. This SHALL also apply while an initial or replacement request is pending. Invalidation delivery remains with household-live-updates; server eligibility and ranking remain authoritative.

#### Scenario: Browse invalidated
- **WHEN** a mounted browse observes a newer promotion generation
- **THEN** old cards are withheld and a replacement initial request is scheduled with active context

#### Scenario: Ranked data invalidated
- **WHEN** a mounted typed or Similar response becomes obsolete
- **THEN** a replacement initial request retains current search context and displays its current successful results without retyping

#### Scenario: Invalidation before a response
- **WHEN** invalidation arrives during an initial or replacement request
- **THEN** a fresh request starts with current context and the obsolete request cannot replace its results or error presentation

#### Scenario: Repeated events and later typing
- **WHEN** another invalidation or new search supersedes a pending refresh
- **THEN** only current-generation outcomes are displayed; completed refreshes and later typing do not themselves repeat an already handled invalidation

## ADDED Requirements

### Requirement: Retry a failed initial or replacement search

A current failed initial or replacement request SHALL show a search error and Retry instead of successful-empty guidance. Retry SHALL submit the current query, filters, preferences, similar target and planner context without requiring re-entry. A new request SHALL clear the prior error. Obsolete request failures SHALL NOT replace current results or errors.

#### Scenario: Refresh fails and retry succeeds
- **WHEN** an invalidation refresh fails and the person retries successfully
- **THEN** error and Retry replace loading, retained input is submitted again and current returned cards are displayed

#### Scenario: Valid empty result
- **WHEN** the current request succeeds without cards
- **THEN** existing successful-empty guidance appears without an error or retry claim
