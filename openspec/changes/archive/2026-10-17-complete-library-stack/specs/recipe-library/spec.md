# Spec Delta

## MODIFIED Requirements

### Requirement: Wrap stack navigation within available results

For a stable collection, navigation SHALL fetch missing adjacent pages and reach every eligible recipe in both directions. Next at the collection end SHALL wrap to its first card. Previous at its first card SHALL select the last card, requesting the calculated final page with limit 20 and the active filter when necessary. Pending page retrieval SHALL retain the current position.

#### Scenario: Loop forward after the last loaded card
- **WHEN** next is requested at the final collection card with no pending prefetch for more pages
- **THEN** the first collection card becomes current

#### Scenario: Wait at a pending page boundary
- **WHEN** next is requested on the final collection card while more pages are indicated and prefetch is pending
- **THEN** navigation waits at that boundary

#### Scenario: Wrap backward to loaded end
- **WHEN** previous is requested at the first card with the active total already loaded and no more pages
- **THEN** the final collection card becomes current

#### Scenario: Retrieve the final page for backward wrapping
- **WHEN** previous is requested at the first card with a positive active count and the end not loaded
- **THEN** the calculated final-page request uses explore order, limit 20 and the active filter, and its last returned card becomes current

### Requirement: Display the loaded stack position against selected total

The action bar SHALL display current global collection ordinal and the selected collection total in position / total form. The ordinal SHALL include preceding pages, including after backward wrap. Offset pagination SHALL NOT promise a stable snapshot during concurrent server mutations.

#### Scenario: Display stack depth
- **WHEN** the current global index is 2 and selected total is 24
- **THEN** the indicator reads 3 / 24

### Requirement: Prefetch additional stack pages near the loaded end

In stack mode, five or fewer remaining cards on the current page SHALL trigger the next explore page with limit 20 and the active filter, unless loading, failed-prefetch suppression or an available/pending page prevents it. A relevant response SHALL make that page available in returned order without moving the current card or ordinal. Revisiting cached pages SHALL NOT append duplicate copies.

#### Scenario: Prefetch within five remaining cards
- **WHEN** stack browsing reaches at most five remaining cards on its current page with a next page available and no suppressing condition
- **THEN** the next page is requested and a successful relevant response becomes available for navigation without changing the current card or ordinal

## ADDED Requirements

### Requirement: Recover stack page navigation without changing collection identity

A failed page fetch SHALL retain the current card and expose retry. Responses from a departed filter, presentation or page lifecycle SHALL NOT replace the current collection. Closing detail SHALL preserve the current card and global position.

#### Scenario: Traverse a multipage deck
- **WHEN** a stable 126- or 180-recipe library is traversed forward and backward through wrap
- **THEN** every recipe appears once per complete cycle with its correct ordinal and first/last identities

#### Scenario: Failed adjacent page or wrap
- **WHEN** a needed page request fails
- **THEN** the current card remains and explicit retry can resume that navigation

#### Scenario: Departed collection response
- **WHEN** an old request resolves after changing filter, presentation or unmounting
- **THEN** it does not change the current cards, count, position or pending/error feedback
