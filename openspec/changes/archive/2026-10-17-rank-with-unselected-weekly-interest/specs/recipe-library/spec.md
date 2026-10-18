# Spec Delta

## MODIFIED Requirements

### Requirement: Return an explore-ordered library page

Successful authorized GET `/api/recipes` with `order=explore` SHALL order eligible records with never-cooked first, then oldest cooked date, then H descending from weekly-household-interest, newest creation time and stable identity. It SHALL return the requested offset page in `recipes`, with `updatedAt` and `pagination` containing page, limit and filtered total, outside a `data` envelope. Page SHALL be at least 1 and limit SHALL be clamped to 1–100.

#### Scenario: Explore ordering
- **WHEN** an authorized lowercase-explore request succeeds for eligible recipes with differing cooked dates or creation times
- **THEN** never-cooked records precede cooked records, older cooked dates precede newer ones, and H descending, then creation time descending and identity order records with the same cooked-date position

#### Scenario: Page response and count
- **WHEN** an authorized explore request with page 2 and limit 12 succeeds
- **THEN** `recipes` contains up to 12 eligible records after the first 12 in explore order
- **AND** the unwrapped response includes `updatedAt` and pagination page 2, limit 12 and the eligible filtered total

#### Scenario: Page bounds are normalized
- **WHEN** an authorized explore request supplies page below 1 or limit outside 1–100 and succeeds
- **THEN** the response uses page at least 1 and limit clamped to 1–100

## ADDED Requirements

### Requirement: Keep Explore history ordering coherent across pages

Explore list and stack pagination SHALL apply one historical ordering generation for a navigation sequence or require restart when it changes. Count, page identity and stack position SHALL remain coherent; history SHALL not be reranked independently inside each loaded page.

#### Scenario: Forward then backward
- **WHEN** history changes while a user navigates Explore pages
- **THEN** the client uses a pinned historical generation or restarts visibly; it does not silently mix historical orders

#### Scenario: Failed page recovery
- **WHEN** an Explore page load fails
- **THEN** existing retained-card and retry behavior from PR243 remains intact
### Requirement: Preserve library eligibility and newest-first order

Historical augmentation SHALL affect Explore ordering only, without adding Discovery/cooldown exclusions or changing filtered totals. Default newest-created order and exact lookup predicates SHALL retain their existing behavior.

#### Scenario: Outside Discovery
- **WHEN** All-mode Explore includes a ready explicitly kept out of rotation recipe with history
- **THEN** it remains visible and its H participates normally

#### Scenario: Default list
- **WHEN** the request omits order=explore
- **THEN** history does not replace newest-created ordering

