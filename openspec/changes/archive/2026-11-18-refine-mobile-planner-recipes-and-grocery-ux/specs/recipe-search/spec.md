## MODIFIED Requirements

### Requirement: Enter Similar from loaded detail

Activating Find similar in Recipes detail SHALL dismiss detail, expand search controls, clear text and any pending typing debounce, and submit the loaded recipe identity as the similar target while retaining active filters, preferences, scope, presentation and planning context. Similar SHALL exclude the source recipe and return no candidates when that source is missing, deleted or not ready.

#### Scenario: Find similar action

- **WHEN** the person activates Find similar on a loaded recipe
- **THEN** detail closes and an empty-query request identifies that recipe as similar target

#### Scenario: Source unavailable

- **WHEN** the source is missing, deleted or not ready when Similar is evaluated
- **THEN** no similar candidates are returned

#### Scenario: Recognize and remove Similar

- **WHEN** Similar is active with controls expanded
- **THEN** a localized removable `Similar ×` indicator identifies its context immediately beside the `Filters` button on the same single-line row without requiring the source name to be available
- **AND** removing it retains text, filters, scope and planner context and resolves Search or Explore from the remaining criteria

### Requirement: Keep browse rediscovery eligibility on the server

Browse promotion eligibility SHALL require positive saved affinity, a saved last-cooked event date at or before the configured rediscovery cutoff, and no calendar guard. The cutoff and week bounds SHALL use deployment-local today via `DeploymentCalendar` and the configured interval. Active Planned, Locked or AwaitingConsensus entries dated today or later, and Cooked entries in the selected deployment week, SHALL block promotion without removing ordinary membership.

#### Scenario: Deployment timezone shifts browse rediscovery date

- **WHEN** UTC has crossed midnight while `America/Toronto` deployment-local time is still the previous civil evening
- **THEN** browse rediscovery cutoff and active/cooked calendar blocking use `DeploymentCalendar` Toronto local `Today` rather than UTC date

#### Scenario: No cooked evidence

- **WHEN** a candidate has positive affinity but no saved last-cooked event date
- **THEN** it is not browse-promotion eligible

#### Scenario: Active future calendar entry

- **WHEN** an otherwise eligible candidate has an active future assignment
- **THEN** it remains an ordinary candidate but is not promotion eligible

#### Scenario: Skipped entry only

- **WHEN** an otherwise eligible candidate has only a Skipped entry and no blocking event
- **THEN** that entry does not block browse promotion

### Requirement: Clear Search explicitly while retaining library scope

Toolbar `Clear search and browse` SHALL render as a compact icon button with an accessible localized name inline beside `Filters` and any `Similar` chip on a single row, clearing text, Similar, Focus and non-scope Search filters, cancelling debounce, and loading scoped Explore while keeping scope, presentation and planner context. Empty-state recovery SHALL retain its text button.

#### Scenario: Clear active Search

- **WHEN** a person activates the compact `Clear search and browse` icon button in the Search toolbar (sitting inline on one row with `Filters` and optional `Similar ×`) while Search is loaded, pending, empty or failed
- **THEN** scoped Explore replaces it without stale Search results or errors arriving later
- **AND** scope, presentation, planning context and current disclosure visibility are retained

### Requirement: Make expanded Search recognizable and localized

When Search controls are expanded, the input SHALL show a magnifier, a soft light surface with terracotta focus state, and dynamic placeholder shadow text drawn from the top eligible `fill-the-gap` suggestion (ranked by influencers/likes, unplanned in the target week, and not on cooldown), falling back to a localized default placeholder when no suggestion is loaded.

#### Scenario: Expand Search in either view

- **WHEN** a person expands Search in stack or list presentation in English or French and no eligible suggestion is available
- **THEN** the field appears directly below the toolbar with its magnifier and localized fallback placeholder (`Try 'Chicken' or 'Quick'…` / `Ex. 'Poulet' ou 'Rapide'…`), and receives visible focus
- **AND** expansion alone does not submit or replace the current collection

#### Scenario: Dynamic placeholder displays top eligible suggestion

- **WHEN** Search expands in English or French and `fill-the-gap` returns an eligible non-planned, non-cooled suggested recipe such as `"Thai Basil Chicken"`
- **THEN** the search input placeholder displays `"Thai Basil Chicken"` while leaving the input value empty so typing searches without deleting example text

#### Scenario: Return to a hidden active Search

- **WHEN** a current Search is active and its controls are hidden, then the person reopens them
- **THEN** the existing active marker disappears from the collapsed control, the field retains its criteria and focus returns to the input without changing results, position or pending work
