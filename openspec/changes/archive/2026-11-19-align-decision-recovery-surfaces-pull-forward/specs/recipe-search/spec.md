# Spec Delta

## MODIFIED Requirements

### Requirement: Retain cards and expose continuation retry or restart

A continuation request failure for the current search generation SHALL retain loaded cards. On a `409` expired cursor during continuation, Search SHALL seamlessly perform at most one fresh initial search with active query, filters, and planner context instead of rendering a dead-end Restart button; genuine failures SHALL expose a Family Cookbook `Retry` `<Button>` using `outline-ink-body`, and all Search banners/error cards SHALL use Family Cookbook surfaces.

#### Scenario: Continuation expired

- **WHEN** a current continuation request returns 409 for the first time in this continuation attempt
- **THEN** loaded cards stay mounted while Search seamlessly performs one fresh initial request with current context rather than showing an unstyled `Restart search` button

#### Scenario: Continuation fails otherwise

- **WHEN** a current continuation request fails with another status or the single automatic restart fails
- **THEN** loaded cards remain and an Era 3 `<Button>` `Retry` is offered across list and stack presentations

### Requirement: Navigate Search stacks within cursor boundaries

A Search stack SHALL move backward only through loaded matches and forward through the current cursor continuation, without Explore wrapping. It SHALL stop at the beginning and exhausted end, retaining position while a boundary request is pending or fails. Before exhaustion its position display SHALL distinguish loaded matches and availability of more; an exact total SHALL be shown only once no next cursor remains.

#### Scenario: Reach the first match

- **WHEN** previous navigation is requested at Search index zero
- **THEN** no wrap or request for a calculated last Explore page occurs

#### Scenario: Continue beyond loaded matches

- **WHEN** next is requested at the last loaded Search match with a cursor
- **THEN** at most one compatible continuation is requested and the card remains until a following unique match is available
- **AND** success appends in order; backward navigation can revisit loaded matches without another request

#### Scenario: Exhaustion or continuation failure

- **WHEN** a final page has no cursor, or a boundary continuation fails
- **THEN** exhaustion stops at the final match with an exact distinct served-result total; a `409` expired cursor seamlessly refreshes once with active search context, and any remaining failure retains the current card and shows an Era 3 `<Button>` retry without claiming exhaustion
