## MODIFIED Requirements

### Requirement: Return targeted Search assignment to Planner

After confirmed recipe-detail assignment, Search SHALL return to the captured Planner week/day and reference Monday. Planner SHALL read that week, scroll the target day card into view, and apply the temporary highlight ring without showing a redundant confirmation toast. Replacement disposition and saved-but-unrefreshed states SHALL retain their existing inline banners without adding a Refresh control.

#### Scenario: Search assignment resolves

- **WHEN** explicit-target Search assignment resolves for index two in week one
- **THEN** navigation targets Planner index two in week one with the captured reference, scrolls the day into view after authoritative reading, highlights the card, and emits no redundant success toast or persistent banner

#### Scenario: Planner receives success feedback parameters

- **WHEN** Planner receives a truthy success value and a dayIndex for an empty-slot assignment
- **THEN** it reads the captured week, clears the transient `success` URL parameter, scrolls the matching day card into view with reduced-motion support, and applies the temporary highlight ring without showing a toast

### Requirement: Confirm completed planning without inventing work

Ordinary single-day planning completion SHALL rely on Planner navigation, scroll-into-view, and card highlighting without showing a separate toast notification. Replacement/spillover feedback SHALL state the original's confirmed removal or moved date and remain readable until dismissal or departure. Saved-but-unrefreshed feedback SHALL distinguish persistence from unavailable refresh.

#### Scenario: Ordinary single-day completion omits toast

- **WHEN** Curry is saved to Wednesday without displacing another meal and Planner finishes refreshing Wednesday
- **THEN** Wednesday displays Curry in view with its highlight ring and no redundant confirmation toast appears

#### Scenario: Replacement and deferred original complete

- **WHEN** Curry is saved to Wednesday and Lasagna was deferred past a full next week to the following Monday
- **THEN** Planner confirms Curry's Wednesday date and Lasagna's actual Monday date and explains the full-week spillover
